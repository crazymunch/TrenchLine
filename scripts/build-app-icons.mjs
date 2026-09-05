/**
 * The home-screen icons, the browser-tab favicon and the in-app masthead, all
 * from one file: `public/brand/icon.svg`.
 *
 * ## This script used to do far more, and should not
 *
 * It once read the Trench Crusade badge, fitted a bilinear gradient to it,
 * keyed the mark off that gradient by colour distance, un-premultiplied the
 * result, and re-composited it at a size whose bounding circle cleared the
 * maskable safe zone. Every one of those steps existed to rescue a raster
 * somebody else had drawn and which was never composed to be an app icon.
 *
 * The source is now vector, ours, and drawn FOR the frame — the disc reaches
 * 95.5% of the half-width and the lettering stops 0.8px inside the safe
 * circle. So there is nothing to measure and nothing to fit: rendering it is
 * the whole job. Sizing artwork that is already the right size can only make
 * it wrong.
 *
 * What guards the properties the fitting used to enforce is
 * `scripts/__tests__/appIcons.test.mjs`, which checks the rendered icons
 * rather than trusting the renderer. That is the better place for it: a check
 * that runs against the output catches a bad SOURCE too.
 *
 * ## Two variants, and the reason each exists
 *
 *   full bleed     the home-screen icons. A maskable icon is cropped to a
 *                  shape nobody here chooses, so every pixel must be artwork —
 *                  anything the author treats as margin is something the
 *                  launcher may treat as the icon.
 *   transparent    the browser tab and the in-app masthead. The artwork is a
 *                  disc; on a tab strip or inside dark chrome, a dark square
 *                  around it draws a box around nothing.
 *
 * The transparent variant is the same file with its background rect removed,
 * so the two can never drift apart.
 *
 *   node scripts/build-app-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SOURCE = 'public/brand/icon.svg';
const ICONS = 'public/icons';

/**
 * The background rect, by id.
 *
 * Removed rather than made transparent: `fill="none"` on a rect that carries
 * the canvas would still be laid out, and some renderers keep its bounds. And
 * matched on the id rather than on the colour or on "the first rect", so that
 * re-colouring the background — or adding another rect to the artwork — does
 * not silently produce icons with a hole in them.
 */
const CANVAS = /\s*<rect\s+id="canvas"[^>]*\/>/;

/** Full bleed and cut-out, from one source. */
function variants() {
  const svg = fs.readFileSync(SOURCE, 'utf8');
  if (!CANVAS.test(svg)) {
    throw new Error(
      `${SOURCE} has no <rect id="canvas">. The transparent favicon and masthead `
      + 'are made by removing it, and an icon silently shipped with its dark '
      + 'canvas into a dark navbar is the bug this exists to prevent.');
  }
  return { full: Buffer.from(svg), cut: Buffer.from(svg.replace(CANVAS, '')) };
}

async function build() {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`${SOURCE} is missing. Every icon is derived from it; there is no fallback artwork.`);
  }
  const { full, cut } = variants();
  fs.mkdirSync(ICONS, { recursive: true });

  const render = (svg, size, file) =>
    sharp(svg).resize(size, size).png().toFile(file);

  /*
    The same full-bleed art for `any` and `maskable` alike. A separate padded
    version for `any` would be a second thing to keep in step, and a launcher
    that does not mask simply shows the square the artwork already is.
  */
  const bleed = [
    ['icon-512.png', 512], ['icon-192.png', 192],
    ['icon-maskable-512.png', 512], ['icon-maskable-192.png', 192],
    /* iOS applies its own rounded rect and composites transparency onto black,
       so the full-bleed square is both what it wants and what it would get. */
    ['apple-touch-icon.png', 180],
  ];
  for (const [name, size] of bleed) await render(full, size, path.join(ICONS, name));

  /* The browser tab, at the two sizes browsers actually ask for. */
  const tab = [['favicon-32.png', 32], ['favicon-16.png', 16]];
  for (const [name, size] of tab) await render(cut, size, path.join(ICONS, name));

  /* The masthead, on the app's own chrome. */
  const logo = await sharp(cut).resize(500, 500).png().toBuffer();
  await sharp(logo).png().toFile('public/logo.png');
  await sharp(logo).webp({ lossless: true }).toFile('public/logo.webp');

  console.log(`icons from ${SOURCE}`);
  for (const [name] of [...bleed, ...tab]) console.log(`  ${path.join(ICONS, name)}`);
  console.log('  public/logo.png\n  public/logo.webp');
}

build().catch((e) => { console.error(e.message); process.exit(1); });
