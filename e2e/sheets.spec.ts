import { test, expect, type Page } from '@playwright/test';
import { goTo, openApp } from './helpers';

/**
 * What every overlay owes the user (docs/MOBILE.md §7).
 *
 * Before Phase 3.2 there was **one** Escape handler, **one** body scroll lock
 * and **one** focus trap across thirty modals — all three inside `Sheet`
 * itself. These assert the guarantees on the sheets a player actually opens,
 * rather than trusting that every one was migrated.
 */
async function assertSheet(page: Page, open: () => Promise<void>) {
  await open();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');

  // The page behind must not scroll under your finger.
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
    .toBe('hidden');

  // dvh, not vh: `90vh` resolves against iOS's *large* viewport and puts the
  // footer under the collapsing toolbar, which is how a Confirm button becomes
  // unreachable.
  const fits = await dialog.evaluate((el) =>
    el.getBoundingClientRect().bottom <= window.innerHeight + 1);
  expect(fits, 'the sheet extends past the bottom of the viewport').toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  // Restored to what it was, not blanked — two stacked sheets must not leave
  // the page unlocked when the inner one closes.
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
    .not.toBe('hidden');
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('the recruit sheet', async ({ page }) => {
  await assertSheet(page, async () => {
    await page.getByRole('button', { name: /recruit warrior/i }).first().click();
  });
});

/**
 * Open the account menu in the top bar.
 *
 * On a phone the theme switcher and the bug reporter are behind it. They used
 * to be buttons in the bottom bar, next to the five destinations; seven items
 * in a 375px bar is why every label sat one font-metric away from clipping,
 * so the settings moved up here and the bar's targets grew.
 *
 * The menu opens signed out as well — nothing here needs an account — which is
 * what makes it reachable from these tests at all.
 */
async function openAccountMenu(page: Page) {
  // Unscoped and unqualified: since UI-9 removed the sidebar's own Login there
  // is exactly one on the page, and `mobile.spec.ts` asserts that count.
  await page.getByRole('button', { name: /^Login$/i }).click();
  await expect(page.getByRole('menu')).toBeVisible();
}

test('the theme switcher', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'the trigger is in the phone account menu');
  await assertSheet(page, async () => {
    await openAccountMenu(page);
    await page.getByRole('menuitem', { name: /^Theme —/ }).click();
  });
});

test('the bug reporter', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'the trigger is in the phone account menu');
  await assertSheet(page, async () => {
    await openAccountMenu(page);
    await page.getByRole('menuitem', { name: 'Report a bug' }).click();
  });
});

test('the rules lookup in Play Mode', async ({ page }) => {
  // The lookup lives in the combat HUD, not the lobby — a player reaches for it
  // mid-game, which is the whole reason it is in the sticky strip.
  await goTo(page, 'Play');
  await page.getByRole('button', { name: /Select Squad/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Confirm Squad/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /ENTER TABLETOP COMBAT/ }).click();
  await page.waitForTimeout(1500);

  await assertSheet(page, async () => {
    // By its visible label: a button with text has that text as its accessible
    // name, and the `title` never reaches the accessibility tree.
    await page.getByRole('button', { name: 'Rules', exact: true }).first().click();
  });
});
