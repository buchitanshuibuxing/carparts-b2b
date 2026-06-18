import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Todo } from './entities/todo.entity';

@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepo: Repository<Todo>,
  ) {}

  async findAll(userId: number, priority?: string, limit = 200): Promise<Todo[]> {
    const where: any = { userId };
    if (priority) where.priority = priority;
    return this.todoRepo.find({ where, order: { isDone: 'ASC', createdAt: 'DESC' }, take: limit });
  }

  async create(userId: number, data: { content: string; priority?: string; tag?: string; dueDate?: string }): Promise<Todo> {
    const todo = this.todoRepo.create({
      content: data.content,
      priority: data.priority || 'normal',
      userId,
      tag: data.tag || null,
      dueDate: data.dueDate || null,
    });
    return this.todoRepo.save(todo) as Promise<Todo>;
  }

  async update(userId: number, id: number, data: Partial<{ content: string; priority: string; isDone: boolean; tag: string; dueDate: string }>): Promise<Todo | null> {
    const todo = await this.todoRepo.findOne({ where: { id, userId } });
    if (!todo) return null;
    const updateData: any = { ...data };
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate || null;
    if (data.tag !== undefined) updateData.tag = data.tag || null;
    await this.todoRepo.update(id, updateData);
    return this.todoRepo.findOne({ where: { id } });
  }

  async remove(userId: number, id: number): Promise<boolean> {
    const todo = await this.todoRepo.findOne({ where: { id, userId } });
    if (!todo) return false;
    await this.todoRepo.delete(id);
    return true;
  }
}
