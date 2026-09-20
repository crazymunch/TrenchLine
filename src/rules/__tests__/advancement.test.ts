/**
 * Advancement Rolls, against the shipped dataset.
 *
 * RR-03 / RR-04 / FD-04. The wizard offered eight buttons — `+1 Melee`,
 * `+1 Ranged`, `+1 Armour`, `+1" Move` and four named Skills. Trench Crusade
 * has no characteristic advances, and three of those Skills do not exist. A
 * second screen stated a "5 XP unlocks a Skill" rule the book does not
 * contain.
 *
 * The book, page 105: Experience is checked off box by box, and a circled box
 * earns an Advancement Roll — two tables, 2D6 on each, with a
 * next-lowest/next-highest substitution when the model already has the Skill
 * and a Patron substitution on a roll of 2. The circles are printed on the
 * Roster Sheet, so the totals come from the catalogue; see
 * `parseExperienceTrack`.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import type { SkillRow, SkillsTableName } from '@/types/catalogue';
import {
  advancementRollsDue, nextAdvancementAt, offerFor, advancementRoll, experienceTrack,
  patronSkillsFor, SKILL_TABLES, SKILL_TABLE_LABEL,
} from '../advancement';

const track = experienceTrack(DATASET)!;

const rowsOf = (t: SkillsTableName) => DATASET.campaign.skills[t];

describe('the Experience track', () => {
  it('is derived, and ships', () => {
    // Nothing in the book states these numbers; the Roster Sheet prints them
    // as circles and the extraction does not carry that page.
    expect(track).toBeTruthy();
    expect(track.advancementAt.length).toBeGreaterThan(0);
  });

  it('is strictly increasing and ends at the end of the track', () => {
    const a = track.advancementAt;
    expect(a).toEqual([...a].sort((x, y) => x - y));
    expect(new Set(a).size).toBe(a.length);
    expect(Math.max(...a)).toBeLessThanOrEqual(track.max);
  });

  it('matches the catalogue’s own thresholds', () => {
    /*
      The `Skills` link raises its allowance above 1, 3, 6, 9, 13 and 17, so a
      roll is earned ON 2, 4, 7, 10, 14 and 18. Pinned because a change here
      is a change to how often every model in every campaign learns a Skill.
    */
    expect(track.advancementAt).toEqual([2, 4, 7, 10, 14, 18]);
    expect(track.max).toBe(18);
  });
});

describe('how many rolls a model is owed', () => {
  const unit = (xp: number, advancementRolls?: number) =>
    ({ xp, advancementRolls }) as never;

  it('counts thresholds reached, minus rolls taken', () => {
    expect(advancementRollsDue(DATASET, unit(4, 1))).toBe(1);
    expect(advancementRollsDue(DATASET, unit(4, 2))).toBe(0);
    expect(advancementRollsDue(DATASET, unit(1))).toBe(0);
    expect(advancementRollsDue(DATASET, unit(18, 0))).toBe(6);
  });

  it('never goes negative when a model has more Skills than rolls', () => {
    /*
      A Patron grants Skills, and so do some Glory Items and `65 Bitter
      Lessons`. Counting `skills.length` as rolls-taken would cancel a roll
      the model had earned, which is why `advancementRolls` is its own field.
    */
    expect(advancementRollsDue(DATASET, unit(2, 5))).toBe(0);
  });

  it('says what the next total is, and nothing past the end', () => {
    expect(nextAdvancementAt(DATASET, 0)).toBe(2);
    expect(nextAdvancementAt(DATASET, 2)).toBe(4);
    expect(nextAdvancementAt(DATASET, 18)).toBeNull();
  });

  it('offers no roll at all where the ruleset has no track', () => {
    // Rule 2: a ruleset that cannot say when a roll is due must not invent a
    // threshold. This is what the app did with its "5 XP" sentence.
    expect(advancementRollsDue(null, unit(99))).toBe(0);
    expect(nextAdvancementAt(null, 0)).toBeNull();
  });
});

describe('resolving one table’s 2D6', () => {
  it('offers the Skill the dice landed on', () => {
    const row = rowsOf('melee').find((r) => r.roll === 7)!;
    const offer = offerFor(DATASET, 'melee', 7);
    expect(offer.offered.map((r) => r.name)).toEqual([row.name]);
    expect(offer.substitution).toBe('none');
  });

  it('takes the next LOWEST the model lacks when it already has the roll', () => {
    const rows = [...rowsOf('melee')].sort((a, b) => a.roll - b.roll);
    const landed = rows.find((r) => r.roll === 7)!;
    const expected = rows.filter((r) => r.roll < 7 && r.name !== 'Patron Skill').pop()!;

    const offer = offerFor(DATASET, 'melee', 7, [landed.name]);
    expect(offer.substitution).toBe('next-lowest');
    expect(offer.offered.map((r) => r.name)).toEqual([expected.name]);
  });

  it('takes the next HIGHEST when it has every lower Skill', () => {
    /*
      "If the model has all of the lower Skills from the table, use the next
      highest one."
    */
    const rows = [...rowsOf('melee')].sort((a, b) => a.roll - b.roll);
    const held = rows.filter((r) => r.roll <= 7 && r.name !== 'Patron Skill').map((r) => r.name);
    const expected = rows.find((r) => r.roll > 7 && r.name !== 'Patron Skill')!;

    const offer = offerFor(DATASET, 'melee', 7, held);
    expect(offer.substitution).toBe('next-highest');
    expect(offer.offered.map((r) => r.name)).toEqual([expected.name]);
  });

  it('sends a roll of 2 to the Patron’s own list', () => {
    // Every table's roll of 2 is "Patron Skill" — the book's step 2b.
    const patron: SkillRow[] = [
      { roll: 0, name: 'Gift of the Iron Sultan', description: '…' } as SkillRow,
    ];
    const offer = offerFor(DATASET, 'melee', 2, [], patron);
    expect(offer.substitution).toBe('patron');
    expect(offer.offered.map((r) => r.name)).toEqual(['Gift of the Iron Sultan']);
  });

  it('offers nothing rather than a table Skill when no Patron list is given', () => {
    /*
      Rule 2. Falling back to the table here would hand the model a Skill its
      Patron does not grant, on a roll the book says means the Patron.
    */
    const offer = offerFor(DATASET, 'melee', 2, []);
    expect(offer.substitution).toBe('patron');
    expect(offer.offered).toEqual([]);
  });

  it('never offers the Patron row itself as a substitute', () => {
    // It is not a Skill; it is an instruction to look elsewhere.
    const rows = [...rowsOf('melee')].sort((a, b) => a.roll - b.roll);
    const three = rows.find((r) => r.roll === 3)!;
    const offer = offerFor(DATASET, 'melee', 3, [three.name]);
    expect(offer.offered.some((r) => r.name === 'Patron Skill')).toBe(false);
  });

  it('reports a roll the table has no row for, rather than guessing', () => {
    const offer = offerFor(DATASET, 'melee', 99);
    expect(offer.landedOn).toBeNull();
    expect(offer.offered).toEqual([]);
  });
});

describe('a whole Advancement Roll', () => {
  it('returns one offer per table and leaves the choice to the player', () => {
    /*
      Step 3 is "Pick one of the two Skills" — a decision, not a derivation, so
      both come back and neither is marked the winner.
    */
    const [a, b] = advancementRoll(DATASET, ['melee', 'ranged'], [7, 9]);
    expect(a.table).toBe('melee');
    expect(b.table).toBe('ranged');
    expect(a.rolled).toBe(7);
    expect(b.rolled).toBe(9);
  });

  it('applies the held-Skill substitution across both tables', () => {
    const melee = rowsOf('melee').find((r) => r.roll === 7)!;
    const [a] = advancementRoll(DATASET, ['melee', 'ranged'], [7, 9], [melee.name]);
    expect(a.substitution).toBe('next-lowest');
  });
});

describe('the tables the app used to invent', () => {
  it('has no characteristic advance anywhere in them', () => {
    /*
      The eight buttons offered `+1 Melee`, `+1 Ranged`, `+1 Armour` and
      `+1" Move`. Trench Crusade advances a model by Skills only, and this
      asserts the derived tables contain nothing of the kind.
    */
    const all = (Object.keys(DATASET.campaign.skills) as SkillsTableName[])
      .flatMap((t) => rowsOf(t));
    const advances = all.filter((r) => /^\+\d/.test(r.name.trim()));
    expect(advances.map((r) => r.name)).toEqual([]);
  });

  it('contains none of the three Skills the wizard made up', () => {
    /*
      Of the four Skills the eight-button grid offered, three are not in the
      game: Eagle Eye, Mighty Blow, Diehard. `Shadow Walker` IS real — it is
      on the Stealth & Speed table at its own roll — which makes it the more
      interesting case: a genuine Skill the app handed out as a free pick
      rather than something a model rolled for.
    */
    const all = (Object.keys(DATASET.campaign.skills) as SkillsTableName[])
      .flatMap((t) => rowsOf(t).map((r) => r.name.toLowerCase()));

    for (const invented of ['eagle eye', 'mighty blow', 'diehard']) {
      expect(all, invented).not.toContain(invented);
    }
    expect(all).toContain('shadow walker');
  });
});

describe('the Patron’s own list, for a roll of 2', () => {
  const anyPatron = DATASET.patrons[0];

  it('resolves the free text a player typed against the derived Patrons', () => {
    /*
      `warband.patron` predates the Patrons being derived at all: it is a
      name a player typed into a box. So it is matched by name rather than
      treated as an id, and the match ignores case and surrounding space.
    */
    expect(patronSkillsFor(DATASET, anyPatron.name).map((s) => s.name))
      .toEqual(anyPatron.skills.map((s) => s.name));
    expect(patronSkillsFor(DATASET, `  ${anyPatron.name.toLowerCase()}  `))
      .toHaveLength(anyPatron.skills.length);
  });

  it('ships six Skills for every Patron, which is what the books print', () => {
    for (const p of DATASET.patrons) {
      expect(patronSkillsFor(DATASET, p.name).length, p.name).toBe(6);
    }
  });

  it('offers nothing for a Patron nobody recorded', () => {
    /*
      Rule 2. An empty list makes `offerFor` report an empty Patron offer,
      which is the honest answer; inventing one would hand the model a Skill
      its Patron does not grant.
    */
    expect(patronSkillsFor(DATASET, '')).toEqual([]);
    expect(patronSkillsFor(DATASET, undefined)).toEqual([]);
    expect(patronSkillsFor(DATASET, 'The Patron Of Nothing At All')).toEqual([]);
    expect(patronSkillsFor(null, anyPatron.name)).toEqual([]);
  });

  it('feeds the roll of 2 end to end', () => {
    const offer = offerFor(DATASET, 'melee', 2, [], patronSkillsFor(DATASET, anyPatron.name));
    expect(offer.substitution).toBe('patron');
    expect(offer.offered.map((s) => s.name)).toEqual(anyPatron.skills.map((s) => s.name));
  });
});

describe('the tables a player picks from', () => {
  it('offers exactly the four the dataset carries, and labels them all', () => {
    expect([...SKILL_TABLES].sort()).toEqual(Object.keys(DATASET.campaign.skills).sort());
    for (const t of SKILL_TABLES) expect(SKILL_TABLE_LABEL[t]).toBeTruthy();
  });
});
