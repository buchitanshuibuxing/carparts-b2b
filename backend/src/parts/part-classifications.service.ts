import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PartClassification } from './entities/part-classification.entity';

@Injectable()
export class PartClassificationsService {
  constructor(
    @InjectRepository(PartClassification) private repo: Repository<PartClassification>,
  ) {}

  async findAll() {
    return this.repo.find({ order: { sortOrder: 'ASC' } });
  }

  async create(data: { name: string; parent_id?: number; description?: string }) {
    return this.repo.save({ name: data.name, parentId: data.parent_id, description: data.description || '' });
  }

  async update(id: number, data: { name?: string; description?: string; sort_order?: number }) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) return null;
    if (data.name !== undefined) item.name = data.name;
    if (data.description !== undefined) item.description = data.description;
    if (data.sort_order !== undefined) item.sortOrder = data.sort_order;
    return this.repo.save(item);
  }

  async delete(id: number) {
    await this.repo.delete(id);
  }
}
