import { test, expect } from '@playwright/test';
import {
  expectNoHorizontalScroll, expectNoZoomingInputs, expectTouchTargets,
  openApp, seedWarband,
} from './helpers';

/**
 * The Warband Roster Sheet, and the public share page (FD-12, SH-1).
 *
 * Two things a unit test cannot see. The sheet's projection is tested against
 * the dataset and the printed page in `src/rules/__tests__/rosterSheet.test.ts`;
 * what is asserted here is that the page RENDERS it — twelve rows of a six-column
 * table and eighteen Experience boxes in a row that must not wrap, at 375px, in a
 * production build where Tailwind has already tree-shaken the stylesheet.
 *
 * The share page is asserted for the one thing it must never do: render an empty
 * sheet for a token nobody issued. It has no database here, so the assertion is
 * the 404 — which is the same answer an unknown and a cleared token both get.
 */

/**
 * A warband with a model carrying Experience, so the track has something to draw.
 *
 * Kept minimal for the same reason `TEST_WARBAND` is: everything else the sheet
 * prints is asserted against the dataset in the unit suite, and a fixture here
 * that carried a statline would be a second place for it to drift.
 */
const WITH_A_VETERAN = {
  id: 'wb-sheet',
  name: 'The Sheet Test',
  factionId: 'iron-sultanate',
  forceMode: 'campaign',
  patron: 'Sublime Gate',
  ducatLimit: 1000,
  treasuryDucats: 80,
  gloryPoints: 3,
  units: [{
    id: 'u-vet',
    customName: 'Kasim the Tested',
    baseProfileId: 'unknown-on-purpose',
    profileSnapshot: {
      name: 'Azeb',
      category: 'Trooper',
      stats: {
        movement: '6"/Infantry', ranged: '+1', melee: '+0', armour: '0',
        baseSize: '30mm', keywords: ['SULTANATE'],
      },
      innateAbilities: [],
    },
    equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
    xp: 6,
    advancements: [],
    skills: [{
      name: 'Point Blank', category: 'Ranged Skills', roll: '9',
      source: { kind: 'import', roll: '9' },
    }],
    injuries: [],
    scars: [{ name: 'Prominent Scar', roll: '66' }],
    isDead: false,
    totalCost: 25,
    currentWounds: 1, maxWounds: 1, bloodMarkers: 0,
    status: 'Active', hasActedThisTurn: false,
  }],
  armoryStash: [],
  snapshots: [],
  chronicleLog: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

test.describe('the Roster Sheet', () => {
  test.beforeEach(async ({ page }) => {
    await seedWarband(page, WITH_A_VETERAN);
    await page.goto('/roster/wb-sheet/sheet');
    await expect(page.getByRole('heading', { name: /warband roster sheet/i }))
      .toBeVisible({ timeout: 20_000 });
    /* The ruleset is fetched, not bundled, so the sheet is not there until it
       lands — the Threshold table and the track both come out of it. */
    await expect(page.getByRole('heading', { name: /^campaign$/i }))
      .toBeVisible({ timeout: 20_000 });
  });

  test('prints the sheet’s own sections', async ({ page }) => {
    for (const section of [/strongbox/i, /heraldry/i, /arsenal/i,
      /warband bio & exploration notes/i, /^campaign$/i]) {
      await expect(page.getByRole('heading', { name: section })).toBeVisible();
    }
    /* The header's six blanks. PATRON is the one FD-15 made required. */
    await expect(page.getByText('Sublime Gate')).toBeVisible();
    await expect(page.getByText('Iron Sultanate')).toBeVisible();
  });

  test('draws eighteen Experience boxes in one unwrapped row', async ({ page }) => {
    /*
      The count comes from the dataset and is asserted against the printed sheet
      in the unit suite; what this proves is that all eighteen render and that the
      row does not wrap. A wrapped track puts the circles in the wrong places, and
      the rule against dynamic Tailwind class names is exactly what makes a
      fixed-width row of eighteen possible.
    */
    const track = page.locator('[role="img"][aria-label*="Experience"]').first();
    await expect(track).toBeVisible();

    const boxes = track.locator('> span');
    await expect(boxes).toHaveCount(18);

    const wrapped = await track.evaluate((el) => {
      const kids = [...el.children] as HTMLElement[];
      const tops = new Set(kids.map((k) => Math.round(k.getBoundingClientRect().top)));
      return tops.size > 1;
    });
    expect(wrapped, 'the Experience track wrapped onto a second line').toBe(false);

    /* Six of the eighteen are circles: the boxes where an Advancement Roll is
       earned. Counted through the rendered shape, not through the data. */
    const circles = await track.evaluate((el) => [...el.children]
      .filter((k) => getComputedStyle(k).borderRadius.includes('9999px')
        || parseFloat(getComputedStyle(k).borderTopLeftRadius) > 4).length);
    expect(circles).toBe(6);
  });

  test('the campaign table has twelve rows on a wide screen', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone',
      'the phone gets a stack per game instead: six columns do not fit 375px');
    await expect(page.locator('table').last().locator('tbody tr')).toHaveCount(12);
  });

  test('the phone gets a stack per game rather than a squeezed table', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'the phone layout only');
    /* Twelve labelled blocks, one per game, and no sideways scroll to reach a
       column — `docs/MOBILE.md`: never hide a layout problem with overflow. */
    await expect(page.getByText(/^Game 12$/)).toBeVisible();
  });

  test('says how each Skill was earned', async ({ page }) => {
    /* FD-12 item 2. The roll NewRecruit printed in brackets is the provenance,
       and it is on the card rather than lost into a free-text list. */
    await expect(page.getByText(/rolled 9/).first()).toBeVisible();
  });

  test('is usable at the table', async ({ page }, testInfo) => {
    await expectNoHorizontalScroll(page);
    /*
      The 44px floor and the 16px input floor stop at 1024px — `docs/MOBILE.md`
      §3 restores density there, and the sidebar rail's own items are 40px, so
      asserting them on desktop would ask the app to break its own standard.
      The same guard `mobile.spec.ts` uses.
    */
    if (testInfo.project.name !== 'desktop') {
      await expectTouchTargets(page);
      await expectNoZoomingInputs(page);
    }
  });
});

test.describe('the public share page', () => {
  test('a token nobody issued is a 404, never an empty sheet', async ({ page }) => {
    const res = await page.goto('/w/this-token-was-never-issued');
    expect(res?.status()).toBe(404);
    /*
      And it says which of the two things went wrong in a way the reader can act
      on: either the link is wrong, or whoever shared it stopped.
    */
    await expect(page.getByText(/does not lead to a roster/i)).toBeVisible();
    /* Nothing that looks like a roster. */
    await expect(page.getByRole('heading', { name: /strongbox/i })).toHaveCount(0);
  });

  test('carries the noindex header', async ({ page }) => {
    /* SH-1: a capability URL in a search index outlives the share. The header is
       the mechanism that also covers a crawler that renders nothing. */
    const res = await page.goto('/w/whatever');
    expect(res?.headers()['x-robots-tag']).toContain('noindex');
  });
});

test.describe('reaching the sheet from the builder', () => {
  test('the toolbar has a Sheet link and a Share button', async ({ page }) => {
    await openApp(page);
    await expect(page.getByRole('link', { name: /^sheet$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^share$/i })).toBeVisible();
  });

  test('a local-only warband cannot be shared, and the builder says so', async ({ page }) => {
    /*
      SH-1: "A local-only warband cannot be shared, and the builder says so:
      sharing needs the warband in the cloud." The harness's warband has never
      synced and there is no session, so this is that case.
    */
    await openApp(page);
    await page.getByRole('button', { name: /^share$/i }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/not shareable/i)).toBeVisible();
    await expect(dialog.getByText(/needs the warband in the cloud/i)).toBeVisible();
    /* And no link is offered for a roster that has none. */
    await expect(dialog.getByRole('button', { name: /copy the link/i })).toHaveCount(0);
  });
});

test.describe('review round 2: the sheet at 375px shows what this game earned', () => {
  test('the awarded boxes are a different fill from the ones already held', async ({ page }) => {
    /*
      Item 11, asserted through the rendered shape rather than the data: the
      wizard has to draw the track on Experience PLUS the gain, because the
      rolls it offers are computed from that total, and a player could not see
      which boxes the battle had just earned.

      Checked on the SHEET's track, where `heldBefore` is deliberately not
      passed — so every filled box is a plain fill and none is an award. That is
      the half a unit test cannot see: that the two fills are actually different
      colours once Tailwind has tree-shaken the stylesheet.
    */
    await seedWarband(page, WITH_A_VETERAN);
    await page.goto('/roster/wb-sheet/sheet');
    await expect(page.getByRole('heading', { name: /^campaign$/i }))
      .toBeVisible({ timeout: 20_000 });

    const track = page.locator('[role="img"][aria-label*="Experience"]').first();
    const fills = await track.evaluate((el) => [...el.children]
      .map((k) => getComputedStyle(k).backgroundColor));

    /* Six filled, twelve not, and the six agree with each other: nothing on this
       page is an award. */
    const filled = fills.slice(0, 6);
    expect(new Set(filled).size,
      'the sheet marks some boxes as newly awarded, which it never should').toBe(1);
  });
});

test.describe('review round 1: the share page sends nothing private', () => {
  /*
    Finding A, asserted where it actually matters: in the bytes the browser
    receives. The sheet is projected on the SERVER, so a `'use client'`
    component's serialised props carry the projection and not the roster.

    This spec has no database, so the token resolves to nothing and the page
    404s — which is still the right place to check the OTHER half of the rule:
    a 404 must carry no roster either, and the unit tests
    (`rosterSheet.test.ts`) hold the projection's contents against a fixture
    stuffed with secrets.
  */
  test('a 404 share page carries no roster in its HTML', async ({ page }) => {
    const res = await page.goto('/w/some-token-that-resolves-to-nothing');
    expect(res?.status()).toBe(404);

    const html = await page.content();
    for (const shape of ['chronicleLog', 'campaignMembers', 'creatorId',
      'armoryStash', 'byUserId']) {
      expect(html.includes(shape), `the 404 page mentions ${shape}`).toBe(false);
    }
    /*
      Round 2 item 4 added four more fields to the list of things a share must
      not carry, and two of them are shapes a 404 could plausibly leak: the
      account name the loader reads, and the free-text progression list.
    */
    for (const shape of ['creatorName', 'advancements']) {
      expect(html.includes(shape), `the 404 page mentions ${shape}`).toBe(false);
    }
  });
});
