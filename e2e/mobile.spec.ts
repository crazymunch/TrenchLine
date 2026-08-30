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
const VIEWS = ['Roster', 'Play', 'Crusade', 'Players', 'Codex'] as const;

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
  /*
    Raising these to 12px in 3.4 clipped "Campaign" to "Campaig…", which is
    worse than the 10px label it replaced.

    Slack is measured **span against its button**, not the span against itself.
    The label is a shrink-to-fit flex child, so its own `clientWidth` equals its
    `scrollWidth` whenever the text fits — comparing the two can only ever
    return 0 or a negative, which is how the first version of this reported
    "0px of room" for every label, "Play" included. The button's content box is
    the room the label actually has.

    4px of it, not merely "did not clip": whether a label clips depends on the
    platform font, and "Directory" proved it — it fitted exactly in the sandbox
    and clipped on CI's runner. A label that only just fits is one that clips on
    somebody's phone.

    This narrows the risk; it cannot eliminate it, since a font wider than any
    tested still exists. Keep nav labels to about seven characters.
  */
  const tight = await page.evaluate(() =>
    [...document.querySelectorAll('nav.fixed button')]
      .flatMap((button) => {
        // The *labelled* span, not the first one: the Play tab's first span is
        // its LIVE badge, which has no text — taking `querySelector('span')`
        // silently skipped the only item with a badge, so the one nav item with
        // an extra element in it was the one going unchecked.
        const label = [...button.querySelectorAll('span')]
          .find((s) => s.textContent?.trim());
        if (!label) return [];
        const style = getComputedStyle(button);
        const room = button.clientWidth
          - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        return [{ text: label.textContent, slack: Math.round(room - label.scrollWidth) }];
      })
      .filter((l) => l.slack < 4)
      .map((l) => `${l.text} (${l.slack}px of room)`));
  expect(tight, 'a bottom-nav label has no room to spare').toEqual([]);
});
