import { UsersService } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    findAll(page?: number, pageSize?: number): Promise<import("../common/dto/paginated-response.dto").PaginatedResponseDto<import("./entities/user.entity").User>>;
    findOne(id: number): Promise<import("./entities/user.entity").User>;
    create(body: {
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
    update(id: number, body: any): Promise<{
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
