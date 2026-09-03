import { test, expect } from '@playwright/test';
import {
  openApp, expectTouchTargets, expectReadableText, expectNoZoomingInputs,
} from './helpers';

/**
 * Building a Warband, which is the app's main job.
 *
 * The recruit sheet used to close after every model, so a Warband of ten meant
 * opening it ten times; it showed rules for some entries and not others, so the
 * list read as ragged; and it never said what was left to spend. None of that
 * is visible to a test that only checks the sheet opens — these check the
 * behaviour a player relies on.
 */

/*
  Everything here is scoped to the dialog. The roster page behind it has its own
  "Recruit Warrior" button, which an unscoped `/^Recruit/` matches first — the
  test then asserts against the page rather than the sheet and reports a failure
  that is entirely its own.
*/
const openRecruit = async (page: import('@playwright/test').Page) => {
  await openApp(page, '/roster');
  await page.getByRole('button', { name: /recruit warrior/i }).first().click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  return dialog;
};

/**
 * The "+" on the first row nothing has been recruited from yet.
 *
 * A row with models on it shows a stepper instead, whose button is labelled
 * "Recruit another …" — excluded, or the walk-up test would start halfway.
 */
const firstAddButton = (dialog: import('@playwright/test').Locator) =>
  dialog.locator(
    '[data-recruit-row] button[aria-label^="Recruit "]:not([aria-label*="another"])',
  ).first();

/** The header's live figure, as a number. */
const ducatsLeft = async (dialog: import('@playwright/test').Locator) => {
  const text = await dialog.getByText(/^-?\d+ D$/).first().innerText();
  return parseInt(text.replace(/[^-\d]/g, ''), 10);
};

test('recruiting does not close the sheet, and the budget follows along', async ({ page }) => {
  const dialog = await openRecruit(page);

  const before = await ducatsLeft(dialog);
  const add = firstAddButton(dialog);
  const name = (await add.getAttribute('aria-label'))!.replace(/^Recruit /, '');
  await add.click();

  // The whole point of the change: eight models, one visit.
  await expect(dialog, 'the sheet closed after one recruit').toBeVisible();

  /*
    Exactly the entry's own cost, not merely "less". The catalogues give no
    model default gear, so a recruit's rating is its base cost — an off-by-gear
    figure here would mean the builder had invented a starting loadout, which
    is where a chunk of the old data's 38% invented wargear came from.
  */
  const cost = parseInt(
    (await dialog.locator(`[data-recruit-row="${name}"]`).getAttribute('data-ducats'))!, 10);
  const after = await ducatsLeft(dialog);
  expect(after, `${name} is ${cost} D`).toBe(before - cost);

  // "+" has become a stepper on that row.
  await expect(dialog.getByRole('button', { name: `Recruit another ${name}` })).toBeVisible();
  await expect(dialog.getByRole('button', { name: `Remove one ${name}` })).toBeVisible();
});

test('the stepper stops at the entry own recruitment limit', async ({ page }) => {
  const dialog = await openRecruit(page);

  /*
    The catalogues carry a max on 69 of the 89 entries and the builder enforced
    none of them. Walk one entry up until its "+" disables, and check it did so
    rather than running away — the loop bound is the largest limit in the data
    plus slack, so a missing cap fails here rather than hanging.
  */
  const add = firstAddButton(dialog);
  const name = (await add.getAttribute('aria-label'))!.replace(/^Recruit /, '');
  await add.click();

  const more = dialog.getByRole('button', { name: `Recruit another ${name}` });
  let clicks = 1;
  while (await more.isEnabled() && clicks < 30) {
    await more.click();
    clicks += 1;
  }
  expect(await more.isEnabled(), `${name} has no recruitment limit`).toBe(false);

  /*
    And the minus walks it back down, but no further: the row was empty when the
    sheet opened, so it must end on the plain "+" it started with rather than
    reaching into models that were already on the roster.
  */
  const less = dialog.getByRole('button', { name: `Remove one ${name}` });
  for (let i = 0; i < clicks; i += 1) {
    if (await less.count() === 0 || !(await less.isEnabled())) break;
    await less.click();
  }
  await expect(dialog.getByRole('button', { name: `Recruit ${name}`, exact: true }),
    'the stepper did not return to an empty row').toBeVisible();
});

test('there is no Leader filter, and All reads Elite then Trooper then Mercenary', async ({ page }) => {
  const dialog = await openRecruit(page);

  /*
    The Leader tab matched nothing and always would: a *profile* is never
    categorised as Leader — the store sets that on a model when one is
    nominated — so the tab was an empty filter dressed as a real one.
  */
  await expect(dialog.getByRole('button', { name: 'LEADER', exact: true }))
    .toHaveCount(0);

  // Read in rendered order off the rows themselves.
  const categories = await dialog.locator('[data-recruit-row]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-category') ?? ''));
  expect(categories.length, 'the recruit list is empty').toBeGreaterThan(10);

  const rankOf = (c: string) => ['Elite', 'Trooper', 'Mercenary'].indexOf(c);
  const ranks = categories.map(rankOf);
  expect(ranks, 'an entry has a category outside the three').not.toContain(-1);
  expect([...ranks].sort((a, b) => a - b), `read as ${categories.join(' > ')}`).toEqual(ranks);
});

test('the recruit sheet meets the mobile floor', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop', 'the touch floor is for touch');
  const dialog = await openRecruit(page);

  // Expand a row: the rules text and the name field only exist expanded, and
  // they are exactly where an 11px label or a 14px input would hide.
  await dialog.locator('[data-recruit-row] [aria-expanded]').first().click();

  await expectTouchTargets(page);
  await expectNoZoomingInputs(page);
  if (testInfo.project.name === 'phone') await expectReadableText(page);
});


test('third-party entries are hidden until the Warband allows them', async ({ page }) => {
  /*
    The catalogues hide these until a roster takes the "Allow Third-Party
    Mercenaries?" option, and the app must default the same way: showing
    unofficial content beside published entries with nothing to tell them apart
    is the same failure as an invented statline — the player cannot see it.
  */
  const dialog = await openRecruit(page);
  await expect(dialog.locator('[data-recruit-row="Disciple of St. Roch"]'))
    .toHaveCount(0);

  // Turn it on from the roster, which is where a table agreement is recorded.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  const toggle = page.getByRole('button', { name: /3rd party (on|off)/i });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: /recruit warrior/i }).first().click();
  const again = page.locator('[role="dialog"]');
  const row = again.locator('[data-recruit-row="Disciple of St. Roch"]');
  await expect(row, 'the entry is still hidden with the option on').toHaveCount(1);
  // And it is labelled, so it is never mistaken for published material.
  await expect(row).toContainText(/third party/i);
});

/**
 * The three roles are labelled, not merely ordered.
 *
 * The list was sorted Elite -> Trooper -> Mercenary but ran as one unbroken
 * column, so a Mercenary priced in Glory sat indistinguishably beside a Trooper
 * priced in Ducats and nothing on screen said which was which.
 */
test('the recruit list is broken into Elite, Trooper and Mercenary sections', async ({ page }) => {
  const dialog = await openRecruit(page);

  const headings = await dialog.locator('[data-recruit-heading]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-recruit-heading') ?? ''));
  expect(headings, 'no role headings rendered').toEqual(['Elite', 'Trooper', 'Mercenary']);

  /*
    One heading per role, and each immediately before its own rows: read the
    rendered sequence and every row must follow the heading that names it.
  */
  const sequence = await dialog.locator('[data-recruit-heading], [data-recruit-row]')
    .evaluateAll((els) => els.map((el) => el.hasAttribute('data-recruit-heading')
      ? `H:${el.getAttribute('data-recruit-heading')}`
      : `R:${el.getAttribute('data-category')}`));

  let current = '';
  for (const item of sequence) {
    if (item.startsWith('H:')) current = item.slice(2);
    else expect(item.slice(2), `a ${item.slice(2)} row sits under the ${current} heading`).toBe(current);
  }
});
