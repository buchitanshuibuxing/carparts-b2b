import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class CustomersService {
  constructor(@InjectRepository(Customer) private repo: Repository<Customer>, private dataSource: DataSource) {}

  async findAll(page = 1, pageSize = 20, filters?: { customer_type?: string; region?: string; is_active?: boolean; keyword?: string }) {
    const qb = this.repo.createQueryBuilder('c');
    if (filters?.customer_type) qb.andWhere('c.customer_type = :t', { t: filters.customer_type });
    if (filters?.region) qb.andWhere('c.region = :r', { r: filters.region });
    if (filters?.is_active !== undefined) qb.andWhere('c.is_active = :a', { a: filters.is_active });
    if (filters?.keyword) qb.andWhere('(c.company_name ILIKE :kw OR c.contact_person ILIKE :kw)', { kw: `%${filters.keyword}%` });
    qb.orderBy('c.created_at', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [items, total] = await qb.getManyAndCount();
    return new PaginatedResponseDto(items, total, page, pageSize);
  }

  async findOne(id: number) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('客户不存在');
    return c;
  }

  async create(data: any) {
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

  async update(id: number, data: any) {
    const c = await this.findOne(id);
    const allowedFields: Record<string, string> = {
      customer_code: 'customerCode', company_name: 'companyName', contact_person: 'contactPerson',
      customer_type: 'customerType', customer_level: 'customerLevel', credit_limit: 'creditLimit',
      payment_terms: 'paymentTerms', is_active: 'isActive',
    };
    // 只允许更新白名单中的字段，防止 Mass Assignment
    for (const [k, v] of Object.entries(data)) {
      if (allowedFields[k] && v !== undefined) {
        (c as any)[allowedFields[k]] = v;
      }
    }
    return this.repo.save(c);
  }

  async toggleActive(id: number, isActive: boolean) {
    const c = await this.findOne(id);
    c.isActive = isActive;
    return this.repo.save(c);
  }

  async remove(id: number) {
    const c = await this.findOne(id);

    // Check for associated orders
    const orderCount = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM orders WHERE customer_id = $1',
      [id]
    );
    if (parseInt(orderCount[0]?.count || '0') > 0) {
      throw new BadRequestException('该客户有关联的订单，无法删除。请先删除相关订单。');
    }

    // Check for associated quotations
    const quotationCount = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM quotations WHERE customer_id = $1',
      [id]
    );
    if (parseInt(quotationCount[0]?.count || '0') > 0) {
      throw new BadRequestException('该客户有关联的报价单，无法删除。请先删除相关报价单。');
    }

    await this.repo.remove(c);
  }

  async batchUpdate(ids: number[], data: any) {
    const allowedFields: Record<string, string> = {
      company_name: 'companyName', contact_person: 'contactPerson', customer_type: 'customerType',
      customer_level: 'customerLevel', credit_limit: 'creditLimit', payment_terms: 'paymentTerms',
      is_active: 'isActive',
    };
    for (const id of ids) {
      const customer = await this.repo.findOne({ where: { id } });
      if (!customer) continue;
      // 只允许更新白名单中的字段，防止 Mass Assignment
      for (const [k, v] of Object.entries(data)) {
        if (k === 'ids' || v === undefined || v === '') continue;
        if (allowedFields[k]) {
          (customer as any)[allowedFields[k]] = v;
        }
      }
      await this.repo.save(customer);
    }
    return { updated: ids.length };
  }

  async batchDelete(ids: number[]) {
    if (!ids.length) return { deleted: 0 };

    // Check for associated data
    for (const id of ids) {
      const orderCount = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM orders WHERE customer_id = $1',
        [id]
      );
      if (parseInt(orderCount[0]?.count || '0') > 0) {
        throw new BadRequestException(`客户ID ${id} 有关联的订单，无法删除`);
      }

      const quotationCount = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM quotations WHERE customer_id = $1',
        [id]
      );
      if (parseInt(quotationCount[0]?.count || '0') > 0) {
        throw new BadRequestException(`客户ID ${id} 有关联的报价单，无法删除`);
      }
    }

    await this.repo.delete(ids);
    return { deleted: ids.length };
  }

  async getConfigTypes() {
    const types = await this.dataSource.query("SELECT value FROM settings WHERE key = 'customer_types'");
    const levels = await this.dataSource.query("SELECT value FROM settings WHERE key = 'customer_levels'");
    return {
      types: types[0]?.value ? JSON.parse(types[0].value) : ['经销商', '修理厂', '终端客户', '贸易商', '电商平台'],
      levels: levels[0]?.value ? JSON.parse(levels[0].value) : ['普通', 'VIP', '重点', '潜在'],
    };
  }

  async updateConfigTypes(data: { types?: string[]; levels?: string[] }) {
    if (data.types) {
      await this.dataSource.query(
        "INSERT INTO settings (key, value) VALUES ('customer_types', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
        [JSON.stringify(data.types)]
      );
    }
    if (data.levels) {
      await this.dataSource.query(
        "INSERT INTO settings (key, value) VALUES ('customer_levels', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
        [JSON.stringify(data.levels)]
      );
    }
    return { success: true };
  }

}