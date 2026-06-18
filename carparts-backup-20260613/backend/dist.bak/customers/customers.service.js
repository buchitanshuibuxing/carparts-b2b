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
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const customer_entity_1 = require("./entities/customer.entity");
const paginated_response_dto_1 = require("../common/dto/paginated-response.dto");
let CustomersService = class CustomersService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async findAll(page = 1, pageSize = 20, filters) {
        const qb = this.repo.createQueryBuilder('c');
        if (filters?.customer_type)
            qb.andWhere('c.customer_type = :t', { t: filters.customer_type });
        if (filters?.region)
            qb.andWhere('c.region = :r', { r: filters.region });
        if (filters?.is_active !== undefined)
            qb.andWhere('c.is_active = :a', { a: filters.is_active });
        if (filters?.keyword)
            qb.andWhere('(c.company_name ILIKE :kw OR c.contact_person ILIKE :kw)', { kw: `%${filters.keyword}%` });
        qb.orderBy('c.created_at', 'DESC').skip((page - 1) * pageSize).take(pageSize);
        const [items, total] = await qb.getManyAndCount();
        return new paginated_response_dto_1.PaginatedResponseDto(items, total, page, pageSize);
    }
    async findOne(id) {
        const c = await this.repo.findOne({ where: { id } });
        if (!c)
            throw new common_1.NotFoundException('客户不存在');
        return c;
    }
    async create(data) {
        const c = this.repo.create({
            customerCode: data.customer_code, companyName: data.company_name,
            contactPerson: data.contact_person || '', phone: data.phone || '',
            email: data.email || '', address: data.address || '', country: data.country || '',
            region: data.region || '', customerType: data.customer_type || '经销商',
            customerLevel: data.customer_level || '普通', currency: data.currency || 'USD',
            creditLimit: data.credit_limit || 0, paymentTerms: data.payment_terms || '', notes: data.notes || '',
        });
        return this.repo.save(c);
    }
    async update(id, data) {
        const c = await this.findOne(id);
        const map = {
            customer_code: 'customerCode', company_name: 'companyName', contact_person: 'contactPerson',
            customer_type: 'customerType', customer_level: 'customerLevel', credit_limit: 'creditLimit',
            payment_terms: 'paymentTerms', is_active: 'isActive',
        };
        for (const [k, v] of Object.entries(data)) {
            const key = map[k] || k;
            if (v !== undefined)
                c[key] = v;
        }
        return this.repo.save(c);
    }
    async toggleActive(id, isActive) {
        const c = await this.findOne(id);
        c.isActive = isActive;
        return this.repo.save(c);
    }
    async remove(id) {
        const c = await this.findOne(id);
        await this.repo.remove(c);
    }
    async batchUpdate(ids, data) {
        if (!ids.length)
            return { updated: 0 };
        const set = {};
        const map = {
            company_name: 'companyName', contact_person: 'contactPerson',
            phone: 'phone', email: 'email', address: 'address', country: 'country', region: 'region',
            customer_type: 'customerType', customer_level: 'customerLevel', currency: 'currency',
            credit_limit: 'creditLimit', payment_terms: 'paymentTerms', notes: 'notes', is_active: 'isActive',
        };
        for (const [k, v] of Object.entries(data)) {
            if (k === 'ids')
                continue;
            const key = map[k] || k;
            if (v !== undefined && v !== '')
                set[key] = v;
        }
        if (Object.keys(set).length === 0)
            return { updated: 0 };
        await this.repo.createQueryBuilder().update().set(set).where('id IN (:...ids)', { ids }).execute();
        return { updated: ids.length };
    }
    async batchDelete(ids) {
        if (!ids.length)
            return { deleted: 0 };
        await this.repo.delete(ids);
        return { deleted: ids.length };
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CustomersService);
//# sourceMappingURL=customers.service.js.map