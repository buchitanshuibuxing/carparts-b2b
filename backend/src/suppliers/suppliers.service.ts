import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { SupplierPart } from './entities/supplier-part.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier) private supplierRepo: Repository<Supplier>,
    @InjectRepository(SupplierPart) private supplierPartRepo: Repository<SupplierPart>,
  ) {}

  async findAll(page = 1, pageSize = 20, isActive?: boolean) {
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;
    const [items, total] = await this.supplierRepo.findAndCount({
      where, order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize, take: pageSize,
    });
    return new PaginatedResponseDto(items, total, page, pageSize);
  }

  async findOne(id: number) {
    const supplier = await this.supplierRepo.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException('供应商不存在');
    return supplier;
  }

  async create(data: any) {
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

  async update(id: number, data: any) {
    const supplier = await this.findOne(id);
    const allowedFields: Record<string, string> = {
      supplier_code: 'supplierCode', company_name: 'companyName', contact_person: 'contactPerson',
      payment_terms: 'paymentTerms', lead_time_days: 'leadTimeDays', is_active: 'isActive', main_products: 'mainProducts',
    };
    // 只允许更新白名单中的字段，防止 Mass Assignment
    for (const [k, v] of Object.entries(data)) {
      if (allowedFields[k] && v !== undefined) {
        (supplier as any)[allowedFields[k]] = v;
      }
    }
    return this.supplierRepo.save(supplier);
  }

  async toggleActive(id: number, isActive: boolean) {
    const supplier = await this.findOne(id);
    supplier.isActive = isActive;
    return this.supplierRepo.save(supplier);
  }

  async linkPart(data: { supplier_id: number; part_id: number; supplier_sku?: string; moq?: number; lead_time_days?: number }) {
    const link = this.supplierPartRepo.create({
      supplierId: data.supplier_id, partId: data.part_id,
      supplierSku: data.supplier_sku || '', moq: data.moq || 1, leadTimeDays: data.lead_time_days || 0,
    });
    return this.supplierPartRepo.save(link);
  }

  async getSupplierParts(supplierId: number) {
    return this.supplierPartRepo.find({ where: { supplierId } });
  }

  async remove(id: number) {
    const supplier = await this.findOne(id);

    // Check for associated supplier_parts
    const partCount = await this.supplierPartRepo.count({ where: { supplierId: id } });
    if (partCount > 0) {
      throw new BadRequestException('该供应商有关联的配件，无法删除。请先删除相关配件。');
    }

    await this.supplierRepo.remove(supplier);
  }

  async batchUpdate(ids: number[], data: any) {
    const allowedFields: Record<string, string> = {
      company_name: 'companyName', contact_person: 'contactPerson', payment_terms: 'paymentTerms',
      lead_time_days: 'leadTimeDays', is_active: 'isActive', main_products: 'mainProducts',
    };
    for (const id of ids) {
      const supplier = await this.supplierRepo.findOne({ where: { id } });
      if (!supplier) continue;
      // 只允许更新白名单中的字段，防止 Mass Assignment
      for (const [k, v] of Object.entries(data)) {
        if (k === 'ids' || v === undefined || v === '') continue;
        if (allowedFields[k]) {
          (supplier as any)[allowedFields[k]] = v;
        }
      }
      await this.supplierRepo.save(supplier);
    }
    return { updated: ids.length };
  }

  async batchDelete(ids: number[]) {
    if (!ids.length) return { deleted: 0 };

    // Check for associated data
    for (const id of ids) {
      const partCount = await this.supplierPartRepo.count({ where: { supplierId: id } });
      if (partCount > 0) {
        throw new BadRequestException(`供应商ID ${id} 有关联的配件，无法删除`);
      }
    }

    await this.supplierRepo.delete(ids);
    return { deleted: ids.length };
  }
}