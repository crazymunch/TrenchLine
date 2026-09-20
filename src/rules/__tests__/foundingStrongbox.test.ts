/**
 * The founding allowance and the Strongbox are one pot.
 *
 * Warbands of Trench Crusade, p.10 (extract line 441), on the muster:
 *
 * > As you make your choices, subtract the cost of each choice from your
 * > starting amount of 👑. You can continue spending until you have bought
 * > everything you can, or decide to stop. **Any unspent 👑 are put into your
 * > Warband's Strongbox** (to represent your in-game treasury) and the 👑 can
 * > be used later or hoarded to buy something more expensive.
 *
 * One account, opened with the allowance and drawn down by each choice. The
 * app kept two: the builder measured the roster against `ducatLimit`, nothing
 * was ever debited, and the Strongbox opened at 0. A Warband founded on 700
 * that spent 620 held 0 where the book says 80 — and could not spend Ducats it
 * later earned, because the builder was not looking at that pot.
 *
 * The Quartermaster Step draws on the same account:
 *
 * > You can recruit models to your Warband in the Quartermaster Step in the
 * > same way as you did when you first created it.
 * >                        — Digital Rulebook (extract line 7219)
 * > If you have any 👑 in your Strongbox, you can spend them to purchase new
 * > Battlekit from your Warband's Armoury Tables
 * >                        — the same page (extract line 7228)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { strongbox, reconciled, openLedger, migrateFoundingPot } from '../ledger';
import type { Warband } from '@/types/warband';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return {
    ...actual,
    storage: { ...actual.storage, saveWarbands: vi.fn(), setActiveWarbandId: vi.fn() },
  };
});

const store = async () => (await import('@/store/useStore')).useStore;

beforeEach(async () => {
  (await store()).setState({ warbands: [], activeWarbandId: null });
});

describe('the founding muster', () => {
  it('puts the whole allowance in the Strongbox', async () => {
    const s = await store();
    const w = s.getState().createWarband('Muster', 'new-antioch', 700, 'campaign');
    expect(strongbox(w).ducats).toBe(700);
    expect(w.treasuryDucats).toBe(700);
    expect(reconciled(w)).toBe(true);
  });

  it('records it as one founding entry, naming the allowance', async () => {
    const s = await store();
    const w = s.getState().createWarband('Muster', 'new-antioch', 700, 'campaign');
    expect(w.ledger).toHaveLength(1);
    expect(w.ledger![0].reason).toBe('founding');
    expect(w.ledger![0].note).toContain('700');
  });

  /*
    An unrestricted Warband is for one-off games: the player sets its Ducats
    and Glory themselves and `ducatLimit` is a list cap they chose, not a
    treasury anyone issued. Crediting it would put a number in the Strongbox
    that means nothing and that the player is also setting by hand.
  */
  it('credits nothing to an unrestricted Warband, whose Ducats are the player’s', async () => {
    const s = await store();
    const w = s.getState().createWarband('One-off', 'new-antioch', 700, 'unrestricted');
    expect(strongbox(w).ducats).toBe(0);
    expect(w.treasuryDucats).toBe(0);
  });
});

describe('recruiting draws on the Strongbox', () => {
  /** A profile the store will find, priced so the arithmetic is legible. */
  const profile = (id: string, baseCost: number) => ({
    id,
    name: `Model ${id}`,
    factionId: 'new-antioch',
    category: 'Trooper' as const,
    baseCost,
    stats: { movement: '6"', ranged: '+0', melee: '+0', armour: '0' },
  });

  it('found on 700, recruit 620, hold 80', async () => {
    const s = await store();
    s.setState({ units: [profile('p-620', 620)] as never, weapons: [], armour: [] });
    const w = s.getState().createWarband('Muster', 'new-antioch', 700, 'campaign');

    s.getState().addUnitToWarband(w.id, 'p-620', 'The Expensive One');

    const after = s.getState().warbands.find((x) => x.id === w.id)!;
    expect(after.units).toHaveLength(1);
    expect(strongbox(after).ducats).toBe(80);
    expect(after.treasuryDucats).toBe(80);
    expect(reconciled(after)).toBe(true);
  });

  it('books the debit as quartermaster, naming the model', async () => {
    const s = await store();
    s.setState({ units: [profile('p-100', 100)] as never, weapons: [], armour: [] });
    const w = s.getState().createWarband('Muster', 'new-antioch', 700, 'campaign');
    s.getState().addUnitToWarband(w.id, 'p-100', 'Brother Anselm');

    const after = s.getState().warbands.find((x) => x.id === w.id)!;
    const last = after.ledger![after.ledger!.length - 1];
    expect(last.reason).toBe('quartermaster');
    expect(last.note).toContain('Brother Anselm');
  });

  /*
    The Quartermaster Step hires "in the same way as you did when you first
    created it", so a hire after the muster is the same debit on the same pot
    — there is no second code path to get wrong.
  */
  it('a later hire holds less by exactly its price', async () => {
    const s = await store();
    s.setState({ units: [profile('p-100', 100)] as never, weapons: [], armour: [] });
    const w = s.getState().createWarband('Muster', 'new-antioch', 700, 'campaign');

    s.getState().addUnitToWarband(w.id, 'p-100', 'First');
    const afterFirst = strongbox(s.getState().warbands.find((x) => x.id === w.id)!).ducats;
    s.getState().addUnitToWarband(w.id, 'p-100', 'Second');
    const afterSecond = strongbox(s.getState().warbands.find((x) => x.id === w.id)!).ducats;

    expect(afterFirst).toBe(600);
    expect(afterSecond).toBe(afterFirst - 100);
  });

  it('leaves an unrestricted Warband’s Ducats alone', async () => {
    const s = await store();
    s.setState({ units: [profile('p-100', 100)] as never, weapons: [], armour: [] });
    const w = s.getState().createWarband('One-off', 'new-antioch', 700, 'unrestricted');
    s.getState().addUnitToWarband(w.id, 'p-100', 'Nobody pays for me');

    const after = s.getState().warbands.find((x) => x.id === w.id)!;
    expect(after.units).toHaveLength(1);
    expect(strongbox(after).ducats).toBe(0);
  });
});

/**
 * The migration, for a Warband founded before the two pots became one.
 *
 * It is the app's own on-load reconciliation, at the roster doors where
 * `openLedger` already runs, so a stored roster, an import and a cloud pull
 * are all treated the same. It is idempotent because sync replays.
 */
describe('a Warband founded before this change', () => {
  /** A stored Warband, as a pre-FD-05e record looks: allowance nowhere. */
  const stored = (over: Partial<Warband> = {}): Warband => ({
    id: 'wb-old',
    name: 'Old Guard',
    factionId: 'new-antioch',
    forceMode: 'campaign',
    ducatLimit: 700,
    treasuryDucats: 0,
    gloryPoints: 0,
    ledger: [],
    units: [],
    armoryStash: [],
    snapshots: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  } as Warband);

  /** A model costing `cost`, which is all the migration reads of one. */
  const unit = (id: string, cost: number) => ({ id, totalCost: cost } as never);

  it('never played, 620 on 700: loads holding 80', () => {
    const w = migrateFoundingPot(stored({ units: [unit('u1', 620)] }));
    expect(strongbox(w).ducats).toBe(80);
    expect(reconciled(w)).toBe(true);
  });

  it('and loads again holding 80 — the migration is idempotent', () => {
    const once = migrateFoundingPot(stored({ units: [unit('u1', 620)] }));
    const twice = migrateFoundingPot(once);
    expect(strongbox(twice).ducats).toBe(80);
    expect(twice.ledger).toHaveLength(once.ledger!.length);
  });

  it('books the pair, not one net figure', () => {
    const w = migrateFoundingPot(stored({ units: [unit('u1', 620)] }));
    const reasons = w.ledger!.map((e) => e.reason);
    expect(reasons).toEqual(['founding', 'quartermaster']);
    expect(w.ledger![0].ducats).toBe(700);
    expect(w.ledger![1].ducats).toBe(-620);
    expect(w.ledger![1].note).toContain('1 model');
  });

  /*
    An over-budget draft goes negative by exactly its overspend. The builder
    already prints it as over budget, and a hire it cannot pay for is refused,
    which forces the trim first.
  */
  it('over budget, 740 on 700: loads at −40', () => {
    const w = migrateFoundingPot(stored({ units: [unit('u1', 740)] }));
    expect(strongbox(w).ducats).toBe(-40);
    expect(reconciled(w)).toBe(true);
  });

  /*
    A played Warband keeps its balance and gains nothing. The data cannot
    separate the founding roster from hires made since or from the dead, so a
    computed credit would be a guess.
  */
  it('played, holding 30: loads holding 30 and gains no entry', () => {
    const played = openLedger(stored({
      treasuryDucats: 30,
      units: [unit('u1', 620)],
      snapshots: [{ type: 'post_battle' } as never],
    }));
    const before = played.ledger!.length;
    const after = migrateFoundingPot(played);
    expect(strongbox(after).ducats).toBe(30);
    expect(after.ledger).toHaveLength(before);
  });

  it('played by its ledger alone, with no post-battle snapshot, is still played', () => {
    const played = stored({
      units: [unit('u1', 620)],
      ledger: [{
        id: 'l1', at: '2026-01-02T00:00:00Z', reason: 'exploration',
        ducats: 40, glory: 0,
      } as never],
      treasuryDucats: 40,
    });
    const after = migrateFoundingPot(played);
    expect(strongbox(after).ducats).toBe(40);
    expect(after.ledger).toHaveLength(1);
  });

  it('leaves an unrestricted list alone', () => {
    const w = migrateFoundingPot(stored({ forceMode: 'unrestricted', units: [unit('u1', 620)] }));
    expect(strongbox(w).ducats).toBe(0);
    expect(w.ledger).toHaveLength(0);
  });

  /*
    A Warband founded AFTER this change carries a founding entry with Ducats
    from birth, which is the marker the migration keys on — so it is never
    migrated a second time.
  */
  it('a Warband founded after this change is not touched by the migration', async () => {
    const s = await store();
    s.setState({ units: [], weapons: [], armour: [] });
    const w = s.getState().createWarband('New', 'new-antioch', 700, 'campaign');
    const after = migrateFoundingPot(w);
    expect(after.ledger).toHaveLength(1);
    expect(strongbox(after).ducats).toBe(700);
  });
});

/**
 * The real roster that made the migration strict.
 *
 * `data-sources/fixtures/trenchline-roster/v0-ninefold-penance.json` is a v0
 * export as the old exporter actually wrote one: no snapshots, no ledger, no
 * `forceMode`. Every structural test for "has this played?" reads it as a
 * fresh muster. It is not one — it holds 85 Ducats and 2 Glory against a 1,000
 * allowance and a roster costing 140, where a fresh muster would hold 860 and
 * no Glory — so crediting the allowance would hand a real player roughly 860
 * Ducats they did not earn.
 */
describe('a v0 roster with no snapshots and no ledger', () => {
  const v0 = () => JSON.parse(fs.readFileSync(
    path.join(process.cwd(), 'data-sources/fixtures/trenchline-roster/v0-ninefold-penance.json'),
    'utf8',
  )) as { roster?: Warband } & Warband;

  it('is not a fresh muster, whatever its structure says', () => {
    const roster = (v0().roster ?? v0()) as Warband;
    /* The shape that fools a structural test. */
    expect(roster.snapshots ?? []).toHaveLength(0);
    expect(roster.ledger).toBeUndefined();
    /* And the balances that give it away. */
    expect(roster.treasuryDucats).toBe(85);
    expect(roster.gloryPoints).toBe(2);
  });

  it('keeps its 85 Ducats through the migration', () => {
    const roster = (v0().roster ?? v0()) as Warband;
    const after = migrateFoundingPot(roster);
    expect(after.treasuryDucats).toBe(85);
    expect(after.ledger ?? []).toHaveLength(0);
  });
});

/**
 * The Papal States Intervention Force musters on Glory, and that is not play.
 *
 * "Any Glory is evidence of play" would declare a fresh Papal draft played —
 * its Specialist Force rule musters it on 11 ☼ — and leave it with a Strongbox
 * of 0. The floor is the Glory on the record's own `founding` entry, which is
 * 0 for every other Variant.
 */
describe('a never-played Papal States muster', () => {
  it('loads holding its unspent allowance, not nothing', () => {
    const papal = {
      id: 'wb-papal', name: 'Swiss Guard', factionId: 'new-antioch',
      forceMode: 'campaign', ducatLimit: 700,
      treasuryDucats: 0, gloryPoints: 11,
      /* A #75-era muster: the founding entry booked the Glory and no Ducats. */
      ledger: [{
        id: 'led-f', at: '2026-01-01T00:00:00Z', reason: 'founding',
        ducats: 0, glory: 11, game: 1, note: 'Founded on an allowance of 700 Ducats.',
      }],
      units: [{ id: 'u1', totalCost: 620 }],
      armoryStash: [], snapshots: [], chronicleLog: [],
      createdAt: 'a', updatedAt: 'b',
    } as unknown as Warband;

    const after = migrateFoundingPot(papal);
    expect(strongbox(after).ducats).toBe(80);
    /* And its muster Glory is untouched. */
    expect(strongbox(after).glory).toBe(11);
  });

  it('but Glory ABOVE the muster is play, and is not migrated', () => {
    const won = {
      id: 'wb-papal2', name: 'Swiss Guard', factionId: 'new-antioch',
      forceMode: 'campaign', ducatLimit: 700,
      treasuryDucats: 0, gloryPoints: 14,
      ledger: [{
        id: 'led-f', at: '2026-01-01T00:00:00Z', reason: 'founding',
        ducats: 0, glory: 11, game: 1, note: 'Founded.',
      }],
      units: [{ id: 'u1', totalCost: 620 }],
      armoryStash: [], snapshots: [], chronicleLog: [],
      createdAt: 'a', updatedAt: 'b',
    } as unknown as Warband;

    expect(strongbox(migrateFoundingPot(won)).ducats).toBe(0);
  });
});
