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
exports.QuotationTemplate = void 0;
const typeorm_1 = require("typeorm");
let QuotationTemplate = class QuotationTemplate {
    id;
    templateName;
    headerText;
    footerText;
    termsText;
    currency;
    includeImage;
    isDefault;
    createdAt;
};
exports.QuotationTemplate = QuotationTemplate;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], QuotationTemplate.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'template_name' }),
    __metadata("design:type", String)
], QuotationTemplate.prototype, "templateName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'header_text', default: '' }),
    __metadata("design:type", String)
], QuotationTemplate.prototype, "headerText", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'footer_text', default: '' }),
    __metadata("design:type", String)
], QuotationTemplate.prototype, "footerText", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'terms_text', default: '' }),
    __metadata("design:type", String)
], QuotationTemplate.prototype, "termsText", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'USD' }),
    __metadata("design:type", String)
], QuotationTemplate.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'include_image', default: true }),
    __metadata("design:type", Boolean)
], QuotationTemplate.prototype, "includeImage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_default', default: false }),
    __metadata("design:type", Boolean)
], QuotationTemplate.prototype, "isDefault", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], QuotationTemplate.prototype, "createdAt", void 0);
exports.QuotationTemplate = QuotationTemplate = __decorate([
    (0, typeorm_1.Entity)('quotation_templates')
], QuotationTemplate);
//# sourceMappingURL=quotation-template.entity.js.map