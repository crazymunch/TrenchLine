/**
 * The Amalgam, as the Dispatch prints it.
 *
 * "Replace the Grail Thrall and Amalgam Warband Entries with the following" is
 * literal, and this was settled at the printed page rather than argued from
 * the extracted text: the Dispatch PDF was fetched from the release, rendered,
 * and read. The page shows the complete entry — heading, statline table,
 * Battlekit, five abilities, the Keyword row and the Gluttonous Arsenal box —
 * with nothing truncated.
 *
 * The catalogue's `Six-armed Monstrosity` and `Strong-ish` are not on it, and
 * neither is STRONG. Keeping them had been the conservative choice while the
 * list could not be confirmed, and it produced an entry that contradicted
 * itself: the Amalgam may carry nothing but its Gluttonous Arsenal and one
 * Vile Corpus, while `Strong-ish` let it wield two HEAVY weapons and asserted
 * a Keyword the same layer removes.
 */
import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import BASE from '@/data/generated/github-latest.generated';
import type { Dataset } from '@/types/catalogue';

const d = DATASET as unknown as Dataset;
const base = BASE as unknown as Dataset;
const amalgam = (set: Dataset) => (set.units ?? []).find((u) => u.name === 'Amalgam')!;

describe('the Amalgam the Dispatch prints', () => {
  it('has the five abilities on the page and no others', () => {
    expect((amalgam(d).abilities ?? []).map((a) => a.name).sort())
      .toEqual(['Absorb', 'Corpulent', 'Curse on Creation', 'Trample', 'Unstoppable']);
  });

  it('has the four Keywords on the page, without STRONG', () => {
    const kw = amalgam(d).keywords ?? [];
    expect([...kw].sort()).toEqual(['BLACK GRAIL', 'FEAR', 'NEGATE GAS', 'TOUGH']);
  });

  it('no longer contradicts itself about STRONG', () => {
    /*
      The bug this closes: the entry asserted both that it lacks the Keyword
      (its row) and that two of its arms have it (`Strong-ish`). The build
      reports that class of contradiction; nothing should trip it here.
    */
    const kw = new Set(amalgam(d).keywords ?? []);
    for (const a of amalgam(d).abilities ?? []) {
      expect(/\bSTRONG\b/.test(a.description ?? ''), `${a.name} names STRONG`)
        .toBe(kw.has('STRONG'));
    }
  });

  it('carries the one Vile Corpus the Dispatch publishes, priced in Ducats', () => {
    /*
      One, not several. An earlier reading of this repository claimed the
      extraction had dropped entries, reasoning from "each Amalgam in a Warband
      must have a different Vile Corpus" — but the rendered page shows a single
      bullet and then the next section. The rule is satisfiable while only one
      exists, and reads as forward-looking in a Public Beta.

      The currency is Ducats, read off the rendered page: the Dispatch draws
      its cost glyphs from a Type3 font that is not in the text stream at all,
      so no extractor recovers them. A crown in a filled disc is Ducats.
    */
    const options = (amalgam(d).options ?? []).filter((o) => o.group === 'Vile Corpus');
    expect(options).toHaveLength(1);
    expect(options[0].name).toBe('Bombardment Horde');
    expect(options[0].cost).toEqual({ ducats: 20, glory: 0 });
  });

  it('leaves the catalogue Amalgam alone in a ruleset without the Dispatch', () => {
    // `github-latest` is the community catalogues as published; the removal is
    // the Dispatch's, not ours.
    expect((amalgam(base).abilities ?? []).map((a) => a.name))
      .toEqual(expect.arrayContaining(['Six-armed Monstrosity', 'Strong-ish']));
    expect(amalgam(base).keywords).toContain('STRONG');
  });
});
