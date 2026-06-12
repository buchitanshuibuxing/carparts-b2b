import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { SettingsService } from '../settings/settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const DEFAULT_CUSTOMER_TYPES = ['经销商', '修理厂', '终端客户', '贸易商', '电商平台'];
const DEFAULT_CUSTOMER_LEVELS = ['普通', 'VIP', '重点', '潜在'];

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private svc: CustomersService, private settingsSvc: SettingsService) {}

  @Get() findAll(@Query('page') p = 1, @Query('page_size') ps = 20, @Query('keyword') kw?: string, @Query('is_active') a?: string, @Query('customer_type') ct?: string) {
    return this.svc.findAll(p, ps, { keyword: kw, is_active: a !== undefined ? a === 'true' : undefined, customer_type: ct });
  }
  @Get(':id') findOne(@Param('id') id: number) { return this.svc.findOne(id); }
  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Put(':id') update(@Param('id') id: number, @Body() body: any) { return this.svc.update(id, body); }
  @Put(':id/toggle') toggle(@Param('id') id: number, @Body() body: { is_active: boolean }) { return this.svc.toggleActive(id, body.is_active); }
  @Delete(':id') remove(@Param('id') id: number) { return this.svc.remove(id); }

  @Get('config/types')
  async getCustomerTypes() {
    const settings = await this.settingsSvc.getAll();
    return {
      types: settings.customer_types ? JSON.parse(settings.customer_types) : DEFAULT_CUSTOMER_TYPES,
      levels: settings.customer_levels ? JSON.parse(settings.customer_levels) : DEFAULT_CUSTOMER_LEVELS,
    };
  }

  @Put('config/types')
  async updateCustomerTypes(@Body() body: { types?: string[]; levels?: string[] }) {
    if (body.types) await this.settingsSvc.update('customer_types', JSON.stringify(body.types));
    if (body.levels) await this.settingsSvc.update('customer_levels', JSON.stringify(body.levels));
    return { success: true };
  }

  @Post('batch-update')
  batchUpdate(@Body() body: { ids: number[] } & Record<string, any>) {
    return this.svc.batchUpdate(body.ids, body);
  }

  @Post('batch-delete')
  batchDelete(@Body() body: { ids: number[] }) {
    return this.svc.batchDelete(body.ids);
  }
}
