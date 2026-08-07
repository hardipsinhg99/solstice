import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Scroll-scrubbed logistics sequence: a crane couples to a container, hoists it
// onto a flatbed, the truck hauls it out, a ship crosses and the camera lifts
// through cloud as a freighter aircraft exits right - the last beat of the
// sequence, so the pin releases on motion, not on empty sky.
//
// Geometry is MEASURED, never hardcoded: the container lands on a bed rectangle
// declared as CSS custom properties on .journey-truck and resolved against the
// truck's real box at build time. Every positional tween uses function-based
// values with invalidateOnRefresh, so a resize re-derives the whole choreography.
//
// Pinning is CSS position:sticky (see styles/pages.css) - ScrollTrigger's pin
// would fight the sticky header's stacking context. The runway div owns the
// scroll length.
//
// Easing rationale (per-object, travel stays linear for scrub):
//   hook descent/ascent  power1.inOut / power2.in - cable motion, soft ends
//   hoist                power2.in    - a heavy lift leaves the ground slowly
//   set-down             power3.out   - fast drop, soft landing, no bounce
//   cable sway           sine.in/out  - pendulum settle after the swing stops
//   truck pull-away      power1.in    - lead-in, no overshoot
//   ship                 none + sine.inOut bob - constant heading, gentle swell
//   camera lift          power1.in    - accelerating pull-up
//   plane                power2.out in, none cruise, power1.in out - enters
//                        faster than it exits, per the brief

const A = '/journey'

const JOURNEY_ASSETS = {
  crane: `${A}/crane.webp`,
  hook: `${A}/hook.webp`,
  container: `${A}/container.webp`,
  truckBody: `${A}/truck-body.webp`,
  wheel: `${A}/wheel.webp`,
  road: `${A}/road.webp`,
  ocean: `${A}/ocean.webp`,
  ship: `${A}/ship.webp`,
  wake: `${A}/wake.webp`,
  cloudA: `${A}/cloud-a.webp`,
  cloudB: `${A}/cloud-b.webp`,
  cloudC: `${A}/cloud-c.webp`,
  plane: `${A}/plane.webp`,
  sky: `${A}/sky.webp`
}

// `sky` marks captions shown over the light sky act, which flips the scrim and
// ink in CSS - one colour scheme cannot pass contrast over both the dark yard
// and the pale sky (measured 1.12:1 for the old light-on-sky caption).
// `until` caps a caption short of the next one where the backdrop changes
// under it: the ocean caption's dark scrim measures 4.06:1 against the sky
// that the pull-up starts revealing at 0.72, so it bows out while the sea
// still covers the frame. The camera lift then plays uncaptioned - a
// deliberate transition beat, not a gap.
const CAPTIONS = [
  { at: 0.02, label: 'Origin', text: 'Sorted, graded and sealed at the packhouse.' },
  { at: 0.32, label: 'Inland haul', text: 'Bonded transport to Mundra and Nhava Sheva.' },
  { at: 0.55, until: 0.715, label: 'Ocean freight', text: 'Reefer and dry containers on weekly sailings.' },
  { at: 0.78, label: 'Air freight', text: 'Perishables airside within 36 hours of harvest.', sky: true }
]

// Act 1 is on screen the moment the section is reached, so its assets are
// raised above the page's image queue; the later acts are lowered, not lazy -
// they sit inside the sticky viewport and must be decoded before their act.
const ACT_ONE = new Set(['crane', 'hook', 'container', 'truckBody', 'wheel', 'road'])
const priority = (key) => (ACT_ONE.has(key) ? 'high' : 'low')

// Wheel placement, % from the truck box's right edge. Arch centres are baked
// into the truck art at the matching fractions - see public/journey/README.md.
const WHEELS = [
  { right: 8, width: 7.1 },
  { right: 30, width: 6.2 },
  { right: 63, width: 6.2 },
  { right: 71, width: 6.2 },
  { right: 79, width: 6.2 }
]

export function JourneyScroll({ assets = {} }) {
  const img = { ...JOURNEY_ASSETS, ...assets }
  const root = useRef(null)

  useEffect(() => {
    const scope = root.current
    if (!scope) return

    // gsap.matchMedia rebuilds on entering the query and reverts on leaving it,
    // in both directions - crossing 780px or toggling reduced-motion mid-session
    // tears down cleanly instead of leaving triggers driving a collapsed runway.
    const mm = gsap.matchMedia(root)

    mm.add('(min-width: 781px) and (prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(root)
      const el = (sel) => q(sel)[0]
      const set = gsap.set

      const stageEl = el('.journey-stage')
      const craneEl = el('.journey-crane')
      const hookEl = el('.journey-hook')
      const containerEl = el('.journey-container')
      const truckEl = el('.journey-truck')
      const wheelEl = el('.journey-wheel')
      const roadEl = el('.journey-road')
      const seaEl = el('.journey-sea')
      const seaScaleEl = el('.journey-sea-scale')
      const shipGroupEl = el('.journey-ship-group')
      const shipEl = el('.journey-ship')
      const wakeEl = el('.journey-wake')
      const skyEl = el('.journey-sky')
      const planeEl = el('.journey-plane')

      /* -- measured geometry ------------------------------------------------
         offset* is transform-free layout truth. Everything below is a function
         so invalidateOnRefresh re-derives it on any resize or refresh. */
      const box = (n) => ({ l: n.offsetLeft, t: n.offsetTop, w: n.offsetWidth, h: n.offsetHeight })
      const stageW = () => stageEl.clientWidth
      const stageH = () => stageEl.clientHeight

      // The landing rectangle lives on .journey-truck as unitless fractions of
      // the truck box (--journey-bed-left/right/top), mirroring where the bed
      // is drawn in the art. CSS declares it; this resolves it.
      const bedProp = (name) => parseFloat(getComputedStyle(truckEl).getPropertyValue(name)) || 0
      const parkX = () => stageW() * 0.02 // where the truck waits while loaded
      const bedRect = () => {
        const t = box(truckEl)
        return {
          x0: t.l + parkX() + bedProp('--journey-bed-left') * t.w,
          x1: t.l + parkX() + bedProp('--journey-bed-right') * t.w,
          top: t.t + bedProp('--journey-bed-top') * t.h
        }
      }

      // Container: centred on the bed span, bottom edge meeting the bed line.
      const containerLandX = () => {
        const b = bedRect(); const c = box(containerEl)
        return b.x0 + (b.x1 - b.x0 - c.w) / 2 - c.l
      }
      const containerLandY = () => {
        const b = bedRect(); const c = box(containerEl)
        return b.top - c.h - c.t
      }
      const liftY = () => -(stageH() * 0.22)

      // Hook: couples when its bottom edge meets the container's top, centred.
      const hookCoupleX = () => {
        const c = box(containerEl); const h = box(hookEl)
        return c.l + c.w / 2 - (h.l + h.w / 2)
      }
      const hookCoupleY = () => {
        const c = box(containerEl); const h = box(hookEl)
        return c.t - (h.t + h.h)
      }
      const hookHideY = () => { const h = box(hookEl); return -(h.t + h.h + 60) }

      const truckHideX = () => { const t = box(truckEl); return -(t.l + t.w + 80) }
      const driveOutX = () => stageW() * 1.25
      const roadDist = () => stageW() * 1.35
      // Wheels run 8% ahead of the road so the roll reads mechanical rather
      // than computer-perfect - a perfectly matched contact patch looks CG.
      const wheelDeg = () => (roadDist() / (Math.PI * wheelEl.offsetWidth)) * 360 * 1.08

      const shipInFrom = () => -(stageW() * 0.85)
      const planeHideX = () => -(planeEl.offsetWidth + 60)

      /* -- initial states ---------------------------------------------------
         Applied once at build; each is re-asserted by its own fromTo when the
         playhead reaches it. Off-screen values are safe at any later size. */
      set(truckEl, { x: truckHideX })
      set(hookEl, { x: hookCoupleX, y: hookHideY })
      set(seaEl, { yPercent: 100 })
      set(shipGroupEl, { x: shipInFrom })
      set(wakeEl, { opacity: 0 })
      set(skyEl, { opacity: 0 })
      set(planeEl, { x: planeHideX })
      set(q('.journey-cloud'), { opacity: 0 })
      set(q('.journey-caption'), { opacity: 0, y: 14 })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: scope,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.8,
          invalidateOnRefresh: true
        }
      })

      /* ACT 1 - yard (0 -> .32). Truck parks first so the load has somewhere
         to go; hook couples, hoists, swings, sets down soft. */
      tl.fromTo(truckEl, { x: truckHideX }, { x: parkX, duration: 0.07, ease: 'power1.inOut' }, 0.005)
        .fromTo(hookEl, { x: hookCoupleX, y: hookHideY }, { y: hookCoupleY, duration: 0.075, ease: 'power1.inOut' }, 0.02)
        // (0.095-0.115: coupled hold - the beat that sells the pickup)
        .to(hookEl, { y: () => hookCoupleY() + liftY(), duration: 0.07, ease: 'power2.in' }, 0.115)
        .fromTo(containerEl, { y: 0 }, { y: liftY, duration: 0.07, ease: 'power2.in' }, 0.115)
        .to(hookEl, { x: () => hookCoupleX() + containerLandX(), duration: 0.065, ease: 'power1.inOut' }, 0.185)
        .fromTo(containerEl, { x: 0 }, { x: containerLandX, duration: 0.065, ease: 'power1.inOut' }, 0.185)
        // cable sway: the load overshoots a degree as the swing stops, then settles
        .fromTo(containerEl, { rotation: 0 }, { rotation: 1.4, duration: 0.03, ease: 'sine.in' }, 0.22)
        .to(containerEl, { rotation: 0, duration: 0.05, ease: 'sine.out' }, 0.25)
        .to(containerEl, { y: containerLandY, duration: 0.05, ease: 'power3.out' }, 0.25)
        .to(hookEl, { y: () => hookCoupleY() + containerLandY(), duration: 0.05, ease: 'power3.out' }, 0.25)
        .to(hookEl, { y: hookHideY, opacity: 0, duration: 0.045, ease: 'power2.in' }, 0.30)
        .to(craneEl, { x: () => -stageW() * 0.25, opacity: 0, duration: 0.06, ease: 'power1.in' }, 0.30)

      /* ACT 2 - road (.32 -> .535). Truck and container move by the SAME pixel
         deltas so the load can never drift off the bed. */
      const cruiseDX = () => stageW() * 0.06
      tl.to(truckEl, { x: () => parkX() + cruiseDX(), duration: 0.18, ease: 'power1.in' }, 0.32)
        .to(containerEl, { x: () => containerLandX() + cruiseDX(), duration: 0.18, ease: 'power1.in' }, 0.32)
        .fromTo(roadEl, { backgroundPositionX: '0px' }, { backgroundPositionX: () => `-${roadDist()}px`, duration: 0.18 }, 0.32)
        .fromTo(q('.journey-wheel'), { rotation: 0 }, { rotation: wheelDeg, duration: 0.18 }, 0.32)
        .to(truckEl, { x: () => parkX() + driveOutX(), duration: 0.035, ease: 'power1.in' }, 0.50)
        .to(containerEl, { x: () => containerLandX() + driveOutX(), duration: 0.035, ease: 'power1.in' }, 0.50)
        .to(roadEl, { opacity: 0, duration: 0.03 }, 0.505)

      /* ACT 3 - ocean (.53 -> .80). The sky fades in BEHIND the still-covering
         sea before the pull-up starts, so the shrink can only ever reveal sky -
         the old order revealed the raw section background. */
      tl.fromTo(seaEl, { yPercent: 100 }, { yPercent: 0, duration: 0.06, ease: 'power1.out' }, 0.53)
        .fromTo(shipGroupEl, { x: shipInFrom }, { x: 0, duration: 0.17 }, 0.55)
        .fromTo(shipEl, { y: 0 }, { y: -8, duration: 0.028, ease: 'sine.inOut', yoyo: true, repeat: 5 }, 0.55)
        .fromTo(wakeEl, { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.57)
        .fromTo(skyEl, { opacity: 0 }, { opacity: 1, duration: 0.045 }, 0.675)
        .fromTo(seaScaleEl, { scale: 1, y: 0 }, { scale: 0.6, y: () => stageH() * 0.14, duration: 0.065, ease: 'power1.in' }, 0.72)
        .to(seaEl, { opacity: 0, duration: 0.05, ease: 'power1.in' }, 0.75)

      /* ACT 4 - sky (.72 -> .985). The aircraft's exit is the terminal beat;
         it clears the frame at .985, so the pin releases on motion. */
      tl.fromTo(q('.journey-cloud'), { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.72)
        .fromTo(el('.journey-cloud-a'), { scale: 1, xPercent: 0 }, { scale: 3.1, xPercent: -24, duration: 0.19 }, 0.73)
        .fromTo(el('.journey-cloud-b'), { scale: 1, xPercent: 0, yPercent: 0 }, { scale: 2.3, xPercent: 20, yPercent: -12, duration: 0.19 }, 0.73)
        .fromTo(el('.journey-cloud-c'), { scale: 1, yPercent: 0 }, { scale: 3.6, yPercent: 16, duration: 0.19 }, 0.74)
        .fromTo(planeEl, { x: planeHideX, y: 0 }, { x: () => stageW() * 0.30, duration: 0.09, ease: 'power2.out' }, 0.76)
        .to(planeEl, { y: () => -stageH() * 0.03, duration: 0.19 }, 0.76)
        .to(planeEl, { x: () => stageW() * 0.55, duration: 0.09 }, 0.85)
        .to(q('.journey-cloud'), { opacity: 0, duration: 0.04 }, 0.93)
        .to(planeEl, { x: () => stageW() + 80, duration: 0.045, ease: 'power1.in' }, 0.94)

      /* Captions cross-fade at a readable speed on their own triggers rather
         than being scrubbed. Offsets are fractions of the actual scroll span. */
      const scrollSpan = () => Math.max(1, scope.offsetHeight - window.innerHeight)
      CAPTIONS.forEach((caption, i) => {
        const until = caption.until ?? CAPTIONS[i + 1]?.at ?? 1
        ScrollTrigger.create({
          trigger: scope,
          start: () => `top top-=${caption.at * scrollSpan()}`,
          end: () => `top top-=${until * scrollSpan() - 8}`,
          onToggle: ({ isActive }) =>
            gsap.to(q('.journey-caption')[i], {
              opacity: isActive ? 1 : 0,
              y: isActive ? 0 : 14,
              duration: 0.45,
              ease: 'power2.out',
              overwrite: true
            })
        })
      })
    })

    return () => mm.revert()
  }, [])

  return (
    <section className="journey" ref={root} aria-label="How a shipment travels from our packhouse to your port">
      <div className="journey-pin">
        <div className="journey-stage">
          {/* acts 1-2: yard and road. Truck before container so the load paints
              over the bed it lands on; hook last so it paints over the load. */}
          <div className="journey-ground">
            <div className="journey-road" style={{ backgroundImage: `url(${img.road})` }}/>
            <img className="journey-crane" src={img.crane} alt="" decoding="async" fetchPriority={priority('crane')}/>
            <div className="journey-truck">
              <img className="journey-truck-body" src={img.truckBody} alt="" decoding="async" fetchPriority={priority('truckBody')}/>
              {WHEELS.map((wheel, i) => (
                <img
                  key={i}
                  className="journey-wheel"
                  src={img.wheel}
                  alt=""
                  decoding="async"
                  fetchPriority={priority('wheel')}
                  style={{ right: `${wheel.right}%`, width: `${wheel.width}%` }}
                />
              ))}
            </div>
            <img className="journey-container" src={img.container} alt="" decoding="async" fetchPriority={priority('container')}/>
            <img className="journey-hook" src={img.hook} alt="" decoding="async" fetchPriority={priority('hook')}/>
          </div>

          {/* act 4 backdrop sits BEHIND the sea: the pull-up shrink can then
              only ever reveal sky, never the raw section background. */}
          <img className="journey-sky" src={img.sky} alt="" decoding="async" fetchPriority={priority('sky')}/>

          {/* act 3: ocean. Ship and wake share one moving group so the wake
              can never detach from the stern. */}
          <div className="journey-sea">
            <div className="journey-sea-scale">
              <img className="journey-ocean" src={img.ocean} alt="" decoding="async" fetchPriority={priority('ocean')}/>
              <div className="journey-ship-group">
                <img className="journey-wake" src={img.wake} alt="" decoding="async" fetchPriority={priority('wake')}/>
                <img className="journey-ship" src={img.ship} alt="Container ship carrying export cargo at sea" decoding="async" fetchPriority={priority('ship')}/>
              </div>
            </div>
          </div>

          <img className="journey-cloud journey-cloud-a" src={img.cloudA} alt="" decoding="async" fetchPriority={priority('cloudA')}/>
          <img className="journey-cloud journey-cloud-b" src={img.cloudB} alt="" decoding="async" fetchPriority={priority('cloudB')}/>
          <img className="journey-cloud journey-cloud-c" src={img.cloudC} alt="" decoding="async" fetchPriority={priority('cloudC')}/>
          <img className="journey-plane" src={img.plane} alt="Air freighter carrying perishable cargo" decoding="async" fetchPriority={priority('plane')}/>
        </div>

        <div className="journey-captions">
          {CAPTIONS.map((caption) => (
            <figure className={caption.sky ? 'journey-caption journey-caption-sky' : 'journey-caption'} key={caption.label}>
              <figcaption className="journey-caption-label">{caption.label}</figcaption>
              <p className="journey-caption-text">{caption.text}</p>
            </figure>
          ))}
        </div>
      </div>

      {/* The scroll runway: the sticky child pins for exactly as long as this
          is tall. Collapsed to 0 in the fallback so no dead scroll remains. */}
      <div className="journey-runway"/>
    </section>
  )
}
