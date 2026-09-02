import { describe, it, expect } from 'vitest';
import { DATASET } from '@/data/generated/trenchline.generated';
import {
  rollWeather, rollWeatherForAll, whoChooses, coverDice, SMOG_STORM, type Rng,
} from '../weather';

const EVENTS = DATASET.weather.events;

/** Deal these faces, in order, as the "random" rolls. */
const dealer = (faces: number[]): Rng => {
  let i = 0;
  return () => {
    const f = faces[i++];
    if (f === undefined) throw new Error('the roll asked for more dice than the test dealt');
    return (f - 1) / 6 + 1e-9;
  };
};

describe('the Weather Events table', () => {
  it('has a row for every result on 2D6', () => {
    expect(EVENTS.map((e) => e.roll)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('carries the rules verbatim', () => {
    const at = (roll: number) => EVENTS.find((e) => e.roll === roll)!;
    expect(at(2).name).toBe('Traumatised Earth');
    expect(at(2).effect).toContain('add –1 DICE to Morale Checks');
    expect(at(7).name).toBe('Grim and Indifferent');
    expect(at(7).effect).toBe('No effect.');
    expect(at(12).effect).toBe('Warbands automatically pass Morale Checks.');
  });

  /*
    The extractor hyphenates across the column break — "BLOOD MARK-\nERS" — and
    a rule that reads "place 2 extra BLOOD MARK- ERS" is a rule a player has to
    squint at. Three of the eleven rows hit it.
  */
  it('rejoins words the extractor hyphenated across the column break', () => {
    const eclipse = EVENTS.find((e) => e.roll === 3)!;
    expect(eclipse.effect).toContain('place 2 extra BLOOD MARKERS');
    expect(EVENTS.every((e) => !/\b\w+-\s/.test(e.effect))).toBe(true);
  });

  it('keeps the flavour line apart from the rule', () => {
    const traumatised = EVENTS.find((e) => e.roll === 2)!;
    expect(traumatised.flavour).toBe('Something truly awful happened here.');
    expect(traumatised.effect).not.toContain('Something truly awful');
  });

  it('carries the procedure, including who decides', () => {
    expect(DATASET.weather.procedure).toContain('each player rolls 2D6');
    expect(DATASET.weather.procedure).toContain('fewest Campaign Victory Points');
  });
});

describe('rolling', () => {
  it('reads the row the dice came up with', () => {
    const r = rollWeather(EVENTS, 0, dealer([6, 5]));
    expect(r.dice).toEqual([6, 5]);
    expect(r.total).toBe(11);
    expect(r.event.name).toBe('Raining Blood');
  });

  /*
    Every player rolls, and the choice is made between the results. Rolling
    once for the table is the obvious wrong implementation.
  */
  it('gives every player their own roll', () => {
    const rolls = rollWeatherForAll(EVENTS, 3, dealer([1, 1, 3, 4, 6, 6]));
    expect(rolls.map((r) => r.total)).toEqual([2, 7, 12]);
    expect(rolls.map((r) => r.player)).toEqual([0, 1, 2]);
    expect(rolls.map((r) => r.event.name))
      .toEqual(['Traumatised Earth', 'Grim and Indifferent', '(Un)Holy Choir']);
  });

  it('reaches the ends of the table', () => {
    expect(rollWeather(EVENTS, 0, dealer([1, 1])).event.roll).toBe(2);
    expect(rollWeather(EVENTS, 0, dealer([6, 6])).event.roll).toBe(12);
  });
});

describe('who chooses', () => {
  // "the player with the fewest Campaign Victory Points decides"
  it('is the player on the fewest Campaign Victory Points', () => {
    expect(whoChooses([5, 2, 9])).toEqual({ seats: [1], rollOff: false });
  });

  // "If all players have the same number of Campaign Victory Points ... simply
  // roll-off, with the winner deciding"
  it('is a roll-off when they are level', () => {
    expect(whoChooses([4, 4])).toEqual({ seats: [0, 1], rollOff: true });
  });

  it('is a roll-off between whoever is tied at the bottom', () => {
    expect(whoChooses([7, 1, 1])).toEqual({ seats: [1, 2], rollOff: true });
  });

  // "or you are playing a one-off game, simply roll-off"
  it('is a roll-off in a one-off game, where nobody has a score', () => {
    expect(whoChooses([undefined, undefined])).toEqual({ seats: [0, 1], rollOff: true });
  });
});

describe('Smog Storm', () => {
  // "The Cover/Defended Obstacle Modifiers is –2 DICE instead of –1 DICE."
  it('doubles the Cover and Defended Obstacle penalty', () => {
    const smog = EVENTS.find((e) => e.name === SMOG_STORM)!;
    expect(smog.roll).toBe(10);
    expect(coverDice(smog)).toBe(-2);
  });

  it('leaves cover at -1 for every other event, and for none', () => {
    for (const e of EVENTS.filter((x) => x.name !== SMOG_STORM)) {
      expect(coverDice(e), e.name).toBe(-1);
    }
    expect(coverDice(null)).toBe(-1);
    expect(coverDice(undefined)).toBe(-1);
  });
});
