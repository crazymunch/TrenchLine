# NewRecruit / BattleScribe export: spike findings

Package 5 of the [export brief](EXPORT-ARCHITECTURE-BRIEF.md) §3.2, run against
the gate Codex set in [E3](EXPORT-CODEX-REVIEW.md): *"an `entryId` count alone
is not evidence of interoperability."*

Run it yourself: `npm run rules:newrecruit`. Pinned by
`scripts/__tests__/newrecruitPaths.test.mjs`.

**Status: not built, and now for a specific reason.** No `.ros` is written and
nothing is wired into the export UI. What follows is what the sources actually
say, measured rather than assumed.

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

The consequence is the whole finding: **a weapon's roster identity depends on
the model carrying it and the group it was taken from.** One weapon has many
identities. A flat list of weapons with one id each cannot express that, and a
flat list of weapons with one id each is exactly what `trenchline.generated.ts`
contains — `entryId` values containing `::`: **0**.

So the gap Codex identified is not the two missing `entryId`s. It is that the
dataset's *shape* is wrong for this purpose: the pipeline reads the tree and
then flattens it, and a roster file needs the tree.

## What was measured

Against `data-sources/fixtures/al-qarn-rihla/04-august-1320d-CURRENT.json`, a
real warband exported by NewRecruit:

| Question | Answer |
| --- | --- |
| Selections in that roster | 95 |
| Whose every path segment exists somewhere in `data-sources/battlescribe/` | **95 (100%)** |
| Whose full path this repository can reconstruct | **92 (97%)** |
| `entryId` values in the generated dataset containing a link path | **0** |

The first row is the important one. Nothing is missing from the catalogues; the
information is all in the repository already. Reconstruction is a walk, and
`scripts/lib/newrecruit-paths.mjs` is that walk: 115 roots, ~26,000 distinct
paths from ~1,100 entries, in about 250ms.

The ratio is the point — twenty-six thousand paths from eleven hundred entries,
because one weapon is reachable under many models by many routes and every
route is a different identity.

### The three it cannot reach

`Alchemical Ammuntion (Loaded)` (twice, under different models — the misspelling
is the catalogue's) and `Assigned Sword`, all `selectionEntry` nodes in
`Iron Sultanate.cat`. **Not a depth problem**: a bound of 6 reproduces 96%, 8
reproduces 97%, and 10 and 12 reproduce exactly what 8 does. Cause not
established. Anyone continuing this should start there.

### Two hazards for a generator

**Every catalogue declares a stale `gameSystemRevision`.** All eleven: the
system is revision 17, and the catalogues claim 1, 4, 6, 8, 10, 11, 13 and 16.
Not a slip in one file — the community catalogues do not keep that attribute
current, so an importer validating against it would reject files that are fine,
and a generator has to decide what to write there.

**Six weapons now have no `entryId` at all**, up from the two Codex found:
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

**Do not ship an exporter yet, and do not ship one at all on the current
dataset shape.** Two pieces of work, in order:

1. **Carry the path.** Have `rules-build.mjs` emit, per unit, the link paths for
   the unit and for each thing it can carry. `scripts/lib/newrecruit-paths.mjs`
   already computes them; the work is deciding where they live in the dataset
   and keeping them provenanced like everything else. This is the piece that
   makes an exporter possible, and it is worth doing whether or not the exporter
   is ever written — it is the identity Codex asked for in E3, and it would also
   let the importer stop guessing.

2. **Then the generator, behind E4's report.** Fatal on any unmapped model,
   weapon, upgrade or required option; warning on non-gameplay metadata;
   informational on preserved costs and revisions. Fatal disables the download
   and offers the TrenchLine file instead.

And the gate stays where Codex put it: **acceptance is not "the file opens".**
It is open in NewRecruit, check every model, loadout and cost, edit a selection,
save, reopen, and find nothing lost or changed. That needs a person with the
app. Until someone does it, this stays a spike.
