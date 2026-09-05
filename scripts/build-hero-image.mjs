/**
 * The landing page hero, graded and cropped at build time rather than in CSS.
 *
 * The design specifies the photograph as `grayscale(0.5) contrast(1.12)
 * brightness(0.66) sepia(0.1)` — the intent being that it reads as ground
 * texture in the palette rather than as a snapshot pasted onto a dark page.
 * Applied as a CSS `filter` that is four passes over a hero-sized image on
 * every paint, on the phone the app is used on. Applied here it is four passes
 * once, on a build machine.
 *
 * Two crops, not one framing scaled.
 *
 * The design frames the desktop hero by hand — the image placed at a fixed
 * offset inside a 1280x600 board, its right edge deliberately clipped, the
 * left 300px left as flat ground for the type to sit on. Those numbers are a
 * framing, not a layout: at 375px wide the same offsets put both models off
 * screen. So the wide board is baked exactly as designed, and the phone gets
 * its own crop that was checked at 375 rather than derived from the desktop
 * one. `<picture>` picks between them, and neither needs `object-position`
 * tuning per breakpoint.
 *
 * The scrim is NOT baked in. It stays a CSS gradient so its first stop is the
 * same token as the hero ground — bake it and any future change to that colour
 * shows up as a seam down the left of the image.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'data-sources/photography/duellists.jpg');
const OUT = path.join(ROOT, 'public/brand');

/** The hero ground, and `--brand-ground` in `globals.css`. Keep them equal. */
const GROUND = { r: 12, g: 13, b: 16, alpha: 1 };

/**
 * The grade, in the order a photo editor would apply it.
 *
 * `saturation` and `brightness` are `modulate`'s own; the contrast and the
 * warmth are one `linear` pass, because both are per-channel gains and doing
 * them separately would quantise twice. The gain pivots on mid-grey — a bare
 * multiply would lift the blacks as well and the image would go milky, which
 * is the opposite of what the grade is for.
 */
const CONTRAST = 1.12;
const WARMTH = [1.05, 1.0, 0.93]; // R up, B down: sepia(0.1) by another route

const graded = () => {
  const gain = WARMTH.map((w) => CONTRAST * w);
  return sharp(SOURCE)
    .modulate({ saturation: 0.5, brightness: 0.66 })
    .linear(gain, gain.map((a) => 128 - 128 * a));
};

/**
 * The width over which the photograph fades into the flat ground on its left.
 *
 * Without it the composite has a hard vertical edge at x=600, and the scrim
 * does not hide it: at 32% the gradient is 0.92 opaque, which leaves 8% of a
 * lit blurred background sitting against 0% of a flat one. 8% of a difference
 * is still an edge, and an edge down the middle of a hero reads as a broken
 * image rather than as a design.
 */
const FADE = 260;

/** An alpha ramp, as a mask the composite multiplies the photo's alpha by. */
function leftFade(width, height) {
  const px = Buffer.alloc(width * height * 4, 255);
  for (let x = 0; x < FADE; x += 1) {
    const a = Math.round(255 * (x / FADE));
    for (let y = 0; y < height; y += 1) px[(y * width + x) * 4 + 3] = a;
  }
  return { input: px, raw: { width, height, channels: 4 }, blend: 'dest-in' };
}

/**
 * Desktop: the design's own framing, at 2x.
 *
 * 1280x600 board, image 1050 wide at left 300 / top -78. Doubled, and the
 * image resized by width so the source's aspect is kept rather than squashed
 * to the design's rounded 1050x787.
 */
async function wide() {
  /*
    The window the board actually shows, taken before the composite rather
    than after: `composite` will not accept an input larger than the canvas,
    and will not accept a negative offset, so the crop has to do the work the
    design expresses as an offset and an overflow.

    Board x 600..2560 is photo x 0..1960; board y 0..1200 is photo y 156..1356.
    Everything outside that is what the design clips.
  */
  const photo = await graded()
    .resize({ width: 2100 })
    .extract({ left: 0, top: 156, width: 1960, height: 1200 })
    .ensureAlpha()
    .composite([leftFade(1960, 1200)])
    .png()
    .toBuffer();
  return sharp({
    create: { width: 2560, height: 1200, channels: 3, background: GROUND },
  })
    .composite([{ input: photo, left: 600, top: 0 }])
    .webp({ quality: 82 })
    .toFile(path.join(OUT, 'hero-wide.webp'));
}

/**
 * Phone: its own crop, checked at 375x440.
 *
 * Full height, and a window on x that holds both models. It cannot hold them
 * tightly — they span 2,754px of a 4,080px frame and the 0.852 aspect allows
 * 2,617 — so the left edge crosses the banner pole rather than either model.
 * Cropping to the models instead would cut one of them out, and a hero with
 * one duellist in it is not the photograph.
 */
async function tall() {
  return graded()
    .extract({ left: 1200, top: 0, width: 2617, height: 3072 })
    .resize({ width: 1200, height: 1408 })
    .webp({ quality: 82 })
    .toFile(path.join(OUT, 'hero-tall.webp'));
}

if (!fs.existsSync(SOURCE)) {
  // Loudly. A hero that silently falls back to nothing is a blank front page.
  throw new Error(`No source photograph at ${SOURCE}`);
}

fs.mkdirSync(OUT, { recursive: true });
const results = await Promise.all([wide(), tall()]);
for (const r of results) {
  console.log(`${r.format} ${r.width}x${r.height}  ${(r.size / 1024).toFixed(0)} KB`);
}
