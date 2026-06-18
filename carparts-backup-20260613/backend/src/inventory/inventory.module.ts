import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { Inventory } from './entities/inventory.entity';
import { InventoryLog } from './entities/inventory-log.entity';
import { Part } from '../parts/entities/part.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Inventory, InventoryLog, Part])],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
