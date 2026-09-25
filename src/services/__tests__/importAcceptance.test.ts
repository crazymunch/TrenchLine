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
import { rosReport, type CatalogueUnit } from '../rosterRos';
import type { RosterPathLayer } from '../rosterPaths';
import LAYER from '@/data/generated/trenchline.rosterpaths.json';
import type { UnitProfile } from '@/types/rules';

const APP_FACTIONS = [
  'new-antioch', 'iron-sultanate', 'trench-pilgrims', 'heretic-legions',
  'black-grail', 'court-seven-serpents',
];
const KNOWN: UnitProfile[] = recruitable(
  DATASET, 'iron-sultanate', APP_FACTIONS, undefined,
).units;

/** The dataset rows the `.ros` exporter resolves a model against. */
const ROS_UNITS: CatalogueUnit[] = DATASET.units.map(
  (u) => ({ id: u.id, name: u.name, entryId: u.entryId }));

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
    The names `toRoster` cannot join are reported, not dropped, and each is
    known:

      Sniper Scope              a Glory Item in the Campaign Rules catalogue's
                                own group — won in a campaign, not bought

      Machine Armour            reaches the Sultanate through a hidden
                                entryLink the flat weapons list cannot
                                express (WC-1)

      Fireteam: Mamluk-Guarded  an entry that prints two Battlekit profiles
                                and has no row of its own

    The third is new, and it is EXP-1 working rather than a regression. The
    importer used to name an item after the first PROFILE the selection
    printed, so this line came back called `Coordinated Engagement` — which
    IS a dataset weapon, so it joined, and the model was recorded as holding
    a thing the roster never says it holds. It now keeps the selection's own
    name, which the dataset has no row for and which is therefore reported.
    Nothing is lost on the card: the item still carries the Battlekit
    profile's rules text, so the FIRETEAM rule reads as it did.
  */
  it('reports the names it cannot join, and no others', () => {
    expect(verdict(file).unmatched.map((u) => u.name).sort())
      .toEqual(['Fireteam: Mamluk-Guarded', 'Machine Armour', 'Sniper Scope']);
  });
});

/**
 * EXP-1: the same two files, exported back out as a `.ros`.
 *
 * > the September fixture imports and exports as a `.ros` with no fatal
 * > finding … every remaining warning names something NewRecruit has no box
 * > for.
 *
 * Eight fatal findings stood on both files before this. Each is named below
 * with the class it turned out to belong to; the classes, and why the design's
 * reading of two of them did not survive measurement, are in
 * `docs/FIX-DESIGNS-2026-09-20.md` under FD-17.
 */
describe.each(Object.keys(ALLOWED))('%s, as a .ros', (file) => {
  const exported = () => {
    const imported = importNewRecruitRoster(read(file), KNOWN, DATASET);
    return rosReport(LAYER as unknown as RosterPathLayer, imported.warband!, ROS_UNITS);
  };

  it('has no fatal finding, so a file is written', () => {
    const report = exported();
    expect(report.fatal.map((f) => `${f.model ?? '-'} / ${f.subject ?? '-'}`))
      .toEqual([]);
    expect(report.exportable).toBe(true);
  });

  /*
    Named one by one rather than counted. Each of the eight was a different
    defect and a count would pass while one of them came back.
  */
  it('names none of the eight that used to be fatal', () => {
    const report = exported();
    const said = [...report.fatal, ...report.warnings]
      .filter((i) => i.level === 'fatal').map((i) => i.subject);
    for (const subject of [
      'Sniper Scope', 'Coordinated Engagement', 'Titan Zulfiqar', 'Two Heads',
      'Fierce Lion', 'Weaponized Shovel', 'Polearm',
    ]) {
      expect(said, subject).not.toContain(subject);
    }
  });

  /*
    The one item the file genuinely cannot carry. A warning, not a refusal:
    the roster is a true record and the `.ros` format has no place for a
    campaign award on a model — `docs/ROS-EXPORT.md` holds that open question.
  */
  it('names the Sniper Scope as won outside the faction catalogues', () => {
    const scope = exported().warnings.find((w) => w.subject === 'Sniper Scope');
    expect(scope, 'the Sniper Scope warning is gone').toBeTruthy();
    expect(scope!.model).toMatch(/^Kasim/);
    expect(scope!.why).toMatch(/outside the faction catalogues/);
  });

  /*
    The force is the Iron Sultanate's and says so. It used to report itself as
    spanning two or three catalogues, because the Scripture Guardian is a
    Mercenary reachable from all six and `placements[0]` picked the Black
    Grail's copy of it.
  */
  it('declares one catalogue, and does not claim to span another', () => {
    const report = exported();
    expect(report.warnings.filter((w) => /come from \d+ catalogues/.test(w.why)))
      .toEqual([]);
  });

  /*
    What is left is the two standing differences the exporter reports on every
    file — it writes no profiles, and no file it has written has been opened
    in NewRecruit — plus, per model, any item the catalogues reveal by more
    than one route. None of those is a gap in this roster.
  */
  it('leaves only warnings that name a real difference', () => {
    const rest = exported().warnings.filter((w) => w.subject !== 'Sniper Scope');
    for (const w of rest) {
      expect(w.why, JSON.stringify(w)).toMatch(
        /profiles, rules and categories are not written|has yet been opened in NewRecruit|reachable \d+ ways/);
    }
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
