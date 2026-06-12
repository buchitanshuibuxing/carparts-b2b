import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Price } from './entities/price.entity';
import { PriceLog } from './entities/price-log.entity';
import { Part } from '../parts/entities/part.entity';

@Injectable()
export class PricesService {
  constructor(
    @InjectRepository(Price) private priceRepo: Repository<Price>,
    @InjectRepository(PriceLog) private logRepo: Repository<PriceLog>,
    @InjectRepository(Part) private partRepo: Repository<Part>,
  ) {}

  async findAll(page = 1, limit = 20, filters?: { keyword?: string; price_type?: string }) {
    const qb = this.priceRepo.createQueryBuilder('price');

    // If keyword search, find matching part IDs first
    if (filters?.keyword) {
      const matchingParts = await this.partRepo.createQueryBuilder('p')
        .select('p.id')
        .where('p.oe_number ILIKE :kw', { kw: `%${filters.keyword}%` })
        .orWhere('p.part_name_cn ILIKE :kw', { kw: `%${filters.keyword}%` })
        .orWhere('p.brand ILIKE :kw', { kw: `%${filters.keyword}%` })
        .getMany();
      const partIds = matchingParts.map(p => p.id);
      if (partIds.length === 0) return { data: [], total: 0, page, limit };
      qb.andWhere('price.part_id IN (:...partIds)', { partIds });
    }

    if (filters?.price_type) {
      qb.andWhere('price.price_type = :pt', { pt: filters.price_type });
    }

    qb.orderBy('price.createdAt', 'DESC')
      .skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Two-step: batch fetch parts
    const partIds = [...new Set(items.map(i => i.partId).filter(Boolean))];
    const parts = partIds.length ? await this.partRepo.find({ where: { id: In(partIds) } }) : [];
    const partMap = new Map(parts.map(p => [p.id, p]));

    const enriched = items.map(item => ({
      ...item,
      part: partMap.get(item.partId) || null,
    }));

    return { data: enriched, total, page, limit };
  }

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
      existing.currency = data.currency || existing.currency;
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

  async updateOne(id: number, data: any) {
    const price = await this.priceRepo.findOne({ where: { id } });
    if (!price) throw new NotFoundException('价格记录不存在');
    if (data.unit_price !== undefined && Number(data.unit_price) !== Number(price.unitPrice)) {
      await this.logRepo.save({
        priceId: price.id, oldPrice: price.unitPrice, newPrice: data.unit_price,
        changeReason: data.reason || '', operator: data.operator || 'system',
      });
      price.unitPrice = data.unit_price;
    }
    if (data.price_type !== undefined) price.priceType = data.price_type;
    if (data.currency !== undefined) price.currency = data.currency;
    if (data.min_quantity !== undefined) price.minQuantity = data.min_quantity;
    if (data.max_quantity !== undefined) price.maxQuantity = data.max_quantity;
    if (data.effective_date !== undefined) price.effectiveDate = data.effective_date;
    if (data.expiry_date !== undefined) price.expiryDate = data.expiry_date;
    if (data.notes !== undefined) price.notes = data.notes;
    return this.priceRepo.save(price);
  }

  async deletePrice(id: number) {
    await this.priceRepo.delete(id);
  }

  async batchUpdate(ids: number[], data: any) {
    if (!ids.length) return { updated: 0 };
    const prices = await this.priceRepo.find({ where: { id: In(ids) } });
    for (const price of prices) {
      if (data.unit_price !== undefined && Number(data.unit_price) !== Number(price.unitPrice)) {
        await this.logRepo.save({
          priceId: price.id, oldPrice: price.unitPrice, newPrice: data.unit_price,
          changeReason: data.reason || '批量修改', operator: data.operator || 'system',
        });
        price.unitPrice = data.unit_price;
      }
      if (data.price_type !== undefined) price.priceType = data.price_type;
      if (data.currency !== undefined) price.currency = data.currency;
      if (data.min_quantity !== undefined) price.minQuantity = data.min_quantity;
      if (data.max_quantity !== undefined) price.maxQuantity = data.max_quantity;
      if (data.effective_date !== undefined) price.effectiveDate = data.effective_date;
      if (data.expiry_date !== undefined) price.expiryDate = data.expiry_date;
      if (data.notes !== undefined) price.notes = data.notes;
    }
    await this.priceRepo.save(prices);
    return { updated: prices.length };
  }

  async batchDelete(ids: number[]) {
    if (!ids.length) return { deleted: 0 };
    await this.priceRepo.delete(ids);
    return { deleted: ids.length };
  }

  async getHistory(partId: number) {
    const prices = await this.priceRepo.find({ where: { partId } });
    const ids = prices.map(p => p.id);
    if (ids.length === 0) return [];
    const logs = await this.logRepo.createQueryBuilder('log')
      .where('log.price_id IN (:...ids)', { ids })
      .orderBy('log.created_at', 'DESC')
      .getMany();
    // Enrich with price type info
    const priceMap = new Map(prices.map(p => [p.id, p]));
    return logs.map(log => ({
      ...log,
      priceType: priceMap.get(log.priceId)?.priceType || '',
      currency: priceMap.get(log.priceId)?.currency || '',
    }));
  }

  async syncFromParts() {
    // Find all active parts that don't have any price records
    const allParts = await this.partRepo.find({ where: { isActive: true } });
    if (allParts.length === 0) return { synced: 0, skipped: 0 };

    const existingPartIds = new Set(
      (await this.priceRepo.createQueryBuilder('price').select('DISTINCT price.part_id', 'partId').getRawMany()).map(r => r.partId),
    );

    const toSync = allParts.filter(p => !existingPartIds.has(p.id));
    if (toSync.length === 0) return { synced: 0, skipped: allParts.length };

    const defaultType = '批发价';
    const prices = toSync.map(p => this.priceRepo.create({
      partId: p.id, priceType: defaultType, currency: 'USD',
      unitPrice: 0, minQuantity: 1, maxQuantity: 99999,
    }));
    await this.priceRepo.save(prices);

    // Log initial creation
    const logs = prices.map(pr => this.logRepo.create({
      priceId: pr.id, oldPrice: 0, newPrice: 0,
      changeReason: '从配件目录同步', operator: 'system',
    }));
    await this.logRepo.save(logs);

    return { synced: toSync.length, skipped: existingPartIds.size };
  }
}
