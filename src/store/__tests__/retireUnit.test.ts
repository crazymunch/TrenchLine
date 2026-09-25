/**
 * Retire Injured Models — the Quartermaster Step's own removal (RR-14, FD-10).
 *
 * Page 123:
 *
 * > You can retire any model in your Warband that has 2 Battle Scars. If you
 * > decide to do so, remove the model from your Warband Roster. You can sell or
 * > reallocate their Battlekit or Glory Items before you retire them if you
 * > wish, or allow them to retire with their Battlekit in honour of the service
 * > they have performed.
 *
 * The app had no such action. A model that survived to two Battle Scars could
 * leave a roster only by dying in the Trauma Step — which is a different rule,
 * one scar later, and compulsory. The test that matters most here is therefore
 * the boundary: at one scar there is no action at all.
 *
 * Every number reads from `DATASET`: the retirement count from
 * `campaign.quartermaster.retireInjured.atScars`, the model from the shipped
 * New Antioch list, and the kit and its price from that faction's own Armoury
 * Table. No statline and no cost is typed into this file.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useStore } from '../useStore';
import { DATASET } from '@/data/generated/trenchline.generated';
import type { Dataset } from '@/types/catalogue';
import type { Warband, ActiveUnit } from '@/types/warband';
import type { EquippedWeapon } from '@/types/warband';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return { ...actual, storage: { ...actual.storage, saveCampaign: vi.fn() } };
});

const dataset = DATASET as unknown as Dataset;
const WB = 'wb-retire';

/** The rule's own count, so this suite cannot drift from the ruleset. */
const AT = dataset.campaign!.quartermaster!.retireInjured.atScars;

const profile = dataset.units.find(
  (u) => u.name === 'Trench Cleric' && u.factionId === 'New Antioch')!;
const armoury = dataset.armouries!.find((a) => a.factionId === 'new-antioch')!;
/* An odd Ducat price, so "half, fractions up" is distinguishable from "half". */
const row = armoury.rows.find((r) => r.cost.ducats % 2 === 1 && r.cost.ducats > 0)!;

const weapon = (): EquippedWeapon => ({
  instanceId: `w-${row.weaponId ?? row.name}`,
  id: row.weaponId ?? row.name,
  name: row.name,
  type: 'Ranged',
  range: '-',
  modifiers: '-',
  keywords: [],
  cost: row.cost.ducats,
  gloryCost: row.cost.glory || undefined,
} as EquippedWeapon);

const model = (scars: number, armed = true): ActiveUnit => ({
  id: 'u-veteran',
  customName: 'Brother Aldric',
  baseProfileId: profile.id,
  profileSnapshot: {
    id: profile.id,
    name: profile.name,
    category: 'Elite',
    baseCost: profile.cost.ducats,
    stats: { ...profile.stats, keywords: profile.keywords },
  },
  equippedWeapons: armed ? [weapon()] : [],
  equippedArmour: [],
  equippedEquipment: [],
  xp: 0,
  isDead: false,
  injuries: [],
  scars: Array.from({ length: scars }, (_, i) => ({ name: `Scar ${i + 1}`, roll: '11' })),
  totalCost: profile.cost.ducats,
} as unknown as ActiveUnit);

const seed = (unit: ActiveUnit, over: Partial<Warband> = {}): Warband => ({
  id: WB,
  name: 'The Vigil',
  factionId: 'new-antioch',
  forceMode: 'campaign',
  ducatLimit: 1000,
  treasuryDucats: 0,
  gloryPoints: 0,
  armoryStash: [],
  units: [unit],
  fallen: [],
  snapshots: [],
  ...over,
} as unknown as Warband);

const warband = () => useStore.getState().warbands.find((w) => w.id === WB)!;
const retire = (d: 'sell' | 'arsenal' | 'keep') =>
  useStore.getState().retireUnit(WB, 'u-veteran', d, dataset);

describe('the count that unlocks retirement', () => {
  it('is the Quartermaster Step\'s, not the Trauma Step\'s', () => {
    /* Two rules, one scar apart, and confusing them offers the action one scar
       too late — which is to say never, because the third scar removes the
       model in the step before this one. */
    expect(AT).toBe(2);
    expect(dataset.campaign!.traumaProcedure!.battleScars.unfitAt).toBe(3);
    expect(AT).toBeLessThan(dataset.campaign!.traumaProcedure!.battleScars.unfitAt);
  });
});

describe('a model with one Battle Scar', () => {
  beforeEach(() => {
    useStore.setState({ warbands: [seed(model(AT - 1))], activeWarbandId: WB });
  });

  it('has no Retire action', () => {
    const r = retire('keep');
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.why).toBe('not-enough-scars');
  });

  it('and stays on the Roster', () => {
    retire('keep');
    expect(warband().units.map((u) => u.id)).toEqual(['u-veteran']);
    expect(warband().fallen ?? []).toHaveLength(0);
  });
});

describe('a model at the count the book names', () => {
  beforeEach(() => {
    useStore.setState({ warbands: [seed(model(AT))], activeWarbandId: WB });
  });

  it('leaves the Roster for the Fallen, marked retired rather than killed', () => {
    expect(retire('keep').ok).toBe(true);
    expect(warband().units).toHaveLength(0);
    const gone = warband().fallen![0];
    expect(gone.id).toBe('u-veteran');
    expect(gone.retired).toBe(true);
  });

  /* "allow them to retire with their Battlekit in honour of the service they
     have performed" — the kit goes with them and nothing is credited. */
  it('keeps its kit when the player lets it, and credits nothing', () => {
    retire('keep');
    expect(warband().fallen![0].equippedWeapons).toHaveLength(1);
    expect(warband().armoryStash).toHaveLength(0);
    expect(warband().treasuryDucats).toBe(0);
  });

  /* "reallocate their Battlekit" — to the Arsenal, where it can be given out. */
  it('sends its kit to the Arsenal when asked, and credits nothing', () => {
    retire('arsenal');
    expect(warband().armoryStash.map((i) => i.name)).toEqual([row.name]);
    expect(warband().armoryStash[0].quantity).toBe(1);
    expect(warband().fallen![0].equippedWeapons).toHaveLength(0);
    expect(warband().treasuryDucats).toBe(0);
  });

  /* "you receive half the Cost of the item you were selling, ROUNDING ANY
     FRACTIONS UP" — p.121, the same sale the Arsenal makes. */
  it('sells its kit for half, fractions up, through the ledger', () => {
    const r = retire('sell');
    expect(r.ok).toBe(true);
    expect(warband().treasuryDucats).toBe(Math.ceil(row.cost.ducats / 2));
    expect(warband().armoryStash).toHaveLength(0);
    expect(warband().fallen![0].equippedWeapons).toHaveLength(0);

    const entry = warband().ledger!.at(-1)!;
    expect(entry.reason).toBe('sold');
    expect(entry.ducats).toBe(Math.ceil(row.cost.ducats / 2));
  });

  it('rounds up rather than down — the row it reads is odd-priced', () => {
    expect(row.cost.ducats % 2).toBe(1);
    retire('sell');
    expect(warband().treasuryDucats).toBeGreaterThan(Math.floor(row.cost.ducats / 2));
  });
});

describe('a model carrying nothing', () => {
  beforeEach(() => {
    useStore.setState({ warbands: [seed(model(AT, false))], activeWarbandId: WB });
  });

  /* A sale of nothing books nothing: `book` refuses a movement of zero, so the
     ledger does not gain an entry reading "+0 Ducats". */
  it('books no ledger entry for a sale that raises nothing', () => {
    expect(retire('sell').ok).toBe(true);
    expect(warband().units).toHaveLength(0);
    expect(warband().treasuryDucats).toBe(0);
    expect((warband().ledger ?? []).filter((e) => e.reason === 'sold')).toHaveLength(0);
  });
});

describe('a ruleset that does not state the rule', () => {
  beforeEach(() => {
    useStore.setState({ warbands: [seed(model(AT))], activeWarbandId: WB });
  });

  /* Rule 2. A ruleset built before the Quartermaster Step was parsed says
     nothing about retiring, and the honest consequence is that the action is
     not offered — never that the Trauma Step's three stands in for it. */
  it('offers no retirement at all', () => {
    const silent = {
      ...dataset,
      campaign: { ...dataset.campaign, quartermaster: undefined },
    } as unknown as Dataset;
    const r = useStore.getState().retireUnit(WB, 'u-veteran', 'keep', silent);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.why).toBe('ruleset-silent');
    expect(warband().units).toHaveLength(1);
  });
});
