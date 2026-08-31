import { describe, it, expect } from 'vitest';
import { DATASET } from '@/data/generated/trenchline.generated';
import { parseUnforeseenEvents, rollUnforeseen } from '../unforeseen';

const sectionOf = (roman: string, heading: string) =>
  DATASET.scenarios.find((s) => s.roman === roman)
    ?.sections.find((x) => x.heading === heading)?.body;

describe('Unforeseen Events', () => {
  const hunt = parseUnforeseenEvents(sectionOf('II', 'UNFORESEEN EVENTS'));

  it('reads the three rows Hunt for Heroes prints', () => {
    expect(hunt.map((e) => [e.roll, e.name])).toEqual([
      [1, 'Rising Fog'],
      [2, 'Rain, Mud, and Guts'],
      [3, 'Deep Craters'],
    ]);
  });

  it('keeps each rule verbatim', () => {
    expect(hunt[0].effect).toContain('all\nRanged Weapons have their Range halved'.replace('\n', ' '));
    expect(hunt[1].effect).toContain('add -2 DICE to rolls for Melee Attacks');
    expect(hunt[2].effect).toContain('Crater Markers');
  });

  /*
    A rule's own text is full of numbers — "within 2” of a terrain piece",
    "6 new Markers" — and a looser match would read them as further rows. Deep
    Craters is the row that proves it: its effect is four sentences long.
  */
  it('does not manufacture rows from numbers inside a rule', () => {
    expect(hunt).toHaveLength(3);
  });

  it('is the only scenario that has one, so the rest get nothing', () => {
    const withTable = DATASET.scenarios.filter(
      (s) => parseUnforeseenEvents(
        s.sections.find((x) => x.heading === 'UNFORESEEN EVENTS')?.body).length > 0);
    expect(withTable.map((s) => s.roman)).toEqual(['II']);
  });

  it('returns nothing for a scenario with no table, rather than a default', () => {
    expect(parseUnforeseenEvents(sectionOf('I', 'UNFORESEEN EVENTS'))).toEqual([]);
    expect(parseUnforeseenEvents(undefined)).toEqual([]);
    expect(parseUnforeseenEvents('')).toEqual([]);
  });

  it('refuses a table whose rolls do not run 1, 2, 3', () => {
    expect(parseUnforeseenEvents('1 Alpha: one. 3 Gamma: three.')).toEqual([]);
  });

  describe('rolling', () => {
    // "On a roll of 1-4 nothing happens, but on a 5 or 6, an Unforeseen Event
    // takes place."
    const fixed = (...vals: number[]) => { let i = 0; return () => vals[i++]; };
    const face = (n: number, sides: number) => (n - 1) / sides + 1e-9;

    it('does nothing on a 1 to 4', () => {
      for (const n of [1, 2, 3, 4]) {
        expect(rollUnforeseen(hunt, fixed(face(n, 6))).triggered).toBe(false);
      }
    });

    it('rolls a D3 for the event on a 5 or 6', () => {
      const r = rollUnforeseen(hunt, fixed(face(5, 6), face(2, 3)));
      expect(r.triggered).toBe(true);
      expect(r.d3).toBe(2);
      expect(r.event?.name).toBe('Rain, Mud, and Guts');
    });

    it('never claims an event when the scenario has no table', () => {
      expect(rollUnforeseen([], fixed(face(6, 6))).triggered).toBe(false);
    });
  });
});
