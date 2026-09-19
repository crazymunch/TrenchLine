import { test, expect } from '@playwright/test';
import { expectNoHorizontalScroll, goTo, openApp, seedWarband } from './helpers';

/**
 * Play Mode on a phone (Phase 3.6).
 *
 * The combat screen is about 6,300px tall with nine models deployed — nine and
 * a half phone screens — and the turn controls lived at the top of it. This
 * asserts they stay reachable, which is the whole of the fix.
 */
test('the turn controls stay reachable through the whole match', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'the combat strip is phone-only');

  await openApp(page);
  await goTo(page, 'Play');

  await page.getByRole('button', { name: /Select Squad/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Confirm Squad/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /ENTER TABLETOP COMBAT/ }).click();
  await page.waitForTimeout(1500);

  const strip = page.locator('div.sticky.top-14').first();
  await expect(strip).toBeVisible();

  // A sticky bar that owns half the screen is not a fix for a scrolling
  // problem: the first attempt at this was 323px of a 667px viewport.
  const height = await strip.evaluate((el) => el.getBoundingClientRect().height);
  expect(height).toBeLessThan(80);

  const reachable = async () => strip.evaluate((el) =>
    [...el.querySelectorAll('button')].every((b) => {
      const r = b.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight && r.height >= 30;
    }));

  expect(await reachable()).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.waitForTimeout(400);
  expect(await reachable(), 'the turn controls scrolled away mid-match').toBe(true);
});

/**
 * The All Out War card, betrayal and alliance console is offered for the pack
 * and for nothing else.
 *
 * The console is a 700-line engine — a 52-card deck, initiative draws, the
 * twelve-rank betrayal table, the alliance timer — and it is reachable only
 * through this gate. The gate used to guess which scenarios were All Out War
 * from four patterns over the name, the id, the tagline and `number > 12`; it
 * now asks `useScenarios()`, which labels every scenario with its book. This
 * asserts the gate opens for the three and stays shut for the rulebook's.
 */
test('the All Out War console is offered for the pack, and only for it', async ({ page }) => {
  await openApp(page);
  await goTo(page, 'Play');

  const picker = page.locator('select').filter({
    has: page.locator('option', { hasText: 'All Out War: The Looters' }),
  });
  await expect(picker, 'the scenario picker does not offer the All Out War pack').toHaveCount(1);

  const console_ = page.getByRole('button', { name: /Cards & Alliances|CARD & BETRAYAL ENGINE/i });

  await picker.selectOption('aow-the-looters');
  await expect(console_.first(), 'the console is not offered for an All Out War scenario')
    .toBeVisible();

  await picker.selectOption('claim-no-mans-land');
  await expect(console_, 'the console is offered for a rulebook scenario').toHaveCount(0);
});

/**
 * Opening `/play` cold puts your own warband in the match.
 *
 * The bug this guards was invisible to every other test here, and the reason
 * is the shape of those tests: they call `openApp` (which lands on `/roster`)
 * and then navigate CLIENT-SIDE to Play, by which time the store is warm. On a
 * cold load of `/play` it is not — `hydrateStore()` reads `localStorage` from a
 * mount effect, deliberately, so the first render sees an empty store — and
 * `matchWarbandIds` was seeded by `useState` on exactly that render. So the
 * lobby opened saying "0 Warbands Linked" with a roster sitting in storage.
 *
 * A cold load is not a corner case here: it is opening the PWA from the home
 * screen, and it is reloading the page at the table.
 */
test('a cold load of Play Mode has the warband in the match', async ({ page }) => {
  await seedWarband(page);
  await page.goto('/play');
  await page.waitForLoadState('networkidle');

  // The count the bug got wrong, read from the lobby's own heading.
  await expect(page.getByText(/1 Warband Linked/i)).toBeVisible({ timeout: 20_000 });

  // And the side is the player's own, labelled as theirs rather than by
  // position — "(YOU)" used to mark whatever was first in the list.
  await expect(page.getByText(/PLAYER 1 \(YOU\)/i)).toBeVisible();
  // The lobby card's own heading — the name also appears in the top bar and
  // in a select, and this is about the MATCH having it.
  await expect(page.getByRole('heading', { name: 'E2E Test Warband' })).toBeVisible();
});

/**
 * A match survives a reload.
 *
 * This is the one that matters at a table. Victory Points, claimed Glorious
 * Deeds and the list of who is even in the match were all component-local
 * `useState` and reached storage nowhere, so a reload — or a phone evicting a
 * backgrounded tab, which they do routinely — lost the entire scorecard of a
 * three-hour game. Only wounds and markers survived, and only because those
 * are written into the warband.
 */
test('victory points survive a reload', async ({ page }) => {
  await seedWarband(page);
  await page.goto('/play');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: /ENTER TABLETOP COMBAT/ }).click();
  await page.waitForTimeout(1200);

  // Score three points, the way a player does: the + beside their own total.
  const plus = page.getByRole('button', { name: '+' }).first();
  for (let i = 0; i < 3; i += 1) { await plus.click(); await page.waitForTimeout(150); }
  await expect(page.getByText('3 VP').first()).toBeVisible();

  // The eviction, as the browser would do it.
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  // Still three, still in the match, and told that it was resumed.
  await expect(page.getByText('3 VP').first()).toBeVisible();
  await expect(page.getByText(/Resumed a match saved/i)).toBeVisible();
});

/**
 * A finished match is written into the Chronicle.
 *
 * Everything the tracker collected used to be discarded when a match ended.
 * The campaign's `MatchRecord` kept a date, a scenario, a narrative and
 * exactly ONE participant — the player's own warband — so in a four-side game
 * three of them left no trace at all.
 */
test('ending a match records it in the Chronicle', async ({ page }) => {
  await seedWarband(page);
  await page.goto('/play');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: /ENTER TABLETOP COMBAT/ }).click();
  await page.waitForTimeout(1200);

  const plus = page.getByRole('button', { name: '+' }).first();
  for (let i = 0; i < 2; i += 1) { await plus.click(); await page.waitForTimeout(150); }

  await page.getByRole('button', { name: /END MATCH/i }).first().click();
  await page.waitForTimeout(1200);

  await page.goto('/chronicle');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  // The battle is there, with the side and its score — not just a date.
  await expect(page.getByRole('heading', { name: /Chronicle of Battles/i })).toBeVisible();
  // Scoped to the battle card: the app shell has a warband <select> whose
  // hidden <option> carries the same name and comes first in the DOM.
  const card = page.locator('article').first();
  await expect(card.getByText('E2E Test Warband')).toBeVisible();
  await expect(card.getByText('2 VP')).toBeVisible();
});

/**
 * A Chronicle that cannot reach the cloud says so.
 *
 * CHRON-2 puts battle records on the server so the other warbands in a game
 * see the game they played. That creates a way for the view to be quietly
 * wrong: a failed fetch returning an empty list looks exactly like "you have
 * fought no battles", and the player cannot see through it.
 *
 * The suite runs signed OUT, so `/api/battles` answers 401 — which is the
 * honest version of the same situation and the one this asserts. Rule 2 in
 * CLAUDE.md, and `services/githubSync.ts` is the shipped example of getting it
 * wrong.
 */
test('the Chronicle says when it is only showing this device', async ({ page }) => {
  await seedWarband(page);
  await page.goto('/chronicle');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  /* Scoped to `main`: the app shell's header carries its own `role="status"`
     for the "On this device" sign-in indicator, and an unscoped lookup is a
     strict-mode violation rather than a miss. */
  const status = page.locator('main').getByRole('status');
  await expect(status).toBeVisible();
  await expect(status).toContainText(/only what this device recorded/i);

  // And it offers a way to try again rather than leaving it at that.
  await expect(status.getByRole('button', { name: /Refresh/i })).toBeVisible();
});

/**
 * A placeholder opponent is seated by creating them, and fits inside its card.
 *
 * Both halves shipped broken and were reported from a real lobby.
 *
 * Creating one used to save it and stop there, so the player had to find the
 * same opponent in the list and click it a second time — two steps for one
 * intention, having just said who is playing.
 *
 * And the row it appeared in overflowed its column, because `flex-1` sets no
 * min-width: a long name made the button 347px wide inside a 179px row, which
 * put the `+` 138px outside the card and the delete button 200px outside, both
 * over the neighbouring player's panel. A test that finds a control through
 * the accessibility tree clicks it happily; a person aiming at the card cannot
 * reach it. So this asserts GEOMETRY, not just clickability — that is the
 * whole point, and a `click()` alone would have passed against the bug.
 */
test('a created opponent is seated, and its row stays inside the card', async ({ page }) => {
  await seedWarband(page);
  await page.addInitScript(() => localStorage.removeItem('tc_opponents_v1'));
  await page.goto('/play');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  const players = () => page.locator('text=/^PLAYER \\d/i').count();
  expect(await players()).toBe(1);

  // A deliberately long name: the short ones fit by luck and prove nothing.
  await page.getByRole('button', { name: /Opponent without a warband/i }).first().click();
  await page.locator('#opp-name').fill('The Black Procession of the Heretic Legions');
  await page.getByRole('button', { name: /^Save opponent$/i }).first().click();
  await page.waitForTimeout(800);

  // One step, not two.
  expect(await players(), 'creating an opponent did not seat them').toBe(2);

  /* Fill the remaining slots so the add panel is at its narrowest — the
     column where the overflow actually bit. */
  for (const name of ['Second Placeholder Warband', 'Third Placeholder Warband']) {
    await page.getByRole('button', { name: /Opponent without a warband/i }).first().click();
    await page.locator('#opp-name').fill(name);
    await page.getByRole('button', { name: /^Save opponent$/i }).first().click();
    await page.waitForTimeout(700);
  }
  expect(await players(), 'the fourth side could not be added').toBe(4);

  await expectNoHorizontalScroll(page);
});

/**
 * The same row, measured in the narrow slot it broke in.
 *
 * Separate from the test above because it needs a saved opponent that is NOT
 * yet in the match while three sides already are — the exact state a fourth
 * player is added from, and the one where the column is narrowest.
 */
test('a saved opponent row does not spill out of the add panel', async ({ page }) => {
  await seedWarband(page);
  await page.addInitScript(() => localStorage.setItem('tc_opponents_v1', JSON.stringify([
    { id: 'opp-x', name: 'Short One', factionId: 'new-antioch', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'opp-y', name: 'Also Short', factionId: 'court-seven-serpents', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'opp-z', name: 'The Black Procession of the Heretic Legions', factionId: 'heretic-legions', createdAt: '2026-01-01T00:00:00Z' },
  ])));
  await page.goto('/play');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  for (const n of ['Short One', 'Also Short']) {
    await page.getByRole('button', { name: new RegExp(n, 'i') }).first().click();
    await page.waitForTimeout(600);
  }

  const spill = await page.evaluate(() => {
    const panel = [...document.querySelectorAll('div')].find((d) =>
      d.className.includes('border-dashed') && /Add Opponent/i.test(d.textContent || ''));
    if (!panel) return { noPanel: true };
    const pr = panel.getBoundingClientRect();
    return [...panel.querySelectorAll('li')].flatMap((li) =>
      [...li.children]
        .map((c) => ({
          text: (c.textContent || '').trim().slice(0, 24),
          past: Math.round(c.getBoundingClientRect().right - pr.right),
        }))
        .filter((c) => c.past > 1));
  });
  expect(spill, 'a row spills past the right edge of its card').toEqual([]);
});
