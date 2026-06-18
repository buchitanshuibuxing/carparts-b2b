import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
export declare class UsersService {
    private userRepo;
    constructor(userRepo: Repository<User>);
    findAll(page?: number, pageSize?: number): Promise<PaginatedResponseDto<User>>;
    findOne(id: number): Promise<User>;
    create(data: {
        username: string;
        email: string;
        password: string;
        display_name?: string;
        role?: string;
    }): Promise<{
        id: number;
        username: string;
        email: string;
        displayName: string;
        role: string;
        avatarUrl: string;
        isActive: boolean;
        lastLoginAt: Date;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: number, data: Partial<{
        display_name: string;
        email: string;
        role: string;
        is_active: boolean;
        password: string;
    }>): Promise<{
        id: number;
        username: string;
        email: string;
        displayName: string;
        role: string;
        avatarUrl: string;
        isActive: boolean;
        lastLoginAt: Date;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: number): Promise<void>;
}
