import { PricesService } from './prices.service';
import { SettingsService } from '../settings/settings.service';
export declare class PricesController {
    private svc;
    private settingsSvc;
    constructor(svc: PricesService, settingsSvc: SettingsService);
    findAll(page?: number, limit?: number, kw?: string, pt?: string): Promise<{
        data: {
            part: import("../parts/entities/part.entity").Part | null;
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
    findByPart(partId: number): Promise<import("./entities/price.entity").Price[]>;
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
    setPrice(body: any): Promise<import("./entities/price.entity").Price>;
    updateOne(id: number, body: any): Promise<import("./entities/price.entity").Price>;
    deletePrice(id: number): Promise<void>;
    batchUpdate(body: {
        ids: number[];
    } & Record<string, any>): Promise<{
        updated: number;
    }>;
    batchDelete(body: {
        ids: number[];
    }): Promise<{
        deleted: number;
    }>;
    syncFromParts(): Promise<{
        synced: number;
        skipped: number;
    }>;
    getTypes(): Promise<{
        types: any;
        currencies: any;
    }>;
    updateTypes(body: {
        types?: string[];
        currencies?: string[];
    }): Promise<{
        success: boolean;
    }>;
}
