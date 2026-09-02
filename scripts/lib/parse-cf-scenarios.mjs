/**
 * The Carcass Front Scenarios & Terrain chapter.
 *
 * Five scenarios and two terrain pieces, read the same way
 * `parse-scenarios.mjs` reads the rulebook's twelve — the chapters have the
 * same shape, an ALL-CAPS section per block with Title-Case sub-headings under
 * it, so the same discipline applies: nothing is summarised, a section is
 * carried under the heading the book prints, and a scenario missing one of its
 * core sections fails the build rather than shipping half-playable.
 *
 * Three things are different enough to need their own handling.
 *
 * **The numerals are fullwidth.** The book sets `Ⅰ º The Ruins of Nineveh
 * Novus` with U+2160 ROMAN NUMERAL ONE, and two of them for `ⅠⅠ` rather than
 * U+2161. So `Ⅰ` and `ⅠⅠⅠ` are runs of the same character, and the numeral is
 * counted rather than looked up.
 *
 * **Every scenario carries a Path to Leviathan Consequences block** that the
 * rulebook's twelve have no equivalent of — what winning this scenario does to
 * the next one. It is a rule, and it only applies inside that campaign, so it
 * is kept as its own section with the book's own caveat attached rather than
 * folded into the tagline.
 *
 * **The deployment maps interleave with the prose.** Labels and dimensions off
 * the map — `DEPLOYMENT ZONE`, `24’’`, `SWORD OF GOD`, `CLIFF WALL` — extract
 * as bare lines in the middle of a sentence, and in scenario V they land
 * between "within 1” of the Altar of Leviathan and" and "not within 1” of any
 * enemy models". Dropping them by name would need a list per scenario; they
 * are found by shape instead, as a run of short label-or-dimension lines
 * containing at least one dimension.
 */
import fs from 'node:fs';
import { joinWrapped } from './dehyphenate.mjs';

export const BOOK_TXT = 'data-sources/carcass-front/extracted/carcass-front-book.txt';

/** `Scenarios & Terrain\t61` — the running head on every page of the chapter. */
const PAGE_HEADER = /^Scenarios & Terrain\t\d+$/;
const PAGE_BREAK = /^-- \d+ of \d+ --$/;

/** U+2160, repeated: `Ⅰ`, `ⅠⅠ`, `ⅠⅠⅠ`. `Ⅳ` and `Ⅴ` are their own characters. */
const TITLE = /^(Ⅰ+|Ⅳ|Ⅴ)\s*º\s*(.+)$/;

/** Fullwidth numeral -> the value it stands for, and the ASCII the app shows. */
const NUMERAL = { 'Ⅳ': 4, 'Ⅴ': 5 };
const ASCII = ['I', 'II', 'III', 'IV', 'V'];

/** The six sections every scenario has, in the order the book prints them. */
export const CORE_SECTIONS = [
  'FORCES', 'THE BATTLEFIELD', 'DEPLOYMENT', 'GAME LENGTH',
  'VICTORY CONDITIONS', 'GLORIOUS DEEDS',
];

const SECTION = /^[A-Z][A-Z '’,&()-]{3,40}$/;

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

/** The chapter's lines, page furniture removed, in printed order. */
export function chapterLines(src = BOOK_TXT) {
  const all = fs.readFileSync(src, 'utf8').split('\n');

  const headers = [];
  all.forEach((l, i) => { if (PAGE_HEADER.test(l.trim())) headers.push(i); });
  if (!headers.length) {
    throw new Error(
      `parse-cf-scenarios: no 'Scenarios & Terrain' pages in ${src}. The five ` +
      'scenarios and the terrain rules cannot be derived without them, and ' +
      'shipping the book without its scenarios would look like the book has none.');
  }

  const out = [];
  for (const start of headers) {
    let end = all.length;
    for (let i = start + 1; i < all.length; i++) {
      if (PAGE_BREAK.test(all[i].trim())) { end = i; break; }
    }
    for (const raw of all.slice(start + 1, end)) {
      const l = raw.replace(/\s+$/, '');
      if (l.trim() === '') continue;
      out.push(l);
    }
  }
  return withoutMaps(out).map((l) => l.trim());
}

const endsSentence = (l) => /[.!?:]["'”’)]?$/.test(l);

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
const NAMED_RULE = /^[A-Z][A-Za-z0-9’'/ -]{1,44}:\s/;

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
function tableBlocks(lines) {
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
const toMarkdown = (lines) => tableBlocks(lines)
  .map((b) => (b.kind === 'table' ? tableToMarkdown(b.rows) : proseToMarkdown(paragraphs(b.lines))))
  .filter(Boolean)
  .join('\n\n').trim();

export const slugify = (name) => name
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/['’]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Rules vocabulary. A block containing any of it is not a quotation.
 *
 * Used only to tell the closing epigraph from the Glorious Deed above it —
 * they are typographically distinct in the book and identical in the text
 * extraction, so the split has to be made on what the words say.
 */
const RULES_WORDS =
  /friendly model|enemy model|Out of Action|Glorious Deed|Marker|ACTION|Turns?\b|VPs?\b|☼|👑|[0-9]”/;

/** The attribution under a quotation: `-Ashur, Epistoliary Majoris of…`. */
const ATTRIBUTION_LINE = /^[-–—]\s*[A-Z]/;

/**
 * Split a section's raw lines into its own body and the closing epigraph.
 *
 * Every scenario ends on a quotation and its attribution — "Burn it. Burn it
 * all. / -Trench Cleric Viktor Drazdau, 33rd Lithuanian Hussars" — printed
 * under the last section, which is always GLORIOUS DEEDS. The book sets it in
 * a different face; the extraction does not, so it arrives as more lines of
 * the last Glorious Deed. That is the one section where a stray sentence is a
 * rule a player would try to score, and it truncated the last deed of all five
 * scenarios before this existed.
 *
 * Three facts locate the boundary, and all three have to hold:
 *
 *   1. Every Glorious Deed opens `Name: `. The quotation never contains a
 *      colon, so it begins after the LAST such line.
 *   2. It begins a sentence: the line before it finishes one, and it starts on
 *      a capital. A wrapped continuation of the deed starts lower-case.
 *   3. It is prose. A block naming a friendly model, an ACTION, a Marker, a
 *      Turn or a currency is the rule, not the quotation.
 *
 * Taking the EARLIEST boundary that satisfies all three keeps the whole
 * quotation; taking the latest would leave its first sentences in the deed.
 * Where no boundary satisfies them, nothing is split — the section keeps
 * everything, which is the safe direction to be wrong in.
 */
function splitEpigraph(lines) {
  const a = lines.findIndex((l) => ATTRIBUTION_LINE.test(l));
  if (a < 0) return { lines, epigraph: '' };

  let lastRule = -1;
  for (let i = 0; i < a; i++) if (NAMED_RULE.test(lines[i])) lastRule = i;

  for (let j = lastRule + 1; j < a; j++) {
    if (!/^["“'‘]?[A-Z]/.test(lines[j])) continue;
    if (j > 0 && !endsSentence(lines[j - 1])) continue;
    const block = lines.slice(j, a).join(' ');
    if (block.includes(':') || RULES_WORDS.test(block)) continue;
    return { lines: lines.slice(0, j), epigraph: lines.slice(j, a + 1).join(' ') };
  }
  return { lines, epigraph: '' };
}

/**
 * The two terrain pieces, from the `Carcass Front Terrain Piece Rules` block
 * that opens the chapter.
 *
 * Kept separate from the scenarios because that is what the book says they
 * are: "rules for two different terrain pieces that you can use in ANY of your
 * Trench Crusade games". Tying them to the five scenarios would hide them from
 * every other game.
 */
export function parseTerrain(lines) {
  const at = lines.findIndex((l) => l === 'Carcass Front Terrain Piece Rules');
  if (at < 0) {
    throw new Error(
      'parse-cf-scenarios: the Carcass Front Terrain Piece Rules block was not ' +
      'found. Naval Mines carry a 2D6 detonation table and a blast profile, and ' +
      'a player cannot resolve one from memory.');
  }
  const firstScenario = lines.findIndex((l) => TITLE.test(l));
  const body = lines.slice(at + 1, firstScenario < 0 ? lines.length : firstScenario);

  // Each piece opens on its ALL-CAPS name; everything to the next one is its.
  const starts = [];
  body.forEach((l, i) => { if (SECTION.test(l)) starts.push({ i, name: l }); });

  return starts.map(({ i, name }, k) => {
    const own = body.slice(i + 1, k + 1 < starts.length ? starts[k + 1].i : body.length);
    return {
      name,
      slug: slugify(name),
      /*
        The name is printed in caps as a heading; Title Case is for display.
        `LEVANT HEDGEHOG` -> `Levant Hedgehog`. No word of the rules changes.
      */
      title: name.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()),
      body: toMarkdown(own),
    };
  });
}

/**
 * The five scenarios and the two terrain pieces.
 *
 * @returns {{scenarios: object[], terrain: object[]}}
 */
export function parseCarcassFrontScenarios(src = BOOK_TXT) {
  const lines = chapterLines(src);
  const terrain = parseTerrain(lines);

  const starts = [];
  lines.forEach((l, i) => {
    const m = TITLE.exec(l);
    if (m) starts.push({ i, numeral: m[1], name: m[2].trim() });
  });

  /*
    The chapter continues past the last scenario into the Random Scenario
    Generator, which is a different thing with its own tables. Bounded on its
    heading rather than on the end of the chapter, or scenario V would swallow
    four pages of charts as Glorious Deeds.
  */
  const generatorAt = lines.findIndex((l) => l === 'Random Scenario Generator');

  const scenarios = [];
  for (let k = 0; k < starts.length; k++) {
    const { i, numeral, name } = starts[k];
    const nextAt = k + 1 < starts.length ? starts[k + 1].i
      : (generatorAt > i ? generatorAt : lines.length);
    const body = lines.slice(i + 1, nextAt);

    const firstSection = body.findIndex((l) => SECTION.test(l));
    const head = firstSection > 0 ? body.slice(0, firstSection) : [];

    /*
      The Path to Leviathan Consequences block sits between the tagline and
      FORCES, under a Title-Case heading rather than an ALL-CAPS one. It is a
      rule — what winning this scenario does to a later one — so it becomes a
      section rather than part of the tagline, and it keeps the book's own
      caveat that it applies only inside that campaign.
    */
    const consequencesAt = head.findIndex((l) => /^Path to Leviathan Consequences$/i.test(l));
    const intro = consequencesAt >= 0 ? head.slice(0, consequencesAt) : head;

    /*
      Each scenario OPENS on a quotation too, above the summary — "…the wrath
      of Heaven and Hell still hungers… / -Ashur, Epistoliary Majoris of
      Nineveh Novus" — and it is set apart in the book by italics the
      extraction drops. Here the boundary is unambiguous: the attribution line
      ends it, and everything after it is the summary. Carried as its own
      field rather than run into the tagline, which is what a picker shows in
      one line under the scenario's name.
    */
    const openAt = intro.findIndex((l) => ATTRIBUTION_LINE.test(l));
    const quotation = openAt >= 0 ? intro.slice(0, openAt + 1).join(' ').replace(/\s+/g, ' ').trim() : '';
    const tagline = intro.slice(openAt + 1).join(' ').replace(/\s+/g, ' ').trim();
    const consequences = consequencesAt >= 0
      ? toMarkdown(head.slice(consequencesAt + 1))
      : '';

    const sections = [];
    if (consequences) {
      sections.push({ heading: 'PATH TO LEVIATHAN CONSEQUENCES', body: consequences });
    }

    let epigraph = '';
    let current = null;
    let buffer = [];
    const flush = () => {
      if (!current) return;
      // The closing quotation trails the last section. Taken off whichever
      // section it lands under, so a book that moves it still reads.
      const split = splitEpigraph(buffer);
      if (split.epigraph) epigraph = split.epigraph;
      const text = toMarkdown(split.lines);
      // A heading with nothing under it is a map label the shape check let
      // through, not a section. Dropped rather than emitted empty.
      if (text) sections.push({ heading: current, body: text });
    };
    for (const line of body.slice(firstSection < 0 ? body.length : firstSection)) {
      if (SECTION.test(line)) { flush(); current = line; buffer = []; continue; }
      buffer.push(line);
    }
    flush();

    const number = NUMERAL[numeral] ?? numeral.length;
    scenarios.push({
      number,
      roman: ASCII[number - 1],
      name,
      slug: `carcass-front-${slugify(name)}`,
      tagline,
      /** The quotation the scenario opens on, above its summary. */
      quotation,
      /** The quotation it closes on, printed under the Glorious Deeds. */
      epigraph,
      sections,
      source: 'carcass-front',
    });
  }

  if (scenarios.length !== 5) {
    throw new Error(
      `parse-cf-scenarios: found ${scenarios.length} scenarios, expected 5. ` +
      'The book states five and they are numbered I to V; a missing one is ' +
      'worse than an obviously absent one, because four would look complete.');
  }

  const has = (s, h) => s.sections.some((x) => x.heading === h && x.body);
  const incomplete = scenarios.filter((s) => CORE_SECTIONS.some((h) => !has(s, h)));
  if (incomplete.length) {
    throw new Error(
      'parse-cf-scenarios: these scenarios are missing a core section — ' +
      incomplete.map((s) => `${s.roman} ${s.name} (${
        CORE_SECTIONS.filter((h) => !has(s, h)).join(', ')})`).join('; ') +
      '. A scenario without its GAME LENGTH or GLORIOUS DEEDS is one a player ' +
      'cannot actually play.');
  }

  if (terrain.length !== 2) {
    throw new Error(
      `parse-cf-scenarios: found ${terrain.length} terrain pieces, expected 2 ` +
      '(Levant Hedgehog and Naval Mine). The book says the section "includes ' +
      'rules for two different terrain pieces".');
  }

  return { scenarios, terrain };
}
