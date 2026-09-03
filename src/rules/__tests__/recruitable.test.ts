/**
 * The recruit path, against the real dataset.
 *
 * This is the half of Phase 2 that was left undone: legality had moved onto the
 * generated dataset and recruitment had not, so a roster was checked against
 * sourced data but assembled from data measured 97% wrong. These assert the
 * three things that made the old path wrong, not just that the adapter runs.
 */
import { describe, it, expect } from 'vitest';
import { unobtainable } from '../variantLocks';
import type { Dataset } from '@/types/catalogue';

import { DATASET } from '@/data/generated/trenchline.generated';
import { FACTIONS } from '@/data/defaultRules';
import { recruitable } from '../recruitable';
import { nameKey } from '../names';

const APP_FACTIONS = FACTIONS.map((f) => f.id);
const sultanate = recruitable(DATASET, 'iron-sultanate', APP_FACTIONS);

describe('what a player can recruit', () => {
  it('comes from the catalogues, not from a hand-written list', () => {
    /*
      Every unit in the dataset except the secondary profiles — a Martyr
      Penitent is a resurrected Leper-Pilgrim and a Heretic Raider Legionnaire
      is an upgraded Raider, so neither is a recruit. Asserted as the whole
      list minus exactly those, so a unit going missing for any other reason
      still fails here.
    */
    const secondary = DATASET.units.filter((u) => u.secondaryProfile);
    expect(secondary.map((u) => u.name)).toEqual(['Martyr Penitent', 'Heretic Raider Legionnaire']);

    /*
      And minus the entries the catalogue gates behind a PREREQUISITE rather
      than a Variant — a thing the Warband has to earn, which a Warband being
      mustered cannot have. Named here rather than counted, so one going
      missing for any other reason still fails.

      `Book of Golems` is the Exploration result that grants a Homunculus;
      `Dog Food` is the Glory Item that grants a Trench Dog. See `unobtainable`.
    */
    const gated = unobtainable(DATASET as unknown as Dataset);
    expect([...gated.values()].flat().sort()).toEqual([
      'Book of Golems', 'Book of Golems', 'Book of Golems', 'Book of Golems',
      'Book of Golems', 'Dog Food',
    ]);
    expect(sultanate.units.length).toBe(DATASET.units.length - secondary.length - gated.size);
    expect(sultanate.units.some((u) => u.name === 'Martyr Penitent')).toBe(false);
    const lt = sultanate.units.find((u) => u.name === 'Lieutenant');
    expect(lt).toBeDefined();
    // The acceptance profile: every field traceable to New Antioch.cat.
    expect(lt!.stats.movement).toBe('6"/Infantry');
    expect(lt!.stats.ranged).toBe('+2 Dice');
    expect(lt!.stats.armour).toBe('0');
    expect(lt!.stats.baseSize).toBe('32mm');
    expect(lt!.baseCost).toBe(70);
  });

  it('carries the recruitment limits the old data had none of', () => {
    // `defaultRules.ts` carried no limit on any of its 45 entries. 69 of the
    // real 89 have one, so "1 Lieutenant" was unenforceable.
    const limited = sultanate.units.filter((u) => typeof u.maxCount === 'number');
    expect(limited.length).toBeGreaterThanOrEqual(60);
    expect(sultanate.units.find((u) => u.name === 'Lieutenant')?.maxCount).toBe(1);
  });

  it('gives no model invented starting gear', () => {
    // The catalogues do not issue loadouts. The hand-written entries did, and
    // the invented items then had to be priced — which is where a chunk of the
    // 38% invented wargear came from.
    for (const u of sultanate.units) {
      expect(u.defaultWeapons, u.name).toBeUndefined();
      expect(u.defaultArmour, u.name).toBeUndefined();
    }
  });

  it('resolves faction ids to the spelling the app filters on', () => {
    // Three sources spell a faction three ways. Emitting `Iron Sultanate` here
    // left `AddUnitModal` matching nothing and showing an empty roster.
    const ids = new Set(sultanate.units.map((u) => u.factionId));
    expect(ids.has('iron-sultanate')).toBe(true);
    expect(ids.has('Iron Sultanate')).toBe(false);
    expect(sultanate.units.filter((u) => u.factionId === 'iron-sultanate').length)
      .toBeGreaterThan(5);
  });
});

describe('what a player can buy', () => {
  it('is priced by that faction\'s Armoury Table', () => {
    const gear = [...sultanate.weapons, ...sultanate.armour, ...sultanate.equipment];
    expect(gear.length).toBeGreaterThan(20);
    const armoury = DATASET.armouries.find((a) => nameKey(a.faction).includes('sultanate'));
    expect(gear.length).toBe(armoury!.rows.length);
  });

  it('prices the same weapon differently for a different faction', () => {
    // The reason a shared gear list cannot exist, and the reason the one
    // `cost: number` on the hand-written records was wrong by construction:
    // the same item is priced differently, and sometimes in a different
    // currency, by different Armoury Tables.
    const priced = new Map<string, Set<string>>();
    for (const f of APP_FACTIONS) {
      for (const w of recruitable(DATASET, f, APP_FACTIONS).weapons) {
        const at = priced.get(w.name) ?? new Set<string>();
        at.add(`${w.cost}/${w.gloryCost ?? 0}`);
        priced.set(w.name, at);
      }
    }
    const disagreeing = [...priced.entries()].filter(([, at]) => at.size > 1);
    expect(disagreeing.length,
      'no weapon is priced differently by two armouries — the join has broken')
      .toBeGreaterThan(0);
  });

  it('never invents an armour modifier', () => {
    for (const a of sultanate.armour) {
      if (a.modifier === undefined) continue;
      expect(a.modifier, a.name).toMatch(/INJURY MODIFIER/i);
    }
  });

  it('returns no gear at all when no faction is named', () => {
    // Wargear is priced per faction, so a faction-neutral gear list is not a
    // thing this game has. Returning one would price everything wrong.
    const anyone = recruitable(DATASET, undefined, APP_FACTIONS);
    expect(anyone.units.length).toBeGreaterThan(0);
    expect(anyone.weapons).toEqual([]);
    expect(anyone.armour).toEqual([]);
    expect(anyone.equipment).toEqual([]);
  });
});

describe('the second currency', () => {
  it('is carried, not silently dropped to zero', () => {
    // The Witch Coven Matriarch is 0 Ducats and 5 Glory. The roster format has
    // one cost field, so she rendered as "0 D" — free, and hireable without limit.
    const matriarch = sultanate.units.find((u) => u.name === 'Witch Coven Matriarch');
    expect(matriarch).toBeDefined();
    expect(matriarch!.baseCost).toBe(0);
    expect(matriarch!.gloryCost).toBe(5);
  });

  it('is reported for every entry that has one', () => {
    const named = new Set(sultanate.gloryPriced.map((g) => g.name));
    for (const u of sultanate.units) {
      if (u.gloryCost) expect(named.has(u.name), u.name).toBe(true);
    }
    expect(sultanate.gloryPriced.length).toBeGreaterThan(0);
  });
});

describe('who may lead', () => {
  /*
    `category` cannot answer this: it says what a model is *on a roster*, and
    'Leader' is set there by nomination. So the builder needs the catalogue's
    own `Leader` role carried through, or auto-nomination has to guess from
    cost or a limit of 1 — which is exactly the kind of invented rule the
    audit found everywhere.
  */
  it('is the catalogue Leader role, carried onto the roster profile', () => {
    const lt = sultanate.units.find((u) => u.name === 'Lieutenant');
    expect(lt!.canLead).toBe(true);
    // Elite, but not a Leader: the Iron Sultanate's Yüzbaşı Captain leads.
    const azeb = sultanate.units.find((u) => u.name === 'Azeb');
    expect(azeb?.canLead).toBeUndefined();
  });

  it('leaves no faction without an eligible Leader', () => {
    // A faction whose list has none would recruit a whole Warband and never
    // get a Leader nominated.
    const byFaction = new Map<string, boolean>();
    for (const u of sultanate.units) {
      byFaction.set(u.factionId, (byFaction.get(u.factionId) ?? false) || !!u.canLead);
    }
    for (const f of APP_FACTIONS) {
      // Mercenaries are their own catalogue faction and lead nothing.
      if (!byFaction.has(f)) continue;
      expect(byFaction.get(f), `${f} has no Leader-eligible entry`).toBe(true);
    }
  });

  it('never marks a Mercenary as Leader-eligible', () => {
    for (const u of sultanate.units) {
      if (u.category === 'Mercenary') expect(u.canLead, u.name).toBeUndefined();
    }
  });
});
