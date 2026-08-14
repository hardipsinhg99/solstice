// Regenerates the two art-directed hero crops from public/home.png.
//
// Run with:  node scripts/build-hero.mjs
// sharp is resolved from server/node_modules - it is a server dependency and is
// deliberately NOT added to the public bundle's package.json for a build step
// that runs by hand when the artwork changes.
import { createRequire } from 'node:module'
import { statSync } from 'node:fs'

const sharp = createRequire(import.meta.url)('../server/node_modules/sharp')
const SRC = 'public/home.png'

// left/width are in SOURCE pixels. The wordmark wash ends around x=560, so both
// crops start after it.
const CROPS = [
  { out: 'public/home-hero.webp',     left: 560, width: 1024, quality: 82 },
  { out: 'public/home-hero-960.webp', left: 880, width: 704,  quality: 80 }
]

for (const { out, left, width, quality } of CROPS) {
  await sharp(SRC).extract({ left, top: 0, width, height: 672 }).webp({ quality }).toFile(out)
  const { width: w, height: h } = await sharp(out).metadata()
  console.log(`${out}  ${w}x${h}  ${(statSync(out).size / 1024).toFixed(0)} KB`)
}
