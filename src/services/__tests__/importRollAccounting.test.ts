/**
 * What an import counts as an Advancement Roll taken (Order 44 item 4a).
 *
 * Review round 2 changed both importers from `advancementRolls = skills.length`
 * to a count of the Skills whose records state a 2D6 total. Every test that
 * covered it did so through the owner's real export — in which every Skill DOES
 * carry its bracketed roll — so reverting the change left the suite green. The
 * case that distinguishes the two rules is a roster holding a Skill with no roll
 * on it, and there wasn't one.
 *
 * So there is one here, built by taking the real September export and renaming a
 * single Skill: the roster is otherwise the owner's own, and the fixture states
 * exactly one difference from it.
 *
 * The Trench Companion half of the same item is in `trenchCompanionImport.test.ts`,
 * beside the envelope that suite already builds in their shape — their export has
 * no field for a Skill's roll at all, so its existing model is already the case
 * this needs.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import path from 'node:path';
import { DATASET } from '@/data/generated/trenchline.generated';
import { recruitable } from '@/rules/recruitable';
import { importNewRecruitRoster } from '../newRecruitImporter';
import { advancementRollsStated } from '@/rules/provenance';
import { advancementRollsDue } from '@/rules/advancement';
import type { UnitProfile } from '@/types/rules';

const KNOWN: UnitProfile[] = recruitable(DATASET, 'iron-sultanate', [
  'new-antioch', 'iron-sultanate', 'trench-pilgrims', 'heretic-legions',
  'black-grail', 'court-seven-serpents',
], undefined).units;

const SEPTEMBER = fs.readFileSync(path.join(process.cwd(),
  'data-sources/fixtures/newrecruit/al-qarn-rihla-september.json'), 'utf8');

/**
 * The owner's roster with ONE Skill's name changed: `Point Blank [9]` becomes a
 * Patron's Skill with no bracket, which is what a real Patron grant looks like
 * in a NewRecruit export.
 */
const withAPatronSkill = () =>
  SEPTEMBER.replace('Point Blank [9]', 'Gate of Sublime Wisdom');

const kasimOf = (raw: string) => {
  const result = importNewRecruitRoster(raw, KNOWN, DATASET);
  const unit = result.warband!.units
    .find((u) => (u.customName ?? '').startsWith('Kasim'))!;
  return { result, unit };
};

describe('Order 44 item 4a: a Skill with no roll on it costs no Advancement Roll', () => {
  it('the unmodified export states every roll, or this fixture proves nothing', () => {
    /* The guard. If the real file ever stops bracketing its Skills, the
       comparison below is measuring something else. */
    const { unit } = kasimOf(SEPTEMBER);
    expect(unit.skills).toHaveLength(3);
    expect(advancementRollsStated(unit.skills)).toBe(3);
    expect(unit.advancementRolls).toBe(3);
  });

  it('renaming one Skill to an unbracketed grant drops the count by one', () => {
    /*
      The case that tells the two rules apart. Under `skills.length` this model
      still counts 3; under the rule it counts 2, because a Patron's Skill costs
      no Advancement Roll.
    */
    const { unit } = kasimOf(withAPatronSkill());
    expect(unit.skills).toHaveLength(3);
    expect(unit.advancementRolls).toBe(2);
    expect(unit.advancementRolls).not.toBe(unit.skills!.length);
  });

  it('and names the Skill it did not count, per model', () => {
    const { result } = kasimOf(withAPatronSkill());
    const entry = (result.skillsWithNoRoll ?? [])
      .find((e) => e.model.startsWith('Kasim'));
    expect(entry, 'the import reported nothing uncounted').toBeTruthy();
    expect(entry!.skills).toEqual(['Gate of Sublime Wisdom']);
  });

  it('reports nothing when every Skill states its roll', () => {
    const { result } = kasimOf(SEPTEMBER);
    expect(result.skillsWithNoRoll).toBeUndefined();
  });

  it('so the model is owed the roll its Experience earned, rather than none', () => {
    /*
      Why it matters, measured rather than asserted. Kasim holds 6 Experience and
      the circles are at 2 and 4, so two rolls are earned. Counting three Skills
      leaves him owed nothing at 7 — the third circle — and the app offers a roll
      he earned to nobody.
    */
    const { unit } = kasimOf(withAPatronSkill());
    const circles = DATASET.campaign.experience!.advancementAt;
    expect(circles.slice(0, 3)).toEqual([2, 4, 7]);

    const at = (xp: number) => advancementRollsDue(DATASET, { ...unit, xp });
    expect(at(6)).toBe(0);
    expect(at(7)).toBe(1);

    /* And what counting the list would have done at the same Experience. */
    const counted = { ...unit, advancementRolls: unit.skills!.length };
    expect(advancementRollsDue(DATASET, { ...counted, xp: 7 })).toBe(0);
  });
});

describe('Order 44 item 2: and the report reaches the player', () => {
  /*
    The importer computed `skillsWithNoRoll` and the modal destructured
    `{ warband, unmatched, golem }` — so the one thing that tells a correct
    reading from a parse failure was dropped on the floor, and three documents
    claimed otherwise. A report nobody sees is not a report.

    Source-level and narrow: what the assertions above cannot see is the modal
    going back to ignoring the field, which is the exact regression.
  */
  const modal = readFileSync(join(process.cwd(),
    'src/components/builder/ImportWarbandModal.tsx'), 'utf8');

  it('the modal reads the field, on both of its import paths', () => {
    /* Pasted text and an uploaded file. */
    expect(modal.match(/skillsWithNoRoll \} = importNewRecruitRoster/g) ?? [])
      .toHaveLength(2);
  });

  it('and puts it where the preview already shows things worth checking', () => {
    expect(modal.match(/setNotes\(noRollNote\(skillsWithNoRoll\)\)/g) ?? [])
      .toHaveLength(2);
    /* Not cleared, which is what it used to do. */
    expect(modal).not.toMatch(/setNotes\(\[\]\);[\s\S]{0,400}importNewRecruitRoster/);
  });

  it('says what an uncounted Skill means, rather than only naming it', () => {
    /* A bare list reads as a failure. The sentence is what makes a Patron's
       Skill appearing there legible as correct. */
    expect(modal).toMatch(/no 2D6 total on the roster/);
    expect(modal).toMatch(/Patron/);
    expect(modal).toMatch(/add the total on the model/);
  });
});
