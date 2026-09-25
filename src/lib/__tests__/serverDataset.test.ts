/**
 * Which ruleset a shared roster is read under, and what the page may say so.
 *
 * Review round 2 item 5. A fallback is allowed here — a roster whose recorded
 * ruleset this build does not ship is still perfectly readable, and 500ing the
 * page would serve nobody. A SILENT fallback is not: round 1 reported the
 * warband as recording no ruleset, which is a false statement about the roster
 * and hides the one fact worth knowing, that the build is behind the record.
 *
 * Three cases, three answers, and the third is the one that was missing.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rulesetForWarband, rulesetNote } from '../serverDataset';
import { RULESET_IDS, DEFAULT_RULESET_ID } from '@/rules/rulesets';

describe('rulesetForWarband', () => {
  it('reads a warband under the ruleset it records, where the build ships it', () => {
    const shipped = RULESET_IDS[0];
    expect(rulesetForWarband({ rulesetId: shipped }))
      .toEqual({ id: shipped, recorded: true });
  });

  it('a warband recording none falls back, and says it records none', () => {
    /* `unavailable` absent: there is nothing unavailable, there is nothing
       recorded. The two are different and the footer reads them differently. */
    expect(rulesetForWarband({})).toEqual({
      id: DEFAULT_RULESET_ID, recorded: false,
    });
    expect(rulesetForWarband(undefined)).toEqual({
      id: DEFAULT_RULESET_ID, recorded: false,
    });
    expect(rulesetForWarband({ rulesetId: '   ' })).toEqual({
      id: DEFAULT_RULESET_ID, recorded: false,
    });
  });

  it('a warband recording one this build lacks names it, rather than claiming none', () => {
    const missing = 'ruleset-this-build-does-not-ship';
    expect(RULESET_IDS).not.toContain(missing);

    const answer = rulesetForWarband({ rulesetId: missing });
    expect(answer).toEqual({
      id: DEFAULT_RULESET_ID, recorded: false, unavailable: missing,
    });
    /* The distinction the footer needs: not recorded, and not silently
       swallowed either. */
    expect(answer.recorded).toBe(false);
    expect(answer.unavailable).toBe(missing);
  });

  it('the two fallback cases are distinguishable, which is the whole point', () => {
    const none = rulesetForWarband({});
    const lacking = rulesetForWarband({ rulesetId: 'nope' });
    expect(none.id).toBe(lacking.id);
    expect(none.recorded).toBe(lacking.recorded);
    /* Same ruleset, same `recorded` — and still tellable apart, so the page can
       say which of the two happened. */
    expect(none.unavailable).toBeUndefined();
    expect(lacking.unavailable).toBe('nope');
  });
});

describe('Order 44 item 4c: the footer\'s three readings as one value', () => {
  /*
    Round 2 added `rulesetUnavailable` as an optional third prop beside a name and
    a boolean — so deleting it from the page\'s JSX compiled, rendered, and
    silently restored the false sentence it existed to fix. The source-text
    assertion that used to sit here could not see that either: it checked the
    COMPONENT still had three branches, not that the page still fed the third one.

    `rulesetNote` is that decision, and a discriminated union, so the reading that
    names an id cannot be built without the id. These drive it.
  */
  it('reads as the warband\'s own where the build ships what it records', () => {
    const shipped = RULESET_IDS[0];
    expect(rulesetNote(rulesetForWarband({ rulesetId: shipped }), 'TrenchLine Rules'))
      .toEqual({ kind: 'own', name: 'TrenchLine Rules' });
  });

  it('reads as the default where the warband records none', () => {
    expect(rulesetNote(rulesetForWarband({}), 'TrenchLine Rules'))
      .toEqual({ kind: 'default', name: 'TrenchLine Rules' });
  });

  it('names the id where the build does not carry it', () => {
    const missing = 'a-ruleset-this-build-does-not-ship';
    expect(RULESET_IDS).not.toContain(missing);

    const note = rulesetNote(rulesetForWarband({ rulesetId: missing }), 'TrenchLine Rules');
    expect(note).toEqual({
      kind: 'unavailable', name: 'TrenchLine Rules', recorded: missing,
    });
    /* The id is on the note, so the footer cannot render this reading without
       it — which is what makes the fix un-droppable rather than merely present. */
    if (note.kind === 'unavailable') expect(note.recorded).toBe(missing);
  });

  it('the three readings are three distinct kinds, not a flag and an optional', () => {
    const kinds = [
      rulesetNote(rulesetForWarband({ rulesetId: RULESET_IDS[0] }), 'x').kind,
      rulesetNote(rulesetForWarband({}), 'x').kind,
      rulesetNote(rulesetForWarband({ rulesetId: 'nope' }), 'x').kind,
    ];
    expect(new Set(kinds).size).toBe(3);
    expect(kinds).toEqual(['own', 'default', 'unavailable']);
  });

  it('and the page hands the component that value, for both of its renders', () => {
    /*
      Narrow and source-level on purpose: what the assertions above cannot see is
      the page going back to spreading loose props. The type would stop that now,
      but only while the component keeps the union — so this pins the call.
    */
    const page = readFileSync(
      join(process.cwd(), 'src/app/w/[token]/page.tsx'), 'utf8');

    expect(page).toMatch(/const note = rulesetNote\(ruleset, /);
    /* Twice: the sheet-less render and the full one. */
    expect(page.match(/ruleset=\{note\}/g) ?? []).toHaveLength(2);
    /* And the props it replaced are gone rather than passed alongside. */
    expect(page).not.toMatch(/rulesetUnavailable=/);
    expect(page).not.toMatch(/rulesetRecorded=/);
  });

  it('the component renders each kind, and names the id in the third', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/app/w/[token]/SharedRosterSheet.tsx'), 'utf8');

    expect(src).toContain("ruleset.kind === 'own'");
    expect(src).toContain("ruleset.kind === 'default'");
    expect(src).toContain("ruleset.kind === 'unavailable'");
    expect(src).toMatch(/\{ruleset\.recorded\}/);
    expect(src).toContain('which this build does not carry');
  });
});
