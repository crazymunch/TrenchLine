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
  const lines = fs.readFileSync(src, 'utf8').split('\n');

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
      if (/^(Campaign|Games|Phase|Patrons|Trauma Step|Exploration Step|Quartermaster|Step|Reinforcements|Glory Item|Cartulary|Introduction|The World|in Flames|Core Rules|Comprehensive|Rules|Keywords|Terrain|Battlekit|Scenarios|Promotions &|Experience Step)$/.test(t)) continue;
      current.text.push(t);
    }
  }
  if (current) rows.push(current);

  if (!rows.length) throw new Error(`parse-campaign: "${heading}" produced no rows.`);
  return rows.map((r) => ({ roll: r.roll, name: r.name, description: r.text.join(' ').replace(/\s+/g, ' ').trim() }));
}

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
  const lines = fs.readFileSync(src, 'utf8').split('\n');

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
  const lines = fs.readFileSync(src, 'utf8').split('\n');

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

/* ------------------------------------------------------------------ trauma */

const CAMPAIGN_CAT = 'data-sources/battlescribe/Campaign Rules.cat';

/**
 * The Trauma Table, from two sources because neither alone is complete.
 *
 * The catalogue is the authority for the eighteen injuries that attach
 * *something* to a model: each is a real entry with its D66 roll in the name
 * (`Lost an Eye [15]`) and its rules text in a Description characteristic. That
 * is machine-readable and exact.
 *
 * It necessarily lacks the four results that attach nothing — Dead and Captured
 * remove the model, Robbed strips its Battlekit, Full Recovery does nothing — so
 * those come from the rulebook. That page is the two-column layout whose
 * extraction scrambles, but these four rows survive it intact and are read
 * individually rather than as a table.
 *
 * Every row records which source it came from, because the two are not equally
 * strong and a reader should be able to tell.
 */
export function parseTraumaTable(cat = CAMPAIGN_CAT, book = RULEBOOK_TXT) {
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
        source: 'catalogue',
      });
    }
    for (const v of Object.values(node)) {
      if (Array.isArray(v)) v.forEach((c) => walk(c, here));
      else if (v && typeof v === 'object') walk(v, here);
    }
  };
  walk(doc, false);

  if (!rows.size) throw new Error('parse-campaign: no Injuries found in the campaign catalogue.');

  // The four the catalogue cannot carry, read one at a time from the rulebook.
  const lines = fs.readFileSync(book, 'utf8').split('\n');
  /**
   * The Trauma page prints its heading twice and the extraction scrambles one
   * of the two columns, so a row can appear both intact and shredded. Every
   * occurrence is read and the cleanest is kept, rather than trusting the first
   * — which is how `11 Dead` came out as "Remove the 2 2 M 2 2".
   */
  const isScrambled = (t) => /(^|\s)[A-Z0-9](\s+[A-Z0-9]){2,}(\s|$)/.test(t);

  const readRow = (roll, label) => {
    const re = new RegExp(`^\\s*${roll}\\s+${label}\\s*\\t`);
    const candidates = [];
    lines.forEach((l, i) => { if (re.test(l)) candidates.push(i); });

    for (const i of candidates) {
      const text = [lines[i].split('\t').slice(1).join(' ').trim()];
      /*
        The window was six lines, and `12 Captured` is eight. Its rule came out
        ending "...transfer the 👑 from your Strongbox to your opponent's," —
        cut at a comma, losing the half that says what PAYING the ransom does.
        A player reading it would have removed a model they had just bought
        back.

        Fourteen is generous enough for the longest row in the table and still
        bounded, so a missed boundary cannot run away down the page. The
        boundaries below are what actually stops it.
      */
      for (let j = i + 1; j < Math.min(i + 14, lines.length); j++) {
        const t = lines[j].trim();
        if (!t || /^--\s*\d+\s+of/.test(t)) break;
        /*
          A new row, whether or not the name follows on the same line.

          This was `^\d{2}[\s-]`, which needs something after the digits — and
          the book prints `66` alone on its line with `Prominent Scar` beneath.
          So `65 Bitter Lessons` did not stop there: it ran on and took row
          66's heading and half its rule with it, and the app showed a player
          rolling 65 a rule that belongs to 66.
        */
        if (/^\d{2}([\s-]|$)/.test(t)) break;
        if (/^(Wound|Head Wound X?|Campaign|Games|Patrons|Trauma Step)$/.test(t)) break;
        if (isScrambled(t)) break;
        text.push(t);
      }
      const description = text.join(' ').replace(/\s+/g, ' ').trim();
      if (description && !isScrambled(description)) {
        return { roll: String(roll), name: label, description, source: 'rulebook' };
      }
    }
    return null;
  };

  for (const [roll, label] of [['11', 'Dead'], ['12', 'Captured'], ['36', 'Robbed']]) {
    const r = readRow(roll, label);
    if (r && !rows.has(roll)) rows.set(roll, r);
  }

  // 41-63 Full Recovery prints its range split across two lines, so it is
  // matched on its own rather than by the row pattern.
  const fr = lines.findIndex((l) => /^\s*63\s+Full Recovery\s*$/.test(l));
  if (fr >= 0) {
    rows.set('41-63', {
      roll: '41-63', name: 'Full Recovery',
      description: [lines[fr + 1], lines[fr + 2]].map((l) => (l ?? '').trim()).join(' ')
        .replace(/\s+/g, ' ').trim(),
      source: 'rulebook',
    });
  }

  // A handful of catalogue entries carry the injury but no Description text.
  // The book has it, so fall back rather than shipping a blank rule — an injury
  // with no text is one a player cannot apply.
  for (const [roll, row] of rows) {
    if (row.description) continue;
    const fromBook = readRow(roll, row.name);
    if (fromBook) rows.set(roll, { ...row, description: fromBook.description, source: 'catalogue+rulebook' });
  }

  const out = [...rows.values()].sort((a, b) => parseInt(a.roll, 10) - parseInt(b.roll, 10));

  const blank = out.filter((r) => !r.description);
  if (blank.length) {
    throw new Error(
      `parse-campaign: Trauma rows with no rules text: ${blank.map((r) => `${r.roll} ${r.name}`).join(', ')}. ` +
      'An injury a player cannot read is one they cannot apply.');
  }
  const dirty = out.filter((r) => isScrambled(r.description));
  if (dirty.length) {
    throw new Error(
      `parse-campaign: Trauma rows whose text is scrambled column data: ` +
      `${dirty.map((r) => `${r.roll} ${r.name}`).join(', ')}.`);
  }

  /*
    A rule that stops mid-sentence, and a rule that has swallowed the next row.

    Both shipped. `12 Captured` ended at "...transfer the 👑 from your Strongbox
    to your opponent's," — cut at a comma, losing the clause that says paying
    the ransom counts as a Full Recovery, so a player who paid would still have
    removed the model. `65 Bitter Lessons` ran on into `66 Prominent Scar` and
    showed a player rolling 65 a rule belonging to 66.

    Neither is detectable by eye in a 22-row table, and neither was caught by
    the blank and scrambled checks above, which is why they are their own.
  */
  const cut = out.filter((r) => /[,;–—]$|\b(and|or|the|a|to|with|from|for|of|if)$/i.test(r.description));
  if (cut.length) {
    throw new Error(
      `parse-campaign: Trauma rows whose rules text stops mid-sentence: ` +
      `${cut.map((r) => `${r.roll} ${r.name} (…"${r.description.slice(-40)}")`).join(', ')}. ` +
      'A rule cut at a comma is a rule the player will act on wrongly.');
  }

  /* Another row's heading inside this row's text: `… Battle Scar. 66 Prominent Scar Write down …` */
  const runOn = out.filter((r) => /\s\d{2}\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s+[A-Z]/.test(r.description)
    && out.some((o) => o !== r && r.description.includes(`${o.roll} ${o.name}`)));
  if (runOn.length) {
    throw new Error(
      `parse-campaign: Trauma rows carrying another row's heading and rule: ` +
      `${runOn.map((r) => `${r.roll} ${r.name}`).join(', ')}. ` +
      'The row boundary was missed, so this shows a player the wrong injury.');
  }

  // Every D66 result must land somewhere. A hole means a roll the app cannot
  // resolve, which in a wizard reads as "nothing happened" — the worst outcome
  // for an injury table.
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

  return out;
}
