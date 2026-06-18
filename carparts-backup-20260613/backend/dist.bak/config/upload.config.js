"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
const path_1 = require("path");
exports.default = (0, config_1.registerAs)('upload', () => ({
    dest: process.env.UPLOAD_DEST || (0, path_1.join)(process.cwd(), 'uploads'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
    maxVideoFileSize: 200 * 1024 * 1024,
    maxFiles: 50,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
}));
//# sourceMappingURL=upload.config.js.map