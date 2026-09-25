import { describe, it, expect } from 'vitest';
import {
  CLIENT_FIELDS,
  clientMetadata,
  clientFieldsOf,
  metadataOf,
} from '../warbandMetadata';

/**
 * A warband must come back from the cloud as the warband that went up.
 *
 * Six fields did not. `variantId`, `allowThirdParty`, `campaignId`,
 * `forceMode`, `ledger` and `explorationDiscoveries` were in no column and in
 * no payload, so a sync destroyed them — silently, and only on the round trip,
 * which is why nothing caught it.
 */
const roundTrip = (body: Record<string, unknown>) =>
  clientFieldsOf(metadataOf(clientMetadata(body)));

describe('a warband round trip', () => {
  it('keeps the Variant, which is the field that was reported', () => {
    expect(roundTrip({ variantId: 'The House of Wisdom' }).variantId)
      .toBe('The House of Wisdom');
  });

  it('keeps every client-owned field it was given', () => {
    const sent = {
      lore: 'A caravan of scholars.',
      motto: 'Knowledge is the sharper blade.',
      patron: 'House of Wisdom',
      chronicleLog: [{ entry: 'Took the bridge.' }],
      snapshots: [{ id: 's1' }],
      editedAt: '2026-09-03T05:00:00.000Z',
      variantId: 'The House of Wisdom',
      allowThirdParty: true,
      campaignId: 'camp-1',
      forceMode: 'campaign',
      ledger: { ducats: 120 },
      explorationDiscoveries: ['Rudolf’s Folly'],
      /* The four this pull request added, each for a bug of exactly the same
         shape as the six above. */
      campaignRules: ['Book of Golems'],
      rewards: [{ name: 'Ransacked Alchemist Workshop' }],
      rulesetId: 'trenchline',
      importedCampaign: { round: 3 },
    };
    expect(roundTrip(sent)).toEqual(sent);
  });

  /*
    Round 2 item 10: the mechanism test below derives its expectation from
    `CLIENT_FIELDS`, so it proves the two directions agree — and says nothing
    about MEMBERSHIP. Deleting `rulesetId` from that list would leave it green
    while the field silently stopped surviving a sync, which is the original bug
    returning by the one route the guard does not watch.

    So the names are written out. Each one on this list is here because losing it
    broke something real:

    - `variantId`, `allowThirdParty`, `campaignId`, `forceMode`, `ledger`,
      `explorationDiscoveries` — the six the round trip destroyed.
    - `campaignRules` — durable in the roster FILE since GOLEM-1 and never in the
      sync, so a Warband that had earned the Book of Golems lost it the first
      time the device pulled its own roster back down.
    - `rewards` — the same, for everything FD-12 records a Warband as holding.
    - `rulesetId` — RV-1. Without it a shared roster is read under the server's
      default rather than the owner's ruleset, and the footer cannot say which.
    - `importedCampaign` — what another app's record stated about its campaign.
  */
  it('names every field that must survive a sync, rather than only checking the mechanism', () => {
    for (const field of [
      'variantId', 'allowThirdParty', 'campaignId', 'forceMode', 'ledger',
      'explorationDiscoveries', 'campaignRules', 'rewards', 'rulesetId',
      'importedCampaign',
    ]) {
      expect(CLIENT_FIELDS, `${field} is not client-owned any more`).toContain(field);
    }
  });

  /*
    `false` is a value, not an absence. Written with `||` it became `undefined`
    and the warband came back allowing third-party content it had been told to
    refuse — the same class of bug as `Number(x) || default` turning a
    deliberate 0 into a default.
  */
  it('keeps allowThirdParty: false rather than losing it', () => {
    expect(roundTrip({ allowThirdParty: false }).allowThirdParty).toBe(false);
  });

  it('keeps a note the player deliberately cleared', () => {
    expect(metadataOf(clientMetadata({ notes: '' })).rawNotes).toBe('');
  });

  /*
    The guard against the next one. Both directions are derived from
    CLIENT_FIELDS, so a field added to that list round-trips with no second
    edit — and a field added to `Warband` but NOT to that list is the bug all
    over again. This asserts the mechanism, not a list of names.
  */
  it('reads back exactly the fields it writes, with no second list to drift', () => {
    const sent = Object.fromEntries(CLIENT_FIELDS.map((k) => [k, `value-of-${k}`]));
    expect(Object.keys(roundTrip(sent)).sort()).toEqual([...CLIENT_FIELDS].sort());
    expect(roundTrip(sent)).toEqual(sent);
  });

  it('survives notes that are not JSON at all', () => {
    // Rows written before the metadata blob existed hold plain text.
    expect(metadataOf('just some notes')).toEqual({});
    expect(clientFieldsOf(metadataOf('just some notes')).variantId).toBeUndefined();
  });
});
