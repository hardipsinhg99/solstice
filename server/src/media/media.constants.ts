/** Single source of truth. No magic numbers scattered through the stack. */
export const MEDIA = {
  /** Hard ceiling on the uploaded byte count, enforced by multer AND re-checked. */
  MAX_UPLOAD_BYTES: 8 * 1024 * 1024, // 8 MB
  /** Longest edge of the processed output. */
  MAX_LONG_EDGE: 1600,
  /** Target for the processed file. Quality steps down until it fits. */
  TARGET_OUTPUT_BYTES: 400 * 1024, // 400 KB
  /** Quality ladder walked from the top until the target is met. */
  QUALITY_STEPS: [82, 74, 66, 58, 50],
  /** Gallery images per product. Configurable constant, not a scattered literal. */
  MAX_GALLERY_IMAGES: 6,
  /** Output format for every processed image. */
  OUTPUT_FORMAT: 'webp' as const,
  OUTPUT_MIME: 'image/webp',
} as const;

/**
 * Accepted input types, identified by MAGIC BYTES - never by the client's
 * Content-Type header or the filename extension, both of which are attacker
 * controlled. A renamed executable called photo.jpg fails here.
 */
export const MAGIC_SIGNATURES: { label: string; test: (b: Buffer) => boolean }[] = [
  { label: 'image/jpeg', test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    label: 'image/png',
    test: (b) =>
      b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    label: 'image/webp',
    test: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
];

/**
 * SVG is deliberately absent. It is a script-execution vector, cannot be
 * meaningfully sanitised by a raster pipeline, and no product photograph needs
 * it. AVIF/HEIC are absent because sharp's support depends on the libvips build
 * and a format that works locally but not on the deploy host is worse than one
 * that is refused consistently.
 */
export function detectImageType(buffer: Buffer): string | null {
  return MAGIC_SIGNATURES.find((s) => s.test(buffer))?.label ?? null;
}
