/**
 * Rendered only while /api/pages/network is in flight, and if the fetch fails.
 *
 * Deliberately minimal. The page's real copy lives in the CMS; duplicating it
 * here would create a second source of truth that drifts the first time someone
 * edits the page in the admin. Only the hero is mirrored, so a slow network
 * shows a heading rather than a blank frame.
 *
 * Note this is also what `missing` distinguishes: an unpublished page returns
 * null from the API and renders PageUnavailable, NOT this fallback.
 */
export const NETWORK_FALLBACK = {
  hero: {
    eyebrow: 'GLOBAL TRADE NETWORK',
    headingLine1: 'From our growers',
    headingAccent: 'to your warehouse.',
    lede: 'Sourcing, quality control, documentation, shipping and delivery - the five stages every consignment moves through.',
    primaryCtaLabel: 'Browse products', primaryCtaRoute: 'products',
    secondaryCtaLabel: 'Send enquiry', secondaryCtaRoute: 'contact'
  }
}
