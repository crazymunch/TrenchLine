import { test, expect } from '@playwright/test';
import { openApp, expectReachable } from './helpers';

/**
 * Mustering a Warband.
 *
 * The Variant is the thing this covers. It decides what the Warband may
 * recruit, and until now it could only be set from the roster screen — after
 * the first models were already on it, recruited against a list that was not
 * the one in force. That is the same defect the variant work was meant to fix,
 * one step earlier.
 */

const openMuster = async (page: import('@playwright/test').Page) => {
  await openApp(page, '/roster');
  await page.getByRole('button', { name: /new warband/i }).first().click();
  await expect(page.getByText('MUSTER NEW WARBAND')).toBeVisible();
  // The labels are `htmlFor`-bound, so getByLabel is the real association a
  // screen reader follows rather than a proximity guess.
  await expect(page.getByLabel(/warband title/i)).toBeVisible();
};

test('the Variant is chosen at muster, from the ruleset', async ({ page }) => {
  await openMuster(page);

  const variant = page.getByLabel(/warband variant/i);
  await expect(variant, 'no Variant control on the muster screen').toBeVisible();

  // The list is the ruleset's, not a hand-written one: New Antioch's variants
  // come from the catalogues, and "Standard list" is a real choice beside them.
  const options = await variant.locator('option').allInnerTexts();
  expect(options[0]).toMatch(/Standard list/);
  expect(options.length, 'the faction has no variants listed').toBeGreaterThan(1);
});

test('an unrestricted Warband sets both currencies, a campaign one neither', async ({ page }) => {
  await openMuster(page);

  // Campaign is the default and its allowance is published — offering to edit
  // it is how the app ended up with a hand-set limit in the first place.
  await expect(page.getByLabel(/starting ducats/i)).toHaveCount(0);
  await expect(page.getByLabel(/starting glory/i)).toHaveCount(0);

  await page.getByRole('button', { name: /Unrestricted/ }).click();

  await expect(page.getByLabel(/starting ducats/i)).toBeVisible();
  /*
    Trench Crusade has two currencies and this screen offered one, so an
    unrestricted list could not include anything the catalogues price in Glory
    — a Witch Coven Matriarch is 0 Ducats and 5 Glory.
  */
  await expect(page.getByLabel(/starting glory/i)).toBeVisible();
});

/**
 * A Variant's rules must not bury the button that accepts them.
 *
 * Reported from the app: choosing a Variant rendered every one of its special
 * rules inline and unbounded, and the Procession of the Sacred Affliction
 * prints seven of full prose. On a phone that is taller than the screen, so
 * "Muster Roster" was pushed below the fold of a dialog that gave no sign it
 * could scroll — the form could be filled in and not submitted.
 */
test('a Variant with many rules still leaves the muster button reachable', async ({ page }) => {
  await openMuster(page);

  await page.getByLabel(/faction allegiance/i).selectOption({ label: 'Trench Pilgrims' });
  const variant = page.getByLabel(/warband variant/i);

  // Chosen by reading the ruleset's own list rather than by typing a label:
  // the option text carries a "(third party)" suffix for some variants, and a
  // hard-coded string would break the moment that changed.
  const labels = await variant.locator('option').allInnerTexts();
  const procession = labels.find((l) => /Procession of the Sacred Affliction/.test(l));
  expect(procession, 'the Procession is not in the ruleset').toBeTruthy();
  await variant.selectOption({ label: procession! });

  // Collapsed by default: the rules are one tap away, not in the way.
  const rules = page.locator('#muster-variant-rules');
  await expect(rules).toBeHidden();

  const toggle = page.getByRole('button', { name: /special rules?/i });
  await expect(toggle).toBeVisible();
  const box = await toggle.boundingBox();
  expect(box!.height, 'the disclosure is under the 44px touch floor').toBeGreaterThanOrEqual(44);

  /*
    Reachable, not merely visible. This assertion used to be `toBeVisible()`,
    which a button clipped by `overflow: hidden` satisfies — and that is how
    the dialog shipped with no way to scroll to it at all.
  */
  const submit = page.getByRole('button', { name: /muster roster/i });
  await expectReachable(submit, 'the Muster Roster button');

  // Expanded, the rules scroll INSIDE their own container rather than growing
  // the dialog. `clientHeight` is what the reader sees; `scrollHeight` is the
  // prose. Bounded means the first is smaller, and the page still does not
  // scroll sideways.
  await toggle.click();
  await expect(rules).toBeVisible();
  const [clientH, scrollH] = await rules.evaluate((el) => [el.clientHeight, el.scrollHeight]);
  expect(scrollH, 'the Procession should print more rules than fit').toBeGreaterThan(clientH);
  expect(clientH, 'the rules block is not bounded').toBeLessThan(page.viewportSize()!.height);

  await expectReachable(submit, 'the Muster Roster button, with the rules expanded');
});
