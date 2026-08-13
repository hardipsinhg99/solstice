import { Body, Controller, Get, Header, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { PagesService } from './pages.service';

@Controller('pages')
export class PagesController {
  constructor(private pages: PagesService) {}

  /** Public. Published sections only - see PagesService.findPublic. */
  /**
   * must-revalidate, not max-age=60.
   *
   * A minute of staleness is harmless for a catalogue, but this is the endpoint
   * an editor refreshes THE INSTANT they press Publish. Serving them their own
   * pre-publish copy for up to a minute reads as "publishing is broken", and
   * that is how an editor learns to distrust the button and publish twice.
   *
   * Express already emits an ETag for this JSON, so an unchanged page still
   * costs one 304 rather than a full body.
   */
  /** Public. Which page slugs are currently published - drives the nav. */
  @Get()
  listPublic() {
    return this.pages.listPublic();
  }

  @Get(':slug')
  @Header('Cache-Control', 'public, max-age=0, must-revalidate')
  findPublic(@Param('slug') slug: string) {
    return this.pages.findPublic(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/list')
  list() {
    return this.pages.listAdmin();
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/:slug')
  findAdmin(@Param('slug') slug: string) {
    return this.pages.findAdmin(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/:slug/section/:key')
  saveSection(
    @Param('slug') slug: string,
    @Param('key') key: string,
    @Body('data') data: unknown,
    // Optional: a save that omits it leaves visibility exactly as it was, so
    // an older client cannot silently un-hide a section by not knowing about
    // the field. The global ValidationPipe runs with forbidNonWhitelisted, but
    // @Body(key) reads a property rather than validating a DTO, so the value is
    // coerced here instead of trusted.
    @Body('visible') visible: unknown,
    @CurrentAdmin() admin: { id: string },
  ) {
    return this.pages.saveSection(
      slug, key, data, admin.id,
      visible === undefined ? undefined : Boolean(visible),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/:slug/publish')
  publish(@Param('slug') slug: string, @CurrentAdmin() admin: { id: string }) {
    return this.pages.publish(slug, admin.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/:slug/unpublish')
  unpublish(@Param('slug') slug: string, @CurrentAdmin() admin: { id: string }) {
    return this.pages.unpublish(slug, admin.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/:slug/discard')
  discard(@Param('slug') slug: string, @CurrentAdmin() admin: { id: string }) {
    return this.pages.discardDraft(slug, admin.id);
  }
}
