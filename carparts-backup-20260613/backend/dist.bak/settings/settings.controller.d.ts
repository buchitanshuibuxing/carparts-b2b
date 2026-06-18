import { SettingsService } from './settings.service';
export declare class SettingsController {
    private svc;
    constructor(svc: SettingsService);
    getAll(): Promise<Record<string, string>>;
    update(key: string, body: {
        value: string;
    }): Promise<import("./entities/setting.entity").Setting>;
    testConnection(type: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
