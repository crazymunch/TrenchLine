import { test, expect } from '@playwright/test';
import { openApp } from './helpers';

/**
 * Mustering a Warband.
 *
 * The Variant is the thing this covers. It decides what the Warband may
 * recruit, and until now it could only be set from the roster screen — after
 * the first models were already on it, recruited against a list that was not
 * the one in force. That is the same defect the variant work was meant to fix,
 * one step earlier.
 */

const openMuster = async (page: import('@playwright/test').Page) => {
  await openApp(page, '/roster');
  await page.getByRole('button', { name: /new warband/i }).first().click();
  await expect(page.getByText('MUSTER NEW WARBAND')).toBeVisible();
  // The labels are `htmlFor`-bound, so getByLabel is the real association a
  // screen reader follows rather than a proximity guess.
  await expect(page.getByLabel(/warband title/i)).toBeVisible();
};

test('the Variant is chosen at muster, from the ruleset', async ({ page }) => {
  await openMuster(page);

  const variant = page.getByLabel(/warband variant/i);
  await expect(variant, 'no Variant control on the muster screen').toBeVisible();

  // The list is the ruleset's, not a hand-written one: New Antioch's variants
  // come from the catalogues, and "Standard list" is a real choice beside them.
  const options = await variant.locator('option').allInnerTexts();
  expect(options[0]).toMatch(/Standard list/);
  expect(options.length, 'the faction has no variants listed').toBeGreaterThan(1);
});

test('an unrestricted Warband sets both currencies, a campaign one neither', async ({ page }) => {
  await openMuster(page);

  // Campaign is the default and its allowance is published — offering to edit
  // it is how the app ended up with a hand-set limit in the first place.
  await expect(page.getByLabel(/starting ducats/i)).toHaveCount(0);
  await expect(page.getByLabel(/starting glory/i)).toHaveCount(0);

  await page.getByRole('button', { name: /Unrestricted/ }).click();

  await expect(page.getByLabel(/starting ducats/i)).toBeVisible();
  /*
    Trench Crusade has two currencies and this screen offered one, so an
    unrestricted list could not include anything the catalogues price in Glory
    — a Witch Coven Matriarch is 0 Ducats and 5 Glory.
  */
  await expect(page.getByLabel(/starting glory/i)).toBeVisible();
});
