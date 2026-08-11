import {
  BadRequestException, Body, Controller, Delete, Get, Header, Param, Patch, Post,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { TeamService } from './team.service';
import { MEDIA } from '../media/media.constants';

type Upload = { buffer: Buffer; originalname: string; size: number };
const UPLOAD = FileInterceptor('file', { limits: { fileSize: MEDIA.MAX_UPLOAD_BYTES, files: 1 } });

@Controller('team')
export class TeamController {
  constructor(private team: TeamService) {}

  // Team edits publish immediately - see TeamService. A 60s browser cache would
  // contradict that in the one place the admin promises "live immediately".
  @Get()
  @Header('Cache-Control', 'public, max-age=0, must-revalidate')
  findPublic() {
    return this.team.findPublic();
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin')
  findAllAdmin() {
    return this.team.findAllAdmin();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: { name?: string; role?: string; bio?: string }, @CurrentAdmin() a: { id: string }) {
    return this.team.create(body, a.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('order')
  reorder(@Body('ids') ids: string[], @CurrentAdmin() a: { id: string }) {
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
      throw new BadRequestException('ids must be an array of team member ids');
    }
    return this.team.reorder(ids, a.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>, @CurrentAdmin() a: { id: string }) {
    return this.team.update(id, body, a.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/photo')
  @UseInterceptors(UPLOAD)
  setPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Upload,
    @Body('altText') altText: string,
    @CurrentAdmin() a: { id: string },
  ) {
    if (!file) throw new BadRequestException('No file was uploaded');
    return this.team.setPhoto(id, file, altText ?? null, a.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/photo')
  clearPhoto(@Param('id') id: string, @CurrentAdmin() a: { id: string }) {
    return this.team.clearPhoto(id, a.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentAdmin() a: { id: string }) {
    return this.team.remove(id, a.id);
  }
}
