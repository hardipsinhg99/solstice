import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

/**
 * The platforms the icon sprite can actually draw.
 *
 * Constrained rather than free text on purpose: an operator who types "tiktok"
 * would create a row that renders a blank circle in the footer, and a blank
 * circle is worse than not offering the option at all. Adding a platform is
 * therefore two steps - a glyph in Icon.jsx, then a name here - which is the
 * correct amount of friction for something that changes the site's chrome.
 */
export const SOCIAL_PLATFORMS = ['whatsapp', 'facebook', 'instagram', 'linkedin'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

/**
 * https only, and no javascript:/data: smuggled past a naive "starts with http"
 * check. The footer renders this straight into an href, so this is the boundary
 * that decides what a buyer's browser is asked to navigate to.
 *
 * Empty is allowed and means "not configured yet" - that is the seeded state,
 * and a row with no URL is never rendered.
 */
export const SOCIAL_URL_PATTERN = /^https:\/\/[^\s<>"']+$/;

export class UpsertSocialLinkDto {
  @IsIn(SOCIAL_PLATFORMS as unknown as string[], {
    message: `platform must be one of: ${SOCIAL_PLATFORMS.join(', ')}`,
  })
  platform!: SocialPlatform;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(SOCIAL_URL_PATTERN, {
    message: 'url must be a full https:// address, or empty',
  })
  url?: string;

  @IsOptional() @IsBoolean()
  enabled?: boolean;

  @IsOptional() @IsInt() @Min(0) @Max(999)
  order?: number;
}

/** Reorder in one request, so the list can never be observed half-sorted. */
export class ReorderSocialDto {
  @IsString({ each: true })
  ids!: string[];
}
