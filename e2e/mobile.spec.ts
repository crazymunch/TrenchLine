import { test, expect } from '@playwright/test';
import {
  goTo, openApp,
  expectNoHorizontalScroll, expectTouchTargets, expectReadableText, expectNoZoomingInputs,
} from './helpers';

/**
 * The definition of done, on every view and every one of the three formats.
 *
 * These assertions are the whole of docs/MOBILE.md §3, §4 and §6, and each one
 * exists because the app failed it: 153 controls under 44px, 106 strings under
 * 12px, 12 form controls that made iOS zoom and never zoom back, and a desktop
 * header that scrolled four views sideways.
 *
 * They are asserted **per view** rather than once on the landing page, because
 * that is exactly how the header overflow survived a measurement pass: it was
 * only wrong on views whose title was long.
 *
 * The touch floors run on the phone and the tablet and not on the desktop —
 * not as an oversight but because the CSS that guarantees them stops at
 * 1024px on purpose (globals.css §3.4): a mouse does not need 44px, and
 * forcing it there would only make neighbouring controls fight for clicks.
 * What every format shares is the sideways-scroll rule and a clean console.
 */
const VIEWS = ['Roster', 'Play', 'Crusade', 'Players', 'Codex'] as const;

for (const view of VIEWS) {
  test(`${view} meets the definition of done`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    // The rule catalogs are fetched and the roster index redirects to the
    // active warband, so the view is not finished rendering when the document
    // is. `openApp` waits for both.
    await openApp(page);
    await goTo(page, view);

    await expectNoHorizontalScroll(page);
    if (testInfo.project.name !== 'desktop') {
      await expectTouchTargets(page);
      await expectNoZoomingInputs(page);
    }
    expect(errors, 'page errors').toEqual([]);
  });
}

test('no view renders text below 12px on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'the desktop type scale is deliberately denser');
  await openApp(page);
  for (const view of VIEWS) {
    await goTo(page, view);
    await expectReadableText(page);
  }
});

test('the bottom nav labels are not clipped', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'the bottom nav is phone-only');
  await openApp(page);
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

/**
 * Nothing a player has to READ or TAP scrolls sideways.
 *
 * The rule, asked for directly: horizontal scrolling is not an acceptable way
 * to carry controls on a phone. A row of buttons that runs off the edge hides
 * its own contents — the warband toolbar had nine and showed five, and the
 * only thing advertising the rest was a cut-off button, which reads as a
 * layout bug about as often as it reads as an affordance.
 *
 * Tables are the exception and keep their own scroller. A statline grid cannot
 * wrap without becoming unreadable, and `overflow-x: hidden` on the page is
 * never the fix (docs/MOBILE.md).
 */
test('no row of controls scrolls sideways', async ({ page }) => {
  /*
    Not a phone rule, though that is where it was reported.

    The same builder toolbar scrolled sideways at 1440 too — nine buttons on
    one line is wider than a sidebar at any viewport — and a scroller on a
    desktop is worse, not better: there is no swipe, so the contents past the
    edge are reached by dragging a 4px bar, or not at all.
  */
  for (const path of ['/roster', '/play', '/campaign', '/codex', '/directory']) {
    await openApp(page, path);
    await page.waitForTimeout(600);

    const offenders = await page.evaluate(() => {
      const bad: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>('*')) {
        if (el.scrollWidth <= el.clientWidth + 1) continue;

        /*
          Actually SCROLLABLE, not merely overflowing.

          `.tap` gives a small control its 44px target as an invisible absolute
          overlay rather than as height (globals.css), and that overlay bleeds
          past the row it sits in — so the warband card's action row reports
          `scrollWidth > clientWidth` while painting nothing outside itself and
          scrolling nowhere. Flagging that would have this test demanding a fix
          for something no player can see, and the usual fix reached for is
          `overflow-x: hidden`, which docs/MOBILE.md forbids for good reason.

          What the rule is about is a row the user has to DRAG, and a row can
          only be dragged if its own `overflow-x` says so.
        */
        const overflowX = getComputedStyle(el).overflowX;
        if (overflowX !== 'auto' && overflowX !== 'scroll') continue;

        // A table (or a `pre`) inside is the sanctioned reason to scroll.
        if (el.querySelector('table, pre, thead')) continue;
        // Only rows that carry controls; prose and images are not the rule.
        const controls = el.querySelectorAll('button, a, select, [role="tab"]').length;
        if (controls < 2) continue;
        bad.push(`${el.tagName.toLowerCase()}.${el.className}`.slice(0, 120));
      }
      return bad;
    });

    expect(offenders, `${path} has a control row that scrolls sideways`).toEqual([]);
  }
});

/**
 * The bottom bar carries five destinations, at a size a thumb can find.
 *
 * It used to carry the theme switcher, the bug reporter and the admin ruleset
 * differ too — seven or eight items in 375px, with every label one font metric
 * from clipping, and two that had already clipped in CI while passing locally.
 * Those three are settings rather than places and moved to the account menu.
 */
test('the bottom bar is five destinations, none of them clipped', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'the bottom bar is phone-only');

  await openApp(page, '/roster');
  const nav = page.locator('nav.fixed.bottom-0');
  await expect(nav).toBeVisible();

  const items = nav.locator('button');
  await expect(items).toHaveCount(5);

  for (const label of ['Roster', 'Play', 'Crusade', 'Players', 'Codex']) {
    await expect(nav.getByText(label, { exact: true }), `${label} is missing`).toBeVisible();
  }

  /* Not clipped: a label whose text is wider than its box is showing an
     ellipsis, which is what "Campaig…" looked like before. */
  const clipped = await nav.evaluate((el) =>
    [...el.querySelectorAll('span')]
      .filter((s) => s.scrollWidth > s.clientWidth + 1)
      .map((s) => s.textContent ?? ''));
  expect(clipped, 'a destination label is clipped').toEqual([]);

  /* And bigger than it was: 52px of bar, 14px labels. Asserted as floors so
     the numbers can grow without the test becoming a nuisance. */
  const box = await items.first().boundingBox();
  expect(box!.height, 'the bar shrank below its 52px target').toBeGreaterThanOrEqual(52);

  const size = await nav.locator('span').first().evaluate((s) =>
    parseFloat(getComputedStyle(s).fontSize));
  expect(size, 'the labels shrank below 14px').toBeGreaterThanOrEqual(14);
});

/**
 * And what the bar gave up is reachable, not gone.
 *
 * The theme switcher, the bug reporter and the ruleset selector moved into the
 * account menu. That menu opens signed OUT as well: none of the three is an
 * account feature, and local-only play is supported everywhere else in the app.
 */
test('the account menu carries the settings the bar gave up', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'this is the phone layout');

  await openApp(page, '/roster');
  await page.getByRole('button', { name: /login/i }).first().click();

  const menu = page.locator('[role="menu"]');
  await expect(menu).toBeVisible();
  await expect(menu.getByText(/Theme —/)).toBeVisible();
  await expect(menu.getByText('Report a bug')).toBeVisible();
  await expect(menu.getByLabel('Active Ruleset Version')).toBeVisible();

  /* 16px on the select, or iOS zooms the whole page when it takes focus. */
  const fontSize = await menu.getByLabel('Active Ruleset Version')
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(fontSize, 'the ruleset select will make iOS zoom').toBeGreaterThanOrEqual(16);
});
