import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartsService } from './parts.service';
import { PartsController } from './parts.controller';
import { PartClassificationsService } from './part-classifications.service';
import { PartClassificationsController } from './part-classifications.controller';
import { Part } from './entities/part.entity';
import { PartClassification } from './entities/part-classification.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [TypeOrmModule.forFeature([Part, PartClassification, Inventory]), SettingsModule],
  controllers: [PartClassificationsController, PartsController],
  providers: [PartsService, PartClassificationsService],
  exports: [PartsService, PartClassificationsService],
})
export class PartsModule {}
