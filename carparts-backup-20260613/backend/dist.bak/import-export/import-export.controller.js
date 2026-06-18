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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportExportController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const path_1 = __importDefault(require("path"));
const import_export_service_1 = require("./import-export.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let ImportExportController = class ImportExportController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    preview(file, body) {
        if (!file)
            throw new Error('请选择文件');
        return this.svc.previewImport(file, body.import_type);
    }
    import(file, body) {
        if (!file)
            throw new Error('请选择文件');
        const mapping = body.field_mapping ? JSON.parse(body.field_mapping) : undefined;
        return this.svc.importFromExcel(file, body.import_type, mapping, body.duplicate_strategy);
    }
    importRow(body) {
        return this.svc.importSingleRow(body.import_type, body.row, body.duplicate_strategy);
    }
    importBatch(body) {
        return this.svc.importBatchRows(body.import_type, body.rows, body.duplicate_strategy);
    }
    async getTemplate(type, res) {
        const result = await this.svc.exportTemplate(type);
        const uploadDir = process.env.UPLOAD_DEST || './uploads';
        res.download(path_1.default.join(uploadDir, result.path), `${type}_template.xlsx`);
    }
    async exportData(type, res) {
        const buffer = await this.svc.exportData(type);
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${type}_export.xlsx"`,
        });
        res.send(buffer);
    }
};
exports.ImportExportController = ImportExportController;
__decorate([
    (0, common_1.Post)('preview'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ImportExportController.prototype, "preview", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ImportExportController.prototype, "import", null);
__decorate([
    (0, common_1.Post)('row'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ImportExportController.prototype, "importRow", null);
__decorate([
    (0, common_1.Post)('batch'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ImportExportController.prototype, "importBatch", null);
__decorate([
    (0, common_1.Get)('template'),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ImportExportController.prototype, "getTemplate", null);
__decorate([
    (0, common_1.Get)('export'),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ImportExportController.prototype, "exportData", null);
exports.ImportExportController = ImportExportController = __decorate([
    (0, common_1.Controller)('import'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [import_export_service_1.ImportExportService])
], ImportExportController);
//# sourceMappingURL=import-export.controller.js.map