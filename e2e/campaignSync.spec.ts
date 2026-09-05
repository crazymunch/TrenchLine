/**
 * The four states of campaign sync, in a browser.
 *
 * The last item on `docs/CAMPAIGN-SYNC.md`'s test list, and the one the others
 * cannot cover: the protocol and both queues are tested in isolation, but what
 * a player is TOLD is a property of the running app. The defect being guarded
 * against is the one the whole feature exists to fix — every campaign call
 * used to swallow its own failure, so "saved to the cloud" and "the request
 * never left the building" looked identical from the outside.
 *
 * The server is mocked at the network boundary rather than run: this is a test
 * of what the app does with each answer, and the answers themselves are
 * pinned by `src/app/api/campaigns/__tests__/sync.integration.test.ts` against
 * a real database.
 */
import { test, expect, type Page } from '@playwright/test';
import { seedWarband, goTo } from './helpers';

const CLOUD_ID = 'camp-cloud-e2e';

/** Six zones, because `readInitialState` keeps a stored map only at six or more. */
const TERRITORIES = Array.from({ length: 6 }, (_, i) => ({
  id: `terr-${i + 1}`,
  name: `Sector ${i + 1}`,
  type: "No Man's Land",
  perk: '',
  description: `Sector ${i + 1} of the line.`,
  x: 10 + i * 10,
  y: 40,
  version: 4,
}));

const CAMPAIGN = {
  id: 'camp-local-e2e',
  /* The id the server knows it by. Nothing in the app sets one yet — see the
     "first sync" section of the design — so the test supplies it, which is
     exactly what a campaign that HAS been created in the cloud would carry. */
  cloudId: CLOUD_ID,
  name: 'Sync Crusade',
  inviteCode: 'TRENCH-E2E',
  adminName: 'Commander',
  status: 'active',
  framework: 'classic',
  currentTurn: 1,
  version: 7,
  maxWarbandDucats: 700,
  gloryVictoryThreshold: 25,
  members: [],
  matches: [],
  territories: TERRITORIES,
  chronicleLogs: [],
};

/** What the server says to a push, for the duration of one step. */
type PushAnswer =
  | { kind: 'applied' }
  | { kind: 'status'; status: number }
  | { kind: 'conflict'; perk: string };

/**
 * Answer the two calls a sync makes, and let a test change the second one
 * between clicks. Held in a box rather than re-routed each time: Playwright
 * appends handlers, so re-routing the same URL leaves the earlier answer in
 * front of the later one.
 */
async function mockCloud(page: Page, answer: { current: PushAnswer }) {
  await page.route('**/api/campaigns?id=*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ campaign: { id: CLOUD_ID, version: 7 } }),
    }));

  await page.route('**/api/campaigns/sync', (route) => {
    const a = answer.current;
    if (a.kind === 'status') return route.fulfill({ status: a.status, body: '{}' });

    const ops = (route.request().postDataJSON()?.ops ?? []) as { opId: string }[];
    if (a.kind === 'applied') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ applied: ops.map((o) => o.opId), skipped: [], conflicts: [] }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        applied: [], skipped: [],
        conflicts: ops.map((o) => ({
          opId: o.opId,
          server: {
            version: 9, perk: a.perk, perkSource: 'campaign',
            controlledByWarbandId: null, controlledByPlayerName: null,
          },
        })),
      }),
    });
  });
}

/** Open the crusade hub on a campaign the server knows about. */
async function openCampaign(page: Page) {
  await seedWarband(page);
  await page.addInitScript(([campaign]) => {
    localStorage.setItem('tc_campaign_v1', JSON.stringify(campaign));
  }, [CAMPAIGN]);
  await page.goto('/roster');
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 });
  await page.waitForLoadState('networkidle');
  await goTo(page, 'Crusade');
  await expect(page.getByRole('heading', { name: 'Sync Crusade' })).toBeVisible();
}

/** Write a house rule on the first sector, the way a player does. */
async function setPerk(page: Page, text: string) {
  await page.getByRole('button', { name: 'CAMPAIGN WORLD MAP' }).click();
  await page.getByRole('button', { name: 'Theaters Grid' }).click();
  await page.getByText('Sector 1').first().click();
  await page.getByRole('button', { name: /Add your campaign.s own house rule/i }).click();
  await page.getByLabel(/house rule for holding/i).fill(text);
  await page.getByRole('button', { name: /Save house rule/i }).click();
  /* The dossier is a real modal now — Escape, focus trap, scroll lock — so it
     stays up until it is dismissed, and it covers the banner the indicator
     lives in. */
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
}

test('a campaign says whether the cloud has what this device did', async ({ page }) => {
  const answer: { current: PushAnswer } = { current: { kind: 'applied' } };
  await mockCloud(page, answer);
  await openCampaign(page);

  // Nothing queued, and the server was reachable.
  await expect(page.getByText('Backed up')).toBeVisible();

  // PENDING: an edit is held here until it is pushed.
  await setPerk(page, 'The holder may re-roll one Exploration dice.');
  await expect(page.getByText('1 to upload')).toBeVisible();

  // FAILED: the server did not answer, and the edit is still queued.
  answer.current = { kind: 'status', status: 500 };
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(page.getByText('Sync failed')).toBeVisible();
  /* Still one, not zero. "The server said no" and "the server was not reached"
     are different, and only the first is an answer. */
  const queued = () => page.evaluate(() => JSON.parse(localStorage.getItem('tc_campaign_outbox_v1') || '[]').length);
  expect(await queued()).toBe(1);

  // SYNCED: the same edit, taken on the retry.
  answer.current = { kind: 'applied' };
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(page.getByText('Backed up')).toBeVisible();
  expect(await queued()).toBe(0);
});

test('a campaign shows a conflict rather than merging it', async ({ page }) => {
  const answer: { current: PushAnswer } = { current: { kind: 'applied' } };
  await mockCloud(page, answer);
  await openCampaign(page);
  await expect(page.getByText('Backed up')).toBeVisible();

  answer.current = { kind: 'conflict', perk: 'Theirs by right.' };
  await setPerk(page, 'Ours by right.');
  await page.getByRole('button', { name: 'Sync now' }).click();

  // The question, not a silent merge and not a red failure.
  await expect(page.getByText('1 needs a decision')).toBeVisible();
  await expect(page.getByText('The campaign’s copy:')).toBeVisible();
  await expect(page.getByText('Theirs by right.')).toBeVisible();

  // The player's own text is still on screen and still queued.
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('tc_campaign_outbox_v1') || '[]').length)
  ).toBe(1);

  // Resolving takes the campaign's copy — locally as well as in the queue.
  await page.getByRole('button', { name: /Take the campaign.s copy/i }).click();
  await expect(page.getByText('Backed up')).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('tc_campaign_v1') || '{}').territories[0].perk)
  ).toBe('Theirs by right.');
});

test('the sync controls are reachable by thumb', async ({ page }) => {
  test.skip(test.info().project.name !== 'phone', 'the touch floor is a phone requirement');

  const answer: { current: PushAnswer } = { current: { kind: 'applied' } };
  await mockCloud(page, answer);
  await openCampaign(page);
  await setPerk(page, 'A rule.');

  const button = page.getByRole('button', { name: 'Sync now' });
  const box = await button.boundingBox();
  expect(box, 'the sync control has no box').not.toBeNull();
  expect(box!.height, 'the sync control is under the 44px touch floor').toBeGreaterThanOrEqual(44);
});
