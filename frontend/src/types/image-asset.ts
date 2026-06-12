export interface ImageAsset {
  id: number;
  partId?: number;
  type: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  mimeType: string;
  duration: number;
  ocrText: string;
  ocrStatus: string;
  tags: string;
  category: string;
  isPrimary: boolean;
  sortOrder: number;
  classificationId?: number;
  thumbnailSmallPath: string;
  thumbnailMediumPath: string;
  thumbnailLargePath: string;
  recognitionStatus: string;
  recognizedOeNumber: string;
  recognizedPartType: string;
  recognizedBrand: string;
  partNameCn: string;
  partNameEn: string;
  recognitionConfidence: number;
  recognitionResult: Record<string, any>;
  uploadedBy?: number;
  createdAt: string;
}

export interface AssetTag {
  id: number;
  name: string;
  color: string;
  usageCount: number;
  createdAt: string;
}

export interface AssetClassification {
  id: number;
  name: string;
  parentId?: number;
  description: string;
  sortOrder: number;
  createdAt: string;
}
