import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EnquiryStatus } from '@prisma/client';
import { EnquiriesService } from './enquiries.service';
import { CreateEnquiryDto, UpdateEnquiryStatusDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';

@Controller('enquiries')
export class EnquiriesController {
  constructor(private enquiries: EnquiriesService) {}

  /**
   * Public. The only unguarded write endpoint on the API, so it carries its own
   * throttle: 5/minute per IP instead of the global 120. A buyer sends one
   * enquiry; anything sending more is not a buyer.
   */
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(@Body() dto: CreateEnquiryDto) {
    return this.enquiries.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('search') search?: string, @Query('status') status?: string) {
    const valid = status && status in EnquiryStatus ? (status as EnquiryStatus) : undefined;
    return this.enquiries.findAll(search, valid);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  setStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEnquiryStatusDto,
    @CurrentAdmin() admin: { id: string },
  ) {
    return this.enquiries.setStatus(id, dto.status, admin.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentAdmin() admin: { id: string }) {
    return this.enquiries.remove(id, admin.id);
  }
}
