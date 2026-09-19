# The Chronicle of Battles

What a finished match leaves behind.

`src/types/battle.ts`, `src/rules/battleFromMatch.ts`,
`src/components/chronicle/ChronicleView.tsx`, at `/chronicle`.

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

## Known gaps

- **Device-local.** Records live in `localStorage` and do not sync. The
  campaign half already syncs; this does not.
- **Casualties and injuries are not in the record.** Those are applied to the
  warband by the post-battle wizard, so they are recoverable from the roster
  rather than lost — but the battle itself does not list them.

## Checking it

`src/rules/__tests__/battleFromMatch.test.ts` — 17 tests over what is kept,
what is derived and what a damaged record does. Plus an e2e that plays a
match, ends it, and finds it in the Chronicle with its side and score.
