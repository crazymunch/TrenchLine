import { describe, it, expect } from 'vitest';
import { parseDeeds } from './deeds';
import { DATASET } from '@/data/generated/trenchline.generated';

/**
 * The section text below is verbatim from
 * `src/data/generated/trenchline.generated.ts` — Claim No Man's Land — blank
 * lines and shouted continuation included. It is the shape the extractor
 * actually emits, not a tidied-up version of it.
 */
const CLAIM_NO_MANS_LAND = [
  '- Bloodletting: An attack made by a friendly model results in the sixth BLOOD',
  '',
  'MARKER being placed beside an enemy model.',
  '',
  '- Cast Them Down: A friendly model causes an enemy model to Fall from a',
  '',
  'height of at least 3” (e.g. by taking the enemy model Down near a ledge, or by forcing it off a ledge in some way).',
  '',
  '- Hold Your Ground: A Warband is the first to pass a Morale Check in this game.',
  '',
  'You receive a Victory Point for achieving this Glorious Deed.',
  '',
  '- Lord of War: A friendly model takes two enemy models Out of Action with',
  '',
  'Melee Attacks in a single Turn.',
].join('\n');

describe('parseDeeds', () => {
  it('keeps the whole rule when the extractor wrapped it', () => {
    const deeds = parseDeeds(CLAIM_NO_MANS_LAND);
    expect(deeds[0]).toEqual({
      title: 'Bloodletting',
      desc: 'An attack made by a friendly model results in the sixth BLOOD MARKER being placed beside an enemy model.',
    });
    expect(deeds[3].desc).toBe('A friendly model takes two enemy models Out of Action with Melee Attacks in a single Turn.');
  });

  it('does not turn the section’s scoring prose into a deed', () => {
    expect(parseDeeds(CLAIM_NO_MANS_LAND).map((d) => d.title)).toEqual([
      'Bloodletting', 'Cast Them Down', 'Hold Your Ground', 'Lord of War',
    ]);
  });

  it('returns nothing for a scenario with no deeds section', () => {
    expect(parseDeeds(null)).toEqual([]);
    expect(parseDeeds(undefined)).toEqual([]);
  });

  /*
    The regression this file exists for, asserted against the shipped dataset
    rather than against a fixture: no deed in any scenario may end mid-clause.
    A description that stops without terminal punctuation is a rule the parser
    cut in half, which is what the app did to most of them.
  */
  it('leaves no deed in the dataset cut off mid-sentence', () => {
    const truncated: string[] = [];

    for (const scenario of DATASET.scenarios) {
      const section = scenario.sections.find((s) => s.heading === 'GLORIOUS DEEDS');
      if (!section) continue;
      for (const deed of parseDeeds(section.body)) {
        if (deed.desc && !/[.!?)]$/.test(deed.desc)) {
          truncated.push(`${scenario.name} / ${deed.title}: …${deed.desc.slice(-40)}`);
        }
      }
    }

    expect(truncated, 'deeds cut off mid-sentence').toEqual([]);
  });
});
