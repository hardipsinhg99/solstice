import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { VideoService } from './video.service';
import { ProductMediaService } from './product-media.service';

@Module({
  controllers: [MediaController],
  providers: [MediaService, ProductMediaService, VideoService],
  exports: [MediaService, VideoService],
})
export class MediaModule {}
