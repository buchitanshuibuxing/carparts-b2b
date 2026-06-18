import { Repository } from 'typeorm';
import { Part } from '../parts/entities/part.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Price } from '../prices/entities/price.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { SettingsService } from '../settings/settings.service';
export declare class ImportExportService {
    private partRepo;
    private inventoryRepo;
    private supplierRepo;
    private customerRepo;
    private priceRepo;
    private orderRepo;
    private orderItemRepo;
    private settingsSvc;
    constructor(partRepo: Repository<Part>, inventoryRepo: Repository<Inventory>, supplierRepo: Repository<Supplier>, customerRepo: Repository<Customer>, priceRepo: Repository<Price>, orderRepo: Repository<Order>, orderItemRepo: Repository<OrderItem>, settingsSvc: SettingsService);
    previewImport(file: Express.Multer.File, importType: string): Promise<{
        total_rows: number;
        unique_ids: number;
        duplicate_count: number;
        duplicates: string[];
    }>;
    importFromExcel(file: Express.Multer.File, importType: string, fieldMapping?: Record<string, string>, duplicateStrategy?: 'overwrite' | 'skip'): Promise<{
        total_rows: number;
        success_count: number;
        skipped_count: number;
        error_count: number;
        errors: string[];
    }>;
    importSingleRow(importType: string, row: Record<string, any>, duplicateStrategy?: 'overwrite' | 'skip'): Promise<{
        action: string;
    }>;
    importBatchRows(importType: string, rows: Record<string, any>[], duplicateStrategy?: 'overwrite' | 'skip'): Promise<{
        success: number;
        skipped: number;
        failed: number;
        errors: string[];
    }>;
    exportTemplate(importType: string): Promise<{
        path: string;
    }>;
    exportData(exportType: string): Promise<Buffer>;
}
