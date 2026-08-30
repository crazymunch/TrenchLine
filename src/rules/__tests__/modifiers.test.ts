import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateCondition, adjustNumeric, applyModifiers, effectiveUnit,
  contributedModifiers, emptyContext, type SelectionContext,
} from '../modifiers';
import type { Modifier, Condition, UnitProfile } from '@/types/catalogue';

/* ------------------------------------------------------------------ helpers */

const ctx = (self: string[] = [], roster: string[] = []): SelectionContext => ({
  self: new Set(self), roster: new Set(roster),
});

const leaf = (childId: string, scope = 'self', type = 'atLeast', value = '1'): Condition =>
  ({ type, value, field: 'selections', scope, childId });

const mod = (over: Partial<Modifier> = {}): Modifier => ({
  op: 'set', field: 'name', value: 'x', origin: 'entry', ...over,
});

/* --------------------------------------------------------------- conditions */

describe('evaluateCondition', () => {
  it('reads a selection out of the right scope', () => {
    expect(evaluateCondition(leaf('a'), ctx(['a']))).toBe(true);
    expect(evaluateCondition(leaf('a'), ctx([], ['a']))).toBe(false);
    expect(evaluateCondition(leaf('a', 'roster'), ctx([], ['a']))).toBe(true);
  });

  it('treats force scope as roster scope — a warband is a single force', () => {
    expect(evaluateCondition(leaf('a', 'force'), ctx([], ['a']))).toBe(true);
  });

  it('supports the comparison types the catalogues use', () => {
    expect(evaluateCondition(leaf('a', 'self', 'atMost', '0'), ctx([]))).toBe(true);
    expect(evaluateCondition(leaf('a', 'self', 'atMost', '0'), ctx(['a']))).toBe(false);
    expect(evaluateCondition(leaf('a', 'self', 'equalTo', '1'), ctx(['a']))).toBe(true);
    expect(evaluateCondition(leaf('a', 'self', 'notEqualTo', '1'), ctx(['a']))).toBe(false);
  });

  it('short-circuits all/any correctly', () => {
    expect(evaluateCondition({ all: [leaf('a'), leaf('b')] }, ctx(['a']))).toBe(false);
    expect(evaluateCondition({ all: [leaf('a'), leaf('b')] }, ctx(['a', 'b']))).toBe(true);
    expect(evaluateCondition({ any: [leaf('a'), leaf('b')] }, ctx(['b']))).toBe(true);
    expect(evaluateCondition({ any: [leaf('a'), leaf('b')] }, ctx([]))).toBe(false);
  });

  // The whole point of three-valued logic here: an undecidable condition must
  // never quietly become "false" and silently drop a rule the player needs.
  it('returns null rather than guessing when it cannot decide', () => {
    const unknown: Condition = { type: 'instanceOf', value: '1', field: 'selections', scope: 'self' };
    expect(evaluateCondition(unknown, ctx())).toBeNull();
  });

  it('still settles an AND on a definite false and an OR on a definite true', () => {
    const unknown: Condition = { type: 'instanceOf', value: '1', field: 'selections', scope: 'self' };
    expect(evaluateCondition({ all: [unknown, leaf('a')] }, ctx([]))).toBe(false);
    expect(evaluateCondition({ any: [unknown, leaf('a')] }, ctx(['a']))).toBe(true);
    expect(evaluateCondition({ all: [unknown, leaf('a')] }, ctx(['a']))).toBeNull();
  });
});

/* -------------------------------------------------------------- statline maths */

describe('adjustNumeric', () => {
  it('keeps the sign convention and the unit the source used', () => {
    expect(adjustNumeric('+2 Dice', 1)).toBe('+3 Dice');
    expect(adjustNumeric('+0 Dice', -1)).toBe('-1 Dice');
    expect(adjustNumeric('-1 DICE', 1)).toBe('+0 DICE');
    expect(adjustNumeric('0', -1)).toBe('-1');       // no sign in, no sign out
    expect(adjustNumeric('-2', -1)).toBe('-3');
  });

  it('refuses a value it cannot read rather than inventing one', () => {
    expect(adjustNumeric('N/A', 1)).toBeNull();
    expect(adjustNumeric('', 1)).toBeNull();
  });
});

/* ------------------------------------------------------------------- applying */

describe('applyModifiers', () => {
  const base = () => ({ name: 'Azeb', keywords: ['SULTANATE'], stats: { armour: '0', melee: '-1 Dice' }, cost: { ducats: 25, glory: 0 } });

  it('does not mutate the input', () => {
    const b = base();
    applyModifiers(b, [mod({ field: 'name', value: 'Kavass' })], ctx());
    expect(b.name).toBe('Azeb');
  });

  it('applies an unconditional set', () => {
    const { profile } = applyModifiers(base(), [mod({ field: 'name', value: 'Kavass' })], ctx());
    expect(profile.name).toBe('Kavass');
  });

  it('skips a modifier whose condition is false', () => {
    const r = applyModifiers(base(), [mod({ field: 'name', value: 'Kavass', when: leaf('hw') })], ctx());
    expect(r.profile.name).toBe('Azeb');
    expect(r.applied).toHaveLength(0);
    expect(r.skipped).toHaveLength(0);       // false is decided, not skipped
  });

  it('reports — never silently drops — a modifier it cannot decide', () => {
    const undecidable = mod({
      field: 'name', value: 'Kavass',
      when: { type: 'instanceOf', value: '1', field: 'selections', scope: 'self' },
    });
    const r = applyModifiers(base(), [undecidable], ctx());
    expect(r.profile.name).toBe('Azeb');
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0].why).toMatch(/cannot be evaluated/);
  });

  it('keeps a numeric cost numeric', () => {
    const { profile } = applyModifiers(base(), [mod({ op: 'increment', field: 'cost.ducats', value: '5' })], ctx());
    expect(profile.cost.ducats).toBe(30);
  });

  it('adds and removes keywords without duplicating', () => {
    const r = applyModifiers(base(), [
      mod({ op: 'add', field: 'keywords', value: 'ELITE' }),
      mod({ op: 'add', field: 'keywords', value: 'ELITE' }),
      mod({ op: 'remove', field: 'keywords', value: 'SULTANATE' }),
    ], ctx());
    expect(r.profile.keywords).toEqual(['ELITE']);
  });

  // Document order is the catalogues' own semantics: a later `set` wins.
  it('applies in document order so a later set overrides an earlier increment', () => {
    const { profile } = applyModifiers(base(), [
      mod({ op: 'decrement', field: 'stats.armour', value: '1' }),
      mod({ op: 'set', field: 'stats.armour', value: '-2' }),
    ], ctx());
    expect(profile.stats.armour).toBe('-2');
  });

  it('surfaces a hidden modifier as availability, not as a profile value', () => {
    const r = applyModifiers(base(), [mod({ op: 'set', field: 'hidden', value: 'true' })], ctx());
    expect(r.hidden).toBe(true);
    expect(r.profile).not.toHaveProperty('hidden');
  });

  it('skips an unmapped catalogue field instead of writing a UUID onto the profile', () => {
    const r = applyModifiers(base(), [mod({ field: '9999-aaaa', rawField: '9999-aaaa', value: 'x' })], ctx());
    expect(r.skipped[0].why).toMatch(/unmapped/);
    expect(r.profile).not.toHaveProperty('9999-aaaa');
  });
});

describe('effectiveUnit', () => {
  it('is a no-op for a unit with no modifiers', () => {
    const u = { name: 'X', modifiers: [] } as unknown as UnitProfile;
    expect(effectiveUnit(u, emptyContext()).profile.name).toBe('X');
  });
});

/* ------------------------------------------------------- the acceptance test */

/**
 * Replay the real Al-Qarn Rihla NewRecruit export through the evaluator and
 * compare against the profile NewRecruit itself printed.
 *
 * This is the regression test the fixture README asks for. It is the only
 * check that proves the modifier work is correct rather than merely plausible:
 * the catalogues, the evaluator and a real third-party tool have to agree.
 */
describe('the Al-Qarn Rihla roster, replayed', () => {
  const DATASET = 'src/data/generated/trenchline.generated.ts';
  const FIXTURE = 'data-sources/fixtures/al-qarn-rihla/04-august-1320d-CURRENT.json';

  const load = () => {
    const s = fs.readFileSync(path.resolve(DATASET), 'utf8');
    const start = s.indexOf('{', s.indexOf('DATASET: Dataset ='));
    return JSON.parse(s.slice(start, s.lastIndexOf('} as unknown') + 1));
  };

  type Sel = { name: string; type?: string; entryId?: string; selections?: Sel[];
               profiles?: { name: string; typeName: string;
                            characteristics?: { name: string; $text?: string }[] }[] };

  const idsUnder = (s: Sel, out = new Set<string>()): Set<string> => {
    for (const id of String(s.entryId ?? '').split('::')) if (id) out.add(id);
    for (const c of s.selections ?? []) idsUnder(c, out);
    return out;
  };

  const norm = (s: unknown) =>
    String(s ?? '').replace(/\s+/g, ' ').replace(/[”″]/g, '"').trim().toLowerCase();

  it('reproduces every printed statline from the catalogue base plus modifiers', () => {
    const ds = load();
    const roster = JSON.parse(fs.readFileSync(path.resolve(FIXTURE), 'utf8')).roster;

    const byEntry = new Map<string, UnitProfile>();
    for (const u of ds.units as UnitProfile[]) {
      if (u.entryId && !byEntry.has(u.entryId)) byEntry.set(u.entryId, u);
    }

    const rosterIds = new Set<string>();
    for (const s of roster.forces[0].selections as Sel[]) {
      for (const id of idsUnder(s)) rosterIds.add(id);
    }
    // The roster names its own catalogue; elite-promotion titles key on it.
    const primaryCatalogueId = roster.forces[0].catalogueId as string;
    const gear = ds.weapons as { entryId?: string; modifiers?: never[] }[];

    const mismatches: string[] = [];
    let checked = 0;

    for (const sel of roster.forces[0].selections as Sel[]) {
      const models = sel.type === 'model' ? [sel]
        : (sel.selections ?? []).filter((c) => c.type === 'model');

      for (const m of models) {
        const base = byEntry.get(String(m.entryId ?? '').split('::')[0]);
        const printed = (m.profiles ?? []).find((p) => p.typeName === 'Unit');
        if (!base || !printed) continue;

        const self = idsUnder(m);
        const { profile } = effectiveUnit(
          base,
          { self, roster: rosterIds, primaryCatalogueId },
          contributedModifiers(self, gear));
        const pc = Object.fromEntries(
          (printed.characteristics ?? []).map((c) => [c.name, c.$text]));

        const fields: [string, unknown][] = [
          ['name', printed.name],
          ['stats.ranged', pc.Ranged], ['stats.melee', pc.Melee],
          ['stats.armour', pc.Armour], ['stats.base', pc.Base],
        ];
        for (const [field, want] of fields) {
          if (want == null) continue;
          checked++;
          const got = field.split('.').reduce<unknown>(
            (a, k) => (a as Record<string, unknown>)?.[k], profile as unknown);
          // "+2 Dice" and "+2 DICE" are the same statline written two ways.
          if (norm(got) !== norm(want)) {
            mismatches.push(`${m.name} ${field}: got ${JSON.stringify(got)}, printed ${JSON.stringify(want)}`);
          }
        }
      }
    }

    expect(checked).toBeGreaterThan(20);
    expect(mismatches).toEqual([]);
  });

  /**
   * The variant rename is the headline case: the catalogues carry
   * "set name = Kavass when the roster has The House of Wisdom", which is the
   * machine-readable form of the Warbands book's *Kavasses* special rule.
   */
  it('renames Azeb to Kavass under The House of Wisdom, and not otherwise', () => {
    const ds = load();
    const azeb = (ds.units as UnitProfile[]).find((u) => u.name === 'Azeb');
    expect(azeb, 'the Azeb entry should exist in the generated data').toBeTruthy();

    const rename = azeb!.modifiers.find(
      (m) => m.field === 'name' && m.value === 'Kavass');
    expect(rename, 'the Kavasses rename should be read off the catalogue').toBeTruthy();

    const hw = (rename!.when as { childId?: string }).childId!;
    expect(effectiveUnit(azeb!, ctx([], [hw])).profile.name).toBe('Kavass');
    expect(effectiveUnit(azeb!, emptyContext()).profile.name).toBe('Azeb');
  });

  /**
   * The elite-promotion titles ("Favoured Brazen Bull") turned out to be real
   * catalogue data after all — a shared `Elite Promotion` entry prepends a
   * different title per faction, chosen by an `instanceOf` against the roster's
   * primary catalogue. They are a community convention rather than a rule in
   * any book, but they are *sourced*, so we derive them and never hand-write
   * them. This test pins that they come from the catalogue, not from us.
   */
  it('derives the per-faction elite-promotion title from the catalogue', () => {
    const ds = load();
    const titles = new Map<string, string>();
    for (const w of ds.weapons as { modifiers?: { op: string; field: string; value: string;
                                                  when?: { scope?: string; childName?: string } }[] }[]) {
      for (const m of w.modifiers ?? []) {
        if (m.op === 'prepend' && m.field === 'name' && m.when?.scope === 'primary-catalogue') {
          titles.set(m.when.childName ?? '?', m.value);
        }
      }
    }
    // The set the community actually uses, read out of the pinned catalogues.
    expect(titles.get('Iron Sultanate')).toBe('Favoured');
    expect(titles.get('New Antioch')).toBe('Commissioned Officer');
    expect(titles.get('Trench Pilgrims')).toBe('Exalted');
    expect(titles.get('Heretic Legion')).toBe('Blasphemous');
    expect(titles.get('Court of the Seven-Headed Serpent')).toBe('Ascendant');
    expect(titles.get('Black Grail')).toBe('Putrid');
  });

  it('never hard-codes a promotion title into a unit name', () => {
    const ds = load();
    const baked = (ds.units as UnitProfile[]).filter(
      (u) => /^(Favoured|Ascendant|Blasphemous|Putrid|Exalted|Commissioned Officer) /.test(u.name));
    expect(baked).toEqual([]);
  });
});
