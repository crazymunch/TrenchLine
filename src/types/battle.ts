/**
 * A battle that happened, kept.
 *
 * Play Mode tracks a great deal during a game — what each side scored, which
 * turn they scored it on, who claimed each Glorious Deed, the weather, who was
 * even on the table — and until now **all of it was discarded when the match
 * ended**. The campaign's `MatchRecord` captured a date, a scenario, a
 * narrative and exactly one participant: the player's own warband.
 *
 * This is the record of the battle itself. It is deliberately NOT an extension
 * of `MatchRecord`:
 *
 *   - a battle happens whether or not there is a campaign, and a one-off game
 *     recorded nothing at all before;
 *   - `MatchRecord` is campaign-scoped and goes through cloud sync, so
 *     widening it puts new fields into a protocol that already has a merge
 *     rule to respect;
 *   - the two answer different questions. `MatchRecord` says what a battle did
 *     to a campaign. This says what happened in it.
 *
 * Where both exist they are linked by `campaignMatchId`.
 */

import type { CoalitionId } from '@/rules/coalitions';

/** One side of a battle, as it stood when the match ended. */
export interface BattleSide {
  /** The warband or placeholder-opponent id, as the match knew it. */
  id: string;
  /**
   * What they were called at the time, recorded rather than referenced.
   *
   * A name, not a lookup. Deleting a warband or forgetting a placeholder
   * opponent months later must not rewrite a battle already fought — the same
   * rule the campaign record follows for `opponentWarbandName`.
   */
  name: string;
  factionId: string;
  /** True where this side had no roster in the app. */
  wasPlaceholder: boolean;
  coalition?: CoalitionId;
  vp: number;
  /** Turn number -> points scored that turn. */
  turnScores: Record<number, number>;
}

/** A Glorious Deed, and who took it. */
export interface DeedClaim {
  title: string;
  /**
   * The Deed's printed text, copied in at the time.
   *
   * Copied on purpose. A Deed's description comes from the scenario in the
   * dataset, and the dataset is regenerated from upstream catalogues — so a
   * record that only stored a title would silently re-describe a past battle
   * whenever the wording changed upstream. What the players read on the night
   * is what the record keeps.
   */
  description: string;
  /** The side that claimed it. */
  sideId: string;
  sideName: string;
  /** The turn it was claimed on, where the tracker recorded one. */
  turn?: string;
}

export interface BattleRecord {
  version: 1;
  id: string;
  /** ISO timestamp of when the match ended. */
  endedAt: string;
  scenarioId: string;
  scenarioName: string;
  /** The turn the match ended on. */
  turns: number;
  sides: BattleSide[];
  deeds: DeedClaim[];
  /** Present only where the match was played as coalitions. */
  coalitionTotals?: Record<CoalitionId, number>;
  weather?: { name: string; effect: string };
  /** The campaign `MatchRecord` this battle also produced, where there is one. */
  campaignMatchId?: string;
}

export const BATTLE_VERSION = 1 as const;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const side = (v: unknown): BattleSide | null => {
  if (!isRecord(v) || typeof v.id !== 'string' || typeof v.name !== 'string') return null;
  return {
    id: v.id,
    name: v.name,
    factionId: typeof v.factionId === 'string' ? v.factionId : '',
    wasPlaceholder: v.wasPlaceholder === true,
    coalition: v.coalition === 'A' || v.coalition === 'B' ? v.coalition : undefined,
    vp: typeof v.vp === 'number' && Number.isFinite(v.vp) ? v.vp : 0,
    turnScores: isRecord(v.turnScores) ? v.turnScores as Record<number, number> : {},
  };
};

const deed = (v: unknown): DeedClaim | null => {
  if (!isRecord(v) || typeof v.title !== 'string' || typeof v.sideId !== 'string') return null;
  return {
    title: v.title,
    description: typeof v.description === 'string' ? v.description : '',
    sideId: v.sideId,
    sideName: typeof v.sideName === 'string' ? v.sideName : v.sideId,
    turn: typeof v.turn === 'string' ? v.turn : undefined,
  };
};

/**
 * Read one battle back, or `null`.
 *
 * A record with no sides is not a battle. Everything else is repaired to
 * something truthful rather than rejected, because a partial record of a game
 * that happened is worth more than none — but a side with no id could not be
 * shown or attributed, so it is dropped.
 */
export function parseBattle(raw: unknown): BattleRecord | null {
  if (!isRecord(raw) || raw.version !== BATTLE_VERSION) return null;
  if (typeof raw.id !== 'string') return null;

  const sides = (Array.isArray(raw.sides) ? raw.sides : [])
    .map(side).filter((s): s is BattleSide => s !== null);
  if (!sides.length) return null;

  const totals = isRecord(raw.coalitionTotals) ? raw.coalitionTotals : undefined;

  return {
    version: BATTLE_VERSION,
    id: raw.id,
    endedAt: typeof raw.endedAt === 'string' ? raw.endedAt : new Date(0).toISOString(),
    scenarioId: typeof raw.scenarioId === 'string' ? raw.scenarioId : '',
    scenarioName: typeof raw.scenarioName === 'string' ? raw.scenarioName : 'Unrecorded scenario',
    turns: typeof raw.turns === 'number' && raw.turns >= 1 ? raw.turns : 1,
    sides,
    deeds: (Array.isArray(raw.deeds) ? raw.deeds : [])
      .map(deed).filter((d): d is DeedClaim => d !== null),
    ...(totals && (typeof totals.A === 'number' || typeof totals.B === 'number')
      ? { coalitionTotals: {
          A: typeof totals.A === 'number' ? totals.A : 0,
          B: typeof totals.B === 'number' ? totals.B : 0,
        } }
      : {}),
    ...(isRecord(raw.weather) && typeof raw.weather.name === 'string'
      ? { weather: {
          name: raw.weather.name,
          effect: typeof raw.weather.effect === 'string' ? raw.weather.effect : '',
        } }
      : {}),
    ...(typeof raw.campaignMatchId === 'string'
      ? { campaignMatchId: raw.campaignMatchId } : {}),
  };
}

/**
 * The sides that won, which may be several.
 *
 * A list rather than a winner: a coalition victory has two, and a draw has
 * none. Picking one would invent a result the table did not reach.
 */
export function victors(b: BattleRecord): BattleSide[] {
  if (b.coalitionTotals) {
    const { A, B } = b.coalitionTotals;
    if (A === B) return [];
    const won: CoalitionId = A > B ? 'A' : 'B';
    return b.sides.filter((s) => s.coalition === won);
  }
  const best = Math.max(...b.sides.map((s) => s.vp));
  const top = b.sides.filter((s) => s.vp === best);
  // Everyone on the same score is a draw, not a field of winners.
  return top.length === b.sides.length ? [] : top;
}
