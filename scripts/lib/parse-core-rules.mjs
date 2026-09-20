/**
 * Extract the rulebook's Core Rules and Comprehensive Rules chapters.
 *
 * The Codex used to ship `src/data/officialCoreRules.ts` — eight chapters of
 * hand-written prose, and it was wrong in the ways hand-written game data is
 * always wrong. It said Initiative was "both players roll a D6, highest wins"
 * when the book gives it to the player with the FEWEST models and only rolls
 * on a tie; it put the Success table's failure band at 1-6 when 1 is not a
 * result on 2D6; and it read Morale off "50% of starting models" rather than
 * the book's "half the models in your Warband, rounded up".
 *
 * So the prose comes out of the book instead, the same way the keyword
 * glossary and the scenarios already do.
 *
 * The extraction is structural, not fuzzy:
 *
 *   1. The table of contents lists every section in order, with its printed
 *      page. Chapter headings are rendered in small caps and survive the
 *      extraction in a distinctive mixed case ("comprehensIve rules"); every
 *      other entry is Title Case.
 *   2. Section headings appear in the body as standalone lines. Matching them
 *      IN TOC ORDER is what makes that reliable — "Combat" appears dozens of
 *      times in running text, but only once as the next heading due.
 *   3. Everything between two headings is that section's content.
 *
 * A heading the walk cannot find is reported, never guessed at.
 */
import fs from 'node:fs';
import { toLines } from './lines.mjs';

const SRC = 'data-sources/rulebook/extracted/trench-crusade-digital-rulebook.txt';

/** `core rules \t14` — the chapter rows, in the book's own small-caps case. */
const TOC_ROW = /^(.+?)\s*\t(\d{1,3})$/;

/*
  Page furniture, repeated on most spreads and never part of a rule.

  The sidebar is the chapter list printed down the edge of every page; it
  extracts as a run of single words in the middle of the prose, which would
  otherwise be spliced into whatever section was being read.
*/
const PAGE_MARK = /^--\s*\d+\s+of\s+\d+\s*--$/;
const RUNNING_HEAD = /^(\d{1,3}\s*\t)?(Trench Crusade|Core Rules|Comprehensive Rules)\b.*(\t\d{1,3})?$/;
const SIDEBAR = new Set([
  'Introduction', 'The World', 'in Flames', 'Core', 'Rules', 'Comprehensive',
  'Keywords', 'Terrain', 'Battlekit', 'Campaign', 'Scenarios',
  'Initiative Phase', 'Activation Phase', 'Morale Phase',
]);

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The first section of the chapter that follows, which bounds the last one. */
const NEXT_CHAPTER = 'Keyword Benefits';

/*
  The tab strip printed down the outside of every Comprehensive Rules spread.
  It extracts as one run-on line of section names in whatever order the page
  happened to put them, sometimes prefixed by an artist's initials.
*/
const TABS = ['Core Concepts', 'Other Rules Principles', 'Other Rules',
  'Principles', 'Game Turns', '1. Initiative', '2. Activation', 'Movement',
  'Combat', '3. Morale', 'Winning', 'What You Need To Play'];
const isTabFragment = (line) => {
  let rest = line.replace(/^[A-Z]{2}\s+/, '');       // artist initials
  for (const t of TABS) rest = rest.split(t).join('');
  return rest.trim() === '';
};

/*
  Some spreads set the strip on one line, others break it across several. A
  single 'Combat' is a real heading; three tab names in a row are the strip.
  Judge by the run, not by the line.
*/
function withoutTabStrip(lines) {
  const tab = lines.map(isTabFragment);
  return lines.filter((line, i) => {
    if (/^[A-Z]{2}$/.test(line)) return false;       // an artist's initials
    if (!tab[i]) return true;
    if (line.length > 12) return false;              // the whole strip, inline
    let run = 1;
    for (let j = i - 1; j >= 0 && tab[j]; j--) run++;
    for (let j = i + 1; j < lines.length && tab[j]; j++) run++;
    return run < 3;
  });
}

/** The book bullets with `**`; the Codex renders Markdown. */
function toMarkdown(lines) {
  const out = [];
  // 'e.g.' and 'etc.' end in a full stop without ending the sentence, which
  // split the Injury table's Battlekit row across two paragraphs.
  const ends = (s) => /[.:!?”"’]$/.test(s) && !/\b(e\.g|i\.e|etc|vs)\.$/.test(s);

  for (const raw of withoutTabStrip(lines.map((l) => l.replace(/\s+$/, '')))) {
    const line = raw;
    if (!line) continue;

    if (line.startsWith('** ')) { out.push(`- ${line.slice(3)}`); continue; }

    // A tab-delimited row — the Success Roll and Injury tables.
    if (line.includes('\t')) {
      out.push(`- ${line.split('\t').map((c) => c.trim()).filter(Boolean).join(' — ')}`);
      continue;
    }

    const prev = out[out.length - 1];

    /*
      A sub-heading. The book sets these smaller than a contents entry, so they
      have no TOC row to find them by; they extract as a short unpunctuated
      line between two finished paragraphs. Without this they were swallowed
      into the sentence below — "Risky Success Rolls Sometimes you will be
      called on to take a Risky Success Roll".
    */
    if (line.length <= 60 && !ends(line) && /^[A-Z“]/.test(line)
        && (!prev || ends(prev) || prev.startsWith('**'))) {
      out.push(`**${line}**`);
      continue;
    }

    // Otherwise a continuation: the extractor hard wraps, so a line that does
    // not start a new block belongs to the one above it.
    if (prev && !ends(prev) && !prev.startsWith('**') && !line.startsWith('- ')) {
      out[out.length - 1] = `${prev} ${line}`;
      continue;
    }
    out.push(line);
  }
  return out.join('\n\n').replace(/\n\n(- )/g, '\n$1');
}

export function parseCoreRules(file = SRC) {
  if (!fs.existsSync(file)) {
    throw new Error(`${file} not found. Run: npm run rules:pdfs && npm run rules:extract`);
  }
  const lines = toLines(fs.readFileSync(file, 'utf8'));

  /* ---- 1. the table of contents ---- */
  const toc = [];
  let chapter = null;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(TOC_ROW);
    if (!m) continue;
    const [, title, page] = m;
    // The TOC spans a page break, so its own running header ("Trench Crusade
    // 5") sits in the middle of the list and matches the row shape exactly.
    if (RUNNING_HEAD.test(lines[i])) continue;
    // The TOC runs from 'core rules' to the chapter after Comprehensive Rules.
    if (/^core\s+rules$/i.test(title) && !chapter) { chapter = 'Core Rules'; continue; }
    if (!chapter) continue;
    if (/^comprehens/i.test(title)) { chapter = 'Comprehensive Rules'; continue; }
    // 'Keywords' is also a Comprehensive Rules subsection; only the chapter
    // row ends the range.
    if (/^keywords glossary$/i.test(title)) break;
    toc.push({ title: title.trim(), page: Number(page), chapter, tocLine: i + 1 });
  }
  if (!toc.length) throw new Error('parse-core-rules: the table of contents did not parse');

  /* ---- 2. the body, with the furniture removed ---- */
  const bodyStart = toc[toc.length - 1].tocLine;
  const body = [];
  for (let i = bodyStart; i < lines.length; i++) {
    const line = lines[i].replace(/\s+$/, '');
    if (!line) continue;
    if (PAGE_MARK.test(line)) continue;
    if (RUNNING_HEAD.test(line)) continue;
    if (SIDEBAR.has(line)) continue;
    body.push({ text: line, line: i + 1 });
  }

  /* ---- 3. walk the headings in order ---- */
  const chapters = [], missing = [];
  let at = 0, open = null;
  for (const entry of toc) {
    const want = norm(entry.title);
    let hit = -1;
    for (let i = at; i < body.length; i++) {
      if (norm(body[i].text) === want) { hit = i; break; }
    }
    if (hit === -1) { missing.push(entry.title); continue; }
    if (open) open.end = hit;
    open = { ...entry, start: hit + 1, bodyLine: body[hit].line };
    chapters.push(open);
    at = hit + 1;
  }
  /*
    The last section otherwise runs to the end of the file. It ends where the
    next chapter begins — found by its first section, since the chapter title
    itself is set in small caps and does not survive extraction intact.
  */
  if (open) {
    const next = body.findIndex((b, i) => i > open.start && norm(b.text) === norm(NEXT_CHAPTER));
    open.end = next === -1 ? body.length : next;
    if (next === -1) missing.push(`(end of ${NEXT_CHAPTER})`);
  }

  return {
    missing,
    // A group head with no prose of its own — 'What You Need To Play' sits
    // directly above 'Players'. Real in the book's contents, nothing to read.
    chapters: chapters.filter((c) => body.slice(c.start, c.end).length).map((c) => ({
      id: c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      title: c.title,
      category: c.chapter,
      page: c.page,
      content: toMarkdown(body.slice(c.start, c.end).map((b) => b.text)),
      source: {
        file: 'rulebook:trench-crusade-digital-rulebook',
        page: c.page,
        lines: [c.bodyLine, body[c.end - 1]?.line ?? c.bodyLine],
      },
    })),
  };
}
