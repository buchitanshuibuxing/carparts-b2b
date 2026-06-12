import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('quotations')
@UseGuards(JwtAuthGuard)
export class QuotationsController {
  constructor(private svc: QuotationsService) {}

  // ==================== Templates ====================
  @Get('templates') getTemplates() { return this.svc.getTemplates(); }
  @Get('templates/:id') getTemplate(@Param('id') id: number) { return this.svc.getTemplate(id); }
  @Post('templates') saveTemplate(@Body() body: any) { return this.svc.saveTemplate(body); }
  @Put('templates/:id') updateTemplate(@Param('id') id: number, @Body() body: any) { return this.svc.updateTemplate(id, body); }
  @Delete('templates/:id') deleteTemplate(@Param('id') id: number) { return this.svc.deleteTemplate(id); }

  // ==================== Payment Accounts ====================
  @Get('payment-accounts') getPaymentAccounts() { return this.svc.getPaymentAccounts(); }
  @Get('payment-accounts/:id') getPaymentAccount(@Param('id') id: number) { return this.svc.getPaymentAccount(id); }
  @Post('payment-accounts') createPaymentAccount(@Body() body: any) { return this.svc.createPaymentAccount(body); }
  @Put('payment-accounts/:id') updatePaymentAccount(@Param('id') id: number, @Body() body: any) { return this.svc.updatePaymentAccount(id, body); }
  @Delete('payment-accounts/:id') deletePaymentAccount(@Param('id') id: number) { return this.svc.deletePaymentAccount(id); }

  // ==================== Quotations ====================
  @Get()
  findAll(
    @Query('page') page?: string, @Query('limit') limit?: string,
    @Query('status') status?: string, @Query('customer_id') customerId?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.svc.findAll(Number(page) || 1, Number(limit) || 20, {
      status, customer_id: customerId ? Number(customerId) : undefined, keyword,
    });
  }

  @Get(':id') findOne(@Param('id') id: number) { return this.svc.findOne(id); }

  @Post('generate') generate(@Body() body: any) { return this.svc.generate(body); }

  @Put(':id') update(@Param('id') id: number, @Body() body: any) { return this.svc.update(id, body); }

  @Delete(':id') delete(@Param('id') id: number) { return this.svc.delete(id); }

  @Put(':id/status') updateStatus(@Param('id') id: number, @Body() body: { status: string }) {
    return this.svc.updateStatus(id, body.status);
  }

  @Post(':id/convert-to-order') convertToOrder(@Param('id') id: number, @CurrentUser('id') uid: number) {
    return this.svc.convertToOrder(id, uid);
  }
}
