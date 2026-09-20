/**
 * One mock game, end to end, at the size it is played at.
 *
 * WIZ-2, the READY FOR TESTING pass. Every other spec in this suite drives one
 * rule; this drives a whole post-battle sequence the way an owner will on the
 * night — a campaign Warband that goes into a match, comes out of it with
 * casualties, and is walked through all five steps to the commit.
 *
 * It exists because the rules in this app compose, and the composition is
 * where the defects have been. A model can earn its survival point, a Glorious
 * Deed's second point, a Trauma result's D3 and a Warband Skill's +1 in the
 * same submission, cross an Advancement threshold on the total, and then be
 * trimmed by its own Experience cap — and not one of those interactions is
 * visible from a unit test of any single rule.
 *
 * `docs/READY-FOR-TESTING.md` lists what this reaches and, as importantly,
 * what it does not.
 */
import { test, expect } from '@playwright/test';

import { seedWarband, expectNoHorizontalScroll, expectTouchTargets } from './helpers';

type Over = Record<string, unknown>;

const elite = (id: string, name: string, over: Over = {}) => ({
  id,
  customName: name,
  baseProfileId: 'p-elite',
  profileSnapshot: {
    id: 'p-elite', name: 'Yüzbaşı', factionId: 'iron-sultanate',
    category: 'Elite', elite: true, baseCost: 100,
    stats: {
      movement: '6"/Infantry', movementInches: 6, movementType: 'Infantry',
      ranged: '+1 DICE', melee: '+2 DICE', armour: '-1', base: '30mm',
    },
  },
  equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
  xp: 1, advancements: [], advancementRolls: 0, skills: [], injuries: [], deeds: [],
  isDead: false, totalCost: 100,
  currentWounds: 0, maxWounds: 1, bloodMarkers: 0,
  status: 'Active', hasActedThisTurn: false,
  ...over,
});

/**
 * The Skill's published text, as an Advancement Roll writes it.
 *
 * Copied from the model's own record rather than looked up, because that is
 * the shape a learned Skill has on a roster: `store/slices/campaign.ts` writes
 * the row's description onto `skills[].effect`.
 */
const WAR_STORIES_TEXT =
  'When you are recording the Experience Points earned by the models in your '
  + 'Warband in the Campaign Phase, you can give each model with the ELITE '
  + 'Keyword that does not also have this Skill +1 extra Experience Point. You '
  + 'can’t pick the model with the Skill itself. A Warband can only have one '
  + 'model with this Skill.';

const WARBAND = {
  id: 'wb-mock',
  name: 'Mock Game Warband',
  factionId: 'iron-sultanate',
  campaignId: 'camp-mock',
  forceMode: 'campaign',
  ducatLimit: 1000,
  treasuryDucats: 300,
  gloryPoints: 10,
  armoryStash: [],
  snapshots: [],
  chronicleLog: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  units: [
    /* Holds War Stories: pays everyone else, and is paid nothing itself. */
    elite('u-teller', 'Storyteller Adem', {
      skills: [{
        name: 'War Stories', category: 'wildcard', roll: '11',
        effect: WAR_STORIES_TEXT,
      }],
    }),
    /* Goes Out of Action, so the Trauma step owes it a D66. */
    elite('u-casualty', 'Sergeant Bahri', { status: 'Out of Action' }),
    /* Neither holder nor casualty: the control. */
    elite('u-control', 'Yüzbaşı Demir'),
  ],
};

const wizard = (page: import('@playwright/test').Page) =>
  page.locator('div.fixed.inset-0').last();

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

const nextStep = async (page: import('@playwright/test').Page) => {
  await wizard(page).getByRole('button', { name: /^NEXT STEP$/i }).first().click();
  await page.waitForTimeout(700);
};

const back = async (page: import('@playwright/test').Page) => {
  await wizard(page).getByRole('button', { name: /^BACK$/i }).first().click();
  await page.waitForTimeout(700);
};

/** The commit button, whatever it is currently refusing to do. */
const commitButton = (page: import('@playwright/test').Page) =>
  wizard(page).getByRole('button', {
    name: /Commit to Campaign Chronicle|unrolled|Ransom unresolved/i,
  }).first();

test('a whole post-battle sequence, with four Experience rules composing on one model', async ({ page }) => {
  await endAMatch(page);
  const w = wizard(page);

  /* ---- Step 1: the scenario and the result ---------------------------- */
  await expect(w.getByText(/Step 1 of 5/i)).toBeVisible();
  /*
    Glory is one point per Glorious Deed and Ducats are the Exploration Roll
    times ten (RR-02). Neither is a number the step invents, and the step says
    so where a player can read it.
  */
  await expect(w.getByText(/1 per Glorious Deed/i)).toBeVisible();
  await expect(w.getByText(/Exploration Roll .* 10/i)).toBeVisible();
  await w.getByRole('button', { name: /^VICTORY$/i }).first().click();
  await page.waitForTimeout(400);
  await nextStep(page);

  /* ---- Step 2: Trauma, and the D66 entered by hand --------------------- */
  await expect(w.getByText(/Step 2 of 5/i)).toBeVisible();
  /* RC-01: the D66 chart is ELITE only; a Troop takes a D6 Survival Roll. */
  await expect(w.getByText(/Troops make a D6 Survival Roll/i)).toBeVisible();
  await w.getByRole('button', { name: /PHYSICAL ROLL/i }).first().click();
  await page.waitForTimeout(400);
  await w.locator('input, select').first().fill('65');
  await page.waitForTimeout(700);
  /* RR-01: the row's text comes from the rulebook, not the catalogue. */
  await expect(w.getByText(/Bitter Lessons/i).first()).toBeVisible();
  await expect(
    w.getByText(/gains D3 extra Experience Points/i).first(),
  ).toBeVisible();
  await nextStep(page);

  /* ---- Step 3: Promotions & Experience --------------------------------- */
  await expect(w.getByText(/Step 3 of 5/i)).toBeVisible();

  /* FD-06d: War Stories is offered, and names who is holding it. */
  await expect(w.getByText(/Held by Storyteller Adem/i)).toBeVisible();
  /* FD-06d: the D3 the Trauma result owes, unrolled. */
  await expect(w.getByText(/Sergeant Bahri — Bitter Lessons/i)).toBeVisible();

  /*
    Before the die is rolled, the award is what the other rules make it — and
    the holder is not paid its own Skill.
  */
  const step3 = await w.innerText();
  expect(step3).toMatch(/Storyteller Adem\s+1 → 2 XP/);
  expect(step3).toMatch(/\+1 for surviving, \+1 from War Stories/);

  /* ---- The commit refuses while a rolled result owes a die ------------- */
  await nextStep(page);   // 4. Reinforcements
  await nextStep(page);   // 5. Exploration
  await expect(commitButton(page)).toBeDisabled();
  await expect(commitButton(page)).toHaveText(/BITTER LESSONS UNROLLED/i);

  /* ---- Take the roll, by hand, and watch four rules compose ------------ */
  await back(page);
  await back(page);
  await w.getByRole('button', { name: /ENTER A ROLL/i }).first().click();
  await page.waitForTimeout(400);
  await w.getByRole('button', { name: /rolled 2$/i }).first().click();
  await page.waitForTimeout(700);

  const rolled = await w.innerText();
  expect(rolled).toContain('Rolled 2 — +2 Experience.');
  /*
    1 XP, +1 for surviving, +2 from the Trauma result, +1 from the Warband's
    Skill. The line says which rule paid which point, because a five-point
    award with no working shown is one a player retypes by hand.
  */
  expect(rolled).toMatch(/Sergeant Bahri\s+1 → 5 XP/);
  expect(rolled).toMatch(/\+1 for surviving, \+2 from Bitter Lessons, \+1 from War Stories/);
  /*
    And the total crosses an Advancement threshold on the strength of points
    this very submission granted — the track is 2, 4, 7, 10, 14, 18, so 5 has
    passed two of them. This is the interaction no single rule's test sees.
  */
  expect(rolled).toMatch(/2 Advancement Rolls due/);

  /* ---- And then it commits --------------------------------------------- */
  await nextStep(page);
  await nextStep(page);
  await expect(commitButton(page)).toBeEnabled();
  await expect(commitButton(page)).toHaveText(/COMMIT TO CAMPAIGN CHRONICLE/i);
});

test('declining War Stories takes the point back off everyone', async ({ page }) => {
  await endAMatch(page);
  const w = wizard(page);

  await w.getByRole('button', { name: /^VICTORY$/i }).first().click();
  await page.waitForTimeout(400);
  await nextStep(page);   // 2. Trauma
  await nextStep(page);   // 3. Promotions & Experience

  await expect(w.getByText(/Held by Storyteller Adem/i)).toBeVisible();
  expect(await w.innerText()).toMatch(/\+1 for surviving, \+1 from War Stories/);

  /*
    "You CAN give" — so it is a switch, and turning it off has to actually
    take the point back rather than only hide the sentence that mentions it.
  */
  const takeIt = w.locator('label', { hasText: /Give every other ELITE model/i })
    .locator('input[type="checkbox"]');
  await expect(takeIt).toBeChecked();
  await takeIt.uncheck();
  await page.waitForTimeout(600);
  await expect(takeIt).not.toBeChecked();

  const off = await w.innerText();
  expect(off).not.toMatch(/from War Stories/);
  expect(off).toMatch(/Yüzbaşı Demir\s+1 → 2 XP/);
});

test('the post-battle sequence meets the mobile floor', async ({ page }, testInfo) => {
  /*
    Phone and tablet only. docs/MOBILE.md §3: "The touch rules run to 1023px,
    not 639px… Density is restored at `lg:`, where a laptop starts." A desktop
    sidebar link is 40px tall on purpose, and asserting 44px here would be
    asking the app to break its own standard.
  */
  test.skip(testInfo.project.name === 'desktop', 'the floors stop at 1024px');

  await endAMatch(page);
  const w = wizard(page);

  await w.getByRole('button', { name: /^VICTORY$/i }).first().click();
  await page.waitForTimeout(400);

  /* Every step, not just the one a rule was added to. */
  for (let step = 1; step <= 5; step += 1) {
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);
    if (step < 5) await nextStep(page);
  }
});
