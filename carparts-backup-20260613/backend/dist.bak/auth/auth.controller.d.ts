import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(body: {
        username: string;
        password: string;
    }): Promise<{
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
    register(body: {
        username: string;
        email: string;
        password: string;
        display_name?: string;
    }): Promise<{
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
    refresh(body: {
        refresh_token: string;
    }): Promise<{
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
}
