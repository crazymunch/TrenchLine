# Campaign sync — design

SYNC-1 in [`ENGINEERING-AUDIT-FOLLOWUP.md`](ENGINEERING-AUDIT-FOLLOWUP.md) says
"design before implementation". This is that design, and it stops short of
code deliberately: it turned up a model mismatch the package did not anticipate,
and that has to be decided before a line of protocol is worth writing.

**Status: not implemented.** `storage.syncCampaignToCloud` returns
`{ ok: false, reason: 'server', detail: 'Campaign cloud sync is not
implemented.' }`, truthfully. The deleted fire-and-forget create calls are not
coming back.

## The blocker: two campaign models share one table

The `Campaign` and `TerritoryNode` tables were built for a campaign the app no
longer creates.

| | the API creates | the store creates |
|---|---|---|
| territories | **4 fixed** — `North Trench Sector A-1`, `Shrine of the Weeping Martyr`, … | **12** world theatres, or **32** published Carcass Front zones |
| ids | database cuids | `wt-*` in the seed, `cf-<slug>` derived from the zone name |
| framework | no concept of one | `classic` or `carcass-front`, fixed at creation |
| perk provenance | not modelled | `perkSource`: `published`, `campaign`, or absent |

A campaign in the app has never been the campaign in the database. Syncing them
is not "add a protocol"; it is deciding what a cloud campaign **is**, and then
what happens to the campaigns people already have locally.

**This is the decision to make first.** Three options, with what each costs:

1. **The store's model wins.** Drop the four fixed territories, create rows from
   the local campaign on first sync, add `framework` and `perkSource` columns.
   Existing cloud campaigns — if any real ones exist — are migrated or
   discarded. Cleanest end state; needs a call on the existing rows.
2. **The database's model wins.** The app adopts four territories. Throws away
   the Carcass Front campaign and the twelve theatres. Not seriously proposed;
   listed so the option set is complete.
3. **Two kinds of campaign.** Local campaigns stay local; cloud campaigns are a
   separate, simpler thing. Avoids a migration and adds a permanent split the
   player has to understand. The worst of the three for the person using it.

Option 1 is the recommendation. It needs one answer from the maintainer: **are
there real cloud campaigns in production to preserve, or can those rows be
discarded?**

## Authority: who owns which field

From SYNC-1, and unchanged by the above.

| owned by | fields | why |
|---|---|---|
| **server** | membership, `inviteCode`, `adminId`, user identity | A client that could write its own membership could join any campaign. |
| **organiser** | campaign settings, territory house rules (`perk`, `perkSource: campaign`), turn number | One person decides the shape of the campaign; letting every member write it makes the last writer the organiser. |
| **player** | their own warband, their own post-battle results | Nobody else's client may write a player's roster. |
| **nobody** | `perkSource: published` perks | The book states these. Not writable by anyone — enforced in the store today and would be enforced server-side too. |

## The protocol

**Operations, not object PUTs.** A whole-campaign PUT means the last device to
speak wins and silently discards whatever the other one did. Each mutation is
an operation with a stable, client-generated `opId`.

**Idempotent.** The server records applied `opId`s and skips a repeat. This is
what makes a retry safe, and it is the property the deleted code lacked — it
called create on every attempt, which is how one campaign became several.

**Never create-as-update.** Explicit create, read and update. An "upsert by
name" is how two devices editing the same campaign produced two campaigns.

**Fetch before push, and stop if the fetch fails.** An offline device that
pushes blind overwrites a newer cloud copy with an older one. A fetch that
cannot be made is not permission to write.

**Conflicts compared on the player's edit version, not on arrival time.**
Server receipt order is a property of the network, not of the work. Each
syncable entity carries a monotonic `version`; an operation states the version
it was made against, and a mismatch is a conflict.

**Conflicts are shown, not resolved.** Two devices editing different fields
merge. Two editing the same field do not, and the app says so and asks —
`docs/DATABASE.md`'s rule that a wrong answer is worse than a visible question.

**Every operation re-checks policy.** A sync endpoint is not a trusted back
door: the same `requireCampaignAccess` a normal route uses, per operation.

### The shape

```
POST /api/campaigns/sync
  { campaignId, ops: [ { opId, kind, entityId, baseVersion, data } ] }

200 { applied: [opId], skipped: [opId], conflicts: [ { opId, server } ] }
409                        the campaign itself moved on; fetch and retry
```

`skipped` is a success: it means the server had already applied that `opId`.

### Client

The outbox in `src/services/sync.ts` already has the properties this needs —
queue before sending, clear only on acknowledgement, survive a reload — and is
keyed by warband id. Campaigns need the same, keyed by operation rather than by
entity, so two edits to one territory are two operations and not one
last-writer-wins blob.

## Tests this must pass before it ships

From SYNC-1, and none of them optional:

- two devices editing different fields of one campaign;
- two devices editing the same field;
- the same operation delivered twice;
- an edit made offline, then reconnected;
- a fetch that fails before a push — nothing is written;
- a non-member, a removed member, a wrong warband, and an organiser-only change
  attempted by a member;
- a browser test showing the pending, synced, conflict and failed states.

**Acceptance:** one logical campaign has one cloud identity; retries duplicate
neither rows nor match records; no acknowledged local edit is lost.

## Why this stops here

Everything above is derivable from the package and the code. The model
mismatch is not: it needs a product decision about existing data, and building
a protocol on top of an undecided data model would mean writing the migration
twice — the second time with real campaigns in it.
