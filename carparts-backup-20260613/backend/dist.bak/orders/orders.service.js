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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const order_entity_1 = require("./entities/order.entity");
const order_item_entity_1 = require("./entities/order-item.entity");
const part_entity_1 = require("../parts/entities/part.entity");
const customer_entity_1 = require("../customers/entities/customer.entity");
const inventory_entity_1 = require("../inventory/entities/inventory.entity");
const inventory_log_entity_1 = require("../inventory/entities/inventory-log.entity");
const price_entity_1 = require("../prices/entities/price.entity");
const paginated_response_dto_1 = require("../common/dto/paginated-response.dto");
let OrdersService = class OrdersService {
    orderRepo;
    itemRepo;
    partRepo;
    customerRepo;
    invRepo;
    logRepo;
    priceRepo;
    dataSource;
    constructor(orderRepo, itemRepo, partRepo, customerRepo, invRepo, logRepo, priceRepo, dataSource) {
        this.orderRepo = orderRepo;
        this.itemRepo = itemRepo;
        this.partRepo = partRepo;
        this.customerRepo = customerRepo;
        this.invRepo = invRepo;
        this.logRepo = logRepo;
        this.priceRepo = priceRepo;
        this.dataSource = dataSource;
    }
    async findAll(page = 1, pageSize = 100, filters) {
        const qb = this.orderRepo.createQueryBuilder('o');
        if (filters?.status)
            qb.andWhere('o.status = :s', { s: filters.status });
        if (filters?.customer_id)
            qb.andWhere('o.customer_id = :c', { c: filters.customer_id });
        if (filters?.date_from)
            qb.andWhere('o.order_date >= :df', { df: filters.date_from });
        if (filters?.date_to)
            qb.andWhere('o.order_date <= :dt', { dt: filters.date_to });
        if (filters?.keyword) {
            const kw = `%${filters.keyword}%`;
            const matchingCustomers = await this.customerRepo.createQueryBuilder('c')
                .select('c.id')
                .where('c.company_name ILIKE :kw', { kw })
                .orWhere('c.contact_person ILIKE :kw', { kw })
                .getMany();
            const custIds = matchingCustomers.map(c => c.id);
            const matchingParts = await this.partRepo.createQueryBuilder('p')
                .select('p.id')
                .where('p.oe_number ILIKE :kw', { kw })
                .getMany();
            const partIds = matchingParts.map(p => p.id);
            let orderIdsFromParts = [];
            if (partIds.length) {
                const items = await this.itemRepo.createQueryBuilder('oi')
                    .select('DISTINCT oi.order_id', 'orderId')
                    .where('oi.part_id IN (:...partIds)', { partIds })
                    .getRawMany();
                orderIdsFromParts = items.map(i => i.orderId);
            }
            const conditions = ['o.order_number ILIKE :kw', 'o.notes ILIKE :kw'];
            const params = { kw };
            if (custIds.length) {
                conditions.push('o.customer_id IN (:...custIds)');
                params.custIds = custIds;
            }
            if (orderIdsFromParts.length) {
                conditions.push('o.id IN (:...orderIdsFromParts)');
                params.orderIdsFromParts = orderIdsFromParts;
            }
            qb.andWhere(`(${conditions.join(' OR ')})`, params);
        }
        qb.orderBy('o.created_at', 'DESC').skip((page - 1) * pageSize).take(pageSize);
        const [items, total] = await qb.getManyAndCount();
        const custIds = [...new Set(items.map(i => i.customerId).filter(Boolean))];
        const customers = custIds.length ? await this.customerRepo.find({ where: { id: (0, typeorm_2.In)(custIds) } }) : [];
        const custMap = new Map(customers.map(c => [c.id, c]));
        const enriched = items.map(o => ({
            ...o,
            customer: custMap.get(o.customerId) || null,
        }));
        return new paginated_response_dto_1.PaginatedResponseDto(enriched, total, page, pageSize);
    }
    async findOne(id) {
        const order = await this.orderRepo.findOne({ where: { id } });
        if (!order)
            throw new common_1.NotFoundException('订单不存在');
        const items = await this.itemRepo.find({ where: { orderId: id } });
        const partIds = [...new Set(items.map(i => i.partId).filter(Boolean))];
        const parts = partIds.length ? await this.partRepo.find({ where: { id: (0, typeorm_2.In)(partIds) } }) : [];
        const partMap = new Map(parts.map(p => [p.id, p]));
        const customer = await this.customerRepo.findOne({ where: { id: order.customerId } });
        const itemsWithParts = items.map(item => ({
            ...item,
            part: partMap.get(item.partId) || null,
        }));
        return { order: { ...order, customer }, items: itemsWithParts };
    }
    async create(data, userId) {
        if (!data.items?.length)
            throw new common_1.BadRequestException('订单项不能为空');
        return this.dataSource.transaction(async (manager) => {
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const count = await manager.count(order_entity_1.Order);
            const orderNumber = `ORD${today}${String(count + 1).padStart(4, '0')}`;
            const order = manager.create(order_entity_1.Order, {
                orderNumber, customerId: data.customer_id, currency: data.currency || 'USD',
                shippingMethod: data.shipping_method || '', shippingAddress: data.shipping_address || '',
                notes: data.notes || '', status: 'pending', createdBy: userId,
            });
            const saved = await manager.save(order);
            let totalAmount = 0;
            for (const item of data.items) {
                const discount = item.discount_pct || 0;
                const subtotal = item.quantity * (item.unit_price || 0) * (1 - discount / 100);
                totalAmount += subtotal;
                await manager.save(order_item_entity_1.OrderItem, {
                    orderId: saved.id, partId: item.part_id, quantity: item.quantity,
                    unitPrice: item.unit_price || 0, discountPct: discount, subtotal,
                });
                let inv = await manager.findOne(inventory_entity_1.Inventory, { where: { partId: item.part_id }, lock: { mode: 'pessimistic_write' } });
                if (!inv) {
                    inv = manager.create(inventory_entity_1.Inventory, { partId: item.part_id, quantity: 0, reservedQuantity: 0 });
                }
                if (!data.allow_negative && inv.quantity < item.quantity)
                    throw new common_1.BadRequestException(`配件 ID ${item.part_id} 库存不足`);
                const before = inv.quantity;
                inv.quantity -= item.quantity;
                inv.reservedQuantity += item.quantity;
                await manager.save(inv);
                await manager.save(inventory_log_entity_1.InventoryLog, {
                    partId: item.part_id, changeType: 'OUT', quantityChange: item.quantity,
                    quantityBefore: before, quantityAfter: inv.quantity,
                    reason: `订单 ${orderNumber}`, referenceType: 'order', referenceId: saved.id, operatorId: userId,
                });
            }
            saved.totalAmount = totalAmount;
            await manager.save(saved);
            const items = await manager.find(order_item_entity_1.OrderItem, { where: { orderId: saved.id } });
            return { order: saved, items };
        });
    }
    async updateOrder(id, data) {
        const order = await this.orderRepo.findOne({ where: { id } });
        if (!order)
            throw new common_1.NotFoundException('订单不存在');
        if (data.shipping_method !== undefined)
            order.shippingMethod = data.shipping_method;
        if (data.shipping_address !== undefined)
            order.shippingAddress = data.shipping_address;
        if (data.tracking_number !== undefined)
            order.trackingNumber = data.tracking_number;
        if (data.notes !== undefined)
            order.notes = data.notes;
        if (data.currency !== undefined)
            order.currency = data.currency;
        return this.orderRepo.save(order);
    }
    async updateItem(itemId, data) {
        const item = await this.itemRepo.findOne({ where: { id: itemId } });
        if (!item)
            throw new common_1.NotFoundException('订单项不存在');
        const order = await this.orderRepo.findOne({ where: { id: item.orderId } });
        if (!order)
            throw new common_1.NotFoundException('订单不存在');
        if (order.status !== 'pending')
            throw new common_1.BadRequestException('只能编辑待确认订单的项目');
        if (data.quantity !== undefined && data.quantity !== item.quantity) {
            const diff = data.quantity - item.quantity;
            const inv = await this.invRepo.findOne({ where: { partId: item.partId }, lock: { mode: 'pessimistic_write' } });
            if (!inv)
                throw new common_1.BadRequestException('库存记录不存在');
            if (diff > 0 && inv.quantity < diff)
                throw new common_1.BadRequestException('库存不足');
            const before = inv.quantity;
            inv.quantity -= diff;
            inv.reservedQuantity += diff;
            await this.invRepo.save(inv);
            await this.logRepo.save({
                partId: item.partId, changeType: diff > 0 ? 'OUT' : 'IN', quantityChange: Math.abs(diff),
                quantityBefore: before, quantityAfter: inv.quantity,
                reason: `修改订单项 ${order.orderNumber}`, referenceType: 'order', referenceId: order.id,
            });
            item.quantity = data.quantity;
        }
        if (data.unit_price !== undefined)
            item.unitPrice = data.unit_price;
        if (data.discount_pct !== undefined)
            item.discountPct = data.discount_pct;
        item.subtotal = item.quantity * Number(item.unitPrice) * (1 - Number(item.discountPct) / 100);
        await this.itemRepo.save(item);
        await this.recalcTotal(order.id);
        return item;
    }
    async addItem(orderId, data) {
        const order = await this.orderRepo.findOne({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException('订单不存在');
        if (order.status !== 'pending')
            throw new common_1.BadRequestException('只能给待确认订单添加项目');
        return this.dataSource.transaction(async (manager) => {
            const discount = data.discount_pct || 0;
            const subtotal = data.quantity * (data.unit_price || 0) * (1 - discount / 100);
            const item = await manager.save(order_item_entity_1.OrderItem, {
                orderId, partId: data.part_id, quantity: data.quantity,
                unitPrice: data.unit_price || 0, discountPct: discount, subtotal,
            });
            let inv = await manager.findOne(inventory_entity_1.Inventory, { where: { partId: data.part_id }, lock: { mode: 'pessimistic_write' } });
            if (!inv) {
                inv = manager.create(inventory_entity_1.Inventory, { partId: data.part_id, quantity: 0, reservedQuantity: 0 });
            }
            if (!data.allow_negative && inv.quantity < data.quantity)
                throw new common_1.BadRequestException('库存不足');
            const before = inv.quantity;
            inv.quantity -= data.quantity;
            inv.reservedQuantity += data.quantity;
            await manager.save(inv);
            await manager.save(inventory_log_entity_1.InventoryLog, {
                partId: data.part_id, changeType: 'OUT', quantityChange: data.quantity,
                quantityBefore: before, quantityAfter: inv.quantity,
                reason: `添加订单项 ${order.orderNumber}`, referenceType: 'order', referenceId: orderId,
            });
            await this.recalcTotal(orderId, manager);
            return item;
        });
    }
    async removeItem(itemId) {
        const item = await this.itemRepo.findOne({ where: { id: itemId } });
        if (!item)
            throw new common_1.NotFoundException('订单项不存在');
        const order = await this.orderRepo.findOne({ where: { id: item.orderId } });
        if (!order)
            throw new common_1.NotFoundException('订单不存在');
        if (order.status !== 'pending')
            throw new common_1.BadRequestException('只能删除待确认订单的项目');
        await this.dataSource.transaction(async (manager) => {
            const inv = await manager.findOne(inventory_entity_1.Inventory, { where: { partId: item.partId }, lock: { mode: 'pessimistic_write' } });
            if (inv) {
                const before = inv.quantity;
                inv.quantity += item.quantity;
                inv.reservedQuantity -= item.quantity;
                await manager.save(inv);
                await manager.save(inventory_log_entity_1.InventoryLog, {
                    partId: item.partId, changeType: 'IN', quantityChange: item.quantity,
                    quantityBefore: before, quantityAfter: inv.quantity,
                    reason: `删除订单项 ${order.orderNumber}`, referenceType: 'order', referenceId: order.id,
                });
            }
            await manager.remove(item);
            await this.recalcTotal(order.id, manager);
        });
        return { deleted: true };
    }
    async deleteOrder(id) {
        const order = await this.orderRepo.findOne({ where: { id } });
        if (!order)
            throw new common_1.NotFoundException('订单不存在');
        if (order.status !== 'pending' && order.status !== 'cancelled') {
            throw new common_1.BadRequestException('只能删除待确认或已取消的订单');
        }
        await this.dataSource.transaction(async (manager) => {
            const items = await manager.find(order_item_entity_1.OrderItem, { where: { orderId: id } });
            if (order.status === 'pending') {
                for (const item of items) {
                    const inv = await manager.findOne(inventory_entity_1.Inventory, { where: { partId: item.partId }, lock: { mode: 'pessimistic_write' } });
                    if (inv) {
                        const before = inv.quantity;
                        inv.quantity += item.quantity;
                        inv.reservedQuantity -= item.quantity;
                        await manager.save(inv);
                        await manager.save(inventory_log_entity_1.InventoryLog, {
                            partId: item.partId, changeType: 'IN', quantityChange: item.quantity,
                            quantityBefore: before, quantityAfter: inv.quantity,
                            reason: `删除订单 ${order.orderNumber}`, referenceType: 'order', referenceId: id,
                        });
                    }
                }
            }
            await manager.remove(items);
            await manager.remove(order);
        });
        return { deleted: true };
    }
    async batchUpdateStatus(ids, status) {
        if (!ids.length)
            return { updated: 0 };
        const orders = await this.orderRepo.find({ where: { id: (0, typeorm_2.In)(ids) } });
        let updated = 0;
        for (const order of orders) {
            order.status = status;
            await this.orderRepo.save(order);
            updated++;
        }
        return { updated };
    }
    async batchDelete(ids) {
        if (!ids.length)
            return { deleted: 0 };
        const orders = await this.orderRepo.find({ where: { id: (0, typeorm_2.In)(ids) } });
        let deleted = 0;
        for (const order of orders) {
            if (order.status === 'pending' || order.status === 'cancelled') {
                await this.deleteOrder(order.id);
                deleted++;
            }
        }
        return { deleted };
    }
    async updateStatus(id, status) {
        const order = await this.orderRepo.findOne({ where: { id } });
        if (!order)
            throw new common_1.NotFoundException('订单不存在');
        order.status = status;
        return this.orderRepo.save(order);
    }
    async cancel(id, reason, userId) {
        return this.dataSource.transaction(async (manager) => {
            const order = await manager.findOne(order_entity_1.Order, { where: { id } });
            if (!order)
                throw new common_1.NotFoundException('订单不存在');
            if (order.status === 'completed')
                throw new common_1.BadRequestException('已完成订单不能取消');
            if (order.status === 'cancelled')
                throw new common_1.BadRequestException('订单已取消');
            const items = await manager.find(order_item_entity_1.OrderItem, { where: { orderId: id } });
            for (const item of items) {
                const inv = await manager.findOne(inventory_entity_1.Inventory, { where: { partId: item.partId }, lock: { mode: 'pessimistic_write' } });
                if (inv) {
                    const before = inv.quantity;
                    inv.quantity += item.quantity;
                    inv.reservedQuantity -= item.quantity;
                    await manager.save(inv);
                    await manager.save(inventory_log_entity_1.InventoryLog, {
                        partId: item.partId, changeType: 'IN', quantityChange: item.quantity,
                        quantityBefore: before, quantityAfter: inv.quantity,
                        reason: `取消订单 ${order.orderNumber}: ${reason}`, referenceType: 'cancellation', referenceId: id, operatorId: userId,
                    });
                }
            }
            order.status = 'cancelled';
            order.notes = `${order.notes}\n取消原因: ${reason}`.trim();
            return manager.save(order);
        });
    }
    async getStats(dateFrom, dateTo) {
        const totalOrders = await this.orderRepo.count();
        const pendingOrders = await this.orderRepo.count({ where: { status: 'pending' } });
        const confirmedOrders = await this.orderRepo.count({ where: { status: 'confirmed' } });
        const shippedOrders = await this.orderRepo.count({ where: { status: 'shipped' } });
        const completedOrders = await this.orderRepo.count({ where: { status: 'completed' } });
        const cancelledOrders = await this.orderRepo.count({ where: { status: 'cancelled' } });
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const monthOrders = await this.orderRepo.createQueryBuilder('o')
            .where('o.order_date >= :s', { s: monthStart }).andWhere('o.status != :c', { c: 'cancelled' }).getCount();
        const monthRevenue = await this.orderRepo.createQueryBuilder('o')
            .select('COALESCE(SUM(o.total_amount), 0)', 'total')
            .where('o.order_date >= :s', { s: monthStart }).andWhere('o.status != :c', { c: 'cancelled' }).getRawOne();
        return {
            total_orders: totalOrders, pending_orders: pendingOrders, confirmed_orders: confirmedOrders,
            shipped_orders: shippedOrders, completed_orders: completedOrders, cancelled_orders: cancelledOrders,
            current_month_total: monthOrders, current_month_revenue: Number(monthRevenue?.total || 0),
        };
    }
    async getDefaultPrice(partId) {
        const price = await this.priceRepo.findOne({ where: { partId, priceType: '批发价' } });
        return price ? Number(price.unitPrice) : 0;
    }
    async recalcTotal(orderId, manager) {
        const repo = manager ? manager.getRepository(order_item_entity_1.OrderItem) : this.itemRepo;
        const items = await repo.find({ where: { orderId } });
        const total = items.reduce((sum, i) => sum + Number(i.subtotal), 0);
        const orderRepo = manager ? manager.getRepository(order_entity_1.Order) : this.orderRepo;
        const order = await orderRepo.findOne({ where: { id: orderId } });
        if (order) {
            order.totalAmount = total;
            await orderRepo.save(order);
        }
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(order_item_entity_1.OrderItem)),
    __param(2, (0, typeorm_1.InjectRepository)(part_entity_1.Part)),
    __param(3, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __param(4, (0, typeorm_1.InjectRepository)(inventory_entity_1.Inventory)),
    __param(5, (0, typeorm_1.InjectRepository)(inventory_log_entity_1.InventoryLog)),
    __param(6, (0, typeorm_1.InjectRepository)(price_entity_1.Price)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], OrdersService);
//# sourceMappingURL=orders.service.js.map