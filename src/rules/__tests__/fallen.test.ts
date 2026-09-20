/**
 * The dead leave the Roster.
 *
 * RR-25 / FD-05a. Trauma `11 Dead` says *"Remove the model and its Battlekit
 * from your Warband Roster"*, and the app set `isDead: true` and left the
 * model where it was.
 *
 * A flag is a rule enforced by remembering. Six readers remembered; three did
 * not, and each of those three is a rule getting a wrong answer — the builder
 * charged a Warband for a model it had lost, `toRoster` let that model go on
 * satisfying a faction minimum, and Play Mode put it on the table. These
 * assert the move that makes all of them right without a filter, and the two
 * cases that make an existing roster safe.
 */
import { describe, it, expect } from 'vitest';

import { removeFromRoster, migrateFallen, fallenOf } from '../fallen';
import type { ActiveUnit, Warband } from '@/types/warband';

const unit = (over: Partial<ActiveUnit> = {}): ActiveUnit => ({
  id: 'u1',
  customName: 'Brother Anselm',
  baseProfileId: 'p1',
  profileSnapshot: { name: 'Trench Pilgrim', category: 'Trooper' },
  equippedWeapons: [{ instanceId: 'w1', name: 'Flail' }],
  equippedArmour: [],
  equippedEquipment: [],
  xp: 3,
  advancements: [],
  injuries: [],
  isDead: false,
  totalCost: 55,
  currentWounds: 0,
  maxWounds: 2,
  bloodMarkers: 2,
  status: 'Active',
  hasActedThisTurn: true,
  ...over,
} as unknown as ActiveUnit);

const warband = (over: Partial<Warband> = {}): Warband => ({
  id: 'w', name: 'The Ninefold Penance', factionId: 'trench-pilgrims',
  ducatLimit: 1000, treasuryDucats: 0, gloryPoints: 0,
  units: [unit()], armoryStash: [], snapshots: [],
  ...over,
} as unknown as Warband);

describe('removing a model from the Roster', () => {
  it('takes it out of units and puts it in fallen', () => {
    const w = warband({ units: [unit(), unit({ id: 'u2', customName: 'Sister Mercy' })] });
    const r = removeFromRoster(w, ['u2']);
    expect(r.units.map((u) => u.id)).toEqual(['u1']);
    expect(r.fallen.map((u) => u.id)).toEqual(['u2']);
    expect(r.removed.map((u) => u.customName)).toEqual(['Sister Mercy']);
  });

  it('takes the Battlekit with it, rather than back to the Arsenal', () => {
    // "Remove the model AND ITS BATTLEKIT from your Warband Roster."
    const r = removeFromRoster(warband(), ['u1']);
    expect(r.fallen[0].equippedWeapons?.map((x) => x.name)).toEqual(['Flail']);
  });

  it('keeps everything the campaign wrote on the model', () => {
    // The memorial is the point of keeping them at all.
    const w = warband({ units: [unit({ xp: 7, injuries: ['D66: 33 - Lost an Eye'] })] });
    const gone = removeFromRoster(w, ['u1']).fallen[0];
    expect(gone.xp).toBe(7);
    expect(gone.injuries).toEqual(['D66: 33 - Lost an Eye']);
  });

  it('clears the battle state, which cannot outlive the model', () => {
    /* A fallen model showing 2 Blood Markers and a half-empty wound track
       reads as one still in a game, which is the one thing it is not. */
    const gone = removeFromRoster(warband(), ['u1']).fallen[0];
    expect(gone.bloodMarkers).toBe(0);
    expect(gone.currentWounds).toBe(gone.maxWounds);
    expect(gone.hasActedThisTurn).toBe(false);
    expect(gone.status).toBe('Out of Action');
  });

  it('still sets isDead, for the older reader that has only that', () => {
    // A file this version writes is read by versions that know no `fallen`.
    expect(removeFromRoster(warband(), ['u1']).fallen[0].isDead).toBe(true);
  });

  it('records which battle it was, where the caller knows', () => {
    const gone = removeFromRoster(warband(), ['u1'], { diedInMatchId: 'm-99' }).fallen[0];
    expect(gone.diedInMatchId).toBe('m-99');
  });

  it('appends to an existing memorial rather than replacing it', () => {
    const w = warband({
      units: [unit({ id: 'u2' })],
      fallen: [unit({ id: 'u-old', customName: 'The First Loss', isDead: true })],
    });
    expect(removeFromRoster(w, ['u2']).fallen.map((u) => u.id)).toEqual(['u-old', 'u2']);
  });

  it('changes nothing when nobody fell', () => {
    const w = warband();
    const r = removeFromRoster(w, []);
    expect(r.units).toBe(w.units);
    expect(r.removed).toEqual([]);
  });

  it('ignores an id that names no model on the roster', () => {
    /* The caller is a step that has already resolved what happened, so a
       model that is not there is a model already removed. */
    const r = removeFromRoster(warband(), ['u1', 'nobody']);
    expect(r.units).toEqual([]);
    expect(r.fallen).toHaveLength(1);
  });
});

describe('a roster written before the dead left it', () => {
  it('has its flagged models moved on load', () => {
    const w = warband({ units: [unit(), unit({ id: 'u2', isDead: true })] });
    const m = migrateFallen(w);
    expect(m.units.map((u) => u.id)).toEqual(['u1']);
    expect(m.fallen?.map((u) => u.id)).toEqual(['u2']);
  });

  it('is left alone when it has no dead in units', () => {
    const w = warband();
    expect(migrateFallen(w)).toBe(w);
  });

  it('is idempotent, so a second load moves nothing', () => {
    const once = migrateFallen(warband({ units: [unit({ isDead: true })] }));
    const twice = migrateFallen(once);
    expect(twice.units).toEqual([]);
    expect(twice.fallen).toHaveLength(1);
  });

  it('invents no battle for a model whose file never recorded one', () => {
    /* Those files do not say which game it was, and a memorial naming the
       wrong battle is worse than one naming none (rule 2). */
    const m = migrateFallen(warband({ units: [unit({ isDead: true })] }));
    expect(m.fallen![0].diedInMatchId).toBeUndefined();
  });

  it('keeps a memorial the file already carried', () => {
    const w = warband({
      units: [unit({ id: 'u2', isDead: true })],
      fallen: [unit({ id: 'u-old', isDead: true })],
    });
    expect(migrateFallen(w).fallen?.map((u) => u.id)).toEqual(['u-old', 'u2']);
  });
});

describe('what the three readers that were wrong now see', () => {
  /*
    Each of these is the defect stated as the thing it made wrong. They read
    `units` with no filter — which was the bug, and is now correct.
  */
  const after = () => {
    const w = warband({ units: [unit({ totalCost: 55 }), unit({ id: 'u2', totalCost: 40 })] });
    const { units, fallen } = removeFromRoster(w, ['u2']);
    return { ...w, units, fallen };
  };

  it('the builder no longer charges for a model the Warband has lost', () => {
    expect(after().units.reduce((n, u) => n + u.totalCost, 0)).toBe(55);
  });

  it('the legality engine is no longer handed it', () => {
    // `toRoster` maps `warband.units` straight through.
    expect(after().units.map((u) => u.id)).not.toContain('u2');
  });

  it('Play Mode no longer deploys it', () => {
    // The default deployment is every model on the roster.
    expect(after().units.map((u) => u.id)).toEqual(['u1']);
  });
});

describe('reading the memorial', () => {
  it('is empty for a Warband that has lost nobody', () => {
    expect(fallenOf(warband())).toEqual([]);
  });

  it('survives a Warband that is null', () => {
    expect(fallenOf(null)).toEqual([]);
  });
});
