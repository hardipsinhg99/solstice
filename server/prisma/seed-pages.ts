/**
 * Seeds Page/PageSection/TeamMember from the copy that is live TODAY.
 *
 * Every string below was lifted verbatim from the components Step 0 audited -
 * HomePage.jsx, src/data/about-content.js and TeamPage.jsx. Nothing is
 * rewritten, improved or invented here. The point of the seed is that switching
 * the public pages onto the API changes nothing a visitor can see; the first
 * real difference is the first edit somebody makes in the admin.
 *
 * Both draftData and publishedData are set, and the pages are seeded PUBLISHED,
 * because they are already published - they are on the live site right now.
 *
 * Idempotent: re-running upserts by slug and leaves existing content alone.
 */
import { Prisma, PrismaClient, ProductStatus } from '@prisma/client';

const prisma = new PrismaClient();

type Section = { key: string; type: string; data: Record<string, unknown> };

const HOME: Section[] = [
  { key: 'hero', type: 'home.hero', data: {
    eyebrow: 'GLOBAL SOURCING · IMPORT & EXPORT',
    headingLine1: 'From nature to', headingLine2: 'your', headingAccent: 'table.',
    lede: 'Solstice Trading International LLP is a global import-export and sourcing company delivering premium fruits, vegetables, spices and essential food products - headquartered in India, with operational footprints across the UAE, Vietnam and China.',
    primaryCtaLabel: 'Explore our produce', primaryCtaRoute: 'products',
    secondaryCtaLabel: 'Request product details', secondaryCtaRoute: 'contact',
    metaItems: [{ text: 'FRESH PRODUCE' }, { text: 'SPICES & STAPLES' }, { text: 'GLOBAL TRADE' }],
  } },
  { key: 'intro', type: 'home.intro', data: {
    eyebrow: 'SOLSTICE TRADING INTERNATIONAL LLP',
    headingLine1: 'Your global', headingAccent: 'growth partner.',
    body: 'Solstice Trading International LLP is committed to delivering premium quality food and agricultural products across international markets. Headquartered in India, with operational footprints in the UAE, Vietnam and China, we specialise in the trade of fresh fruits, vegetables, spices and essential food products - built on high-margin, sustainable business practices.',
    ctaLabel: 'Send your requirement', ctaRoute: 'contact',
  } },
  { key: 'differentiators', type: 'home.cards', data: {
    items: [
      { icon: 'globe', title: 'Global Reach', body: 'Serving buyers across international markets with dependable sourcing and delivery.' },
      { icon: 'check', title: 'Market Leader', body: 'A trusted trading partner known for consistency, quality and fair dealing.' },
      { icon: 'chat', title: 'Customer Focus', body: 'Responsive communication built around each buyer’s exact requirement.' },
      { icon: 'ship', title: 'Supply Chain Excellence', body: 'Streamlined sourcing, packaging and logistics from origin to destination.' },
    ],
  } },
  { key: 'missionStats', type: 'home.stats', data: {
    eyebrow: 'OUR MISSION', headingLine1: 'Helping you grow', headingAccent: 'your business.',
    items: [
      { value: '3+', label: 'Years of experience' },
      { value: '50+', label: 'Global partners' },
      { value: '10+', label: 'Countries served' },
      { value: '2410', label: 'Products delivered' },
    ],
  } },
  { key: 'footprint', type: 'home.footprint', data: {
    eyebrow: 'WHERE WE OPERATE', headingLine1: 'A truly global', headingAccent: 'footprint.',
    // Coordinates moved here from src/data/globe.js, so the globe plots from the
    // same list the legend renders. Editing a country in the admin moves the pin.
    legend: [
      { text: 'India - Headquarters', lat: 19.076, lng: 72.8777, hq: true },
      { text: 'United Arab Emirates', lat: 25.2048, lng: 55.2708 },
      { text: 'Vietnam', lat: 10.8231, lng: 106.6297 },
      { text: 'China', lat: 31.2304, lng: 121.4737 },
    ],
    body: 'Sourcing, quality control and logistics are coordinated from our India headquarters, with operational footprints across the UAE, Vietnam and China.',
  } },
  { key: 'productsIntro', type: 'home.productsIntro', data: {
    eyebrow: 'WHAT WE EXPORT', headingLine1: 'Fresh products,', headingAccent: 'clearly presented.',
    linkLabel: 'Browse product range',
  } },
  { key: 'buyerPath', type: 'home.buyerPath', data: {
    eyebrow: 'HOW TO START', headingLine1: 'From product enquiry', headingAccent: 'next step.',
    lede: 'Fresh produce is seasonal and requirements differ by market. We keep the initial discussion focused on the information that matters.',
    items: [
      { number: '01', title: 'Choose a product', body: 'Browse our current produce categories and identify the fruit or vegetable you want to explore.' },
      { number: '02', title: 'Share your market', body: 'Send the destination, preferred pack and an indicative quantity for your enquiry.' },
      { number: '03', title: 'Discuss the fit', body: 'We will discuss seasonal availability and the practical next steps for your requirement.' },
    ],
  } },
  // No editable copy yet - the row exists so the sequence has a section to be
  // shown or hidden by. Seeded visible, like everything else.
  { key: 'journey', type: 'home.journey', data: {} },
  { key: 'manifesto', type: 'home.manifesto', data: {
    image: null,
    stats: [
      { value: '25+', label: 'Sourcing regions across India' },
      { value: '100%', label: 'Checked for quality at origin' },
    ],
    eyebrow: 'THE SOLSTICE APPROACH',
    headingLine1: 'Keep the product', headingLine2: 'at the', headingAccent: 'centre.',
    body: 'Freshness, seasonality and buyer needs are at the heart of every conversation. We make it easy to begin with what you want to source.',
    linkLabel: 'Explore our services', linkRoute: 'services',
  } },
  { key: 'cta', type: 'home.cta', data: {
    eyebrow: 'FOR BUYERS OF FRESH PRODUCE',
    headingLine1: 'Looking for your next', headingAccent: 'produce partner?',
    ctaLabel: 'Start an enquiry', ctaRoute: 'contact',
  } },
];

const ABOUT: Section[] = [
  { key: 'heroQuote', type: 'about.heroQuote', data: {
    primary: 'Building Global Trade Through Trust, Quality & Execution.',
    alternate: 'From India to the World — Delivering Reliable Global Trade Solutions.',
  } },
  { key: 'story', type: 'about.story', data: {
    eyebrow: 'OUR STORY', heading: 'From One Challenge to a Global Trading Network',
    nodes: [
      { id: 'vision', label: 'The vision', body: '<p>Solstice Trading International LLP was founded with a simple vision — to make international trade more transparent, reliable, and execution-driven.</p>' },
      { id: 'origin', label: 'The starting point', body: '<p>The journey began after one of our founders experienced an unexpected career setback. Instead of an end, it became the starting point for building a company focused on connecting manufacturers, suppliers, and buyers across international markets.</p>' },
      { id: 'expansion', label: 'Expansion', body: '<p>Solstice expanded from a single office into a growing international trading group with operations across multiple countries, serving clients worldwide through trusted sourcing, quality execution, and long-term business relationships.</p>', unresolvedScope: true },
      { id: 'today', label: 'Today', body: '<p>Solstice continues to help businesses source products from India while building strong partnerships across global markets.</p>' },
    ],
  } },
  { key: 'founders', type: 'about.founders', data: {
    heading: 'Two Founders. One Global Vision.',
    intro: 'Founded by Zeel Patel and Yash Vaghela, Solstice combines technology-driven thinking with engineering expertise.',
    // Deliberately blank. `principle` remains a field on the section, so the
    // client can reword or restore this pull-quote from the admin at any time
    // without a code change - blank simply does not render.
    principle: '',
    mission: 'Their mission is to simplify international trade by providing reliable sourcing, transparent communication, and dependable logistics for buyers around the world.',
    // photo stays null: the card renders an initials monogram, never a stock
    // photograph of a stranger. website-strategy.md 2.5 option (c).
    people: [
      { name: 'Zeel Patel', role: 'Co-Founder', photo: null },
      { name: 'Yash Vaghela', role: 'Co-Founder', photo: null },
    ],
  } },
  { key: 'whatWeDo', type: 'about.whatWeDo', data: {
    heading: 'What We Do',
    intro: 'We specialize in sourcing and exporting products from India across multiple industries.',
    industries: [
      { name: 'Agro & Agricultural Products', icon: 'leaf' },
      { name: 'FMCG Products', icon: 'box' },
      { name: 'Ceramics', icon: 'ceramic' },
      { name: 'Plastic Products', icon: 'layers' },
      { name: 'Custom Manufacturing Solutions', icon: 'factory' },
    ],
    footnote: 'Our team works directly with verified manufacturers to ensure quality, competitive pricing, and timely delivery.',
  } },
  { key: 'globalPresence', type: 'about.globalPresence', data: {
    heading: 'Our Global Presence',
    intro: 'Solstice operates through offices in five countries, serving customers across 20+ countries.',
    exportMarkets: '20+ countries',
    // [CONFIRM] Only Dubai is named as a city in docs/about-us-content.md. The
    // other four coordinates pin each country's principal commercial city so the
    // globe has a real point to plot, and India follows the registered office in
    // website-strategy.md 3.4 (Ahmedabad). These are plot coordinates, not
    // published claims - the visible list still shows only what the content file
    // states. Correct them in the admin once the real office cities are known.
    offices: [
      { id: 'india', country: 'India', note: 'Headquarters', lat: 23.0225, lng: 72.5714, hq: true },
      { id: 'uae', country: 'United Arab Emirates', city: 'Dubai', lat: 25.2048, lng: 55.2708 },
      { id: 'uk', country: 'United Kingdom', lat: 51.5072, lng: -0.1276 },
      { id: 'tanzania', country: 'Tanzania', lat: -6.7924, lng: 39.2083 },
      { id: 'vietnam', country: 'Vietnam', lat: 10.8231, lng: 106.6297 },
    ],
  } },
  { key: 'journeyStats', type: 'about.journeyStats', data: {
    heading: 'Our Journey in Numbers',
    stats: [
      { label: 'Founded', text: '2023', unresolvedScope: true },
      { label: 'Operational Countries', value: 5 },
      { label: 'Export Markets', value: 20, suffix: '+', unit: 'Countries' },
      { label: 'Containers Handled', value: 350, suffix: '+' },
      { label: 'Group Companies', value: 7, unresolvedScope: true },
      { label: 'Industries Served', text: 'Agro, FMCG, Ceramics & Plastics' },
    ],
  } },
  { key: 'whyChooseUs', type: 'about.whyChooseUs', data: {
    heading: 'Why Businesses Choose Solstice',
    points: [
      { text: 'Verified supplier network' }, { text: 'End-to-end export management' },
      { text: 'International market experience' }, { text: 'Multi-country operational presence' },
      { text: 'Transparent communication' }, { text: 'Reliable execution and on-time delivery' },
      { text: 'Long-term business partnerships' },
    ],
  } },
  { key: 'industryRecognition', type: 'about.recognition', data: {
    heading: 'Industry Recognition',
    intro: '[REWRITE — placeholder hedge language removed, needs real editorial copy]',
    unresolvedCopy: true,
    points: [
      { text: 'Rapid international expansion' },
      { text: 'Featured at Global Trade Conclave 2026, Ahmedabad' },
      { text: 'Operations across five countries' },
      { text: 'Export network serving 20+ countries' },
      { text: '350+ containers traded' },
      { text: 'Leadership of seven companies under the Solstice Group', unresolvedScope: true },
    ],
  } },
  { key: 'missionVision', type: 'about.missionVision', data: {
    items: [
      { id: 'mission', heading: 'Our Mission', body: '<p>To connect global buyers with trusted Indian manufacturers through transparent sourcing, quality assurance, and dependable international trade solutions.</p>' },
      { id: 'vision', heading: 'Our Vision', body: "<p>To become one of the world's most trusted international trading companies by creating long-term partnerships, delivering consistent value, and expanding global trade opportunities.</p>" },
    ],
  } },
];

// Lifted verbatim from ServicesPage.jsx as Step 0 audited it. Nothing rewritten.
const SERVICES: Section[] = [
  { key: 'intro', type: 'services.intro', data: {
    mark: '03', eyebrow: 'HOW WE SUPPORT BUYERS',
    title: 'A simpler route to', accent: 'global trade.',
    copy: 'Focused support around sourcing, compliance, packaging and export coordination.',
  } },
  { key: 'services', type: 'services.list', data: {
    ctaRoute: 'contact',
    items: [
      { icon: 'box', title: 'Import & Export of FMCG Products', body: 'End-to-end handling for fast-moving consumer goods, from fresh produce to packaged staples.' },
      { icon: 'globe', title: 'Global Sourcing & Procurement', body: 'Sourcing partners across India and international markets, matched to your specification and volume.' },
      { icon: 'check', title: 'International Trade Compliance', body: 'Documentation, customs and regulatory compliance managed for every cross-border shipment.' },
      { icon: 'leaf', title: 'Private Label & Packaging Solutions', body: 'Custom packaging and private-label programmes tailored to your brand and market.' },
    ],
  } },
  { key: 'supply', type: 'services.supply', data: {
    eyebrow: 'TAILORED PROGRAMMES',
    headingLine1: 'Custom supply chain', headingAccent: 'solutions.',
    body: 'Need a tailored supply programme? Our team can build a custom solution that addresses your specific requirements for volume, quality, packaging and delivery timeline.',
    ctaLabel: 'Discuss your requirement', ctaRoute: 'contact',
    points: [
      { text: 'Volume planning' }, { text: 'Custom packaging' },
      { text: 'Quality control' }, { text: 'Logistics management' },
    ],
  } },
  { key: 'process', type: 'services.process', data: {
    eyebrow: 'OUR WORKFLOW',
    headingLine1: 'From source to', headingAccent: 'destination.',
    items: [
      { icon: 'leaf', title: 'Sourcing', body: 'Identifying and partnering with certified and qualified suppliers.' },
      { icon: 'check', title: 'Quality Check', body: 'Rigorous inspection and testing before produce moves onward.' },
      { icon: 'box', title: 'Packaging', body: 'Protective packaging matched to product and destination requirements.' },
      { icon: 'ship', title: 'Logistics', body: 'Efficient, well-coordinated freight from origin to arrival port.' },
      { icon: 'globe', title: 'Customs', body: 'Complete documentation and compliance for smooth customs clearance.' },
      { icon: 'arrow', title: 'Delivery', body: 'On-time delivery with full shipment visibility, door to door.' },
    ],
  } },
  { key: 'trust', type: 'services.trust', data: {
    eyebrow: 'WHY BUYERS CHOOSE US',
    headingLine1: 'Built on trust', headingLine2: '&', headingAccent: 'excellence.',
    items: [
      { icon: 'award', title: 'Certified & Compliant', body: 'All operations are backed by the certifications and registrations international trade requires.' },
      { icon: 'globe', title: 'Global Sourcing Network', body: 'Established supplier relationships across growing regions and markets.' },
      { icon: 'ship', title: 'End-to-End Solutions', body: 'From sourcing to delivery, every stage is managed under one roof.' },
      { icon: 'check', title: 'Quality Assurance', body: 'Rigorous grading and inspection at every step of the supply chain.' },
      { icon: 'box', title: 'Competitive Pricing', body: 'Direct sourcing relationships that keep pricing fair and transparent.' },
      { icon: 'chat', title: 'Customer-Centric Approach', body: 'Dedicated support and clear communication throughout every enquiry.' },
    ],
    certLabel: 'CERTIFICATIONS',
    // Migrated exactly as the page states them. Neither is given a reference
    // here - Product.certifications is where verifiable claims are modelled.
    certifications: [
      { text: 'IEC (Import Export Code)' },
      { text: 'Phytosanitary Certification' },
    ],
  } },
  { key: 'callout', type: 'services.callout', data: {
    eyebrow: 'START WITH THE PRODUCT',
    headingLine1: 'Tell us what your market', headingLine2: 'is looking', headingAccent: 'for.',
    ctaLabel: 'Send an enquiry', ctaRoute: 'contact',
  } },
];

const TEAM: Section[] = [
  { key: 'intro', type: 'team.intro', data: {
    mark: '05', eyebrow: 'THE PEOPLE BEHIND SOLSTICE',
    title: 'A small team with a', accent: 'global outlook.',
    copy: 'Meet the people ready to start a product conversation with your business.',
  } },
  { key: 'members', type: 'team.members', data: {} },
  { key: 'cta', type: 'team.cta', data: {
    headingLine1: 'People who care about', headingAccent: 'what arrives.',
    body: 'Have a produce enquiry? Start by telling us what you are looking for.',
    ctaLabel: 'Contact our team', ctaRoute: 'contact',
  } },
];

/**
 * The three live team cards, migrated WITHOUT their photographs.
 *
 * The live page shows three anonymous role cards illustrated with stock
 * Unsplash portraits of strangers. website-strategy.md 2.5 is explicit that a
 * stock photograph presented as staff is a falsifiable trust claim, worse than
 * no photograph. The roles and copy migrate; the stock images do not, and the
 * card falls back to a monogram until a real photograph is uploaded.
 *
 * `name` is empty for all three because the live page has no name field. That
 * gap is the point - it is now visible in the admin as an empty required field
 * rather than invisible in a JSX array.
 */
const TEAM_MEMBERS = [
  { name: 'Trade & sourcing', role: 'Trade & sourcing', bio: '<p>Our team works closely on fresh-produce enquiries from product selection through initial discussions.</p>' },
  { name: 'Export coordination', role: 'Export coordination', bio: '<p>Practical, detail-oriented support for conversations around export preparation.</p>' },
  { name: 'Buyer relationships', role: 'Buyer relationships', bio: '<p>A responsive point of contact for buyers exploring products from India.</p>' },
];

/**
 * `published` defaults to true so every existing call behaves exactly as
 * before. The network page passes false: its three service descriptions are
 * bracketed placeholders the client has not written yet, and a page that seeds
 * PUBLISHED would put "[CONFIRM] Describe what Solstice actually does here" in
 * front of a buyer the moment the seed runs.
 */
async function seedPage(
  slug: string,
  title: string,
  sections: Section[],
  published = true,
) {
  const page = await prisma.page.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      title,
      status: published ? ProductStatus.PUBLISHED : ProductStatus.DRAFT,
      publishedAt: published ? new Date() : null,
    },
  });
  for (const [order, s] of sections.entries()) {
    await prisma.pageSection.upsert({
      where: { pageId_key: { pageId: page.id, key: s.key } },
      update: {},
      create: {
        pageId: page.id, key: s.key, type: s.type, order,
        draftData: s.data as Prisma.InputJsonValue,
        publishedData: s.data as Prisma.InputJsonValue,
      },
    });
  }
  console.log(`  ${slug}: ${sections.length} sections`);
}

/**
 * Adds the globe coordinates to location rows that predate them, without
 * touching any other field. A plain reseed would be wrong here - these rows are
 * editable content and may already carry somebody's edits.
 *
 * Only fills a gap: a row that already has `lat` is left exactly as it is.
 */
async function backfillCoordinates() {
  const targets: { slug: string; key: string; field: string; seeded: Record<string, unknown>[] }[] = [
    { slug: 'home', key: 'footprint', field: 'legend', seeded: HOME.find((s) => s.key === 'footprint')!.data.legend as Record<string, unknown>[] },
    { slug: 'about', key: 'globalPresence', field: 'offices', seeded: ABOUT.find((s) => s.key === 'globalPresence')!.data.offices as Record<string, unknown>[] },
  ];

  for (const t of targets) {
    const page = await prisma.page.findUnique({ where: { slug: t.slug } });
    if (!page) continue;
    const section = await prisma.pageSection.findUnique({
      where: { pageId_key: { pageId: page.id, key: t.key } },
    });
    if (!section) continue;

    const merge = (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return payload;
      const data = payload as Record<string, unknown>;
      const rows = data[t.field];
      if (!Array.isArray(rows)) return payload;
      let touched = false;
      const next = rows.map((row: Record<string, unknown>) => {
        if (row.lat !== undefined && row.lat !== null && row.lat !== '') return row;
        // Match on the identifier each list actually has.
        const match = t.seeded.find((sd) => (sd.id && sd.id === row.id) || (sd.text && sd.text === row.text));
        if (!match) return row;
        touched = true;
        return { ...row, lat: match.lat, lng: match.lng, ...(match.hq ? { hq: true } : {}) };
      });
      return touched ? { ...data, [t.field]: next } : payload;
    };

    const draftData = merge(section.draftData) as Prisma.InputJsonValue;
    const publishedData = section.publishedData ? (merge(section.publishedData) as Prisma.InputJsonValue) : undefined;
    await prisma.pageSection.update({
      where: { id: section.id },
      data: { draftData, ...(publishedData ? { publishedData } : {}) },
    });
    console.log(`  backfilled coordinates on ${t.slug}.${t.key}.${t.field}`);
  }
}


// ── Global Trade Network ─────────────────────────────────────────────────────
// Every figure here traces to something already published on About. The two
// facts About flags `unresolvedScope` - founded 2023 and seven group companies -
// are deliberately NOT repeated here; a page that explains how to trade with
// Solstice should not be where an unresolved claim first goes public.
const NETWORK: Section[] = [
  { key: 'hero', type: 'network.hero', data: {
    eyebrow: 'GLOBAL TRADE NETWORK',
    headingLine1: 'From our growers',
    headingAccent: 'to your warehouse.',
    lede: 'Every consignment moves through the same five stages - sourcing, quality control, documentation, shipping and delivery. This is what each of them involves, so you know what to expect before you send an enquiry.',
    primaryCtaLabel: 'Browse products', primaryCtaRoute: 'products',
    secondaryCtaLabel: 'Send enquiry', secondaryCtaRoute: 'contact',
    image: null,
  } },
  // Source for all three: the About page's published globalPresence and
  // journeyStats sections. Nothing invented, nothing rounded up.
  { key: 'stats', type: 'network.stats', data: {
    heading: 'Our trade footprint',
    items: [
      { value: '5', label: 'Operational countries' },
      { value: '20+', label: 'Export markets served' },
      { value: '350+', label: 'Containers handled' },
    ],
  } },
  { key: 'process', type: 'network.process', data: {
    eyebrow: 'HOW IT WORKS',
    heading: 'Supplier to shipment, end to end',
    intro: 'Five stages, the same on every order.',
    steps: [
      { icon: 'leaf', title: 'Sourcing & supplier verification',
        body: '<p>We buy through a verified supplier network rather than open-market intermediaries, and the grower or processor behind a consignment is identified before it is offered to you.</p>' },
      { icon: 'check', title: 'Quality control',
        body: '<p>Produce is checked against the grade, size and packing specification agreed in the quote before it leaves the packhouse.</p>' },
      { icon: 'box', title: 'Export documentation',
        body: '<p>Export paperwork is prepared per consignment, including the phytosanitary certificate that accompanies each shipment.</p>' },
      { icon: 'ship', title: 'Shipping & logistics',
        body: '<p>Bookings are made against the agreed Incoterm and the route is coordinated from our operational base in India.</p>' },
      { icon: 'globe', title: 'Delivery & handover',
        body: '<p>You are kept informed through to arrival, with a single point of contact from enquiry to delivery.</p>' },
    ],
  } },
  // PLACEHOLDERS BY DESIGN. The client confirmed Solstice offers these, but no
  // description of any of them exists in the content set, the About page or the
  // blueprint. Rather than invent one, each is flagged `unresolvedCopy` and
  // renders with a visible marker - the same convention About's
  // industryRecognition section already uses. The page ships UNPUBLISHED until
  // these are written.
  { key: 'services', type: 'network.services', data: {
    eyebrow: 'SERVICES',
    heading: 'What we handle for you',
    intro: '[CONFIRM] Intro copy for the services block - to be written by the client.',
    items: [
      { icon: 'ship', title: 'Freight forwarding', unresolvedCopy: true,
        body: '<p>[CONFIRM] Describe what Solstice actually does here - lanes covered, modes, whether this is offered to third parties or only alongside our own consignments.</p>' },
      { icon: 'check', title: 'Customs brokerage & compliance', unresolvedCopy: true,
        body: '<p>[CONFIRM] Describe the actual service - which jurisdictions, which filings, and who holds the licence.</p>' },
      { icon: 'box', title: 'Warehousing & distribution', unresolvedCopy: true,
        body: '<p>[CONFIRM] Describe real facilities - locations, cold-chain capability if any, and whether storage is owned or partner-operated.</p>' },
    ],
  } },
  { key: 'categories', type: 'network.categories', data: {
    eyebrow: 'WHAT WE TRADE',
    heading: 'Our product range',
    intro: 'The tiles below are generated from the live catalogue, so they always match what is actually listed.',
    linkLabel: 'View products',
  } },
  // Reused verbatim from About's whyChooseUs rather than written a fourth time.
  // items: [] DELIBERATELY. The reference page fills this band with invented
  // names and stock portraits; Solstice has no consented client quotes, so the
  // section is built, wired and empty. It renders nothing until real ones are
  // added, which is the same treatment the testimonials gap already has.
  { key: 'voices', type: 'network.voices', data: {
    eyebrow: 'CLIENT VOICES',
    heading: 'What buyers say',
    items: [],
  } },
  { key: 'why', type: 'network.why', data: {
    heading: 'Why businesses choose Solstice',
    intro: 'The same commitments that apply to every consignment we move.',
    points: [
      { text: 'Verified supplier network' },
      { text: 'End-to-end export management' },
      { text: 'International market experience' },
      { text: 'Multi-country operational presence' },
      { text: 'Transparent communication' },
      { text: 'Reliable execution and on-time delivery' },
      { text: 'Long-term business partnerships' },
    ],
  } },
  { key: 'cta', type: 'network.cta', data: {
    eyebrow: 'START HERE',
    headingLine1: 'Tell us what you need',
    headingAccent: 'and we will quote it.',
    body: 'Send the product, volume and destination port. We will come back with availability, specification and an indicative price.',
    ctaLabel: 'Send enquiry', ctaRoute: 'contact',
  } },
];

async function main() {
  console.log('Seeding pages from the copy that is live today…');
  await seedPage('home', 'Home', HOME);
  await seedPage('about', 'About us', ABOUT);
  await seedPage('services', 'Services', SERVICES);
  await seedPage('team', 'Team', TEAM);
  // Unpublished on purpose - see seedPage's `published` parameter.
  await seedPage('network', 'Global Trade Network', NETWORK, false);

  await backfillCoordinates();

  if ((await prisma.teamMember.count()) === 0) {
    for (const [order, m] of TEAM_MEMBERS.entries()) {
      await prisma.teamMember.create({ data: { ...m, order } });
    }
    console.log(`  team members: ${TEAM_MEMBERS.length} (photographs deliberately not migrated)`);
  } else {
    console.log('  team members: already present, left alone');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
