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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Quotation = void 0;
const typeorm_1 = require("typeorm");
let Quotation = class Quotation {
    id;
    quotationNumber;
    templateId;
    customerId;
    totalAmount;
    currency;
    status;
    remark;
    pdfPath;
    sellerCompany;
    sellerContact;
    sellerPhone;
    sellerEmail;
    sellerAddress;
    logoUrl;
    buyerCompany;
    buyerContact;
    buyerPhone;
    buyerEmail;
    buyerAddress;
    tradeTerms;
    portLoading;
    portDest;
    deliveryTime;
    validUntil;
    discountPct;
    shippingCost;
    paymentStages;
    paymentAccountId;
    notes;
    createdAt;
    updatedAt;
};
exports.Quotation = Quotation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Quotation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quotation_number', unique: true }),
    __metadata("design:type", String)
], Quotation.prototype, "quotationNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'template_id', nullable: true }),
    __metadata("design:type", Number)
], Quotation.prototype, "templateId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_id', nullable: true }),
    __metadata("design:type", Number)
], Quotation.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Quotation.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'USD' }),
    __metadata("design:type", String)
], Quotation.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'draft' }),
    __metadata("design:type", String)
], Quotation.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Quotation.prototype, "remark", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pdf_path', default: '' }),
    __metadata("design:type", String)
], Quotation.prototype, "pdfPath", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seller_company', default: '' }),
    __metadata("design:type", String)
], Quotation.prototype, "sellerCompany", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seller_contact', default: '' }),
    __metadata("design:type", String)
], Quotation.prototype, "sellerContact", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seller_phone', default: '' }),
    __metadata("design:type", String)
], Quotation.prototype, "sellerPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seller_email', default: '' }),
    __metadata("design:type", String)
], Quotation.prototype, "sellerEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seller_address', default: '' }),
    __metadata("design:type", String)
], Quotation.prototype, "sellerAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'logo_url', default: '' }),
    __metadata("design:type", String)
], Quotation.prototype, "logoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buyer_company', default: '' }),
    __metadata("design:type", String)
], Quotation.prototype, "buyerCompany", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buyer_contact', default: '' }),
    __metadata("design:type", String)
], Quotation.prototype, "buyerContact", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buyer_phone', default: '' }),
    __metadata("design:type", String)
], Quotation.prototype, "buyerPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buyer_email', default: '' }),
    __metadata("design:type", String)
], Quotation.prototype, "buyerEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buyer_address', default: '' }),
    __metadata("design:type", String)
], Quotation.prototype, "buyerAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'trade_terms', default: '' }),
    __metadata("design:type", String)
], Quotation.prototype, "tradeTerms", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'port_loading', default: '' }),
    __metadata("design:type", String)
], Quotation.prototype, "portLoading", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'port_dest', default: '' }),
    __metadata("design:type", String)
], Quotation.prototype, "portDest", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'delivery_time', default: '' }),
    __metadata("design:type", String)
], Quotation.prototype, "deliveryTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'valid_until', type: 'date', nullable: true }),
    __metadata("design:type", String)
], Quotation.prototype, "validUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'discount_pct', type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Quotation.prototype, "discountPct", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shipping_cost', type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Quotation.prototype, "shippingCost", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_stages', type: 'jsonb', default: () => "'[]'" }),
    __metadata("design:type", Array)
], Quotation.prototype, "paymentStages", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_account_id', nullable: true }),
    __metadata("design:type", Number)
], Quotation.prototype, "paymentAccountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'notes', default: '' }),
    __metadata("design:type", String)
], Quotation.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Quotation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Quotation.prototype, "updatedAt", void 0);
exports.Quotation = Quotation = __decorate([
    (0, typeorm_1.Entity)('quotations')
], Quotation);
//# sourceMappingURL=quotation.entity.js.map