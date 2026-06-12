import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartsService } from './parts.service';
import { PartsController } from './parts.controller';
import { Part } from './entities/part.entity';
import { PartClassification } from './entities/part-classification.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { ImageAsset } from '../assets/entities/image-asset.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Part, Inventory, PartClassification, ImageAsset])],
  controllers: [PartsController],
  providers: [PartsService],
  exports: [PartsService],
})
export class PartsModule {}
