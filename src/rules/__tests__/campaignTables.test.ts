/**
 * The Exploration and Skills tables, checked against what the book prints.
 *
 * `FEATURES.md` carried both as "need verification" for months. Reading them
 * against the page — the same pass that found two wrong rows in the Trauma
 * table — turned up eleven more, all of one kind: the rulebook's SIDEBAR, the
 * strip of chapter names running down every page, bleeding into a rule.
 *
 * The line filter that drops it listed `Glory Item` and was anchored `^…$`.
 * The sidebar's actual line is `Glory Item Tables`, which that never matched.
 */
import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';

type Row = { roll: unknown; name: string; description: string };
const campaign = (DATASET as unknown as {
  campaign?: {
    skills?: Record<string, Row[]>;
    exploration?: { locations?: Record<string, Row[]> };
  };
}).campaign ?? {};

const skills = campaign.skills ?? {};
const locations = campaign.exploration?.locations ?? {};
const everyRow: Row[] = [
  ...Object.values(skills).flat(),
  ...Object.values(locations).flat(),
];

describe('the four Skills tables', () => {
  it('are all there, dense from 2 to 12', () => {
    expect(Object.keys(skills).sort()).toEqual(['melee', 'ranged', 'stealth', 'wildcard']);
    for (const [name, rows] of Object.entries(skills)) {
      expect(rows.map((r) => r.roll).sort((a, b) => Number(a) - Number(b)), name)
        .toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    }
  });

  it('no longer end the Patron Skill row in a chapter name', () => {
    /*
      The bug, in all four tables at roll 12: "Pick one of the Skills offered by
      your Patron. Glory Item Tables". A player reading it sees the name of a
      chapter appended to their rule.
    */
    for (const [name, rows] of Object.entries(skills)) {
      const patron = rows.find((r) => r.roll === 12)!;
      expect(patron.description, `${name} 12`).not.toMatch(/Glory Item Tables/);
      expect(patron.description, `${name} 12`).toMatch(/offered by your Patron\.$/);
    }
  });
});

describe('the three Exploration Location tables', () => {
  it('are all there and carry rows', () => {
    expect(Object.keys(locations).sort()).toEqual(['common', 'legendary', 'rare']);
    for (const [name, rows] of Object.entries(locations)) {
      expect(rows.length, name).toBeGreaterThan(0);
    }
  });

  it('no longer end a location in a chapter name', () => {
    // `9 Survivor` and `20 Warband Strongbox` both ended "…Glory Item Tables".
    const common = locations.common ?? [];
    for (const roll of [9, 20]) {
      const row = common.find((r) => Number((r.roll as { from?: number })?.from ?? r.roll) === roll);
      expect(row, `common ${roll}`).toBeDefined();
      expect(row!.description, `common ${roll}`).not.toMatch(/Glory Item Tables/);
    }
  });

  it('no longer ends the last Legendary row in a stray page mark', () => {
    /*
      `36 Fruit from the Tree of Good and Evil Knowledge` ended "…or any
      Exploration Skill. VM" — a two-letter mark that appears exactly once in
      the whole book, alone on its line between the rule and the sidebar.

      Found by the shape check in the parser rather than by reading the page,
      which is the point of having one.
    */
    const legendary = locations.legendary ?? [];
    const fruit = legendary.find((r) => /Fruit from the Tree/.test(r.name));
    expect(fruit).toBeDefined();
    expect(fruit!.description).not.toMatch(/\bVM\b/);
    expect(fruit!.description.trim()).toMatch(/\.$/);
  });
});

describe('every row of every campaign table', () => {
  it('ends like a rule, not like a page', () => {
    /*
      The generalisation of all eleven. Sidebar bleed is a short, capitalised
      fragment dangling after the rule's last full stop — the parser fails the
      build on that SHAPE rather than on a list of known chapter names, because
      a check that consults the same list can only catch what is already in it.
    */
    for (const r of everyRow) {
      const text = r.description.trim();
      expect(text.length, r.name).toBeGreaterThan(20);
      expect(text, r.name).toMatch(/[.!?”’)\]]$|[.!?]\s*$/);
    }
  });

  it('never trails a dangling capitalised fragment', () => {
    for (const r of everyRow) {
      const stop = r.description.lastIndexOf('. ');
      if (stop < 0) continue;
      const tail = r.description.slice(stop + 2).trim();
      const dangling = tail.length > 0 && tail.length < 40
        && !/[.!?]$/.test(tail) && /^[A-Z]/.test(tail) && tail.split(/\s+/).length <= 4;
      expect(dangling, `${r.name} trails "${tail}"`).toBe(false);
    }
  });
});
