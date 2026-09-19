# Playing somebody whose warband is not in the app

You turn up, the other player has their list on paper or in another app, and
you still want the match scored and the result recorded against somebody. A
**placeholder opponent** is the smallest thing that makes that work.

`src/types/opponent.ts`, `src/rules/matchSides.ts`,
`src/store/slices/opponents.ts`, `src/components/play/OpponentPicker.tsx`.

## What one carries

| | |
| --- | --- |
| **faction** | picked from the app's real faction list, never typed |
| **name** | free text — the player, or their warband. May be blank |
| **models they field** | optional, and **never defaulted** |

And nothing else. There is no Ducat total and no roster, because a placeholder
is a record of who you played, not a second-hand copy of their list.

**The model count is absent rather than zero when nobody said.** A scenario
rule or a Deed that keys off warband size has to be able to tell "they did not
tell me" from "they field nothing", and `0` reads as the second while meaning
the first — the same distinction
[rule 2](../CLAUDE.md#2-never-invent-a-fallback) is about.

**A blank name is stored blank.** `opponentLabel` falls back to the faction at
the point of display, so the record says what the player actually typed.

## Its own list, and that is the design

A placeholder is **never** in `warbands`, and is stored under its own
`localStorage` key rather than beside the player's rosters.

That one decision is what makes it invisible to everything that should not see
it. The roster picker, the dashboard's warband count, the legality engine and
cloud sync all answer the question "what are the player's warbands" by reading
that list — so keeping placeholders out of it means **none of them needed
changing**, and none of them can later be changed in a way that lets one
through by accident.

A placeholder in `warbands` would be a roster with no models that the builder
would offer to recruit into, the validator would report as illegal, and sync
would push to the cloud as one of the player's own.

`src/store/__tests__/opponents.test.ts` holds that boundary at both places it
could leak — the store and the storage key.

## Scored, never controlled

A placeholder is a side you **score**; it is not a side you **run**.

Play Mode's entire control surface — the activation list, wounds, Blood and
Blessing markers — reads a side's `units`, and a placeholder has none. So:

- it appears in the match, holds Victory Points and can claim Glorious Deeds;
- it shows in the score bar and the turn tracker;
- its tab in the side switcher is **disabled**, and the viewed side falls
  through to the first one the player can actually play;
- its lobby card says *"No roster in the app"* rather than showing `0 / 0`
  deployed, which would read as a warband nobody mustered.

`isControllable` and `firstControllableId` in `rules/matchSides.ts` are where
that rule lives, so it is one decision rather than a condition repeated at
every read site.

## One resolver, not two shapes everywhere

A match is a list of ids. Some name a `Warband`, one may name a
`PlaceholderOpponent`, and `opp-` on the front of an id is what tells them
apart.

`matchSides(warbands, opponents, factionName)` returns a lookup from an id to a
uniform `MatchSide` — name, faction, units, `isPlaceholder`, `fieldStrength` —
so the twenty-odd read sites in `PlayModeView` ask for a side instead of each
learning about two lists. An id neither list has resolves to `undefined`, which
callers already guard; answering with a made-up side would put a nameless
player in the score bar.

## In the campaign record

`MatchRecord.opponentWarbandName` already existed as free text. Saved
opponents now appear as one-tap chips that fill it in.

**The record keeps the NAME, not a reference.** Forgetting an opponent months
later must not rewrite a battle you already fought, and a dangling id in a
historical record is worse than a name whose owner you no longer have saved.

## Two things this fixed on the way

**Play Mode opened with no warband in the match.** `matchWarbandIds` is seeded
by `useState`, which runs on the first render — and the store is deliberately
empty then, because `hydrateStore()` reads `localStorage` from a mount effect
to avoid a hydration mismatch (`store/init.ts`). So the seed was always `[]`
and the lobby said *"0 Warbands Linked"* with a roster sitting in storage. An
effect now fills an empty match once the store has one.

**"(YOU)" marked whatever was first in the list.** With the above, the first
side added to an empty match was labelled as the player — so an opponent added
before your own warband came up as *"Player 1 (YOU)"*. It now marks the side
being controlled.

## Checking it

`src/rules/__tests__/matchSides.test.ts` and
`src/store/__tests__/opponents.test.ts`, 21 tests.

Verified by sabotage, each failing only its own guard: writing opponents to the
warband key (1), minting a `wb-` id instead of `opp-` (1), letting a
placeholder be controlled (3), defaulting an unstated model count to zero (1).

Driven in the real app at 375px, as a phone: create an opponent, add them to a
match, start it. The lobby shows them as Player 2 with *"No roster in the app —
they field 12 models"*, the score bar gives them a VP counter, their switcher
tab is disabled, `tc_opponents_v1` holds the record and `tc_warbands_v1` is
untouched. No console errors.

The store test stubs `localStorage`, `window` and a one-method `document`
through `vi.hoisted` rather than adding jsdom: this project runs vitest with no
DOM environment, and `services/storage.ts` decides `isBrowser` once at import
time, so the globals have to exist before that module loads.
