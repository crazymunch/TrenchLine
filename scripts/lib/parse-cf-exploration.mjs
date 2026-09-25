/**
 * The four Carcass Front Exploration Tables.
 *
 * A Carcass Front campaign replaces the rulebook's Exploration Step wholesale:
 * *"you must use the Carcass Front Exploration Tables at the end of this book,
 * instead of the ones in the Trench Crusade Rulebook"*. Three things change
 * with them, and every one of them is a rule a player would otherwise get
 * wrong by carrying a habit over from a standard campaign:
 *
 *   - **The tables are chosen by Resource, not by rarity.** Favour 👁, Relics
 *     🏺, Supplies 📦 and Territories 🌍 — you roll on whichever corresponds to
 *     a Resource available in the zone the game was played in, rather than on
 *     a Common/Rare/Legendary table your games-played band unlocks.
 *   - **The rows are ranges.** *"The rolls for the Locations on the Carcass
 *     Front Exploration Tables produce a range rather than a single number
 *     (e.g. '1-3'). A Location is discovered if the Exploration Roll
 *     corresponds to any number in the range."* The rulebook's tables are
 *     sparse single numbers where a roll that is not listed finds nothing;
 *     these are contiguous and always find something.
 *   - **The dice pool is 3D6 and does not grow with games played**, and loot is
 *     the roll times **five**, not ten. Both live with the campaign parser,
 *     because both are rules about the Step rather than about these tables.
 *
 * ## Contiguity is the check that matters
 *
 * Each table's ranges run from 1 with no gap and no overlap, and the last is
 * open-ended (`34+`). That is what a table a player rolls on has to be, and it
 * is what catches a dropped row: a lost row leaves a hole, and a hole in a
 * contiguous table is a roll that silently finds nothing on a table where
 * every roll finds something.
 *
 * It is a real check rather than a row count, because the tables are not the
 * same length — Favour has twelve rows and the other three have thirteen,
 * since Favour prints `6-9` where the others print `6-8` and `9-11`.
 */
import fs from 'node:fs';
import { chapterLines, BOOK_TXT } from './cf-prose.mjs';
import { joinWrapped } from './dehyphenate.mjs';

/** `FAVOUR 👁 EXPLORATION TABLE` — the heading, with the Resource's glyph. */
const TABLE_HEADING = /^([A-Z]+)\s+(\S+)\s+EXPLORATION TABLE$/u;

/**
 * `1-3 \t Shaken: …`, `34+ \t Chosen Blessing: …` — a row, keyed by its range.
 *
 * Not `cf-prose`'s `CHART_ROW`, which was written for the Random Scenario
 * Generator's charts and matches a single number or a closed band only. Every
 * one of these four tables ends on an OPEN range, and with `CHART_ROW` all four
 * `34+` rows failed to match and were read as wrapped continuations of the row
 * above them — so `Patron's Visit` ended up carrying `Chosen Blessing`'s rules
 * on the end of its own, and the table stopped at 33.
 */
const ROW = /^(\d+(?:\s*-\s*\d+)?\+?)\s*\t(.*)$/;

/** `Roll \t Location` — the column header under each heading. */
const COLUMN_HEADER = /^Roll\s*\t\s*Location\s*$/;

/** `Shaken: After the horror of the fight…` — a row's Location name and rules. */
const LOCATION = /^([^:]{2,60}):\s+(\S.*)$/;

/**
 * The Resource each table is keyed by.
 *
 * The book's headings are plural for three of the four (`RELIC` is singular in
 * the heading and `Relics` in the prose), so the id is derived from the
 * heading and the glyph is carried beside it — the Campaign Tracker prints the
 * glyph, and a player matches on that rather than on the word.
 */
export const RESOURCES = ['favour', 'relic', 'supplies', 'territories'];

const clean = (parts) => parts.reduce((a, b) => joinWrapped(a, b), '').replace(/\s+/g, ' ').trim();

/** `1-3` -> `{ from: 1, to: 3 }`; `34+` -> `{ from: 34, to: null }`. */
function parseRange(text) {
  const open = /^(\d+)\s*\+$/.exec(text);
  if (open) return { from: Number(open[1]), to: null };
  const band = /^(\d+)\s*-\s*(\d+)$/.exec(text);
  if (band) return { from: Number(band[1]), to: Number(band[2]) };
  const one = /^(\d+)$/.exec(text);
  if (one) return { from: Number(one[1]), to: Number(one[1]) };
  return null;
}

/**
 * The Step's own two numbers, from the sentences that state them.
 *
 * Both were constants in `src/rules/campaign.ts` with the book cited beside
 * them, which is one rung short of rule 1: the citation was right and the
 * numbers were still typed. The book says each outright —
 *
 * > you start with an Exploration Dice Pool of **3D6**, and you gain additional
 * > Exploration Dice as rewards from the Campaign Tracker and for adding
 * > Buildings to your Camp
 *
 * > …and collects loot equal to their **Exploration Roll × 5** in 👑.
 *
 * — so they are read, and a wording that stops saying it fails the build rather
 * than leaving a stale number in place. The loot sentence appears four times,
 * once per game result, and all four must agree: a book that paid the Aggressor
 * and the opponent at different rates would be a rule this cannot express as
 * one number.
 */
export function parseCarcassFrontExplorationStep() {
  const text = fs.readFileSync(BOOK_TXT, 'utf8').replace(/\s+/g, ' ');

  const pool = /Exploration Dice Pool of (\d+)\s*D6/i.exec(text);
  if (!pool) {
    throw new Error(
      'parse-cf-exploration: the Carcass Front book no longer states the '
      + 'starting Exploration Dice Pool ("an Exploration Dice Pool of 3D6"). '
      + 'That pool does not grow with games played, so a default here would be '
      + "the rulebook's growing one, which pays a late campaign twice over.");
  }

  const rates = [...text.matchAll(/loot equal to their Exploration Roll\s*[×x*]\s*(\d+)/gi)]
    .map((m) => Number(m[1]));
  if (!rates.length) {
    throw new Error(
      'parse-cf-exploration: the Carcass Front book no longer states the loot '
      + 'rate ("loot equal to their Exploration Roll × 5"). The rulebook pays '
      + 'ten a point and this book pays five; a default would be wrong whichever '
      + 'way it fell.');
  }
  if (new Set(rates).size !== 1) {
    throw new Error(
      `parse-cf-exploration: the loot rate reads [${rates.join(', ')}] across the `
      + 'four game results, which do not agree. One of them has been misread, or '
      + 'the book now pays the Aggressor and the opponent differently.');
  }

  return { startingDice: Number(pool[1]), lootPerPoint: rates[0] };
}

/**
 * The four tables, keyed by Resource.
 *
 * @returns {Record<string, {resource: string, glyph: string, locations: object[]}>}
 */
export function parseCarcassFrontExploration() {
  const lines = chapterLines('Carcass Front Exploration Tables');

  /* ---- 1. find each table's heading ---- */
  const starts = [];
  lines.forEach((l, i) => {
    const m = TABLE_HEADING.exec(l);
    if (!m) return;
    if (!COLUMN_HEADER.test(lines[i + 1] ?? '')) {
      throw new Error(
        `parse-cf-exploration: "${l}" is not followed by its "Roll / Location" `
        + 'column header. The header is what says where the rows begin.');
    }
    starts.push({ resource: m[1].toLowerCase(), glyph: m[2], at: i + 1 });
  });

  if (starts.map((s) => s.resource).join(',') !== RESOURCES.join(',')) {
    throw new Error(
      `parse-cf-exploration: expected the ${RESOURCES.length} Resource tables `
      + `[${RESOURCES.join(', ')}] and read [${starts.map((s) => s.resource).join(', ')}]. `
      + 'A Carcass Front campaign has no other Exploration Tables to fall back on, '
      + 'so a missing one is a Resource a player can never cash in.');
  }

  /* ---- 2. read each table's rows ---- */
  const tables = {};
  starts.forEach((s, i) => {
    const body = lines.slice(s.at + 1, starts[i + 1] ? starts[i + 1].at - 1 : lines.length);

    const rows = [];
    for (const line of body) {
      const m = ROW.exec(line);
      const range = m && parseRange(m[1]);
      if (range) { rows.push({ roll: range, parts: [m[2]] }); continue; }
      // A wrapped line belongs to the row above it.
      if (rows.length) rows[rows.length - 1].parts.push(line);
    }

    tables[s.resource] = {
      resource: s.resource,
      glyph: s.glyph,
      locations: rows.map((r) => {
        const text = clean(r.parts);
        const named = LOCATION.exec(text);
        if (!named) {
          throw new Error(
            `parse-cf-exploration: the ${s.resource} row at ${r.roll.from} has no `
            + `"Name: rules" shape: "${text.slice(0, 70)}…". Every Location on `
            + 'every one of these tables is printed as one.');
        }
        return { roll: r.roll, name: named[1].trim(), description: named[2].trim() };
      }),
    };
  });

  checkContiguous(tables);
  return tables;
}

/**
 * Every table runs from 1 upwards with no gap, no overlap, and an open last row.
 *
 * The whole point of a range table is that every roll lands somewhere. A gap
 * would be a roll that finds nothing on a table where the book says something
 * is always found — and that reads as bad luck, not as a bug.
 */
function checkContiguous(tables) {
  for (const [resource, t] of Object.entries(tables)) {
    if (!t.locations.length) {
      throw new Error(`parse-cf-exploration: the ${resource} table read no rows at all.`);
    }
    let next = 1;
    t.locations.forEach((l, i) => {
      if (l.roll.from !== next) {
        throw new Error(
          `parse-cf-exploration: the ${resource} table ${l.roll.from > next ? 'skips' : 'overlaps'} `
          + `at ${l.roll.from} (expected the row after ${next - 1} to start at ${next}): `
          + `"${l.name}". The ranges must cover every roll from 1 upwards.`);
      }
      const last = i === t.locations.length - 1;
      if (last && l.roll.to !== null) {
        throw new Error(
          `parse-cf-exploration: the ${resource} table's last row ("${l.name}") ends at `
          + `${l.roll.to} rather than being open-ended. An Exploration Roll can exceed it — `
          + 'the pool grows all campaign - and that roll would then find nothing.');
      }
      if (!last && l.roll.to === null) {
        throw new Error(
          `parse-cf-exploration: the ${resource} table has an open-ended range at `
          + `"${l.name}", which is not its last row. Everything under it is unreachable.`);
      }
      next = (l.roll.to ?? Infinity) + 1;
    });
  }
}
