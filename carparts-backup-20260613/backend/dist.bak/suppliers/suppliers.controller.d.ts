import { SuppliersService } from './suppliers.service';
export declare class SuppliersController {
    private svc;
    constructor(svc: SuppliersService);
    findAll(p?: number, ps?: number, a?: string): Promise<import("../common/dto/paginated-response.dto").PaginatedResponseDto<import("./entities/supplier.entity").Supplier>>;
    findOne(id: number): Promise<import("./entities/supplier.entity").Supplier>;
    getParts(id: number): Promise<import("./entities/supplier-part.entity").SupplierPart[]>;
    create(body: any): Promise<import("./entities/supplier.entity").Supplier>;
    update(id: number, body: any): Promise<import("./entities/supplier.entity").Supplier>;
    toggle(id: number, body: {
        is_active: boolean;
    }): Promise<import("./entities/supplier.entity").Supplier>;
    linkPart(body: any): Promise<import("./entities/supplier-part.entity").SupplierPart>;
    remove(id: number): Promise<void>;
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
}
