import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequirePermission, PermissionsGuard } from '../common/guards/permissions.guard';


@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
  constructor(private svc: SuppliersService) {}

  @Get() findAll(@Query('page') p = 1, @Query('page_size') ps = 20, @Query('is_active') a?: string) {
    return this.svc.findAll(p, ps, a !== undefined ? a === 'true' : undefined);
  }
  @Get(':id') findOne(@Param('id') id: number) { return this.svc.findOne(id); }
  @Get(':id/parts') getParts(@Param('id') id: number) { return this.svc.getSupplierParts(id); }
  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Put(':id') update(@Param('id') id: number, @Body() body: any) { return this.svc.update(id, body); }
  @Put(':id/toggle') toggle(@Param('id') id: number, @Body() body: { is_active: boolean }) { return this.svc.toggleActive(id, body.is_active); }
  @Post('link-part') linkPart(@Body() body: any) { return this.svc.linkPart(body); }
  @Delete(':id') remove(@Param('id') id: number) { return this.svc.remove(id); }
  @RequirePermission('suppliers', 'delete')

  @Post('batch-update')
  batchUpdate(@Body() body: { ids: number[] } & Record<string, any>) {
    return this.svc.batchUpdate(body.ids, body);
  }

  @Post('batch-delete')
  batchDelete(@Body() body: { ids: number[] }) {
    return this.svc.batchDelete(body.ids);
  }
}