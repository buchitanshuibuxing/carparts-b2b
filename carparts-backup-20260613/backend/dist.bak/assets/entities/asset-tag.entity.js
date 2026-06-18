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
exports.AssetTag = void 0;
const typeorm_1 = require("typeorm");
let AssetTag = class AssetTag {
    id;
    name;
    color;
    usageCount;
    createdAt;
};
exports.AssetTag = AssetTag;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], AssetTag.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, unique: true }),
    __metadata("design:type", String)
], AssetTag.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 7, default: '#6B7280' }),
    __metadata("design:type", String)
], AssetTag.prototype, "color", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'usage_count', default: 0 }),
    __metadata("design:type", Number)
], AssetTag.prototype, "usageCount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], AssetTag.prototype, "createdAt", void 0);
exports.AssetTag = AssetTag = __decorate([
    (0, typeorm_1.Entity)('asset_tags')
], AssetTag);
//# sourceMappingURL=asset-tag.entity.js.map