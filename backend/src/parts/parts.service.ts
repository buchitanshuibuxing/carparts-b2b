import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Repository, Like, In } from 'typeorm';
import { Part } from './entities/part.entity';
import { PartClassification } from './entities/part-classification.entity';
import { ImageAsset } from '../assets/entities/image-asset.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class PartsService {
  private readonly logger = new Logger(PartsService.name);
  constructor(
    @InjectRepository(Part) private partRepo: Repository<Part>,
    @InjectRepository(PartClassification) private partClassRepo: Repository<PartClassification>,
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
    @InjectRepository(ImageAsset) private assetRepo: Repository<ImageAsset>,
    private dataSource: DataSource,
  ) {}

  async findAll(page = 1, pageSize = 20, filters?: { category?: string; brand?: string; car_model?: string; part_type?: string; is_active?: boolean; keyword?: string }) {
    const qb = this.partRepo.createQueryBuilder('part');
    if (filters?.category) qb.andWhere('part.category = :category', { category: filters.category });
    if (filters?.brand) qb.andWhere('part.brand = :brand', { brand: filters.brand });
    if (filters?.car_model) qb.andWhere('part.car_model LIKE :carModel', { carModel: `%${filters.car_model}%` });
    if (filters?.part_type) qb.andWhere('part.part_type = :partType', { partType: filters.part_type });
    if (filters?.is_active !== undefined) qb.andWhere('part.is_active = :isActive', { isActive: filters.is_active });
    if (filters?.keyword) {
      const prefix = filters.keyword + '%';
      const contains = '%' + filters.keyword + '%';
      qb.andWhere(
        '(part.oe_number ILIKE :prefix OR part.oe_number ILIKE :contains OR part.part_name_cn ILIKE :contains OR part.part_name_en ILIKE :contains)',
        { prefix, contains },
      );
      qb.orderBy("CASE WHEN part.oe_number LIKE :prefix THEN 0 ELSE 1 END", 'ASC');
      qb.addOrderBy('part.oe_number', 'ASC');
    } else {
      qb.orderBy('part.created_at', 'DESC');
    }
    qb.skip((page - 1) * pageSize).take(pageSize);
    const [items, total] = await qb.getManyAndCount();

    // Batch fetch related data to avoid N+1 queries
    const partIds = items.map(p => p.id);
    const classIds = [...new Set(items.map(p => p.classificationId).filter(Boolean))];

    // Batch fetch classifications
    const classes = classIds.length ? await this.partClassRepo.find({ where: { id: In(classIds) } }) : [];
    const classMap = new Map(classes.map(c => [c.id, c]));

    // Batch fetch inventory
    const inventories = partIds.length ? await this.inventoryRepo.find({ where: { partId: In(partIds) } }) : [];
    const invMap = new Map(inventories.map(inv => [inv.partId, inv]));

    // Combine results
    const itemsWithStock = items.map(part => {
      const classification = part.classificationId ? classMap.get(part.classificationId) || null : null;
      const inv = invMap.get(part.id) || { quantity: 0, reservedQuantity: 0, minStock: 0 };
      return { ...part, classification, inventory: inv };
    });

    return new PaginatedResponseDto(itemsWithStock, total, page, pageSize);
  }

  async findOne(id: number) {
    const part = await this.partRepo.findOne({ where: { id }, relations: ['classification'] });
    if (!part) throw new NotFoundException('配件不存在');
    const inv = await this.inventoryRepo.findOne({ where: { partId: id } });
    return { ...part, inventory: inv };
  }

  async search(query: string, limit = 20) {
    const qb = this.partRepo.createQueryBuilder('part');
    const prefix = query + '%';
    const contains = '%' + query + '%';
    const prefixParam = 'prefix_val';
    const containsParam = 'contains_val';
    qb.where(`part.oe_number ILIKE :${prefixParam}`, { [prefixParam]: prefix })
      .orWhere(`part.oe_number ILIKE :${containsParam}`, { [containsParam]: contains })
      .orWhere(`part.part_name_cn ILIKE :${containsParam}`, { [containsParam]: contains })
      .orWhere(`part.part_name_en ILIKE :${containsParam}`, { [containsParam]: contains })
      .orderBy(`CASE WHEN part.oe_number LIKE :${prefixParam} THEN 0 ELSE 1 END`, 'ASC')
      .addOrderBy('part.oe_number', 'ASC')
      .limit(limit);
    const parts = await qb.getMany();

    // Batch fetch inventory to avoid N+1 queries
    const partIds = parts.map(p => p.id);
    const inventories = partIds.length ? await this.inventoryRepo.find({ where: { partId: In(partIds) } }) : [];
    const invMap = new Map(inventories.map(inv => [inv.partId, inv]));

    return parts.map(part => {
      const inv = invMap.get(part.id);
      return { ...part, quantity: inv?.quantity || 0 };
    });
  }

  async getCategories() {
    const result = await this.partRepo.createQueryBuilder('part')
      .select('DISTINCT part.category', 'category')
      .orderBy('part.category')
      .getRawMany();
    return result.map(r => r.category);
  }

  async create(data: any) {
    const existing = await this.partRepo.findOne({ where: { oeNumber: data.oe_number } });
    if (existing) throw new ConflictException('OE 编号已存在');
    const part = this.partRepo.create({
      oeNumber: data.oe_number,
      partNameCn: data.part_name_cn,
      partNameEn: data.part_name_en || '',
      partNameKo: data.part_name_ko || '',
      category: data.category || '其他',
      subCategory: data.sub_category || '',
      brand: data.brand || '',
      carModel: data.car_model || '',
      engineType: data.engine_type || '',
      specifications: data.specifications || {},
      unit: data.unit || '件',
      weightKg: data.weight,
      notes: data.notes || '',
      classificationId: data.classification_id,
      isActive: data.is_active !== undefined ? data.is_active : true,
    });
    return this.partRepo.save(part);
  }

  async update(id: number, data: any) {
    const part = await this.partRepo.findOne({ where: { id } });
    if (!part) throw new NotFoundException('配件不存在');

    if (data.oe_number && data.oe_number !== part.oeNumber) {
      const existing = await this.partRepo.findOne({ where: { oeNumber: data.oe_number } });
      if (existing) throw new ConflictException('OE 编号已存在');
    }

    Object.assign(part, {
      oeNumber: data.oe_number ?? part.oeNumber,
      partNameCn: data.part_name_cn ?? part.partNameCn,
      partNameEn: data.part_name_en ?? part.partNameEn,
      partNameKo: data.part_name_ko ?? part.partNameKo,
      category: data.category ?? part.category,
      subCategory: data.sub_category ?? part.subCategory,
      brand: data.brand ?? part.brand,
      carModel: data.car_model ?? part.carModel,
      engineType: data.engine_type ?? part.engineType,
      specifications: data.specifications ?? part.specifications,
      unit: data.unit ?? part.unit,
      weightKg: data.weight ?? part.weightKg,
      notes: data.notes ?? part.notes,
      classificationId: data.classification_id ?? part.classificationId,
      isActive: data.is_active ?? part.isActive,
    });

    return this.partRepo.save(part);
  }

  async remove(id: number) {
    const part = await this.partRepo.findOne({ where: { id } });
    if (!part) throw new NotFoundException('配件不存在');

    // Check for associated data
    const checks = [
      { table: 'order_items', column: 'part_id', name: '订单商品' },
      { table: 'inventory', column: 'part_id', name: '库存' },
      { table: 'prices', column: 'part_id', name: '价格' },
      { table: 'quotation_items', column: 'part_id', name: '报价商品' },
      { table: 'image_assets', column: 'part_id', name: '图片素材' },
      { table: 'supplier_parts', column: 'part_id', name: '供应商配件' },
    ];

    for (const check of checks) {
      const result = await this.inventoryRepo.query(
        `SELECT COUNT(*) as count FROM ${check.table} WHERE ${check.column} = $1`,
        [id]
      );
      if (parseInt(result[0]?.count || '0') > 0) {
        throw new BadRequestException(`该配件有关联的${check.name}，无法删除。请先删除相关数据。`);
      }
    }

    await this.partRepo.remove(part);
    return { success: true };
  }

  async batchUpdate(ids: number[], data: any) {
    const results: Array<{ id: number; success: boolean; error?: string }> = [];
    for (const id of ids) {
      try {
        const result = await this.update(id, data);
        results.push({ id, success: true });
      } catch (error: any) {
        results.push({ id, success: false, error: error.message });
      }
    }
    return results;
  }

  async batchDelete(ids: number[]) {
    const results: Array<{ id: number; success: boolean; error?: string }> = [];
    for (const id of ids) {
      try {
        await this.remove(id);
        results.push({ id, success: true });
      } catch (error: any) {
        results.push({ id, success: false, error: error.message });
      }
    }
    return results;
  }


  // Baidu Translate API
  private async baiduTranslate(text: string, appid: string, key: string): Promise<string> {
    const salt = Math.floor(Math.random() * 90000 + 10000).toString();
    const str = appid + text + salt + key;
    const { createHash } = await import('crypto');
    const sign = createHash('md5').update(str).digest('hex');
    
    const url = 'https://fanyi-api.baidu.com/api/trans/vip/translate';
    
    try {
      const params = new URLSearchParams({
        q: text,
        from: 'zh',
        to: 'en',
        appid: appid,
        salt: salt,
        sign: sign,
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });
      
      const result = await response.json();
      if (result.trans_result && result.trans_result.length > 0) {
        return result.trans_result[0].dst;
      }
      return '';
    } catch (error) {
      this.logger.error('[Baidu Translate] failed: ' + error.message);
      return '';
    }
  }

  async batchTranslate(ids?: number[]) {
    this.logger.log(`[Translate] batchTranslate called with ids: ${ids ? ids.length : 'undefined'}`);

    // Step 1: Get ALL selected parts (including those with existing translations)
    let allParts: any[] = [];
    if (ids && ids.length > 0) {
      allParts = await this.partRepo.createQueryBuilder('part')
        .where('part.part_name_cn IS NOT NULL')
        .andWhere("part.part_name_cn != ''")
        .andWhere('part.id IN (:...ids)', { ids })
        .getMany();
    } else {
      allParts = await this.partRepo.createQueryBuilder('part')
        .where('part.part_name_cn IS NOT NULL')
        .andWhere("part.part_name_cn != ''")
        .getMany();
    }

    const totalCount = ids ? ids.length : allParts.length;
    this.logger.log(`[Translate] Found ${allParts.length} parts to translate, totalCount: ${totalCount}`);

    if (allParts.length === 0) {
      return { total: totalCount, translated: 0, failed: 0, skipped: totalCount, aiTranslated: 0, errors: [] };
    }

    // Step 2: Get existing translations from database
    const existingTranslations = await this.partRepo.createQueryBuilder('part')
      .select('part.part_name_cn, part.part_name_en')
      .where('part.part_name_en IS NOT NULL')
      .andWhere("part.part_name_en != ''")
      .groupBy('part.part_name_cn, part.part_name_en')
      .getRawMany();

    const translationCache = new Map<string, string>();
    for (const t of existingTranslations) {
      if (t.part_name_cn && t.part_name_en) {
        translationCache.set(t.part_name_cn, t.part_name_en);
      }
    }

    // Step 3: Find unique Chinese names that need AI translation
    const uniqueCnNames = new Set<string>();
    for (const part of allParts) {
      if (part.partNameCn && !translationCache.has(part.partNameCn)) {
        uniqueCnNames.add(part.partNameCn);
      }
    }

    // Step 4: Get AI settings
    const settings = await this.dataSource.query(
      "SELECT key, value FROM settings WHERE key IN ('oe_lookup_api_key', 'oe_lookup_api_url', 'oe_lookup_model', 'oe_lookup_api_type', 'translate_api_appid', 'translate_api_key', 'translate_enabled')"
    );
    const settingsMap = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});

    const apiKey = settingsMap.oe_lookup_api_key;
    const apiUrl = settingsMap.oe_lookup_api_url || 'https://api.xiaomimimo.com/v1/chat/completions';
    const model = settingsMap.oe_lookup_model || 'mimo-v2.5-pro';
    const translateAppid = settingsMap.translate_api_appid || '';
    const translateKey = settingsMap.translate_api_key || '';
    const translateEnabled = settingsMap.translate_enabled !== 'false';

    // Step 5: Translate unique names
    let aiTranslated = 0;
    const errors: string[] = [];
    this.logger.log("[Translate] Starting translation...");

    if (uniqueCnNames.size > 0) {
      for (const cnName of uniqueCnNames) {
        let translated = false;

        // Try Baidu Translate first (faster and more stable)
        if (translateAppid && translateKey && translateEnabled) {
          try {
            const enName = await this.baiduTranslate(cnName, translateAppid, translateKey);
            if (enName) {
              translationCache.set(cnName, enName);
              aiTranslated++;
              this.logger.log(`[Translate-Baidu] ${cnName} → ${enName}`);
              translated = true;
            }
          } catch (error: any) {
            this.logger.warn(`[Translate-Baidu] failed for ${cnName}: ${error.message}`);
          }
        }

        // Fallback to AI translation if Baidu failed or not configured
        if (!translated && apiKey) {
          try {
            const prompt = `请将以下汽车配件中文名称翻译成英文，只返回英文翻译结果，不要添加其他内容：${cnName}`;

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
                temperature: 0.1,
              }),
              signal: controller.signal,
            });

            clearTimeout(timeout);

            if (!response.ok) {
              throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const enName = data.choices?.[0]?.message?.content?.trim() || '';

            if (enName) {
              translationCache.set(cnName, enName);
              aiTranslated++;
              this.logger.log(`[Translate-AI] ${cnName} → ${enName}`);
              translated = true;
            }
          } catch (error: any) {
            this.logger.warn(`[Translate-AI] failed for ${cnName}: ${error.message}`);
          }
        }

        if (!translated) {
          errors.push(`${cnName}: 翻译失败`);
        }

        // Add small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 50));
      }
    }

    // Step 6: Update ALL selected parts with translations
    let translated = 0;
    let skipped = 0;
    let failed = 0;

    for (const part of allParts) {
      const cnName = part.partNameCn;
      if (translationCache.has(cnName)) {
        const enName = translationCache.get(cnName);
        if (enName) {
          part.partNameEn = enName;
          await this.partRepo.save(part);
          translated++;
        } else {
          failed++;
        }
      } else {
        failed++;
      }
    }

    // Calculate skipped (parts not in the selected list)
    const skippedCount = totalCount - allParts.length;

    this.logger.log(`[Translate] Returning: total=${totalCount}, translated=${translated}, failed=${failed}, skipped=${skippedCount}, aiTranslated=${aiTranslated}`);
    return {
      total: totalCount,
      translated,
      failed,
      skipped: skippedCount,
      aiTranslated,
      errors
    };
  }

  async getClassifications() {
    return this.partClassRepo.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async createClassification(data: any) {
    const cls = this.partClassRepo.create({
      name: data.name,
      parentId: data.parent_id,
      sortOrder: data.sort_order || 0,
    });
    return this.partClassRepo.save(cls);
  }

  async updateClassification(id: number, data: any) {
    const cls = await this.partClassRepo.findOne({ where: { id } });
    if (!cls) throw new NotFoundException('分类不存在');
    Object.assign(cls, {
      name: data.name ?? cls.name,
      parentId: data.parent_id ?? cls.parentId,
      sortOrder: data.sort_order ?? cls.sortOrder,
    });
    return this.partClassRepo.save(cls);
  }

  async deleteClassification(id: number) {
    const cls = await this.partClassRepo.findOne({ where: { id } });
    if (!cls) throw new NotFoundException('分类不存在');
    await this.partClassRepo.remove(cls);
    return { success: true };
  }

  async getBrands() {
    const result = await this.partRepo.createQueryBuilder('part')
      .select('DISTINCT part.brand', 'brand')
      .where('part.brand IS NOT NULL AND part.brand != :empty', { empty: '' })
      .orderBy('part.brand')
      .getRawMany();
    return result.map(r => r.brand);
  }

  async getCarModels() {
    const result = await this.partRepo.createQueryBuilder('part')
      .select('DISTINCT part.car_model', 'carModel')
      .where('part.car_model IS NOT NULL AND part.car_model != :empty', { empty: '' })
      .orderBy('part.car_model')
      .getRawMany();
    return result.map(r => r.carModel);
  }

  async getPartTypes() {
    const result = await this.partRepo.createQueryBuilder('part')
      .select('DISTINCT part.part_type', 'partType')
      .where('part.part_type IS NOT NULL AND part.part_type != :empty', { empty: '' })
      .orderBy('part.part_type')
      .getRawMany();
    return result.map(r => r.partType);
  }
}
