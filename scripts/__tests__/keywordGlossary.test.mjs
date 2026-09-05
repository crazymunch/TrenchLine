/**
 * The Codex carries every Keyword the 1.0.2 Changelog names.
 *
 * `docs/AUDIT.md` §1.3a found 7 of the changelog's 12 missing — `CLEAVE (X)`
 * and `DEADLY` among them, core combat Keywords used repeatedly in the Trench
 * Dispatch (`CLEAVE 3` on the Gluttonous Arsenal, `DEADLY` on the M.U.R.A.D.
 * Bombard). A player looking either up got an empty result from a glossary
 * that presented itself as complete.
 *
 * The audit's own words: "the failure mode to guard against most carefully:
 * not invented data, but a claim of completeness that the code does not
 * honour." All 17 are present now, and this is what keeps that true — a
 * completeness claim nothing re-checks is a claim about one afternoon.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { changelogKeywords, bareName } from '../lib/changelog-keywords.mjs';

const CHANGELOG = 'data-sources/rulebook/extracted/changelog-1.0.2.txt';
const GENERATED = 'src/data/generated/trenchline.generated.ts';
const RULEBOOK = 'data-sources/rulebook/extracted/trench-crusade-digital-rulebook.txt';

/** The shipped glossary, which is the `keywords` block of the dataset. */
function glossary() {
  const gen = fs.readFileSync(GENERATED, 'utf8');
  const from = gen.indexOf('\n  "keywords": [');
  const to = gen.indexOf('\n  "scenarios":');
  expect(from, 'the dataset has no keywords block').toBeGreaterThan(-1);
  expect(to, 'the keywords block has no end').toBeGreaterThan(from);
  return new Set([...gen.slice(from, to).matchAll(/"name": "([^"]+)"/g)].map((m) => bareName(m[1])));
}

describe('the base rulebook', () => {
  it('is version 1.0.2, which is why no changelog layer exists', () => {
    /*
      The premise the rest of this rests on, and the one thing here that could
      go silently false.

      The digital rulebook the pipeline derives from IS 1.0.2 — its cover reads
      `1`0`2`, with the PDF's own glyph substitution for the dots — so the
      changelog is a record of what changed BETWEEN versions, not a delta to
      apply on top. Every rewrite it lists was checked and is already in the
      book: `STRONG`'s second sentence, `RISKY`'s last, `SKIRMISHER`'s evade,
      `MINED`'s detonation, and each of the terrain Keywords.

      Where the two differ it is wording, not rules — the book's `CLEAVE (X)`
      reads "take a Fight ACTION and choose a Weapon with this Keyword" where
      the changelog reads "with a Weapon that has this Keyword" — and the book
      is the later, refined artefact, so the app derives from it.

      Swap in a 1.0.1 rulebook and all of that quietly stops being true, with
      nothing else in the build to notice. Hence this line.
    */
    const cover = fs.readFileSync(RULEBOOK, 'utf8').slice(0, 200);
    expect(cover.replace(/[`’'·]/g, '.')).toMatch(/1\.0\.2/);
  });
});

describe('reading the Keywords out of the changelog', () => {
  const named = changelogKeywords(fs.readFileSync(CHANGELOG, 'utf8'));

  it('finds both shapes the changelog uses', () => {
    /*
      A definition (`CLEAVE (X) (Effect): …`) and a change to an existing one
      (a page reference, the name, then a line opening `Keyword`). Reading only
      the first shape is how `SKIRMISHER` would go unchecked — it is named only
      as a change.
    */
    expect(named).toContain('CLEAVE (X)');
    expect(named).toContain('SKIRMISHER');
    expect(named).toContain('STRONG');
  });

  it('does not mistake an entry being changed for a Keyword', () => {
    /* The same column carries model names in title case —
       `32  Combat Engineer  Add the NEGATE MINED KEYWORD…` — and those are
       entries, not Keywords. */
    expect(named).not.toContain('Combat Engineer');
    expect(named.map((n) => n.toUpperCase())).not.toContain('NEW KEYWORD');
  });

  it('refuses to pass on an empty list', () => {
    /*
      The failure that hid a dead cross-check for weeks: a comparison against
      nothing reports success. If the extraction breaks, or the changelog
      extract moves, this must fail rather than quietly assert nothing.
    */
    expect(named.length).toBeGreaterThan(10);
  });
});

describe('the shipped glossary', () => {
  it('has every Keyword the changelog names', () => {
    const have = glossary();
    const missing = changelogKeywords(fs.readFileSync(CHANGELOG, 'utf8'))
      .filter((k) => !have.has(bareName(k)));
    expect(missing, `absent from the Codex glossary: ${missing.join(', ')}`).toEqual([]);
  });

  it('compares on the name without its parameter', () => {
    /* `CLEAVE (X)` in the changelog is `CLEAVE (X)` in the glossary and
       `CLEAVE 3` on a weapon. The parameter is not part of the name, and
       comparing raw strings would report a present Keyword as missing. */
    expect(bareName('CLEAVE (X)')).toBe('CLEAVE');
    expect(bareName('BLAST (X”)')).toBe('BLAST');
    expect(bareName('DEADLY')).toBe('DEADLY');
  });
});
