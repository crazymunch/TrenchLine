/**
 * The Keyword Glossary, from the digital rulebook.
 *
 * Keywords are rules text, and the app carried 46 of them hand-written. They
 * are the most quietly load-bearing text in the game: `IGNORE ARMOUR`,
 * `AUTOMATIC (X)` and `+/- INJURY DICE` decide how an attack resolves, and the
 * Codex glossary is where a player looks mid-game when a card shows one they do
 * not know. A paraphrase there is worse than no entry, because it is trusted.
 *
 * The glossary is regular: every entry is
 *
 *     NAME (Tag): one or more wrapped lines of rules text
 *     NAME (Effect): …
 *
 * with the type in brackets before the colon, and the name in capitals. The
 * book distinguishes the two and the distinction is a rule — "a Keyword that
 * confers an Effect also acts as a Tag" — so it is carried through rather than
 * flattened into one list.
 */
import fs from 'node:fs';

export const RULEBOOK_TXT =
  'data-sources/rulebook/extracted/trench-crusade-digital-rulebook.txt';

/** The running header stamped on every page of the chapter. */
const PAGE_HEADER = /^\d+\t+Keyword-\t/;
const PAGE_BREAK = /^-- \d+ of \d+ --$/;

/** The chapter-navigation strip printed down the edge of every page. */
const SIDEBAR = new Set([
  'Introduction', 'The World', 'in Flames', 'Core Rules', 'Comprehensive',
  'Rules', 'Keywords', 'Terrain', 'Battlekit', 'Campaign', 'Scenarios',
]);

/**
 * `NAME (Tag): text` — the name is non-greedy so `AMMUNITION (KEYWORD)
 * (Effect):` keeps its own bracket and takes the *second* one as the type.
 */
const ENTRY = /^(.+?)\s*\((Tag|Effect)\):\s*(.*)$/;

/**
 * The name is set in capitals. Checked rather than assumed: without it a line
 * of body prose containing "(Effect):" would open a new entry and swallow the
 * rest of the real one.
 */
const isGlossaryName = (s) => !/[a-z]/.test(s) && /[A-Z]/.test(s);

/**
 * Every keyword the glossary defines.
 *
 * Returns `[{ name, type, description }]` in publication order, where `type` is
 * `'Tag'` or `'Effect'` exactly as the book prints it.
 */
export function parseKeywords(src = RULEBOOK_TXT) {
  const all = fs.readFileSync(src, 'utf8').split('\n');

  const headers = [];
  all.forEach((l, i) => { if (PAGE_HEADER.test(l)) headers.push(i); });
  if (!headers.length) {
    throw new Error(
      `parse-keywords: no Keyword chapter pages in ${src}. The glossary is the ` +
      'only source for what IGNORE ARMOUR or AUTOMATIC (X) actually do; the ' +
      'app cannot fall back to a hand-written copy, because a paraphrased ' +
      'keyword is trusted exactly when a player is least able to check it.');
  }

  let end = all.length;
  for (let i = headers[headers.length - 1] + 1; i < all.length; i++) {
    if (PAGE_BREAK.test(all[i])) { end = i; break; }
  }

  const lines = [];
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
    for (const l of page) if (l.trim() !== '') lines.push(l);
  }

  const entries = [];
  for (const raw of lines) {
    const line = raw.trim();
    const m = ENTRY.exec(line);
    if (m && isGlossaryName(m[1])) {
      entries.push({ name: m[1].trim(), type: m[2], description: m[3].trim() });
      continue;
    }
    // Anything before the first entry is the chapter's own introduction.
    if (entries.length) {
      const e = entries[entries.length - 1];
      e.description = `${e.description} ${line}`.replace(/\s+/g, ' ').trim();
    }
  }

  if (entries.length < 40) {
    throw new Error(
      `parse-keywords: read the glossary but found only ${entries.length} ` +
      'keywords. The book defines far more than that, so the entry pattern ' +
      'has changed shape. Failing rather than shipping a glossary with holes ' +
      'in it, which reads as "this keyword has no rules".');
  }

  return entries;
}
