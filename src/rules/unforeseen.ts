/**
 * A scenario's Unforeseen Events table.
 *
 * This is the game's only published battlefield-conditions table, and it
 * belongs to one scenario — Hunt for Heroes — rather than to the game:
 *
 *   "At the start of each Turn after the first, one of the players must roll a
 *   D6. On a roll of 1-4 nothing happens, but on a 5 or 6, an Unforeseen Event
 *   takes place (do not roll again to see if any further Unforeseen Events take
 *   place). Roll D3 and look up the roll on the table below to see what
 *   happens."
 *
 *      1  Rising Fog
 *      2  Rain, Mud, and Guts
 *      3  Deep Craters
 *
 * It replaces two invented tables. The Codex's Mission Generator carried six
 * weather conditions and six "complications" — Toxic Mustard Fog, Desecrated
 * Blood Well, Mutated No Man's Land Scavengers — that appear nowhere in the
 * sources, and Play Mode's lobby offered five more of the same. They gave
 * themselves away on their own vocabulary: they deal "Poison wounds" and "D3
 * wounds", act "at the end of each battle round", impose "-1 Morale", and hand
 * out an advantage to "the player who wins priority in Turn 1". Trench Crusade
 * has no wounds, no battle rounds, no Morale characteristic and no priority —
 * it has BLOOD MARKERS, Turns, Morale Checks and the Initiative.
 *
 * So: the real table, from the scenario that prints it, and nothing offered for
 * the eleven scenarios that do not have one.
 */

export interface UnforeseenEvent {
  /** The D3 roll that selects it. */
  roll: number;
  name: string;
  /** The rule, verbatim. */
  effect: string;
}

/*
  The extraction runs the table's rows together into one paragraph, so the rows
  are found by their own shape: a digit, then a Title Case name, then a colon.
  Anchored on the digit being at a word boundary and the name being short, so a
  "2" inside a rule's own text ("within 2” of a terrain piece") cannot start a
  phantom row.
*/
const ROW = /(?:^|\s)([1-6])\s+([A-Z][A-Za-z'’,\- ]{2,40}?):\s/g;

export function parseUnforeseenEvents(section: string | null | undefined): UnforeseenEvent[] {
  const body = (section ?? '').replace(/\*\*/g, '');
  if (!body.trim()) return [];

  const starts: { roll: number; name: string; from: number; textFrom: number }[] = [];
  ROW.lastIndex = 0;
  for (let m = ROW.exec(body); m; m = ROW.exec(body)) {
    starts.push({
      roll: Number(m[1]),
      name: m[2].trim(),
      from: m.index,
      textFrom: m.index + m[0].length,
    });
  }

  // The rolls have to run 1, 2, 3… A gap or a repeat means the shape matched
  // something that is not a table row, and a half-read table is worse than
  // none: it would offer the player an event the book does not have.
  if (!starts.length) return [];
  if (starts.some((s, i) => s.roll !== i + 1)) return [];

  return starts.map((s, i) => ({
    roll: s.roll,
    name: s.name,
    effect: body.slice(s.textFrom, starts[i + 1]?.from ?? body.length).trim(),
  }));
}

/** Roll the table: a D6 to see whether anything happens, then a D3 for what. */
export function rollUnforeseen(
  events: UnforeseenEvent[],
  rng: () => number = Math.random,
): { triggered: boolean; d6: number; d3?: number; event?: UnforeseenEvent } {
  const d6 = Math.floor(rng() * 6) + 1;
  // "On a roll of 1-4 nothing happens, but on a 5 or 6, an Unforeseen Event
  // takes place."
  if (d6 < 5 || !events.length) return { triggered: false, d6 };
  const d3 = Math.floor(rng() * 3) + 1;
  return { triggered: true, d6, d3, event: events.find((e) => e.roll === d3) };
}
