/**
 * The part of a match that must survive a reload.
 *
 * Play Mode holds its whole state in `useState`, which means a reload — or a
 * backgrounded tab the browser evicts, which phones do routinely — loses every
 * Victory Point, every claimed Glorious Deed and the list of who is even in
 * the match. Wounds and markers survive only because those are written into
 * the warband; nothing else was.
 *
 * **Half of that state must NOT be saved**, and the split is the whole design
 * here. Which panel is open, which filter is selected, whether the attack
 * calculator is up — restoring those puts a player back inside a modal they
 * closed, in a match they only wanted to glance at. What persists is the
 * RECORD of the game; what does not is the view onto it.
 */

import type { WeatherRoll } from './weather';
import type { CoalitionMap, CoalitionId } from './coalitions';
import type { WeatherEvent } from '@/types/catalogue';

/** A side's running score. Keyed by warband or placeholder-opponent id. */
export interface SideScore {
  vp: number;
  /** Deed title -> the turn it was claimed on. */
  completedDeeds: Record<string, string>;
  /** Turn number -> points scored that turn. */
  turnScores: Record<number, number>;
}

/*
  The real types, imported rather than restated.

  A looser local shape would type-check and then quietly drop `dice` and
  `total` on restore — a weather roll that shows its result but not what was
  rolled for it. The types live in `rules/weather.ts`; this module is about
  persistence, not about redescribing them.
*/

/** Everything a match needs to be resumed exactly where it was left. */
export interface SavedMatch {
  version: 1;
  /** When it was last written, so a caller can say how old a resumed match is. */
  savedAt: string;
  isMatchActive: boolean;
  matchMode: 'single-device' | 'multiplayer-live';
  matchWarbandIds: string[];
  activePlayerIndex: number;
  selectedScenarioId: string;
  playTurn: number;
  scores: Record<string, SideScore>;
  deployedUnitIds: Record<string, string[]>;
  environmentalHazard: string;
  weatherRolls: WeatherRoll[];
  activeWeather: WeatherEvent | null;
  /**
   * Which side fights for which coalition, where the match is a team game.
   *
   * Empty for a straight free-for-all, which is most matches — so its absence
   * is the normal case rather than missing data.
   */
  coalitions: CoalitionMap;
}

export const MATCH_VERSION = 1 as const;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

const isWeatherEvent = (v: unknown): v is WeatherEvent =>
  isRecord(v) && typeof v.roll === 'number' && typeof v.name === 'string'
  && typeof v.flavour === 'string' && typeof v.effect === 'string';

/* Only 'A' and 'B' survive. A tag of 'C' would put a side in a coalition
   nothing totals, so it is dropped rather than carried as a third team the
   scoreboard does not know about. */
const coalitionMap = (v: Record<string, unknown>): CoalitionMap => {
  const out: CoalitionMap = {};
  for (const [id, tag] of Object.entries(v)) {
    if (tag === 'A' || tag === 'B') out[id] = tag as CoalitionId;
  }
  return out;
};

const score = (v: unknown): SideScore => {
  const r = isRecord(v) ? v : {};
  return {
    vp: typeof r.vp === 'number' && Number.isFinite(r.vp) ? r.vp : 0,
    completedDeeds: isRecord(r.completedDeeds) ? r.completedDeeds as Record<string, string> : {},
    turnScores: isRecord(r.turnScores) ? r.turnScores as Record<number, number> : {},
  };
};

/**
 * Read a saved match, or `null`.
 *
 * Every field is checked rather than trusted. This is read from
 * `localStorage`, which a user can edit, an extension can corrupt and a
 * half-completed write can truncate — and a match that restores as
 * `undefined` VP silently scores the rest of the game wrong, which is worse
 * than not restoring at all.
 *
 * A version it does not recognise returns `null`: a future shape read as this
 * one would be a scorecard that is quietly the wrong game.
 */
export function parseSavedMatch(raw: unknown): SavedMatch | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== MATCH_VERSION) return null;

  const scores: Record<string, SideScore> = {};
  if (isRecord(raw.scores)) {
    for (const [id, v] of Object.entries(raw.scores)) scores[id] = score(v);
  }

  const deployed: Record<string, string[]> = {};
  if (isRecord(raw.deployedUnitIds)) {
    for (const [id, v] of Object.entries(raw.deployedUnitIds)) deployed[id] = strings(v);
  }

  const ids = strings(raw.matchWarbandIds);
  const idx = typeof raw.activePlayerIndex === 'number' ? raw.activePlayerIndex : 0;

  return {
    version: MATCH_VERSION,
    savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : new Date(0).toISOString(),
    isMatchActive: raw.isMatchActive === true,
    matchMode: raw.matchMode === 'multiplayer-live' ? 'multiplayer-live' : 'single-device',
    matchWarbandIds: ids,
    /* Clamped into the list it indexes. A stored index past the end — a side
       removed on another device, a truncated write — would otherwise leave the
       match with no viewable player at all. */
    activePlayerIndex: ids.length ? Math.min(Math.max(idx, 0), ids.length - 1) : 0,
    selectedScenarioId: typeof raw.selectedScenarioId === 'string'
      ? raw.selectedScenarioId : 'claim-no-mans-land',
    playTurn: typeof raw.playTurn === 'number' && raw.playTurn >= 1 ? raw.playTurn : 1,
    scores,
    deployedUnitIds: deployed,
    environmentalHazard: typeof raw.environmentalHazard === 'string' ? raw.environmentalHazard : '',
    /* Every field checked, because a roll missing `dice` renders a weather
       result with no roll behind it — a number the app would be asserting
       rather than reporting. */
    weatherRolls: Array.isArray(raw.weatherRolls)
      ? raw.weatherRolls.filter((w): w is WeatherRoll =>
          isRecord(w) && typeof w.player === 'number'
          && Array.isArray(w.dice) && w.dice.length === 2
          && typeof w.total === 'number' && isWeatherEvent(w.event))
      : [],
    activeWeather: isWeatherEvent(raw.activeWeather) ? raw.activeWeather : null,
    coalitions: isRecord(raw.coalitions) ? coalitionMap(raw.coalitions) : {},
  };
}

/**
 * Whether a saved match is worth restoring at all.
 *
 * An empty match is not: it would put a player into a lobby they never set up,
 * and — worse — a save written before the restore had run would overwrite a
 * real match with nothing. The caller's ordering guards that too, and this is
 * the second lock on the same door.
 */
export function isRestorable(m: SavedMatch | null): m is SavedMatch {
  if (!m) return false;
  return m.matchWarbandIds.length > 0;
}

/** How long ago it was saved, for telling a player what they are resuming. */
export function savedAgo(m: SavedMatch, now: Date = new Date()): string {
  const ms = now.getTime() - new Date(m.savedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
