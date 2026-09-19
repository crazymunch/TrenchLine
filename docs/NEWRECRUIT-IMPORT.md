# Importing a NewRecruit / BattleScribe roster

`src/services/newRecruitImporter.ts`. What the importer resolves each roster
line against, and why it is no longer the line's name.

Found by running the `.ros` exporter ([`ROS-EXPORT.md`](ROS-EXPORT.md)) over an
import of the warband NewRecruit itself wrote —
`data-sources/fixtures/newrecruit/al-qarn-rihla-august.ros`, thirteen models of
a real campaign warband.

## A roster line's name is not the catalogue's

A `.ros` records what **modifiers made of** an entry, not what the catalogue
calls it. The Iron Sultanate's `Azeb`, entry `0e7e-9167-f044-9493`, is written
into a roster three different ways:

| the roster says | the catalogue entry |
| --- | --- |
| `Kavass` | `Azeb` |
| `Favoured Kavass` | `Azeb`, promoted |
| `Azeb` | `Azeb` |

The importer matched on that name, with a substring fallback:

```ts
allUnits.find((p) => p.name.toLowerCase() === selName
                  || selName.includes(p.name.toLowerCase()))
```

Two things went wrong, and neither was visible.

**A renamed entry matched nothing.** `"kavass".includes("azeb")` is false, so
`baseProfileId` fell back to a slug of the roster's own name — `kavass`, an id
no catalogue entry has. `unmatched` stayed empty, because the statline check
passes on an export that carries characteristics, so the import reported
complete success with three of eleven models untraceable.

**The substring fallback bound to the wrong model.**
`"favoured homunculus".includes("homunculus")` matches the *first* Homunculus
in the list, and five factions field one. A Sultanate model could be bound to
the Trench Pilgrims profile, which then offers that faction's gear.

## The roster states the answer on every line

Every selection carries `entryId`, and it is a **path** — the chain of
`entryLink` ids traversed to reach the entry, with the entry's own id last
(`docs/ROSTER-PATHS.md`):

```
0e7e-9167-f044-9493                         Azeb, reached directly
da5c-280f-9d08-42b4::2f82-e47f-c162-9152    the Sultanate Homunculus
```

So the entry's own id is the last `::` segment, and `recruitable` already keys
a store unit by exactly that — `UnitProfile.id` is set to the dataset's
`entryId`. The lookup is direct, not a search.

**It is also unambiguous, which is the whole point.** Each faction's
Homunculus is a *different entry*:

| faction | entry |
| --- | --- |
| Court of the Seven-Headed Serpent | `dda8-eeec-a07e-ed88` |
| Heretic Legion | `e6f9-0f05-aa5b-06cd` |
| Iron Sultanate | `2f82-e47f-c162-9152` |
| New Antioch | `2d0c-00e9-7897-83d7` |
| Trench Pilgrims | `3eda-5baa-29d3-d617` |

No two units in the ruleset share an entry id, so an id names one model where a
name named five.

### Name matching is kept, as the second test

A plain-text paste carries no ids, and neither does an export old enough to
predate the attribute. So the name path stays — but only where there is no id
at all. **An id that resolves to nothing does not fall back to the name**: the
file said which entry it is, and we do not have that entry. That is a reported
line, not a guess.

## Three more things the fixture settled

**A `unit` wrapper is structure, not a model.** `Mamluk Faris` is a `unit`
entry whose only child is a link to the `model` carrying the profile. The
wrapper holds the player's `customName` and the child holds the identity and
the statline, so taking either alone loses something. The child is imported,
under the wrapper's name.

**A model no entry claims is reported, not invented.** The slug
`baseProfileId` is gone. An export carrying characteristics is still the
player's roster, but it is not a line this app can reason about later, so it is
named in `unmatched` rather than imported under an id nothing resolves.

**`baseCost` is the entry's own price.** It was set to the line total
including every weapon on it, so two Jabirean Alchemists off one profile came
in at 194 and 130. The recruit sheet and the validator both read
`UnitProfile.baseCost` as the entry's price and add gear on top, so a total
there is counted twice.

## The defect underneath all of it

**Every `.ros` import had been silently falling through to the plain-text
parser.**

`importNewRecruitRoster` tries JSON, then XML, then text, catching whatever the
previous one throws. The XML path threw on every real export:

```
TypeError: c.$text?.toLowerCase is not a function
```

fast-xml-parser coerces text content that looks numeric, so a characteristic
reading `2` arrived as the **number** 2 while `NrCharacteristic.$text` is
declared `string`. `XMLParser` returns `any`, so the cast at the parser
boundary let it through unchecked, and the first `.toLowerCase()` on a statline
threw.

The catch then handed the raw XML to the text parser, which scans its input for
anything spelled like a unit name. The thirteen-model fixture came back as
**twenty-two models**, none carrying the player's own names, including
`Janissary`, `Engineer`, `Trench Pilgrim` and `Sniper Priest` — entries from
factions the roster does not field.

The fix is one `String()` at the boundary. What made it survive is worth more
than the fix: a fallback chain that catches everything turns a total failure
into a plausible-looking success, which is
[rule 2](../CLAUDE.md#2-never-invent-a-fallback) wearing a different hat. The
tests now assert the XML path was the one that ran, by checking the models
carry the player's own names — something the text parser cannot produce.

## Checking it

`src/services/__tests__/newRecruitImportIdentity.test.ts`, against the real
file. The fixture imports **eleven models, nothing unmatched**, every
`baseProfileId` an id the dataset carries.

Verified by sabotage, each failing only its own guard: resolving by name first
(4 tests), letting the numeric characteristic through unconverted (7), setting
`baseCost` to the line total (1), and not unwrapping the `unit` wrapper (3).
