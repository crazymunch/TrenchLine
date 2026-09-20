/**
 * The Strongbox is the sum of its ledger.
 *
 * Warbands of Trench Crusade, p.10, on the founding muster:
 *
 * > As you make your choices, subtract the cost of each choice from your
 * > starting amount of 👑. You can continue spending until you have bought
 * > everything you can, or decide to stop. **Any unspent 👑 are put into your
 * > Warband's Strongbox** (to represent your in-game treasury) and the 👑 can
 * > be used later or hoarded to buy something more expensive.
 *
 * So the Strongbox is a running account, not a field. The app stored it as a
 * field — `treasuryDucats` — and every movement was an arithmetic expression
 * written at the call site: `Math.max(0, w.treasuryDucats - item.cost)` in the
 * Quartermaster, `activeWb.treasuryDucats + ducatsGained - ransomsPaid` in the
 * post-battle step, `0` for Reinforcements. Seven such expressions, each its
 * own chance to be wrong, and FD-05c found three that were.
 *
 * A total that is only ever assigned cannot answer the two questions this
 * group asks it constantly: *where did that come from*, and *can I take it
 * back*. `reversible` was written to answer the second and had no caller,
 * because there were no entries to reverse.
 *
 * ## `treasuryDucats` stays, as a mirror
 *
 * It is a column in Postgres, a field in the roster file, and a number in 23
 * places in the UI. This change does not chase it out of any of them. What it
 * does is make `book` the **only** writer: the entry is the record and the
 * total is derived from it, in one function, so the two cannot drift. A guard
 * test asserts they agree for every warband the migration touches.
 *
 * That is the ledger being the authority. It is not the ledger being the only
 * storage, and the difference is worth naming rather than glossing.
 */
import type { LedgerEntry, LedgerReason } from './campaign';
import { strongboxOf } from './campaign';
import type { Warband } from '../types/warband';

/** The parts of a Warband this module reads and writes. */
export type Moneyed = Pick<Warband, 'ledger' | 'treasuryDucats' | 'gloryPoints'>;

/** A movement to book. Ducats and Glory are signed; a debit is negative. */
export interface Movement {
  reason: LedgerReason;
  ducats?: number;
  glory?: number;
  note?: string;
  /** The game this belongs to, so `reversible` can release a turn as a unit. */
  game?: number;
  byUserId?: string;
  byName?: string;
}

/** Ids are unique within a ledger, which is all `reversible` needs of them. */
let seq = 0;
const entryId = (at: string) => `led-${Date.parse(at) || 0}-${(seq += 1).toString(36)}`;

/**
 * Book a movement: append the entry, and re-derive the totals from the ledger.
 *
 * The totals are **not** adjusted by the movement — they are recomputed from
 * the whole ledger every time. Those are the same number when everything is
 * correct, and when they are not, recomputing is the one that self-heals.
 *
 * A movement of nothing is not booked. The post-battle step runs whether or
 * not there was loot, and an entry reading `+0 Ducats, +0 Glory` is noise in
 * the one record a player reads to find out where their money went.
 */
export function book<W extends Moneyed>(
  warband: W,
  movement: Movement,
  at: string = new Date().toISOString(),
): W {
  const ducats = movement.ducats ?? 0;
  const glory = movement.glory ?? 0;
  if (ducats === 0 && glory === 0) return warband;

  /*
    Open the account first, always.

    `book` derives the totals from the ledger, so booking onto a Warband that
    has no ledger would silently discard whatever it was holding — 140 Ducats
    become the 20 just earned. The roster doors open every Warband that comes
    through them, but a Warband can reach a money path without passing one
    (a test, a fixture, a future caller), and "it is correct as long as
    somebody else ran first" is not an invariant, it is a hope.

    `openLedger` is idempotent and returns an opened, reconciled Warband
    untouched, so this costs nothing in the ordinary case.
  */
  const opened = openLedger(warband, at);

  const entry: LedgerEntry = {
    id: entryId(at),
    at,
    reason: movement.reason,
    ducats,
    glory,
    ...(movement.note ? { note: movement.note } : {}),
    ...(movement.game !== undefined ? { game: movement.game } : {}),
    ...(movement.byUserId ? { byUserId: movement.byUserId } : {}),
    ...(movement.byName ? { byName: movement.byName } : {}),
  };

  const ledger = [...(opened.ledger ?? []), entry];
  const total = strongboxOf(ledger);
  return { ...opened, ledger, treasuryDucats: total.ducats, gloryPoints: total.glory };
}

/**
 * Book several movements as one, in order.
 *
 * The post-battle step moves money four ways in a single confirmation — loot,
 * Glory, ransoms, and Reinforcements emptying the box — and a player who
 * reverses it expects one game's worth to come back, not to undo four times.
 * `game` is what ties them together, so this is a convenience rather than a
 * transaction: it is `reduce`, and it exists so the call site reads as one act.
 */
export function bookAll<W extends Moneyed>(
  warband: W,
  movements: readonly Movement[],
  at: string = new Date().toISOString(),
): W {
  return movements.reduce((w, m) => book(w, m, at), warband);
}

/**
 * Empty the Strongbox, as Calling for Reinforcements requires.
 *
 * > Reduce the number of 👑 in your Strongbox to zero. They are used to pay for
 * > the new recruits.
 *
 * A debit of whatever is there rather than an assignment of zero, so the
 * ledger says how much was spent. Glory is untouched: the rule names 👑.
 */
export function bookReinforcements<W extends Moneyed>(
  warband: W,
  opts: { game?: number } = {},
  at?: string,
): W {
  const opened = openLedger(warband, at);
  const held = strongboxOf(opened.ledger ?? []).ducats;
  return book(opened, {
    reason: 'reinforcements',
    ducats: -held,
    note: 'Strongbox emptied to pay for new recruits.',
    ...(opts.game !== undefined ? { game: opts.game } : {}),
  }, at);
}

/** What the ledger says the Warband holds. */
export const strongbox = (warband: Pick<Moneyed, 'ledger'>): { ducats: number; glory: number } =>
  strongboxOf(warband.ledger ?? []);

/** Whether the stored totals agree with the ledger. The guard's question. */
export function reconciled(warband: Moneyed): boolean {
  const sum = strongboxOf(warband.ledger ?? []);
  return sum.ducats === (warband.treasuryDucats ?? 0)
    && sum.glory === (warband.gloryPoints ?? 0);
}

/**
 * Open the account, for a Warband that has been playing without one.
 *
 * Every Warband in the wild is in one of two states, and **neither has a
 * ledger that describes its money**:
 *
 * - founded before the ledger field existed, so `ledger` is absent entirely;
 * - founded after, so `ledger` holds a single `founding` entry crediting the
 *   whole starting allowance — while `treasuryDucats` was written `0` on the
 *   same object, by the same function, and nothing has debited the entry
 *   since. A Warband founded on 700 reports a Strongbox of 700 by its ledger
 *   and 0 by its total, and has done from the moment it was created.
 *
 * So this does not correct the ledger. It **opens** one: a single entry
 * carrying the balance the Warband actually has, after which every movement is
 * booked. That is not a rewrite of history — nothing has ever read these
 * entries, `strongboxOf` having had no caller until this change — it is the
 * first write to an account that was declared and never kept.
 *
 * Once the ledger is live this would be the wrong shape entirely, and a
 * correction would have to be an appended delta. It is right exactly once.
 *
 * **No balance moves.** The opening entry is the stored total, whatever that
 * is. A Warband that had 340 Ducats before this runs has 340 after it, and the
 * founding allowance the old entry named is kept in the note rather than in a
 * number, because it is a fact about the Warband and not a Ducat it holds.
 *
 * Idempotent: a ledger that already agrees with the totals is returned
 * untouched, so this can sit at the roster doors and run on every load.
 */
export function openLedger<W extends Moneyed>(warband: W, at?: string): W {
  /*
    Agreement is the whole test, and it is enough.

    A Warband holding nothing is reconciled whether its ledger is `[]` or
    absent — there is no movement to record either way — so it is returned
    untouched rather than given an empty array it does not need or a
    zero-valued row that reads like a transaction and is not one. A Warband
    holding something whose ledger does not say so is opened, whatever the
    ledger currently contains.
  */
  if (reconciled(warband)) return warband;

  const ducats = warband.treasuryDucats ?? 0;
  const glory = warband.gloryPoints ?? 0;

  /* The allowance the discarded entry named, kept as a sentence. */
  const founding = (warband.ledger ?? []).find((e) => e.reason === 'founding');
  const note = founding
    ? `Opening balance. Founded on ${founding.ducats} Ducats`
      + (founding.glory ? ` and ${founding.glory} Glory` : '')
      + '; movements before this version were not recorded.'
    : 'Opening balance. Movements before this version were not recorded.';

  const stamp = at ?? new Date().toISOString();
  /*
    Booked directly rather than through `book`, because `book` refuses a
    movement of nothing and a Warband with an empty Strongbox still needs an
    account opened — otherwise it is indistinguishable from one that has none
    and gets opened again on every load.
  */
  const entry: LedgerEntry = {
    id: entryId(stamp),
    at: stamp,
    reason: 'reconciliation',
    ducats,
    glory,
    note,
    game: 1,
  };

  return { ...warband, ledger: [entry], treasuryDucats: ducats, gloryPoints: glory };
}
