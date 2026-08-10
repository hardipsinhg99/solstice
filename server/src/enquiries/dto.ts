import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { EnquiryStatus } from '@prisma/client';

/** Exactly the fields the live contact form posts - nothing speculative. */
export class CreateEnquiryDto {
  @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @IsEmail({}, { message: 'A valid email address is required.' }) @MaxLength(200) email!: string;
  @IsString() @MinLength(3) @MaxLength(60) phone!: string;
  @IsString() @MinLength(1) @MaxLength(4000) message!: string;

  /** The form's required consent checkbox posts "yes". */
  @IsOptional() @IsString() @MaxLength(10) consent?: string;

  /**
   * Honeypot. A real buyer never sees this field, so anything in it is a bot.
   * Accepted and silently discarded rather than rejected - a 400 tells the bot
   * which field gave it away.
   */
  @IsOptional() @IsString() @MaxLength(200) company_website?: string;
}

export class UpdateEnquiryStatusDto {
  @IsEnum(EnquiryStatus, { message: 'status must be NEW, CONTACTED or CLOSED' })
  status!: EnquiryStatus;
}
