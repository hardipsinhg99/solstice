import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(dto: LoginDto) {
    const admin = await this.prisma.admin.findUnique({ where: { email: dto.email.toLowerCase() } });

    // Compare against a dummy hash when the email is unknown so that a wrong
    // email and a wrong password take the same time. Otherwise the response
    // latency enumerates valid admin addresses.
    const hash = admin?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidina';
    const ok = await bcrypt.compare(dto.password, hash);
    if (!admin || !ok) throw new UnauthorizedException('Invalid email or password');

    await this.prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

    return {
      accessToken: await this.jwt.signAsync({ sub: admin.id, email: admin.email }),
      admin: { id: admin.id, email: admin.email, name: admin.name },
    };
  }
}
