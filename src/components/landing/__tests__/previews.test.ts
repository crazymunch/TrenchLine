/**
 * The landing page's previews, against the dataset they claim to come from.
 *
 * The page's own copy says the rules and statlines are read from the published
 * catalogues rather than reproduced by hand. Previews of that app that were
 * reproduced by hand would be the one place on the site that breaks the
 * promise it makes three paragraphs above them — and nobody would notice,
 * because a plausible Ducat cost looks exactly like a real one.
 *
 * So this asserts identity with the source, not plausibility.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import { buildArsenal } from '@/rules/arsenal';
import { landingPreviews } from '@/components/landing/previews';

const previews = landingPreviews();

describe('the landing page previews are read, not written', () => {
  it('quotes a glossary entry verbatim and entire', () => {
    const entry = DATASET.keywords.find((k) => k.name === previews.keyword.name);
    expect(entry, `${previews.keyword.name} is not in the glossary`).toBeDefined();
    expect(previews.keyword.description).toBe(entry?.description);
    expect(previews.keyword.type).toBe(entry?.type);

    /*
      Entire, not merely accurate. A rule shortened to fit a popover is a
      paraphrase of a rule, and the design's first choice — BLAST (X”) — runs
      to 200 words for exactly that reason. If this keyword's published text
      ever grows past what a preview can hold, the preview has to change
      keyword rather than trim this one.
    */
    expect(previews.keyword.description.length).toBeLessThan(200);
  });

  it('shows a model the app can actually field', () => {
    expect(DATASET.units.some((u) => u.name === previews.warrior)).toBe(true);
  });

  it('names published Carcass Front zones', () => {
    const zones = new Set((DATASET.carcassFrontMap?.zones ?? []).map((z) => z.name));
    for (const t of previews.territories) expect(zones.has(t), `${t} is not a zone`).toBe(true);
  });

  it('prices every armoury row at what that armoury charges', () => {
    const arsenal = buildArsenal(DATASET);
    expect(previews.armoury.rows.length).toBeGreaterThan(0);

    for (const row of previews.armoury.rows) {
      const item = arsenal.find((i) => i.name === row.name);
      expect(item, `${row.name} is not in the arsenal`).toBeDefined();

      const offer = item?.offers.find((o) => o.faction === previews.armoury.faction);
      expect(offer, `${previews.armoury.faction} does not stock ${row.name}`).toBeDefined();

      expect(row.ducats, `${row.name} Ducats`).toBe(offer?.cost.ducats);
      expect(row.glory, `${row.name} Glory`).toBe(offer?.cost.glory);
      expect(row.range, `${row.name} range`).toBe(item?.range ?? '—');
      expect(row.keywords, `${row.name} keywords`).toEqual(item?.keywords);
    }
  });

  it('names the armoury it is quoting, because a price without one is wrong', () => {
    /*
      Wargear is priced per faction: the same Automatic Rifle is 40 Ducats in
      the New Antioch table and 2 Glory in the Heretic Legions'. `arsenal.ts`
      exists because the app used to carry one cost per item. A preview with a
      Ducats column and no armoury heading would be that bug, on the page that
      advertises the fix.
    */
    const factions = new Set(buildArsenal(DATASET).flatMap((i) => i.offers.map((o) => o.faction)));
    expect(factions.has(previews.armoury.faction)).toBe(true);
  });

  it('quotes an armoury that prices in both currencies', () => {
    // An empty Glory column demonstrates nothing, and the column is the point.
    expect(previews.armoury.rows.some((r) => r.glory > 0)).toBe(true);
    expect(previews.armoury.rows.some((r) => r.ducats > 0)).toBe(true);
  });
});

describe('the landing page carries no colour of its own', () => {
  /*
    Every colour on the page is a `brand-*` or `theme-*` token. The app spent a
    migration getting ~3,700 hardcoded hex literals down to thirteen; a new
    page written from a design handoff full of raw hex values is exactly how
    that comes back, and it comes back invisibly — a hex renders correctly, it
    just stops answering to the theme.

    `GoogleMark` is the deliberate exception and is excluded by name: those
    four hexes are Google's trademark colours and must NOT be tokenised, or
    themed, or touched.
  */
  const dir = path.resolve(import.meta.dirname, '..');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));

  it('has files to check', () => expect(files.length).toBeGreaterThan(0));

  for (const file of files) {
    it(`${file} names no hex colour`, () => {
      /*
        Comments first. This file's own prose names React error #418, and a
        guard that cannot tell a colour from a citation would either fail on
        the explanation or be turned off — and a turned-off guard is worse than
        none, because it still reads as protection.
      */
      const source = fs.readFileSync(path.join(dir, file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      const hexes = source.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
      expect(hexes, `use a brand-* or theme-* token instead of ${hexes.join(', ')}`)
        .toEqual([]);
    });
  }
});
