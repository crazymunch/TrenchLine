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
import type { ActiveUnit, Warband } from '@/types/warband';
import {
  holdingsOf, injuriesHeld, provenanceLabel, provenanceOf, rewardInGroup,
  splitRecordedRoll,
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

  it('says only what the record holds', () => {
    expect(provenanceLabel({ source: { kind: 'advancement', game: 4, roll: '9' } }))
      .toBe('Advancement Roll · game 4 · rolled 9');
    /* No game recorded: no "game 1". That guess is the whole thing this refuses. */
    expect(provenanceLabel({ source: { kind: 'import', roll: '9' } }))
      .toBe('Imported · rolled 9');
    expect(provenanceLabel({ source: { kind: 'exploration', game: 2, location: 'Ransacked Alchemist Workshop' } }))
      .toBe('Exploration · game 2 · Ransacked Alchemist Workshop');
    expect(provenanceLabel({ source: { kind: 'manual-pre-app', note: 'before we used the app' } }))
      .toBe('Recorded before the app · before we used the app');
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

  it('carries the roll of a Skill that predates `source`', () => {
    const sharp = holdingsOf(warband).find((h) => h.name === 'Sharp Eyes')!;
    expect(sharp.source).toEqual({ kind: 'import', roll: '6' });
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
