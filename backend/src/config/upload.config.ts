import { registerAs } from '@nestjs/config';
import { join } from 'path';

export default registerAs('upload', () => ({
  dest: process.env.UPLOAD_DEST || join(process.cwd(), 'uploads'),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
  maxVideoFileSize: 200 * 1024 * 1024, // 200MB for videos
  maxFiles: 50,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
}));
