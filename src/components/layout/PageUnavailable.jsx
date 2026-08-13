import { Button } from '../ui/Button.jsx'
import { Eyebrow } from '../ui/Eyebrow.jsx'
import { useNavigate } from '../../app/navigation.js'

/**
 * What a CMS page renders when it has been unpublished.
 *
 * Generic on purpose. Before this existed, unpublishing a page in the admin
 * changed nothing at all on the public site: findPublic correctly returned null,
 * but usePage's section() fell straight through to the caller's static fallback
 * and the page rendered its full copy anyway. Every page has that same fallback
 * wiring, so this was never a Team-specific problem - it would have surprised
 * whoever next took a page down temporarily.
 *
 * A real state rather than a redirect. A silent bounce to Home leaves a buyer
 * who followed a link wondering whether they mistyped it; saying the page is not
 * currently available, and offering the two routes that always exist, is both
 * honest and recoverable. It is also correct for the temporary case this is
 * built for - the content is coming back, so nothing here implies it is gone.
 *
 * The heading is focusable and focused by App's route change, so a keyboard or
 * screen-reader user is told the page changed rather than landing in silence.
 */
export function PageUnavailable() {
  const navigate = useNavigate()
  return (
    <section className="section page-unavailable">
      <div className="container">
        <Eyebrow>Not currently available</Eyebrow>
        <h1>This page is <em>being updated.</em></h1>
        <p>
          It has been taken down temporarily while we revise it, and it will be
          back. Nothing else on the site is affected.
        </p>
        <div className="page-unavailable-actions">
          <Button onClick={() => navigate('home')}>Back to home</Button>
          <Button onClick={() => navigate('contact')} variant="outline">Send an enquiry</Button>
        </div>
      </div>
    </section>
  )
}
