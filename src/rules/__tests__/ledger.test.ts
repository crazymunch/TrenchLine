import { describe, it, expect } from 'vitest';
import {
  book, bookAll, bookReinforcements, strongbox, reconciled, openLedger,
} from '@/rules/ledger';
import type { LedgerEntry } from '@/rules/campaign';

const wb = (over: Partial<{
  ledger: LedgerEntry[]; treasuryDucats: number; gloryPoints: number;
}> = {}) => ({
  ledger: undefined as LedgerEntry[] | undefined,
  treasuryDucats: 0,
  gloryPoints: 0,
  ...over,
});

describe('book', () => {
  it('appends the entry and derives the totals from it', () => {
    const w = book(wb(), { reason: 'exploration', ducats: 60, glory: 2 });
    expect(w.ledger).toHaveLength(1);
    expect(w.treasuryDucats).toBe(60);
    expect(w.gloryPoints).toBe(2);
    expect(reconciled(w)).toBe(true);
  });

  it('opens a drifted account on the BALANCE before booking onto it', () => {
    /*
      Which side wins when the ledger and the total disagree, and it is not
      the ledger.

      Every campaign warband the app has ever founded is in this state — the
      founding entry credited the whole allowance while `treasuryDucats: 0`
      was written beside it. The total is what the player has been looking at
      for the whole campaign, so that is what survives; the ledger is the
      record that was never kept. Trusting the entries instead would hand this
      warband 100 Ducats and take 899 away, which is precisely the migration
      nobody wants to wake up to.
    */
    const drifted = wb({
      ledger: [{ id: 'a', at: '2026-01-01T00:00:00Z', reason: 'founding', ducats: 100, glory: 0 }],
      treasuryDucats: 999,           // …disagrees with the ledger.
    });
    const w = book(drifted, { reason: 'sold', ducats: 23 });
    expect(w.treasuryDucats).toBe(1022);  // 999 + 23 — the balance, not the entries.
    expect(reconciled(w)).toBe(true);
  });

  it('cannot silently lose a balance by booking onto an unopened account', () => {
    /*
      The defect this caught for real: `book` derives the totals from the
      ledger, so a warband that reached a money path without passing a roster
      door — a test, a fixture, a caller written next year — had its whole
      Strongbox replaced by the movement just booked. Ten store tests failed
      on it at once.
    */
    const neverOpened = wb({ treasuryDucats: 140, gloryPoints: 4 });
    const w = book(neverOpened, { reason: 'exploration', ducats: 20 });
    expect(w.treasuryDucats).toBe(160);   // not 20
    expect(w.gloryPoints).toBe(4);        // not 0
  });

  it('refuses to book a movement of nothing', () => {
    const w = book(wb(), { reason: 'exploration', ducats: 0, glory: 0 });
    expect(w.ledger).toBeUndefined();
  });

  it('omits the optional fields rather than storing empties', () => {
    const [e] = book(wb(), { reason: 'sold', ducats: 5 }).ledger!;
    expect('note' in e).toBe(false);
    expect('game' in e).toBe(false);
    expect('byUserId' in e).toBe(false);
  });

  it('gives every entry a distinct id, even booked in the same millisecond', () => {
    const at = '2026-01-01T00:00:00Z';
    const w = bookAll(wb(), [
      { reason: 'sold', ducats: 5 },
      { reason: 'sold', ducats: 5 },
      { reason: 'sold', ducats: 5 },
    ], at);
    expect(new Set(w.ledger!.map((e) => e.id)).size).toBe(3);
  });
});

describe('bookReinforcements', () => {
  it('debits what is there, so the ledger says how much was spent', () => {
    const start = book(wb(), { reason: 'exploration', ducats: 140, glory: 3 });
    const w = bookReinforcements(start, { game: 2 });

    expect(strongbox(w).ducats).toBe(0);
    const last = w.ledger![w.ledger!.length - 1];
    expect(last.reason).toBe('reinforcements');
    expect(last.ducats).toBe(-140);   // not an assignment of 0
  });

  it('leaves Glory alone — the rule names Ducats', () => {
    const start = book(wb(), { reason: 'exploration', ducats: 140, glory: 3 });
    expect(strongbox(bookReinforcements(start)).glory).toBe(3);
  });

  it('books nothing when the Strongbox is already empty', () => {
    const start = book(wb(), { reason: 'exploration', glory: 3 });
    expect(bookReinforcements(start).ledger).toHaveLength(1);
  });
});

describe('openLedger', () => {
  it('opens on the balance the warband actually has, moving no money', () => {
    const w = openLedger(wb({ treasuryDucats: 340, gloryPoints: 7 }));
    expect(w.treasuryDucats).toBe(340);
    expect(w.gloryPoints).toBe(7);
    expect(w.ledger).toHaveLength(1);
    expect(w.ledger![0].reason).toBe('reconciliation');
    expect(reconciled(w)).toBe(true);
  });

  it('replaces the founding entry that contradicted the total, and keeps its fact', () => {
    /*
      Exactly what `createWarband` writes for a campaign warband: the whole
      allowance credited on the ledger, zero in the total, on one object. The
      ledger said 700 and the app said 0 from the moment of founding.
    */
    const founded = wb({
      ledger: [{
        id: 'led-1', at: '2026-01-01T00:00:00Z', reason: 'founding',
        ducats: 700, glory: 11, game: 1, note: 'Starting allowance.',
      }],
      treasuryDucats: 0,
      gloryPoints: 11,
    });
    expect(reconciled(founded)).toBe(false);   // the state every such warband is in

    const w = openLedger(founded);
    expect(w.treasuryDucats).toBe(0);          // …and no balance moves.
    expect(w.gloryPoints).toBe(11);
    expect(w.ledger).toHaveLength(1);
    expect(w.ledger![0].note).toContain('700 Ducats');
    expect(w.ledger![0].note).toContain('11 Glory');
  });

  it('is idempotent — a reconciled ledger is returned untouched', () => {
    const once = openLedger(wb({ treasuryDucats: 340 }));
    expect(openLedger(once)).toBe(once);
  });

  it('leaves a warband holding nothing alone — there is nothing to record', () => {
    /*
      A warband with an empty Strongbox is already reconciled, so it needs
      neither an opening entry nor an empty array bolted on. Writing one would
      also change the shape of every roster file that has no ledger, which the
      round-trip test in `rosterFile.test.ts` is entitled to object to.
    */
    const broke = wb({ treasuryDucats: 0, gloryPoints: 0 });
    expect(openLedger(broke)).toBe(broke);
    expect(openLedger(wb({ ledger: [], treasuryDucats: 0 }))).toHaveProperty('ledger', []);
  });
});

/**
 * The invariant, asserted against the store rather than the rules module.
 *
 * `reconciled()` is cheap and total, so it can be checked after every money
 * path rather than reasoned about. If one of them ever assigns a total
 * instead of booking a movement, this is what says so — including a path
 * written years from now by somebody who has not read `ledger.ts`.
 */
describe('every money path leaves the warband reconciled', () => {
  it('holds after a buy, a sale and a hand-set balance', async () => {
    const { useStore } = await import('@/store/useStore');
    const w = useStore.getState().createWarband('Ledger Test', 'new-antioch', 700, 'campaign');
    const at = () => useStore.getState().warbands.find((x) => x.id === w.id)!;

    expect(reconciled(at())).toBe(true);

    useStore.getState().updateWarbandTreasury(w.id, 300);
    expect(at().treasuryDucats).toBe(300);
    expect(reconciled(at())).toBe(true);

    useStore.getState().buyToStash(w.id, {
      id: 'i1', name: 'Gas Mask', type: 'Equipment', cost: 45,
    });
    expect(at().treasuryDucats).toBe(255);
    expect(reconciled(at())).toBe(true);

    useStore.getState().sellFromStash(w.id, 'i1');
    expect(at().treasuryDucats).toBe(278);   // +23, half of 45 rounded up
    expect(reconciled(at())).toBe(true);

    useStore.getState().updateWarbandGlory(w.id, 6);
    expect(at().gloryPoints).toBe(6);
    expect(reconciled(at())).toBe(true);

    /* And the history is there to read, which is the point of all of it. */
    const reasons = (at().ledger ?? []).map((e) => e.reason);
    expect(reasons).toEqual([
      'admin-adjust', 'quartermaster', 'sold', 'admin-adjust',
    ]);
  });
});

describe('founding a warband that starts with Glory', () => {
  it('credits it once, not twice', async () => {
    /*
      The Papal States Intervention Force musters on 11 Glory, and arrived
      holding 22.

      `createWarband` set `gloryPoints` on the object and then booked a
      founding movement for the same amount. `book` opens the account on
      whatever balance it finds before appending, so the 11 already sitting
      there became an opening entry and the founding entry added 11 more.
      Every warband whose starting Glory is zero — which is every Variant but
      this one — came out right, which is why the store tests were happy and
      an e2e muster was what noticed.
    */
    const { useStore } = await import('@/store/useStore');
    const w = useStore.getState().createWarband(
      'Swiss Guard', 'new-antioch', 500, 'campaign', { startingGlory: 11 },
    );

    expect(w.gloryPoints).toBe(11);
    expect(w.treasuryDucats).toBe(0);
    expect(reconciled(w)).toBe(true);
    expect(w.ledger).toHaveLength(1);
    expect(w.ledger![0].reason).toBe('founding');
    expect(w.ledger![0].glory).toBe(11);
    /* The allowance is a fact in the note, not Ducats the Warband holds. */
    expect(w.ledger![0].note).toContain('500');
    expect(w.ledger![0].ducats).toBe(0);
  });
});
