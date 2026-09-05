/**
 * The home-screen icons and the masthead, derived from the app's own mark.
 *
 * ## Why this was rewritten
 *
 * It used to read `public/icons/icon-512.png` — the Trench Crusade badge — fit
 * a bilinear gradient to it, key the mark off that gradient by colour distance,
 * un-premultiply the result and re-composite it. All of that machinery existed
 * for one reason: the source was a raster someone else had drawn, and the only
 * way to get a full-bleed maskable icon out of it was to take it apart.
 *
 * The source is now `public/brand/mark.svg`, which is ours and is vector. So
 * the gradient is declared rather than fitted, the mark is rendered rather than
 * lifted, and roughly a hundred lines of image forensics are gone. Nothing was
 * wrong with them; there is simply nothing left for them to do.
 *
 * The reason for the change is not tidiness. An unofficial companion whose
 * masthead and home-screen icon are the publisher's own logo is using their
 * trademark as its identity, which reads as endorsement whatever the footer
 * says — see the comment in `public/brand/mark.svg`.
 *
 * ## What a maskable icon has to be
 *
 * Full bleed: every pixel is artwork, the launcher cuts whatever shape it
 * wants out of it, and the mark sits inside the safe zone so no shape can clip
 * it. The app shipped a small light badge floating on a near-black ground, so
 * a launcher masking to a circle produced a dark disc with a little square in
 * it — the only square tile in a grid of circles, which is how this was
 * reported.
 *
 *   node scripts/build-app-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SOURCE = 'public/brand/mark.svg';
const ICONS = 'public/icons';

/**
 * The maskable safe zone.
 *
 * The spec guarantees only a circle of 80% of the icon's width; everything
 * outside it may be cut. The mark is sized so its BOUNDING CIRCLE fits inside
 * that, with a margin — a mark that merely fits the safe square still loses
 * its corners to a circular mask.
 */
const SAFE_RADIUS = 0.40;
const MARGIN = 0.94;

/**
 * The ground, in the app's own dark.
 *
 * It ends on `#0C0E12`, which is the manifest's `background_color` and
 * `theme_color`, so the icon meets the splash screen without a seam.
 */
const GROUND = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#232833"/>
    <stop offset="0.55" stop-color="#14171E"/>
    <stop offset="1" stop-color="#0C0E12"/>
  </linearGradient></defs>
  <rect width="512" height="512" fill="url(#g)"/>
</svg>`;

const SIZE = 512;

/** Where the mark's ink actually is, which is not the SVG's viewBox. */
async function inkBounds(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      /* 8, not 0: the renderer's antialiasing leaves a whisper of alpha past
         the shape, and measuring to that inflates the box and shrinks the
         mark for no reason a reader could see. */
      if (data[(y * info.width + x) * info.channels + 3] <= 8) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error(`${SOURCE} rendered nothing. The mark cannot be sized against an empty image.`);
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

async function build() {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`${SOURCE} is missing. Every icon is derived from it; there is no fallback artwork.`);
  }
  const svg = fs.readFileSync(SOURCE);
  const rendered = await sharp(svg).resize(SIZE, SIZE).png().toBuffer();
  const ink = await inkBounds(rendered);

  /*
    Scale so the mark's bounding CIRCLE clears the safe zone. Sizing by width
    alone pushes the corners of a wide mark out past a circular mask, which is
    how "T✝C" would have come out as "✝".
  */
  const scale = (SAFE_RADIUS * MARGIN * SIZE) / (Math.hypot(ink.w, ink.h) / 2);
  const w = Math.max(1, Math.round(ink.w * scale));
  const h = Math.max(1, Math.round(ink.h * scale));

  const mark = await sharp(rendered)
    .extract({ left: ink.x0, top: ink.y0, width: ink.w, height: ink.h })
    .resize(w, h, { fit: 'fill' })
    .png().toBuffer();

  const icon = await sharp(Buffer.from(GROUND)).resize(SIZE, SIZE)
    .composite([{ input: mark, left: Math.round((SIZE - w) / 2), top: Math.round((SIZE - h) / 2) }])
    .png().toBuffer();

  fs.mkdirSync(ICONS, { recursive: true });

  /*
    The same full-bleed art for every icon, `any` and `maskable` alike. A
    separate padded version for `any` would be a second thing to keep in step,
    and a launcher that does not mask simply shows the square — which is what
    the other square icons on the screen look like anyway.
  */
  const out = [
    ['icon-512.png', 512], ['icon-192.png', 192],
    ['icon-maskable-512.png', 512], ['icon-maskable-192.png', 192],
    /* iOS applies its own rounded rect and never asks for transparency; a
       full-bleed square is exactly what it wants. */
    ['apple-touch-icon.png', 180],
  ];
  for (const [name, size] of out) {
    await sharp(icon).resize(size, size).png().toFile(path.join(ICONS, name));
  }

  /*
    The masthead, on transparency rather than on the ground: it sits on the
    app's own chrome, and a dark square inside a dark bar draws a box around
    nothing.
  */
  const logo = await sharp(svg).resize(500, 500, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp(logo).png().toFile('public/logo.png');
  await sharp(logo).webp({ lossless: true }).toFile('public/logo.webp');

  console.log(`icons: mark ${ink.w}x${ink.h} -> ${w}x${h} (${(scale * 100).toFixed(0)}%), `
            + `bounding circle ${(Math.hypot(w, h) / 2).toFixed(0)}px of ${(SAFE_RADIUS * SIZE).toFixed(0)}px safe`);
  for (const [name] of out) console.log(`  ${path.join(ICONS, name)}`);
  console.log('  public/logo.png\n  public/logo.webp');
}

build().catch((e) => { console.error(e.message); process.exit(1); });
