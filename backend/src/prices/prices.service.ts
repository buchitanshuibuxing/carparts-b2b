import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Price } from './entities/price.entity';
import { PriceLog } from './entities/price-log.entity';
import { Part } from '../parts/entities/part.entity';
import { Setting } from '../settings/entities/setting.entity';

@Injectable()
export class PricesService {
  constructor(
    @InjectRepository(Price) private priceRepo: Repository<Price>,
    @InjectRepository(PriceLog) private logRepo: Repository<PriceLog>,
    @InjectRepository(Part) private partRepo: Repository<Part>,
    @InjectRepository(Setting) private settingsRepo: Repository<Setting>,
  ) {}

  async findByPart(partId: number) {
    return this.priceRepo.find({ where: { partId }, order: { priceType: 'ASC', minQuantity: 'ASC' } });
  }

  async setPrice(data: { part_id: number; price_type?: string; currency?: string; unit_price: number; min_quantity?: number; max_quantity?: number; effective_date?: string; expiry_date?: string; reason?: string; operator?: string }) {
    const existing = await this.priceRepo.findOne({
      where: { partId: data.part_id, priceType: data.price_type || '批发价', minQuantity: data.min_quantity || 1 },
    });
    if (existing) {
      if (Number(existing.unitPrice) !== data.unit_price) {
        await this.logRepo.save({
          priceId: existing.id, oldPrice: existing.unitPrice, newPrice: data.unit_price,
          changeReason: data.reason || '', operator: data.operator || 'system',
        });
      }
      existing.unitPrice = data.unit_price;
      existing.maxQuantity = data.max_quantity || 99999;
      existing.effectiveDate = data.effective_date || '';
      existing.expiryDate = data.expiry_date || '';
      return this.priceRepo.save(existing);
    }
    const price = this.priceRepo.create({
      partId: data.part_id, priceType: data.price_type || '批发价', currency: data.currency || 'USD',
      unitPrice: data.unit_price, minQuantity: data.min_quantity || 1, maxQuantity: data.max_quantity || 99999,
      effectiveDate: data.effective_date || '', expiryDate: data.expiry_date || '',
    });
    const saved = await this.priceRepo.save(price);
    await this.logRepo.save({ priceId: saved.id, oldPrice: 0, newPrice: data.unit_price, changeReason: data.reason || '初始设置', operator: data.operator || 'system' });
    return saved;
  }

  async deletePrice(id: number) {
    // Check for associated price_log
    const logCount = await this.logRepo.count({ where: { priceId: id } });
    if (logCount > 0) {
      throw new BadRequestException('该价格有关联的历史记录，无法删除。');
    }

    await this.priceRepo.delete(id);
  }

  async getHistory(partId: number) {
    const prices = await this.priceRepo.find({ where: { partId } });
    const ids = prices.map(p => p.id);
    if (ids.length === 0) return [];
    return this.logRepo.createQueryBuilder('log').where('log.price_id IN (:...ids)', { ids }).orderBy('log.created_at', 'DESC').getMany();
  }

  async syncFromParts() {
    const allParts = await this.partRepo.find({ where: { isActive: true } });
    const existingPrices = await this.priceRepo.find();
    const existingPartIds = new Set(existingPrices.map(p => p.partId));
    const missing = allParts.filter(p => !existingPartIds.has(p.id));

    if (missing.length === 0) return { synced: 0, skipped: allParts.length, message: "所有配件已有价格" };

    const records = missing.map(part => this.priceRepo.create({
      partId: part.id,
      priceType: "批发价",
      currency: "USD",
      unitPrice: 0,
      minQuantity: 1,
      maxQuantity: 99999,
    }));
    await this.priceRepo.save(records);
    return { synced: missing.length, skipped: allParts.length - missing.length };
  }


  async findAll(page = 1, limit = 100, filters?: { keyword?: string; price_type?: string }) {
    const qb = this.priceRepo.createQueryBuilder("p");

    if (filters?.keyword) {
      // Find matching part IDs first
      const matchingParts = await this.partRepo.createQueryBuilder("pt")
        .select("pt.id")
        .where("pt.oe_number ILIKE :kw", { kw: "%" + filters.keyword + "%" })
        .orWhere("pt.part_name_cn ILIKE :kw", { kw: "%" + filters.keyword + "%" })
        .getMany();
      const partIds = matchingParts.map(p => p.id);
      if (partIds.length === 0) return { data: [], total: 0, page, limit };
      qb.where("p.part_id IN (:...partIds)", { partIds });
    }
    if (filters?.price_type) {
      qb.andWhere("p.price_type = :pt", { pt: filters.price_type });
    }

    qb.orderBy("p.created_at", "DESC")
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();

    // Enrich with part data
    const partIds = [...new Set(items.map(p => p.partId).filter(Boolean))];
    const parts = partIds.length ? await this.partRepo.find({ where: { id: In(partIds) } }) : [];
    const partMap = new Map(parts.map(p => [p.id, p]));

    const enriched = items.map(price => {
      const part = partMap.get(price.partId);
      return {
        ...price,
        part: part ? { id: part.id, oeNumber: part.oeNumber, partNameCn: part.partNameCn, brand: part.brand } : null,
      };
    });

    return { data: enriched, total, page, limit };
  }


  async getConfigTypes() {
    const typesSetting = await this.settingsRepo.findOne({ where: { key: "price_types" } });
    const cursSetting = await this.settingsRepo.findOne({ where: { key: "price_currencies" } });
    const types = typesSetting ? JSON.parse(typesSetting.value || "[]") : ["批发价", "零售价", "成本价", "促销价"];
    const currencies = cursSetting ? JSON.parse(cursSetting.value || "[]") : ["USD", "CNY", "EUR", "GBP", "JPY"];
    return { types, currencies };
  }

  async updateConfigTypes(data: { types?: string[]; currencies?: string[] }) {
    if (data.types) {
      const existing = await this.settingsRepo.findOne({ where: { key: "price_types" } });
      if (existing) {
        existing.value = JSON.stringify(data.types);
        await this.settingsRepo.save(existing);
      } else {
        await this.settingsRepo.save(this.settingsRepo.create({ key: "price_types", value: JSON.stringify(data.types) }));
      }
    }
    if (data.currencies) {
      const existing = await this.settingsRepo.findOne({ where: { key: "price_currencies" } });
      if (existing) {
        existing.value = JSON.stringify(data.currencies);
        await this.settingsRepo.save(existing);
      } else {
        await this.settingsRepo.save(this.settingsRepo.create({ key: "price_currencies", value: JSON.stringify(data.currencies) }));
      }
    }
    return { success: true };
  }
}