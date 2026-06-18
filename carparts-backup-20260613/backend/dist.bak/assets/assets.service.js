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
var AssetsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const image_asset_entity_1 = require("./entities/image-asset.entity");
const asset_tag_entity_1 = require("./entities/asset-tag.entity");
const asset_classification_entity_1 = require("./entities/asset-classification.entity");
const part_entity_1 = require("../parts/entities/part.entity");
const image_processing_service_1 = require("./image-processing.service");
const ocr_service_1 = require("./ocr.service");
const image_recognition_service_1 = require("./image-recognition.service");
const settings_service_1 = require("../settings/settings.service");
const paginated_response_dto_1 = require("../common/dto/paginated-response.dto");
const uuid_1 = require("uuid");
let AssetsService = AssetsService_1 = class AssetsService {
    assetRepo;
    tagRepo;
    classRepo;
    partRepo;
    imageProcessing;
    ocrService;
    recognitionService;
    settingsSvc;
    logger = new common_1.Logger(AssetsService_1.name);
    oeLookupCache = new Map();
    constructor(assetRepo, tagRepo, classRepo, partRepo, imageProcessing, ocrService, recognitionService, settingsSvc) {
        this.assetRepo = assetRepo;
        this.tagRepo = tagRepo;
        this.classRepo = classRepo;
        this.partRepo = partRepo;
        this.imageProcessing = imageProcessing;
        this.ocrService = ocrService;
        this.recognitionService = recognitionService;
        this.settingsSvc = settingsSvc;
    }
    async upload(file, data) {
        const mimeType = file.mimetype || 'application/octet-stream';
        const isVideo = mimeType.startsWith('video/');
        let saved;
        let thumbnails;
        const uuid = (0, uuid_1.v4)();
        if (isVideo) {
            saved = await this.imageProcessing.saveVideo(file.buffer, file.originalname, mimeType);
            const datePath = new Date().toISOString().slice(0, 7).replace('-', '/');
            const videoUuid = path_1.default.basename(saved.filePath, path_1.default.extname(saved.filePath));
            thumbnails = await this.imageProcessing.extractVideoThumbnail(this.imageProcessing.getAbsolutePath(saved.filePath), videoUuid);
        }
        else {
            saved = await this.imageProcessing.saveOriginal(file.buffer, file.originalname);
            const imgUuid = path_1.default.basename(saved.filePath, path_1.default.extname(saved.filePath));
            thumbnails = await this.imageProcessing.generateThumbnails(file.buffer, imgUuid);
        }
        const asset = this.assetRepo.create({
            partId: data.part_id || undefined,
            type: isVideo ? 'video' : 'image',
            filePath: saved.filePath,
            fileName: saved.fileName,
            fileSize: file.size,
            width: saved.width,
            height: saved.height,
            mimeType: saved.mimeType,
            duration: saved.duration || 0,
            classificationId: data.classification_id || undefined,
            category: data.category || '',
            thumbnailSmallPath: thumbnails.small,
            thumbnailMediumPath: thumbnails.medium,
            thumbnailLargePath: thumbnails.large,
            ocrStatus: isVideo ? 'skipped' : 'pending',
            recognitionStatus: isVideo ? 'skipped' : 'pending',
            uploadedBy: data.uploaded_by,
        });
        await this.assetRepo.save(asset);
        if (data.tag_ids?.length) {
            for (const tagId of data.tag_ids) {
                await this.assetRepo.query('INSERT INTO image_asset_tags (image_asset_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [asset.id, tagId]);
                await this.tagRepo.increment({ id: tagId }, 'usageCount', 1);
            }
        }
        return this.findOne(asset.id);
    }
    async batchUpload(files, data) {
        const results = [];
        for (const file of files) {
            try {
                const asset = await this.upload(file, { classification_id: data.classification_id, uploaded_by: data.uploaded_by });
                results.push({ success: true, asset });
            }
            catch (error) {
                results.push({ success: false, file: file.originalname, error: error.message });
            }
        }
        return results;
    }
    async processInBackground(assetId, filePath) {
        const absPath = this.imageProcessing.getAbsolutePath(filePath);
        try {
            await this.assetRepo.update(assetId, { ocrStatus: 'processing' });
            const ocr = await this.ocrService.recognizeText(absPath);
            await this.assetRepo.update(assetId, { ocrText: ocr.text, ocrStatus: ocr.status });
            await this.assetRepo.update(assetId, { recognitionStatus: 'processing' });
            const recognition = await this.recognitionService.recognize(absPath);
            const aiOeNumber = recognition.result.oe_numbers?.[0] || '';
            const updateData = {
                recognitionConfidence: recognition.result.confidence,
                recognitionResult: recognition.result,
                recognitionStatus: recognition.status,
            };
            if (aiOeNumber) {
                updateData.recognizedOeNumber = aiOeNumber;
            }
            if (recognition.result.part_type) {
                updateData.recognizedPartType = recognition.result.part_type;
            }
            if (recognition.result.brand) {
                updateData.recognizedBrand = recognition.result.brand;
            }
            const parsed = this.parseOcrText(ocr.text);
            if (!updateData.recognizedOeNumber && parsed.oeNumber) {
                updateData.recognizedOeNumber = parsed.oeNumber;
            }
            if (!updateData.recognizedBrand && parsed.brand) {
                updateData.recognizedBrand = parsed.brand;
            }
            if (!updateData.recognizedPartType && parsed.partType) {
                updateData.recognizedPartType = parsed.partType;
            }
            await this.assetRepo.update(assetId, updateData);
            const existingAsset = await this.assetRepo.findOne({ where: { id: assetId } });
            const oeToMatch = aiOeNumber || existingAsset?.recognizedOeNumber;
            if (oeToMatch) {
                const part = await this.partRepo.findOne({ where: { oeNumber: oeToMatch } });
                if (part) {
                    await this.assetRepo.update(assetId, { partId: part.id, partNameCn: part.partNameCn || '', partNameEn: part.partNameEn || '' });
                    this.logger.log(`Auto-linked asset ${assetId} to part ${part.id} (OE: ${oeToMatch})`);
                }
                else {
                    const aiResult = await this.lookupPartNameByOE(oeToMatch);
                    if (aiResult) {
                        const nameUpdate = {};
                        if (aiResult.partNameCn)
                            nameUpdate.partNameCn = aiResult.partNameCn;
                        if (aiResult.partNameEn)
                            nameUpdate.partNameEn = aiResult.partNameEn;
                        if (aiResult.brand && !updateData.recognizedBrand)
                            nameUpdate.recognizedBrand = aiResult.brand;
                        if (aiResult.partType && !updateData.recognizedPartType)
                            nameUpdate.recognizedPartType = aiResult.partType;
                        if (Object.keys(nameUpdate).length) {
                            await this.assetRepo.update(assetId, nameUpdate);
                        }
                    }
                }
            }
        }
        catch (error) {
            this.logger.error(`Background processing failed for asset ${assetId}: ${error.message}`);
            await this.assetRepo.update(assetId, { ocrStatus: 'error', recognitionStatus: 'error' });
        }
    }
    async findAll(page = 1, pageSize = 20, filters) {
        const qb = this.assetRepo.createQueryBuilder('a');
        if (filters?.type)
            qb.andWhere('a.type = :type', { type: filters.type });
        if (filters?.classification_id)
            qb.andWhere('a.classification_id = :cid', { cid: filters.classification_id });
        if (filters?.part_id)
            qb.andWhere('a.part_id = :pid', { pid: filters.part_id });
        if (filters?.category)
            qb.andWhere('a.category = :cat', { cat: filters.category });
        if (filters?.oe_number)
            qb.andWhere('a.recognized_oe_number ILIKE :oe', { oe: `%${filters.oe_number}%` });
        if (filters?.part_type)
            qb.andWhere('a.recognized_part_type ILIKE :pt', { pt: `%${filters.part_type}%` });
        if (filters?.brand)
            qb.andWhere('a.recognized_brand ILIKE :br', { br: `%${filters.brand}%` });
        if (filters?.keyword) {
            qb.andWhere('(a.file_name ILIKE :kw OR a.ocr_text ILIKE :kw OR a.recognized_oe_number ILIKE :kw OR a.tags ILIKE :kw)', { kw: `%${filters.keyword}%` });
        }
        if (filters?.tag_ids?.length) {
            qb.innerJoin('image_asset_tags', 'iat', 'iat.image_asset_id = a.id')
                .andWhere('iat.tag_id IN (:...tids)', { tids: filters.tag_ids });
        }
        qb.orderBy('a.created_at', 'DESC').skip((page - 1) * pageSize).take(pageSize);
        const [items, total] = await qb.getManyAndCount();
        return new paginated_response_dto_1.PaginatedResponseDto(items, total, page, pageSize);
    }
    async findOne(id) {
        const asset = await this.assetRepo.findOne({ where: { id } });
        if (!asset)
            throw new common_1.NotFoundException('素材不存在');
        const tags = await this.tagRepo.createQueryBuilder('t')
            .innerJoin('image_asset_tags', 'iat', 'iat.tag_id = t.id')
            .where('iat.image_asset_id = :id', { id })
            .getMany();
        return { ...asset, tags };
    }
    async update(id, data) {
        const asset = await this.assetRepo.findOne({ where: { id } });
        if (!asset)
            throw new common_1.NotFoundException('素材不存在');
        if (data.classification_id !== undefined)
            asset.classificationId = data.classification_id;
        if (data.part_id !== undefined)
            asset.partId = data.part_id;
        if (data.category !== undefined)
            asset.category = data.category;
        if (data.recognized_oe_number !== undefined)
            asset.recognizedOeNumber = data.recognized_oe_number;
        if (data.recognized_part_type !== undefined)
            asset.recognizedPartType = data.recognized_part_type;
        if (data.recognized_brand !== undefined)
            asset.recognizedBrand = data.recognized_brand;
        if (data.part_name_cn !== undefined)
            asset.partNameCn = data.part_name_cn;
        if (data.part_name_en !== undefined)
            asset.partNameEn = data.part_name_en;
        if (data.is_primary !== undefined) {
            asset.isPrimary = data.is_primary;
            if (data.is_primary && asset.partId) {
                await this.assetRepo.update({ partId: asset.partId, id: { $ne: id } }, { isPrimary: false });
            }
        }
        await this.assetRepo.save(asset);
        if (data.tag_ids) {
            await this.assetRepo.query('DELETE FROM image_asset_tags WHERE image_asset_id = $1', [id]);
            for (const tagId of data.tag_ids) {
                await this.assetRepo.query('INSERT INTO image_asset_tags (image_asset_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, tagId]);
            }
        }
        return this.findOne(id);
    }
    async remove(id) {
        const asset = await this.assetRepo.findOne({ where: { id } });
        if (!asset)
            throw new common_1.NotFoundException('素材不存在');
        await this.deleteAssetFiles(asset);
        await this.assetRepo.remove(asset);
    }
    async batchDelete(ids) {
        let deleted = 0;
        for (const id of ids) {
            try {
                const asset = await this.assetRepo.findOne({ where: { id } });
                if (asset) {
                    await this.deleteAssetFiles(asset);
                    await this.assetRepo.remove(asset);
                    deleted++;
                }
            }
            catch (e) {
                this.logger.error(`Batch delete failed for ${id}: ${e.message}`);
            }
        }
        return { deleted };
    }
    async batchClassify(ids, classificationId) {
        await this.assetRepo.createQueryBuilder()
            .update()
            .set({ classificationId })
            .where('id IN (:...ids)', { ids })
            .execute();
        return { updated: ids.length };
    }
    async batchTag(ids, tagIds) {
        for (const id of ids) {
            for (const tagId of tagIds) {
                await this.assetRepo.query('INSERT INTO image_asset_tags (image_asset_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, tagId]);
            }
        }
        return { updated: ids.length };
    }
    async batchUpdate(ids, data) {
        const set = {};
        if (data.recognized_oe_number !== undefined)
            set.recognizedOeNumber = data.recognized_oe_number;
        if (data.recognized_part_type !== undefined)
            set.recognizedPartType = data.recognized_part_type;
        if (data.recognized_brand !== undefined)
            set.recognizedBrand = data.recognized_brand;
        if (data.part_name_cn !== undefined)
            set.partNameCn = data.part_name_cn;
        if (data.part_name_en !== undefined)
            set.partNameEn = data.part_name_en;
        if (Object.keys(set).length === 0)
            return { updated: 0 };
        await this.assetRepo.createQueryBuilder()
            .update()
            .set(set)
            .where('id IN (:...ids)', { ids })
            .execute();
        return { updated: ids.length };
    }
    async recognizeAsset(id, options) {
        const asset = await this.assetRepo.findOne({ where: { id } });
        if (!asset)
            throw new common_1.NotFoundException('素材不存在');
        if (asset.type === 'video') {
            throw new common_1.BadRequestException('视频不支持 OCR 和 AI 识别');
        }
        const doOcr = options.ocr === true;
        const doAi = options.ai === true;
        const doOeLookup = options.oeLookup === true;
        if (doOcr) {
            await this.assetRepo.update(id, { ocrStatus: 'processing' });
            const absPath = this.imageProcessing.getAbsolutePath(asset.filePath);
            try {
                const ocr = await this.ocrService.recognizeText(absPath);
                await this.assetRepo.update(id, { ocrText: ocr.text, ocrStatus: ocr.status });
                if (ocr.text) {
                    const parsed = this.parseOcrText(ocr.text);
                    const ocrUpdate = {};
                    if (parsed.oeNumber && !asset.recognizedOeNumber)
                        ocrUpdate.recognizedOeNumber = this.normalizeOeNumber(parsed.oeNumber);
                    if (parsed.brand && !asset.recognizedBrand)
                        ocrUpdate.recognizedBrand = parsed.brand;
                    if (parsed.partType && !asset.recognizedPartType)
                        ocrUpdate.recognizedPartType = parsed.partType;
                    if (Object.keys(ocrUpdate).length) {
                        await this.assetRepo.update(id, ocrUpdate);
                        this.logger.log(`[OCR Parse] Asset ${id}: ${JSON.stringify(ocrUpdate)}`);
                    }
                }
            }
            catch (e) {
                await this.assetRepo.update(id, { ocrStatus: 'error' });
            }
        }
        if (doAi) {
            const originalData = {
                recognizedOeNumber: asset.recognizedOeNumber,
                recognizedPartType: asset.recognizedPartType,
                recognizedBrand: asset.recognizedBrand,
                partNameCn: asset.partNameCn,
                partNameEn: asset.partNameEn,
                recognitionConfidence: asset.recognitionConfidence,
                recognitionResult: asset.recognitionResult,
            };
            await this.assetRepo.update(id, { recognitionStatus: 'processing' });
            const absPath = this.imageProcessing.getAbsolutePath(asset.filePath);
            try {
                const recognition = await this.recognitionService.recognize(absPath);
                const aiOeNumber = recognition.result.oe_numbers?.[0] || '';
                const updateData = {
                    recognitionConfidence: recognition.result.confidence,
                    recognitionResult: { ...recognition.result, _previousData: originalData },
                    recognitionStatus: recognition.status,
                };
                if (aiOeNumber)
                    updateData.recognizedOeNumber = this.normalizeOeNumber(aiOeNumber);
                if (recognition.result.part_type)
                    updateData.recognizedPartType = recognition.result.part_type;
                if (recognition.result.brand)
                    updateData.recognizedBrand = recognition.result.brand;
                if (recognition.result.part_name_cn && !asset.partNameCn)
                    updateData.partNameCn = recognition.result.part_name_cn;
                if (recognition.result.part_name_en && !asset.partNameEn)
                    updateData.partNameEn = recognition.result.part_name_en;
                const oeForBrand = updateData.recognizedOeNumber || aiOeNumber;
                this.logger.log(`[AI Brand Check] Asset ${id}: brand="${recognition.result.brand}", updateData.brand="${updateData.recognizedBrand}", oeForBrand="${oeForBrand}"`);
                if (!updateData.recognizedBrand && oeForBrand) {
                    try {
                        const brandResult = await this.lookupBrandByOE(oeForBrand);
                        if (brandResult) {
                            updateData.recognizedBrand = brandResult;
                            this.logger.log(`[AI Brand Fallback] Asset ${id}: OE ${oeForBrand} → brand ${brandResult}`);
                        }
                    }
                    catch (e) {
                        this.logger.warn(`[AI Brand Fallback] Failed: ${e.message}`);
                    }
                }
                await this.assetRepo.update(id, updateData);
            }
            catch (e) {
                await this.assetRepo.update(id, { recognitionStatus: 'error' });
            }
        }
        if (doOeLookup) {
            const refreshedAsset = await this.assetRepo.findOne({ where: { id } });
            const oeToMatch = refreshedAsset?.recognizedOeNumber;
            if (oeToMatch) {
                const partMatch = {};
                const part = await this.partRepo.findOne({ where: { oeNumber: oeToMatch } });
                if (part) {
                    partMatch.partId = part.id;
                    partMatch.partNameCn = part.partNameCn || '';
                    partMatch.partNameEn = part.partNameEn || '';
                    if (!refreshedAsset?.recognizedBrand && part.brand) {
                        partMatch.recognizedBrand = part.brand;
                    }
                    if (!refreshedAsset?.classificationId && part.classificationId) {
                        partMatch.classificationId = part.classificationId;
                    }
                    this.logger.log(`[Part Match] Asset ${id} → Part ${part.id} (OE: ${oeToMatch})`);
                }
                else {
                    const aiResult = await this.lookupPartNameByOE(oeToMatch, {
                        brand: refreshedAsset?.recognizedBrand,
                        partType: refreshedAsset?.recognizedPartType,
                    });
                    if (aiResult) {
                        if (aiResult.partNameCn)
                            partMatch.partNameCn = aiResult.partNameCn;
                        if (aiResult.partNameEn)
                            partMatch.partNameEn = aiResult.partNameEn;
                    }
                }
                if (Object.keys(partMatch).length) {
                    await this.assetRepo.update(id, partMatch);
                }
            }
        }
        return this.findOne(id);
    }
    async batchRecognize(ids, options) {
        let processed = 0;
        let failed = 0;
        const errors = [];
        for (const id of ids) {
            try {
                await this.recognizeAsset(id, options);
                processed++;
            }
            catch (e) {
                failed++;
                errors.push(`ID ${id}: ${e.message}`);
                this.logger.error(`Batch recognize failed for ${id}: ${e.message}`);
            }
        }
        return { processed, failed, errors: errors.length > 0 ? errors : undefined };
    }
    async undoRecognize(id) {
        const asset = await this.assetRepo.findOne({ where: { id } });
        if (!asset)
            throw new common_1.NotFoundException('素材不存在');
        const recognitionResult = asset.recognitionResult;
        const previousData = recognitionResult?._previousData;
        if (previousData) {
            await this.assetRepo.update(id, {
                recognizedOeNumber: previousData.recognizedOeNumber || '',
                recognizedPartType: previousData.recognizedPartType || '',
                recognizedBrand: previousData.recognizedBrand || '',
                partNameCn: previousData.partNameCn || '',
                partNameEn: previousData.partNameEn || '',
                recognitionConfidence: previousData.recognitionConfidence || 0,
                recognitionResult: previousData.recognitionResult,
                recognitionStatus: 'pending',
            });
        }
        else {
            await this.assetRepo.update(id, {
                recognizedOeNumber: '',
                recognizedPartType: '',
                recognizedBrand: '',
                partNameCn: '',
                partNameEn: '',
                recognitionConfidence: 0,
                recognitionResult: null,
                recognitionStatus: 'pending',
            });
        }
        return this.findOne(id);
    }
    async batchUndoRecognize(ids) {
        let processed = 0;
        let failed = 0;
        for (const id of ids) {
            try {
                await this.undoRecognize(id);
                processed++;
            }
            catch (e) {
                failed++;
                this.logger.error(`Batch undo failed for ${id}: ${e.message}`);
            }
        }
        return { processed, failed };
    }
    normalizeOeNumber(raw) {
        if (!raw)
            return '';
        const s = raw.toUpperCase().trim();
        if (/^\d{4,6}-[A-Z0-9]{3,8}$/.test(s))
            return s;
        const spaceMatch = s.match(/^(\d{4,6})\s+([A-Z0-9]{3,8})$/);
        if (spaceMatch)
            return `${spaceMatch[1]}-${spaceMatch[2]}`;
        const mergedMatch = s.match(/^(\d{5})(\d[A-Z0-9]{2,6})$/);
        if (mergedMatch)
            return `${mergedMatch[1]}-${mergedMatch[2]}`;
        const mergedMatch2 = s.match(/^(\d{5})([A-Z0-9]{3,8})$/);
        if (mergedMatch2)
            return `${mergedMatch2[1]}-${mergedMatch2[2]}`;
        const fallback = s.match(/^(\d{4,6})\s*([A-Z0-9]{3,8})$/);
        if (fallback)
            return `${fallback[1]}-${fallback[2]}`;
        return s;
    }
    parseOcrText(ocrText) {
        const lines = ocrText.split('\n').map(l => l.trim()).filter(Boolean);
        const fullText = lines.join(' ').toUpperCase();
        const BRANDS = {
            'HYUNDAI': 'HYUNDAI',
            'KIA': 'KIA',
            'TOYOTA': 'TOYOTA', 'LEXUS': 'TOYOTA',
            'HONDA': 'HONDA', 'ACURA': 'HONDA',
            'NISSAN': 'NISSAN', 'INFINITI': 'NISSAN',
            'MAZDA': 'MAZDA',
            'SUBARU': 'SUBARU',
            'MITSUBISHI': 'MITSUBISHI',
            'SUZUKI': 'SUZUKI',
            'BMW': 'BMW', 'MINI': 'BMW',
            'MERCEDES': 'MERCEDES', 'BENZ': 'MERCEDES', 'MERCEDES-BENZ': 'MERCEDES',
            'AUDI': 'AUDI',
            'VOLKSWAGEN': 'VOLKSWAGEN', 'VW': 'VOLKSWAGEN',
            'FORD': 'FORD',
            'GM': 'GM', 'CHEVROLET': 'GM', 'BUICK': 'GM', 'CADILLAC': 'GM',
            'DENSO': 'DENSO',
            'BOSCH': 'BOSCH',
            'NGK': 'NGK',
            'VALEO': 'VALEO',
            'MAHLE': 'MAHLE',
            'MANN': 'MANN',
            'DELPHI': 'DELPHI',
            'CONTINENTAL': 'CONTINENTAL',
            'ZF': 'ZF',
            'AISIN': 'AISIN',
            'GATES': 'GATES',
            'DAYCO': 'DAYCO',
            'MOBIL': 'MOBIL',
            'CASTROL': 'CASTROL',
        };
        let brand = '';
        for (const [keyword, brandName] of Object.entries(BRANDS)) {
            if (fullText.includes(keyword.toUpperCase())) {
                brand = brandName;
                break;
            }
        }
        let oeNumber = '';
        for (const line of lines) {
            const upperLine = line.toUpperCase().trim();
            if (upperLine.length < 5)
                continue;
            if (/^(MADE IN|GENUINE|PARTS|FILTER|ASSY|COIL|ENGINE|OIL)/.test(upperLine))
                continue;
            const dashMatch = upperLine.match(/^(\d{4,6})-([A-Z0-9]{3,8})$/);
            if (dashMatch) {
                oeNumber = `${dashMatch[1]}-${dashMatch[2]}`;
                break;
            }
            const spaceMatch = upperLine.match(/^(\d{4,6})\s+([A-Z0-9]{3,8})$/);
            if (spaceMatch) {
                oeNumber = `${spaceMatch[1]}-${spaceMatch[2]}`;
                break;
            }
        }
        if (!oeNumber) {
            for (const line of lines) {
                const upperLine = line.toUpperCase().trim();
                if (upperLine.length < 8)
                    continue;
                if (/^(MADE IN|GENUINE|PARTS|FILTER|ASSY|COIL|ENGINE|OIL)/.test(upperLine))
                    continue;
                const mergedMatch = upperLine.match(/^(\d{5})(\d[A-Z0-9]{2,6})$/);
                if (mergedMatch) {
                    oeNumber = `${mergedMatch[1]}-${mergedMatch[2]}`;
                    break;
                }
                const mergedMatch2 = upperLine.match(/^(\d{5})([A-Z0-9]{3,8})$/);
                if (mergedMatch2) {
                    oeNumber = `${mergedMatch2[1]}-${mergedMatch2[2]}`;
                    break;
                }
            }
        }
        if (!oeNumber) {
            for (const line of lines) {
                const upperLine = line.toUpperCase().trim();
                if (upperLine.length < 8 || upperLine.length > 15)
                    continue;
                if (!/^\d+$/.test(upperLine))
                    continue;
                if (/^(MADE IN|GENUINE|PARTS|FILTER|ASSY|COIL|ENGINE|OIL)/.test(upperLine))
                    continue;
                oeNumber = `${upperLine.slice(0, 5)}-${upperLine.slice(5)}`;
                break;
            }
        }
        let partType = '';
        const partTypeMap = {
            'FILTER': '滤清器', 'OIL FILTER': '机油滤清器', 'AIR FILTER': '空气滤清器',
            'FUEL FILTER': '燃油滤清器', 'CABIN FILTER': '空调滤清器',
            'BRAKE': '刹车片', 'PAD': '刹车片', 'DISC': '刹车盘',
            'SPARK': '火花塞', 'PLUG': '火花塞',
            'BELT': '皮带', 'TIMING': '正时皮带',
            'PUMP': '泵', 'WATER PUMP': '水泵', 'OIL PUMP': '机油泵',
            'COIL': '点火线圈', 'IGNITION': '点火线圈',
            'SENSOR': '传感器', 'OXYGEN': '氧传感器',
            'GASKET': '密封垫', 'SEAL': '密封件',
            'BEARING': '轴承', 'BUSHING': '衬套',
            'STRUT': '减震器', 'SHOCK': '减震器',
            'TIE ROD': '转向拉杆', 'BALL JOINT': '球头',
            'ALTERNATOR': '发电机', 'STARTER': '起动机',
            'RADIATOR': '散热器', 'CONDENSER': '冷凝器',
            'WIPER': '雨刮片', 'BLADE': '雨刮片',
        };
        for (const [keyword, typeName] of Object.entries(partTypeMap)) {
            if (fullText.includes(keyword)) {
                partType = typeName;
                break;
            }
        }
        return { oeNumber, brand, partType };
    }
    async deleteAssetFiles(asset) {
        const uploadDir = process.env.UPLOAD_DEST || './uploads';
        const filesToDelete = [asset.filePath, asset.thumbnailSmallPath, asset.thumbnailMediumPath, asset.thumbnailLargePath].filter(Boolean);
        for (const f of filesToDelete) {
            try {
                await promises_1.default.unlink(path_1.default.join(uploadDir, f));
            }
            catch { }
        }
    }
    async getClassifications() {
        return this.classRepo.find({ order: { sortOrder: 'ASC' } });
    }
    async createClassification(data) {
        return this.classRepo.save({ name: data.name, parentId: data.parent_id, description: data.description || '' });
    }
    async deleteClassification(id) { await this.classRepo.delete(id); }
    async getTags() { return this.tagRepo.find({ order: { usageCount: 'DESC' } }); }
    async createTag(data) {
        return this.tagRepo.save({ name: data.name, color: data.color || '#6B7280' });
    }
    async deleteTag(id) { await this.tagRepo.delete(id); }
    async cropImage(id, x, y, width, height) {
        const asset = await this.assetRepo.findOne({ where: { id } });
        if (!asset)
            throw new common_1.NotFoundException('素材不存在');
        const absPath = this.imageProcessing.getAbsolutePath(asset.filePath);
        const buffer = await promises_1.default.readFile(absPath);
        const cropped = await this.imageProcessing.cropImage(buffer, x, y, width, height);
        await promises_1.default.writeFile(absPath, cropped);
        const thumbnails = await this.imageProcessing.generateThumbnails(cropped, path_1.default.basename(asset.filePath, path_1.default.extname(asset.filePath)));
        asset.width = width;
        asset.height = height;
        asset.thumbnailSmallPath = thumbnails.small;
        asset.thumbnailMediumPath = thumbnails.medium;
        asset.thumbnailLargePath = thumbnails.large;
        return this.assetRepo.save(asset);
    }
    async addWatermark(id, text) {
        const asset = await this.assetRepo.findOne({ where: { id } });
        if (!asset)
            throw new common_1.NotFoundException('素材不存在');
        const absPath = this.imageProcessing.getAbsolutePath(asset.filePath);
        const buffer = await promises_1.default.readFile(absPath);
        const watermarked = await this.imageProcessing.addWatermark(buffer, text);
        await promises_1.default.writeFile(absPath, watermarked);
        return asset;
    }
    async lookupBrandByOE(oeNumber) {
        this.logger.log(`[lookupBrandByOE] Looking up brand for OE: ${oeNumber}`);
        try {
            const settings = await this.settingsSvc.getAll();
            const apiKey = settings.ai_recognition_api_key || settings.oe_lookup_api_key || process.env.ZHIPU_API_KEY;
            if (!apiKey) {
                this.logger.warn(`[lookupBrandByOE] No API key`);
                return '';
            }
            const apiType = settings.ai_recognition_api_type || 'zhipu';
            const PROVIDER_URLS = {
                zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
                deepseek: 'https://api.deepseek.com/v1/chat/completions',
                qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
                openai: 'https://api.openai.com/v1/chat/completions',
            };
            const apiUrl = PROVIDER_URLS[apiType] || PROVIDER_URLS.zhipu;
            const model = apiType === 'zhipu' ? 'glm-4-flash' : (settings.ai_recognition_model || 'gpt-4o-mini');
            this.logger.log(`[lookupBrandByOE] Using ${apiType}/${model}`);
            const prompt = `OE号码 "${oeNumber}" 属于哪个汽车品牌？只返回品牌英文名（如 HYUNDAI、TOYOTA、BOSCH），不要返回其他内容。`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 100, temperature: 0.1 }),
            });
            const data = await response.json();
            if (data.error) {
                this.logger.error(`[lookupBrandByOE] API error: ${JSON.stringify(data.error)}`);
                return '';
            }
            const text = (data.choices?.[0]?.message?.content || '').trim();
            const result = text.replace(/["'.\s,，。]/g, '') || '';
            this.logger.log(`[lookupBrandByOE] Result: "${result}"`);
            return result;
        }
        catch (e) {
            this.logger.error(`[lookupBrandByOE] Error: ${e.message}`);
            return '';
        }
    }
    async lookupPartNameByOE(oeNumber, context) {
        if (this.oeLookupCache.has(oeNumber)) {
            return this.oeLookupCache.get(oeNumber);
        }
        const settings = await this.settingsSvc.getAll();
        if (settings.oe_lookup_enabled === 'false')
            return null;
        const apiKey = settings.oe_lookup_api_key || process.env.ZHIPU_API_KEY;
        if (!apiKey)
            return null;
        const apiType = settings.oe_lookup_api_type || 'zhipu';
        const preset = OE_PROVIDER_PRESETS[apiType] || OE_PROVIDER_PRESETS.zhipu;
        const apiUrl = settings.oe_lookup_api_url || preset.url;
        const model = settings.oe_lookup_model || preset.model;
        try {
            let prompt = `你是汽车配件OE号码查询专家。请根据OE号码 "${oeNumber}" 查询对应的配件中文名称和英文名称。返回严格JSON：{"partNameCn":"中文名","partNameEn":"英文名"}。只返回JSON。`;
            if (context?.brand || context?.partType) {
                prompt += `\n已知信息：`;
                if (context.brand)
                    prompt += `品牌为"${context.brand}"`;
                if (context.partType)
                    prompt += `，配件类型为"${context.partType}"`;
                prompt += `。请根据这些信息给出准确的配件名称。`;
            }
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 1024, temperature: 0.1 }),
            });
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content || '{}';
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            const lookupResult = {
                partNameCn: result.partNameCn || '',
                partNameEn: result.partNameEn || '',
                brand: result.brand || '',
                partType: result.partType || '',
            };
            this.oeLookupCache.set(oeNumber, lookupResult);
            this.logger.log(`[OE Lookup] ${oeNumber} → ${JSON.stringify(lookupResult)}`);
            return lookupResult;
        }
        catch (error) {
            this.logger.error(`[OE Lookup] Failed for ${oeNumber}: ${error.message}`);
            return null;
        }
    }
};
exports.AssetsService = AssetsService;
exports.AssetsService = AssetsService = AssetsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(image_asset_entity_1.ImageAsset)),
    __param(1, (0, typeorm_1.InjectRepository)(asset_tag_entity_1.AssetTag)),
    __param(2, (0, typeorm_1.InjectRepository)(asset_classification_entity_1.AssetClassification)),
    __param(3, (0, typeorm_1.InjectRepository)(part_entity_1.Part)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        image_processing_service_1.ImageProcessingService,
        ocr_service_1.OcrService,
        image_recognition_service_1.ImageRecognitionService,
        settings_service_1.SettingsService])
], AssetsService);
const OE_PROVIDER_PRESETS = {
    zhipu: { url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4-flash' },
    deepseek: { url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
    qwen: { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
    doubao: { url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-pro-32k' },
    hunyuan: { url: 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions', model: 'hunyuan-standard' },
    kimi: { url: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
    mimo: { url: 'https://api.xiaomi.com/v1/chat/completions', model: 'mimo' },
    bailian: { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
    volcengine: { url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-pro-32k' },
    openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
    custom: { url: '', model: '' },
};
//# sourceMappingURL=assets.service.js.map