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
exports.QuotationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const quotation_entity_1 = require("./entities/quotation.entity");
const quotation_item_entity_1 = require("./entities/quotation-item.entity");
const quotation_template_entity_1 = require("./entities/quotation-template.entity");
const payment_account_entity_1 = require("./entities/payment-account.entity");
const part_entity_1 = require("../parts/entities/part.entity");
const customer_entity_1 = require("../customers/entities/customer.entity");
const order_entity_1 = require("../orders/entities/order.entity");
const order_item_entity_1 = require("../orders/entities/order-item.entity");
const inventory_entity_1 = require("../inventory/entities/inventory.entity");
const inventory_log_entity_1 = require("../inventory/entities/inventory-log.entity");
const paginated_response_dto_1 = require("../common/dto/paginated-response.dto");
let QuotationsService = class QuotationsService {
    quotationRepo;
    itemRepo;
    templateRepo;
    paymentAccountRepo;
    partRepo;
    customerRepo;
    orderRepo;
    orderItemRepo;
    invRepo;
    logRepo;
    dataSource;
    constructor(quotationRepo, itemRepo, templateRepo, paymentAccountRepo, partRepo, customerRepo, orderRepo, orderItemRepo, invRepo, logRepo, dataSource) {
        this.quotationRepo = quotationRepo;
        this.itemRepo = itemRepo;
        this.templateRepo = templateRepo;
        this.paymentAccountRepo = paymentAccountRepo;
        this.partRepo = partRepo;
        this.customerRepo = customerRepo;
        this.orderRepo = orderRepo;
        this.orderItemRepo = orderItemRepo;
        this.invRepo = invRepo;
        this.logRepo = logRepo;
        this.dataSource = dataSource;
    }
    async getTemplates() { return this.templateRepo.find({ order: { createdAt: 'DESC' } }); }
    async getTemplate(id) { return this.templateRepo.findOne({ where: { id } }); }
    async saveTemplate(data) {
        const t = this.templateRepo.create({
            templateName: data.template_name, headerText: data.header_text || '',
            footerText: data.footer_text || '', termsText: data.terms_text || '',
            currency: data.currency || 'USD', includeImage: data.include_image ?? true,
        });
        return this.templateRepo.save(t);
    }
    async updateTemplate(id, data) {
        const t = await this.templateRepo.findOne({ where: { id } });
        if (!t)
            throw new common_1.NotFoundException('模板不存在');
        if (data.template_name)
            t.templateName = data.template_name;
        if (data.header_text !== undefined)
            t.headerText = data.header_text;
        if (data.footer_text !== undefined)
            t.footerText = data.footer_text;
        if (data.terms_text !== undefined)
            t.termsText = data.terms_text;
        return this.templateRepo.save(t);
    }
    async deleteTemplate(id) { await this.templateRepo.delete(id); }
    async generate(data) {
        if (!data.items?.length)
            throw new common_1.BadRequestException('报价项不能为空');
        if (!data.customer_id && data.buyer_company) {
            data.customer_id = await this.findOrCreateCustomer(data);
        }
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 16).replace(/[-:T]/g, '').slice(0, 12);
        const count = await this.quotationRepo.count();
        const quotationNumber = `QT-${dateStr}-${String(count + 1).padStart(3, '0')}`;
        let totalAmount = 0;
        const items = [];
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
    async findAll(page = 1, pageSize = 20, filters) {
        const qb = this.quotationRepo.createQueryBuilder('q');
        if (filters?.status)
            qb.andWhere('q.status = :s', { s: filters.status });
        if (filters?.customer_id)
            qb.andWhere('q.customer_id = :c', { c: filters.customer_id });
        if (filters?.date_from)
            qb.andWhere('q.created_at >= :df', { df: filters.date_from });
        if (filters?.date_to)
            qb.andWhere('q.created_at <= :dt', { dt: filters.date_to });
        if (filters?.keyword) {
            qb.andWhere('(q.quotation_number ILIKE :kw OR q.buyer_company ILIKE :kw OR q.notes ILIKE :kw OR q.remark ILIKE :kw)', { kw: `%${filters.keyword}%` });
        }
        qb.orderBy('q.created_at', 'DESC').skip((page - 1) * pageSize).take(pageSize);
        const [items, total] = await qb.getManyAndCount();
        return new paginated_response_dto_1.PaginatedResponseDto(items, total, page, pageSize);
    }
    async findOne(id) {
        const q = await this.quotationRepo.findOne({ where: { id } });
        if (!q)
            throw new common_1.NotFoundException('报价单不存在');
        const items = await this.itemRepo.find({ where: { quotationId: id } });
        const partIds = [...new Set(items.map(i => i.partId).filter(Boolean))];
        const parts = partIds.length ? await this.partRepo.find({ where: { id: (0, typeorm_2.In)(partIds) } }) : [];
        const partMap = new Map(parts.map(p => [p.id, p]));
        const itemsWithParts = items.map(item => ({
            ...item,
            part: partMap.get(item.partId) || null,
        }));
        let paymentAccount = null;
        if (q.paymentAccountId) {
            paymentAccount = await this.paymentAccountRepo.findOne({ where: { id: q.paymentAccountId } });
        }
        return { quotation: q, items: itemsWithParts, paymentAccount };
    }
    async update(id, data) {
        const q = await this.quotationRepo.findOne({ where: { id } });
        if (!q)
            throw new common_1.NotFoundException('报价单不存在');
        const fieldMap = {
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
            if (k === 'items')
                continue;
            const key = fieldMap[k] || k;
            if (v !== undefined)
                q[key] = v;
        }
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
    async delete(id) {
        const q = await this.quotationRepo.findOne({ where: { id } });
        if (!q)
            throw new common_1.NotFoundException('报价单不存在');
        await this.itemRepo.delete({ quotationId: id });
        await this.quotationRepo.remove(q);
        return { deleted: true };
    }
    async updateStatus(id, status) {
        const q = await this.quotationRepo.findOne({ where: { id } });
        if (!q)
            throw new common_1.NotFoundException('报价单不存在');
        q.status = status;
        return this.quotationRepo.save(q);
    }
    async convertToOrder(quotationId, userId) {
        const { quotation, items } = await this.findOne(quotationId);
        if (!quotation)
            throw new common_1.NotFoundException('报价单不存在');
        if (quotation.status !== 'accepted')
            throw new common_1.BadRequestException('只能转换已接受的报价单');
        if (!items.length)
            throw new common_1.BadRequestException('报价单没有商品项');
        return this.dataSource.transaction(async (manager) => {
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const count = await manager.count(order_entity_1.Order);
            const orderNumber = `ORD${today}${String(count + 1).padStart(4, '0')}`;
            const order = manager.create(order_entity_1.Order, {
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
                await manager.save(order_item_entity_1.OrderItem, {
                    orderId: savedOrder.id, partId: item.partId,
                    quantity: item.quantity, unitPrice: item.unitPrice,
                    discountPct: 0, subtotal,
                });
                let inv = await manager.findOne(inventory_entity_1.Inventory, { where: { partId: item.partId }, lock: { mode: 'pessimistic_write' } });
                if (!inv) {
                    inv = manager.create(inventory_entity_1.Inventory, { partId: item.partId, quantity: 0, reservedQuantity: 0 });
                }
                const before = inv.quantity;
                inv.quantity -= Number(item.quantity);
                inv.reservedQuantity += Number(item.quantity);
                await manager.save(inv);
                await manager.save(inventory_log_entity_1.InventoryLog, {
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
    async getPaymentAccounts() {
        return this.paymentAccountRepo.find({ order: { isDefault: 'DESC', createdAt: 'DESC' } });
    }
    async getPaymentAccount(id) {
        return this.paymentAccountRepo.findOne({ where: { id } });
    }
    async createPaymentAccount(data) {
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
    async updatePaymentAccount(id, data) {
        const pa = await this.paymentAccountRepo.findOne({ where: { id } });
        if (!pa)
            throw new common_1.NotFoundException('付款账户不存在');
        if (data.account_name !== undefined)
            pa.accountName = data.account_name;
        if (data.beneficiary_name !== undefined)
            pa.beneficiaryName = data.beneficiary_name;
        if (data.bank_name !== undefined)
            pa.bankName = data.bank_name;
        if (data.bank_address !== undefined)
            pa.bankAddress = data.bank_address;
        if (data.swift_code !== undefined)
            pa.swiftCode = data.swift_code;
        if (data.account_number !== undefined)
            pa.accountNumber = data.account_number;
        if (data.currency !== undefined)
            pa.currency = data.currency;
        if (data.remark !== undefined)
            pa.remark = data.remark;
        if (data.is_default !== undefined)
            pa.isDefault = data.is_default;
        if (pa.isDefault) {
            await this.paymentAccountRepo.update({ id: (0, typeorm_2.In)([id]), isDefault: false }, { isDefault: false });
            await this.paymentAccountRepo.update({ isDefault: true }, { isDefault: false });
        }
        return this.paymentAccountRepo.save(pa);
    }
    async deletePaymentAccount(id) {
        await this.paymentAccountRepo.delete(id);
        return { deleted: true };
    }
    async findOrCreateCustomer(buyerData) {
        const companyName = buyerData.buyer_company;
        if (!companyName)
            throw new common_1.BadRequestException('买方公司名称不能为空');
        const existing = await this.customerRepo.findOne({ where: { companyName } });
        if (existing)
            return existing.id;
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
};
exports.QuotationsService = QuotationsService;
exports.QuotationsService = QuotationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(quotation_entity_1.Quotation)),
    __param(1, (0, typeorm_1.InjectRepository)(quotation_item_entity_1.QuotationItem)),
    __param(2, (0, typeorm_1.InjectRepository)(quotation_template_entity_1.QuotationTemplate)),
    __param(3, (0, typeorm_1.InjectRepository)(payment_account_entity_1.PaymentAccount)),
    __param(4, (0, typeorm_1.InjectRepository)(part_entity_1.Part)),
    __param(5, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __param(6, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(7, (0, typeorm_1.InjectRepository)(order_item_entity_1.OrderItem)),
    __param(8, (0, typeorm_1.InjectRepository)(inventory_entity_1.Inventory)),
    __param(9, (0, typeorm_1.InjectRepository)(inventory_log_entity_1.InventoryLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], QuotationsService);
//# sourceMappingURL=quotations.service.js.map