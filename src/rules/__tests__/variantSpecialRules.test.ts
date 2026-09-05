/**
 * A Variant's special rules, including the ones the catalogue states as a
 * group rather than on the Variant entry.
 *
 * Two published rules were missing from the app, and for the same reason: a
 * rule the catalogue also models MECHANICALLY gets a group of its own, and
 * its Ability profile goes on that group rather than on the Variant entry.
 *
 *   The House of Wisdom          "Weapon Collections", under a group of the
 *                                same name holding a max=1 sub-group per
 *                                foreign armoury
 *   Kingdom of Alba              "Cold Steel", under "Cold Steel Discounts"
 *
 * The book prints eight special rules for The House of Wisdom; the app had
 * seven. Alba's `Cold Steel` is printed among its rules too. In both cases a
 * player was not shown a rule their Warband has.
 */
import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import type { Dataset } from '@/types/catalogue';

const d = DATASET as unknown as Dataset;
const variant = (name: string) => (d.variants ?? []).find((v) => v.name === name)!;

describe('a Variant rule stated by a group', () => {
  it('gives The House of Wisdom all eight rules the book prints', () => {
    /*
      Counted, not listed by name: the catalogue's spellings are its own —
      `Kavass` for the book's `Kavasses`, `Tawkin` for `Takwin` — and this
      test is about a rule going missing, not about whose spelling wins.
    */
    const rules = variant('The House of Wisdom').specialRules ?? [];
    expect(rules).toHaveLength(8);
    expect(rules.map((r) => r.name)).toContain('Weapon Collections');
  });

  it('carries the rule text, so the grant can be read', () => {
    const rule = (variant('The House of Wisdom').specialRules ?? [])
      .find((r) => r.name === 'Weapon Collections')!;
    expect(rule.description).toMatch(/1 piece of Battlekit from the New Antioch Armoury/);
    expect(rule.description).toMatch(/Trench Pilgrims Armoury/);
  });

  it('recovers Alba\'s Cold Steel, whose group is not named for it', () => {
    /*
      `Cold Steel` sits under `Cold Steel Discounts`. An earlier version of the
      reader required the group's name to match its profile's, which sounds
      like it distinguishes a group that IS a rule from one that merely
      contains things — and silently dropped this one. Depth is the real
      condition: a rule's group is a direct child of the Variant entry, while
      the armoury nests further down.
    */
    expect((variant('Kingdom of Alba Assault Detachment').specialRules ?? [])
      .map((r) => r.name)).toContain('Cold Steel');
  });

  it('keeps the sibling rule that was already read', () => {
    // Knights of Avarice states the same kind of grant, but on the entry
    // itself, which is why that one was never lost.
    expect((variant('Knights of Avarice').specialRules ?? []).map((r) => r.name))
      .toContain('Corrupt Merchants');
  });

  it('does not sweep in the abilities of everything under a Variant', () => {
    /*
      Only DIRECT children of the Variant entry are read. A Variant entry also
      contains its whole armoury, but those groups nest further down, so depth
      is what separates a rule from a rack of weapons.

      Pinned as a count across every Variant rather than argued about in
      prose: descending one level further reaches the armoury, and this number
      is how that would be noticed. Across 27 Variants the direct-child rule
      adds exactly the two rules above and nothing else.
    */
    const total = (d.variants ?? [])
      .reduce((n, v) => n + (v.specialRules ?? []).length, 0);
    expect(total).toBe(176);
  });
});
