/**
 * The front door.
 *
 * `/` used to redirect straight into the roster, so a visitor's first screen
 * was a warband builder with no warband in it and nothing anywhere said what
 * TrenchLine is or what else it does. The five sections were reachable only
 * from a nav bar you had to already understand.
 */
import { test, expect, type Page } from '@playwright/test';
import { expectNoHorizontalScroll, seedWarband } from './helpers';

/**
 * Answer the session endpoint `useSession` calls, without a real login.
 *
 * NextAuth's client asks `/api/auth/session` once on mount; an object is a
 * session and `{}` is signed out. Faking the response rather than the cookie
 * keeps the test about what the page does with the answer — which is the whole
 * behaviour under test — instead of about JWT signing.
 */
async function signedInAs(page: Page, name: string) {
  await page.route('**/api/auth/session', (route) => route.fulfill({
    json: {
      user: { name, email: `${name.toLowerCase()}@example.test` },
      expires: new Date(Date.now() + 86_400_000).toISOString(),
    },
  }));
}

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

test.describe('who the landing page is for', () => {
  /*
    A front door is for people who have not been inside. These four tests are
    the whole rule: signed in goes past it, signed out always sees it, and
    `?stay=1` is the way to look at it without signing out.
  */

  test('sends a signed-in visitor on to their warbands', async ({ page }) => {
    await signedInAs(page, 'Commander');
    await page.goto('/');
    await expect(page).toHaveURL(/\/roster/);
  });

  test('does not flash the front door on the way past', async ({ page }) => {
    await signedInAs(page, 'Commander');
    await page.goto('/');
    /*
      The landing page may paint for the moment the session takes to resolve —
      that is the documented cost of keeping `/` static. What must not happen
      is the app settling on it: once the answer is known the page is a
      handover, not a front door.
    */
    await expect(page).toHaveURL(/\/roster/);
    await expect(page.getByRole('heading', { name: 'TrenchLine', level: 1 })).toHaveCount(0);
  });

  test('?stay=1 opens the landing page without signing out', async ({ page }) => {
    await signedInAs(page, 'Commander');
    await page.goto('/?stay=1');
    await expect(page.getByRole('heading', { name: 'TrenchLine', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Signed in as Commander/i })).toBeVisible();
    // Given time to redirect, and deliberately not taking it.
    await expect(page).toHaveURL(/\/\?stay=1$/);
  });

  test('keeps the front door for a signed-out visitor who already has warbands', async ({ page }) => {
    /*
      Local-only play is supported, so having a warband is not the same as
      being a user we know. It is also the one moment where the offer to sign
      in reaches someone with something to lose, so the page stays.
    */
    await seedWarband(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'TrenchLine', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Sign in to keep your warbands/i })).toBeVisible();
  });
});
