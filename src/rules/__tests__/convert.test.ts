/**
 * Moving a warband between the two shipped rulesets.
 *
 * RV-1's acceptance: *"a warband converted between the two shipped rulesets
 * reports kept, changed and lost correctly for a fixture that has one of each;
 * the refunds book; the bar appears on a mismatch and not otherwise."*
 *
 * The fixture is built by hand and every number in it is read off the
 * generated data rather than typed from memory — which is the whole of rule 1
 * applied to a test. What the two rulesets actually differ on, on the head
 * this was written against:
 *
 *   - `Heretic Trooper`, 30 Ducats, identical statline in both  → KEPT
 *   - `Incendiary Grenades`, 10 Ducats here and 15 there        → CHANGED
 *   - `Heretic Captain`, a Carcass Front entry Latest GitHub
 *     does not carry at all                                     → LOST
 *
 * The first two are asserted against the datasets themselves at the top of
 * the file, so a rebuild that changes one of them fails here with a sentence
 * saying so rather than by leaving a test that passes for the wrong reason.
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { DATASET as TRENCHLINE } from '@/data/generated/trenchline.generated';
import { DATASET as GITHUB } from '@/data/generated/github-latest.generated';
import type { Dataset } from '@/types/catalogue';
import type { ActiveUnit, Warband } from '@/types/warband';
import { recruitable } from '@/rules/recruitable';
import { planConversion, applyConversion, rulesetMismatch } from '../convert';
import { RulesetMismatchBar } from '@/components/builder/RulesetMismatchBar';

const TL = TRENCHLINE as unknown as Dataset;
const GH = GITHUB as unknown as Dataset;
const APP = (TL.factions ?? []).map((f) => f.id ?? f.name);

const shelfTL = recruitable(TL, 'heretic-legions', APP, 'hereticnavalraiders');
const shelfGH = recruitable(GH, 'heretic-legions', APP, 'hereticnavalraiders');

const unitIn = (shelf: typeof shelfTL, name: string) => shelf.units.find((u) => u.name === name);
const weaponIn = (shelf: typeof shelfTL, name: string) => shelf.weapons.find((w) => w.name === name);
const equipIn = (shelf: typeof shelfTL, name: string) => shelf.equipment.find((e) => e.name === name);

/* ------------------------------------------------ the premise, asserted */

describe('what the two shipped rulesets differ on', () => {
  it('has a Heretic Trooper that is the same entry in both', () => {
    const a = unitIn(shelfTL, 'Heretic Trooper');
    const b = unitIn(shelfGH, 'Heretic Trooper');
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(b!.baseCost).toBe(a!.baseCost);
    expect(b!.stats.movement).toBe(a!.stats.movement);
    expect(b!.stats.melee).toBe(a!.stats.melee);
  });

  it('prices Incendiary Grenades differently in each', () => {
    expect(weaponIn(shelfTL, 'Incendiary Grenades')!.cost)
      .not.toBe(weaponIn(shelfGH, 'Incendiary Grenades')!.cost);
  });

  it('has a Heretic Captain in TrenchLine Rules and none in Latest GitHub', () => {
    expect(unitIn(shelfTL, 'Heretic Captain')).toBeDefined();
    expect(unitIn(shelfGH, 'Heretic Captain')).toBeUndefined();
  });
});

/* --------------------------------------------------------- the fixture */

const TROOPER = unitIn(shelfTL, 'Heretic Trooper')!;
const CAPTAIN = unitIn(shelfTL, 'Heretic Captain')!;
const GRENADES = weaponIn(shelfTL, 'Incendiary Grenades')!;
const GRENADES_GH = weaponIn(shelfGH, 'Incendiary Grenades')!;
const MASK = equipIn(shelfTL, 'Gas Mask')!;

const model = (name: string, profile: typeof TROOPER, over: Partial<ActiveUnit> = {}): ActiveUnit => ({
  id: `u-${name}`,
  customName: name,
  baseProfileId: profile.id,
  profileSnapshot: profile,
  equippedWeapons: [],
  equippedArmour: [],
  equippedEquipment: [],
  xp: 0,
  advancements: [],
  injuries: [],
  isDead: false,
  totalCost: profile.baseCost,
  currentWounds: 1,
  maxWounds: 1,
  bloodMarkers: 0,
  status: 'Active',
  hasActedThisTurn: false,
  ...over,
});

const fixture = (): Warband => ({
  id: 'wb-fixture',
  name: 'The Drowned Choir',
  factionId: 'heretic-legions',
  variantId: 'hereticnavalraiders',
  rulesetId: 'trenchline',
  forceMode: 'campaign',
  ducatLimit: 700,
  treasuryDucats: 100,
  gloryPoints: 0,
  ledger: [{
    id: 'led-open', at: '2026-09-01T00:00:00.000Z', reason: 'reconciliation',
    ducats: 100, glory: 0, game: 1,
  }],
  units: [
    model('Grün', TROOPER, {
      equippedWeapons: [{ ...GRENADES, instanceId: 'w-nades' }],
      equippedEquipment: [{ ...MASK, instanceId: 'e-mask' }],
      totalCost: TROOPER.baseCost + GRENADES.cost + MASK.cost,
    }),
    model('Captain Vos', CAPTAIN, {
      equippedWeapons: [{ ...GRENADES, instanceId: 'w-nades-2' }],
      totalCost: CAPTAIN.baseCost + GRENADES.cost,
    }),
  ],
  armoryStash: [],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
});

const find = <T extends { name: string; where: string }>(
  list: T[], name: string, where?: string,
): T | undefined => list.find((x) => x.name === name && (where === undefined || x.where === where));

/* ------------------------------------------------------------- the plan */

describe('planConversion, TrenchLine Rules to Latest GitHub', () => {
  const plan = planConversion(fixture(), GH);

  it('names both rulesets', () => {
    expect(plan.from).toBe('trenchline');
    expect(plan.to).toBe('github-latest');
  });

  it('keeps the entry that is identical in both', () => {
    expect(find(plan.kept, 'Heretic Trooper')).toBeDefined();
    expect(find(plan.changed, 'Heretic Trooper')).toBeUndefined();
    expect(find(plan.lost, 'Heretic Trooper')).toBeUndefined();
  });

  it('keeps an item that is identical in both', () => {
    expect(find(plan.kept, 'Gas Mask', 'Grün')).toBeDefined();
  });

  it('reports the re-priced item as changed, with both prices', () => {
    const changed = find(plan.changed, 'Incendiary Grenades', 'Grün');
    expect(changed).toBeDefined();
    expect(changed!.changes).toEqual([{
      field: 'Cost',
      from: `${GRENADES.cost} Ducats`,
      to: `${GRENADES_GH.cost} Ducats`,
    }]);
  });

  it('reports the entry the target does not carry as lost, and only that one', () => {
    expect(plan.lost.filter((l) => l.kind === 'model').map((l) => l.name))
      .toEqual(['Heretic Captain']);
  });

  it('refunds a lost model at its recorded price and sends its Battlekit to the Arsenal', () => {
    const lost = find(plan.lost, 'Heretic Captain')!;
    expect(lost.refund).toEqual({ ducats: CAPTAIN.baseCost, glory: 0 });
    expect(lost.toStash).toEqual(['Incendiary Grenades']);
  });

  it('adds the refunds up', () => {
    expect(plan.refund).toEqual({ ducats: CAPTAIN.baseCost, glory: 0 });
  });

  it('changes nothing: the warband it was given is untouched', () => {
    const before = fixture();
    const after = fixture();
    planConversion(after, GH);
    expect(after).toEqual(before);
  });
});

describe('planConversion refuses a target that does not carry the faction', () => {
  it('says so rather than reporting every model as lost', () => {
    const plan = planConversion(
      { ...fixture(), factionId: 'heretic-naval-raiders' }, GH);
    expect(plan.refusal).toMatch(/carries no heretic-naval-raiders faction/);
    expect(plan.lost).toEqual([]);
  });
});

describe('a target ruleset that does not name itself', () => {
  it('is refused rather than written onto the warband as a placeholder', () => {
    const nameless = { ...GH, meta: undefined } as unknown as Dataset;
    const plan = planConversion(fixture(), nameless);
    expect(plan.refusal).toMatch(/does not say which ruleset it is/);
    const w = fixture();
    expect(applyConversion(w, plan, nameless)).toBe(w);
  });
});

/* ------------------------------------------------------------ the money */

describe('applyConversion', () => {
  const warband = fixture();
  const plan = planConversion(warband, GH);
  const after = applyConversion(warband, plan, GH, 3, '2026-09-25T00:00:00.000Z');

  it('books one conversion entry per lost thing', () => {
    const booked = (after.ledger ?? []).filter((e) => e.reason === 'conversion');
    expect(booked).toHaveLength(1);
    expect(booked[0].ducats).toBe(CAPTAIN.baseCost);
    expect(booked[0].note).toContain('Heretic Captain');
    /* The game it belongs to, so a reversal takes the whole conversion. */
    expect(booked[0].game).toBe(3);
  });

  it('pays the refund into the Strongbox', () => {
    expect(after.treasuryDucats).toBe(100 + CAPTAIN.baseCost);
  });

  it('takes the lost model off the roster and leaves the kept one', () => {
    expect(after.units.map((u) => u.customName)).toEqual(['Grün']);
  });

  it('puts the lost model\'s Battlekit in the Arsenal', () => {
    expect(after.armoryStash.map((s) => s.name)).toEqual(['Incendiary Grenades']);
    expect(after.armoryStash[0].price).toEqual({ ducats: GRENADES.cost, glory: 0 });
  });

  it('re-prices what it kept, and moves no money doing it', () => {
    const kept = after.units[0];
    expect(kept.equippedWeapons[0].cost).toBe(GRENADES_GH.cost);
    /* The only ledger movement is the refund above: a price change is not a
       transaction, because the book does not re-charge a warband for a
       reprint. */
    expect((after.ledger ?? []).filter((e) => e.reason === 'conversion')).toHaveLength(1);
    expect(kept.totalCost).toBe(TROOPER.baseCost + GRENADES_GH.cost + MASK.cost);
  });

  it('records the warband as being on the target ruleset', () => {
    expect(after.rulesetId).toBe('github-latest');
  });

  it('applies nothing when the plan was refused', () => {
    const refused = planConversion({ ...fixture(), factionId: 'heretic-naval-raiders' }, GH);
    const w = fixture();
    expect(applyConversion(w, refused, GH)).toBe(w);
  });
});

describe('two models with the same name, one of them lost', () => {
  /*
    The plan is matched by handle, never by name. Both of these are called
    `Heretic Captain` on the roster, and a plan keyed by name would take the
    second off along with the first — a conversion deleting a model it had
    just reported as kept.
  */
  const twins = (): Warband => ({
    ...fixture(),
    units: [
      model('Vos', TROOPER, { id: 'u-a', customName: 'Vos' }),
      model('Vos', TROOPER, { id: 'u-b', customName: 'Vos' }),
      model('Vos', CAPTAIN, { id: 'u-c', customName: 'Vos' }),
    ],
  });

  it('loses only the one the target does not carry', () => {
    const w = twins();
    const plan = planConversion(w, GH);
    expect(plan.lost.map((l) => l.ref)).toEqual(['u-c']);
    expect(applyConversion(w, plan, GH).units.map((u) => u.id)).toEqual(['u-a', 'u-b']);
  });

  it('refunds it once', () => {
    const w = twins();
    const after = applyConversion(w, planConversion(w, GH), GH);
    expect((after.ledger ?? []).filter((e) => e.reason === 'conversion')).toHaveLength(1);
    expect(after.treasuryDucats).toBe(100 + CAPTAIN.baseCost);
  });
});

/* ---------------------------------------------- A: the Variant is applied */

describe('a Variant warband converted to the ruleset it is already on', () => {
  /*
    Order 40 A. Units were resolved against the raw `to.units`, which is the
    list BEFORE `recruitable` applies the Variant — so converting a House of
    Wisdom warband to TrenchLine Rules, the ruleset it is already on, turned
    every renamed model back into its base entry and reported the restat as a
    change. A conversion that rewrites a roster nobody asked to change.
  */
  const WISDOM = recruitable(TL, 'iron-sultanate', APP, 'houseofwisdom');

  /** Entries the House of Wisdom renames or restats away from the base list. */
  const renamed = WISDOM.units.filter((u) => {
    const base = TL.units.find((b) => b.entryId === u.id || b.id === u.id);
    return base && base.name !== u.name;
  });

  it('has entries the Variant renames, or this test proves nothing', () => {
    expect(renamed.length).toBeGreaterThan(0);
  });

  const wisdomWarband = (): Warband => ({
    ...fixture(),
    factionId: 'iron-sultanate',
    variantId: 'houseofwisdom',
    units: WISDOM.units
      .filter((u) => u.factionId === 'iron-sultanate')
      .slice(0, 6)
      .map((u, i) => model(`Model ${i}`, u, { id: `u-${i}` })),
  });

  it('reports every model kept, with no change at all', () => {
    const w = wisdomWarband();
    const plan = planConversion(w, TL);
    expect(plan.lost).toEqual([]);
    expect(plan.unresolved).toEqual([]);
    expect(plan.changed.map((c) => `${c.name}: ${c.changes.map((x) => x.field).join()}`))
      .toEqual([]);
    expect(plan.kept.length).toBe(w.units.length);
  });

  it('keeps the Variant\'s own name and statline on the snapshot', () => {
    const w = wisdomWarband();
    const after = applyConversion(w, planConversion(w, TL), TL);
    expect(after.units.map((u) => u.profileSnapshot.name))
      .toEqual(w.units.map((u) => u.profileSnapshot.name));
  });

  it('carries the whole profile across, not a five-field subset', () => {
    /* `movementType`, `movementInches`, `baseSize`, the keywords and the
       innate abilities are what Play Mode, the legality engine and the print
       sheet read off a model. A hand-built subset dropped all of them. */
    const w = wisdomWarband();
    const after = applyConversion(w, planConversion(w, TL), TL);
    const snap = after.units[0].profileSnapshot;
    const source = w.units[0].profileSnapshot;
    expect(snap.stats.movementType).toBe(source.stats.movementType);
    expect(snap.stats.movementInches).toBe(source.stats.movementInches);
    expect(snap.stats.baseSize).toBe(source.stats.baseSize);
    expect(snap.stats.keywords).toEqual(source.stats.keywords);
    expect(snap.innateAbilities).toEqual(source.innateAbilities);
  });

  it('keeps the player\'s Leader nomination, which the roster owns', () => {
    const w = wisdomWarband();
    w.units[0] = { ...w.units[0], profileSnapshot: { ...w.units[0].profileSnapshot, category: 'Leader' } };
    const after = applyConversion(w, planConversion(w, TL), TL);
    expect(after.units[0].profileSnapshot.category).toBe('Leader');
  });
});

/* ------------------------------------- E: customName is not a resolution key */

describe('a model the player renamed', () => {
  it('resolves by its entry, not by the nickname', () => {
    /* A Heretic Trooper a player called "Chorister" is not the Chorister
       entry — and `Chorister` IS a real entry this warband can field, which
       is what made `customName` dangerous as a key. */
    const nickname = 'Chorister';
    const collides = shelfTL.units.find((u) => u.name === nickname);
    expect(collides, `the ${nickname} entry is in this ruleset`).toBeDefined();
    expect(collides!.baseCost).not.toBe(TROOPER.baseCost);

    const w: Warband = {
      ...fixture(),
      units: [model(nickname, TROOPER, { id: 'u-nick' })],
    };
    const after = applyConversion(w, planConversion(w, TL), TL);
    expect(after.units[0].profileSnapshot.name).toBe('Heretic Trooper');
    expect(after.units[0].profileSnapshot.baseCost).toBe(TROOPER.baseCost);
  });
});

/* ------------------------------------------ B: the three gear shelves */

describe('gear a model holds by a route other than the Armoury', () => {
  /*
    Order 40 B. Resolution was against the faction Armoury alone, so anything
    bought off the model's own entry, or off the catalogue's Battlekit, was
    declared lost and refunded — a conversion paying a player for gear they
    still have.
  */
  const armouryNames = new Set(shelfTL.weapons.concat(
    shelfTL.armour as never[], shelfTL.equipment as never[],
  ).map((x: { name: string }) => x.name));

  /** An entry in the catalogue that the Heretic Legions Armoury does not stock. */
  const offShelf = (TL.weapons as { name: string; cost: { ducats: number; glory: number } }[])
    .find((x) => !armouryNames.has(x.name) && x.cost.ducats > 0);

  it('has an entry outside this faction\'s Armoury, or this test proves nothing', () => {
    expect(offShelf).toBeDefined();
  });

  it('keeps an item the catalogue carries but this Armoury does not stock', () => {
    const w: Warband = {
      ...fixture(),
      units: [model('Grün', TROOPER, {
        equippedEquipment: [{
          id: 'e-off', name: offShelf!.name, cost: offShelf!.cost.ducats,
          effect: '', instanceId: 'e-off-1',
        }],
        totalCost: TROOPER.baseCost + offShelf!.cost.ducats,
      })],
    };
    const plan = planConversion(w, TL);
    expect(plan.lost).toEqual([]);
    expect(plan.refund).toEqual({ ducats: 0, glory: 0 });
  });

  it('keeps a custom item unchanged, because no ruleset stocks one', () => {
    const w: Warband = {
      ...fixture(),
      units: [model('Grün', TROOPER, {
        equippedWeapons: [{
          id: 'w-custom', name: 'Grandfather\'s Sabre', type: 'Melee', range: 'Melee',
          modifiers: '+1', keywords: [], cost: 15, isCustom: true, instanceId: 'w-custom-1',
        }],
        totalCost: TROOPER.baseCost + 15,
      })],
    };
    const plan = planConversion(w, TL);
    expect(plan.lost).toEqual([]);
    const after = applyConversion(w, plan, TL);
    expect(after.units[0].equippedWeapons[0].cost).toBe(15);
    expect(after.units[0].equippedWeapons[0].name).toBe('Grandfather\'s Sabre');
  });

  it('keeps an ambiguous name at its recorded price and calls it unresolved', () => {
    /* A name that names two entries names neither. Refunding it would pay a
       player for something the target plainly still has. */
    const twice = (TL.weapons as { name: string }[])
      .map((x) => x.name)
      .filter((n, _i, all) => all.filter((m) => m === n).length > 1)[0];
    expect(twice, 'a name the catalogue carries twice').toBeDefined();

    const w: Warband = {
      ...fixture(),
      units: [model('Grün', TROOPER, {
        equippedEquipment: [{
          id: 'e-amb', name: twice, cost: 9, effect: '', instanceId: 'e-amb-1',
        }],
        totalCost: TROOPER.baseCost + 9,
      })],
    };
    const plan = planConversion(w, TL);
    expect(plan.lost).toEqual([]);
    expect(plan.unresolved.map((u) => u.name)).toEqual([twice]);
    expect(plan.unresolved[0].why).toMatch(/more than one entry/);
    expect(applyConversion(w, plan, TL).units[0].equippedEquipment[0].cost).toBe(9);
  });
});

/* ------------------------------------------- C: free and Glory-priced */

describe('things nothing was paid for', () => {
  /*
    The shape `claimEarnedRecruitment` writes: the snapshot keeps the entry's
    real price and `totalCost` is 0, which is what `grantedFree` means and
    what `fromWarband` reads. A fixture that zeroed `baseCost` too would pass
    whatever the code did.
  */
  const granted = (profile: typeof TROOPER, over: Partial<ActiveUnit> = {}) =>
    model('Gift', profile, {
      id: 'u-gift', grantedFree: 'Curse on Creation', totalCost: 0, ...over,
    });

  it('refunds nothing for a lost granted model, whatever its entry costs', () => {
    const w: Warband = { ...fixture(), units: [granted(CAPTAIN)] };
    expect(w.units[0].profileSnapshot.baseCost).toBe(CAPTAIN.baseCost);

    const plan = planConversion(w, GH);
    expect(plan.lost.map((l) => l.name)).toEqual(['Heretic Captain']);
    expect(plan.refund).toEqual({ ducats: 0, glory: 0 });
    const after = applyConversion(w, plan, GH);
    expect((after.ledger ?? []).filter((e) => e.reason === 'conversion')).toEqual([]);
    expect(after.treasuryDucats).toBe(100);
  });

  it('leaves a kept granted model costing the warband nothing', () => {
    const w: Warband = {
      ...fixture(),
      units: [granted(TROOPER, {
        equippedEquipment: [{ ...MASK, instanceId: 'e-mask' }],
      })],
    };
    const after = applyConversion(w, planConversion(w, GH), GH);
    /* The model is free; its gear is still bought and still counted. */
    expect(after.units[0].totalCost).toBe(MASK.cost);
  });

  it('reports no change on an option the roster records as free', () => {
    /* A Golem's Formula is bought at 0 out of the grant's allowance. A
       "free → 5 Ducats" line describes a charge that is not going to happen. */
    const entry = TL.units.find((u) => (u.options ?? []).some((o) => o.cost.ducats > 0));
    const priced = entry!.options.find((o) => o.cost.ducats > 0)!;
    const w: Warband = {
      ...fixture(),
      units: [model('Golem', TROOPER, {
        grantedBy: 'Book of Golems',
        specialUpgrades: [{ id: 'su-free', name: priced.name, cost: 0, category: priced.group }],
      })],
    };
    const plan = planConversion(w, TL);
    expect(plan.changed).toEqual([]);
    expect(plan.lost).toEqual([]);
  });

  it('refunds a lost Glory-priced option in Glory, as it was booked', () => {
    /*
      `toggleUnitSpecialUpgrade` books `upgrade.price` whole — both
      currencies — under the ref `<unit>:<option>`. Reading only `cost` made
      Devouring Jaws (0 Ducats / 2 Glory) free, so it refunded nothing.
    */
    const w: Warband = {
      ...fixture(),
      units: [model('Grün', TROOPER, {
        specialUpgrades: [{
          id: 'su-jaws', name: 'A Rite No Ruleset Prints', cost: 0, category: 'Strains',
          price: { ducats: 0, glory: 2 },
        } as never],
      })],
    };
    const plan = planConversion(w, TL);
    expect(plan.lost.map((l) => l.refund)).toEqual([{ ducats: 0, glory: 2 }]);
    expect(applyConversion(w, plan, TL).gloryPoints).toBe(2);
  });

  it('does not report a Glory change on an option the roster records no Glory for', () => {
    const entry = TL.units.find((u) => (u.options ?? []).some((o) => o.cost.glory > 0));
    const glorious = entry?.options.find((o) => o.cost.glory > 0);
    if (!glorious) return;
    const w: Warband = {
      ...fixture(),
      units: [model('Grün', TROOPER, {
        baseProfileId: entry!.entryId ?? entry!.id,
        profileSnapshot: { ...TROOPER, name: entry!.name },
        specialUpgrades: [{
          id: 'su-old', name: glorious.name, cost: glorious.cost.ducats || 5,
          category: glorious.group,
        }],
      })],
    };
    const plan = planConversion(w, TL);
    expect(plan.changed.flatMap((c) => c.changes).filter((c) => /Glory/.test(c.to))).toEqual([]);
  });
});

/* ------------------------------------------- D: a stash line is a quantity */

describe('a lost stash line', () => {
  it('refunds once per item held, not once per line', () => {
    /* `buyToStash` raises `quantity` rather than appending a second row. */
    const w: Warband = {
      ...fixture(),
      units: [],
      armoryStash: [{
        id: 'stash-gone', name: 'A Relic No Ruleset Prints', type: 'Equipment',
        cost: 20, currency: 'ducats', price: { ducats: 20, glory: 0 }, quantity: 3,
      }],
    };
    const plan = planConversion(w, TL);
    expect(plan.lost.map((l) => l.refund)).toEqual([{ ducats: 60, glory: 0 }]);
    const after = applyConversion(w, plan, TL);
    expect(after.treasuryDucats).toBe(100 + 60);
    expect(after.armoryStash).toEqual([]);
  });
});

/* -------------------------------------------------------------- the bar */

describe('rulesetMismatch', () => {
  it('reports a warband being read under another ruleset', () => {
    expect(rulesetMismatch({ rulesetId: 'trenchline' }, 'github-latest'))
      .toEqual({ warbandRulesetId: 'trenchline', appRulesetId: 'github-latest' });
  });

  it('says nothing when the two agree', () => {
    expect(rulesetMismatch({ rulesetId: 'trenchline' }, 'trenchline')).toBeNull();
  });

  it('says nothing for a warband that records no ruleset', () => {
    /* Absent is "not recorded", never "the default": every warband saved
       before RV-1 has none, and offering to convert one that may already be
       correct puts a decision in front of a player who cannot make it. */
    expect(rulesetMismatch({}, 'github-latest')).toBeNull();
    expect(rulesetMismatch(null, 'github-latest')).toBeNull();
  });
});

describe('the mismatch bar', () => {
  it('offers both ways out, each naming its own ruleset', () => {
    const html = renderToStaticMarkup(React.createElement(RulesetMismatchBar, {
      warbandRulesetId: 'trenchline',
      appRulesetId: 'github-latest',
      onSwitchApp: () => {},
      onConvert: () => {},
    }));
    expect(html).toContain('Read it as TrenchLine Rules');
    expect(html).toContain('Convert to Latest GitHub Rules');
  });
});
