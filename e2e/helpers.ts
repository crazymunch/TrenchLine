import { expect, type Page } from '@playwright/test';

/** Go to a view through whichever nav the viewport shows. */
export async function goTo(page: Page, view: 'Roster' | 'Play' | 'Crusade' | 'Directory' | 'Codex') {
  const bottomNav = page.locator('nav.fixed');
  if (await bottomNav.isVisible()) {
    await bottomNav.getByRole('button', { name: view, exact: true }).click();
  } else {
    const sidebarLabel = {
      Roster: 'Warband Roster', Play: 'Tabletop Combat', Crusade: 'Crusade Campaign',
      Directory: 'Roster Directory', Codex: 'Rules Codex',
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

/** A form control below 16px makes iOS zoom in and never zoom back out. */
export async function expectNoZoomingInputs(page: Page) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('input,select,textarea')]
      .filter((el) => (el as HTMLElement).offsetParent)
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => `<${el.tagName.toLowerCase()}>`));
  expect(small, 'form controls under 16px').toEqual([]);
}
