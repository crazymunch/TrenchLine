/**
 * The arsenal, against the real dataset.
 *
 * Tested against the generated data rather than a fixture for the reason the
 * campaign tables are: the failure this replaces was not a wrong number in one
 * record, it was 34 records that all looked fine. A fixture would only prove
 * the join works on data I wrote.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import { buildArsenal, offersDiffer, hasProfile, groupOf } from '../arsenal';
import { nameKey } from '../names';

const arsenal = buildArsenal(DATASET);
const find = (name: string) => arsenal.find((i) => i.key === nameKey(name));

describe('the Battlekit chapter', () => {
  it('is derived, and covers the whole chapter', () => {
    // 18 ranged, 10 melee, 5 grenades, 1 shield, 2 armour, 20 equipment.
    expect(DATASET.battlekit).toHaveLength(56);
    const sections = new Set(DATASET.battlekit.map((b) => b.section));
    expect([...sections].sort()).toEqual([
      'Armour', 'Equipment', 'Grenades', 'Melee Weapons', 'Ranged Weapons', 'Shields',
    ]);
  });

  it('carries the published description verbatim', () => {
    const rifle = DATASET.battlekit.find((b) => b.name === 'Anti-Materiel Rifle');
    expect(rifle?.description).toMatch(/^Enormous long rifles designed to take out/);
    expect(rifle?.keywords).toEqual(['+1 INJURY DICE', 'CRITICAL', 'HEAVY', 'IGNORE ARMOUR']);
  });

  it('keeps a special rule that wraps across lines whole', () => {
    const smg = DATASET.battlekit.find((b) => b.name === 'Submachine Gun');
    expect(smg?.rules).toHaveLength(1);
    // The rule runs to four printed lines; a scan that stopped at the first
    // one would leave "can take two Shoot ACTIONS" with no conditions on it.
    expect(smg?.rules[0]).toContain('two Shoot ACTIONS during the same Activation');
    expect(smg?.rules[0]).toMatch(/between the Shoot ACTIONS\.$/);
  });

  it('folds a sub-bullet into the rule it belongs to', () => {
    // The Medi-kit's two options are alternatives *within* Treat ACTION.
    // Promoting them would read as three separate rules a model has.
    const medi = DATASET.battlekit.find((b) => b.name === 'Medi-kit');
    expect(medi?.rules).toHaveLength(1);
    expect(medi?.rules[0]).toContain('• Remove 1 BLOOD MARKER');
    expect(medi?.rules[0]).toContain('• Stand up a friendly model');
  });

  it('does not attribute a section-wide note to the entry above it', () => {
    // The Armour section's warning about double-counting Injury Modifiers sits
    // directly under the Trench Shield's profile. Read forwards it looks like
    // one of the Shield's own rules, and reads entirely plausibly as one.
    expect(find('Trench Shield')?.note).toBeNull();
    expect(find('Standard Armour')?.note).toBeNull();
    // The one entry that really does carry unbulleted rules text.
    expect(find('Field Shrine')?.note).toContain('mounted on a 40mm base');
  });
});

describe('an arsenal item', () => {
  it('carries every faction that stocks it, not one', () => {
    const rifle = find('Automatic Rifle');
    expect(rifle).toBeDefined();
    expect(rifle!.offers.length).toBeGreaterThan(1);
  });

  it('keeps prices apart where the factions disagree', () => {
    // The case the hand-written `cost: number` could not express: same weapon,
    // Ducats in one armoury and Glory in another.
    const differing = arsenal.filter(offersDiffer);
    expect(differing.length).toBeGreaterThan(0);
    const mixed = arsenal.find((i) =>
      i.offers.some((o) => o.cost.ducats > 0) && i.offers.some((o) => o.cost.glory > 0));
    expect(mixed, 'no item is priced in Ducats by one faction and Glory by another')
      .toBeDefined();
  });

  it('never invents a profile for gear the sources do not describe', () => {
    for (const item of arsenal) {
      if (hasProfile(item)) continue;
      // No profile means every field stays null/empty — not a plausible blank.
      expect(item.type).toBeNull();
      expect(item.range).toBeNull();
      expect(item.description).toBeNull();
      expect(item.keywords).toEqual([]);
    }
  });

  it('puts every chapter entry in one of the Codex groups', () => {
    for (const b of DATASET.battlekit) {
      expect(groupOf(find(b.name)!), `${b.name} (${b.section})`).not.toBeNull();
    }
  });

  it('keeps chapter entries no armoury stocks', () => {
    // Dropping them would hide that the tables and the chapter disagree about
    // what exists, and lose a rule a player can still be asked to look up.
    const unstocked = arsenal.filter((i) => !i.offers.length && i.description);
    expect(unstocked.length).toBeGreaterThan(0);
  });
});

describe('the Keyword Glossary', () => {
  const glossary = DATASET.keywords;
  const byName = (n: string) => glossary.find((k) => k.name === n);

  it('is derived, and carries the whole book', () => {
    // The hand-written copy had 46. Thirty of the book's were missing from it.
    expect(glossary.length).toBeGreaterThanOrEqual(59);
    expect(byName('ARMOUR PIERCING')).toBeDefined();
    expect(byName('AUTOMATIC (X)')).toBeDefined();
  });

  it('keeps the book\'s Tag/Effect distinction', () => {
    // "A Keyword that confers an Effect also acts as a Tag" — the distinction
    // is itself a rule, so flattening the two would lose one.
    expect(byName('ARTIFICIAL')?.type).toBe('Tag');
    expect(byName('ASSAULT')?.type).toBe('Effect');
    expect(new Set(glossary.map((k) => k.type))).toEqual(new Set(['Tag', 'Effect']));
  });

  it('keeps a parameterised rule as one entry, not as instances', () => {
    // The hand-written copy carried NEGATE FIRE, NEGATE GAS and NEGATE
    // SHRAPNEL and so never had the general rule that covers the rest.
    expect(byName('NEGATE [KEYWORD]')).toBeDefined();
    expect(byName('IGNORE [MODIFIER]')).toBeDefined();
    expect(byName('+/- DICE')).toBeDefined();
  });

  it('does not carry the two keywords that were invented', () => {
    // Neither string appears anywhere in the rulebook.
    expect(byName('HEAVY COVER')).toBeUndefined();
    expect(byName('LIGHT COVER')).toBeUndefined();
  });

  it('carries a whole description, not a truncated one', () => {
    const blast = byName('BLAST (X”)');
    expect(blast?.description).toContain('blast radius');
    // The entry runs to most of a page; a per-line parse would keep one line.
    expect(blast!.description!.length).toBeGreaterThan(400);
    for (const k of glossary) expect(k.description, k.name).toBeTruthy();
  });
});

describe('the twelve scenarios', () => {
  /*
    The rulebook's twelve. `DATASET.scenarios` also carries the Carcass Front
    book's five, which number I to V of their own book — so a scenario is
    identified by its source here, never by its numeral alone.
  */
  const scenarios = DATASET.scenarios.filter((s) => !s.source);
  const byRoman = (r: string) => scenarios.find((s) => s.roman === r);
  const section = (r: string, h: string) =>
    byRoman(r)?.sections.find((x) => x.heading === h)?.body ?? '';

  it('are all twelve, in order, each with its six core sections', () => {
    expect(scenarios).toHaveLength(12);
    expect(scenarios.map((s) => s.number)).toEqual([1,2,3,4,5,6,7,8,9,10,11,12]);
    for (const s of scenarios) {
      for (const h of ['FORCES', 'THE BATTLEFIELD', 'DEPLOYMENT',
                       'GAME LENGTH', 'VICTORY CONDITIONS', 'GLORIOUS DEEDS']) {
        expect(s.sections.find((x) => x.heading === h)?.body, `${s.roman} ${h}`).toBeTruthy();
      }
    }
  });

  it('carries the published game length, which the hand-written set got wrong', () => {
    // The app said five or six Turns for all twelve. The book says four here.
    expect(section('I', 'GAME LENGTH')).toBe('This scenario lasts four Turns.');
    expect(section('II', 'GAME LENGTH')).toBe('This scenario lasts five Turns.');
    expect(section('VII', 'GAME LENGTH')).toBe('This scenario lasts four Turns.');
  });

  it('carries the Infiltrator rule the right way round', () => {
    // The app said Infiltrators "can deploy normally or by using their special
    // deployment rules". The book says the opposite, and it is the difference
    // between a legal deployment and an illegal one.
    expect(section('I', 'DEPLOYMENT')).toContain(
      'Infiltrators must deploy normally (they cannot use their special deployment rules).');
  });

  it('carries the real Glorious Deeds, not the invented ones', () => {
    const deeds = section('I', 'GLORIOUS DEEDS');
    for (const real of ['Bloodletting', 'Cast Them Down', 'Hold Your Ground', 'Lord of War']) {
      expect(deeds, real).toContain(real);
    }
    // 32 of the hand-written set's 46 appear nowhere in the rulebook.
    const all = scenarios.map((s) => s.sections.map((x) => x.body).join(' ')).join(' ');
    for (const invented of ['Iron Resolve', 'Overwhelming Force', 'Warlord Triumphant']) {
      expect(all, invented).not.toContain(invented);
    }
  });

  it('keeps the sections that make a scenario itself', () => {
    // A fixed five-field shape dropped these. They are the scenario's rules.
    expect(byRoman('VI')?.sections.map((s) => s.heading)).toContain('THE DRAGON');
    expect(byRoman('V')?.sections.map((s) => s.heading)).toContain('TRAIN WAGONS');
  });

  it('points every map at a file that exists', () => {
    // All twelve pointed at /maps/scenario_N.webp, and not one of those files
    // is in the repo. The build resolves the slug against public/maps/.
    for (const s of scenarios) {
      expect(s.mapImage, s.name).toBe(`/maps/${s.slug}.png`);
      expect(s.mapImage).not.toMatch(/scenario_\d+\.webp/);
    }
  });
});
