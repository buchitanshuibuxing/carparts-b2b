export interface Part {
  id: number;
  oeNumber: string;
  partNameCn: string;
  partNameEn: string;
  partNameKo: string;
  classificationId?: number;
  classification?: { id: number; name: string };
  category: string;
  subCategory: string;
  brand: string;
  carModel: string;
  engineType: string;
  modelYearFrom?: number;
  modelYearTo?: number;
  partType: string;
  specifications: Record<string, any>;
  unit: string;
  weightKg: number;
  dimensionsCm: string;
  hsCode: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  inventory?: { quantity: number; reservedQuantity: number; minStock: number };
}
