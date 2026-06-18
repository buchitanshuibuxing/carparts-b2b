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
exports.FacebookPost = void 0;
const typeorm_1 = require("typeorm");
let FacebookPost = class FacebookPost {
    id;
    pageId;
    fbPostId;
    message;
    imageAssetIds;
    status;
    scheduledAt;
    publishedAt;
    likesCount;
    commentsCount;
    sharesCount;
    errorMessage;
    createdBy;
    createdAt;
    updatedAt;
};
exports.FacebookPost = FacebookPost;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], FacebookPost.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'page_id' }),
    __metadata("design:type", Number)
], FacebookPost.prototype, "pageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fb_post_id', length: 50, nullable: true }),
    __metadata("design:type", String)
], FacebookPost.prototype, "fbPostId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: '' }),
    __metadata("design:type", String)
], FacebookPost.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'image_asset_ids', type: 'simple-json', default: '[]' }),
    __metadata("design:type", Array)
], FacebookPost.prototype, "imageAssetIds", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: 'draft' }),
    __metadata("design:type", String)
], FacebookPost.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scheduled_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], FacebookPost.prototype, "scheduledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'published_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], FacebookPost.prototype, "publishedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'likes_count', default: 0 }),
    __metadata("design:type", Number)
], FacebookPost.prototype, "likesCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'comments_count', default: 0 }),
    __metadata("design:type", Number)
], FacebookPost.prototype, "commentsCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shares_count', default: 0 }),
    __metadata("design:type", Number)
], FacebookPost.prototype, "sharesCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', default: '' }),
    __metadata("design:type", String)
], FacebookPost.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', nullable: true }),
    __metadata("design:type", Number)
], FacebookPost.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], FacebookPost.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], FacebookPost.prototype, "updatedAt", void 0);
exports.FacebookPost = FacebookPost = __decorate([
    (0, typeorm_1.Entity)('facebook_posts')
], FacebookPost);
//# sourceMappingURL=facebook-post.entity.js.map