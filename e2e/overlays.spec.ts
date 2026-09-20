/**
 * Nothing an overlay puts on a phone is out of reach.
 *
 * Reported from the app: a player on a phone could not finish mustering a
 * warband. The dialog is taller than a 667px screen, its panel carried
 * `overflow-hidden` with no height cap and no scrolling region, and so
 * "Muster Roster" sat below the cut with nothing to scroll. The form could be
 * filled in and not submitted.
 *
 * It was one bug written six times. Every hand-rolled overlay in the app — the
 * ones that never moved onto the `Sheet` primitive — had the same panel:
 * `fixed inset-0 flex items-center justify-center p-4` around a box with no
 * `max-h` and no `overflow-y`. `Sheet` has owned the answer since Phase 3.1;
 * these six simply never adopted it.
 *
 * The rule this asserts is the one a person cares about: the control that
 * completes the flow can be reached. Not that it renders — the test that
 * covered this exact button asserted `toBeVisible()` and passed the whole
 * time, because a clipped element is still visible to Playwright.
 */
import { test, expect } from '@playwright/test';
import { openApp, goTo, expectReachable, seedCampaign } from './helpers';

test('the muster dialog can be completed on a phone', async ({ page }) => {
  test.skip(test.info().project.name !== 'phone', 'the report is a phone one');

  await openApp(page, '/roster');
  await page.getByRole('button', { name: /new warband/i }).first().click();
  await expect(page.getByText('MUSTER NEW WARBAND')).toBeVisible();

  /* The whole panel is on screen: a dialog taller than the viewport has
     already lost, whatever its contents do. */
  const panel = page.locator('div.bevel-container').filter({ hasText: 'MUSTER NEW WARBAND' }).last();
  const box = await panel.boundingBox();
  expect(box, 'the muster panel has no box').not.toBeNull();
  expect(box!.height, 'the muster panel is taller than the phone screen')
    .toBeLessThanOrEqual(page.viewportSize()!.height);

  /* And the field at the far end of the form is reachable, which is what the
     player was stuck on. */
  await expectReachable(
    page.getByLabel(/allow third-party mercenaries/i), 'the third-party option');
  await expectReachable(
    page.getByRole('button', { name: /muster roster/i }), 'the Muster Roster button');

  /* It genuinely submits from there — the point of the whole exercise. */
  await page.getByLabel(/warband title/i).fill('Reachability Test');
  await page.getByRole('button', { name: /muster roster/i }).click();
  await expect(page.getByText('MUSTER NEW WARBAND')).toHaveCount(0);
});

test('the campaign dialog can be completed on a phone', async ({ page }) => {
  test.skip(test.info().project.name !== 'phone', 'the report is a phone one');

  await openApp(page);
  await goTo(page, 'Crusade');
  await page.getByRole('button', { name: /new campaign/i }).first().click();
  await expect(page.getByText('CREATE CRUSADE CAMPAIGN')).toBeVisible();

  await expectReachable(
    page.getByRole('button', { name: /establish crusade/i }),
    'the Establish Crusade button');
});

test('the territory dossier can be read to the end on a phone', async ({ page }) => {
  test.skip(test.info().project.name !== 'phone', 'the report is a phone one');

  // As in campaign.spec.ts: the dossier needs a territory to open.
  await seedCampaign(page);
  await openApp(page);
  await goTo(page, 'Crusade');
  await page.getByRole('button', { name: 'CAMPAIGN WORLD MAP' }).click();
  await page.getByRole('button', { name: 'Theaters Grid' }).click();
  await page.getByText('The Great Iron Wall & New Antioch').first().click();

  const dossier = page.getByRole('dialog');
  await expect(dossier).toBeVisible();
  const box = await dossier.locator('div.bevel-container').first().boundingBox();
  expect(box!.height, 'the dossier is taller than the phone screen')
    .toBeLessThanOrEqual(page.viewportSize()!.height);
});
