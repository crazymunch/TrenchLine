import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

import { parseCatalogues, splitMovement } from '../parse-battlescribe.mjs';
import { parseWarbandEntries, parseVariants } from '../parse-warbands.mjs';
import { createProvenance, applyLayer, applyLayers, stampBase } from '../layers.mjs';
import { normaliseStat, normaliseBase, nameKey, verify, applyResolutions } from '../verify.mjs';
import { RULESETS, DEFAULT_RULESET } from '../rulesets.mjs';
import { parseCoreRules } from '../parse-core-rules.mjs';
import { parseWeatherEvents } from '../parse-weather.mjs';

const CAT_DIR = 'data-sources/battlescribe';
const hasCatalogues = fs.existsSync(`${CAT_DIR}/MANIFEST.json`);
const hasBook = fs.existsSync('data-sources/rulebook/extracted/warbands-of-trench-crusade.txt');

/* ------------------------------------------------------------ normalisation */

describe('stat normalisation', () => {
  it('treats every "no value" spelling alike', () => {
    for (const v of ['-', '–', 'N/A', 'n/a', '']) expect(normaliseStat(v)).toBe('-');
  });

  it('treats +0 and 0 as the same modifier', () => {
    expect(normaliseStat('0')).toBe(normaliseStat('+0'));
  });

  // Regression: the "prefix bare numbers with +" rule used to turn 0 into +0,
  // undoing the rule above and inventing a conflict on every Armour of 0.
  it('does not prefix zero with a sign', () => {
    expect(normaliseStat('0')).toBe('0');
  });

  it('treats a bare number as a positive modifier', () => {
    expect(normaliseStat('1')).toBe(normaliseStat('+1'));
  });

  it('ignores the DICE suffix and curly quotes', () => {
    expect(normaliseStat('+2 DICE')).toBe(normaliseStat('+2'));
  });

  it('reconciles base-size spellings', () => {
    expect(normaliseBase('30 by 60mm')).toBe(normaliseBase('30x60mm'));
    expect(normaliseBase('25 mm')).toBe(normaliseBase('25mm'));
  });

  it('matches the book plural against the catalogue singular', () => {
    expect(nameKey('Sniper Priests')).toBe(nameKey('Sniper Priest'));
    expect(nameKey('Yüzbaşı')).toBe(nameKey('Yüzbaşı Captain'));
  });
});

describe('splitMovement', () => {
  it('separates inches from movement type', () => {
    expect(splitMovement('6"/Infantry')).toMatchObject({ movementInches: 6, movementType: 'Infantry' });
    expect(splitMovement('6”/Flying')).toMatchObject({ movementInches: 6, movementType: 'Flying' });
  });
  it('survives a value it cannot parse', () => {
    expect(splitMovement('-').movementInches).toBeNull();
  });
});

/* ------------------------------------------------------------- layer engine */

const unit = (over = {}) => ({
  id: 'u1', name: 'Test Unit', keywords: ['A'], abilities: [],
  cost: { ducats: 10, glory: 0 }, stats: { melee: '+0', armour: '0' }, ...over,
});

const emptyDataset = (units = [unit()]) => ({ units, weapons: [], factions: [], keywords: [] });
const layer = (ops) => ({ id: 'test-layer', name: 'Test', sourceRef: 't', status: 'official', ops });

describe('layer engine', () => {
  it('unsets a field rather than emptying it', () => {
    /*
      A weapon with no special rule carries NO `rules` key — 69 of the 658 do
      — and the app tests the field's presence. `set` to '' would give it a
      rules section containing nothing, which reads as "there is a rule here
      and we lost it".

      It exists because the Dispatch REPRINTS entries: the Gavel of Justice
      comes back with Type, Range and Keywords and no rule, and the
      catalogue's `Wrath of God` on it is what the Witchburner's new `Found
      Guilty` ability replaced. Keeping both places the BLOOD MARKER twice.
    */
    const ds = emptyDataset([]);
    ds.weapons = [{ id: 'w1', name: 'Gavel', keywords: ['CRITICAL'], rules: 'Wrath of God: …' }];
    const p = createProvenance();
    const un = applyLayer(
      ds, layer([{ op: 'unset', target: { kind: 'weapon', id: 'w1' }, field: 'rules' }]), p);
    expect(un).toEqual([]);
    expect('rules' in ds.weapons[0]).toBe(false);
    expect(p.get('weapon', 'w1', 'rules')).toBeTruthy();
  });

  it('follows a weapon rename through to the kit entries that point at it', () => {
    /*
      A weapon's name is one fact stored twice: on the forced-kit entry (from
      the catalogue's selectionEntry) and on the profile. The Goetic Warlock
      carried `Iron-Clawed Hands` on one and `Reaping Claws` on the other, and
      the Dispatch calls the thing `Flaying Iron Claws` — so renaming the
      profile alone would have left the card printing the old name.
    */
    const ds = emptyDataset([unit({
      battlekit: [
        { linkId: 'k1', name: 'Iron-Clawed Hands', profileId: 'w1', keywords: [] },
        { linkId: 'k2', name: 'Something Else', profileId: 'w2', keywords: [] },
      ],
    })]);
    ds.weapons = [{ id: 'w1', name: 'Reaping Claws' }, { id: 'w2', name: 'Something Else' }];
    applyLayer(
      ds,
      layer([{ op: 'set', target: { kind: 'weapon', id: 'w1' }, field: 'name', value: 'Flaying Iron Claws' }]),
      createProvenance());
    expect(ds.units[0].battlekit.map((b) => b.name))
      .toEqual(['Flaying Iron Claws', 'Something Else']);
  });

  it('sets a cost and stamps provenance for it', () => {
    const ds = emptyDataset(); const p = createProvenance();
    applyLayer(ds, layer([{ op: 'setCost', target: { kind: 'unit', id: 'u1' }, currency: 'ducats', value: 99 }]), p);
    expect(ds.units[0].cost.ducats).toBe(99);
    expect(p.get('unit', 'u1', 'cost.ducats').layer).toBe('test-layer');
  });

  it('addresses an entity by name as well as by id', () => {
    const ds = emptyDataset(); const p = createProvenance();
    applyLayer(ds, layer([{ op: 'setCost', target: { kind: 'unit', id: 'Test Unit' }, currency: 'glory', value: 4 }]), p);
    expect(ds.units[0].cost.glory).toBe(4);
  });

  /*
    Two entities sharing a name is the failure mode with the worst shape: the
    op edits the wrong one and the build reports success.
  */
  it('refuses a name that matches two entities, and names their ids', () => {
    const ds = emptyDataset([unit(), unit({ id: 'u2', cost: { ducats: 20, glory: 0 } })]);
    const p = createProvenance();
    const unresolved = applyLayer(
      ds, layer([{ op: 'setCost', target: { kind: 'unit', id: 'Test Unit' }, currency: 'ducats', value: 99 }]), p,
    );
    expect(unresolved).toHaveLength(1);
    expect(unresolved[0].why).toContain('u1');
    expect(unresolved[0].why).toContain('u2');
    // And neither was touched: an ambiguous op edits nothing at all.
    expect(ds.units.map((u) => u.cost.ducats)).toEqual([10, 20]);
  });

  /*
    `all` is how an op says it means the ITEM, not one copy of it. The
    Dispatch's "Add the FUMBLE Keyword to: … Incendiary Grenades" names one
    thing on the page that the dataset holds twice.
  */
  it('applies an `all` target to every entity of that name', () => {
    const ds = emptyDataset([unit(), unit({ id: 'u2' })]);
    const p = createProvenance();
    applyLayer(ds, layer([
      { op: 'addKeyword', target: { kind: 'unit', id: 'Test Unit', all: true }, keyword: 'FUMBLE' },
    ]), p);
    expect(ds.units.every((u) => u.keywords.includes('FUMBLE'))).toBe(true);
  });

  it('leaves an `all` that matches one entity working exactly as before', () => {
    const ds = emptyDataset(); const p = createProvenance();
    const unresolved = applyLayer(ds, layer([
      { op: 'addKeyword', target: { kind: 'unit', id: 'Test Unit', all: true }, keyword: 'FUMBLE' },
    ]), p);
    expect(unresolved).toHaveLength(0);
    expect(ds.units[0].keywords).toContain('FUMBLE');
  });

  it('writes nested fields by dotted path', () => {
    const ds = emptyDataset(); const p = createProvenance();
    applyLayer(ds, layer([{ op: 'set', target: { kind: 'unit', id: 'u1' }, field: 'stats.melee', value: '+2 DICE' }]), p);
    expect(ds.units[0].stats.melee).toBe('+2 DICE');
  });

  it('adds a keyword without duplicating it', () => {
    const ds = emptyDataset(); const p = createProvenance();
    const op = { op: 'addKeyword', target: { kind: 'unit', id: 'u1' }, keyword: 'FUMBLE' };
    applyLayer(ds, layer([op, op]), p);
    expect(ds.units[0].keywords.filter((k) => k === 'FUMBLE')).toHaveLength(1);
  });

  // The failure mode this guards against is an errata transcription silently
  // rotting when an entry is renamed upstream.
  it('reports an op whose target does not exist rather than dropping it', () => {
    const ds = emptyDataset(); const p = createProvenance();
    const un = applyLayer(ds, layer([{ op: 'setCost', target: { kind: 'unit', id: 'nope' }, currency: 'ducats', value: 1 }]), p);
    expect(un).toHaveLength(1);
    expect(un[0].why).toMatch(/not found/);
  });

  it('reports replaceAbility when no such ability exists', () => {
    const ds = emptyDataset(); const p = createProvenance();
    const un = applyLayer(ds, layer([{ op: 'replaceAbility', target: { kind: 'unit', id: 'u1' }, name: 'Ghost', ability: { id: 'x', name: 'X', description: '' } }]), p);
    expect(un[0].why).toMatch(/no ability/);
  });

  it('never applies a speculative layer to a normal ruleset', () => {
    const ds = emptyDataset(); const p = createProvenance();
    const rep = applyLayers(ds, [{ ...layer([{ op: 'setCost', target: { kind: 'unit', id: 'u1' }, currency: 'ducats', value: 999 }]), status: 'speculative' }], p);
    expect(ds.units[0].cost.ducats).toBe(10);
    expect(rep[0].skipped).toMatch(/speculative/);
  });

  it('honours a ruleset that excludes public-beta layers', () => {
    const ds = emptyDataset(); const p = createProvenance();
    applyLayers(ds, [{ ...layer([{ op: 'setCost', target: { kind: 'unit', id: 'u1' }, currency: 'ducats', value: 55 }]), status: 'public-beta' }], p, { includeBeta: false });
    expect(ds.units[0].cost.ducats).toBe(10);
  });
});

describe('verification', () => {
  it('does not flag a conflict when a layer supersedes the rulebook', () => {
    const ds = emptyDataset([unit({ name: 'Brazen Bull', cost: { ducats: 115, glory: 0 }, stats: {} })]);
    const p = createProvenance();
    p.stamp('unit', 'u1', 'cost.ducats', { layer: 'base', source: 'battlescribe' });
    p.stamp('unit', 'Brazen Bull', 'cost.ducats', { layer: 'dispatch-01', source: 'dispatch' });
    const r = verify(ds, [{ name: 'Brazen Bull', ducats: 100, glory: 0, stats: { armour: '0' } }], p, {});
    expect(r.conflicts).toHaveLength(0);
    expect(r.resolved.some((x) => x.chose === 'dispatch-01')).toBe(true);
  });

  it('flags a genuine disagreement between sources', () => {
    const ds = emptyDataset([unit({ name: 'Thing', cost: { ducats: 10, glory: 0 }, stats: { armour: '0' } })]);
    const p = createProvenance();
    p.stamp('unit', 'u1', 'cost.ducats', { layer: 'base', source: 'battlescribe' });
    const r = verify(ds, [{ name: 'Thing', ducats: 42, glory: 0, stats: { armour: '0' } }], p, {});
    expect(r.conflicts.map((c) => c.field)).toContain('cost.ducats');
  });

  /*
    Two catalogue entries can share a name — Combat Medic exists as both a New
    Antioch model and a Mercenary hireling — while the book has one entry for
    each. This used to skip every such name as 'ambiguous', which is how the
    New Antioch Medic's cost sat 25 Ducats under the book's unnoticed. The
    book names the faction in its keywords, so use it.
  */
  const twoMedics = () => emptyDataset([
    unit({ id: 'a', name: 'Combat Medic', factionId: 'New Antioch', cost: { ducats: 40, glory: 0 }, stats: {} }),
    unit({ id: 'b', name: 'Combat Medic', factionId: 'Mercenaries', cost: { ducats: 0, glory: 2 }, stats: {} }),
  ]);
  const bookMedic = (keywords) => [{
    name: 'Combat Medic', ducats: 65, glory: 0, keywords, stats: { armour: '0' },
  }];

  it("compares a duplicated name against the book entry's own faction", () => {
    const r = verify(twoMedics(), bookMedic(['NEW ANTIOCH']), createProvenance(), {});
    expect(r.conflicts.map((c) => c.field)).toEqual(['cost.ducats']);
    expect(r.ambiguous).toHaveLength(0);
  });

  it('leaves the other faction alone rather than inventing a conflict for it', () => {
    // The Mercenary hireling is 2 Glory and matches nothing the book says
    // about the New Antioch model. It must not be reported against it.
    const r = verify(twoMedics(), bookMedic(['NEW ANTIOCH']), createProvenance(), {});
    expect(r.conflicts.every((c) => c.unit === 'Combat Medic')).toBe(true);
    expect(r.conflicts.map((c) => c.ours)).toEqual([40]);
  });

  it('an entry with no faction keyword is a Mercenary', () => {
    // Compared against the 0D/2G hireling, so both currencies disagree with
    // the book's flat 65 — and the New Antioch model is not touched.
    const r = verify(twoMedics(), bookMedic([]), createProvenance(), {});
    expect(r.conflicts.map((c) => c.field))
      .toEqual(['cost.ducats', 'cost.glory']);
    expect(r.conflicts.map((c) => c.ours)).toEqual([0, 2]);
  });

  it('still reports ambiguity when no unit carries the book entry\'s faction', () => {
    const r = verify(twoMedics(), bookMedic(['PILGRIM']), createProvenance(), {});
    expect(r.conflicts).toHaveLength(0);
    expect(r.ambiguous).toHaveLength(2);
  });
});

describe('maintainer resolutions', () => {
  const book = [{
    name: 'Thing', ducats: 65, glory: 0, keywords: [], stats: { armour: '-1' },
  }];
  const dsWith = () => emptyDataset([
    unit({ id: 'u1', name: 'Thing', factionId: 'Mercenaries', cost: { ducats: 40, glory: 0 }, stats: { armour: '-1' } }),
  ]);

  it("writes the book's value into the dataset when the maintainer chose it", () => {
    const ds = dsWith();
    const p = createProvenance();
    const r = applyResolutions(ds, {
      'Thing.cost.ducats': { chose: 'rulebook', value: 65, because: 'the book is authoritative' },
    }, p, book);
    expect(r.errors).toEqual([]);
    expect(ds.units[0].cost.ducats).toBe(65);
    expect(p.get('unit', 'u1', 'cost.ducats').layer).toBe('resolution');
  });

  it('keeps the catalogue value when the maintainer chose battlescribe', () => {
    const ds = dsWith();
    const r = applyResolutions(ds, {
      'Thing.cost.ducats': { chose: 'battlescribe', value: 40, because: 'the book folds in Battlekit' },
    }, createProvenance(), book);
    expect(r.errors).toEqual([]);
    expect(ds.units[0].cost.ducats).toBe(40);
  });

  /*
    The file is a record of decisions, so it has to stay true to the pages it
    cites. An entry claiming the book says 70 when the book says 65 is exactly
    the fabricated-provenance failure the pipeline exists to prevent.
  */
  it('fails when the stated value is not what the source it names says', () => {
    const r = applyResolutions(dsWith(), {
      'Thing.cost.ducats': { chose: 'rulebook', value: 70, because: 'wrong' },
    }, createProvenance(), book);
    expect(r.errors[0]).toMatch(/the book says/);
  });

  it('does not undo a layer that already superseded the field', () => {
    const ds = dsWith();
    const p = createProvenance();
    p.stamp('unit', 'u1', 'cost.ducats', { layer: 'dispatch-01', source: 'dispatch' });
    const r = applyResolutions(ds, {
      'Thing.cost.ducats': { chose: 'rulebook', value: 65, because: 'the book is authoritative' },
    }, p, book);
    expect(ds.units[0].cost.ducats).toBe(40);
    expect(r.applied[0]).toMatch(/superseded by layer/);
  });
});

describe('generated output', () => {
  const file = 'src/data/generated/trenchline.generated.ts';

  it.skipIf(!fs.existsSync(file))('carries no build timestamp', () => {
    // CI proves the committed data still matches data-sources/ by rebuilding
    // and diffing. A timestamp would make that check fail on every run.
    expect(fs.readFileSync(file, 'utf8')).not.toMatch(/builtAt/);
  });

  it.skipIf(!fs.existsSync(file))('records the base commit and layers it was built from', () => {
    const src = fs.readFileSync(file, 'utf8');
    expect(src).toMatch(/"baseCommit": "[0-9a-f]{40}"/);
    expect(src).toMatch(/"layers": \[\s*"warbands-book",\s*"dispatch-01"/);
  });
});

describe('rulesets', () => {
  it('ships the two documented rulesets with TrenchLine as default', () => {
    expect(RULESETS.map((r) => r.id)).toEqual(['github-latest', 'trenchline']);
    expect(DEFAULT_RULESET).toBe('trenchline');
  });
  it('keeps the GitHub ruleset free of layers so it matches NewRecruit', () => {
    expect(RULESETS.find((r) => r.id === 'github-latest').layers).toEqual([]);
  });
});

/* ------------------------------------------------- real data (needs sources) */

describe.skipIf(!hasCatalogues)('catalogue data', () => {
  const parsed = hasCatalogues ? parseCatalogues(CAT_DIR) : { units: [], weapons: [] };

  // The acceptance test from docs/RESTRUCTURE-PLAN.md Phase 1.
  it('parses the Lieutenant exactly as the sources state it', () => {
    const l = parsed.units.find((u) => u.name === 'Lieutenant');
    expect(l).toBeDefined();
    expect(l.stats).toMatchObject({
      movement: '6"/Infantry', movementInches: 6, movementType: 'Infantry',
      armour: '0', base: '32mm',
    });
    expect(normaliseStat(l.stats.ranged)).toBe('+2');
    expect(normaliseStat(l.stats.melee)).toBe('+2');
    expect(l.cost.ducats).toBe(70);
  });

  it('reads recruitment limits, which the old data could not express', () => {
    expect(parsed.units.find((u) => u.name === 'Lieutenant')).toMatchObject({ min: 1, max: 1 });
    expect(parsed.units.find((u) => u.name === 'Sniper Priest')).toMatchObject({ max: 2 });
  });

  it('reads Glory as a cost distinct from Ducats', () => {
    expect(parsed.units.filter((u) => u.cost.glory > 0).length).toBeGreaterThan(0);
  });

  it('gives every unit a base size', () => {
    expect(parsed.units.every((u) => u.stats.base)).toBe(true);
  });

  it('stamps provenance on every base field', () => {
    const ds = { units: parsed.units.slice(0, 5), weapons: [], factions: [], keywords: [] };
    const p = createProvenance();
    stampBase(ds, p, { commit: 'abc1234', fileOf: (e) => e.sourceFile });
    const u = ds.units[0];
    expect(p.get('unit', u.id, 'stats.armour').layer).toBe('base');
    expect(p.get('unit', u.id, 'stats.armour').source).toMatch(/^battlescribe:/);
  });
});

describe.skipIf(!hasBook)('rulebook extraction', () => {
  it('parses the warband entries with their limits', () => {
    const e = parseWarbandEntries();
    expect(e.length).toBeGreaterThanOrEqual(48);
    expect(e.find((x) => x.name === 'Lieutenant')).toMatchObject({ min: 1, max: 1, ducats: 70 });
    expect(e.find((x) => x.name === 'Sniper Priests')).toMatchObject({ max: 2, ducats: 50 });
  });

  // Ten Mercenary entries are priced in Glory (☼), not Ducats (👑). Reading the
  // glyph wrong made every one of them look like a conflict.
  it('reads the Glory currency glyph', () => {
    const e = parseWarbandEntries();
    const glory = e.filter((x) => x.currency === 'glory');
    expect(glory.length).toBe(10);
    expect(glory.find((x) => x.name === 'Goetic Warlock')).toMatchObject({ glory: 4, ducats: 0 });
  });

  it('finds all 14 official warband variants', () => {
    const v = parseVariants();
    expect(v.length).toBe(14);
    expect(v.map((x) => x.name)).toContain('HOUSE OF WISDOM');
    expect(v.find((x) => x.name === 'HOUSE OF WISDOM').specialRules.length).toBeGreaterThan(0);
  });
});

/* ---------------------------------------------------------------- modifiers */

// The catalogues state every conditional rule as a modifier. Discarding them
// was why the generated data had no Kavass, no derived armour, and no way to
// express a Warband Variant changing a recruitment limit.
describe('catalogue modifiers', () => {
  const ds = parseCatalogues('data-sources/battlescribe');
  const unit = (name) => ds.units.find((u) => u.name === name);

  it('reads modifiers off real catalogue entries', () => {
    const n = [...ds.units, ...ds.weapons].reduce((a, e) => a + e.modifiers.length, 0);
    expect(n).toBeGreaterThan(500);
  });

  it('resolves a condition to the entry it names, not a bare UUID', () => {
    const azeb = unit('Azeb');
    const rename = azeb.modifiers.find((m) => m.field === 'name' && m.value === 'Kavass');
    expect(rename).toBeTruthy();
    expect(rename.when.childName).toBe('The House of Wisdom');
    expect(rename.when.scope).toBe('roster');
  });

  it('maps characteristic ids to field paths', () => {
    const azeb = unit('Azeb');
    const armour = azeb.modifiers.filter((m) => m.field === 'stats.armour');
    expect(armour.length).toBeGreaterThan(2);
    // Armour is derived from the armour you equipped, not a fixed number.
    expect(armour.some((m) => m.when?.childName === 'Standard Armour')).toBe(true);
  });

  it('carries the author\'s own label for a modifier group', () => {
    const azeb = unit('Azeb');
    expect(azeb.modifiers.some((m) => m.comment === 'armour adjustments')).toBe(true);
  });

  // "Pride of Jabir: a House of Wisdom Warband can include 0-3 Lions of Jabir"
  // is a +1 on the Lion's roster max, not prose. Deriving it beats transcribing it.
  it('recognises a modifier that changes a recruitment limit', () => {
    const lion = unit('Lion of Jabir');
    expect(lion.max).toBe(2);
    const bump = lion.modifiers.find(
      (m) => m.field.startsWith('constraint:') && m.when?.childName === 'The House of Wisdom');
    expect(bump).toBeTruthy();
    expect(bump.op).toBe('increment');
    expect(bump.value).toBe('1');
  });

  it('nests a group condition above the modifier\'s own', () => {
    const withBoth = [...ds.units, ...ds.weapons]
      .flatMap((e) => e.modifiers)
      .find((m) => m.when && 'all' in m.when && m.comment);
    // Not every catalogue has one; assert the shape only when it does.
    if (withBoth) expect(Array.isArray(withBoth.when.all)).toBe(true);
  });

  it('flags an unmappable field rather than mislabelling it', () => {
    const unmapped = [...ds.units, ...ds.weapons]
      .flatMap((e) => e.modifiers).filter((m) => m.rawField);
    // A handful are expected; a spike means the field maps went stale.
    expect(unmapped.length).toBeLessThan(20);
    for (const m of unmapped) expect(m.field).toBe(m.rawField);
  });

  it('records the containing entry id, which is what rosters address', () => {
    const azeb = unit('Azeb');
    expect(azeb.entryId).toBeTruthy();
    expect(azeb.entryId).not.toBe(azeb.id);
  });
});

/* ------------------------------------------------------------------ options */

// An option is an upgrade that changes a model's rules — a Strain, a Goetic
// Power, an Alchemical Formula. The first parser emitted only entries carrying
// a Unit, Weapon or Battlekit profile, so every one of these was dropped and
// `options[]` was empty on all 89 units.
describe('unit options', () => {
  const ds = parseCatalogues('data-sources/battlescribe');
  const unit = (name) => ds.units.find((u) => u.name === name);
  const allOptions = ds.units.flatMap((u) => u.options);

  it('reads options off real catalogue entries', () => {
    expect(ds.units.filter((u) => u.options.length).length).toBeGreaterThan(30);
    expect(allOptions.length).toBeGreaterThan(150);
  });

  it('carries the Takwin upgrades the preserved roster uses', () => {
    const h = unit('Homunculus');
    const names = h.options.map((o) => o.name);
    for (const n of ['Massive Size', 'Additional Arm', 'Hawk Eyes', 'Human Hands']) {
      expect(names, `Homunculus should offer ${n}`).toContain(n);
    }
    expect(h.options.find((o) => o.name === 'Massive Size').cost.ducats).toBe(30);
  });

  // These live in a *shared* group reached by entryLink, not inline on the
  // unit, which is why reading only inline groups missed them.
  it('follows shared groups, so the Black Grail Strains are present', () => {
    const strains = allOptions.filter((o) => o.group === 'Strains');
    expect(strains.length).toBeGreaterThan(3);
    expect(strains.map((o) => o.name)).toContain('Hellfly Host');
  });

  it('keeps Glory-priced options priced in Glory', () => {
    const glory = allOptions.filter((o) => o.cost.glory > 0);
    expect(glory.length).toBeGreaterThan(0);
    for (const o of glory) expect(o.cost.ducats).toBe(0);
  });

  /*
    Except a STATLINE option, which carries none because the rule it states is
    the statline itself. `Winged` says the model is a Fly Thrall and `Guard Dog`
    that the Trench Dog is a Guard Dog; both point at a Unit profile through
    `unitProfileId` and neither has rules text to carry. See DA-02 and
    `rules/statlineOptions.ts`.
  */
  it('every option carries the rules text that makes it an option', () => {
    for (const o of allOptions.filter((x) => !x.unitProfileId)) {
      expect(o.description.length, o.name).toBeGreaterThan(0);
    }
  });

  it('and a statline option names the profile it swaps in instead', () => {
    const statlines = allOptions.filter((o) => o.unitProfileId);
    expect(statlines.map((o) => o.name).sort()).toEqual([
      'Attack Dog', 'Guard Dog', 'Guard Dog', 'Hellhound',
      'Martyrdom Dog', 'Mercy Dog', 'Mercy Dog', 'Winged',
    ]);
    for (const o of statlines) expect(o.description).toBe('');
  });

  // Gear is already in `weapons`; duplicating the armoury onto every unit that
  // can reach it would inflate the dataset and double-count costs.
  it('does not pull gear in as an option', () => {
    const names = new Set(allOptions.map((o) => o.name));
    for (const gear of ['Standard Armour', 'Reinforced Armour', 'Machine Gun', 'Polearm and Shield']) {
      expect(names, `${gear} is gear, not an option`).not.toContain(gear);
    }
  });
});

/* --------------------------------------------------------- dispatch strains */

describe('the Trench Dispatch Grail Strains', () => {
  const layer = JSON.parse(fs.readFileSync('data-sources/dispatch/dispatch-01.layer.json', 'utf8'));
  const strainOps = layer.ops.filter((o) => o.op === 'addOption' && o.option?.group === 'Strains');

  it('transcribes all four Strains the Dispatch publishes', () => {
    expect(strainOps.map((o) => o.option.name).sort())
      .toEqual(['Bolgias Gut', 'Hellfly Host', 'Leech Grip', 'Tapeworm Throng']);
  });

  it('cites the source line for each', () => {
    for (const o of strainOps) expect(o._src).toMatch(/Grail Strains/);
  });

  it('carries the published rules text, not a summary', () => {
    for (const o of strainOps) expect(o.option.description.length).toBeGreaterThan(40);
  });

  /**
   * The Dispatch prints costs with a currency glyph that the PDF text
   * extraction drops, so a bare number is all that survives. Recording one as
   * Ducats without saying so would be exactly the kind of plausible-but-unbacked
   * value this pipeline exists to prevent.
   *
   * The maintainer has since confirmed all three against the printed page, so
   * the requirement is no longer a caveat but an attribution: the number is
   * unreadable in `data-sources/`, and the only thing standing behind it is a
   * person who looked. Dropping that note would leave a bare 10 that nothing
   * in the repository can justify — so the test still insists on one or the
   * other, and never neither.
   */
  it('never carries a cost whose currency is neither readable nor attributed', () => {
    const priced = strainOps.filter((o) => o.option.cost.ducats > 0 || o.option.cost.glory > 0);
    for (const o of priced) {
      // Hellfly Host is free, and the catalogues corroborate the rest by name.
      if (o.option.name === 'Hellfly Host') continue;
      expect(
        o._costCurrencyUnresolved || o._costCurrencyConfirmed,
        `${o.option.name} must either flag the unread currency or say who confirmed it`
      ).toBeTruthy();
    }
  });

  it('attributes the confirmed currencies to the printed page, not the extraction', () => {
    const confirmed = strainOps.filter((o) => o._costCurrencyConfirmed);
    expect(confirmed.length).toBe(3);
    for (const o of confirmed) {
      expect(o._costCurrencyConfirmed).toMatch(/maintainer/i);
      expect(o._costCurrencyConfirmed).toMatch(/p\.9/);
      // Ducats is the ruling; a Strain silently flipped to Glory later should fail.
      expect(o.option.cost.glory, `${o.option.name} was ruled Ducats`).toBe(0);
      expect(o.option.cost.ducats).toBeGreaterThan(0);
    }
  });

  it('targets the entry by the name the catalogues use, and says why', () => {
    for (const o of strainOps) {
      expect(o.target.id).toBe('Thrall');
      expect(o._targetNote).toMatch(/Grail Thrall/);
    }
  });
});

/*
  The Codex's rules prose. Every assertion here is one of the errors the
  hand-written `officialCoreRules.ts` shipped — a player looks these three up
  mid-game more than anything else in the book.
*/
describe('core rules extraction', () => {
  const { chapters, missing } = parseCoreRules();
  const at = (title) => chapters.filter((c) => c.title === title).pop();

  it('finds every section the table of contents lists', () => {
    expect(missing).toEqual([]);
    expect(chapters.length).toBeGreaterThan(50);
  });

  it('gives Initiative to the fewest models, not the highest roll', () => {
    const c = at('The Initiative Phase');
    expect(c.content).toMatch(/lowest number of models/i);
    // The app said "both players roll a D6, highest wins" flatly. The roll is
    // the tiebreaker, and only the tiebreaker.
    expect(c.content).toMatch(/If both players have the same number of models/i);
  });

  it("puts the Success table's failure band at 2-6, not 1-6", () => {
    const c = at('Success Roll Table');
    expect(c.content).toMatch(/^- 2-6 — Failure/m);
    expect(c.content).not.toMatch(/1-6/);
  });

  it('triggers Morale on half the Warband rounded up, not half at start', () => {
    const c = at('The Morale Phase');
    expect(c.content).toMatch(/half the models in your Warband/i);
    expect(c.content).toMatch(/rounded up/i);
    expect(c.content).not.toMatch(/starting models/i);
  });

  it('keeps the page furniture out of the prose', () => {
    for (const c of chapters) {
      expect(c.content, c.title).not.toMatch(/-- \d+ of \d+ --/);
      expect(c.content, c.title).not.toMatch(/^\*\*(Movement|Combat|Winning)\*\*$/m);
    }
  });

  it('cites a page for every section', () => {
    for (const c of chapters) {
      expect(c.page, c.title).toBeGreaterThan(0);
      expect(c.source.file).toBe('rulebook:trench-crusade-digital-rulebook');
    }
  });
});

/*
  Forced Battlekit. Every assertion is a line the Warbands book prints as a
  `Battlekit` entry on the model, checked against what the catalogue's
  `min="1"` entryLinks produce.
*/
describe('forced Battlekit', () => {
  const ds = parseCatalogues('data-sources/battlescribe');
  const unit = (name, faction) =>
    ds.units.find((u) => u.name === name && (!faction || u.factionId === faction));
  const kitOf = (name, faction) => (unit(name, faction)?.battlekit ?? []).map((b) => b.name);

  it('gives the Combat Medic the kit the book says it always has', () => {
    // "A Combat Medic always has Standard Armour, a Gas Mask, a Medi-kit, and
    // a Misericordia" — warbands-of-trench-crusade, New Antioch entry.
    expect(kitOf('Combat Medic', 'New Antioch').sort())
      .toEqual(['Gas Mask', 'Medikit', 'Standard Armour']);
  });

  /*
    And the arithmetic behind the cost resolution, in the open: 40 Ducats in
    the catalogue plus this kit at Armoury prices is the book's printed 65.
    If a future catalogue prices the forced links directly, this breaks rather
    than double-charging the model in silence.
  */
  it('leaves the forced links unpriced, because the model already pays', () => {
    const kit = unit('Combat Medic', 'New Antioch').battlekit;
    expect(kit.every((b) => b.cost.ducats === 0 && b.cost.glory === 0)).toBe(true);
  });

  it('carries the keywords the gear grants', () => {
    const kit = unit('Combat Medic', 'New Antioch').battlekit;
    expect(kit.find((b) => b.name === 'Gas Mask').keywords).toContain('NEGATE GAS');
  });

  it('reads a Shovel onto the Sultanate Sapper', () => {
    // "A Sultanate Sapper always has a Shovel."
    expect(kitOf('Sultanate Sapper', 'Iron Sultanate')).toEqual(['Shovel']);
  });

  /*
    And every name that Shovel PRINTS, because a link names the entry while a
    roster records the profile.

    The shared `Shovel` entry (Equipment.cat L343) nests an `Include Weapon
    Profile?` child whose profile is called `Weaponized Shovel`, and that is
    the name NewRecruit writes. On the link's name alone the Sapper did not
    appear to carry its own Shovel and the legality engine asked the Iron
    Sultanate Armoury Table about it — FD-17 finding 3.
  */
  it('carries every name a kit entry prints, its children included', () => {
    const shovel = unit('Sultanate Sapper', 'Iron Sultanate').battlekit[0];
    expect(shovel.profileNames).toEqual(
      expect.arrayContaining(['Shovel', 'Weaponized Shovel']));
  });

  it('names nothing a kit entry does not print', () => {
    const medic = unit('Combat Medic', 'New Antioch').battlekit;
    const mask = medic.find((b) => b.name === 'Gas Mask');
    expect(mask.profileNames).toEqual(['Gas Mask']);
  });

  it('leaves a model with no Battlekit line empty rather than guessing', () => {
    expect(kitOf('Trench Pilgrim')).toEqual([]);
  });

  /*
    A `min` on a GROUP is a choice, not a fixture — "a Mamluk Faris always has
    either a Greatsword, or a ..." — and belongs with options.

    This used to say the same of a `min` without a `max` on a LINK, and that
    was wrong: the Combat Biologist's Gas Grenades, Gas Mask and Standard
    Armour are each stated that way (Mercenaries.cat L861–875) and the book
    says the model always has all three. The group rule is what keeps the
    either/or out, and it is untouched.
  */
  it('never reads an either/or group as forced kit', () => {
    for (const u of ds.units) {
      for (const b of u.battlekit) expect(b.quantity, `${u.name}: ${b.name}`).toBe(1);
    }
  });

  /*
    Shape 2: an entryLink with a `min` and no `max`.

    "At least one, and you may take more" is still "always has" for the one.
    Requiring a `max` skipped all three of the Combat Biologist's items and
    left the model with no Battlekit at all.
  */
  it('reads a min-only link as forced kit', () => {
    // "A Combat Biologist always has Gas Grenades, Standard Armour, a Gas
    // Mask, and a Vivisector" — warbands-of-trench-crusade L9802.
    // The Vivisector is a profile on the model itself and is stated from the
    // book in FD-11b; see the note in `forcedKitOf` for why not here.
    expect(kitOf('Combat Biologist', 'Mercenaries').sort())
      .toEqual(['Gas Grenades', 'Gas Mask', 'Standard Armour']);
  });

  /*
    Shape 3: a selectionEntry nested inside the model, min = max, carrying a
    Weapon profile of its own. No link to resolve — the entry simply sits
    inside the model.
  */
  it('reads a nested min=max selectionEntry as forced kit', () => {
    // "Sin Eater always has Reinforced Armour, a Combat Helmet, and a
    // Tenderiser Maul" — warbands-of-trench-crusade L10281.
    expect(kitOf('Sin Eater', 'Mercenaries').sort())
      .toEqual(['Combat Helmet', 'Reinforced Armour', 'Tenderizer Maul']);
  });

  it('carries the nested entry’s own profile, so the weapon can be shown', () => {
    const maul = unit('Sin Eater', 'Mercenaries').battlekit
      .find((b) => b.name === 'Tenderizer Maul');
    expect(maul.profileId).toBe('c63d-fe53-a980-4a2a');
    expect(maul.cost).toEqual({ ducats: 0, glory: 0 });
  });

  /*
    A gear profile on a MODEL node was emitted into `weapons` at the model's
    own price: the Gavel of Justice at the Witchburner's 6 Glory, the
    Vivisector at the Combat Biologist's 3. Nothing sells them — neither has
    an Armoury row — but `fromWarband` falls back to this cost for an item
    that has no row, so it is a price waiting for a caller.
  */
  it('prices a model’s own gear profile at zero, not at the model’s cost', () => {
    const w = (name) => ds.weapons.find((x) => x.name === name);
    expect(w('Gavel of Justice').cost).toEqual({ ducats: 0, glory: 0 });
    expect(w('Vivisector').cost).toEqual({ ducats: 0, glory: 0 });
    expect(w('Infernal Bomb').cost).toEqual({ ducats: 0, glory: 0 });
  });

  it('leaves an ordinary armoury weapon’s own cost alone', () => {
    /* The node IS the weapon there, so its cost is the weapon's. */
    const priced = ds.weapons.filter((w) => w.cost.ducats > 0 || w.cost.glory > 0);
    expect(priced.length).toBeGreaterThan(100);
  });
});

/*
  Hell on Earth's Weather Events. Every assertion is a row of the printed 2D6
  table, so the parser cannot quietly ship a short one — an eleven-row table
  read with a gap in it would hand a player a result the book does not have,
  which is exactly what the invented weather did.
*/
describe('weather events', () => {
  const { procedure, events } = parseWeatherEvents();
  const at = (roll) => events.find((e) => e.roll === roll);

  it('reads a row for every result on 2D6', () => {
    expect(events.map((e) => e.roll)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('reads the names as printed', () => {
    expect(events.map((e) => e.name)).toEqual([
      'Traumatised Earth', 'Hemorrhage Eclipse', 'Hungry Barbed Wire', 'Churning Mud',
      'Oppressive Heat', 'Grim and Indifferent', 'Graveyard Miasma', 'Thin Air',
      'Smog Storm', 'Raining Blood', '(Un)Holy Choir',
    ]);
  });

  it('keeps the rule apart from the flavour line', () => {
    expect(at(2).flavour).toBe('Something truly awful happened here.');
    expect(at(2).effect).toBe(
      'Warbands add –1 DICE to Morale Checks. If a Warband is Shaken, add –2 DICE to Morale Checks instead.');
  });

  /*
    The extractor hyphenates across the column break: "BLOOD MARK-\nERS". Three
    rows hit it, and a rule that reads "place 2 extra BLOOD MARK- ERS" is a rule
    a player has to decode.
  */
  it('rejoins words hyphenated across the column break', () => {
    expect(at(3).effect).toContain('place 2 extra BLOOD MARKERS');
    for (const e of events) expect(e.effect, e.name).not.toMatch(/\b\w+-\s/);
  });

  it('keeps the whole effect, including the second sentence', () => {
    // Hungry Barbed Wire runs to three sentences; a naive row parser keeps one.
    expect(at(4).effect).toContain('DANGEROUS TERRAIN');
    expect(at(4).effect).toContain('make an Injury Roll for that model with –1 DICE');
  });

  it('records "No effect." rather than an empty rule', () => {
    expect(at(7).effect).toBe('No effect.');
  });

  it('carries the procedure, including who decides which Event applies', () => {
    expect(procedure).toContain('each player rolls 2D6');
    expect(procedure).toContain('fewest Campaign Victory Points');
    expect(procedure).toContain('before players have Deployed any models');
  });
});
