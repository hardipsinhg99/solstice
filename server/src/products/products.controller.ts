import {
  Body, Controller, Delete, Get, Header, Param, Patch, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { ProductsService } from './products.service';
import { UpsertProductDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';

type Admin = { id: string; email: string; name: string };

@Controller('products')
export class ProductsController {
  constructor(private products: ProductsService) {}

  // ── Public. Unguarded, published rows only - the filter is applied in the
  //    service, never left to a client-supplied flag. ────────────────────────
  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  findPublic(@Query('trade') trade?: string) {
    return this.products.findPublic(trade);
  }

  @Get('slug/:slug')
  @Header('Cache-Control', 'public, max-age=60')
  findPublicOne(@Param('slug') slug: string) {
    return this.products.findPublicOne(slug);
  }

  // ── Admin. Every mutating route guarded. ──────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('admin/all')
  findAllAdmin(@Query('search') search?: string) {
    return this.products.findAllAdmin(search);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/:id')
  findOneAdmin(@Param('id') id: string) {
    return this.products.findOneAdmin(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: UpsertProductDto, @CurrentAdmin() admin: Admin) {
    return this.products.create(dto, admin.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpsertProductDto, @CurrentAdmin() admin: Admin) {
    return this.products.update(id, dto, admin.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body('status') status: ProductStatus, @CurrentAdmin() admin: Admin) {
    return this.products.setStatus(id, status, admin.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentAdmin() admin: Admin) {
    return this.products.remove(id, admin.id);
  }
}
