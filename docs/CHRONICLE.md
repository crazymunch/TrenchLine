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

Where both exist they are linked by `campaignMatchId`, set when the
post-battle wizard commits — **on the side, one per roster** (FD-09b / RR-27).

## A game has as many post-battles as it has rosters

`BattleRecord.campaignMatchId` was one id for the WHOLE battle, and Play Mode
opened one wizard, for the active warband. So a second side — the player's own
other warband, or another user's in a hosted match — got no Trauma, no
Experience and no Exploration, and the record had nowhere to say whether it
ever would. The Chronicle had the game; the campaign had half of it.

`BattleSide.campaignMatchId` is that link, per side. A side without one has not
had its post-battle run, which is what both offers read:

- **Play Mode** asks as soon as the wizard closes — *"Another side fought this
  game"* — and keeps asking until every side with a roster on this device is
  linked, or the player declines.
- **The Campaign Hub** lists the rest under *Unresolved battles*, because
  declining is not the same as being finished, and a battle recorded on
  somebody else's device arrives here the same way.

A **placeholder** side is never offered: it has no roster, so there is no
Trauma to roll, no Experience to award and no Strongbox to pay.

`BattleSide.deployedUnitIds` rides with it. A post-battle run later cannot read
Play Mode's live state, and assuming the whole roster played would hand
Experience to models that sat the game out — *"each ELITE model that took part
in a game and survived"*.

**Both live on the SIDE rather than on the battle**, which is not where FD-09
put them: it specified `campaignMatchIds: Record<sideId, matchId>` on the
record. `Battle.sides` is a `Json` column, so a per-side fact reaches the cloud
inside the record it belongs to and needs no migration — where a new top-level
field would need a column of its own, and a per-side link that did not sync
would leave another device offering a post-battle already run here, and
counting it twice. Both fields had to be named in the battles API's `Side`
schema, which is `.strict()`: a client sending a field it does not list has its
whole battle rejected.

The old whole-battle field is still written where it is empty and reads as the
**primary** side's, so a record already in a Chronicle keeps its link rather
than reading as a battle nobody resolved.

> **This sentence was aspirational until 2026-09-20.** The field was declared
> on `BattleRecord`, carried in the cloud sync payload, accepted by the battles
> API schema and taken as an option by `battleFromMatch` — and **no caller
> passed it**, so it was absent on every record ever written. The two halves of
> one game were therefore unjoinable, and they disagreed: the Chronicle's
> result was measured off Victory Points, the campaign's was typed into a box
> that defaulted to Victory whatever the score. The Campaign Hub reads the
> second, the Chronicle the first, and neither knew the other existed. See
> RR-22 and RR-23 in the rules review.
>
> A link nothing populates is indistinguishable from no link, which is why
> `src/store/__tests__/battleMatchLink.test.ts` asserts the stamped id rather
> than the field's existence.

The post-battle wizard also **opens on the battle it follows**: the scenario,
the result read off the Victory Points, the opposing side's name and which
models were left in the Arsenal all come from the record written one line
earlier, via `rules/matchHandover.ts`. They seed the wizard and the player can
change any of them; what changed is that they no longer start at a fixed value
with the real answer sitting unread in the Chronicle.

## Three decisions worth knowing

**A record holds NAMES, not references.** Every side is stored with the name
it had on the night. Deleting a warband, or forgetting a placeholder opponent
months later, must not rewrite a battle it fought — the same rule the campaign
record already follows for `opponentWarbandName`.

**A Deed's text is copied in.** Descriptions come from the scenario in the
generated dataset, and that is rebuilt from upstream catalogues. A record
holding only a title would silently re-describe a past battle whenever the
wording changed upstream. What the players read on the night is what it keeps.

**A Deed names the model that performed it — `unitId`, with `unitName` beside
it.** The id is what the rules read: the book gives a model that performed at
least one Glorious Deed a second Experience Point (p.105), and `MatchHandover`
carries the ids so the post-battle step can award it without asking the player
to retype what the app watched them do. The name is what a person reads, and
it is copied for the same reason the description is — a model deleted from a
roster next season would otherwise leave an id that resolves to nothing. A
Deed with neither is the side's own, which the book allows.

**`turn` never held a turn.** `SideScore.completedDeeds` was a bare string,
its comment said it was the turn, and its only writer — Play Mode's performer
picker — wrote the model's name. `battleFromMatch` believed the comment, so
every record this app has written carries a name in `turn`, the Chronicle
printed *"— Bayt al-Nahas, turn Yüzbaşı Demir"*, and the battles API, whose
`turn` accepts eight characters, rejected any record naming somebody longer —
`Entire Warband`, the picker's own default, among them. `parseBattle` now
reads a non-numeric `turn` back into `unitName`, which is what it always was.

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
