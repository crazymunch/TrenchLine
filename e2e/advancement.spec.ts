/**
 * The Advancement Roll, in the app a player actually uses.
 *
 * RR-03 / RR-04 / FD-04b. The Promotions & Experience step of the post-battle
 * wizard offered every model on the roster the same eight buttons — `+1 Melee`,
 * `+1 Ranged`, `+1 Armour`, `+1" Move` and four named Skills. Trench Crusade
 * has no characteristic advances at all, and three of those Skills do not
 * exist. They were offered to models the step above had just told the player
 * earn no Experience, and pressing one wrote its label onto the model as free
 * text.
 *
 * This drives the wizard the way it is reached — through a match in Play Mode
 * — because the defect was not in a function, it was in what the screen put in
 * front of a player at a table.
 */
import { test, expect } from '@playwright/test';

import {
  seedWarband, expectNoHorizontalScroll, expectTouchTargets, expectNoZoomingInputs,
} from './helpers';

/**
 * A warband with one ELITE model one point short of an Advancement Roll.
 *
 * 3 Experience: the derived track earns a roll at 2, 4, 7, 10, 14 and 18, and
 * the model has already taken the one it earned at 2. So surviving this game
 * takes it to 4 and earns the next — which is the case worth driving, because
 * the roll has to be offered on the strength of a point this very submission
 * is about to grant.
 */
const WARBAND = {
  id: 'wb-adv',
  name: 'Advancement Test Warband',
  factionId: 'iron-sultanate',
  ducatLimit: 1000,
  treasuryDucats: 0,
  gloryPoints: 0,
  armoryStash: [],
  snapshots: [],
  chronicleLog: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  units: [
    {
      id: 'u-elite',
      customName: 'Yüzbaşı Demir',
      baseProfileId: 'p-elite',
      profileSnapshot: {
        id: 'p-elite',
        name: 'Yüzbaşı',
        factionId: 'iron-sultanate',
        category: 'Elite',
        elite: true,
        baseCost: 100,
        stats: { movement: '6"/Infantry', movementInches: 6, movementType: 'Infantry', ranged: '+1 DICE', melee: '+2 DICE', armour: '-1', base: '30mm' },
      },
      equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
      xp: 3,
      advancements: [],
      advancementRolls: 1,
      skills: [],
      injuries: [],
      deeds: [],
      isDead: false,
      totalCost: 100,
      currentWounds: 0, maxWounds: 1, bloodMarkers: 0,
      status: 'Active', hasActedThisTurn: false,
    },
    {
      id: 'u-troop',
      customName: 'Janissary Kerem',
      baseProfileId: 'p-troop',
      profileSnapshot: {
        id: 'p-troop',
        name: 'Janissary',
        factionId: 'iron-sultanate',
        category: 'Trooper',
        elite: false,
        baseCost: 40,
        stats: { movement: '6"/Infantry', movementInches: 6, movementType: 'Infantry', ranged: '+0 DICE', melee: '+1 DICE', armour: '0', base: '30mm' },
      },
      equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
      xp: 9,
      advancements: [], skills: [], injuries: [], deeds: [],
      isDead: false,
      totalCost: 40,
      currentWounds: 0, maxWounds: 1, bloodMarkers: 0,
      status: 'Active', hasActedThisTurn: false,
    },
  ],
};

/** Play a match and end it, which is the only way the wizard opens. */
async function endAMatch(page: import('@playwright/test').Page) {
  await seedWarband(page, WARBAND);
  await page.goto('/play');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: /ENTER TABLETOP COMBAT/ }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /END MATCH/i }).first().click();
  await page.waitForTimeout(1500);
}

/**
 * The wizard's own overlay.
 *
 * Play Mode stays mounted behind it, and it has a `Roll 2D6` button of its
 * own — so an unscoped query finds two and clicks the one the overlay is
 * covering.
 */
const wizard = (page: import('@playwright/test').Page) =>
  page.locator('div.fixed.inset-0.z-50').last();

/**
 * Walk the wizard to the Promotions & Experience step.
 *
 * Found by its own heading rather than by pressing Next a fixed number of
 * times: the step count is read from `dataset.campaign.phaseSteps`, so a
 * ruleset change would silently land this on the wrong screen.
 */
async function toPromotionsStep(page: import('@playwright/test').Page) {
  for (let i = 0; i < 6; i += 1) {
    if (await page.getByText(/Each .*ELITE.* model that took part/i).count()) return;
    const next = page.getByRole('button', { name: /Next Step/i }).first();
    await expect(next).toBeVisible();
    await next.click();
    await page.waitForTimeout(600);
  }
  await expect(page.getByText(/Each .*ELITE.* model that took part/i)).toBeVisible();
}

test('the step offers the book’s Advancement Roll, not eight invented buttons', async ({ page }) => {
  await endAMatch(page);
  await toPromotionsStep(page);

  const body = await page.locator('body').innerText();

  /*
    The four characteristic advances, which the game does not have. Asserted on
    the rendered page rather than on a constant, because the defect was what a
    player saw.
  */
  for (const gone of ['+1 Melee', '+1 Ranged', '+1 Armour', '+1" Move']) {
    expect(body, `${gone} is still offered`).not.toContain(gone);
  }
  // And the three Skills that do not exist. `Shadow Walker` is deliberately
  // not in this list: it IS a real Stealth Skill, and may legitimately appear
  // as the result of a roll.
  for (const gone of ['Eagle Eye', 'Mighty Blow', 'Diehard']) {
    expect(body, `${gone} is still offered`).not.toContain(gone);
  }

  // What is offered instead.
  await expect(page.getByText(/Advancement Roll/i).first()).toBeVisible();
  await expect(page.getByText(/Pick two Skill Tables and roll 2D6/i).first()).toBeVisible();
});

test('a roll offers two Skills and takes the one the player picks', async ({ page }) => {
  await endAMatch(page);
  await toPromotionsStep(page);

  await wizard(page).getByRole('button', { name: /Roll 2D6 on both/i }).first().click();
  await page.waitForTimeout(400);

  /*
    Step 3 is "Pick one of the two Skills" — a decision, so both come back and
    neither is marked the winner.
  */
  await expect(page.getByText(/Pick one of the two/i)).toBeVisible();

  /*
    Unconditionally, not `if (await offer.count())`. A conditional assertion
    here would pass on a step that rendered no offer at all, which is the one
    failure worth catching.
  */
  const offers = wizard(page).locator('button', { hasText: /rolled \d+/ });
  await expect(offers.first()).toBeVisible();
  const offered = await offers.count();
  expect(offered, 'the two tables offered nothing between them').toBeGreaterThan(0);

  // Taking one records it, with the table and the total that produced it.
  const label = await offers.first().innerText();
  await offers.first().click();
  await page.waitForTimeout(500);

  const learned = wizard(page).getByText(/^Learned /).first();
  await expect(learned).toBeVisible();
  await expect(learned).toContainText(label.split('\n')[0].trim());

  // And the roll is spent: the dice clear rather than staying on the table.
  await expect(wizard(page).getByText(/Pick one of the two/i)).toHaveCount(0);
});

test('a Troop is offered no Advancement Roll, however much Experience it carries', async ({ page }) => {
  /*
    The Janissary is seeded on 9 Experience — past three of the track's
    thresholds — and earns nothing, because only ELITE models gain Experience.
    The eight buttons were offered to it anyway.
  */
  await endAMatch(page);
  await toPromotionsStep(page);

  await expect(page.getByText(/Troops do not gain Experience/i).first()).toBeVisible();

  /*
    And it is told nothing about a roll it will never make. The Troop was
    getting "Next Advancement Roll at 10 Experience" directly beneath the line
    saying it gains no Experience — an appointment it cannot keep.
  */
  await expect(wizard(page).getByText(/Next Advancement Roll at/i)).toHaveCount(0);

  /*
    And exactly one model is offered a roll: the Yüzbaşı. Counted rather than
    located inside a card, because the cards are plain divs and `hasText`
    matches every ancestor that contains the name.
  */
  await expect(wizard(page).getByRole('button', { name: /Roll 2D6 on both/i })).toHaveCount(1);
});

test('the post-battle wizard is usable one-handed on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop', 'the floors stop at 1024px');

  await endAMatch(page);
  await toPromotionsStep(page);

  /*
    Asserted over the whole page, not scoped to this step.

    It could not be, when this spec was written: the page reported 28 controls
    under the 44px floor. Every one of them was either a button that met the
    height floor and not the width one — the global rule set `min-height` and
    stopped — or a checkbox measured by its own 13px box rather than by the
    label that actually toggles it. Both are fixed at the source now, so this
    is the plain check, and a control added to this wizard later has to meet
    the floor too.
  */
  await expectNoHorizontalScroll(page);
  await expectTouchTargets(page);
  await expectNoZoomingInputs(page);
});

