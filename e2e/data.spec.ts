import { test, expect } from '@playwright/test';
import { goTo, openApp } from './helpers';

/**
 * The data the app shows is the data the sources carry.
 *
 * Unit tests already assert the generated dataset. These assert that it is what
 * reaches the *screen* — which is the gap that let the Codex display invented
 * Glorious Deeds and the builder recruit from 97%-wrong statlines for as long
 * as it did. Every string here was wrong in the app before it was derived.
 */
test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('the recruit list comes from the catalogues', async ({ page }) => {
  await page.getByRole('button', { name: /recruit warrior/i }).first().click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  // Empty-until-loaded is the honest state, but it must not still be empty.
  await expect(dialog.getByText(/Loading the roster/)).toHaveCount(0);
  await expect(dialog.getByText(/could not be loaded/)).toHaveCount(0);

  // Count the rows themselves rather than a price string: an entry priced in
  // Glory carries no Ducat figure at all, which is the point of the next test.
  const rows = dialog.locator('[data-recruit-row]');
  expect(await rows.count(), 'no recruitable profiles are listed').toBeGreaterThan(5);

  // And they are real catalogue entries, named from the catalogues.
  await expect(rows.first()).toBeVisible();
  expect(await rows.first().getAttribute('data-recruit-row')).toBeTruthy();
});

test('a Glory-priced entry is not shown as free', async ({ page }) => {
  // The roster format has one cost field, so a Mercenary at 0 Ducats and 5
  // Glory rendered as "0 D" — free, and hireable without limit.
  await page.getByRole('button', { name: /recruit warrior/i }).first().click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/\bGLORY\b/i).first()).toBeVisible();
});

test('the Codex shows the published scenario, not the invented one', async ({ page }) => {
  await goTo(page, 'Codex');
  await page.getByRole('button', { name: /Scenarios \(/ }).click();
  await page.waitForTimeout(800);

  const body = page.locator('main');
  // The hand-written set said five or six Turns for all twelve. The book says
  // four for Claim No Man's Land.
  await expect(body).toContainText('This scenario lasts four Turns.');
  // And its Infiltrator rule was inverted.
  await expect(body).toContainText('Infiltrators must deploy normally');
  // 32 of its 46 Glorious Deeds appear nowhere in the rulebook.
  await expect(body).toContainText('Bloodletting');
  await expect(body).not.toContainText('Iron Resolve');
});

test('every scenario map resolves', async ({ page }) => {
  // All twelve pointed at /maps/scenario_N.webp, and not one of those files
  // exists — twelve broken images nothing ever reported.
  await goTo(page, 'Codex');
  await page.getByRole('button', { name: /Scenarios \(/ }).click();
  await page.waitForTimeout(1200);
  const broken = await page.evaluate(() =>
    [...document.querySelectorAll('img')]
      .filter((i) => i.offsetParent && !i.naturalWidth)
      .map((i) => i.getAttribute('src')));
  expect(broken).toEqual([]);
});

test('the arsenal prices per faction rather than once', async ({ page }) => {
  await goTo(page, 'Codex');
  await page.getByRole('button', { name: /Weapons Codex/ }).click();
  await page.waitForTimeout(800);
  // The hand-written records carried one cost and `faction: 'universal'`,
  // which is not a category the game has. What exists is six Armoury Tables.
  await expect(page.locator('main').getByText(/\d+ armouries/).first()).toBeVisible();
});

test('the keyword glossary is the book\'s, not the invented one', async ({ page }) => {
  await goTo(page, 'Codex');
  await page.getByRole('button', { name: /Keywords \(/ }).click();
  await page.waitForTimeout(800);
  const body = page.locator('main');
  // Thirty of the book's keywords were missing; two of the 46 that were there
  // appear nowhere in the rulebook.
  await expect(body).toContainText('ARMOUR PIERCING');
  await expect(body).not.toContainText('HEAVY COVER');
});
