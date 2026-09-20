/**
 * Removing a model from the Roster, which is what the book actually says.
 *
 * Trauma Table, `11 Dead` (p.101):
 *
 * > The wound proved to be fatal. **Remove the model and its Battlekit from
 * > your Warband Roster.**
 *
 * And `12 Captured`, where the ransom goes unpaid:
 *
 * > If the ransom is not paid, the captured model is executed — **remove them
 * > from your Warband Roster.**
 *
 * The app set `isDead: true` and left the model where it was. A flag is not a
 * removal, and the difference is not cosmetic: a model in `warband.units` is
 * a model every reader has to remember to skip. Six of them did
 * (`promotionPool`, `eliteCount`, `reinforcementCost`, `earnsExperience`,
 * `rosterRos`, `rosterPresentation`); three did not, and each of those is a
 * rule getting the wrong answer —
 *
 * - the builder summed a dead model's Ducats into the Warband total, so a
 *   Warband that lost a Leader looked as expensive as one that had not;
 * - `toRoster` handed it to the legality engine, so it still satisfied the
 *   minimum that its faction requires;
 * - Play Mode deployed it, because the default is every model on the roster.
 *
 * Moving the model makes all nine correct without a filter, and makes the
 * tenth reader — the one nobody has written yet — correct by default. That is
 * the whole argument for doing it this way rather than adding a check.
 *
 * **Nothing is deleted.** The dead go to `warband.fallen`, because a
 * campaign's casualties are half of what its history means, and because
 * throwing away a player's models on their behalf is not a call the app gets
 * to make.
 */
import type { ActiveUnit, Warband } from '../types/warband';

/** A Warband with its dead moved out, and the models that moved. */
export interface RemovalResult {
  units: ActiveUnit[];
  fallen: ActiveUnit[];
  /** The models removed by this call, in roster order. Empty where none were. */
  removed: ActiveUnit[];
}

/**
 * Move the models named by `unitIds` out of `units` and into `fallen`.
 *
 * The Battlekit travels with the model: the book removes both, and the gear
 * does not come back to the Arsenal. So this moves the `ActiveUnit` whole
 * rather than stripping it.
 *
 * `isDead` is set on the way out. Nothing in the app reads it any more, but a
 * roster file written by this version is read by older ones too, and to those
 * the flag is the only thing that says this model is gone.
 *
 * Ids that name no model on the roster are ignored rather than reported: this
 * is called with the casualty list from a step that has already resolved what
 * happened, and a model that is not there is a model already removed.
 */
export function removeFromRoster(
  warband: Pick<Warband, 'units' | 'fallen'>,
  unitIds: readonly string[],
  opts: { diedInMatchId?: string } = {},
): RemovalResult {
  const doomed = new Set(unitIds);
  if (!doomed.size) {
    return {
      units: warband.units ?? [],
      fallen: warband.fallen ?? [],
      removed: [],
    };
  }

  const units: ActiveUnit[] = [];
  const removed: ActiveUnit[] = [];

  for (const u of warband.units ?? []) {
    if (!doomed.has(u.id)) { units.push(u); continue; }
    removed.push({
      ...u,
      isDead: true,
      ...(opts.diedInMatchId ? { diedInMatchId: opts.diedInMatchId } : {}),
      /*
        Battle state does not survive the model: one showing three Blood
        Markers and a half-empty wound track reads as a model still in a game,
        which is the one thing it certainly is not.

        Cleared only where the model HAS it. A roster file carries no battle
        state at all — `rosterFile.ts` classifies those fields `live` and
        drops them — so writing them here would put back, on the one model
        that can never need them, exactly what the format strips from every
        other.
      */
      ...('currentWounds' in u ? { currentWounds: u.maxWounds } : {}),
      ...('bloodMarkers' in u ? { bloodMarkers: 0 } : {}),
      ...('status' in u ? { status: 'Out of Action' as const } : {}),
      ...('hasActedThisTurn' in u ? { hasActedThisTurn: false } : {}),
    });
  }

  return { units, fallen: [...(warband.fallen ?? []), ...removed], removed };
}

/**
 * Bring a roster written before `fallen` existed up to date.
 *
 * Such a file carries dead models in `units` behind `isDead: true`, which is
 * exactly the state this change exists to end. Run on load, so a roster
 * imported, restored or pulled from the cloud arrives in one shape rather
 * than two.
 *
 * It is deliberately not a version check. The flag itself is the evidence —
 * a file at any `schemaVersion` either has a dead model in `units` or it does
 * not, and reading the data is more reliable than trusting a number that an
 * older writer may not have bumped. It is also idempotent: run twice, the
 * second pass finds nothing to move.
 *
 * No `diedInMatchId` is invented. Those files do not record which battle it
 * was, and a memorial naming the wrong game is worse than one naming none.
 */
export function migrateFallen<W extends Pick<Warband, 'units' | 'fallen'>>(warband: W): W {
  const dead = (warband.units ?? []).filter((u) => u.isDead);
  if (!dead.length) return warband;

  const { units, fallen } = removeFromRoster(warband, dead.map((u) => u.id));
  return { ...warband, units, fallen };
}

/** Every model the Warband has lost, oldest first. Empty where it has lost none. */
export const fallenOf = (warband: Pick<Warband, 'fallen'> | null | undefined): ActiveUnit[] =>
  warband?.fallen ?? [];
