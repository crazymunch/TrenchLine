import { test, expect } from '@playwright/test';

/**
 * The app opens at a table with no signal.
 *
 * This is the one guarantee that cannot be checked by looking at the app while
 * it works: everything passes online. So the network is genuinely cut here —
 * `context.setOffline(true)`, not a mocked route — and the assertions are about
 * what a player can still do.
 *
 * Phone only. The offline case is a phone in a hall or a shop basement; running
 * it three times over adds ten minutes to CI and tests the same service worker.
 */
test.describe('with no network', () => {
  test('the roster, Play Mode and the Codex still open, with real rules', async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'the offline case is the phone at a table');
    // Installing a worker, priming three routes and then reloading each one
    // with the network cut is genuinely slow. The default 30s budget is for a
    // test that clicks something.
    test.setTimeout(150_000);

    // Online first: a service worker can only cache what it has been asked for
    // once. Visiting each route is what a player does before they lose signal.
    await page.goto('/roster');

    // Wait for the worker to be ACTIVE, not for a guessed number of seconds —
    // it registers after `load`, so a fixed sleep is a race that passes on a
    // fast machine and fails on CI.
    await page.waitForFunction(
      async () => !!(await navigator.serviceWorker.getRegistration())?.active,
      undefined,
      { timeout: 30_000 },
    );

    // Prime the routes and let each one settle so its chunks reach the cache.
    for (const path of ['/play', '/codex']) {
      await page.goto(path, { waitUntil: 'networkidle' });
    }

    await context.setOffline(true);

    // Each route renders its own view, not a browser error page.
    for (const [path, heading] of [
      ['/play', /Match Designer/i],
      ['/codex', /Rules Codex/i],
      // Last, because the roster index redirects to the active warband's own
      // URL client-side. Starting a fresh `goto` while that navigation is in
      // flight aborts it, which reads as an offline failure and is not one.
      ['/roster', /Al-Qarn Rihla|Warband Command/i],
    ] as const) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1').first(), `${path} offline`)
        .toHaveText(heading, { timeout: 20_000 });
    }

    /*
      The one that matters most. The ruleset is ~1.6 MB served from
      /api/dataset rather than bundled, so a cached shell with no cached
      dataset would open to an app with no statlines, no costs and no
      keywords — which is worse than not opening, because it looks like it
      works.
    */
    /*
      Asked from /codex, not /roster. The roster index redirects to the active
      warband's own URL client-side, and evaluating during that navigation
      tears the execution context down mid-call — which fails as
      "Execution context was destroyed" and looks like an offline fault rather
      than a race in the test. The dataset request is origin-relative, so the
      page it is asked from does not matter.
    */
    await page.goto('/codex', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 });
    const dataset = await page.evaluate(async () => {
      const res = await fetch('/api/dataset?ruleset=trenchline');
      const d = await res.json();
      return { ok: res.ok, units: d?.units?.length ?? null };
    });
    expect(dataset.ok, 'the ruleset is served from cache offline').toBe(true);
    expect(dataset.units, 'the offline ruleset is the whole thing').toBeGreaterThan(80);
  });

  test('a signed-out session never writes to the warband API', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'one viewport is enough for a network assertion');

    /*
      Not strictly an offline test, but it belongs with them: the app is
      local-first, and the sync that used to push every warband on every load
      is what made an offline edit dangerous. A signed-out visit must be
      read-only against the server.
    */
    const writes: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/warbands') && r.method() !== 'GET') {
        writes.push(`${r.method()} ${r.url()}`);
      }
    });

    await page.goto('/roster', { waitUntil: 'networkidle' });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 });
    // The sync runs on mount; give it room to have made a request if it were
    // going to, or the assertion passes for the wrong reason.
    await page.waitForTimeout(2500);

    expect(writes, 'writes to /api/warbands while signed out').toEqual([]);
  });
});
