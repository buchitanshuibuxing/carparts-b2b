"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const price_entity_1 = require("./entities/price.entity");
const price_log_entity_1 = require("./entities/price-log.entity");
const part_entity_1 = require("../parts/entities/part.entity");
let PricesService = class PricesService {
    priceRepo;
    logRepo;
    partRepo;
    constructor(priceRepo, logRepo, partRepo) {
        this.priceRepo = priceRepo;
        this.logRepo = logRepo;
        this.partRepo = partRepo;
    }
    async findAll(page = 1, limit = 20, filters) {
        const qb = this.priceRepo.createQueryBuilder('price');
        if (filters?.keyword) {
            const matchingParts = await this.partRepo.createQueryBuilder('p')
                .select('p.id')
                .where('p.oe_number ILIKE :kw', { kw: `%${filters.keyword}%` })
                .orWhere('p.part_name_cn ILIKE :kw', { kw: `%${filters.keyword}%` })
                .orWhere('p.brand ILIKE :kw', { kw: `%${filters.keyword}%` })
                .getMany();
            const partIds = matchingParts.map(p => p.id);
            if (partIds.length === 0)
                return { data: [], total: 0, page, limit };
            qb.andWhere('price.part_id IN (:...partIds)', { partIds });
        }
        if (filters?.price_type) {
            qb.andWhere('price.price_type = :pt', { pt: filters.price_type });
        }
        qb.orderBy('price.createdAt', 'DESC')
            .skip((page - 1) * limit).take(limit);
        const [items, total] = await qb.getManyAndCount();
        const partIds = [...new Set(items.map(i => i.partId).filter(Boolean))];
        const parts = partIds.length ? await this.partRepo.find({ where: { id: (0, typeorm_2.In)(partIds) } }) : [];
        const partMap = new Map(parts.map(p => [p.id, p]));
        const enriched = items.map(item => ({
            ...item,
            part: partMap.get(item.partId) || null,
        }));
        return { data: enriched, total, page, limit };
    }
    async findByPart(partId) {
        return this.priceRepo.find({ where: { partId }, order: { priceType: 'ASC', minQuantity: 'ASC' } });
    }
    async setPrice(data) {
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
    async updateOne(id, data) {
        const price = await this.priceRepo.findOne({ where: { id } });
        if (!price)
            throw new common_1.NotFoundException('价格记录不存在');
        if (data.unit_price !== undefined && Number(data.unit_price) !== Number(price.unitPrice)) {
            await this.logRepo.save({
                priceId: price.id, oldPrice: price.unitPrice, newPrice: data.unit_price,
                changeReason: data.reason || '', operator: data.operator || 'system',
            });
            price.unitPrice = data.unit_price;
        }
        if (data.price_type !== undefined)
            price.priceType = data.price_type;
        if (data.currency !== undefined)
            price.currency = data.currency;
        if (data.min_quantity !== undefined)
            price.minQuantity = data.min_quantity;
        if (data.max_quantity !== undefined)
            price.maxQuantity = data.max_quantity;
        if (data.effective_date !== undefined)
            price.effectiveDate = data.effective_date;
        if (data.expiry_date !== undefined)
            price.expiryDate = data.expiry_date;
        if (data.notes !== undefined)
            price.notes = data.notes;
        return this.priceRepo.save(price);
    }
    async deletePrice(id) {
        await this.priceRepo.delete(id);
    }
    async batchUpdate(ids, data) {
        if (!ids.length)
            return { updated: 0 };
        const prices = await this.priceRepo.find({ where: { id: (0, typeorm_2.In)(ids) } });
        for (const price of prices) {
            if (data.unit_price !== undefined && Number(data.unit_price) !== Number(price.unitPrice)) {
                await this.logRepo.save({
                    priceId: price.id, oldPrice: price.unitPrice, newPrice: data.unit_price,
                    changeReason: data.reason || '批量修改', operator: data.operator || 'system',
                });
                price.unitPrice = data.unit_price;
            }
            if (data.price_type !== undefined)
                price.priceType = data.price_type;
            if (data.currency !== undefined)
                price.currency = data.currency;
            if (data.min_quantity !== undefined)
                price.minQuantity = data.min_quantity;
            if (data.max_quantity !== undefined)
                price.maxQuantity = data.max_quantity;
            if (data.effective_date !== undefined)
                price.effectiveDate = data.effective_date;
            if (data.expiry_date !== undefined)
                price.expiryDate = data.expiry_date;
            if (data.notes !== undefined)
                price.notes = data.notes;
        }
        await this.priceRepo.save(prices);
        return { updated: prices.length };
    }
    async batchDelete(ids) {
        if (!ids.length)
            return { deleted: 0 };
        await this.priceRepo.delete(ids);
        return { deleted: ids.length };
    }
    async getHistory(partId) {
        const prices = await this.priceRepo.find({ where: { partId } });
        const ids = prices.map(p => p.id);
        if (ids.length === 0)
            return [];
        const logs = await this.logRepo.createQueryBuilder('log')
            .where('log.price_id IN (:...ids)', { ids })
            .orderBy('log.created_at', 'DESC')
            .getMany();
        const priceMap = new Map(prices.map(p => [p.id, p]));
        return logs.map(log => ({
            ...log,
            priceType: priceMap.get(log.priceId)?.priceType || '',
            currency: priceMap.get(log.priceId)?.currency || '',
        }));
    }
    async syncFromParts() {
        const allParts = await this.partRepo.find({ where: { isActive: true } });
        if (allParts.length === 0)
            return { synced: 0, skipped: 0 };
        const existingPartIds = new Set((await this.priceRepo.createQueryBuilder('price').select('DISTINCT price.part_id', 'partId').getRawMany()).map(r => r.partId));
        const toSync = allParts.filter(p => !existingPartIds.has(p.id));
        if (toSync.length === 0)
            return { synced: 0, skipped: allParts.length };
        const defaultType = '批发价';
        const prices = toSync.map(p => this.priceRepo.create({
            partId: p.id, priceType: defaultType, currency: 'USD',
            unitPrice: 0, minQuantity: 1, maxQuantity: 99999,
        }));
        await this.priceRepo.save(prices);
        const logs = prices.map(pr => this.logRepo.create({
            priceId: pr.id, oldPrice: 0, newPrice: 0,
            changeReason: '从配件目录同步', operator: 'system',
        }));
        await this.logRepo.save(logs);
        return { synced: toSync.length, skipped: existingPartIds.size };
    }
};
exports.PricesService = PricesService;
exports.PricesService = PricesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(price_entity_1.Price)),
    __param(1, (0, typeorm_1.InjectRepository)(price_log_entity_1.PriceLog)),
    __param(2, (0, typeorm_1.InjectRepository)(part_entity_1.Part)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], PricesService);
//# sourceMappingURL=prices.service.js.map