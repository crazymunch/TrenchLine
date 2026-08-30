import { test, expect } from '@playwright/test';
import { goTo } from './helpers';

/**
 * Play Mode on a phone (Phase 3.6).
 *
 * The combat screen is about 6,300px tall with nine models deployed — nine and
 * a half phone screens — and the turn controls lived at the top of it. This
 * asserts they stay reachable, which is the whole of the fix.
 */
test('the turn controls stay reachable through the whole match', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'the combat strip is phone-only');

  await page.goto('/');
  await page.waitForTimeout(2500);
  await goTo(page, 'Play');

  await page.getByRole('button', { name: /Select Squad/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Confirm Squad/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /ENTER TABLETOP COMBAT/ }).click();
  await page.waitForTimeout(1500);

  const strip = page.locator('div.sticky.top-14').first();
  await expect(strip).toBeVisible();

  // A sticky bar that owns half the screen is not a fix for a scrolling
  // problem: the first attempt at this was 323px of a 667px viewport.
  const height = await strip.evaluate((el) => el.getBoundingClientRect().height);
  expect(height).toBeLessThan(80);

  const reachable = async () => strip.evaluate((el) =>
    [...el.querySelectorAll('button')].every((b) => {
      const r = b.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight && r.height >= 30;
    }));

  expect(await reachable()).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.waitForTimeout(400);
  expect(await reachable(), 'the turn controls scrolled away mid-match').toBe(true);
});
