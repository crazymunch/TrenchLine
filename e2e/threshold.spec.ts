import { test, expect } from '@playwright/test';
import { seedWarband } from './helpers';

/**
 * The Threshold caps the Force, and the builder measures it.
 *
 * RR-11 / FD-05b. `ducatLimit` is the FOUNDING allowance and never changes.
 * The Threshold Value does — it rises after every game (p.97) — and
 * `forceLimits` had resolved it a hundred lines above the place the builder
 * measured, for two years, to print a badge. The bar, the warning and the
 * over-budget flag all read `ducatLimit`, so a Warband three games into a
 * campaign was told it was over a limit it had long since outgrown, and never
 * told about the one it was actually under.
 *
 * `checkForceLimits` was written with both warnings in the book's own words,
 * and had no caller anywhere in the app.
 *
 * This is driven through the builder because that is where the two numbers
 * diverge: a unit test that calls `checkForceLimits` directly passed before
 * this change and after it.
 */

/** 780 Ducats over four models — 80 over the game-1 Threshold of 700. */
const model = (id: string, name: string, totalCost: number) => ({
  id,
  customName: name,
  baseProfileId: 'p1',
  profileSnapshot: {
    id: 'p1', name: 'Trench Pilgrim', factionId: 'new-antioch',
    category: 'Trooper', elite: false, baseCost: totalCost,
    stats: { movement: '6"/Infantry', movementInches: 6, ranged: '+0 DICE', melee: '+1 DICE', armour: '0', base: '30mm' },
  },
  equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
  xp: 0, advancements: [], skills: [], injuries: [], deeds: [],
  isDead: false, totalCost,
  currentWounds: 0, maxWounds: 1, bloodMarkers: 0,
  status: 'Active', hasActedThisTurn: false,
});

const WARBAND = {
  id: 'wb-threshold',
  name: 'The Overstrength',
  factionId: 'new-antioch',
  ducatLimit: 700,
  treasuryDucats: 0,
  gloryPoints: 0,
  armoryStash: [],
  snapshots: [],
  chronicleLog: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  units: [
    model('u-lead', 'Anselm', 300),
    model('u-2', 'Mercy', 240),
    model('u-3', 'Constance', 140),
    model('u-bench', 'Ninefold', 100),
  ],
};

const openBuilder = async (page: import('@playwright/test').Page) => {
  await seedWarband(page, WARBAND);
  await page.goto('/roster');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(800);
};

test('the builder warns against the Threshold, in the book’s words', async ({ page }) => {
  await openBuilder(page);

  /*
    780 Ducats against a game-1 Threshold Value of 700. The number is the
    same as the founding allowance before the first game, which is exactly
    why the old measure looked right — and why the WORDING is what tells the
    two apart. The old message said the roster exceeded a point limit; the
    book says Ducats' worth must sit the game out.
  */
  const warning = page.getByText(/Threshold Value of 700/);
  await expect(warning).toBeVisible();
  await expect(warning).toContainText('780');
  await expect(warning).toContainText(/must sit this game out/i);

  // And not the old sentence, which told the player to shrink what they own.
  await expect(page.getByText(/exceeds the 700 Ducat point limit/)).toHaveCount(0);
});

test('benching a model takes it out of the Force, and clears the warning', async ({ page }) => {
  await openBuilder(page);
  await expect(page.getByText(/Threshold Value of 700/)).toBeVisible();

  /*
    The player's move is to bench somebody, not to delete them: "any models
    you do not use will have to sit the game out". 780 − 100 = 680, under the
    Threshold.
  */
  await page.getByRole('button', { name: 'Actions for Ninefold' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Sit this game out/i }).click();
  await page.waitForTimeout(500);

  await expect(page.getByText(/Threshold Value of 700/)).toHaveCount(0);

  // The model is still on the Roster — that is the whole distinction.
  await expect(page.getByText('Ninefold')).toBeVisible();
  await expect(page.getByText(/Sits out/i).first()).toBeVisible();
});

test('the budget bar reads the Force, not the founding allowance', async ({ page }) => {
  await openBuilder(page);

  // 780 of 700 before benching…
  await expect(page.getByText('780 / 700 D').first()).toBeVisible();

  await page.getByRole('button', { name: 'Actions for Ninefold' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Sit this game out/i }).click();
  await page.waitForTimeout(500);

  // …680 after, because the benched model is not in the Force.
  await expect(page.getByText('680 / 700 D').first()).toBeVisible();
});
