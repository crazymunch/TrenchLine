# TrenchLine roster file fixtures

Files that `src/services/rosterFile.ts` must keep being able to read, kept here
so a reader regression is a failing test rather than a support thread.

| File | Format | Why it is here |
| --- | --- | --- |
| `v0-ninefold-penance.json` | v0 — the raw `JSON.stringify(warband)` the app exported before the envelope existed | The shape already in users' hands. It has no `format`, no version and no ruleset manifest, and it carries mid-battle state (`bloodMarkers`, `status: "Downed"`, `hasActedThisTurn`) and the exporter's own `creatorId` and `campaignId`, because the old export was a dump of the internal type |

`v0-ninefold-penance.json` is synthetic: it was produced by serialising a
warband exactly as `ExportModal`'s old `handleDownloadJson` did
(`JSON.stringify(warband, null, 2)`), against the generated dataset, rather than
being taken from a user. It is faithful to the code path, not to a real player's
roster — no real account id, campaign or roster is in this repository.

A v0 file is read as what it is: a roster with **no provenance**. See
[`docs/ROSTER-FILE.md`](../../../docs/ROSTER-FILE.md).
