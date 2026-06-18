import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
export declare class SettingsService {
    private repo;
    private readonly logger;
    constructor(repo: Repository<Setting>);
    getAll(): Promise<Record<string, string>>;
    update(key: string, value: string): Promise<Setting>;
    testConnection(type: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private testOcr;
    private testBaiduOcr;
    private testTencentOcr;
    private testAliyunOcr;
    private testCustomOcr;
    private testAiApi;
    private testAnthropicApi;
    private sha256Hex;
    private hmacSha256Bytes;
    private hmacSha256Hex;
    private hmacSha1Base64;
    private percentEncode;
}
