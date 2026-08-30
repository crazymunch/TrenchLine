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
