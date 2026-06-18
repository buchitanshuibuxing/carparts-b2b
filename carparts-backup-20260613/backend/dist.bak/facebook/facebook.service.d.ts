import { Repository } from 'typeorm';
import { FacebookPage } from './entities/facebook-page.entity';
import { FacebookPost } from './entities/facebook-post.entity';
import { ImageAsset } from '../assets/entities/image-asset.entity';
export declare class FacebookService {
    private pageRepo;
    private postRepo;
    private assetRepo;
    private readonly logger;
    constructor(pageRepo: Repository<FacebookPage>, postRepo: Repository<FacebookPost>, assetRepo: Repository<ImageAsset>);
    getPages(): Promise<FacebookPage[]>;
    connectPage(data: {
        page_id: string;
        page_name: string;
        access_token: string;
        profile_picture?: string;
        connected_by?: number;
    }): Promise<FacebookPage>;
    disconnectPage(id: number): Promise<FacebookPage>;
    getPosts(pageId?: number, status?: string): Promise<FacebookPost[]>;
    createPost(data: {
        page_id: number;
        message: string;
        image_asset_ids?: number[];
        scheduled_at?: string;
        created_by?: number;
    }): Promise<{
        pageId: number;
        message: string;
        imageAssetIds: number[];
        status: string;
        scheduledAt: Date | undefined;
        createdBy: number | undefined;
    } & FacebookPost>;
    publishPost(id: number): Promise<FacebookPost>;
    deletePost(id: number): Promise<void>;
    processScheduledPosts(): Promise<void>;
    syncAnalytics(): Promise<void>;
    private uploadPhotoToFacebook;
    private createFacebookPost;
    private getPostInsights;
}
