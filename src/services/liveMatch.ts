import type { ActiveUnit } from '../types/warband';

/**
 * The board, as one device sends it and another draws it.
 *
 * LIVE-1. This module is the whole contract between host and watcher, and it
 * is a **snapshot**: what the board IS, not how it got there. That is the
 * decision `docs/LIVE-MODE.md` turns on — a watcher does not need the history,
 * so a dropped update is repaired by the next one and the ordering, replay and
 * idempotency machinery campaign sync needs never arises here.
 *
 * Pure on purpose. The interesting part is what crosses the wire and what does
 * not, and that deserves testing without a browser, a fetch or a store.
 */

/** One model, as a watcher sees it. */
export interface LiveUnit {
  id: string;
  /** The name the HOST uses for it. A watcher has no copy of their roster. */
  name: string;
  wounds: number;
  maxWounds: number;
  status: 'Active' | 'Downed' | 'Out of Action';
  blood: number;
  /** Uncapped, as the book prints it — see FEATURES.md on why the pools differ. */
  blessing: number;
  acted: boolean;
}

export interface LiveBoard {
  turn: number;
  /** Whose warband is on the table, for the watcher's heading. */
  warbandName: string;
  units: LiveUnit[];
}

/**
 * What a live board is allowed to carry, and nothing else.
 *
 * The temptation is to send the `ActiveUnit` array as it stands — it is right
 * there, and it would need no mapping. It is also the player's ROSTER: every
 * weapon, every advancement, every injury, the notes, the costs. A watcher
 * needs none of that to follow a game, and a mirror is a channel to people who
 * are not on this device.
 *
 * So the board is built field by field. Seven per model, and adding an eighth
 * is a deliberate edit here rather than something that arrives because
 * somebody added a column to the roster.
 */
export function boardFrom(
  turn: number,
  warbandName: string,
  units: ActiveUnit[],
): LiveBoard {
  return {
    turn,
    warbandName,
    units: units.map((u) => ({
      id: u.id,
      // The custom name where the player gave one, else the profile's.
      name: u.customName || u.profileSnapshot?.name || 'Unnamed',
      wounds: u.currentWounds,
      maxWounds: u.maxWounds,
      status: u.status,
      blood: u.bloodMarkers ?? 0,
      /* `?? 0` because Blessing is optional on the model: a roster saved
         before the pool existed has none, which is not the same as an error. */
      blessing: u.blessingMarkers ?? 0,
      acted: u.hasActedThisTurn,
    })),
  };
}

/**
 * Read a board back, refusing anything that is not one.
 *
 * The counterpart to `parseCampaign`, and under the same rule: a payload the
 * server returned that is not a board must FAIL rather than become an empty
 * table. A watcher shown "no models" cannot tell that from a wipe.
 */
export function parseBoard(raw: unknown): LiveBoard {
  const b = (raw ?? {}) as Record<string, unknown>;
  if (!Array.isArray(b.units)) throw new Error('that board has no models');

  return {
    turn: typeof b.turn === 'number' ? b.turn : 1,
    warbandName: typeof b.warbandName === 'string' ? b.warbandName : '',
    units: b.units.map((raw_u, i) => {
      const u = (raw_u ?? {}) as Record<string, unknown>;
      if (typeof u.id !== 'string' || !u.id) throw new Error(`model ${i} has no id`);
      return {
        id: u.id,
        name: typeof u.name === 'string' ? u.name : 'Unnamed',
        wounds: num(u.wounds, 0),
        maxWounds: num(u.maxWounds, 1),
        status: u.status === 'Downed' || u.status === 'Out of Action' ? u.status : 'Active',
        blood: num(u.blood, 0),
        blessing: num(u.blessing, 0),
        acted: u.acted === true,
      };
    }),
  };
}

const num = (v: unknown, fallback: number) =>
  (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/**
 * Has anything a watcher can see actually changed?
 *
 * The host coalesces its writes, and this is what stops a write happening at
 * all when nothing moved. Play Mode re-renders for reasons that never reach
 * the board — an opened popover, a keyword lookup, a dice roll — and a push
 * per render would be a write every few hundred milliseconds for a table
 * nobody is touching.
 *
 * A structural comparison rather than a hash: the board is small, and this
 * never has to be told which fields matter.
 */
export function boardChanged(a: LiveBoard | null, b: LiveBoard): boolean {
  if (!a) return true;
  return JSON.stringify(a) !== JSON.stringify(b);
}
