import { test, expect } from '@playwright/test';
import { openApp, expectTouchTargets } from './helpers';

/**
 * Equipping a model, which used to be one-way traffic.
 *
 * "+ EQUIP" added one and nothing in the sheet removed one, so adjusting a
 * count meant leaving for the model's card and coming back. And what a model
 * could take was decided by regexes over names — `/titan|cannon|autocannon/`
 * against `/brazen|golem|mamluk|mechanized/` — which hid the Titan Zulfiqar
 * from a Homunculus the catalogue explicitly reveals it to.
 */
const openEquip = async (page: import('@playwright/test').Page) => {
  await openApp(page, '/roster');
  const dialog = page.locator('[role="dialog"]');
  await page.getByRole('button', { name: /recruit warrior/i }).first().click();
  await expect(dialog).toBeVisible();
  await dialog
    .locator('[data-recruit-row] button[aria-label^="Recruit "]:not([aria-label*="another"])')
    .first().click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^\+?\s*equip$/i }).first().click();
  await expect(dialog).toBeVisible();
  return dialog;
};

test('equipping one shows a stepper, not another Equip button', async ({ page }) => {
  const dialog = await openEquip(page);
  await dialog.getByRole('button', { name: /^equip$/i }).first().click();

  // The row it was added to now offers a way back down.
  await expect(dialog.getByRole('button', { name: /remove one/i }).first()).toBeVisible();
});

test('the sheet says why an item is refused rather than hiding it', async ({ page }) => {
  const dialog = await openEquip(page);
  await dialog.getByRole('button', { name: /^equip$/i }).first().click();

  /*
    A 2-Handed weapon fills both hands, so the rest of that section becomes
    unavailable — and says so, on the row, instead of vanishing. A player
    looking for a weapon that is not in the list cannot tell a rule from a
    lost entry, which is how the Titan Zulfiqar bug survived.
  */
  const refused = dialog.getByRole('button', { name: /not allowed/i });
  await expect(refused.first()).toBeVisible();
  await expect(refused.first()).toBeDisabled();
});

test('the equip sheet meets the mobile floor', async ({ page }, testInfo) => {
  // Desktop is exempt, as it is in mobile.spec: a mouse does not need 44px.
  test.skip(testInfo.project.name === 'desktop');

  const dialog = await openEquip(page);
  await dialog.getByRole('button', { name: /^equip$/i }).first().click();

  /*
    The WHOLE sheet, not just the stepper.

    This was scoped down while the sub-category chips were under the floor —
    "All" measured 40 wide against a 44px minimum, because `px-2.5` on a short
    word is only 40px across. That is fixed, so the assertion goes back to
    covering everything a finger has to hit.
  */
  await expect(dialog.getByRole('button', { name: /remove one/i }).first()).toBeVisible();
  await expectTouchTargets(page);
});
