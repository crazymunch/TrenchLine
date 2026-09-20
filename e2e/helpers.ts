import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Open the app and wait for it to stop moving.
 *
 * `/roster` redirects *client-side* to the active warband's own URL. A fixed `waitForTimeout` after `goto('/')` races that
 * second hop: the test clicks a button on a tree that is about to be replaced,
 * the handler goes with it, and the failure reads as "the sheet did not open"
 * rather than as the race it is. Waiting for the settled URL is the same wait,
 * expressed as the condition instead of a guess at how long it takes.
 */
/**
 * A warband for the tests to work on.
 *
 * The app used to ship one — a specific player's roster, seeded into every
 * empty browser — and the suite quietly relied on it. It does not ship one any
 * more, because a stranger opening the site was being shown someone else's
 * warband as their own. So the harness supplies its own instead, which is
 * where a fixture belonged all along: the tests now say what they need rather
 * than inheriting it from production data.
 *
 * Deliberately minimal. Models are recruited by the tests that need them, so
 * this is an empty Iron Sultanate roster with a budget and nothing else.
 */
export const TEST_WARBAND = {
  id: 'wb-e2e',
  name: 'E2E Test Warband',
  factionId: 'iron-sultanate',
  ducatLimit: 1000,
  treasuryDucats: 0,
  gloryPoints: 0,
  units: [],
  armoryStash: [],
  snapshots: [],
  chronicleLog: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

/** Put it in place before any app code runs. */
export async function seedWarband(page: Page, warband: unknown = TEST_WARBAND) {
  await page.addInitScript(([wb]) => {
    localStorage.setItem('tc_warbands_v1', JSON.stringify([wb]));
    localStorage.setItem('tc_active_warband_id', (wb as { id: string }).id);
  }, [warband]);
}

/*
  `/roster`, not `/`.

  `/` is the landing page now — what TrenchLine is, and a link into each
  section — so it no longer forwards into the app. These tests are about the
  app itself, and `/roster` is where they were always headed: it redirects
  client-side to the active warband's own URL, which is the second hop the
  wait below exists for. The landing page has its own spec.
*/
export async function openApp(page: Page, path = '/roster') {
  await seedWarband(page);
  await page.goto(path);
  // The dataset is fetched, not bundled, so the roster is empty until it lands.
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 });
  await page.waitForLoadState('networkidle');

  /*
    Then wait for the address to stop moving.

    Not `waitForURL`: the roster index redirects with `router.replace`, a
    same-document navigation that fires no `load` event, so waiting on one
    hangs for the full timeout. And not a fixed sleep either — that is the
    guess this replaces. Two consecutive unchanged reads is the condition.
  */
  let url = page.url();
  let steady = 0;
  for (let i = 0; i < 40 && steady < 2; i += 1) {
    await page.waitForTimeout(250);
    if (page.url() === url) { steady += 1; continue; }
    url = page.url();
    steady = 0;
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 });
  }
}

export type NavView = 'Roster' | 'Play' | 'Crusade' | 'Players' | 'Codex' | 'Chronicle';

/**
 * The views the phone bar does NOT carry, and the label each has in the sheet
 * behind its "More" button.
 *
 * The bar is a hard five at 375px — `MobileNav` records how much was shaved to
 * keep the labels whole — so a sixth destination cannot go in it. Listing them
 * here rather than in each test means a view moving into or out of the bar is
 * one edit, not a hunt through the specs for whichever ones happened to click
 * it directly.
 */
const BEHIND_MORE: Partial<Record<NavView, string>> = {
  Players: 'Roster Directory',
  Chronicle: 'Chronicle of Battles',
};

/** Go to a view through whichever nav the viewport shows. */
export async function goTo(page: Page, view: NavView) {
  const bottomNav = page.locator('nav.fixed');
  if (await bottomNav.isVisible()) {
    const behind = BEHIND_MORE[view];
    if (behind) {
      await bottomNav.getByRole('button', { name: 'More', exact: true }).click();
      // Scoped to the dialog, not the nav: the sheet is a sibling of the bar
      // (see `MobileNav` on why it cannot be a child), and a bare name lookup
      // would also see the bar underneath it.
      await page.getByRole('dialog').getByRole('button', { name: behind }).click();
    } else {
      await bottomNav.getByRole('button', { name: view, exact: true }).click();
    }
  } else {
    const sidebarLabel = {
      Roster: 'Warband Roster', Play: 'Tabletop Combat', Crusade: 'Crusade Campaign',
      Players: 'Roster Directory', Codex: 'Rules Codex',
      Chronicle: 'Chronicle of Battles',
    }[view];
    await page.getByRole('button', { name: new RegExp(sidebarLabel) }).first().click();
  }
  await page.waitForTimeout(600);
}

/** The page itself must never scroll sideways (docs/MOBILE.md §6). */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const de = document.documentElement;
    if (de.scrollWidth <= de.clientWidth) return null;
    const wide = [...document.querySelectorAll('*')]
      .filter((el) => el.getBoundingClientRect().right > de.clientWidth + 1)
      .filter((el) => ![...el.children].some((c) => c.getBoundingClientRect().right > de.clientWidth + 1))
      .map((el) => `<${el.tagName.toLowerCase()} class="${(el.className || '').toString().slice(0, 60)}">`);
    return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, wide: wide.slice(0, 3) };
  });
  expect(overflow, 'the page scrolls sideways').toBeNull();
}

/**
 * Every visible control is reachable by thumb.
 *
 * A `.tap` control carries an invisible 44px overlay rather than 44px of box
 * (docs/MOBILE.md §3), so the overlay is measured where there is one — checking
 * the visible rectangle alone would report a correctly-sized control as too
 * small.
 */
export async function expectTouchTargets(page: Page) {
  const small = await page.evaluate(() => {
    const bad: string[] = [];
    for (const el of document.querySelectorAll('button,a[href],select,input,textarea,[role="button"]')) {
      const host = el as HTMLElement;
      if (!host.offsetParent) continue;
      const r = host.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      /*
        A checkbox or radio is the one control whose own box is NOT its hit
        area. The browser makes its `<label>` toggle it, so the label is what a
        thumb aims at — and a 44px checkbox beside a model's name would be
        absurd, which is not what docs/MOBILE.md §3 asks for. Measured on the
        label where there is one, so this still fails a bare box with no label
        at all, which is the case that really is unreachable.

        `pointer-events: none` marks the other case: a box that is an INDICATOR
        inside a clickable row, not a control. Those are skipped entirely.
      */
      const kind = host.getAttribute('type');
      if (host.tagName === 'INPUT' && (kind === 'checkbox' || kind === 'radio')) {
        if (getComputedStyle(host).pointerEvents === 'none') continue;
        const id = host.getAttribute('id');
        const label = host.closest('label')
          ?? (id ? document.querySelector(`label[for="${id}"]`) : null);
        const lr = (label as HTMLElement | null)?.getBoundingClientRect();
        if (lr && lr.height >= 44 && lr.width >= 44) continue;
        bad.push(`${Math.round(lr?.height ?? r.height)}x${Math.round(lr?.width ?? r.width)} `
          + `<input type=${kind}>${label ? ' (its label)' : ' (no label)'}`);
        continue;
      }

      const after = getComputedStyle(host, '::after');
      const tap = after.content === '""' && parseFloat(after.minHeight) >= 44;
      const h = tap ? Math.max(r.height, parseFloat(after.minHeight)) : r.height;
      const w = tap ? Math.max(r.width, parseFloat(after.minWidth)) : r.width;
      if (h < 44 || w < 44) {
        bad.push(`${Math.round(h)}x${Math.round(w)} "${(host.textContent || '').trim().slice(0, 20)}"`);
      }
    }
    return bad;
  });
  expect(small, 'controls under 44px').toEqual([]);
}

/** Nothing renders below 12px on a phone (docs/MOBILE.md §4). */
export async function expectReadableText(page: Page) {
  const small = await page.evaluate(() => {
    const bad: string[] = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walk.nextNode())) {
      const text = n.textContent?.trim();
      if (!text) continue;
      const el = n.parentElement;
      if (!el || !el.offsetParent) continue;
      if (parseFloat(getComputedStyle(el).fontSize) < 12) bad.push(text.slice(0, 24));
    }
    return bad;
  });
  expect(small, 'text under 12px').toEqual([]);
}

/**
 * A form control below 16px makes iOS zoom in and never zoom back out.
 *
 * Checkbox and radio are excluded, and deliberately: the zoom is triggered by
 * focusing a field you can TYPE into, and neither of those is. Their font-size
 * styles the label text beside them, not the box, so flagging them asked for a
 * 16px change that would do nothing about the behaviour this guards.
 */
export async function expectNoZoomingInputs(page: Page) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('input,select,textarea')]
      .filter((el) => (el as HTMLElement).offsetParent)
      .filter((el) => !['checkbox', 'radio'].includes(el.getAttribute('type') ?? ''))
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => `<${el.tagName.toLowerCase()}>`));
  expect(small, 'form controls under 16px').toEqual([]);
}

/**
 * The control can actually be reached, not merely rendered.
 *
 * `toBeVisible()` means "in the DOM, displayed, and has a box". A button
 * clipped by an ancestor's `overflow: hidden` has all three and is still
 * unreachable — which is exactly how the muster dialog shipped a form a player
 * on a phone could fill in and not submit. The existing test for that button
 * asserted `toBeVisible()` and passed throughout.
 *
 * Reachable means one of two things, and nothing else:
 *
 *   it is already inside the viewport, or
 *   some ancestor is USER-scrollable — `overflow-y: auto|scroll` and actually
 *   overflowing — so a finger can bring it in.
 *
 * Deliberately not `scrollIntoViewIfNeeded()`: `overflow: hidden` still scrolls
 * programmatically, so that would report success on the very layout a person
 * is stuck in. The scroll-locked body is handled by the same rule for free —
 * its `overflow-y` is `hidden` while an overlay is open, so it cannot be the
 * ancestor that saves a clipped control.
 */
export async function expectReachable(locator: Locator, what: string) {
  const verdict = await locator.evaluate((el) => {
    const box = el.getBoundingClientRect();
    if (box.top >= 0 && box.bottom <= window.innerHeight
      && box.left >= 0 && box.right <= window.innerWidth) {
      return { ok: true, why: 'in the viewport' };
    }
    for (let n = el.parentElement; n; n = n.parentElement) {
      const overflowY = getComputedStyle(n).overflowY;
      if (/auto|scroll/.test(overflowY) && n.scrollHeight > n.clientHeight + 1) {
        return { ok: true, why: `scrollable <${n.tagName.toLowerCase()}>` };
      }
    }
    return {
      ok: false,
      why: `bottom at ${Math.round(box.bottom)}px of a ${window.innerHeight}px `
         + 'viewport, and no ancestor scrolls',
    };
  });
  expect(verdict.ok, `${what} cannot be reached: ${verdict.why}`).toBe(true);
}
