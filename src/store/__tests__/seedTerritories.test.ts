/**
 * The campaign map's theatres carry no invented rules.
 *
 * Each of the twelve shipped a mechanical effect nobody published — `+15
 * Ducats & +1 Alchemical Formula discount per match`, `+1 Armour
 * Characteristic on Turn 1 from hardened winter fortifications`, `Reroll 1
 * failed Initiative roll per battle` — shown in the campaign hub as a
 * "Strategic Territory Perk", beside rules the pipeline derives, with nothing
 * to tell a player which was which. The four the API creates for a new cloud
 * campaign did the same.
 *
 * These theatres are the app's own map of the setting, so no published rule
 * attaches anything to holding one. The ones the game DOES publish are the
 * Carcass Front Special Zone Outpost Bonuses, which are derived from the
 * campaign map and asserted in `carcassFrontMap.test.ts`.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { DEFAULT_WORLD_THEATERS } from '../seed';

describe('the seeded world theatres', () => {
  it('are still all twelve, with their names and pins', () => {
    // The theatres themselves are presentation and are kept; it is only the
    // rules text hung off them that was invented.
    expect(DEFAULT_WORLD_THEATERS).toHaveLength(12);
    for (const t of DEFAULT_WORLD_THEATERS) {
      expect(t.name.length, t.id).toBeGreaterThan(0);
      expect(t.description.length, t.id).toBeGreaterThan(0);
    }
  });

  it('state no rule of their own', () => {
    for (const t of DEFAULT_WORLD_THEATERS) expect(t.perk, t.name).toBe('');
  });

  /*
    And a new cloud campaign starts with no territories at all.

    This used to assert that the four the `create` action built carried no
    perk, which was the narrower half of the fix: blanking the perks left four
    territories nobody chose on every campaign made through the API, and
    whichever framework the campaign turned out to be — twelve world theatres
    or 32 published Carcass Front zones — those four were not its map.

    Read as source rather than imported: the route pulls in Prisma and
    NextAuth, and this asserts the absence of one constant in it.
  */
  it('and a new cloud campaign is created with no territories', () => {
    const src = fs.readFileSync('src/app/api/campaigns/route.ts', 'utf8');
    expect(src).not.toContain('const STARTING_TERRITORIES');

    // The `create` action's `data`, up to the `include` that closes it.
    const create = src.slice(src.indexOf("if (body.action === 'create')"));
    const data = create.slice(0, create.indexOf('include: FULL'));
    expect(data).not.toContain('territories');
  });
});
