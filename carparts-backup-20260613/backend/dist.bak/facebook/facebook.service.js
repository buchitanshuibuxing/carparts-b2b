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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var FacebookService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const facebook_page_entity_1 = require("./entities/facebook-page.entity");
const facebook_post_entity_1 = require("./entities/facebook-post.entity");
const image_asset_entity_1 = require("../assets/entities/image-asset.entity");
let FacebookService = FacebookService_1 = class FacebookService {
    pageRepo;
    postRepo;
    assetRepo;
    logger = new common_1.Logger(FacebookService_1.name);
    constructor(pageRepo, postRepo, assetRepo) {
        this.pageRepo = pageRepo;
        this.postRepo = postRepo;
        this.assetRepo = assetRepo;
    }
    async getPages() {
        return this.pageRepo.find({ order: { createdAt: 'DESC' } });
    }
    async connectPage(data) {
        const existing = await this.pageRepo.findOne({ where: { pageId: data.page_id } });
        if (existing) {
            existing.accessToken = data.access_token;
            existing.pageName = data.page_name;
            existing.profilePicture = data.profile_picture || '';
            existing.isActive = true;
            return this.pageRepo.save(existing);
        }
        return this.pageRepo.save({
            pageId: data.page_id, pageName: data.page_name,
            accessToken: data.access_token, profilePicture: data.profile_picture || '',
            connectedBy: data.connected_by,
        });
    }
    async disconnectPage(id) {
        const page = await this.pageRepo.findOne({ where: { id } });
        if (!page)
            throw new common_1.NotFoundException('页面不存在');
        page.isActive = false;
        return this.pageRepo.save(page);
    }
    async getPosts(pageId, status) {
        const where = {};
        if (pageId)
            where.pageId = pageId;
        if (status)
            where.status = status;
        return this.postRepo.find({ where, order: { createdAt: 'DESC' } });
    }
    async createPost(data) {
        const page = await this.pageRepo.findOne({ where: { id: data.page_id } });
        if (!page)
            throw new common_1.NotFoundException('Facebook 页面不存在');
        const post = await this.postRepo.save({
            pageId: data.page_id,
            message: data.message,
            imageAssetIds: data.image_asset_ids || [],
            status: data.scheduled_at ? 'scheduled' : 'draft',
            scheduledAt: data.scheduled_at ? new Date(data.scheduled_at) : undefined,
            createdBy: data.created_by,
        });
        return post;
    }
    async publishPost(id) {
        const post = await this.postRepo.findOne({ where: { id } });
        if (!post)
            throw new common_1.NotFoundException('帖子不存在');
        const page = await this.pageRepo.findOne({ where: { id: post.pageId } });
        if (!page)
            throw new common_1.NotFoundException('Facebook 页面不存在');
        try {
            const mediaFbids = [];
            if (post.imageAssetIds?.length) {
                for (const assetId of post.imageAssetIds) {
                    const asset = await this.assetRepo.findOne({ where: { id: assetId } });
                    if (asset) {
                        const fbid = await this.uploadPhotoToFacebook(page.pageId, page.accessToken, asset.filePath);
                        if (fbid)
                            mediaFbids.push(fbid);
                    }
                }
            }
            const fbPostId = await this.createFacebookPost(page.pageId, page.accessToken, post.message, mediaFbids);
            post.fbPostId = fbPostId;
            post.status = 'published';
            post.publishedAt = new Date();
            return this.postRepo.save(post);
        }
        catch (error) {
            post.status = 'failed';
            post.errorMessage = error.message;
            await this.postRepo.save(post);
            throw new common_1.BadRequestException(`发布失败: ${error.message}`);
        }
    }
    async deletePost(id) {
        const post = await this.postRepo.findOne({ where: { id } });
        if (!post)
            throw new common_1.NotFoundException('帖子不存在');
        await this.postRepo.remove(post);
    }
    async processScheduledPosts() {
        const posts = await this.postRepo.find({
            where: { status: 'scheduled', scheduledAt: (0, typeorm_2.LessThanOrEqual)(new Date()) },
            take: 10,
            order: { scheduledAt: 'ASC' },
        });
        for (const post of posts) {
            try {
                await this.publishPost(post.id);
                this.logger.log(`Published scheduled post ${post.id}`);
            }
            catch (error) {
                this.logger.error(`Failed to publish scheduled post ${post.id}: ${error.message}`);
            }
        }
    }
    async syncAnalytics() {
        const posts = await this.postRepo.find({
            where: { status: 'published' },
            order: { publishedAt: 'DESC' },
        });
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        for (const post of posts) {
            if (!post.fbPostId || (post.publishedAt && post.publishedAt < thirtyDaysAgo))
                continue;
            try {
                const page = await this.pageRepo.findOne({ where: { id: post.pageId } });
                if (!page)
                    continue;
                const stats = await this.getPostInsights(page.pageId, page.accessToken, post.fbPostId);
                post.likesCount = stats.likes;
                post.commentsCount = stats.comments;
                post.sharesCount = stats.shares;
                await this.postRepo.save(post);
            }
            catch (error) {
                this.logger.warn(`Failed to sync analytics for post ${post.id}: ${error.message}`);
            }
        }
    }
    async uploadPhotoToFacebook(pageId, accessToken, imagePath) {
        const uploadDir = process.env.UPLOAD_DEST || './uploads';
        const fs = require('fs');
        const FormData = require('form-data');
        const filePath = require('path').join(uploadDir, imagePath);
        const form = new FormData();
        form.append('source', fs.createReadStream(filePath));
        form.append('published', 'false');
        form.append('access_token', accessToken);
        const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, { method: 'POST', body: form });
        const data = await response.json();
        return data.id || null;
    }
    async createFacebookPost(pageId, accessToken, message, mediaFbids) {
        const body = { message, access_token: accessToken };
        if (mediaFbids.length === 1) {
            body.attached_media = [{ media_fbid: mediaFbids[0] }];
        }
        else if (mediaFbids.length > 1) {
            body.attached_media = mediaFbids.map(id => ({ media_fbid: id }));
        }
        const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (data.error)
            throw new Error(data.error.message);
        return data.id;
    }
    async getPostInsights(pageId, accessToken, postId) {
        const response = await fetch(`https://graph.facebook.com/v19.0/${postId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${accessToken}`);
        const data = await response.json();
        return {
            likes: data.likes?.summary?.total_count || 0,
            comments: data.comments?.summary?.total_count || 0,
            shares: data.shares?.count || 0,
        };
    }
};
exports.FacebookService = FacebookService;
exports.FacebookService = FacebookService = FacebookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(facebook_page_entity_1.FacebookPage)),
    __param(1, (0, typeorm_1.InjectRepository)(facebook_post_entity_1.FacebookPost)),
    __param(2, (0, typeorm_1.InjectRepository)(image_asset_entity_1.ImageAsset)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], FacebookService);
//# sourceMappingURL=facebook.service.js.map