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
exports.FacebookController = void 0;
const common_1 = require("@nestjs/common");
const facebook_service_1 = require("./facebook.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const role_enum_1 = require("../common/enums/role.enum");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let FacebookController = class FacebookController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    getPages() { return this.svc.getPages(); }
    connectPage(body, uid) { return this.svc.connectPage({ ...body, connected_by: uid }); }
    disconnectPage(id) { return this.svc.disconnectPage(id); }
    getPosts(pid, s) { return this.svc.getPosts(pid, s); }
    createPost(body, uid) { return this.svc.createPost({ ...body, created_by: uid }); }
    publishPost(id) { return this.svc.publishPost(id); }
    deletePost(id) { return this.svc.deletePost(id); }
};
exports.FacebookController = FacebookController;
__decorate([
    (0, common_1.Get)('pages'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FacebookController.prototype, "getPages", null);
__decorate([
    (0, common_1.Post)('pages'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.MANAGER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], FacebookController.prototype, "connectPage", null);
__decorate([
    (0, common_1.Delete)('pages/:id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], FacebookController.prototype, "disconnectPage", null);
__decorate([
    (0, common_1.Get)('posts'),
    __param(0, (0, common_1.Query)('page_id')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", void 0)
], FacebookController.prototype, "getPosts", null);
__decorate([
    (0, common_1.Post)('posts'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], FacebookController.prototype, "createPost", null);
__decorate([
    (0, common_1.Post)('posts/:id/publish'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], FacebookController.prototype, "publishPost", null);
__decorate([
    (0, common_1.Delete)('posts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], FacebookController.prototype, "deletePost", null);
exports.FacebookController = FacebookController = __decorate([
    (0, common_1.Controller)('facebook'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [facebook_service_1.FacebookService])
], FacebookController);
//# sourceMappingURL=facebook.controller.js.map