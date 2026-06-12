import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Part } from '../parts/entities/part.entity';
import { PartClassification } from '../parts/entities/part-classification.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryLog } from '../inventory/entities/inventory-log.entity';
import { Price } from '../prices/entities/price.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Part, PartClassification, Customer, Inventory, InventoryLog, Price])],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
