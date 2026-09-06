/**
 * The economy a Warband Variant states for itself.
 *
 * A player reported mustering a Papal States Intervention Force on 700 Ducats.
 * The app had the rule — it printed "You have 500 Ducats and 11 Glory" on the
 * variant panel — and then handed out the faction's purse anyway, because the
 * sentence was prose and never became data.
 *
 * These tests pin the reading of that sentence in both spellings, and pin the
 * survey that says it is the only one: if a future errata gives a second
 * variant its own purse, the count here changes and somebody has to look.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

import { parseVariants, parseVariantEconomy } from '../parse-warbands.mjs';

const hasBook = fs.existsSync('data-sources/rulebook/extracted/warbands-of-trench-crusade.txt');

/** The rule as the Warbands PDF prints it — currencies as glyphs. */
const BOOK_TEXT = 'You have 500 👑  and 11 ☼ to recruit a Papal State Intervention '
  + 'Force Warband for a campaign (▶ see Starting a Warband). A Papal States '
  + 'Intervention Force gains 4 ☼ each time it calls for Reinforcements. In a '
  + 'campaign, their Threshold Value is reduced by 200 👑 . When recruiting models '
  + 'as a latecomer for a campaign, or for a one-off game, after agreeing upon the '
  + 'size of the game, reduce the amount of 👑 a Papal States Intervention Force '
  + 'Warband has to spend by 200 👑 , and increase the amount of ☼ they have to '
  + 'spend by 11 ☼';

/** The same rule as the BattleScribe catalogue prints it — currencies as words. */
const CATALOGUE_TEXT = 'You have 500 Ducats and 11 Glory to recruit a Papal State Force '
  + 'Warband for a campaign. A Papal States Intervention Force gains 4 Glory each time '
  + 'it calls for Reinforcements. In a campaign, its Threshold Value is reduced by 200 '
  + 'Ducats. When recruiting models for a one-off game, after agreeing upon the size of '
  + 'the game, reduce the amount of Ducats a Papal States Intervention Force Warband has '
  + 'to spend by 200 Ducats and increase the amount of Glory they have to spend by 11 Glory.';

describe('parseVariantEconomy', () => {
  it('reads the purse, the threshold shift and the payout from the glyph spelling', () => {
    expect(parseVariantEconomy([{ name: 'Specialist Force', description: BOOK_TEXT }]))
      .toEqual({
        budget: { ducats: 500, glory: 11 },
        thresholdDelta: -200,
        reinforcementGlory: 4,
        statedIn: 'Specialist Force',
      });
  });

  it('reads the same four numbers from the word spelling', () => {
    expect(parseVariantEconomy([{ name: 'Specialist Force', description: CATALOGUE_TEXT }]))
      .toEqual({
        budget: { ducats: 500, glory: 11 },
        thresholdDelta: -200,
        reinforcementGlory: 4,
        statedIn: 'Specialist Force',
      });
  });

  it('agrees between the two sources, which is what lets the build cross-check them', () => {
    const book = parseVariantEconomy([{ name: 'Specialist Force', description: BOOK_TEXT }]);
    const cat = parseVariantEconomy([{ name: 'Specialist Force', description: CATALOGUE_TEXT }]);
    expect(book).toEqual(cat);
  });

  it('returns null for a variant that states no economy', () => {
    expect(parseVariantEconomy([
      { name: 'Far from Home', description: 'A Papal States Intervention Force Warband cannot include Trench Moles.' },
      { name: 'Swiss Guard', description: 'The Lieutenant and up to 4 models can have the NEGATE FEAR Keyword at no cost.' },
    ])).toBeNull();
    expect(parseVariantEconomy([])).toBeNull();
  });

  it('signs an increase the other way, so the field is a delta and not a magnitude', () => {
    expect(parseVariantEconomy([{
      name: 'Invented For This Test',
      description: 'In a campaign, its Threshold Value is increased by 150 Ducats.',
    }])).toMatchObject({ thresholdDelta: 150 });
  });

  it('takes a purse stated in Ducats alone as zero Glory, not as absent', () => {
    expect(parseVariantEconomy([{
      name: 'Invented For This Test',
      description: 'You have 450 👑 to recruit a Warband for a campaign.',
    }])).toMatchObject({ budget: { ducats: 450, glory: 0 } });
  });

  /*
    The guard that matters most. A variant whose purse the patterns cannot read
    must not come back as "no economy stated" — that is indistinguishable from
    the 26 variants that really state none, and the warband would be mustered on
    700 with nobody told. Rule 2: fail loudly.
  */
  it('throws rather than reporting silence when a purse is stated but unreadable', () => {
    expect(() => parseVariantEconomy([{
      name: 'Specialist Force',
      description: 'You have 500 Ducats at your disposal when assembling this Warband.',
    }])).toThrow(/no pattern here could read it/);
  });

  it('throws on an unreadable Threshold Value clause for the same reason', () => {
    expect(() => parseVariantEconomy([{
      name: 'Specialist Force',
      description: 'In a campaign, their Threshold Value is two hundred Ducats lower.',
    }])).toThrow(/no pattern here could read it/);
  });
});

describe.skipIf(!hasBook)('the Warbands book itself', () => {
  it('states an economy for exactly one variant', () => {
    const stating = parseVariants()
      .map((v) => ({ name: v.name, economy: parseVariantEconomy(v.specialRules) }))
      .filter((v) => v.economy);

    expect(stating).toHaveLength(1);
    expect(stating[0].name).toMatch(/PAPAL STATES/i);
    expect(stating[0].economy).toMatchObject({
      budget: { ducats: 500, glory: 11 },
      thresholdDelta: -200,
      reinforcementGlory: 4,
    });
  });

  it('states 700 Ducats for every faction, so only the variant deviates', () => {
    const text = fs.readFileSync(
      'data-sources/rulebook/extracted/warbands-of-trench-crusade.txt', 'utf8');
    const purses = [...text.matchAll(/You have\s+([\d,]+)\s*👑\s*(?:and\s+([\d,]+)\s*☼\s*)?to recruit/g)]
      .map((m) => ({ ducats: Number(m[1].replace(/,/g, '')), glory: m[2] ? Number(m[2]) : 0 }));

    // Six faction statements at 700/0, plus the one Papal States exception.
    expect(purses.filter((p) => p.ducats === 700 && p.glory === 0).length).toBeGreaterThanOrEqual(6);
    expect(purses.filter((p) => p.ducats !== 700)).toEqual([{ ducats: 500, glory: 11 }]);
  });
});
