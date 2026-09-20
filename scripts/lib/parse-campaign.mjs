/**
 * Campaign economy, from the digital rulebook.
 *
 * The Warband Threshold Table is game data — 700/10, 800/11, 900/12 — so it is
 * derived here rather than typed into a constant, for the same reason every
 * other number in this project is. The app currently stores a free-text
 * `ducatLimit` that a player edits by hand, which is exactly the failure mode
 * this table exists to prevent: the limit is published, not chosen.
 *
 * Three numbers come out of the campaign rules and they are routinely confused,
 * so they are named apart here and everywhere downstream:
 *
 *   Threshold Value   a cap on the total Cost of the FORCE you field this game.
 *                     Not a cap on the roster — the book is explicit that a
 *                     roster may exceed it and the surplus models sit the game
 *                     out. Rises with the game number.
 *
 *   Field Strength    a cap on the NUMBER of models in that Force, counting
 *                     only models with a Warband Entry. Also rises.
 *
 *   Strongbox         unspent Ducats. Persists between games, fed by Exploration
 *                     and spent in the Quartermaster Step. Nothing to do with
 *                     the Threshold, except in the Reinforcements Step, which
 *                     zeroes it.
 *
 * The table's own page extracts cleanly (unlike the Trauma Table's two-column
 * layout), so this is a parser and not a fuzzy matcher.
 */
import fs from 'node:fs';
import { XMLParser } from 'fast-xml-parser';
import { toLines } from './lines.mjs';

export const RULEBOOK_TXT =
  'data-sources/rulebook/extracted/trench-crusade-digital-rulebook.txt';

/** `1 \t 700 \t 10` — game, Threshold Value, Field Strength. */
const ROW = /^\s*(\d{1,2})\s*\t\s*([\d,]{3,5})\s*\t\s*(\d{1,2})\s*$/;

/**
 * The Warband Threshold Table.
 *
 * Returns `[{ game, threshold, fieldStrength }]` in game order, or throws.
 * Throwing is deliberate: a silently empty table would leave the app with no
 * limit at all, which reads as "unlimited" rather than as a failure — and an
 * unlimited budget is a worse lie than a wrong one, because nothing looks odd.
 */
export function parseThresholdTable(src = RULEBOOK_TXT) {
  const lines = toLines(fs.readFileSync(src, 'utf8'));

  const start = lines.findIndex((l) => /^\s*WARBAND THRESHOLD TABLE\s*$/i.test(l));
  if (start < 0) {
    throw new Error(
      'parse-campaign: no "WARBAND THRESHOLD TABLE" heading in the rulebook text. ' +
      'The Threshold Value and Field Strength cannot be derived without it.');
  }

  const rows = [];
  // Stop at the first non-row line after the rows have started: the table is
  // followed by GLORIOUS DEEDS and then the page furniture.
  for (let i = start + 1; i < lines.length; i++) {
    const m = ROW.exec(lines[i]);
    if (m) {
      rows.push({
        game: Number(m[1]),
        threshold: Number(m[2].replace(/,/g, '')),
        fieldStrength: Number(m[3]),
      });
    } else if (rows.length) break;
  }

  if (!rows.length) {
    throw new Error('parse-campaign: found the Threshold Table heading but no rows under it.');
  }

  // The table is only meaningful if it ascends: a campaign's limits never drop,
  // and a mis-parse that interleaved another table would show up here rather
  // than as a plausible-looking wrong number later.
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    if (b.game !== a.game + 1 || b.threshold < a.threshold || b.fieldStrength < a.fieldStrength) {
      throw new Error(
        `parse-campaign: the Threshold Table does not ascend cleanly at game ${b.game} ` +
        `(${a.game}:${a.threshold}/${a.fieldStrength} -> ${b.game}:${b.threshold}/${b.fieldStrength}). ` +
        'That is a parse failure, not a rules change.');
    }
  }

  return rows;
}

/**
 * The starting allowance, read from the Warbands book rather than assumed.
 *
 * Every faction's entry says "You have 700 👑 to recruit a … Warband", and the
 * general rule says the same, so this reads them and requires that they agree
 * instead of hard-coding 700.
 */
export function parseStartingBudget(src = 'data-sources/rulebook/extracted/warbands-of-trench-crusade.txt') {
  const text = fs.readFileSync(src, 'utf8');
  const found = [...text.matchAll(/(\d{3,4})\s*\u{1F451}\s*to recruit/gu)].map((m) => Number(m[1]));
  if (!found.length) return null;

  const distinct = [...new Set(found)];
  return {
    ducats: distinct.length === 1 ? distinct[0] : null,
    /** Every value seen, so a disagreement is reported rather than averaged. */
    seen: distinct,
    count: found.length,
  };
}

/* -------------------------------------------------------------- exploration */

/**
 * How many Exploration Dice, and which Location table, for a given number of
 * games played. Both are banded the same way, and both are read rather than
 * assumed.
 */
function parseBands(lines, heading, valueRe) {
  // Matched loosely: the extraction's spacing around the tab is not consistent.
  const start = lines.findIndex((l) => heading.test(l));
  if (start < 0) return null;
  const out = [];
  for (let i = start + 1; i < Math.min(start + 12, lines.length); i++) {
    // `1-2 \t 3 Exploration Dice` / `10+ \t Rare or Legendary Exploration Location Table*`
    const m = /^\s*(\d+)\s*(?:[-–](\d+)|(\+))?\s*\t\s*(.+?)\s*$/.exec(lines[i]);
    if (!m) { if (out.length) break; else continue; }
    const value = valueRe(m[4]);
    if (value == null) { if (out.length) break; else continue; }
    out.push({ from: Number(m[1]), to: m[3] ? null : Number(m[2] ?? m[1]), value });
  }
  return out.length ? out : null;
}

/** A Location table row: `4 \t Moonshine Stash: You find …`, then its options. */
const ROW_HEAD = /^\s*(\d{1,2})\s*\t\s*([^:]{2,60}):\s*(.*)$/;

/**
 * One Exploration Location table.
 *
 * The rolls are deliberately sparse — 4, 5, 6, 8, 9, 10, 11, 14… — and that is
 * the rule, not a parse failure: "If you roll a number that is not included on
 * the Exploration Table, then you discover nothing (but you still use the roll
 * to determine how much Loot you collect)". So gaps are preserved rather than
 * filled, and a lookup that misses is a real result.
 *
 * The description is kept verbatim, including the 👑 and ☼ glyphs, because the
 * reward amounts live in it ("Sell (Any Warband): Add 30 👑 to your Strongbox").
 */
function parseRollTable(lines, heading, endHeadings) {
  const start = lines.findIndex((l) => l.trim().toUpperCase() === heading);
  if (start < 0) throw new Error(`parse-campaign: no "${heading}" in the rulebook text.`);

  let end = lines.length;
  for (const h of endHeadings) {
    const at = lines.findIndex((l, i) => i > start && l.trim().toUpperCase() === h);
    if (at > start && at < end) end = at;
  }

  const rows = [];
  let current = null;
  for (let i = start + 1; i < end; i++) {
    const line = lines[i];
    const m = ROW_HEAD.exec(line);
    if (m && !/^Roll\b/.test(m[2])) {
      if (current) rows.push(current);
      current = { roll: Number(m[1]), name: m[2].trim(), text: [m[3].trim()].filter(Boolean) };
    } else if (current) {
      const t = line.trim();
      // Page furniture: running heads, the page counter, and the sidebar's list
      // of step names. None of it is table content.
      if (!t) continue;
      if (/^--\s*\d+\s+of\s+\d+\s*--$/.test(t)) continue;
      if (/^\d+\s+Campaign Rules-\s+Trench Crusade$/.test(t)) continue;
      if (SIDEBAR.test(t)) continue;
      current.text.push(t);
    }
  }
  if (current) rows.push(current);

  if (!rows.length) throw new Error(`parse-campaign: "${heading}" produced no rows.`);

  const out = rows.map((r) => ({
    roll: r.roll, name: r.name, description: r.text.join(' ').replace(/\s+/g, ' ').trim(),
  }));

  /*
    A rule that has swallowed the sidebar, detected WITHOUT consulting the list.

    The line filter above missed `Glory Item Tables` for months because the
    inline list said `Glory Item` and was anchored — so the Patron Skill row at
    12 in all four Skills tables shipped reading "…offered by your Patron.
    Glory Item Tables".

    Checking the finished text against that same list would be circular: it can
    only ever catch a label already in it, which is the one case that needs no
    catching. So the SHAPE is what is checked. Sidebar bleed is a short,
    capitalised fragment left dangling after the rule's last full stop, with no
    terminator of its own — which is not how a rule ends, whatever the chapter
    happens to be called.
  */
  const trailing = (text) => {
    const stop = text.lastIndexOf('. ');
    return stop < 0 ? '' : text.slice(stop + 2).trim();
  };
  const bled = out.filter((r) => {
    const tail = trailing(r.description);
    return tail.length > 0 && tail.length < 40
      && !/[.!?]$/.test(tail)
      && /^[A-Z]/.test(tail)
      && tail.split(/\s+/).length <= 4;
  });
  if (bled.length) {
    throw new Error(
      `parse-campaign: "${heading}" rows ending in a dangling capitalised ` +
      `fragment, which is how the page sidebar bleeds into a rule: ` +
      `${bled.map((r) => `${r.roll} ${r.name} (…"${trailing(r.description)}")`).join(', ')}.`);
  }

  return out;
}

/**
 * The sidebar's list of chapter names, which is not table content.
 *
 * Every page of the rulebook carries this strip down its edge, and the
 * extraction interleaves it with the body — so a table row that runs to the
 * end of a page picks it up as rules text.
 *
 * The list used to be written inline with `Glory Item` in it, anchored `^...$`
 * — and the sidebar's actual line is `Glory Item Tables`, which that does not
 * match. So the Patron Skill row at 12 in ALL FOUR Skills tables shipped
 * reading "…one of the Skills offered by your Patron. Glory Item Tables".
 *
 * Written out one entry per line, because the failure was a two-word entry
 * hiding inside a forty-alternative regex nobody was going to read.
 */
const SIDEBAR = new RegExp(`^(${[
  'Campaign', 'Games', 'Phase', 'Patrons',
  'Trauma Step', 'Exploration Step', 'Quartermaster', 'Step', 'Reinforcements',
  'Promotions &', 'Experience Step',
  'Glory Item Tables', 'Glory Item', 'Cartulary',
  'Introduction', 'The World', 'in Flames',
  'Core Rules', 'Comprehensive', 'Rules', 'Keywords', 'Terrain', 'Battlekit',
  'Scenarios',
  /*
    A stray two-letter mark, once, on the Legendary Exploration page — between
    the last rule and the sidebar strip. Not an abbreviation the book uses
    anywhere else: it appears exactly once, alone on its line, and the rule
    before it ends in a full stop. Found by the shape check below rather than
    by reading the page, which is the point of having one.
  */
  'VM',
].map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`);

/**
 * The Exploration Sequence, as the book numbers it.
 *
 * *"In order to Explore, you must work through the following Exploration
 * Sequence"*, and then five numbered steps. Read rather than summarised
 * because the Codex was showing a hand-written explanation of this step that
 * said **the winner of the match rolls** — every player who played the game
 * explores, unless they Called for Reinforcements — alongside three invented
 * bullets about a "Trench Merchant" and a "Warband Treasury".
 *
 * Step 5 also states the loot multiplier, so `lootPerPoint` is derived from it
 * rather than typed: *"Collect loot equal to 10 times your Exploration Roll in
 * 👑"*.
 */
function parseExplorationSequence(lines) {
  const at = lines.findIndex((l) => /^\s*EXPLORATION SEQUENCE\s*$/.test(l));
  if (at < 0) {
    throw new Error(
      'parse-campaign: no "EXPLORATION SEQUENCE" heading in the rulebook text. '
      + 'The Codex describes this step from it, and what it described before '
      + 'this existed was written by hand and had the wrong player rolling.');
  }

  const steps = [];
  for (let i = at + 1; i < lines.length; i++) {
    const m = /^\s*(\d)\.\s+(.*\S)\s*$/.exec(lines[i]);
    if (m && Number(m[1]) === steps.length + 1) { steps.push(m[2]); continue; }
    if (steps.length) break;
  }

  if (steps.length < 5) {
    throw new Error(
      `parse-campaign: the Exploration Sequence read ${steps.length} steps. The `
      + 'book numbers five, and a sequence with a step missing is a step a '
      + 'player skips.');
  }

  const loot = /(\d+) times your Exploration Roll/.exec(steps.join(' '));
  if (!loot) {
    throw new Error(
      'parse-campaign: the Exploration Sequence no longer says what loot an '
      + 'Exploration Roll is worth. That multiplier is the Strongbox\'s only '
      + 'income and it is not going to be typed in here.');
  }

  return { steps, lootPerPoint: Number(loot[1]) };
}

/**
 * The whole Exploration Step: dice, table selection, and the three tables.
 *
 * The app's hand-written version of this was fabricated end to end — wrong
 * names, and D66 ranges against the book's summed-D6 roll (AUDIT §1.13). It is
 * the Strongbox's only source of income, so it is derived here.
 */
export function parseExploration(src = RULEBOOK_TXT) {
  const lines = toLines(fs.readFileSync(src, 'utf8'));

  const dice = parseBands(lines, /^\s*Games Played\s*\t\s*Exploration Dice\s*$/,
    (v) => { const m = /^(\d+)\s+Exploration Dice$/.exec(v); return m ? Number(m[1]) : null; });
  const tables = parseBands(lines, /^\s*Games Played\s*\t\s*Possible Locations\s*$/,
    (v) => {
      const t = v.replace(/\*+$/, '').trim();
      const names = [];
      if (/\bCommon\b/.test(t)) names.push('common');
      if (/\bRare\b/.test(t)) names.push('rare');
      if (/\bLegendary\b/.test(t)) names.push('legendary');
      // A row naming two tables is a player choice, and the book says so:
      // "You must choose which of the two Exploration Tables to use before you roll."
      return names.length ? { tables: names, choose: names.length > 1 } : null;
    });

  if (!dice || !tables) {
    throw new Error(
      'parse-campaign: could not read the Exploration Dice or table-selection bands. ' +
      'Without them the Exploration Roll cannot be made, and loot is the roll times 10.');
  }

  const ENDS = ['RARE EXPLORATION LOCATION TABLE', 'LEGENDARY EXPLORATION LOCATION TABLE',
                'QUARTERMASTER STEP'];
  /*
    An Exploration Location's roll is emitted as a RANGE covering the single
    number it is printed as.

    Carcass Front's four tables print bands (`1-3`, `34+`) where these three
    print single numbers, and both are Exploration Location tables that one
    lookup in the app has to serve. A degenerate range says exactly what this
    row has always said, and leaves the sparseness intact: the gaps between 6
    and 8, and between 11 and 14, are still gaps.

    Converted HERE and not in `parseRollTable`, which the four Skills tables
    also use. A Skills row is a single 2D6 result and nothing else, and its
    density check compares those results as numbers — widening the shared
    helper turned every one of the eleven into an object and reported all four
    tables as having lost all eleven rows.
  */
  const asRange = (rows) => rows.map((r) => ({ ...r, roll: { from: r.roll, to: r.roll } }));
  const locations = {
    common: asRange(parseRollTable(lines, 'COMMON EXPLORATION LOCATION TABLE', ENDS)),
    rare: asRange(parseRollTable(lines, 'RARE EXPLORATION LOCATION TABLE', ENDS)),
    legendary: asRange(parseRollTable(lines, 'LEGENDARY EXPLORATION LOCATION TABLE', ENDS)),
  };

  const sequence = parseExplorationSequence(lines);

  return {
    dice,
    tables,
    locations,
    /** The book's own five numbered steps, in order. */
    sequence: sequence.steps,
    /**
     * Loot is the Exploration Roll times ten, whatever the table says — and
     * the ten is read out of the sequence's fifth step rather than written
     * here, like every other number in this project.
     */
    lootPerPoint: sequence.lootPerPoint,
  };
}

/* ------------------------------------------------------------------ skills */

/**
 * The four Advancement Skills tables.
 *
 * 2D6, eleven rows each, with Patron Skill at both 2 and 12 — so unlike the
 * Exploration tables these are dense, and a missing row *is* a parse failure.
 * That difference is checked rather than assumed.
 *
 * The app's hand-written version had six entries per table with no roll numbers
 * at all, and five of its names (Berserk Rage, Weapon Master, Duelist, Shield
 * Wall, Decapitating Strike) were already flagged as invented abilities by the
 * wargear and keyword sweep — the same fabrication surfacing twice.
 */
export function parseSkillsTables(src = RULEBOOK_TXT) {
  const lines = toLines(fs.readFileSync(src, 'utf8'));

  const HEADS = {
    melee: 'MELEE & STRENGTH SKILLS TABLE',
    ranged: 'RANGED SKILLS TABLE',
    stealth: 'STEALTH & SPEED SKILLS',
    wildcard: 'WILDCARD SKILLS',
  };
  const ENDS = [...Object.values(HEADS), 'LIMITED POTENTIAL'];

  const out = {};
  for (const [key, heading] of Object.entries(HEADS)) {
    const rows = parseRollTable(lines, heading, ENDS.filter((h) => h !== heading))
      .map((r) => ({ roll: r.roll, name: r.name, description: r.description }));

    // 2D6 spans 2 to 12. A dense table with a hole means the parser lost a row,
    // and a lost Skill is one a player can never be offered.
    const rolls = rows.map((r) => r.roll).sort((a, b) => a - b);
    const missing = [];
    for (let n = 2; n <= 12; n++) if (!rolls.includes(n)) missing.push(n);
    if (missing.length) {
      throw new Error(
        `parse-campaign: the ${key} Skills table is missing 2D6 rolls ${missing.join(', ')}. ` +
        'These tables are dense, so a gap is a parse failure rather than a rule.');
    }
    out[key] = rows;
  }
  return out;
}

/* ----------------------------------------------------- campaign phase steps */

/**
 * The Campaign Phase Steps, in the order the book states.
 *
 * *"To carry out a Campaign Phase you must go through the following Campaign
 * Phase Steps in the order that they appear below"* — and then SIX of them.
 * The app's post-battle wizard has four, two of which ("Scavenge",
 * "Chronicle") are not names the book uses, and it omits the Reinforcements
 * and Quartermaster Steps entirely.
 *
 * The order is not decoration. Reinforcements comes BEFORE Exploration and
 * taking it costs you both the Exploration and the Quartermaster Steps — *"if
 * you do so you will not be able to Explore or visit the Quartermaster, so it
 * is not a decision to be taken lightly"*. A sequence that puts those steps in
 * a different order, or leaves them out, cannot express that trade at all.
 *
 * Derived so the app has something true to show while the wizard is decided.
 */
export function parseCampaignPhaseSteps(src = RULEBOOK_TXT) {
  const lines = toLines(fs.readFileSync(src, 'utf8'));

  const at = lines.findIndex((l) => /^CAMPAIGN PHASE STEPS\s*$/.test(l.trim()));
  if (at < 0) {
    throw new Error(
      'parse-campaign: no CAMPAIGN PHASE STEPS heading in the rulebook. '
      + 'These are the six steps the Campaign Phase runs in order, and nothing '
      + 'else in either source states them.');
  }

  const steps = [];
  let current = null;
  for (let i = at + 1; i < Math.min(at + 40, lines.length); i++) {
    const t = lines[i].trim();
    if (!t) continue;
    /* The section ends at the next heading — `Disbanding a Warband` follows. */
    if (/^[A-Z][A-Za-z’' ]+$/.test(t) && !t.startsWith('**') && steps.length) break;

    const m = /^\*\*\s*(.+?)\s*:\s*(.*)$/.exec(t);
    if (m) {
      if (current) steps.push(current);
      /* `(Optional)` is part of what the step IS, so it is kept in the name. */
      current = { name: m[1].trim(), description: m[2].trim() ? [m[2].trim()] : [] };
    } else if (current) {
      if (SIDEBAR.test(t)) continue;
      current.description.push(t);
    }
  }
  if (current) steps.push(current);

  const out = steps.map((s) => ({
    name: s.name,
    description: s.description.join(' ').replace(/\s+/g, ' ')
      /* The book's cross-references point at chapters this has no link for. */
      .replace(/\s*\(▶[^)]*\)/g, '').trim(),
  }));

  if (out.length !== 6) {
    throw new Error(
      `parse-campaign: expected 6 Campaign Phase Steps, read ${out.length} `
      + `(${out.map((s) => s.name).join(', ')}). The book prints six and states `
      + 'that the order matters, so a miscount is a sequence the app cannot follow.');
  }
  return out;
}

/* ------------------------------------------------------------------ trauma */

const CAMPAIGN_CAT = 'data-sources/battlescribe/Campaign Rules.cat';

/*
  Two characters the extraction does not produce, used to keep structure that
  joining the page into one string would otherwise destroy.
*/
const COLUMN_BREAK = '\u0000';  // the tab the extraction prints between columns
const PAGE_BREAK = '\u0001';    // a `-- N of M --` marker

/** The catalogue's eighteen injuries: row identity, and text for the drift report. */
function parseCatalogueInjuries(cat) {
  const parser = new XMLParser({
    ignoreAttributes: false, attributeNamePrefix: '@_', trimValues: false,
    isArray: (n) => ['selectionEntry', 'selectionEntryGroup', 'profile', 'characteristic'].includes(n),
  });
  const doc = parser.parse(fs.readFileSync(cat, 'utf8'));

  const rows = new Map();
  const walk = (node, inInjuries) => {
    if (!node || typeof node !== 'object') return;
    const name = String(node['@_name'] ?? '').trim();
    const here = inInjuries || name === 'Injuries';
    const m = here && /^(.*?)\s*\[(\d{2})\]$/.exec(name);
    if (m) {
      const desc = (node.profiles?.profile ?? [])
        .flatMap((pr) => pr.characteristics?.characteristic ?? [])
        .find((c) => String(c['@_name'] ?? '') === 'Description');
      rows.set(m[2], {
        roll: m[2],
        name: m[1].trim(),
        description: String(desc?.['#text'] ?? '').replace(/\s+/g, ' ').trim(),
      });
    }
    for (const v of Object.values(node)) {
      if (Array.isArray(v)) v.forEach((c) => walk(c, here));
      else if (v && typeof v === 'object') walk(v, here);
    }
  };
  walk(doc, false);
  return rows;
}

/**
 * The Trauma Table's own text, as one string, with the page furniture gone.
 *
 * The heading appears three times. Two are sidebar renderings that carry a
 * fragment of the table — one of them a `11 Dead` cut at "Remove the model",
 * which is exactly the kind of plausible-looking partial a reader must not
 * prefer. So the region carrying the most row headings wins, rather than the
 * first or the last.
 */
function traumaRegion(lines) {
  const starts = [];
  lines.forEach((l, i) => { if (l.trim() === 'TRAUMA TABLE') starts.push(i); });
  if (!starts.length) {
    throw new Error('parse-campaign: no TRAUMA TABLE heading in the extracted rulebook text.');
  }

  const strip = (slice) => {
    const out = [];
    for (let i = 0; i < slice.length; i++) {
      const raw = slice[i];
      const t = raw.trim();
      if (!t) continue;
      if (/^--\s*\d+\s+of\s+\d+\s*--$/.test(t)) { out.push(PAGE_BREAK); continue; }
      if (/^\d{1,3}\t.*\tTrench Crusade$/.test(raw)) continue;   // running head
      if (/^TRAUMA TABLE$/.test(t)) continue;
      if (/^D66 Roll\s*\tInjury$/.test(raw)) continue;           // column header
      /* The chapter sidebar, printed down the edge of every page in this
         chapter: it starts `Campaign` / `Games` and ends `Trauma Step`. */
      if (t === 'Campaign' && slice[i + 1]?.trim() === 'Games') {
        while (i < slice.length && slice[i].trim() !== 'Trauma Step') i++;
        continue;
      }
      out.push(raw.replace(/\t/g, COLUMN_BREAK).trim());
    }
    return out;
  };

  const regions = starts.map((s, k) => strip(
    lines.slice(s, k + 1 < starts.length ? starts[k + 1] : s + 220),
  ).join(' ').replace(/[ \t]+/g, ' '));

  const headings = (b) => (b.match(/(?:^|\s)\d{2}[\s\u0000]/g) ?? []).length;
  return regions.reduce((best, b) => (headings(b) > headings(best) ? b : best), regions[0]);
}

/**
 * The rows are readable, complete, and not each other.
 *
 * Each of these fired on a real defect during this parser's life, and none of
 * them is visible by eye in a twenty-two row table.
 */
function assertTraumaRowsUsable(out) {
  const blank = out.filter((r) => !r.description);
  if (blank.length) {
    throw new Error(
      `parse-campaign: Trauma rows with no rules text: ${blank.map((r) => `${r.roll} ${r.name}`).join(', ')}. `
      + 'An injury a player cannot read is one they cannot apply.');
  }

  /* A column of loose characters where prose should be — `Remove the 2 2 M 2 2`. */
  const isScrambled = (t) => /(^|\s)[A-Z0-9](\s+[A-Z0-9]){2,}(\s|$)/.test(t);
  const dirty = out.filter((r) => isScrambled(r.description));
  if (dirty.length) {
    throw new Error(
      'parse-campaign: Trauma rows whose text is scrambled column data: '
      + `${dirty.map((r) => `${r.roll} ${r.name}`).join(', ')}.`);
  }

  /*
    A rule that stops mid-sentence. `12 Captured` once ended at "...transfer the
    👑 from your Strongbox to your opponent's," — cut at a comma, losing the
    clause that says paying the ransom counts as a Full Recovery. A player who
    paid would still have removed the model.
  */
  const cut = out.filter((r) => /[,;–—]$|\b(and|or|the|a|to|with|from|for|of|if)$/i.test(r.description));
  if (cut.length) {
    throw new Error(
      'parse-campaign: Trauma rows whose rules text stops mid-sentence: '
      + `${cut.map((r) => `${r.roll} ${r.name} (…"${r.description.slice(-40)}")`).join(', ')}. `
      + 'A rule cut at a comma is a rule the player will act on wrongly.');
  }

  /* Another row's heading inside this row's text. */
  const runOn = out.filter((r) => out.some((o) => o !== r && r.description.includes(`${o.roll} ${o.name}`)));
  if (runOn.length) {
    throw new Error(
      "parse-campaign: Trauma rows carrying another row's heading and rule: "
      + `${runOn.map((r) => `${r.roll} ${r.name}`).join(', ')}. `
      + 'The row boundary was missed, so this shows a player the wrong injury.');
  }

  /*
    Every D66 result must land somewhere. A hole is a roll the app cannot
    resolve, which in a wizard reads as "nothing happened" — the worst possible
    outcome for an injury table.
  */
  const covered = new Set();
  for (const r of out) {
    const [lo, hi] = r.roll.includes('-') ? r.roll.split('-').map(Number) : [Number(r.roll), Number(r.roll)];
    for (let n = lo; n <= hi; n++) if (/^[1-6][1-6]$/.test(String(n))) covered.add(n);
  }
  const missing = [];
  for (const tens of [1, 2, 3, 4, 5, 6]) {
    for (const units of [1, 2, 3, 4, 5, 6]) {
      const n = tens * 10 + units;
      if (!covered.has(n)) missing.push(n);
    }
  }
  if (missing.length) {
    throw new Error(`parse-campaign: the Trauma Table leaves D66 rolls uncovered: ${missing.join(', ')}.`);
  }
}

/**
 * What the catalogue says, where it disagrees with the book.
 *
 * Reported rather than thrown: the catalogue being out of date is the expected
 * state, not an error, and the whole point of this change is that the book
 * wins. It is printed so that a real errata — the book changing under us —
 * shows up as the count moving rather than as silence.
 *
 * A name that disagrees IS thrown, by the caller's lookup failing: names are
 * how a row is located, so a mismatch there means the two sources are not
 * describing the same table.
 */
function reportCatalogueDrift(out, catalogue) {
  const norm = (s) => s.toLowerCase().replace(/[“”"’']/g, "'").replace(/\s+/g, ' ').trim();
  const differs = out.filter((r) => {
    const c = catalogue.get(r.roll);
    return c && c.description && norm(c.description) !== norm(r.description);
  });
  if (differs.length) {
    console.warn(
      `parse-campaign: Trauma Table — ${differs.length} of ${catalogue.size} catalogue rows `
      + `differ from the rulebook and were overridden by it: `
      + `${differs.map((r) => `${r.roll} ${r.name}`).join(', ')}.`);
  }
}

/**
 * The Trauma Table, read from the rulebook.
 *
 * This used to read the eighteen "attaches something to a model" injuries from
 * `Campaign Rules.cat` and only Dead, Captured, Robbed and Full Recovery from
 * the book, on the reasoning that the catalogue is exact and machine-readable
 * while the book's two-column page extracts badly. Both halves of that are
 * true, and the conclusion was still wrong: it inverts the precedence this
 * project states in docs/RULESET-MODEL.md section 6 — Dispatch, then rulebook,
 * then catalogue — for the one table whose text is read back to a player as a
 * rule they must apply.
 *
 * The catalogue is revision 5 of a community transcription and predates 1.0.2.
 * Twelve of its eighteen rows differ from the book, and they are not all
 * wording:
 *
 *   - **24 Dark Memory** was a different rule entirely. The catalogue makes the
 *     model FEAR every enemy in a rematch; the book gives -1 DICE to Melee
 *     Attacks against that Warband. A player following the app was playing an
 *     injury the game does not have.
 *   - **16 Chest Wound** said "+1 DICE" where the book says "+1 INJURY DICE" —
 *     a different dice pool.
 *   - **15 Lost an Eye** dropped "Treat this injury as a Full Recovery if it is
 *     inflicted on a Sniper Priest", so a Sniper Priest lost an eye it keeps.
 *   - **34 Muscle Damage** dropped "Any that it has when the Injury is suffered
 *     is lost", which is the half with a cost.
 *   - **35 Minor Wound** added a sentence the book does not print.
 *   - 26 Lost Arm and 33 Possessed paraphrase conditions the book states exactly.
 *
 * The 1.0.2 changelog rewrites only Head Wound and Captured, so these are the
 * catalogue drifting from 1.0.1 rather than errata the app is behind on.
 *
 * So all twenty-two rows now come from the book and the catalogue is a
 * cross-check. What made that practical is that the page is only unreadable if
 * you read it the way it prints. Three things make it tractable:
 *
 *   1. The heading is printed three times — twice as partial sidebar renderings
 *      that carry a truncated `11 Dead` and a bare column of digits. The
 *      rendering carrying the most row headings is the table; the others are
 *      furniture. (The old reader took the first clean candidate, which is why
 *      `11 Dead` shipped as "Remove the model from your Warband Roster",
 *      missing "and its Battlekit" — the truncated sidebar copy.)
 *   2. Row headings wrap in five different shapes — `35 Minor` / `Wound`,
 *      `32` / `Expensive` / `Treatment`, `41-` / `63 Full Recovery`. Joining
 *      the region into one string makes all five the same shape, and the row's
 *      own name tells the reader where its heading ends.
 *   3. A row's text never crosses a page boundary, which is what stops the last
 *      row running on into the next chapter.
 *
 * The catalogue is still parsed, for the row names and for the drift report.
 */
export function parseTraumaTable(cat = CAMPAIGN_CAT, book = RULEBOOK_TXT) {
  const catalogue = parseCatalogueInjuries(cat);
  if (!catalogue.size) throw new Error('parse-campaign: no Injuries found in the campaign catalogue.');

  const blob = traumaRegion(toLines(fs.readFileSync(book, 'utf8')));

  /*
    Headings the book tabs — `NN Name<TAB>rules text`. This derives the roll AND
    the name, so sixteen of the twenty-two need nothing from the catalogue at
    all. The rest wrap, and take their name from the catalogue below.
  */
  const tabbed = new Map();
  for (const m of blob.matchAll(/(?:^|\s)(\d{2})\s+([A-Z][^\u0000]{0,30}?)\s*\u0000/g)) {
    if (!tabbed.has(m[1])) tabbed.set(m[1], m[2].trim());
  }

  /* The one result the table prints as a range rather than a roll. */
  const RANGE_ROLL = '41-63';

  const nameFor = (roll) => (roll === RANGE_ROLL
    ? 'Full Recovery'
    : tabbed.get(roll) ?? catalogue.get(roll)?.name);

  const rolls = [...new Set([...catalogue.keys(), ...tabbed.keys(), RANGE_ROLL])]
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  /*
    A heading pattern built from the row's own name. The name may have been
    wrapped mid-heading, so every gap between its words matches any whitespace:
    `Severe Nerve Damage` finds `13 Severe Nerve` / `Damage` across two lines.
  */
  const headPattern = (roll) => {
    if (roll === RANGE_ROLL) return String.raw`41-\s*63\s+Full\s+Recovery`;
    const name = nameFor(roll);
    if (!name) {
      throw new Error(
        `parse-campaign: Trauma roll ${roll} has no name in either source, so its `
        + 'row cannot be located in the rulebook.');
    }
    const loose = name.trim().split(/\s+/)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join(String.raw`\s+`);
    return String.raw`${roll}\s+${loose}`;
  };

  const findHead = (roll, from) => {
    const re = new RegExp(String.raw`(?:^|\s)(${headPattern(roll)})(?=[\s\u0000]|$)`, 'g');
    re.lastIndex = from;
    return re.exec(blob);
  };

  const out = [];
  let cursor = 0;
  for (let i = 0; i < rolls.length; i++) {
    const roll = rolls[i];
    const head = findHead(roll, cursor);
    if (!head) {
      throw new Error(
        `parse-campaign: Trauma row ${roll} ${nameFor(roll) ?? ''} is not in the `
        + 'rulebook\'s Trauma Table. The catalogue is a cross-check here, not a '
        + 'fallback, so this is not something to fill in from it.');
    }
    const from = head.index + head[0].length;

    /* The next row's heading ends this one. */
    let to = blob.length;
    if (i + 1 < rolls.length) {
      const next = findHead(rolls[i + 1], from);
      if (!next) {
        throw new Error(
          `parse-campaign: Trauma row ${rolls[i + 1]} does not follow ${roll} in the `
          + 'rulebook table, so the boundary between them cannot be found.');
      }
      to = next.index;
    }

    out.push({
      roll,
      name: nameFor(roll),
      /* And a page boundary ends it too — which is what stops the last row,
         66 Prominent Scar, running on into the Promotions and Experience Step. */
      description: blob.slice(from, to)
        .split(PAGE_BREAK)[0].split(COLUMN_BREAK).join(' ')
        .replace(/\s+/g, ' ').trim(),
      source: 'rulebook',
    });
    cursor = from;
  }

  assertTraumaRowsUsable(out);
  reportCatalogueDrift(out, catalogue);
  return out;
}

/* ------------------------------------------------------ the Experience track */

/**
 * When an ELITE model may make an Advancement Roll, from the catalogue.
 *
 * The book describes the track and cannot state it: page 105 says Experience
 * is checked off "one Experience box per point, from left to right, starting
 * with the top row; when you reach a box that is a circle, you can make an
 * Advancement Roll for the model" — and the circles are printed on the Roster
 * Sheet, a page the PDF text extraction does not carry. There is no sentence
 * anywhere that lists the numbers.
 *
 * The catalogue encodes them, because NewRecruit has to enforce them. The
 * `Skills` entry link raises its own allowance from 1 to 6 as the Advancement
 * group's selection count passes 1, 3, 6, 9, 13 and 17 — so the model earns a
 * Skill on reaching 2, 4, 7, 10, 14 and 18 Experience. The `Experience` entry
 * caps at 18, which is the last circle.
 *
 * ## The one place this deliberately differs from NewRecruit
 *
 * The catalogue's condition counts selections in the whole `Advancement`
 * group, and that group also holds `Elite Promotion`. So in NewRecruit a
 * Troop promoted to ELITE carries one selection before it has any Experience
 * at all, and reaches each circle a point early. The book does not say that —
 * it says a promoted model "begin[s] with 0 Experience Points" — so this
 * counts Experience alone and a promoted model rolls on the same numbers as
 * one that started ELITE.
 *
 * That is a deviation from the source it derives from, which is why it is
 * written here rather than left for a reader to notice. The thing to check it
 * against is the Roster Sheet's printed circles, if a PDF with extractable
 * sheets ever exists.
 */
export function parseExperienceTrack(cat = CAMPAIGN_CAT) {
  const parser = new XMLParser({
    ignoreAttributes: false, attributeNamePrefix: '@_', trimValues: false,
    isArray: (n) => ['selectionEntry', 'selectionEntryGroup', 'entryLink', 'modifier', 'condition', 'constraint'].includes(n),
  });
  const doc = parser.parse(fs.readFileSync(cat, 'utf8'));

  let max = null;
  const thresholds = [];

  const walk = (node) => {
    if (!node || typeof node !== 'object') return;

    if (String(node['@_name'] ?? '') === 'Experience' && node['@_type'] === 'upgrade') {
      const c = (node.constraints?.constraint ?? []).find((x) => x['@_type'] === 'max');
      const n = Number(c?.['@_value']);
      if (Number.isFinite(n)) max = n;
    }

    if (String(node['@_name'] ?? '') === 'Skills' && node.modifiers) {
      for (const mod of node.modifiers.modifier ?? []) {
        for (const cond of mod.conditions?.condition ?? []) {
          if (cond['@_type'] !== 'greaterThan') continue;
          if (cond['@_childName'] !== 'Advancement') continue;
          const n = Number(cond['@_value']);
          if (Number.isFinite(n)) thresholds.push(n);
        }
      }
    }

    for (const v of Object.values(node)) {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(doc);

  if (!Number.isFinite(max)) {
    throw new Error(
      'parse-campaign: no max on the Experience entry in the campaign catalogue. '
      + 'Without it there is no end to the track and no way to tell a complete '
      + 'model from one the parser failed to read.');
  }

  /*
    Each modifier fires ABOVE its threshold, so the roll is at threshold + 1.
    Sorted and de-duplicated because the catalogue lists them in file order,
    which is not promised to be numeric.
  */
  const advancementAt = [...new Set(thresholds)].sort((a, b) => a - b).map((n) => n + 1);

  if (!advancementAt.length) {
    throw new Error(
      'parse-campaign: the Experience track has no Advancement Rolls. The `Skills` '
      + 'link\'s allowance modifiers are the only record of where the circles are '
      + 'printed on the Roster Sheet, and an empty track would silently give every '
      + 'model unlimited Skills.');
  }

  const strictlyIncreasing = advancementAt.every((n, i) => i === 0 || n > advancementAt[i - 1]);
  if (!strictlyIncreasing) {
    throw new Error(
      `parse-campaign: Advancement Rolls are not strictly increasing: ${advancementAt.join(', ')}.`);
  }

  const over = advancementAt.filter((n) => n > max);
  if (over.length) {
    throw new Error(
      `parse-campaign: Advancement Rolls past the end of the track (max ${max}): `
      + `${over.join(', ')}. A roll a model can never reach is a Skill it can never earn.`);
  }

  return { max, advancementAt };
}

/* ------------------------------------------------- the Trauma Step procedure */

/**
 * How the Trauma Step is actually run: who rolls what, and what removes a model.
 *
 * The Trauma Table above says what injury a 34 is. It does not say who is
 * entitled to roll on it, and that turns out to be the more important half.
 *
 * The app got this wrong in the most expensive way available. Every model taken
 * Out of Action was offered a D66 Trauma roll, so a Troop — who by the book
 * takes a single D6 and dies on a 1-2 — instead drew from a table on which
 * only 1 result in 36 is Dead. The wizard was handing out survival. Nothing in
 * the dataset contradicted it, because the procedure had never been parsed:
 * `campaign` carried the table and no rule about who rolls it.
 *
 * Codex found it in the rules-coverage audit (docs/RULES-COVERAGE-AUDIT.md
 * RC-01, RC-05) and it is the class the audit was commissioned to find — a rule
 * the pipeline never noticed, and so invisible to every value-oriented check we
 * have. There is no dataset field to compare against a book when the field does
 * not exist.
 *
 * Everything here is one contiguous passage of the Campaign Rules chapter, so
 * it is read as a block of named sections and each number is pulled from the
 * sentence that states it. Nothing is defaulted. A sentence that does not parse
 * throws, because the alternative — shipping a procedure with a plausible
 * number in it — is how the app came to kill the wrong models in the first
 * place.
 *
 * The extraction repeats this passage twice more as scrambled sidebar copy
 * (`Unify for Duty`, `unles's`). Only the first, clean occurrence is read.
 */
export function parseTraumaProcedure(src = RULEBOOK_TXT) {
  const lines = toLines(fs.readFileSync(src, 'utf8'));

  /*
    NOT the first `Trauma Step` line: the phrase is the campaign chapter's
    running page header and appears 58 times. The passage is found by its
    opening sentence, and the heading above that sentence is the anchor.
  */
  const body = lines.findIndex((l) =>
    /^In this step of the Campaign Phase you must find out what happened/.test(l.trim()));
  const at = body > 0 && lines[body - 1].trim() === 'Trauma Step' ? body - 1 : -1;
  if (at < 0) {
    throw new Error(
      'parse-campaign: cannot find the Trauma Step passage in the rulebook '
      + `(opening sentence at line ${body + 1}). This passage is the only `
      + 'statement of who rolls D6 and who rolls D66, and without it the app '
      + 'cannot tell a dead Troop from an injured Elite.');
  }

  /*
    The passage's own headings, in the order it prints them. Used as section
    boundaries rather than searched for individually: a heading that stops
    appearing is then a loud miscount here, not a section that silently reads
    as empty further down.
  */
  const HEADINGS = [
    'Trauma Step', 'Troops', 'Elite Models', 'Models Killed in Action',
    'Battle Scars', 'Unfit for Duty', 'Recording Injuries & Battle Scars',
  ];

  /*
    What a heading looks like in this extraction: a short line, Title Case, no
    sentence punctuation. Body lines are long, or wrapped mid-sentence, or carry
    a comma — none of the passage's own body lines match this.

    It is needed because the passage is followed immediately by a scrambled
    sidebar reprint whose heading reads `Unify for Duty`. That is not one of our
    seven, so without this the final section swallowed the entire duplicate,
    typo and all.
  */
  const HEADING_SHAPE = /^[A-Z][A-Za-z’'& ]{2,40}$/;

  const section = {};
  let current = null;
  for (let i = at; i < Math.min(at + 60, lines.length); i++) {
    const t = lines[i].trim();
    if (!t) continue;
    /* `TRAUMA TABLE` in caps starts the table, and the sidebar copy after it. */
    if (/^TRAUMA TABLE$/.test(t)) break;
    if (HEADINGS.includes(t)) {
      if (section[t]) break; /* a repeat means we have walked into the sidebar */
      current = t;
      section[t] = [];
      continue;
    }
    /* A heading we do not know is a heading we have walked out of the passage into. */
    if (HEADING_SHAPE.test(t)) break;
    if (current) section[current].push(t);
  }

  const missing = HEADINGS.filter((h) => !section[h]);
  if (missing.length) {
    throw new Error(
      `parse-campaign: the Trauma Step passage is missing ${missing.join(', ')}. `
      + 'Each names a rule that removes a model from a roster; a section read as '
      + 'absent would silently become a rule the app does not apply.');
  }

  const text = (h) => section[h].join(' ').replace(/\s+/g, ' ')
    .replace(/\s*\(▶[^)]*\)/g, '').trim();

  /** Pull one number out of the sentence that states it, or say which failed. */
  const number = (heading, re, what) => {
    const m = re.exec(text(heading));
    if (!m) {
      throw new Error(
        `parse-campaign: cannot read ${what} from the "${heading}" section of `
        + `the Trauma Step. Read: "${text(heading).slice(0, 160)}". A default `
        + 'here would be a rule about who dies, invented at the keyboard.');
    }
    return Number(m[1]);
  };

  /*
    "by rolling a D6. On a roll of 1-2, they are dead ... On a roll of 3 or
    more, they survived". Both bounds are read, and then checked against each
    other: the book's two sentences must partition the die with no gap and no
    overlap, or one of them was misread.
  */
  const deadUpTo = number('Troops', /roll of 1\s*[-–]\s*(\d)\s*,\s*they are dead/i,
    'the roll a Troop dies on');
  const survivesFrom = number('Troops', /roll of (\d)\s*or more,\s*they survived/i,
    'the roll a Troop survives on');
  const die = number('Troops', /rolling a D(\d)\b/i, 'the die a Troop rolls');

  if (survivesFrom !== deadUpTo + 1) {
    throw new Error(
      `parse-campaign: the Troop Survival Roll reads dead on 1-${deadUpTo} and `
      + `survives on ${survivesFrom}+, which leaves the die neither covered nor `
      + 'exclusive. One of the two sentences was misread.');
  }
  if (deadUpTo < 1 || survivesFrom > die) {
    throw new Error(
      `parse-campaign: a Survival Roll of dead 1-${deadUpTo}, survives `
      + `${survivesFrom}+ does not fit on a D${die}.`);
  }

  /* "each time an ELITE model is taken Out of Action, they receive a Battle Scar" */
  if (!/each time an ELITE model is taken Out of Action, they\s+receive a Battle Scar/i
    .test(text('Battle Scars'))) {
    throw new Error(
      'parse-campaign: the Battle Scars section no longer states that an ELITE '
      + 'model taken Out of Action receives one. That sentence is what makes the '
      + 'third-scar retirement countable.');
  }

  const unfitAt = (() => {
    const t = text('Unfit for Duty');
    const words = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5 };
    const m = /receives their (\w+) Battle Scar/i.exec(t);
    if (!m || !(m[1].toLowerCase() in words)) {
      throw new Error(
        `parse-campaign: cannot read which Battle Scar retires a model from `
        + `"${t.slice(0, 160)}". Retiring at the wrong count removes a model `
        + 'from a roster early or never.');
    }
    return words[m[1].toLowerCase()];
  })();

  return {
    /** Troops are defined by the absence of a Keyword, not by a roster role. */
    troops: {
      definition: text('Troops').split('.')[0] + '.',
      die: `D${die}`,
      deadUpTo,
      survivesFrom,
      text: text('Troops'),
    },
    elite: {
      die: 'D66',
      text: text('Elite Models'),
    },
    /*
      Two separate rules that both strip gear, kept apart because they disagree
      about where it goes: a killed model's Battlekit is lost, a retired model's
      may be moved to the Arsenal.
    */
    killedInAction: { battlekitLost: true, text: text('Models Killed in Action') },
    battleScars: {
      /* Only ELITE models accrue them — Troops never survive to carry one. */
      eliteOnly: true,
      unfitAt,
      text: text('Battle Scars'),
      unfitText: text('Unfit for Duty'),
    },
    /*
      "a model can only suffer each type of injury once. If a model receives the
      same injury a second time, make the D66 roll for the model again" — a
      reroll rule, which the app has never had. It currently appends the same
      injury string twice.
    */
    duplicateInjury: {
      rerollUntilUsable: true,
      text: text('Recording Injuries & Battle Scars'),
    },
  };
}

/* ------------------------------------------- the Reinforcements Step sequence */

/**
 * What Calling for Reinforcements actually costs you.
 *
 * The app knew one of the six steps. It warned that taking Reinforcements
 * forfeits Exploration and the Quartermaster (step 6) and suppressed those
 * controls — and then applied none of the price the other five state:
 *
 *   1. Discard any Battlekit in the Arsenal. The app kept the stash.
 *   2. Reduce the Strongbox to zero.       The app kept the Ducats.
 *   3. Total the cost of the Warband.      Never computed.
 *   4. Threshold minus that = the allowance. `reinforcementAllowance` was
 *      written for exactly this and then never called from anywhere.
 *   5. Unspent Ducats are lost, and the Arsenal starts the next game empty.
 *   6. Forgo Exploration and the Quartermaster.
 *
 * So the app offered the one clause that takes something away — the step
 * choice — while quietly leaving the player richer than the rule allows.
 * `docs/RULES-COVERAGE-AUDIT.md` RC-09.
 *
 * Derived rather than restated because the sequence is game data: a caller that
 * needs to say "this will empty your Arsenal and your Strongbox" before a
 * player taps through should be quoting the book, not a paraphrase of it.
 *
 * Every clause is read from the numbered list. A missing number throws — five
 * steps read as six-with-one-silently-absent is precisely the failure this
 * finding is.
 */
export function parseReinforcementsSequence(src = RULEBOOK_TXT) {
  const lines = toLines(fs.readFileSync(src, 'utf8'));

  const at = lines.findIndex((l) => /^REINFORCEMENTS SEQUENCE$/.test(l.trim()));
  if (at < 0) {
    throw new Error(
      'parse-campaign: no REINFORCEMENTS SEQUENCE heading in the rulebook. It is '
      + 'the only statement of what Calling for Reinforcements costs, and every '
      + 'clause of it takes something away from the player.');
  }

  /*
    The list runs `1.` to `6.` with wrapped continuation lines. It ends at the
    page furniture that follows ("Campaign", "Games") — short Title-Case lines
    that cannot be mistaken for a numbered clause.
  */
  const steps = [];
  for (let i = at + 1; i < Math.min(at + 40, lines.length); i++) {
    const t = lines[i].trim();
    if (!t) continue;
    const m = /^(\d)\.\s*(.*)$/.exec(t);
    if (m) {
      steps.push({ n: Number(m[1]), parts: [m[2]] });
      continue;
    }
    if (!steps.length) continue;              /* the preamble before step 1 */
    if (/^[A-Z][A-Za-z]{2,14}$/.test(t)) break; /* page furniture */
    steps.at(-1).parts.push(t);
  }

  const out = steps.map((s) => ({
    step: s.n,
    text: s.parts.join(' ').replace(/\s+/g, ' ')
      /* The Ducat glyph survives extraction here; the app has its own mark. */
      .replace(/\s*👑\s*/g, ' Ducats ')
      /* The glyph substitution leaves a space before the punctuation after it. */
      .replace(/\s+([,.)])/g, '$1')
      .replace(/\(\s+/g, '(')
      .replace(/\s+/g, ' ')
      .trim(),
  }));

  const expected = [1, 2, 3, 4, 5, 6];
  const got = out.map((s) => s.step);
  if (got.length !== expected.length || got.some((n, i) => n !== expected[i])) {
    throw new Error(
      `parse-campaign: the Reinforcements Sequence read as steps [${got.join(', ')}], `
      + 'expected 1 to 6. Every clause takes something from the player, so a '
      + 'step read as absent is one the app would quietly not charge.');
  }

  /*
    The two clauses a caller has to ACT on rather than display, checked against
    the sentence that states them. Named flags rather than a prose match at the
    call site: a consumer that greps for "Discard" in rules text is a consumer
    that stops working when the wording changes.
  */
  const says = (n, re, what) => {
    if (!re.test(out[n - 1].text)) {
      throw new Error(
        `parse-campaign: Reinforcements step ${n} no longer states ${what}. `
        + `Read: "${out[n - 1].text.slice(0, 140)}".`);
    }
    return true;
  };

  return {
    steps: out,
    /** Step 1: the Arsenal is abandoned when you fall back. */
    discardsArsenal: says(1, /Discard any Battlekit that you have in the Arsenal/i,
      'that the Arsenal is discarded'),
    /** Step 2: the Strongbox pays for favours. */
    zeroesStrongbox: says(2, /Reduce the number of .*in your Strongbox to zero/i,
      'that the Strongbox goes to zero'),
    /** Step 5: what is not spent is gone, and the Arsenal starts empty. */
    unspentLost: says(5, /you do not spend on reinforcements are lost/i,
      'that unspent Ducats are lost'),
    /** Step 6: the choice the app already implements. */
    forgoesExplorationAndQuartermaster: says(6,
      /forego the Exploration Step and\s*Quartermaster Step/i,
      'that Exploration and the Quartermaster are forgone'),
  };
}

/**
 * Campaign Victory Points, the scale the campaign is actually won on.
 *
 * Page 95, under `Winning the Campaign`:
 *
 * > In a campaign you score Campaign Victory Points for each game that you
 * > play:
 * > ** The winner of the game scores +15 Campaign Victory Points
 * > ** The loser of the game scores +7 Campaign Victory Points
 * > ** In a draw, both players score +10 Campaign Victory Points
 *
 * > At the end of the campaign, the player with the most Campaign Victory
 * > Points is the winner. In the case of a tie, all tied players are joint
 * > winners.
 *
 * The app recorded none of this. The Campaign Hub ranked members on `glory`
 * and `rating`, neither of which is how the game says a campaign is won — so
 * the standings answered a question the rules do not ask, and the one they do
 * ask had no answer anywhere.
 *
 * Note that a loss still scores. Seven of fifteen is a lot, and a scale read
 * as "winner takes all" would change who wins a season, which is why this is
 * derived and pinned rather than typed.
 */
export function parseCampaignVictoryPoints(src = RULEBOOK_TXT) {
  const lines = toLines(fs.readFileSync(src, 'utf8'));
  const text = lines.join('\n');

  const read = (re, what) => {
    const m = re.exec(text);
    if (!m) {
      throw new Error(
        `parse-campaign: cannot read the Campaign Victory Points for ${what} `
        + `from the rulebook (${re.source}). The campaign is won on this scale, so `
        + 'a missing value must fail the build rather than default — a zero here '
        + 'silently decides a season.');
    }
    return Number(m[1]);
  };

  const win = read(/The winner of the game scores \+(\d+) Campaign Victory Points/i, 'a win');
  const loss = read(/The loser of the game scores \+(\d+) Campaign Victory Points/i, 'a loss');
  const draw = read(/In a draw, both players score \+(\d+) Campaign Victory Points/i, 'a draw');

  /*
    The book's own ordering. A scale that did not satisfy it would mean the
    extraction had crossed two bullets — which is exactly the failure a
    three-line list invites, and one that reads as plausible data.
  */
  if (!(win > draw && draw > loss)) {
    throw new Error(
      `parse-campaign: the Campaign Victory Points scale read as win=${win}, `
      + `draw=${draw}, loss=${loss}, which is not ordered win > draw > loss. `
      + 'The three bullets have most likely been crossed.');
  }
  if (loss <= 0) {
    throw new Error(
      `parse-campaign: a loss reads ${loss} Campaign Victory Points. The book `
      + 'scores a loss, and a zero here would make the campaign winner-takes-all.');
  }

  return { win, loss, draw };
}

/* ------------------------------------------------------------------ *
 * Promotions & Experience Step — who may be promoted, and how much
 * Experience a model may hold.
 * ------------------------------------------------------------------ */

/**
 * The book prints two faction-by-faction tables in exactly the same shape:
 * `Models That Cannot Be Promoted` (p.107) and `Limited Potential` (p.111).
 *
 * Each is a preamble, then six blocks of a faction heading followed by one
 * line of comma-separated model names, or a bare `-` where the faction has
 * none. Both end at a two-or-three-letter page mark (`MG`, `GD`) and the
 * chapter sidebar, which is the same class of artefact as the `PW` mark FD-01
 * removed from the Battlekit tables.
 *
 * The preamble is NOT the anchor, because the two tables wrap differently:
 * p.107 ends its preamble on its own line, and p.111 runs the last sentence
 * on from the one before and breaks in the middle of it
 * (`…cannot have more than` / `7 Experience Points.`). Anchoring on a
 * sentence that survives one reflow and not the other is how a parser comes
 * to read a page number as a faction.
 *
 * So the scan starts at the heading and collects from the first line that
 * resolves to a dataset faction — the preamble, however it wrapped, resolves
 * to none. `-` yields an empty list, which is a real answer: two factions
 * have no model in either table.
 *
 * Returns `[{ faction, names }]` in the book's order. The faction is the
 * book's own heading, verbatim, so that a later failure reports the words on
 * the page rather than a slug nobody can find there.
 */
function parseFactionModelTable(lines, heading, factions) {
  /*
    The heading appears twice — once in the chapter sidebar's running list,
    once over the table. The table's copy is the one with faction headings
    under it, which is what the scan below requires, so both are tried in
    order and the first that yields rows wins.
  */
  const heads = lines
    .map((l, i) => (heading.test(l.trim()) ? i : -1))
    .filter((i) => i >= 0);

  for (const at of heads) {
    const out = [];
    for (let i = at + 1; i < Math.min(at + 60, lines.length); i++) {
      const line = lines[i].trim();
      if (!line) continue;
      /* The page mark closes the table and opens the sidebar. */
      if (/^[A-Z]{2,3}$/.test(line)) break;
      if (/^--\s*\d+\s+of\s+\d+\s*--$/.test(line)) break;

      if (!matchFaction(line, factions)) {
        /* Still in the preamble. Once rows have started, a line that is not a
           faction means the table has ended. */
        if (out.length) break;
        continue;
      }

      const names = (lines[i + 1] ?? '').trim();
      if (!names) continue;
      out.push({
        faction: line,
        names: names === '-' ? [] : names.split(',').map((n) => n.trim()).filter(Boolean),
      });
      i++;
    }
    if (out.length) return out;
  }

  throw new Error(
    `parse-campaign: cannot find the "${heading.source}" table in the rulebook, `
    + `or found the heading (${heads.length} time(s)) with no faction rows under it. `
    + 'This table is the only statement of which models the rule covers, so an '
    + 'empty one would read as "every model qualifies" rather than as a failure.');
}

/**
 * Resolve the book's faction heading to a dataset faction id.
 *
 * The book writes them out in full — `The Sultanate of the Iron Wall`, `The
 * Principality of New Antioch` — and the dataset keys them short:
 * `iron-sultanate`, `new-antioch`. Neither is a prefix, a suffix or a
 * substring of the other, and `The Cult of the Black Grail` differs from
 * `cult-of-the-black-grail` only by a leading article. One string rule does
 * not cover all six.
 *
 * What does: the dataset name's significant words are a subset of the book
 * heading's. `{iron, sultanate} ⊂ {sultanate, iron, wall}` and `{new,
 * antioch} ⊂ {principality, new, antioch}`, and each match is unique.
 *
 * Throws unless exactly one faction matches. A heading that matched none
 * would silently drop a whole faction's models from the rule; one that
 * matched two would apply another faction's list.
 */
const FACTION_STOP = new Set(['the', 'of', 'and']);

/*
  Faction labels are spelled three different ways in three places, and none of
  the three is a substring of the others:

    rulebook table   The Sultanate of the Iron Wall   The Cult of the Black Grail
    faction list     Iron Sultanate                   Cult of the Black Grail
    unit.factionId   Iron Sultanate                   Black Grail

  The book is longest, the unit label is shortest, and the faction list sits
  between them — so a one-directional rule gets one pair right and the other
  wrong. Words are stemmed (`Legions` and `Legion` are the same faction) and
  either side may be the subset.
*/
const factionWords = (s) => new Set(
  String(s ?? '').toLowerCase().split(/[^a-z0-9]+/)
    .filter((w) => w && !FACTION_STOP.has(w))
    .map((w) => w.replace(/s$/, '')));

const subset = (a, b) => [...a].every((x) => b.has(x));

/**
 * The one dataset faction a label names, or `null`.
 *
 * `null` for both "no faction" and "more than one", because a label that
 * matches two factions is not a weaker answer than one that matches none — it
 * is a worse one, and both must stop the caller.
 */
function matchFaction(label, factions) {
  const mine = factionWords(label);
  if (!mine.size) return null;
  const hits = factions.filter((f) => {
    const theirs = factionWords(f.name);
    return theirs.size > 0 && (subset(theirs, mine) || subset(mine, theirs));
  });
  return hits.length === 1 ? hits[0] : null;
}

function resolveFactionHeading(heading, factions) {
  const hit = matchFaction(heading, factions);
  if (!hit) {
    throw new Error(
      `parse-campaign: the rulebook faction heading "${heading}" does not resolve `
      + 'to exactly one dataset faction. Every heading in the Promotions tables must, '
      + "because an unresolved heading silently drops that faction's models from the rule.");
  }
  return hit.id;
}



/**
 * The book's model names, resolved to the units the dataset actually carries.
 *
 * The two vocabularies look further apart than they are. The catalogue holds
 * both a selectionEntry name and a profile name for every model, and it is the
 * ENTRY name the books print:
 *
 *   book                        entry                      profile
 *   Anchorite Shrine            Anchorite Shrine           Anchorite
 *   War Wolf Assault Beast      War Wolf Assault Beast     War Wolf
 *   Grail Thralls               Grail Thrall               Thrall
 *
 * The dataset carried only the profile name, so three of these looked like
 * models it did not have. Matching the entry name as well — see `entryName` in
 * `parse-battlescribe.mjs` — resolves them from the source, with nothing
 * written down by hand.
 *
 * What is left is genuine drift, and there is exactly one case of it: the
 * book's `Fly Thralls` is the catalogue's `Winged Thrall`, a rename, not a
 * spelling. That one is recorded with a citation on each side in
 * `promotion-model-names.json`. Such a file says what the book's words refer
 * to and never what a model costs or can do, so it is a name equivalence
 * rather than game data — but it is still the kind of thing that rots, so the
 * build fails if it names a pair that no longer needs reconciling.
 *
 * Case, punctuation, a parenthetical (`Homunculi (House of Wisdom)`) and a
 * trailing plural are reduced here, because those are spellings of one name.
 *
 * Anything still unresolved throws, and both tables are reported together: a
 * build that surfaces one missing name per run is a build nobody finishes.
 */
function resolveModelNames(rows, units, aliases, tableName, unresolved, usedAliases) {
  const norm = (s) => String(s ?? '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')      // `Homunculi (House of Wisdom)`
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  /*
    Candidate spellings of one name, never a replacement for it: the original
    is always in the set, so an extra rule can only add a way to match and
    never take one away.

    `Hounds of the Black Grail` pluralises mid-name, so the last word is not
    always the one carrying the `s`; and `Homunculi` is the Latin plural of
    the `Homunculus` the catalogue lists. Both are spellings of a single name,
    which is why they are reduced here rather than written down as
    equivalences.
  */
  const forms = (s) => {
    const n = norm(s);
    return new Set([n, n.replace(/s$/, ''), n.replace(/s\b/g, ''), n.replace(/i$/, 'us')]);
  };
  const overlap = (a, b) => [...a].some((x) => x && b.has(x));

  return rows.map(({ faction, factionId, names }) => ({
    faction,
    factionId,
    models: names.map((name) => {
      const inFaction = units.filter((u) => u.factionSlug === factionId);
      const key = `${factionId}::${name}`;
      const alias = aliases[key];

      const want = forms(name);
      if (alias) { usedAliases.add(key); forms(alias.is).forEach((f) => want.add(f)); }

      /* Either of the model's two names may be the one the book used. */
      const hit = inFaction.find((u) =>
        overlap(want, forms(u.name)) || (u.entryName && overlap(want, forms(u.entryName))));

      if (!hit) unresolved.push(`${tableName}: ${faction} — "${name}"`);
      return { name, unitId: hit?.id ?? null, unitName: hit?.name ?? null };
    }),
  }));
}


/**
 * One bound, read from the sentence that states it.
 *
 * Run against the whole page rather than line by line: the Limited Potential
 * cap breaks across a line in the middle of its own sentence
 * (`…cannot have more than` / `7 Experience Points.`), so a per-line scan
 * finds the words and not the number.
 */
function readNumber(text, re, what) {
  const m = re.exec(text);
  if (!m) {
    throw new Error(
      `parse-campaign: cannot read ${what} from the rulebook (${re.source}). `
      + 'A missing bound must fail the build rather than default, because the '
      + 'default a player would never notice is "no limit".');
  }
  return Number(m[1]);
}


/**
 * The Promotions & Experience Step's eligibility rules.
 *
 * `poolBase`, `poolPerDeed`, `promoteOn` and `autoAfterMisses` are the dice
 * half of the step and are derived separately, where the step that rolls them
 * is built — see FD-06b. This reads the two bounds that apply before any dice
 * are picked up:
 *
 *   maxElites    "Ignore the Promotion step completely if there are already 6
 *                or more models with the ELITE Keyword…" (p.105)
 *   maxXp        "The following models cannot have more than 7 Experience
 *                Points." (p.111)
 *
 * and the two model lists that say who each applies to.
 */
export function parsePromotions(factions, units, {
  src = RULEBOOK_TXT,
  aliasSrc = 'data-sources/rulebook/promotion-model-names.json',
} = {}) {
  const lines = toLines(fs.readFileSync(src, 'utf8'));
  const aliases = JSON.parse(fs.readFileSync(aliasSrc, 'utf8')).names ?? {};
  /* Joined, so a sentence that wrapped still reads as one. */
  const text = lines.join(' ');
  /* Units label their faction in their own spelling; resolve once, here, so
     the three vocabularies meet in exactly one place. */
  const withFaction = units.map((u) => ({
    ...u, factionSlug: matchFaction(u.factionId, factions)?.id ?? null,
  }));

  const maxElites = readNumber(
    text,
    /there are already (\d+) or more models with the\s+ELITE Keyword/i,
    'the Maximum Elites bound');

  const maxXp = readNumber(
    text,
    /cannot have more than\s+(\d+) Experience Points/i,
    'the Limited Potential Experience cap');

  /*
    The dice half of the step (p.105).

    Four numbers, each from its own sentence, and each one decides how often a
    Warband gets a new ELITE model:

      poolBase          "Your Promotion Dice Pool is made up of 1D6, plus…"
      poolPerDeed       "…plus 1D6 for each Glorious Deed that was carried out
                        during the game by any model from your Warband."
      promoteOn         "As soon as one of the dice rolls a '6', stop rolling
                        for that model, and Promote the model…"
      autoAfterMisses   "…make a note on your Roster of how many dice you have
                        rolled in a row without getting a Promotion. Once the
                        total reaches 5 dice, then the next roll (the 6th one),
                        is automatically considered to be a 6."

    `promoteOn` is read rather than assumed, for the same reason as the rest:
    a 6 on a D6 is a 1-in-6 chance and a hardcoded one is a number nobody would
    ever check against the page again.
  */
  const poolBase = readNumber(
    text,
    /Promotion Dice Pool is made up of\s+(\d+)D6/i,
    'the base Promotion Dice');

  const poolPerDeed = readNumber(
    text,
    /plus\s+(\d+)D6 for each Glorious Deed/i,
    'the Promotion Dice per Glorious Deed');

  const promoteOn = readNumber(
    text,
    /As soon as one of the dice rolls a\s*["\u201c\u2018']?(\d+)["\u201d\u2019']?\s*,\s*stop rolling/i,
    'the roll that Promotes');

  const autoAfterMisses = readNumber(
    text,
    /Once the total reaches\s+(\d+) dice, then the next roll/i,
    'the number of misses after which a Promotion is automatic');

  if (promoteOn < 1 || promoteOn > 6) {
    throw new Error(
      `parse-campaign: a Promotion Die promotes on ${promoteOn}, which is not a `
      + 'face of a D6. The sentence has most likely been misread.');
  }
  if (autoAfterMisses < 1) {
    throw new Error(
      `parse-campaign: the automatic Promotion arrives after ${autoAfterMisses} `
      + 'misses, which would make every first roll a Promotion.');
  }

  const withIds = (rows) => rows.map((r) => ({
    faction: r.faction,
    factionId: resolveFactionHeading(r.faction, factions),
    names: r.names,
  }));

  const unresolved = [];
  const usedAliases = new Set();

  const cannotPromote = resolveModelNames(
    withIds(parseFactionModelTable(lines, /^Models That Cannot Be Promoted$/i, factions)),
    withFaction, aliases, 'Models That Cannot Be Promoted', unresolved, usedAliases);

  const limitedPotential = resolveModelNames(
    withIds(parseFactionModelTable(lines, /^Limited Potential$/i, factions)),
    withFaction, aliases, 'Limited Potential', unresolved, usedAliases);

  if (unresolved.length) {
    throw new Error(
      `parse-campaign: ${unresolved.length} model name(s) in the rulebook's `
      + 'Promotions tables match no unit in the dataset:\n  '
      + unresolved.join('\n  ')
      + '\n\nEach must match a unit\'s profile or entry name, or be given a cited '
      + 'equivalence in data-sources/rulebook/promotion-model-names.json. Dropping one '
      + 'would let the app promote a model the book forbids, or lift a cap it imposes.');
  }

  /*
    An equivalence that is no longer needed is a claim about the data that has
    stopped being true — most likely because the catalogue renamed the model
    back. Left in place it would go on asserting a reconciliation nobody can
    check, so it fails the build the same way a missing one does.
  */
  const stale = Object.keys(aliases).filter((k) => !usedAliases.has(k));
  if (stale.length) {
    throw new Error(
      'parse-campaign: promotion-model-names.json names '
      + `${stale.length} equivalence(s) that nothing needed:\n  ${stale.join('\n  ')}\n\n`
      + 'The book and the catalogue now agree on these, so the entry should be removed.');
  }

  return {
    maxElites,
    poolBase,
    poolPerDeed,
    promoteOn,
    autoAfterMisses,
    cannotPromote,
    limitedPotential: { maxXp, factions: limitedPotential },
  };
}

/**
 * Where the rulebook's Limited Potential table and the shipped keywords differ.
 *
 * The rule is stated twice. The rulebook prints the p.111 table parsed above;
 * the catalogue puts a LIMITED POTENTIAL keyword on the unit. They agree on
 * all seven models — and then `dispatch-01` replaces the Brazen Bull's whole
 * Warband Entry, and the keyword row it prints (p.10: SULTANATE ARTIFICIAL
 * FEAR NEGATE SHRAPNEL STRONG TOUGH) has no LIMITED POTENTIAL in it.
 *
 * So the disagreement is not extraction drift and not a stale catalogue. It is
 * the Trench Dispatch changing a model, which is what the Dispatch is for, and
 * precedence — Dispatch over rulebook over catalogue — says the Brazen Bull's
 * Experience is no longer capped.
 *
 * This must therefore run on the FINAL units, after layers. Run against the
 * raw catalogue it compares the book with the book and reports nothing, which
 * is the mistake that made this function necessary: the Brazen Bull's
 * provenance still reads `Iron Sultanate.cat` because a layer that overwrites
 * a field does not rewrite the entry's source, so the pre-layer keywords look
 * like the shipped ones.
 *
 * Returns the differences in both directions, for the build to print. They are
 * reported and not resolved: which source wins is precedence's business, and
 * `experienceCap` applies it by reading the keyword.
 */
export function promotionKeywordDrift(promotions, units) {
  const rows = promotions?.limitedPotential?.factions ?? [];
  const has = (u) => (u?.keywords ?? [])
    .some((k) => String(k).toUpperCase() === 'LIMITED POTENTIAL');
  const named = new Map(rows.flatMap((f) => f.models.map((m) => [m.unitId, { ...m, faction: f.faction }])));

  const out = [];
  for (const [unitId, m] of named) {
    const u = units.find((x) => x.id === unitId);
    if (u && !has(u)) {
      out.push(`the rulebook names "${m.name}" (${m.faction}) in its Limited Potential `
        + `table, and the shipped ${u.name} carries no LIMITED POTENTIAL keyword`);
    }
  }
  for (const u of units) {
    if (has(u) && !named.has(u.id)) {
      out.push(`${u.factionId} ${u.name} carries the LIMITED POTENTIAL keyword and the `
        + "rulebook's Limited Potential table does not name it");
    }
  }
  return out;
}
