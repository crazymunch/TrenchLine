# NewRecruit / BattleScribe export: spike findings

Package 5 of the [export brief](EXPORT-ARCHITECTURE-BRIEF.md) §3.2, run against
the gate Codex set in [E3](EXPORT-CODEX-REVIEW.md): *"an `entryId` count alone
is not evidence of interoperability."*

Run it yourself: `npm run rules:newrecruit`. Pinned by
`scripts/__tests__/newrecruitPaths.test.mjs` (the walk) and
`src/services/__tests__/rosterPaths.test.ts` (the layer that ships).

**Status: recommendation 1 is done; the generator is not.** No `.ros` is
written and nothing is wired into the export UI. The dataset now carries the
path — see [`ROSTER-PATHS.md`](ROSTER-PATHS.md) — and doing that work answered
the question this document left open. What follows is what the sources actually
say, measured rather than assumed; the numbers below are the ones as first
measured, with the corrections marked.

## The finding

A `.ros` selection is **not identified by a catalogue entry id.** It is
identified by the chain of `entryLink` ids traversed from the force root, with
the target entry's own id appended:

```
7c17-5f75-6fd9-73cf
  Jabirean Alchemist — a selectionEntry written in the catalogue, one segment

85cf-…::246b-…::c39d-…::fed6-…::46cb-…
  that Alchemist's Automatic Rifle — four entryLink ids (Weapons, Ranged
  Weapons, Ranged (Two-Handed), the rifle) then the shared entry, which lives
  in Ranged Weapons.cat and not in the Sultanate catalogue at all
```

**Only link ids accumulate.** An entry's own id appears once, as the last
segment of its own path, and lends nothing to what hangs below it — which is
why `7c17` is absent from its own rifle's path. Where a model is reached *by* a
link, that link does prefix its children: `Pile of Stuff` is `c0f8::c0cb`, and
its `Armour Storage` is `c0f8::b420`.

There is a second half to the rule, found later and recorded under *The three
it could not reach* below: what a link element **itself writes** keeps the
prefix the link was reached at, and does not inherit the link's own id.

The consequence is the whole finding: **a weapon's roster identity depends on
the model carrying it and the group it was taken from.** One weapon has many
identities. A flat list of weapons with one id each cannot express that, and a
flat list of weapons with one id each is exactly what `trenchline.generated.ts`
contains — `entryId` values containing `::`: **0**.

So the gap Codex identified is not the two missing `entryId`s. It is that the
dataset's *shape* was wrong for this purpose: the pipeline reads the tree and
then flattens it, and a roster file needs the tree. That is what the layer
described in [`ROSTER-PATHS.md`](ROSTER-PATHS.md) restores — alongside the
flat dataset rather than inside it, because the app on a phone does not need
it and an exporter does.

## What was measured

Against `data-sources/fixtures/al-qarn-rihla/04-august-1320d-CURRENT.json`, a
real warband exported by NewRecruit:

| Question | Answer |
| --- | --- |
| Selections in that roster | 95 |
| Whose every path segment exists somewhere in `data-sources/battlescribe/` | **95 (100%)** |
| Whose full path this repository can reconstruct | ~~92 (97%)~~ → **95 (100%)** |
| Whose identity the emitted layer can name | **81 (85%)** — the rest is campaign state and bookkeeping, listed in [`ROSTER-PATHS.md`](ROSTER-PATHS.md) |
| `entryId` values in the generated dataset containing a link path | **0**, and correctly so |

The first row is the important one. Nothing is missing from the catalogues; the
information is all in the repository already. Reconstruction is a walk, and
`scripts/lib/newrecruit-paths.mjs` is that walk: 115 roots, ~29,500 distinct
paths from ~1,100 entries, in about 350ms.

The ratio is the point — thirty thousand paths from eleven hundred entries,
because one weapon is reachable under many models by many routes and every
route is a different identity.

### The three it could not reach — cause found

`Alchemical Ammuntion (Loaded)` (twice, under different models — the
misspelling is the catalogue's) and `Assigned Sword`, all `selectionEntry`
nodes in `Iron Sultanate.cat`. This document recorded them as not a depth
problem — a bound of 6 reproduced 96%, 8 reproduced 97%, and 10 and 12
reproduced exactly what 8 did — with the cause not established.

**The cause is the second half of the path rule.** A BattleScribe `entryLink`
may carry its own `selectionEntries`, and those keep the prefix the link was
reached at rather than inheriting the link's id:

```
95cf-…                      Mamluk Faris, a `unit` entry
  4314-…::22b8-…              its model, reached by a link
    80f0-…                      Assigned Sword — written INSIDE link 4314,
                                so 4314 is not in its path, though the roster
                                still nests it under the model
```

The walk descended into what a link pointed at and never into what the link
itself declared, so those three had no path at any depth. With that fixed the
reproduction is **95 of 95**, and the rule is pinned in both directions:
`scripts/__tests__/newrecruitPaths.test.mjs` fails if a link's id starts
appearing in what the link writes, and fails if it stops appearing in what the
link points at.

### Two hazards for a generator

**Every catalogue declares a stale `gameSystemRevision`.** All eleven: the
system is revision 17, and the catalogues claim 1, 4, 6, 8, 10, 11, 13 and 16.
Not a slip in one file — the community catalogues do not keep that attribute
current, so an importer validating against it would reject files that are fine,
and a generator has to decide what to write there.

**Six weapons have no `entryId` at all**, up from the two Codex found:
`Blessings of Beelzebub`, `Regimental Kaşık`, `Gluttonous Arsenal`,
`Al-inbīq Kit`, `Alchemical Fire`, `Corrosive Ammunition`. The last four arrived
with the Dispatch work in #50 — they are published rules with no BattleScribe
counterpart, so they are not an omission to fix but a class the catalogues do
not carry. A roster using any of them cannot be exported, and per
[E4](EXPORT-CODEX-REVIEW.md) that is a fatal error, not a warning.

## What a `.ros` needs, from the sources

Confirmed by reading `Trench Crusade.gst`, the eleven catalogues and the
exported fixture:

- Namespace `http://www.battlescribe.net/schema/rosterSchema`,
  `battleScribeVersion="2.03"`.
- `gameSystemId="sys-4f3d-c5c9-7df1-ad01"`, `gameSystemName`,
  `gameSystemRevision` (see the hazard above).
- One `force` per warband, carrying `entryId`, `catalogueId`, `catalogueRevision`
  and `catalogueName`.
- Roster-instance ids **distinct from catalogue ids** — NewRecruit writes short
  random strings (`mdo9ba182itlfwu5jod`) against the catalogues' hyphenated
  quads.
- Nested `selection` elements with `entryId` (the path above), `entryGroupId`
  where taken from a group, `number`, `type` and `from`.
- `costs` per selection with the correct `typeId` — Ducats is
  `8d43-33fd-332d-17a6`.

## Recommendation

**Do not ship an exporter yet.** Two pieces of work, in order — the first is
now done, and it was the one that could not be skipped:

1. ~~**Carry the path.**~~ **Done.** `npm run rules:build` emits
   `src/data/generated/<ruleset>.rosterpaths.json`: an identity for every model,
   for everything it can carry, for the containers a warband hangs its Arsenal
   off and for every Warband Variant, plus a named list of what has no identity
   at all. Read through `src/services/rosterPaths.ts`. Shape, matching rules and
   the deliberate omissions are in [`ROSTER-PATHS.md`](ROSTER-PATHS.md).

   Two things it settled that this document had guessed at. A model can have
   several identities — six Warband Variants place the Scripture Guardian — so
   the layer carries one placement per route rather than one path per model.
   And a roster records `Mamluk Faris` as *two* nested selections, a `unit`
   wrapper and the `model` inside it, so each placement carries the trail it is
   nested in as well as its own path.

2. **Then the generator, behind E4's report.** Fatal on any unmapped model,
   weapon, upgrade or required option; warning on non-gameplay metadata;
   informational on preserved costs and revisions. Fatal disables the download
   and offers the TrenchLine file instead.

And the gate stays where Codex put it: **acceptance is not "the file opens".**
It is open in NewRecruit, check every model, loadout and cost, edit a selection,
save, reopen, and find nothing lost or changed. That needs a person with the
app. Until someone does it, this stays a spike.
