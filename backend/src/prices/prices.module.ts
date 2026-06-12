import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricesService } from './prices.service';
import { PricesController } from './prices.controller';
import { Price } from './entities/price.entity';
import { PriceLog } from './entities/price-log.entity';
import { Part } from '../parts/entities/part.entity';
import { PartClassification } from '../parts/entities/part-classification.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [TypeOrmModule.forFeature([Price, PriceLog, Part, PartClassification]), SettingsModule],
  controllers: [PricesController],
  providers: [PricesService],
  exports: [PricesService],
})
export class PricesModule {}
