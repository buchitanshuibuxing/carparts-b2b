export interface InventoryItem {
  id: number;
  partId: number;
  quantity: number;
  reservedQuantity: number;
  warehouseLocation: string;
  warehouseZone: string;
  minStock: number;
  maxStock: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLog {
  id: number;
  partId: number;
  changeType: string;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string;
  referenceType: string;
  createdAt: string;
}
