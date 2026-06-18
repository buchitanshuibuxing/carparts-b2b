import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TodosService } from './todos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('todos')
@UseGuards(JwtAuthGuard)
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  findAll(@Query('priority') priority?: string) {
    return this.todosService.findAll(priority);
  }

  @Post()
  create(@Body() body: { content: string; priority?: string }) {
    return this.todosService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<{ content: string; priority: string; isDone: boolean }>) {
    return this.todosService.update(+id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.todosService.remove(+id);
  }
}
