import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface PartInfo {
  oeNumber: string;
  partNameEn?: string;
  partNameCn?: string;
  brand?: string;
  category?: string;
}

@Injectable()
export class AiPostGenerator {
  private readonly logger = new Logger(AiPostGenerator.name);

  constructor(private dataSource: DataSource) {}

  private async getAiConfig(): Promise<{ apiKey: string; model: string; apiUrl: string }> {
    const rows = await this.dataSource.query(
      "SELECT key, value FROM settings WHERE key IN ('ai_recognition_api_key', 'ai_recognition_model', 'ai_recognition_api_url', 'ai_recognition_api_type')"
    );
    const config: any = {};
    rows.forEach((r: any) => { config[r.key] = r.value; });
    
    // Determine API URL based on provider
    let apiUrl = config.ai_recognition_api_url || '';
    if (!apiUrl) {
      const provider = config.ai_recognition_api_type || 'zhipu';
      switch (provider) {
        case 'zhipu': apiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'; break;
        case 'deepseek': apiUrl = 'https://api.deepseek.com/v1/chat/completions'; break;
        case 'qwen': apiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'; break;
        case 'doubao': apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'; break;
        case 'mimo': apiUrl = 'https://api.xiaoai.mi.com/v1/chat/completions'; break;
        case 'openai': apiUrl = 'https://api.openai.com/v1/chat/completions'; break;
        case 'anthropic': apiUrl = 'https://api.anthropic.com/v1/messages'; break;
        default: apiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
      }
    }
    
    return {
      apiKey: config.ai_recognition_api_key || '',
      model: config.ai_recognition_model || 'glm-4-flash',
      apiUrl,
    };
  }

  private async callZhipuAI(prompt: string): Promise<string> {
    const { apiKey, model } = await this.getAiConfig();
    if (!apiKey) {
      this.logger.warn('No AI API key configured');
      return '';
    }

    try {
      const { apiUrl } = await this.getAiConfig();
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: 'You are a professional auto parts marketing copywriter. Always write in English. Keep it concise and professional.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (err: any) {
      this.logger.error('AI API call failed: ' + err.message);
      return '';
    }
  }

  async generatePost(parts: PartInfo[], template: 'product' | 'promo' | 'new' | 'custom', customPrompt?: string): Promise<string> {
    if (!parts.length) {
      return this.getDefaultPost(template);
    }

    // Deduplicate by OE number
    const uniqueParts = [...new Map(parts.map(p => [p.oeNumber, p])).values()];
    const oeNumbers = uniqueParts.map(p => p.oeNumber).filter(Boolean).join(', ');
    // Use English names, fallback to Chinese names
    const partNamesArr = uniqueParts.map(p => p.partNameEn || p.partNameCn || '').filter(Boolean);
    const partNames = [...new Set(partNamesArr)].join(', ');
    const brands = [...new Set(uniqueParts.map(p => p.brand).filter(Boolean))].join(', ');
    const categories = [...new Set(uniqueParts.map(p => p.category).filter(Boolean))].join(', ');

    // Build AI prompt
    let prompt = '';
    switch (template) {
      case 'product':
        prompt = `Generate a Facebook post for auto parts wholesale.

Brand: ${brands}
Parts: ${partNames}
OE Numbers: ${oeNumbers}

Example output (follow this format exactly):

Hyundai/Kia Ignition Coil, Spark Plug - Ready Stock

OE Numbers:
27300-3F700
18849-08080

High quality genuine parts for wholesale.
Bulk orders welcome. Contact us for pricing!

#Hyundai #Kia #IgnitionCoil #SparkPlug #AutoParts #Wholesale #27300-3F700 #18849-08080

Important:
- Keep dashes in OE numbers (e.g. 27300-3F700)
- List each OE number on its own line
- Include brand and part names in title
- Add OE numbers as hashtags (with dashes)
- Output ONLY the post text, nothing else`;
        break;
      case 'promo':
        prompt = `Generate a promotional Facebook post.

Brand: ${brands}
Parts: ${partNames}
OE: ${oeNumbers}

Example output:

🔥 SPECIAL OFFER! 🔥
Hyundai/Kia Ignition Coil, Spark Plug
OE Numbers:
27300-3F700
18849-08080

Best wholesale prices! Free shipping on bulk orders.
Limited stock - contact us now!

#Hyundai #Kia #AutoParts #Sale #27300-3F700 #18849-08080

Important: Keep dashes in OE numbers. Output ONLY the post.`;
        break;
      case 'new':
        prompt = `Generate a new arrival Facebook post.

Brand: ${brands}
Parts: ${partNames}
OE: ${oeNumbers}

Example output:

🆕 NEW ARRIVAL! 🆕
Hyundai/Kia Ignition Coil, Spark Plug - Ready Stock
OE Numbers:
27300-3F700
18849-08080

Just landed! Genuine quality, ready to ship.
Contact us to place your order!

#Hyundai #Kia #AutoParts #NewArrival #27300-3F700 #18849-08080

Important: Keep dashes in OE numbers. Output ONLY the post.`;
        break;
      case 'custom':
        if (customPrompt) {
          prompt = customPrompt
            .replace('{oe}', oeNumbers)
            .replace('{name}', partNames)
            .replace('{brand}', brands);
        } else {
          prompt = `Write a Facebook post in English for these auto parts: OE: ${oeNumbers}, Parts: ${partNames}, Brand: ${brands}. Write ONLY in English.`;
        }
        break;
    }

    // Try AI generation
    const aiResult = await this.callZhipuAI(prompt);
    if (aiResult && aiResult.length > 20) {
      return aiResult;
    }

    // Fallback to template
    this.logger.warn('AI generation failed, using template fallback');
    return this.getTemplatePost(template, oeNumbers, partNames, brands, categories);
  }

  private getDefaultPost(template: string): string {
    switch (template) {
      case 'product':
        return `🔧 High Quality Auto Parts Available!

✅ Genuine OE Parts
✅ Competitive Wholesale Prices
✅ Fast Worldwide Shipping

📩 Contact us for a quote!
#autoparts #carparts #wholesale`;
      case 'promo':
        return `🔥 SPECIAL OFFER! 🔥

💰 Best prices on auto parts
📦 Free shipping on bulk orders
⏰ Limited time only!

DM for details!
#sale #autoparts #discount`;
      case 'new':
        return `🆕 NEW ARRIVALS!

Fresh stock of genuine auto parts just landed.
Ready to ship worldwide!

Contact us for catalog and pricing.
#newparts #autoparts #justarrived`;
      default:
        return `Check out our latest auto parts!

📩 Contact us for pricing.
#autoparts`;
    }
  }

  private getTemplatePost(template: string, oeNumbers: string, partNames: string, brands: string, categories: string): string {
    switch (template) {
      case 'product':
        let post = `🔧 Auto Parts Available!

`;
        post += `OE Numbers: ${oeNumbers}
`;
        if (partNames) post += `Parts: ${partNames}
`;
        if (brands) post += `Brand: ${brands}
`;
        if (categories) post += `Category: ${categories}
`;
        post += `
`;
        post += `✅ High Quality Genuine Parts
`;
        post += `✅ Competitive Wholesale Prices
`;
        post += `✅ Fast Worldwide Shipping
`;
        post += `✅ Small MOQ Available
`;
        post += `
📩 Contact us for pricing and availability!
`;
        post += `
#autoparts #oeparts #carparts #wholesale`;
        return post;
      case 'promo':
        let promo = `🔥 SPECIAL OFFER! 🔥

`;
        if (partNames) promo += `${partNames}
`;
        promo += `OE: ${oeNumbers}
`;
        if (brands) promo += `Brand: ${brands}
`;
        promo += `
`;
        promo += `💰 Unbeatable prices
`;
        promo += `📦 Free shipping on orders over $500
`;
        promo += `⏰ Limited stock - act fast!
`;
        promo += `
DM us now for the best deal!
`;
        promo += `
#sale #autoparts #discount #specialoffer`;
        return promo;
      case 'new':
        let newPost = `🆕 NEW ARRIVAL! 🆕

`;
        if (partNames) newPost += `${partNames}
`;
        newPost += `OE: ${oeNumbers}
`;
        if (brands) newPost += `Brand: ${brands}
`;
        newPost += `
`;
        newPost += `Just landed in our warehouse!
`;
        newPost += `✅ Ready to ship
`;
        newPost += `✅ Genuine quality
`;
        newPost += `✅ Best prices
`;
        newPost += `
Contact us to place your order!
`;
        newPost += `
#newparts #autoparts #justarrived #newstock`;
        return newPost;
      default:
        return this.getDefaultPost('product');
    }
  }
}
