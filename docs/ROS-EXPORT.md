# Exporting a `.ros`

Writing a warband as a BattleScribe / NewRecruit roster.

`src/services/rosterRos.ts`, behind the compatibility report
[`EXPORT-CODEX-REVIEW.md`](EXPORT-CODEX-REVIEW.md) E4 asked for. Identity comes
from the layer described in [`ROSTER-PATHS.md`](ROSTER-PATHS.md); this module
adds structure, quantity and price and nothing else.

**The format is a candidate.** No file this exporter wrote has been opened in
NewRecruit. The acceptance gate is unchanged and is not something code can
clear — see [Acceptance](#acceptance) at the end.

## The report comes first

Three levels, and only one of them stops anything:

| level | means | effect |
| --- | --- | --- |
| **fatal** | something in this warband has no BattleScribe identity | no file is written at all |
| **warning** | a real difference between this file and what NewRecruit writes | shown, does not block |
| **informational** | what was preserved, and where it came from | shown, does not block |

A fatal finding is not a warning with a stronger colour. A roster missing a
model or a weapon is not a roster of this warband, and offering it as one is
worse than offering nothing — so `toRos` throws as a backstop even if a caller
ignores the report, and the UI offers the TrenchLine file instead.

Fatal on:

- a model the roster-path layer cannot name (both Carcass Front factions, and
  anything a catalogue refresh moves out from under us);
- gear the catalogues do not offer *that model*, since a weapon's identity
  depends on who is carrying it;
- a warband with nothing living in it;
- no catalogue derivable from the models.

## What it writes

```xml
<roster id name battleScribeVersion="2.03" generatedBy="TrenchLine"
        gameSystemId gameSystemName gameSystemRevision
        xmlns="http://www.battlescribe.net/schema/rosterSchema">
  <costs>…Ducats, Glory Points…</costs>
  <forces>
    <force id name entryId catalogueId catalogueRevision catalogueName customName>
      <selections>
        <selection id name entryId [entryGroupId] number type from [group] [customName]>
          <selections>…</selections>
          <costs>…</costs>
        </selection>
```

### Decisions worth knowing

**`gameSystemRevision` is the system's, not a catalogue's.** All eleven
catalogues declare a stale one — they claim 1, 4, 6, 8, 10, 11, 13 and 16
against a system on 17. Quoting any of them would name a revision current for
nobody. NewRecruit writes 17 and so does this.

**Instance ids are derived, not random.** NewRecruit writes short random
strings. These are a hash of the warband, so exporting the same warband twice
produces the same bytes — a re-export is a re-export and not a new roster, and a
test can compare against it. They begin `tl` and carry no hyphen, so they cannot
collide with a catalogue id (four hyphenated hex quads).

**A model is written under the catalogue's name for its entry, not the roster's
own.** A roster's `name` is what modifiers made of it: the Iron Sultanate's
`Azeb` is written by NewRecruit as `Kavass`, and a promoted one as
`Favoured Kavass`, all three being entry `0e7e-9167-f044-9493`. This exporter
does not evaluate rename modifiers, so it writes `Azeb` and puts the player's
own name in `customName`, where it belongs.

**A model reached through a wrapper is written inside it.** `Mamluk Faris` is a
`unit` entry whose only child is a link to the `model` carrying the profile, and
a real export writes both selections. A file with only the inner one is not read
back the same way.

**Both currencies, on every selection.** Trench Crusade prices in Ducats and
Glory, and an item's `cost` field carries only the first — 32 armoury rows are
priced in Glory, and reading `cost` alone writes every one of them into the
roster as free. No zero-valued cost is written at all, as in a real export.

**The force's catalogue is derived from the models, not from the faction's
name.** Four of the dataset's eight faction names are spelled exactly as a
catalogue is (`Iron Sultanate`) and four are not (`Heretic Legions` against
`Heretic Legion`, `Cult of the Black Grail` against `Black Grail`). Matching on
the name would have been a guess, and wrong half the time.

**Where a model can reach one item two ways, the first is written and the report
says so.** TrenchLine does not record which armoury group a player took an item
from, so there is a real choice to make between several *true* identities.
Making it silently is how an export becomes subtly not the warband.

## What it deliberately does not write

A real NewRecruit export of a thirteen-model warband is 132 KB, and most of that
is `<profile>`, `<rule>` and `<category>` elements copied out of the catalogues.
Every one is derived: the importing app has the catalogues and regenerates them
from the entry each selection points at. Copying them in would mean this module
holding a second opinion about statlines, which is exactly the failure
[`AUDIT.md`](AUDIT.md) records — 97% of the app's statlines wrong because they
were written twice.

So the file carries identity, quantity and cost, and nothing it would be
guessing at. **This is the largest untested assumption in the package**, it is
reported as a warning on every export, and it is the first thing to check when
somebody opens one of these files.

`costLimits` is also absent. TrenchLine's Threshold is a campaign measure, not a
muster budget, and writing it as one would be a claim nobody made.

## What a warband can hold that a `.ros` cannot say

Measured against the real thirteen-model campaign warband in
`data-sources/fixtures/newrecruit/`. Nine of its 95 selections have no place in
the layer's wargear vocabulary, and not one is an oversight:

| | |
| --- | --- |
| `Ranged Proficiency [7]`, `Assassinate [4]`, `Skill & Expertise [7]`, `Strength of Samson [8]` | campaign advancements and skills, held in the campaign tables |
| `Leg Wound [31]`, `Lost Arm [26]` | injuries, likewise |
| `Alchemical Ammuntion (Loaded)` | a BattleScribe counter — a hidden entry a modifier increments, which a player cannot choose |
| `Sniper Scope` | an exploration find from `Campaign Rules.cat` |
| `Fierce Lion` | an ability, not armoury gear |

A model carrying one of these is **fatal**, not silently short. Whether the
campaign half should be written at all is an open question: a `.ros` can express
it, TrenchLine holds it somewhere else, and nobody has asked for it yet.

## Checking it

`src/services/__tests__/rosterRos.test.ts` rebuilds that warband from the
`.ros` NewRecruit wrote, exports it again, and holds the two files against each
other: every selection this exporter emits must agree with NewRecruit's on
`entryId`, `entryGroupId`, `group` and `from`.

It rebuilds rather than using `importNewRecruitRoster`, and the reason was a
finding in itself: the importer matched models by NAME, and a roster's name is
not the catalogue's, so three of eleven models came back unresolvable while
`unmatched` stayed empty. Running this exporter over that import is what found
it.

**Both halves of that are now fixed** — see
[`NEWRECRUIT-IMPORT.md`](NEWRECRUIT-IMPORT.md). The importer resolves by
`entryId`, and the fixture imports eleven models with nothing unmatched. The
test still rebuilds rather than importing, because an exporter checked through
the importer tests the pair rather than the exporter: a shared misreading of
the format would agree with itself and pass.

## Acceptance

Unchanged from where [E3](EXPORT-CODEX-REVIEW.md) put it, and not something code
can clear:

> Open it in NewRecruit, check every model, loadout and cost, edit a selection,
> save, reopen, and find nothing lost or changed.

Until somebody with the app does that, the UI says the format is a candidate and
the TrenchLine file remains the record.
