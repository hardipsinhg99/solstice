import { HeroQuote } from './sections/HeroQuote.jsx'
import { StoryTimeline } from './sections/StoryTimeline.jsx'
import { Founders } from './sections/Founders.jsx'
import { WhatWeDo } from './sections/WhatWeDo.jsx'

// The About composition. Ordered so the page answers a buyer's questions in the
// order they are actually asked - who are you, how did you get here, who runs
// it, what do you trade, where are you, what have you done, why you, who says
// so, where are you going.
//
// HeroQuote replaces the shared PageTitle here and carries the "02" ghost
// numeral itself, so the signature survives without two competing page headers.
export default function AboutPage() {
  return <>
    <HeroQuote/>
    <StoryTimeline/>
    <Founders/>
    <WhatWeDo/>
  </>
}
