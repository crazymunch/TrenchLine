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
