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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_entity_1 = require("./entities/user.entity");
const paginated_response_dto_1 = require("../common/dto/paginated-response.dto");
let UsersService = class UsersService {
    userRepo;
    constructor(userRepo) {
        this.userRepo = userRepo;
    }
    async findAll(page = 1, pageSize = 20) {
        const [items, total] = await this.userRepo.findAndCount({
            order: { createdAt: 'DESC' },
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: ['id', 'username', 'email', 'displayName', 'role', 'avatarUrl', 'isActive', 'lastLoginAt', 'createdAt'],
        });
        return new paginated_response_dto_1.PaginatedResponseDto(items, total, page, pageSize);
    }
    async findOne(id) {
        const user = await this.userRepo.findOne({
            where: { id },
            select: ['id', 'username', 'email', 'displayName', 'role', 'avatarUrl', 'isActive', 'lastLoginAt', 'createdAt'],
        });
        if (!user)
            throw new common_1.NotFoundException('用户不存在');
        return user;
    }
    async create(data) {
        const existing = await this.userRepo.findOne({
            where: [{ username: data.username }, { email: data.email }],
        });
        if (existing)
            throw new common_1.ConflictException('用户名或邮箱已存在');
        const passwordHash = await bcrypt_1.default.hash(data.password, 10);
        const user = this.userRepo.create({
            username: data.username,
            email: data.email,
            passwordHash,
            displayName: data.display_name || data.username,
            role: data.role || 'viewer',
        });
        await this.userRepo.save(user);
        const { passwordHash: _, ...result } = user;
        return result;
    }
    async update(id, data) {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('用户不存在');
        if (data.display_name !== undefined)
            user.displayName = data.display_name;
        if (data.email !== undefined)
            user.email = data.email;
        if (data.role !== undefined)
            user.role = data.role;
        if (data.is_active !== undefined)
            user.isActive = data.is_active;
        if (data.password)
            user.passwordHash = await bcrypt_1.default.hash(data.password, 10);
        await this.userRepo.save(user);
        const { passwordHash, ...result } = user;
        return result;
    }
    async remove(id) {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('用户不存在');
        await this.userRepo.remove(user);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map