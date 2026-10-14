import { useHref, useNavigate } from '../../app/navigation.js'

/**
 * An in-site link: a real <a href>, navigated in place.
 *
 * Every navigation on this site used to be a <button> with a click handler, so
 * the HTML crawlers receive contained no links at all - not one, on any of the
 * 39 pages - and Google could find the pages only through the sitemap, with no
 * signal that any of them mattered. That is what "Discovered - currently not
 * indexed" looks like from the outside.
 *
 * A plain left click still navigates in place (no reload). Anything that asks
 * the browser for more - Ctrl/Cmd/Shift/middle click, "open in new tab", copy
 * link - is left to the browser, which is the other half of why it is a link.
 */
export function Link ({ to, onClick, children, ...rest }) {
  const href = useHref()
  const navigate = useNavigate()
  return (
    <a
      href={href(to)}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        navigate(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
