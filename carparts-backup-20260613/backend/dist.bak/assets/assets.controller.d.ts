import { AssetsService } from './assets.service';
import { ImportSourcesService } from './import-sources.service';
export declare class AssetsController {
    private svc;
    private importSourcesSvc;
    constructor(svc: AssetsService, importSourcesSvc: ImportSourcesService);
    upload(file: Express.Multer.File, body: any, uid: number): Promise<{
        tags: import("./entities/asset-tag.entity").AssetTag[];
        id: number;
        partId: number;
        filePath: string;
        fileName: string;
        fileSize: number;
        width: number;
        height: number;
        type: string;
        mimeType: string;
        duration: number;
        ocrText: string;
        ocrStatus: string;
        category: string;
        isPrimary: boolean;
        sortOrder: number;
        classificationId: number;
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
        uploadedBy: number;
        createdAt: Date;
    }>;
    batchUpload(files: Express.Multer.File[], body: any, uid: number): Promise<any[]>;
    findAll(p?: number, ps?: number, cid?: number, kw?: string, oe?: string, pt?: string, br?: string, pid?: number, cat?: string, tids?: string, type?: string): Promise<import("../common/dto/paginated-response.dto").PaginatedResponseDto<import("./entities/image-asset.entity").ImageAsset>>;
    getSources(): Promise<import("./entities/import-source.entity").ImportSource[]>;
    createSource(body: any): Promise<import("./entities/import-source.entity").ImportSource>;
    updateSource(id: number, body: any): Promise<import("./entities/import-source.entity").ImportSource>;
    deleteSource(id: number): Promise<void>;
    testSource(id: number): Promise<{
        success: boolean;
        message: string;
        fileCount?: number;
        totalFiles?: number;
        sampleFiles?: string[];
    }>;
    browseSource(id: number, dirPath?: string): Promise<{
        path: string;
        name: string;
        isDirectory: boolean;
        size?: number;
    }[]>;
    startImport(id: number): Promise<{
        message: string;
    }>;
    stopImport(id: number): Promise<{
        message: string;
    }>;
    getImportProgress(id: number): Promise<{
        status: string;
        progress: {
            imported: number;
            skipped: number;
            errors: number;
            total: number;
            currentFile: string;
        } | null;
        errorMessage: string;
        lastSyncAt: Date;
    }>;
    findOne(id: number): Promise<{
        tags: import("./entities/asset-tag.entity").AssetTag[];
        id: number;
        partId: number;
        filePath: string;
        fileName: string;
        fileSize: number;
        width: number;
        height: number;
        type: string;
        mimeType: string;
        duration: number;
        ocrText: string;
        ocrStatus: string;
        category: string;
        isPrimary: boolean;
        sortOrder: number;
        classificationId: number;
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
        uploadedBy: number;
        createdAt: Date;
    }>;
    update(id: number, body: any): Promise<{
        tags: import("./entities/asset-tag.entity").AssetTag[];
        id: number;
        partId: number;
        filePath: string;
        fileName: string;
        fileSize: number;
        width: number;
        height: number;
        type: string;
        mimeType: string;
        duration: number;
        ocrText: string;
        ocrStatus: string;
        category: string;
        isPrimary: boolean;
        sortOrder: number;
        classificationId: number;
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
        uploadedBy: number;
        createdAt: Date;
    }>;
    remove(id: number): Promise<void>;
    batchDelete(body: {
        ids: number[];
    }): Promise<{
        deleted: number;
    }>;
    batchClassify(body: {
        ids: number[];
        classification_id: number;
    }): Promise<{
        updated: number;
    }>;
    batchTag(body: {
        ids: number[];
        tag_ids: number[];
    }): Promise<{
        updated: number;
    }>;
    batchUpdate(body: {
        ids: number[];
        recognized_oe_number?: string;
        recognized_part_type?: string;
        recognized_brand?: string;
        part_name_cn?: string;
        part_name_en?: string;
    }): Promise<{
        updated: number;
    }>;
    recognizeAsset(id: number, body: {
        ocr?: boolean;
        ai?: boolean;
        oeLookup?: boolean;
    }): Promise<{
        tags: import("./entities/asset-tag.entity").AssetTag[];
        id: number;
        partId: number;
        filePath: string;
        fileName: string;
        fileSize: number;
        width: number;
        height: number;
        type: string;
        mimeType: string;
        duration: number;
        ocrText: string;
        ocrStatus: string;
        category: string;
        isPrimary: boolean;
        sortOrder: number;
        classificationId: number;
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
        uploadedBy: number;
        createdAt: Date;
    }>;
    batchRecognize(body: {
        ids: number[];
        ocr?: boolean;
        ai?: boolean;
        oeLookup?: boolean;
    }): Promise<{
        processed: number;
        failed: number;
        errors: string[] | undefined;
    }>;
    batchUndoRecognize(body: {
        ids: number[];
    }): Promise<{
        processed: number;
        failed: number;
    }>;
    undoRecognize(id: number): Promise<{
        tags: import("./entities/asset-tag.entity").AssetTag[];
        id: number;
        partId: number;
        filePath: string;
        fileName: string;
        fileSize: number;
        width: number;
        height: number;
        type: string;
        mimeType: string;
        duration: number;
        ocrText: string;
        ocrStatus: string;
        category: string;
        isPrimary: boolean;
        sortOrder: number;
        classificationId: number;
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
        uploadedBy: number;
        createdAt: Date;
    }>;
    getClassifications(): Promise<import("./entities/asset-classification.entity").AssetClassification[]>;
    createClassification(body: any): Promise<{
        name: string;
        parentId: number | undefined;
        description: string;
    } & import("./entities/asset-classification.entity").AssetClassification>;
    deleteClassification(id: number): Promise<void>;
    getTags(): Promise<import("./entities/asset-tag.entity").AssetTag[]>;
    createTag(body: any): Promise<{
        name: string;
        color: string;
    } & import("./entities/asset-tag.entity").AssetTag>;
    deleteTag(id: number): Promise<void>;
    cropImage(id: number, body: {
        x: number;
        y: number;
        width: number;
        height: number;
    }): Promise<import("./entities/image-asset.entity").ImageAsset>;
    addWatermark(id: number, body: {
        text: string;
    }): Promise<import("./entities/image-asset.entity").ImageAsset>;
}
