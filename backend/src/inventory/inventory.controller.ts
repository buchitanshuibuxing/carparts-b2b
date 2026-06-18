import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission, PermissionsGuard } from '../common/guards/permissions.guard';


@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @RequirePermission('inventory', 'view')
  findAll(
    @Query('page') page: number = 1,
    @Query('page_size') pageSize: number = 20,
    @Query('warehouse_zone') zone?: string,
    @Query('is_low_stock') isLowStock?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.inventoryService.findAll(page, pageSize, {
      warehouse_zone: zone,
      is_low_stock: isLowStock === 'true',
      keyword,
    });
  }

  @Get('low-stock')
  @RequirePermission('inventory', 'view')
  getLowStock(@Query('limit') limit: number = 50) {
    return this.inventoryService.getLowStock(limit);
  }

  @Get('part/:partId')
  @RequirePermission('inventory', 'view')
  findByPart(@Param('partId') partId: number) {
    return this.inventoryService.findByPart(partId);
  }

  @Get('logs/:partId')
  @RequirePermission('inventory', 'view')
  getLogs(@Param('partId') partId: number, @Query('page') page: number = 1, @Query('page_size') pageSize: number = 20) {
    return this.inventoryService.getLogs(partId, page, pageSize);
  }

  @Post('adjust')
  @RequirePermission('inventory', 'edit')
  adjustStock(@Body() body: { part_id: number; delta: number; reason: string }, @CurrentUser('id') userId: number) {
    return this.inventoryService.adjustStock(body.part_id, body.delta, body.reason, userId);
  }

  @Put(':id')
  @RequirePermission('inventory', 'edit')
  updateOne(@Param('id') id: number, @Body() body: { warehouse_location?: string; warehouse_zone?: string; min_stock?: number; max_stock?: number; notes?: string }) {
    return this.inventoryService.updateOne(id, body);
  }

  @Delete(':id')
  @RequirePermission('inventory', 'delete')
  removeOne(@Param('id') id: number) {
    return this.inventoryService.removeOne(id);
  }

  @Post('sync')
  @RequirePermission('inventory', 'edit')
  syncFromParts() {
    return this.inventoryService.syncFromParts();
  }


  @Post('batch-update')
  @RequirePermission('inventory', 'edit')
  batchUpdate(@Body() body: { ids: number[]; warehouse_location?: string; warehouse_zone?: string; min_stock?: number; max_stock?: number; notes?: string }) {
    return this.inventoryService.batchUpdate(body.ids, body);
  }

  @Post('batch-delete')
  @RequirePermission('inventory', 'delete')
  batchDelete(@Body() body: { ids: number[] }) {
    return this.inventoryService.batchDelete(body.ids);
  }
}