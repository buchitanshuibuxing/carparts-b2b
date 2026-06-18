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
exports.SupplierPart = void 0;
const typeorm_1 = require("typeorm");
let SupplierPart = class SupplierPart {
    id;
    supplierId;
    partId;
    supplierSku;
    moq;
    leadTimeDays;
    notes;
};
exports.SupplierPart = SupplierPart;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], SupplierPart.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'supplier_id' }),
    __metadata("design:type", Number)
], SupplierPart.prototype, "supplierId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'part_id' }),
    __metadata("design:type", Number)
], SupplierPart.prototype, "partId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'supplier_sku', default: '' }),
    __metadata("design:type", String)
], SupplierPart.prototype, "supplierSku", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 1 }),
    __metadata("design:type", Number)
], SupplierPart.prototype, "moq", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'lead_time_days', default: 0 }),
    __metadata("design:type", Number)
], SupplierPart.prototype, "leadTimeDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], SupplierPart.prototype, "notes", void 0);
exports.SupplierPart = SupplierPart = __decorate([
    (0, typeorm_1.Entity)('supplier_parts')
], SupplierPart);
//# sourceMappingURL=supplier-part.entity.js.map