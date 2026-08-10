import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { ProductMediaService } from './product-media.service';

@Module({
  controllers: [MediaController],
  providers: [MediaService, ProductMediaService],
  exports: [MediaService],
})
export class MediaModule {}
