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
exports.QuotationItem = void 0;
const typeorm_1 = require("typeorm");
let QuotationItem = class QuotationItem {
    id;
    quotationId;
    partId;
    oeNumber;
    partName;
    brand;
    packageName;
    unit;
    quantity;
    unitPrice;
    subtotal;
};
exports.QuotationItem = QuotationItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], QuotationItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quotation_id' }),
    __metadata("design:type", Number)
], QuotationItem.prototype, "quotationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'part_id' }),
    __metadata("design:type", Number)
], QuotationItem.prototype, "partId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'oe_number' }),
    __metadata("design:type", String)
], QuotationItem.prototype, "oeNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'part_name' }),
    __metadata("design:type", String)
], QuotationItem.prototype, "partName", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], QuotationItem.prototype, "brand", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'package_name', default: '' }),
    __metadata("design:type", String)
], QuotationItem.prototype, "packageName", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'pcs' }),
    __metadata("design:type", String)
], QuotationItem.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], QuotationItem.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], QuotationItem.prototype, "unitPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], QuotationItem.prototype, "subtotal", void 0);
exports.QuotationItem = QuotationItem = __decorate([
    (0, typeorm_1.Entity)('quotation_items')
], QuotationItem);
//# sourceMappingURL=quotation-item.entity.js.map