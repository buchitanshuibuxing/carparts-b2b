import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Part } from '../parts/entities/part.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryLog } from '../inventory/entities/inventory-log.entity';
import { Price } from '../prices/entities/price.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
    @InjectRepository(Part) private partRepo: Repository<Part>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Inventory) private invRepo: Repository<Inventory>,
    @InjectRepository(InventoryLog) private logRepo: Repository<InventoryLog>,
    @InjectRepository(Price) private priceRepo: Repository<Price>,
    private dataSource: DataSource,
  ) {}

  async findAll(page = 1, pageSize = 100, filters?: { status?: string; customer_id?: number; date_from?: string; date_to?: string; keyword?: string }) {
    const qb = this.orderRepo.createQueryBuilder('o');
    if (filters?.status) qb.andWhere('o.status = :s', { s: filters.status });
    if (filters?.customer_id) qb.andWhere('o.customer_id = :c', { c: filters.customer_id });
    if (filters?.date_from) qb.andWhere('o.order_date >= :df', { df: filters.date_from });
    if (filters?.date_to) qb.andWhere('o.order_date <= :dt', { dt: filters.date_to });

    if (filters?.keyword) {
      const kw = `%${filters.keyword}%`;
      // Search by customer name
      const matchingCustomers = await this.customerRepo.createQueryBuilder('c')
        .select('c.id')
        .where('c.company_name ILIKE :kw', { kw })
        .orWhere('c.contact_person ILIKE :kw', { kw })
        .getMany();
      const custIds = matchingCustomers.map(c => c.id);

      // Search by part OE number in order items
      const matchingParts = await this.partRepo.createQueryBuilder('p')
        .select('p.id')
        .where('p.oe_number ILIKE :kw', { kw })
        .getMany();
      const partIds = matchingParts.map(p => p.id);
      let orderIdsFromParts: number[] = [];
      if (partIds.length) {
        const items = await this.itemRepo.createQueryBuilder('oi')
          .select('DISTINCT oi.order_id', 'orderId')
          .where('oi.part_id IN (:...partIds)', { partIds })
          .getRawMany();
        orderIdsFromParts = items.map(i => i.orderId);
      }

      const conditions = ['o.order_number ILIKE :kw', 'o.notes ILIKE :kw'];
      const params: any = { kw };
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

    // Enrich with customer info
    const custIds = [...new Set(items.map(i => i.customerId).filter(Boolean))];
    const customers = custIds.length ? await this.customerRepo.find({ where: { id: In(custIds) } }) : [];
    const custMap = new Map(customers.map(c => [c.id, c]));

    const enriched = items.map(o => ({
      ...o,
      customer: custMap.get(o.customerId) || null,
    }));

    return new PaginatedResponseDto(enriched, total, page, pageSize);
  }

  async findOne(id: number) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('订单不存在');
    const items = await this.itemRepo.find({ where: { orderId: id } });
    const partIds = [...new Set(items.map(i => i.partId).filter(Boolean))];
    const parts = partIds.length ? await this.partRepo.find({ where: { id: In(partIds) } }) : [];
    const partMap = new Map(parts.map(p => [p.id, p]));
    const customer = await this.customerRepo.findOne({ where: { id: order.customerId } });
    const itemsWithParts = items.map(item => ({
      ...item,
      part: partMap.get(item.partId) || null,
    }));
    return { order: { ...order, customer }, items: itemsWithParts };
  }

  async create(data: { customer_id: number; currency?: string; shipping_method?: string; shipping_address?: string; notes?: string; allow_negative?: boolean; items: { part_id: number; quantity: number; unit_price?: number; discount_pct?: number; package_name?: string }[] }, userId?: number) {
    if (!data.items?.length) throw new BadRequestException('订单项不能为空');
    return this.dataSource.transaction(async (manager) => {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const count = await manager.count(Order);
      const orderNumber = `ORD${today}${String(count + 1).padStart(4, '0')}`;

      const order = manager.create(Order, {
        orderNumber, customerId: data.customer_id, currency: data.currency || 'USD',
        shippingMethod: data.shipping_method || '', shippingAddress: data.shipping_address || '',
        shippingCost: (data as any).shipping_cost || 0,
        notes: data.notes || '', status: 'pending', createdBy: userId,
      });
      const saved = await manager.save(order);

      let totalAmount = 0;
      for (const item of data.items) {
        const discount = item.discount_pct || 0;
        const subtotal = item.quantity * (item.unit_price || 0) * (1 - discount / 100);
        totalAmount += subtotal;
        await manager.save(OrderItem, {
          orderId: saved.id, partId: item.part_id, quantity: item.quantity,
          unitPrice: item.unit_price || 0, discountPct: discount, subtotal,
          packageName: (item as any).package_name || null,
        } as any);
        let inv = await manager.findOne(Inventory, { where: { partId: item.part_id }, lock: { mode: 'pessimistic_write' } });
        if (!inv) {
          inv = manager.create(Inventory, { partId: item.part_id, quantity: 0, reservedQuantity: 0 });
        }
        if (!data.allow_negative && inv.quantity < item.quantity) throw new BadRequestException(`配件 ID ${item.part_id} 库存不足`);
        const before = inv.quantity;
        inv.quantity -= item.quantity;
        inv.reservedQuantity += item.quantity;
        await manager.save(inv);
        await manager.save(InventoryLog, {
          partId: item.part_id, changeType: 'OUT', quantityChange: item.quantity,
          quantityBefore: before, quantityAfter: inv.quantity,
          reason: `订单 ${orderNumber}`, referenceType: 'order', referenceId: saved.id, operatorId: userId,
        });
      }

      saved.totalAmount = totalAmount + ((data as any).shipping_cost || 0);
      await manager.save(saved);
      const items = await manager.find(OrderItem, { where: { orderId: saved.id } });
      return { order: saved, items };
    });
  }

  async updateOrder(id: number, data: any) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('订单不存在');
    if (data.shipping_method !== undefined) order.shippingMethod = data.shipping_method;
    if (data.shipping_address !== undefined) order.shippingAddress = data.shipping_address;
    if (data.tracking_number !== undefined) order.trackingNumber = data.tracking_number;
    if (data.notes !== undefined) order.notes = data.notes;
    if (data.currency !== undefined) order.currency = data.currency;
    if (data.paid_amount !== undefined) (order as any).paidAmount = Number(data.paid_amount);
    if (data.shipping_cost !== undefined) {
      order.shippingCost = Number(data.shipping_cost);
      await this.orderRepo.save(order);
      await this.recalcTotal(id);
      return this.orderRepo.findOne({ where: { id } });
    }
    return this.orderRepo.save(order);
  }

  async updateItem(itemId: number, data: { quantity?: number; unit_price?: number; discount_pct?: number }) {
    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('订单项不存在');

    const order = await this.orderRepo.findOne({ where: { id: item.orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'pending') throw new BadRequestException('只能编辑待确认订单的项目');

    // If quantity changed, adjust inventory
    if (data.quantity !== undefined && data.quantity !== item.quantity) {
      const diff = data.quantity - item.quantity;
      const inv = await this.invRepo.findOne({ where: { partId: item.partId }, lock: { mode: 'pessimistic_write' } });
      if (!inv) throw new BadRequestException('库存记录不存在');
      if (diff > 0 && inv.quantity < diff) throw new BadRequestException('库存不足');
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

    if (data.unit_price !== undefined) item.unitPrice = data.unit_price;
    if (data.discount_pct !== undefined) item.discountPct = data.discount_pct;

    item.subtotal = item.quantity * Number(item.unitPrice) * (1 - Number(item.discountPct) / 100);
    await this.itemRepo.save(item);

    // Recalculate order total
    await this.recalcTotal(order.id);
    return item;
  }

  async addItem(orderId: number, data: { part_id: number; quantity: number; unit_price?: number; discount_pct?: number; allow_negative?: boolean }) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'pending') throw new BadRequestException('只能给待确认订单添加项目');

    return this.dataSource.transaction(async (manager) => {
      const discount = data.discount_pct || 0;
      const subtotal = data.quantity * (data.unit_price || 0) * (1 - discount / 100);
      const item = await manager.save(OrderItem, {
        orderId, partId: data.part_id, quantity: data.quantity,
        unitPrice: data.unit_price || 0, discountPct: discount, subtotal,
      });

      // Deduct inventory
      let inv = await manager.findOne(Inventory, { where: { partId: data.part_id }, lock: { mode: 'pessimistic_write' } });
      if (!inv) {
        inv = manager.create(Inventory, { partId: data.part_id, quantity: 0, reservedQuantity: 0 });
      }
      if (!data.allow_negative && inv.quantity < data.quantity) throw new BadRequestException('库存不足');
      const before = inv.quantity;
      inv.quantity -= data.quantity;
      inv.reservedQuantity += data.quantity;
      await manager.save(inv);
      await manager.save(InventoryLog, {
        partId: data.part_id, changeType: 'OUT', quantityChange: data.quantity,
        quantityBefore: before, quantityAfter: inv.quantity,
        reason: `添加订单项 ${order.orderNumber}`, referenceType: 'order', referenceId: orderId,
      });

      await this.recalcTotal(orderId, manager);
      return item;
    });
  }

  async removeItem(itemId: number) {
    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('订单项不存在');

    const order = await this.orderRepo.findOne({ where: { id: item.orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'pending') throw new BadRequestException('只能删除待确认订单的项目');

    await this.dataSource.transaction(async (manager) => {
      // Restore inventory
      const inv = await manager.findOne(Inventory, { where: { partId: item.partId }, lock: { mode: 'pessimistic_write' } });
      if (inv) {
        const before = inv.quantity;
        inv.quantity += item.quantity;
        inv.reservedQuantity -= item.quantity;
        await manager.save(inv);
        await manager.save(InventoryLog, {
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

  async deleteOrder(id: number) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'pending' && order.status !== 'cancelled') {
      throw new BadRequestException('只能删除待确认或已取消的订单');
    }

    await this.dataSource.transaction(async (manager) => {
      const items = await manager.find(OrderItem, { where: { orderId: id } });
      // Restore inventory for pending orders
      if (order.status === 'pending') {
        for (const item of items) {
          const inv = await manager.findOne(Inventory, { where: { partId: item.partId }, lock: { mode: 'pessimistic_write' } });
          if (inv) {
            const before = inv.quantity;
            inv.quantity += item.quantity;
            inv.reservedQuantity -= item.quantity;
            await manager.save(inv);
            await manager.save(InventoryLog, {
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

  async batchUpdateStatus(ids: number[], status: string) {
    if (!ids.length) return { updated: 0 };
    const orders = await this.orderRepo.find({ where: { id: In(ids) } });
    let updated = 0;
    for (const order of orders) {
      order.status = status;
      await this.orderRepo.save(order);
      updated++;
    }
    return { updated };
  }

  async batchDelete(ids: number[]) {
    if (!ids.length) return { deleted: 0 };
    const orders = await this.orderRepo.find({ where: { id: In(ids) } });
    let deleted = 0;
    for (const order of orders) {
      await this.dataSource.transaction(async (manager) => {
        await manager.delete(OrderItem, { orderId: order.id });
        await manager.delete(Order, order.id);
      });
      deleted++;
    }
    return { deleted };
  }

  async updateStatus(id: number, status: string) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('订单不存在');
    order.status = status;
    return this.orderRepo.save(order);
  }

  async cancel(id: number, reason: string, userId?: number) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { id } });
      if (!order) throw new NotFoundException('订单不存在');
      if (order.status === 'completed') throw new BadRequestException('已完成订单不能取消');
      if (order.status === 'cancelled') throw new BadRequestException('订单已取消');

      const items = await manager.find(OrderItem, { where: { orderId: id } });
      for (const item of items) {
        const inv = await manager.findOne(Inventory, { where: { partId: item.partId }, lock: { mode: 'pessimistic_write' } });
        if (inv) {
          const before = inv.quantity;
          inv.quantity += item.quantity;
          inv.reservedQuantity -= item.quantity;
          await manager.save(inv);
          await manager.save(InventoryLog, {
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

  async getStats(dateFrom?: string, dateTo?: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 合并为单条 SQL 查询，减少数据库往返
    const stats = await this.orderRepo.createQueryBuilder('o')
      .select([
        'COUNT(*) as total_orders',
        'COUNT(CASE WHEN o.status = \'pending\' THEN 1 END) as pending_orders',
        'COUNT(CASE WHEN o.status = \'confirmed\' THEN 1 END) as confirmed_orders',
        'COUNT(CASE WHEN o.status = \'shipped\' THEN 1 END) as shipped_orders',
        'COUNT(CASE WHEN o.status = \'completed\' THEN 1 END) as completed_orders',
        'COUNT(CASE WHEN o.status = \'cancelled\' THEN 1 END) as cancelled_orders',
        'COUNT(CASE WHEN o.order_date >= :monthStart AND o.status != \'cancelled\' THEN 1 END) as current_month_total',
        'COALESCE(SUM(CASE WHEN o.order_date >= :monthStart AND o.status != \'cancelled\' THEN o.total_amount ELSE 0 END), 0) as current_month_revenue',
      ])
      .setParameters({ monthStart })
      .getRawOne();

    return {
      total_orders: Number(stats?.total_orders || 0),
      pending_orders: Number(stats?.pending_orders || 0),
      confirmed_orders: Number(stats?.confirmed_orders || 0),
      shipped_orders: Number(stats?.shipped_orders || 0),
      completed_orders: Number(stats?.completed_orders || 0),
      cancelled_orders: Number(stats?.cancelled_orders || 0),
      current_month_total: Number(stats?.current_month_total || 0),
      current_month_revenue: Number(stats?.current_month_revenue || 0),
    };
  }

  async getDefaultPrice(partId: number): Promise<number> {
    const price = await this.priceRepo.findOne({ where: { partId, priceType: '批发价' } });
    return price ? Number(price.unitPrice) : 0;
  }

  private async recalcTotal(orderId: number, manager?: any) {
    const repo = manager ? manager.getRepository(OrderItem) : this.itemRepo;
    const items = await repo.find({ where: { orderId } });
    const itemsTotal = items.reduce((sum: number, i: any) => sum + Number(i.subtotal), 0);
    const orderRepo = manager ? manager.getRepository(Order) : this.orderRepo;
    const order = await orderRepo.findOne({ where: { id: orderId } });
    if (order) {
      order.totalAmount = itemsTotal + Number(order.shippingCost || 0);
      await orderRepo.save(order);
    }
  }
}
