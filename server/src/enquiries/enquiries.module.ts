import { Module } from '@nestjs/common';
import { EnquiriesService } from './enquiries.service';
import { EnquiriesController } from './enquiries.controller';
import { MailService } from './mail.service';

@Module({
  controllers: [EnquiriesController],
  providers: [EnquiriesService, MailService],
})
export class EnquiriesModule {}
