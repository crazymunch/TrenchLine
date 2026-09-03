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
    };
    expect(roundTrip(sent)).toEqual(sent);
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
