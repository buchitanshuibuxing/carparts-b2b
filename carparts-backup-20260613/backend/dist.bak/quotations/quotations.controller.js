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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotationsController = void 0;
const common_1 = require("@nestjs/common");
const quotations_service_1 = require("./quotations.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let QuotationsController = class QuotationsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    getTemplates() { return this.svc.getTemplates(); }
    getTemplate(id) { return this.svc.getTemplate(id); }
    saveTemplate(body) { return this.svc.saveTemplate(body); }
    updateTemplate(id, body) { return this.svc.updateTemplate(id, body); }
    deleteTemplate(id) { return this.svc.deleteTemplate(id); }
    getPaymentAccounts() { return this.svc.getPaymentAccounts(); }
    getPaymentAccount(id) { return this.svc.getPaymentAccount(id); }
    createPaymentAccount(body) { return this.svc.createPaymentAccount(body); }
    updatePaymentAccount(id, body) { return this.svc.updatePaymentAccount(id, body); }
    deletePaymentAccount(id) { return this.svc.deletePaymentAccount(id); }
    findAll(page, limit, status, customerId, keyword) {
        return this.svc.findAll(Number(page) || 1, Number(limit) || 20, {
            status, customer_id: customerId ? Number(customerId) : undefined, keyword,
        });
    }
    findOne(id) { return this.svc.findOne(id); }
    generate(body) { return this.svc.generate(body); }
    update(id, body) { return this.svc.update(id, body); }
    delete(id) { return this.svc.delete(id); }
    updateStatus(id, body) {
        return this.svc.updateStatus(id, body.status);
    }
    convertToOrder(id, uid) {
        return this.svc.convertToOrder(id, uid);
    }
};
exports.QuotationsController = QuotationsController;
__decorate([
    (0, common_1.Get)('templates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "getTemplates", null);
__decorate([
    (0, common_1.Get)('templates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "getTemplate", null);
__decorate([
    (0, common_1.Post)('templates'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "saveTemplate", null);
__decorate([
    (0, common_1.Put)('templates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "updateTemplate", null);
__decorate([
    (0, common_1.Delete)('templates/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "deleteTemplate", null);
__decorate([
    (0, common_1.Get)('payment-accounts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "getPaymentAccounts", null);
__decorate([
    (0, common_1.Get)('payment-accounts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "getPaymentAccount", null);
__decorate([
    (0, common_1.Post)('payment-accounts'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "createPaymentAccount", null);
__decorate([
    (0, common_1.Put)('payment-accounts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "updatePaymentAccount", null);
__decorate([
    (0, common_1.Delete)('payment-accounts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "deletePaymentAccount", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('customer_id')),
    __param(4, (0, common_1.Query)('keyword')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "generate", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "delete", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/convert-to-order'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], QuotationsController.prototype, "convertToOrder", null);
exports.QuotationsController = QuotationsController = __decorate([
    (0, common_1.Controller)('quotations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [quotations_service_1.QuotationsService])
], QuotationsController);
//# sourceMappingURL=quotations.controller.js.map