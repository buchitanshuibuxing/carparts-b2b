import { InventoryService } from './inventory.service';
export declare class InventoryController {
    private inventoryService;
    constructor(inventoryService: InventoryService);
    findAll(page?: number, pageSize?: number, zone?: string, isLowStock?: string, keyword?: string): Promise<import("../common/dto/paginated-response.dto").PaginatedResponseDto<{
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
    getLowStock(limit?: number): Promise<import("./entities/inventory.entity").Inventory[]>;
    findByPart(partId: number): Promise<import("./entities/inventory.entity").Inventory>;
    getLogs(partId: number, page?: number, pageSize?: number): Promise<import("../common/dto/paginated-response.dto").PaginatedResponseDto<import("./entities/inventory-log.entity").InventoryLog>>;
    adjustStock(body: {
        part_id: number;
        delta: number;
        reason: string;
    }, userId: number): Promise<import("./entities/inventory.entity").Inventory>;
    updateOne(id: number, body: {
        warehouse_location?: string;
        warehouse_zone?: string;
        min_stock?: number;
        max_stock?: number;
        notes?: string;
    }): Promise<import("./entities/inventory.entity").Inventory>;
    removeOne(id: number): Promise<{
        deleted: number;
    }>;
    create(body: {
        part_id: number;
        quantity?: number;
        warehouse_location?: string;
        warehouse_zone?: string;
        min_stock?: number;
        max_stock?: number;
        notes?: string;
    }, userId: number): Promise<import("./entities/inventory.entity").Inventory>;
    syncFromParts(): Promise<{
        synced: number;
        message: string;
    }>;
    batchUpdate(body: {
        ids: number[];
        warehouse_location?: string;
        warehouse_zone?: string;
        min_stock?: number;
        max_stock?: number;
        notes?: string;
    }): Promise<{
        updated: number;
    }>;
    batchDelete(body: {
        ids: number[];
    }): Promise<{
        deleted: number;
    }>;
    getAllLogs(page?: number, pageSize?: number, keyword?: string): Promise<import("../common/dto/paginated-response.dto").PaginatedResponseDto<{
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
