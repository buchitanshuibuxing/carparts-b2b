import { PartClassification } from './part-classification.entity';
export declare class Part {
    id: number;
    oeNumber: string;
    partNameCn: string;
    partNameEn: string;
    partNameKo: string;
    classificationId: number;
    classification: PartClassification;
    category: string;
    subCategory: string;
    brand: string;
    carModel: string;
    engineType: string;
    modelYearFrom: number;
    modelYearTo: number;
    partType: string;
    specifications: Record<string, any>;
    unit: string;
    weightKg: number;
    dimensionsCm: string;
    hsCode: string;
    notes: string;
    isActive: boolean;
    createdBy: number;
    updatedBy: number;
    createdAt: Date;
    updatedAt: Date;
}
