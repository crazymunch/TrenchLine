/**
 * The twelve scenarios, from the digital rulebook.
 *
 * The app carried these hand-written, and they were not transcribed — they were
 * invented around a scaffold of real terminology, which is the hardest kind of
 * wrong data to spot. Measured against the book:
 *
 *   - **Every game length is wrong.** The app says five or six Turns for all
 *     twelve. Claim No Man's Land lasts *four*.
 *   - **The deployment rules are inverted.** The app says Infiltrators in
 *     Claim No Man's Land "can deploy normally or by using their special
 *     deployment rules"; the book says they "must deploy normally (they cannot
 *     use their special deployment rules)".
 *   - **32 of the 46 Glorious Deeds do not exist.** Iron Resolve, Overwhelming
 *     Force, Warlord Triumphant and 29 others appear nowhere in the rulebook or
 *     in All Out War. The real deeds for scenario I are Bloodletting, Cast Them
 *     Down, Hold Your Ground and Lord of War.
 *
 * A player following the app's scenario plays a different game from the one
 * their opponent is playing out of the book. So this reads the chapter.
 *
 * The chapter is regular: a title line `I º Claim No Man's Land`, a tagline,
 * then ALL-CAPS section headings — FORCES, THE BATTLEFIELD, DEPLOYMENT, GAME
 * LENGTH, VICTORY CONDITIONS, GLORIOUS DEEDS — with Title-Case sub-headings and
 * `**` bullets under them. Scenario-specific sections (THE DRAGON, TRAIN
 * WAGONS, ARTILLERY SHELLS MARKERS) are kept as sections of their own rather
 * than dropped, because they are the rules that make that scenario itself.
 */
import fs from 'node:fs';
import { toLines } from './lines.mjs';

export const RULEBOOK_TXT =
  'data-sources/rulebook/extracted/trench-crusade-digital-rulebook.txt';

const PAGE_HEADER = /^\d+\t+Scenarios-Trench Crusade/;
const PAGE_BREAK = /^-- \d+ of \d+ --$/;

/** `I º Claim No Man's Land`, `VIIIº From Below` — the spacing varies. */
const TITLE = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\s*º\s*(.+)$/;

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/** The six sections every scenario has, in the order the book prints them. */
export const CORE_SECTIONS = [
  'FORCES', 'THE BATTLEFIELD', 'DEPLOYMENT', 'GAME LENGTH',
  'VICTORY CONDITIONS', 'GLORIOUS DEEDS',
];

/** An ALL-CAPS line opening a section. */
const SECTION = /^[A-Z][A-Z '’,&()-]{3,40}$/;

/**
 * Labels printed *on the deployment map*, which extract as bare lines in the
 * middle of a scenario.
 *
 * `DEFEMDER` is not a typo here — it is a typo in the book's own map for
 * Don't Breathe, and matching what is printed is the only way to drop it.
 */
const MAP_LABEL = new Set([
  'MIDPOINT', 'DEPLOYMENT ZONE', 'ATTACKER', 'DEFENDER', 'DEFEMDER',
]);
/** A bare dimension printed against a map arrow: `6”`, `24’’`, `12"`. */
const MAP_DIMENSION = /^\d+\s*(?:["”'’]{1,2})\s*$/;

/** The chapter-navigation strip, plus this chapter's roman-numeral tabs. */
const SIDEBAR = new Set([
  'Introduction', 'The World', 'in Flames', 'Core Rules', 'Comprehensive',
  'Rules', 'Keywords', 'Terrain', 'Battlekit', 'Campaign', 'Scenarios',
  'Scenario Format', ...ROMAN,
]);

const BULLET = /^\*\*\s*/;

/** Strip page furniture and map labels, keeping the chapter's prose in order. */
function chapterLines(src) {
  const all = toLines(fs.readFileSync(src, 'utf8'));

  const headers = [];
  all.forEach((l, i) => { if (PAGE_HEADER.test(l)) headers.push(i); });
  if (!headers.length) {
    throw new Error(
      `parse-scenarios: no Scenarios chapter pages in ${src}. Twelve scenarios ` +
      'cannot be derived without it, and the hand-written set they replace had ' +
      'the wrong game length for all twelve.');
  }

  let end = all.length;
  for (let i = headers[headers.length - 1] + 1; i < all.length; i++) {
    if (PAGE_BREAK.test(all[i])) { end = i; break; }
  }

  const out = [];
  for (const start of headers) {
    let pageEnd = end;
    for (let i = start + 1; i <= end; i++) {
      if (PAGE_BREAK.test(all[i])) { pageEnd = i; break; }
    }
    const page = all.slice(start + 1, pageEnd);
    while (page.length) {
      const last = page[page.length - 1].trim();
      if (last !== '' && !SIDEBAR.has(last)) break;
      page.pop();
    }
    for (const raw of page) {
      const l = raw.trim();
      if (l === '' || MAP_LABEL.has(l) || MAP_DIMENSION.test(l)) continue;
      out.push(l);
    }
  }
  return out;
}

/**
 * Join wrapped lines into paragraphs, keeping `**` bullets as their own.
 *
 * A sub-heading — a short Title-Case line that does not finish a sentence, like
 * `Objective Markers` or `Controlling Objectives` — is kept as its own
 * paragraph and marked, because it governs the paragraphs under it.
 */
function paragraphs(lines) {
  const out = [];
  const endsSentence = (l) => /[.!?:]["'”’)]?$/.test(l);
  const isSubHeading = (l) => l.length <= 45 && !endsSentence(l) && /^[A-Z]/.test(l)
                              && !BULLET.test(l);

  for (const line of lines) {
    if (BULLET.test(line)) { out.push({ bullet: true, text: line.replace(BULLET, '') }); continue; }
    const last = out[out.length - 1];
    // A sub-heading only opens a new paragraph where the previous one is
    // finished; otherwise it is just a short line in the middle of one. A
    // heading is closed as soon as it is pushed — the line under it is the
    // body it introduces, not a continuation of the heading itself.
    const open = last && !last.bullet && !last.heading;
    if (!open || (endsSentence(last.text) && isSubHeading(line))) {
      out.push({ heading: isSubHeading(line), text: line });
      continue;
    }
    last.text = `${last.text} ${line}`.replace(/\s+/g, ' ');
  }
  return out;
}

/** Render a section's paragraphs as the markdown the app already displays. */
function toMarkdown(parts) {
  return parts.map((p) => {
    if (p.bullet) return `- ${p.text}`;
    if (p.heading) return `**${p.text}**`;
    return p.text;
  }).join('\n\n').trim();
}

/**
 * `Claim No Man's Land` -> `claim-no-mans-land`.
 *
 * Apostrophes are dropped rather than turned into separators, because that is
 * how the map files in `public/maps/` are already named — and the build checks
 * the derived slug against them rather than trusting this.
 */
export const slugify = (name) => name
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/['’]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * The twelve scenarios.
 *
 * Returns `[{ number, roman, name, slug, tagline, sections }]`, where
 * `sections` is an ordered list of `{ heading, body }` — the six core sections
 * plus whatever scenario-specific ones the book adds, in printed order.
 */
export function parseScenarios(src = RULEBOOK_TXT) {
  const lines = chapterLines(src);

  const starts = [];
  lines.forEach((l, i) => { const m = TITLE.exec(l); if (m) starts.push({ i, roman: m[1], name: m[2].trim() }); });

  const scenarios = [];
  for (let k = 0; k < starts.length; k++) {
    const { i, roman, name } = starts[k];
    const body = lines.slice(i + 1, k + 1 < starts.length ? starts[k + 1].i : lines.length);

    // The tagline is everything before the first section heading.
    const firstSection = body.findIndex((l) => SECTION.test(l));
    const tagline = (firstSection > 0 ? body.slice(0, firstSection) : [])
      .join(' ').replace(/\s+/g, ' ').trim();

    const sections = {};
    let current = null;
    let buffer = [];
    const flush = () => { if (current) sections[current] = toMarkdown(paragraphs(buffer)); };
    for (const line of body.slice(firstSection < 0 ? body.length : firstSection)) {
      if (SECTION.test(line)) { flush(); current = line; buffer = []; continue; }
      buffer.push(line);
    }
    flush();

    scenarios.push({
      number: ROMAN.indexOf(roman) + 1,
      roman,
      name,
      slug: slugify(name),
      tagline,
      sections: Object.entries(sections).map(([heading, body]) => ({ heading, body })),
    });
  }

  if (scenarios.length !== 12) {
    throw new Error(
      `parse-scenarios: found ${scenarios.length} scenarios, expected 12. The ` +
      'chapter is the only source for how each one is played, and a missing ' +
      'scenario is worse than an obviously absent one — the app would show ' +
      'eleven and look complete.');
  }

  const has = (s, h) => s.sections.some((x) => x.heading === h && x.body);
  const incomplete = scenarios.filter(
    (s) => CORE_SECTIONS.some((h) => !has(s, h)));
  if (incomplete.length) {
    throw new Error(
      'parse-scenarios: these scenarios are missing a core section — ' +
      incomplete.map((s) => `${s.roman} ${s.name} (${
        CORE_SECTIONS.filter((h) => !has(s, h)).join(', ')})`).join('; ') +
      '. A scenario without its GAME LENGTH or GLORIOUS DEEDS is one a player ' +
      'cannot actually play, and the hand-written set got exactly those two wrong.');
  }

  return scenarios;
}
