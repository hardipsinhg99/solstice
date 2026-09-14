import { visibleImage } from './visibleImage.js'

/* Below this width a hero shows a narrow slice of a wide frame, so the phone
   gets its own file - smaller, and cropped for portrait. Matches the 780px
   breakpoint every hero already used. */
const PHONE = '(max-width: 780px)'

/**
 * The background image of a page hero, chosen from the CMS with the built-in
 * artwork as the fallback. Home, About and Trade Network all use it, so the
 * rules for WHICH file a screen gets live in exactly one place - they went
 * wrong twice when each page had its own copy (see the source-order note below).
 *
 *   image        the hero image the admin uploaded, desktop and up
 *   imageMobile  an optional portrait crop for phones
 *   focus        an optional CSS object-position - the part to keep in frame
 *
 * Which file a phone gets, in order:
 *   1. the uploaded phone image, if there is one
 *   2. otherwise the uploaded hero image - never the built-in phone crop, or an
 *      admin's new hero would show on desktop while phones kept the old one
 *   3. otherwise the built-in phone crop
 * That second rule is the reason <source> is conditional: a <source> that
 * matches wins over <img src>, so listing the built-in phone crop
 * unconditionally hid every uploaded hero below 780px. It happened on both
 * the About and Trade Network heroes before this component existed.
 *
 * Decorative by design: alt="" because the h1 beside it already says what the
 * picture shows. fetchPriority="high" because a hero is the page's largest
 * element, and so its LCP.
 */
export function HeroPicture ({
  image, imageMobile, focus,
  fallback, fallbackPhone,
  className, imgClassName, width, height
}) {
  const wide = visibleImage(image)
  const phone = visibleImage(imageMobile)
  const phoneSrc = phone?.url ?? (wide ? null : fallbackPhone)
  const src = wide?.url || fallback

  return (
    // data-phone-crop lets the stylesheet stop applying the desktop focus to a
    // purpose-cut phone image - see the rule in responsive.css.
    <picture className={className} data-phone-crop={phone ? '' : undefined}>
      {phoneSrc && <source media={PHONE} srcSet={phoneSrc}/>}
      <img
        className={imgClassName}
        src={src}
        alt=""
        width={wide?.width ?? width}
        height={wide?.height ?? height}
        fetchPriority="high"
        decoding="async"
        // Inline, so the admin's choice outranks each page's default framing at
        // every width. Unset, the page's own CSS framing applies unchanged.
        style={focus?.trim() ? { objectPosition: focus.trim() } : undefined}
      />
    </picture>
  )
}
