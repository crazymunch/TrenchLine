'use client';

/**
 * Every scenario the app can offer, in one list.
 *
 * Two sources, and they are not equally trustworthy, so they are kept apart
 * rather than concatenated silently:
 *
 *   - **The twelve core scenarios** are derived from the digital rulebook
 *     (`scripts/lib/parse-scenarios.mjs`). The hand-written set they replaced
 *     had the wrong game length for all twelve, inverted Claim No Man's Land's
 *     Infiltrator rule, and invented 32 of its 46 Glorious Deeds.
 *   - **The three All Out War scenarios** are still hand-written. Spot-checked
 *     against `data-sources/rulebook/extracted/all-out-war.txt`, 20 of their 24
 *     bolded terms are real and the four that are not are the app's own section
 *     labels rather than invented rules — so they are materially better than
 *     the core twelve were, but they are not derived, and `derived: false` says
 *     so rather than letting them pass as sourced.
 */
import { useMemo } from 'react';
import type { ScenarioEntry } from '@/types/catalogue';
import type { Scenario } from '@/types/rules';
import { ALL_OUT_WAR_SCENARIOS } from '@/data/allOutWarData';
import { useDataset } from './useDataset';
import { DEFAULT_RULESET_ID } from './rulesets';

/** What a picker needs: enough to choose and to log a result. */
export interface ScenarioChoice {
  id: string;
  number: number;
  name: string;
  tagline: string;
  mapImage: string | null;
  /**
   * The published GAME LENGTH, or null where the source does not state one.
   *
   * Null, never a default. The post-battle wizard showed
   * `scenario.gameLength || '5 Turns'`, and every one of the twelve fell
   * through to that default because the hand-written field was wrong — so the
   * app displayed "5 Turns" for scenarios the book plays over four.
   */
  gameLength: string | null;
  /** True where the entry came from the pipeline rather than a hand-written file. */
  derived: boolean;
  /** Present only on derived scenarios. */
  entry?: ScenarioEntry;
}

const fromEntry = (s: ScenarioEntry): ScenarioChoice => ({
  id: s.slug,
  number: s.number,
  name: `${s.roman}. ${s.name}`,
  tagline: s.tagline,
  mapImage: s.mapImage,
  gameLength: s.sections.find((x) => x.heading === 'GAME LENGTH')?.body ?? null,
  derived: true,
  entry: s,
});

const fromLegacy = (s: Scenario): ScenarioChoice => ({
  id: s.id,
  number: s.number ?? 0,
  name: s.name,
  tagline: s.tagline || s.flavor || '',
  mapImage: s.mapImage ?? null,
  gameLength: s.gameLength ?? null,
  derived: false,
});

/**
 * One published section of a scenario, or null.
 *
 * Null, never a placeholder. Three separate views defaulted a missing section
 * to `'48" x 48"'`, `'4-5 Turns'` or `'Standard'`, and because the hand-written
 * data was wrong in exactly those fields, those defaults are what the app
 * actually showed. A blank says "the book does not state this here"; a default
 * says something false in the book's voice.
 */
export const sectionOf = (s: ScenarioChoice | undefined, heading: string): string | null =>
  s?.entry?.sections.find((x) => x.heading === heading)?.body ?? null;

export function useScenarios(rulesetId: string = DEFAULT_RULESET_ID) {
  const { dataset, loading, error } = useDataset(rulesetId);

  const scenarios = useMemo(() => [
    ...(dataset?.scenarios ?? []).map(fromEntry),
    ...ALL_OUT_WAR_SCENARIOS.map(fromLegacy),
  ], [dataset]);

  return { scenarios, loading, error };
}
