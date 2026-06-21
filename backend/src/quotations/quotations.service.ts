import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Quotation } from './entities/quotation.entity';
import { QuotationItem } from './entities/quotation-item.entity';
import { QuotationTemplate } from './entities/quotation-template.entity';
import { PaymentAccount } from './entities/payment-account.entity';
import { Part } from '../parts/entities/part.entity';
import { Customer } from '../customers/entities/customer.entity';
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
    private dataSource: DataSource,
  ) {}

  // ---- Templates ----
  async getTemplates() { return this.templateRepo.find({ order: { createdAt: 'DESC' } }); }
  async getTemplate(id: number) { return this.templateRepo.findOne({ where: { id } }); }
  async saveTemplate(data: any) {
    return this.templateRepo.save(this.templateRepo.create({
      templateName: data.template_name, headerText: data.header_text || '',
      footerText: data.footer_text || '', termsText: data.terms_text || '',
      currency: data.currency || 'USD', includeImage: data.include_image ?? true,
    }));
  }
  async updateTemplate(id: number, data: any) {
    const t: any = await this.templateRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('模板不存在');
    if (data.template_name) t.templateName = data.template_name;
    if (data.header_text !== undefined) t.headerText = data.header_text;
    if (data.footer_text !== undefined) t.footerText = data.footer_text;
    if (data.terms_text !== undefined) t.termsText = data.terms_text;
    return this.templateRepo.save(t);
  }
  async deleteTemplate(id: number) { await this.templateRepo.delete(id); }

  // ---- Get Next Quotation Number ----
  async getNextQuotationNumber(data: any) {
    const today = new Date().toISOString().slice(0, 10);
    const todayStr = today.replace(/-/g, "");
    const todayCount = await this.quotationRepo.createQueryBuilder("q")
      .where("q.created_at >= :startDate", { startDate: today })
      .getCount();
    const prefix = data.quote_prefix || "QT";
    let middle = todayStr;
    if (data.quote_middle_type === "random") middle = Math.random().toString(36).substring(2, 8).toUpperCase();
    else if (data.quote_middle_type === "custom" && data.quote_middle_custom) middle = data.quote_middle_custom;
    const startNum = parseInt(data.quote_suffix_start || "1", 10);
    const suffix = String(startNum + todayCount).padStart((data.quote_suffix_start || "001").length, "0");
    const quotationNumber = prefix + middle + suffix;
    return { quotationNumber };
  }

  // ---- Generate ----
  async generate(data: any) {
    const today = new Date().toISOString().slice(0, 10);
    const todayStr = today.replace(/-/g, '');
    const todayCount = await this.quotationRepo.createQueryBuilder("q")
      .where("q.created_at >= :startDate", { startDate: today })
      .getCount();
    const prefix = data.quote_prefix || 'QT';
    let middle = todayStr;
    if (data.quote_middle_type === 'random') middle = Math.random().toString(36).substring(2, 8).toUpperCase();
    else if (data.quote_middle_type === 'custom' && data.quote_middle_custom) middle = data.quote_middle_custom;
    const startNum = parseInt(data.quote_suffix_start || '1', 10);
    const suffix = String(startNum + todayCount).padStart((data.quote_suffix_start || '001').length, '0');
    const quotationNumber = prefix + middle + suffix;

    const items = data.items || [];
    let totalAmount = 0;
    for (const item of items) totalAmount += (item.quantity || 0) * (item.unit_price || 0);
    totalAmount += Number(data.shipping_cost) || 0;

    const quotation = this.quotationRepo.create({
      quotationNumber,
      templateId: data.template_id || null,
      customerId: data.customer_id || null,
      currency: data.currency || 'USD', status: 'draft', totalAmount,
      sellerCompany: data.seller_company || '', sellerContact: data.seller_contact || '',
      sellerPhone: data.seller_phone || '', sellerEmail: data.seller_email || '',
      sellerAddress: data.seller_address || '', logoUrl: data.logo_url || '',
      buyerCompany: data.buyer_company || '', buyerContact: data.buyer_contact || '',
      buyerPhone: data.buyer_phone || '', buyerEmail: data.buyer_email || '',
      buyerAddress: data.buyer_address || '',
      tradeTerms: data.trade_terms || '', portLoading: data.port_loading || '',
      portDest: data.port_dest || '', deliveryTime: data.delivery_time || '',
      validUntil: data.valid_until || null,
      discountPct: data.discount_pct || 0, shippingCost: data.shipping_cost || 0,
      paymentStages: data.payment_stages || [],
      paymentAccountId: data.payment_account_id || null,
      notes: data.notes || '', remark: data.remark || '',
      headerText: data.header_text || '', footerText: data.footer_text || '',
    });
    // Validate foreign keys
    if (data.template_id) {
      const tpl = await this.templateRepo.findOne({ where: { id: data.template_id } });
      if (!tpl) (quotation as any).templateId = null;
    }
    if (data.customer_id) {
      const cust = await this.dataSource.query('SELECT id FROM customers WHERE id = $1', [data.customer_id]);
      if (!cust.length) (quotation as any).customerId = null;
    }
    const saved = await this.quotationRepo.save(quotation);

    for (const item of items) {
      const subtotal = (item.quantity || 0) * (item.unit_price || 0);
      await this.itemRepo.save({
        quotationId: saved.id, partId: item.part_id,
        oeNumber: item.oe_number || '', partName: item.part_name || '',
        quantity: item.quantity, unitPrice: item.unit_price || 0, subtotal,
        brand: item.brand || '', packageName: item.package_name || '', unit: item.unit || 'pcs',
      });
    }
    return this.findOne(saved.id);
  }

  // ---- CRUD ----
  async findAll(page = 1, pageSize = 20, filters?: { status?: string; customer_id?: number; keyword?: string }) {
    const qb = this.quotationRepo.createQueryBuilder('q');
    if (filters?.status) qb.andWhere('q.status = :s', { s: filters.status });
    if (filters?.customer_id) qb.andWhere('q.customer_id = :c', { c: filters.customer_id });
    if (filters?.keyword) qb.andWhere('(q.quotation_number ILIKE :kw OR q.buyer_company ILIKE :kw)', { kw: '%' + filters.keyword + '%' });
    qb.orderBy('q.created_at', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [items, total] = await qb.getManyAndCount();
    const custIds = [...new Set(items.map((q: any) => q.customerId).filter(Boolean))];
    const custMap = new Map();
    if (custIds.length) {
      const customers = await this.customerRepo.find({ where: { id: In(custIds) } });
      customers.forEach(c => custMap.set(c.id, c.companyName));
    }
    const enriched = items.map((q: any) => ({ ...q, customerName: custMap.get(q.customerId) || '' }));
    return new PaginatedResponseDto(enriched, total, page, pageSize);
  }

  async findOne(id: number) {
    const q: any = await this.quotationRepo.findOne({ where: { id } });
    if (!q) throw new NotFoundException('报价单不存在');
    const items = await this.itemRepo.find({ where: { quotationId: id } });
    let customerName = '';
    if (q.customerId) {
      const cust = await this.customerRepo.findOne({ where: { id: q.customerId } });
      if (cust) customerName = cust.companyName;
    }
    let paymentAccount: PaymentAccount | null = null;
    if (q.paymentAccountId) {
      paymentAccount = await this.paymentAccountRepo.findOne({ where: { id: q.paymentAccountId } });
    }
    return { quotation: { ...q, customerName }, items, paymentAccount };
  }

  async updateQuotation(id: number, data: any) {
    const q: any = await this.quotationRepo.findOne({ where: { id } });
    if (!q) throw new NotFoundException('报价单不存在');
    const map: any = {
      seller_company: 'sellerCompany', seller_contact: 'sellerContact',
      seller_phone: 'sellerPhone', seller_email: 'sellerEmail', seller_address: 'sellerAddress',
      buyer_company: 'buyerCompany', buyer_contact: 'buyerContact',
      buyer_phone: 'buyerPhone', buyer_email: 'buyerEmail', buyer_address: 'buyerAddress',
      header_text: 'headerText', footer_text: 'footerText', logo_url: 'logoUrl',
      trade_terms: 'tradeTerms', port_loading: 'portLoading', port_dest: 'portDest',
      delivery_time: 'deliveryTime', valid_until: 'validUntil',
      discount_pct: 'discountPct', shipping_cost: 'shippingCost',
      payment_stages: 'paymentStages', payment_account_id: 'paymentAccountId',
    };
    for (const [k, v] of Object.entries(data)) {
      const key = map[k] || k;
      if (v !== undefined) (q as any)[key] = v;
    }

    // Update items if provided
    if (data.items) {
      // Delete existing items
      await this.itemRepo.delete({ quotationId: id } as any);
      // Create new items
      for (const item of data.items) {
        const subtotal = (item.quantity || 0) * (item.unit_price || 0);
        await this.itemRepo.save({
          quotationId: id, partId: item.part_id,
          oeNumber: item.oe_number || '', partName: item.part_name || '',
          quantity: item.quantity, unitPrice: item.unit_price || 0, subtotal,
          brand: item.brand || '', packageName: item.package_name || '', unit: item.unit || 'pcs',
        });
      }
    }

    // Recalculate totalAmount
    let subtotal = 0;
    if (data.items) {
      for (const item of data.items) {
        subtotal += (item.quantity || 0) * (item.unit_price || 0);
      }
    } else {
      const existingItems = await this.itemRepo.find({ where: { quotationId: id } });
      for (const item of existingItems) {
        subtotal += Number(item.subtotal) || 0;
      }
    }
    q.totalAmount = subtotal + (Number(q.shippingCost) || 0);

    return this.quotationRepo.save(q);
  }

  async deleteQuotation(id: number) {
    await this.itemRepo.delete({ quotationId: id } as any);
    await this.quotationRepo.delete(id);
    return { deleted: true };
  }

  async updateStatus(id: number, status: string) {
    const q: any = await this.quotationRepo.findOne({ where: { id } });
    if (!q) throw new NotFoundException('报价单不存在');
    q.status = status;
    return this.quotationRepo.save(q);
  }

  async convertToOrder(quotationId: number, userId?: number) {
    const quotation: any = await this.quotationRepo.findOne({ where: { id: quotationId } });
    if (!quotation) throw new NotFoundException('报价单不存在');
    const items = await this.itemRepo.find({ where: { quotationId } });
    if (!items.length) throw new BadRequestException('报价单没有商品');
    
    // Auto-create customer if buyer_company exists but customer_id is null
    let customerId = quotation.customerId;
    if (!customerId && quotation.buyerCompany) {
      const existing = await this.dataSource.query('SELECT id FROM customers WHERE company_name = $1 LIMIT 1', [quotation.buyerCompany]);
      if (existing.length) {
        customerId = existing[0].id;
      } else {
        const newCust = await this.dataSource.query(
          'INSERT INTO customers (company_name, contact_person, phone, email, address, customer_type, is_active) VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id',
          [quotation.buyerCompany, quotation.buyerContact || '', quotation.buyerPhone || '', quotation.buyerEmail || '', quotation.buyerAddress || '', 'wholesale']
        );
        customerId = newCust[0].id;
      }
      // Update quotation with customer_id
      await this.quotationRepo.createQueryBuilder().update().set({ customerId }).where('id = :id', { id: quotationId }).execute();
    }
    
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.dataSource.query('SELECT count(*) as c FROM orders');
    const orderNumber = 'ORD' + today + String((count[0]?.c || 0) + 1).padStart(4, '0');

    const shippingCost = Number(quotation.shippingCost) || 0;
    // totalAmount already includes shipping, don't add again
    const result = await this.dataSource.query(
      'INSERT INTO orders (order_number, quotation_number, customer_id, currency, status, total_amount, shipping_cost, shipping_address, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [orderNumber, quotation.quotationNumber, customerId || null, quotation.currency || 'USD', 'pending', quotation.totalAmount, shippingCost, quotation.buyerAddress || '', '从报价单 ' + quotation.quotationNumber + ' 转换', userId || null]
    );
    const order = result[0];
    for (const item of items) {
      await this.dataSource.query(
        'INSERT INTO order_items (order_id, part_id, quantity, unit_price, discount_pct, subtotal, package_name) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [order.id, item.partId, item.quantity, item.unitPrice, 0, item.subtotal, item.packageName || null]
      );
    }
    // Update quotation status
    await this.quotationRepo.createQueryBuilder().update().set({ status: 'converted' }).where('id = :id', { id: quotationId }).execute();
    return { order, message: '报价单已转为订单 ' + orderNumber };
  }

  // ---- Batch Operations ----
  async batchDelete(ids: number[]) {
    if (!ids.length) return { deleted: 0 };
    await this.dataSource.query('DELETE FROM quotation_items WHERE quotation_id = ANY($1)', [ids]);
    await this.dataSource.query('DELETE FROM quotations WHERE id = ANY($1)', [ids]);
    return { deleted: ids.length };
  }

  async batchStatus(ids: number[], status: string) {
    for (const id of ids) {
      const q: any = await this.quotationRepo.findOne({ where: { id } });
      if (q) { q.status = status; await this.quotationRepo.save(q); }
    }
    return { updated: ids.length };
  }

  // ---- Payment Accounts ----
  async getPaymentAccounts() {
    const rows = await this.dataSource.query('SELECT * FROM payment_accounts ORDER BY is_default DESC, created_at DESC');
    return rows.map((r: any) => ({
      id: r.id,
      accountName: r.account_name,
      beneficiaryName: r.beneficiary_name,
      bankName: r.bank_name,
      bankAddress: r.bank_address,
      swiftCode: r.swift_code,
      accountNumber: r.account_number,
      accountType: r.account_type,
      bankCode: r.bank_code,
      branchCode: r.branch_code,
      currency: r.currency,
      remark: r.remark,
      isDefault: r.is_default,
      createdAt: r.created_at,
    }));
  }
  async getPaymentAccount(id: number) {
    const rows = await this.dataSource.query('SELECT * FROM payment_accounts WHERE id = $1', [id]);
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: r.id,
      accountName: r.account_name,
      beneficiaryName: r.beneficiary_name,
      bankName: r.bank_name,
      bankAddress: r.bank_address,
      swiftCode: r.swift_code,
      accountNumber: r.account_number,
      accountType: r.account_type,
      bankCode: r.bank_code,
      branchCode: r.branch_code,
      currency: r.currency,
      remark: r.remark,
      isDefault: r.is_default,
      createdAt: r.created_at,
    };
  }
  async createPaymentAccount(data: any) {
    const result = await this.dataSource.query(
      'INSERT INTO payment_accounts (account_name, beneficiary_name, bank_name, bank_address, swift_code, account_number, account_type, bank_code, branch_code, currency, remark, is_default) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
      [data.account_name || '', data.beneficiary_name || '', data.bank_name || '', data.bank_address || '', data.swift_code || '', data.account_number || '', data.account_type || '', data.bank_code || '', data.branch_code || '', data.currency || 'USD', data.remark || '', data.is_default || false]
    );
    if (data.is_default) await this.dataSource.query('UPDATE payment_accounts SET is_default = false WHERE id != $1', [result[0]?.id]);
    const r = result[0];
    return {
      id: r.id, accountName: r.account_name, beneficiaryName: r.beneficiary_name,
      bankName: r.bank_name, bankAddress: r.bank_address, swiftCode: r.swift_code,
      accountNumber: r.account_number, accountType: r.account_type, bankCode: r.bank_code,
      branchCode: r.branch_code, currency: r.currency, remark: r.remark,
      isDefault: r.is_default, createdAt: r.created_at,
    };
  }
  async updatePaymentAccount(id: number, data: any) {
    const fields = ['account_name', 'beneficiary_name', 'bank_name', 'bank_address', 'swift_code', 'account_number', 'account_type', 'bank_code', 'branch_code', 'currency', 'remark', 'is_default'];
    const updates: string[] = []; const values: any[] = []; let idx = 1;
    for (const f of fields) {
      if (data[f] !== undefined) { updates.push(f + ' = $' + idx); values.push(data[f]); idx++; }
    }
    if (updates.length) { values.push(id); await this.dataSource.query('UPDATE payment_accounts SET ' + updates.join(', ') + ' WHERE id = $' + idx, values); }
    if (data.is_default) await this.dataSource.query('UPDATE payment_accounts SET is_default = false WHERE id != $1', [id]);
    return this.getPaymentAccount(id);
  }
  async deletePaymentAccount(id: number) {
    // Clear references in quotations first
    await this.dataSource.query('UPDATE quotations SET payment_account_id = NULL WHERE payment_account_id = $1', [id]);
    await this.dataSource.query('DELETE FROM payment_accounts WHERE id = $1', [id]);
    return { deleted: true };
  }
}
