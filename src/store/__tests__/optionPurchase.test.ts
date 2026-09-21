/**
 * A unit option is a purchase, and the Strongbox pays for it.
 *
 * `toggleUnitSpecialUpgrade` added the option's price to the model's
 * `totalCost` and charged nobody. That is the same defect as FD-05e-2
 * (equipping Battlekit), FD-05g (a Glory-priced item) and FD-05h (a
 * Glory-priced model), one layer further out and the last of them:
 *
 *     280 priced options across 18 groups, free
 *
 * — every Alchemical Formula, every Saga, every Goetic Power, the Strains,
 * the Arts of Assassination, and the Armour options at up to 50 Ducats each.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useStore } from '../useStore';
import { DATASET } from '@/data/generated/trenchline.generated';
import type { ActiveUnit, Warband } from '@/types/warband';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return { ...actual, storage: { ...actual.storage, saveCampaign: vi.fn() } };
});

const WB = 'wb-options';

/** The shipped options, so this is driven by real prices. */
const OPTIONS = DATASET.units.flatMap((u) => u.options ?? []);
const byName = (n: string) => OPTIONS.find((o) => o.name === n)!;

const HUMAN_HANDS = byName('Human Hands');      // 10 Ducats
const MASSIVE_SIZE = byName('Massive Size');    // 30 Ducats
const GLORY_OPTION = OPTIONS.find((o) => (o.cost?.glory ?? 0) > 0);

const asUpgrade = (o: typeof HUMAN_HANDS) => ({
  id: o.id,
  name: o.name,
  cost: o.cost.ducats,
  price: { ducats: o.cost.ducats, glory: o.cost.glory },
  category: o.groupPath ?? o.group,
});

const unit = (id: string): ActiveUnit => ({
  id,
  customName: `Model ${id}`,
  baseProfileId: 'p1',
  profileSnapshot: { id: 'p1', name: 'Takwin Homunculus', innateAbilities: [] },
  equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
  specialUpgrades: [],
  xp: 0, injuries: [], skills: [], titles: [],
  isDead: false, totalCost: 40, maxWounds: 1, currentWounds: 1, status: 'Active',
} as unknown as ActiveUnit);

const seed = (): Warband => ({
  id: WB,
  name: 'The House',
  factionId: 'iron-sultanate',
  campaignId: 'c1',
  ducatLimit: 1000,
  treasuryDucats: 200,
  gloryPoints: 10,
  forceMode: 'campaign',
  armoryStash: [],
  units: [unit('u1'), unit('u2')],
  fallen: [],
  snapshots: [],
  ledger: [{
    id: 'l-open', at: '2026-01-01T00:00:00.000Z', reason: 'reconciliation',
    ducats: 200, glory: 10, note: 'Opening balance.',
  }],
} as unknown as Warband);

const BLANK_CAMPAIGN = useStore.getState().campaign;
const campaignAt = (turn: number) =>
  ({ ...BLANK_CAMPAIGN, id: 'c1', currentTurn: turn, chronicleLogs: [] }) as never;

const warband = () => useStore.getState().warbands.find((w) => w.id === WB)!;
const ducats = () => warband().treasuryDucats;
const glory = () => warband().gloryPoints;
const on = (id: string) => warband().units.find((u) => u.id === id)!;
const toggle = (unitId: string, o: typeof HUMAN_HANDS) =>
  useStore.getState().toggleUnitSpecialUpgrade(WB, unitId, asUpgrade(o));

beforeEach(() => {
  useStore.setState({
    warbands: [seed()], activeWarbandId: WB, campaign: campaignAt(1),
  });
});

describe('the shipped options this is about', () => {
  it('price 280 of them, across eighteen groups', () => {
    const seen = new Set<string>();
    let priced = 0;
    const groups = new Set<string>();
    for (const u of DATASET.units) {
      for (const o of u.options ?? []) {
        const k = `${u.name}::${o.id}`;
        if (seen.has(k)) continue;
        seen.add(k);
        if ((o.cost?.ducats ?? 0) + (o.cost?.glory ?? 0) > 0) {
          priced += 1;
          groups.add(o.groupPath ?? o.group);
        }
      }
    }
    expect(priced).toBe(280);
    expect(groups.size).toBe(18);
  });
});

describe('buying one', () => {
  it('debits the Strongbox and books a ledger entry naming it', () => {
    toggle('u1', HUMAN_HANDS);

    expect(ducats()).toBe(200 - HUMAN_HANDS.cost.ducats);
    const entry = (warband().ledger ?? []).find((e) => e.ref === `u1:${HUMAN_HANDS.id}`);
    expect(entry).toMatchObject({ reason: 'quartermaster', ducats: -10 });
    expect(entry?.note).toMatch(/Human Hands/);
  });

  it('still adds the price to the model, as it always did', () => {
    toggle('u1', HUMAN_HANDS);
    expect(on('u1').totalCost).toBe(50);
    expect(on('u1').specialUpgrades?.map((x) => x.name)).toEqual(['Human Hands']);
  });

  it('spends the whole Cost, not its Ducat half', () => {
    // FD-05g's lesson: an entry at zero Ducats and some Glory is free to
    // anything reading only the first number.
    if (!GLORY_OPTION) return;
    toggle('u1', GLORY_OPTION);
    expect(glory()).toBe(10 - GLORY_OPTION.cost.glory);
  });
});

describe('selling it back', () => {
  it('returns the money while the game it was bought in is unplayed', () => {
    toggle('u1', HUMAN_HANDS);
    expect(ducats()).toBe(190);

    toggle('u1', HUMAN_HANDS);
    expect(ducats()).toBe(200);
    expect(on('u1').specialUpgrades).toEqual([]);
    expect(on('u1').totalCost).toBe(40);
  });

  it('refunds nothing once that game has been played', () => {
    // "Users can make any variations from the end of one game to the start of
    // the next" — after that the purchase is settled.
    toggle('u1', HUMAN_HANDS);
    useStore.setState({ campaign: campaignAt(2) });

    toggle('u1', HUMAN_HANDS);
    expect(ducats()).toBe(190);
    expect(on('u1').specialUpgrades).toEqual([]);
  });
});

describe('two models taking the same option', () => {
  it('charges twice, and one refund does not cancel the other purchase', () => {
    // The same option id is on every model that can take it, so a ref keyed
    // on the option alone would let one model's refund undo another's buy.
    toggle('u1', MASSIVE_SIZE);
    toggle('u2', MASSIVE_SIZE);
    expect(ducats()).toBe(200 - 60);

    toggle('u1', MASSIVE_SIZE);
    expect(ducats()).toBe(200 - 30);
    expect(on('u2').specialUpgrades?.map((x) => x.name)).toEqual(['Massive Size']);
  });
});

describe('a Warband not playing a campaign', () => {
  it('is not charged, because it has no Strongbox to charge', () => {
    useStore.setState({
      warbands: [{ ...seed(), forceMode: 'unrestricted' }], activeWarbandId: WB,
    });
    toggle('u1', HUMAN_HANDS);
    expect(ducats()).toBe(200);
    expect(on('u1').specialUpgrades?.map((x) => x.name)).toEqual(['Human Hands']);
  });
});
