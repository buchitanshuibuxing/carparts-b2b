import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TodosService } from './todos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('todos')
@UseGuards(JwtAuthGuard)
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  findAll(@CurrentUser('id') userId: number, @Query('priority') priority?: string) {
    return this.todosService.findAll(userId, priority);
  }

  @Post()
  create(@CurrentUser('id') userId: number, @Body() body: { content: string; priority?: string; tag?: string; dueDate?: string }) {
    return this.todosService.create(userId, body);
  }

  @Patch(':id')
  update(@CurrentUser('id') userId: number, @Param('id') id: string, @Body() body: Partial<{ content: string; priority: string; isDone: boolean; tag: string; dueDate: string }>) {
    return this.todosService.update(userId, +id, body);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: number, @Param('id') id: string) {
    return this.todosService.remove(userId, +id);
  }
}
