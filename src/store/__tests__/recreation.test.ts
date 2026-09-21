/**
 * Re-creation, end to end: killed, held, then paid for or let go.
 *
 * The rule (Warbands L5324 to L5327, and the Book of Golems find) puts the
 * payment in a step the wizard does not own:
 *
 * > If a Takwin Homunculus is killed in the post-battle sequence, you do not
 * > have to remove it from your roster. Instead, you can spend 40 👑 **in the
 * > following Quartermaster Step** to leave it on the Roster.
 *
 * So the post-battle sequence cannot let the model fall and cannot let it walk
 * away either. These tests drive the whole of that gap: the wizard's commit
 * holding the model instead of removing it, the builder paying or declining,
 * and the deadline running out on its own when the campaign moves on.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useStore } from '../useStore';
import { fieldable } from '@/rules/recreation';
import { forceBudget, reinforcementCost } from '@/rules/campaign';
import { DATASET } from '@/data/generated/trenchline.generated';
import type { ActiveUnit, Warband } from '@/types/warband';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return { ...actual, storage: { ...actual.storage, saveCampaign: vi.fn() } };
});

const WB = 'wb-recreation';

/** The Takwin's ability, as the catalogue prints it. Expires. */
const TAKWIN = 'If a Takwin Homunculus is killed in the post-battle sequence, you do not '
  + 'have to remove it from your roster. Instead, you can spend 40 ducats in the '
  + 'following Quartermaster Step to leave it on the Roster.';

/** The Golem's, which does not. */
const GOLEM = 'If the Homunculus is taken Out of Action during battle, and is deemed to '
  + 'have been killed in the post-battle sequence, you do not have to remove it from '
  + 'your roster. Instead, you can spend 40 ducats at any time between battles to '
  + 'bring it back to life with all of its weapons and abilities';

const unit = (id: string, name: string, ability?: string): ActiveUnit => ({
  id,
  customName: name,
  baseProfileId: 'p1',
  profileSnapshot: {
    id: 'p1',
    name: 'Takwin Homunculus',
    factionId: 'iron-sultanate',
    category: 'Troop',
    baseCost: 40,
    stats: { movement: '6"', ranged: '+0', melee: '+0', armour: '0', base: '25mm', keywords: [] },
    innateAbilities: ability
      ? [{ id: 'a1', name: 'Re-creation', description: ability }]
      : [],
  },
  equippedWeapons: [],
  equippedArmour: [],
  equippedEquipment: [],
  xp: 0,
  injuries: [],
  skills: [],
  titles: [],
  isDead: false,
  totalCost: 40,
  maxWounds: 1,
  currentWounds: 1,
  status: 'Active',
} as unknown as ActiveUnit);

/*
  Seeded with a LEDGER, not a bare balance.

  The Strongbox is the sum of its ledger (FD-05d), and `book` opens the
  account only when it is asked to move money. A fixture that sets
  `treasuryDucats` and nothing else therefore reads as zero the first time
  anything re-derives it — which is a property of the fixture, not of the app:
  both roster doors open the account before a real Warband ever gets here.
*/
const seed = (units: ActiveUnit[], treasury = 200): Warband => ({
  ledger: [{
    id: 'l-open',
    at: '2026-01-01T00:00:00.000Z',
    reason: 'reconciliation',
    ducats: treasury,
    glory: 10,
    note: 'Opening balance.',
  }],
  id: WB,
  name: 'The House',
  factionId: 'iron-sultanate',
  campaignId: 'c1',
  ducatLimit: 1000,
  treasuryDucats: treasury,
  gloryPoints: 10,
  forceMode: 'campaign',
  armoryStash: [],
  units,
  fallen: [],
  snapshots: [],
} as unknown as Warband);

/*
  The store's own empty campaign, kept before any test mutates it.

  `applyPostBattleResults` walks `campaign.members` and the Chronicle, so a
  hand-written `{ id, currentTurn }` is not a campaign — it is a campaign with
  most of it missing, and the failure reads as a defect in the code under test.
*/
const BLANK_CAMPAIGN = useStore.getState().campaign;
const campaignAt = (turn: number) =>
  ({ ...BLANK_CAMPAIGN, id: 'c1', currentTurn: turn, chronicleLogs: [] }) as never;

const warband = () => useStore.getState().warbands.find((w) => w.id === WB)!;
const on = (id: string) => warband().units.find((u) => u.id === id);
const inFallen = (id: string) => (warband().fallen ?? []).find((u) => u.id === id);
const ducats = () => warband().treasuryDucats;

/** Kill a model through the post-battle commit, as the wizard does. */
const killInPostBattle = (id: string, name: string) =>
  useStore.getState().applyPostBattleResults(
    's1', 'Ambush', 'Victory', 0, 0,
    [{ unitId: id, unitName: name, outcome: 'Dead', isDead: true }] as never,
    [], { unitIds: [], misses: 0 }, [], false, '', undefined, undefined, undefined,
    undefined, undefined,
  );

beforeEach(() => {
  useStore.setState({
    warbands: [seed([unit('u1', 'Qarin', TAKWIN), unit('u2', 'Ordinary')])],
    activeWarbandId: WB,
    campaign: campaignAt(1),
  });
});

describe('the post-battle sequence', () => {
  it('holds a killed model that carries the offer, rather than removing it', () => {
    killInPostBattle('u1', 'Qarin');

    expect(inFallen('u1')).toBeUndefined();
    expect(on('u1')?.isDead).toBe(false);
    expect(on('u1')?.awaitingRecreation).toMatchObject({
      ability: 'Re-creation',
      cost: { ducats: 40, glory: 0 },
      deadline: 'quartermaster',
      sinceGame: 1,
    });
  });

  it('removes a killed model that carries none, exactly as before', () => {
    killInPostBattle('u2', 'Ordinary');

    expect(on('u2')).toBeUndefined();
    expect(inFallen('u2')?.isDead).toBe(true);
  });
});

describe('the Quartermaster Step', () => {
  beforeEach(() => killInPostBattle('u1', 'Qarin'));

  it('pays the offer and keeps the model, booked through the ledger', () => {
    const before = ducats();
    useStore.getState().recreateUnit(WB, 'u1');

    expect(on('u1')?.awaitingRecreation).toBeUndefined();
    expect(on('u1')?.isDead).toBe(false);
    expect(on('u1')?.status).toBe('Active');
    expect(ducats()).toBe(before - 40);

    // The Strongbox is the sum of its ledger (FD-05d), so the money has to
    // leave a record naming what it bought.
    const entry = (warband().ledger ?? []).find((e) => e.ref === 'u1' && e.ducats === -40);
    expect(entry).toBeDefined();
    expect(entry?.reason).toBe('quartermaster');
    expect(entry?.note).toMatch(/Re-creation/);
  });

  it('refuses when the Strongbox cannot cover it, rather than clamping', () => {
    // RR-12's rule: a purchase over the balance is refused, not part-paid.
    useStore.setState({
      warbands: [{ ...warband(), treasuryDucats: 10 }],
    });
    useStore.getState().recreateUnit(WB, 'u1');

    expect(ducats()).toBe(10);
    expect(on('u1')?.awaitingRecreation).toBeDefined();
  });

  it('lets the model fall when the offer is declined', () => {
    useStore.getState().letUnitFall(WB, 'u1');

    expect(on('u1')).toBeUndefined();
    expect(inFallen('u1')?.isDead).toBe(true);
    // Nothing is refunded: the book sells Battlekit, never models.
    expect(ducats()).toBe(200);
  });

  it('does nothing to a model with no offer outstanding', () => {
    useStore.getState().recreateUnit(WB, 'u2');
    useStore.getState().letUnitFall(WB, 'u2');
    expect(on('u2')).toBeDefined();
    expect(ducats()).toBe(200);
  });
});

describe('the deadline', () => {
  it('runs out for the Takwin when the campaign moves past its game', () => {
    killInPostBattle('u1', 'Qarin');
    expect(on('u1')).toBeDefined();

    useStore.getState().advanceCampaignGame();

    expect(on('u1')).toBeUndefined();
    expect(inFallen('u1')?.isDead).toBe(true);
    // A model leaving the Roster because a deadline passed has to be findable.
    expect(useStore.getState().campaign.chronicleLogs.some(
      (l) => /Qarin was not re-created/.test(l.text))).toBe(true);
  });

  it('does not run out for the Golem, whose offer sets no limit', () => {
    useStore.setState({
      warbands: [seed([unit('g1', 'Clay', GOLEM)])],
      campaign: campaignAt(1),
    });
    killInPostBattle('g1', 'Clay');
    expect(on('g1')?.awaitingRecreation?.deadline).toBe('between-battles');

    useStore.getState().advanceCampaignGame();
    useStore.getState().advanceCampaignGame();

    expect(on('g1')?.awaitingRecreation).toBeDefined();
    expect(inFallen('g1')).toBeUndefined();
  });

  it('will not sell a lapsed offer', () => {
    useStore.setState({
      warbands: [seed([unit('g1', 'Clay', TAKWIN)])],
      campaign: campaignAt(1),
    });
    killInPostBattle('g1', 'Clay');
    // Past the deadline, but still on the roster — the model is put back by
    // hand, which is the shape a roster restored from a file can arrive in.
    useStore.setState({ campaign: campaignAt(3) });

    useStore.getState().recreateUnit(WB, 'g1');
    expect(ducats()).toBe(200);
    expect(on('g1')?.awaitingRecreation).toBeDefined();
  });
});

/**
 * RC-1: what a model awaiting Re-creation is out of.
 *
 * The offer is stored with `isDead` false, because `applyPostBattleResults`
 * removes a model whose `isDead` is true and the offer would go with it. That
 * flag was then read by every part of the app that asks who fights, so a
 * killed Takwin was fielded, counted against the Threshold, counted against
 * the next game's reinforcement allowance, written into a `.ros` muster and
 * offered Experience for a battle it had not been at.
 *
 * Under the book it is on the roster and on nothing else: *"you do not have
 * to remove it from your roster"* grants the ENTRY, so that there is
 * something for the payment to be made against, and the model it names has
 * been killed.
 *
 * These drive the store rather than the predicate: the model is killed by the
 * real post-battle commit and re-created by the real store action, so what is
 * pinned is the app's answer and not a hand-built flag. The `.ros` half needs
 * a model the catalogue can name and is in `rosterRos.test.ts`.
 */
describe('a model awaiting Re-creation', () => {
  beforeEach(() => killInPostBattle('u1', 'Qarin'));

  /** Play Mode's default Force, and the post-battle wizard's model list. */
  const fielded = () => fieldable(warband().units).map((u) => u.id);
  const force = () => forceBudget(warband(), { threshold: 500 });
  const reinforcements = () =>
    reinforcementCost(DATASET, warband() as never, 2).warbandTotalCost;

  it('is on the roster, holding its offer', () => {
    expect(warband().units.map((u) => u.id)).toContain('u1');
    expect(on('u1')?.awaitingRecreation).toBeDefined();
  });

  it('is in none of the four the app measures with', () => {
    // Play Mode's default Force and the wizard's model list.
    expect(fielded()).toEqual(['u2']);
    // The Force, and what it spends against the Threshold.
    expect(force().spend).toBe(40);
    expect(force().awaitingRecreation).toBe(1);
    // …and it is not called benched. Nobody chose to sit it out.
    expect(force().benched).toBe(0);
    // The total the next game's Threshold is measured against.
    expect(reinforcements()).toBe(40);
  });

  it('is still counted in what the roster costs, because it is on the roster', () => {
    expect(force().rosterCost).toBe(80);
  });

  it('is in all four again once it is paid for', () => {
    useStore.getState().recreateUnit(WB, 'u1');

    expect(on('u1')?.awaitingRecreation).toBeUndefined();
    expect(fielded().sort()).toEqual(['u1', 'u2']);
    expect(force().spend).toBe(80);
    expect(force().awaitingRecreation).toBe(0);
    expect(reinforcements()).toBe(80);
  });

  it('is in none of them ever again once its owner lets it fall', () => {
    useStore.getState().letUnitFall(WB, 'u1');

    expect(on('u1')).toBeUndefined();
    expect(fielded()).toEqual(['u2']);
    expect(force().rosterCost).toBe(40);
  });
});
