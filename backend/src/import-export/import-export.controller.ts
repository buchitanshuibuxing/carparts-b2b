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

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  import(@UploadedFile() file: Express.Multer.File, @Body() body: { import_type: string; field_mapping?: string }) {
    if (!file) throw new Error('请选择文件');
    const mapping = body.field_mapping ? JSON.parse(body.field_mapping) : undefined;
    return this.svc.importFromExcel(file, body.import_type, mapping);
  }

  @Get('template')
  async getTemplate(@Query('type') type: string, @Res() res: Response) {
    const result = await this.svc.exportTemplate(type);
    const uploadDir = process.env.UPLOAD_DEST || './uploads';
    res.download(path.join(uploadDir, result.path), `${type}_template.xlsx`);
  }
}
