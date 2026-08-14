import { Body, Controller, Delete, Get, Header, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { SocialService } from './social.service';
import { ReorderSocialDto, UpsertSocialLinkDto } from './dto';

@Controller('social')
export class SocialController {
  constructor(private social: SocialService) {}

  /**
   * Public. Same 60s cache as /settings and /products - the footer is chrome, and
   * a minute of staleness on a social link costs nothing. Page content keeps
   * max-age=0 because an editor must see their own publish immediately; that
   * reasoning does not extend to here.
   */
  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  findPublic() {
    return this.social.findPublic();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-store')
  findAll() {
    return this.social.findAll();
  }

  /* @CurrentAdmin() takes NO argument. The decorator's signature is
     (_data: unknown, ctx) and it ignores the first parameter entirely, always
     returning the whole admin. Writing @CurrentAdmin('id') therefore looked
     right, compiled, and handed Prisma the admin OBJECT where updatedById wants
     a string - a PrismaClientValidationError surfacing as a 500 on every save.
     Every other controller in this codebase destructures admin.id; these three
     were the only ones that did not. */
  @Post('admin')
  @UseGuards(JwtAuthGuard)
  upsert(@Body() dto: UpsertSocialLinkDto, @CurrentAdmin() admin: { id: string }) {
    return this.social.upsert(dto, admin.id);
  }

  @Patch('admin/reorder')
  @UseGuards(JwtAuthGuard)
  reorder(@Body() dto: ReorderSocialDto, @CurrentAdmin() admin: { id: string }) {
    return this.social.reorder(dto, admin.id);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard)
  clear(@Param('id') id: string, @CurrentAdmin() admin: { id: string }) {
    return this.social.clear(id, admin.id);
  }
}
