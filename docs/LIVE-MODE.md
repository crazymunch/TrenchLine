# Live match mode

The last unbuilt row on the feature checklist, scoped in two stages. Stage one
is a **read-only mirror**; the full two-way version is stage two and is
deliberately not designed here beyond naming what it would cost.

Nothing below is built. This is the plan, written before the code, for the same
reason [`CAMPAIGN-SYNC.md`](CAMPAIGN-SYNC.md) was.

## Why not go straight to full live play

The temptation is to reuse campaign sync, because it exists and it works. It is
the wrong shape, and the mismatch is not subtle:

| | campaign sync | live match |
|---|---|---|
| write rate | a handful an evening | dozens a minute |
| latency budget | minutes — nobody notices | ~2s, or it feels broken |
| conflict resolution | **ask a human**, per `CAMPAIGN-SYNC.md` | impossible mid-activation |
| who is watching | one person, later | both players, now |
| transport | request/response | wants a push channel |

An ops-and-versions protocol answering "the other device changed this, what do
you want to do?" during someone's shooting phase is not a feature, it is an
interruption. Live play needs a different mechanism that happens to share a
database — so building it as an extension of the campaign outbox would produce
something that is bad at both jobs.

The second cost is infrastructure. **Vercel's serverless functions cannot hold
a websocket open.** Full live play therefore needs a realtime service (Pusher,
Ably, Supabase Realtime) or that slice moved off Vercel: a running bill, a new
dependency, and — since [`LEGAL.md`](LEGAL.md) — a company that would see live
game state, which makes it a **privacy-policy change** as well as an
architectural one.

Stage one needs none of that.

## Stage one: the read-only mirror

**One device is the table.** The player running the match owns the state, as
they do today; nothing about how they play changes. Other people in the
campaign can open the same match and *watch* it — the board as that device sees
it, a couple of seconds behind.

That covers the actual complaint ("my opponent wants to see the board without
leaning over the table", "the third player wants to follow the turn") without
covering simultaneous editing, which is the part that costs ten times as much.

### What is mirrored

The live state is small and already exists per model on `ActiveUnit`:

| field | type |
|---|---|
| `currentWounds` | number |
| `status` | `Active` / `Downed` / `Out of Action` |
| `bloodMarkers` | number |
| `blessingMarkers` | number, uncapped — see FEATURES.md on why the pools differ |
| `hasActedThisTurn` | boolean |

Plus `playTurn` at the match level, and the identity of the squad on the table.

That is a **snapshot**, not a stream of operations, and it should stay one. A
watcher does not need to know how the board reached its state, only what it is;
sending whole snapshots means a dropped update is repaired by the next one
rather than leaving the mirror permanently skewed. Ordering, replay and
idempotency — the hard parts of the campaign protocol — simply do not arise.

### Transport: polling, and no new vendor

The authoritative device `PUT`s its snapshot on change, coalesced to at most
one write every ~2s. Watchers `GET` it on the same cadence, conditionally
(`ETag`/`If-None-Match`), so a quiet table costs a 304.

Not elegant. It is, however, buildable on what already exists, adds no company
to the data path, and at a realistic scale — a handful of watchers per match —
costs a rounding error. If it turns out people use it, the polling loop is
exactly the seam a push channel replaces later without touching the model.

### Authorisation

Reuses `requireCampaignAccess(campaignId, 'member')` from
[`policy.ts`](../src/lib/api/policy.ts). A match belongs to a campaign; if you
are in the campaign you may watch it, and if you are not, you get a 404 — the
same not-403 rule the rest of the campaign routes follow, for the same
enumeration reason.

Only the authoritative device may write. That is the whole authority model, and
it is one line of the table in `CAMPAIGN-SYNC.md`: **the server owns
membership, the player owns their own board.**

### What stage one deliberately does not do

- **No two-way editing.** A watcher's screen is read-only and says so.
- **No handover.** If the authoritative device dies, the match is over as far
  as the mirror is concerned. Handing authority to another device is a
  conflict-resolution problem wearing a different hat.
- **No history.** The snapshot is the present. The chronicle and the match
  record already carry what happened.
- **No presence, typing indicators or cursors.** None of it is a tabletop.

### Done when

Two devices, one campaign, one match: the watcher shows a wound taken on the
other device within ~3 seconds, survives the watcher losing signal and coming
back, and cannot write anything. A non-member gets a 404.

## Stage two, if stage one earns it

Only worth starting once stage one has been used by real people in a real game
and the specific thing they wanted turns out to be simultaneous editing rather
than visibility. At that point the questions are:

1. **Which realtime service**, and it is a privacy-policy change either way.
2. **What conflicts actually look like** in practice — mostly they will be two
   people touching different models, which needs no resolution at all. That
   observation may make stage two much smaller than it looks from here.
3. **Whether authority moves or dissolves.** Per-model ownership (you edit your
   own warband's models, always) may sidestep the whole conflict question
   without a protocol.

Answering (2) and (3) needs data that only stage one can produce. That is the
argument for this order, and it is the whole argument.
