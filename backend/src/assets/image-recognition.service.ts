import { Injectable, Logger } from '@nestjs/common';
import fs from 'fs/promises';
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

const PROMPT = `你是一个汽车配件识别专家。请仔细分析这张汽车配件图片，提取以下信息并返回严格的JSON格式：

{
  "oe_numbers": ["图片中找到的所有OE/OEM配件编号"],
  "part_type": "配件中文类型",
  "brand": "品牌名称",
  "part_name_cn": "该配件的标准中文名称",
  "part_name_en": "该配件的标准英文名称",
  "description": "配件简要描述",
  "confidence": 0.0-1.0
}

识别要求：
1. OE号码：从图片文字中读取，原样记录，不要修改数字。格式一般为5位数字+后缀，如 27300-3F100、18846-10060、22401-JA01B
2. 品牌（brand）：
   - 优先从图片上的文字、logo、包装标签直接读取品牌名
   - 如果图片上看不到明确品牌，请根据OE号码推断所属汽车品牌。你熟悉各大厂商的OE编号规律，例如：
     丰田(Toyota)/雷克萨斯(Lexus)、现代(Hyundai)/起亚(Kia)、日产(Nissan)、本田(Honda)、大众(VW/Audi)、宝马(BMW)、奔驰(Mercedes)、博世(Bosch)、电装(Denso)、NGK 等
   - 根据OE号码的数字前缀模式，判断该零件属于哪个汽车品牌或配件制造商
   - 如果实在无法判断，留空 ""
3. 配件类型和名称：根据图片中零件的外观形状准确判断
4. 中英文名称要准确对应

只返回JSON，不要其他文字。`;

// Provider presets: api_type -> { url, default_model }
const PROVIDER_PRESETS: Record<string, { url: string; model: string }> = {
  zhipu:      { url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4v-flash' },
  deepseek:   { url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
  qwen:       { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-vl-max' },
  doubao:     { url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-vision-pro-32k' },
  hunyuan:    { url: 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions', model: 'hunyuan-vision' },
  kimi:       { url: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k-vision' },
  mimo:       { url: 'https://api.xiaomi.com/v1/chat/completions', model: 'mimo-vl' },
  bailian:    { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-vl-max' },
  volcengine: { url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-vision-pro-32k' },
  openai:     { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' },
  anthropic:  { url: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-4-20250514' },
};

@Injectable()
export class ImageRecognitionService {
  private readonly logger = new Logger(ImageRecognitionService.name);

  constructor(private settingsSvc: SettingsService) {}

  async recognize(imagePath: string): Promise<{ result: RecognitionResult; status: string }> {
    const emptyResult: RecognitionResult = { oe_numbers: [], part_type: '', brand: '', part_name_cn: '', part_name_en: '', description: '', confidence: 0 };

    const settings = await this.settingsSvc.getAll();
    if (settings.ai_recognition_enabled === 'false') {
      return { result: emptyResult, status: 'skipped' };
    }

    try {
      const imageBuffer = await fs.readFile(imagePath);
      const base64 = imageBuffer.toString('base64');
      const ext = imagePath.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

      const apiType = settings.ai_recognition_api_type || 'zhipu';
      const apiKey = settings.ai_recognition_api_key || process.env.ZHIPU_API_KEY;
      const preset = PROVIDER_PRESETS[apiType] || PROVIDER_PRESETS.zhipu;
      const apiUrl = settings.ai_recognition_api_url || preset.url;
      const model = settings.ai_recognition_model || preset.model;

      if (!apiKey) {
        this.logger.warn('No AI API key configured, skipping recognition');
        return { result: emptyResult, status: 'skipped' };
      }

      this.logger.log(`[AI Recognition] provider=${apiType}, model=${model}, url=${apiUrl}`);

      let result: RecognitionResult;
      if (apiType === 'anthropic') {
        result = await this.recognizeWithClaude(base64, mimeType, apiKey, model);
      } else {
        // All other providers use OpenAI-compatible format
        result = await this.recognizeWithOpenAICompatible(apiUrl, base64, mimeType, apiKey, model);
      }

      return { result, status: 'done' };
    } catch (error) {
      this.logger.error(`Recognition failed for ${imagePath}: ${error.message}`);
      return { result: emptyResult, status: 'error' };
    }
  }

  private async recognizeWithOpenAICompatible(url: string, base64: string, mimeType: string, apiKey: string, model: string): Promise<RecognitionResult> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: 'text', text: PROMPT },
          ],
        }],
        max_tokens: 1024,
        temperature: 0.1,
      }),
    });
    const data = await response.json();
    this.logger.log(`[AI Recognition] Response status: ${response.status}, model: ${model}`);
    if (data.error) {
      this.logger.error(`[AI Recognition] API error: ${JSON.stringify(data.error)}`);
      return { oe_numbers: [], part_type: '', brand: '', part_name_cn: '', part_name_en: '', description: '', confidence: 0 };
    }
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) {
      this.logger.warn(`[AI Recognition] Empty response. Full data: ${JSON.stringify(data).slice(0, 500)}`);
    } else {
      this.logger.log(`[AI Recognition] Raw response: ${text.slice(0, 300)}`);
    }
    return this.parseRecognitionResult(text);
  }

  private async recognizeWithClaude(base64: string, mimeType: string, apiKey: string, model: string): Promise<RecognitionResult> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType as any, data: base64 } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';
    return this.parseRecognitionResult(text);
  }

  private parseRecognitionResult(text: string): RecognitionResult {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          oe_numbers: Array.isArray(parsed.oe_numbers) ? parsed.oe_numbers : [],
          part_type: parsed.part_type || '',
          brand: parsed.brand || '',
          part_name_cn: parsed.part_name_cn || '',
          part_name_en: parsed.part_name_en || '',
          description: parsed.description || '',
          confidence: Math.min(1, Math.max(0, parsed.confidence || 0)),
        };
      }
    } catch (e) {
      this.logger.warn(`Failed to parse recognition result: ${e.message}`);
    }
    return { oe_numbers: [], part_type: '', brand: '', part_name_cn: '', part_name_en: '', description: '', confidence: 0 };
  }
}
