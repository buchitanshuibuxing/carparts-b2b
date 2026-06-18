import { Repository, DataSource } from 'typeorm';
import { Inventory } from './entities/inventory.entity';
import { InventoryLog } from './entities/inventory-log.entity';
import { Part } from '../parts/entities/part.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
export declare class InventoryService {
    private inventoryRepo;
    private logRepo;
    private partRepo;
    private dataSource;
    constructor(inventoryRepo: Repository<Inventory>, logRepo: Repository<InventoryLog>, partRepo: Repository<Part>, dataSource: DataSource);
    findAll(page?: number, pageSize?: number, filters?: {
        warehouse_zone?: string;
        category?: string;
        is_low_stock?: boolean;
        keyword?: string;
    }): Promise<PaginatedResponseDto<{
        oe_number: string;
        part_name_cn: string;
        brand: string;
        category: string;
        id: number;
        partId: number;
        quantity: number;
        reservedQuantity: number;
        warehouseLocation: string;
        warehouseZone: string;
        minStock: number;
        maxStock: number;
        lastStockCheck: Date;
        lastRestockDate: Date;
        notes: string;
        createdAt: Date;
        updatedAt: Date;
    }>>;
    findByPart(partId: number): Promise<Inventory>;
    create(data: {
        part_id: number;
        quantity?: number;
        warehouse_location?: string;
        warehouse_zone?: string;
        min_stock?: number;
        max_stock?: number;
        notes?: string;
    }, operatorId?: number): Promise<Inventory>;
    updateOne(id: number, data: {
        warehouse_location?: string;
        warehouse_zone?: string;
        min_stock?: number;
        max_stock?: number;
        notes?: string;
    }): Promise<Inventory>;
    removeOne(id: number): Promise<{
        deleted: number;
    }>;
    adjustStock(partId: number, delta: number, reason: string, operatorId?: number): Promise<Inventory>;
    batchUpdate(ids: number[], data: {
        warehouse_location?: string;
        warehouse_zone?: string;
        min_stock?: number;
        max_stock?: number;
        notes?: string;
    }): Promise<{
        updated: number;
    }>;
    batchDelete(ids: number[]): Promise<{
        deleted: number;
    }>;
    syncFromParts(): Promise<{
        synced: number;
        message: string;
    }>;
    getLowStock(limit?: number): Promise<Inventory[]>;
    getLogs(partId: number, page?: number, pageSize?: number): Promise<PaginatedResponseDto<InventoryLog>>;
    getAllLogs(page?: number, pageSize?: number, keyword?: string): Promise<PaginatedResponseDto<{
        oe_number: string;
        part_name_cn: string;
        id: number;
        partId: number;
        changeType: string;
        quantityChange: number;
        quantityBefore: number;
        quantityAfter: number;
        reason: string;
        referenceType: string;
        referenceId: number;
        operatorId: number;
        createdAt: Date;
    }>>;
}
