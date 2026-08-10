import {
  BadRequestException, Body, Controller, Delete, Get, Header, Param, Patch, Post,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { GalleryService } from './gallery.service';
import { MEDIA } from '../media/media.constants';

type Upload = { buffer: Buffer; originalname: string; size: number };

// The same interceptor configuration MediaController uses - one file, the same
// byte ceiling. MediaService re-checks the length independently.
const UPLOAD = FileInterceptor('file', { limits: { fileSize: MEDIA.MAX_UPLOAD_BYTES, files: 1 } });

/** No `fs`, no path construction, no second upload pipeline. */
@Controller('gallery')
export class GalleryController {
  constructor(private gallery: GalleryService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  findPublic() {
    return this.gallery.findPublic();
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin')
  findAllAdmin() {
    return this.gallery.findAllAdmin();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(UPLOAD)
  add(
    @UploadedFile() file: Upload,
    @Body() body: { caption?: string; altText?: string },
    @CurrentAdmin() admin: { id: string },
  ) {
    if (!file) throw new BadRequestException('No file was uploaded');
    return this.gallery.add(file, body, admin.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('order')
  reorder(@Body('ids') ids: string[], @CurrentAdmin() admin: { id: string }) {
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
      throw new BadRequestException('ids must be an array of gallery image ids');
    }
    return this.gallery.reorder(ids, admin.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { caption?: string; published?: boolean },
    @CurrentAdmin() admin: { id: string },
  ) {
    return this.gallery.update(id, body, admin.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentAdmin() admin: { id: string }) {
    return this.gallery.remove(id, admin.id);
  }
}
