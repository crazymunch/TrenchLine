import { test, expect } from '@playwright/test';
import { goTo, openApp } from './helpers';

/**
 * The live match mirror, in the lobby (LIVE-1).
 *
 * What stood here was a roadmap — a Match PIN, a QR code, alliance timers, a
 * host dealing card decks — written in the present tense under an "In
 * Development" badge, with none of it built. A player reads that as an offer.
 *
 * These assert the two things that replaced it: the panel is real, and where
 * the feature genuinely cannot run it says so rather than offering a button
 * that would fail.
 */
test.beforeEach(async ({ page }) => {
  await openApp(page);
  await goTo(page, 'Play');
});

test('the live mirror replaces the roadmap', async ({ page }) => {
  await page.getByRole('button', { name: /Live Match Mirror/i }).click();

  await expect(page.getByRole('heading', { name: /Live match mirror/i })).toBeVisible();

  /*
    The whole point of the change. "Coming Soon" was a badge on a mode button
    that opened a description of software nobody had written; if it returns,
    something has been un-built or the placeholder has crept back.
  */
  await expect(page.getByText(/coming soon/i)).toHaveCount(0);
  await expect(page.getByText(/in development/i)).toHaveCount(0);
});

test('it says why it cannot run rather than offering a broken button', async ({ page }) => {
  /*
    A campaign that has never been published has no cloud identity, so there is
    nobody to mirror to. The honest answer names the fix — publish it from the
    campaign hub — rather than showing a disabled control with no explanation.
  */
  await page.getByRole('button', { name: /Live Match Mirror/i }).click();

  await expect(page.getByText(/only on this device/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Start sharing/i })).toHaveCount(0);
});

test('the lobby still fits its width', async ({ page }) => {
  await page.getByRole('button', { name: /Live Match Mirror/i }).click();
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'the mirror panel pushes the page sideways').toBeLessThanOrEqual(0);
});
