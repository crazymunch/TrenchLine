/**
 * The client-owned fields of a warband, and how they survive a round trip.
 *
 * Extracted from `api/warbands/route.ts` so that the round trip can be tested
 * directly: a Next route module may only export its handlers, and this is the
 * part of that file with logic worth asserting.
 */

/**
 * The fields the client owns, and the value written when it sends none.
 *
 * ONE list, because the bug this fixes was two. The payload written by POST
 * and the object rebuilt by GET were separate literals, and six fields of
 * `Warband` were in neither: `variantId`, `allowThirdParty`, `campaignId`,
 * `forceMode`, `ledger` and `explorationDiscoveries`. A sync is a round trip,
 * so each of them survived only until the device next pulled its own warband
 * back down, and then was gone.
 *
 * `variantId` is the one that was reported. Without it a warband is validated
 * against its faction's STANDARD list, so a House of Wisdom warband is told
 * its two Jabirean Alchemists exceed a limit of 1 — the Variant raises it to
 * 2 — and that it must include a Yüzbaşı Captain, which the Variant forbids
 * outright. Both errors cite rules the warband is not playing under.
 *
 * That symptom is already written down in `newRecruitImporter`, which was
 * fixed for it. The IMPORTER learned to read the Variant; the SYNC never
 * learned to keep it, so a roster was correct until it was saved.
 *
 * Deriving both directions from this object is what stops the next field
 * being dropped the same way: adding a key here makes it round-trip, and
 * there is no second place to forget.
 */
export const CLIENT_OWNED = {
  lore: '',
  motto: '',
  patron: '',
  chronicleLog: [] as unknown,
  snapshots: [] as unknown,
  // `undefined` rather than a default: a warband with no Variant and a warband
  // whose Variant was lost must not be written back as the same thing.
  editedAt: undefined as unknown,
  variantId: undefined as unknown,
  allowThirdParty: undefined as unknown,
  campaignId: undefined as unknown,
  forceMode: undefined as unknown,
  ledger: undefined as unknown,
  explorationDiscoveries: undefined as unknown,
  explorationEffects: undefined as unknown,
  /*
    What the roster's `Campaign Rules > Enabled` subtree said the Warband has
    earned, and the same grants with their rules text and provenance.

    Both were missing, and the symptom is the one this list exists to stop.
    `campaignRules` has been durable in the roster FILE since GOLEM-1 and was
    never in the SYNC, so a Warband that had earned the Book of Golems lost it
    the first time the device pulled its own roster back down — and the
    builder's Book of Golems action stopped being offered with no explanation.
    `rewards` is the same subtree's text and provenance (FD-12), which is what
    the Roster Sheet prints; SH-1's share page reads it through this list, so a
    shared sheet would show a Warband holding nothing.
  */
  campaignRules: undefined as unknown,
  rewards: undefined as unknown,
  /*
    Which ruleset the warband is built against, and the campaign state another
    app's record stated (RV-1 and CI-1, #113).

    Neither was in this list, so both were lost on the first pull — the same
    hole the six fields above were found in. `rulesetId` is the one SH-1's share
    page reads: it projects the sheet on the server under the WARBAND's ruleset
    rather than the reader's or the default, and it can only do that if the
    field survives the round trip.
  */
  rulesetId: undefined as unknown,
  importedCampaign: undefined as unknown,
};

type ClientField = keyof typeof CLIENT_OWNED;
export const CLIENT_FIELDS = Object.keys(CLIENT_OWNED) as ClientField[];

/** The JSON written into `notes`: the client's fields plus its free-text notes. */
export function clientMetadata(body: Record<string, unknown>): string {
  const out: Record<string, unknown> = { rawNotes: (body.notes as string) ?? '' };
  for (const k of CLIENT_FIELDS) {
    // `??`, not `||`: `false` is a value `allowThirdParty` can legitimately
    // hold, and `''` is a note the player deliberately cleared.
    out[k] = body[k] ?? CLIENT_OWNED[k];
  }
  return JSON.stringify(out);
}

/** The same fields, handed back to their owner. */
export function clientFieldsOf(metadata: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of CLIENT_FIELDS) out[k] = metadata[k];
  return out;
}

/** Read the client-owned metadata that rides inside `notes`. */
export function metadataOf(notes: string | null): Record<string, unknown> {
  const raw = notes ?? '';
  if (!raw.startsWith('{') || !raw.endsWith('}')) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}
