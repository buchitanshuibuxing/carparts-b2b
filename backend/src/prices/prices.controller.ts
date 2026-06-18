import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PricesService } from './prices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequirePermission, PermissionsGuard } from '../common/guards/permissions.guard';


@Controller('prices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PricesController {
  constructor(private svc: PricesService) {}

  @Get()
  @RequirePermission('prices', 'view')
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 100,
    @Query('keyword') keyword?: string,
    @Query('price_type') priceType?: string,
  ) {
    return this.svc.findAll(page, limit, { keyword, price_type: priceType });
  }

  @Get('part/:partId') findByPart(@Param('partId') partId: number) { return this.svc.findByPart(partId); }
  @Get('history/:partId') getHistory(@Param('partId') partId: number) { return this.svc.getHistory(partId); }
  @Post('set') setPrice(@Body() body: any) { return this.svc.setPrice(body); }
  @RequirePermission('prices', 'delete')
  @Delete(':id') deletePrice(@Param('id') id: number) { return this.svc.deletePrice(id); }

  @Post('sync')
  syncFromParts() {
    return this.svc.syncFromParts();
  }

  @Get('config/types')
  getConfigTypes() {
    return this.svc.getConfigTypes();
  }

  @Put('config/types')
  updateConfigTypes(@Body() body: { types?: string[]; currencies?: string[] }) {
    return this.svc.updateConfigTypes(body);
  }
}