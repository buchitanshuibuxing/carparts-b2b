import { Controller, Post, Get, Body, Query, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import path from 'path';
import { ImportExportService } from './import-export.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('import')
@UseGuards(JwtAuthGuard)
export class ImportExportController {
  constructor(private svc: ImportExportService) {}

  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  preview(@UploadedFile() file: Express.Multer.File, @Body() body: { import_type: string }) {
    if (!file) throw new Error('请选择文件');
    return this.svc.previewImport(file, body.import_type);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  import(@UploadedFile() file: Express.Multer.File, @Body() body: { import_type: string; duplicate_strategy?: string; field_mapping?: string }) {
    if (!file) throw new Error('请选择文件');
    const mapping = body.field_mapping ? JSON.parse(body.field_mapping) : undefined;
    return this.svc.importFromExcel(file, body.import_type, mapping, body.duplicate_strategy as any);
  }

  @Post('row')
  importRow(@Body() body: { import_type: string; row: Record<string, any>; duplicate_strategy?: string }) {
    return this.svc.importSingleRow(body.import_type, body.row, body.duplicate_strategy as any);
  }

  @Post('batch')
  importBatch(@Body() body: { import_type: string; rows: Record<string, any>[]; duplicate_strategy?: string }) {
    return this.svc.importBatchRows(body.import_type, body.rows, body.duplicate_strategy as any);
  }

  @Get('template')
  async getTemplate(@Query('type') type: string, @Res() res: Response) {
    const result = await this.svc.exportTemplate(type);
    const uploadDir = process.env.UPLOAD_DEST || './uploads';
    res.download(path.join(uploadDir, result.path), `${type}_template.xlsx`);
  }

  @Get('export')
  async exportData(@Query('type') type: string, @Res() res: Response) {
    const buffer = await this.svc.exportData(type);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${type}_export.xlsx"`,
    });
    res.send(buffer);
  }
}
