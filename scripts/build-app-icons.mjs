/**
 * The home-screen icons, derived from the app's own artwork.
 *
 * Reported by the app's owner with a screenshot of his launcher: TrenchLine
 * was the only square tile in a grid of circles.
 *
 * The cause is in the artwork rather than in the manifest, which declared
 * `purpose: "maskable"` correctly all along. Both icons are a light silver
 * BADGE floating on a near-black ground — so a launcher that masks the icon
 * to a circle produces a dark disc with a small light square inside it, and
 * one that letterboxes it instead produces a dark square. Neither looks like
 * the other icons on the screen, and shrinking the badge further (which is
 * what `icon-maskable-512.png` did) makes it worse, not better.
 *
 * A maskable icon has to be FULL BLEED: every pixel is artwork, the launcher
 * cuts whatever shape it wants out of it, and the mark sits inside the safe
 * zone so no shape can clip it. That is what this builds — the badge's own
 * gradient extended to the edges, with the mark lifted off it and re-placed
 * at a size that fits the safe circle.
 *
 * Derived rather than hand-drawn, and committed as a script, so the icons can
 * be rebuilt when the artwork changes instead of being binaries nobody can
 * regenerate.
 *
 *   node scripts/build-app-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ICONS = 'public/icons';
const SOURCE = path.join(ICONS, 'icon-512.png');

/**
 * The maskable safe zone.
 *
 * The spec guarantees only a circle of 80% of the icon's width; everything
 * outside it may be cut. The mark is sized so its BOUNDING CIRCLE fits inside
 * that, with a margin — a mark that merely fits the safe square still loses
 * its corners to a circular mask, which is how "T✝C" would come out as "✝".
 */
const SAFE_RADIUS = 0.40;
const MARGIN = 0.94;

/**
 * Where the mark begins and where it is fully opaque, as a distance from the
 * fitted background.
 *
 * The FLOOR is not optional. The badge's gradient is not exactly bilinear, so
 * the fit leaves a few counts of error everywhere — and keying straight from
 * zero turns that error into a film of 5-10% alpha across the whole crop,
 * which lands on the new background as a visible rectangle around the mark.
 * Below the floor is background; above it, alpha ramps to opaque so the
 * mark's own antialiasing survives.
 */
const KEY_FLOOR = 48;
const KEY_DISTANCE = 120;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

async function raw(file) {
  const { data, info } = await sharp(file).ensureAlpha()
    .raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, channels: info.channels };
}

const at = (img, x, y) => {
  const i = (y * img.w + x) * img.channels;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
};
const luminance = ([r, g, b]) => (r + g + b) / 3;

/** The light badge inside the dark ground. */
function badgeBounds(img) {
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (luminance(at(img, x, y)) <= 100) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error(`${SOURCE}: no light badge found — the artwork is not what this reader expects.`);
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * The badge's gradient, as the four corners of a bilinear surface.
 *
 * Sampled a little inside the badge's edge, where the mark never reaches.
 * Read as a surface rather than copied as pixels so it can be EXTENDED past
 * the badge to fill the whole canvas — which is the point of the exercise.
 */
function gradientOf(img, b) {
  const inset = Math.round(b.w * 0.02);
  const corner = (x, y) => at(img, x, y);
  return {
    tl: corner(b.x0 + inset, b.y0 + inset),
    tr: corner(b.x1 - inset, b.y0 + inset),
    bl: corner(b.x0 + inset, b.y1 - inset),
    br: corner(b.x1 - inset, b.y1 - inset),
  };
}

/** The gradient at (u, v), both 0..1 across the badge. */
function sample(g, u, v) {
  const mix = (a, c, t) => a + (c - a) * t;
  return [0, 1, 2].map((k) => mix(
    mix(g.tl[k], g.tr[k], u),
    mix(g.bl[k], g.br[k], u), v));
}

/**
 * The mark, lifted off its background.
 *
 * Keyed on distance from the fitted gradient rather than on a fixed colour:
 * the mark is black and red over a silver ramp that runs from 189 to 254, so
 * no single threshold separates them everywhere on the badge. The colour is
 * un-premultiplied against the background it was sitting on, which is what
 * keeps a light halo from appearing once it is placed on a different one.
 */
function liftMark(img, b, g) {
  const out = Buffer.alloc(b.w * b.h * 4);
  let x0 = b.w, y0 = b.h, x1 = -1, y1 = -1;

  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      const pixel = at(img, b.x0 + x, b.y0 + y);
      const bg = sample(g, x / (b.w - 1), y / (b.h - 1));
      const distance = Math.max(...[0, 1, 2].map((k) => Math.abs(pixel[k] - bg[k])));
      const alpha = clamp((distance - KEY_FLOOR) / (KEY_DISTANCE - KEY_FLOOR), 0, 1);

      const i = (y * b.w + x) * 4;
      for (let k = 0; k < 3; k++) {
        const unmixed = alpha > 0.02
          ? (pixel[k] - bg[k] * (1 - alpha)) / alpha
          : pixel[k];
        out[i + k] = clamp(Math.round(unmixed), 0, 255);
      }
      out[i + 3] = Math.round(alpha * 255);

      if (alpha > 0.35) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error('No mark could be lifted off the badge.');
  return { buffer: out, w: b.w, h: b.h, box: { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } };
}

/** The gradient, extended over a whole square canvas. */
function ground(g, size) {
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = sample(g, x / (size - 1), y / (size - 1));
      const i = (y * size + x) * 4;
      for (let k = 0; k < 3; k++) out[i + k] = clamp(Math.round(c[k]), 0, 255);
      out[i + 3] = 255;
    }
  }
  return out;
}

async function build() {
  if (!fs.existsSync(SOURCE)) throw new Error(`${SOURCE} is missing.`);
  const img = await raw(SOURCE);
  const b = badgeBounds(img);
  const g = gradientOf(img, b);
  const mark = liftMark(img, b, g);

  const SIZE = 512;
  /*
    Scale so the mark's bounding CIRCLE clears the safe zone. The mark is much
    wider than it is tall, so sizing it by width alone would push its corners
    out past the mask.
  */
  const half = Math.hypot(mark.box.w, mark.box.h) / 2;
  const scale = (SAFE_RADIUS * MARGIN * SIZE) / half;
  const w = Math.max(1, Math.round(mark.box.w * scale));
  const h = Math.max(1, Math.round(mark.box.h * scale));

  const cropped = await sharp(mark.buffer, {
    raw: { width: mark.w, height: mark.h, channels: 4 },
  })
    .extract({ left: mark.box.x0, top: mark.box.y0, width: mark.box.w, height: mark.box.h })
    .resize(w, h, { fit: 'fill' })
    .png().toBuffer();

  const full = await sharp(ground(g, SIZE), {
    raw: { width: SIZE, height: SIZE, channels: 4 },
  })
    .composite([{
      input: cropped,
      left: Math.round((SIZE - w) / 2),
      top: Math.round((SIZE - h) / 2),
    }])
    .png().toBuffer();

  const written = [];
  for (const [name, size] of [
    ['icon-maskable-512.png', 512],
    ['icon-maskable-192.png', 192],
    /* iOS does not mask, it rounds — full bleed is right there too, and the
       old apple-touch-icon had the same dark border round a small badge. */
    ['apple-touch-icon.png', 180],
  ]) {
    const file = path.join(ICONS, name);
    await sharp(full).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
    written.push(`${name} (${size}px)`);
  }

  console.log(`badge ${b.w}x${b.h} at (${b.x0},${b.y0}); `
    + `mark ${mark.box.w}x${mark.box.h} placed at ${w}x${h} `
    + `(bounding circle ${(half * scale / SIZE * 2 * 100).toFixed(1)}% of the icon, `
    + `safe zone ${(SAFE_RADIUS * 200).toFixed(0)}%)`);
  console.log(`  wrote ${written.join(', ')}`);
}

build().catch((e) => { console.error(e.message); process.exit(1); });
