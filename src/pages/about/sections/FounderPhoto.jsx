// The founder photo slot.
//
// There is no fallback `src` here by design. website-strategy.md §2.5 is
// explicit that a stock photograph of a stranger presented as staff is a
// falsifiable trust claim - worse than no photograph - and the About content
// file marks both founders PLACEHOLDER. So when no photo exists this renders an
// initials monogram that is self-evidently not a photograph, which is the
// strategy's option (c). It can never degrade into a broken image icon, because
// with no photo there is no <img> element at all.
//
// When real photography arrives, pass `photo` and the same slot renders it at
// the same dimensions - no layout change, no CLS.

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('')

export function FounderPhoto({ name, photo }) {
  // Phase 1e: `photo` became a media object rather than a bare URL, because it
  // now carries its own alt text from the upload. A string is still accepted so
  // an older payload cannot blank the card.
  const url = typeof photo === 'string' ? photo : photo?.url
  if (url) {
    return (
      <div className="about-founder-photo">
        <img src={url} alt={photo?.alt || name} width="640" height="800" decoding="async"/>
      </div>
    )
  }

  return (
    <div className="about-founder-photo about-founder-photo-monogram">
      {/* aria-hidden: the monogram is a visual stand-in, and the founder's real
          name is already the adjacent heading. Announcing "ZP" would add noise,
          not information. */}
      <span className="about-founder-monogram" aria-hidden="true">{initials(name)}</span>
      <span className="about-founder-photo-note">Photograph to follow</span>
    </div>
  )
}
