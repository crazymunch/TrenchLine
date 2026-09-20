/**
 * What the post-battle write does with a resolved capture.
 *
 * `docs/RULES-COVERAGE-AUDIT.md` RC-04. The rules layer answering correctly is
 * half of it; these assert that the store then does it — the ransom leaves the
 * Strongbox, a Full Recovery writes no injury, and an execution removes the
 * model. The wizard's own refusal to commit an unresolved capture is upstream
 * of here: by the time a `CasualtyRecord` exists, someone has decided.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useStore } from '../useStore';
import type { Warband } from '@/types/warband';
import type { CasualtyRecord } from '@/types/campaign';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return { ...actual, storage: { ...actual.storage, saveCampaign: vi.fn() } };
});

const WB = 'wb-capture';
const CAPTIVE = 'u-captive';

const seed = (): Warband => ({
  id: WB,
  name: 'The Ransomed',
  factionId: 'new-antioch',
  ducatLimit: 1000,
  treasuryDucats: 300,
  gloryPoints: 0,
  armoryStash: [],
  units: [{
    id: CAPTIVE,
    customName: 'Brother Anselm',
    baseProfileId: 'p1',
    profileSnapshot: { name: 'Trench Pilgrim', category: 'Elite', elite: true },
    equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
    xp: 0, advancements: [], injuries: [], isDead: false, totalCost: 40,
    currentWounds: 0, maxWounds: 1, bloodMarkers: 0,
    status: 'Out of Action', hasActedThisTurn: false,
  }],
  snapshots: [],
} as unknown as Warband);

const apply = (casualty: CasualtyRecord) =>
  useStore.getState().applyPostBattleResults(
    'sc-1', 'Bridgehead', 'Victory', 0, /* ducats */ 100,
    [casualty], [], { unitIds: [], misses: 0 }, [], false, 'narrative',
  );

const warband = () => useStore.getState().warbands.find((w) => w.id === WB)!;
const captive = () => warband().units.find((u) => u.id === CAPTIVE)!;
/** The same model once the Roster has let it go. */
const executed = () => (warband().fallen ?? []).find((u) => u.id === CAPTIVE);
const purse = () => useStore.getState().warbands.find((w) => w.id === WB)!.treasuryDucats;

const record = (over: Partial<CasualtyRecord>): CasualtyRecord => ({
  unitId: CAPTIVE,
  unitName: 'Brother Anselm',
  outcome: 'D66: 12 - Captured: … ransom paid — treated as a Full Recovery.',
  isDead: false,
  ...over,
});

beforeEach(() => {
  useStore.setState({ warbands: [seed()], activeWarbandId: WB });
});

describe('a ransom that was paid', () => {
  it('transfers the Ducats out of the Strongbox', () => {
    // 300 held, 100 looted, 50 paid away.
    apply(record({ fullRecovery: true, ransomPaid: 50 }));
    expect(purse()).toBe(350);
  });

  it('writes no injury, because the rule says Full Recovery', () => {
    /*
      Recording the capture as an injury would mark the model permanently for
      something it recovered from — and under the duplicate-injury rule would
      stop it ever being captured again.
    */
    apply(record({ fullRecovery: true, ransomPaid: 50 }));
    expect(captive().injuries).toEqual([]);
    expect(captive().isDead).toBe(false);
  });

  it('says in the chronicle what left the Strongbox', () => {
    apply(record({ fullRecovery: true, ransomPaid: 50 }));
    const summary = useStore.getState().warbands.find((w) => w.id === WB)!
      .snapshots!.at(-1)!.changesSummary.join(' | ');
    expect(summary).toContain('Ransom paid: 50 Ducats');
  });

  it('never takes more than the Strongbox holds', () => {
    apply(record({ fullRecovery: true, ransomPaid: 9999 }));
    expect(purse()).toBe(100);
  });
});

describe('a ransom that was not paid', () => {
  it('removes the model, which is what the rule says happens', () => {
    /*
      "If the ransom is not paid, the captured model is executed — remove them
      from your Warband Roster."

      This used to assert `isDead: true` on a model still sitting in `units`,
      which is not a removal: the builder went on summing its Ducats, the
      legality engine went on counting it towards a minimum, and Play Mode
      went on deploying it. It is off the Roster now.
    */
    apply(record({
      outcome: 'D66: 12 - Captured: … no ransom was paid — executed.',
      isDead: true,
    }));
    expect(warband().units.some((u) => u.id === CAPTIVE)).toBe(false);
    expect(executed()).toBeDefined();
    expect(purse()).toBe(400);
  });

  it('keeps the model and its Battlekit rather than deleting either', () => {
    /*
      The gear goes with the model — the book removes both and the Arsenal
      does not get it back — and the model itself is kept because a campaign's
      dead are half of what its history means.
    */
    const gearBefore = captive().equippedWeapons?.length ?? 0;
    apply(record({ outcome: 'executed', isDead: true }));
    const gone = executed()!;
    expect(gone.customName).toBe('Brother Anselm');
    expect(gone.equippedWeapons?.length ?? 0).toBe(gearBefore);
    expect(warband().armoryStash.some((i) => i.name === gone.equippedWeapons?.[0]?.name)).toBe(false);
  });

  it('records the outcome as an injury line, unlike a Full Recovery', () => {
    apply(record({ outcome: 'executed', isDead: true }));
    expect(executed()!.injuries).toEqual(['executed']);
  });
});

describe('an ordinary casualty', () => {
  it('is untouched by any of this', () => {
    apply(record({ outcome: 'D66: 33 - Lost an Eye: …', isDead: false }));
    expect(captive().injuries).toEqual(['D66: 33 - Lost an Eye: …']);
    expect(purse()).toBe(400);
  });
});
