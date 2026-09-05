/**
 * The home-screen icons are full bleed, and the mark clears the safe zone.
 *
 * The app's owner sent a screenshot of his launcher with TrenchLine as the
 * only square tile in a grid of circles. The manifest was right — it declared
 * `purpose: "maskable"` — and the ARTWORK was wrong: a small silver badge
 * floating on a near-black ground, which a circular mask turns into a dark
 * disc with a little square in the middle of it.
 *
 * Two properties make that impossible to reintroduce, and neither of them is
 * "the file has not changed":
 *
 *  1. The corners are artwork, not a border. A maskable icon is cropped by
 *     the launcher to a shape nobody here chooses, so any pixel the author
 *     treats as margin is a pixel the launcher may treat as the icon.
 *  2. Nothing that reads as the mark lies outside the guaranteed safe circle
 *     (80% of the icon's width). A mark that merely fits the safe SQUARE
 *     still loses its corners to a circular mask.
 */
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';

const MASKABLE = ['public/icons/icon-maskable-512.png', 'public/icons/icon-maskable-192.png'];

async function pixels(file) {
  const { data, info } = await sharp(file).ensureAlpha()
    .raw().toBuffer({ resolveWithObject: true });
  const at = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  return { at, size: info.width, height: info.height };
}

const luminance = ([r, g, b]) => (r + g + b) / 3;

describe.each(MASKABLE)('%s', (file) => {
  it('is square, and bleeds artwork to every edge', async () => {
    const { at, size, height } = await pixels(file);
    expect(size).toBe(height);

    /*
      Checked against the pixels just INSIDE the edge, not against the
      opposite corner: the artwork is a diagonal silver ramp running 189 to
      254, so a corner legitimately differs from the far corner by 65 counts
      and a test that compared them would only be measuring the gradient.

      A border shows up as two things a gradient never does — an edge that is
      dark, and a step between the edge and the pixels behind it. The old
      artwork had both: a ground at luminance 13 meeting a badge at 214.
    */
    const inset = Math.round(size * 0.08);
    for (let i = 0; i < size; i++) {
      for (const [x, y, ix, iy] of [
        [i, 0, i, inset],                          // top
        [i, size - 1, i, size - 1 - inset],        // bottom
        [0, i, inset, i],                          // left
        [size - 1, i, size - 1 - inset, i],        // right
      ]) {
        const edge = at(x, y);
        expect(edge[3], `edge pixel ${x},${y} is transparent`).toBe(255);
        expect(luminance(edge), `edge pixel ${x},${y} is a dark border`)
          .toBeGreaterThan(120);
        expect(Math.abs(luminance(edge) - luminance(at(ix, iy))),
          `a step at ${x},${y}: the edge is not the same artwork as what is behind it`)
          .toBeLessThan(25);
      }
    }
  });

  it('keeps the mark inside the circle the spec guarantees', async () => {
    const { at, size } = await pixels(file);
    const ground = luminance(at(2, size - 3));
    const safe = size * 0.40;
    const c = (size - 1) / 2;

    let outside = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        /* The mark is black letters and a red cross: far darker, or far more
           saturated, than the silver ground it sits on. */
        const p = at(x, y);
        const isMark = luminance(p) < ground - 70
          || Math.max(...p.slice(0, 3)) - Math.min(...p.slice(0, 3)) > 60;
        if (isMark && Math.hypot(x - c, y - c) > safe) outside++;
      }
    }
    expect(outside, `${outside} mark pixels fall outside the 80% safe circle`).toBe(0);
  });
});
