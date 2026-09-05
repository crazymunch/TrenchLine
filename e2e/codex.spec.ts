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

/**
 * The Rules FAQ tab.
 *
 * Reachable by a button, for the reason at the top of this file: a tab whose
 * only proof of existence is a `&&` in the JSX has the Mission Designer's
 * failure available to it — rendered for years, reachable by nobody.
 *
 * And it carries the document's own references. `RULES Q1` is what a player
 * quotes to an opponent across a table, so it has to be on screen and it has
 * to be findable by searching for it.
 */
test('the Rules FAQ is reachable, referenced and searchable', async ({ page }) => {
  await openApp(page);
  await goTo(page, 'Codex');

  const faq = page.getByRole('button', { name: /Rules FAQ \(\d+\)/ });
  await expect(faq, 'the Rules FAQ tab has no button').toBeVisible();
  await faq.click();

  await expect(page.getByRole('heading', { name: 'Rules Commentaries 1.0.2' })).toBeVisible();

  /*
    The first entry, carried verbatim from the official PDF, under the
    document's own reference — and the reference is asserted INSIDE the entry's
    own card rather than anywhere on the page. The panel's own introduction
    cites `RULES Q1` as an example of what a reference looks like, so a bare
    text match finds the prose and passes whether or not the entry rendered.
  */
  const firstEntry = page.locator('div').filter({
    hasText: 'In what order do players apply BLOOD and BLESSING MARKERS to the same roll?',
  }).last();
  await expect(firstEntry).toBeVisible();
  await expect(firstEntry.getByText('RULES Q1', { exact: true })).toBeVisible();

  /* A section heading has not bled into the answer above it: this one sits
     directly above `The Cult of the Black Grail`. */
  await page.getByPlaceholder(/Search core rules/).fill('Stealth Generator');
  await expect(page.getByText(/It has no effect on a Blast that targets a point on the ground\.$/))
    .toBeVisible();
  await expect(page.getByText(/The Cult of the Black Grail/)).toHaveCount(0);

  /* Searchable by the reference itself, which is what a player is given. */
  await page.getByPlaceholder(/Search core rules/).fill('MISC. Q7');
  await expect(page.getByText('Does a model have a Line of Sight to itself?')).toBeVisible();

  // The tab bar still fits its viewport.
  const de = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(de, 'the Codex scrolls sideways with the FAQ tab added').toBe(true);
});

/**
 * The scenarios tab lists every scenario the app can play, not only the
 * derived ones.
 *
 * The Codex read `dataset.scenarios` — the rulebook's twelve and Carcass
 * Front's five — while every other screen read `useScenarios()`, which also
 * carries the three hand-written All Out War scenarios. So the pack was
 * selectable in Play Mode and absent from the screen a player opens to look a
 * scenario up. A unit test cannot see that: the data was always there, and it
 * was the wiring in one component that dropped it.
 */
test('the scenarios tab shows the All Out War pack, and says it is not derived', async ({ page }) => {
  await openApp(page);
  await goTo(page, 'Codex');

  const tab = page.getByRole('button', { name: /Scenarios \(\d+\) & Maps/ });
  await expect(tab, 'the Scenarios tab has no button').toBeVisible();

  // The count in the label is the count of what the tab can show, so it is the
  // cheapest place for a dropped source to be visible.
  const label = await tab.innerText();
  const count = Number(label.match(/\((\d+)\)/)?.[1]);
  expect(count, `the tab offers ${count} scenarios; the twelve, the five and the three are twenty`)
    .toBe(20);

  await tab.click();

  for (const name of [
    'All Out War: The Looters (3 to 8 Players)',
    'All Out War: Brothers in Arms (2v2 Team Battle)',
    'All Out War: Alliance & Betrayal (3 to 4 Players)',
  ]) {
    await expect(page.getByRole('heading', { name }), `${name} is not listed`).toBeVisible();
  }

  /*
    And it says which of them are transcribed rather than read out of the
    catalogue. A reference screen that shows both without distinguishing them
    is how a player comes to trust the wrong line.
  */
  await expect(page.getByText('Transcribed, not derived').first()).toBeVisible();

  // The card opens, and carries the book's own sections rather than a stub.
  await page.getByRole('heading', { name: 'All Out War: The Looters (3 to 8 Players)' }).click();
  const card = page.locator('div').filter({ hasText: /^GLORIOUS DEEDS/ }).first();
  await expect(card, 'the pack has no GLORIOUS DEEDS section').toBeVisible();
  await expect(page.getByText(/This scenario lasts four Turns/).first()).toBeVisible();
});
