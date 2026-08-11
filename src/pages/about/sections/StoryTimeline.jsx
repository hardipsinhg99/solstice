import { Eyebrow } from '../../../components/ui/Eyebrow.jsx'
import { Reveal } from '../../../components/motion/Reveal.jsx'
import { useInView } from '../../../components/motion/useInView.js'

// The story as a timeline, not stacked paragraphs.
//
// The spine draws itself with a scaleY transition triggered by useInView rather
// than by a scroll listener. That is a deliberate reading of "draws as the
// section scrolls into view": it reuses the existing reveal system instead of
// introducing a second, scroll-linked one, costs no scroll handler, and inherits
// useInView's reduced-motion short-circuit for free - under `reduce` the hook
// reports true immediately and CSS holds the spine at full height with no
// transition. Nothing about the layout depends on the animation, so there is no
// reflow when it runs.
//
// Stagger is capped at three steps of 60ms per website-strategy.md Pillar 5,
// which is tighter than the index * 90 used on older sections.
export function StoryTimeline({ data }) {
  const story = data ?? {}
  const [spineRef, spineInView] = useInView()

  return (
    <section className="about-story-timeline section">
      <div className="container">
        <Reveal as="div" className="about-section-head">
          <Eyebrow>{story.eyebrow}</Eyebrow>
          <h2>{story.heading}</h2>
        </Reveal>

        <ol className={spineInView ? 'about-timeline drawn' : 'about-timeline'} ref={spineRef}>
          {(story.nodes ?? []).map((node, index) => (
            <Reveal as="li" key={node.id} delay={Math.min(index, 2) * 60} className="about-timeline-node">
              <span className="about-timeline-dot" aria-hidden="true"/>
              <div className="about-timeline-body">
                <span className="about-timeline-label">
                  {node.label}
                  {/* The founding year is [CONFIRM SCOPE] in the content file, so
                      the first node carries no year anchor. Restore it by setting
                      story.foundingYear once the scope question is answered. */}
                  {index === 0 && story.foundingYear ? ` · ${story.foundingYear}` : ''}
                </span>
                {/* Rich text from the admin editor. The string was sanitized on
                    the way IN, against an explicit tag allowlist in
                    common/sanitize.ts - so what is stored is already safe and
                    this is not trusting the client. Sanitizing only at render
                    would leave hostile markup sitting in the database for the
                    next consumer to forget about. */}
                <div className="about-rich" dangerouslySetInnerHTML={{ __html: node.body ?? '' }}/>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
