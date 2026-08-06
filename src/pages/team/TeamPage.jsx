import { Button } from '../../components/ui/Button.jsx'
import { Reveal } from '../../components/motion/Reveal.jsx'
import { PageTitle } from '../../components/layout/PageTitle.jsx'
import { useNavigate } from '../../app/navigation.js'
import { unsplashAt, unsplashSrcSet } from '../../lib/images.js'

export default function TeamPage() {
  const navigate = useNavigate()
  const team = [
    ['Trade & sourcing', 'Our team works closely on fresh-produce enquiries from product selection through initial discussions.', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=85'],
    ['Export coordination', 'Practical, detail-oriented support for conversations around export preparation.', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=85'],
    ['Buyer relationships', 'A responsive point of contact for buyers exploring products from India.', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=85']
  ]
  return <>
    <PageTitle mark="05" eyebrow="THE PEOPLE BEHIND SOLSTICE" title="A small team with a" accent="global outlook." copy="Meet the people ready to start a product conversation with your business."/>
    <section className="team section">
      <div className="container team-grid">
        {team.map(([role, copy, image], index) => (
          <Reveal as="article" key={role} delay={index * 90}>
            <div className="team-image">
              <img
                src={unsplashAt(image, 800)}
                srcSet={unsplashSrcSet(image, [480, 800])}
                sizes="(max-width: 780px) 100vw, 33vw"
                alt=""
                loading="lazy"
                decoding="async"
              />
            </div>
            <span>0{index + 1}</span><h3>{role}</h3><p>{copy}</p>
          </Reveal>
        ))}
      </div>
    </section>
    <section className="team-join">
      <Reveal as="div" className="container">
        <h2>People who care about<br/><em>what arrives.</em></h2>
        <p>Have a produce enquiry? Start by telling us what you are looking for.</p>
        <Button onClick={() => navigate('contact')} variant="lime">Contact our team</Button>
      </Reveal>
    </section>
  </>
}