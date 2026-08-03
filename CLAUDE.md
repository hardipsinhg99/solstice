# Solstice Trading International LLP — website

Lead-generation site for an Indian fresh-produce exporter (fruit, vegetables, spices, staples).
The buyer is an overseas importer deciding in ~90 seconds whether this is a real operation
worth sending an RFQ to. Every design and content decision serves that, not brand expression.

## Current state

- **Stack today:** Vite 8 + React 19 SPA, hash routing, all content hardcoded in `src/main.jsx`,
  hand-written CSS in `src/styles.css`. No backend.
- **Decided:** migrate the design system, rebuild the shell in Astro. `styles.css`, `Globe.jsx`,
  the `Icon` sprite and the `Reveal` system port over. The hash router, single-file data model
  and client-only rendering do not. **Not started** — blocked on content and photography.
- **Read `docs/website-strategy.md` before proposing structural work.** It holds the agreed IA,
  the product spec-sheet schema, the SEO roadmap, the RFQ design and 13 open questions.
  Do not re-derive those decisions.

## Design work: use the UI/UX Pro Max skills

The `ui-ux-pro-max` skill set is installed in `.claude/skills/`. **Consult it before making
visual, layout, interaction or accessibility decisions — do not design from memory.**

| Task | Skill |
|---|---|
| Layout, styles, colour, typography, UX patterns, a11y, charts | `ui-ux-pro-max` |
| Building/adjusting components, Tailwind or shadcn work | `ui-styling` |
| Tokens, component specs, systematic design | `design-system` |
| Brand voice, visual identity, messaging | `brand` |
| Logos, corporate identity, mockups | `design` |
| Social/ad/hero banner artwork | `banner-design` |
| HTML/Chart.js presentations | `slides` |

Query the database directly when a targeted answer is faster than loading a whole skill:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux --stack astro
# domains: style color chart landing product ux typography icons gsap react web google-fonts
```

If a query returns no match, say so explicitly rather than quietly falling back to generic defaults.

## Constraints that override any skill suggestion

1. **The existing design system stays.** Token architecture (`:root` + `html[data-theme]`),
   `color-mix()`, `clamp()` type, DM Sans / Playfair Display italic / DM Mono, the
   `IntersectionObserver` reveals and the film-grain overlay are assets. Sharpen, do not replace.
   A from-scratch redesign needs an argument for why the current system is insufficient.
2. **WCAG 2.2 AA is a requirement, not a phase.** `--line-strong` (not `--line`) on interactive
   borders, ≥4.5:1 body text in both themes, keyboard-operable cards, dual-tone focus ring,
   and `prefers-reduced-motion` honoured including continuous loops.
3. **Evidence over adjectives.** Specs, certifications, loadability and registration numbers
   outrank mission statements. Never invent a certification, figure or credential.
4. **Restraint.** One primary CTA per viewport. Cut decoration competing with evidence.
5. **Product pages are spec sheets, not e-commerce pages.** No cart, no price, quote-only.

## House rules

- Don't add TypeScript, Tailwind, a router library, a test runner or a linter without asking.
- Don't split `src/main.jsx` — it is replaced by the Astro rebuild.
- Don't self-host or swap the Unsplash imagery; that is a rebuild decision pending real photography.
- Never commit a form key or secret. `VITE_*` vars are inlined into the client bundle and are public.
