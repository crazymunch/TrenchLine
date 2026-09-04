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

/**
 * The Campaigns tab: two campaigns, the Camp buildings, the Tracker rewards
 * and the sixteen Vision cards.
 *
 * The map campaign's chapter is 44 sections, so it is an accordion rather than
 * a page — a player opens this at a table, on a phone, having just finished a
 * game and wanting the one step they are on.
 */
test('the Campaigns tab reads on a phone', async ({ page }) => {
  await openApp(page);
  await goTo(page, 'Codex');

  const tab = page.getByRole('button', { name: 'Campaigns', exact: true });
  await expect(tab, 'the Campaigns tab has no button').toBeVisible();
  await tab.click();

  // Both campaigns, and the notice saying which half of the map is missing.
  await expect(page.getByRole('button', { name: /The Carcass Front Campaign/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /The Path to Leviathan/ })).toBeVisible();
  /*
    The zone BOARD — which zone borders which — is still only on the printed
    sheet, and the rules need it for supply lines and adjacency. Its three
    TABLES are no longer missing, so this used to read "fold-out map from the
    box", which was true of both halves and is now true of only one.
  */
  await expect(page.getByText(/zone board from the box/)).toBeVisible();

  // And those three tables, which come off `carcass-front-map.pdf`.
  await page.getByRole('button', { name: /Carcass Front Zones/ }).click();
  await expect(page.getByText('The Vivarium')).toBeVisible();
  await expect(page.getByRole('cell', { name: /Dragon Hunt/ })).toBeVisible();

  await page.getByRole('button', { name: /Special Zone Outpost Bonuses/ }).click();
  await expect(page.getByText(/re-roll one Promotion roll/)).toBeVisible();

  await page.getByRole('button', { name: /Carcass Front Scenario Generator/ }).click();
  await expect(page.getByText('Long-Distance Battle').first()).toBeVisible();

  // The twelve building tiers, which stack.
  await page.getByRole('button', { name: /Camp Buildings/ }).click();
  await expect(page.getByText('💰 Depot')).toBeVisible();
  await expect(page.getByText(/increase your Warband’s Threshold Value by 20/)).toBeVisible();

  // The Vision cards.
  await page.getByRole('button', { name: /Vision Cards/ }).click();
  await expect(page.getByText('Diplomat')).toBeVisible();
  await expect(page.getByText('Have 1 Mercenary in your Warband')).toBeVisible();

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'the Campaigns tab scrolls the page sideways').toBeLessThanOrEqual(0);

  // The Path to Leviathan's three conclusions.
  await page.getByRole('button', { name: /The Path to Leviathan/ }).click();
  await page.getByRole('button', { name: /Campaign Conclusions/ }).click();
  await expect(page.getByText('Total Victory', { exact: true })).toBeVisible();
  await expect(page.getByText('Minor Victory', { exact: true })).toBeVisible();
  await expect(page.getByText('The summoning fails', { exact: true })).toBeVisible();

  const overflow2 = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow2, 'the Path to Leviathan scrolls the page sideways').toBeLessThanOrEqual(0);
});
