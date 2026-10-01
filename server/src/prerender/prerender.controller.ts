import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrerenderService } from './prerender.service';

@Controller('prerender')
export class PrerenderController {
  constructor(private prerender: PrerenderService) {}

  /** Admin-only and never cached: its whole purpose is to be current. */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-store')
  status() {
    return this.prerender.status();
  }
}
