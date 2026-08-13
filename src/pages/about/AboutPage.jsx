import { usePage } from '../../features/pages/index.js'
import { PageUnavailable } from '../../components/layout/PageUnavailable.jsx'
import { ABOUT_FALLBACK } from './aboutFallback.js'
import { HeroQuote } from './sections/HeroQuote.jsx'
import { StoryTimeline } from './sections/StoryTimeline.jsx'
import { Founders } from './sections/Founders.jsx'
import { WhatWeDo } from './sections/WhatWeDo.jsx'
import { GlobalPresence } from './sections/GlobalPresence.jsx'
import { JourneyStats } from './sections/JourneyStats.jsx'
import { WhyChooseUs } from './sections/WhyChooseUs.jsx'
import { IndustryRecognition } from './sections/IndustryRecognition.jsx'
import { MissionVision } from './sections/MissionVision.jsx'

// The About composition. Ordered so the page answers a buyer's questions in the
// order they are actually asked - who are you, how did you get here, who runs
// it, what do you trade, where are you, what have you done, why you, who says
// so, where are you going.
//
// HeroQuote replaces the shared PageTitle here and carries the "02" ghost
// numeral itself, so the signature survives without two competing page headers.
//
// Phase 1e: the content moved from src/data/about-content.js into editable page
// sections. One fetch at the page, passed down as props - each section stays a
// pure renderer with no data import of its own, which is what makes them
// testable and what will make them portable to Astro.
export default function AboutPage() {
  const { section, missing } = usePage('about', ABOUT_FALLBACK)

  // Unpublished in the admin - see usePage's three-state result.
  if (missing) return <PageUnavailable/>

  return <>
    <HeroQuote data={section('heroQuote')}/>
    <StoryTimeline data={section('story')}/>
    <Founders data={section('founders')}/>
    <WhatWeDo data={section('whatWeDo')}/>
    <GlobalPresence data={section('globalPresence')}/>
    <JourneyStats data={section('journeyStats')}/>
    <WhyChooseUs data={section('whyChooseUs')}/>
    <IndustryRecognition data={section('industryRecognition')}/>
    <MissionVision data={section('missionVision')}/>
  </>
}
