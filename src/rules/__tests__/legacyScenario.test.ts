/**
 * The All Out War pack, as the app hands it to a card.
 *
 * These three scenarios are the only ones the pipeline cannot produce — the
 * pack has not been parsed — so they reach the app from
 * `src/data/allOutWarData.ts` in an older shape and are translated into the
 * derived one. The translation is where they can silently go missing, which is
 * exactly what happened: the Codex read the derived dataset directly and
 * showed seventeen scenarios out of twenty for four months.
 *
 * Nothing here asserts a rule. It asserts that the pack survives the trip and
 * that the trip invents nothing.
 */
import { describe, it, expect } from 'vitest';
import { ALL_OUT_WAR_SCENARIOS } from '@/data/allOutWarData';
import DATASET from '@/data/generated/trenchline.generated';
import { legacyEntry, legacySections, LEGACY_SECTIONS } from '@/rules/legacyScenario';
import type { Scenario } from '@/types/rules';

const entries = ALL_OUT_WAR_SCENARIOS.map(legacyEntry);

describe('the All Out War pack reaches a card', () => {
  it('is three scenarios, each with a name, a numeral and a map', () => {
    expect(entries).toHaveLength(3);
    for (const e of entries) {
      expect(e.name, 'a scenario with no name').toBeTruthy();
      expect(e.roman, `${e.name} has no numeral`).toBeTruthy();
      expect(e.slug, `${e.name} has no slug`).toBeTruthy();
      expect(e.mapImage, `${e.name} has no deployment map`).toBeTruthy();
    }
  });

  it('carries the six published sections on every one', () => {
    for (const e of entries) {
      expect(e.sections.map((x) => x.heading), e.name)
        .toEqual(LEGACY_SECTIONS.map(([heading]) => heading));
    }
  });

  it('uses the headings the derived scenarios use, exactly', () => {
    /*
      A near-miss here is the failure mode that matters. `sectionOf()` looks a
      section up by its heading string, so `BATTLEFIELD` instead of `THE
      BATTLEFIELD` would not throw — the Play Mode panel would just be blank
      for these three and for nothing else.
    */
    const derived = new Set(
      DATASET.scenarios.flatMap((s) => s.sections.map((x) => x.heading)),
    );
    for (const [heading] of LEGACY_SECTIONS) {
      expect(derived.has(heading), `no derived scenario prints "${heading}"`).toBe(true);
    }
  });

  it('names its own book, so nothing downstream has to guess', () => {
    /*
      Play Mode decides whether to offer the card, betrayal and alliance
      console from this. It used to guess, from the name, the id, the tagline
      and `number > 12`.
    */
    for (const e of entries) expect(e.source).toBe('all-out-war');
    for (const s of DATASET.scenarios) expect(s.source).not.toBe('all-out-war');
  });

  it('does not collide with a derived scenario', () => {
    const derived = new Set(DATASET.scenarios.map((s) => s.slug));
    for (const e of entries) {
      expect(derived.has(e.slug), `${e.slug} is claimed by a derived scenario`).toBe(false);
    }
  });

  it('copies bodies verbatim, adding nothing', () => {
    for (const [i, e] of entries.entries()) {
      const source = ALL_OUT_WAR_SCENARIOS[i] as Scenario;
      for (const [heading, field] of LEGACY_SECTIONS) {
        const section = e.sections.find((x) => x.heading === heading);
        expect(section?.body, `${e.name} / ${heading}`).toBe(source[field]);
      }
    }
  });

  it('omits a section the source does not have, rather than emitting a blank one', () => {
    /*
      A heading over an empty body reads as "the book prints this section and
      it says nothing". The true claim is that the scenario has no such
      section, and a card can only make it if the section is absent.
    */
    const bare = { id: 'x', name: 'X', forces: 'Only this one.' } as Scenario;
    expect(legacySections(bare)).toEqual([{ heading: 'FORCES', body: 'Only this one.' }]);

    const blank = { id: 'x', name: 'X', forces: 'Only this one.', deployment: '   ' } as Scenario;
    expect(legacySections(blank).map((x) => x.heading)).toEqual(['FORCES']);
  });
});
