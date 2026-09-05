import { test, expect } from '@playwright/test';
import { goTo, openApp } from './helpers';

/**
 * Play Mode on a phone (Phase 3.6).
 *
 * The combat screen is about 6,300px tall with nine models deployed — nine and
 * a half phone screens — and the turn controls lived at the top of it. This
 * asserts they stay reachable, which is the whole of the fix.
 */
test('the turn controls stay reachable through the whole match', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'the combat strip is phone-only');

  await openApp(page);
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

/**
 * The All Out War card, betrayal and alliance console is offered for the pack
 * and for nothing else.
 *
 * The console is a 700-line engine — a 52-card deck, initiative draws, the
 * twelve-rank betrayal table, the alliance timer — and it is reachable only
 * through this gate. The gate used to guess which scenarios were All Out War
 * from four patterns over the name, the id, the tagline and `number > 12`; it
 * now asks `useScenarios()`, which labels every scenario with its book. This
 * asserts the gate opens for the three and stays shut for the rulebook's.
 */
test('the All Out War console is offered for the pack, and only for it', async ({ page }) => {
  await openApp(page);
  await goTo(page, 'Play');

  const picker = page.locator('select').filter({
    has: page.locator('option', { hasText: 'All Out War: The Looters' }),
  });
  await expect(picker, 'the scenario picker does not offer the All Out War pack').toHaveCount(1);

  const console_ = page.getByRole('button', { name: /Cards & Alliances|CARD & BETRAYAL ENGINE/i });

  await picker.selectOption('aow-the-looters');
  await expect(console_.first(), 'the console is not offered for an All Out War scenario')
    .toBeVisible();

  await picker.selectOption('claim-no-mans-land');
  await expect(console_, 'the console is offered for a rulebook scenario').toHaveCount(0);
});
