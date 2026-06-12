import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacebookService } from './facebook.service';
import { FacebookController } from './facebook.controller';
import { FacebookPage } from './entities/facebook-page.entity';
import { FacebookPost } from './entities/facebook-post.entity';
import { ImageAsset } from '../assets/entities/image-asset.entity';
import { Part } from '../parts/entities/part.entity';
import { AiPostGenerator } from './ai-post-generator';

@Module({
  imports: [TypeOrmModule.forFeature([FacebookPage, FacebookPost, ImageAsset, Part])],
  controllers: [FacebookController],
  providers: [FacebookService, AiPostGenerator],
  exports: [FacebookService],
})
export class FacebookModule {}
