/**
 * A territory perk the campaign writes, and one the book publishes.
 *
 * Sixteen invented perks used to render under "Strategic Territory Perk", the
 * same heading a derived rule would get, so a player could not tell the app's
 * invention from the game. They are gone, and this is the honest replacement:
 * the group writes their own, and the app says whose rule it is.
 */
import { test, expect } from '@playwright/test';
import { openApp, goTo, seedCampaign } from './helpers';

test('a campaign writes its own territory house rule, labelled as theirs', async ({ page }) => {
  // A campaign to hold the theatre, supplied by the harness rather than by the
  // app — see `TEST_CAMPAIGN`. Before `openApp`, so it lands before app code.
  await seedCampaign(page);
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

/**
 * The map is reachable without a pointer.
 *
 * Both the pins and the theatre cards were `<div onClick>`: no focus, no
 * Enter or Space, and nothing announcing them as pressable. The dossier they
 * open had no Escape, no focus trap and no scroll lock either — `useOverlay`
 * was extracted from `Sheet` so a component rendering its own overlay could
 * have all three, and nothing outside `Sheet` had adopted it.
 */
test('a territory opens, and closes, from the keyboard alone', async ({ page }) => {
  await seedCampaign(page);
  await openApp(page);
  await goTo(page, 'Crusade');
  await page.getByRole('button', { name: 'CAMPAIGN WORLD MAP' }).click();
  await page.getByRole('button', { name: 'Theaters Grid' }).click();

  /*
    Focused rather than clicked: a div with an onClick cannot be focused at
    all, so this fails outright on the shape this test exists to prevent.
  */
  const card = page.getByRole('button', { name: /The Great Iron Wall & New Antioch/ }).first();
  await expect(card).toBeVisible();
  await card.focus();
  await expect(card).toBeFocused();

  await page.keyboard.press('Enter');

  const dossier = page.getByRole('dialog');
  await expect(dossier).toBeVisible();
  await expect(dossier).toHaveAttribute('aria-modal', 'true');

  // Focus moved into the dossier rather than staying on the card behind it.
  await expect(card).not.toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dossier).toHaveCount(0);
});
