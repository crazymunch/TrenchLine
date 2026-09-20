/**
 * An overdrawn Strongbox is a roster that may not be played.
 *
 * FD-05e made the builder's remaining figure the Strongbox and FD-05e-2 made
 * every purchase spend it, so a muster can run the balance negative. The
 * builder deliberately does not block that — a player part-way through a list
 * is over for a moment and then trims, and a button that will not press while
 * they rearrange is the worse failure. The refusal belongs here, where a
 * roster is checked before it is used: an overdrawn roster must not reach a
 * game or the post-battle wizard, because every number those produce would be
 * built on Ducats the Warband does not have.
 */
import { describe, it, expect } from 'vitest';
import { validateRoster } from '../validate';
import { DATASET } from '@/data/generated/trenchline.generated';
import type { Roster } from '../costs';
import type { Dataset } from '@/types/catalogue';

const roster = (
  strongboxDucats: number | undefined,
  strongboxGlory = 0,
): Roster => ({
  id: 'r', name: 'Test', factionId: 'new-antioch',
  units: [], stash: [], budget: { ducats: 700, glory: 0 },
  ...(strongboxDucats === undefined
    ? {}
    : { strongbox: { ducats: strongboxDucats, glory: strongboxGlory } }),
} as Roster);

const overdrawn = (r: Roster) =>
  validateRoster(r, DATASET as unknown as Dataset).violations
    .filter((v) => v.code === 'strongbox-overdrawn');

describe('the overdrawn check', () => {
  it('raises an error naming the shortfall — 740 spent on 700', () => {
    const v = overdrawn(roster(-40));
    expect(v).toHaveLength(1);
    expect(v[0].severity).toBe('error');
    expect(v[0].message).toBe('Strongbox overdrawn by 40 Ducats.');
  });

  it('and trimming 40 clears it', () => {
    expect(overdrawn(roster(0))).toHaveLength(0);
  });

  it('says nothing about a Strongbox in credit', () => {
    expect(overdrawn(roster(80))).toHaveLength(0);
  });

  /* An unrestricted list carries no Strongbox and is never refused for one. */
  it('says nothing about a list that holds no money', () => {
    expect(overdrawn(roster(undefined))).toHaveLength(0);
  });
});

/**
 * And in Glory (FD-05h).
 *
 * This read `strongbox.ducats` alone, and that was the stated reason a hire
 * priced in Glory charged nothing: charging it would have driven a Warband
 * negative in a currency nothing checked. Both halves of the Strongbox are
 * spendable, so both can go under, and the message says which — a player told
 * only that they are "overdrawn by 5" would go hunting through a Ducat
 * balance that is perfectly fine.
 */
describe('the overdrawn check, in Glory', () => {
  it('raises an error naming Glory, not Ducats', () => {
    const v = overdrawn(roster(0, -5));
    expect(v).toHaveLength(1);
    expect(v[0].severity).toBe('error');
    expect(v[0].message).toBe('Strongbox overdrawn by 5 Glory.');
  });

  it('and earning 5 back clears it', () => {
    expect(overdrawn(roster(0, 0))).toHaveLength(0);
  });

  it('says nothing about Glory in credit', () => {
    expect(overdrawn(roster(80, 12))).toHaveLength(0);
  });

  /* One roster to trim, so one violation — `formatCost` spells both. */
  it('reports a roster short of both as a single shortfall', () => {
    const v = overdrawn(roster(-40, -5));
    expect(v).toHaveLength(1);
    expect(v[0].message).toBe('Strongbox overdrawn by 40 Ducats + 5 Glory.');
  });

  it('does not let a Glory credit hide a Ducat shortfall', () => {
    const v = overdrawn(roster(-40, 12));
    expect(v).toHaveLength(1);
    expect(v[0].message).toBe('Strongbox overdrawn by 40 Ducats.');
  });
});
