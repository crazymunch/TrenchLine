/**
 * The home-screen icons survive being cropped to a shape nobody here chooses.
 *
 * The app's owner sent a screenshot of his launcher with TrenchLine as the only
 * square tile in a grid of circles. The manifest was right — it declared
 * `purpose: "maskable"` — and the ARTWORK was wrong: a small silver badge
 * floating on a near-black ground, which a circular mask turns into a dark disc
 * with a little square in the middle of it.
 *
 * ## These checks have been wrong twice, in opposite directions
 *
 * First they encoded a palette: the edge had to be LIGHTER than luminance 120,
 * and the mark was found by being DARKER than the ground. Both were true of the
 * silver badge they were written beside and neither is a property of a maskable
 * icon.
 *
 * Then they encoded a COMPOSITION: a small mark centred on a ground that runs
 * edge to edge. That is one good way to draw an icon and not the only one. The
 * artwork now is the other way — a disc that fills the frame, with its own rim
 * at 95% of the half-width — and all three checks rejected it. A rim outside
 * the safe circle is not a mark being clipped; it is a rim, and being shaved by
 * an aggressive mask is what a rim is for.
 *
 * So what is asserted here is neither colour nor composition. It is the two
 * things that actually decide whether a mask ruins the icon:
 *
 *  1. **Every pixel is artwork.** A maskable icon is cropped to a shape the
 *     launcher picks, so anything the author treats as margin is something the
 *     launcher may treat as the icon.
 *  2. **Any hard boundary in the artwork lies OUTSIDE the safe circle.** This
 *     is the badge bug stated exactly. A mark on a ground that runs to the edge
 *     has no such boundary and passes. A disc that fills the frame has one, at
 *     the frame, and passes. A badge floating in a field has one partway in,
 *     and the mask cuts the field rather than the icon — which is the failure.
 *  3. **Nothing inside that boundary reaches past the safe circle**, so the
 *     lettering is not clipped. `T✝C` came out as `✝` this way.
 */
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';

const MASKABLE = ['public/icons/icon-maskable-512.png', 'public/icons/icon-maskable-192.png'];

/**
 * The circle the maskable spec guarantees: 80% of the WIDTH, so 0.40 × width.
 *
 * Everything below works in pixels. An earlier version mixed fractions of the
 * width with fractions of the half-width and compared 0.94 against 0.40 as
 * though they were the same unit; both readings were plausible and the test
 * silently measured nothing. Radii are px, and the conversion happens once.
 */
const safeRadius = (size) => size * 0.40;

/**
 * How far past the safe circle content may sit before it counts as clipped.
 *
 * The lettering in this artwork is drawn to 204.0px of a 204.8px safe radius —
 * 0.8px of margin, deliberately. At 192 that margin is 0.3px, which is smaller
 * than the difference between two rasterisations of the same geometry. The
 * tolerance is for the renderer, not for the design.
 */
const RASTER_SLACK = 1.015;

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
const apart = (a, b) => Math.max(...[0, 1, 2].map((k) => Math.abs(a[k] - b[k])));

/** Mean luminance at each radius, from the centre out to the frame edge. */
function radialProfile({ at, size }, bins = 64) {
  const c = (size - 1) / 2;
  const sum = new Array(bins).fill(0);
  const count = new Array(bins).fill(0);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const bin = Math.floor((Math.hypot(x - c, y - c) / (size / 2)) * bins);
      if (bin >= bins) continue;
      sum[bin] += luminance(at(x, y));
      count[bin] += 1;
    }
  }
  return sum.map((s, i) => (count[i] ? s / count[i] : 0));
}

/**
 * Where the artwork stops, in pixels of radius.
 *
 * The OUTERMOST step in the radial profile, not the largest. The largest, in
 * this artwork, is the red dot at the very centre against the white rhombus
 * behind it — interior detail beats the disc's own edge comfortably, so a
 * "biggest jump" reading finds the middle of the icon and calls it the border.
 *
 * A badge on a ground has its step partway in; a disc filling the frame has one
 * at the frame; a mark on a ground that runs to the edge has none outside its
 * own mark. Returns the inner side of the step, so a rim drawn ON the boundary
 * falls outside it and counts as edge treatment rather than as clipped content.
 */
function outermostEdge(profile, size, jump = 40) {
  const binWidth = (size / 2) / profile.length;
  for (let i = profile.length - 1; i > 0; i--) {
    if (Math.abs(profile[i] - profile[i - 1]) > jump) return (i - 1) * binWidth;
  }
  return null;
}

describe.each(MASKABLE)('%s', (file) => {
  it('is square, and every pixel is artwork', async () => {
    const { at, size, height } = await pixels(file);
    expect(size).toBe(height);
    for (let i = 0; i < size; i++) {
      for (const [x, y] of [[i, 0], [i, size - 1], [0, i], [size - 1, i]]) {
        expect(at(x, y)[3], `edge pixel ${x},${y} is transparent`).toBe(255);
      }
    }
  });

  it('has no hard boundary inside the circle the spec guarantees', async () => {
    /*
      The badge bug, stated exactly. The old artwork's field ended around
      halfway out, so a circular mask cut the black surround and showed a small
      light square inside a dark disc. Wherever the artwork changes field, that
      change has to happen at or beyond the safe circle — otherwise the mask
      crops the surround instead of the icon.
    */
    const px = await pixels(file);
    const edge = outermostEdge(radialProfile(px), px.size);
    if (edge === null) return; // a ground that runs to the edge: nothing to cut
    expect(edge,
      `the artwork stops at ${edge.toFixed(0)}px, inside the ${safeRadius(px.size).toFixed(0)}px `
      + 'safe radius: a mask will crop the surround rather than the icon')
      .toBeGreaterThanOrEqual(safeRadius(px.size));
  });

  it('lets a rim run past the safe circle, but not the lettering', async () => {
    /*
      Content outside the safe circle is only a problem if it is CONTENT.

      A rim is drawn at the edge on purpose and appears at every angle; an
      aggressive mask shaving it costs nothing, which is what a rim is for. A
      wordmark that overflows appears at a few angles only, and the mask takes
      a bite out of it — `T✝C` came out as `✝` this way.

      So the test is angular coverage, which needs no boundary detection at all.
      Trying to find one is what the previous two versions of this got wrong:
      the largest step in the radial profile is the red dot at the centre, and
      the outermost step is the rim's OUTER edge, which still leaves the rim's
      own 12px stroke counting as content.

      Either nothing is out there, or it goes all the way round. Anything in
      between is a piece of the icon about to be cut off.
    */
    const { at, size } = await pixels(file);
    const c = (size - 1) / 2;
    const safe = safeRadius(size);
    /* The corners are the one place guaranteed to be outside every mask, so
       whatever colour they are is what "nothing is here" looks like. */
    const corner = [at(0, 0), at(size - 1, 0), at(0, size - 1), at(size - 1, size - 1)];
    const nothing = [0, 1, 2].map((k) => corner.reduce((t, p) => t + p[k], 0) / 4);

    const BINS = 120;
    const covered = new Array(BINS).fill(false);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const r = Math.hypot(x - c, y - c);
        if (r <= safe * RASTER_SLACK || r > size / 2) continue;
        if (apart(at(x, y), nothing) <= 60) continue;
        covered[Math.floor(((Math.atan2(y - c, x - c) + Math.PI) / (2 * Math.PI)) * BINS) % BINS] = true;
      }
    }

    const angles = covered.filter(Boolean).length / BINS;
    const verdict = angles < 0.05 || angles > 0.90;
    expect(verdict,
      `artwork past the safe circle covers ${(angles * 100).toFixed(0)}% of the angles. `
      + 'A rim covers them all and may be shaved; anything less is content the mask will clip')
      .toBe(true);
  });
});
