import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from './entities/todo.entity';

@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepo: Repository<Todo>,
  ) {}

  async findAll(priority?: string): Promise<Todo[]> {
    const where: any = {};
    if (priority) where.priority = priority;
    return this.todoRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async create(data: { content: string; priority?: string; tag?: string; dueDate?: string }): Promise<Todo> {
    const todo = this.todoRepo.create({
      content: data.content,
      priority: data.priority || 'normal',
      tag: data.tag || null,
      dueDate: data.dueDate || null,
    });
    return this.todoRepo.save(todo) as Promise<Todo>;
  }

  async update(id: number, data: Partial<{ content: string; priority: string; isDone: boolean; tag: string; dueDate: string }>): Promise<Todo | null> {
    const updateData: any = { ...data };
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate || null;
    }
    if (data.tag !== undefined) {
      updateData.tag = data.tag || null;
    }
    await this.todoRepo.update(id, updateData);
    return this.todoRepo.findOne({ where: { id } });
  }

  async remove(id: number): Promise<void> {
    await this.todoRepo.delete(id);
  }
}
