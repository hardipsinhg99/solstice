import { Body, Controller, Get, Header, Patch, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';

/** One row, so one GET and one PATCH - general CRUD would be ceremony. */
@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  getPublic() {
    return this.settings.getPublic();
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin')
  getAdmin() {
    return this.settings.get();
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  update(@Body() dto: UpdateSettingsDto, @CurrentAdmin() admin: { id: string }) {
    return this.settings.update(dto, admin.id);
  }
}
