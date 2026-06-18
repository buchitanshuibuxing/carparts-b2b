import type { Response } from 'express';
import { ImportExportService } from './import-export.service';
export declare class ImportExportController {
    private svc;
    constructor(svc: ImportExportService);
    preview(file: Express.Multer.File, body: {
        import_type: string;
    }): Promise<{
        total_rows: number;
        unique_ids: number;
        duplicate_count: number;
        duplicates: string[];
    }>;
    import(file: Express.Multer.File, body: {
        import_type: string;
        duplicate_strategy?: string;
        field_mapping?: string;
    }): Promise<{
        total_rows: number;
        success_count: number;
        skipped_count: number;
        error_count: number;
        errors: string[];
    }>;
    importRow(body: {
        import_type: string;
        row: Record<string, any>;
        duplicate_strategy?: string;
    }): Promise<{
        action: string;
    }>;
    importBatch(body: {
        import_type: string;
        rows: Record<string, any>[];
        duplicate_strategy?: string;
    }): Promise<{
        success: number;
        skipped: number;
        failed: number;
        errors: string[];
    }>;
    getTemplate(type: string, res: Response): Promise<void>;
    exportData(type: string, res: Response): Promise<void>;
}
