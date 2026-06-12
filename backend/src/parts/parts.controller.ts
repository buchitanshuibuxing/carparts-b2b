import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PartsService } from './parts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('parts')
@UseGuards(JwtAuthGuard)
export class PartsController {
  constructor(private partsService: PartsService) {}

  @Get()
  findAll(
    @Query('page') page: number = 1,
    @Query('page_size') pageSize: number = 20,
    @Query('classification_id') classificationId?: number,
    @Query('category') category?: string,
    @Query('brand') brand?: string,
    @Query('car_model') carModel?: string,
    @Query('part_type') partType?: string,
    @Query('is_active') isActive?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.partsService.findAll(page, pageSize, {
      classification_id: classificationId ? Number(classificationId) : undefined,
      category, brand, car_model: carModel, part_type: partType,
      is_active: isActive !== undefined ? isActive === 'true' : undefined,
      keyword,
    });
  }

  @Get('search')
  search(@Query('q') query: string, @Query('limit') limit: number = 20) {
    return this.partsService.search(query, limit);
  }

  @Get('categories')
  getCategories() {
    return this.partsService.getCategories();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.partsService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.partsService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: number, @Body() body: any) {
    return this.partsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.partsService.remove(id);
  }

  @Post('batch-delete')
  batchDelete(@Body() body: { ids: number[] }) {
    return this.partsService.batchDelete(body.ids);
  }

  @Post('batch-translate')
  batchTranslate(@Body() body: { ids?: number[] }) {
    return this.partsService.batchTranslate(body.ids);
  }
}
