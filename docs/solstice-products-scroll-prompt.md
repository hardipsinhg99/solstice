# Prompt — Solstice: Products Page Scroll Sequence

> Paste below the line into Claude Code with the `solstice/` repo open.
> Unzip `explode-frames.zip` into `public/` first — you should end up with `public/explode/frame-001.webp` … `frame-060.webp` plus `poster.webp`.

---

## ROLE

Senior front-end engineer implementing a scroll-driven canvas sequence. Scroll-linked animation is the fastest way to make a fast site feel broken. Performance and graceful degradation outrank the effect. If it cannot hold 55fps under throttling, you say so and we ship the static poster — that is a correct outcome, not a failure.

## CONTEXT

Read `docs/website-strategy.md` and the architecture section of `CLAUDE.md`. Follow the existing folder structure and the one-way import rule (`pages → features → components → lib`).

This goes on the **Products page** (`#products`), between the page header ("Our seasonal selection") and the filter chips + product grid.

## ASSETS — already on disk, verified

```
public/explode/frame-001.webp … frame-060.webp   # 60 frames, 1100×619, ~60KB each
public/explode/poster.webp                        # copy of the final frame
```

Total ~3.5MB. **Derive the frame count from a constant you define once, do not scatter `60` through the code.** If the directory contents do not match the above, stop and tell me.

**Sequence content:** frame 001 is eight whole fruits in a horizontal row on a flat deep-emerald background — dragon fruit, banana, orange, black grapes, cherry tomatoes, mango, pomegranate, okra. Across the sequence they slice apart with water splashes and separate into stacked horizontal slices. Frame 060 is the fully exploded state. Camera is locked throughout; only the fruit moves.

## THE EFFECT — two coupled motions

As the visitor scrolls through the section, **progress `p` runs 0 → 1** and drives both of these simultaneously:

1. **Frame scrub.** `frameIndex = round(p * (FRAME_COUNT - 1))`. Whole fruits slice apart as you scroll.
2. **Descent under the page.** The canvas stage translates downward and the product grid below slides up over it, so the fruit appears to **sink beneath the product container** rather than scrolling past it.

The second motion is the part the client asked for and the part that will look wrong if you improvise it. Implement it as:

- The canvas stage is `position: sticky`, `top: 0`, `height: 100vh`, sitting at a **lower stacking level** than the products grid.
- The products grid section that follows gets an **opaque background** from `var(--bg)` and a higher stacking level, so it occludes the canvas as it scrolls up.
- The canvas itself translates `translate3d(0, calc(p * 25vh), 0)` and fades opacity from 1 to ~0.35 over the last 30% of progress, so it recedes rather than being abruptly clipped.
- Do **not** use `z-index` on the canvas if paint order alone achieves the occlusion — check the existing `.hero-media` precedent in `styles.css`, which relies on natural paint order.

The read should be: fruits come apart, then slide down and disappear under the product catalogue.

**Outer container height: 200vh, not 300vh.** This is a B2B products page — the buyer's task is reaching the catalogue. Two viewports of scroll before the grid is already a tax; three would be indefensible.

## NON-NEGOTIABLES

**Preload before you animate.** Load all 60 frames into an `Image[]`, using `img.decode()` where available, before the section becomes interactive. Show `poster.webp` as a static background until preloading resolves. Never scrub a partially-loaded sequence.

**One `requestAnimationFrame` loop. Never draw from the scroll handler.** The scroll listener (`{ passive: true }`) records progress only; the rAF loop reads it and draws. Skip the draw entirely when the frame index has not changed since last tick.

**Canvas sizing.** Backing store = `clientWidth * min(devicePixelRatio, 2)`. Compute cover-fit letterboxing manually. Re-run on `ResizeObserver`, never `window.resize`.

**Never mount below 780px.** Gate in React — `display: none` still downloads all 60 frames. Mobile gets a single static `<img src="poster.webp">` and nothing else. That is the better mobile experience regardless.

**`prefers-reduced-motion: reduce` → never mount.** Static poster. Verify **zero** requests to `/explode/` in the Network tab.

**`navigator.connection.saveData`, or `effectiveType` of `2g`/`slow-2g` → never mount.** Same static fallback.

**Accessibility.** Canvas is `aria-hidden="true"`, `role="presentation"`, not keyboard reachable. The section must not trap scroll or focus — Tab must reach the filter chips and the product grid normally, and the page must reach the footer by keyboard alone. No content lives only inside this section.

**Pause when off-screen.** `IntersectionObserver` cancels the rAF loop when the section leaves the viewport. Reuse the existing `motion/useInView` pattern rather than writing another observer from scratch; if its ignored-`options` bug is still present, note which way you handled it.

**Clean up on unmount.** Cancel rAF, disconnect observers, remove listeners, null the image array.

**No new dependencies.** No GSAP, ScrollTrigger, Framer Motion, Lenis, or smooth-scroll library. Native `IntersectionObserver`, `requestAnimationFrame`, `scrollY`.

**Tokens only.** Colours and spacing through `styles/tokens.css`. The emerald canvas background must match `--bg` behind it in **both themes** — check the light theme especially, since the frames have a dark green background that will band against a light page. If it bands, add a gradient bleed at the canvas edges using existing tokens.

## FILE PLACEMENT

```
src/pages/products/sections/ExplodeSequence.jsx
src/features/explode/useFrameSequence.js     # preload, progress → index, rAF loop
src/features/explode/config.js               # FRAME_COUNT, path pattern, thresholds
src/styles/pages.css                         # appended in existing cascade order
```

## OUT OF SCOPE

- Do not touch the hero, globe, enquiry form, header, or any other page
- Do not change the router, the product data, the filter chips, or the grid markup beyond adding the background/stacking rules the occlusion requires
- Do not add labels or copy — I will write the section heading separately
- Do not address the pre-existing Unsplash LCP issue or the `.reveal` CLS

## ACCEPTANCE — verify and report with real numbers

1. **Performance panel, full scrub through the section, 6× CPU throttle.** Report sustained fps and longest task. Below 55fps sustained: say so plainly, do not ship and claim success.
2. `prefers-reduced-motion: reduce` — zero requests to `/explode/`.
3. Viewport under 780px — zero requests to `/explode/`.
4. Total transfer for the sequence, and Slow-3G time until the section is interactive.
5. Reverse scroll — scrubbing backwards is smooth, no flicker, no skipped frames.
6. The occlusion reads correctly: fruit visibly passes *under* the product grid, with no gap, no seam, and no flash of page background between them. Check in **both themes**.
7. Tab through the Products page: focus reaches filter chips, grid, and footer. Never lands on the canvas. No scroll trap.
8. Delete `public/explode/` temporarily: page degrades to poster (or to nothing, if poster is also gone) with no console error. Restore it.
9. Lighthouse on `#products` before and after — LCP, CLS, TBT.

## COMMITS

Three: the frame-sequence hook, the section component, the responsive/reduced-motion fallbacks and grid occlusion styles.

## REPORT BACK

All nine results with numbers. Then: what you decided that I did not specify, what the no-dependency rule made awkward, and your honest read on whether this should ship at the measured performance or be cut.
