/**
 * The importer resolves a roster line by what it IS, not by what it is called.
 *
 * Measured against the file NewRecruit wrote:
 * `data-sources/fixtures/newrecruit/al-qarn-rihla-august.ros`, a real
 * thirteen-model Iron Sultanate campaign warband. The `.ros` exporter
 * (`rosterRos.test.ts`) is what found this — running it over an import showed
 * three of eleven models coming back with a `baseProfileId` no catalogue entry
 * has, while `unmatched` stayed empty and the import reported success.
 *
 * Two defects, one cause. A roster's `name` is what MODIFIERS made of the
 * entry, and the importer matched on it:
 *
 *   1. `Azeb` (`0e7e-9167-f044-9493`) is written as `Kavass`, and a promoted
 *      one as `Favoured Kavass`. `"kavass".includes("azeb")` is false, so
 *      nothing matched and the id fell back to a slug of the roster's name.
 *   2. `"favoured homunculus".includes("homunculus")` matched the FIRST
 *      Homunculus in the list, and five factions field one — so a Sultanate
 *      model could be bound to the Trench Pilgrims profile and offered that
 *      faction's gear.
 *
 * The roster states the answer on every line. `entryId` is a path whose last
 * segment is the entry's own id, and `recruitable` keys a store unit by that
 * id, so the lookup is exact and no two units share one.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { DATASET } from '@/data/generated/trenchline.generated';
import { recruitable } from '@/rules/recruitable';
import { importNewRecruitRoster } from '../newRecruitImporter';
import type { UnitProfile } from '@/types/rules';

const ROS = fs.readFileSync(
  path.join(process.cwd(), 'data-sources/fixtures/newrecruit/al-qarn-rihla-august.ros'),
  'utf8',
);

/*
  The store's unit list, built the way the app builds it.

  Not a hand-written fixture: the whole point is that `recruitable` sets
  `UnitProfile.id` to the dataset's `entryId`, and a fixture asserting that by
  hand would pass while the real mapping drifted.
*/
const APP_FACTIONS = [
  'new-antioch', 'iron-sultanate', 'trench-pilgrims', 'heretic-legions',
  'black-grail', 'court-seven-serpents',
];
const KNOWN: UnitProfile[] = recruitable(
  DATASET, 'iron-sultanate', APP_FACTIONS, undefined,
).units;

/** The eleven models the fixture actually contains, by catalogue entry. */
const EXPECTED: Record<string, number> = {
  '7c17-5f75-6fd9-73cf': 2, // Jabirean Alchemist
  'f63f-ac9a-639b-b7ba': 1, // Lion of Jabir
  '0e7e-9167-f044-9493': 3, // Azeb — written Kavass x2 and Favoured Kavass
  'e62d-c06e-ce35-428b': 1, // Brazen Bull — written Favoured Brazen Bull
  '2f82-e47f-c162-9152': 2, // Homunculus — one Favoured Takwin, one plain
  '22b8-dc59-428d-87cd': 1, // Mamluk Faris, inside its `unit` wrapper
  'e874-ea2b-96ed-0f9a': 1, // Sultanate Sapper
};

describe('importing the roster NewRecruit wrote', () => {
  const result = importNewRecruitRoster(ROS, KNOWN);

  it('resolves every model to a catalogue entry', () => {
    expect(result.unmatched).toEqual([]);
    expect(result.warband.units).toHaveLength(11);
  });

  it('gives every model an id the catalogues have', () => {
    /*
      The defect stated directly. A slug like `kavass` passes any "is it
      truthy" check, so the assertion has to be that the id is one the dataset
      actually carries.
    */
    const real = new Set(DATASET.units.map((u) => u.entryId));
    for (const u of result.warband.units) {
      expect(real.has(u.baseProfileId), `${u.customName} -> ${u.baseProfileId}`).toBe(true);
    }
  });

  it('recognises a renamed entry as the entry it is', () => {
    // Three roster lines, three different names, one catalogue entry.
    const azeb = result.warband.units.filter((u) => u.baseProfileId === '0e7e-9167-f044-9493');
    expect(azeb).toHaveLength(3);
    expect(azeb.map((u) => u.customName).sort())
      .toEqual(['Idris the Relic Hound', 'Nasir the Inaccurate', 'Rafiq the Incinerator']);
    // Written under the catalogue's name, with the player's own kept separately.
    for (const u of azeb) expect(u.profileSnapshot.name).toBe('Azeb');
  });

  it('binds a Homunculus to its own faction, not to the first of five', () => {
    const homunculi = result.warband.units
      .filter((u) => u.baseProfileId === '2f82-e47f-c162-9152');
    expect(homunculi).toHaveLength(2);
    for (const u of homunculi) {
      expect(u.profileSnapshot.factionId).toBe('iron-sultanate');
    }
    // And none of the other four factions' Homunculus entries appears at all.
    const others = DATASET.units
      .filter((u) => /homunculus/i.test(u.name) && u.entryId !== '2f82-e47f-c162-9152')
      .map((u) => u.entryId);
    const imported = new Set(result.warband.units.map((u) => u.baseProfileId));
    for (const id of others) expect(imported.has(id!)).toBe(false);
  });

  it('imports the model inside a `unit` wrapper, under the name the player typed', () => {
    /*
      `Mamluk Faris` is a `unit` entry whose only child is a link to the
      `model` carrying the profile. The wrapper holds the customName and the
      child holds the identity, so taking either alone loses something.
    */
    const faris = result.warband.units
      .filter((u) => u.baseProfileId === '22b8-dc59-428d-87cd');
    expect(faris).toHaveLength(1);
    expect(faris[0].customName).toBe('Jawhar al-Sari');
    // The wrapper is structure and must not be reported as a missing model.
    expect(result.unmatched).not.toContain('Jawhar al-Sari');
  });

  it('carries every entry the fixture contains, at the right count', () => {
    const counted: Record<string, number> = {};
    for (const u of result.warband.units) {
      counted[u.baseProfileId] = (counted[u.baseProfileId] ?? 0) + 1;
    }
    expect(counted).toEqual(EXPECTED);
  });

  it('sets baseCost to the entry’s own price, not the model’s total', () => {
    /*
      Two Jabirean Alchemists came in at 194 and 130 for the same profile,
      because `baseCost` was the line total including every weapon on it. The
      recruit sheet and the validator both read it as the entry's price and
      add gear on top, so a total here is counted twice.
    */
    const entry = DATASET.units.find((u) => u.entryId === '7c17-5f75-6fd9-73cf')!;
    const alchemists = result.warband.units
      .filter((u) => u.baseProfileId === '7c17-5f75-6fd9-73cf');
    expect(alchemists).toHaveLength(2);

    for (const u of alchemists) {
      expect(u.profileSnapshot.baseCost).toBe(entry.cost.ducats);
    }
    // Both share one price, and it is not either line's total.
    const prices = new Set(alchemists.map((u) => u.profileSnapshot.baseCost));
    expect(prices.size).toBe(1);
    for (const u of alchemists) {
      if (u.totalCost !== u.profileSnapshot.baseCost) {
        expect(u.profileSnapshot.baseCost).not.toBe(u.totalCost);
      }
    }
  });
});

describe('resolving without an entryId', () => {
  /*
    Name matching is kept, because a plain-text paste and an export older than
    the attribute carry nothing else. It must stay the SECOND test: it is the
    one that produced both defects above.
  */
  const xml = (attrs: string) =>
    `<roster name="T"><forces><force><selections>`
    + `<selection ${attrs} type="model"/>`
    + `</selections></force></forces></roster>`;

  it('falls back to the name when the line carries no id', () => {
    const { warband, unmatched } = importNewRecruitRoster(xml('name="Azeb"'), KNOWN);
    expect(unmatched).toEqual([]);
    expect(warband.units[0].baseProfileId).toBe('0e7e-9167-f044-9493');
  });

  it('reports a line whose id the ruleset does not have', () => {
    // An id that resolves to nothing is not a reason to fall back to the name
    // — the file stated which entry it is and we do not have that entry.
    const { warband, unmatched } = importNewRecruitRoster(
      xml('name="Kavass" entryId="dead-beef-dead-beef"'), KNOWN);
    expect(warband.units).toHaveLength(0);
    expect(unmatched).toEqual(['Kavass']);
  });
});

describe('a .ros reaches the XML parser at all', () => {
  /*
    The defect this guards is not a mis-parse, it is a SILENT DOWNGRADE.

    `importNewRecruitRoster` catches anything the XML path throws and falls
    through to the plain-text parser, which scans the input for words spelled
    like a unit name. Fed a `.ros`, that reads the raw markup and builds a
    warband out of catalogue names: the fixture came back as twenty-two
    models rather than eleven, none carrying the player's own names, and
    including Janissary, Engineer, Trench Pilgrim and Sniper Priest — entries
    from factions this roster does not field.

    The throw was `c.$text?.toLowerCase is not a function`: fast-xml-parser
    coerces numeric text, so a statline of `2` arrived as a number where the
    type said string. One `String()` at the parser boundary, but nothing was
    watching, because the fallback made the failure look like a successful
    import.
  */
  it('imports the player’s own model names, not catalogue names', () => {
    const { warband } = importNewRecruitRoster(ROS, KNOWN);
    const names = warband.units.map((u) => u.customName);
    expect(names).toContain('Rafiq the Incinerator');
    expect(names).toContain('Al-Masyukh, Hunter of Hunters');
    // The text parser cannot produce a customName at all, so this is the
    // cheapest true statement that separates the two paths.
    expect(names.every((n) => Boolean(n))).toBe(true);
  });

  it('never imports a model from a faction the roster does not field', () => {
    const { warband } = importNewRecruitRoster(ROS, KNOWN);
    for (const u of warband.units) {
      expect(u.profileSnapshot.factionId).not.toBe('trench-pilgrims');
      expect(u.profileSnapshot.name).not.toBe('Sniper Priest');
    }
  });

  it('reads a numeric characteristic without throwing', () => {
    /*
      The mechanism directly. `Wounds` of `2` is text content that looks
      numeric, which is exactly what the parser coerces.
    */
    const xml = `<roster name="T"><forces><force><selections>`
      + `<selection name="Azeb" entryId="0e7e-9167-f044-9493" type="model">`
      + `<profiles><profile name="Azeb" typeName="Unit"><characteristics>`
      + `<characteristic name="Movement">6"</characteristic>`
      + `<characteristic name="Ranged">+0 DICE</characteristic>`
      + `<characteristic name="Melee">-1 DICE</characteristic>`
      + `<characteristic name="Armour">0</characteristic>`
      + `<characteristic name="Wounds">2</characteristic>`
      + `</characteristics></profile></profiles>`
      + `</selection></selections></force></forces></roster>`;

    const { warband, unmatched } = importNewRecruitRoster(xml, KNOWN);
    expect(unmatched).toEqual([]);
    expect(warband.units).toHaveLength(1);
    expect(warband.units[0].baseProfileId).toBe('0e7e-9167-f044-9493');
    // `Armour` is "0" — also numeric-looking, and it must survive as a statline
    // rather than being dropped for being falsy.
    expect(warband.units[0].profileSnapshot.stats.armour).toBe('0');
  });
});
