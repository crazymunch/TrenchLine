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

const roster = (strongboxDucats: number | undefined): Roster => ({
  id: 'r', name: 'Test', factionId: 'new-antioch',
  units: [], stash: [], budget: { ducats: 700, glory: 0 },
  ...(strongboxDucats === undefined ? {} : { strongbox: { ducats: strongboxDucats, glory: 0 } }),
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
