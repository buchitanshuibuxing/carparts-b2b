export interface FacebookPage {
  id: number;
  pageId: string;
  pageName: string;
  profilePicture: string;
  isActive: boolean;
  connectedBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FacebookPost {
  id: number;
  pageId: number;
  fbPostId?: string;
  message: string;
  imageAssetIds: number[];
  status: string;
  scheduledAt?: string;
  publishedAt?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  errorMessage: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}
