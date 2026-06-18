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
exports.Part = void 0;
const typeorm_1 = require("typeorm");
const part_classification_entity_1 = require("./part-classification.entity");
let Part = class Part {
    id;
    oeNumber;
    partNameCn;
    partNameEn;
    partNameKo;
    classificationId;
    classification;
    category;
    subCategory;
    brand;
    carModel;
    engineType;
    modelYearFrom;
    modelYearTo;
    partType;
    specifications;
    unit;
    weightKg;
    dimensionsCm;
    hsCode;
    notes;
    isActive;
    createdBy;
    updatedBy;
    createdAt;
    updatedAt;
};
exports.Part = Part;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Part.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'oe_number', unique: true }),
    __metadata("design:type", String)
], Part.prototype, "oeNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'part_name_cn' }),
    __metadata("design:type", String)
], Part.prototype, "partNameCn", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'part_name_en', default: '' }),
    __metadata("design:type", String)
], Part.prototype, "partNameEn", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'part_name_ko', default: '' }),
    __metadata("design:type", String)
], Part.prototype, "partNameKo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'classification_id', nullable: true }),
    __metadata("design:type", Number)
], Part.prototype, "classificationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => part_classification_entity_1.PartClassification, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'classification_id' }),
    __metadata("design:type", part_classification_entity_1.PartClassification)
], Part.prototype, "classification", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '其他' }),
    __metadata("design:type", String)
], Part.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sub_category', default: '' }),
    __metadata("design:type", String)
], Part.prototype, "subCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Part.prototype, "brand", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'car_model', default: '' }),
    __metadata("design:type", String)
], Part.prototype, "carModel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'engine_type', default: '' }),
    __metadata("design:type", String)
], Part.prototype, "engineType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'model_year_from', nullable: true }),
    __metadata("design:type", Number)
], Part.prototype, "modelYearFrom", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'model_year_to', nullable: true }),
    __metadata("design:type", Number)
], Part.prototype, "modelYearTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'part_type', default: 'OEM' }),
    __metadata("design:type", String)
], Part.prototype, "partType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], Part.prototype, "specifications", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '个' }),
    __metadata("design:type", String)
], Part.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'weight_kg', type: 'decimal', precision: 10, scale: 3, default: 0 }),
    __metadata("design:type", Number)
], Part.prototype, "weightKg", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'dimensions_cm', default: '' }),
    __metadata("design:type", String)
], Part.prototype, "dimensionsCm", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hs_code', default: '' }),
    __metadata("design:type", String)
], Part.prototype, "hsCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Part.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], Part.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', nullable: true }),
    __metadata("design:type", Number)
], Part.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by', nullable: true }),
    __metadata("design:type", Number)
], Part.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Part.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Part.prototype, "updatedAt", void 0);
exports.Part = Part = __decorate([
    (0, typeorm_1.Entity)('parts')
], Part);
//# sourceMappingURL=part.entity.js.map