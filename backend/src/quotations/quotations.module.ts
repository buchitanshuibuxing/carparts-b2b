import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotationsService } from './quotations.service';
import { QuotationsController } from './quotations.controller';
import { Quotation } from './entities/quotation.entity';
import { QuotationItem } from './entities/quotation-item.entity';
import { QuotationTemplate } from './entities/quotation-template.entity';
import { PaymentAccount } from './entities/payment-account.entity';
import { Part } from '../parts/entities/part.entity';
import { PartClassification } from '../parts/entities/part-classification.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryLog } from '../inventory/entities/inventory-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    Quotation, QuotationItem, QuotationTemplate, PaymentAccount,
    Part, PartClassification, Customer,
    Order, OrderItem, Inventory, InventoryLog,
  ])],
  controllers: [QuotationsController],
  providers: [QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
