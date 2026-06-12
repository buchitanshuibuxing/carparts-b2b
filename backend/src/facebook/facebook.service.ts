import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { FacebookPage } from './entities/facebook-page.entity';
import { FacebookPost } from './entities/facebook-post.entity';
import { ImageAsset } from '../assets/entities/image-asset.entity';
import { Part } from '../parts/entities/part.entity';
import { AiPostGenerator } from './ai-post-generator';

@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name);

  constructor(
    @InjectRepository(FacebookPage) private pageRepo: Repository<FacebookPage>,
    @InjectRepository(FacebookPost) private postRepo: Repository<FacebookPost>,
    @InjectRepository(ImageAsset) private assetRepo: Repository<ImageAsset>,
    @InjectRepository(Part) private partRepo: Repository<Part>,
    private aiGenerator: AiPostGenerator,
    private dataSource: DataSource,
  ) {}

  // ---- Pages ----
  async getPages() {
    return this.pageRepo.find({ order: { createdAt: 'DESC' } });
  }

  async connectPage(data: { page_id: string; page_name: string; access_token: string; profile_picture?: string; connected_by?: number }) {
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

  async disconnectPage(id: number) {
    const page = await this.pageRepo.findOne({ where: { id } });
    if (!page) throw new NotFoundException('页面不存在');
    page.isActive = false;
    return this.pageRepo.save(page);
  }

  // ---- Posts ----
  async getPosts(pageId?: number, status?: string) {
    const where: any = {};
    if (pageId) where.pageId = pageId;
    if (status) where.status = status;
    return this.postRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async createPost(data: { page_id: number; message: string; image_asset_ids?: number[]; scheduled_at?: string; created_by?: number }) {
    const page = await this.pageRepo.findOne({ where: { id: data.page_id } });
    if (!page) throw new NotFoundException('Facebook 页面不存在');

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

  async publishPost(id: number) {
    const post = await this.postRepo.findOne({ where: { id } });
    if (!post) throw new NotFoundException('帖子不存在');
    const page = await this.pageRepo.findOne({ where: { id: post.pageId } });
    if (!page) throw new NotFoundException('Facebook 页面不存在');

    try {
      // Upload images to Facebook first
      const mediaFbids: string[] = [];
      if (post.imageAssetIds?.length) {
        for (const assetId of post.imageAssetIds) {
          const asset = await this.assetRepo.findOne({ where: { id: assetId } });
          if (asset) {
            const fbid = await this.uploadPhotoToFacebook(page.pageId, page.accessToken, asset.filePath);
            if (fbid) mediaFbids.push(fbid);
          }
        }
      }

      // Create post
      const fbPostId = await this.createFacebookPost(page.pageId, page.accessToken, post.message, mediaFbids);

      post.fbPostId = fbPostId;
      post.status = 'published';
      post.publishedAt = new Date();
      return this.postRepo.save(post);
    } catch (error) {
      post.status = 'failed';
      post.errorMessage = error.message;
      await this.postRepo.save(post);
      throw new BadRequestException(`发布失败: ${error.message}`);
    }
  }

  async deletePost(id: number) {
    const post = await this.postRepo.findOne({ where: { id } });
    if (!post) throw new NotFoundException('帖子不存在');
    await this.postRepo.remove(post);
  }

  // ---- Scheduled posting (called by cron) ----
  async processScheduledPosts() {
    const posts = await this.postRepo.find({
      where: { status: 'scheduled', scheduledAt: LessThanOrEqual(new Date()) },
      take: 10,
      order: { scheduledAt: 'ASC' },
    });
    for (const post of posts) {
      try {
        await this.publishPost(post.id);
        this.logger.log(`Published scheduled post ${post.id}`);
      } catch (error) {
        this.logger.error(`Failed to publish scheduled post ${post.id}: ${error.message}`);
      }
    }
  }

  // ---- Analytics ----
  async syncAnalytics() {
    const posts = await this.postRepo.find({
      where: { status: 'published' },
      order: { publishedAt: 'DESC' },
    });
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    for (const post of posts) {
      if (!post.fbPostId || (post.publishedAt && post.publishedAt < thirtyDaysAgo)) continue;
      try {
        const page = await this.pageRepo.findOne({ where: { id: post.pageId } });
        if (!page) continue;
        const stats = await this.getPostInsights(page.pageId, page.accessToken, post.fbPostId);
        post.likesCount = stats.likes;
        post.commentsCount = stats.comments;
        post.sharesCount = stats.shares;
        await this.postRepo.save(post);
      } catch (error) {
        this.logger.warn(`Failed to sync analytics for post ${post.id}: ${error.message}`);
      }
    }
  }

  // ---- Facebook Graph API helpers ----
  private async uploadPhotoToFacebook(pageId: string, accessToken: string, imagePath: string): Promise<string | null> {
    const uploadDir = process.env.UPLOAD_DEST || './uploads';
    const fs = require('fs');
    const FormData = require('form-data');
    const filePath = require('path').join(uploadDir, imagePath);

    const form = new FormData();
    form.append('source', fs.createReadStream(filePath));
    form.append('published', 'false');
    form.append('access_token', accessToken);

    const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, { method: 'POST', body: form as any });
    const data = await response.json();
    return data.id || null;
  }

  // ---- AI Post Generation ----
  async generatePost(data: { asset_ids: number[]; template: 'product' | 'promo' | 'new' | 'custom'; custom_prompt?: string }) {
    const assets = await this.assetRepo.findByIds(data.asset_ids);
    const parts: any[] = [];

    for (const asset of assets) {
      const partInfo: any = {
        oeNumber: asset.recognizedOeNumber || '',
        partNameEn: asset.partNameEn || '',
        partNameCn: asset.partNameCn || '',
        brand: asset.recognizedBrand || '',
        category: asset.recognizedPartType || '',
      };

      // Try to get more info from parts table if we have OE number
      if (partInfo.oeNumber) {
        const part = await this.partRepo.findOne({ where: { oeNumber: partInfo.oeNumber } });
        if (part) {
          partInfo.partNameEn = part.partNameEn || partInfo.partNameEn;
          partInfo.partNameCn = part.partNameCn || partInfo.partNameCn;
          partInfo.brand = part.brand || partInfo.brand;
          partInfo.category = part.category || partInfo.category;
        }
      }

      parts.push(partInfo);
    }

    // Call async AI generator
    const generatedText = await this.aiGenerator.generatePost(parts, data.template, data.custom_prompt);

    return {
      text: generatedText,
      parts: parts,
      asset_count: assets.length,
    };
  }

  private async createFacebookPost(pageId: string, accessToken: string, message: string, mediaFbids: string[]): Promise<string> {
    const body: any = { message, access_token: accessToken };
    if (mediaFbids.length === 1) {
      body.attached_media = [{ media_fbid: mediaFbids[0] }];
    } else if (mediaFbids.length > 1) {
      body.attached_media = mediaFbids.map(id => ({ media_fbid: id }));
    }
    const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.id;
  }

  private async getPostInsights(pageId: string, accessToken: string, postId: string) {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${postId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${accessToken}`,
    );
    const data = await response.json();
    return {
      likes: data.likes?.summary?.total_count || 0,
      comments: data.comments?.summary?.total_count || 0,
      shares: data.shares?.count || 0,
    };
  }

  async translateText(text: string, targetLang: string = 'zh'): Promise<string> {
    const rows = await this.dataSource.query(
      "SELECT key, value FROM settings WHERE key IN ('ai_recognition_api_key', 'ai_recognition_model')"
    );
    const config = {};
    rows.forEach(r => { config[r.key] = r.value; });
    const apiKey = config['ai_recognition_api_key'] || '';
    const model = config['ai_recognition_model'] || 'glm-4-flash';
    if (!apiKey) return '';

    const langName = targetLang === 'zh' ? 'Chinese' : 'English';
    try {
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: `You are a translator. Translate the text to ${langName}. Keep line breaks and hashtags. Output ONLY the translation. Do not repeat or explain.` },
            { role: 'user', content: text },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (err: any) {
      this.logger.error('Translation failed: ' + err.message);
      return '';
    }
  }

}