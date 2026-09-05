# Campaign sync — design

SYNC-1 in [`ENGINEERING-AUDIT-FOLLOWUP.md`](ENGINEERING-AUDIT-FOLLOWUP.md) says
"design before implementation". This is that design, and it stopped short of
code until a model mismatch the package did not anticipate had been decided —
that decision is recorded below, and the code followed it.

**Status: built.** The protocol, the endpoint, both queues, the store wiring,
the indicator, and — as of SYNC-2 — the way a campaign acquires a cloud
identity in the first place. See
[First publish](#first-publish-an-id-the-client-mints) below.

`storage.syncCampaignToCloud` is gone. It returned `{ ok: false, reason:
'server', detail: 'Campaign cloud sync is not implemented.' }` from six
fire-and-forget call sites that ignored the answer, and now that there is an
update path those calls are gone rather than pointed at it. Its replacement is
`storage.fetchCampaignFromCloud`, which is the fetch-before-push gate and
nothing else.

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

**Answered (Sep 2026): discarded.** No campaign is running; the rows are
example data. Option 1 it is, and the model mismatch is no longer a blocker.

### What that decision has built so far

`20260905021934_campaign_sync_expand`, purely additive, so old code serving a
request mid-rollout ignores columns it does not select:

| | | |
|---|---|---|
| `Campaign.framework` | nullable | `classic` or `carcass-front`; the database had no concept of one |
| `Campaign.houseRules` | nullable JSON | mirrors the client's `CampaignHouseRules` |
| `Campaign.version` | default 1 | monotonic; conflicts compare the version an edit was MADE against |
| `TerritoryNode.perkSource` | nullable | `published` / `campaign`; a published perk is writable by nobody |
| `TerritoryNode.version` | default 1 | as above |
| `CampaignSyncOp` | new table | `opId` is the primary key, so a repeat is a constraint violation rather than a second write |

**The discard is a script, not a migration.** `scripts/clear-example-campaigns.mjs`
reports by default and deletes only with `--yes`. A migration runs on every
deploy, in every environment, with nobody watching, and "these rows are example
data" is a fact about one database at one moment — so the schema change ships
alone and discarding data stays a deliberate act somebody reads the output of.

The script will not delete a campaign that has been **played**, whatever its
territories look like: the example shape is necessary but not sufficient, and a
match record means someone used it. That rule is tested rather than trusted to
the maintainer's confirmation staying true —
`scripts/__tests__/clearExampleCampaigns.test.mjs`.

`POST /api/campaigns/sync` is built, with three operation kinds — the ones the
app actually performs today:

| kind | who | writes |
|---|---|---|
| `campaign.settings` | organiser | name, turn, game, budgets, framework, house rules |
| `territory.perk` | organiser | `perk` + `perkSource`, refused on a published one |
| `territory.claim` | member | the controlling warband, named from the membership |

**What no operation can touch:** membership, `inviteCode`, `adminId`, user
identity. The enforcement is that no op *kind* exists for them — a filter can
be forgotten, a missing case cannot be used.

Two implementation choices the tests pin, both of which sound like details and
are not:

- **The `CampaignSyncOp` record is written inside the same transaction as the
  change**, and first. A crash between the two would otherwise leave one
  without the other, and idempotency that holds only when nothing goes wrong
  is not idempotency.
- **A conflict throws, so the transaction rolls back.** Returning it would
  commit the op record for an operation that changed nothing — and the
  client's retry, after merging, would then be skipped as a duplicate and the
  merged edit lost silently. That is the worst failure this protocol can have.

`src/services/campaignSync.ts` is the client half. It is a queue of
**operations**, not of entities: the warband outbox holds one entry per
warband id because a warband is pushed whole and only its last state matters,
and a campaign cannot work that way — two edits to one territory are two facts,
and an entity-keyed queue collapses them into a last-writer-wins blob before
the request is even made.

- The `opId` is minted once, when the edit is made, and reused on every retry.
  An id per attempt makes each retry a new operation, which is the bug.
- `applied` and `skipped` both clear the queue. `skipped` is the retry working.
- **Conflicts stay queued** and are handed back for the app to show.
- A failed request clears nothing: "the server said no" and "the server was not
  reached" are different, and only the first is an answer.

The store's campaign mutations enqueue operations, and the campaign hub shows
the result — `components/campaign/CampaignSyncStatus.tsx`, which is the warband
indicator's five states plus `conflict`. A warband is pushed WHOLE, so the last
writer wins by design and there is nothing to conflict about; a campaign is
pushed as operations against a version, so "somebody else changed this first"
is a real outcome that is neither a success nor a failure.

Three things about the client that are easy to get wrong, and are tested:

- **The local version moves when an operation is QUEUED, not when it is
  acknowledged.** An applied operation leaves the entity at exactly
  `baseVersion + 1` — that is the update's own `where` — so two edits to one
  territory made before either is pushed can state 4 and 5 rather than 4 and 4.
  Without that, the second conflicts with the first: the device disagreeing
  with itself over an edit nobody else touched.
- **`pending` never covers a conflict or a failure.** Both say WHY the queue is
  not draining, and "2 to upload" in their place says the upload is merely
  waiting when the app already knows better.
- **Resolving a conflict adopts the server's value AND clears the operation, or
  does neither.** Dropping the operation alone would leave the player looking
  at their own text with nothing queued to send it — a silent divergence, which
  is what this protocol exists to remove. A payload the client cannot parse
  resolves nothing and stays on screen.

The only resolution offered is *take the campaign's copy*. "Keep mine" means
re-issuing an edit over somebody else's, which is a decision with a person on
the other end of it, and it is not offered until there is a screen that says
whose change it overwrites.

### First publish: an id the client mints

`createCampaign` mints `camp-<timestamp>` locally, and always has. That is not
an id the API would recognise, so before SYNC-2 **no campaign in the app could
sync**: every one was local, the outbox had nowhere to push, and the indicator
said "On this device" forever.

`POST /api/campaigns` with `action: 'publish'` closes it. One request carries
the campaign and its whole map — twelve theatres or 32 published Carcass Front
zones — and everything after it is an operation.

**The id comes from the client.** That is the decision, and it follows from the
same property `opId` already turns on: publishing has to be idempotent. If the
response is lost — the tab closes, the signal drops after the write lands — the
retry must name the same campaign or it makes a second one. A server-assigned
id cannot give that, because the client has nothing to retry *with*; and
"upsert by name" is how two devices editing one campaign produced two.

So `Campaign.id` is a `crypto.randomUUID` the device mints, and it is **saved
before the request goes out**. Minting it after a successful response would
make every failure ambiguous: the client could not ask "did that land?", only
try again and hope. The cost is that an unconfirmed `cloudId` may briefly queue
operations against a row the server has not got yet — they fail as `server`
errors and stay queued, which is what the outbox is for. The alternative is a
duplicate campaign, which nothing can repair.

A uuid rather than free text, because a client-supplied primary key can always
be aimed at a row that already exists. Doing so gets a **409 and nothing else**:
not the campaign's name, not its size, not a 403-versus-404 distinction, since
any of those would turn a guessed id into a membership oracle. When the id IS
the caller's own, the existing campaign comes back untouched with
`alreadyPublished: true` — a retry that re-wrote the row would undo every edit
made between the two attempts, which is "last writer wins" arriving through the
one door the protocol had not guarded.

**Territory ids are minted the same way, and carry the local id beside them.**
`TerritoryNode.id` is a client-minted uuid; `TerritoryNode.localId` holds the
`wt-*`, `th-*` or `cf-<slug>` the device knows it by, under
`@@unique([campaignId, localId])`. The local ids are stable and meaningful —
`cf-<slug>` is derived from the published zone name — but they are the same
string in every campaign that uses that map, so they cannot be the primary key.
Carrying both is what lets a later `territory.perk` operation name a territory
without the client keeping a server-id mapping, and the constraint is what
makes that join single-valued rather than merely likely.

The map is stored **as the client holds it**. Not merged with the four fixed
`STARTING_TERRITORIES` the `create` action still builds, and not topped up to a
minimum: a campaign that has been played on a device has the map it has, and
adding territories nobody put there would be the app inventing part of
somebody's campaign.

`perkSource: 'published'` is accepted here and nowhere else. The authority
table below says a published perk is writable by nobody and the sync route
refuses one — but a Carcass Front map legitimately arrives carrying the book's
own Outpost Bonuses, and this is the single moment they are written. Refusing
them here would mean publishing that campaign silently dropped half its map.

**Publishing is an explicit press**, offered by the indicator while a campaign
is local, not something the first edit does quietly. It mints an invite code
and puts a group's map on a server, and local-only play is supported everywhere
else in this app — so it is the organiser's decision rather than a side effect
of naming a campaign.

Tested in `src/app/api/campaigns/__tests__/publish.integration.test.ts` against
a real migrated Postgres, and in `src/store/__tests__/campaignPublish.test.ts`
for the client half. The two properties that matter were each proved by
breaking them: dropping the owner check makes the 409 leak Alice's campaign to
Bob, and minting the id after the response instead of before fails three tests
at once.

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

**Idempotent, and a violation of the key is read rather than assumed.** The
server records applied `opId`s and skips a repeat.

`opId` is the primary key GLOBALLY, not per campaign, and the route originally
answered `skipped` to every violation of it without looking at what it had
collided with. So an id already spent in one campaign made the next campaign's
operation report as an already-applied retry — and `skipped` clears the
client's outbox exactly as `applied` does, so the edit was dropped on the
device as well as never written on the server, and the sync reported success.
It is the same failure the version-conflict path is careful to avoid, arriving
by a different door. Found by the Codex reviewer, in September 2026.

The prior record is now read and compared: **same campaign, same kind, same
actor** is a redelivery and is skipped. Anything else is an id that has been
reused, which the server cannot repair — so it comes back as a **conflict**
with `reason: 'op-id-reused'`, because conflicts are the outcome the client
does NOT clear from its outbox. `server` is null on that conflict: there is no
server copy of the entity to merge against, because the operation never ran.

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

200 { applied: [opId], skipped: [opId],
      conflicts: [ { opId, server, reason? } ] }
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
- a browser test showing the pending, synced, conflict and failed states —
  `e2e/campaignSync.spec.ts`, all three viewports.

All of these now exist. The endpoint's are integration tests against a real
database (`src/app/api/campaigns/__tests__/sync.integration.test.ts`), the
queue's and the store's are unit tests (`services/__tests__/campaignSync.test.ts`,
`store/__tests__/campaignOutboxWiring.test.ts`,
`store/__tests__/campaignSyncStates.test.ts`), and the browser test mocks the
server at the network boundary — it is a test of what the app does with each
answer, and the answers themselves are pinned by the integration tests.

**Acceptance:** one logical campaign has one cloud identity; retries duplicate
neither rows nor match records; no acknowledged local edit is lost.

## Why the design came first

The protocol above is derivable from the package and the code. The model
mismatch was not: it needed a product decision about existing data, and
building on an undecided data model would have meant writing the migration
twice — the second time with real campaigns in it. The answer came back
"discard, they are example data", and everything since has been built on it.

The same reasoning is why the cloud-identity gap is written down rather than
guessed at. Territory ids are a schema decision with a migration behind it, and
a client that assumed one shape would have to be rewritten when the other was
chosen.
