/**
 * Hell on Earth: generating a Weather Event.
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
 * Three things fall out of that and are easy to get wrong:
 *
 *   - **Every player rolls.** Two players produce two candidate Events, four
 *     produce four. One roll for the table is not the rule.
 *   - **The rolls are 2D6, so they are not uniform.** Rolling on the table with
 *     a flat 2-12 would make Traumatised Earth as likely as Grim and
 *     Indifferent, when the book makes it six times rarer.
 *   - **Who chooses is a rule, not a convention**, and it favours whoever is
 *     behind: fewest Campaign Victory Points decides. This does not decide it
 *     for them — the app cannot know the table's VP standings mid-campaign, and
 *     guessing would be worse than asking — but it says whose call it is.
 */
import type { WeatherEvent } from '@/types/catalogue';

export type Rng = () => number;

const d6 = (rng: Rng) => Math.floor(rng() * 6) + 1;

export interface WeatherRoll {
  /** Whose roll this is: the index of the player in the match. */
  player: number;
  dice: [number, number];
  total: number;
  /** The row that came up. Always defined — the table covers 2 to 12. */
  event: WeatherEvent;
}

/** One 2D6 roll on the table. */
export function rollWeather(events: WeatherEvent[], player: number, rng: Rng = Math.random): WeatherRoll {
  const dice: [number, number] = [d6(rng), d6(rng)];
  const total = dice[0] + dice[1];
  const event = events.find((e) => e.roll === total);
  if (!event) {
    // The parser guarantees 2-12, so this is a broken dataset rather than a
    // bad roll — and silently picking a neighbouring row would be inventing
    // weather, which is what this whole feature replaced.
    throw new Error(`weather: the table has no row for ${total}`);
  }
  return { player, dice, total, event };
}

/** Each player rolls, in seat order. */
export function rollWeatherForAll(
  events: WeatherEvent[],
  players: number,
  rng: Rng = Math.random,
): WeatherRoll[] {
  return Array.from({ length: Math.max(1, players) }, (_, i) => rollWeather(events, i, rng));
}

/**
 * Who picks which of the rolled Events applies.
 *
 * Returns the seat indices entitled to choose. Where several are tied on the
 * fewest Victory Points, or none has a recorded score, the book calls for a
 * roll-off — so they all come back and the app says so, rather than picking one.
 */
export function whoChooses(victoryPoints: (number | undefined)[]): {
  seats: number[];
  rollOff: boolean;
} {
  const scored = victoryPoints
    .map((vp, seat) => ({ vp, seat }))
    .filter((x): x is { vp: number; seat: number } => typeof x.vp === 'number');

  // A one-off game has no Campaign Victory Points at all: straight to a roll-off.
  if (scored.length < 2) {
    return { seats: victoryPoints.map((_, i) => i), rollOff: true };
  }

  const fewest = Math.min(...scored.map((x) => x.vp));
  const seats = scored.filter((x) => x.vp === fewest).map((x) => x.seat);
  return { seats, rollOff: seats.length > 1 };
}

/**
 * Smog Storm changes a rule the attack calculator applies.
 *
 * "The Cover/Defended Obstacle Modifiers is -2 DICE instead of -1 DICE."
 *
 * Detected by the event's own name because that is what the dataset carries;
 * the app has no rules engine that could read the sentence. Deliberately narrow
 * — one named event, one modifier — rather than a general effect parser that
 * would quietly mis-apply the ten it could not really read.
 */
export const SMOG_STORM = 'Smog Storm';

export function coverDice(activeWeather: WeatherEvent | null | undefined): -1 | -2 {
  return activeWeather?.name === SMOG_STORM ? -2 : -1;
}
