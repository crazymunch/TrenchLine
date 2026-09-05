import { test, expect } from '@playwright/test';
import { openApp } from './helpers';

/**
 * The four roles look like four things, on the built stylesheet.
 *
 * `src/components/ui/__tests__/unitRole.test.ts` asserts the class strings are
 * distinct and are theme tokens. It cannot assert the one thing that actually
 * goes wrong: a class Tailwind never compiled. `bg-role-elite/15` produces no
 * rule if the token is missing from the config, and the element then has no
 * background at all — which looks like a design decision rather than a bug.
 * That is the `MobileNav` failure (docs/MOBILE.md §5) in a new place.
 *
 * So this reads the colours off a real card in a production build. Driven
 * through the card's own role menu rather than by seeding four warbands: it is
 * the same control a player uses, and it proves the menu writes the category
 * as well as that the header reads it.
 */
const ROLES = ['Leader', 'Elite', 'Trooper', 'Mercenary'] as const;

test('each role paints the card header differently', async ({ page }) => {
  await openApp(page, '/roster');

  // One model, whatever the first row offers.
  await page.getByRole('button', { name: /recruit warrior/i }).first().click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await dialog
    .locator('[data-recruit-row] button[aria-label^="Recruit "]:not([aria-label*="another"])')
    .first().click();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  const painted: Record<string, string> = {};

  for (const role of ROLES) {
    // The role button carries the current category as its text.
    const badge = page.getByRole('button', { name: new RegExp(`^(${ROLES.join('|')})$`) }).first();
    await badge.click();
    await page.getByRole('button', { name: role, exact: true }).last().click();

    const header = page.locator(`[data-role="${role}"]`).first();
    await expect(header).toBeVisible();

    painted[role] = await header.evaluate((el) => {
      const s = getComputedStyle(el);
      return `${s.backgroundColor}|${s.borderLeftColor}|${s.borderLeftWidth}`;
    });
  }

  /*
    Four distinct paints. Not four SPECIFIC ones: the Leader's is the faction's
    colour and moves with the theme, and pinning a literal rgb() here would
    make this a test of the Iron Sanctum palette rather than of the language.
  */
  const distinct = new Set(Object.values(painted));
  expect(distinct.size, `roles share a paint: ${JSON.stringify(painted, null, 1)}`).toBe(4);

  // And none of them is transparent, which is what an uncompiled class gives.
  for (const [role, paint] of Object.entries(painted)) {
    expect(paint, `${role} has no background — the class did not compile`)
      .not.toMatch(/^rgba\(0, 0, 0, 0\)/);
  }
});

/**
 * A roster reads Leader, Elite, Trooper, Mercenary — and re-reads it.
 *
 * `unitRole.test.ts` proves the comparator. This proves the builder passes the
 * roster through it, and that the order is DERIVED rather than stored: a
 * promotion has to move the card with nothing being told to re-sort.
 *
 * Followed by NAME, not by role. Promoting a model demotes the standing Leader
 * to Elite (`store/slices/units.ts`), so the roster holds the same set of
 * roles before and after and only the holders change — an assertion on the
 * roles alone passes whether or not anything moved.
 */
test('the roster is in rank order, and stays in it', async ({ page }) => {
  await openApp(page, '/roster');

  // Three models, so there is an order to get wrong.
  await page.getByRole('button', { name: /recruit warrior/i }).first().click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  const add = dialog
    .locator('[data-recruit-row] button[aria-label^="Recruit "]:not([aria-label*="another"])');
  for (let i = 0; i < 3; i += 1) await add.nth(i).click();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  const RANK = ['Leader', 'Elite', 'Trooper', 'Mercenary'];
  const roles = () => page.locator('[data-role]').evaluateAll(
    (els) => els.map((e) => e.getAttribute('data-role') ?? ''));
  const names = () => page.locator('[data-role] h3').allInnerTexts();

  const startRoles = await roles();
  expect(startRoles.length, 'three models were recruited').toBe(3);
  const ranked = startRoles.map((r) => RANK.indexOf(r));
  expect(ranked, `out of rank order: ${startRoles.join(', ')}`)
    .toEqual([...ranked].sort((a, b) => a - b));

  /*
    Promote the LAST card and watch that model reach the front. Nothing tells
    the roster to re-sort — the order is computed on render — so a failure here
    means the order is being stored somewhere it should not be.
  */
  const startNames = await names();
  const promoted = startNames[startNames.length - 1];

  const lastCard = page.locator('[data-role]').last();
  await lastCard.getByRole('button', { name: new RegExp(`^(${RANK.join('|')})$`) }).click();
  await page.getByRole('button', { name: 'Leader', exact: true }).last().click();

  await expect.poll(async () => (await names())[0],
    { message: `${promoted} did not move to the front` }).toBe(promoted);
  await expect.poll(async () => (await roles())[0]).toBe('Leader');

  // And still ordered, rather than merely having one card jump.
  const endRoles = await roles();
  const endRanked = endRoles.map((r) => RANK.indexOf(r));
  expect(endRanked, `out of rank order after promotion: ${endRoles.join(', ')}`)
    .toEqual([...endRanked].sort((a, b) => a - b));
});

/**
 * Every Variant is a closed card until you open it.
 *
 * The picker rendered each variant's lore AND its full special-rules list at
 * once. The Iron Sultanate publishes seventeen variants and some carry four
 * rules apiece, so choosing between them meant scrolling a wall of prose in
 * which the names — the only thing you are actually choosing between — were
 * the smallest part of it.
 *
 * The closed card keeps the name, its badges and how many rules it enforces:
 * enough to choose from, and "4 rules enforced" is a fact about what taking it
 * costs. Everything else is one press away.
 */
test('the variant picker opens closed', async ({ page }) => {
  await openApp(page, '/roster');

  await page.getByRole('button', { name: /Standard list|Variant/i }).first().click();
  const sheet = page.locator('[role="dialog"]');
  await expect(sheet).toBeVisible();

  const expanders = sheet.getByRole('button', { name: /special rules?$|^Details$/ });
  const n = await expanders.count();
  expect(n, 'the picker offered nothing to expand').toBeGreaterThan(0);

  /*
    Nothing expanded to begin with. `aria-expanded` rather than the panel's
    visibility: the panel is `hidden` rather than unmounted so `aria-controls`
    always points at something real, and the attribute is what a screen reader
    is told either way.
  */
  for (let i = 0; i < n; i += 1) {
    await expect(expanders.nth(i)).toHaveAttribute('aria-expanded', 'false');
  }

  // And opening one opens that one.
  await expanders.first().click();
  await expect(expanders.first()).toHaveAttribute('aria-expanded', 'true');
  const panelId = await expanders.first().getAttribute('aria-controls');
  await expect(page.locator(`#${panelId}`)).toBeVisible();
  if (n > 1) await expect(expanders.nth(1)).toHaveAttribute('aria-expanded', 'false');
});
