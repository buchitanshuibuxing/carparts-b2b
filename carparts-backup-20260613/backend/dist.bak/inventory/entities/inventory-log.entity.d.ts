export declare class InventoryLog {
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
}
