/**
 * PR #114, review round 1 — finding F, the half that is decided in the store.
 *
 * A Location that hands over a Glory Item — *"Relic: Choose one Glory Item
 * worth up to 7 ☼ and add it to your Arsenal"* — is not the standing permission
 * that opens the tables for purchase. The rules layer answers what may be
 * taken (`gloryItemGrants`, `grantableRows`, pinned in
 * `rules/__tests__/reviewRound1.test.ts`); this file pins the taking: the item
 * reaches the Arsenal, nothing is charged, and the grant is spent so a second
 * Relic cannot come off one find.
 *
 * The Location, its ceiling, the item and its price all read from `DATASET`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useStore } from '../useStore';
import { DATASET } from '@/data/generated/trenchline.generated';
import { explorationGrants } from '@/rules/campaign';
import { isGloryItem } from '@/rules/gloryItems';
import type { Dataset, ArmouryRow } from '@/types/catalogue';
import type { Warband, StashedItem } from '@/types/warband';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return { ...actual, storage: { ...actual.storage, saveCampaign: vi.fn() } };
});

const dataset = DATASET as unknown as Dataset;
const WB = 'wb-grant';

const location = (name: string) =>
  Object.values(dataset.campaign!.exploration!.locations as Record<string, {
    name: string; description?: string }[]>)
    .flat().find((l) => l.name === name)!;

/* The grant itself, from the Location's own sentence. */
const RELIC = explorationGrants(dataset, location('Ruined House'), 2, 'Relic');
const CEILING = RELIC[0].gloryItemOnce!;
const SOURCE = RELIC[0].source || RELIC[0].name;

const rows = dataset.armouries!.find((a) => a.factionId === 'new-antioch')!.rows;
const gloryItems = rows.filter(isGloryItem);
/* One the grant covers and one it does not, chosen by price rather than named. */
const AFFORDABLE = gloryItems.find((r) => r.cost.glory > 0 && r.cost.glory <= CEILING)!;
const TOO_DEAR = gloryItems.find((r) => r.cost.glory > CEILING)!;

const stashed = (row: ArmouryRow): StashedItem => ({
  id: row.weaponId ?? row.name,
  name: row.name,
  type: 'equipment',
  cost: row.cost.ducats,
  price: { ducats: row.cost.ducats, glory: row.cost.glory },
  quantity: 1,
} as unknown as StashedItem);

const seed = (): Warband => ({
  id: WB,
  name: 'The Finders',
  factionId: 'new-antioch',
  campaignId: 'c1',
  ducatLimit: 1000,
  treasuryDucats: 100,
  gloryPoints: 20,
  forceMode: 'campaign',
  armoryStash: [],
  units: [],
  fallen: [],
  snapshots: [],
  explorationEffects: RELIC,
  ledger: [{
    id: 'l-open', at: '2026-01-01T00:00:00.000Z', reason: 'reconciliation',
    ducats: 100, glory: 20, note: 'Opening balance.',
  }],
} as unknown as Warband);

const BLANK_CAMPAIGN = useStore.getState().campaign;
const campaignAt = (turn: number) =>
  ({ ...BLANK_CAMPAIGN, id: 'c1', currentTurn: turn, chronicleLogs: [] }) as never;

const warband = () => useStore.getState().warbands.find((w) => w.id === WB)!;
const take = (row: ArmouryRow, source = SOURCE) =>
  useStore.getState().takeGrantedGloryItem(WB, stashed(row), source);

beforeEach(() => {
  useStore.setState({
    warbands: [seed()], activeWarbandId: WB, campaign: campaignAt(3),
  });
});

describe('the grant this is about', () => {
  it('is a one-off with a ceiling, and the shelf has something under it', () => {
    expect(CEILING).toBeGreaterThan(0);
    expect(RELIC[0].gloryItemsUpTo).toBeUndefined();
    expect(AFFORDABLE).toBeDefined();
    expect(TOO_DEAR).toBeDefined();
  });
});

describe('taking it', () => {
  it('puts the item in the Arsenal', () => {
    expect(take(AFFORDABLE)).toBe('taken');
    expect(warband().armoryStash.map((i) => i.name)).toEqual([AFFORDABLE.name]);
    expect(warband().armoryStash[0].quantity).toBe(1);
  });

  it('charges nothing — it was given, not bought', () => {
    const before = warband();
    take(AFFORDABLE);
    expect(warband().treasuryDucats).toBe(before.treasuryDucats);
    expect(warband().gloryPoints).toBe(before.gloryPoints);
    /* And no ledger entry either: no money moved, so the Strongbox has no
       history to write. */
    expect(warband().ledger).toHaveLength(before.ledger!.length);
  });

  it('marks the grant spent, on the effect that carried it', () => {
    take(AFFORDABLE);
    const [effect] = warband().explorationEffects!;
    expect(effect.takenAtGame).toBe(3);
    expect(effect.takenItem).toBe(AFFORDABLE.name);
  });

  it('so a second item cannot come off the same find', () => {
    expect(take(AFFORDABLE)).toBe('taken');
    expect(take(AFFORDABLE)).toBe('no-grant');
    expect(warband().armoryStash).toHaveLength(1);
  });
});

describe('what it will not do', () => {
  it('refuses an item dearer than the grant covers', () => {
    expect(take(TOO_DEAR)).toBe('too-dear');
    expect(warband().armoryStash).toHaveLength(0);
    /* And the grant is still outstanding, because nothing was taken. */
    expect(warband().explorationEffects![0].takenAtGame).toBeUndefined();
  });

  /* A source with no outstanding grant on this Warband — the grant is matched
     to the Location that made it, not to "some Location did". */
  it('refuses a Location that granted nothing', () => {
    expect(take(AFFORDABLE, 'a Location this Warband has not explored')).toBe('no-grant');
    expect(warband().armoryStash).toHaveLength(0);
  });
});
