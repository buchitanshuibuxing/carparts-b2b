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
exports.Price = void 0;
const typeorm_1 = require("typeorm");
let Price = class Price {
    id;
    partId;
    priceType;
    currency;
    unitPrice;
    minQuantity;
    maxQuantity;
    effectiveDate;
    expiryDate;
    notes;
    createdAt;
};
exports.Price = Price;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Price.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'part_id' }),
    __metadata("design:type", Number)
], Price.prototype, "partId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'price_type', default: '批发价' }),
    __metadata("design:type", String)
], Price.prototype, "priceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'USD' }),
    __metadata("design:type", String)
], Price.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], Price.prototype, "unitPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'min_quantity', default: 1 }),
    __metadata("design:type", Number)
], Price.prototype, "minQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_quantity', default: 99999 }),
    __metadata("design:type", Number)
], Price.prototype, "maxQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'effective_date', default: '' }),
    __metadata("design:type", String)
], Price.prototype, "effectiveDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expiry_date', default: '' }),
    __metadata("design:type", String)
], Price.prototype, "expiryDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Price.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Price.prototype, "createdAt", void 0);
exports.Price = Price = __decorate([
    (0, typeorm_1.Entity)('prices')
], Price);
//# sourceMappingURL=price.entity.js.map