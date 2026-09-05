import { test, expect } from '@playwright/test';
import { openApp } from './helpers';

/**
 * The four roles look like four things, on the built stylesheet.
 *
 * `src/components/ui/__tests__/unitRole.test.ts` asserts the class strings are
 * distinct and are theme tokens. It cannot assert the one thing that actually
 * goes wrong: a class Tailwind never compiled. `bg-role-elite/15` produces no
 * rule if the token is missing from the config, and the element then has no
 * background at all — which looks like a design decision rather than a bug.
 * That is the `MobileNav` failure (docs/MOBILE.md §5) in a new place.
 *
 * So this reads the colours off a real card in a production build. Driven
 * through the card's own role menu rather than by seeding four warbands: it is
 * the same control a player uses, and it proves the menu writes the category
 * as well as that the header reads it.
 */
const ROLES = ['Leader', 'Elite', 'Trooper', 'Mercenary'] as const;

test('each role paints the card header differently', async ({ page }) => {
  await openApp(page, '/roster');

  // One model, whatever the first row offers.
  await page.getByRole('button', { name: /recruit warrior/i }).first().click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await dialog
    .locator('[data-recruit-row] button[aria-label^="Recruit "]:not([aria-label*="another"])')
    .first().click();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  const painted: Record<string, string> = {};

  for (const role of ROLES) {
    // The role button carries the current category as its text.
    const badge = page.getByRole('button', { name: new RegExp(`^(${ROLES.join('|')})$`) }).first();
    await badge.click();
    await page.getByRole('button', { name: role, exact: true }).last().click();

    const header = page.locator(`[data-role="${role}"]`).first();
    await expect(header).toBeVisible();

    painted[role] = await header.evaluate((el) => {
      const s = getComputedStyle(el);
      return `${s.backgroundColor}|${s.borderLeftColor}|${s.borderLeftWidth}`;
    });
  }

  /*
    Four distinct paints. Not four SPECIFIC ones: the Leader's is the faction's
    colour and moves with the theme, and pinning a literal rgb() here would
    make this a test of the Iron Sanctum palette rather than of the language.
  */
  const distinct = new Set(Object.values(painted));
  expect(distinct.size, `roles share a paint: ${JSON.stringify(painted, null, 1)}`).toBe(4);

  // And none of them is transparent, which is what an uncompiled class gives.
  for (const [role, paint] of Object.entries(painted)) {
    expect(paint, `${role} has no background — the class did not compile`)
      .not.toMatch(/^rgba\(0, 0, 0, 0\)/);
  }
});
