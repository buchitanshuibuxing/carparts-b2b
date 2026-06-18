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
exports.PricesController = void 0;
const common_1 = require("@nestjs/common");
const prices_service_1 = require("./prices.service");
const settings_service_1 = require("../settings/settings.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const DEFAULT_PRICE_TYPES = ['批发价', '零售价', '促销价', '成本价', 'VIP价'];
const DEFAULT_CURRENCIES = ['USD', 'EUR', 'CNY', 'GBP', 'JPY', 'KRW'];
let PricesController = class PricesController {
    svc;
    settingsSvc;
    constructor(svc, settingsSvc) {
        this.svc = svc;
        this.settingsSvc = settingsSvc;
    }
    findAll(page = 1, limit = 20, kw, pt) {
        return this.svc.findAll(page, limit, { keyword: kw, price_type: pt });
    }
    findByPart(partId) { return this.svc.findByPart(partId); }
    getHistory(partId) { return this.svc.getHistory(partId); }
    setPrice(body) { return this.svc.setPrice(body); }
    updateOne(id, body) { return this.svc.updateOne(id, body); }
    deletePrice(id) { return this.svc.deletePrice(id); }
    batchUpdate(body) {
        return this.svc.batchUpdate(body.ids, body);
    }
    batchDelete(body) {
        return this.svc.batchDelete(body.ids);
    }
    syncFromParts() {
        return this.svc.syncFromParts();
    }
    async getTypes() {
        const settings = await this.settingsSvc.getAll();
        return {
            types: settings.price_types ? JSON.parse(settings.price_types) : DEFAULT_PRICE_TYPES,
            currencies: settings.currencies ? JSON.parse(settings.currencies) : DEFAULT_CURRENCIES,
        };
    }
    async updateTypes(body) {
        if (body.types)
            await this.settingsSvc.update('price_types', JSON.stringify(body.types));
        if (body.currencies)
            await this.settingsSvc.update('currencies', JSON.stringify(body.currencies));
        return { success: true };
    }
};
exports.PricesController = PricesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('keyword')),
    __param(3, (0, common_1.Query)('price_type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", void 0)
], PricesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('part/:partId'),
    __param(0, (0, common_1.Param)('partId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], PricesController.prototype, "findByPart", null);
__decorate([
    (0, common_1.Get)('history/:partId'),
    __param(0, (0, common_1.Param)('partId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], PricesController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)('set'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PricesController.prototype, "setPrice", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PricesController.prototype, "updateOne", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], PricesController.prototype, "deletePrice", null);
__decorate([
    (0, common_1.Post)('batch-update'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PricesController.prototype, "batchUpdate", null);
__decorate([
    (0, common_1.Post)('batch-delete'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PricesController.prototype, "batchDelete", null);
__decorate([
    (0, common_1.Post)('sync'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PricesController.prototype, "syncFromParts", null);
__decorate([
    (0, common_1.Get)('config/types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PricesController.prototype, "getTypes", null);
__decorate([
    (0, common_1.Put)('config/types'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PricesController.prototype, "updateTypes", null);
exports.PricesController = PricesController = __decorate([
    (0, common_1.Controller)('prices'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [prices_service_1.PricesService, settings_service_1.SettingsService])
], PricesController);
//# sourceMappingURL=prices.controller.js.map