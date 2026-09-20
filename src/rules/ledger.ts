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

/**
 * The parts of a Warband the founding-pot migration reads.
 *
 * Wider than `Moneyed` because the decision needs the roster, the snapshots
 * and the allowance, not just the money.
 */
export type Mustered = Moneyed & Pick<Warband,
  'ducatLimit' | 'forceMode' | 'units' | 'snapshots' | 'chronicleLog'>;

/** A post-battle reason: proof the Warband has played, whatever its snapshots say. */
const PLAYED_REASONS: readonly LedgerReason[] = ['exploration', 'ransom', 'reinforcements'];

/**
 * Give a never-played campaign Warband the founding pot it was always shown.
 *
 * FD-05e makes the allowance and the Strongbox one account. A Warband founded
 * before that change has the allowance nowhere: the builder measured its
 * roster against `ducatLimit` and nothing was ever debited, so its Strongbox
 * opened at 0 while the builder printed a "remaining" figure that existed only
 * as an expression on screen. This books that figure.
 *
 * **Only for a Warband that has never played**, and the burden of proof is on
 * "never". Credit given wrongly is money a player did not earn, so anything
 * this cannot read as certainly-not-a-battle counts as a battle.
 *
 * So this migrates only a Warband that is positively a FRESH MUSTER: one
 * whose record carries no trace of a campaign at all. Anything else is left
 * alone and corrected by the player through the Strongbox setter, which books
 * a visible `admin-adjust`.
 *
 * Every one of these is evidence of a campaign, and any one of them is enough:
 *
 * - a ledger entry with a post-battle reason;
 * - a snapshot of type `post_battle`, or carrying a `matchId` or an
 *   `outcome`, or whose `type` is ABSENT. `WarbandSnapshot.type` is newer than
 *   the snapshots themselves, so an untyped one cannot be classified and is
 *   read as a battle rather than guessed past;
 * - a non-empty `chronicleLog`;
 * - Glory. The book earns it in battle — "☼ are earned by performing valorous
 *   deeds in battle" (Warbands, p.10) — so a balance means games played. The
 *   Papal States muster on 11 is the one exception and is simply not
 *   migrated, which costs it nothing it had;
 * - Ducats already in the Strongbox. Nothing credited a pre-FD-05e Warband
 *   but earnings and a hand-set balance, and neither is a fresh muster.
 *
 * **This is stricter than the ruling that commissioned it**, which said to
 * credit the allowance on top of whatever the Strongbox already held. A real
 * committed roster says otherwise:
 * `data-sources/fixtures/trenchline-roster/v0-ninefold-penance.json` is a v0
 * export with `ducatLimit: 1000`, three models costing 140, and **no
 * snapshots and no ledger at all** — so every structural test reads it as
 * never-played. It holds 85 Ducats and 2 Glory. A Warband that had never
 * played would hold 860 unspent, not 85, and would have no Glory; that roster
 * has been through a campaign whose record this format never kept. Under the
 * looser rule it would be handed roughly 860 Ducats it did not earn.
 *
 * Money credited wrongly is worse than money a player has to re-enter once,
 * so the doubt resolves against crediting.
 *
 * A Warband that HAS played keeps its balance and is given nothing — the rule
 * FD-05e states as "its opened balance stands, and the cost of its roster is
 * not re-charged". The reason is that the data cannot separate the founding
 * roster from hires made since (which never debited) or from the dead (whose
 * cost was spent and whose models are gone), so any computed credit would be a
 * guess, and this app does not guess money. Such a player corrects it once
 * through the Strongbox setter, which books a visible `admin-adjust`.
 *
 * Two entries, not one net figure, because the pair is the story: the
 * allowance arrived and the roster was bought. Anything the Strongbox already
 * held stays as its own entries, so nothing typed is lost.
 *
 * An over-budget draft goes negative by exactly its overspend. That is correct
 * and not a failure: the builder already prints it as over budget, and a hire
 * is refused while the balance cannot pay for it, which forces the trim first.
 *
 * **Idempotent**, because sync replays and this sits at the roster doors. The
 * marker is a `founding` entry carrying Ducats: a Warband founded after this
 * change has one from birth, and a #75-era `founding` row booking 0 Ducats is
 * not it.
 *
 * ## Why `before` is a separate argument
 *
 * This runs AFTER `openLedger` at the doors, so that the account exists and
 * carries whatever was typed into it before the founding pair is appended.
 * But `openLedger` **replaces** the ledger with a single `reconciliation`
 * entry — that is its whole shape — which destroys the `exploration`,
 * `ransom` and `reinforcements` rows that prove a Warband has played. Reading
 * the opened record would therefore declare a played Warband never-played
 * whenever its snapshots did not also say so, and credit it an allowance it
 * spent years ago.
 *
 * So the played question is asked of the record as it arrived, and the money
 * is booked on the opened one. Running the migration first instead is not an
 * option: `book` re-derives the totals from the ledger, so booking onto a
 * ledger that does not yet agree with the stored balance would discard that
 * balance.
 */
export function migrateFoundingPot<W extends Mustered>(
  warband: W,
  before: Mustered = warband,
  at?: string,
): W {
  /* Campaign force only: an unrestricted list holds no money to migrate. */
  if (warband.forceMode === 'unrestricted') return warband;

  const ledger = warband.ledger ?? [];
  if (ledger.some((e) => e.reason === 'founding' && (e.ducats ?? 0) > 0)) return warband;

  /* Asked of the record as it ARRIVED — see "Why `before` is a separate
     argument" above — and answered conservatively. */
  const arrived = before.ledger ?? [];
  const snapshots = before.snapshots ?? [];
  const campaigned = arrived.some((e) => PLAYED_REASONS.includes(e.reason))
    || ledger.some((e) => PLAYED_REASONS.includes(e.reason))
    || snapshots.some((snap) => snap.type === 'post_battle'
      || !!snap.matchId
      || !!snap.outcome
      /* Untyped: unclassifiable, so not provably a fresh muster. */
      || snap.type === undefined)
    || (before.chronicleLog?.length ?? 0) > 0
    || (before.gloryPoints ?? 0) > 0
    || (before.treasuryDucats ?? 0) > 0;
  if (campaigned) return warband;

  const allowance = warband.ducatLimit ?? 0;
  if (allowance <= 0) return warband;

  const units = warband.units ?? [];
  const rosterCost = units.reduce((sum, u) => sum + (u.totalCost ?? 0), 0);
  const when = at ?? new Date().toISOString();

  const credited = book(warband, {
    reason: 'founding',
    ducats: allowance,
    game: 1,
    note: 'Founding allowance, credited at migration.',
  }, when);

  return book(credited, {
    reason: 'quartermaster',
    ducats: -rosterCost,
    game: 1,
    note: `Roster at migration: ${units.length} model${units.length === 1 ? '' : 's'}, ${rosterCost} Ducats.`,
  }, when);
}
