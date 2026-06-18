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
exports.InventoryLog = void 0;
const typeorm_1 = require("typeorm");
let InventoryLog = class InventoryLog {
    id;
    partId;
    changeType;
    quantityChange;
    quantityBefore;
    quantityAfter;
    reason;
    referenceType;
    referenceId;
    operatorId;
    createdAt;
};
exports.InventoryLog = InventoryLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], InventoryLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'part_id' }),
    __metadata("design:type", Number)
], InventoryLog.prototype, "partId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'change_type', length: 10 }),
    __metadata("design:type", String)
], InventoryLog.prototype, "changeType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quantity_change' }),
    __metadata("design:type", Number)
], InventoryLog.prototype, "quantityChange", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quantity_before' }),
    __metadata("design:type", Number)
], InventoryLog.prototype, "quantityBefore", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quantity_after' }),
    __metadata("design:type", Number)
], InventoryLog.prototype, "quantityAfter", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], InventoryLog.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reference_type', length: 20, default: '' }),
    __metadata("design:type", String)
], InventoryLog.prototype, "referenceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reference_id', nullable: true }),
    __metadata("design:type", Number)
], InventoryLog.prototype, "referenceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'operator_id', nullable: true }),
    __metadata("design:type", Number)
], InventoryLog.prototype, "operatorId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], InventoryLog.prototype, "createdAt", void 0);
exports.InventoryLog = InventoryLog = __decorate([
    (0, typeorm_1.Entity)('inventory_log')
], InventoryLog);
//# sourceMappingURL=inventory-log.entity.js.map