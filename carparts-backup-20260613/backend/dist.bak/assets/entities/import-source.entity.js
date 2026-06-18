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
exports.ImportSource = void 0;
const typeorm_1 = require("typeorm");
let ImportSource = class ImportSource {
    id;
    name;
    protocol;
    url;
    username;
    password;
    localMountPath;
    remotePath;
    autoClassify;
    folderMapping;
    scanInterval;
    lastScanAt;
    lastSyncAt;
    status;
    errorMessage;
    importProgress;
    createdAt;
    updatedAt;
};
exports.ImportSource = ImportSource;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ImportSource.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], ImportSource.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20 }),
    __metadata("design:type", String)
], ImportSource.prototype, "protocol", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ImportSource.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255, default: '' }),
    __metadata("design:type", String)
], ImportSource.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255, default: '' }),
    __metadata("design:type", String)
], ImportSource.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'local_mount_path', type: 'text', nullable: true }),
    __metadata("design:type", String)
], ImportSource.prototype, "localMountPath", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'remote_path', type: 'text', default: '/' }),
    __metadata("design:type", String)
], ImportSource.prototype, "remotePath", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'auto_classify', default: true }),
    __metadata("design:type", Boolean)
], ImportSource.prototype, "autoClassify", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'folder_mapping', type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], ImportSource.prototype, "folderMapping", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scan_interval', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ImportSource.prototype, "scanInterval", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_scan_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], ImportSource.prototype, "lastScanAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_sync_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], ImportSource.prototype, "lastSyncAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: 'idle' }),
    __metadata("design:type", String)
], ImportSource.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', type: 'text', default: '' }),
    __metadata("design:type", String)
], ImportSource.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'import_progress', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], ImportSource.prototype, "importProgress", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ImportSource.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ImportSource.prototype, "updatedAt", void 0);
exports.ImportSource = ImportSource = __decorate([
    (0, typeorm_1.Entity)('import_sources')
], ImportSource);
//# sourceMappingURL=import-source.entity.js.map