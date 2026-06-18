import { FacebookService } from './facebook.service';
export declare class FacebookController {
    private svc;
    constructor(svc: FacebookService);
    getPages(): Promise<import("./entities/facebook-page.entity").FacebookPage[]>;
    connectPage(body: any, uid: number): Promise<import("./entities/facebook-page.entity").FacebookPage>;
    disconnectPage(id: number): Promise<import("./entities/facebook-page.entity").FacebookPage>;
    getPosts(pid?: number, s?: string): Promise<import("./entities/facebook-post.entity").FacebookPost[]>;
    createPost(body: any, uid: number): Promise<{
        pageId: number;
        message: string;
        imageAssetIds: number[];
        status: string;
        scheduledAt: Date | undefined;
        createdBy: number | undefined;
    } & import("./entities/facebook-post.entity").FacebookPost>;
    publishPost(id: number): Promise<import("./entities/facebook-post.entity").FacebookPost>;
    deletePost(id: number): Promise<void>;
}
