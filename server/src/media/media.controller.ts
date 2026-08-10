import {
  BadRequestException, Body, Controller, Delete, Param, Patch, Post,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { MediaService } from './media.service';
import { ProductMediaService } from './product-media.service';
import { MEDIA } from './media.constants';

type Admin = { id: string; email: string; name: string };
type Upload = { buffer: Buffer; originalname: string; size: number; mimetype: string };

// Multer's own limit is the first gate; MediaService re-checks the byte length
// independently, because a limit enforced in exactly one place is a limit one
// refactor away from not existing.
const UPLOAD = FileInterceptor('file', { limits: { fileSize: MEDIA.MAX_UPLOAD_BYTES, files: 1 } });

/**
 * No `fs` import. No path is built here. The controller hands a Buffer to a
 * service and never learns where the bytes land - acceptance check 10.
 */
@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private media: MediaService, private productMedia: ProductMediaService) {}

  @Post('products/:productId/primary')
  @UseInterceptors(UPLOAD)
  setPrimary(
    @Param('productId') productId: string,
    @UploadedFile() file: Upload,
    @Body('altText') altText: string,
    @CurrentAdmin() admin: Admin,
  ) {
    return this.productMedia.setPrimary(productId, this.require(file), altText ?? null, admin.id);
  }

  @Delete('products/:productId/primary')
  clearPrimary(@Param('productId') productId: string, @CurrentAdmin() admin: Admin) {
    return this.productMedia.clearPrimary(productId, admin.id);
  }

  @Post('products/:productId/gallery')
  @UseInterceptors(UPLOAD)
  addGallery(
    @Param('productId') productId: string,
    @UploadedFile() file: Upload,
    @Body('altText') altText: string,
    @CurrentAdmin() admin: Admin,
  ) {
    return this.productMedia.addGalleryImage(productId, this.require(file), altText ?? null, admin.id);
  }

  @Delete('products/:productId/gallery/:assetId')
  removeGallery(
    @Param('productId') productId: string,
    @Param('assetId') assetId: string,
    @CurrentAdmin() admin: Admin,
  ) {
    return this.productMedia.removeGalleryImage(productId, assetId, admin.id);
  }

  @Patch('products/:productId/gallery/order')
  reorder(
    @Param('productId') productId: string,
    @Body('assetIds') assetIds: string[],
    @CurrentAdmin() admin: Admin,
  ) {
    if (!Array.isArray(assetIds) || assetIds.some((id) => typeof id !== 'string')) {
      throw new BadRequestException('assetIds must be an array of ids');
    }
    return this.productMedia.reorderGallery(productId, assetIds, admin.id);
  }

  /** Alt text is editable without re-uploading; it is content, not a file property. */
  @Patch('assets/:id/alt')
  updateAlt(@Param('id') id: string, @Body('altText') altText: string) {
    return this.media.updateAltText(id, altText ?? null);
  }

  private require(file?: Upload): Upload {
    if (!file) throw new BadRequestException('No file was uploaded');
    return file;
  }
}
