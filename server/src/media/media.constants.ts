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

/**
 * Video. Separate caps from images on purpose - MEDIA.MAX_UPLOAD_BYTES is 8MB,
 * which a 60-second phone clip clears in the first two seconds. Raising the
 * shared cap would have quietly raised it for every image endpoint too.
 *
 * Every number here was chosen against THIS box: 2 vCPU, ~800MB free, shared
 * with another client's live stack.
 */
export const VIDEO = {
  /** Accepted before a byte is processed. A phone-shot 60s 1080p clip fits. */
  MAX_UPLOAD_BYTES: 200 * 1024 * 1024, // 200 MB

  /**
   * 60 seconds. Gallery b-roll, not archival footage - and the cap is really a
   * bound on worst-case transcode time, which on 2 shared vCPUs is roughly 2-4x
   * realtime at 1080p. 60s keeps the ceiling near four minutes; 90s pushed it
   * past six, which is long enough to matter to the neighbouring stack.
   */
  MAX_DURATION_SECONDS: 60,

  /** Downscale only. An upscale invents detail and costs bytes for nothing. */
  MAX_WIDTH: 1920,
  MAX_HEIGHT: 1080,

  /**
   * CRF 26 with the veryfast preset. 23 is the visually-transparent default and
   * roughly doubles the file for a gallery clip nobody inspects frame by frame;
   * 28 shows banding on the graded, low-contrast footage this brand uses.
   * veryfast rather than medium because CPU time is the scarce resource here,
   * not disk.
   */
  CRF: 26,
  PRESET: 'veryfast',

  /** Audio is stripped. See -an in the argument list and the report. */
  STRIP_AUDIO: true,

  /** Hard wall-clock ceilings. A hung ffmpeg on a shared box is a DoS. */
  PROBE_TIMEOUT_MS: 15_000,
  TRANSCODE_TIMEOUT_MS: 8 * 60_000,

  /**
   * One at a time. Two vCPUs and a neighbouring production site mean a second
   * concurrent transcode does not halve the wall time, it doubles the load and
   * starves the other stack. libx264 also gets -threads 1 for the same reason.
   */
  MAX_CONCURRENT: 1,

  OUTPUT_MIME: 'video/mp4',
  OUTPUT_EXT: 'mp4',

  /**
   * Container sniffing before ffprobe ever runs - the direct analogue of
   * detectImageType. Not a substitute for ffprobe, a cheap first gate so an
   * obviously-wrong file never reaches the C decoder at all.
   */
  MAGIC: [
    { label: 'video/mp4', test: (b: Buffer) => b.length > 12 && b.toString('ascii', 4, 8) === 'ftyp' },
    { label: 'video/webm', test: (b: Buffer) => b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
    { label: 'video/quicktime', test: (b: Buffer) => b.length > 12 && b.toString('ascii', 4, 8) === 'ftyp' },
    { label: 'video/x-msvideo', test: (b: Buffer) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'AVI ' },
  ] as { label: string; test: (b: Buffer) => boolean }[],
} as const;

/** Cheap container check. Returns null when nothing matches. */
export function detectVideoContainer(buffer: Buffer): string | null {
  return VIDEO.MAGIC.find((s) => s.test(buffer))?.label ?? null;
}
