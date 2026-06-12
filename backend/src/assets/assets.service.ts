import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import path from 'path';
import fs from 'fs/promises';
import archiver from 'archiver';
import { ImageAsset } from './entities/image-asset.entity';
import { AssetTag } from './entities/asset-tag.entity';
import { AssetClassification } from './entities/asset-classification.entity';
import { Part } from '../parts/entities/part.entity';
import { ImageProcessingService } from './image-processing.service';
import { OcrService } from './ocr.service';
import { ImageRecognitionService } from './image-recognition.service';
import { SettingsService } from '../settings/settings.service';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);
  private oeLookupCache = new Map<string, { partNameCn: string; partNameEn: string; brand: string; partType: string }>();

  constructor(
    @InjectRepository(ImageAsset) private assetRepo: Repository<ImageAsset>,
    @InjectRepository(AssetTag) private tagRepo: Repository<AssetTag>,
    @InjectRepository(AssetClassification) private classRepo: Repository<AssetClassification>,
    @InjectRepository(Part) private partRepo: Repository<Part>,
    private imageProcessing: ImageProcessingService,
    private ocrService: OcrService,
    private recognitionService: ImageRecognitionService,
    private settingsSvc: SettingsService,
  ) {}

  // ---- Upload ----
  async upload(file: Express.Multer.File, data: { part_id?: number; classification_id?: number; category?: string; tag_ids?: number[]; uploaded_by?: number }) {
    const mimeType = file.mimetype || 'application/octet-stream';
    const isVideo = mimeType.startsWith('video/');

    let saved: { filePath: string; fileName: string; width: number; height: number; mimeType: string; duration?: number };
    let thumbnails: { small: string; medium: string; large: string };
    const uuid = uuidv4();

    if (isVideo) {
      saved = await this.imageProcessing.saveVideo(file.buffer, file.originalname, mimeType);
      const datePath = new Date().toISOString().slice(0, 7).replace('-', '/');
      const videoUuid = path.basename(saved.filePath, path.extname(saved.filePath));
      thumbnails = await this.imageProcessing.extractVideoThumbnail(
        this.imageProcessing.getAbsolutePath(saved.filePath),
        videoUuid,
      );
    } else {
      saved = await this.imageProcessing.saveOriginal(file.buffer, file.originalname);
      const imgUuid = path.basename(saved.filePath, path.extname(saved.filePath));
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

    // Link tags
    if (data.tag_ids?.length) {
      for (const tagId of data.tag_ids) {
        await this.assetRepo.query(
          'INSERT INTO image_asset_tags (image_asset_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [asset.id, tagId],
        );
        await this.tagRepo.increment({ id: tagId }, 'usageCount', 1);
      }
    }

    // OCR and AI recognition are triggered manually by user

    return this.findOne(asset.id);
  }

  async batchUpload(files: Express.Multer.File[], data: { classification_id?: number; uploaded_by?: number }) {
    const results: any[] = [];
    for (const file of files) {
      try {
        const asset = await this.upload(file, { classification_id: data.classification_id, uploaded_by: data.uploaded_by });
        results.push({ success: true, asset });
      } catch (error) {
        results.push({ success: false, file: file.originalname, error: error.message });
      }
    }
    return results;
  }

  private async processInBackground(assetId: number, filePath: string) {
    const absPath = this.imageProcessing.getAbsolutePath(filePath);
    try {
      // OCR
      await this.assetRepo.update(assetId, { ocrStatus: 'processing' });
      const ocr = await this.ocrService.recognizeText(absPath);
      await this.assetRepo.update(assetId, { ocrText: ocr.text, ocrStatus: ocr.status });

      // AI Recognition
      await this.assetRepo.update(assetId, { recognitionStatus: 'processing' });
      const recognition = await this.recognitionService.recognize(absPath);
      const aiOeNumber = recognition.result.oe_numbers?.[0] || '';
      const updateData: any = {
        recognitionConfidence: recognition.result.confidence,
        recognitionResult: recognition.result as any,
        recognitionStatus: recognition.status,
      };

      // Only update fields if AI found non-empty values (don't overwrite existing with empty)
      if (aiOeNumber) {
        updateData.recognizedOeNumber = aiOeNumber;
      }
      if (recognition.result.part_type) {
        updateData.recognizedPartType = recognition.result.part_type;
      }
      if (recognition.result.brand) {
        updateData.recognizedBrand = recognition.result.brand;
      }

      // Fallback: extract OE number and brand from OCR text if AI didn't find them
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

      // Auto-link to part if OE number found (AI or existing)
      const existingAsset = await this.assetRepo.findOne({ where: { id: assetId } });
      const oeToMatch = aiOeNumber || existingAsset?.recognizedOeNumber;
      if (oeToMatch) {
        const part = await this.partRepo.findOne({ where: { oeNumber: oeToMatch } });
        if (part) {
          await this.assetRepo.update(assetId, { partId: part.id, partNameCn: part.partNameCn || '', partNameEn: part.partNameEn || '' });
          this.logger.log(`Auto-linked asset ${assetId} to part ${part.id} (OE: ${oeToMatch})`);
        } else {
          // No part in DB, use AI to look up part name by OE number
          // Only fill in fields that are still empty (don't overwrite OCR-parsed values)
          const aiResult = await this.lookupPartNameByOE(oeToMatch);
          if (aiResult) {
            const nameUpdate: any = {};
            if (aiResult.partNameCn) nameUpdate.partNameCn = aiResult.partNameCn;
            if (aiResult.partNameEn) nameUpdate.partNameEn = aiResult.partNameEn;
            // Don't overwrite brand/partType if already set from OCR or AI image recognition
            if (aiResult.brand && !updateData.recognizedBrand) nameUpdate.recognizedBrand = aiResult.brand;
            if (aiResult.partType && !updateData.recognizedPartType) nameUpdate.recognizedPartType = aiResult.partType;
            if (Object.keys(nameUpdate).length) {
              await this.assetRepo.update(assetId, nameUpdate);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Background processing failed for asset ${assetId}: ${error.message}`);
      await this.assetRepo.update(assetId, { ocrStatus: 'error', recognitionStatus: 'error' });
    }
  }

  // ---- Query ----
  async findAll(page = 1, pageSize = 20, filters?: {
    classification_id?: number; tag_ids?: number[]; keyword?: string;
    oe_number?: string; part_type?: string; brand?: string;
    part_id?: number; category?: string; type?: string;
  }) {
    const qb = this.assetRepo.createQueryBuilder('a');
    if (filters?.type) qb.andWhere('a.type = :type', { type: filters.type });
    if (filters?.classification_id) qb.andWhere('a.classification_id = :cid', { cid: filters.classification_id });
    if (filters?.part_id) qb.andWhere('a.part_id = :pid', { pid: filters.part_id });
    if (filters?.category) qb.andWhere('a.category = :cat', { cat: filters.category });
    if (filters?.oe_number) qb.andWhere('a.recognized_oe_number ILIKE :oe', { oe: `%${filters.oe_number}%` });
    if (filters?.part_type) qb.andWhere('a.recognized_part_type ILIKE :pt', { pt: `%${filters.part_type}%` });
    if (filters?.brand) qb.andWhere('a.recognized_brand ILIKE :br', { br: `%${filters.brand}%` });
    if (filters?.keyword) {
      qb.andWhere('(a.file_name ILIKE :kw OR a.ocr_text ILIKE :kw OR a.recognized_oe_number ILIKE :kw OR a.tags ILIKE :kw)',
        { kw: `%${filters.keyword}%` });
    }
    if (filters?.tag_ids?.length) {
      qb.innerJoin('image_asset_tags', 'iat', 'iat.image_asset_id = a.id')
        .andWhere('iat.tag_id IN (:...tids)', { tids: filters.tag_ids });
    }
    qb.orderBy('a.created_at', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [items, total] = await qb.getManyAndCount();
    return new PaginatedResponseDto(items, total, page, pageSize);
  }

  async findOne(id: number) {
    const asset = await this.assetRepo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('素材不存在');
    // Get tags
    const tags = await this.tagRepo.createQueryBuilder('t')
      .innerJoin('image_asset_tags', 'iat', 'iat.tag_id = t.id')
      .where('iat.image_asset_id = :id', { id })
      .getMany();
    return { ...asset, tags };
  }

  async update(id: number, data: { classification_id?: number; part_id?: number; category?: string; is_primary?: boolean; tag_ids?: number[]; recognized_oe_number?: string; recognized_part_type?: string; recognized_brand?: string; part_name_cn?: string; part_name_en?: string }) {
    const asset = await this.assetRepo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('素材不存在');
    if (data.classification_id !== undefined) asset.classificationId = data.classification_id;
    if (data.part_id !== undefined) asset.partId = data.part_id;
    if (data.category !== undefined) asset.category = data.category;
    if (data.recognized_oe_number !== undefined) asset.recognizedOeNumber = data.recognized_oe_number;
    if (data.recognized_part_type !== undefined) asset.recognizedPartType = data.recognized_part_type;
    if (data.recognized_brand !== undefined) asset.recognizedBrand = data.recognized_brand;
    if (data.part_name_cn !== undefined) asset.partNameCn = data.part_name_cn;
    if (data.part_name_en !== undefined) asset.partNameEn = data.part_name_en;
    if (data.is_primary !== undefined) {
      asset.isPrimary = data.is_primary;
      if (data.is_primary && asset.partId) {
        await this.assetRepo.update({ partId: asset.partId, id: { $ne: id } as any }, { isPrimary: false });
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

  async remove(id: number) {
    const asset = await this.assetRepo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('素材不存在');
    await this.deleteAssetFiles(asset);
    await this.assetRepo.remove(asset);
  }

  async batchDelete(ids: number[]) {
    let deleted = 0;
    for (const id of ids) {
      try {
        const asset = await this.assetRepo.findOne({ where: { id } });
        if (asset) {
          await this.deleteAssetFiles(asset);
          await this.assetRepo.remove(asset);
          deleted++;
        }
      } catch (e) {
        this.logger.error(`Batch delete failed for ${id}: ${e.message}`);
      }
    }
    return { deleted };
  }

  async batchClassify(ids: number[], classificationId: number) {
    await this.assetRepo.createQueryBuilder()
      .update()
      .set({ classificationId })
      .where('id IN (:...ids)', { ids })
      .execute();
    return { updated: ids.length };
  }

  async batchTag(ids: number[], tagIds: number[]) {
    for (const id of ids) {
      for (const tagId of tagIds) {
        await this.assetRepo.query(
          'INSERT INTO image_asset_tags (image_asset_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, tagId],
        );
      }
    }
    return { updated: ids.length };
  }

  async batchUpdate(ids: number[], data: { recognized_oe_number?: string; recognized_part_type?: string; recognized_brand?: string; part_name_cn?: string; part_name_en?: string }) {
    const set: any = {};
    if (data.recognized_oe_number !== undefined) set.recognizedOeNumber = data.recognized_oe_number;
    if (data.recognized_part_type !== undefined) set.recognizedPartType = data.recognized_part_type;
    if (data.recognized_brand !== undefined) set.recognizedBrand = data.recognized_brand;
    if (data.part_name_cn !== undefined) set.partNameCn = data.part_name_cn;
    if (data.part_name_en !== undefined) set.partNameEn = data.part_name_en;
    if (Object.keys(set).length === 0) return { updated: 0 };
    await this.assetRepo.createQueryBuilder()
      .update()
      .set(set)
      .where('id IN (:...ids)', { ids })
      .execute();
    return { updated: ids.length };
  }

  async recognizeAsset(id: number, options: { ocr?: boolean; ai?: boolean; oeLookup?: boolean }) {
    const asset = await this.assetRepo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('素材不存在');

    // Videos don't support OCR or AI recognition
    if (asset.type === 'video') {
      throw new BadRequestException('视频不支持 OCR 和 AI 识别');
    }

    const doOcr = options.ocr === true;
    const doAi = options.ai === true;
    const doOeLookup = options.oeLookup === true;

    // Step 1: OCR
    if (doOcr) {
      await this.assetRepo.update(id, { ocrStatus: 'processing' });
      const absPath = this.imageProcessing.getAbsolutePath(asset.filePath);
      try {
        const ocr = await this.ocrService.recognizeText(absPath);
        await this.assetRepo.update(id, { ocrText: ocr.text, ocrStatus: ocr.status });

        // Parse OCR text to extract OE number, brand, part type
        if (ocr.text) {
          const parsed = this.parseOcrText(ocr.text);
          const ocrUpdate: any = {};
          if (parsed.oeNumber && !asset.recognizedOeNumber) ocrUpdate.recognizedOeNumber = this.normalizeOeNumber(parsed.oeNumber);
          if (parsed.brand && !asset.recognizedBrand) ocrUpdate.recognizedBrand = parsed.brand;
          if (parsed.partType && !asset.recognizedPartType) ocrUpdate.recognizedPartType = parsed.partType;
          if (Object.keys(ocrUpdate).length) {
            await this.assetRepo.update(id, ocrUpdate);
            this.logger.log(`[OCR Parse] Asset ${id}: ${JSON.stringify(ocrUpdate)}`);
          }
        }
      } catch (e) {
        await this.assetRepo.update(id, { ocrStatus: 'error' });
      }
    }

    // Step 2: AI Image Recognition
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
        const updateData: any = {
          recognitionConfidence: recognition.result.confidence,
          recognitionResult: { ...recognition.result, _previousData: originalData },
          recognitionStatus: recognition.status,
        };

        if (aiOeNumber) updateData.recognizedOeNumber = this.normalizeOeNumber(aiOeNumber);
        if (recognition.result.part_type) updateData.recognizedPartType = recognition.result.part_type;
        if (recognition.result.brand) updateData.recognizedBrand = recognition.result.brand;
        if (recognition.result.part_name_cn && !asset.partNameCn) updateData.partNameCn = recognition.result.part_name_cn;
        if (recognition.result.part_name_en && !asset.partNameEn) updateData.partNameEn = recognition.result.part_name_en;

        // Fallback: if brand is empty but OE number exists, use text model to look up brand
        const oeForBrand = updateData.recognizedOeNumber || aiOeNumber;
        this.logger.log(`[AI Brand Check] Asset ${id}: brand="${recognition.result.brand}", updateData.brand="${updateData.recognizedBrand}", oeForBrand="${oeForBrand}"`);
        if (!updateData.recognizedBrand && oeForBrand) {
          try {
            const brandResult = await this.lookupBrandByOE(oeForBrand);
            if (brandResult) {
              updateData.recognizedBrand = brandResult;
              this.logger.log(`[AI Brand Fallback] Asset ${id}: OE ${oeForBrand} → brand ${brandResult}`);
            }
          } catch (e) {
            this.logger.warn(`[AI Brand Fallback] Failed: ${e.message}`);
          }
        }

        await this.assetRepo.update(id, updateData);
      } catch (e) {
        await this.assetRepo.update(id, { recognitionStatus: 'error' });
      }
    }

    // Step 3: Match part by OE number (only when explicitly requested)
    if (doOeLookup) {
      const refreshedAsset = await this.assetRepo.findOne({ where: { id } });
      const oeToMatch = refreshedAsset?.recognizedOeNumber;
      if (oeToMatch) {
        const partMatch: any = {};
        const part = await this.partRepo.findOne({ where: { oeNumber: oeToMatch } });
        if (part) {
          partMatch.partId = part.id;
          partMatch.partNameCn = part.partNameCn || '';
          partMatch.partNameEn = part.partNameEn || '';
          // Fill brand and classification from part catalog (only if asset field is empty)
          if (!refreshedAsset?.recognizedBrand && part.brand) {
            partMatch.recognizedBrand = part.brand;
          }
          if (!refreshedAsset?.classificationId && part.classificationId) {
            partMatch.classificationId = part.classificationId;
          }
          this.logger.log(`[Part Match] Asset ${id} → Part ${part.id} (OE: ${oeToMatch})`);
        } else {
          // No part in DB, use AI to look up part name by OE number
          // Only fill partNameCn/En - never overwrite brand/partType from OCR/AI
          const aiResult = await this.lookupPartNameByOE(oeToMatch, {
            brand: refreshedAsset?.recognizedBrand,
            partType: refreshedAsset?.recognizedPartType,
          });
          if (aiResult) {
            if (aiResult.partNameCn) partMatch.partNameCn = aiResult.partNameCn;
            if (aiResult.partNameEn) partMatch.partNameEn = aiResult.partNameEn;
          }
        }
        if (Object.keys(partMatch).length) {
          await this.assetRepo.update(id, partMatch);
        }
      }
    }

    return this.findOne(id);
  }

  async batchRecognize(ids: number[], options: { ocr?: boolean; ai?: boolean; oeLookup?: boolean }) {
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];
    for (const id of ids) {
      try {
        await this.recognizeAsset(id, options);
        processed++;
      } catch (e) {
        failed++;
        errors.push(`ID ${id}: ${e.message}`);
        this.logger.error(`Batch recognize failed for ${id}: ${e.message}`);
      }
    }
    return { processed, failed, errors: errors.length > 0 ? errors : undefined };
  }

  async undoRecognize(id: number) {
    const asset = await this.assetRepo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('素材不存在');

    const recognitionResult = asset.recognitionResult as any;
    const previousData = recognitionResult?._previousData;

    if (previousData) {
      // Restore previous data
      await this.assetRepo.update(id, {
        recognizedOeNumber: previousData.recognizedOeNumber || '',
        recognizedPartType: previousData.recognizedPartType || '',
        recognizedBrand: previousData.recognizedBrand || '',
        partNameCn: previousData.partNameCn || '',
        partNameEn: previousData.partNameEn || '',
        recognitionConfidence: previousData.recognitionConfidence || 0,
        recognitionResult: previousData.recognitionResult,
        recognitionStatus: 'pending',
      } as any);
    } else {
      // No previous data, just clear recognition
      await this.assetRepo.update(id, {
        recognizedOeNumber: '',
        recognizedPartType: '',
        recognizedBrand: '',
        partNameCn: '',
        partNameEn: '',
        recognitionConfidence: 0,
        recognitionResult: null,
        recognitionStatus: 'pending',
      } as any);
    }

    return this.findOne(id);
  }

  async batchUndoRecognize(ids: number[]) {
    let processed = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await this.undoRecognize(id);
        processed++;
      } catch (e) {
        failed++;
        this.logger.error(`Batch undo failed for ${id}: ${e.message}`);
      }
    }
    return { processed, failed };
  }

  /**
   * Normalize OE number to standard format: "27300-3F100" (5 digits dash suffix).
   * Handles: "27300 3F100" (space), "273003F100" (merged), "27300-3F100" (already correct).
   */
  private normalizeOeNumber(raw: string): string {
    if (!raw) return '';
    const s = raw.toUpperCase().trim();
    // Already correct: "27300-3F100"
    if (/^\d{4,6}-[A-Z0-9]{3,8}$/.test(s)) return s;
    // Has space: "27300 3F100"
    const spaceMatch = s.match(/^(\d{4,6})\s+([A-Z0-9]{3,8})$/);
    if (spaceMatch) return `${spaceMatch[1]}-${spaceMatch[2]}`;
    // Merged: "273003F100" → split at 5 digits
    const mergedMatch = s.match(/^(\d{5})(\d[A-Z0-9]{2,6})$/);
    if (mergedMatch) return `${mergedMatch[1]}-${mergedMatch[2]}`;
    const mergedMatch2 = s.match(/^(\d{5})([A-Z0-9]{3,8})$/);
    if (mergedMatch2) return `${mergedMatch2[1]}-${mergedMatch2[2]}`;
    // Fallback: return as-is with dash if looks like "XXXXX XXXXX"
    const fallback = s.match(/^(\d{4,6})\s*([A-Z0-9]{3,8})$/);
    if (fallback) return `${fallback[1]}-${fallback[2]}`;
    return s;
  }

  /**
   * Parse OCR text to extract OE number, brand, and part type.
   * OE numbers on product images are typically pure digits like "27300 3F100" or "58110 1A100".
   */
  private parseOcrText(ocrText: string): { oeNumber: string; brand: string; partType: string } {
    const lines = ocrText.split('\n').map(l => l.trim()).filter(Boolean);
    const fullText = lines.join(' ').toUpperCase();

    // Known auto parts brands
    const BRANDS: Record<string, string> = {
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

    // Detect brand
    let brand = '';
    for (const [keyword, brandName] of Object.entries(BRANDS)) {
      if (fullText.includes(keyword.toUpperCase())) {
        brand = brandName;
        break;
      }
    }

    // Detect OE number from OCR text
    // Common formats: "27300 3F100" (with space) or "273003F100" (merged)
    // Output format: "27300-3F100" (5 digits + dash + suffix)
    let oeNumber = '';

    // Strategy 1: Look for "XXXXX-XXXXX" or "XXXXX XXXXX" pattern (already has separator)
    for (const line of lines) {
      const upperLine = line.toUpperCase().trim();
      if (upperLine.length < 5) continue;
      if (/^(MADE IN|GENUINE|PARTS|FILTER|ASSY|COIL|ENGINE|OIL)/.test(upperLine)) continue;

      // Already has dash: "27300-3F100"
      const dashMatch = upperLine.match(/^(\d{4,6})-([A-Z0-9]{3,8})$/);
      if (dashMatch) {
        oeNumber = `${dashMatch[1]}-${dashMatch[2]}`;
        break;
      }

      // Has space: "27300 3F100"
      const spaceMatch = upperLine.match(/^(\d{4,6})\s+([A-Z0-9]{3,8})$/);
      if (spaceMatch) {
        oeNumber = `${spaceMatch[1]}-${spaceMatch[2]}`;
        break;
      }
    }

    // Strategy 2: Merged digits+letters like "273003F100" → "27300-3F100"
    // Split at 5 digits + rest (suffix starts with digit+letters)
    if (!oeNumber) {
      for (const line of lines) {
        const upperLine = line.toUpperCase().trim();
        if (upperLine.length < 8) continue;
        if (/^(MADE IN|GENUINE|PARTS|FILTER|ASSY|COIL|ENGINE|OIL)/.test(upperLine)) continue;

        // 5 digits + digit + 2-6 alphanumeric (like "273003F100" → "27300" + "3F100")
        const mergedMatch = upperLine.match(/^(\d{5})(\d[A-Z0-9]{2,6})$/);
        if (mergedMatch) {
          oeNumber = `${mergedMatch[1]}-${mergedMatch[2]}`;
          break;
        }

        // 5 digits + 3-8 alphanumeric (like "27300ABC10")
        const mergedMatch2 = upperLine.match(/^(\d{5})([A-Z0-9]{3,8})$/);
        if (mergedMatch2) {
          oeNumber = `${mergedMatch2[1]}-${mergedMatch2[2]}`;
          break;
        }
      }
    }

    // Strategy 3: Long pure digit sequences that might be OE numbers
    if (!oeNumber) {
      for (const line of lines) {
        const upperLine = line.toUpperCase().trim();
        if (upperLine.length < 8 || upperLine.length > 15) continue;
        if (!/^\d+$/.test(upperLine)) continue;
        if (/^(MADE IN|GENUINE|PARTS|FILTER|ASSY|COIL|ENGINE|OIL)/.test(upperLine)) continue;
        // Format as "XXXXX-XXXXX" (split at 5 digits)
        oeNumber = `${upperLine.slice(0, 5)}-${upperLine.slice(5)}`;
        break;
      }
    }

    // Detect part type from common keywords
    let partType = '';
    const partTypeMap: Record<string, string> = {
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

  private async deleteAssetFiles(asset: ImageAsset) {
    const uploadDir = process.env.UPLOAD_DEST || './uploads';
    const filesToDelete = [asset.filePath, asset.thumbnailSmallPath, asset.thumbnailMediumPath, asset.thumbnailLargePath].filter(Boolean);
    for (const f of filesToDelete) {
      try { await fs.unlink(path.join(uploadDir, f)); } catch {}
    }
  }

  // ---- Classifications ----
  async getClassifications() {
    return this.classRepo.find({ order: { sortOrder: 'ASC' } });
  }
  async createClassification(data: { name: string; parent_id?: number; description?: string }) {
    return this.classRepo.save({ name: data.name, parentId: data.parent_id, description: data.description || '' });
  }
  async deleteClassification(id: number) { await this.classRepo.delete(id); }

  // ---- Tags ----
  async getTags() { return this.tagRepo.find({ order: { usageCount: 'DESC' } }); }
  async createTag(data: { name: string; color?: string }) {
    return this.tagRepo.save({ name: data.name, color: data.color || '#6B7280' });
  }
  async deleteTag(id: number) { await this.tagRepo.delete(id); }

  // ---- Image Edit ----
  async cropImage(id: number, x: number, y: number, width: number, height: number) {
    const asset = await this.assetRepo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('素材不存在');
    const absPath = this.imageProcessing.getAbsolutePath(asset.filePath);
    const buffer = await fs.readFile(absPath);
    const cropped = await this.imageProcessing.cropImage(buffer, x, y, width, height);
    await fs.writeFile(absPath, cropped);
    const thumbnails = await this.imageProcessing.generateThumbnails(cropped, path.basename(asset.filePath, path.extname(asset.filePath)));
    asset.width = width;
    asset.height = height;
    asset.thumbnailSmallPath = thumbnails.small;
    asset.thumbnailMediumPath = thumbnails.medium;
    asset.thumbnailLargePath = thumbnails.large;
    return this.assetRepo.save(asset);
  }

  async addWatermark(id: number, text: string) {
    const asset = await this.assetRepo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('素材不存在');
    const absPath = this.imageProcessing.getAbsolutePath(asset.filePath);
    const buffer = await fs.readFile(absPath);
    const watermarked = await this.imageProcessing.addWatermark(buffer, text);
    await fs.writeFile(absPath, watermarked);
    return asset;
  }

  private async lookupBrandByOE(oeNumber: string): Promise<string> {
    this.logger.log(`[lookupBrandByOE] Looking up brand for OE: ${oeNumber}`);
    try {
      const settings = await this.settingsSvc.getAll();
      // Use AI recognition API (non-reasoning model) instead of OE lookup (reasoning model)
      const apiKey = settings.ai_recognition_api_key || settings.oe_lookup_api_key || process.env.ZHIPU_API_KEY;
      if (!apiKey) { this.logger.warn(`[lookupBrandByOE] No API key`); return ''; }

      const apiType = settings.ai_recognition_api_type || 'zhipu';
      const PROVIDER_URLS: Record<string, string> = {
        zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        deepseek: 'https://api.deepseek.com/v1/chat/completions',
        qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        openai: 'https://api.openai.com/v1/chat/completions',
      };
      const apiUrl = PROVIDER_URLS[apiType] || PROVIDER_URLS.zhipu;
      // Use a fast non-reasoning model
      const model = apiType === 'zhipu' ? 'glm-4-flash' : (settings.ai_recognition_model || 'gpt-4o-mini');
      this.logger.log(`[lookupBrandByOE] Using ${apiType}/${model}`);

      const prompt = `OE号码 "${oeNumber}" 属于哪个汽车品牌？只返回品牌英文名（如 HYUNDAI、TOYOTA、BOSCH），不要返回其他内容。`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 100, temperature: 0.1 }),
      });

      const data = await response.json();
      if (data.error) { this.logger.error(`[lookupBrandByOE] API error: ${JSON.stringify(data.error)}`); return ''; }
      const text = (data.choices?.[0]?.message?.content || '').trim();
      const result = text.replace(/["'.\s,，。]/g, '') || '';
      this.logger.log(`[lookupBrandByOE] Result: "${result}"`);
      return result;
    } catch (e) {
      this.logger.error(`[lookupBrandByOE] Error: ${e.message}`);
      return '';
    }
  }

  async lookupPartNameByOE(oeNumber: string, context?: { brand?: string; partType?: string }): Promise<{ partNameCn: string; partNameEn: string; brand: string; partType: string } | null> {
    if (this.oeLookupCache.has(oeNumber)) {
      return this.oeLookupCache.get(oeNumber)!;
    }

    const settings = await this.settingsSvc.getAll();
    if (settings.oe_lookup_enabled === 'false') return null;

    const apiKey = settings.oe_lookup_api_key || process.env.ZHIPU_API_KEY;
    if (!apiKey) return null;

    const apiType = settings.oe_lookup_api_type || 'zhipu';
    const preset = OE_PROVIDER_PRESETS[apiType] || OE_PROVIDER_PRESETS.zhipu;
    const apiUrl = settings.oe_lookup_api_url || preset.url;
    const model = settings.oe_lookup_model || preset.model;

    try {
      let prompt = `你是汽车配件OE号码查询专家。请根据OE号码 "${oeNumber}" 查询对应的配件中文名称和英文名称。返回严格JSON：{"partNameCn":"中文名","partNameEn":"英文名"}。只返回JSON。`;
      if (context?.brand || context?.partType) {
        prompt += `\n已知信息：`;
        if (context.brand) prompt += `品牌为"${context.brand}"`;
        if (context.partType) prompt += `，配件类型为"${context.partType}"`;
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
    } catch (error) {
      this.logger.error(`[OE Lookup] Failed for ${oeNumber}: ${error.message}`);
      return null;
    }
  }
}

const OE_PROVIDER_PRESETS: Record<string, { url: string; model: string }> = {
  zhipu:      { url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4-flash' },
  deepseek:   { url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
  qwen:       { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
  doubao:     { url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-pro-32k' },
  hunyuan:    { url: 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions', model: 'hunyuan-standard' },
  kimi:       { url: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
  mimo:       { url: 'https://api.xiaomi.com/v1/chat/completions', model: 'mimo' },
  bailian:    { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
  volcengine: { url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-pro-32k' },
  openai:     { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  custom:     { url: '', model: '' },
};
