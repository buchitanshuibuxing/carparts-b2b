import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { SupplierPart } from './entities/supplier-part.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
export declare class SuppliersService {
    private supplierRepo;
    private supplierPartRepo;
    constructor(supplierRepo: Repository<Supplier>, supplierPartRepo: Repository<SupplierPart>);
    findAll(page?: number, pageSize?: number, isActive?: boolean): Promise<PaginatedResponseDto<Supplier>>;
    findOne(id: number): Promise<Supplier>;
    create(data: any): Promise<Supplier>;
    update(id: number, data: any): Promise<Supplier>;
    toggleActive(id: number, isActive: boolean): Promise<Supplier>;
    linkPart(data: {
        supplier_id: number;
        part_id: number;
        supplier_sku?: string;
        moq?: number;
        lead_time_days?: number;
    }): Promise<SupplierPart>;
    getSupplierParts(supplierId: number): Promise<SupplierPart[]>;
    remove(id: number): Promise<void>;
    batchUpdate(ids: number[], data: any): Promise<{
        updated: number;
    }>;
    batchDelete(ids: number[]): Promise<{
        deleted: number;
    }>;
}
