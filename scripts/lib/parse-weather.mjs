/**
 * Hell on Earth: Trench Crusade Weather Events.
 *
 * An optional module the game publishes, and the real thing the app's invented
 * weather was standing in for. Twenty-three fabricated "conditions" were
 * deleted in favour of nothing at all, because nothing was better than made-up
 * rules; this is what actually exists.
 *
 * The procedure, verbatim:
 *
 *   "After the battlefield has been set up but before players have Deployed any
 *   models, each player rolls 2D6 on the Weather Event Table below. In a
 *   campaign, the player with the fewest Campaign Victory Points decides which
 *   of the rolled Weather Events to apply for the remainder of the battle. If
 *   all players have the same number of Campaign Victory Points, or you are
 *   playing a one-off game, simply roll-off, with the winner deciding which
 *   rolled Weather Event to apply for the battle."
 *
 * The table is eleven rows on 2D6, and the extraction is clean: a roll on its
 * own tab-delimited line, then the event's name, then a line of flavour, then
 * the rule. Parsed strictly — the rolls must run 2 to 12 with no gaps — because
 * a table read half-right would hand a player an effect the book does not have,
 * which is the failure this whole area exists to correct.
 */
import fs from 'node:fs';
import { toLines } from './lines.mjs';

export const WEATHER_TXT =
  'data-sources/rulebook/extracted/hell-on-earth-weather-events.txt';

/** `2 \tTraumatised Earth` — the roll, a tab, the event's name. */
const ROW = /^(\d{1,2})\s*\t\s*(.+?)\s*$/;

const PAGE_BREAK = /^-- \d+ of \d+ --$/;

/** The lowest and highest results on 2D6. The table has a row for each. */
export const MIN_ROLL = 2;
export const MAX_ROLL = 12;

/*
  Page furniture. The running foot repeats the document's own title, and a bare
  page number sits on its own line; neither is part of a rule, and both would
  otherwise be glued onto the end of whichever effect they followed.
*/
const NOISE = [
  /^Hell on Earth: Trench Crusade Weather Events\s*$/,
  /^Weather Events Table$/,
  /^Roll \(2D6\)\s*\t/,
  /^\d{1,3}$/,
];

export function parseWeatherEvents(file = WEATHER_TXT) {
  if (!fs.existsSync(file)) {
    throw new Error(
      `${file} not found. Extract it first: `
      + 'npm run rules:extract -- data-sources/rulebook/hell-on-earth-weather-events.pdf '
      + `${file}`);
  }

  const lines = toLines(fs.readFileSync(file, 'utf8'))
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l && !PAGE_BREAK.test(l) && !NOISE.some((n) => n.test(l)));

  /* ---- 1. the procedure, which is the paragraph before the table ---- */
  const tableAt = lines.findIndex((l) => {
    const m = l.match(ROW);
    return m && Number(m[1]) === MIN_ROLL;
  });
  if (tableAt === -1) throw new Error('parse-weather: the Weather Events Table did not parse');

  /*
    The intro runs from the document's own subtitle to the table. Kept whole and
    verbatim rather than summarised: it carries who decides which Event applies,
    and that is a rule players will disagree about.
  */
  const introFrom = lines.findIndex((l) => /^All of Creation reels/.test(l));
  const procedure = introFrom === -1
    ? ''
    : lines.slice(introFrom, tableAt).join(' ').replace(/\s+/g, ' ').trim();

  /* ---- 2. the rows ---- */
  const starts = [];
  for (let i = tableAt; i < lines.length; i++) {
    const m = lines[i].match(ROW);
    if (!m) continue;
    const roll = Number(m[1]);
    if (roll < MIN_ROLL || roll > MAX_ROLL) continue;
    starts.push({ roll, name: m[2].trim(), at: i });
  }

  // 2 through 12 with no gaps and nothing repeated. Anything else means the
  // shape matched something that is not a row.
  const expected = Array.from({ length: MAX_ROLL - MIN_ROLL + 1 }, (_, i) => MIN_ROLL + i);
  if (starts.length !== expected.length || starts.some((s, i) => s.roll !== expected[i])) {
    throw new Error(
      `parse-weather: expected rolls ${MIN_ROLL}-${MAX_ROLL}, read `
      + `[${starts.map((s) => s.roll).join(', ')}]`);
  }

  const events = starts.map((s, i) => {
    const body = lines.slice(s.at + 1, starts[i + 1]?.at ?? lines.length);
    /*
      The first line under the name is flavour, the rest is the rule. The book
      sets them differently and only the second is playable, so they stay apart
      — a UI that ran them together would print "Something truly awful happened
      here. Warbands add -1 DICE to Morale Checks" as one instruction.
    */
    const [flavour, ...rule] = body;
    return {
      roll: s.roll,
      name: s.name,
      flavour: (flavour ?? '').trim(),
      // The extractor hard-wraps at the column width and hyphenates across the
      // break ("BLOOD MARK-\nERS"); rejoin both.
      effect: rule.join(' ').replace(/-\s+(?=[A-Z])/g, '').replace(/\s+/g, ' ').trim(),
    };
  });

  return { procedure, events };
}
