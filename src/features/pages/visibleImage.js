/**
 * The one rule for whether a CMS image may render publicly.
 *
 * `published === undefined` counts as published. Every image stored before the
 * toggle existed has no flag, and the alternative - treating absent as false -
 * would have blanked every existing hero the moment this shipped. Same
 * convention the repeater rows already use for their `published` toggle.
 *
 * Returns null rather than false so a caller can write `const img =
 * visibleImage(x)` and then `img && <img src={img.url}/>` - there is no state
 * where a caller holds an object with no usable url, which is what produces a
 * broken-image icon.
 */
export function visibleImage(image) {
  if (!image || typeof image !== 'object') return null
  if (!image.url) return null
  if (image.published === false) return null
  return image
}
