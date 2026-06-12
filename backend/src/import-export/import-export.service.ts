import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { Part } from '../parts/entities/part.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Price } from '../prices/entities/price.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { SettingsService } from '../settings/settings.service';

const DEFAULT_CUSTOMER_TYPES = ['经销商', '修理厂', '终端客户', '贸易商', '电商平台'];
const DEFAULT_CUSTOMER_LEVELS = ['普通', 'VIP', '重点', '潜在'];
const DEFAULT_PRICE_TYPES = ['批发价', '零售价', '促销价', '成本价', 'VIP价'];

@Injectable()
export class ImportExportService {
  constructor(
    @InjectRepository(Part) private partRepo: Repository<Part>,
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
    @InjectRepository(Supplier) private supplierRepo: Repository<Supplier>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Price) private priceRepo: Repository<Price>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemRepo: Repository<OrderItem>,
    private settingsSvc: SettingsService,
  ) {}

  async previewImport(file: Express.Multer.File, importType: string) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    let rows = XLSX.utils.sheet_to_json(sheet);

    // For prices: detect merged header template (row1 = price types, row2 = 单价/最小数量/最大数量)
    if (importType === 'prices') {
      const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      if (rawRows.length >= 2) {
        const subHeaderRow = rawRows[1];
        const hasSubHeaders = subHeaderRow && subHeaderRow.some((h: any) => h === '单价' || h === '最小数量' || h === '最大数量');
        if (hasSubHeaders) {
          const headerRow = rawRows[0];
          const mergedHeaders: string[] = [];
          let currentPrefix = '';
          for (let c = 0; c < subHeaderRow.length; c++) {
            const h = headerRow[c];
            if (h && String(h).trim() !== '') currentPrefix = String(h);
            const sub = subHeaderRow[c];
            if (sub && String(sub).trim() !== '') {
              mergedHeaders.push(currentPrefix ? `${currentPrefix}-${sub}` : String(sub));
            } else {
              mergedHeaders.push(currentPrefix || `col_${c}`);
            }
          }
          rows = rawRows.slice(2).map(row => {
            const obj: Record<string, any> = {};
            for (let c = 0; c < mergedHeaders.length; c++) {
              obj[mergedHeaders[c]] = row[c];
            }
            return obj;
          });
        }
      }
    }

    const mappings: Record<string, string> = {
      'OE编号': 'oeNumber', 'OE Number': 'oeNumber', 'oe_number': 'oeNumber',
      '供应商编号': 'supplierCode', 'Supplier Code': 'supplierCode', 'supplier_code': 'supplierCode',
      '客户编号': 'customerCode', 'Customer Code': 'customerCode', 'customer_code': 'customerCode',
    };

    const keyField = (importType === 'parts' || importType === 'inventory' || importType === 'prices') ? 'oeNumber' : importType === 'suppliers' ? 'supplierCode' : 'customerCode';
    const ids: string[] = [];
    for (const row of rows as Record<string, any>[]) {
      for (const [src, dest] of Object.entries(mappings)) {
        if (dest === keyField && row[src]) {
          ids.push(String(row[src]).trim());
          break;
        }
      }
    }

    const uniqueIds = [...new Set(ids.filter(Boolean))];
    let duplicates: string[] = [];

    if (importType === 'parts' && uniqueIds.length) {
      const existing = await this.partRepo.find({ where: { oeNumber: In(uniqueIds) } });
      duplicates = existing.map(p => p.oeNumber);
    } else if (importType === 'inventory' && uniqueIds.length) {
      // Check which OE numbers already have inventory records
      const parts = await this.partRepo.find({ where: { oeNumber: In(uniqueIds) } });
      if (parts.length) {
        const partIds = parts.map(p => p.id);
        const existingInv = await this.inventoryRepo.find({ where: { partId: In(partIds) } });
        const invPartIds = new Set(existingInv.map(i => i.partId));
        duplicates = parts.filter(p => invPartIds.has(p.id)).map(p => p.oeNumber);
      }
    } else if (importType === 'suppliers' && uniqueIds.length) {
      const existing = await this.supplierRepo.find({ where: { supplierCode: In(uniqueIds) } });
      duplicates = existing.map(s => s.supplierCode);
    } else if (importType === 'customers' && uniqueIds.length) {
      const existing = await this.customerRepo.find({ where: { customerCode: In(uniqueIds) } });
      duplicates = existing.map(c => c.customerCode);
    } else if (importType === 'prices' && uniqueIds.length) {
      const parts = await this.partRepo.find({ where: { oeNumber: In(uniqueIds) } });
      if (parts.length) {
        const partIds = parts.map(p => p.id);
        const existingPrices = await this.priceRepo.find({ where: { partId: In(partIds) } });
        const pricePartIds = new Set(existingPrices.map(p => p.partId));
        duplicates = parts.filter(p => pricePartIds.has(p.id)).map(p => p.oeNumber);
      }
    }

    return {
      total_rows: rows.length,
      unique_ids: uniqueIds.length,
      duplicate_count: duplicates.length,
      duplicates,
    };
  }

  async importFromExcel(file: Express.Multer.File, importType: string, fieldMapping?: Record<string, string>, duplicateStrategy?: 'overwrite' | 'skip') {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    let rows = XLSX.utils.sheet_to_json(sheet);

    // For prices: detect merged header template (row1 = price types, row2 = 单价/最小数量/最大数量)
    if (importType === 'prices') {
      const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      if (rawRows.length >= 2) {
        const subHeaderRow = rawRows[1];
        const hasSubHeaders = subHeaderRow && subHeaderRow.some((h: any) => h === '单价' || h === '最小数量' || h === '最大数量');
        if (hasSubHeaders) {
          const headerRow = rawRows[0];
          const mergedHeaders: string[] = [];
          let currentPrefix = '';
          for (let c = 0; c < subHeaderRow.length; c++) {
            const h = headerRow[c];
            if (h && String(h).trim() !== '') currentPrefix = String(h);
            const sub = subHeaderRow[c];
            if (sub && String(sub).trim() !== '') {
              mergedHeaders.push(currentPrefix ? `${currentPrefix}-${sub}` : String(sub));
            } else {
              mergedHeaders.push(currentPrefix || `col_${c}`);
            }
          }
          rows = rawRows.slice(2).map(row => {
            const obj: Record<string, any> = {};
            for (let c = 0; c < mergedHeaders.length; c++) {
              obj[mergedHeaders[c]] = row[c];
            }
            return obj;
          });
        }
      }
    }

    const defaultMappings: Record<string, Record<string, string>> = {
      parts: {
        'OE编号': 'oeNumber', 'OE Number': 'oeNumber', 'oe_number': 'oeNumber',
        '中文名称': 'partNameCn', 'Part Name CN': 'partNameCn', 'part_name_cn': 'partNameCn',
        '英文名称': 'partNameEn', 'Part Name EN': 'partNameEn',
        '分类': 'category', 'Category': 'category',
        '品牌': 'brand', 'Brand': 'brand',
        '车型': 'carModel', 'Car Model': 'carModel',
        '单位': 'unit', 'Unit': 'unit',
      },
      inventory: {
        'OE编号': 'oeNumber', 'OE Number': 'oeNumber', 'oe_number': 'oeNumber',
        '数量': 'quantity', 'Quantity': 'quantity',
        '仓库位置': 'warehouseLocation', 'Warehouse Location': 'warehouseLocation',
        '仓库区域': 'warehouseZone', 'Warehouse Zone': 'warehouseZone',
        '最低库存': 'minStock', 'Min Stock': 'minStock',
        '最高库存': 'maxStock', 'Max Stock': 'maxStock',
        '备注': 'notes', 'Notes': 'notes',
      },
      suppliers: {
        '供应商编号': 'supplierCode', 'Supplier Code': 'supplierCode', 'supplier_code': 'supplierCode',
        '公司名称': 'companyName', 'Company Name': 'companyName', 'company_name': 'companyName',
        '联系人': 'contactPerson', 'Contact': 'contactPerson',
        '电话': 'phone', 'Phone': 'phone',
        '邮箱': 'email', 'Email': 'email',
        '国家': 'country', 'Country': 'country',
        '主营产品': 'mainProducts', 'Main Products': 'mainProducts', 'main_products': 'mainProducts',
      },
      customers: {
        '客户编号': 'customerCode', 'Customer Code': 'customerCode', 'customer_code': 'customerCode',
        '公司名称': 'companyName', 'Company Name': 'companyName', 'company_name': 'companyName',
        '联系人': 'contactPerson', 'Contact': 'contactPerson',
        '电话': 'phone', 'Phone': 'phone',
        '邮箱': 'email', 'Email': 'email',
        '国家': 'country', 'Country': 'country',
        '客户类型': 'customerType', 'Customer Type': 'customerType', 'customer_type': 'customerType',
        '客户等级': 'customerLevel', 'Customer Level': 'customerLevel', 'customer_level': 'customerLevel',
      },
      prices: {
        'OE编号': 'oeNumber', 'OE Number': 'oeNumber', 'oe_number': 'oeNumber',
        '价格类型': 'priceType', 'Price Type': 'priceType', 'price_type': 'priceType',
        '货币': 'currency', 'Currency': 'currency',
        '单价': 'unitPrice', 'Unit Price': 'unitPrice', 'unit_price': 'unitPrice',
        '最小数量': 'minQuantity', 'Min Qty': 'minQuantity', 'min_quantity': 'minQuantity',
        '最大数量': 'maxQuantity', 'Max Qty': 'maxQuantity', 'max_quantity': 'maxQuantity',
        '生效日期': 'effectiveDate', 'Effective Date': 'effectiveDate',
        '失效日期': 'expiryDate', 'Expiry Date': 'expiryDate',
        '备注': 'notes', 'Notes': 'notes',
      },
    };

    const mapping = { ...defaultMappings[importType], ...fieldMapping };
    let successCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i] as Record<string, any>;
        const entity: any = {};
        for (const [src, dest] of Object.entries(mapping)) {
          if (row[src] !== undefined) entity[dest] = String(row[src]).trim();
        }

        if (importType === 'parts') {
          if (!entity.oeNumber) throw new Error('缺少 OE 编号');
          if (!entity.partNameCn) throw new Error('缺少中文名称');
          const existing = await this.partRepo.findOne({ where: { oeNumber: entity.oeNumber } });
          if (existing) {
            if (duplicateStrategy === 'skip') { skippedCount++; continue; }
            Object.assign(existing, entity);
            await this.partRepo.save(existing);
          } else {
            await this.partRepo.save(this.partRepo.create(entity));
          }
        } else if (importType === 'inventory') {
          if (!entity.oeNumber) throw new Error('缺少 OE 编号');
          const part = await this.partRepo.findOne({ where: { oeNumber: entity.oeNumber } });
          if (!part) throw new Error(`配件 ${entity.oeNumber} 不存在，请先导入配件数据`);
          const existingInv = await this.inventoryRepo.findOne({ where: { partId: part.id } });
          if (existingInv) {
            if (duplicateStrategy === 'skip') { skippedCount++; continue; }
            if (entity.quantity !== undefined) existingInv.quantity = Number(entity.quantity);
            if (entity.warehouseLocation !== undefined) existingInv.warehouseLocation = entity.warehouseLocation;
            if (entity.warehouseZone !== undefined) existingInv.warehouseZone = entity.warehouseZone;
            if (entity.minStock !== undefined) existingInv.minStock = Number(entity.minStock);
            if (entity.maxStock !== undefined) existingInv.maxStock = Number(entity.maxStock);
            if (entity.notes !== undefined) existingInv.notes = entity.notes;
            await this.inventoryRepo.save(existingInv);
          } else {
            await this.inventoryRepo.save(this.inventoryRepo.create({
              partId: part.id,
              quantity: Number(entity.quantity) || 0,
              warehouseLocation: entity.warehouseLocation || '',
              warehouseZone: entity.warehouseZone || '默认',
              minStock: Number(entity.minStock) || 0,
              maxStock: Number(entity.maxStock) || 99999,
              notes: entity.notes || '',
            }));
          }
        } else if (importType === 'suppliers') {
          if (!entity.supplierCode || !entity.companyName) throw new Error('缺少必填字段');
          const existingSupplier = await this.supplierRepo.findOne({ where: { supplierCode: entity.supplierCode } });
          if (existingSupplier) {
            if (duplicateStrategy === 'skip') { skippedCount++; continue; }
            Object.assign(existingSupplier, entity);
            await this.supplierRepo.save(existingSupplier);
          } else {
            await this.supplierRepo.save(this.supplierRepo.create(entity));
          }
        } else if (importType === 'customers') {
          if (!entity.customerCode || !entity.companyName) throw new Error('缺少必填字段');
          const existingCustomer = await this.customerRepo.findOne({ where: { customerCode: entity.customerCode } });
          if (existingCustomer) {
            if (duplicateStrategy === 'skip') { skippedCount++; continue; }
            Object.assign(existingCustomer, entity);
            await this.customerRepo.save(existingCustomer);
          } else {
            await this.customerRepo.save(this.customerRepo.create(entity));
          }
        } else if (importType === 'prices') {
          // Detect new format: columns like "批发价-单价"
          const rowKeys = Object.keys(row);
          const isNewFormat = rowKeys.some(k => k.endsWith('-单价'));

          if (isNewFormat) {
            if (!entity.oeNumber) throw new Error('缺少 OE 编号');
            const part = await this.partRepo.findOne({ where: { oeNumber: entity.oeNumber } });
            if (!part) throw new Error(`配件 ${entity.oeNumber} 不存在，请先导入配件数据`);
            const settings = await this.settingsSvc.getAll();
            const priceTypes: string[] = settings.price_types ? JSON.parse(settings.price_types) : DEFAULT_PRICE_TYPES;
            const currency = row['货币'] || entity.currency || 'USD';

            for (const pt of priceTypes) {
              const unitPriceStr = String(row[`${pt}-单价`] || '').trim();
              if (!unitPriceStr) continue;

              const prices = unitPriceStr.split(';').map(s => s.trim()).filter(Boolean);
              const mins = String(row[`${pt}-最小数量`] || '1').split(';').map(s => s.trim());
              const maxs = String(row[`${pt}-最大数量`] || '99999').split(';').map(s => s.trim());

              for (let t = 0; t < prices.length; t++) {
                const unitPrice = Number(prices[t]);
                if (!unitPrice) continue;
                const minQty = Number(mins[t] || mins[0]) || 1;
                const maxQty = Number(maxs[t] || maxs[0]) || 99999;

                const existingPrice = await this.priceRepo.findOne({ where: { partId: part.id, priceType: pt, minQuantity: minQty } });
                if (existingPrice) {
                  if (duplicateStrategy === 'skip') { skippedCount++; continue; }
                  existingPrice.unitPrice = unitPrice;
                  existingPrice.currency = currency;
                  existingPrice.maxQuantity = maxQty;
                  await this.priceRepo.save(existingPrice);
                } else {
                  await this.priceRepo.save(this.priceRepo.create({
                    partId: part.id, priceType: pt, currency,
                    unitPrice, minQuantity: minQty, maxQuantity: maxQty,
                  }));
                }
                successCount++;
              }
            }
            continue; // skip the default successCount++ below
          } else {
            // Old format: one price per row
            if (!entity.oeNumber) throw new Error('缺少 OE 编号');
            if (!entity.unitPrice) throw new Error('缺少单价');
            const part = await this.partRepo.findOne({ where: { oeNumber: entity.oeNumber } });
            if (!part) throw new Error(`配件 ${entity.oeNumber} 不存在，请先导入配件数据`);
            const existingPrice = await this.priceRepo.findOne({ where: { partId: part.id, priceType: entity.priceType || '批发价' } });
            if (existingPrice) {
              if (duplicateStrategy === 'skip') { skippedCount++; continue; }
              existingPrice.unitPrice = Number(entity.unitPrice);
              if (entity.currency) existingPrice.currency = entity.currency;
              if (entity.minQuantity) existingPrice.minQuantity = Number(entity.minQuantity);
              if (entity.maxQuantity) existingPrice.maxQuantity = Number(entity.maxQuantity);
              if (entity.effectiveDate) existingPrice.effectiveDate = entity.effectiveDate;
              if (entity.expiryDate) existingPrice.expiryDate = entity.expiryDate;
              if (entity.notes) existingPrice.notes = entity.notes;
              await this.priceRepo.save(existingPrice);
            } else {
              await this.priceRepo.save(this.priceRepo.create({
                partId: part.id,
                priceType: entity.priceType || '批发价',
                currency: entity.currency || 'USD',
                unitPrice: Number(entity.unitPrice),
                minQuantity: Number(entity.minQuantity) || 1,
                maxQuantity: Number(entity.maxQuantity) || 99999,
                effectiveDate: entity.effectiveDate || '',
                expiryDate: entity.expiryDate || '',
                notes: entity.notes || '',
              }));
            }
          }
        }
        successCount++;
      } catch (error) {
        errors.push(`第 ${i + 2} 行: ${error.message}`);
      }
    }

    return { total_rows: rows.length, success_count: successCount, skipped_count: skippedCount, error_count: errors.length, errors };
  }

  async importSingleRow(importType: string, row: Record<string, any>, duplicateStrategy?: 'overwrite' | 'skip') {
    if (importType === 'inventory') {
      if (!row.oeNumber) throw new Error('缺少 OE 编号');
      const part = await this.partRepo.findOne({ where: { oeNumber: row.oeNumber } });
      if (!part) throw new Error(`配件 ${row.oeNumber} 不存在，请先导入配件数据`);
      const existingInv = await this.inventoryRepo.findOne({ where: { partId: part.id } });
      if (existingInv) {
        if (duplicateStrategy === 'skip') return { action: 'skipped' };
        if (row.quantity !== undefined) existingInv.quantity = Number(row.quantity);
        if (row.warehouseLocation !== undefined) existingInv.warehouseLocation = row.warehouseLocation;
        if (row.warehouseZone !== undefined) existingInv.warehouseZone = row.warehouseZone;
        if (row.minStock !== undefined) existingInv.minStock = Number(row.minStock);
        if (row.maxStock !== undefined) existingInv.maxStock = Number(row.maxStock);
        if (row.notes !== undefined) existingInv.notes = row.notes;
        await this.inventoryRepo.save(existingInv);
        return { action: 'updated' };
      }
      await this.inventoryRepo.save(this.inventoryRepo.create({
        partId: part.id,
        quantity: Number(row.quantity) || 0,
        warehouseLocation: row.warehouseLocation || '',
        warehouseZone: row.warehouseZone || '默认',
        minStock: Number(row.minStock) || 0,
        maxStock: Number(row.maxStock) || 99999,
        notes: row.notes || '',
      }));
      return { action: 'created' };
    } else if (importType === 'parts') {
      if (!row.oeNumber) throw new Error('缺少 OE 编号');
      if (!row.partNameCn) throw new Error('缺少中文名称');
      const existing = await this.partRepo.findOne({ where: { oeNumber: row.oeNumber } });
      if (existing) {
        if (duplicateStrategy === 'skip') return { action: 'skipped' };
        Object.assign(existing, row);
        await this.partRepo.save(existing);
        return { action: 'updated' };
      }
      await this.partRepo.save(this.partRepo.create(row));
      return { action: 'created' };
    } else if (importType === 'suppliers') {
      if (!row.supplierCode || !row.companyName) throw new Error('缺少必填字段');
      const existingSupplier = await this.supplierRepo.findOne({ where: { supplierCode: row.supplierCode } });
      if (existingSupplier) {
        if (duplicateStrategy === 'skip') return { action: 'skipped' };
        Object.assign(existingSupplier, row);
        await this.supplierRepo.save(existingSupplier);
        return { action: 'updated' };
      }
      await this.supplierRepo.save(this.supplierRepo.create(row));
      return { action: 'created' };
    } else if (importType === 'customers') {
      if (!row.customerCode || !row.companyName) throw new Error('缺少必填字段');
      const existingCustomer = await this.customerRepo.findOne({ where: { customerCode: row.customerCode } });
      if (existingCustomer) {
        if (duplicateStrategy === 'skip') return { action: 'skipped' };
        Object.assign(existingCustomer, row);
        await this.customerRepo.save(existingCustomer);
        return { action: 'updated' };
      }
      await this.customerRepo.save(this.customerRepo.create(row));
      return { action: 'created' };
    } else if (importType === 'prices') {
      // Detect new format: columns like "批发价-单价"
      const rowKeys = Object.keys(row);
      const isNewFormat = rowKeys.some(k => k.endsWith('-单价'));

      if (isNewFormat) {
        if (!row.oeNumber) throw new Error('缺少 OE 编号');
        const part = await this.partRepo.findOne({ where: { oeNumber: row.oeNumber } });
        if (!part) throw new Error(`配件 ${row.oeNumber} 不存在，请先导入配件数据`);
        const settings = await this.settingsSvc.getAll();
        const priceTypes: string[] = settings.price_types ? JSON.parse(settings.price_types) : DEFAULT_PRICE_TYPES;
        const currency = row['货币'] || row.currency || 'USD';
        let created = 0, updated = 0, skipped = 0;

        for (const pt of priceTypes) {
          const unitPriceStr = String(row[`${pt}-单价`] || '').trim();
          if (!unitPriceStr) continue;

          const prices = unitPriceStr.split(';').map(s => s.trim()).filter(Boolean);
          const mins = String(row[`${pt}-最小数量`] || '1').split(';').map(s => s.trim());
          const maxs = String(row[`${pt}-最大数量`] || '99999').split(';').map(s => s.trim());

          for (let t = 0; t < prices.length; t++) {
            const unitPrice = Number(prices[t]);
            if (!unitPrice) continue;
            const minQty = Number(mins[t] || mins[0]) || 1;
            const maxQty = Number(maxs[t] || maxs[0]) || 99999;

            const existing = await this.priceRepo.findOne({ where: { partId: part.id, priceType: pt, minQuantity: minQty } });
            if (existing) {
              if (duplicateStrategy === 'skip') { skipped++; continue; }
              existing.unitPrice = unitPrice;
              existing.currency = currency;
              existing.maxQuantity = maxQty;
              await this.priceRepo.save(existing);
              updated++;
            } else {
              await this.priceRepo.save(this.priceRepo.create({
                partId: part.id, priceType: pt, currency,
                unitPrice, minQuantity: minQty, maxQuantity: maxQty,
              }));
              created++;
            }
          }
        }
        return { action: created > 0 ? 'created' : updated > 0 ? 'updated' : 'skipped' };
      } else {
        if (!row.oeNumber) throw new Error('缺少 OE 编号');
        if (!row.unitPrice) throw new Error('缺少单价');
        const part = await this.partRepo.findOne({ where: { oeNumber: row.oeNumber } });
        if (!part) throw new Error(`配件 ${row.oeNumber} 不存在，请先导入配件数据`);
        const priceType = row.priceType || '批发价';
        const existingPrice = await this.priceRepo.findOne({ where: { partId: part.id, priceType } });
        if (existingPrice) {
          if (duplicateStrategy === 'skip') return { action: 'skipped' };
          existingPrice.unitPrice = Number(row.unitPrice);
          if (row.currency) existingPrice.currency = row.currency;
          if (row.minQuantity) existingPrice.minQuantity = Number(row.minQuantity);
          if (row.maxQuantity) existingPrice.maxQuantity = Number(row.maxQuantity);
          if (row.effectiveDate) existingPrice.effectiveDate = row.effectiveDate;
          if (row.expiryDate) existingPrice.expiryDate = row.expiryDate;
          if (row.notes) existingPrice.notes = row.notes;
          await this.priceRepo.save(existingPrice);
          return { action: 'updated' };
        }
        await this.priceRepo.save(this.priceRepo.create({
          partId: part.id, priceType, currency: row.currency || 'USD',
          unitPrice: Number(row.unitPrice), minQuantity: Number(row.minQuantity) || 1,
          maxQuantity: Number(row.maxQuantity) || 99999,
          effectiveDate: row.effectiveDate || '', expiryDate: row.expiryDate || '', notes: row.notes || '',
        }));
        return { action: 'created' };
      }
    }
    throw new Error('不支持的导入类型');
  }

  async importBatchRows(importType: string, rows: Record<string, any>[], duplicateStrategy?: 'overwrite' | 'skip') {
    let success = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const result = await this.importSingleRow(importType, rows[i], duplicateStrategy);
        if (result.action === 'skipped') skipped++;
        else success++;
      } catch (err: any) {
        errors.push(`第 ${i + 1} 行: ${err.message}`);
      }
    }

    return { success, skipped, failed: errors.length, errors };
  }

  async exportTemplate(importType: string) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(importType);

    if (importType === 'prices') {
      // Price template: dynamic columns per price type
      const settings = await this.settingsSvc.getAll();
      const priceTypes: string[] = settings.price_types ? JSON.parse(settings.price_types) : DEFAULT_PRICE_TYPES;

      // Row 1: merged headers
      const row1: string[] = ['OE编号', '货币'];
      for (const pt of priceTypes) row1.push(pt, '', '');
      const headerRow1 = ws.addRow(row1);

      // Row 2: sub-headers
      const row2: string[] = ['', ''];
      for (const _ of priceTypes) row2.push('单价', '最小数量', '最大数量');
      const headerRow2 = ws.addRow(row2);

      // Merge cells for row 1 headers
      ws.mergeCells(1, 1, 2, 1); // OE编号
      ws.mergeCells(1, 2, 2, 2); // 货币
      for (let i = 0; i < priceTypes.length; i++) {
        const col = 3 + i * 3;
        ws.mergeCells(1, col, 1, col + 2); // price type name spans 3 columns
      }

      // Style both header rows
      [headerRow1, headerRow2].forEach(row => {
        row.eachCell((cell) => {
          cell.font = { bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
          cell.border = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' },
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      });

      // Column widths
      ws.getColumn(1).width = 18;
      ws.getColumn(2).width = 10;
      for (let i = 0; i < priceTypes.length; i++) {
        ws.getColumn(3 + i * 3).width = 12;
        ws.getColumn(4 + i * 3).width = 12;
        ws.getColumn(5 + i * 3).width = 12;
      }
    } else {
      const templates: Record<string, string[]> = {
        parts: ['OE编号', '中文名称', '英文名称', '分类', '品牌', '车型', '单位'],
        inventory: ['OE编号', '数量', '仓库位置', '仓库区域', '最低库存', '最高库存', '备注'],
        suppliers: ['供应商编号', '公司名称', '联系人', '电话', '邮箱', '国家', '主营产品'],
        customers: ['客户编号', '公司名称', '联系人', '电话', '邮箱', '国家', '客户类型', '客户等级'],
      };
      const headers = templates[importType];
      if (!headers) throw new BadRequestException('不支持的导入类型');

      const headerRow = ws.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' },
        };
      });

      headers.forEach((h, i) => {
        ws.getColumn(i + 1).width = Math.max(h.length * 2.5, 12);
      });

      if (importType === 'customers') {
        const settings = await this.settingsSvc.getAll();
        const types = settings.customer_types ? JSON.parse(settings.customer_types) : DEFAULT_CUSTOMER_TYPES;
        const levels = settings.customer_levels ? JSON.parse(settings.customer_levels) : DEFAULT_CUSTOMER_LEVELS;

        for (let r = 2; r <= 100; r++) ws.addRow([]);
        ws.getColumn(7).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
          if (rowNumber >= 2) {
            cell.dataValidation = {
              type: 'list', allowBlank: true,
              formulae: [`"${types.join(',')}"`],
              showErrorMessage: true, errorTitle: '无效的客户类型', error: '请从下拉列表中选择',
            };
          }
        });
        ws.getColumn(8).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
          if (rowNumber >= 2) {
            cell.dataValidation = {
              type: 'list', allowBlank: true,
              formulae: [`"${levels.join(',')}"`],
              showErrorMessage: true, errorTitle: '无效的客户等级', error: '请从下拉列表中选择',
            };
          }
        });
      }
    }

    const uploadDir = process.env.UPLOAD_DEST || './uploads';
    const dir = path.join(uploadDir, 'exports');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${importType}_template.xlsx`);
    await wb.xlsx.writeFile(filePath);
    return { path: `exports/${importType}_template.xlsx` };
  }

  async exportData(exportType: string): Promise<Buffer> {
    let rows: any[] = [];
    let headers: string[] = [];
    let sheetName = exportType;

    if (exportType === 'parts') {
      const items = await this.partRepo.find({ order: { createdAt: 'DESC' } });
      headers = ['OE编号', '中文名称', '英文名称', '韩文名称', '分类', '品牌', '车型', '配件类型', '单位', 'HS编码', '备注'];
      rows = items.map(p => [p.oeNumber, p.partNameCn, p.partNameEn, p.partNameKo, p.category, p.brand, p.carModel, p.partType, p.unit, p.hsCode, p.notes]);
    } else if (exportType === 'inventory') {
      const items = await this.inventoryRepo.find({ order: { updatedAt: 'DESC' } });
      const partIds = items.map(i => i.partId).filter(Boolean);
      const parts = partIds.length ? await this.partRepo.find({ where: { id: In(partIds) } }) : [];
      const partMap = new Map(parts.map(p => [p.id, p]));
      headers = ['OE编号', '中文名称', '数量', '仓库位置', '仓库区域', '最低库存', '最高库存', '备注'];
      rows = items.map(inv => {
        const part = partMap.get(inv.partId);
        return [part?.oeNumber || '', part?.partNameCn || '', inv.quantity, inv.warehouseLocation, inv.warehouseZone, inv.minStock, inv.maxStock, inv.notes];
      });
    } else if (exportType === 'suppliers') {
      const items = await this.supplierRepo.find({ order: { createdAt: 'DESC' } });
      headers = ['供应商编号', '公司名称', '联系人', '电话', '邮箱', '国家', '主营产品'];
      rows = items.map(s => [s.supplierCode, s.companyName, s.contactPerson, s.phone, s.email, s.country, s.mainProducts]);
    } else if (exportType === 'customers') {
      const items = await this.customerRepo.find({ order: { createdAt: 'DESC' } });
      headers = ['客户编号', '公司名称', '联系人', '电话', '邮箱', '国家', '客户类型', '客户等级'];
      rows = items.map(c => [c.customerCode, c.companyName, c.contactPerson, c.phone, c.email, c.country, c.customerType, c.customerLevel]);
    } else if (exportType === 'prices') {
      // New format: one row per part, each price type as 3 columns
      const settings = await this.settingsSvc.getAll();
      const priceTypes: string[] = settings.price_types ? JSON.parse(settings.price_types) : DEFAULT_PRICE_TYPES;

      const allPrices = await this.priceRepo.find({ order: { createdAt: 'DESC' } });
      const partIds = [...new Set(allPrices.map(i => i.partId).filter(Boolean))];
      const parts = partIds.length ? await this.partRepo.find({ where: { id: In(partIds) } }) : [];
      const partMap = new Map(parts.map(p => [p.id, p]));

      // Build headers: OE编号, 货币, 批发价-单价, 批发价-最小数量, 批发价-最大数量, ...
      headers = ['OE编号', '货币'];
      for (const pt of priceTypes) headers.push(`${pt}-单价`, `${pt}-最小数量`, `${pt}-最大数量`);

      // Group prices by partId + priceType
      const priceMap = new Map<string, typeof allPrices>();
      for (const p of allPrices) {
        const key = `${p.partId}_${p.priceType}`;
        if (!priceMap.has(key)) priceMap.set(key, []);
        priceMap.get(key)!.push(p);
      }

      // One row per part
      for (const partId of partIds) {
        const part = partMap.get(partId);
        const row: any[] = [part?.oeNumber || '', ''];
        for (const pt of priceTypes) {
          const key = `${partId}_${pt}`;
          const ptPrices = priceMap.get(key) || [];
          if (ptPrices.length === 0) {
            row.push('', '', '');
          } else {
            // Sort by minQuantity ascending for tiered prices
            ptPrices.sort((a, b) => a.minQuantity - b.minQuantity);
            // For single price: fill directly; for tiered: join with semicolons
            if (ptPrices.length === 1) {
              row.push(ptPrices[0].currency || '', ptPrices[0].unitPrice, ptPrices[0].minQuantity);
              // Use last price's currency for the row
              if (!row[1]) row[1] = ptPrices[0].currency || '';
              row.push(ptPrices[0].maxQuantity);
            } else {
              // Multiple tiered prices: combine with semicolons
              row[1] = row[1] || ptPrices[0].currency || '';
              row.push(
                ptPrices.map(p => p.unitPrice).join(';'),
                ptPrices.map(p => p.minQuantity).join(';'),
                ptPrices.map(p => p.maxQuantity).join(';'),
              );
            }
          }
        }
        rows.push(row);
      }

      // Use ExcelJS for merged headers
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(exportType);

      // Row 1: merged headers
      const row1 = ws.addRow(headers);
      ws.mergeCells(1, 1, 2, 1);
      ws.mergeCells(1, 2, 2, 2);
      for (let i = 0; i < priceTypes.length; i++) {
        ws.mergeCells(1, 3 + i * 3, 1, 5 + i * 3);
      }

      // Row 2: sub-headers
      const subHeaders: string[] = ['', ''];
      for (const _ of priceTypes) subHeaders.push('单价', '最小数量', '最大数量');
      ws.addRow(subHeaders);

      // Style headers
      [row1].forEach(r => {
        r.eachCell((cell) => {
          cell.font = { bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      });

      // Data rows
      for (const row of rows) ws.addRow(row);

      // Column widths
      ws.getColumn(1).width = 18;
      ws.getColumn(2).width = 10;
      for (let i = 0; i < priceTypes.length; i++) {
        ws.getColumn(3 + i * 3).width = 14;
        ws.getColumn(4 + i * 3).width = 12;
        ws.getColumn(5 + i * 3).width = 12;
      }

      return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
    } else if (exportType === 'orders') {
      const STATUS_LABELS: Record<string, string> = {
        pending: '待确认', confirmed: '已确认', shipped: '已发货', completed: '已完成', cancelled: '已取消',
      };

      const orders = await this.orderRepo.find({ order: { createdAt: 'DESC' } });
      const orderIds = orders.map(o => o.id);
      const allItems = orderIds.length ? await this.orderItemRepo.find({ where: { orderId: In(orderIds) } }) : [];

      // Get customer info
      const custIds = [...new Set(orders.map(o => o.customerId).filter(Boolean))];
      const customers = custIds.length ? await this.customerRepo.find({ where: { id: In(custIds) } }) : [];
      const custMap = new Map(customers.map(c => [c.id, c]));

      // Get part info
      const partIds = [...new Set(allItems.map(i => i.partId).filter(Boolean))];
      const parts = partIds.length ? await this.partRepo.find({ where: { id: In(partIds) } }) : [];
      const partMap = new Map(parts.map(p => [p.id, p]));

      // Group items by orderId
      const itemsMap = new Map<number, typeof allItems>();
      for (const item of allItems) {
        if (!itemsMap.has(item.orderId)) itemsMap.set(item.orderId, []);
        itemsMap.get(item.orderId)!.push(item);
      }

      const wb = new ExcelJS.Workbook();

      // Sheet 1: 订单列表
      const ws1 = wb.addWorksheet('订单列表');
      const orderHeaders = ['订单号', '客户', '订单日期', '状态', '总金额', '货币', '运输方式', '收货地址', '物流单号', '备注'];
      const headerRow1 = ws1.addRow(orderHeaders);
      headerRow1.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      for (const o of orders) {
        const cust = custMap.get(o.customerId);
        ws1.addRow([
          o.orderNumber, cust?.companyName || `#${o.customerId}`,
          o.orderDate ? new Date(o.orderDate).toISOString().slice(0, 10) : '',
          STATUS_LABELS[o.status] || o.status,
          Number(o.totalAmount), o.currency,
          o.shippingMethod, o.shippingAddress, o.trackingNumber, o.notes,
        ]);
      }
      ws1.getColumn(1).width = 22;
      ws1.getColumn(2).width = 20;
      ws1.getColumn(3).width = 14;
      ws1.getColumn(4).width = 10;
      ws1.getColumn(5).width = 14;
      ws1.getColumn(6).width = 8;
      ws1.getColumn(7).width = 14;
      ws1.getColumn(8).width = 30;
      ws1.getColumn(9).width = 20;
      ws1.getColumn(10).width = 30;

      // Sheet 2: 订单明细
      const ws2 = wb.addWorksheet('订单明细');
      const itemHeaders = ['订单号', '客户', 'OE编号', '配件名称', '品牌', '数量', '单价', '折扣(%)', '小计', '备注'];
      const headerRow2 = ws2.addRow(itemHeaders);
      headerRow2.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      for (const o of orders) {
        const cust = custMap.get(o.customerId);
        const items = itemsMap.get(o.id) || [];
        for (const item of items) {
          const part = partMap.get(item.partId);
          ws2.addRow([
            o.orderNumber, cust?.companyName || '',
            part?.oeNumber || `#${item.partId}`,
            part?.partNameCn || '', part?.brand || '',
            item.quantity, Number(item.unitPrice), Number(item.discountPct),
            Number(item.subtotal), item.notes,
          ]);
        }
      }
      ws2.getColumn(1).width = 22;
      ws2.getColumn(2).width = 20;
      ws2.getColumn(3).width = 18;
      ws2.getColumn(4).width = 20;
      ws2.getColumn(5).width = 12;
      ws2.getColumn(6).width = 8;
      ws2.getColumn(7).width = 12;
      ws2.getColumn(8).width = 10;
      ws2.getColumn(9).width = 14;
      ws2.getColumn(10).width = 20;

      return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
    } else {
      throw new BadRequestException('不支持的导出类型');
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as unknown as Buffer;
  }
}
