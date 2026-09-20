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
import { strongbox, reconciled } from '../ledger';

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
