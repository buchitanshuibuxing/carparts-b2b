import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class CustomersService {
  constructor(@InjectRepository(Customer) private repo: Repository<Customer>) {}

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
    const map: Record<string, string> = {
      customer_code: 'customerCode', company_name: 'companyName', contact_person: 'contactPerson',
      customer_type: 'customerType', customer_level: 'customerLevel', credit_limit: 'creditLimit',
      payment_terms: 'paymentTerms', is_active: 'isActive',
    };
    for (const [k, v] of Object.entries(data)) {
      const key = map[k] || k;
      if (v !== undefined) (c as any)[key] = v;
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
    await this.repo.remove(c);
  }

  async batchUpdate(ids: number[], data: any) {
    if (!ids.length) return { updated: 0 };
    const set: any = {};
    const map: Record<string, string> = {
      company_name: 'companyName', contact_person: 'contactPerson',
      phone: 'phone', email: 'email', address: 'address', country: 'country', region: 'region',
      customer_type: 'customerType', customer_level: 'customerLevel', currency: 'currency',
      credit_limit: 'creditLimit', payment_terms: 'paymentTerms', notes: 'notes', is_active: 'isActive',
    };
    for (const [k, v] of Object.entries(data)) {
      if (k === 'ids') continue;
      const key = map[k] || k;
      if (v !== undefined && v !== '') set[key] = v;
    }
    if (Object.keys(set).length === 0) return { updated: 0 };
    await this.repo.createQueryBuilder().update().set(set).where('id IN (:...ids)', { ids }).execute();
    return { updated: ids.length };
  }

  async batchDelete(ids: number[]) {
    if (!ids.length) return { deleted: 0 };
    await this.repo.delete(ids);
    return { deleted: ids.length };
  }
}
