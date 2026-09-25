/**
 * FD-17's acceptance: the owner's own exports import and validate.
 *
 * > the August and September exports import and validate with no violation
 * > the book does not support, driven by a test on both files.
 *
 * Driven end to end through the real pieces — `recruitable` for the store's
 * unit list, `importNewRecruitRoster` for the file, `toRoster` for the
 * conversion and `validateRoster` for the verdict — with the shipped dataset
 * rather than a fixture, because every one of the five findings was a
 * disagreement between real data and real code that a hand-built fixture
 * would have been written to agree with.
 *
 * Both files are a thirteen-model Iron Sultanate campaign warband,
 * `data-sources/fixtures/newrecruit/`, one a `.ros` and one NewRecruit's own
 * JSON. What each file's violations were, and the ruling on each, is recorded
 * under FD-17 in `docs/FIX-DESIGNS-2026-09-20.md`.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { DATASET } from '@/data/generated/trenchline.generated';
import { recruitable } from '@/rules/recruitable';
import { toRoster } from '@/rules/fromWarband';
import { validateRoster } from '@/rules/validate';
import { importNewRecruitRoster } from '../newRecruitImporter';
import type { UnitProfile } from '@/types/rules';

const APP_FACTIONS = [
  'new-antioch', 'iron-sultanate', 'trench-pilgrims', 'heretic-legions',
  'black-grail', 'court-seven-serpents',
];
const KNOWN: UnitProfile[] = recruitable(
  DATASET, 'iron-sultanate', APP_FACTIONS, undefined,
).units;

const read = (file: string) => fs.readFileSync(
  path.join(process.cwd(), 'data-sources/fixtures/newrecruit', file), 'utf8');

function verdict(file: string) {
  const imported = importNewRecruitRoster(read(file), KNOWN, DATASET);
  expect(imported.warband, `${file} did not import`).toBeTruthy();
  const { roster, unmatched } = toRoster(imported.warband!, DATASET);
  return { roster, unmatched, violations: validateRoster(roster, DATASET).violations };
}

/**
 * Everything this roster is allowed to say, and nothing else.
 *
 * An exact list rather than a count: a new violation replacing an old one
 * leaves the count alone, and it is the specific claim that has to be
 * book-supported.
 */
const ALLOWED: Record<string, string[]> = {
  'al-qarn-rihla-august.ros': [],
  /*
    The Scripture Guardian is the September file's one violation, and it is
    correct. The Mercenary's entry says "In addition, it must have either two
    1-Handed Melee Weapons or one 2-Handed Melee Weapon", and the export gives
    it no selections at all: it is a model the owner recruited and has not
    armed. Warned rather than refused, because an unfinished model is not an
    illegal one.
  */
  'al-qarn-rihla-september.json': ['mercenary-melee-required'],
};

describe.each(Object.keys(ALLOWED))('%s', (file) => {
  it('imports every model', () => {
    const imported = importNewRecruitRoster(read(file), KNOWN, DATASET);
    expect(imported.warband!.units.length).toBeGreaterThan(10);
    expect(imported.unmatched ?? []).toEqual([]);
  });

  it('validates with no violation the book does not support', () => {
    const { violations } = verdict(file);
    expect(violations.map((v) => `${v.code}: ${v.message}`).sort())
      .toEqual(violations.filter((v) => ALLOWED[file].includes(v.code))
        .map((v) => `${v.code}: ${v.message}`).sort());
    expect(violations.map((v) => v.code)).toEqual(ALLOWED[file]);
  });

  /*
    The one name `toRoster` cannot join is reported, not dropped: Machine
    Armour reaches the Sultanate through a hidden entryLink that the flat
    weapons list cannot express (WC-1).

    The Sniper Scope used to be the second, and is not any more. It was read as
    an Exploration find the dataset could not price, because the Glory Item
    Tables had never been parsed — and it is not a find at all: the rulebook
    prints it in the Sultanate's Glory Item Table at 2 ☼ (p.126), which RR-14
    now derives. The owner's own roster is where that shows: an item they had
    bought and the app could not name is now an Armoury row with a price.
  */
  it('reports the names it cannot join, and no others', () => {
    expect(verdict(file).unmatched.map((u) => u.name).sort())
      .toEqual(['Machine Armour']);
  });
});

describe('FD-17 finding 2: a Promotion is part of what a model IS', () => {
  /*
    The Iron Sultanate's Reinforced Armour row reads "ELITE & Janissaries
    only". Idris the Relic Hound is a Favoured Kavass — an Azeb promoted to
    ELITE — and the promotion writes `Elite` onto the MODEL, never onto the
    Azeb entry. `toRoster` used to hand the validator the entry alone, so the
    gate was asked about a Troop and correctly refused.
  */
  it('an Elite-promoted Azeb may wear Reinforced Armour', () => {
    const { roster, violations } = verdict('al-qarn-rihla-september.json');
    const idris = roster.units.find((u) => u.name.startsWith('Idris'));

    expect(idris, 'the fixture no longer contains Idris').toBeTruthy();
    expect(idris!.keywords).toEqual(expect.arrayContaining(['Elite']));
    expect(idris!.roles).toEqual(expect.arrayContaining(['Elite']));
    expect(violations.filter((v) => v.unitId === idris!.id)).toEqual([]);
  });

  it('and the entry’s own keywords survive the union', () => {
    const { roster } = verdict('al-qarn-rihla-september.json');
    const idris = roster.units.find((u) => u.name.startsWith('Idris'))!;
    expect(idris.keywords).toEqual(expect.arrayContaining(['SULTANATE']));
  });
});

describe('FD-17 finding 3: entry-granted kit is not an Armoury purchase', () => {
  /*
    The five the August file reported, by the granter each turned out to have.
    Asserted here as well as in `rules/__tests__/entryGrants.test.ts` because
    the unit tests prove the classification and this proves it reaches the
    roster the owner actually plays.
  */
  it('reports none of the five kit findings on either file', () => {
    for (const file of Object.keys(ALLOWED)) {
      const messages = verdict(file).violations.map((v) => v.message).join('\n');
      for (const name of ['Secrets of Takwin', 'Coordinated Engagement',
                          'Fire Shield', 'Weaponized Shovel', 'Curative Fluids']) {
        expect(messages, `${file} still reports ${name}`).not.toContain(name);
      }
    }
  });

  it('still reports gear the faction genuinely cannot reach', () => {
    const { roster } = verdict('al-qarn-rihla-august.ros');
    /*
      A Cult of the Black Grail Hellblade, put on a Sultanate model. Nothing
      reaches it: not the Sultanate table, not the House of Wisdom's Weapon
      Collections grant, not any entry's fixed kit or option.

      New Antioch's own gear is the WRONG negative and was the first thing
      tried here. This Warband is a House of Wisdom one, and Weapon
      Collections buys from New Antioch — so `stockedAnywhere` answered
      "stocked, via Weapon Collections" and the roster was legal, correctly.
    */
    const alien = DATASET.weapons.find(
      (w) => w.name === 'Hellblade' && w.factionId === 'Black Grail');
    expect(alien, 'the dataset no longer has a Hellblade').toBeTruthy();

    const tampered = {
      ...roster,
      units: roster.units.map((u, i) => (i === 0
        ? { ...u, items: [...u.items, { weaponId: alien!.id, cost: alien!.cost }] }
        : u)),
    };
    expect(validateRoster(tampered, DATASET).violations.map((v) => v.code))
      .toContain('wargear-not-stocked');
  });
});
