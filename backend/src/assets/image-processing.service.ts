import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

export interface ThumbnailPaths {
  small: string;
  medium: string;
  large: string;
}

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
}

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);
  private readonly uploadDir = process.env.UPLOAD_DEST || './uploads';

  async ensureDirs() {
    const dirs = [
      path.join(this.uploadDir, 'images'),
      path.join(this.uploadDir, 'videos'),
      path.join(this.uploadDir, 'thumbnails', 'small'),
      path.join(this.uploadDir, 'thumbnails', 'medium'),
      path.join(this.uploadDir, 'thumbnails', 'large'),
    ];
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  async saveOriginal(buffer: Buffer, originalName: string): Promise<{ filePath: string; fileName: string; width: number; height: number; mimeType: string }> {
    await this.ensureDirs();
    const ext = path.extname(originalName).toLowerCase() || '.jpg';
    const uuid = uuidv4();
    const datePath = new Date().toISOString().slice(0, 7).replace('-', '/');
    const relPath = `images/${datePath}/${uuid}${ext}`;
    const absPath = path.join(this.uploadDir, relPath);
    await fs.mkdir(path.dirname(absPath), { recursive: true });

    const metadata = await sharp(buffer).metadata();
    await fs.writeFile(absPath, buffer);

    return {
      filePath: relPath,
      fileName: originalName,
      width: metadata.width || 0,
      height: metadata.height || 0,
      mimeType: metadata.format ? `image/${metadata.format}` : 'image/jpeg',
    };
  }

  async saveVideo(buffer: Buffer, originalName: string, mimeType: string): Promise<{ filePath: string; fileName: string; width: number; height: number; mimeType: string; duration: number }> {
    await this.ensureDirs();
    const ext = path.extname(originalName).toLowerCase() || '.mp4';
    const uuid = uuidv4();
    const datePath = new Date().toISOString().slice(0, 7).replace('-', '/');
    const relPath = `videos/${datePath}/${uuid}${ext}`;
    const absPath = path.join(this.uploadDir, relPath);
    await fs.mkdir(path.dirname(absPath), { recursive: true });

    await fs.writeFile(absPath, buffer);

    let width = 0, height = 0, duration = 0;
    try {
      const meta = this.getVideoMetadata(absPath);
      width = meta.width;
      height = meta.height;
      duration = meta.duration;
    } catch (e) {
      this.logger.warn(`Failed to get video metadata: ${e.message}`);
    }

    return { filePath: relPath, fileName: originalName, width, height, mimeType, duration };
  }

  getVideoMetadata(absPath: string): VideoMetadata {
    try {
      const result = execSync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${absPath}"`,
        { timeout: 15000, encoding: 'utf-8' },
      );
      const data = JSON.parse(result);
      const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
      return {
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        duration: parseFloat(data.format?.duration || '0'),
      };
    } catch {
      return { width: 0, height: 0, duration: 0 };
    }
  }

  async extractVideoThumbnail(absPath: string, uuid: string): Promise<ThumbnailPaths> {
    await this.ensureDirs();
    const sizes = { small: 150, medium: 400, large: 800 };
    const result: any = {};

    for (const [name, size] of Object.entries(sizes)) {
      const relPath = `thumbnails/${name}/${uuid}.jpg`;
      const thumbAbsPath = path.join(this.uploadDir, relPath);
      try {
        // Extract frame at 1 second, scale to fit
        execSync(
          `ffmpeg -y -i "${absPath}" -ss 00:00:01 -vframes 1 -vf "scale=${size}:${size}:force_original_aspect_ratio=decrease" -q:v 3 "${thumbAbsPath}"`,
          { timeout: 30000, stdio: 'pipe' },
        );
        result[name] = relPath;
      } catch (e) {
        this.logger.warn(`Failed to extract video thumbnail (${name}): ${e.message}`);
        result[name] = '';
      }
    }
    return result;
  }

  async generateThumbnails(buffer: Buffer, uuid: string): Promise<ThumbnailPaths> {
    await this.ensureDirs();
    const sizes = { small: 150, medium: 400, large: 800 };
    const result: any = {};
    for (const [name, size] of Object.entries(sizes)) {
      const relPath = `thumbnails/${name}/${uuid}.jpg`;
      const absPath = path.join(this.uploadDir, relPath);
      await sharp(buffer).resize(size, size, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(absPath);
      result[name] = relPath;
    }
    return result;
  }

  async cropImage(buffer: Buffer, x: number, y: number, width: number, height: number): Promise<Buffer> {
    return sharp(buffer).extract({ left: x, top: y, width, height }).toBuffer();
  }

  async resizeImage(buffer: Buffer, width: number, height: number): Promise<Buffer> {
    return sharp(buffer).resize(width, height, { fit: 'inside', withoutEnlargement: true }).toBuffer();
  }

  async addWatermark(buffer: Buffer, text: string): Promise<Buffer> {
    const metadata = await sharp(buffer).metadata();
    const w = metadata.width || 800;
    const h = metadata.height || 600;
    const svg = `<svg width="${w}" height="${h}">
      <text x="${w - 20}" y="${h - 20}" font-size="24" fill="rgba(255,255,255,0.5)" text-anchor="end" font-family="Arial">${text}</text>
    </svg>`;
    return sharp(buffer).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).toBuffer();
  }

  getAbsolutePath(relPath: string): string {
    return path.join(this.uploadDir, relPath);
  }
}
