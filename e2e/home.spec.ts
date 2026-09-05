/**
 * The front door.
 *
 * `/` used to redirect straight into the roster, so a visitor's first screen
 * was a warband builder with no warband in it and nothing anywhere said what
 * TrenchLine is. The page that replaced it then had the opposite problem: five
 * sections rendered through one `.map()` with one class string, seven boxes of
 * identical weight on one flat ground, and no focal point at all.
 *
 * What the current page has to keep doing is asserted here in three parts:
 * it says what the app is and reaches every section; its previews show real
 * catalogue data rather than a designer's placeholder; and it is the front
 * door for people who have not been inside, and only for them.
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

const masthead = (page: Page) => page.getByRole('heading', { level: 1 });

test.describe('the landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(masthead(page)).toContainText(/TRENCH\s*LINE/);
  });

  test('says what the app is, and reaches every section', async ({ page }) => {
    await expect(page.getByText(/built for Trench Crusade and nothing else/i)).toBeVisible();

    /*
      By href, not by link name. The page deliberately does NOT label its
      sections with the nav's words — 01 is headed "It plays the game with you"
      — so a test that looked for "Tabletop Combat" would be asserting the old
      copy. What has to stay true is that all five destinations are reachable
      from the front door by someone who has not yet learnt the nav.
    */
    for (const href of ['/play', '/campaign', '/codex', '/roster', '/directory']) {
      /*
        `:visible` matters: the header nav is `hidden lg:flex`, so on a phone
        the first `a[href="/play"]` in the DOM is a display:none nav link and
        the one that counts is the card below the fold.

        Which also means the PHONE project is the one that really proves this.
        On a desktop the nav is visible, so a destination that fell off the
        page body would still be found in the bar — the claim stays true and
        the assertion stays green. Verified: dropping /directory from the page
        content fails this on phone and passes on desktop.
      */
      await expect(
        page.locator(`a[href="${href}"]:visible`).first(),
        `nothing on the landing page links to ${href}`,
      ).toBeVisible();
    }
  });

  test('leads on the two things almost nothing else does', async ({ page }) => {
    /*
      Order is the argument. Accuracy is table stakes for a roster builder, so
      the page leads on tracking the game in progress and the campaign around
      it, and drops Roster and Directory to an index. A page that lists all
      five as equals is the flat one this replaced.
    */
    const body = await page.locator('body').innerText();
    const at = (s: string) => body.indexOf(s);

    expect(at('It plays the game with you'), '01 is missing').toBeGreaterThan(-1);
    expect(at('And remembers what happened'), '02 is missing').toBeGreaterThan(-1);
    expect(at('The whole book, searchable'), '03 is missing').toBeGreaterThan(-1);
    expect(at('Warband Roster'), '04 is missing').toBeGreaterThan(-1);

    expect(at('It plays the game with you')).toBeLessThan(at('The whole book, searchable'));
    expect(at('The whole book, searchable')).toBeLessThan(at('Warband Roster'));
  });

  test('the previews show the real catalogue, not a placeholder', async ({ page }) => {
    /*
      The page's own copy promises that nothing in the app is typed in by hand.
      Previews that were typed in by hand would be the one place on the site
      that breaks that promise, and they would break it invisibly — a plausible
      Ducat cost looks exactly like a real one.

      `src/components/landing/__tests__/previews.test.ts` asserts the values
      against the dataset. This asserts they reached the page.
    */
    await expect(page.getByText('Sniper Priest')).toBeVisible();
    /*
      The label and the quote are matched separately and exactly. A bare
      /BLOOD MARKER/ matches both — the popover heading and the rule text that
      opens with the same words — and resolves to two elements.
    */
    await expect(page.getByText(/^BLOOD MARKER\s*·\s*Tag$/)).toBeVisible();
    await expect(
      page.getByText(/BLOOD MARKERS are placed on models that suffer an injury/),
    ).toBeVisible();

    /*
      Named armoury: a price column with no armoury over it is the exact error
      `src/rules/arsenal.ts` exists to prevent.

      By text, not by role. The three previews are `aria-hidden` — they are
      decoration, and a screen reader announcing a five-row table of a warband
      nobody owns is noise — so they are not in the accessibility tree and
      `getByRole('cell')` cannot see them.
    */
    await expect(page.getByText(/Heretic Legions Armoury/i)).toBeVisible();
    await expect(page.getByText('Anti-Materiel Rifle', { exact: true })).toBeVisible();
    await expect(page.getByText('3 G', { exact: true })).toBeVisible();
  });

  test('offers Google sign-in, and no second sign-in form', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Sign in with Google/ }).first()).toBeVisible();

    /*
      The app's sign-in sheet is in the app. Two forms is how one of them ends
      up out of date with the auth it calls, so the landing page has no
      password field of its own.
    */
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.getByText(/Nothing here needs an account/)).toBeVisible();
  });

  test('meets the mobile floor', async ({ page }) => {
    await expectNoHorizontalScroll(page);
    if (test.info().project.name !== 'phone') return;

    // Every link is a real touch target on a phone (docs/MOBILE.md §3).
    const links = page.getByRole('link');
    const n = await links.count();
    expect(n, 'the landing page has no links').toBeGreaterThan(0);
    for (let i = 0; i < n; i += 1) {
      const box = await links.nth(i).boundingBox();
      if (!box) continue;
      expect(box.height, `link ${i} ("${(await links.nth(i).innerText()).slice(0, 30)}") is under 44px`)
        .toBeGreaterThanOrEqual(44);
    }

    /*
      And the armoury preview keeps its five columns inside its own scroller.
      `overflow-x: hidden` on the page is never the fix, and a table that
      widens the document is how that fix gets reached for.
    */
    const wide = await page.evaluate(() =>
      [...document.querySelectorAll('table')]
        .some((t) => t.scrollWidth > document.documentElement.clientWidth));
    expect(wide, 'a preview table is wider than the phone').toBe(false);
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

  test('does not settle on the front door on the way past', async ({ page }) => {
    await signedInAs(page, 'Commander');
    await page.goto('/');
    /*
      The landing page may paint for the moment the session takes to resolve —
      that is the documented cost of keeping `/` static. What must not happen
      is the app settling on it: once the answer is known the page is a
      handover, not a front door.
    */
    await expect(page).toHaveURL(/\/roster/);
    await expect(masthead(page)).toHaveCount(0);
  });

  test('?stay=1 opens the landing page without signing out', async ({ page }) => {
    await signedInAs(page, 'Commander');
    await page.goto('/?stay=1');
    await expect(masthead(page)).toContainText(/TRENCH\s*LINE/);
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
    await expect(masthead(page)).toContainText(/TRENCH\s*LINE/);
    await expect(page.getByText(/Nothing here needs an account/)).toBeVisible();
  });
});
