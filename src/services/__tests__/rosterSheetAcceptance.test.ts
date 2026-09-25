/**
 * FD-12's acceptance case, which is real and committed.
 *
 * > The owner supplied two NewRecruit exports of Al-Qarn Rihla: August, the
 * > roster the app was loaded from, and September, the same Warband after the
 * > game played the week of 14 September. **The difference between August and
 * > September is exactly what this design has to represent.**
 *
 * And the design's own test list for it:
 *
 * > importing the August export and then the September one produces a second
 * > snapshot whose diff is the list above; each imported Skill carries its roll;
 * > the Patron is Sublime Gate; the three rewards appear with their text; and the
 * > campaign table gains one row.
 *
 * Driven through the real pieces on the shipped dataset — `recruitable` for the
 * unit list, `importNewRecruitRoster` for each file, `rosterSheet` for the sheet
 * — because every claim here is a claim about real data and real code agreeing,
 * which a hand-built fixture would be written to satisfy.
 *
 * The diff is computed rather than asserted line by line: the September list in
 * FD-12 is the EXPECTED diff, so the test states it once, computes the actual
 * one, and compares. A change to the importer that lost a roll or a reward shows
 * up as a difference in that list rather than as a count going down.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { DATASET } from '@/data/generated/trenchline.generated';
import { recruitable } from '@/rules/recruitable';
import { rosterSheet } from '@/rules/rosterSheet';
import { holdingsOf } from '@/rules/provenance';
import { importNewRecruitRoster } from '../newRecruitImporter';
import type { ActiveUnit, Warband } from '@/types/warband';
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

const imported = (file: string): Warband => {
  const result = importNewRecruitRoster(read(file), KNOWN, DATASET);
  expect(result.warband, `${file} did not import`).toBeTruthy();
  return result.warband!;
};

const AUGUST = imported('al-qarn-rihla-august.json');
const SEPTEMBER = imported('al-qarn-rihla-september.json');

const byName = (wb: Warband) => new Map(wb.units.map((u) => [u.customName, u]));
const skillNames = (u: ActiveUnit | undefined) => (u?.skills ?? []).map((s) => s.name);

/* --------------------------------------------- the diff FD-12 describes --- */

describe('FD-12 acceptance: August to September is the difference the design names', () => {
  it('Experience moves on exactly five models, by exactly the amounts stated', () => {
    /*
      > Experience moves, per model: Kasim 4 to 6, Zayd 0 to 2, the Bull 3 to 4,
      > Idris 3 to 4, the Takwin 1 to 2.
    */
    const before = byName(AUGUST);
    const after = byName(SEPTEMBER);
    const moved: Record<string, [number, number]> = {};
    for (const [name, unit] of after) {
      const was = before.get(name);
      if (was && was.xp !== unit.xp) moved[name] = [was.xp, unit.xp];
    }
    expect(moved).toEqual({
      'Kasim bin Malik, the Living Engineer': [4, 6],
      'Zayd bin Tariq al-Nahas': [0, 2],
      'Al-Qahhar, the Crippled': [3, 4],
      'Idris the Relic Hound': [3, 4],
      'Al-Masyukh, Hunter of Hunters': [1, 2],
    });
  });

  it('five Skills arrive, each with the roll that gave it', () => {
    /*
      > Five Skills arrive, each with the roll that gave it in brackets: Point
      > Blank [9], Sharp Eyes [6], Melee Proficiency [7], Dodge [11], Champion [11].
    */
    const before = byName(AUGUST);
    const arrived: Record<string, string | undefined> = {};
    for (const unit of SEPTEMBER.units) {
      const had = new Set(skillNames(before.get(unit.customName)));
      for (const s of unit.skills ?? []) if (!had.has(s.name)) arrived[s.name] = s.roll;
    }
    expect(arrived).toEqual({
      'Point Blank': '9',
      'Sharp Eyes': '6',
      'Melee Proficiency': '7',
      'Dodge': '11',
      'Champion': '11',
    });
  });

  it('the August roster already carried four Skills and two injuries, in the same shape', () => {
    /*
      > The August roster already carried Ranged Proficiency [7], Assassinate [4],
      > Strength of Samson [8], Skill & Expertise [7], and the injuries Leg Wound
      > [31] and Lost Arm [26], in the same shape.
    */
    const skills = AUGUST.units.flatMap((u) => (u.skills ?? []).map((s) => `${s.name} [${s.roll}]`));
    expect(skills.sort()).toEqual([
      'Assassinate [4]', 'Ranged Proficiency [7]',
      'Skill & Expertise [7]', 'Strength of Samson [8]',
    ]);

    const injuries = AUGUST.units.flatMap((u) => u.injuries);
    expect(injuries.sort()).toEqual(['Leg Wound [31]', 'Lost Arm [26]']);
    /* And each injury carries its roll as provenance, not just in its name. */
    const records = AUGUST.units.flatMap((u) => u.injuryRecords ?? []);
    expect(records.map((r) => r.source?.roll).sort()).toEqual(['26', '31']);
  });

  it('Kasim’s Leg Wound is gone, and the Workshop that removed it is held', () => {
    /*
      > Kasim's Leg Wound is gone, and Curative Fluids arrived; the export's
      > Campaign Rules say why: a new Exploration result, Ransacked Alchemist
      > Workshop, "remove one Battle Scar from any model", spent.
    */
    const kasim = 'Kasim bin Malik, the Living Engineer';
    expect(byName(AUGUST).get(kasim)!.injuries).toEqual(['Leg Wound [31]']);
    expect(byName(SEPTEMBER).get(kasim)!.injuries).toEqual([]);

    const workshop = (SEPTEMBER.rewards ?? [])
      .find((r) => r.name === 'Ransacked Alchemist Workshop');
    expect(workshop, 'the Workshop is not among September’s rewards').toBeTruthy();
    expect(workshop!.group).toBe('Exploration Rewards');
    /*
      The reason, in the roster's own words. The text is copied and not
      normalised, which this assertion has to allow for: the export spells
      "Curative Fluids" with a NON-BREAKING space (U+00A0) between the two words.
      Folding whitespace on the way in would be this parser editing the source,
      so the reader folds it instead.
    */
    const spaces = (t: string) => t.replace(/\s+/g, ' ');
    expect(spaces(workshop!.text!)).toContain('Curative Fluids');
    expect(spaces(workshop!.text!)).toContain('remove one Battle Scar');
    /* And August did not have it. */
    expect((AUGUST.rewards ?? []).some((r) => r.name === 'Ransacked Alchemist Workshop'))
      .toBe(false);
  });

  it('Kasim’s Automatic Rifle became a Machine Gun, and a Scripture Guardian was hired', () => {
    const kasim = 'Kasim bin Malik, the Living Engineer';
    expect(byName(AUGUST).get(kasim)!.equippedWeapons.map((w) => w.name))
      .toContain('Automatic Rifle');
    expect(byName(SEPTEMBER).get(kasim)!.equippedWeapons.map((w) => w.name))
      .toContain('Machine Gun');

    const hired = SEPTEMBER.units.map((u) => u.customName)
      .filter((n) => !byName(AUGUST).has(n));
    expect(hired).toEqual(['Scripture Guardian']);
  });

  it('the Ducat limit, the roster cost and the Glory all move as the design states', () => {
    /*
      > the Ducat limit moved from 1320 to 1440, the roster from 1320 to 1330, and
      > Glory from 6 to 13.
    */
    expect([AUGUST.ducatLimit, SEPTEMBER.ducatLimit]).toEqual([1320, 1440]);
    const cost = (wb: Warband) => wb.units.reduce((n, u) => n + u.totalCost, 0);
    expect([cost(AUGUST), cost(SEPTEMBER)]).toEqual([1320, 1330]);
    expect([AUGUST.gloryPoints, SEPTEMBER.gloryPoints]).toEqual([6, 13]);
  });
});

/* ------------------------------------- the Campaign Rules > Enabled subtree */

describe('FD-12 acceptance: the review the owner asked for', () => {
  it('the Patron is Sublime Gate, and it resolves against OUR dataset’s Patrons', () => {
    expect(SEPTEMBER.patron).toBe('Sublime Gate');
    expect(AUGUST.patron).toBe('Sublime Gate');
    /*
      Only because `dataset.patrons` holds it. `patronFromGrants` writes nothing
      it cannot place — a `patron` string the ruleset does not know would read as
      a Patron whose Skills are an empty list, which is worse than none.
    */
    expect(DATASET.patrons.some((p) => p.name.toLowerCase() === 'sublime gate')).toBe(true);
  });

  it('the three Exploration rewards are held, each with its text', () => {
    /*
      > Book of Golems, Ransacked Alchemist Workshop and Reroll are the
      > Exploration rewards held; Sublime Gate is the Patron; Unleveraged Glory is
      > NewRecruit's Glory counter.
    */
    const held = SEPTEMBER.rewards ?? [];
    const byGroup = (group: string) => held
      .filter((r) => r.group === group).map((r) => r.name).sort();

    expect(byGroup('Exploration Rewards'))
      .toEqual(['Book of Golems', 'Ransacked Alchemist Workshop']);
    expect(byGroup('Exploration Skills')).toEqual(['Reroll']);
    expect(byGroup('Patron Selection')).toEqual(['Sublime Gate']);

    for (const name of ['Book of Golems', 'Ransacked Alchemist Workshop', 'Reroll']) {
      const r = held.find((x) => x.name === name)!;
      expect(r.text, `${name} has no rules text`).toBeTruthy();
      expect(r.source, `${name} has no provenance`).toEqual({ kind: 'import' });
    }
    expect(held.find((r) => r.name === 'Book of Golems')!.text)
      .toContain('Rabbinic manual');
  });

  it('NewRecruit’s Glory counter is carried without being called a reward', () => {
    /*
      `Unleveraged Glory` sits in the same subtree with no group at all. It is
      kept — `campaignRules` has carried it since GOLEM-1 and dropping it would
      be this parser deciding which of the roster's own statements count — and it
      is not filed under a group, which is how the sheet tells it apart.
    */
    const glory = (SEPTEMBER.rewards ?? []).find((r) => r.name === 'Unleveraged Glory');
    expect(glory).toBeTruthy();
    expect(glory!.group).toBeUndefined();
  });

  it('campaignRules still carries the names, unchanged by any of this', () => {
    /* `golemGrant` reads that list, and it must keep working: the two records of
       one subtree are written together and neither is derived from the other. */
    expect(SEPTEMBER.campaignRules).toContain('Book of Golems');
    expect(SEPTEMBER.campaignRules).toContain('Ransacked Alchemist Workshop');
    expect(SEPTEMBER.campaignRules).toContain('Reroll');
  });

  it('the sheet’s review lists every reward and Skill with its source', () => {
    const holdings = holdingsOf(SEPTEMBER);

    /* Every Skill on the roster, and every one says how it arrived. */
    const skills = holdings.filter((h) => h.kind === 'skill');
    expect(skills).toHaveLength(SEPTEMBER.units.flatMap((u) => u.skills ?? []).length);
    for (const s of skills) {
      expect(s.source.kind, `${s.name} is not marked as an import`).toBe('import');
      expect(s.model, `${s.name} names no model`).toBeTruthy();
    }
    /* And the roll rides with it, which is the provenance the design asked the
       importer to keep. */
    expect(skills.find((s) => s.name === 'Point Blank')!.source.roll).toBe('9');

    /* Nothing is marked as an Advancement Roll: no dice were rolled in this app. */
    expect(holdings.some((h) => h.source.kind === 'advancement')).toBe(false);
  });
});

/* --------------------------------------------------------------- the sheet */

describe('FD-12 acceptance: the sheet the two exports produce', () => {
  it('names the Patron in its header, from the roster’s own subtree', () => {
    const sheet = rosterSheet(SEPTEMBER, { dataset: DATASET });
    expect(sheet.header.patron).toBe('Sublime Gate');
    expect(sheet.header.faction).toBe('Iron Sultanate');
  });

  it('draws a track for every model, with Kasim’s six boxes filled', () => {
    const sheet = rosterSheet(SEPTEMBER, { dataset: DATASET });
    expect(sheet.cards).toHaveLength(SEPTEMBER.units.length);
    for (const card of sheet.cards) expect(card.track).not.toBeNull();

    const kasim = sheet.cards.find(
      (c) => c.model.name === 'Kasim bin Malik, the Living Engineer')!;
    expect(kasim.track!.boxes.filter((b) => b.filled)).toHaveLength(6);
    /* And the roll each of his Skills came in with is on the card. */
    const pointBlank = kasim.abilitiesSkillsInjuries.find((a) => a.name === 'Point Blank')!;
    expect(pointBlank.provenance).toContain('rolled 9');
  });

  it('the campaign table gains one row for the game September records', () => {
    /*
      A post-battle snapshot is what fills a row, and an import carries none —
      NewRecruit records no scenario and no result. So this is the gain measured
      the way the app will see it: the September Warband with the game it played
      recorded against it.
    */
    const blank = rosterSheet(SEPTEMBER, { dataset: DATASET }).campaign;
    expect(blank.rows.filter((r) => r.scenarioName)).toHaveLength(0);

    const played: Warband = {
      ...SEPTEMBER,
      snapshots: [{
        id: 'snap-1',
        timestamp: '2026-09-14T00:00:00Z',
        label: 'Post-Battle: the week of 14 September (Victory)',
        type: 'post_battle',
        campaignGame: 1,
        scenarioName: 'The week of 14 September',
        outcome: 'Victory',
        ducatCost: 1330, treasuryDucats: 0, gloryPoints: 13,
        unitCount: SEPTEMBER.units.length, units: [], armoryStash: [],
        changesSummary: [],
      }],
    };
    const after = rosterSheet(played, { dataset: DATASET }).campaign;
    expect(after.rows.filter((r) => r.scenarioName)).toHaveLength(1);
    expect(after.rows[0].result).toBe('W');
    expect(after.rows[0].vps).toBe(DATASET.campaign.victoryPoints!.win);
    /* The other eleven stay blank, with the published Threshold on each. */
    expect(after.rows.filter((r) => !r.scenarioName)).toHaveLength(11);
    expect(after.rows[11].threshold).toBe(1800);
    expect(after.rows[11].fieldStrength).toBe(22);
  });
});
