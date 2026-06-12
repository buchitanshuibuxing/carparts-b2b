import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

// Allowed MIME types for file upload
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  // Videos
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  // Documents (for import)
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv', // .csv
  'application/json', // .json
];

// Dangerous file extensions that should never be allowed
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.js', '.vbs', '.vbe', '.wsf', '.wsh', '.ps1', '.psm1',
  '.php', '.phtml', '.php3', '.php4', '.php5', '.phps',
  '.asp', '.aspx', '.asa', '.asax', '.ascx', '.ashx', '.asmx',
  '.jsp', '.jspx', '.jsw', '.jsv', '.jspf',
  '.sh', '.bash', '.csh', '.ksh',
  '.dll', '.so', '.dylib',
  '.jar', '.war', '.ear',
  '.py', '.rb', '.pl',
];

export function fileFilter(req: any, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return callback(new BadRequestException(`不支持的文件类型: ${file.mimetype}`), false);
  }

  // Check file extension
  const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return callback(new BadRequestException(`不允许的文件扩展名: ${ext}`), false);
  }

  callback(null, true);
}

export const multerOptions: MulterOptions = {
  limits: {
    fileSize: 2048 * 1024 * 1024, // 2GB
  },
  fileFilter,
};
