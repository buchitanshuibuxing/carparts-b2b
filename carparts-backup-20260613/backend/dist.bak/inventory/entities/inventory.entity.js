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
exports.Inventory = void 0;
const typeorm_1 = require("typeorm");
let Inventory = class Inventory {
    id;
    partId;
    quantity;
    reservedQuantity;
    warehouseLocation;
    warehouseZone;
    minStock;
    maxStock;
    lastStockCheck;
    lastRestockDate;
    notes;
    createdAt;
    updatedAt;
};
exports.Inventory = Inventory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Inventory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'part_id', unique: true }),
    __metadata("design:type", Number)
], Inventory.prototype, "partId", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Inventory.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reserved_quantity', default: 0 }),
    __metadata("design:type", Number)
], Inventory.prototype, "reservedQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'warehouse_location', default: '' }),
    __metadata("design:type", String)
], Inventory.prototype, "warehouseLocation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'warehouse_zone', default: '默认' }),
    __metadata("design:type", String)
], Inventory.prototype, "warehouseZone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'min_stock', default: 0 }),
    __metadata("design:type", Number)
], Inventory.prototype, "minStock", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_stock', default: 99999 }),
    __metadata("design:type", Number)
], Inventory.prototype, "maxStock", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_stock_check', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], Inventory.prototype, "lastStockCheck", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_restock_date', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], Inventory.prototype, "lastRestockDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Inventory.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Inventory.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Inventory.prototype, "updatedAt", void 0);
exports.Inventory = Inventory = __decorate([
    (0, typeorm_1.Entity)('inventory')
], Inventory);
//# sourceMappingURL=inventory.entity.js.map