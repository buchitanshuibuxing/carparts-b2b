import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
export declare class CustomersService {
    private repo;
    constructor(repo: Repository<Customer>);
    findAll(page?: number, pageSize?: number, filters?: {
        customer_type?: string;
        region?: string;
        is_active?: boolean;
        keyword?: string;
    }): Promise<PaginatedResponseDto<Customer>>;
    findOne(id: number): Promise<Customer>;
    create(data: any): Promise<Customer>;
    update(id: number, data: any): Promise<Customer>;
    toggleActive(id: number, isActive: boolean): Promise<Customer>;
    remove(id: number): Promise<void>;
    batchUpdate(ids: number[], data: any): Promise<{
        updated: number;
    }>;
    batchDelete(ids: number[]): Promise<{
        deleted: number;
    }>;
}
