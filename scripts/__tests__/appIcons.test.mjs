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
 *
 * ## Both checks were once written against one palette
 *
 * They were: the edge had to be LIGHTER than luminance 120, and the mark was
 * found by being DARKER than the ground. Both were true of the silver badge
 * this replaced and neither is a property of a maskable icon — the app's own
 * mark is gold on a dark ground, which is the inverse of both, and it is
 * perfectly valid. A test that encodes the artwork it was written beside
 * fails the next piece of art rather than the next bug.
 *
 * Replacing them took two goes. "The edge is continuous with what is behind
 * it" sounded like the general form of the same rule and is not: a small badge
 * floating in a flat black field is perfectly continuous AT the edge, because
 * the field is flat — the step is in the middle, around the badge. Sabotaging
 * the icon that way passed, which is how the weakening was caught.
 *
 * The property that separates all three — the silver badge this replaced, the
 * gold mark that replaced it, and a badge deliberately floated on black — is
 * that **the artwork immediately around the mark is the artwork at the edge**.
 * A ground that reaches the edges satisfies it whatever colour it is; a mark
 * sitting on its own little field does not, because that field's colour is not
 * the edge's.
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
      Necessary but NOT sufficient, and the comment says so because the gap is
      where the weakened version of this test lived: a flat field is
      continuous at its edge, so this alone passes an icon whose artwork is a
      badge floating in the middle of one. The test below is what closes that.

      Checked against the pixels just INSIDE the edge rather than the opposite
      corner: the ground is a ramp, so corners legitimately differ and a test
      comparing them would only measure the gradient.
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
        expect(Math.abs(luminance(edge) - luminance(at(ix, iy))),
          `a step at ${x},${y}: the edge is not the same artwork as what is behind it`)
          .toBeLessThan(25);
      }
    }
  });

  it('has a ground that reaches the edges, not a mark on its own field', async () => {
    /*
      The one that catches the reported bug, and the reason the two above are
      not enough on their own.

      The mark is located by SATURATION. That is what tells a mark from a
      ground in both the artwork this replaced (a red cross on silver) and the
      artwork now (gold on near-neutral dark), and unlike brightness it does
      not assume which way the contrast runs. Then the ring of pixels just
      outside the mark is compared with the icon's edge: if the mark is
      sitting on its own little field, that ring is the field's colour and the
      edge is something else.

      Its limit, stated rather than discovered later: a mark with no colour at
      all — white on grey — would not be found this way, so the test fails
      loudly instead of passing quietly when it cannot locate one.
    */
    const { at, size } = await pixels(file);
    const saturation = (p) => Math.max(...p.slice(0, 3)) - Math.min(...p.slice(0, 3));

    let x0 = size, y0 = size, x1 = -1, y1 = -1;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (saturation(at(x, y)) <= 40) continue;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    expect(x1, 'no coloured mark could be found, so this check cannot run').toBeGreaterThan(-1);

    /* A few pixels clear of the mark's own antialiasing, and clamped so a
       mark near the edge does not read the edge as its own surroundings. */
    const pad = Math.round(size * 0.03);
    const ring = [];
    for (let x = Math.max(0, x0 - pad); x <= Math.min(size - 1, x1 + pad); x++) {
      if (y0 - pad >= 0) ring.push(at(x, y0 - pad));
      if (y1 + pad < size) ring.push(at(x, y1 + pad));
    }
    const edge = [at(0, 0), at(size - 1, 0), at(0, size - 1), at(size - 1, size - 1)];
    const mean = (rows) => [0, 1, 2].map((k) => rows.reduce((t, p) => t + p[k], 0) / rows.length);

    const around = mean(ring);
    const border = mean(edge);
    const apart = Math.max(...[0, 1, 2].map((k) => Math.abs(around[k] - border[k])));
    expect(apart,
      `the artwork around the mark (${around.map(Math.round)}) is not the artwork at the edge `
      + `(${border.map(Math.round)}): the mark is on its own field, and a launcher will mask to `
      + 'the field rather than to the icon')
      .toBeLessThan(60);
  });

  it('keeps the mark inside the circle the spec guarantees', async () => {
    const { at, size } = await pixels(file);
    const safe = size * 0.40;
    const c = (size - 1) / 2;

    let outside = 0;
    for (let y = 0; y < size; y++) {
      /*
        The ground on this row, read from the far left, where no mark reaches.
        Per row rather than once for the icon, so a ramp is not mistaken for
        the thing it sits behind.
      */
      const ground = at(2, y);
      for (let x = 0; x < size; x++) {
        const p = at(x, y);
        /* Either direction, and saturation as well as brightness: the mark
           this was written for was dark on light, the mark now is light on
           dark, and a neutral one would be caught by neither on its own. */
        const contrast = Math.abs(luminance(p) - luminance(ground));
        const saturation = Math.max(...p.slice(0, 3)) - Math.min(...p.slice(0, 3));
        if ((contrast > 70 || saturation > 60) && Math.hypot(x - c, y - c) > safe) outside++;
      }
    }
    expect(outside, `${outside} mark pixels fall outside the 80% safe circle`).toBe(0);
  });
});
