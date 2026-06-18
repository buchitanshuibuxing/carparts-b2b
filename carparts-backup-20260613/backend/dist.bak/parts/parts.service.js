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
exports.PartsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const part_entity_1 = require("./entities/part.entity");
const inventory_entity_1 = require("../inventory/entities/inventory.entity");
const paginated_response_dto_1 = require("../common/dto/paginated-response.dto");
const settings_service_1 = require("../settings/settings.service");
const TRANSLATE_PROVIDER_PRESETS = {
    zhipu: { url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4-flash' },
    deepseek: { url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
    qwen: { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
    doubao: { url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-pro-32k' },
    hunyuan: { url: 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions', model: 'hunyuan-standard' },
    kimi: { url: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
    mimo: { url: 'https://api.xiaomi.com/v1/chat/completions', model: 'mimo' },
    openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
    custom: { url: '', model: '' },
};
let PartsService = class PartsService {
    partRepo;
    inventoryRepo;
    settingsSvc;
    constructor(partRepo, inventoryRepo, settingsSvc) {
        this.partRepo = partRepo;
        this.inventoryRepo = inventoryRepo;
        this.settingsSvc = settingsSvc;
    }
    async findAll(page = 1, pageSize = 20, filters) {
        const qb = this.partRepo.createQueryBuilder('part');
        qb.leftJoinAndSelect('part.classification', 'classification');
        if (filters?.classification_id)
            qb.andWhere('part.classification_id = :cid', { cid: filters.classification_id });
        if (filters?.category)
            qb.andWhere('part.category = :category', { category: filters.category });
        if (filters?.brand)
            qb.andWhere('part.brand = :brand', { brand: filters.brand });
        if (filters?.car_model)
            qb.andWhere('part.car_model LIKE :carModel', { carModel: `%${filters.car_model}%` });
        if (filters?.part_type)
            qb.andWhere('part.part_type = :partType', { partType: filters.part_type });
        if (filters?.is_active !== undefined)
            qb.andWhere('part.is_active = :isActive', { isActive: filters.is_active });
        if (filters?.keyword) {
            qb.andWhere('(part.oe_number ILIKE :kw OR part.part_name_cn ILIKE :kw OR part.part_name_en ILIKE :kw)', { kw: `%${filters.keyword}%` });
            const prefixKw = `${filters.keyword}%`;
            qb.addSelect(`CASE WHEN part.oe_number ILIKE :pfx THEN 0 ELSE 1 END`, 'pfx_rank');
            qb.setParameter('pfx', prefixKw);
            qb.orderBy('pfx_rank', 'ASC').addOrderBy('part.createdAt', 'DESC');
        }
        else {
            qb.orderBy('part.createdAt', 'DESC');
        }
        qb.skip((page - 1) * pageSize).take(pageSize);
        const [items, total] = await qb.getManyAndCount();
        const itemsWithStock = await Promise.all(items.map(async (part) => {
            const inv = await this.inventoryRepo.findOne({ where: { partId: part.id } });
            return { ...part, inventory: inv || { quantity: 0, reservedQuantity: 0, minStock: 0 } };
        }));
        return new paginated_response_dto_1.PaginatedResponseDto(itemsWithStock, total, page, pageSize);
    }
    async findOne(id) {
        const part = await this.partRepo.findOne({ where: { id }, relations: ['classification'] });
        if (!part)
            throw new common_1.NotFoundException('配件不存在');
        const inv = await this.inventoryRepo.findOne({ where: { partId: id } });
        return { ...part, inventory: inv };
    }
    async search(query, limit = 20) {
        const qb = this.partRepo.createQueryBuilder('part');
        qb.where('part.search_vector @@ plainto_tsquery(\'simple\', :q)', { q: query })
            .orWhere('part.oe_number ILIKE :kw', { kw: `%${query}%` })
            .orWhere('part.part_name_cn ILIKE :kw', { kw: `%${query}%` })
            .orWhere('part.part_name_en ILIKE :kw', { kw: `%${query}%` });
        const prefixQ = `${query}%`;
        qb.addSelect(`CASE WHEN part.oe_number ILIKE :pfx THEN 0 ELSE 1 END`, 'pfx_rank');
        qb.setParameter('pfx', prefixQ);
        qb.orderBy('pfx_rank', 'ASC').addOrderBy('part.createdAt', 'DESC').limit(limit);
        const parts = await qb.getMany();
        return Promise.all(parts.map(async (part) => {
            const inv = await this.inventoryRepo.findOne({ where: { partId: part.id } });
            return { ...part, quantity: inv?.quantity || 0 };
        }));
    }
    async getCategories() {
        const result = await this.partRepo.createQueryBuilder('part')
            .select('DISTINCT part.category', 'category')
            .orderBy('part.category')
            .getRawMany();
        return result.map(r => r.category);
    }
    async create(data) {
        const existing = await this.partRepo.findOne({ where: { oeNumber: data.oe_number } });
        if (existing)
            throw new common_1.ConflictException('OE 编号已存在');
        const part = this.partRepo.create({
            oeNumber: data.oe_number,
            partNameCn: data.part_name_cn,
            partNameEn: data.part_name_en || '',
            partNameKo: data.part_name_ko || '',
            classificationId: data.classification_id || null,
            category: data.category || '其他',
            subCategory: data.sub_category || '',
            brand: data.brand || '',
            carModel: data.car_model || '',
            engineType: data.engine_type || '',
            modelYearFrom: data.model_year_from,
            modelYearTo: data.model_year_to,
            partType: data.part_type || 'OEM',
            specifications: data.specifications || {},
            unit: data.unit || '个',
            weightKg: data.weight_kg || 0,
            dimensionsCm: data.dimensions_cm || '',
            hsCode: data.hs_code || '',
            notes: data.notes || '',
            createdBy: data.created_by,
        });
        const saved = await this.partRepo.save(part);
        await this.inventoryRepo.save({ partId: saved.id, quantity: 0 });
        return saved;
    }
    async update(id, data) {
        const part = await this.partRepo.findOne({ where: { id } });
        if (!part)
            throw new common_1.NotFoundException('配件不存在');
        const fields = ['partNameCn', 'partNameEn', 'partNameKo', 'classificationId', 'category', 'subCategory', 'brand', 'carModel', 'engineType', 'modelYearFrom', 'modelYearTo', 'partType', 'specifications', 'unit', 'weightKg', 'dimensionsCm', 'hsCode', 'notes', 'isActive'];
        const snakeToCamel = {
            part_name_cn: 'partNameCn', part_name_en: 'partNameEn', part_name_ko: 'partNameKo',
            classification_id: 'classificationId',
            sub_category: 'subCategory', car_model: 'carModel', engine_type: 'engineType',
            model_year_from: 'modelYearFrom', model_year_to: 'modelYearTo', part_type: 'partType',
            weight_kg: 'weightKg', dimensions_cm: 'dimensionsCm', hs_code: 'hsCode', is_active: 'isActive',
        };
        for (const [key, value] of Object.entries(data)) {
            const camelKey = snakeToCamel[key] || key;
            if (fields.includes(camelKey) && value !== undefined) {
                part[camelKey] = value;
            }
        }
        return this.partRepo.save(part);
    }
    async remove(id) {
        const part = await this.partRepo.findOne({ where: { id } });
        if (!part)
            throw new common_1.NotFoundException('配件不存在');
        await this.partRepo.remove(part);
    }
    async batchDelete(ids) {
        if (!ids.length)
            return { deleted: 0 };
        await this.partRepo.delete(ids);
        return { deleted: ids.length };
    }
    async batchTranslate(ids) {
        let parts;
        if (ids && ids.length) {
            parts = await this.partRepo.find({ where: { id: (0, typeorm_2.In)(ids) } });
        }
        else {
            parts = await this.partRepo.createQueryBuilder('p')
                .where('(p.part_name_en IS NULL OR p.part_name_en = \'\')')
                .andWhere('p.part_name_cn IS NOT NULL AND p.part_name_cn != \'\'')
                .getMany();
        }
        if (!parts.length)
            return { total: 0, translated: 0, failed: 0, errors: [] };
        const settings = await this.settingsSvc.getAll();
        const apiKey = settings.oe_lookup_api_key || process.env.ZHIPU_API_KEY;
        if (!apiKey)
            throw new Error('未配置 AI API Key，请在设置中配置 OE 查询 API Key');
        const apiType = settings.oe_lookup_api_type || 'zhipu';
        const preset = TRANSLATE_PROVIDER_PRESETS[apiType] || TRANSLATE_PROVIDER_PRESETS.zhipu;
        const apiUrl = settings.oe_lookup_api_url || preset.url;
        const model = settings.oe_lookup_model || preset.model;
        const BATCH_SIZE = 20;
        let translated = 0;
        let failed = 0;
        const errors = [];
        for (let i = 0; i < parts.length; i += BATCH_SIZE) {
            const batch = parts.slice(i, i + BATCH_SIZE);
            const names = [...new Set(batch.map(p => p.partNameCn).filter(Boolean))];
            try {
                const prompt = `将以下汽车配件中文名称翻译为英文名称。返回严格的JSON格式，key为中文名，value为英文名。只返回JSON，不要其他内容。\n\n示例：{"空调滤芯":"Air Conditioning Filter","机油滤芯":"Oil Filter"}\n\n需要翻译：\n${names.map((n, j) => `${j + 1}. ${n}`).join('\n')}`;
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 2048, temperature: 0.1 }),
                });
                if (!response.ok) {
                    throw new Error(`AI API 返回 ${response.status}`);
                }
                const data = await response.json();
                const text = data.choices?.[0]?.message?.content || '{}';
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                const mapping = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
                for (const part of batch) {
                    const en = mapping[part.partNameCn];
                    if (en) {
                        part.partNameEn = en;
                        translated++;
                    }
                    else {
                        errors.push(`${part.partNameCn}: 未获取到翻译`);
                        failed++;
                    }
                }
                await this.partRepo.save(batch);
            }
            catch (err) {
                failed += batch.length;
                errors.push(`批次 ${i / BATCH_SIZE + 1}: ${err.message}`);
            }
        }
        return { total: parts.length, translated, failed, errors };
    }
};
exports.PartsService = PartsService;
exports.PartsService = PartsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(part_entity_1.Part)),
    __param(1, (0, typeorm_1.InjectRepository)(inventory_entity_1.Inventory)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        settings_service_1.SettingsService])
], PartsService);
//# sourceMappingURL=parts.service.js.map