/**
 * The All Out War pack, in the shape every other scenario has.
 *
 * The rulebook's twelve and Carcass Front's five are derived by the pipeline
 * and arrive as `ScenarioEntry` — a list of `{ heading, body }` sections in the
 * book's own headings. The three All Out War scenarios are still hand-written
 * (`src/data/allOutWarData.ts`) and store their rules in named fields instead.
 *
 * One shape means one card. The Codex read the derived dataset directly and so
 * showed seventeen scenarios out of twenty; the three that were missing are the
 * only ones the app cannot re-derive, because the pack has not been parsed.
 *
 * This is a translation, not a source of data: every string it emits was
 * already in `allOutWarData.ts`, and nothing here supplies a value that file
 * does not have.
 */
import type { ScenarioEntry, ScenarioSection } from '@/types/catalogue';
import type { Scenario } from '@/types/rules';

/**
 * The six headings every published scenario prints, against the field each
 * lives in on the hand-written shape.
 *
 * In the order the book sets them out, so a card built from this reads the way
 * the page does. `THE BATTLEFIELD`, not `BATTLEFIELD`: these headings are
 * compared against the derived ones by string, and `sectionOf` would miss a
 * near-miss silently rather than loudly.
 */
export const LEGACY_SECTIONS: ReadonlyArray<readonly [string, keyof Scenario]> = [
  ['FORCES', 'forces'],
  ['THE BATTLEFIELD', 'battlefield'],
  ['DEPLOYMENT', 'deployment'],
  ['GAME LENGTH', 'gameLength'],
  ['VICTORY CONDITIONS', 'victoryConditions'],
  ['GLORIOUS DEEDS', 'gloriousDeeds'],
];

/**
 * A hand-written scenario's named fields, as sections.
 *
 * A missing field yields no section rather than an empty one. A heading over a
 * blank body reads as "the book prints this section and it says nothing",
 * which is a different claim from "this scenario has no such section" — and it
 * is the second that is true.
 *
 * `tableSize` is deliberately not mapped. The rulebook prints no TABLE SIZE
 * heading, so inventing one to hold the field would put a section on the card
 * that no scenario in any book has. The size is stated in THE BATTLEFIELD
 * prose, where the book states it.
 */
export const legacySections = (s: Scenario): ScenarioSection[] =>
  LEGACY_SECTIONS.flatMap(([heading, field]) => {
    const body = s[field];
    return typeof body === 'string' && body.trim() ? [{ heading, body }] : [];
  });

/**
 * The whole entry.
 *
 * `source` is set here rather than guessed downstream. Play Mode used to
 * decide whether to offer the card, betrayal and alliance console by testing
 * the scenario's name, its id, its tagline and `number > 12` — four patterns,
 * each a near-miss waiting for a supplement to break it.
 */
export const legacyEntry = (s: Scenario): ScenarioEntry => ({
  number: s.number ?? 0,
  roman: s.roman ?? '',
  name: s.name,
  slug: s.slug ?? s.id,
  tagline: s.tagline || s.flavor || '',
  sections: legacySections(s),
  mapImage: s.mapImage ?? null,
  source: 'all-out-war',
});
