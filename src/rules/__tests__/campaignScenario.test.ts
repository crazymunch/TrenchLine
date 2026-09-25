/**
 * The Campaign Scenario tables (RR-14, FD-10).
 *
 * Page 96 bands the twelve scenarios by game number — three D6 tables and a
 * named Final Battle — and the app had none of it. The Mission Generator drew
 * from the whole list at every game, so a first game could land on From Below
 * and the Great War could turn up in game two.
 *
 * Everything here reads `DATASET`. The scenario names are the ones the tables
 * resolved against the shipped scenario list at build time, so a name that
 * drifts fails in `rules:build` before it can fail here.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import type { Dataset } from '@/types/catalogue';
import { rollCampaignScenario, scenarioBandFor } from '../campaignScenario';

const dataset = DATASET as unknown as Dataset;
const tables = dataset.campaign!.scenarioTables!;
const scenarioNames = new Set(dataset.scenarios.map((s) => s.name));

/** A loaded D6, so a roll is a fact rather than a coin toss. */
const fixed = (n: number) => () => (n - 1) / 6 + 1e-9;

describe('the three bands', () => {
  it('are the three the book prints, in game order', () => {
    expect(tables.bands.map((b) => `${b.name} ${b.from}-${b.to}`)).toEqual([
      'Early Campaign 1-3',
      'Mid-Campaign 4-8',
      'Endgame 9-11',
    ]);
  });

  it('each cover 1 to 6 with no gap and no repeat', () => {
    for (const band of tables.bands) {
      expect(band.rows.map((r) => r.roll).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });

  it('name only scenarios the ruleset holds', () => {
    for (const band of tables.bands) {
      for (const row of band.rows) {
        if (!row.scenario) continue;
        expect(scenarioNames, `${band.name} ${row.roll}`).toContain(row.scenario);
      }
    }
  });

  /*
    The sixth result is a result, not a blank. Rerolling it would take, without
    saying so, the compensation the book gives the player who is behind.
  */
  it('end on the choice the book gives the player who has played fewer games', () => {
    for (const band of tables.bands) {
      const sixth = band.rows.find((r) => r.roll === 6)!;
      expect(sixth.choose).toBe(true);
      expect(sixth.scenario).toBeUndefined();
      expect(sixth.text).toMatch(/player who has played fewer games chooses/i);
      /* The tie-break wraps onto a second line in the extraction, and it is the
         half a table actually needs. */
      expect(sixth.text).toMatch(/If tied, roll-off and the winner chooses\./i);
    }
  });

  it('tile games 1 to 11 with no game left without a table', () => {
    for (let game = 1; game <= 11; game++) {
      expect(scenarioBandFor(tables, game), `game ${game}`).toBeDefined();
    }
  });
});

describe('the Final Battle', () => {
  it('is game 12, and is the Great War', () => {
    expect(tables.final.game).toBe(12);
    expect(scenarioNames).toContain(tables.final.scenario);
    expect(tables.final.scenario).toMatch(/Great War/);
  });

  it('is returned without a roll', () => {
    const r = rollCampaignScenario(dataset, 12, () => {
      throw new Error('game 12 is named, not rolled');
    });
    expect(r.roll).toBeNull();
    expect(r.scenario).toBe(tables.final.scenario);
    expect(r.band).toBe(tables.final.name);
  });

  /* And the Great War is not reachable from any earlier game. */
  it('is the only place the Great War appears', () => {
    const rolled = tables.bands.flatMap((b) => b.rows.map((r) => r.scenario));
    expect(rolled).not.toContain(tables.final.scenario);
  });
});

describe('rolling for a game', () => {
  it('reads the Early Campaign table for game 1', () => {
    const r = rollCampaignScenario(dataset, 1, fixed(1));
    expect(r.band).toBe('Early Campaign');
    expect(r.roll).toBe(1);
    expect(r.scenario).toBe(tables.bands[0].rows.find((x) => x.roll === 1)!.scenario);
  });

  it('reads the Mid-Campaign table for game 4, the first it covers', () => {
    expect(rollCampaignScenario(dataset, 4, fixed(2)).band).toBe('Mid-Campaign');
  });

  it('reads the Endgame table for game 11, the last it covers', () => {
    expect(rollCampaignScenario(dataset, 11, fixed(3)).band).toBe('Endgame');
  });

  it('hands a 6 back as the players’ choice, with the scenarios it permits', () => {
    const r = rollCampaignScenario(dataset, 2, fixed(6));
    expect(r.roll).toBe(6);
    expect(r.playersChoose).toBe(true);
    expect(r.scenario).toBeNull();
    expect(r.choices).toHaveLength(5);
    expect(r.choices.every((c) => scenarioNames.has(c))).toBe(true);
  });

  /*
    Rule 2. The book stops at the Final Battle, and a campaign that runs past it
    gets "the tables stop here" rather than a silent hold at the Endgame table —
    which would be the app inventing a thirteenth game's rules.
  */
  it('says the tables have run out past game 12 rather than holding', () => {
    const r = rollCampaignScenario(dataset, 13, fixed(1));
    expect(r.band).toBeNull();
    expect(r.scenario).toBeNull();
    expect(r.choices).toEqual([]);
  });

  it('says the same of a ruleset that prints no tables at all', () => {
    const silent = {
      ...dataset,
      campaign: { ...dataset.campaign, scenarioTables: undefined },
    } as unknown as Dataset;
    const r = rollCampaignScenario(silent, 1, fixed(1));
    expect(r.band).toBeNull();
    expect(r.scenario).toBeNull();
  });
});

describe('every roll on every band', () => {
  it('returns either a scenario the ruleset holds or the players’ choice', () => {
    for (let game = 1; game <= 12; game++) {
      for (let die = 1; die <= 6; die++) {
        const r = rollCampaignScenario(dataset, game, fixed(die));
        if (r.playersChoose) {
          expect(r.scenario).toBeNull();
          continue;
        }
        expect(scenarioNames, `game ${game}, roll ${die}`).toContain(r.scenario!);
      }
    }
  });
});
