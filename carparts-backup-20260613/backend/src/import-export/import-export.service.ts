import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { Part } from '../parts/entities/part.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Customer } from '../customers/entities/customer.entity';

@Injectable()
export class ImportExportService {
  constructor(
    @InjectRepository(Part) private partRepo: Repository<Part>,
    @InjectRepository(Supplier) private supplierRepo: Repository<Supplier>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
  ) {}

  async importFromExcel(file: Express.Multer.File, importType: string, fieldMapping?: Record<string, string>) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

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
      suppliers: {
        '供应商编号': 'supplierCode', 'Supplier Code': 'supplierCode', 'supplier_code': 'supplierCode',
        '公司名称': 'companyName', 'Company Name': 'companyName', 'company_name': 'companyName',
        '联系人': 'contactPerson', 'Contact': 'contactPerson',
        '电话': 'phone', 'Phone': 'phone',
        '邮箱': 'email', 'Email': 'email',
      },
      customers: {
        '客户编号': 'customerCode', 'Customer Code': 'customerCode', 'customer_code': 'customerCode',
        '公司名称': 'companyName', 'Company Name': 'companyName', 'company_name': 'companyName',
        '联系人': 'contactPerson', 'Contact': 'contactPerson',
        '电话': 'phone', 'Phone': 'phone',
        '邮箱': 'email', 'Email': 'email',
      },
    };

    const mapping = { ...defaultMappings[importType], ...fieldMapping };
    let successCount = 0;
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
            Object.assign(existing, entity);
            await this.partRepo.save(existing);
          } else {
            await this.partRepo.save(this.partRepo.create(entity));
          }
        } else if (importType === 'suppliers') {
          if (!entity.supplierCode || !entity.companyName) throw new Error('缺少必填字段');
          await this.supplierRepo.save(this.supplierRepo.create(entity));
        } else if (importType === 'customers') {
          if (!entity.customerCode || !entity.companyName) throw new Error('缺少必填字段');
          await this.customerRepo.save(this.customerRepo.create(entity));
        }
        successCount++;
      } catch (error) {
        errors.push(`第 ${i + 2} 行: ${error.message}`);
      }
    }

    return { total_rows: rows.length, success_count: successCount, error_count: errors.length, errors };
  }

  async exportTemplate(importType: string) {
    const templates: Record<string, string[][]> = {
      parts: [['OE编号', '中文名称', '英文名称', '分类', '品牌', '车型', '发动机类型', '年份从', '年份到', '规格', '单位', '重量(kg)', '备注']],
      inventory: [['OE编号', '数量', '仓库位置', '仓库区域', '最低库存', '最高库存', '备注']],
      suppliers: [['供应商编号', '公司名称', '联系人', '电话', '邮箱', '国家', '地址', '主营产品', '付款条件', '交期(天)', '货币', '评级', '备注']],
      customers: [['客户编号', '公司名称', '联系人', '电话', '邮箱', '国家', '地区', '客户类型', '客户等级', '货币', '信用额度', '付款条件', '备注']],
      prices: [['OE编号', '价格类型', '货币', '单价', '最小数量', '最大数量', '生效日期', '失效日期', '备注']],
    };
    const data = templates[importType];
    if (!data) throw new BadRequestException('不支持的导入类型');
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, importType);
    const uploadDir = process.env.UPLOAD_DEST || './uploads';
    const dir = path.join(uploadDir, 'exports');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${importType}_template.xlsx`);
    XLSX.writeFile(wb, filePath);
    return { path: `exports/${importType}_template.xlsx` };
  }
}
