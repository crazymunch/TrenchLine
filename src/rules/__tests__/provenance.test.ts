/**
 * Provenance: how a Warband came by what it holds (FD-12 item 2).
 *
 * The rule under test is rule 2 of `CLAUDE.md`, applied to a record rather than
 * to a fetch: **an entry with no source reads as `import`, never as a roll that
 * did not happen.** Every Warband saved before this shipped has Skills, injuries
 * and scars with no `source`, and the honest reading of one is "it arrived and
 * the record does not say how".
 */
import { describe, it, expect } from 'vitest';
import type { ActiveUnit, Provenance, Warband } from '@/types/warband';
import {
  advancementRollsStated, holdingsOf, injuriesHeld, provenanceLabel,
  provenanceOf, rewardInGroup, skillsStatingNoRoll, splitRecordedRoll,
  statesAnAdvancementRoll,
} from '../provenance';

const unit = (over: Partial<ActiveUnit> = {}): ActiveUnit => ({
  id: 'u1',
  customName: 'Kasim ibn Rashid',
  baseProfileId: 'p1',
  profileSnapshot: { name: 'Azeb' } as never,
  equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
  xp: 0, advancements: [], injuries: [], isDead: false, totalCost: 0,
  currentWounds: 1, maxWounds: 1, bloodMarkers: 0,
  status: 'Active', hasActedThisTurn: false,
  ...over,
});

describe('an absent record is an import, never a roll', () => {
  it('reads a missing source as import', () => {
    expect(provenanceOf(undefined)).toEqual({ kind: 'import' });
    expect(provenanceOf({})).toEqual({ kind: 'import' });
  });

  it('does not invent a game or a roll', () => {
    const label = provenanceLabel({});
    expect(label).toBe('Imported');
    expect(label).not.toMatch(/game/);
    expect(label).not.toMatch(/roll/);
  });

  it('a bare roll is a recorded ROW, never a step and never a throw', () => {
    /*
      Two rounds on one line. Round 1 (finding D) fixed the KIND: a scar with a
      `roll` and no `source` was read as `{ kind: 'trauma' }`, though the
      advancement sheet has always written that field from the Trauma Table ROW a
      player picked out of a dropdown — so every existing roster claimed a Trauma
      Step that never ran.

      Round 2 item 3 fixes the VERB, which round 1 left: the reading was still
      "rolled 31" for a row nobody threw a die for. A row is evidence of a
      choice. So the value lands in `row` and reads "row 31".

      The module's opening rule still has no exceptions: no `source` means
      `import`, whatever else the entry carries.
    */
    const scarred = holdingsOf({
      units: [unit({ scars: [{ name: 'Leg Wound', roll: '31' }] })],
    } as never);
    expect(scarred[0].source).toEqual({ kind: 'import', row: '31' });
    expect(provenanceLabel({ source: scarred[0].source })).toBe('Imported · row 31');
    expect(provenanceLabel({ source: scarred[0].source })).not.toMatch(/Trauma/);
    expect(provenanceLabel({ source: scarred[0].source })).not.toMatch(/rolled/);

    /* And the same for a Skill, which was already read this way — and which
       therefore states no Advancement Roll, because a row is not a total. */
    const skilled = holdingsOf({
      units: [unit({ skills: [{ name: 'Point Blank', category: 'Ranged Skills', roll: '9' }] })],
    } as never);
    expect(skilled[0].source).toEqual({ kind: 'import', row: '9' });
    expect(statesAnAdvancementRoll({ source: skilled[0].source })).toBe(false);
  });

  it('but a source that IS recorded is believed, roll and all', () => {
    const rolled = holdingsOf({
      units: [unit({
        scars: [{
          name: 'Leg Wound', roll: '31',
          source: { kind: 'trauma', game: 4, roll: '31' },
        }],
      })],
    } as never);
    expect(provenanceLabel({ source: rolled[0].source }))
      .toBe('Trauma Step · game 4 · rolled 31');
  });

  it('the two hand-entry kinds are two different claims', () => {
    /*
      Review round 1, finding E. Everything hand-entered used to be
      `manual-pre-app`, so a scar typed in during game six was labelled as
      predating an app that had been holding the Warband all season.
    */
    expect(provenanceLabel({ source: { kind: 'manual', game: 6 } }))
      .toBe('Recorded by hand · game 6');
    /* The note is the player's own words, so it reads on their own sheet
       (round 2 item 4) — the kind is derived and reads on both. */
    expect(provenanceLabel(
      { source: { kind: 'manual-pre-app', note: 'before we used the app' } },
      { audience: 'owner' },
    )).toBe('Recorded before the app · before we used the app');
    expect(provenanceLabel({ source: { kind: 'manual-pre-app', note: 'before we used the app' } }))
      .toBe('Recorded before the app');
    /* And `manual-pre-app` carries no game, because there was no record then. */
    expect(provenanceLabel({ source: { kind: 'manual-pre-app' } }))
      .not.toMatch(/game/);
  });

  it('says only what the record holds', () => {
    expect(provenanceLabel({ source: { kind: 'advancement', game: 4, roll: '9' } }))
      .toBe('Advancement Roll · game 4 · rolled 9');
    /* No game recorded: no "game 1". That guess is the whole thing this refuses. */
    expect(provenanceLabel({ source: { kind: 'import', roll: '9' } }))
      .toBe('Imported · rolled 9');
    expect(provenanceLabel({ source: { kind: 'exploration', game: 2, location: 'Ransacked Alchemist Workshop' } }))
      .toBe('Exploration · game 2 · Ransacked Alchemist Workshop');
    expect(provenanceLabel(
      { source: { kind: 'manual-pre-app', note: 'before we used the app' } },
      { audience: 'owner' },
    )).toBe('Recorded before the app · before we used the app');
  });

  it('and a public reading drops the note, which is the only part they wrote', () => {
    /*
      Round 2 item 4. Everything else in the label is derived — a kind, a game
      number, a die, a Location the book names — so a share loses the note and
      keeps the record. Public is the DEFAULT, so a caller that forgets is safe.
    */
    const note = { source: { kind: 'manual' as const, game: 2, note: 'PRIVATE-NOTE' } };
    expect(provenanceLabel(note)).toBe('Recorded by hand · game 2');
    expect(provenanceLabel(note, {})).toBe('Recorded by hand · game 2');
    expect(provenanceLabel(note, { audience: 'public' })).toBe('Recorded by hand · game 2');
    expect(provenanceLabel(note, { audience: 'owner' }))
      .toBe('Recorded by hand · game 2 · PRIVATE-NOTE');
  });
});

describe('the roll NewRecruit prints in brackets', () => {
  it('splits a name from its roll', () => {
    expect(splitRecordedRoll('Point Blank [9]')).toEqual({ name: 'Point Blank', roll: '9' });
    expect(splitRecordedRoll('Lost Arm [26]')).toEqual({ name: 'Lost Arm', roll: '26' });
    /* A ranged Trauma row is reached by more than one total, so the roll is a
       string and a range survives it. */
    expect(splitRecordedRoll('Full Recovery [41-63]'))
      .toEqual({ name: 'Full Recovery', roll: '41-63' });
  });

  it('leaves a name with no bracket whole, and invents no roll', () => {
    expect(splitRecordedRoll('Champion')).toEqual({ name: 'Champion' });
    expect(splitRecordedRoll('Champion').roll).toBeUndefined();
  });

  it('is not fooled by a bracket that is not a roll', () => {
    expect(splitRecordedRoll('Sniper Scope [issued]'))
      .toEqual({ name: 'Sniper Scope [issued]' });
  });
});

describe('injuries and their records, joined', () => {
  it('joins each injury to its record', () => {
    const held = injuriesHeld(unit({
      injuries: ['Leg Wound', 'Lost Arm'],
      injuryRecords: [{ name: 'Lost Arm', source: { kind: 'import', roll: '26' } }],
    }));
    expect(held).toEqual([
      { name: 'Leg Wound', source: undefined },
      { name: 'Lost Arm', source: { kind: 'import', roll: '26' } },
    ]);
  });

  it('keeps a record whose string is missing rather than dropping the injury', () => {
    const held = injuriesHeld(unit({
      injuries: [],
      injuryRecords: [{ name: 'Chest Wound', source: { kind: 'trauma', roll: '35' } }],
    }));
    expect(held.map((i) => i.name)).toEqual(['Chest Wound']);
  });

  it('matches case-insensitively, because the two lists are written separately', () => {
    const held = injuriesHeld(unit({
      injuries: ['leg wound'],
      injuryRecords: [{ name: 'Leg Wound', source: { kind: 'trauma' } }],
    }));
    expect(held).toHaveLength(1);
    expect(held[0].source).toEqual({ kind: 'trauma' });
  });
});

describe('the review: everything the Warband holds, and how', () => {
  const warband = {
    units: [unit({
      skills: [
        { name: 'Point Blank', category: 'Ranged Skills', roll: '9', source: { kind: 'import', roll: '9' } },
        /* No source, and a roll: the roll is a fact, `import` is the honest
           answer about where it came from. */
        { name: 'Sharp Eyes', category: 'Ranged Skills', roll: '6' },
      ],
      injuries: ['Leg Wound'],
      injuryRecords: [{ name: 'Leg Wound', source: { kind: 'manual-pre-app', note: 'game 3' } }],
      scars: [{ name: 'Prominent Scar', roll: '66' }],
    })],
    rewards: [
      { name: 'Book of Golems', group: 'Exploration Rewards', text: 'You find a Rabbinic manual…', source: { kind: 'import' as const } },
    ],
    /* A name the import read with no reward record beside it: a Warband imported
       before `rewards` existed holds names only. */
    campaignRules: ['Book of Golems', 'Reroll'],
  } as unknown as Warband;

  it('lists the Warband’s own grants first, then each model’s', () => {
    const holdings = holdingsOf(warband);
    expect(holdings.map((h) => h.kind))
      .toEqual(['reward', 'reward', 'skill', 'skill', 'injury', 'scar']);
  });

  it('lists a campaignRules name the rewards do not cover, as an import', () => {
    const leftover = holdingsOf(warband).find((h) => h.name === 'Reroll')!;
    expect(leftover.kind).toBe('reward');
    expect(leftover.source).toEqual({ kind: 'import' });
  });

  it('does not duplicate a name that both lists hold', () => {
    expect(holdingsOf(warband).filter((h) => h.name === 'Book of Golems')).toHaveLength(1);
  });

  it('carries the ROW of a Skill that predates `source`', () => {
    /* A row, not a roll: that field was written from a dropdown (round 2
       item 3), so it says which line, not which dice. */
    const sharp = holdingsOf(warband).find((h) => h.name === 'Sharp Eyes')!;
    expect(sharp.source).toEqual({ kind: 'import', row: '6' });
  });

  it('names the model each Skill, injury and scar belongs to', () => {
    const holdings = holdingsOf(warband);
    for (const h of holdings.filter((x) => x.kind !== 'reward')) {
      expect(h.model).toBe('Kasim ibn Rashid');
    }
    /* A reward is the Warband's, not anybody's. */
    for (const h of holdings.filter((x) => x.kind === 'reward')) {
      expect(h.model).toBeUndefined();
    }
  });

  it('leaves the fallen out: their Skills are at nobody’s disposal', () => {
    const withDead = {
      ...warband,
      fallen: [unit({ id: 'u2', customName: 'Zayd', skills: [{ name: 'Dodge', category: 'Stealth & Speed Skills' }] })],
    } as unknown as Warband;
    expect(holdingsOf(withDead).some((h) => h.name === 'Dodge')).toBe(false);
  });

  it('a Warband holding nothing holds nothing, rather than something plausible', () => {
    expect(holdingsOf({ units: [] } as unknown as Warband)).toEqual([]);
  });
});

describe('a reward found by the group its source filed it under', () => {
  it('matches the group and not the name', () => {
    const rewards = [
      { name: 'Sublime Gate', group: 'Patron Selection' },
      { name: 'Reroll', group: 'Exploration Skills' },
    ];
    expect(rewardInGroup(rewards, 'patron selection')?.name).toBe('Sublime Gate');
    expect(rewardInGroup(rewards, 'Exploration Rewards')).toBeUndefined();
    expect(rewardInGroup(undefined, 'Patron Selection')).toBeUndefined();
  });
});

describe('round 2 item 1: a Skill consumes a roll only if its record states one', () => {
  /*
    `advancement.ts` has said since it was written that a model can gain a Skill
    without an Advancement Roll — a Patron grants them, so do some Glory Items
    and the `65 Bitter Lessons` Trauma result. Round 1 counted Skills anyway,
    which cancels rolls a model earned. These pin the rule the count reads.
  */
  const skill = (source?: Provenance) => ({ name: 'Point Blank', ...(source ? { source } : {}) });

  it('an Advancement Roll states one, by kind', () => {
    expect(statesAnAdvancementRoll(skill({ kind: 'advancement', game: 2, roll: '9' }))).toBe(true);
  });

  it('an import states one only with a bracketed 2D6 total', () => {
    expect(statesAnAdvancementRoll(skill({ kind: 'import', roll: '9' }))).toBe(true);
    expect(statesAnAdvancementRoll(skill({ kind: 'import', roll: '2' }))).toBe(true);
    expect(statesAnAdvancementRoll(skill({ kind: 'import', roll: '12' }))).toBe(true);
    /* A Companion Skill: their export carries no roll at all. */
    expect(statesAnAdvancementRoll(skill({ kind: 'import' }))).toBe(false);
  });

  it('a D66 or a range is not a 2D6 total', () => {
    /* `Lost Arm [26]` is an injury's D66, not a Skill's throw, and a Trauma
       row's `41-63` is reached by more than one total. Neither is a roll on a
       Skills table. */
    expect(statesAnAdvancementRoll(skill({ kind: 'import', roll: '26' }))).toBe(false);
    expect(statesAnAdvancementRoll(skill({ kind: 'import', roll: '41-63' }))).toBe(false);
    expect(statesAnAdvancementRoll(skill({ kind: 'import', roll: '13' }))).toBe(false);
    expect(statesAnAdvancementRoll(skill({ kind: 'import', roll: '1' }))).toBe(false);
    expect(statesAnAdvancementRoll(skill({ kind: 'import', roll: 'nine' }))).toBe(false);
  });

  it('hand entry states one only where a total was captured', () => {
    expect(statesAnAdvancementRoll(skill({ kind: 'manual', game: 3, roll: '7' }))).toBe(true);
    expect(statesAnAdvancementRoll(skill({ kind: 'manual', game: 3 }))).toBe(false);
    expect(statesAnAdvancementRoll(skill({ kind: 'manual-pre-app', roll: '7' }))).toBe(true);
    expect(statesAnAdvancementRoll(skill({ kind: 'manual-pre-app', note: 'game 2' }))).toBe(false);
  });

  it('the kinds that are not a Skills-table roll state none', () => {
    expect(statesAnAdvancementRoll(skill({ kind: 'exploration', location: '16 Treasure' }))).toBe(false);
    expect(statesAnAdvancementRoll(skill({ kind: 'trauma', roll: '52' }))).toBe(false);
  });

  it('a Skill with no record at all states none', () => {
    /* The module's opening rule reads it as an import, and an import with no
       roll states nothing. Not a roll of nought. */
    expect(statesAnAdvancementRoll(skill())).toBe(false);
    expect(statesAnAdvancementRoll(undefined)).toBe(false);
  });

  it('a row is evidence of a choice, never of a die', () => {
    expect(statesAnAdvancementRoll(skill({ kind: 'manual', row: '7' }))).toBe(false);
  });

  it('counts across a list, and names the ones it did not count', () => {
    const skills = [
      skill({ kind: 'advancement', roll: '7' }),
      { name: 'Gate of Sublime Wisdom', source: { kind: 'import' } as Provenance },
      { name: 'Champion', source: { kind: 'import', roll: '11' } as Provenance },
      { name: 'Bitter Lessons' },
    ];
    expect(advancementRollsStated(skills)).toBe(2);
    expect(skillsStatingNoRoll(skills)).toEqual(['Gate of Sublime Wisdom', 'Bitter Lessons']);
  });

  it('an empty or absent list counts nought and names nothing', () => {
    expect(advancementRollsStated([])).toBe(0);
    expect(advancementRollsStated(undefined)).toBe(0);
    expect(skillsStatingNoRoll(undefined)).toEqual([]);
  });
});
