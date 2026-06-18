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
exports.CustomersController = void 0;
const common_1 = require("@nestjs/common");
const customers_service_1 = require("./customers.service");
const settings_service_1 = require("../settings/settings.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const DEFAULT_CUSTOMER_TYPES = ['经销商', '修理厂', '终端客户', '贸易商', '电商平台'];
const DEFAULT_CUSTOMER_LEVELS = ['普通', 'VIP', '重点', '潜在'];
let CustomersController = class CustomersController {
    svc;
    settingsSvc;
    constructor(svc, settingsSvc) {
        this.svc = svc;
        this.settingsSvc = settingsSvc;
    }
    findAll(p = 1, ps = 20, kw, a, ct) {
        return this.svc.findAll(p, ps, { keyword: kw, is_active: a !== undefined ? a === 'true' : undefined, customer_type: ct });
    }
    findOne(id) { return this.svc.findOne(id); }
    create(body) { return this.svc.create(body); }
    update(id, body) { return this.svc.update(id, body); }
    toggle(id, body) { return this.svc.toggleActive(id, body.is_active); }
    remove(id) { return this.svc.remove(id); }
    async getCustomerTypes() {
        const settings = await this.settingsSvc.getAll();
        return {
            types: settings.customer_types ? JSON.parse(settings.customer_types) : DEFAULT_CUSTOMER_TYPES,
            levels: settings.customer_levels ? JSON.parse(settings.customer_levels) : DEFAULT_CUSTOMER_LEVELS,
        };
    }
    async updateCustomerTypes(body) {
        if (body.types)
            await this.settingsSvc.update('customer_types', JSON.stringify(body.types));
        if (body.levels)
            await this.settingsSvc.update('customer_levels', JSON.stringify(body.levels));
        return { success: true };
    }
    batchUpdate(body) {
        return this.svc.batchUpdate(body.ids, body);
    }
    batchDelete(body) {
        return this.svc.batchDelete(body.ids);
    }
};
exports.CustomersController = CustomersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('page_size')),
    __param(2, (0, common_1.Query)('keyword')),
    __param(3, (0, common_1.Query)('is_active')),
    __param(4, (0, common_1.Query)('customer_type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "update", null);
__decorate([
    (0, common_1.Put)(':id/toggle'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "toggle", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('config/types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "getCustomerTypes", null);
__decorate([
    (0, common_1.Put)('config/types'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "updateCustomerTypes", null);
__decorate([
    (0, common_1.Post)('batch-update'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "batchUpdate", null);
__decorate([
    (0, common_1.Post)('batch-delete'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CustomersController.prototype, "batchDelete", null);
exports.CustomersController = CustomersController = __decorate([
    (0, common_1.Controller)('customers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [customers_service_1.CustomersService, settings_service_1.SettingsService])
], CustomersController);
//# sourceMappingURL=customers.controller.js.map