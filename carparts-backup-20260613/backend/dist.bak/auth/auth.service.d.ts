import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
export declare class AuthService {
    private userRepo;
    private jwtService;
    constructor(userRepo: Repository<User>, jwtService: JwtService);
    login(username: string, password: string): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: number;
            username: string;
            email: string;
            displayName: string;
            role: string;
            avatarUrl: string;
        };
    }>;
    register(username: string, email: string, password: string, displayName?: string): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: number;
            username: string;
            email: string;
            displayName: string;
            role: string;
            avatarUrl: string;
        };
    }>;
    getProfile(userId: number): Promise<{
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
    refreshToken(refreshToken: string): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: number;
            username: string;
            email: string;
            displayName: string;
            role: string;
            avatarUrl: string;
        };
    }>;
    private generateTokens;
}
