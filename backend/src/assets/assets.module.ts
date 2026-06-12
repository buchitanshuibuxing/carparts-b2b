import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { ImageProcessingService } from './image-processing.service';
import { ImageRecognitionService } from './image-recognition.service';
import { OcrService } from './ocr.service';
import { ImportSourcesService } from './import-sources.service';
import { ImageAsset } from './entities/image-asset.entity';
import { AssetTag } from './entities/asset-tag.entity';
import { AssetClassification } from './entities/asset-classification.entity';
import { ImportSource } from './entities/import-source.entity';
import { Part } from '../parts/entities/part.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [TypeOrmModule.forFeature([ImageAsset, AssetTag, AssetClassification, ImportSource, Part]), SettingsModule],
  controllers: [AssetsController],
  providers: [AssetsService, ImageProcessingService, ImageRecognitionService, OcrService, ImportSourcesService],
  exports: [AssetsService],
})
export class AssetsModule {}
