import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequirePermission, PermissionsGuard } from '../common/guards/permissions.guard';


@Controller('quotations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class QuotationsController {
  constructor(private svc: QuotationsService) {}

  @Get('templates') getTemplates() { return this.svc.getTemplates(); }
  @Get('templates/:id') getTemplate(@Param('id') id: number) { return this.svc.getTemplate(id); }
  @Post('templates') saveTemplate(@Body() body: any) { return this.svc.saveTemplate(body); }
  @Put('templates/:id') updateTemplate(@Param('id') id: number, @Body() body: any) { return this.svc.updateTemplate(id, body); }
  @RequirePermission('quotations', 'delete')
  @Delete('templates/:id') deleteTemplate(@Param('id') id: number) { return this.svc.deleteTemplate(id); }

  @Get() findAll() { return this.svc.findAll(); }

  @Get('next-number')
  getNextQuotationNumber(@Query('prefix') prefix?: string, @Query('middle_type') middleType?: string, @Query('middle_custom') middleCustom?: string, @Query('suffix_start') suffixStart?: string) {
    return this.svc.getNextQuotationNumber({
      quote_prefix: prefix,
      quote_middle_type: middleType,
      quote_middle_custom: middleCustom,
      quote_suffix_start: suffixStart,
    });
  }

  @Post('generate')
  generate(@Body() body: any) {
    if (body.type === 'convert' && body.id) return this.svc.convertToOrder(body.id);
    if (body.type === 'batch-delete' && body.ids) return this.svc.batchDelete(body.ids);
    if (body.type === 'batch-status' && body.ids) return this.svc.batchStatus(body.ids, body.status);
    return this.svc.generate(body);
  }

  // Payment Accounts
  @Get('payment-accounts') getPaymentAccounts() { return this.svc.getPaymentAccounts(); }
  @Get('payment-accounts/:id') getPaymentAccount(@Param('id') id: number) { return this.svc.getPaymentAccount(id); }
  @Post('payment-accounts') createPaymentAccount(@Body() body: any) { return this.svc.createPaymentAccount(body); }
  @Put('payment-accounts/:id') updatePaymentAccount(@Param('id') id: number, @Body() body: any) { return this.svc.updatePaymentAccount(id, body); }
  @RequirePermission('quotations', 'delete')
  @Delete('payment-accounts/:id') deletePaymentAccount(@Param('id') id: number) { return this.svc.deletePaymentAccount(id); }

  @Get(':id') findOne(@Param('id') id: number) { return this.svc.findOne(id); }
  @Put(':id') update(@Param('id') id: number, @Body() body: any) { return this.svc.updateQuotation(id, body); }
  @Put(':id/status') updateStatus(@Param('id') id: number, @Body() body: { status: string }) { return this.svc.updateStatus(id, body.status); }
}
