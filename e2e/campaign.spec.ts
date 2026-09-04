/**
 * A territory perk the campaign writes, and one the book publishes.
 *
 * Sixteen invented perks used to render under "Strategic Territory Perk", the
 * same heading a derived rule would get, so a player could not tell the app's
 * invention from the game. They are gone, and this is the honest replacement:
 * the group writes their own, and the app says whose rule it is.
 */
import { test, expect } from '@playwright/test';
import { openApp, goTo } from './helpers';

test('a campaign writes its own territory house rule, labelled as theirs', async ({ page }) => {
  await openApp(page);
  await goTo(page, 'Crusade');

  /*
    The theatre list rather than the pinned map: the cards carry the names, and
    a pin is positioned by percentage over a background image, which is not a
    stable thing to click across three viewports.
  */
  await page.getByRole('button', { name: 'CAMPAIGN WORLD MAP' }).click();
  await page.getByRole('button', { name: 'Theaters Grid' }).click();

  const theatre = page.getByText('The Great Iron Wall & New Antioch').first();
  await expect(theatre).toBeVisible();
  await theatre.click();

  /*
    The app publishes no perk for its own theatres, so the panel says so and
    offers the group's own rather than showing a made-up effect.
  */
  await expect(page.getByText(/No published rule attaches an effect/)).toBeVisible();

  const add = page.getByRole('button', { name: /Add your campaign.s own house rule/i });
  await expect(add).toBeVisible();
  await add.click();

  const box = page.getByLabel(/house rule for holding/i);
  await expect(box).toBeVisible();
  await box.fill('The holder may re-roll one Exploration dice after each battle.');
  await page.getByRole('button', { name: /Save house rule/i }).click();

  // Shown, and attributed to the campaign rather than to a book.
  await expect(page.getByText('House rule (set by this campaign):')).toBeVisible();
  /*
    `.first()`: the rule shows in the detail panel AND on the theatre's card in
    the list behind it, which is intended — the card is where a player scanning
    the map sees it.
  */
  await expect(
    page.getByText('The holder may re-roll one Exploration dice after each battle.').first()
  ).toBeVisible();
  await expect(page.getByText(/Strategic Territory Perk/)).toHaveCount(0);

  // The editor is a real touch target on a phone.
  const edit = page.getByRole('button', { name: /Edit or clear/i });
  const box2 = await edit.boundingBox();
  expect(box2, 'the edit control has no box').not.toBeNull();
  if (test.info().project.name === 'phone') {
    expect(box2!.height, 'the edit control is under the 44px touch floor')
      .toBeGreaterThanOrEqual(44);
  }

  // Cleared, and the label goes with the text.
  await edit.click();
  await page.getByLabel(/house rule for holding/i).fill('');
  await page.getByRole('button', { name: /Save house rule/i }).click();
  await expect(page.getByText('House rule (set by this campaign):')).toHaveCount(0);
  await expect(page.getByText(/No published rule attaches an effect/)).toBeVisible();
});
