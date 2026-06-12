import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportExportService } from './import-export.service';
import { ImportExportController } from './import-export.controller';
import { Part } from '../parts/entities/part.entity';
import { PartClassification } from '../parts/entities/part-classification.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Price } from '../prices/entities/price.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [TypeOrmModule.forFeature([Part, PartClassification, Inventory, Supplier, Customer, Price, Order, OrderItem]), SettingsModule],
  controllers: [ImportExportController],
  providers: [ImportExportService],
  exports: [ImportExportService],
})
export class ImportExportModule {}
