# The Chronicle of Battles

What a finished match leaves behind.

`src/types/battle.ts`, `src/rules/battleFromMatch.ts`,
`src/components/chronicle/ChronicleView.tsx`, at `/chronicle`. The cloud half
is `src/services/battleSync.ts` and `src/app/api/battles/route.ts`.

## What was being thrown away

Play Mode tracked a great deal during a game and discarded almost all of it
when the match ended. The campaign's `MatchRecord` kept a date, a scenario, a
narrative, an MVP — and **exactly one participant, the player's own warband**.

In a four-side game, three of them left no trace at all. Nor did any score,
any per-turn history, or any attribution of a Glorious Deed. A one-off game
outside a campaign recorded nothing whatsoever.

## A separate record, not a wider `MatchRecord`

`BattleRecord` is deliberately its own thing:

- a battle happens **whether or not there is a campaign**;
- `MatchRecord` is campaign-scoped and goes through cloud sync, so widening it
  puts new fields into a protocol that already has a merge rule to respect;
- they answer different questions. `MatchRecord` says what a battle did to a
  campaign. `BattleRecord` says what happened in it.

Where both exist they are linked by `campaignMatchId`.

## Three decisions worth knowing

**A record holds NAMES, not references.** Every side is stored with the name
it had on the night. Deleting a warband, or forgetting a placeholder opponent
months later, must not rewrite a battle it fought — the same rule the campaign
record already follows for `opponentWarbandName`.

**A Deed's text is copied in.** Descriptions come from the scenario in the
generated dataset, and that is rebuilt from upstream catalogues. A record
holding only a title would silently re-describe a past battle whenever the
wording changed upstream. What the players read on the night is what it keeps.

**No result is stored.** `victors()` derives it from the scores when something
needs to show it. A stored "win" would assert an outcome the table may have
reached on other grounds, and would be wrong forever once written. It returns
a *list*, because a coalition victory has two and a draw has none — picking
one would invent a result nobody reached.

## When a record is written

On **End Match**, before the post-battle wizard opens — the wizard is
campaign-only, and the battle happened either way.

**Never on Abort Match.** Abort means the game did not happen, and it is also
what clears the saved in-progress match
([`store/init.ts`](../src/store/init.ts) and `rules/matchState.ts`). That is
the only way to discard a battle mid-flight, and it is deliberate: a chronicle
you can revise is a chronicle nobody trusts. A written record can be forgotten
one at a time from the view, with a confirm.

## Reaching it

Desktop sidebar, and `/chronicle` on any device. On a phone it is behind the
bottom bar's **More** button, with Roster Directory — the bar is a hard five at
375px, so its fifth slot is a door rather than a sixth destination. The
reasoning is in [MOBILE.md §6c](MOBILE.md#6c-the-phone-bar-is-five-slots-and-the-fifth-is-a-door).

## In the cloud (CHRON-2)

A record used to live in the `localStorage` of the ONE device that ran the
tracker. That is the wrong place for it twice over: in a 2v2 the other three
players fought the same game and had no record of it at all, and the recording
device losing its browser storage lost the lot.

So a battle is pushed to `/api/battles` when the match ends, and the Chronicle
merges what the cloud returns with what the device holds.

### Who can read one

| Reader | Sees |
|---|---|
| The recorder | Their own battles, at any visibility |
| A player whose warband fought | That battle, unless it is `PRIVATE` |
| A member of the campaign | Its battles, unless they are `PRIVATE` |
| Anyone signed in | `PUBLIC` battles |
| Signed out | 401 — the Chronicle is local-only, which is a supported way to play |

Participation is resolved **server-side from warband ownership**, never from
the request body (`BattleParticipant`). A client that could name the
participants could name anyone, and putting a battle in a stranger's Chronicle
is a write to their account by someone else.

`PUBLIC` exists in the enum and the route honours it, but **nothing in the UI
sets it**. trenchline.app is still in Safe Browsing review, and a feed of
user-authored titles and free text readable by anyone is the last thing to turn
on while that is open. The column costs nothing now and saves a migration when
it clears.

### Why this is not the campaign sync protocol

`campaigns/sync` takes versioned operations, detects conflicts and hands them to
a human. That machinery exists because a roster is edited, repeatedly, from more
than one device.

A battle record is **written once and never edited** — the rule the whole
Chronicle is built on. With one writer and no edits there is no conflict to
detect, so there is no version column, no merge, no operation log and nobody to
ask. A repeat write of the same id is the same battle arriving twice, and the
primary key says so, which is what makes a retry safe on a phone that lost its
signal mid-write.

### Local first, and never a silent fallback

The local write happens before the push and is never undone by it: a phone at a
club with no signal must still be able to end a match and keep what happened.
The push is fire-and-forget for the same reason — holding the post-battle
wizard behind a network round trip would make a lost signal look like the app
hanging at the moment everyone is waiting on it.

Nothing records whether a push landed. The Chronicle works it out by comparing
what it holds against what the server returns, which cannot go stale the way a
stored flag can; a local battle the server does not know is offered a **share**
button. And a failed fetch is reported as a failure — `{ ok: false, failure }`,
rendered as a sentence — never as an empty list. "The cloud has no battles for
you" and "the cloud could not be reached" are different facts and only one of
them is an answer (rule 2; `services/githubSync.ts` is the shipped example of
getting this wrong).

### Deleting

The recorder only, and both copies at once. Forgetting a battle locally while
leaving it in the cloud brings it back on the next load, which reads as the app
refusing to obey. A battle you fought in but did not record shows no forget
button at all: it is the same game the other players are looking at, and it is
not yours to delete.

## Known gaps

- **No public feed.** `PUBLIC` is in the schema and unreachable from the UI
  until the Safe Browsing review closes.
- **The forget button follows the DEVICE, not the account.** A battle you
  recorded on another device arrives here as a cloud record, so it shows no
  forget button even though the server would allow you to delete it. Honest
  rather than wrong — it says who recorded it — but it is one place where the
  view knows less than the server does.
- **A one-off game between strangers is not shared.** Sharing reaches campaign
  members and warbands this service knows. A placeholder opponent has no
  account by definition, so a pick-up game against someone who does not use
  the app is recorded on one device, as it was before.
- **Casualties and injuries are not in the record.** Those are applied to the
  warband by the post-battle wizard, so they are recoverable from the roster
  rather than lost — but the battle itself does not list them.

## Checking it

`src/rules/__tests__/battleFromMatch.test.ts` — 17 tests over what is kept,
what is derived and what a damaged record does.

`src/services/__tests__/battleSync.test.ts` — 16 over the cloud half, and the
first of them is the one that matters: a failed read is a failure, never an
empty Chronicle.

Plus an e2e that plays a match, ends it, and finds it in the Chronicle with its
side and score.
