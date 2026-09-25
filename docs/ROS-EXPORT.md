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

Which models a `.ros` is written from is decided by `takesTheField`
(`src/rules/recreation.ts`), not by `isDead` alone. A model killed in a
post-battle sequence and held on the roster awaiting Re-creation carries
`isDead: false` — that flag is false only so the roster keeps the entry the
payment is made against — and it is dead until it is paid for. A `.ros` is a
muster for a game, so it is left out, counted in the same informational note a
dead model gets.

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
`data-sources/fixtures/newrecruit/`. Eight of its 95 selections have no place in
the layer's wargear vocabulary, and not one is an oversight:

| | |
| --- | --- |
| `Ranged Proficiency [7]`, `Assassinate [4]`, `Skill & Expertise [7]`, `Strength of Samson [8]` | campaign advancements and skills, held in the campaign tables |
| `Leg Wound [31]`, `Lost Arm [26]` | injuries, likewise |
| `Alchemical Ammuntion (Loaded)` | a BattleScribe counter — a hidden entry a modifier increments, which a player cannot choose |
| `Sniper Scope` | a **Glory Item** in the `Campaign Rules` catalogue's own group, 0 Ducats and 2 Glory — won in a campaign, not bought from an Armoury |

`Fierce Lion` was the ninth and is not on this list any more. It was never
"an ability, not armoury gear": it is a real `selectionEntry` the Lion of
Jabir offers for +5 Ducats (`Iron Sultanate.cat` L5676), and the option parser
read only entries inside a `selectionEntryGroup`. Fourteen upgrades across the
six faction catalogues were in that position — see
[`ROSTER-PATHS.md`](ROSTER-PATHS.md#an-upgrade-with-no-group-round-it).

### The one that is left is a warning, not a refusal

`rosReport` used to call any name the layer could not place under a model
**fatal**, which is right when the model was given something its entry does
not offer: a roster naming it would be a roster of a different model. It is
not right for the Sniper Scope, where the exporter has no identity for the
line under *any* model. The two are told apart by `knownEntry`, which asks
whether the layer has ever seen the item's own entry id — recorded on the item
by the importer since EXP-1 — and the second is warned about and left out:

> won or granted outside the faction catalogues — no BattleScribe entry this
> exporter maps names it, so it is left out of the file; the campaign half of
> a roster is not yet designed

That open question is this document's, below. The roster is a true record
either way; what is missing is a place in the `.ros` format to say it.

### A Weapon Collections pick NewRecruit does not offer

Since FD-16 the builder offers the House of Wisdom the whole New Antioch and
Trench Pilgrims Armoury Tables, because the rule says *"1 piece of Battlekit"*
and Battlekit is the book's word for the whole table (Warbands L5303–L5308).
The catalogue models the same rule as a hand-picked subset: `Iron Sultanate.cat`
L5883–L6473 gives Trench Pilgrims an Equipment, Weapons, Grenades and Shields
group and New Antioch an Equipment, Ranged Weapons and Grenades group — **no
Armour on either side**, and no New Antioch melee weapons or shields.

So a warband whose collection pick is one of the rows that subset omits is
legal by the book and has no `entryId` in the catalogue's Weapon Collections
group to be written to. The import direction is unaffected: a `.ros` can only
ever carry a pick from that subset, and every one of those is a row in the
armoury the app now offers.

**Two corrections to what this section used to say** (WC-1), both from
measuring rather than reading the groups:

- It named **Machine Armour** as the case. That one is not a case: the Iron
  Sultanate catalogue carries its own `Machine Armour` entryLink at 50 Ducats
  (`Iron Sultanate.cat` L2667), hidden behind a modifier, and `modelIdentity`
  resolves a name against everything the MODEL's entry reaches rather than
  against the Weapon Collections group alone. It exports, under `Armour`.
  The rows that genuinely reach no Iron Sultanate entry are **Blunderbuss,
  Heavy Ballistic Shield, Engineer Body Armour, Blessed Icon and Iron
  Capirote** — zero of the catalogue's seventeen entries each. Several more
  reach only some entries and are fine on the rest.
- It said such a model is **fatal**. It was, and that was the wrong trade:
  one legal item refused the whole file, so the other twelve models — exactly
  what the catalogues can name — went nowhere either.

An item that carries `grantedBy` and cannot be reached is now a **warning**:
the file is written without it, and the warning names the item, the Variant
rule that allows it, and what the model therefore costs in the file against
what it costs in TrenchLine. An item with **no** grant behind it stays fatal —
there the app is naming gear the catalogues do not offer that model and no rule
says it may, which is a roster that is not this warband.

Whether the campaign half should be written at all is still an open question: a
`.ros` can express it, TrenchLine holds it somewhere else, and nobody has asked
for it yet.

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

### EXP-1: the owner's own roster exports

Driving both fixtures through the real importer and then this report gave
**eight fatal findings** on each. Each turned out to belong to one of four
classes, and only one of the four was where the design expected it:

| what was reported | on | what it really was |
| --- | --- | --- |
| `Coordinated Engagement` ×2 | Idris, Jawhar | the selections are `Fireteam: Mamluk-Guarded` and `Assigned Sword`; both print a `Coordinated Engagement` Battlekit profile, and the importer named the item after the **profile** |
| `Weaponized Shovel` | The Iron Needle | the selection is `Shovel`, whose child `Include Weapon Profile?` prints a `Weaponized Shovel` weapon profile |
| `Polearm` | Jawhar | the selection is the `Polearm and Shield` bundle, which prints a `Shield` and a `Polearm` profile |
| `Titan Zulfiqar`, `Two Heads` | Al-Masyukh | **entry identity.** Since IMPORT-1 an imported model's `baseProfileId` is the catalogue entry id, which `catalogueEntryFor` did not look up — so all twelve models fell through to a name match, and the first of the six entries called `Homunculus` belongs to the Court of the Seven-Headed Serpent |
| `Fierce Lion` | Dhi'b al-Nafud | a real option the parser never read — above |
| `Sniper Scope` | Kasim | a campaign Glory Item — above |

Three fixes, at the source rather than in the report:

1. **An imported item is named after the SELECTION**, never after the first
   profile that selection prints, and it keeps that selection's entry id. A
   child whose only content is a profile folds into its parent instead of
   becoming an item of its own. Four of the eight.
2. **`catalogueEntryFor` resolves the entry id** before falling back to the
   name. Two of the eight, and it also stopped the force reporting itself as
   spanning catalogues it does not touch.
3. **`optionsOf` reads an upgrade stated with no group round it.** One of the
   eight, and fourteen options recovered across the catalogues.

Both files now export with **no fatal finding**. What remains is the two
standing differences this exporter reports on every file, the per-item "this
is reachable more than one way" notes, and the Sniper Scope.

`src/services/__tests__/importAcceptance.test.ts` holds it, and names each of
the eight rather than counting them: a count passes while one of them comes
back.

### The acceptance that code cannot clear

Unchanged from where [E3](EXPORT-CODEX-REVIEW.md) put it:

> Open it in NewRecruit, check every model, loadout and cost, edit a selection,
> save, reopen, and find nothing lost or changed.

Until somebody with the app does that, the UI says the format is a candidate and
the TrenchLine file remains the record.
