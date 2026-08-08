import { Button } from '../../../components/ui/Button.jsx'
import { Icon } from '../../../components/ui/Icon.jsx'
import { Reveal } from '../../../components/motion/Reveal.jsx'
import { useNavigate } from '../../../app/navigation.js'

// Shown when a trade direction has no published products.
//
// This exists because the import catalogue does not: there is no import product
// data in the repo or in docs/, and CLAUDE.md's third constraint rules out
// inventing it. A fabricated import listing would be the exact failure the
// strategy warns about - unverifiable content on a page whose job is proving the
// operation is real. So the direction stays clickable and answers honestly, and
// turns the gap into the enquiry it should produce.
//
// It is not import-specific: any direction that runs out of products gets it.
export function CatalogueEmpty({ direction }) {
  const navigate = useNavigate()
  return (
    <Reveal as="div" className="catalogue-empty">
      <span className="catalogue-empty-mark" aria-hidden="true"><Icon name="box" size={24}/></span>
      <h3>Our {direction} catalogue is not published yet</h3>
      <p>
        Solstice trades in both directions, but only the export listing is online today.
        Tell us what you are looking to {direction} and we will come back with availability,
        pack options and an indicative timeline.
      </p>
      <Button onClick={() => navigate('contact')}>Send a sourcing enquiry</Button>
    </Reveal>
  )
}
