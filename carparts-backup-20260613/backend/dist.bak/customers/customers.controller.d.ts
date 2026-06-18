import { CustomersService } from './customers.service';
import { SettingsService } from '../settings/settings.service';
export declare class CustomersController {
    private svc;
    private settingsSvc;
    constructor(svc: CustomersService, settingsSvc: SettingsService);
    findAll(p?: number, ps?: number, kw?: string, a?: string, ct?: string): Promise<import("../common/dto/paginated-response.dto").PaginatedResponseDto<import("./entities/customer.entity").Customer>>;
    findOne(id: number): Promise<import("./entities/customer.entity").Customer>;
    create(body: any): Promise<import("./entities/customer.entity").Customer>;
    update(id: number, body: any): Promise<import("./entities/customer.entity").Customer>;
    toggle(id: number, body: {
        is_active: boolean;
    }): Promise<import("./entities/customer.entity").Customer>;
    remove(id: number): Promise<void>;
    getCustomerTypes(): Promise<{
        types: any;
        levels: any;
    }>;
    updateCustomerTypes(body: {
        types?: string[];
        levels?: string[];
    }): Promise<{
        success: boolean;
    }>;
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
