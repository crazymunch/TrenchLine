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
| `durable` | In the file. The roster's content and its campaign history | name, faction, variant, units, treasury, ledger, injuries, scars, XP, **Skills**, **`advancementRolls`**, **`promotionMisses`**, **`fallen`**, **`benched`**, titles, snapshots, `isDead`, and the legacy `advancements` |
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

## `promotionMisses` — a counter the Warband carries, not the game

Promotion Dice are rolled per game, but the misses are **not** counted per
game. The rulebook's five-miss rule is *"once the total reaches 5 dice, then
the next roll automatically Promotes"* — a running total that survives the
post-battle step it was rolled in. Three misses this game and two the next make
the sixth die a Promotion, and that is only true if the number is written down
on the roster.

So `warband.promotionMisses` is `durable`. A restore that dropped it would not
lose a Skill or a statline — nothing would look wrong — it would quietly cost
the player a Promotion they had already paid five dice for. It is optional and
omitted when zero, which needs no `schemaVersion` bump (see above): an older
reader that does not know the field reads a Warband that has never missed, and
a newer reader of an older file reads the same.

The step that reads it is `rollPromotions` in
[`src/rules/promotions.ts`](../src/rules/promotions.ts); the numbers it applies
are derived, not written here — see
[`RULESET-MODEL.md`](RULESET-MODEL.md#campaignpromotions--who-may-be-promoted-and-how-much-experience).

## `StashedItem.currency` — which Strongbox an Arsenal item came out of

The app prices in two currencies and `StashedItem` held one `cost` with no
label, so the Quartermaster debited Ducats for everything. A Glory Item bought
from the Arsenal took its price out of the Ducats and left the Glory
untouched — free in the currency it is priced in, paid for in one it is not.

**Optional, and its absence is not a gap.** Every item in a stash written
before this was bought with Ducats, because Ducats is all the Quartermaster
could spend. `stashCurrency` reads the absence as `ducats` in one place, so no
reader has to guess and no migration has to touch an existing Arsenal.

## `benched` — the models left out of the Force

The Threshold Value caps the Ducats a Force may field and Field Strength caps
its models (p.97), and both rise after every game. The **Roster is allowed to
exceed both**:

> Your Warband's Threshold Value and/or its Field Strength may mean that you
> cannot take all of the models that are on your Warband Roster. When this is
> the case any models you do not use will have to sit the game out; they will
> not earn any experience and cannot influence the game in any way.

So `benched` is not an error state and removes nothing. It is the player
saying which models they are leaving behind.

**`durable`, and the call is not obvious.** It reads like battle state, and it
is a decision about a game that has not been played yet. But a player picks
their Force the night before, closes the app, and opens it at the table — a
restore that un-benched everybody would hand them a list over the Threshold
with no sign of why.

**Omitted rather than stored `false`.** An un-benched model has to look, in a
file, exactly like one that was never benched; otherwise every roster grows a
field per model that says nothing.

It is read in three places, and the last two come from the same sentence as
the first: the builder measures the Force rather than the whole Roster, Play
Mode's default deployment skips it, and the post-battle step starts it ticked
as having not taken part — *"they will not earn any experience"*.

## `fallen` — the models the Roster no longer holds

The Trauma Table's `11 Dead` reads *"Remove the model and its Battlekit from
your Warband Roster"*, and `12 Captured` says the same of a model whose ransom
went unpaid. The app set `isDead: true` and left the model in `units`.

A flag is a rule enforced by remembering, and the remembering was not
universal. Six readers checked it; three did not, and each of those three is a
rule with the wrong answer: the builder summed a dead model's Ducats into the
Warband total, `toRoster` handed it to the legality engine where it went on
satisfying a faction minimum, and Play Mode deployed it, because the default
is every model on the roster.

So a removed model moves to `warband.fallen`. Every one of those readers is
then correct without a filter — and so is the next one nobody has written yet,
which is the argument for moving it rather than adding a tenth check.

- **`durable`.** A campaign's dead are half of what its history means, and they
  cannot be reconstructed from a file that dropped them.
- **The Battlekit goes with the model.** The book removes both, and the
  Arsenal does not get the gear back, so the whole `ActiveUnit` moves.
- **`isDead` stays on the type and is still set** on a model on its way out.
  Nothing in this app reads it any more, but a file this version writes is
  read by versions that know no `fallen`, and to those the flag is the only
  thing that says the model is gone.
- **`diedInMatchId`** names the battle, where the caller knows it.

### Reading a roster written before this

Such a file holds its dead in `units` behind the flag. `migrateFallen` moves
them, and runs at **both** doors a roster comes through — `storage.getWarbands`
and `decodeRosterFile` — so nothing downstream has to know which one a roster
arrived by.

It is driven by the flag, not by `schemaVersion`: the flag is evidence, a
version number is a claim an older writer may not have made. It is idempotent.
And it invents no `diedInMatchId`, because those files never recorded one and a
memorial naming the wrong battle is worse than one naming none.

Both doors say so rather than doing it quietly. The model count and the Ducat
total both change, and an import that silently revalues a roster is worse than
one that explains itself.

## Not in this format

Campaign export (several warbands, a season's results), match state, and
NewRecruit/BattleScribe `.ros` output. The last is a separate compatibility
problem gated on a spike — see the [export brief](EXPORT-ARCHITECTURE-BRIEF.md)
§3.2 and [E3/E4](EXPORT-CODEX-REVIEW.md).
