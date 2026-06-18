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
exports.PriceLog = void 0;
const typeorm_1 = require("typeorm");
let PriceLog = class PriceLog {
    id;
    priceId;
    oldPrice;
    newPrice;
    changeReason;
    operator;
    createdAt;
};
exports.PriceLog = PriceLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PriceLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'price_id' }),
    __metadata("design:type", Number)
], PriceLog.prototype, "priceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'old_price', type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], PriceLog.prototype, "oldPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'new_price', type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], PriceLog.prototype, "newPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'change_reason', default: '' }),
    __metadata("design:type", String)
], PriceLog.prototype, "changeReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'system' }),
    __metadata("design:type", String)
], PriceLog.prototype, "operator", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], PriceLog.prototype, "createdAt", void 0);
exports.PriceLog = PriceLog = __decorate([
    (0, typeorm_1.Entity)('price_log')
], PriceLog);
//# sourceMappingURL=price-log.entity.js.map