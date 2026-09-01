import { Button } from '../ui/Button.jsx'
import { Eyebrow } from '../ui/Eyebrow.jsx'
import { useNavigate } from '../../app/navigation.js'

/**
 * A real 404.
 *
 * Separate from PageUnavailable despite sharing its markup and every one of its
 * class names - so this adds no CSS and changes nothing visually. The difference
 * is what the two mean. PageUnavailable says "taken down temporarily, it will be
 * back", which is true of an unpublished CMS page and false of a URL that never
 * existed. Telling a buyer a mistyped address is "being updated" sends them back
 * later to find the same nothing.
 *
 * It exists because path routing needs it. Under the hash router an unknown
 * route fell through to `pages[route] || pages.home`, so every wrong URL quietly
 * rendered the home page. That was survivable when URLs were fragments no
 * crawler indexed; with real paths it would tell search engines that every
 * typo'd and every retired URL is a valid page serving home-page content.
 */
export function NotFound() {
  const navigate = useNavigate()
  return (
    <section className="section page-unavailable">
      <div className="container">
        <Eyebrow>Page not found</Eyebrow>
        <h1>We could not find <em>that page.</em></h1>
        <p>
          The address may have changed, or it may have been mistyped. Everything
          else on the site is where it was.
        </p>
        <div className="page-unavailable-actions">
          <Button onClick={() => navigate('home')}>Back to home</Button>
          <Button onClick={() => navigate('products')} variant="outline">Browse products</Button>
        </div>
      </div>
    </section>
  )
}
