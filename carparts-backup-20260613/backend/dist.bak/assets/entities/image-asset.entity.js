"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageAsset = void 0;
const typeorm_1 = require("typeorm");
let ImageAsset = class ImageAsset {
    id;
    partId;
    filePath;
    fileName;
    fileSize;
    width;
    height;
    type;
    mimeType;
    duration;
    ocrText;
    ocrStatus;
    tags;
    category;
    isPrimary;
    sortOrder;
    classificationId;
    thumbnailSmallPath;
    thumbnailMediumPath;
    thumbnailLargePath;
    recognitionStatus;
    recognizedOeNumber;
    recognizedPartType;
    recognizedBrand;
    partNameCn;
    partNameEn;
    recognitionConfidence;
    recognitionResult;
    uploadedBy;
    createdAt;
};
exports.ImageAsset = ImageAsset;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ImageAsset.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'part_id', nullable: true }),
    __metadata("design:type", Number)
], ImageAsset.prototype, "partId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_path' }),
    __metadata("design:type", String)
], ImageAsset.prototype, "filePath", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_name' }),
    __metadata("design:type", String)
], ImageAsset.prototype, "fileName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_size', default: 0 }),
    __metadata("design:type", Number)
], ImageAsset.prototype, "fileSize", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], ImageAsset.prototype, "width", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], ImageAsset.prototype, "height", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: 'image' }),
    __metadata("design:type", String)
], ImageAsset.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mime_type', length: 50, default: 'image/jpeg' }),
    __metadata("design:type", String)
], ImageAsset.prototype, "mimeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], ImageAsset.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ocr_text', default: '' }),
    __metadata("design:type", String)
], ImageAsset.prototype, "ocrText", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ocr_status', length: 20, default: 'pending' }),
    __metadata("design:type", String)
], ImageAsset.prototype, "ocrStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], ImageAsset.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], ImageAsset.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_primary', default: false }),
    __metadata("design:type", Boolean)
], ImageAsset.prototype, "isPrimary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', default: 0 }),
    __metadata("design:type", Number)
], ImageAsset.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'classification_id', nullable: true }),
    __metadata("design:type", Number)
], ImageAsset.prototype, "classificationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'thumbnail_small_path', length: 500, default: '' }),
    __metadata("design:type", String)
], ImageAsset.prototype, "thumbnailSmallPath", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'thumbnail_medium_path', length: 500, default: '' }),
    __metadata("design:type", String)
], ImageAsset.prototype, "thumbnailMediumPath", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'thumbnail_large_path', length: 500, default: '' }),
    __metadata("design:type", String)
], ImageAsset.prototype, "thumbnailLargePath", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recognition_status', length: 20, default: 'pending' }),
    __metadata("design:type", String)
], ImageAsset.prototype, "recognitionStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recognized_oe_number', default: '' }),
    __metadata("design:type", String)
], ImageAsset.prototype, "recognizedOeNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recognized_part_type', default: '' }),
    __metadata("design:type", String)
], ImageAsset.prototype, "recognizedPartType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recognized_brand', default: '' }),
    __metadata("design:type", String)
], ImageAsset.prototype, "recognizedBrand", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'part_name_cn', default: '' }),
    __metadata("design:type", String)
], ImageAsset.prototype, "partNameCn", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'part_name_en', default: '' }),
    __metadata("design:type", String)
], ImageAsset.prototype, "partNameEn", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recognition_confidence', type: 'decimal', precision: 3, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], ImageAsset.prototype, "recognitionConfidence", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recognition_result', type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], ImageAsset.prototype, "recognitionResult", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'uploaded_by', nullable: true }),
    __metadata("design:type", Number)
], ImageAsset.prototype, "uploadedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ImageAsset.prototype, "createdAt", void 0);
exports.ImageAsset = ImageAsset = __decorate([
    (0, typeorm_1.Entity)('image_assets')
], ImageAsset);
//# sourceMappingURL=image-asset.entity.js.map