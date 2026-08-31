import { describe, it, expect } from 'vitest';
import { DATASET } from '@/data/generated/trenchline.generated';
import {
  forcedBattlekit, battlekitKeywords, carriesAsBattlekit, battlekitCost,
} from '../battlekit';

/**
 * The bug this exists for: a Combat Medic could be sold a second Gas Mask.
 *
 * The catalogue forces one onto the model and hides the Armoury row for that
 * reason. The parser dropped the forced link, so the app had nothing to hide
 * the row against and charged 5 Ducats for kit the model already wore.
 */
const medic = DATASET.units.find(
  (u) => u.name === 'Combat Medic' && u.factionId === 'New Antioch')!;

describe('forced Battlekit', () => {
  it('reads the kit off the shipped dataset', () => {
    expect(forcedBattlekit(medic).map((b) => b.name).sort())
      .toEqual(['Gas Mask', 'Medikit', 'Standard Armour']);
  });

  it('gives the model the keywords its gear grants', () => {
    expect(battlekitKeywords(medic)).toContain('NEGATE GAS');
  });

  it('adds nothing to the cost — the model is priced to include it', () => {
    expect(battlekitCost(medic)).toEqual({ ducats: 0, glory: 0 });
  });

  describe('already carried', () => {
    it('matches an Armoury row by the entry id they share', () => {
      const mask = forcedBattlekit(medic).find((b) => b.name === 'Gas Mask')!;
      expect(carriesAsBattlekit(medic, { id: mask.id, name: 'anything' })).toBe(true);
    });

    /*
      And by name, because the two sources spell it differently: the catalogue
      entry is `Medikit` and the Armoury Table prints `Medi-kit`. Matching on
      the id alone would let a Medic buy a second one.
    */
    it("matches across the sources' different spellings", () => {
      expect(carriesAsBattlekit(medic, { name: 'Medi-kit' })).toBe(true);
      expect(carriesAsBattlekit(medic, { name: 'Medikit' })).toBe(true);
    });

    it('does not match gear the model has to buy', () => {
      expect(carriesAsBattlekit(medic, { name: 'Misericordia' })).toBe(false);
      expect(carriesAsBattlekit(medic, { name: 'Bolt Action Rifle' })).toBe(false);
    });
  });

  /*
    A roster saved before the pipeline emitted this field holds a snapshot
    without one. Loading it must not throw, and must not invent kit.
  */
  it('treats a profile with no battlekit field as carrying none', () => {
    expect(forcedBattlekit(undefined)).toEqual([]);
    expect(forcedBattlekit({} as never)).toEqual([]);
    expect(carriesAsBattlekit({} as never, { name: 'Gas Mask' })).toBe(false);
    expect(battlekitCost(null)).toEqual({ ducats: 0, glory: 0 });
  });
});
