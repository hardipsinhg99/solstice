#!/usr/bin/env python3
"""
Generates the dotted world map as a static SVG, ONCE, at development time.

Why this exists rather than the `dotted-map` npm package the reference uses:
that package computes the whole map inside a useMemo on every mount, in every
visitor's browser, and ships its own geodata in the bundle. The output is
identical every time, so it is a build artefact, not a runtime computation.

Run it only when the map itself needs to change:

    python3 scripts/generate-world-dots.py

Output: public/world-dots.svg   (committed - do not gitignore)

THE PROJECTION IS THE POINT.
The reference's bug is that its map SVG and its marker projection come from two
different places, so pins land in the ocean. Here the dots are plotted with the
SAME equirectangular formula the component uses for markers:

    x = (lng + 180) * (WIDTH  / 360)
    y = (90  - lat) * (HEIGHT / 180)

Alignment is therefore correct by construction, not by tuning. If you change
WIDTH/HEIGHT here you must change the matching constants in
features/worldmap/project.js, and nowhere else.

Source data: Natural Earth 110m land polygons (public domain), fetched once and
not vendored - the SVG it produces is what the repo keeps.
"""
import json
import sys
import urllib.request

SRC = ("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
       "master/geojson/ne_110m_land.geojson")

WIDTH, HEIGHT = 800.0, 400.0
STEP_DEG = 1.6      # grid pitch in degrees; smaller = denser map, bigger file
RADIUS = 0.9        # dot radius in SVG units
LAT_MIN, LAT_MAX = -58.0, 79.0   # skip Antarctica and the empty high Arctic


def rings(geojson):
    """Every land ring as (bbox, coords), bbox-prefiltered for speed."""
    out = []
    for feat in geojson["features"]:
        geom = feat["geometry"]
        polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
        for poly in polys:
            ring = poly[0]                       # outer ring; holes are lakes, ignore
            xs = [p[0] for p in ring]
            ys = [p[1] for p in ring]
            out.append(((min(xs), min(ys), max(xs), max(ys)), ring))
    return out


def inside(lng, lat, ring):
    """Ray casting. Standard even-odd test."""
    hit = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > lat) != (yj > lat):
            if lng < (xj - xi) * (lat - yi) / (yj - yi) + xi:
                hit = not hit
        j = i
    return hit


def main():
    with urllib.request.urlopen(SRC, timeout=90) as r:
        data = json.load(r)
    land = rings(data)

    dots = []
    lat = LAT_MAX
    while lat >= LAT_MIN:
        lng = -180.0
        while lng < 180.0:
            for (x0, y0, x1, y1), ring in land:
                if x0 <= lng <= x1 and y0 <= lat <= y1 and inside(lng, lat, ring):
                    x = (lng + 180.0) * (WIDTH / 360.0)
                    y = (90.0 - lat) * (HEIGHT / 180.0)
                    dots.append((round(x, 1), round(y, 1)))
                    break
            lng += STEP_DEG
        lat -= STEP_DEG

    # ONE file for both themes, and not via currentColor.
    #
    # currentColor only works on an INLINE svg, which would mean 5,947 DOM nodes
    # per map on two pages. Two separate light/dark files would mean an asset
    # that can drift out of sync with the palette.
    #
    # Instead this file is opaque black and is consumed as a CSS mask-image, with
    # the visible colour coming from background-color on the element - a token.
    # The browser rasterises it once, it contributes no DOM and no JS, it is
    # cached like any other asset, and both themes are one custom property apart.
    #
    # <use> against a single defs circle rather than 5,947 full <circle> tags:
    # same rendering, roughly half the bytes.
    body = "".join(f'<use href="#d" x="{x}" y="{y}"/>' for x, y in dots)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH:.0f} {HEIGHT:.0f}" '
        f'fill="#000" role="presentation">'
        f'<defs><circle id="d" r="{RADIUS}"/></defs>{body}</svg>'
    )

    with open("public/world-dots.svg", "w") as f:
        f.write(svg)

    print(f"  dots: {len(dots)}")
    print(f"  bytes: {len(svg)}")
    print(f"  viewBox: 0 0 {WIDTH:.0f} {HEIGHT:.0f}  (must match project.js)")


if __name__ == "__main__":
    sys.exit(main())
