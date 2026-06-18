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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_entity_1 = require("../users/entities/user.entity");
let AuthService = class AuthService {
    userRepo;
    jwtService;
    constructor(userRepo, jwtService) {
        this.userRepo = userRepo;
        this.jwtService = jwtService;
    }
    async login(username, password) {
        const user = await this.userRepo.findOne({
            where: [{ username }, { email: username }],
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('用户名或密码错误');
        }
        const passwordValid = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('用户名或密码错误');
        }
        user.lastLoginAt = new Date();
        await this.userRepo.save(user);
        return this.generateTokens(user);
    }
    async register(username, email, password, displayName) {
        const existing = await this.userRepo.findOne({
            where: [{ username }, { email }],
        });
        if (existing) {
            throw new common_1.ConflictException('用户名或邮箱已存在');
        }
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        const user = this.userRepo.create({
            username, email, passwordHash,
            displayName: displayName || username,
            role: 'viewer',
        });
        await this.userRepo.save(user);
        return this.generateTokens(user);
    }
    async getProfile(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.UnauthorizedException();
        const { passwordHash, ...result } = user;
        return result;
    }
    async refreshToken(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: process.env.JWT_SECRET || 'carparts-b2b-dev-secret-change-in-production',
            });
            const user = await this.userRepo.findOne({ where: { id: payload.sub } });
            if (!user || !user.isActive)
                throw new common_1.UnauthorizedException();
            return this.generateTokens(user);
        }
        catch {
            throw new common_1.UnauthorizedException('刷新令牌无效');
        }
    }
    generateTokens(user) {
        const payload = { sub: user.id, username: user.username, role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
            refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.displayName,
                role: user.role,
                avatarUrl: user.avatarUrl,
            },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map