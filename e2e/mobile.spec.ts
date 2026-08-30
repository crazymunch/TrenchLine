import { test, expect } from '@playwright/test';
import {
  goTo, expectNoHorizontalScroll, expectTouchTargets, expectReadableText, expectNoZoomingInputs,
} from './helpers';

/**
 * The mobile definition of done, on every view.
 *
 * These four assertions are the whole of docs/MOBILE.md §3, §4 and §6, and each
 * one exists because the app failed it: 153 controls under 44px, 106 strings
 * under 12px, 12 form controls that made iOS zoom and never zoom back, and a
 * desktop header that scrolled four views sideways.
 *
 * They are asserted **per view** rather than once on the landing page, because
 * that is exactly how the header overflow survived a measurement pass: it was
 * only wrong on views whose title was long.
 */
const VIEWS = ['Roster', 'Play', 'Crusade', 'Directory', 'Codex'] as const;

for (const view of VIEWS) {
  test(`${view} meets the mobile definition of done`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('/');
    // The rule catalogs are fetched, so the view is not finished rendering
    // when the document is.
    await page.waitForTimeout(2500);
    await goTo(page, view);

    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);
    await expectNoZoomingInputs(page);
    expect(errors, 'page errors').toEqual([]);
  });
}

test('no view renders text below 12px on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'the desktop type scale is deliberately denser');
  await page.goto('/');
  await page.waitForTimeout(2500);
  for (const view of VIEWS) {
    await goTo(page, view);
    await expectReadableText(page);
  }
});

test('the bottom nav labels are not clipped', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'the bottom nav is phone-only');
  await page.goto('/');
  await page.waitForTimeout(1500);
  // Raising these to 12px in 3.4 clipped "Campaign" to "Campaig…", which is
  // worse than the 10px label it replaced.
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll('nav.fixed button span')]
      .filter((s) => s.scrollWidth > s.clientWidth + 1)
      .map((s) => s.textContent));
  expect(clipped).toEqual([]);
});
