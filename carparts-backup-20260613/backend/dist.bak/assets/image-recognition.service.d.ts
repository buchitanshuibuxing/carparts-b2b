import { SettingsService } from '../settings/settings.service';
export interface RecognitionResult {
    oe_numbers: string[];
    part_type: string;
    brand: string;
    part_name_cn: string;
    part_name_en: string;
    description: string;
    confidence: number;
}
export declare class ImageRecognitionService {
    private settingsSvc;
    private readonly logger;
    constructor(settingsSvc: SettingsService);
    recognize(imagePath: string): Promise<{
        result: RecognitionResult;
        status: string;
    }>;
    private recognizeWithOpenAICompatible;
    private recognizeWithClaude;
    private parseRecognitionResult;
}
