import { Repository } from 'typeorm';
import { ImportSource } from './entities/import-source.entity';
import { ImageAsset } from './entities/image-asset.entity';
import { AssetClassification } from './entities/asset-classification.entity';
import { ImageProcessingService } from './image-processing.service';
import { OcrService } from './ocr.service';
import { ImageRecognitionService } from './image-recognition.service';
import { SettingsService } from '../settings/settings.service';
import { Part } from '../parts/entities/part.entity';
export declare class ImportSourcesService {
    private sourceRepo;
    private assetRepo;
    private classRepo;
    private partRepo;
    private imageProcessing;
    private ocrService;
    private recognitionService;
    private settingsSvc;
    private readonly logger;
    private isScanning;
    private stopFlags;
    private oeLookupCache;
    constructor(sourceRepo: Repository<ImportSource>, assetRepo: Repository<ImageAsset>, classRepo: Repository<AssetClassification>, partRepo: Repository<Part>, imageProcessing: ImageProcessingService, ocrService: OcrService, recognitionService: ImageRecognitionService, settingsSvc: SettingsService);
    findAll(): Promise<ImportSource[]>;
    findOne(id: number): Promise<ImportSource>;
    create(data: Partial<ImportSource>): Promise<ImportSource>;
    update(id: number, data: Partial<ImportSource>): Promise<ImportSource>;
    remove(id: number): Promise<void>;
    handleScheduledScans(): Promise<void>;
    testConnection(id: number): Promise<{
        success: boolean;
        message: string;
        fileCount?: number;
        totalFiles?: number;
        sampleFiles?: string[];
    }>;
    browseDirectory(sourceId: number, dirPath: string): Promise<{
        path: string;
        name: string;
        isDirectory: boolean;
        size?: number;
    }[]>;
    startImport(sourceId: number): Promise<{
        message: string;
    }>;
    stopImport(sourceId: number): Promise<{
        message: string;
    }>;
    getImportProgress(sourceId: number): Promise<{
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
    private runImport;
    private listRemoteFiles;
    private listWebDAVFiles;
    private listFTPFiles;
    private listLocalFiles;
    private downloadWithRetry;
    private downloadFile;
    extractOeNumber(filename: string): string | null;
    private classifyByFolder;
    private processInBackground;
    private matchClassificationByAI;
    lookupPartNameByOE(oeNumber: string): Promise<{
        partNameCn: string;
        partNameEn: string;
        brand: string;
        partType: string;
    } | null>;
}
