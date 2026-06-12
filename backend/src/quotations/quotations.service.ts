import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Quotation } from './entities/quotation.entity';
import { QuotationItem } from './entities/quotation-item.entity';
import { QuotationTemplate } from './entities/quotation-template.entity';
import { PaymentAccount } from './entities/payment-account.entity';
import { Part } from '../parts/entities/part.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryLog } from '../inventory/entities/inventory-log.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class QuotationsService {
  constructor(
    @InjectRepository(Quotation) private quotationRepo: Repository<Quotation>,
    @InjectRepository(QuotationItem) private itemRepo: Repository<QuotationItem>,
    @InjectRepository(QuotationTemplate) private templateRepo: Repository<QuotationTemplate>,
    @InjectRepository(PaymentAccount) private paymentAccountRepo: Repository<PaymentAccount>,
    @InjectRepository(Part) private partRepo: Repository<Part>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Inventory) private invRepo: Repository<Inventory>,
    @InjectRepository(InventoryLog) private logRepo: Repository<InventoryLog>,
    private dataSource: DataSource,
  ) {}

  // ==================== Templates ====================

  async getTemplates() { return this.templateRepo.find({ order: { createdAt: 'DESC' } }); }
  async getTemplate(id: number) { return this.templateRepo.findOne({ where: { id } }); }
  async saveTemplate(data: any) {
    const t = this.templateRepo.create({
      templateName: data.template_name, headerText: data.header_text || '',
      footerText: data.footer_text || '', termsText: data.terms_text || '',
      currency: data.currency || 'USD', includeImage: data.include_image ?? true,
    });
    return this.templateRepo.save(t);
  }
  async updateTemplate(id: number, data: any) {
    const t = await this.templateRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('模板不存在');
    if (data.template_name) t.templateName = data.template_name;
    if (data.header_text !== undefined) t.headerText = data.header_text;
    if (data.footer_text !== undefined) t.footerText = data.footer_text;
    if (data.terms_text !== undefined) t.termsText = data.terms_text;
    return this.templateRepo.save(t);
  }
  async deleteTemplate(id: number) { await this.templateRepo.delete(id); }

  // ==================== Quotations ====================

  async generate(data: any) {
    if (!data.items?.length) throw new BadRequestException('报价项不能为空');

    // Auto-create customer if not provided
    if (!data.customer_id && data.buyer_company) {
      data.customer_id = await this.findOrCreateCustomer(data);
    }

    // Generate quotation number with time: QT-YYYYMMDDHHmm-NNN
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 16).replace(/[-:T]/g, '').slice(0, 12);
    const count = await this.quotationRepo.count();
    const quotationNumber = `QT-${dateStr}-${String(count + 1).padStart(3, '0')}`;

    let totalAmount = 0;
    const items: any[] = [];
    for (const item of data.items) {
      const subtotal = item.quantity * (item.unit_price || 0);
      totalAmount += subtotal;
      items.push({
        partId: item.part_id, oeNumber: item.oe_number || '', partName: item.part_name || '',
        brand: item.brand || '', packageName: item.package_name || '', unit: item.unit || 'pcs',
        quantity: item.quantity, unitPrice: item.unit_price || 0, subtotal,
      });
    }

    const discountPct = Number(data.discount_pct) || 0;
    const shippingCost = Number(data.shipping_cost) || 0;
    const finalTotal = totalAmount * (1 - discountPct / 100) + shippingCost;

    const quotation = this.quotationRepo.create({
      quotationNumber, customerId: data.customer_id || null,
      currency: data.currency || 'USD', status: 'draft',
      sellerCompany: data.seller_company || '', sellerContact: data.seller_contact || '',
      sellerPhone: data.seller_phone || '', sellerEmail: data.seller_email || '',
      sellerAddress: data.seller_address || '', logoUrl: data.logo_url || '',
      buyerCompany: data.buyer_company || '', buyerContact: data.buyer_contact || '',
      buyerPhone: data.buyer_phone || '', buyerEmail: data.buyer_email || '',
      buyerAddress: data.buyer_address || '',
      tradeTerms: data.trade_terms || '', portLoading: data.port_loading || '',
      portDest: data.port_dest || '', deliveryTime: data.delivery_time || '',
      validUntil: data.valid_until || null,
      discountPct, shippingCost, totalAmount: finalTotal,
      paymentStages: data.payment_stages || [],
      paymentAccountId: data.payment_account_id || null,
      notes: data.notes || '', remark: data.remark || '',
    });
    const saved = await this.quotationRepo.save(quotation);

    for (const item of items) {
      await this.itemRepo.save({ ...item, quotationId: saved.id });
    }

    return this.findOne(saved.id);
  }

  async findAll(page = 1, pageSize = 20, filters?: { status?: string; customer_id?: number; keyword?: string; date_from?: string; date_to?: string }) {
    const qb = this.quotationRepo.createQueryBuilder('q');
    if (filters?.status) qb.andWhere('q.status = :s', { s: filters.status });
    if (filters?.customer_id) qb.andWhere('q.customer_id = :c', { c: filters.customer_id });
    if (filters?.date_from) qb.andWhere('q.created_at >= :df', { df: filters.date_from });
    if (filters?.date_to) qb.andWhere('q.created_at <= :dt', { dt: filters.date_to });
    if (filters?.keyword) {
      qb.andWhere('(q.quotation_number ILIKE :kw OR q.buyer_company ILIKE :kw OR q.notes ILIKE :kw OR q.remark ILIKE :kw)', { kw: `%${filters.keyword}%` });
    }
    qb.orderBy('q.created_at', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [items, total] = await qb.getManyAndCount();
    return new PaginatedResponseDto(items, total, page, pageSize);
  }

  async findOne(id: number) {
    const q = await this.quotationRepo.findOne({ where: { id } });
    if (!q) throw new NotFoundException('报价单不存在');
    const items = await this.itemRepo.find({ where: { quotationId: id } });
    const partIds = [...new Set(items.map(i => i.partId).filter(Boolean))];
    const parts = partIds.length ? await this.partRepo.find({ where: { id: In(partIds) } }) : [];
    const partMap = new Map(parts.map(p => [p.id, p]));
    const itemsWithParts = items.map(item => ({
      ...item,
      part: partMap.get(item.partId) || null,
    }));
    // Load payment account if set
    let paymentAccount: PaymentAccount | null = null;
    if (q.paymentAccountId) {
      paymentAccount = await this.paymentAccountRepo.findOne({ where: { id: q.paymentAccountId } });
    }
    return { quotation: q, items: itemsWithParts, paymentAccount };
  }

  async update(id: number, data: any) {
    const q = await this.quotationRepo.findOne({ where: { id } });
    if (!q) throw new NotFoundException('报价单不存在');

    // Map snake_case fields to camelCase
    const fieldMap: Record<string, string> = {
      seller_company: 'sellerCompany', seller_contact: 'sellerContact',
      seller_phone: 'sellerPhone', seller_email: 'sellerEmail', seller_address: 'sellerAddress',
      logo_url: 'logoUrl',
      buyer_company: 'buyerCompany', buyer_contact: 'buyerContact',
      buyer_phone: 'buyerPhone', buyer_email: 'buyerEmail', buyer_address: 'buyerAddress',
      trade_terms: 'tradeTerms', port_loading: 'portLoading', port_dest: 'portDest',
      delivery_time: 'deliveryTime', valid_until: 'validUntil',
      discount_pct: 'discountPct', shipping_cost: 'shippingCost',
      payment_stages: 'paymentStages', payment_account_id: 'paymentAccountId',
      customer_id: 'customerId',
    };
    for (const [k, v] of Object.entries(data)) {
      if (k === 'items') continue;
      const key = fieldMap[k] || k;
      if (v !== undefined) (q as any)[key] = v;
    }

    // Replace items if provided
    if (data.items) {
      await this.itemRepo.delete({ quotationId: id });
      let totalAmount = 0;
      for (const item of data.items) {
        const subtotal = item.quantity * (item.unit_price || 0);
        totalAmount += subtotal;
        await this.itemRepo.save({
          quotationId: id, partId: item.part_id,
          oeNumber: item.oe_number || '', partName: item.part_name || '',
          brand: item.brand || '', packageName: item.package_name || '', unit: item.unit || 'pcs',
          quantity: item.quantity, unitPrice: item.unit_price || 0, subtotal,
        });
      }
      const discountPct = Number(data.discount_pct ?? q.discountPct) || 0;
      const shippingCost = Number(data.shipping_cost ?? q.shippingCost) || 0;
      q.totalAmount = totalAmount * (1 - discountPct / 100) + shippingCost;
    }

    await this.quotationRepo.save(q);
    return this.findOne(id);
  }

  async delete(id: number) {
    const q = await this.quotationRepo.findOne({ where: { id } });
    if (!q) throw new NotFoundException('报价单不存在');
    await this.itemRepo.delete({ quotationId: id });
    await this.quotationRepo.remove(q);
    return { deleted: true };
  }

  async updateStatus(id: number, status: string) {
    const q = await this.quotationRepo.findOne({ where: { id } });
    if (!q) throw new NotFoundException('报价单不存在');
    q.status = status;
    return this.quotationRepo.save(q);
  }

  async convertToOrder(quotationId: number, userId?: number) {
    const { quotation, items } = await this.findOne(quotationId);
    if (!quotation) throw new NotFoundException('报价单不存在');
    if (quotation.status !== 'accepted') throw new BadRequestException('只能转换已接受的报价单');
    if (!items.length) throw new BadRequestException('报价单没有商品项');

    return this.dataSource.transaction(async (manager) => {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const count = await manager.count(Order);
      const orderNumber = `ORD${today}${String(count + 1).padStart(4, '0')}`;

      const order = manager.create(Order, {
        orderNumber, customerId: quotation.customerId,
        currency: quotation.currency, status: 'pending',
        shippingMethod: '', shippingAddress: quotation.buyerAddress || '',
        notes: `从报价单 ${quotation.quotationNumber} 转换`, createdBy: userId,
      });
      const savedOrder = await manager.save(order);

      let totalAmount = 0;
      for (const item of items) {
        const subtotal = Number(item.quantity) * Number(item.unitPrice);
        totalAmount += subtotal;
        await manager.save(OrderItem, {
          orderId: savedOrder.id, partId: item.partId,
          quantity: item.quantity, unitPrice: item.unitPrice,
          discountPct: 0, subtotal,
        });
        // Deduct inventory
        let inv = await manager.findOne(Inventory, { where: { partId: item.partId }, lock: { mode: 'pessimistic_write' } });
        if (!inv) {
          inv = manager.create(Inventory, { partId: item.partId, quantity: 0, reservedQuantity: 0 });
        }
        const before = inv.quantity;
        inv.quantity -= Number(item.quantity);
        inv.reservedQuantity += Number(item.quantity);
        await manager.save(inv);
        await manager.save(InventoryLog, {
          partId: item.partId, changeType: 'OUT', quantityChange: Number(item.quantity),
          quantityBefore: before, quantityAfter: inv.quantity,
          reason: `报价单 ${quotation.quotationNumber} 转订单`, referenceType: 'order', referenceId: savedOrder.id, operatorId: userId,
        });
      }

      savedOrder.totalAmount = totalAmount;
      await manager.save(savedOrder);
      return { order: savedOrder };
    });
  }

  // ==================== Payment Accounts ====================

  async getPaymentAccounts() {
    return this.paymentAccountRepo.find({ order: { isDefault: 'DESC', createdAt: 'DESC' } });
  }

  async getPaymentAccount(id: number) {
    return this.paymentAccountRepo.findOne({ where: { id } });
  }

  async createPaymentAccount(data: any) {
    const pa = this.paymentAccountRepo.create({
      accountName: data.account_name, beneficiaryName: data.beneficiary_name || '',
      bankName: data.bank_name || '', bankAddress: data.bank_address || '',
      swiftCode: data.swift_code || '', accountNumber: data.account_number || '',
      currency: data.currency || 'USD', remark: data.remark || '',
      isDefault: data.is_default ?? false,
    });
    if (pa.isDefault) {
      await this.paymentAccountRepo.update({ isDefault: true }, { isDefault: false });
    }
    return this.paymentAccountRepo.save(pa);
  }

  async updatePaymentAccount(id: number, data: any) {
    const pa = await this.paymentAccountRepo.findOne({ where: { id } });
    if (!pa) throw new NotFoundException('付款账户不存在');
    if (data.account_name !== undefined) pa.accountName = data.account_name;
    if (data.beneficiary_name !== undefined) pa.beneficiaryName = data.beneficiary_name;
    if (data.bank_name !== undefined) pa.bankName = data.bank_name;
    if (data.bank_address !== undefined) pa.bankAddress = data.bank_address;
    if (data.swift_code !== undefined) pa.swiftCode = data.swift_code;
    if (data.account_number !== undefined) pa.accountNumber = data.account_number;
    if (data.currency !== undefined) pa.currency = data.currency;
    if (data.remark !== undefined) pa.remark = data.remark;
    if (data.is_default !== undefined) pa.isDefault = data.is_default;
    if (pa.isDefault) {
      await this.paymentAccountRepo.update({ id: In([id]), isDefault: false }, { isDefault: false });
      await this.paymentAccountRepo.update({ isDefault: true }, { isDefault: false });
    }
    return this.paymentAccountRepo.save(pa);
  }

  async deletePaymentAccount(id: number) {
    await this.paymentAccountRepo.delete(id);
    return { deleted: true };
  }

  // ==================== Helpers ====================

  private async findOrCreateCustomer(buyerData: any): Promise<number> {
    const companyName = buyerData.buyer_company;
    if (!companyName) throw new BadRequestException('买方公司名称不能为空');

    // Try to find existing customer by company name
    const existing = await this.customerRepo.findOne({ where: { companyName } });
    if (existing) return existing.id;

    // Auto-generate customer code
    const count = await this.customerRepo.count();
    const customerCode = `C${String(count + 1).padStart(5, '0')}`;

    const customer = this.customerRepo.create({
      customerCode, companyName,
      contactPerson: buyerData.buyer_contact || '',
      phone: buyerData.buyer_phone || '',
      email: buyerData.buyer_email || '',
      address: buyerData.buyer_address || '',
    });
    const saved = await this.customerRepo.save(customer);
    return saved.id;
  }
}
