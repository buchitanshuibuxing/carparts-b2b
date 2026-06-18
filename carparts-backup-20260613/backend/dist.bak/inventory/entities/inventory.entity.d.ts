export declare class Inventory {
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
}
