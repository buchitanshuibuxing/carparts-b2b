import { Injectable, Logger } from '@nestjs/common';

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

  generatePost(parts: PartInfo[], template: 'product' | 'promo' | 'new' | 'custom', customPrompt?: string): string {
    if (!parts.length) {
      return this.getDefaultPost(template);
    }

    const uniqueParts = [...new Map(parts.map(p => [p.oeNumber, p])).values()];
    const oeNumbers = uniqueParts.map(p => p.oeNumber).join(', ');
    const partNames = uniqueParts.map(p => p.partNameEn || p.partNameCn).filter(Boolean).join(', ');
    const brands = [...new Set(uniqueParts.map(p => p.brand).filter(Boolean))].join(', ');
    const categories = [...new Set(uniqueParts.map(p => p.category).filter(Boolean))].join(', ');

    switch (template) {
      case 'product':
        return this.generateProductPost(oeNumbers, partNames, brands, categories);
      case 'promo':
        return this.generatePromoPost(oeNumbers, partNames, brands);
      case 'new':
        return this.generateNewArrivalPost(oeNumbers, partNames, brands);
      case 'custom':
        return this.generateCustomPost(oeNumbers, partNames, brands, customPrompt);
      default:
        return this.generateProductPost(oeNumbers, partNames, brands, categories);
    }
  }

  private getDefaultPost(template: string): string {
    switch (template) {
      case 'product':
        return `🔧 High Quality Auto Parts Available!\n\n✅ Genuine OE Parts\n✅ Competitive Wholesale Prices\n✅ Fast Worldwide Shipping\n\n📩 Contact us for a quote!\n#autoparts #carparts #wholesale`;
      case 'promo':
        return `🔥 SPECIAL OFFER! 🔥\n\n💰 Best prices on auto parts\n📦 Free shipping on bulk orders\n⏰ Limited time only!\n\nDM for details!\n#sale #autoparts #discount`;
      case 'new':
        return `🆕 NEW ARRIVALS!\n\nFresh stock of genuine auto parts just landed.\nReady to ship worldwide!\n\nContact us for catalog and pricing.\n#newparts #autoparts #justarrived`;
      default:
        return `Check out our latest auto parts!\n\n📩 Contact us for pricing.\n#autoparts`;
    }
  }

  private generateProductPost(oeNumbers: string, partNames: string, brands: string, categories: string): string {
    let post = `🔧 Auto Parts Available!\n\n`;
    post += `OE Numbers: ${oeNumbers}\n`;
    if (partNames) post += `Parts: ${partNames}\n`;
    if (brands) post += `Brand: ${brands}\n`;
    if (categories) post += `Category: ${categories}\n`;
    post += `\n`;
    post += `✅ High Quality Genuine Parts\n`;
    post += `✅ Competitive Wholesale Prices\n`;
    post += `✅ Fast Worldwide Shipping\n`;
    post += `✅ Small MOQ Available\n`;
    post += `\n📩 Contact us for pricing and availability!\n`;
    post += `\n#autoparts #oeparts #carparts #wholesale`;
    return post;
  }

  private generatePromoPost(oeNumbers: string, partNames: string, brands: string): string {
    let post = `🔥 SPECIAL OFFER! 🔥\n\n`;
    if (partNames) post += `${partNames}\n`;
    post += `OE: ${oeNumbers}\n`;
    if (brands) post += `Brand: ${brands}\n`;
    post += `\n`;
    post += `💰 Unbeatable prices\n`;
    post += `📦 Free shipping on orders over $500\n`;
    post += `⏰ Limited stock - act fast!\n`;
    post += `\nDM us now for the best deal!\n`;
    post += `\n#sale #autoparts #discount #specialoffer`;
    return post;
  }

  private generateNewArrivalPost(oeNumbers: string, partNames: string, brands: string): string {
    let post = `🆕 NEW ARRIVAL! 🆕\n\n`;
    if (partNames) post += `${partNames}\n`;
    post += `OE: ${oeNumbers}\n`;
    if (brands) post += `Brand: ${brands}\n`;
    post += `\n`;
    post += `Just landed in our warehouse!\n`;
    post += `✅ Ready to ship\n`;
    post += `✅ Genuine quality\n`;
    post += `✅ Best prices\n`;
    post += `\nContact us to place your order!\n`;
    post += `\n#newparts #autoparts #justarrived #newstock`;
    return post;
  }

  private generateCustomPost(oeNumbers: string, partNames: string, brands: string, customPrompt?: string): string {
    if (customPrompt) {
      return customPrompt
        .replace('{oe}', oeNumbers)
        .replace('{name}', partNames)
        .replace('{brand}', brands);
    }
    return this.generateProductPost(oeNumbers, partNames, brands, '');
  }
}
