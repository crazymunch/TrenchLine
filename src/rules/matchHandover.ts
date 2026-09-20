/**
 * What the post-battle wizard should already know about the game it follows.
 *
 * Reported after a live game, and confirmed in the code: *"everything the
 * player did in Play Mode has to be retyped, and where they do not retype it,
 * the defaults commit."*
 *
 * `PlayModeView.handleEndMatch` builds a full `BattleRecord` — the scenario,
 * every side and its Victory Points, the turn each was scored on, every
 * claimed Glorious Deed and who claimed it, the weather — writes it to the
 * Chronicle, and on the very next line opens `PostBattleWizardModal`, which
 * imports none of it. So the scenario dropdown defaulted to the first entry in
 * the list rather than the one just played, the result defaulted to Victory
 * whatever the score, the opponent was a free-text box, and *"did not take
 * part"* started unticked for every model although Play Mode knew exactly who
 * had been deployed. A model left in the Arsenal earned Experience unless the
 * player remembered to untick it.
 *
 * This is the handover: one value, derived from the record that already
 * exists, that the wizard opens on. Nothing here is new information — every
 * field was written to the Chronicle a line earlier.
 *
 * It is a rules module rather than a few lines in the component because the
 * result is a judgement (whose points count, and how coalitions change that)
 * and because the component is where this was lost in the first place.
 */
import type { BattleRecord, BattleSide } from '../types/battle';

export type MatchResult = 'Victory' | 'Defeat' | 'Draw';

/**
 * Glory for a Glorious Deed.
 *
 * Page 99, under **GLORY POINTS ☼**: *"Each time you carry out a Glorious Deed
 * in a campaign, your Warband gains 1 ☼."* Page 98 says the same from the
 * other side — carrying out a Deed *"does 4 things"*, the third of which is
 * *"You gain 1 ☼"*.
 *
 * Named rather than inlined because it is the whole of the book's between-game
 * Glory rule, and the app used to pay 3 for a win, 1 for a draw and 0 for a
 * loss — a scale the book does not have anywhere (RR-02). Skills, Glory Items
 * and some Locations award more; those are their own rules and are not this.
 */
export const GLORY_PER_DEED = 1;

export interface MatchHandover {
  /** The Chronicle record this game already produced. Links the two. */
  battleId: string;
  scenarioId: string;
  scenarioName: string;
  /** Read from the Victory Points, not asked for. */
  result: MatchResult;
  /** Every other side, for the opponent field. */
  opponentName: string;
  /** Models on the roster that were not on the table. */
  satOutUnitIds: string[];
  /** Glorious Deeds this side claimed, which is what the book scores Glory on. */
  deedsClaimed: number;
  /**
   * The models that performed at least one of them.
   *
   * *"Any ELITE model that performed at least one Glorious Deed gains a second
   * Experience Point"* (p.105). One entry per model however many Deeds it
   * took — the book says *at least one*, and a model that took three does not
   * earn three extra points. A Deed the side claimed without naming a model
   * contributes nothing here, which is the book's other case rather than a
   * gap: the step awards no second point for it, instead of picking a model.
   */
  deedUnitIds: string[];
  /**
   * The Glory those Deeds earned.
   *
   * The whole of the book's between-game Glory award, and the app invented a
   * result-based scale instead while the Deeds sat in the record written one
   * line earlier (RR-02).
   */
  gloryEarned: number;
  /** This side's Victory Points, and the best any opponent scored. */
  ownPoints: number;
  bestOpponentPoints: number;
}

/**
 * The points that decide this side's result.
 *
 * A coalition game is scored as a coalition — "the player with the fewest
 * Campaign Victory Points" is a side question, but winning the battle is not —
 * so where the record carries coalition totals and this side is in one, the
 * coalition's total is what counts. A side with no coalition falls back to its
 * own, which is also the every-side-for-itself case.
 */
const pointsFor = (battle: BattleRecord, side: BattleSide): number => {
  const total = side.coalition ? battle.coalitionTotals?.[side.coalition] : undefined;
  return typeof total === 'number' && Number.isFinite(total) ? total : side.vp;
};

/**
 * The starting point for the post-battle wizard, or `null`.
 *
 * `null` where there is no record or this warband was not in it — a one-off
 * game opened from somewhere else, say. The caller then opens the wizard as it
 * always did rather than being handed a fabricated match: nothing here guesses
 * a scenario or a result it was not told (rule 2).
 */
export function matchHandover(
  battle: BattleRecord | null | undefined,
  opts: {
    /** The player's own side, which is their warband's id in the record. */
    ownSideId: string;
    /** Every model on the roster. */
    rosterUnitIds: readonly string[];
    /** The models Play Mode had on the table. */
    deployedUnitIds: readonly string[];
  },
): MatchHandover | null {
  if (!battle) return null;

  const own = battle.sides.find((s) => s.id === opts.ownSideId);
  if (!own) return null;

  const ownPoints = pointsFor(battle, own);

  /*
    Every side that is not this one, and — in a coalition game — not an ally.
    An ally's points are already in this side's total, so counting them as an
    opponent's would make a coalition lose to itself.
  */
  const others = battle.sides.filter((s) => (
    s.id !== own.id && !(own.coalition && s.coalition === own.coalition)
  ));

  const bestOpponentPoints = others.length
    ? Math.max(...others.map((s) => pointsFor(battle, s)))
    : 0;

  /* A game with nobody else in it is not a victory; it is a record with one
     side, which the Chronicle allows and the campaign has no result for. */
  const result: MatchResult = others.length === 0
    ? 'Draw'
    : ownPoints > bestOpponentPoints ? 'Victory'
      : ownPoints < bestOpponentPoints ? 'Defeat'
        : 'Draw';

  const deployed = new Set(opts.deployedUnitIds);
  const ownDeeds = battle.deeds.filter((d) => d.sideId === own.id);
  const deeds = ownDeeds.length;

  /* Deduplicated, because the point is for having performed a Deed, not for
     each one. A record written before Deeds carried a model has none, and
     reports none rather than guessing from the name it does carry. */
  const deedUnitIds = [...new Set(
    ownDeeds.map((d) => d.unitId).filter((id): id is string => Boolean(id)),
  )];

  return {
    battleId: battle.id,
    scenarioId: battle.scenarioId,
    scenarioName: battle.scenarioName,
    result,
    opponentName: others.map((s) => s.name).join(', '),
    satOutUnitIds: opts.rosterUnitIds.filter((id) => !deployed.has(id)),
    deedsClaimed: deeds,
    deedUnitIds,
    gloryEarned: deeds * GLORY_PER_DEED,
    ownPoints,
    bestOpponentPoints,
  };
}
