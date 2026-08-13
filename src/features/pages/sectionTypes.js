/**
 * THE section contract. One definition, read by three consumers:
 *
 *   1. AdminPageEditor  - renders the form from `fields`
 *   2. the public components - read the same keys back out
 *   3. server/prisma/seed-pages.ts - seeds the current live copy into it
 *
 * This is the fixed-typed-sections model from docs/admin-cms-blueprint.md. An
 * editor picks values inside a section the site already has a component for;
 * they cannot invent a section, reorder the page into a shape nothing renders,
 * or drag a "hero" into the middle of the footer. That was the blueprint's
 * whole argument against freeform page building, and this file is where it is
 * actually enforced.
 *
 * Field kinds:
 *   text      single line
 *   textarea  multi-line plain text, no markup
 *   rich      TipTap HTML - sanitized server-side against a tag allowlist
 *   image     MediaAsset id + url, through the Phase 1b pipeline
 *   list      repeater of {fields}, with add / remove / reorder
 *   readonly  shown for context, not editable here (e.g. API-driven content)
 */

const f = (name, label, kind = 'text', extra = {}) => ({ name, label, kind, ...extra })

// Both globes plot from the page's own list now, so the coordinate fields carry
// the same explanation on Home and About.
const COORD_HELP =
  'Decimal degrees, e.g. 23.0225 / 72.5714 for Ahmedabad. Leave both empty and the ' +
  'location is still listed, just not plotted on the globe.'

// ── Home ────────────────────────────────────────────────────────────────────
const HOME = [
  {
    key: 'hero', type: 'home.hero', label: 'Hero',
    help: 'The first thing a buyer reads. The background composite is a fixed brand asset, not editable here.',
    fields: [
      f('eyebrow', 'Eyebrow'),
      f('headingLine1', 'Heading, first line'),
      f('headingLine2', 'Heading, second line'),
      f('headingAccent', 'Heading, italic accent', 'text', { help: 'Rendered in the serif italic.' }),
      f('lede', 'Opening paragraph', 'textarea'),
      f('primaryCtaLabel', 'Primary button'),
      f('primaryCtaRoute', 'Primary button goes to', 'text', { help: 'A route: products, contact, about…' }),
      f('secondaryCtaLabel', 'Secondary link'),
      f('secondaryCtaRoute', 'Secondary link goes to'),
      f('metaItems', 'Meta strip', 'list', { itemLabel: 'Item', fields: [f('text', 'Text')] })
    ]
  },
  {
    key: 'intro', type: 'home.intro', label: 'Introduction',
    fields: [
      f('eyebrow', 'Eyebrow'),
      f('headingLine1', 'Heading, first line'),
      f('headingAccent', 'Heading, italic accent'),
      f('body', 'Body copy', 'textarea'),
      f('ctaLabel', 'Button'),
      f('ctaRoute', 'Button goes to')
    ]
  },
  {
    key: 'differentiators', type: 'home.cards', label: 'What sets us apart',
    fields: [
      f('items', 'Cards', 'list', {
        itemLabel: 'Card',
        fields: [f('icon', 'Icon', 'text', { help: 'A sprite name: globe, check, chat, ship, leaf, box, award.' }),
                 f('title', 'Title'), f('body', 'Copy', 'textarea')]
      })
    ]
  },
  {
    key: 'missionStats', type: 'home.stats', label: 'Mission & numbers',
    help: 'Every figure here is a public claim. Do not enter one you cannot evidence.',
    fields: [
      f('eyebrow', 'Eyebrow'),
      f('headingLine1', 'Heading, first line'),
      f('headingAccent', 'Heading, italic accent'),
      f('items', 'Statistics', 'list', { itemLabel: 'Statistic', fields: [f('value', 'Figure'), f('label', 'Label')] })
    ]
  },
  {
    key: 'footprint', type: 'home.footprint', label: 'Global footprint',
    help: 'The globe itself is driven by src/data/globe.js coordinates - the legend and copy are editable here.',
    fields: [
      f('eyebrow', 'Eyebrow'),
      f('headingLine1', 'Heading, first line'),
      f('headingAccent', 'Heading, italic accent'),
      f('legend', 'Legend', 'list', {
        itemLabel: 'Location',
        fields: [f('text', 'Label'),
                 f('lat', 'Latitude', 'number', { help: COORD_HELP }),
                 f('lng', 'Longitude', 'number'),
                 f('hq', 'Headquarters', 'toggle', { help: 'Arcs on the globe radiate from the headquarters.' })]
      }),
      f('body', 'Copy under the legend', 'textarea')
    ]
  },
  {
    key: 'productsIntro', type: 'home.productsIntro', label: 'Featured products heading',
    help: 'The three products themselves come from the catalogue, not from here.',
    fields: [
      f('eyebrow', 'Eyebrow'),
      f('headingLine1', 'Heading, first line'),
      f('headingAccent', 'Heading, italic accent'),
      f('linkLabel', 'Link text')
    ]
  },
  {
    key: 'buyerPath', type: 'home.buyerPath', label: 'How to start',
    fields: [
      f('eyebrow', 'Eyebrow'),
      f('headingLine1', 'Heading, first line'),
      f('headingAccent', 'Heading, italic accent'),
      f('lede', 'Intro paragraph', 'textarea'),
      f('items', 'Steps', 'list', {
        itemLabel: 'Step',
        fields: [f('number', 'Number'), f('title', 'Title'), f('body', 'Copy', 'textarea')]
      })
    ]
  },
  {
    key: 'journey', type: 'home.journey', label: 'Logistics journey animation',
    help: 'The scroll-driven crane, truck and ship sequence. It has no editable copy yet - this entry exists so the sequence can be shown or hidden. Hidden means it is not rendered at all: none of its fourteen images are downloaded.',
    fields: []
  },
  {
    key: 'manifesto', type: 'home.manifesto', label: 'The Solstice approach',
    fields: [
      f('image', 'Image', 'image'),
      f('stats', 'Figures', 'list', { itemLabel: 'Figure', fields: [f('value', 'Figure'), f('label', 'Label')] }),
      f('eyebrow', 'Eyebrow'),
      f('headingLine1', 'Heading, first line'),
      f('headingLine2', 'Heading, second line'),
      f('headingAccent', 'Heading, italic accent'),
      f('body', 'Copy', 'textarea'),
      f('linkLabel', 'Link text'),
      f('linkRoute', 'Link goes to')
    ]
  },
  {
    key: 'cta', type: 'home.cta', label: 'Closing call to action',
    fields: [
      f('eyebrow', 'Eyebrow'),
      f('headingLine1', 'Heading, first line'),
      f('headingAccent', 'Heading, italic accent'),
      f('ctaLabel', 'Button'),
      f('ctaRoute', 'Button goes to')
    ]
  }
]

// ── About ───────────────────────────────────────────────────────────────────
const ABOUT = [
  {
    key: 'heroQuote', type: 'about.heroQuote', label: 'Opening statement',
    help: 'Leave the banner empty and the hero keeps its plain deep-green background.',
    fields: [f('primary', 'Statement', 'textarea'),
             f('alternate', 'Alternate (meta description only)', 'textarea',
               { help: 'Not rendered on the page. Kept for the meta description and A/B use.' }),
             f('image', 'Banner image', 'image'),
             f('imageFit', 'How the banner fills the hero', 'text', {
               help: 'cover (default) fills edge to edge and crops the long edge - use for photography. contain shows the WHOLE image and adds bands above/below on narrow screens - use only for artwork that must not be cropped.'
             }),
             f('imageFocus', 'Keep this part in frame', 'text', {
               help: 'A CSS object-position, e.g. "70% 50%" to hold the right of the image as the screen narrows. Default 50% 50%.'
             })]
  },
  {
    key: 'story', type: 'about.story', label: 'Our story',
    fields: [
      f('eyebrow', 'Eyebrow'), f('heading', 'Heading'),
      f('nodes', 'Timeline', 'list', {
        itemLabel: 'Moment',
        fields: [f('label', 'Label'), f('body', 'Copy', 'rich'),
                 f('unresolvedScope', 'Flag as unverified', 'toggle',
                   { help: 'Marks the claim as not yet confirmed. The page renders it with a visible marker.' })]
      })
    ]
  },
  {
    key: 'founders', type: 'about.founders', label: 'Founders',
    help: 'Add, remove and reorder as many founders as you need - the row reflows to fit. Leave a photo empty and the card renders an initials monogram. It never falls back to a stock photograph of a stranger.',
    fields: [
      f('heading', 'Heading'), f('intro', 'Intro', 'textarea'),
      f('principle', 'Principle', 'text', {
        help: 'Optional pull-quote shown under the founders. Leave blank and it is not rendered at all.'
      }),
      f('mission', 'Mission', 'textarea'),
      f('people', 'Founders', 'list', {
        itemLabel: 'Founder',
        fields: [
          // required: the monogram is built from the name and the card heading
          // IS the name, so a nameless founder renders an empty box. The public
          // component filters those out; this stops one being saved at all.
          f('name', 'Name', 'text', { required: true }),
          f('role', 'Role'),
          f('bio', 'Short bio', 'rich'),
          f('photo', 'Photograph', 'image')
        ]
      })
    ]
  },
  {
    key: 'whatWeDo', type: 'about.whatWeDo', label: 'What we do',
    fields: [
      f('heading', 'Heading'), f('intro', 'Intro', 'textarea'),
      f('industries', 'Industries', 'list', {
        itemLabel: 'Industry', fields: [f('name', 'Name'), f('icon', 'Icon')]
      }),
      f('footnote', 'Footnote', 'textarea')
    ]
  },
  {
    key: 'globalPresence', type: 'about.globalPresence', label: 'Global presence',
    fields: [
      f('heading', 'Heading'), f('intro', 'Intro', 'textarea'),
      f('exportMarkets', 'Export markets'),
      f('offices', 'Offices', 'list', {
        itemLabel: 'Office',
        fields: [f('id', 'Id', 'text', { help: 'A short slug. Only used as a stable key.' }),
                 f('country', 'Country'), f('city', 'City'), f('note', 'Note'),
                 f('lat', 'Latitude', 'number', { help: COORD_HELP }),
                 f('lng', 'Longitude', 'number'),
                 f('hq', 'Headquarters', 'toggle', { help: 'Arcs on the globe radiate from the headquarters.' })]
      })
    ]
  },
  {
    key: 'journeyStats', type: 'about.journeyStats', label: 'Journey in numbers',
    help: 'A figure entered here is a public claim. Leave `value` empty and enter `text` for anything that is not a countable number.',
    fields: [
      f('heading', 'Heading'),
      f('stats', 'Statistics', 'list', {
        itemLabel: 'Statistic',
        fields: [f('label', 'Label'), f('value', 'Number', 'number'), f('text', 'Text instead of a number'),
                 f('suffix', 'Suffix'), f('unit', 'Unit'),
                 f('unresolvedScope', 'Flag as unverified', 'toggle')]
      })
    ]
  },
  {
    key: 'whyChooseUs', type: 'about.whyChooseUs', label: 'Why businesses choose us',
    fields: [f('heading', 'Heading'),
             f('points', 'Points', 'list', { itemLabel: 'Point', fields: [f('text', 'Text')] })]
  },
  {
    key: 'industryRecognition', type: 'about.recognition', label: 'Industry recognition',
    fields: [
      f('heading', 'Heading'), f('intro', 'Intro', 'textarea'),
      f('unresolvedCopy', 'Flag the intro as placeholder copy', 'toggle'),
      f('points', 'Points', 'list', {
        itemLabel: 'Point', fields: [f('text', 'Text'), f('unresolvedScope', 'Flag as unverified', 'toggle')]
      })
    ]
  },
  {
    key: 'missionVision', type: 'about.missionVision', label: 'Mission & vision',
    fields: [f('items', 'Panels', 'list', {
      itemLabel: 'Panel', fields: [f('id', 'Id'), f('heading', 'Heading'), f('body', 'Copy', 'rich')]
    })]
  }
]

// ── Team ────────────────────────────────────────────────────────────────────
const TEAM = [
  {
    key: 'intro', type: 'team.intro', label: 'Page heading',
    fields: [
      f('mark', 'Ghost numeral'), f('eyebrow', 'Eyebrow'),
      f('title', 'Title'), f('accent', 'Italic accent'), f('copy', 'Intro', 'textarea')
    ]
  },
  {
    key: 'members', type: 'team.members', label: 'Team members',
    help: 'Managed below the page copy - each member is a record with its own photograph.',
    managed: 'teamMembers', fields: []
  },
  {
    key: 'cta', type: 'team.cta', label: 'Closing call to action',
    fields: [
      f('headingLine1', 'Heading, first line'), f('headingAccent', 'Italic accent'),
      f('body', 'Copy', 'textarea'), f('ctaLabel', 'Button'), f('ctaRoute', 'Button goes to')
    ]
  }
]

// ── Services ────────────────────────────────────────────────────────────────
// Every field here is text, textarea or list. Services needed no new field kind,
// no image field and no rich text - which is why this page cost a config entry
// and a seed row rather than a phase.
const SERVICES = [
  {
    key: 'intro', type: 'services.intro', label: 'Page heading',
    fields: [
      f('mark', 'Ghost numeral'), f('eyebrow', 'Eyebrow'),
      f('title', 'Title'), f('accent', 'Italic accent'), f('copy', 'Intro', 'textarea')
    ]
  },
  {
    key: 'services', type: 'services.list', label: 'What we do',
    help: 'Each row is numbered automatically and carries an enquiry arrow through to the contact page.',
    fields: [
      f('items', 'Services', 'list', {
        itemLabel: 'Service',
        fields: [f('icon', 'Icon', 'text', { help: 'A sprite name: box, globe, check, leaf, ship, chat, award.' }),
                 f('title', 'Title'), f('body', 'Copy', 'textarea')]
      }),
      f('ctaRoute', 'The arrow on each row goes to')
    ]
  },
  {
    key: 'supply', type: 'services.supply', label: 'Custom supply programmes',
    fields: [
      f('eyebrow', 'Eyebrow'),
      f('headingLine1', 'Heading, first line'), f('headingAccent', 'Heading, italic accent'),
      f('body', 'Copy', 'textarea'),
      f('ctaLabel', 'Button'), f('ctaRoute', 'Button goes to'),
      f('points', 'Checklist', 'list', { itemLabel: 'Point', fields: [f('text', 'Text')] })
    ]
  },
  {
    key: 'process', type: 'services.process', label: 'Workflow',
    fields: [
      f('eyebrow', 'Eyebrow'),
      f('headingLine1', 'Heading, first line'), f('headingAccent', 'Heading, italic accent'),
      f('items', 'Steps', 'list', {
        itemLabel: 'Step',
        fields: [f('icon', 'Icon'), f('title', 'Title'), f('body', 'Copy', 'textarea')]
      })
    ]
  },
  {
    key: 'trust', type: 'services.trust', label: 'Why buyers choose us',
    help: 'The certifications strip is a public claim. Never list one the company cannot produce a certificate for.',
    fields: [
      f('eyebrow', 'Eyebrow'),
      f('headingLine1', 'Heading, first line'), f('headingLine2', 'Heading, second line'),
      f('headingAccent', 'Heading, italic accent'),
      f('items', 'Cards', 'list', {
        itemLabel: 'Card',
        fields: [f('icon', 'Icon'), f('title', 'Title'), f('body', 'Copy', 'textarea')]
      }),
      f('certLabel', 'Certifications label'),
      f('certifications', 'Certifications', 'list', {
        itemLabel: 'Certification',
        fields: [f('text', 'Name', 'text', { help: 'Only list what a certificate can be produced for.' })]
      })
    ]
  },
  {
    key: 'callout', type: 'services.callout', label: 'Closing call to action',
    fields: [
      f('eyebrow', 'Eyebrow'),
      f('headingLine1', 'Heading, first line'), f('headingLine2', 'Heading, second line'),
      f('headingAccent', 'Heading, italic accent'),
      f('ctaLabel', 'Button'), f('ctaRoute', 'Button goes to')
    ]
  }
]

/**
 * `icon` and `title` live here so the sidebar and the top bar can be DERIVED
 * from this object rather than repeating it. Phase 1e claimed a new page was
 * "a config entry and a seed row"; it was actually three touchpoints, because
 * AdminSidebar and AdminApp each carried their own hardcoded list. Services
 * closed that - adding a page is now genuinely this object plus a seed row.
 */

// ── Global Trade Network ─────────────────────────────────────────────────────
// Added exactly as Services was: a config entry and a seed row, no new
// mechanism. Every string a buyer reads on this page is a field below - nothing
// lives in the component's JSX.
const NETWORK = [
  {
    key: 'hero', type: 'network.hero', label: 'Hero',
    help: 'Opening statement. The background image is editable - upload through the picker, same pipeline as product photography.',
    fields: [
      f('eyebrow', 'Eyebrow'),
      f('headingLine1', 'Heading, first line'),
      f('headingAccent', 'Heading, accent line'),
      f('lede', 'Opening paragraph', 'textarea'),
      f('primaryCtaLabel', 'Primary button'),
      f('primaryCtaRoute', 'Primary button goes to'),
      f('secondaryCtaLabel', 'Secondary button'),
      f('secondaryCtaRoute', 'Secondary button goes to'),
      f('image', 'Background image', 'image', {
        help: 'Leave empty to use the built-in trade-network artwork. Upload one here to replace it.'
      }),
      f('steps', 'Process strip', 'list', {
        itemLabel: 'Step',
        fields: [f('label', 'Label'), f('body', 'One line'),
                 f('icon', 'Icon', 'text', { help: 'search, check, box, ship, award, globe, leaf, chat.' })]
      }),
      f('trustTitle', 'Trust card, first line'),
      f('trustTitle2', 'Trust card, second line'),
      f('trustBody', 'Trust card copy', 'textarea')
    ]
  },
  {
    key: 'stats', type: 'network.stats', label: 'Trade footprint',
    help: 'Every figure here is a public claim. Only enter one you can evidence - and leave the section empty rather than filling it with a number you cannot.',
    fields: [
      f('heading', 'Heading'),
      f('items', 'Figures', 'list', {
        itemLabel: 'Figure',
        fields: [f('value', 'Figure'), f('label', 'Label'),
                 f('unresolvedScope', 'Flag as unverified', 'toggle',
                   { help: 'Marks the figure as not yet confirmed. It renders with a visible marker.' })]
      })
    ]
  },
  {
    key: 'process', type: 'network.process', label: 'How it works',
    help: 'The end-to-end sequence. A repeater - add, remove and reorder steps freely; the layout renumbers and reflows to fit.',
    fields: [
      f('eyebrow', 'Eyebrow'), f('heading', 'Heading'),
      f('intro', 'Intro', 'textarea'),
      f('steps', 'Steps', 'list', {
        itemLabel: 'Step',
        fields: [f('title', 'Step title'), f('body', 'What happens at this stage', 'rich'),
                 f('icon', 'Icon', 'text', { help: 'A sprite name: globe, check, chat, ship, leaf, box, award.' })]
      })
    ]
  },
  {
    key: 'services', type: 'network.services', label: 'Services',
    help: 'Freight forwarding, customs brokerage and warehousing. SEEDED WITH PLACEHOLDERS - replace every description with what Solstice actually does before publishing this page.',
    fields: [
      f('eyebrow', 'Eyebrow'), f('heading', 'Heading'),
      f('intro', 'Intro', 'textarea'),
      f('items', 'Services', 'list', {
        itemLabel: 'Service',
        fields: [f('title', 'Service'), f('body', 'What it covers', 'rich'),
                 f('icon', 'Icon'),
                 f('unresolvedCopy', 'Flag as draft copy', 'toggle',
                   { help: 'Marks the description as not yet written by the client. Renders with a visible marker.' })]
      })
    ]
  },
  {
    key: 'categories', type: 'network.categories', label: 'What we trade',
    help: 'The tiles are generated from the live product catalogue - add or rename a product type under Products and it appears here with no code change. Only the heading and intro are editable.',
    fields: [f('eyebrow', 'Eyebrow'), f('heading', 'Heading'), f('intro', 'Intro', 'textarea'),
             f('linkLabel', 'Tile link text')]
  },
  {
    key: 'voices', type: 'network.voices', label: 'Client voices',
    help: 'A continuous marquee. SEEDED EMPTY ON PURPOSE - the section does not render until real, consented client quotes are added. Do not add a quote you cannot attribute to a real person who agreed to it.',
    fields: [
      f('eyebrow', 'Eyebrow'), f('heading', 'Heading'),
      f('items', 'Quotes', 'list', {
        itemLabel: 'Quote',
        fields: [f('quote', 'What they said', 'textarea'), f('name', 'Name'),
                 f('role', 'Role & company'), f('photo', 'Photograph', 'image')]
      })
    ]
  },
  {
    key: 'why', type: 'network.why', label: 'Why work with us',
    fields: [
      f('heading', 'Heading'), f('intro', 'Intro', 'textarea'),
      f('points', 'Points', 'list', { itemLabel: 'Point', fields: [f('text', 'Text')] })
    ]
  },
  {
    key: 'cta', type: 'network.cta', label: 'Closing call to action',
    fields: [
      f('eyebrow', 'Eyebrow'), f('headingLine1', 'Heading, first line'),
      f('headingAccent', 'Heading, accent'), f('body', 'Copy', 'textarea'),
      f('ctaLabel', 'Button'), f('ctaRoute', 'Button goes to')
    ]
  }
]

export const PAGE_CONFIG = {
  home: { slug: 'home', title: 'Home', route: 'home', icon: 'grid', sections: HOME },
  about: { slug: 'about', title: 'About us', route: 'about', icon: 'layers', sections: ABOUT },
  services: { slug: 'services', title: 'Services', route: 'services', icon: 'ship', sections: SERVICES },
  team: { slug: 'team', title: 'Team', route: 'team', icon: 'user', sections: TEAM },
  network: { slug: 'network', title: 'Global Trade Network', route: 'network', icon: 'globe', sections: NETWORK }
}

export const EDITABLE_PAGES = Object.values(PAGE_CONFIG)

export const sectionConfig = (slug, key) =>
  PAGE_CONFIG[slug]?.sections.find((s) => s.key === key) ?? null

/** The admin section id for a page, e.g. 'page-about'. One place, not three. */
export const pageSection = (slug) => `page-${slug}`

/** { 'page-home': 'Home', … } - what the top bar titles itself from. */
export const PAGE_TITLES = Object.fromEntries(
  EDITABLE_PAGES.map((p) => [pageSection(p.slug), p.title])
)

/**
 * Required-field check for one section's draft, walking `list` repeaters into
 * their items so a blank name inside a founder row is caught rather than saved.
 *
 * Exists because a repeater row is the one place an editor can create an
 * *entity* rather than edit a value: pressing "Add founder" makes a card, and a
 * card with no name renders an empty box with a blank monogram plate. The
 * public component filters those out defensively, but silently dropping a row
 * the editor just created is worse than refusing to save it - they would see no
 * error and no card, and have no way to tell which.
 *
 * Returns an array of human-readable messages; empty means valid.
 */
export function validateSection(section, data) {
  const errors = []

  const walk = (fields, value, path) => {
    for (const field of fields ?? []) {
      if (field.kind === 'list') {
        const items = Array.isArray(value?.[field.name]) ? value[field.name] : []
        const label = field.itemLabel ?? 'Item'
        items.forEach((item, i) => walk(field.fields, item, `${label} ${i + 1}`))
        continue
      }
      if (!field.required) continue
      const v = value?.[field.name]
      const blank = v == null || (typeof v === 'string' && v.trim() === '')
      if (blank) errors.push(`${path ? `${path}: ` : ''}${field.label} is required.`)
    }
  }

  walk(section?.fields, data ?? {}, '')
  return errors
}
