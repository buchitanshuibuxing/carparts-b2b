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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const inventory_entity_1 = require("./entities/inventory.entity");
const inventory_log_entity_1 = require("./entities/inventory-log.entity");
const part_entity_1 = require("../parts/entities/part.entity");
const paginated_response_dto_1 = require("../common/dto/paginated-response.dto");
let InventoryService = class InventoryService {
    inventoryRepo;
    logRepo;
    partRepo;
    dataSource;
    constructor(inventoryRepo, logRepo, partRepo, dataSource) {
        this.inventoryRepo = inventoryRepo;
        this.logRepo = logRepo;
        this.partRepo = partRepo;
        this.dataSource = dataSource;
    }
    async findAll(page = 1, pageSize = 20, filters) {
        const qb = this.inventoryRepo.createQueryBuilder('inv');
        if (filters?.keyword) {
            const matchingParts = await this.partRepo.createQueryBuilder('p')
                .select('p.id')
                .where('p.oe_number ILIKE :kw', { kw: `%${filters.keyword}%` })
                .orWhere('p.part_name_cn ILIKE :kw', { kw: `%${filters.keyword}%` })
                .getMany();
            const partIds = matchingParts.map(p => p.id);
            if (partIds.length === 0)
                return new paginated_response_dto_1.PaginatedResponseDto([], 0, page, pageSize);
            qb.andWhere('inv.part_id IN (:...partIds)', { partIds });
        }
        if (filters?.warehouse_zone)
            qb.andWhere('inv.warehouse_zone = :zone', { zone: filters.warehouse_zone });
        if (filters?.is_low_stock)
            qb.andWhere('inv.quantity <= inv.min_stock');
        qb.orderBy('inv.updatedAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
        const [items, total] = await qb.getManyAndCount();
        const partIds = [...new Set(items.map(i => i.partId).filter(Boolean))];
        const parts = partIds.length ? await this.partRepo.find({ where: { id: (0, typeorm_2.In)(partIds) } }) : [];
        const partMap = new Map(parts.map(p => [p.id, p]));
        const enriched = items.map(inv => {
            const part = partMap.get(inv.partId);
            return { ...inv, oe_number: part?.oeNumber || '', part_name_cn: part?.partNameCn || '', brand: part?.brand || '', category: part?.category || '' };
        });
        return new paginated_response_dto_1.PaginatedResponseDto(enriched, total, page, pageSize);
    }
    async findByPart(partId) {
        const inv = await this.inventoryRepo.findOne({ where: { partId } });
        if (!inv)
            throw new common_1.NotFoundException('库存记录不存在');
        return inv;
    }
    async create(data, operatorId) {
        const part = await this.partRepo.findOne({ where: { id: data.part_id } });
        if (!part)
            throw new common_1.NotFoundException('配件不存在');
        const existing = await this.inventoryRepo.findOne({ where: { partId: data.part_id } });
        if (existing)
            throw new common_1.BadRequestException('该配件已有库存记录');
        const inv = this.inventoryRepo.create({
            partId: data.part_id,
            quantity: data.quantity || 0,
            warehouseLocation: data.warehouse_location || '',
            warehouseZone: data.warehouse_zone || '默认',
            minStock: data.min_stock || 0,
            maxStock: data.max_stock || 99999,
            notes: data.notes || '',
        });
        const saved = await this.inventoryRepo.save(inv);
        if (saved.quantity > 0) {
            await this.logRepo.save(this.logRepo.create({
                partId: data.part_id,
                changeType: 'IN',
                quantityChange: saved.quantity,
                quantityBefore: 0,
                quantityAfter: saved.quantity,
                reason: '手动创建库存',
                referenceType: 'manual',
                operatorId,
            }));
        }
        return saved;
    }
    async updateOne(id, data) {
        const inv = await this.inventoryRepo.findOne({ where: { id } });
        if (!inv)
            throw new common_1.NotFoundException('库存记录不存在');
        const changes = [];
        if (data.warehouse_location !== undefined && data.warehouse_location !== inv.warehouseLocation) {
            changes.push(`库位: ${inv.warehouseLocation || '(空)'} → ${data.warehouse_location || '(空)'}`);
            inv.warehouseLocation = data.warehouse_location;
        }
        if (data.warehouse_zone !== undefined && data.warehouse_zone !== inv.warehouseZone) {
            changes.push(`库区: ${inv.warehouseZone} → ${data.warehouse_zone}`);
            inv.warehouseZone = data.warehouse_zone;
        }
        if (data.min_stock !== undefined && data.min_stock !== inv.minStock) {
            changes.push(`最低库存: ${inv.minStock} → ${data.min_stock}`);
            inv.minStock = data.min_stock;
        }
        if (data.max_stock !== undefined && data.max_stock !== inv.maxStock) {
            changes.push(`最高库存: ${inv.maxStock} → ${data.max_stock}`);
            inv.maxStock = data.max_stock;
        }
        if (data.notes !== undefined && data.notes !== inv.notes) {
            changes.push(`备注已更新`);
            inv.notes = data.notes;
        }
        const saved = await this.inventoryRepo.save(inv);
        if (changes.length > 0) {
            await this.logRepo.save(this.logRepo.create({
                partId: inv.partId,
                changeType: 'UPDATE',
                quantityChange: 0,
                quantityBefore: inv.quantity,
                quantityAfter: inv.quantity,
                reason: changes.join('；'),
                referenceType: 'edit',
            }));
        }
        return saved;
    }
    async removeOne(id) {
        const inv = await this.inventoryRepo.findOne({ where: { id } });
        if (!inv)
            throw new common_1.NotFoundException('库存记录不存在');
        await this.inventoryRepo.remove(inv);
        return { deleted: 1 };
    }
    async adjustStock(partId, delta, reason, operatorId) {
        return this.dataSource.transaction(async (manager) => {
            const inv = await manager.findOne(inventory_entity_1.Inventory, { where: { partId }, lock: { mode: 'pessimistic_write' } });
            if (!inv)
                throw new common_1.NotFoundException('库存记录不存在');
            if (delta < 0 && inv.quantity < Math.abs(delta)) {
                throw new common_1.BadRequestException(`库存不足：当前 ${inv.quantity}，需要 ${Math.abs(delta)}`);
            }
            const before = inv.quantity;
            inv.quantity += delta;
            await manager.save(inv);
            await manager.save(inventory_log_entity_1.InventoryLog, {
                partId,
                changeType: delta > 0 ? 'IN' : 'OUT',
                quantityChange: Math.abs(delta),
                quantityBefore: before,
                quantityAfter: inv.quantity,
                reason,
                referenceType: 'adjustment',
                operatorId,
            });
            return inv;
        });
    }
    async batchUpdate(ids, data) {
        if (!ids.length)
            return { updated: 0 };
        const set = {};
        if (data.warehouse_location !== undefined)
            set.warehouseLocation = data.warehouse_location;
        if (data.warehouse_zone !== undefined)
            set.warehouseZone = data.warehouse_zone;
        if (data.min_stock !== undefined)
            set.minStock = data.min_stock;
        if (data.max_stock !== undefined)
            set.maxStock = data.max_stock;
        if (data.notes !== undefined)
            set.notes = data.notes;
        if (Object.keys(set).length === 0)
            return { updated: 0 };
        await this.inventoryRepo.createQueryBuilder().update().set(set).where('id IN (:...ids)', { ids }).execute();
        return { updated: ids.length };
    }
    async batchDelete(ids) {
        if (!ids.length)
            return { deleted: 0 };
        await this.inventoryRepo.delete(ids);
        return { deleted: ids.length };
    }
    async syncFromParts() {
        const allParts = await this.partRepo.find({ where: { isActive: true } });
        const existingInv = await this.inventoryRepo.find();
        const existingPartIds = new Set(existingInv.map(i => i.partId));
        const missing = allParts.filter(p => !existingPartIds.has(p.id));
        if (missing.length === 0)
            return { synced: 0, message: '所有配件已有库存记录' };
        const records = missing.map(part => this.inventoryRepo.create({
            partId: part.id,
            quantity: 0,
            warehouseZone: '默认',
        }));
        await this.inventoryRepo.save(records);
        return { synced: missing.length, message: `已为 ${missing.length} 个配件创建库存记录` };
    }
    async getLowStock(limit = 50) {
        return this.inventoryRepo.createQueryBuilder('inv')
            .leftJoin(part_entity_1.Part, 'p', 'p.id = inv.part_id')
            .select(['inv', 'p.oe_number', 'p.part_name_cn'])
            .where('inv.quantity <= inv.min_stock')
            .andWhere('p.is_active = true')
            .orderBy('inv.quantity', 'ASC')
            .limit(Math.min(limit, 200))
            .getMany();
    }
    async getLogs(partId, page = 1, pageSize = 20) {
        const [items, total] = await this.logRepo.findAndCount({
            where: { partId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });
        return new paginated_response_dto_1.PaginatedResponseDto(items, total, page, pageSize);
    }
    async getAllLogs(page = 1, pageSize = 20, keyword) {
        const qb = this.logRepo.createQueryBuilder('log');
        if (keyword) {
            const matchingParts = await this.partRepo.createQueryBuilder('p')
                .select('p.id')
                .where('p.oe_number ILIKE :kw', { kw: `%${keyword}%` })
                .orWhere('p.part_name_cn ILIKE :kw', { kw: `%${keyword}%` })
                .getMany();
            const partIds = matchingParts.map(p => p.id);
            if (partIds.length === 0)
                return new paginated_response_dto_1.PaginatedResponseDto([], 0, page, pageSize);
            qb.where('log.part_id IN (:...partIds)', { partIds });
        }
        qb.orderBy('log.created_at', 'DESC')
            .skip((page - 1) * pageSize)
            .take(pageSize);
        const [items, total] = await qb.getManyAndCount();
        const partIds = [...new Set(items.map(i => i.partId).filter(Boolean))];
        const parts = partIds.length ? await this.partRepo.find({ where: { id: (0, typeorm_2.In)(partIds) } }) : [];
        const partMap = new Map(parts.map(p => [p.id, p]));
        const enriched = items.map(log => {
            const part = partMap.get(log.partId);
            return { ...log, oe_number: part?.oeNumber || '', part_name_cn: part?.partNameCn || '' };
        });
        return new paginated_response_dto_1.PaginatedResponseDto(enriched, total, page, pageSize);
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(inventory_entity_1.Inventory)),
    __param(1, (0, typeorm_1.InjectRepository)(inventory_log_entity_1.InventoryLog)),
    __param(2, (0, typeorm_1.InjectRepository)(part_entity_1.Part)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map