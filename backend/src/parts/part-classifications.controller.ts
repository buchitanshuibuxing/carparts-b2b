import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PartClassificationsService } from './part-classifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('parts/classifications')
@UseGuards(JwtAuthGuard)
export class PartClassificationsController {
  constructor(private svc: PartClassificationsService) {}

  @Get()
  findAll() { return this.svc.findAll(); }

  @Post()
  create(@Body() body: { name: string; parent_id?: number; description?: string }) {
    return this.svc.create(body);
  }

  @Put(':id')
  update(@Param('id') id: number, @Body() body: { name?: string; description?: string; sort_order?: number }) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: number) { return this.svc.delete(id); }
}
