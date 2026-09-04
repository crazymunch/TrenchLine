/**
 * The front door.
 *
 * `/` used to redirect straight into the roster, so a visitor's first screen
 * was a warband builder with no warband in it and nothing anywhere said what
 * TrenchLine is or what else it does. The five sections were reachable only
 * from a nav bar you had to already understand.
 */
import { test, expect } from '@playwright/test';
import { expectNoHorizontalScroll } from './helpers';

test.describe('the landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'TrenchLine', level: 1 })).toBeVisible();
  });

  test('says what the app is, and links into every section', async ({ page }) => {
    await expect(page.getByText(/derived from the published catalogues/i)).toBeVisible();

    // Every destination the nav offers, reachable before you understand the nav.
    for (const [name, href] of [
      ['Warband Roster', '/roster'],
      ['Tabletop Combat', '/play'],
      ['Crusade Campaign', '/campaign'],
      ['Roster Directory', '/directory'],
      ['Rules Codex', '/codex'],
    ] as const) {
      await expect(page.getByRole('link', { name: new RegExp(name) })).toHaveAttribute('href', href);
    }
  });

  test('invites a signed-out visitor to sign in, without demanding it', async ({ page }) => {
    /*
      Both halves matter. The app works fully offline in one browser with no
      account, so a landing page that reads as a signup wall would be lying
      about its own product.
    */
    await expect(page.getByRole('heading', { name: /Sign in to keep your warbands/i })).toBeVisible();
    await expect(page.getByText(/You do not need an account to build a warband/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /^Sign in$/ })).toBeVisible();
  });

  test('gets you into the app', async ({ page }) => {
    // `exact`: the Warband Roster card's own blurb opens "Build a warband"
    // too, which is the right words in both places and two links to one test.
    await page.getByRole('link', { name: 'Build a warband', exact: true }).click();
    await expect(page).toHaveURL(/\/roster/);
  });

  test('meets the mobile floor', async ({ page }) => {
    await expectNoHorizontalScroll(page);

    // Every link on the page is a real touch target on a phone.
    if (test.info().project.name !== 'phone') return;
    const links = page.getByRole('link');
    const n = await links.count();
    expect(n, 'the landing page has no links').toBeGreaterThan(0);
    for (let i = 0; i < n; i += 1) {
      const box = await links.nth(i).boundingBox();
      if (!box) continue;
      expect(box.height, `link ${i} ("${(await links.nth(i).innerText()).slice(0, 30)}") is under 44px`)
        .toBeGreaterThanOrEqual(44);
    }
  });
});
