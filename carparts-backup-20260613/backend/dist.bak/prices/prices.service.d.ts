import { Repository } from 'typeorm';
import { Price } from './entities/price.entity';
import { PriceLog } from './entities/price-log.entity';
import { Part } from '../parts/entities/part.entity';
export declare class PricesService {
    private priceRepo;
    private logRepo;
    private partRepo;
    constructor(priceRepo: Repository<Price>, logRepo: Repository<PriceLog>, partRepo: Repository<Part>);
    findAll(page?: number, limit?: number, filters?: {
        keyword?: string;
        price_type?: string;
    }): Promise<{
        data: {
            part: Part | null;
            id: number;
            partId: number;
            priceType: string;
            currency: string;
            unitPrice: number;
            minQuantity: number;
            maxQuantity: number;
            effectiveDate: string;
            expiryDate: string;
            notes: string;
            createdAt: Date;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    findByPart(partId: number): Promise<Price[]>;
    setPrice(data: {
        part_id: number;
        price_type?: string;
        currency?: string;
        unit_price: number;
        min_quantity?: number;
        max_quantity?: number;
        effective_date?: string;
        expiry_date?: string;
        reason?: string;
        operator?: string;
    }): Promise<Price>;
    updateOne(id: number, data: any): Promise<Price>;
    deletePrice(id: number): Promise<void>;
    batchUpdate(ids: number[], data: any): Promise<{
        updated: number;
    }>;
    batchDelete(ids: number[]): Promise<{
        deleted: number;
    }>;
    getHistory(partId: number): Promise<{
        priceType: string;
        currency: string;
        id: number;
        priceId: number;
        oldPrice: number;
        newPrice: number;
        changeReason: string;
        operator: string;
        createdAt: Date;
    }[]>;
    syncFromParts(): Promise<{
        synced: number;
        skipped: number;
    }>;
}
