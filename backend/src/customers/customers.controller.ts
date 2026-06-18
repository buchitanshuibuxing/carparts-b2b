import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequirePermission, PermissionsGuard } from '../common/guards/permissions.guard';


@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private svc: CustomersService) {}

  @Get()
  @RequirePermission('customers', 'view')
  findAll(@Query('page') p = 1, @Query('page_size') ps = 20, @Query('keyword') kw?: string, @Query('is_active') a?: string) {
    return this.svc.findAll(p, ps, { keyword: kw, is_active: a !== undefined ? a === 'true' : undefined });
  }

  @Get(':id')
  @RequirePermission('customers', 'view')
  findOne(@Param('id') id: number) { return this.svc.findOne(id); }

  @Post()
  @RequirePermission('customers', 'create')
  create(@Body() body: any) { return this.svc.create(body); }

  @Put(':id')
  @RequirePermission('customers', 'edit')
  update(@Param('id') id: number, @Body() body: any) { return this.svc.update(id, body); }

  @Put(':id/toggle')
  @RequirePermission('customers', 'edit')
  toggle(@Param('id') id: number, @Body() body: { is_active: boolean }) { return this.svc.toggleActive(id, body.is_active); }

  @RequirePermission('customers', 'delete')
  @Delete(':id') remove(@Param('id') id: number) { return this.svc.remove(id); }

  @Post('batch-update')
  @RequirePermission('customers', 'edit')
  batchUpdate(@Body() body: { ids: number[] } & Record<string, any>) {
    return this.svc.batchUpdate(body.ids, body);
  }

  @Post('batch-delete')
  @RequirePermission('customers', 'delete')
  batchDelete(@Body() body: { ids: number[] }) {
    return this.svc.batchDelete(body.ids);
  }

  @Get('config/types')
  getConfigTypes() { return this.svc.getConfigTypes(); }

  @Put('config/types')
  updateConfigTypes(@Body() body: { types?: string[]; levels?: string[] }) {
    return this.svc.updateConfigTypes(body);
  }

}