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
exports.SuppliersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const supplier_entity_1 = require("./entities/supplier.entity");
const supplier_part_entity_1 = require("./entities/supplier-part.entity");
const paginated_response_dto_1 = require("../common/dto/paginated-response.dto");
let SuppliersService = class SuppliersService {
    supplierRepo;
    supplierPartRepo;
    constructor(supplierRepo, supplierPartRepo) {
        this.supplierRepo = supplierRepo;
        this.supplierPartRepo = supplierPartRepo;
    }
    async findAll(page = 1, pageSize = 20, isActive) {
        const where = {};
        if (isActive !== undefined)
            where.isActive = isActive;
        const [items, total] = await this.supplierRepo.findAndCount({
            where, order: { createdAt: 'DESC' },
            skip: (page - 1) * pageSize, take: pageSize,
        });
        return new paginated_response_dto_1.PaginatedResponseDto(items, total, page, pageSize);
    }
    async findOne(id) {
        const supplier = await this.supplierRepo.findOne({ where: { id } });
        if (!supplier)
            throw new common_1.NotFoundException('供应商不存在');
        return supplier;
    }
    async create(data) {
        const supplier = this.supplierRepo.create({
            supplierCode: data.supplier_code, companyName: data.company_name,
            contactPerson: data.contact_person || '', phone: data.phone || '',
            email: data.email || '', address: data.address || '', country: data.country || '',
            paymentTerms: data.payment_terms || '', currency: data.currency || 'USD',
            leadTimeDays: data.lead_time_days || 0, rating: data.rating || 0, notes: data.notes || '',
            mainProducts: data.main_products || '',
        });
        return this.supplierRepo.save(supplier);
    }
    async update(id, data) {
        const supplier = await this.findOne(id);
        const map = {
            supplier_code: 'supplierCode', company_name: 'companyName', contact_person: 'contactPerson',
            payment_terms: 'paymentTerms', lead_time_days: 'leadTimeDays', is_active: 'isActive',
        };
        for (const [k, v] of Object.entries(data)) {
            const key = map[k] || k;
            if (v !== undefined)
                supplier[key] = v;
        }
        return this.supplierRepo.save(supplier);
    }
    async toggleActive(id, isActive) {
        const supplier = await this.findOne(id);
        supplier.isActive = isActive;
        return this.supplierRepo.save(supplier);
    }
    async linkPart(data) {
        const link = this.supplierPartRepo.create({
            supplierId: data.supplier_id, partId: data.part_id,
            supplierSku: data.supplier_sku || '', moq: data.moq || 1, leadTimeDays: data.lead_time_days || 0,
        });
        return this.supplierPartRepo.save(link);
    }
    async getSupplierParts(supplierId) {
        return this.supplierPartRepo.find({ where: { supplierId } });
    }
    async remove(id) {
        const supplier = await this.findOne(id);
        await this.supplierRepo.remove(supplier);
    }
    async batchUpdate(ids, data) {
        if (!ids.length)
            return { updated: 0 };
        const set = {};
        const map = {
            supplier_code: 'supplierCode', company_name: 'companyName', contact_person: 'contactPerson',
            phone: 'phone', email: 'email', address: 'address', country: 'country',
            main_products: 'mainProducts', payment_terms: 'paymentTerms', currency: 'currency',
            lead_time_days: 'leadTimeDays', rating: 'rating', is_active: 'isActive', notes: 'notes',
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
        await this.supplierRepo.createQueryBuilder().update().set(set).where('id IN (:...ids)', { ids }).execute();
        return { updated: ids.length };
    }
    async batchDelete(ids) {
        if (!ids.length)
            return { deleted: 0 };
        await this.supplierRepo.delete(ids);
        return { deleted: ids.length };
    }
};
exports.SuppliersService = SuppliersService;
exports.SuppliersService = SuppliersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(supplier_entity_1.Supplier)),
    __param(1, (0, typeorm_1.InjectRepository)(supplier_part_entity_1.SupplierPart)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], SuppliersService);
//# sourceMappingURL=suppliers.service.js.map