/**
 * BattleScribe's own bookkeeping entries, which are not wargear.
 *
 * `Alchemical Ammuntion (Loaded)` is a hidden `selectionEntry` with a roster
 * max of ZERO that a modifier increments by one for each `Alchemical
 * Ammunition` on the roster. It exists to make BattleScribe count purchases:
 * no cost, no profile, no rules, and a player cannot choose it.
 *
 * A roster carrying one matched nothing and was listed under "NOT IN THIS
 * RULESET" — the worst shape for a miss, because it tells the player their
 * list is provisional over a thing that is not an item at all.
 */
import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import { toRoster } from '../fromWarband';
import type { Dataset } from '@/types/catalogue';
import type { Warband } from '@/types/warband';

const d = DATASET as unknown as Dataset;
const counters = d.counters ?? [];

const unit = d.units.find((u) => /mamluk faris/i.test(u.name)) ?? d.units[0];
const warband = (gear: string[]): Warband => ({
  id: 'wb1', name: 'T', factionId: 'iron-sultanate',
  ducatLimit: 1000, treasuryDucats: 0, gloryPoints: 0,
  units: [{
    id: 'u1', customName: 'Jawhar al-Sari', baseProfileId: unit.id,
    profileSnapshot: unit as never,
    equippedWeapons: gear.map((name, i) => ({ instanceId: `w${i}`, name, cost: 0 })) as never,
    equippedArmour: [], equippedEquipment: [],
    xp: 0, advancements: [], injuries: [], isDead: false,
    totalCost: 0, currentWounds: 1, maxWounds: 1, bloodMarkers: 0, status: 'Active',
  }] as never,
  armoryStash: [], createdAt: '', updatedAt: '',
} as unknown as Warband);

describe('the catalogue’s counters', () => {
  it('are found by their shape, not by the words in their names', () => {
    /*
      Hidden, costless, profileless, capped at zero across the roster and
      incremented once per something else held. Read as "(Loaded)" instead,
      `Dog's Friend` — one marker per `Man's Best Friend` — would be missed,
      and the four the catalogue spells `Ammuntion` would need a table of its
      own typos.
    */
    const names = counters.map((c) => c.name);
    expect(names).toContain('Alchemical Ammuntion (Loaded)');
    expect(names).toContain("Dog's Friend");
    expect(counters.find((c) => c.name === "Dog's Friend")?.forName)
      .toBe("Man's Best Friend");
  });

  it('never take a name that is also a real piece of wargear', () => {
    /*
      `Satchel Charge` has an entry of this shape counting `Satchel Charge`,
      and a Satchel Charge is something a model buys and throws. Dropping that
      name would lose the item rather than the bookkeeping, so a counter whose
      name is the name it counts is not kept.
    */
    for (const c of counters) expect(c.name, c.name).not.toBe(c.forName);
    expect(counters.map((c) => c.name)).not.toContain('Satchel Charge');
  });

  it('are not reported as missing from the ruleset', () => {
    const { unmatched } = toRoster(warband(['Alchemical Ammuntion (Loaded)']), d);
    expect(unmatched.map((u) => u.name)).toEqual([]);
  });

  it('are reached through the catalogue’s own spelling of the item', () => {
    /*
      The catalogue writes `Alchemical Ammuntion (Loaded)` — its own typo — for
      a counter on `Alchemical Ammunition`. A roster can carry the corrected
      spelling, so the name is matched against the item's name plus the
      counter's parenthetical as well as against the counter's own name. Both
      strings come from the catalogue; neither is a misspelling written here.
    */
    const { unmatched } = toRoster(warband(['Alchemical Ammunition (Loaded)']), d);
    expect(unmatched.map((u) => u.name)).toEqual([]);
  });

  it('contribute nothing to the model — they are not items', () => {
    const { roster } = toRoster(warband(['Alchemical Ammunition (Loaded)']), d);
    expect(roster.units[0].items).toEqual([]);
  });

  it('and a name that is neither an item nor a counter is still reported', () => {
    const { unmatched } = toRoster(warband(['Ammunition (Nonexistent)']), d);
    expect(unmatched.map((u) => u.name)).toContain('Ammunition (Nonexistent)');
  });
});
