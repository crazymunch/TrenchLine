# The roster-path layer

`src/data/generated/<ruleset>.rosterpaths.json` — what a BattleScribe roster
calls each of the things in the dataset.

Emitted by `npm run rules:build` from `data-sources/battlescribe/`, by the walk
in [`scripts/lib/newrecruit-paths.mjs`](../scripts/lib/newrecruit-paths.mjs).
Read through [`src/services/rosterPaths.ts`](../src/services/rosterPaths.ts).

This is the piece [`NEWRECRUIT-SPIKE.md`](NEWRECRUIT-SPIKE.md) recommended
before any exporter: *"carry the path"*. It exists whether or not the exporter
is ever written, because it is also the identity the importer needs to stop
guessing.

## The rule it encodes

A `.ros` selection is **not identified by a catalogue entry id.** It is
identified by the chain of `entryLink` ids traversed from the force root, with
the target entry's own id appended.

```
7c17-5f75-6fd9-73cf
  Jabirean Alchemist — a selectionEntry written in the catalogue, one segment

85cf-…::246b-…::c39d-…::fed6-…::46cb-…
  that Alchemist's Automatic Rifle — four entryLink ids (Weapons, Ranged
  Weapons, Ranged (Two-Handed), the rifle) then the shared entry, which lives
  in Ranged Weapons.cat and not in the Sultanate catalogue at all
```

And a selection's identity is **four** things, not one. A roster writes:

| attribute | what it is |
| --- | --- |
| `entryId` | the path to the thing itself |
| `entryGroupId` | the path to the group it was taken from, absent when taken from an entry |
| `group` | that group's name trail, verbatim — `Weapons::Ranged Weapons::Ranged (Two-Handed)` |
| `from` | `"group"` or `"entry"`, which an importer branches on |

All four are emitted, and all four are checked against a real `.ros`.

Two halves to the path rule, and both are load-bearing:

1. **Only link ids accumulate.** An entry's own id appears once, as the last
   segment of its own path, and lends nothing to what hangs below it — which is
   why `7c17` is absent from its own rifle's path.
2. **What a link element itself writes keeps the prefix the link was reached
   at.** A BattleScribe `entryLink` may carry its own `selectionEntries`:
   options that exist only at that placement. `Mamluk Faris` writes an
   `Assigned Sword` inside the link to the model, and the `Siege Jezzail` link
   writes its ammunition options inside itself. Their paths do **not** contain
   the link's id — a per-placement option is already unique and has nothing to
   disambiguate — though the roster still nests them under the target.

The consequence of (1) is the reason this file exists: **a weapon's roster
identity depends on the model carrying it and the group it was taken from.**
One weapon has many identities. `dataset.weapons` is a flat list with one id
each and cannot express that, and it is right not to try.

The consequence of (2) is that the three selections the spike measured as
unreachable — `Assigned Sword` and two `Alchemical Ammuntion (Loaded)` — are
reachable, and the walk now reproduces **all 95** of the fixture roster's
selections rather than 92.

### Groups are identified the same way, and reset at every entry

A `selectionEntryGroup` gets a path by the same rule: the prefix in force where
it sits, plus its own id. A group reached by a link contributes two ids — the
link and the group it targets — and one name, which is why the name trail is
routinely shallower than the id path:

```
Weapons::Ranged Weapons::Ranged (Two-Handed)        3 names
85cf-…::246b-…::c39d-…::3e28-…                      4 ids
```

**The trail resets at every entry boundary.** The options a model offers sit in
the model's own groups, never in the group the model itself was taken from.
Carrying the trail down leaked the parent's group into every child: the walk
produced `Variant Selection::Weapon Collections::New Antioch::…` where the file
says `Weapon Collections::New Antioch::…`.

## Shape

```jsonc
{
  "version": 1,
  "base": "Fawkstrot11/TrenchCrusade@1b463a8e…",   // the catalogue commit
  "system":     { "id", "name", "revision", "battleScribeVersion" },
  "catalogues": [{ "id", "name", "revision", "gameSystemId", "gameSystemRevision" }],

  // Every id used by every path, interned. A path is indices into this.
  "segments": ["7c17-5f75-6fd9-73cf", …],
  // The group name trails, written verbatim into a roster's `group` attribute.
  "groupNames": ["Weapons::Ranged Weapons::Ranged (Two-Handed)", …],

  "units": [{
    "entryId": "…",           // joins to dataset.units[].entryId
    "name": "Mamluk Faris",
    "factionId": "Iron Sultanate",
    "placements": [{
      "catalogueId": "…",
      "path":    [12, 34],    // the model's own selection
      "parents": [{ "path": [11], "name": "Mamluk Faris", "type": "unit" }],
      // Each item: where it is, which group it came from, and that group's
      // name. No `groupPath` means the roster writes from="entry".
      "carries": {
        "Trench Knife": [{ "path": [12, 40, 41], "groupPath": [12, 40, 44], "group": 7 }], …
      }
    }]
  }],

  // What a force hangs things off that is not a model — the warband Arsenal.
  "containers": [{ "name": "Pile of Stuff", "type", "catalogueId", "path", "carries" }],

  "variants": [{ "id", "entryId", "name", "catalogueId", "path" }],

  // Reported, never dropped. See below.
  "unmapped": [{ "kind": "unit" | "variant", "entryId", "name", "factionId", "why" }]
}
```

### Why a separate file

~3.0 MB per ruleset, against 2.7 MB for the dataset itself — **211 KB gzipped**,
which is what git actually stores. Only an exporter or an importer reads it, and
the app is used at a table on a phone; folding it into
`trenchline.generated.ts` would put every byte in the bundle for a feature
almost nobody uses there. `loadRosterPaths()` imports it dynamically, the same
way `app/api/dataset/route.ts` loads the dataset.

Paths are indices into `segments` because the ids are 19 characters each and
repeat constantly. Interning them roughly halves the file; interning whole
*selections* would not, because a path is the identity — of 15,389 selections
in the layer, 15,358 are distinct. The build writes it indented but with every
leaf on one line, so a changed path reads as a changed line in review.

### Placements, not a placement

A model has one entry in `units` and **one placement per route to it**. Six
Warband Variants place the `Scripture Guardian`, and they do not offer the same
armoury; the Iron Sultanate's Takwin Homunculus has two, one of them the
`Favoured` placement. Each is a different roster identity with a different
`carries`, so they are kept rather than collapsed.

`modelIdentity()` picks the placement resolving the most of the model's actual
gear. That is a choice between several *true* identities, which is why it is
allowed at all — it is not a guess at an unknown one.

### `parents` is not the path

`Mamluk Faris` is a `unit` entry whose only child is a link to the `model` that
carries the profile, and a real export writes **both** selections: the wrapper
`95cf-…`, and the model `4314-…::22b8-…` nested inside it. The wrapper is a
`selectionEntry`, so it contributes nothing to the path — the trail is the only
place it can be recorded. A generator that writes only the model produces a
file no importer reads back the same way.

### `carries` may hold several paths for one name

Normal, and the finding rather than a fault: the same Trench Knife can be taken
from two different groups under the same model, and those are two roster
identities. TrenchLine does not record which group a player took an item from,
so `itemPaths()` hands back the whole list and the caller decides — visibly.

## What has no path, and why

**The two Carcass Front factions.** Sixteen units and four Warband Variants,
listed in `unmapped` with the reason derived from the id itself: the supplement
is transcribed from the PDF by a layer that mints its own ids (`cf-entry-…`),
because no community catalogue carries it. A warband from either faction cannot
be exported as `.ros`, and per [`EXPORT-CODEX-REVIEW.md`](EXPORT-CODEX-REVIEW.md)
E4 that is a fatal error rather than a warning.

**A catalogue id no root can reach fails the build.** Not warned about —
failed. Either `npm run rules:fetch` moved the catalogues under us or the walk
has stopped holding, and both are findings.

**Campaign state and BattleScribe bookkeeping are deliberately absent.** Of the
fixture roster's 95 selections the layer names 81. The other fourteen are:

| | |
| --- | --- |
| skills, advancements, injuries | `Ranged Proficiency [7]`, `Assassinate [4]`, `Leg Wound [31]`, `Strength of Samson [8]`, `Lost Arm [26]`, `Skill & Expertise [7]` |
| bookkeeping the catalogues carry for BattleScribe's benefit | `I Understand 👍`, `Armour Storage`, `Equipment Storage`, `Alchemical Ammuntion (Loaded)` ×2 |
| roster-level selections | `Unleveraged Glory`, `The House of Wisdom` — held as `campaign` and `variants` |
| an exploration find, not armoury gear | `Sniper Scope` |

A generator writes those from where the dataset actually holds them. `carries`
is the wargear vocabulary — `weapons`, `unit.options`, `bundles`, `battlekit`
and the armoury rows — and nothing else.

## Matching

By catalogue entry id first, by name only where the dataset has no id to offer:
the six weapons with no `entryId`, both bundles, and the Battlekit chapter.

Name matching alone was measurably worse. Against the fixture it left every
Alchemical Formula, every Homunculus body part and every campaign advancement
without a path, because the dataset holds those as `unit.options` — which carry
catalogue ids — rather than as weapons.

## Checking it

```bash
npm run rules:build        # emits it, and fails on an unreachable catalogue id
npm run rules:newrecruit   # reports it against a real exported roster
```

Pinned by `scripts/__tests__/newrecruitPaths.test.mjs` (the walk) and
`src/services/__tests__/rosterPaths.test.ts` (the artefact that ships, against
the same roster). The assertion that matters most is that the layer never
offers a path the exported file disagrees with: a missing path is a reported
gap, and a wrong one is a roster that opens and is quietly not the warband.

## What this does not do

It does not write a `.ros`. The gate stays where
[`EXPORT-CODEX-REVIEW.md`](EXPORT-CODEX-REVIEW.md) E3 put it: **acceptance is
not "the file opens"** — it is open in NewRecruit, check every model, loadout
and cost, edit a selection, save, reopen, and find nothing lost or changed.
That needs a person with the app.
