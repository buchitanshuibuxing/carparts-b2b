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
exports.FacebookPage = void 0;
const typeorm_1 = require("typeorm");
let FacebookPage = class FacebookPage {
    id;
    pageId;
    pageName;
    accessToken;
    tokenExpires;
    profilePicture;
    isActive;
    connectedBy;
    createdAt;
    updatedAt;
};
exports.FacebookPage = FacebookPage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], FacebookPage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'page_id', length: 50, unique: true }),
    __metadata("design:type", String)
], FacebookPage.prototype, "pageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'page_name', length: 255 }),
    __metadata("design:type", String)
], FacebookPage.prototype, "pageName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'access_token', type: 'text' }),
    __metadata("design:type", String)
], FacebookPage.prototype, "accessToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'token_expires', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], FacebookPage.prototype, "tokenExpires", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'profile_picture', length: 500, default: '' }),
    __metadata("design:type", String)
], FacebookPage.prototype, "profilePicture", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], FacebookPage.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'connected_by', nullable: true }),
    __metadata("design:type", Number)
], FacebookPage.prototype, "connectedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], FacebookPage.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], FacebookPage.prototype, "updatedAt", void 0);
exports.FacebookPage = FacebookPage = __decorate([
    (0, typeorm_1.Entity)('facebook_pages')
], FacebookPage);
//# sourceMappingURL=facebook-page.entity.js.map