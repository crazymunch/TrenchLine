import { describe, it, expect } from 'vitest';
import { parseDeeds, rosterDeeds } from './deeds';
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

/**
 * The Deed a model brings with it.
 *
 * `grantsDeed` reached the dataset in FD-11b and nothing read it — the field
 * existed, was tested against the layer, and changed nothing a player saw.
 * These are the reader's tests, and the first one is against the real dataset
 * rather than a fixture, so the wiring is proved end to end.
 */
describe('Deeds a roster brings to the scenario', () => {
  const biologist = DATASET.units.find((u) => u.name === 'Combat Biologist')!;
  const unitOf = (u: { entryId?: string; id: string }) =>
    ({ profileSnapshot: { id: u.entryId || u.id } });

  it('adds Gather Knowledge when a Combat Biologist is on the roster', () => {
    const deeds = rosterDeeds([{ units: [unitOf(biologist)] }], DATASET.units);
    expect(deeds.map((d) => d.title)).toEqual(['Gather Knowledge']);
    expect(deeds[0].desc).toContain('3 or more enemy models');
  });

  it('adds nothing for a roster without one', () => {
    const plain = DATASET.units.find((u) => u.name === 'Trench Pilgrim')
      ?? DATASET.units.find((u) => !(u.abilities ?? []).some((a) => a.grantsDeed))!;
    expect(rosterDeeds([{ units: [unitOf(plain)] }], DATASET.units)).toEqual([]);
  });

  it('grants it once however many Biologists are fielded', () => {
    const two = { units: [unitOf(biologist), unitOf(biologist)] };
    expect(rosterDeeds([two], DATASET.units)).toHaveLength(1);
    expect(rosterDeeds([{ units: [unitOf(biologist)] }, { units: [unitOf(biologist)] }],
      DATASET.units)).toHaveLength(1);
  });

  it('reads every participating Warband, not just the first', () => {
    const empty = { units: [] };
    expect(rosterDeeds([empty, { units: [unitOf(biologist)] }], DATASET.units)
      .map((d) => d.title)).toEqual(['Gather Knowledge']);
  });

  it('never repeats a Deed the scenario already prints', () => {
    const printed = [{ title: 'Gather Knowledge', desc: "the scenario's own wording" }];
    expect(rosterDeeds([{ units: [unitOf(biologist)] }], DATASET.units, printed)).toEqual([]);
  });

  it('survives a roster saved before any of this existed', () => {
    /*
      The reason it reads the DATASET and not `profileSnapshot.innateAbilities`:
      `recruitable.ts`'s `abilityOf` copies only id, name and description, so no
      saved roster carries `grantsDeed` and one recruited a year ago never will.
      A snapshot with nothing but an id must still get the Deed.
    */
    const ancient = { profileSnapshot: { id: biologist.entryId || biologist.id } };
    expect(rosterDeeds([{ units: [ancient] }], DATASET.units).map((d) => d.title))
      .toEqual(['Gather Knowledge']);
  });

  it('returns nothing rather than throwing when the dataset is absent', () => {
    expect(rosterDeeds([{ units: [unitOf(biologist)] }], undefined)).toEqual([]);
    expect(rosterDeeds([null, undefined], DATASET.units)).toEqual([]);
    expect(rosterDeeds([{ units: [{ profileSnapshot: {} }] }], DATASET.units)).toEqual([]);
  });
});
