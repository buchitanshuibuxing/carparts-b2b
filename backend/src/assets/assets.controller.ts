import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, UploadedFiles, Res, BadRequestException } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AssetsService } from './assets.service';
import { ImportSourcesService } from './import-sources.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(
    private svc: AssetsService,
    private importSourcesSvc: ImportSourcesService,
  ) {}

  // Upload single
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 200 * 1024 * 1024 } }))
  upload(@UploadedFile() file: Express.Multer.File, @Body() body: any, @CurrentUser('id') uid: number) {
    if (!file) throw new BadRequestException('请选择文件');
    return this.svc.upload(file, {
      part_id: body.part_id ? Number(body.part_id) : undefined,
      classification_id: body.classification_id ? Number(body.classification_id) : undefined,
      category: body.category,
      tag_ids: body.tag_ids ? JSON.parse(body.tag_ids) : undefined,
      uploaded_by: uid,
    });
  }

  // Batch upload
  @Post('batch-upload')
  @UseInterceptors(FilesInterceptor('files', 50, { limits: { fileSize: 200 * 1024 * 1024 } }))
  batchUpload(@UploadedFiles() files: Express.Multer.File[], @Body() body: any, @CurrentUser('id') uid: number) {
    if (!files?.length) throw new BadRequestException('请选择文件');
    return this.svc.batchUpload(files, { classification_id: body.classification_id ? Number(body.classification_id) : undefined, uploaded_by: uid });
  }

  // List
  @Get()
  findAll(
    @Query('page') p = 1, @Query('page_size') ps = 20,
    @Query('classification_id') cid?: number, @Query('keyword') kw?: string,
    @Query('oe_number') oe?: string, @Query('part_type') pt?: string,
    @Query('brand') br?: string, @Query('part_id') pid?: number,
    @Query('category') cat?: string, @Query('tag_ids') tids?: string,
    @Query('type') type?: string,
  ) {
    return this.svc.findAll(p, ps, {
      classification_id: cid ? Number(cid) : undefined, keyword: kw,
      oe_number: oe, part_type: pt, brand: br,
      part_id: pid ? Number(pid) : undefined, category: cat,
      tag_ids: tids ? tids.split(',').map(Number) : undefined,
      type,
    });
  }

  // ---- Import Sources ----
  @Get('sources')
  getSources() { return this.importSourcesSvc.findAll(); }

  @Post('sources')
  createSource(@Body() body: any) {
    return this.importSourcesSvc.create({
      name: body.name,
      protocol: body.protocol,
      url: body.url,
      username: body.username || '',
      password: body.password || '',
      localMountPath: body.local_mount_path,
      remotePath: body.remote_path || '/',
      autoClassify: body.auto_classify !== false,
      folderMapping: body.folder_mapping || {},
    });
  }

  @Put('sources/:id')
  updateSource(@Param('id') id: number, @Body() body: any) {
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.protocol !== undefined) data.protocol = body.protocol;
    if (body.url !== undefined) data.url = body.url;
    if (body.username !== undefined) data.username = body.username;
    if (body.password !== undefined) data.password = body.password;
    if (body.local_mount_path !== undefined) data.localMountPath = body.local_mount_path;
    if (body.remote_path !== undefined) data.remotePath = body.remote_path;
    if (body.auto_classify !== undefined) data.autoClassify = body.auto_classify;
    if (body.folder_mapping !== undefined) data.folderMapping = body.folder_mapping;
    if (body.scan_interval !== undefined) data.scanInterval = body.scan_interval;
    return this.importSourcesSvc.update(id, data);
  }

  @Delete('sources/:id')
  deleteSource(@Param('id') id: number) { return this.importSourcesSvc.remove(id); }

  @Post('sources/:id/test')
  testSource(@Param('id') id: number) { return this.importSourcesSvc.testConnection(id); }

  @Get('sources/:id/browse')
  browseSource(@Param('id') id: number, @Query('path') dirPath?: string) {
    return this.importSourcesSvc.browseDirectory(id, dirPath || '/');
  }

  @Post('sources/:id/import')
  startImport(@Param('id') id: number) { return this.importSourcesSvc.startImport(id); }

  @Post('sources/:id/stop')
  stopImport(@Param('id') id: number) { return this.importSourcesSvc.stopImport(id); }

  @Get('sources/:id/progress')
  getImportProgress(@Param('id') id: number) { return this.importSourcesSvc.getImportProgress(id); }

  // Detail
  @Get(':id')
  findOne(@Param('id') id: number) { return this.svc.findOne(id); }

  // Update
  @Put(':id')
  update(@Param('id') id: number, @Body() body: any) { return this.svc.update(id, body); }

  // Delete
  @Delete(':id')
  remove(@Param('id') id: number) { return this.svc.remove(id); }

  // Batch operations
  @Post('batch-delete')
  batchDelete(@Body() body: { ids: number[] }) { return this.svc.batchDelete(body.ids); }

  @Post('batch-classify')
  batchClassify(@Body() body: { ids: number[]; classification_id: number }) { return this.svc.batchClassify(body.ids, body.classification_id); }

  @Post('batch-tag')
  batchTag(@Body() body: { ids: number[]; tag_ids: number[] }) { return this.svc.batchTag(body.ids, body.tag_ids); }

  @Post('batch-update')
  batchUpdate(@Body() body: { ids: number[]; recognized_oe_number?: string; recognized_part_type?: string; recognized_brand?: string; part_name_cn?: string; part_name_en?: string }) {
    return this.svc.batchUpdate(body.ids, body);
  }

  // Manual recognition
  @Post(':id/recognize')
  recognizeAsset(@Param('id') id: number, @Body() body: { ocr?: boolean; ai?: boolean; oeLookup?: boolean }) { return this.svc.recognizeAsset(id, body); }

  @Post('batch-recognize')
  batchRecognize(@Body() body: { ids: number[]; ocr?: boolean; ai?: boolean; oeLookup?: boolean }) { return this.svc.batchRecognize(body.ids, body); }

  // Undo recognition
  @Post('batch-undo-recognize')
  batchUndoRecognize(@Body() body: { ids: number[] }) { return this.svc.batchUndoRecognize(body.ids); }

  @Post(':id/undo-recognize')
  undoRecognize(@Param('id') id: number) { return this.svc.undoRecognize(id); }

  // Classifications
  @Get('meta/classifications')
  getClassifications() { return this.svc.getClassifications(); }
  @Post('meta/classifications')
  createClassification(@Body() body: any) { return this.svc.createClassification(body); }
  @Delete('meta/classifications/:id')
  deleteClassification(@Param('id') id: number) { return this.svc.deleteClassification(id); }

  // Tags
  @Get('meta/tags')
  getTags() { return this.svc.getTags(); }
  @Post('meta/tags')
  createTag(@Body() body: any) { return this.svc.createTag(body); }
  @Delete('meta/tags/:id')
  deleteTag(@Param('id') id: number) { return this.svc.deleteTag(id); }

  // Image operations
  @Post(':id/crop')
  cropImage(@Param('id') id: number, @Body() body: { x: number; y: number; width: number; height: number }) {
    return this.svc.cropImage(id, body.x, body.y, body.width, body.height);
  }

  @Post(':id/watermark')
  addWatermark(@Param('id') id: number, @Body() body: { text: string }) {
    return this.svc.addWatermark(id, body.text);
  }
}
