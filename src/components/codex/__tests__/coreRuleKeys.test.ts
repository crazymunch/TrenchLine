/**
 * Seven core rules are printed in two chapters, and the slug is the same for
 * both.
 *
 * `Actions` is Core Rules p14 and Comprehensive Rules p34; so are `Combat`,
 * `Ranged Attacks`, `Melee Attacks`, `Blood Markers`, `Blessing Markers` and
 * `Terrain`. Both entries are real and both are shown — deduplicating would
 * drop a chapter the book prints — so it is the React KEY that has to be
 * unique, not the rule.
 *
 * Keyed on the slug alone React saw seven duplicate keys, which it resolves by
 * reusing one element for two different rules: the second copy could render
 * the first one's text.
 */
import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';

const rules = (DATASET as unknown as {
  coreRules?: { id: string; category: string; page: number }[];
}).coreRules ?? [];

describe('the Codex core-rules list', () => {
  it('has rules whose slug alone is not unique — the case being handled', () => {
    const bySlug = new Map<string, number>();
    for (const r of rules) bySlug.set(r.id, (bySlug.get(r.id) ?? 0) + 1);
    const shared = [...bySlug].filter(([, n]) => n > 1).map(([id]) => id);

    expect(rules.length, 'no core rules in the dataset').toBeGreaterThan(0);
    expect(shared, 'the duplicate slugs the key has to cope with').toContain('actions');
  });

  it('has a chapter that prints one slug twice, at two pages', () => {
    /*
      `Terrain` is Comprehensive Rules p23 — a note in "what you need to play"
      — and again at p38, where the terrain rules are. Category and slug
      together are still not unique; the page is what tells them apart in the
      book, and the badge beside each heading already shows it.
    */
    const terrain = rules.filter((r) => r.id === 'terrain'
      && r.category === 'Comprehensive Rules');
    expect(terrain).toHaveLength(2);
    expect(new Set(terrain.map((t) => t.page)).size).toBe(2);
  });

  it('and every rule is uniquely identified by category, page and slug', () => {
    const keys = rules.map((r) => `${r.category}/${r.page}/${r.id}`);
    expect(new Set(keys).size, `duplicate keys: ${
      keys.filter((k, i) => keys.indexOf(k) !== i).join(', ')
    }`).toBe(keys.length);
  });

  it('keeps both printings rather than dropping one', () => {
    const actions = rules.filter((r) => r.id === 'actions');
    expect(actions).toHaveLength(2);
    expect(new Set(actions.map((a) => a.category)).size).toBe(2);
  });
});
