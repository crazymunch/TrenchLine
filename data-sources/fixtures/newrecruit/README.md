# NewRecruit export fixtures

Real exports of the maintainer's *Al-Qarn Rihla* (Iron Sultanate, House of
Wisdom variant, August, 1320 Ducats / 6 Glory), supplied 6 September 2026 so
that `docs/EXPORT-ARCHITECTURE-BRIEF.md` §3.2 could be written from files
rather than from inference.

| File | What it is |
|---|---|
| `al-qarn-rihla-august.rosz` | What NewRecruit downloads: a **zip containing one `.ros`**, nothing else |
| `al-qarn-rihla-august.ros` | The XML, extracted for diffing and grepping |
| `al-qarn-rihla-august.json` | NewRecruit's JSON export — the same tree under a `roster` key |
| `al-qarn-rihla-august-print.pdf` | Its "Pretty" print output, the reference for our own pretty mode |

## What these settled

**The identity chain matches ours exactly.** Same game system
(`sys-4f3d-c5c9-7df1-ad01`, revision 17), same Iron Sultanate catalogue
(`72ab-daa4-80ee-e9a5`, revision 14), same cost type ids (Ducats
`8d43-33fd-332d-17a6`, Glory Points `f3bb-a7e6-d476-f60b`). So this is not a
different catalogue lineage: it is the same data we pin, and drift is not the
obstacle.

**`entryId` in a roster is often a PATH, not an id.** This is the finding that
matters, and it is why an `entryId` coverage percentage was never evidence of
interoperability. Of 89 distinct `entryId` values in this roster, only 19 are
plain ids; the other 70 are `::`-delimited link paths naming the chain of
groups and links by which an entry was reached:

```
661a-86b4-4508-5b8a::4415-3370-1198-6328::b74f-c179-3cc8-453a::…::8ad7-a2d8-fa56-0a09
   Sword/Axe, from group "Weapons::Melee Weapons::Melee (One-Handed)"
```

The same shared definition placed in two different groups therefore carries two
different `entryId` values. An exporter that emits a bare catalogue id where the
roster format expects a path is emitting something structurally wrong, however
correct the id is.

**Current resolution against our dataset: 58 of 89.** 50 resolve on the last
path segment, 8 on the first, and 31 do not resolve at all — mostly Battlekit,
Armour, Alchemical Formulae and campaign Injuries, which our dataset holds in
`armouries[].rows` and unit options rather than as entries carrying an
`entryId`. Recording the link *path*, not just the leaf id, is the work §3.2
needs.

## What they do NOT settle

Whether NewRecruit will **accept a file we generate**. These prove the shape of
what it writes; they prove nothing about what its parser will read back. That
needs the round trip only the maintainer can run: export from TrenchLine, open
in NewRecruit, check every model, loadout and cost, then **edit a selection,
save and reopen**. A file can open and still be unusable.

## Provenance and handling

Supplied by the maintainer from their own account, for their own warband, for
this purpose. `al-qarn-rihla-august.json` and the `.ros` embed full rules text
copied out of the community catalogues; they are here as test input, not as a
source the pipeline may derive from. Rule 1 still applies — game data comes
from `data-sources/battlescribe/` and the rulebooks, never from a roster file.
