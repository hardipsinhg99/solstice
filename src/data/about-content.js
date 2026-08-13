// About page content, structured from docs/about-us-content.md.
//
// That file is the source of truth for copy. This module only gives it shape -
// no sentence here should be edited without editing the source document.
//
// Three items are flagged UNRESOLVED at the top of the source file and are
// deliberately NOT resolved here. Each carries a machine-readable marker so the
// UI can render an obvious placeholder rather than quietly presenting an
// unverified claim as fact:
//
//   1. `unresolvedScope: true`  - does "Founded 2023" / "7 Group Companies"
//      describe the LLP or a wider Solstice Group? Until answered, the page must
//      not let the two entities blur together.
//   2. `unresolvedCopy: true`   - the Industry Recognition intro is hedge
//      language, not shippable prose.
//   3. `photo: null`            - no founder photography exists. Renders as a
//      monogram, never a stock substitute (website-strategy.md §2.5 option c).

export const heroQuote = {
  primary: 'Building Global Trade Through Trust, Quality & Execution.',
  // Kept for meta description / A-B use, per the source file's note.
  alternate: 'From India to the World - Delivering Reliable Global Trade Solutions.'
}

export const story = {
  eyebrow: 'OUR STORY',
  heading: 'From One Challenge to a Global Trading Network',
  // Rendered as timeline nodes, in order.
  nodes: [
    {
      id: 'vision',
      label: 'The vision',
      body: 'Solstice Trading International LLP was founded with a simple vision - to make international trade more transparent, reliable, and execution-driven.'
    },
    {
      id: 'origin',
      label: 'The starting point',
      body: 'The journey began after one of our founders experienced an unexpected career setback. Instead of an end, it became the starting point for building a company focused on connecting manufacturers, suppliers, and buyers across international markets.'
    },
    {
      id: 'expansion',
      label: 'Expansion',
      // [TIMEFRAME - confirm] in the source. Left as an explicit gap rather than
      // guessed at; the sentence is rebuilt to read correctly without it.
      body: 'Solstice expanded from a single office into a growing international trading group with operations across multiple countries, serving clients worldwide through trusted sourcing, quality execution, and long-term business relationships.',
      unresolvedScope: true
    },
    {
      id: 'today',
      label: 'Today',
      body: 'Solstice continues to help businesses source products from India while building strong partnerships across global markets.'
    }
  ],
  // "2023" is [CONFIRM SCOPE] in the source, so the timeline renders no year
  // anchor. Restore this to a string once the scope question is answered.
  foundingYear: null
}

export const founders = {
  heading: 'Two Founders. One Global Vision.',
  intro: 'Founded by Zeel Patel and Yash Vaghela, Solstice combines technology-driven thinking with engineering expertise.',
  principle: 'Execution over promises.',
  mission: 'Their mission is to simplify international trade by providing reliable sourcing, transparent communication, and dependable logistics for buyers around the world.',
  people: [
    { name: 'Zeel Patel', role: 'Co-Founder', photo: null },
    { name: 'Yash Vaghela', role: 'Co-Founder', photo: null }
  ]
}

export const whatWeDo = {
  heading: 'What We Do',
  intro: 'We specialize in sourcing and exporting products from India across multiple industries.',
  industries: [
    { name: 'Agro & Agricultural Products', icon: 'leaf' },
    { name: 'FMCG Products', icon: 'box' },
    { name: 'Ceramics', icon: 'ceramic' },
    { name: 'Plastic Products', icon: 'layers' },
    { name: 'Custom Manufacturing Solutions', icon: 'factory' }
  ],
  footnote: 'Our team works directly with verified manufacturers to ensure quality, competitive pricing, and timely delivery.'
}

export const globalPresence = {
  heading: 'Our Global Presence',
  intro: 'Solstice operates through offices in five countries, serving customers across 20+ countries.',
  exportMarkets: '20+ countries',
  // Cities: the source file names only Dubai. The other four coordinates are
  // pinned to each country's principal commercial city so the globe has a real
  // location to plot - see the CONFIRM note in data/globe.js. The visible list
  // below shows only what the source file actually states.
  offices: [
    { id: 'india', country: 'India', note: 'Headquarters' },
    { id: 'uae', country: 'United Arab Emirates', city: 'Dubai' },
    { id: 'uk', country: 'United Kingdom' },
    { id: 'tanzania', country: 'Tanzania' },
    { id: 'vietnam', country: 'Vietnam' }
  ]
}

export const journeyStats = {
  heading: 'Our Journey in Numbers',
  stats: [
    // Static: a year is not a quantity, so it does not count up.
    { label: 'Founded', text: '2023', unresolvedScope: true },
    { label: 'Operational Countries', value: 5 },
    { label: 'Export Markets', value: 20, suffix: '+', unit: 'Countries' },
    { label: 'Containers Handled', value: 350, suffix: '+' },
    { label: 'Group Companies', value: 7, unresolvedScope: true },
    // Non-numeric - the source file explicitly says not to force this into the
    // counter component.
    { label: 'Industries Served', text: 'Agro, FMCG, Ceramics & Plastics' }
  ]
}

export const whyChooseUs = {
  heading: 'Why Businesses Choose Solstice',
  points: [
    'Verified supplier network',
    'End-to-end export management',
    'International market experience',
    'Multi-country operational presence',
    'Transparent communication',
    'Reliable execution and on-time delivery',
    'Long-term business partnerships'
  ]
}

export const industryRecognition = {
  heading: 'Industry Recognition',
  // Rendered verbatim, brackets and all. Real copy has not been written; the
  // marker text is the safeguard that stops it shipping unnoticed.
  intro: '[REWRITE - placeholder hedge language removed, needs real editorial copy]',
  unresolvedCopy: true,
  points: [
    { text: 'Rapid international expansion' },
    { text: 'Featured at Global Trade Conclave 2026, Ahmedabad' },
    { text: 'Operations across five countries' },
    { text: 'Export network serving 20+ countries' },
    { text: '350+ containers traded' },
    { text: 'Leadership of seven companies under the Solstice Group', unresolvedScope: true }
  ]
}

export const missionVision = [
  {
    id: 'mission',
    heading: 'Our Mission',
    body: 'To connect global buyers with trusted Indian manufacturers through transparent sourcing, quality assurance, and dependable international trade solutions.'
  },
  {
    id: 'vision',
    heading: 'Our Vision',
    body: "To become one of the world's most trusted international trading companies by creating long-term partnerships, delivering consistent value, and expanding global trade opportunities."
  }
]
