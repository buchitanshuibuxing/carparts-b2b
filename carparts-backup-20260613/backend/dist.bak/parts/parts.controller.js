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
exports.PartsController = void 0;
const common_1 = require("@nestjs/common");
const parts_service_1 = require("./parts.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let PartsController = class PartsController {
    partsService;
    constructor(partsService) {
        this.partsService = partsService;
    }
    findAll(page = 1, pageSize = 20, classificationId, category, brand, carModel, partType, isActive, keyword) {
        return this.partsService.findAll(page, pageSize, {
            classification_id: classificationId ? Number(classificationId) : undefined,
            category, brand, car_model: carModel, part_type: partType,
            is_active: isActive !== undefined ? isActive === 'true' : undefined,
            keyword,
        });
    }
    search(query, limit = 20) {
        return this.partsService.search(query, limit);
    }
    getCategories() {
        return this.partsService.getCategories();
    }
    findOne(id) {
        return this.partsService.findOne(id);
    }
    create(body) {
        return this.partsService.create(body);
    }
    update(id, body) {
        return this.partsService.update(id, body);
    }
    remove(id) {
        return this.partsService.remove(id);
    }
    batchDelete(body) {
        return this.partsService.batchDelete(body.ids);
    }
    batchTranslate(body) {
        return this.partsService.batchTranslate(body.ids);
    }
};
exports.PartsController = PartsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('page_size')),
    __param(2, (0, common_1.Query)('classification_id')),
    __param(3, (0, common_1.Query)('category')),
    __param(4, (0, common_1.Query)('brand')),
    __param(5, (0, common_1.Query)('car_model')),
    __param(6, (0, common_1.Query)('part_type')),
    __param(7, (0, common_1.Query)('is_active')),
    __param(8, (0, common_1.Query)('keyword')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], PartsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], PartsController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PartsController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], PartsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PartsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PartsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], PartsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('batch-delete'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PartsController.prototype, "batchDelete", null);
__decorate([
    (0, common_1.Post)('batch-translate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PartsController.prototype, "batchTranslate", null);
exports.PartsController = PartsController = __decorate([
    (0, common_1.Controller)('parts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [parts_service_1.PartsService])
], PartsController);
//# sourceMappingURL=parts.controller.js.map