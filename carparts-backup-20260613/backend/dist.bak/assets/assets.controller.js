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
exports.AssetsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const assets_service_1 = require("./assets.service");
const import_sources_service_1 = require("./import-sources.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let AssetsController = class AssetsController {
    svc;
    importSourcesSvc;
    constructor(svc, importSourcesSvc) {
        this.svc = svc;
        this.importSourcesSvc = importSourcesSvc;
    }
    upload(file, body, uid) {
        if (!file)
            throw new common_1.BadRequestException('请选择文件');
        return this.svc.upload(file, {
            part_id: body.part_id ? Number(body.part_id) : undefined,
            classification_id: body.classification_id ? Number(body.classification_id) : undefined,
            category: body.category,
            tag_ids: body.tag_ids ? JSON.parse(body.tag_ids) : undefined,
            uploaded_by: uid,
        });
    }
    batchUpload(files, body, uid) {
        if (!files?.length)
            throw new common_1.BadRequestException('请选择文件');
        return this.svc.batchUpload(files, { classification_id: body.classification_id ? Number(body.classification_id) : undefined, uploaded_by: uid });
    }
    findAll(p = 1, ps = 20, cid, kw, oe, pt, br, pid, cat, tids, type) {
        return this.svc.findAll(p, ps, {
            classification_id: cid ? Number(cid) : undefined, keyword: kw,
            oe_number: oe, part_type: pt, brand: br,
            part_id: pid ? Number(pid) : undefined, category: cat,
            tag_ids: tids ? tids.split(',').map(Number) : undefined,
            type,
        });
    }
    getSources() { return this.importSourcesSvc.findAll(); }
    createSource(body) {
        return this.importSourcesSvc.create({
            name: body.name,
            protocol: body.protocol,
            url: body.url,
            username: body.username || '',
            password: body.password || '',
            localMountPath: body.local_mount_path,
            remotePath: body.remote_path || '/',
            autoClassify: body.auto_classify !== false,
            folderMapping: body.folder_mapping || {},
        });
    }
    updateSource(id, body) {
        const data = {};
        if (body.name !== undefined)
            data.name = body.name;
        if (body.protocol !== undefined)
            data.protocol = body.protocol;
        if (body.url !== undefined)
            data.url = body.url;
        if (body.username !== undefined)
            data.username = body.username;
        if (body.password !== undefined)
            data.password = body.password;
        if (body.local_mount_path !== undefined)
            data.localMountPath = body.local_mount_path;
        if (body.remote_path !== undefined)
            data.remotePath = body.remote_path;
        if (body.auto_classify !== undefined)
            data.autoClassify = body.auto_classify;
        if (body.folder_mapping !== undefined)
            data.folderMapping = body.folder_mapping;
        if (body.scan_interval !== undefined)
            data.scanInterval = body.scan_interval;
        return this.importSourcesSvc.update(id, data);
    }
    deleteSource(id) { return this.importSourcesSvc.remove(id); }
    testSource(id) { return this.importSourcesSvc.testConnection(id); }
    browseSource(id, dirPath) {
        return this.importSourcesSvc.browseDirectory(id, dirPath || '/');
    }
    startImport(id) { return this.importSourcesSvc.startImport(id); }
    stopImport(id) { return this.importSourcesSvc.stopImport(id); }
    getImportProgress(id) { return this.importSourcesSvc.getImportProgress(id); }
    findOne(id) { return this.svc.findOne(id); }
    update(id, body) { return this.svc.update(id, body); }
    remove(id) { return this.svc.remove(id); }
    batchDelete(body) { return this.svc.batchDelete(body.ids); }
    batchClassify(body) { return this.svc.batchClassify(body.ids, body.classification_id); }
    batchTag(body) { return this.svc.batchTag(body.ids, body.tag_ids); }
    batchUpdate(body) {
        return this.svc.batchUpdate(body.ids, body);
    }
    recognizeAsset(id, body) { return this.svc.recognizeAsset(id, body); }
    batchRecognize(body) { return this.svc.batchRecognize(body.ids, body); }
    batchUndoRecognize(body) { return this.svc.batchUndoRecognize(body.ids); }
    undoRecognize(id) { return this.svc.undoRecognize(id); }
    getClassifications() { return this.svc.getClassifications(); }
    createClassification(body) { return this.svc.createClassification(body); }
    deleteClassification(id) { return this.svc.deleteClassification(id); }
    getTags() { return this.svc.getTags(); }
    createTag(body) { return this.svc.createTag(body); }
    deleteTag(id) { return this.svc.deleteTag(id); }
    cropImage(id, body) {
        return this.svc.cropImage(id, body.x, body.y, body.width, body.height);
    }
    addWatermark(id, body) {
        return this.svc.addWatermark(id, body.text);
    }
};
exports.AssetsController = AssetsController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 200 * 1024 * 1024 } })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Number]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "upload", null);
__decorate([
    (0, common_1.Post)('batch-upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 50, { limits: { fileSize: 200 * 1024 * 1024 } })),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object, Number]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "batchUpload", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('page_size')),
    __param(2, (0, common_1.Query)('classification_id')),
    __param(3, (0, common_1.Query)('keyword')),
    __param(4, (0, common_1.Query)('oe_number')),
    __param(5, (0, common_1.Query)('part_type')),
    __param(6, (0, common_1.Query)('brand')),
    __param(7, (0, common_1.Query)('part_id')),
    __param(8, (0, common_1.Query)('category')),
    __param(9, (0, common_1.Query)('tag_ids')),
    __param(10, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Number, String, String, String, String, Number, String, String, String]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('sources'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "getSources", null);
__decorate([
    (0, common_1.Post)('sources'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "createSource", null);
__decorate([
    (0, common_1.Put)('sources/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "updateSource", null);
__decorate([
    (0, common_1.Delete)('sources/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "deleteSource", null);
__decorate([
    (0, common_1.Post)('sources/:id/test'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "testSource", null);
__decorate([
    (0, common_1.Get)('sources/:id/browse'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('path')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "browseSource", null);
__decorate([
    (0, common_1.Post)('sources/:id/import'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "startImport", null);
__decorate([
    (0, common_1.Post)('sources/:id/stop'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "stopImport", null);
__decorate([
    (0, common_1.Get)('sources/:id/progress'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "getImportProgress", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('batch-delete'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "batchDelete", null);
__decorate([
    (0, common_1.Post)('batch-classify'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "batchClassify", null);
__decorate([
    (0, common_1.Post)('batch-tag'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "batchTag", null);
__decorate([
    (0, common_1.Post)('batch-update'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "batchUpdate", null);
__decorate([
    (0, common_1.Post)(':id/recognize'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "recognizeAsset", null);
__decorate([
    (0, common_1.Post)('batch-recognize'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "batchRecognize", null);
__decorate([
    (0, common_1.Post)('batch-undo-recognize'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "batchUndoRecognize", null);
__decorate([
    (0, common_1.Post)(':id/undo-recognize'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "undoRecognize", null);
__decorate([
    (0, common_1.Get)('meta/classifications'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "getClassifications", null);
__decorate([
    (0, common_1.Post)('meta/classifications'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "createClassification", null);
__decorate([
    (0, common_1.Delete)('meta/classifications/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "deleteClassification", null);
__decorate([
    (0, common_1.Get)('meta/tags'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "getTags", null);
__decorate([
    (0, common_1.Post)('meta/tags'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "createTag", null);
__decorate([
    (0, common_1.Delete)('meta/tags/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "deleteTag", null);
__decorate([
    (0, common_1.Post)(':id/crop'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "cropImage", null);
__decorate([
    (0, common_1.Post)(':id/watermark'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], AssetsController.prototype, "addWatermark", null);
exports.AssetsController = AssetsController = __decorate([
    (0, common_1.Controller)('assets'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [assets_service_1.AssetsService,
        import_sources_service_1.ImportSourcesService])
], AssetsController);
//# sourceMappingURL=assets.controller.js.map