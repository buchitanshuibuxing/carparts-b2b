export declare class ImportSource {
    id: number;
    name: string;
    protocol: string;
    url: string;
    username: string;
    password: string;
    localMountPath: string;
    remotePath: string;
    autoClassify: boolean;
    folderMapping: Record<string, number>;
    scanInterval: number;
    lastScanAt: Date;
    lastSyncAt: Date;
    status: string;
    errorMessage: string;
    importProgress: {
        imported: number;
        skipped: number;
        errors: number;
        total: number;
        currentFile: string;
    } | null;
    createdAt: Date;
    updatedAt: Date;
}
