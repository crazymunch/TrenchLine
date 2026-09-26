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
| `durable` | In the file. The roster's content and its campaign history | name, faction, variant, units, treasury, ledger, injuries, scars, XP, **Skills**, **`advancementRolls`**, **`promotionMisses`**, **`fallen`**, **`benched`**, titles, snapshots, `isDead`, **`awaitingRecreation`**, **`campaignRules`**, **`rulesetId`**, **`importedCampaign`**, **`rewards`**, **`injuryRecords`**, and the legacy `advancements` |
| `identity` | In the file, but as a **reference**. Confers no ownership, membership, overwrite authority or sync precedence | `Warband.id`, `ActiveUnit.id` |
| `live` | Never. Battle state that happens to live on the roster today — a known defect, see `LIVE-PLAY-CLAUDE-REVIEW.md` D3 | `currentWounds`, `maxWounds`, `bloodMarkers`, `blessingMarkers`, `status`, `hasActedThisTurn` |
| `local` | Never. This device's bookkeeping, or an id that would travel to someone it does not belong to | `editedAt`, `campaignId`, `creatorId` |

`grantedBy` is `durable`, and it is provenance rather than a Keyword. A model
created by the Book of Golems (Exploration 17) carries `'Book of Golems'`, and
the grant's standing restrictions — never Promoted, no further Alchemical
Formulas, Battlekit from the host's own Armoury — key off it rather than off
the GOLEM Keyword. The distinction is the point: GOLEM is what the model **is**,
and this is how it **arrived**, so the same Takwin Homunculus entry recruited
out of the Armoury is unaffected. Lose the field in a round-trip and a Golem
comes back a model that may be Promoted, which is why it is durable and why
`UNIT_FIELDS` makes every new field say so.

**Who writes it** (GOLEM-1). Until now nothing did: `golemOnImport` was built
with the rules and had no caller, so no model on any roster was ever marked,
the grant's free-Formula allowance was unreachable, *"can never be Promoted"*
never fired and `golemKeywords` had no live effect. Two paths write it now,
and both write `grantedBy` and nothing else — everything the grant DOES stays
derived from the mark:

- **The import**, where the roster can say which model the grant created.
  `golemOnImport` decides; the importer writes. Where more than one model
  fits, or none, it marks **nothing** and carries the reason to the import
  screen, because a guess hands a free 50 Ducats to the wrong model silently.
- **The builder**, a *Created by the Book of Golems* action on the model's own
  card, for the case the import could not decide and for a Warband built in
  the app. Marking one model clears the mark from any other: one grant, one
  model.

`campaignRules` on the **Warband** is `durable` and new with the same change.
It is what the roster's `Campaign Rules > Enabled` subtree said the Warband
earned — the Book of Golems, a Ransacked Alchemist Workshop, a Reroll — read
by the importer since #95 and, until now, dropped the moment the import screen
closed. It has to survive, because the builder's action is offered only to a
Warband that holds the grant. Names only, exactly as the roster spells them:
what each one MEANS is a rules question, and `golemGrant` matches the Book by
the sentence its Exploration row prints rather than by this string.

`rewards` on the **Warband** and `injuryRecords` on the **model** are both
`durable`, and both arrived with FD-12's provenance.

`rewards` is the same `Campaign Rules > Enabled` subtree that `campaignRules`
names, with each entry's **group**, its **rules text as printed**, and how the
Warband came by it. Two records of one subtree, written together, and neither
derived from the other — a name the app cannot place is still a name the roster
stated, and a reward whose text the roster did not ship is still a reward. The
group is the load-bearing part: NewRecruit files these under `Exploration
Rewards`, `Exploration Skills` and `Patron Selection`, so the Patron is told
from the rewards **without the importer knowing any Patron's name**. Entries the
roster filed under no group at all — NewRecruit's own `Unleveraged Glory`
counter is one — are carried with no group, which is how the sheet keeps from
presenting them as rewards the Warband earned.

`injuryRecords` is parallel to `injuries` rather than a replacement for it,
exactly as `titleRecords` is parallel to `titles`. `injuries` stays the
authority on WHICH injuries a model carries — it is what `alreadySuffered`, the
card, the presentation projection and every roster file ever written read — and
this carries the D66 that caused each. `injuriesHeld` joins them.

**Provenance, and what a missing one means.** Skills, scars, injuries and
rewards each carry an optional `source`, one of six kinds: `advancement` with
the game and the 2D6 total, `trauma` with the game and the Trauma row's roll,
`exploration` with the game and the Location, `import`, `manual` with the game,
or `manual-pre-app` with the player's own note.

`manual` and `manual-pre-app` are two different claims. The first is "I recorded
this by hand, in the game the campaign is on" — a player who rolled at the table
rather than in the app. The second is "this happened before the app held this
Warband", which carries no game because there was no campaign record then. They
were one kind briefly, and everything hand-entered was labelled as predating an
app that had been open all season; which of the two it is is the player's to say.

A file written before any of this carries no `source` at all, and `provenanceOf`
reads that as **`import`** — never as a roll that did not happen, and **never as
a step**, whatever else the entry carries. A scar with a `roll` and no `source`
is an import whose ROW was recorded, not evidence of a Trauma Step and not
evidence of a die: the advancement sheet has always written `roll` from the table
ROW a player picked out of a dropdown. That is rule 2 applied to a record rather
than to a fetch. Nothing is back-filled.

**A throw and a choice are different claims, and the record keeps them apart.**
`Provenance.roll` is a die that came up — the 2D6 total the wizard rolled,
NewRecruit's bracketed `Point Blank [9]`, a D66 of 52. `Provenance.row` is a line
of a table somebody pointed at, which for a ranged Trauma row (`41-63`) is a range
no die shows. A label reads "rolled 52" for the first and "row 41-63" for the
second, never the other way round.

**A Skill consumes an Advancement Roll if and only if its own record states the
roll.** Not one per Skill — the record. `advancement.ts` has said why since it was
written: a Patron grants Skills, so do some Glory Items and the `65 Bitter
Lessons` Trauma result, so counting Skills cancels rolls the model earned. A
Sultanate Azeb imported holding three Skills at 6 Experience has earned two rolls
(the circles are at 2 and 4); recorded as having taken three, it is owed one at 7
and offered none, and nothing on any screen says a roll went missing.

What counts as stating the roll:

| Record | Consumes a roll? |
| --- | --- |
| `advancement` | Yes — the app wrote it when the roll was taken |
| `import` with a bracketed 2D6 total (`Point Blank [9]`) | Yes |
| `import` with no roll (a Trench Companion Skill) | No |
| `manual` / `manual-pre-app` with a 2D6 total the player gave | Yes |
| `manual` / `manual-pre-app` with no total | No |
| a `row` but no `roll` | No — a row is a choice, not a die |
| no record at all | No |

A 2D6 total means 2 to 12, which is what excludes a D66 injury (`26`) and a
Trauma row's range. Removing a Skill refunds only what that Skill consumed, so
removing a Patron's Skill refunds nothing and a mis-tap on a rolled one is not a
penalty. Both importers set `advancementRolls` from this count and REPORT the
Skills they did not count, because a correct reading and a parse failure look
identical on the model otherwise. That report reaches the player: both land in
the import preview's **"About this import"** list, before they press Import —
`skillsWithNoRoll` on `ImportResult` for a NewRecruit roster, one line per model,
and the existing `warnings` channel for a Trench Companion share.

The direction of the error is the argument for counting this way: an over-offer is
visible and the player declines it; an under-offer is silent.

`rulesetId` on the **Warband** is `durable`, and it is **not** a duplicate of
the manifest. The manifest records what the exporting BUILD had loaded; this
records what the WARBAND was built under, and a file exported from a device set
to the other ruleset would otherwise lose the difference the conversion report
exists to show (RV-1, [`RULESET-MODEL.md`](RULESET-MODEL.md) §8a). Absent means
*not recorded*, never *the default*.

`importedCampaign` on the **Warband** is `durable`. It is the campaign round
and the Campaign Victory Points total that another app's record stated when the
warband was imported from it (CI-1,
[`TRENCH-COMPANION-IMPORT.md`](TRENCH-COMPANION-IMPORT.md)). It is kept as a
fact about where the warband came from rather than folded into our own numbers,
because our Campaign Victory Points are *derived* from the win/loss/draw record
a campaign keeps and never stored — so writing an imported total into them
would mean either inventing a results record to justify it or having two
answers to the same question. A file that dropped it would silently lose the
round a player is on.

`isDead` is `durable` and the distinction matters, because it reads like battle
state and is not. A model removed by the Trauma Step is gone from the campaign;
a restore that quietly brought it back would be inventing a model.

`awaitingRecreation` is `durable`, and it is the one state that is neither
alive nor fallen. Two entries let a Warband pay rather than lose a model the
post-battle sequence killed — Warbands L5324–L5327 for the Takwin Homunculus,
the Book of Golems find for the Golem — and both put the payment *after* that
sequence, in a step this app locates in the builder. So a roster saved between
the battle and the Quartermaster carries a model in limbo, and dropping the
field would silently restore it to full health. `isDead` stays **false** while
it is set, which is what *"you do not have to remove it from your roster"*
means. The deadline is stored rather than recomputed because the two entries
are printed with different ones: the Takwin's expires with the following
Quartermaster Step, the Golem's does not expire at all.

`ledger` is `durable`, and it is now the Strongbox itself rather than a note
beside it. `treasuryDucats` and `gloryPoints` stay in the file — they are a
column in the database and a number in two dozen places in the UI — but
`rules/ledger.ts` is the only thing that writes them, deriving both from the
whole ledger on every movement, so a file cannot carry a balance its own
history contradicts.

A file written before this can, and one written by this app always did: the
founding entry credited the whole founding allowance while `treasuryDucats`
was written `0` beside it. Such a file has its account **opened** on load, at
both doors: one entry carrying the balance the roster actually holds, with the
allowance kept in the note. **No money moves.** Where the entries and the total
disagree, the total wins — it is what the player has been looking at, and a
migration that hands someone 700 Ducats or takes 340 away is not a migration
anybody wants.

That is the right shape exactly once, because nothing had ever read these
entries. Once the ledger is live, a correction is an appended entry and never a
replacement; `rules/ledger.ts` says so where the code is.

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

This paragraph was right before the app was: a release set the field to
`skills.length`, which is exactly the shortcut it warns against here, and the
rule that replaced it is the table under **Provenance** above. Any writer of a
Skill — the wizard, both importers, hand entry — counts the Skills whose records
state a 2D6 total, and nothing counts the length of the list.

**`advancements`** is a legacy free-text list, and nothing writes to it any
more. The post-battle wizard used to put the label of whichever of eight
buttons the player pressed here — and four of those buttons were characteristic
advances (`+1 Melee`, `+1 Ranged`, `+1 Armour`, `+1" Move`) that Trench Crusade
does not have, while three of the four named Skills do not exist. Existing
rosters therefore carry strings for things that never happened.

It stays `durable`, and it is still displayed **to the player whose roster it
is**. Those strings are the player's own record of what they did at their table,
and clearing them on import or export would be a data change rather than a fix.
They are free text somebody typed, so the public share page omits them along with
the Warband's lore, its notes and a provenance `note` — see
[`DATABASE.md`](DATABASE.md) on `shareToken`, and `rosterSheet`'s `audience`. New
progression goes to `skills`.

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

## `StashedItem.price` — what an Arsenal item cost, in both currencies

The app prices in two currencies and `StashedItem` held one `cost` with no
label, so the Quartermaster debited Ducats for everything. A Glory Item bought
from the Arsenal took its price out of the Ducats and left the Glory
untouched — free in the currency it is priced in, paid for in one it is not.

`currency` was the first answer to that, and it is one discriminator where an
Armoury Table row is two numbers: a row can price an item in Ducats and Glory
together, and one label cannot say so. `price` is the row's own `Cost`, carried
whole. `cost` stays the **Ducat** number, which is what every reader has always
meant by it.

**All three readings are written down, and none of them is a guess.**
`stashPrice` is the one place that resolves them:

| What the entry carries | What it means |
| --- | --- |
| `price` | The price, both currencies. Authoritative. |
| `cost` + `currency: 'glory'` | Zero Ducats and `cost` Glory. |
| `cost` alone | `cost` Ducats — every item in a stash written before `currency` existed was bought with Ducats, because Ducats is all the Quartermaster could spend. |

So no migration has to touch an existing Arsenal, and an item bought before
`price` existed still sells back into the Strongbox it came out of.

**Battlekit that comes OFF a model carries its price too** (FD-05g). The equip
charges the Armoury row's whole `Cost` — `charge` takes a `Cost`, not a number
— so a Glory-priced item is debited in Glory, and when a played game settles the
purchase the item goes to the Arsenal priced as it was bought. The two halves
had to land together: writing `price` at the removal sites while the equip still
debited Ducats only would have **created** Glory, half of it, on every sale.

### `StashedItem.grantedBy` — what the Warband did not pay for

Four Exploration Locations put an item in the Arsenal outright — *"Add Curative
Fluids to your Warband's Arsenal"* — and an Arsenal row that records only a name
and a price cannot say which of its rows was bought. That matters when one is
sold, when a ruleset is converted (`convert.ts` refunds nothing for a thing that
cost nothing), and when a player reads the list: an imported Warband that holds
the Sniper's Lair has a Siege Jezzail and an Alchemical Ammunition in its Arsenal
at no cost, because that Location's text names both for its faction and the
record it came from prices them at nothing.

So a granted row carries the granter's own name, spelled as
`explorationDiscoveries` records it, and a price of nothing. Absent on every row
the Warband bought, which is what an Arsenal written before this says about all
of its rows — and the right thing for it to say, since a purchased row is
exactly what `grantedBy` is absent from.

## `explorationEffects` — the Exploration Skills a Warband has gained

Page 115 prints seven Exploration Skills, and `Warband` had nowhere to put one.
So a Warband that found the Map & Document Bag — *"Your Warband gains the
Reroll Exploration Skill"* — gained nothing: the discovery was not even
recorded, because `explorationDiscoveries` had a reader and **no writer**
anywhere in the app.

A **list, with repeats**, because the book says so: *"You can have multiples of
any of the Exploration Skills on this list."* Two Map & Document Bags is two
re-rolls, so this is never de-duplicated. `explorationDiscoveries` beside it
**is** de-duplicated, because that one is what *"you can discover a Location
only once during the campaign"* is checked against.

Each entry says what granted it and when, so a pool a player does not recognise
can be traced back to the game that produced it. The Pot of Manna's standing
+10 Ducats rides on the same record as `lootBonus`: it is the same kind of
thing — a permanent change to Exploration that a Location handed out — and a
second list would be a second place to forget.

**A Skill a MODEL carries is not in here, and must not be.** The two Wildcard
Skills that grant one say *"A model with this Skill has the Extra Dice
Exploration Skill"*: it belongs to the model, so the Warband holds it for
exactly as long as it holds the model. Those are derived from the Roster on
every roll by `explorationFromModels`. Storing one would leave a dead Scavenger
rolling an extra die for the rest of the campaign.

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

## `shareToken` — not in the file, and not on the type

SH-1 puts a warband's Roster Sheet at `/w/<token>`, behind a nullable unique
`shareToken` column on the synced warband row. **It is not a roster field**, and
that is a decision rather than an omission:

- It is a **capability granted by an account**, not a fact about the roster. The
  same warband exported to a file and imported by somebody else is the same
  roster; it is emphatically not the same share.
- A roster file is handed to other people. A token in one would let whoever
  received it read the owner's live cloud copy — including every later change —
  with no session and no way for the owner to know.
- The sync must never merge it. `mergeWarbands` compares `editedAt` and takes
  the newer side's fields wholesale, so a token on the type would be resurrected
  by a stale device after the owner had stopped sharing.

So it is **absent from `Warband`** in `src/types/warband.ts`, which makes all
three impossible by construction rather than by remembering: the `Record<keyof
Warband, Disposition>` inventory cannot classify a field the type does not have,
and nothing that serialises a roster can reach it. The builder asks the server
for the share state (`GET /api/warbands/[id]/share`) rather than reading it off
the roster. See [`DATABASE.md`](DATABASE.md) for the column and the migration.

## Not in this format

Campaign export (several warbands, a season's results), match state, the share
token above, and NewRecruit/BattleScribe `.ros` output. The last is a separate compatibility
problem gated on a spike — see the [export brief](EXPORT-ARCHITECTURE-BRIEF.md)
§3.2 and [E3/E4](EXPORT-CODEX-REVIEW.md).
