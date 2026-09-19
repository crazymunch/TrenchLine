/**
 * Injuries reaching the statline they modify.
 *
 * The defect was reported from a live game: a model with a Leg Wound was
 * still showing its printed Movement, so the player measured with the wrong
 * number all night. The injury was recorded, displayed, and applied to
 * nothing.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import {
  effectiveMovement, deltaFromDescription, type TraumaRow,
} from '../effectiveStats';

const TABLE = DATASET.campaign.trauma as TraumaRow[];
const legWound = TABLE.find((r) => r.name === 'Leg Wound')!;

describe('the Trauma table', () => {
  it('still carries the Leg Wound row this reads', () => {
    // If upstream renames or rewords it, this fails rather than the app
    // silently going back to applying nothing.
    expect(legWound).toBeDefined();
    expect(legWound.description).toMatch(/Movement Characteristic is reduced by 2/i);
  });

  it('is the only row that changes a Characteristic', () => {
    /*
      Documents the scope. 22 rows, one statline change; the rest are dice
      modifiers and conditions. If a future row adds one, this fails and
      whoever added it finds out it needs handling.
    */
    const changing = TABLE.filter((r) => deltaFromDescription(r.description));
    expect(changing.map((r) => r.name)).toEqual(['Leg Wound']);
  });
});

describe('reading the modifier out of the printed text', () => {
  it('takes the number from the catalogue, not from here', () => {
    expect(deltaFromDescription(legWound.description)).toEqual({ movement: -2 });
  });

  it('reads an increase as well as a reduction', () => {
    expect(deltaFromDescription('The model’s Movement Characteristic is increased by 1".'))
      .toEqual({ movement: 1 });
  });

  it('returns nothing for a row that says something else', () => {
    expect(deltaFromDescription('The model suffers -1 DICE for all of its Melee Attack ACTIONS.'))
      .toBeNull();
    expect(deltaFromDescription('')).toBeNull();
  });
});

describe('effective Movement', () => {
  it('applies a Leg Wound to the number the player measures with', () => {
    const r = effectiveMovement('6"', ['Leg Wound'], TABLE);
    expect(r.base).toBe('6"');
    expect(r.effective).toBe('4"');
    expect(r.delta).toBe(-2);
    expect(r.applied).toEqual(['Leg Wound']);
  });

  it('stacks two of them', () => {
    const r = effectiveMovement('6"', ['Leg Wound', 'Leg Wound'], TABLE);
    expect(r.effective).toBe('2"');
    expect(r.delta).toBe(-4);
  });

  it('never goes below zero', () => {
    const r = effectiveMovement('3"', ['Leg Wound', 'Leg Wound'], TABLE);
    expect(r.effective).toBe('0"');
  });

  it('leaves an uninjured model exactly as printed', () => {
    const r = effectiveMovement('6"', [], TABLE);
    expect(r.effective).toBe('6"');
    expect(r.delta).toBe(0);
    expect(r.unmodelled).toEqual([]);
  });

  it('keeps the unit of the printed value', () => {
    // The statline is text, not a number — whatever it is suffixed with
    // survives the substitution.
    expect(effectiveMovement('6"', ['Leg Wound'], TABLE).effective).toBe('4"');
    expect(effectiveMovement('6', ['Leg Wound'], TABLE).effective).toBe('4');
  });

  it('leaves an unreadable statline alone rather than inventing one', () => {
    // The bug in the range calculator was `parseInt(...) || 6`. Not repeated.
    const r = effectiveMovement('Special', ['Leg Wound'], TABLE);
    expect(r.effective).toBe('Special');
    expect(r.delta).toBe(0);
  });
});

describe('what it refuses to fold in', () => {
  it('reports a dice-modifier injury instead of silently ignoring it', () => {
    /*
      THE point. An injury the statline cannot express must still reach the
      player — dropping it quietly is the same failure as not applying the Leg
      Wound, one level down.
    */
    const r = effectiveMovement('6"', ['Hand Wound'], TABLE);
    expect(r.delta).toBe(0);
    expect(r.unmodelled).toContain('Hand Wound');
  });

  it('reports the Leg Wound’s OTHER effect while applying its first', () => {
    // "reduced by 2” AND it suffers -1 DICE to Dash" — one row, two effects.
    const r = effectiveMovement('6"', ['Leg Wound'], TABLE);
    expect(r.applied).toContain('Leg Wound');
    expect(r.unmodelled).toContain('Leg Wound');
  });

  it('passes through an injury the table does not know', () => {
    // A house rule or another edition's name. Still written on the model.
    const r = effectiveMovement('6"', ['Trench Foot'], TABLE);
    expect(r.unmodelled).toEqual(['Trench Foot']);
  });

  it('says nothing about a recovery that has no ongoing effect', () => {
    const recovered = TABLE.find((r) => /Full Recovery/i.test(r.name));
    if (!recovered) return;
    const r = effectiveMovement('6"', [recovered.name], TABLE);
    expect(r.unmodelled).toEqual([]);
  });

  it('ignores blank entries', () => {
    const r = effectiveMovement('6"', ['', '   '], TABLE);
    expect(r.unmodelled).toEqual([]);
    expect(r.effective).toBe('6"');
  });
});
