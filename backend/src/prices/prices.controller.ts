import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PricesService } from './prices.service';
import { SettingsService } from '../settings/settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const DEFAULT_PRICE_TYPES = ['批发价', '零售价', '促销价', '成本价', 'VIP价'];
const DEFAULT_CURRENCIES = ['USD', 'EUR', 'CNY', 'GBP', 'JPY', 'KRW'];

@Controller('prices')
@UseGuards(JwtAuthGuard)
export class PricesController {
  constructor(private svc: PricesService, private settingsSvc: SettingsService) {}

  @Get()
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 20, @Query('keyword') kw?: string, @Query('price_type') pt?: string) {
    return this.svc.findAll(page, limit, { keyword: kw, price_type: pt });
  }

  @Get('part/:partId') findByPart(@Param('partId') partId: number) { return this.svc.findByPart(partId); }
  @Get('history/:partId') getHistory(@Param('partId') partId: number) { return this.svc.getHistory(partId); }
  @Post('set') setPrice(@Body() body: any) { return this.svc.setPrice(body); }
  @Put(':id') updateOne(@Param('id') id: number, @Body() body: any) { return this.svc.updateOne(id, body); }
  @Delete(':id') deletePrice(@Param('id') id: number) { return this.svc.deletePrice(id); }

  @Post('batch-update')
  batchUpdate(@Body() body: { ids: number[] } & Record<string, any>) {
    return this.svc.batchUpdate(body.ids, body);
  }

  @Post('batch-delete')
  batchDelete(@Body() body: { ids: number[] }) {
    return this.svc.batchDelete(body.ids);
  }

  @Post('sync')
  syncFromParts() {
    return this.svc.syncFromParts();
  }

  @Get('config/types')
  async getTypes() {
    const settings = await this.settingsSvc.getAll();
    return {
      types: settings.price_types ? JSON.parse(settings.price_types) : DEFAULT_PRICE_TYPES,
      currencies: settings.currencies ? JSON.parse(settings.currencies) : DEFAULT_CURRENCIES,
    };
  }

  @Put('config/types')
  async updateTypes(@Body() body: { types?: string[]; currencies?: string[] }) {
    if (body.types) await this.settingsSvc.update('price_types', JSON.stringify(body.types));
    if (body.currencies) await this.settingsSvc.update('currencies', JSON.stringify(body.currencies));
    return { success: true };
  }
}
