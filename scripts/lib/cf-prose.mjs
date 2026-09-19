/**
 * Reading the Carcass Front book's prose chapters.
 *
 * The machinery two parsers share — `parse-cf-scenarios.mjs` for the five
 * scenarios and the terrain pieces, `parse-cf-generator.mjs` for the Random
 * Scenario Generator printed in the same chapter. Both face the same three
 * problems, all of them consequences of reading a designed page as a stream of
 * lines:
 *
 *   - **Page furniture lands in the prose.** Deployment-map labels and
 *     dimensions, and the two-letter artist mark at the foot of a page, arrive
 *     as bare lines in the middle of a sentence.
 *   - **Lines wrap**, sometimes hyphenated across the break. A rule is one
 *     paragraph printed as six lines.
 *   - **Tables arrive as tab-separated rows**, with their own wrapped cells.
 *
 * Nothing here knows anything about scenarios or generators. It turns a
 * chapter's pages into ordered lines, and a run of lines into Markdown.
 */
import fs from 'node:fs';
import { joinWrapped } from './dehyphenate.mjs';
import { toLines } from './lines.mjs';

export const BOOK_TXT = 'data-sources/carcass-front/extracted/carcass-front-book.txt';

/** `-- 64 of 104 --`, which the extractor writes at the end of every page. */
const PAGE_BREAK = /^-- \d+ of \d+ --$/;

/** An ALL-CAPS line opening a section. */
export const SECTION = /^[A-Z][A-Z '’,&()-]{3,40}$/;

/**
 * `D6 \t Battlefield Archetype`, `Roll \t Result` — a chart's header row.
 *
 * The space before the tab is the book's, not a stray: the extraction keeps a
 * cell's own trailing space inside the cell.
 */
export const CHART_HEADER = /^(D6|Roll|2D6)\s*\t/;

/** `1-3 \t No Man’s Land` — a chart row, keyed by the roll it answers. */
export const CHART_ROW = /^(\d+(?:\s*-\s*\d+)?)\s*\t(.*)$/;

/** A bare dimension printed against a map arrow: `24’’`, `8”`, `12"`. */
const DIMENSION = /^\d+\s*(?:["”'’]{1,2})\s*$/;

/**
 * A short label off a deployment map. Two or more per map, and every one is
 * ALL-CAPS: `DEPLOYMENT ZONE`, `EZ`, `EZ\tEZ`, `VIOLENT SHORE/`, `RAILWAY`.
 * The trailing slash is the book wrapping `VIOLENT SHORE/CLIFF WALL`.
 */
const MAP_LABEL = /^[A-Z][A-Z /’'\t-]{0,28}$/;

/**
 * The two-letter artist mark at the foot of most pages, and the `EZ` label on
 * a deployment map. Six pairs appear across the chapter — EG, EZ, GD, MF, MK,
 * MM — and not one of them is a word: dropped wherever they land, because the
 * one at the foot of the last page of a scenario otherwise renders as a
 * sub-heading under its Glorious Deeds.
 */
const ARTIST = /^[A-Z]{2}$/;

/**
 * Drop the deployment map, wherever the extraction dropped it.
 *
 * A map is a RUN of consecutive lines that are all labels, dimensions or the
 * artist mark, and that contains at least one dimension. The dimension is what
 * makes it a map: a run of ALL-CAPS lines with no measurement in it is a
 * section heading followed by another, which happens where a scenario's own
 * section — `THE SWORD OF GOD`, `THE ALTAR OF LEVIATHAN` — sits next to the
 * map that names the same thing.
 */
function withoutMaps(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    let j = i;
    while (j < lines.length
      && (DIMENSION.test(lines[j]) || MAP_LABEL.test(lines[j]) || ARTIST.test(lines[j]))) j++;
    const run = lines.slice(i, j);
    if (run.length >= 2 && run.some((l) => DIMENSION.test(l))) { i = j - 1; continue; }
    if (ARTIST.test(lines[i])) continue;
    out.push(lines[i]);
  }
  return out;
}

/**
 * One chapter's lines, page furniture removed, in printed order.
 *
 * A chapter is identified by its running head — `Scenarios & Terrain\t61` —
 * which the extractor puts at the top of every page belonging to it. Taking
 * the pages by that head rather than by a start and end line means a chapter
 * that moves in a later printing still reads.
 *
 * @param label the running head, e.g. 'Scenarios & Terrain'
 */
export function chapterLines(label, src = BOOK_TXT) {
  const all = toLines(fs.readFileSync(src, 'utf8'));
  const head = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\t\\d+$`);

  const headers = [];
  all.forEach((l, i) => { if (head.test(l.trim())) headers.push(i); });
  if (!headers.length) {
    throw new Error(
      `cf-prose: no '${label}' pages in ${src}. The chapter cannot be read ` +
      'without them, and shipping a book without one of its chapters looks ' +
      'exactly like a book that does not have it.');
  }

  const out = [];
  for (const start of headers) {
    let end = all.length;
    for (let i = start + 1; i < all.length; i++) {
      if (PAGE_BREAK.test(all[i].trim())) { end = i; break; }
    }
    const page = [];
    for (const raw of all.slice(start + 1, end)) {
      const l = raw.replace(/\s+$/, '');
      if (l.trim() === '') continue;
      page.push(l);
    }
    /*
      Maps are dropped PER PAGE, because a map is on one page and a run of
      map-shaped lines is not allowed to reach across the break to the next.

      Doing it across the whole chapter swallowed the VICTORY CONDITIONS CHART
      heading: the page before it ends on a deployment map, and the heading —
      short, all caps — looked like one more label on the same map. The
      generator then lost a quarter of itself, silently.
    */
    out.push(...withoutMaps(page));
  }
  return out.map((l) => l.trim());
}

export const endsSentence = (l) => /[.!?:]["'”’)]?$/.test(l);

/**
 * A line that opens a NAMED rule: `Doomed: A friendly model takes…`,
 * `Claim ACTION: A model that is within 1” of…`, `Carrying Ancient Tablets:`.
 *
 * The book writes a Glorious Deed, a scenario ACTION and a marker rule all in
 * this one form, and the wrapped line is often longer than a heading, so the
 * Title-Case-sub-heading rule alone ran consecutive deeds together: scenario
 * III's Glorious Deeds came out as one paragraph reading "…gains the ☼.
 * Tanker: A friendly model takes at least…", which is two rules presented as
 * one.
 */
export const NAMED_RULE = /^[A-Z][A-Za-z0-9’'/ -]{1,44}:\s/;

/** `1 VP for each Ancient Tablet…` — the Victory Points list, one per line. */
const VP_LINE = /^\d+ VPs? for\b/;


/** Join wrapped lines into paragraphs, keeping each named rule its own. */
function paragraphs(lines) {
  const out = [];
  const isSubHeading = (l) => l.length <= 45 && !endsSentence(l) && /^[A-Z]/.test(l)
                              && !NAMED_RULE.test(l);

  for (const line of lines) {
    const last = out[out.length - 1];
    const open = last && !last.heading;
    const opensOwn = NAMED_RULE.test(line) || VP_LINE.test(line) || isSubHeading(line);
    if (!open || (endsSentence(last.text) && opensOwn)) {
      out.push({ heading: isSubHeading(line), text: line });
      continue;
    }
    // The extraction hyphenates across the column break. Whether the hyphen
    // survives is not a formatting choice — see `dehyphenate.mjs`.
    last.text = joinWrapped(last.text, line);
  }
  return out;
}

/**
 * The chapter's tables, which the extraction gives as tab-separated rows.
 *
 * Three kinds appear, and they are three because the book prints three:
 *
 *   - **Roll tables.** `Roll \t Result`, `D6 \t Battlefield Archetype`. The
 *     Search Table, the naval mine's 2D6 detonation table. Flattened into
 *     prose these read `2-6 The naval mine does not explode now, but you must
 *     roll again 7-11 The naval mine is jostled…`, which is a roll table a
 *     player cannot use at the moment they are rolling on it.
 *   - **Profiles.** `Movement \t Ranged \t Melee \t Armour \t Base` and
 *     `Type \t Range \t Keywords`. Two scenarios field neutral models — the
 *     Lunatic Monk, the Carrion Feeder — with full statlines, and the naval
 *     mine's explosion has a weapon profile.
 *   - **Labelled rows.** `Battlekit \t A Lunatic Monk always has…`. Not a
 *     table at all: a label and a paragraph, sharing the row shape. Rendered
 *     as the paragraph it is, because a two-column table with one row of body
 *     text in it is a worse way to read a sentence.
 *
 * A row's continuation lines carry no tab, so a table ends at the first
 * tab-less line arriving after a row that finished its sentence.
 */
const TAB_ROW = /\t/;
const ROW_LABEL = /^(Battlekit|Abilities|Keywords|Powers|Special Rules)$/;

const splitRow = (line) => line.split('\t').map((c) => c.trim()).filter((c, i, a) =>
  // A trailing empty cell is the line's own trailing tab, not a column.
  c !== '' || i < a.length - 1);

/**
 * Split a section's lines into prose runs and tables, in printed order.
 *
 * @returns {({kind:'lines',lines:string[]}|{kind:'table',rows:string[][]})[]}
 */
export function tableBlocks(lines) {
  const out = [];
  let prose = [];
  let table = null;

  const closeProse = () => { if (prose.length) { out.push({ kind: 'lines', lines: prose }); prose = []; } };
  const closeTable = () => { if (table) { out.push({ kind: 'table', rows: table }); table = null; } };

  for (const line of lines) {
    if (TAB_ROW.test(line)) {
      const row = splitRow(line);
      if (ROW_LABEL.test(row[0])) {
        // A label and its paragraph, not a table row.
        closeTable();
        prose.push(`**${row[0]}:** ${row.slice(1).join(' ')}`);
        continue;
      }
      // A change of column count is a new table: the Lunatic Monk's five-column
      // statline is not the same table as the three-column weapon profile
      // printed under it.
      if (table && table[0].length !== row.length) closeTable();
      if (!table) { closeProse(); table = []; }
      table.push(row);
      continue;
    }

    if (table) {
      const last = table[table.length - 1];
      /*
        A wrapped cell, unless the incoming line opens a named rule.

        The naval mine's explosion profile ends its Keywords cell on
        `SHRAPNEL`, which finishes no sentence, so the `Bad Hiding Spot:` rule
        printed under the profile was appended to the cell — three rules read
        as part of a keyword list.
      */
      if (!endsSentence(last[last.length - 1]) && !NAMED_RULE.test(line)) {
        // A wrapped result cell.
        last[last.length - 1] = joinWrapped(last[last.length - 1], line);
        continue;
      }
      closeTable();
    }
    prose.push(line);
  }
  closeProse();
  closeTable();
  return out;
}

/** A table's rows as a Markdown pipe table, header row first. */
function tableToMarkdown(rows) {
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r) => [...r, ...Array(width - r.length).fill('')];
  const line = (r) => `| ${pad(r).join(' | ')} |`;
  return [line(rows[0]), `|${' --- |'.repeat(width)}`, ...rows.slice(1).map(line)].join('\n');
}

const proseToMarkdown = (parts) => parts
  .map((p) => (p.heading ? `**${p.text}**` : p.text))
  .join('\n\n').trim();

/** A block of the chapter as Markdown: paragraphs, sub-headings and tables. */
export const toMarkdown = (lines) => tableBlocks(lines)
  .map((b) => (b.kind === 'table' ? tableToMarkdown(b.rows) : proseToMarkdown(paragraphs(b.lines))))
  .filter(Boolean)
  .join('\n\n').trim();

export const slugify = (name) => name
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/['’]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
