import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentAdmin } from './current-admin.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  /** 5 attempts per minute per IP. A single-admin system is one credential to
   *  brute-force, so this is the only meaningful lock on the front door. */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** Lets the frontend validate a stored token on boot without guessing. */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentAdmin() admin: { id: string; email: string; name: string }) {
    return admin;
  }
}
