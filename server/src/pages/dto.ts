import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Per-page search metadata.
 *
 * The caps here are ABUSE limits, not the guidance the editor sees. Search
 * engines truncate a title near 60 characters and a description near 155, but
 * those are display thresholds that shift by engine and by query - enforcing
 * them as validation would reject a 62-character title that renders perfectly
 * well. The admin shows a live count against those numbers instead, so the
 * client is informed rather than blocked.
 *
 * Empty string is allowed and meaningful: it is how a client CLEARS a value and
 * returns the page to the title-plus-suffix fallback.
 */
export class UpdatePageMetaDto {
  @IsOptional() @IsString() @MaxLength(200)
  seoTitle?: string;

  @IsOptional() @IsString() @MaxLength(400)
  seoDescription?: string;
}
