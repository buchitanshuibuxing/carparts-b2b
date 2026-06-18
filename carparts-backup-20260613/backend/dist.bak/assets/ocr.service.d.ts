import { SettingsService } from '../settings/settings.service';
export declare class OcrService {
    private settingsSvc;
    private readonly logger;
    private baiduTokenCache;
    constructor(settingsSvc: SettingsService);
    recognizeText(imagePath: string): Promise<{
        text: string;
        status: string;
    }>;
    private tesseractOCR;
    private baiduOCR;
    private getBaiduAccessToken;
    private tencentOCR;
    private aliyunOCR;
    private customOCR;
    private sha256Hex;
    private hmacSha256Bytes;
    private hmacSha256Hex;
    private hmacSha1Base64;
    private percentEncode;
}
