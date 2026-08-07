# Journey sequence — art specification

Assets for the scroll-scrubbed logistics sequence on the homepage
(`src/pages/home/sections/JourneyScroll.jsx`).

**Everything in this folder is a placeholder** — flat-shaded silhouettes with baked
gradients and contact shadows, generated so the motion can be judged before real art
exists. Replace files in place: keep the filename, the facing direction and the geometry
contracts below, and the component needs **no code change**. Paths appear exactly once,
in `JOURNEY_ASSETS` in the component.

## Golden rule

**Everything travels LEFT → RIGHT.** A subject facing the wrong way reads as a return
leg, not an export route. `ship` and `plane` must have bow/nose pointing **right**.

## Geometry contracts (these drive the animation — do not break them)

Real renders must respect three measured anchors; each has a single place to update if
your art differs:

1. **Truck bed** — the flatbed's load surface in `truck-body.webp`. Placeholder: bed
   span x `0.03 → 0.60` of image width, bed top edge at `0.60` of image height. The
   container is animated onto exactly this rectangle. If your render's bed sits
   elsewhere, update `--journey-bed-left/right/top` on `.journey-truck` in
   `src/styles/pages.css` — nothing in the JS. Keep `aspect-ratio` there equal to your
   image's, or the wheels and bed line both drift.
2. **Wheel arches** — arch centres in the placeholder sit at x fractions `0.176 /
   0.256 / 0.336` (trailer bogie), `0.669` (drive), `0.888` (steer) of image width,
   open at the bottom edge. The separate `wheel.webp` assets are positioned at those
   fractions (`WHEELS` in the component). Move the arches, move those numbers.
3. **Waterline** — the ship's hull bottom edge sits at `0.84` of `ship.webp`'s height.
   The wake is positioned against it (`.journey-wake{top:70%}` in ship-group space).

## The assets

| File | Placeholder size | Transparency | Contract |
|---|---|---|---|
| `crane.webp` | 1600×1100 | required | Gantry only, **no container attached**, legs down, boom horizontal. Trolley/tackle must NOT be container-green — it reads as a second container (this exact confusion shipped once). |
| `hook.webp` | 300×420 | required | Spreader + block only, cable stub at top centre, **not green**. Its bottom edge is the coupling line — leave no empty margin below the twistlocks. |
| `container.webp` | 900×375 | required | The one green box in acts 1–2. ¾ side view, doors left. Bottom edge = seating line (no margin). |
| `truck-body.webp` | 1600×449 | required | Prime mover + **visible flatbed and chassis** — the rail must read against `--deep` (placeholder uses a light steel, ≈4.9:1). Cab at the right, wheels removed. See contract 1–2. |
| `wheel.webp` | 200×200 | required | Square canvas, hub exactly centred (rotated 1440°+, an off-centre hub wobbles). Visible spokes so rotation reads. |
| `road.webp` | 2000×300 | required | **Tiles seamlessly on X** — export lossless; lossy edge pixels break the seam (bitten once). Marking period must divide the width exactly. |
| `ocean.webp` | 2400×1400 | opaque | Full-bleed via `object-fit:cover`, never panned — no tiling requirement. Horizon haze at the top, waves tighter/fainter with distance. |
| `ship.webp` | 1800×620 | required | Bow **right**, superstructure aft. Deck stacks in brand palette only (green/steel/gold — no reds). See contract 3. |
| `wake.webp` | 1200×300 | required | Foam brightest at the **right edge** (tucks under the stern) tapering left. It rides inside the ship group, so it is drawn attached. |
| `cloud-a/b/c.webp` | 2000×700 | required | Soft volumetric banks (core + halo), no hard edges — scaled up to 3.6×. |
| `plane.webp` | 1600×520 | required | **Side profile**, nose right, single visible wing with pods, fin up at the tail. Rendered at 24% viewport width — a top-down or oversized plane reads as a paper dart (also shipped once). |
| `sky.webp` | 2400×1400 | opaque | Light gradient plate. NOTE: the caption over this act flips to dark ink on a light scrim — keep the sky in the pale token-derived range or revisit `.journey-caption-sky`. |

## Format & caching

WebP (that's what the component requests); export real art at ≥ these sizes. `/journey/*`
is not content-hashed — `vercel.json` serves it with one-week `max-age`, so either expect
up to a week of stale delivery after a swap or rename the file (and `JOURNEY_ASSETS`).
