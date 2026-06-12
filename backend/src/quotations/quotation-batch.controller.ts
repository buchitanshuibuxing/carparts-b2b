import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('quotationbatch')
export class QuotationBatchController {
  constructor(private svc: QuotationsService) {}

  @Post('delete')
  batchDelete(@Body() body: { ids: number[] }) {
    return this.svc.batchDelete(body.ids);
  }

  @Post('status')
  batchStatus(@Body() body: { ids: number[]; status: string }) {
    return this.svc.batchStatus(body.ids, body.status);
  }

  @Post('convert')
  convert(@Body() body: { id: number }) {
    return this.svc.convertToOrder(body.id);
  }
}
