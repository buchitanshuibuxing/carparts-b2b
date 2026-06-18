import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PartsService } from './parts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequirePermission, PermissionsGuard } from '../common/guards/permissions.guard';


@Controller('parts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PartsController {
  constructor(private partsService: PartsService) {}

  @Get()
  @RequirePermission('parts', 'view')
  findAll(
    @Query('page') page: number = 1,
    @Query('page_size') pageSize: number = 20,
    @Query('category') category?: string,
    @Query('brand') brand?: string,
    @Query('car_model') carModel?: string,
    @Query('part_type') partType?: string,
    @Query('is_active') isActive?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.partsService.findAll(page, pageSize, {
      category, brand, car_model: carModel, part_type: partType,
      is_active: isActive !== undefined ? isActive === 'true' : undefined,
      keyword,
    });
  }

  @Get('search')
  @RequirePermission('parts', 'view')
  search(@Query('q') query: string, @Query('limit') limit: number = 20) {
    return this.partsService.search(query, limit);
  }

  @Get('categories')
  @RequirePermission('parts', 'view')
  getCategories() {
    return this.partsService.getCategories();
  }

  @Get("classifications")
  @RequirePermission('parts', 'view')
  getClassifications() {
    return this.partsService.getClassifications();
  }

  @Post("classifications")
  @RequirePermission('parts', 'create')
  createClassification(@Body() body: { name: string; description?: string; parent_id?: number }) {
    return this.partsService.createClassification(body);
  }

  @Delete("classifications/:id")
  @RequirePermission('parts', 'delete')
  deleteClassification(@Param("id") id: number) {
    return this.partsService.deleteClassification(id);
  }

  @Get(':id')
  @RequirePermission('parts', 'view')
  findOne(@Param('id') id: number) {
    return this.partsService.findOne(id);
  }

  @Post()
  @RequirePermission('parts', 'create')
  create(@Body() body: any) {
    return this.partsService.create(body);
  }

  @Put(':id')
  @RequirePermission('parts', 'edit')
  update(@Param('id') id: number, @Body() body: any) {
    return this.partsService.update(id, body);
  }

  @Delete(':id')
  @RequirePermission('parts', 'delete')
  remove(@Param('id') id: number) {
    return this.partsService.remove(id);
  }

  // ---- Batch operations ----

  @Post("batch-delete")
  @RequirePermission('parts', 'delete')
  batchDelete(@Body() body: { ids: number[] }) {
    return this.partsService.batchDelete(body.ids);
  }

  @Post("batch-translate")
  @RequirePermission("parts", "edit")
  async batchTranslate(@Body() body: { ids?: number[] }) {
    console.log('[Controller] batchTranslate called with ids:', body.ids?.length || 'undefined');
    const result = await this.partsService.batchTranslate(body.ids);
    console.log('[Controller] batchTranslate result:', JSON.stringify(result));
    return result;
  }
}