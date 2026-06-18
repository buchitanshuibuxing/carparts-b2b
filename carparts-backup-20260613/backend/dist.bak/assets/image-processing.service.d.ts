export interface ThumbnailPaths {
    small: string;
    medium: string;
    large: string;
}
export interface VideoMetadata {
    width: number;
    height: number;
    duration: number;
}
export declare class ImageProcessingService {
    private readonly logger;
    private readonly uploadDir;
    ensureDirs(): Promise<void>;
    isVideo(mimeType: string): boolean;
    saveOriginal(buffer: Buffer, originalName: string): Promise<{
        filePath: string;
        fileName: string;
        width: number;
        height: number;
        mimeType: string;
    }>;
    saveVideo(buffer: Buffer, originalName: string, mimeType: string): Promise<{
        filePath: string;
        fileName: string;
        width: number;
        height: number;
        mimeType: string;
        duration: number;
    }>;
    getVideoMetadata(absPath: string): VideoMetadata;
    extractVideoThumbnail(absPath: string, uuid: string): Promise<ThumbnailPaths>;
    generateThumbnails(buffer: Buffer, uuid: string): Promise<ThumbnailPaths>;
    cropImage(buffer: Buffer, x: number, y: number, width: number, height: number): Promise<Buffer>;
    resizeImage(buffer: Buffer, width: number, height: number): Promise<Buffer>;
    addWatermark(buffer: Buffer, text: string): Promise<Buffer>;
    getAbsolutePath(relPath: string): string;
}
