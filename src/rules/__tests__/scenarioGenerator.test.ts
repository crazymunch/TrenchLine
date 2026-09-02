/**
 * The Random Scenario Generator, as the app runs it.
 *
 * Every assertion is a rule printed in the Carcass Front book. The generator
 * this replaces rolled three invented tables, so the point of the tests is
 * less "does it roll" than "does it roll what the book says, in the order the
 * book says, and add the deed the book says is always added".
 */
import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import {
  generateScenario, rollTwoDistinct, asText,
} from '@/rules/scenarioGenerator';

const generator = DATASET.scenarioGenerator!;

/** A die that returns the given faces in order, then repeats them. */
const scripted = (faces: number[]) => {
  let i = 0;
  return () => {
    const face = faces[i++ % faces.length];
    return (face - 1) / 6 + 1e-9;
  };
};

describe('the charts, as printed', () => {
  it('carries the four steps in the book’s order', () => {
    expect(generator.steps).toEqual([
      'Roll on the Battlefield Archetype chart.',
      'Roll on the Deployment & Game Length chart.',
      'Roll on the Victory Conditions chart.',
      'Roll on the Glorious Deeds charts.',
    ]);
  });

  it('reads the Battlefield Archetype chart with its ranges', () => {
    expect(generator.battlefield.rows.map((r) => `${r.printed} ${r.values[0]}`)).toEqual([
      '1-3 No Man’s Land', '4-5 Decimated Ruins', '6 Trench Lines',
    ]);
    // A range is expanded, so the app can look a roll up rather than re-parse.
    expect(generator.battlefield.rows[0].rolls).toEqual([1, 2, 3]);
  });

  /*
    The Game Length column is VERTICALLY MERGED: rows 1-4 print one value
    between them and rows 5-6 print another, so the extraction gives a third
    cell only on rows 1 and 5. Every row of a chart a player rolls on must have
    a game length, and each printed value applies from the row it appears on
    until the next one does.
  */
  it('spreads the merged Game Length column down the rows it covers', () => {
    const rows = generator.deployment.rows;
    expect(rows.map((r) => r.values[0])).toEqual([
      'Standard Deployment', 'Flank Attack', 'Tunnels',
      'Fog of War', 'Chance Encounter', 'Long-Distance Battle',
    ]);
    const early = 'Roll a D6 at the end of the fifth Turn. On a 1 or 2, the game ends '
      + 'immediately. On a 3 or more, the game will end at the end of the sixth Turn.';
    for (const r of rows.slice(0, 4)) expect(r.values[1], r.values[0]).toBe(early);
    for (const r of rows.slice(4)) {
      expect(r.values[1], r.values[0]).toBe('The game ends at the end of the sixth Turn.');
    }
  });

  it('carries the rules for every result it can roll', () => {
    for (const chart of [generator.deployment, generator.victory]) {
      for (const row of chart.rows) {
        const rule = chart.rules.find((x) => x.name === row.values[0]);
        expect(rule, row.values[0]).toBeDefined();
        expect(rule!.body.length, row.values[0]).toBeGreaterThan(200);
      }
    }
    expect(generator.victory.rows.map((r) => r.values[0])).toEqual([
      'Attritional Battle', 'Breakthrough', 'Over the Top',
      'Retrieve', 'Sabotage', 'Take and Hold',
    ]);
  });

  it('keeps the Deployment Zone chart printed inside the Fog of War rule', () => {
    const fog = generator.deployment.rules.find((r) => r.name === 'Fog of War')!;
    expect(fog.body).toContain('| D6 | Deployment Zone |');
    expect(fog.body).toContain('| 2 | The model is deployed in the Northern Deployment Zone. |');
  });

  it('reads both Glorious Deeds charts, six deeds each', () => {
    expect(generator.gloriousDeeds.charts.map((c) => c.name)).toEqual([
      'Glorious Deeds Chart 1 (Older Player)',
      'Glorious Deeds Chart 2 (Younger Player)',
    ]);
    for (const c of generator.gloriousDeeds.charts) expect(c.rows).toHaveLength(6);
    expect(generator.gloriousDeeds.charts[0].rows.map((r) => r.name)).toEqual([
      'Reaper', 'Sharpshooter', 'Bloodletting',
      'Feigned Retreat', 'Fickle Luck', 'Headhunter',
    ]);
    // The extraction hyphenates across the column break: `BLAST Key-\nword`,
    // `Retreat AC-\nTION`, `BLOOD MARK-\nERS`.
    const all = generator.gloriousDeeds.charts
      .flatMap((c) => c.rows.map((r) => r.description)).join(' ');
    expect(all).toContain('BLAST Keyword');
    expect(all).toContain('Retreat ACTION');
    expect(all).toContain('BLOOD MARKERS');
  });
});

describe('rolling one', () => {
  it('rolls each chart once, in order, and reads the row it lands on', () => {
    // D6: battlefield 6, deployment 1, victory 4, then the deed dice.
    const s = generateScenario(generator, false, scripted([6, 1, 4, 1, 2, 3, 4]));
    expect(s.battlefield.row.values[0]).toBe('Trench Lines');
    expect(s.deployment.row.values[0]).toBe('Standard Deployment');
    expect(s.victory.row.values[0]).toBe('Retrieve');
    expect(s.gameLength).toContain('Roll a D6 at the end of the fifth Turn.');
    expect(s.deployment.rule?.name).toBe('Standard Deployment');
    expect(s.victory.rule?.name).toBe('Retrieve');
  });

  it('produces four deeds, two from each chart', () => {
    const s = generateScenario(generator, false, scripted([1, 1, 1, 1, 2, 3, 4]));
    expect(s.deeds).toHaveLength(4);
    expect(s.deeds.map((d) => d.chart)).toEqual([
      'Glorious Deeds Chart 1 (Older Player)',
      'Glorious Deeds Chart 1 (Older Player)',
      'Glorious Deeds Chart 2 (Younger Player)',
      'Glorious Deeds Chart 2 (Younger Player)',
    ]);
    expect(s.deeds.map((d) => d.name)).toEqual([
      'Reaper', 'Sharpshooter', 'Killer Instinct', 'No Escape',
    ]);
  });

  /*
    "If a player rolls the same result on both dice, roll the second dice again
    until it shows a different result to the first dice." Allowing the double
    gives a player three deeds where the book gives four.
  */
  it('re-rolls the second die of a double, and only the second', () => {
    // 4, 4, 4, 2 — the second die repeats twice before differing.
    expect(rollTwoDistinct(scripted([4, 4, 4, 2]))).toEqual([4, 2]);
    const s = generateScenario(generator, false, scripted([1, 1, 1, 5, 5, 5, 5, 5, 2]));
    expect(new Set(s.deeds.map((d) => d.name)).size).toBe(4);
  });

  it('adds Victory or Death for a campaign game, and never for a one-off', () => {
    // A constant die would make every deed roll a double, which the rule
    // forbids — so the dice vary and the campaign flag is the only difference.
    const faces = [3, 3, 3, 1, 2, 3, 4];
    expect(generateScenario(generator, false, scripted(faces)).always).toBeUndefined();
    const campaign = generateScenario(generator, true, scripted(faces));
    expect(campaign.always?.name).toBe('Victory or Death');
    expect(campaign.always?.description).toContain('A Warband wins the game.');
    // The book's own condition on it is kept, not paraphrased.
    expect(generator.gloriousDeeds.always.when)
      .toContain('always used for a Random Scenario that has been generated for a Campaign');
  });

  it('answers every roll of every chart', () => {
    for (let i = 1; i <= 6; i++) {
      // The three chart rolls, then four deed dice that are never a double.
      const s = generateScenario(generator, true, scripted([i, i, i, 1, 2, 3, 4]));
      expect(s.battlefield.row, `battlefield ${i}`).toBeDefined();
      expect(s.deployment.row.values[1], `deployment ${i}`).toBeTruthy();
      expect(s.victory.rule, `victory ${i}`).toBeDefined();
      expect(s.deeds, `deeds ${i}`).toHaveLength(4);
    }
  });

  it('writes out something an opponent without the app can read', () => {
    const text = asText(generateScenario(generator, true, scripted([6, 5, 1, 1, 2, 3, 4])));
    expect(text).toContain('Battlefield: Trench Lines');
    expect(text).toContain('Deployment:  Chance Encounter');
    expect(text).toContain('Game length: The game ends at the end of the sixth Turn.');
    expect(text).toContain('Victory:     Attritional Battle');
    expect(text).toContain('Victory or Death');
  });
});
