import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission, PermissionsGuard } from '../common/guards/permissions.guard';


@Controller('orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrdersController {
  constructor(private svc: OrdersService) {}

  @Get()
  @RequirePermission('orders', 'view')
  findAll(@Query('page') p = 1, @Query('page_size') ps = 100, @Query('status') s?: string, @Query('customer_id') cid?: number, @Query('keyword') kw?: string) {
    return this.svc.findAll(p, ps, { status: s, customer_id: cid, keyword: kw });
  }

  @Get('stats')
  getStats(@Query('date_from') df?: string, @Query('date_to') dt?: string) {
    return this.svc.getStats(df, dt);
  }

  @Get('default-price/:partId')
  getDefaultPrice(@Param('partId') partId: number) {
    return this.svc.getDefaultPrice(partId).then(p => ({ price: p }));
  }

  @Get(':id')
  findOne(@Param('id') id: number) { return this.svc.findOne(id); }

  @Post()
  @RequirePermission('orders', 'create')
  create(@Body() body: any, @CurrentUser('id') uid: number) { return this.svc.create(body, uid); }

  @Put(':id')
  @RequirePermission('orders', 'edit')
  updateOrder(@Param('id') id: number, @Body() body: any) { return this.svc.updateOrder(id, body); }

  @Put(':id/status')
  updateStatus(@Param('id') id: number, @Body() body: { status: string }) { return this.svc.updateStatus(id, body.status); }

  @Post(':id/cancel')
  cancel(@Param('id') id: number, @Body() body: { reason: string }, @CurrentUser('id') uid: number) { return this.svc.cancel(id, body.reason, uid); }

  @Post(':id/items')
  addItem(@Param('id') id: number, @Body() body: any) { return this.svc.addItem(id, body); }

  @Put('items/:itemId')
  updateItem(@Param('itemId') itemId: number, @Body() body: any) { return this.svc.updateItem(itemId, body); }

  @Delete('items/:itemId')
  @RequirePermission('orders', 'delete')
  removeItem(@Param('itemId') itemId: number) { return this.svc.removeItem(itemId); }

  @Delete(':id')
  @RequirePermission('orders', 'delete')
  deleteOrder(@Param('id') id: number) { return this.svc.deleteOrder(id); }

  @Post('batch-update-status')
  batchUpdateStatus(@Body() body: { ids: number[]; status: string }) { return this.svc.batchUpdateStatus(body.ids, body.status); }

  @Post('batch-delete')
  batchDelete(@Body() body: { ids: number[] }) { return this.svc.batchDelete(body.ids); }
}
