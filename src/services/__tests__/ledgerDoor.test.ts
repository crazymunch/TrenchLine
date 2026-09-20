import { describe, it, expect, beforeEach } from 'vitest';
import { decodeRosterFile, encodeRosterFile, durableWarband } from '../rosterFile';
import { reconciled, strongbox } from '@/rules/ledger';
import type { Warband } from '@/types/warband';

/**
 * The migration runs at BOTH doors a roster can come through.
 *
 * FD-05a learned this one the hard way: its design said
 * `storage.getWarbands` was "the one place a roster enters the app", and it
 * is not — `decodeRosterFile` is a second door, and a roster imported from a
 * file skips the first entirely.
 *
 * Worth a test of its own because removing either call breaks nothing that
 * anyone notices. `book` opens the account on the way past, so the BALANCE
 * stays right and only the RECORD is wrong — which is the exact failure this
 * change exists to end, and exactly the kind that hides. Deleting the
 * `openLedger` from `storage.ts` failed no test in the suite until this one.
 */

/** What `createWarband` wrote for every campaign warband before this change. */
const unreconciled = (): Warband => ({
  id: 'wb-old',
  name: 'The Unreconciled',
  factionId: 'new-antioch',
  forceMode: 'campaign',
  ducatLimit: 700,
  /* The ledger says 700 … */
  ledger: [{
    id: 'led-old', at: '2026-01-01T00:00:00Z', reason: 'founding',
    ducats: 700, glory: 0, game: 1, note: 'Starting allowance.',
  }],
  /* … and the Strongbox says 340. Both written by the same function, on the
     same object, and they have disagreed since the moment of founding. */
  treasuryDucats: 340,
  gloryPoints: 2,
  units: [],
  armoryStash: [],
  snapshots: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
} as unknown as Warband);

/*
  A minimal browser, because `storage` reads the real one and this
  environment has none. `window` matters as much as `localStorage`:
  `storage.ts` computes `isBrowser` once at module load and returns `[]`
  without reading anything when it is false — so the globals have to be in
  place BEFORE the module evaluates, which is why it is imported
  dynamically below rather than at the top of the file.
*/
const map = new Map<string, string>();
Object.defineProperty(globalThis, 'window', { configurable: true, value: globalThis });
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
  },
});
const loadStorage = async () => (await import('../storage')).storage;

describe('the storage door', () => {
  beforeEach(() => map.clear());

  it('opens the ledger on the balance, moving no money', async () => {
    localStorage.setItem('tc_warbands_v1', JSON.stringify([unreconciled()]));

    const [w] = (await loadStorage()).getWarbands();

    expect(w.treasuryDucats).toBe(340);      // unchanged — that is the point
    expect(w.gloryPoints).toBe(2);
    expect(reconciled(w)).toBe(true);
    expect(strongbox(w).ducats).toBe(340);   // …and the ledger now says so too
    expect(w.ledger).toHaveLength(1);
    expect(w.ledger![0].reason).toBe('reconciliation');
    /* The allowance survives as a fact about the muster, not as Ducats. */
    expect(w.ledger![0].note).toContain('700');
  });

  it('leaves an already-reconciled roster alone', async () => {
    const storage = await loadStorage();
    localStorage.setItem('tc_warbands_v1', JSON.stringify([unreconciled()]));
    const [first] = storage.getWarbands();

    localStorage.setItem('tc_warbands_v1', JSON.stringify([first]));
    const [again] = storage.getWarbands();

    expect(again.ledger).toEqual(first.ledger);
  });
});

describe('the roster-file door', () => {
  it('opens the ledger on an imported roster too', () => {
    const encoded = encodeRosterFile(unreconciled(), null, { exporterVersion: '0.0.0' });
    const decoded = decodeRosterFile(JSON.stringify(encoded));
    expect(decoded.ok).toBe(true);

    const roster = (decoded as { file: { roster: Warband } }).file.roster;
    expect(roster.treasuryDucats).toBe(340);
    expect(reconciled(roster)).toBe(true);
    expect(strongbox(roster).ducats).toBe(340);
    expect(roster.ledger![0].reason).toBe('reconciliation');
  });

  it('round-trips a reconciled roster without touching it', () => {
    const w = unreconciled();
    const opened = { ...w, ledger: [{
      id: 'led-1', at: '2026-01-01T00:00:00Z', reason: 'reconciliation' as const,
      ducats: 340, glory: 2, game: 1, note: 'Opening balance.',
    }] };
    const decoded = decodeRosterFile(
      JSON.stringify(encodeRosterFile(opened, null, { exporterVersion: '0.0.0' })));
    expect((decoded as { file: { roster: unknown } }).file.roster)
      .toEqual(durableWarband(opened));
  });
});
