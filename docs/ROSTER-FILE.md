# The TrenchLine roster file

The format TrenchLine writes when you save a warband, the format it reads back,
and what it promises about both.

Written by [`src/services/rosterFile.ts`](../src/services/rosterFile.ts).
Fixtures in [`data-sources/fixtures/trenchline-roster/`](../data-sources/fixtures/trenchline-roster/).
Design: [export brief](EXPORT-ARCHITECTURE-BRIEF.md) §3.1 and
[Codex's review](EXPORT-CODEX-REVIEW.md) E2, E9 and E10.

## Why it is not just the warband

Until now the export was `JSON.stringify(warband)` — the app's internal type,
with no version and no record of the rules it was built under. It is the file
people already have, so this format has to keep reading it; it is not a file
anything should keep writing.

Three specific problems, and the envelope answers each one.

**Nothing said what version it was.** A `Warband` refactor silently changes what
every saved file means, and a reader cannot tell an old file from a new one.
`schemaVersion` lets a reader refuse rather than guess: a file from a newer
build is not partially loaded, it is declined with a sentence a person can act
on.

**Nothing said what rules it was built under.** `rulesetId` alone is not enough
either — the same base catalogue commit with a different layer stack is a
different ruleset, and this app ships two. The manifest records the ruleset id,
the base commit, the base catalogue files and the **ordered** layer list.

**It was the runtime type, so it carried things a file should not.** Battle
state (`currentWounds`, `bloodMarkers`, `status`, `hasActedThisTurn`) lives on
roster models today, and the dump shipped mid-battle wounds inside a roster
file. So did the exporter's own account id and their local campaign id.

## The envelope

```jsonc
{
  "format": "trenchline.roster",
  "schemaVersion": 1,
  "exporterVersion": "1.0.0",         // the app build that wrote it
  "exportedAt": "2026-09-06T12:00:00.000Z",
  "provenance": "known",              // known | partial | unknown
  "rules": {
    "rulesetId": "trenchline",
    "baseCommit": "1b463a8e…",
    "baseFiles": ["New Antioch.cat", "…"],
    "layers": ["dispatch-01", "carcass-front"]   // ordered
  },
  "roster": { /* the durable projection, below */ }
}
```

`rules` is **a record, not a certificate.** It says what the roster was built
under. Whether it is legal under the rules loaded now is a different question
with a different answer, asked separately by the validator.

`provenance` is `unknown` where the file cannot say — a v0 file, or an export
made before the dataset loaded. It is never filled in from the dataset that
happens to be loaded when the file is read: stamping today's metadata onto an
old roster is a claim the file then carries forever.

## What travels, and what does not

Every field of `Warband` and `ActiveUnit` is classified in `rosterFile.ts` as a
`Record<keyof T, Disposition>`, so **adding a field to either type is a compile
error until someone decides what a file does with it**. That guard is the point:
`SYNC-1` found six warband fields being dropped silently by a different
serialiser, and a file format is a worse place to repeat that, because nobody
notices until they need the file.

| Disposition | Meaning | Examples |
| --- | --- | --- |
| `durable` | In the file. The roster's content and its campaign history | name, faction, variant, units, treasury, ledger, injuries, scars, XP, **Skills**, **`advancementRolls`**, titles, snapshots, `isDead`, and the legacy `advancements` |
| `identity` | In the file, but as a **reference**. Confers no ownership, membership, overwrite authority or sync precedence | `Warband.id`, `ActiveUnit.id` |
| `live` | Never. Battle state that happens to live on the roster today — a known defect, see `LIVE-PLAY-CLAUDE-REVIEW.md` D3 | `currentWounds`, `maxWounds`, `bloodMarkers`, `blessingMarkers`, `status`, `hasActedThisTurn` |
| `local` | Never. This device's bookkeeping, or an id that would travel to someone it does not belong to | `editedAt`, `campaignId`, `creatorId` |

`isDead` is `durable` and the distinction matters, because it reads like battle
state and is not. A model removed by the Trauma Step is gone from the campaign;
a restore that quietly brought it back would be inventing a model.

Snapshots are kept — they are the campaign's financial and roster history — and
their model copies are projected the same way, so a file's history carries no
battle state either.

## The round-trip promise

```
decode(encode(durable(w))) == durable(w)
```

Over what a file **keeps**, not over the whole runtime `Warband`. A file
deliberately drops battle state and local bookkeeping, so equality to the live
object would be the wrong invariant to assert and the wrong promise to make.

## Reading a file

- A **v1 file** is read whole. Fields this build does not know are dropped, and
  the reader says how many and which.
- A **v0 file** — the old dump — is recognised by its shape (a `name` and a
  `units` array, no `format`) and read as a roster with no provenance. Its
  battle state and the exporter's ids are dropped on the way in.
- A **newer schemaVersion** is refused, naming the version and saying to update.
  Partially loading it would silently drop whatever the newer version added,
  which is the failure the version field exists to prevent.
- Anything else is refused with a reason.

A file is input from outside the app, so the reader also bounds it: no
prototype-poisoning keys, a nesting limit, a string-length limit, and caps on
models, stash entries and history entries.

## Importing versus restoring

Two operations, and they are not the same:

- **Import as a new roster** (`warbandFromFile(file, 'clone')`) remints every
  id, so opening a file twice gives two warbands rather than one overwriting the
  other.
- **Restore a backup** (`'restore'`) keeps the ids, which is what makes it a
  restore — and makes it the caller's job to have asked about a collision first.

Either way the live fields are set to a model standing ready: full wounds, no
markers, nothing acted. `isDead` is honoured.

## Compatibility policy

- Readers for every released `schemaVersion` are kept, with a fixture each.
- v0 is read on a **named** basis: the guaranteed fields are the `durable` and
  `identity` rows above, and the known exclusions are the `live` and `local`
  rows. It is not "best effort".
- A new `schemaVersion` is required for any change that removes a durable field
  or changes its meaning. Adding an optional durable field does not need one:
  older readers drop it and say so.
- A file never carries an account identifier. If that changes, it needs a
  privacy decision, not a schema bump.

## Progression: `skills`, `advancementRolls`, and the legacy `advancements`

A model's progression is recorded in three fields, and the distinction between
them is load-bearing on restore.

**`skills`** is what a model has learned: `{ name, category, roll?, effect? }`.
A Skill from an Advancement Roll records the table it came from as `category`
(`melee`, `ranged`, `stealth`, `wildcard`, or `Patron` for the roll of 2) and
the 2D6 total as `roll`, so a roster can be checked against the table that
produced it.

**`advancementRolls`** is how many Advancement Rolls the model has taken. Its
own field rather than `skills.length`, because a model can gain a Skill without
a roll: a Patron grants them, and so do some Glory Items and the `65 Bitter
Lessons` Trauma result. `advancementRollsDue` subtracts it from the thresholds
the model's Experience has passed — so a restore that dropped it would hand the
model every roll it had already made, a second time.

**`advancements`** is a legacy free-text list, and nothing writes to it any
more. The post-battle wizard used to put the label of whichever of eight
buttons the player pressed here — and four of those buttons were characteristic
advances (`+1 Melee`, `+1 Ranged`, `+1 Armour`, `+1" Move`) that Trench Crusade
does not have, while three of the four named Skills do not exist. Existing
rosters therefore carry strings for things that never happened.

It stays `durable`, and it is still displayed. Those strings are the player's
own record of what they did at their table, and clearing them on import or
export would be a data change rather than a fix. New progression goes to
`skills`.

## Not in this format

Campaign export (several warbands, a season's results), match state, and
NewRecruit/BattleScribe `.ros` output. The last is a separate compatibility
problem gated on a spike — see the [export brief](EXPORT-ARCHITECTURE-BRIEF.md)
§3.2 and [E3/E4](EXPORT-CODEX-REVIEW.md).
