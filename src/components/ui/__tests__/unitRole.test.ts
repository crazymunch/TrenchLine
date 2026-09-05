/**
 * The four roles look like four things, and Tailwind can see all of it.
 *
 * The Leader has always been marked and the other three were identical, so a
 * roster of nine read as one important model and eight interchangeable ones.
 * `unitRole.ts` gives Elite and Mercenary a quieter version of the Leader's
 * treatment and leaves the Trooper as the baseline that makes them read.
 *
 * Two things can go wrong with that, and neither shows up as an error:
 *
 * 1. Two roles quietly ending up with the same treatment, which is the bug it
 *    was written to fix, coming back.
 * 2. A class string that Tailwind never compiles. `bg-${token}/15` produces no
 *    rule at all — the element simply has no background, and it looks like a
 *    design choice. That is docs/MOBILE.md §5, and `MobileNav` is the shipped
 *    example: `grid-cols-${n}` gave the bottom bar no columns.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { ROLE_STYLES, roleStyle } from '../unitRole';
import type { UnitCategory } from '@/types/rules';

const ROLES = Object.keys(ROLE_STYLES) as UnitCategory[];

describe('every role is styled, and no two the same', () => {
  it('covers all four categories', () => {
    expect(ROLES.sort()).toEqual(['Elite', 'Leader', 'Mercenary', 'Trooper']);
  });

  it('gives each of them a distinct header', () => {
    const headers = ROLES.map((r) => ROLE_STYLES[r].header);
    expect(new Set(headers).size, `two roles share a header: ${headers.join(' / ')}`)
      .toBe(ROLES.length);
  });

  it('gives each of them a distinct role word', () => {
    const labels = ROLES.map((r) => ROLE_STYLES[r].label);
    expect(new Set(labels).size).toBe(ROLES.length);
  });

  it('marks the three that are not the baseline with an icon, and the baseline with none', () => {
    // The Trooper's blankness is load-bearing: mark all four and none reads.
    expect(ROLE_STYLES.Trooper.icon).toBeUndefined();
    for (const r of ['Leader', 'Elite', 'Mercenary'] as const) {
      expect(ROLE_STYLES[r].icon, `${r} has no icon`).toBeDefined();
    }
    const icons = ['Leader', 'Elite', 'Mercenary'].map((r) => ROLE_STYLES[r as UnitCategory].icon);
    expect(new Set(icons).size, 'two roles share an icon').toBe(3);
  });

  it('fills only the Leader, and inverts its text', () => {
    // `filled` is what the card reads to decide whether its own text inverts,
    // so a role that fills its header without saying so renders unreadable.
    expect(ROLES.filter((r) => ROLE_STYLES[r].filled)).toEqual(['Leader']);
    expect(ROLE_STYLES.Leader.label).toContain('text-theme-base');
  });

  it('falls back to the baseline for a category no longer in the four', () => {
    // A warband saved by an older build, or imported, can carry anything.
    expect(roleStyle('Champion')).toBe(ROLE_STYLES.Trooper);
    expect(roleStyle('')).toBe(ROLE_STYLES.Trooper);
  });
});

describe('the classes are ones Tailwind will compile', () => {
  const source = fs.readFileSync(
    path.resolve(import.meta.dirname, '../unitRole.ts'), 'utf8');

  it('names no colour in hex', () => {
    const body = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(body.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
  });

  it('interpolates nothing into a class string', () => {
    /*
      The check the rule is actually about. Every class here has to be a
      literal the scanner can find in the file; a template hole makes the
      class name at runtime, by which time the stylesheet is built.
    */
    const body = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(body).not.toMatch(/\$\{/);
  });

  it('uses only theme and status tokens for colour', () => {
    /*
      Not a stray palette colour — `bg-red-500` renders fine and then ignores
      the theme, which is how ~3,700 hardcoded colours got here the first time.
    */
    const every = ROLES.flatMap((r) => {
      const s = ROLE_STYLES[r];
      return `${s.card} ${s.header} ${s.label} ${s.iconOffCard}`.split(/\s+/);
    }).filter(Boolean);

    const colourish = every.filter((c) =>
      /^(hover:|focus:)?(bg|text|border|border-l|border-t|border-b|border-r|divide|ring)-/.test(c));
    expect(colourish.length, 'no colour classes found — the selector has drifted')
      .toBeGreaterThan(8);

    for (const c of colourish) {
      const token = c.replace(/^(hover:|focus:)/, '').replace(/\/\d+$/, '');
      // A bare edge/width utility carries no colour and is fine:
      // `border`, `border-b`, `border-l-2`.
      if (/^border(-[lrtb])?(-\d+)?$/.test(token)) continue;
      expect(token, `${c} is not a theme-*, status-* or role-* token`)
        .toMatch(/-(theme|status|brand|role)-/);
    }
  });
});
