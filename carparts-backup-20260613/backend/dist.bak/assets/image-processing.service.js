"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ImageProcessingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageProcessingService = void 0;
const common_1 = require("@nestjs/common");
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const child_process_1 = require("child_process");
const uuid_1 = require("uuid");
let ImageProcessingService = ImageProcessingService_1 = class ImageProcessingService {
    logger = new common_1.Logger(ImageProcessingService_1.name);
    uploadDir = process.env.UPLOAD_DEST || './uploads';
    async ensureDirs() {
        const dirs = [
            path_1.default.join(this.uploadDir, 'images'),
            path_1.default.join(this.uploadDir, 'videos'),
            path_1.default.join(this.uploadDir, 'thumbnails', 'small'),
            path_1.default.join(this.uploadDir, 'thumbnails', 'medium'),
            path_1.default.join(this.uploadDir, 'thumbnails', 'large'),
        ];
        for (const dir of dirs) {
            await promises_1.default.mkdir(dir, { recursive: true });
        }
    }
    isVideo(mimeType) {
        return mimeType.startsWith('video/');
    }
    async saveOriginal(buffer, originalName) {
        await this.ensureDirs();
        const ext = path_1.default.extname(originalName).toLowerCase() || '.jpg';
        const uuid = (0, uuid_1.v4)();
        const datePath = new Date().toISOString().slice(0, 7).replace('-', '/');
        const relPath = `images/${datePath}/${uuid}${ext}`;
        const absPath = path_1.default.join(this.uploadDir, relPath);
        await promises_1.default.mkdir(path_1.default.dirname(absPath), { recursive: true });
        const metadata = await (0, sharp_1.default)(buffer).metadata();
        await promises_1.default.writeFile(absPath, buffer);
        return {
            filePath: relPath,
            fileName: originalName,
            width: metadata.width || 0,
            height: metadata.height || 0,
            mimeType: metadata.format ? `image/${metadata.format}` : 'image/jpeg',
        };
    }
    async saveVideo(buffer, originalName, mimeType) {
        await this.ensureDirs();
        const ext = path_1.default.extname(originalName).toLowerCase() || '.mp4';
        const uuid = (0, uuid_1.v4)();
        const datePath = new Date().toISOString().slice(0, 7).replace('-', '/');
        const relPath = `videos/${datePath}/${uuid}${ext}`;
        const absPath = path_1.default.join(this.uploadDir, relPath);
        await promises_1.default.mkdir(path_1.default.dirname(absPath), { recursive: true });
        await promises_1.default.writeFile(absPath, buffer);
        let width = 0, height = 0, duration = 0;
        try {
            const meta = this.getVideoMetadata(absPath);
            width = meta.width;
            height = meta.height;
            duration = meta.duration;
        }
        catch (e) {
            this.logger.warn(`Failed to get video metadata: ${e.message}`);
        }
        return { filePath: relPath, fileName: originalName, width, height, mimeType, duration };
    }
    getVideoMetadata(absPath) {
        try {
            const result = (0, child_process_1.execSync)(`ffprobe -v quiet -print_format json -show_format -show_streams "${absPath}"`, { timeout: 15000, encoding: 'utf-8' });
            const data = JSON.parse(result);
            const videoStream = data.streams?.find((s) => s.codec_type === 'video');
            return {
                width: videoStream?.width || 0,
                height: videoStream?.height || 0,
                duration: parseFloat(data.format?.duration || '0'),
            };
        }
        catch {
            return { width: 0, height: 0, duration: 0 };
        }
    }
    async extractVideoThumbnail(absPath, uuid) {
        await this.ensureDirs();
        const sizes = { small: 150, medium: 400, large: 800 };
        const result = {};
        for (const [name, size] of Object.entries(sizes)) {
            const relPath = `thumbnails/${name}/${uuid}.jpg`;
            const thumbAbsPath = path_1.default.join(this.uploadDir, relPath);
            try {
                (0, child_process_1.execSync)(`ffmpeg -y -i "${absPath}" -ss 00:00:01 -vframes 1 -vf "scale=${size}:${size}:force_original_aspect_ratio=decrease" -q:v 3 "${thumbAbsPath}"`, { timeout: 30000, stdio: 'pipe' });
                result[name] = relPath;
            }
            catch (e) {
                this.logger.warn(`Failed to extract video thumbnail (${name}): ${e.message}`);
                result[name] = '';
            }
        }
        return result;
    }
    async generateThumbnails(buffer, uuid) {
        await this.ensureDirs();
        const sizes = { small: 150, medium: 400, large: 800 };
        const result = {};
        for (const [name, size] of Object.entries(sizes)) {
            const relPath = `thumbnails/${name}/${uuid}.jpg`;
            const absPath = path_1.default.join(this.uploadDir, relPath);
            await (0, sharp_1.default)(buffer).resize(size, size, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(absPath);
            result[name] = relPath;
        }
        return result;
    }
    async cropImage(buffer, x, y, width, height) {
        return (0, sharp_1.default)(buffer).extract({ left: x, top: y, width, height }).toBuffer();
    }
    async resizeImage(buffer, width, height) {
        return (0, sharp_1.default)(buffer).resize(width, height, { fit: 'inside', withoutEnlargement: true }).toBuffer();
    }
    async addWatermark(buffer, text) {
        const metadata = await (0, sharp_1.default)(buffer).metadata();
        const w = metadata.width || 800;
        const h = metadata.height || 600;
        const svg = `<svg width="${w}" height="${h}">
      <text x="${w - 20}" y="${h - 20}" font-size="24" fill="rgba(255,255,255,0.5)" text-anchor="end" font-family="Arial">${text}</text>
    </svg>`;
        return (0, sharp_1.default)(buffer).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).toBuffer();
    }
    getAbsolutePath(relPath) {
        return path_1.default.join(this.uploadDir, relPath);
    }
};
exports.ImageProcessingService = ImageProcessingService;
exports.ImageProcessingService = ImageProcessingService = ImageProcessingService_1 = __decorate([
    (0, common_1.Injectable)()
], ImageProcessingService);
//# sourceMappingURL=image-processing.service.js.map