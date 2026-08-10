import { Module } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { GalleryController } from './gallery.controller';
import { MediaModule } from '../media/media.module';

// MediaModule is imported, not re-implemented: MediaService is the single
// upload pipeline and MediaModule already exports it.
@Module({
  imports: [MediaModule],
  controllers: [GalleryController],
  providers: [GalleryService],
})
export class GalleryModule {}
