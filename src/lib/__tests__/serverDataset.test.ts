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
import { rulesetForWarband } from '../serverDataset';
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

describe('the share page footer says each of the three', () => {
  it('names all three readings in the component', () => {
    /*
      Source-level, because this suite has no DOM. What is asserted is that the
      footer has three branches rather than two: the branch that reports the
      unavailable id is the one round 1 did not have, and its absence is what
      made the page state a falsehood.
    */
    const src = readFileSync(
      join(process.cwd(), 'src/app/w/[token]/SharedRosterSheet.tsx'), 'utf8');

    expect(src).toContain('the ruleset this warband records');
    expect(src).toContain('which this build does not carry');
    expect(src).toContain('This warband records no ruleset');
    /* And the unavailable id is rendered, not merely branched on. */
    expect(src).toMatch(/\{rulesetUnavailable\}/);
  });
});
