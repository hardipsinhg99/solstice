import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength, IsBoolean } from 'class-validator';

/**
 * wa.me takes the number as DIGITS ONLY in international format - no leading +,
 * no spaces, dashes or parentheses. None of those are rejected by wa.me with an
 * error; they silently resolve to "phone number shared via url is invalid", so
 * the failure only ever appears on a buyer's screen. That is why this is a real
 * format check and not a non-empty check.
 *
 * 8-15 digits is the E.164 subscriber range: shorter cannot be a routable
 * international number, longer is not valid E.164.
 */
export const WHATSAPP_NUMBER_PATTERN = /^[1-9]\d{7,14}$/;

export class UpdateSettingsDto {
  @IsOptional()
  @Matches(WHATSAPP_NUMBER_PATTERN, {
    message:
      'WhatsApp number must be digits only in international format - no +, spaces, dashes or brackets. ' +
      'India example: 919876543210.',
  })
  whatsappNumber?: string;

  @IsOptional() @IsString() @MinLength(1) @MaxLength(300)
  whatsappMessage?: string;

  @IsOptional() @IsEmail({}, { message: 'Contact email must be a valid address.' }) @MaxLength(200)
  contactEmail?: string;

  /** Whether the header renders the Google Translate widget at all. */
  @IsOptional() @IsBoolean()
  translateEnabled?: boolean;

  /**
   * Deliberately looser than whatsappNumber's digits-only rule. That one feeds
   * a wa.me URL where a stray space silently breaks the link; this one is only
   * ever displayed and put in a tel: href, so it should keep whatever spacing
   * reads best to a human.
   */
  @IsOptional() @IsString() @MaxLength(40)
  contactPhone?: string;
}
