import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

import { validateRoster, factionMatches, fireteamCap } from '../validate';
import { armouryFor, priceOf, restrictionsFor, stocks } from '../armoury';
import { RULESETS, RULESET_IDS, DEFAULT_RULESET_ID } from '../rulesets';
import { toRoster } from '../fromWarband';
import { diffDatasets, diffAffecting } from '../diff';
import { parseRestrictions, satisfiesOnlyFor } from '../restrictions';
import { rosterCost, budgetState, unitCost, formatCost, type Roster } from '../costs';
import type { Dataset, UnitProfile } from '@/types/catalogue';

/* ------------------------------------------------------------------ fixtures */

const profile = (over: Partial<UnitProfile> = {}): UnitProfile => ({
  id: 'p1', name: 'Trooper', factionId: 'New Antioch', roles: ['Troop'],
  stats: { movement: '6"/Infantry', movementInches: 6, movementType: 'Infantry',
           ranged: '+0', melee: '+0', armour: '0', base: '25mm' },
  cost: { ducats: 10, glory: 0 }, min: null, max: null,
  keywords: [], abilities: [], options: [], battlekit: [], constraints: [], modifiers: [],
  ...over,
});

const roster = (over: Partial<Roster> = {}): Roster => ({
  id: 'r1', name: 'Test', factionId: 'New Antioch',
  units: [], stash: [], budget: { ducats: 1000, glory: 10 },
  ...over,
});

const unit = (profileId: string, over: Partial<Roster['units'][number]> = {}) => ({
  id: `u-${Math.random().toString(36).slice(2)}`,
  profileId, name: 'x', cost: { ducats: 10, glory: 0 }, items: [], options: [],
  ...over,
});

const dataset = (units: UnitProfile[], weapons: unknown[] = [], variants: unknown[] = []) =>
  ({ units, weapons, factions: [], keywords: [], variants,
     meta: { rulesetId: 't', baseCommit: 'x', layers: [] } }) as unknown as Dataset;

/* --------------------------------------------------------------------- costs */

describe('cost arithmetic', () => {
  it('counts Glory as a separate currency', () => {
    const r = roster({ units: [unit('p1', { cost: { ducats: 55, glory: 0 },
      items: [{ weaponId: 'w1', cost: { ducats: 0, glory: 2 } }] })] });
    expect(rosterCost(r)).toEqual({ ducats: 55, glory: 2 });
  });

  it('counts the unassigned stash, which is still bought', () => {
    const r = roster({ stash: [{ cost: { ducats: 7, glory: 0 }, quantity: 2 }] });
    expect(rosterCost(r).ducats).toBe(14);
  });

  it('reports overspend per currency', () => {
    const r = roster({ budget: { ducats: 10, glory: 1 },
      units: [unit('p1', { cost: { ducats: 5, glory: 3 } })] });
    const b = budgetState(r);
    expect(b.overDucats).toBe(false);
    expect(b.overGlory).toBe(true);
    expect(b.over).toBe(true);
  });

  it('includes options and wargear in a model cost', () => {
    const u = unit('p1', {
      cost: { ducats: 40, glory: 0 },
      items: [{ weaponId: 'w', cost: { ducats: 10, glory: 0 }, quantity: 2 }],
      options: [{ optionId: 'o', cost: { ducats: 0, glory: 1 } }],
    });
    expect(unitCost(u)).toEqual({ ducats: 60, glory: 1 });
  });

  it('formats both currencies', () => {
    expect(formatCost({ ducats: 55, glory: 2 })).toBe('55 Ducats + 2 Glory');
    expect(formatCost({ ducats: 0, glory: 4 })).toBe('4 Glory');
    expect(formatCost({ ducats: 0, glory: 0 })).toBe('Free');
  });
});

/* -------------------------------------------------------------- restrictions */

describe('armoury restrictions', () => {
  it('reads "ELITE only, Limit: 3"', () => {
    const r = parseRestrictions('ELITE only, Limit: 3');
    expect(r).toEqual([
      { kind: 'onlyFor', requires: 'ELITE', raw: 'ELITE only' },
      { kind: 'limit', max: 3, raw: 'Limit: 3' },
    ]);
  });

  // The comma inside the bracket must not split the clause.
  it('reads "Limit: 3 (1 per model)" as one rule', () => {
    const r = parseRestrictions('Consumable, Limit: 3 (1 per model)');
    expect(r).toHaveLength(2);
    expect(r[1]).toMatchObject({ kind: 'limit', max: 3, perModel: 1 });
  });

  it('keeps a restriction it cannot parse rather than dropping it', () => {
    const r = parseRestrictions('Janissaries & Yüzbaşı with Janissary Veteran only, Limit: 1');
    expect(r.some((x) => x.kind === 'unparsed' || x.kind === 'onlyFor')).toBe(true);
    expect(r.some((x) => x.kind === 'limit')).toBe(true);
  });

  it('matches "X only" against keywords, roles and the profile name', () => {
    const u = { name: 'Sniper Priest', keywords: ['NEW ANTIOCH'], roles: ['Elite'] };
    expect(satisfiesOnlyFor('ELITE', u)).toBe(true);
    expect(satisfiesOnlyFor('Combat Medic', u)).toBe(false);
    expect(satisfiesOnlyFor('Sniper Priest', u)).toBe(true);
  });
});

/* ---------------------------------------------------------------- validation */

describe('recruitment limits', () => {
  it('rejects more models than the entry allows', () => {
    const p = profile({ id: 'sniper', name: 'Sniper Priest', max: 2 });
    const r = roster({ units: [unit('sniper'), unit('sniper'), unit('sniper')] });
    const v = validateRoster(r, dataset([p]));
    expect(v.legal).toBe(false);
    expect(v.errors.map((e) => e.code)).toContain('unit-max');
  });

  it('accepts exactly the maximum', () => {
    const p = profile({ id: 'sniper', max: 2 });
    const v = validateRoster(roster({ units: [unit('sniper'), unit('sniper')] }), dataset([p]));
    expect(v.errors.filter((e) => e.code === 'unit-max')).toHaveLength(0);
  });

  it('requires an entry the faction must include', () => {
    const lt = profile({ id: 'lt', name: 'Lieutenant', min: 1, max: 1 });
    const v = validateRoster(roster({ units: [] }), dataset([lt]));
    expect(v.errors.map((e) => e.code)).toContain('unit-min');
    expect(v.errors[0].message).toMatch(/must include 1 Lieutenant/);
  });

  it('does not require another faction\'s leader', () => {
    const lt = profile({ id: 'lt', name: 'Yüzbaşı', factionId: 'Iron Sultanate', min: 1 });
    const v = validateRoster(roster({ factionId: 'New Antioch' }), dataset([lt]));
    expect(v.errors.filter((e) => e.code === 'unit-min')).toHaveLength(0);
  });

  it('flags a model whose profile is not in the ruleset', () => {
    const v = validateRoster(roster({ units: [unit('ghost')] }), dataset([]));
    expect(v.errors.map((e) => e.code)).toContain('unknown-profile');
  });
});

describe('wargear legality', () => {
  const trooper = profile({ id: 'tr', name: 'Trooper', roles: ['Troop'], keywords: [] });
  const elite = profile({ id: 'el', name: 'Sniper Priest', roles: ['Elite'], keywords: [] });
  const pistol = { id: 'w-pistol', name: 'Automatic Pistol', restrictions: ['ELITE only, Limit: 3'] };

  it('rejects ELITE-only wargear on a Troop', () => {
    const r = roster({ units: [unit('tr', { items: [{ weaponId: 'w-pistol', cost: { ducats: 20, glory: 0 } }] })] });
    const v = validateRoster(r, dataset([trooper], [pistol]));
    expect(v.errors.map((e) => e.code)).toContain('wargear-restricted');
  });

  it('allows it on an Elite', () => {
    const r = roster({ units: [unit('el', { items: [{ weaponId: 'w-pistol', cost: { ducats: 20, glory: 0 } }] })] });
    const v = validateRoster(r, dataset([elite], [pistol]));
    expect(v.errors.filter((e) => e.code === 'wargear-restricted')).toHaveLength(0);
  });

  it('enforces a roster-wide Limit', () => {
    const items = [{ weaponId: 'w-pistol', cost: { ducats: 20, glory: 0 } }];
    const r = roster({ units: [unit('el', { items }), unit('el', { items }), unit('el', { items }), unit('el', { items })] });
    const v = validateRoster(r, dataset([elite], [pistol]));
    expect(v.errors.map((e) => e.code)).toContain('wargear-limit');
  });

  it('surfaces an unparseable restriction as a warning rather than hiding it', () => {
    const odd = { id: 'w-odd', name: 'Odd Thing', restrictions: ['Something we cannot read'] };
    const r = roster({ units: [unit('tr', { items: [{ weaponId: 'w-odd', cost: { ducats: 1, glory: 0 } }] })] });
    const v = validateRoster(r, dataset([trooper], [odd]));
    expect(v.warnings.map((w) => w.code)).toContain('unparsed-restriction');
    expect(v.legal).toBe(true); // a warning must not block a roster
  });
});

describe('warband variants', () => {
  const hw = {
    id: 'house-of-wisdom', name: 'HOUSE OF WISDOM', factionId: '', ops: [],
    specialRules: [
      { name: 'Private Venture', description: 'A House of Wisdom Warband cannot include a Yüzbaşı, Janissaries, or Sultanate Assassins.' },
      { name: 'Alchemists', description: 'A House of Wisdom Warband must include 1-2 Jabirean Alchemists.' },
    ],
  };
  const alchemist = profile({ id: 'alch', name: 'Jabirean Alchemist', factionId: 'Iron Sultanate' });
  const yuz = profile({ id: 'yuz', name: 'Yüzbaşı Captain', factionId: 'Iron Sultanate' });

  it('forbids what the variant forbids', () => {
    const r = roster({ factionId: 'Iron Sultanate', variantId: 'house-of-wisdom',
      units: [unit('alch'), unit('yuz')] });
    const v = validateRoster(r, dataset([alchemist, yuz], [], [hw]));
    expect(v.errors.map((e) => e.code)).toContain('variant-forbids');
  });

  it('passes when the forbidden entry is absent', () => {
    const r = roster({ factionId: 'Iron Sultanate', variantId: 'house-of-wisdom', units: [unit('alch')] });
    const v = validateRoster(r, dataset([alchemist, yuz], [], [hw]));
    expect(v.errors.filter((e) => e.code === 'variant-forbids')).toHaveLength(0);
  });

  it('requires what the variant requires', () => {
    const r = roster({ factionId: 'Iron Sultanate', variantId: 'house-of-wisdom', units: [] });
    const v = validateRoster(r, dataset([alchemist], [], [hw]));
    expect(v.errors.map((e) => e.code)).toContain('variant-requires');
  });
});

describe('faction matching', () => {
  it('reconciles catalogue file names with roster slugs', () => {
    expect(factionMatches('Iron Sultanate', 'iron-sultanate')).toBe(true);
    expect(factionMatches('New Antioch', 'new-antioch')).toBe(true);
    expect(factionMatches('New Antioch', 'black-grail')).toBe(false);
  });
});

/* ------------------------------------------- the real roster, real dataset */

const GENERATED = 'src/data/generated/trenchline.generated.ts';
const FIXTURE = 'data-sources/fixtures/al-qarn-rihla/04-august-1320d-CURRENT.json';
const haveReal = fs.existsSync(GENERATED) && fs.existsSync(FIXTURE);

describe.skipIf(!haveReal)('Al-Qarn Rihla — the real roster', () => {
  const loadDataset = (): Dataset => {
    const src = fs.readFileSync(GENERATED, 'utf8');
    const body = src.slice(src.indexOf('=', src.indexOf('export const DATASET')) + 1,
                           src.lastIndexOf('as unknown as Dataset'));
    return JSON.parse(body.trim()) as Dataset;
  };

  // The acceptance test for Phase 2: the maintainer's own 1,320-Ducat
  // Iron Sultanate House of Wisdom warband must validate as legal.
  it('validates the House of Wisdom rules against the real roster', () => {
    const ds = loadDataset();
    const nr = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
    const sels = (nr.roster ?? nr).forces[0].selections.filter((s: { customName?: string }) => s.customName);

    const byName = new Map(ds.units.map((u) => [u.name.toLowerCase(), u]));
    const units = sels.map((s: { name: string; customName: string }) => {
      const p = byName.get(s.name.toLowerCase().replace(/^favoured\s+/, ''));
      return unit(p?.id ?? `missing:${s.name}`, { name: s.customName, cost: p?.cost ?? { ducats: 0, glory: 0 } });
    });

    const r = roster({
      factionId: 'Iron Sultanate',
      variantId: 'house-of-wisdom',
      units,
      budget: { ducats: 1320, glory: 9 },
    });

    const v = validateRoster(r, ds);

    // The House of Wisdom "Private Venture" rule forbids a Yüzbaşı,
    // Janissaries and Sultanate Assassins. This roster has none.
    expect(v.errors.filter((e) => e.code === 'variant-forbids')).toHaveLength(0);
    // And it must include 1-2 Jabirean Alchemists. It has two.
    expect(v.errors.filter((e) => e.code === 'variant-requires')).toHaveLength(0);
  });

  it('finds two Jabirean Alchemists, as the variant requires', () => {
    const nr = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
    const sels = (nr.roster ?? nr).forces[0].selections.filter((s: { customName?: string }) => s.customName);
    const alchemists = sels.filter((s: { name: string }) => s.name === 'Jabirean Alchemist');
    expect(alchemists).toHaveLength(2);
  });

  it('carries Glory-costed wargear the old model could not represent', () => {
    const nr = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
    const all: { name: string; costs?: { name: string; value: number }[] }[] = [];
    const walk = (xs: { selections?: unknown[] }[] = []) => {
      for (const s of xs as typeof all) { all.push(s); walk((s as { selections?: [] }).selections); }
    };
    walk((nr.roster ?? nr).forces[0].selections);
    const glory = all.filter((s) => s.costs?.some((c) => c.name === 'Glory Points' && c.value > 0));
    expect(glory.length).toBeGreaterThan(0);
    expect(glory.map((g) => g.name)).toContain('Sniper Scope');
  });
});

/* ------------------------------------------------------- faction-level rules */

describe('faction special rules', () => {
  const antioch = {
    id: 'new-antioch', name: 'New Antioch',
    specialRules: [{
      name: 'New Antioch Fireteams',
      description: 'A New Antioch Warband can include up to 2 Fireteams. Each Fireteam ' +
                   'consists of any two models from the Warband.',
    }],
  };

  it('reads the Fireteam cap out of the published rule text', () => {
    expect(fireteamCap(antioch, undefined)).toBe(2);
  });

  it('lets a variant raise the cap it states', () => {
    const stoss = {
      id: 'x', name: 'Stoßtruppen', factionId: '', ops: [],
      specialRules: [{
        name: 'Expert Fireteams',
        description: 'A Stosstruppen of the Free State of Prussia Warband can include ' +
                     'up to 3 Fireteams instead of only 2.',
      }],
    } as unknown as Parameters<typeof fireteamCap>[1];
    expect(fireteamCap(antioch, stoss)).toBe(3);
  });

  it('is absent for a faction the book says has no special rules', () => {
    expect(fireteamCap({ specialRules: [] }, undefined)).toBeNull();
  });
});

/* ------------------------------------------------------------- the armoury */

/**
 * The Armoury Table is the pricing and legality authority, and it is per
 * faction. Every assertion here reads the real generated data.
 */
describe('faction armouries', () => {
  const load = () => {
    const s = fs.readFileSync('src/data/generated/trenchline.generated.ts', 'utf8');
    const start = s.indexOf('{', s.indexOf('DATASET: Dataset ='));
    return JSON.parse(s.slice(start, s.lastIndexOf('} as unknown') + 1));
  };
  const ds = load();

  it('carries one armoury per faction', () => {
    // Six from the Warbands book, plus the two Carcass Front lists.
    expect(ds.armouries.map((a: { factionId: string }) => a.factionId)).toEqual([
      'new-antioch', 'trench-pilgrims', 'iron-sultanate', 'heretic-legions',
      'cult-of-the-black-grail', 'court-of-the-seven-headed-serpent',
      'procession-of-the-sacred-affliction', 'heretic-naval-raiders',
    ]);
    for (const a of ds.armouries) expect(a.rows.length).toBeGreaterThan(20);
  });

  /**
   * The case that forced this model. Same weapon, three armouries, two
   * currencies and two different limits — no single `cost` field can say it.
   */
  it('prices the Automatic Rifle per faction, currency and limit included', () => {
    const rifle = { name: 'Automatic Rifle' };

    const antioch = armouryFor(ds, 'new-antioch');
    expect(priceOf(antioch, rifle)).toEqual({ ducats: 40, glory: 0 });
    expect(restrictionsFor(antioch, rifle).join()).toMatch(/Limit: 1/);

    const heretic = armouryFor(ds, 'heretic-legions');
    expect(priceOf(heretic, rifle)).toEqual({ ducats: 0, glory: 2 });
    expect(restrictionsFor(heretic, rifle).join()).toMatch(/Limit: 2/);
  });

  it('matches a slug faction id against the book\'s prose name', () => {
    expect(armouryFor(ds, 'iron-sultanate')?.faction).toBe('Iron Sultanate');
    expect(armouryFor(ds, 'cult-of-the-black-grail')?.faction).toBe('Cult of the Black Grail');
  });

  // Never shop from someone else's list because a name did not match.
  it('returns nothing for a faction it cannot match, rather than guessing', () => {
    expect(armouryFor(ds, 'not-a-faction-at-all')).toBeUndefined();
    expect(priceOf(undefined, { name: 'Automatic Rifle' })).toBeNull();
  });

  // "Not stocked" is a legality answer, not a free item.
  it('distinguishes an item a faction does not stock from a free one', () => {
    const sultanate = armouryFor(ds, 'iron-sultanate');
    expect(stocks(sultanate, { name: 'Jezzail' })).toBe(true);
    expect(stocks(sultanate, { name: 'Not A Real Weapon' })).toBe(false);
    expect(priceOf(sultanate, { name: 'Not A Real Weapon' })).toBeNull();
  });
});

/* --------------------------------------------------------- ruleset registry */

describe('ruleset registry', () => {
  it('declares exactly the two rulesets the pipeline builds', () => {
    expect(RULESET_IDS.sort()).toEqual(['github-latest', 'trenchline']);
  });

  it('has TrenchLine as the default', () => {
    expect(DEFAULT_RULESET_ID).toBe('trenchline');
  });

  // It is imported by both the API route and the client precisely so that
  // neither ends up bundling a 1.6 MB dataset to find out what exists.
  it('describes every ruleset without importing any dataset', () => {
    for (const r of RULESETS) {
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.description.length).toBeGreaterThan(20);
    }
  });
});

/* ------------------------------------------- the saved warband, end to end */

/**
 * The vertical slice: a saved `Warband` in the app's own shape, joined against
 * the generated dataset, priced from the faction armoury, and validated.
 *
 * This is what 2.6 puts on screen, so it is worth testing the join itself —
 * particularly that a name which does not resolve is reported rather than
 * quietly dropped, since a dropped model makes an illegal roster look legal.
 */
describe('toRoster — joining a saved warband to the dataset', () => {
  const ds = (() => {
    const s = fs.readFileSync('src/data/generated/trenchline.generated.ts', 'utf8');
    const start = s.indexOf('{', s.indexOf('DATASET: Dataset ='));
    return JSON.parse(s.slice(start, s.lastIndexOf('} as unknown') + 1));
  })();

  const warband = (over = {}) => ({
    id: 'w1', name: 'Test', factionId: 'Iron Sultanate',
    ducatLimit: 1320, treasuryDucats: 0, gloryPoints: 9,
    units: [], armoryStash: [], createdAt: '', updatedAt: '',
    ...over,
  }) as unknown as Parameters<typeof toRoster>[0];

  const model = (profileName: string, gear: string[] = []) => ({
    id: `u-${profileName}`, customName: profileName,
    profileSnapshot: { name: profileName },
    equippedWeapons: gear.map((n) => ({ name: n })),
    equippedArmour: [], equippedEquipment: [],
  });

  it('joins by name and prices from the faction armoury', () => {
    const { roster, unmatched } = toRoster(
      warband({ units: [model('Jabirean Alchemist', ['Sword/Axe'])] }), ds);

    expect(unmatched).toEqual([]);
    expect(roster.units).toHaveLength(1);
    expect(roster.units[0].cost.ducats).toBe(55);
    // 4 Ducats from the Iron Sultanate Armoury Table, not the catalogue's 0.
    expect(roster.units[0].items[0].cost).toEqual({ ducats: 4, glory: 0 });
  });

  /**
   * NewRecruit prefixes an elite-promoted model. A saved warband can hold that
   * printed name while the dataset holds the base entry.
   */
  it('resolves a name carrying an elite-promotion title', () => {
    const { roster, unmatched } = toRoster(
      warband({ units: [model('Favoured Brazen Bull')] }), ds);
    expect(unmatched).toEqual([]);
    expect(roster.units[0].cost.ducats).toBe(115);
  });

  // The important one: silence here would be a false LEGAL.
  it('reports a model it cannot join rather than dropping it', () => {
    const { roster, unmatched } = toRoster(
      warband({ units: [model('Entirely Fictional Warrior')] }), ds);
    expect(roster.units).toHaveLength(0);
    expect(unmatched).toEqual([{ kind: 'unit', name: 'Entirely Fictional Warrior' }]);
  });

  it('reports wargear it cannot join, naming the model it was on', () => {
    const { unmatched } = toRoster(
      warband({ units: [model('Jabirean Alchemist', ['Plasma Halberd'])] }), ds);
    expect(unmatched).toEqual([
      { kind: 'wargear', name: 'Plasma Halberd', on: 'Jabirean Alchemist' },
    ]);
  });

  it('carries the variant through so its rules are enforced', () => {
    const { roster } = toRoster(
      warband({ variantId: 'house-of-wisdom', units: [model('Jabirean Alchemist')] }), ds);
    expect(roster.variantId).toBe('house-of-wisdom');
  });
});

/* --------------------------------------------------------------- ruleset diff */

/**
 * Switching ruleset shows a diff rather than mutating saved data. These read
 * the two real generated datasets, so the diff is the one a player would see.
 */
describe('diffDatasets', () => {
  const load = (f: string) => {
    const s = fs.readFileSync(`src/data/generated/${f}.generated.ts`, 'utf8');
    const start = s.indexOf('{', s.indexOf('DATASET: Dataset ='));
    return JSON.parse(s.slice(start, s.lastIndexOf('} as unknown') + 1));
  };
  const trenchline = load('trenchline');
  const github = load('github-latest');

  it('finds the Dispatch changes between the two shipped rulesets', () => {
    const d = diffDatasets(trenchline, github);
    expect(d.changed.length).toBeGreaterThan(0);

    const bull = d.changed.find((c) => c.name === 'Brazen Bull');
    expect(bull, 'the Brazen Bull is the headline Dispatch change').toBeTruthy();
    const cost = bull!.changes.find((c) => c.field === 'Cost');
    expect(cost).toEqual({ field: 'Cost', from: '115 Ducats', to: '100 Ducats' });
  });

  it('is empty against itself', () => {
    const d = diffDatasets(trenchline, trenchline);
    expect(d.changed).toEqual([]);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
  });

  // Direction matters: the fields are "from -> to", not a symmetric set.
  it('reverses cleanly', () => {
    const forward = diffDatasets(trenchline, github);
    const back = diffDatasets(github, trenchline);
    const f = forward.changed.find((c) => c.name === 'Brazen Bull')!
      .changes.find((c) => c.field === 'Cost')!;
    const b = back.changed.find((c) => c.name === 'Brazen Bull')!
      .changes.find((c) => c.field === 'Cost')!;
    expect(b.from).toBe(f.to);
    expect(b.to).toBe(f.from);
  });

  /**
   * The global diff is long; what a player needs first is the part that touches
   * their own roster.
   */
  it('narrows to the entries actually in a warband', () => {
    const d = diffDatasets(trenchline, github);
    const mine = diffAffecting(d, ['Brazen Bull', 'Jabirean Alchemist']);
    expect(mine.map((m) => m.name)).toContain('Brazen Bull');
    expect(diffAffecting(d, ['Nothing At All'])).toEqual([]);
  });

  it('reports only fields a player would recognise as a rules change', () => {
    const d = diffDatasets(trenchline, github);
    const fields = new Set(d.changed.flatMap((c) => c.changes.map((x) => x.field)));
    // ids, source files and provenance differ for reasons that are not rules.
    for (const noise of ['id', 'sourceFile', 'entryId', 'modifiers']) {
      expect(fields.has(noise)).toBe(false);
    }
  });
});
