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
  /**
   * The campaign `MatchRecord` this side's post-battle produced.
   *
   * A game has as many post-battles as it has rosters, and the record held
   * ONE id for the whole battle (FD-09b / RR-27) — so a second side got no
   * Trauma, no Experience and no Exploration, and nothing could say whether
   * it ever would. A side with no id here has not had its post-battle run;
   * that is what the Hub's unresolved list reads and what stops the same side
   * being offered twice.
   *
   * **On the side rather than in a map on the battle**, which is where FD-09
   * put it, for a reason that decides it: `Battle.sides` is a `Json` column,
   * so this reaches the cloud with the record it belongs to and needs no
   * migration — where a new top-level field would need a column, and a
   * per-side link that did not sync would have another device offering a
   * post-battle already run here, and counting it twice.
   */
  campaignMatchId?: string;
  /**
   * The models this side had on the table.
   *
   * Written from Play Mode's own deployment, so a post-battle run LATER — or
   * on another device — still knows who sat the game out, which decides who
   * earns Experience: "each ELITE model that took part in a game and
   * survived". Without it a post-battle opened from the Chronicle would have
   * to assume the whole roster played (FD-09b / RR-27).
   *
   * Absent on a record written before this, and on a placeholder side, which
   * has no roster to deploy.
   */
  deployedUnitIds?: string[];
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
  /**
   * The model that performed it, where the players named one.
   *
   * The book gives a model that performed at least one Glorious Deed a second
   * Experience Point (p.105), so this is what the post-battle step reads. A
   * Deed with no model is the whole side's, which the book allows.
   */
  unitId?: string;
  /** That model's name as it read on the night, copied in beside the id. */
  unitName?: string;
  /**
   * The turn it was claimed on, where the tracker recorded one.
   *
   * **It never was.** `battleFromMatch` was the only writer, and it put the
   * performer's name here, because `SideScore.completedDeeds` was a bare
   * string whose comment said "turn" and whose writer wrote a name. So every
   * record this app has produced carries a name in this field, and the
   * Chronicle printed *"…, turn Brother Aldric"*. The reader below moves such
   * a value to `unitName`, where it belongs; a value that really is a turn
   * stays one.
   */
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
  /**
   * The campaign `MatchRecord` this battle also produced, where there is one.
   *
   * @deprecated Read through `campaignMatchIds`. Kept because records already
   * written carry it, and it is the PRIMARY side's entry — the side whose
   * post-battle Play Mode opened when the match ended.
   */
  campaignMatchId?: string;
}

/**
 * Every side's `MatchRecord` id, however the record spells it.
 *
 * `campaignMatchId` was one id for the whole battle and is read as the
 * primary side's, so a record written before this keeps its link rather than
 * reading as a battle nobody resolved.
 */
export function matchIdsOf(
  battle: Pick<BattleRecord, 'sides' | 'campaignMatchId'>,
): Record<string, string> {
  const ids: Record<string, string> = {};
  for (const s of battle.sides) if (s.campaignMatchId) ids[s.id] = s.campaignMatchId;
  const primary = battle.sides[0]?.id;
  if (battle.campaignMatchId && primary && !ids[primary]) {
    ids[primary] = battle.campaignMatchId;
  }
  return ids;
}

/**
 * Sides with a roster of their own that have not had their post-battle run.
 *
 * A placeholder is excluded because it has no roster: there is no Trauma to
 * roll, no Experience to award and no Strongbox to pay.
 */
export function unresolvedSides(
  battle: Pick<BattleRecord, 'sides' | 'campaignMatchId'>,
): BattleSide[] {
  const ids = matchIdsOf(battle);
  return battle.sides.filter((s) => !s.wasPlaceholder && !ids[s.id]);
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
    ...(typeof v.campaignMatchId === 'string' && v.campaignMatchId
      ? { campaignMatchId: v.campaignMatchId } : {}),
    ...(Array.isArray(v.deployedUnitIds)
      ? { deployedUnitIds: v.deployedUnitIds.filter((x): x is string => typeof x === 'string') }
      : {}),
  };
};

/**
 * A turn is a number. Anything else in `turn` is a performer's name.
 *
 * Every record written before the `unitId` field existed carries the
 * performer there — see `DeedClaim.turn`. Rather than drop those or keep
 * printing them as turns, they are read back into `unitName`, which is what
 * the writer meant and what a reader of the Chronicle needs. The test is the
 * shape of the value, not a version flag, because the records are already out
 * there and carry no flag.
 */
const TURN_NUMBER = /^\d{1,3}$/;

const deed = (v: unknown): DeedClaim | null => {
  if (!isRecord(v) || typeof v.title !== 'string' || typeof v.sideId !== 'string') return null;
  const rawTurn = typeof v.turn === 'string' && v.turn ? v.turn : undefined;
  const misfiledName = rawTurn && !TURN_NUMBER.test(rawTurn) ? rawTurn : undefined;
  const unitName = typeof v.unitName === 'string' && v.unitName ? v.unitName : misfiledName;
  return {
    title: v.title,
    description: typeof v.description === 'string' ? v.description : '',
    sideId: v.sideId,
    sideName: typeof v.sideName === 'string' ? v.sideName : v.sideId,
    ...(typeof v.unitId === 'string' && v.unitId ? { unitId: v.unitId } : {}),
    ...(unitName ? { unitName } : {}),
    turn: misfiledName ? undefined : rawTurn,
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
