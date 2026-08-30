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
function parseLocationTable(lines, heading, endHeadings) {
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
  const locations = {
    common: parseLocationTable(lines, 'COMMON EXPLORATION LOCATION TABLE', ENDS),
    rare: parseLocationTable(lines, 'RARE EXPLORATION LOCATION TABLE', ENDS),
    legendary: parseLocationTable(lines, 'LEGENDARY EXPLORATION LOCATION TABLE', ENDS),
  };

  return {
    dice,
    tables,
    locations,
    /** Loot is the Exploration Roll times 10, whatever the table says. */
    lootPerPoint: 10,
  };
}
