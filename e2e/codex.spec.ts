import { test, expect } from '@playwright/test';
import { openApp, goTo } from './helpers';

/**
 * The Codex's Patrons tab and its Exploration tables, on the phone.
 *
 * Two things are asserted here that a unit test cannot see. The first is that
 * the tab **has a button**: the Codex's `generator` tab was rendered by
 * `activeTab === 'generator'` from the day the Codex was built and nothing in
 * the app ever set that state, so every generator in it was unreachable and no
 * test noticed. A tab whose only proof of existence is a `&&` in the JSX has
 * that failure available to it.
 *
 * The second is that the Carcass Front Exploration tables read as a separate
 * set. A Carcass Front campaign uses its four Resource tables *instead of* the
 * rulebook's three, and eight buttons in one flat row would say the opposite.
 */
test('the Patrons tab is reachable and reads on a phone', async ({ page }) => {
  await openApp(page);
  await goTo(page, 'Codex');

  const patronsBtn = page.getByRole('button', { name: /Patrons \(\d+\)/ });
  await expect(patronsBtn, 'the Patrons tab has no button').toBeVisible();
  await patronsBtn.click();

  // Both books' Patrons, in one list: Carcass Front's three are explicitly for
  // "any Campaign (not just a Carcass Front Campaign)".
  await expect(page.getByText('TEMPORAL LORD')).toBeVisible();
  await expect(page.getByText('HOUSE OF WISDOM')).toBeVisible();

  await page.getByText('HOUSE OF WISDOM').click();
  await expect(page.getByText('Whispering Zīj', { exact: true })).toBeVisible();
  // The Alchemical Formula printed among the Skills, shown apart from them.
  await expect(page.getByText('Zīj Seal', { exact: true })).toBeVisible();
  await expect(page.getByText(/unlocked by Whispering Zīj/)).toBeVisible();

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'the Patrons tab scrolls the page sideways').toBeLessThanOrEqual(0);
});

test('the Carcass Front Exploration tables read as their own set', async ({ page }) => {
  await openApp(page);
  await goTo(page, 'Codex');
  await page.getByRole('button', { name: /Campaign D66 Tables/ }).click();

  await expect(page.getByText(/Carcass Front — used instead/)).toBeVisible();
  await page.getByRole('button', { name: /favour/i }).click();

  await expect(page.getByText('THE CARCASS FRONT EXPLORATION STEP:')).toBeVisible();
  // The open last row, which was read as the tail of the row above it until
  // the parser's contiguity check said otherwise.
  await expect(page.getByText('Chosen Blessing')).toBeVisible();
  await expect(page.getByText('Roll 34+')).toBeVisible();
  await expect(page.getByText('Roll 1-3').first()).toBeVisible();

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'the charts tab scrolls the page sideways').toBeLessThanOrEqual(0);
});
