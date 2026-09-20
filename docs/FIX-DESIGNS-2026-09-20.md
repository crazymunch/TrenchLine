# Fix designs, 20 September 2026

Designs for the findings in `RULES-REVIEW-2026-09-19.md` (RR) and
`DATA-ALIGNMENT-2026-09-19.md` (DA) that need a decision before they need a
diff. Each one names the root cause with a file and line, the change, the test
that proves it against the shipped dataset, and what would count as done.
Written for whoever implements them; nothing here is implemented.

Code citations are at `bdf0bd8` on `main` unless marked `#59`, which means
`79ca54a`, the head of PR #59 at the time of writing. Rulebook citations give
the line in `data-sources/rulebook/extracted/trench-crusade-digital-rulebook.txt`.

Standing rules for every design: no game data typed into source (rule 1), no
fallback that fabricates (rule 2), a test that reads `DATASET` rather than a
string typed in the test, and the relevant `docs/` file updated in the same
commit (rule 4).

## Where things stand

PR #59 carries, in one branch, RR-01, RR-06, RR-07, RR-22, RR-23 and the Glory
and Ducat half of RR-02. Each is reviewed below under FD-00. What it does not
carry, and what these designs cover:

| Design | Findings | Where |
| --- | --- | --- |
| FD-00 | Review of PR #59 as it stands | this document |
| FD-01 | DA-06 | `scripts/lib/parse-battlekit.mjs`, `src/rules/arsenal.ts` |
| FD-02 | DA-07 | `scripts/lib/layers.mjs`, `scripts/rules-build.mjs`, the Dispatch layer |
| FD-03 | RR-02 (Campaign Victory Points), RR-24 | `scripts/lib/parse-campaign.mjs`, `src/rules/campaign.ts`, the Hub |
| FD-04 | RR-03, RR-04 | the wizard's Promotions step, `UnitAdvancementModal`, the Codex roller |
| FD-05 | RR-25, then RR-11, then RR-12 | the roster store, the builder, `validate.ts` |
| FD-06 | RR-05 | the wizard's Promotions step, Play Mode's deed claim, `parse-campaign.mjs` |
| FD-07 | RR-10 | the wizard's Exploration step |
| FD-08 | DA-01, DA-02 | `scripts/lib/parse-battlescribe.mjs`, `src/rules/applyVariant.ts`, `src/rules/recruitable.ts` |
| FD-09 | RR-17, RR-27 | the campaign store, Play Mode's end of match, the Chronicle record |
| FD-10 | RR-13, RR-14, RR-09 | `validate.ts`, the builder's Quartermaster actions, the wizard's Exploration branch |
| FD-11 | the April 2026 Mercenaries review | `scripts/lib/parse-battlescribe.mjs`, `scripts/lib/layers.mjs`, the Dispatch layer and a Warbands-book layer, `AddEquipmentModal`, `validate.ts` |
| FD-12 | the official Warband Roster Sheet in the app; the Experience track; provenance of skills and rewards | a new sheet route, `UnitCard`, the wizard's Promotions step, `src/types/warband.ts` |
| FD-13 | the Homunculi: the Takwin and the Book of Golems | `AddEquipmentModal`, `UnitAdvancementModal`, `src/rules/battlekitLimits.ts`, the wizard's Trauma and Quartermaster steps |
| FD-14 | invented content: one player's lore injected into imports and cloud pulls, the seed, hand-typed Codex rules, fallbacks, residue | `src/data/warbandLore.ts`, `prisma/seed.ts`, the campaigns API, `CodexView`, the importer |

### Landed, as of 07:20 UTC on 20 September

| Design | PR | State |
| --- | --- | --- |
| FD-00's list (RR-01, RR-06, RR-07, RR-22, RR-23, RR-02 payouts, RR-24, the sheet gaps) | #59 | merged |
| FD-01 | #60 | merged |
| FD-02 | #61 | merged, with four corrections to the design recorded below |
| FD-04a | #62 | merged |
| FD-06a (eligibility and the Experience cap) | #63 | merged, with five corrections recorded below |
| Follow-ups from #60 and #61 | #64 | merged |
| FD-04b | #65 | merged |
| FD-03a (Campaign Victory Points, standings, the Weather chooser) | #66 | merged |
| WIZ-1 (the 44px rule's width, `sm:` to `lg:`, checkbox by label) | #67 | merged |
| MVP-1 (the standout note names any roster's model) | #68 | merged |
| FD-06b (the Promotion Dice Pool, the miss counter, the end of the switch) | #69 | merged |
| FD-06c (a Deed carries the model's id; the second Experience Point) | #70 | merged |
| FD-05a (a dead model leaves the Roster) | #71 | merged |
| FD-05b (the Threshold caps the Force; the builder measures it) | #72 | merged |
| GUARD-1 (the case-collision guard dedupes what a conflicted merge lists per stage) | #74 | merged |
| FD-05c, first half (a purchase over the balance refused; a sale rounds up; a Glory item debits Glory) | #73 | merged |
| FD-05d (the Strongbox is the sum of its ledger; the account opened once from the stored balance) | #75 | merged, with the founding-ledger correction and FD-05e and FD-05f recorded below |
| FD-11a (a min-only link and a nested min = max entry are fixed kit; a model's own gear profile costs zero) | #76 | merged, with three corrections recorded under FD-11 |
| FD-11b part 1 (a layer op naming two entities edits neither; `all` for an item the dataset holds twice; FUMBLE reaches the shared Incendiary Grenades and Molotov Cocktail) | #77 | reviewed, correct; `check` running at 07:16 UTC; merge when green |

## FD-00. PR #59 as it stands

Verdict: the six fixes are correct against the book and can merge once the
`check` job is green on the current head. Seven notes, none of which should
hold the merge; the ones that need a change are small and belong in the next
PR that touches the same file.

1. **The first head's CI failure was a cross-PR reference.** Run 35477682447
   on `211dee2` failed one test: `scripts/__tests__/docPaths.test.mjs`,
   because `docs/RULESET-MODEL.md` named `docs/RULES-REVIEW-2026-09-19.md`,
   which exists on PR #58 and not on `main`. `f008151` removed the reference.
   Any later mention of the review must wait for #58 to merge or go without
   the path in backticks.
2. **`GLORY_PER_DEED = 1` in `matchHandover.ts` under `src/rules/` (#59) is typed game
   data.** The commit argues it is the whole rule and carries the quote. The
   pipeline already has the pattern for exactly this: `campaign.exploration.lootPerPoint`
   is `10` read from page 114 by `parseExploration`. Read `1` the same way from
   page 98, line 5519 ("You gain 1 ☼") into `campaign.gloryPerDeed`, and have
   `matchHandover` take it from the dataset. Then a Dispatch that changes it
   changes the app.
3. **Campaign Victory Points are still absent.** RR-02 has two halves; #59 did
   the payout half. FD-03 below.
4. **`traumaRowIn` finds the row by substring** (`outcome.includes(r.description)`).
   It works because the wizard writes the row's text into `outcome`, which is
   a coupling between a display string and a rules lookup. `CasualtyRecord.records`
   is new in this PR; add `roll` to it and look the row up by roll. One field,
   one line in the wizard, and the lookup stops depending on prose.
5. **An ELITE model the dataset cannot classify takes no scar, silently.**
   Right decision, wrong visibility: the casualty line in the wizard should
   say "no Battle Scar recorded: the dataset does not state whether this model
   is ELITE" so the player can add it by hand.
6. **RR-24 is still in.** `mvpUnitName` and the "Match MVP" deed
   (`store/slices/campaign.ts` lines 480 to 483) are named in the commit as
   not fixed. FD-03 removes them with the CVP change, since both touch the
   same record.
   **Superseded:** fixed in `5f473af`, after this note was written, and on
   `main` via #59. FD-03 no longer needs to touch it.
7. **Stop stacking on #59.** Six findings on one branch means one red check
   holds six fixes, and the review of each is the review of all. Merge #59
   when green; every design below is its own PR.

## FD-01. DA-06: the Warbands Battlekit parser drops the wrapped keyword line

### Root cause

`parseWarbandsBattlekit` (`scripts/lib/parse-battlekit.mjs` from line 708)
reads the profile row from one line, `lines[h + 1]`, and starts both the stop
scan and the rules loop at `h + 2`. When the row's keywords wrap, the book
prints the continuation as a bare capitals line, and the stop scan's
`WB_BANNER = /^[^a-z]{8,}$/` (line 693) matches it, so the entry stops before
its own rules.

The same file already solves this for the rulebook's Battlekit chapter:
`parseBattlekit`'s `readRow` (lines 193 to 198) collects continuation lines
with `isKeywordRun` (line 62) before anything else is read.

The continuation is unambiguous in the source. Every wrapped row ends its
first line with a comma:

```
2-Handed 	18’’ +1 DICE, +1 INJURY DICE, HEAVY,      <- warbands text line 2876
SHOTGUN, SHRAPNEL                                    <- line 2877
```

Lines 1399, 2299, 3759 and 7493 have the same shape. A banner never follows a
line ending in a comma.

### The change

In `parseWarbandsBattlekit`:

1. Read the row the way `readRow` does: start with `lines[h + 1]`; while the
   last part ends in `,` and the next line is a keyword run (`isKeywordRun`)
   that is not in `WB_SIDEBAR` and not a page marker, append it. Join with a
   space, then `splitRow`.
2. Start the stop scan and the rules loop at the line after the last part,
   not at `h + 2`.
3. Keep `WB_BANNER` as it is. The comma condition is what distinguishes a
   continuation from a banner, and it should be stated in the comment.

Two things in the same finding that live elsewhere:

4. The page initials `PW` reach `dataset.battlekit` from the **rulebook's**
   Battlekit chapter, not the Warbands book: the shipped `Shotgun` carries the
   keyword `SHOTGUN PW` and the `Bayonet` `CUMBERSOME PW`. `chapterLines` in
   the same file strips page furniture for that chapter; add `PW` there the
   way `parseExploration` strips `VM` (`parse-campaign.mjs` line 252), with the
   same kind of comment saying it appears as a bare mark and is not an
   abbreviation the book uses. Confirm with a grep before adding it, and fail
   the build if a keyword still ends in a two-letter capital token that is not
   in the Keywords chapter.
5. `src/rules/arsenal.ts` line 105 takes `b?.rules ?? [p.rules]`. A book entry
   with `rules: []` is not "the book has no rules" but "the parser read none",
   and after this fix the eight items in DA-06 will have theirs. Leave the
   line alone; the fix is upstream. If, after the rebuild, an entry still has
   an empty array where the catalogue has a rule, that is a new parser
   finding, not a reason to fall back.

### The test

A new `parseBattlekit.test.mjs` in `scripts/__tests__/` (the directory already
holds `docPaths.test.mjs`, so vitest picks it up):

- `parseWarbandsBattlekit()` returns a `Punt Gun` whose `keywords` include
  `SHOTGUN` and `SHRAPNEL` and whose first rule starts `Overcharge`. Same for
  `Trench Mortar` (`IGNORES COVER`, `SCATTER`, `High Trajectory`) and
  `Engineer Body Armour` (`NEGATE SHRAPNEL`, `Ballistic Box Armour`).
- No entry from either parser has a keyword or rule string matching
  `/\b[A-Z]{2}$/` that is not a Keywords-chapter name.
- The count of `unreadable` entries does not rise.
- The keyword-only wrapped rows are the Titan Zulfiqar and the Corruption
  Belcher; the Ophidian Rifle carries a rule as well (PR #64).

### Acceptance

`npm run rules:audit:battlekit` before and after, in the PR body. The
"keywords differ" and "rules differ" groups each lose the eight DA-06 items;
nothing else in the report changes. `rules:check` still passes; the generated
files differ only in those entries' `keywords` and `rules`.

Docs: `DATA-SOURCES.md` if it describes the Warbands parser; otherwise the
comment at the top of `parseWarbandsBattlekit` is the record.

## FD-02. DA-07: a Dispatch price change never reaches the price

### Root cause

`dispatch-01.layer.json` line 245: `setCost` on `{ kind: "weapon", id:
"Incendiary Grenades" }`, value 10, from a Dispatch line that says "in the
following Armoury Tables: New Antioch, Trench Pilgrims, Iron Sultanate,
Heretic Legions, The Court". `applyLayer` (`scripts/lib/layers.mjs` lines 403
to 407) writes `target.cost.ducats` on **one** weapon profile, whichever copy
the name resolves to first. The dataset carries seven profiles named
Incendiary Grenades, one per faction, and seven armoury rows for it; after the
layer runs the Iron Sultanate profile reads 10 and everything else reads 15.

The app reads both. `priceOf` (`src/rules/armoury.ts` line 55) reads the
armoury row. `store/slices/units.ts` lines 35 and 266 and `rules/costs.ts`
line 160 add `weapon.cost`, the profile. `rules/fromWarband.ts` lines 197 and
294 try the row and fall back to the profile. So the price of one grenade
depends on which screen asks.

The armouries are assembled after the layers run (`scripts/rules-build.mjs`
lines 803 to 815 and 881 to 919), which is why `addArmouryRow` is deferred to
`applyArmouryRowOps` in `layers.mjs`. `setCost` never was.

**Corrected by PR #61, measured through the app's own accessors.** Two weapon
profiles carry the exact name, not seven: the Iron Sultanate's and a `Ranged
Weapons` section entry. The seven are armoury rows, and all seven read 15
before the change, the Iron Sultanate's included, so the Dispatch price
reached nothing a player was charged. Armouries are keyed by slug and weapon
profiles carry the printed faction name, so the match normalises both sides.
The rule is that every named Armoury Table must stock the item, not that every
named faction must own a profile; and the op accounts for itself once in the
deferred pass however many rows it sets. The change below stands with those
four readings.

### The change

1. **The op names its factions.** In the Dispatch layer, the weapon `setCost`
   gains `"factions": ["new-antioch", "trench-pilgrims", "iron-sultanate",
   "heretic-legions", "court-of-the-seven-headed-serpent"]`, the five the
   Dispatch line names, as the `factionId` slugs `rules-build.mjs` uses. The
   Procession and the Naval Raiders are not in the list and keep 15 unless
   their own source says otherwise. The four unit `setCost` ops (lines 64,
   74, 605, 617) are untouched: units are single entries priced from
   `unit.cost`.
2. **The engine applies it in both places.** In `applyLayer`, a `setCost`
   whose target is a weapon and which carries `factions` updates every weapon
   profile of that name whose `factionId` is in the list (unresolved if any
   listed faction has no such profile), and pushes itself onto `deferred`. In
   `applyArmouryRowOps`, a deferred `setCost` sets `row.cost[currency]` on the
   matching row of each listed faction's armoury, unresolved if a listed
   faction does not stock it. A weapon `setCost` **without** `factions` is
   rejected as unresolved: the old behaviour of updating one unnamed copy is
   the defect.
3. **Provenance.** Profiles are stamped as now. Armoury rows carry none
   (`findMissingProvenance` does not walk them); add `source: <layer id>` to
   the row the op touched so `rules:audit:battlekit` can say "row 10, catalogue
   15, set by dispatch-01" instead of reporting it as drift.

Not in scope, but say it in the PR: the four readers of `weapon.cost` are a
second price authority and should become `priceOf` calls. That is its own
finding.

### The test

A new `layers.test.mjs` in `scripts/__tests__/`, on a fixture dataset with three
factions each carrying a profile and a row for the same weapon:

- a weapon `setCost` with two of the three factions changes exactly those
  two profiles and, after `applyArmouryRowOps`, exactly those two rows;
- a weapon `setCost` without `factions` is unresolved and changes nothing;
- a listed faction with no such row is unresolved.

And against the shipped dataset, in the armoury tests under `src/rules/__tests__/`:
`priceOf(armouryFor(DATASET, 'new-antioch'), { name: 'Incendiary Grenades' })`
reads 10 and the Procession's reads 15; every weapon profile named Incendiary
Grenades in a listed faction reads 10.

### Acceptance

`rules:audit:battlekit`'s armoury-price section stops listing Incendiary
Grenades for the five factions. `rules:check` passes. `docs/RULESET-MODEL.md`
gains the `factions` field on `setCost` in the layer vocabulary, and the
statement that a weapon price change without a faction list is an error.

## FD-03. RR-02, second half, and RR-24: Campaign Victory Points; no MVP

### Root cause

Page 95, lines 5283 to 5289: the winner scores 15 Campaign Victory Points,
the loser 7, both 10 in a draw, and the player with the most at the end wins
the campaign. Nothing in the app records or derives them. `CampaignMember`
(`src/types/campaign.ts` lines 1 to 14) carries `wins`, `losses` and `draws`,
which is enough to derive them; `glory` and `rating` are what the Hub sorts
on. RR-24: the wizard's "Match MVP" writes an invented deed onto the roster
(`store/slices/campaign.ts` lines 480 to 483).

### The change

1. **Derive the scale, never type it.** `parseCampaignVictoryPoints()` in
   `parse-campaign.mjs` reads the three bullet lines at 5286 to 5288 and emits
   `campaign.victoryPoints = { win, loss, draw }`, failing if any of the three
   is missing. `rules-build.mjs` adds it beside `thresholds`.
2. **Derive the total, never store it.** `campaignVictoryPoints(dataset,
   member)` in `src/rules/campaign.ts` returns
   `wins * win + losses * loss + draws * draw`. It is a function of the record
   the app already keeps, so nothing new syncs and nothing can drift. Legendary
   Locations and the Patron's Visit add points outside this formula; those
   are an `adjustments` ledger later, not now, and the function's comment
   says so.
3. **Show it.** The Campaign Hub standings get a CVP column and sort on it,
   with Glory beside it as the `classic` framework's own tiebreak. The
   Weather module's "player with the fewest Campaign Victory Points" calls the
   same function.
4. **Delete the MVP.** Remove `mvpUnitName` from the wizard's step, from
   `applyPostBattleResults`'s parameters, and the `Match MVP:` deed write.
   Keep `mvpUnitName` as an optional field on `MatchRecord` so old records
   still parse; write it nowhere.
   **Withdrawn.** The deed write went in #59. The narrative field stays by
   the owner's decision, relabelled "Standout model (battle report only)",
   and #68 lets it name a model from any roster or a typed name.

### The test

`campaignVictoryPoints(DATASET, { wins: 2, losses: 1, draws: 1 })` equals
`2 * DATASET.campaign.victoryPoints.win + ...`, computed in the test from the
dataset, and the three dataset values are positive integers with `win > draw
> loss`. A store test that a post-battle commit writes no deed starting
`Match MVP`.

### Acceptance

`docs/FEATURES.md` row for campaign scoring updated; `docs/RULESET-MODEL.md`
lists the new campaign field; `docs/CHRONICLE.md` if it mentions the MVP.

## FD-04. RR-03 and RR-04: Advancement Rolls, and the Experience track

### Root cause

The wizard's Promotions step offers `'+1 Melee', '+1 Ranged', '+1 Armour',
'+1" Move', 'Eagle Eye (Skill)', 'Mighty Blow (Skill)', 'Diehard (Skill)',
'Shadow Walker (Skill)'` (`PostBattleWizardModal.tsx`, the `unitAdvancements`
map) and the store appends the string to `unit.advancements`. The game has no
characteristic advances and three of those Skills do not exist. Those three are Eagle Eye, Mighty Blow and
Diehard; Shadow Walker is a real Stealth Skill, offered here as a free pick
rather than rolled for (confirmed in PR #62). `UnitAdvancementModal.tsx`
line 385 says "5 XP unlocks an official Compendium Skill roll" and
`CodexView.tsx` lines 801 to 811 roll uniformly over a 2D6 table.

The book, page 105, lines 6030 to 6045: Experience is checked off box by box;
"when you reach a box that is a circle, you can make an Advancement Roll".
The roll: pick two Skill tables, roll 2D6 on each, if the Skill is already
held take the next lowest the model lacks (or the next highest if none
lower), a Patron Skill result means one of the Patron's Skills, then pick one
of the two. A promoted model "begin[s] with 0 Experience Points" (lines 5984
to 5987).

The circled boxes are on the roster sheet, which the text extraction does not
carry. The catalogue encodes them: `Campaign Rules.cat` line 5762 opens the
`Advancement` group holding `Elite Promotion` (line 5764, max 1) and
`Experience` (line 5893, max 18 at the constraint below it); the `Skills`
entry link's modifiers (lines 5929 to 5955) raise the Skills allowance to 1
through 6 when the group's selection count exceeds 1, 3, 6, 9, 13 and 17. For
a model that started ELITE that is an Advancement Roll on reaching 2, 4, 7,
10, 14 and 18 Experience. Because the count includes the `Elite Promotion`
selection, NewRecruit rolls a promoted model one point early; the book does
not say that, and the derivation below counts Experience alone.

### The change

1. **Derive the track.** `parseExperienceTrack(cat)` in `parse-campaign.mjs`
   reads the `Experience` entry's `max` and the `Skills` link's `greaterThan`
   thresholds, and emits `campaign.experience = { max: 18, advancementAt: [2,
   4, 7, 10, 14, 18] }` (each threshold plus one), provenance `catalogue`.
   Fail if the thresholds are not strictly increasing or exceed `max`. The
   comment records the promotion quirk above and that the roster sheet page
   is the thing to check this against when a PDF with extractable sheets
   exists.
2. **Rules module.** In a new `advancement.ts` under `src/rules/`:
   - `advancementRollsDue(dataset, unit)`: the count of `advancementAt`
     values `<= unit.xp` minus the rolls the model has taken. Track the taken
     count as `unit.advancementRolls` (a number, new, optional) rather than
     inferring it from `skills`, because Patron and Glory Item Skills are not
     rolls.
   - `advancementRoll(dataset, tables: [name, name], rolls: [n, n], held:
     string[], patronSkills: string[])`: returns the two candidate Skills with
     the next-lowest and next-highest substitution and the Patron
     substitution applied, from `dataset.campaign.skills`.
3. **The wizard.** Replace the eight-button grid with, for each ELITE model
   whose new Experience total crosses a threshold: the two-table picker, a
   2D6 roll per table (entered or rolled), the two candidates, and a choice.
   The chosen Skill is written to `unit.skills` as `{ name, category, roll,
   effect }`, `unit.advancementRolls` increments, and nothing is written to
   `unit.advancements`. A model with `Head Wound` is excluded by the existing
   `xpBarringInjuries`.
4. **The sentence and the roller.** `UnitAdvancementModal` shows "Advancement
   Roll at N XP" from the track, with the manual XP buttons kept. The Codex
   roller rolls 2D6 and looks the sum up in the table's `roll` field; the card
   view labels a row by its `roll`, not by index.
5. **The store.** `applyPostBattleResults`'s `advancements` parameter becomes
   `skillsLearned: { unitId, skill }[]`; the `unit.advancements` write goes.
   Keep the field on the type for old rosters; nothing new writes it.

### The test

Against `DATASET`: `campaign.experience.advancementAt` is strictly increasing
and ends at `max`; `advancementRollsDue` for `xp: 4, advancementRolls: 1` is
1; `advancementRoll` on the Melee table with a roll the model already holds
returns the next lowest, and on a roll of 2 returns a Patron Skill from the
list passed in; a store test that a commit writes to `skills` and never to
`advancements`.

### Acceptance

`docs/RULESET-MODEL.md` (new campaign field, provenance `catalogue` with the
reason), `docs/FEATURES.md` rows for Skills and Experience, `docs/ROSTER-FILE.md`
field inventory for `advancementRolls`.

## FD-05. RR-25, RR-11, RR-12: one economy, in three PRs

Order matters here: the dead model first because it is small and the other
two count models; the Threshold second because it changes what the builder
measures without touching money; the Strongbox last because it is a
data-model change with a migration.

### FD-05a. RR-25: a dead model leaves the roster

Root cause: `applyPostBattleResults` sets `isDead: true` and nothing else.
`WarbandBuilder.tsx` line 144 sums every unit into `totalCost`, `toRoster`
(`rules/fromWarband.ts` line 203) has no `isDead` filter, `PlayModeView.tsx`
line 333 deploys every unit by default, and the card stays on the roster.
Page 101, line 5795: "Remove the model and its Battlekit from your Warband
Roster".

The change: a dead model, and an unransomed capture, moves from
`warband.units` to a new `warband.fallen: ActiveUnit[]` in the same commit,
with `diedInMatchId` set, its Battlekit still on it (it is removed with the
model, not returned to the Arsenal). `units` never holds a dead model again.
On roster load, any unit with `isDead: true` is moved to `fallen`, which is
the compatibility rule `docs/ROSTER-FILE.md` asks for. The Codex and the
history view read `fallen` for the memorial. `isDead` stays on `ActiveUnit`
for old files; nothing new sets it.

Test: a commit with one dead casualty leaves `units` one shorter and
`fallen` one longer; `toRoster` and `deployedUnitIds` never see it; a roster
file with an `isDead` unit loads with it in `fallen`. Docs: `ROSTER-FILE.md`
(field inventory and the migration), `CAMPAIGN-SYNC.md` if the warband
payload lists fields, `CHRONICLE.md` if it mentions the dead.

### FD-05b. RR-11: the Threshold caps the Force, and the roster knows who sits out

Root cause: `WarbandBuilder.tsx` line 122 resolves `forceLimits` and uses it
only for the badge (lines 462 to 467); lines 144, 482, 489 and 554 measure
against `warband.ducatLimit`, which is the founding allowance and never
changes. `checkForceLimits` (`rules/validate.ts` line 930) has no caller.
Page 97, lines 5443 to 5460: the Threshold and Field Strength cap the Force
fielded; models over the line "sit the game out".

The change:

1. `unit.benched?: boolean`, toggled from the unit card ("Sits out this
   game"), persisted with the roster. Play Mode's default deployment
   (`PlayModeView.tsx` line 333) becomes the unbenched units.
2. The builder's measure for a campaign warband is the Force: `forceCost` and
   `forceCount` over unbenched units, compared with
   `forceLimits(dataset, campaignGameOf(warband, campaign), variantId)`
   through `checkForceLimits`, whose two warnings become the messages at
   lines 482 to 554. `ducatLimit` is measured only when `forceMode ===
   'unrestricted'`.
3. Before the first game the Threshold is 700 and equals the founding
   allowance, so the founding check is the same check; no special case.
4. Field Strength counts only models with a Warband Entry, which is every
   `ActiveUnit` today; say so in the comment so a Battlekit-model feature
   later knows to exclude itself.

Test: a warband in a campaign at game 2 with 780 Ducats fielded shows no
warning; the same at game 1 shows `force-over-threshold` with 80 Ducats
named; benching a 100-Ducat model clears it; `deployedUnitIds` default
excludes the benched model. Docs: `FEATURES.md`, `ROSTER-FILE.md` for
`benched`.

### FD-05c. RR-12 and RR-08: the Strongbox is the ledger

Root cause: `docs/RESTRUCTURE-PLAN.md` line 419 states the design;
`rules/campaign.ts` implements it (`strongboxOf` line 275, `reversible` line
290, `LedgerEntry` line 259); the ledger is written once, at founding
(`store/slices/roster.ts` line 156), and `treasuryDucats` is the stored total
everywhere. Hiring (`store/slices/units.ts` line 15) never debits; `buyToStash`
(`roster.ts` line 606) clamps at zero instead of refusing; `sellFromStash`
(line 622) rounds down where page 121, lines 7278 to 7283, rounds up; a
Glory-priced item debits Ducats because `StashedItem` (`types/warband.ts`
line 84) has one `cost` number.

The change:

1. `treasuryDucats` and `gloryPoints` become derived: a selector
   `strongbox(warband) = strongboxOf(warband.ledger)`. The two fields stay on
   the type and are written on every change as a cache for old readers and
   the cloud payload, but no code path reads them for a decision.
2. Every movement is a ledger entry with a `reason` from `LedgerReason` and
   the `game` from `campaignGameOf`: founding (exists), `exploration` loot
   (the wizard's step 5), `quartermaster` for a hire, an equip from the
   armoury, and `buyToStash`, `sold` for a sale at `Math.ceil(cost / 2)`,
   `ransom`, `reinforcements` (an entry for minus the balance, so the history
   shows it), `admin-grant` and `admin-adjust` as now.
3. A purchase the Strongbox cannot cover is refused in the store and
   disabled in the UI with the balance shown. No `Math.max(0, ...)`.
4. `StashedItem` gains `currency: 'ducats' | 'glory'`, taken from the armoury
   row at purchase; a Glory item debits Glory.
5. Migration on load: if `ledger` is missing or its sum differs from the
   stored `treasuryDucats` / `gloryPoints`, append one `admin-adjust` entry
   for the difference with the note "reconciled from the stored total on
   upgrade", so no existing player's balance moves. Unrestricted warbands get
   no ledger and keep the stored fields.

Test: hire, equip, buy, sell, ransom in sequence and compare `strongbox()`
with the sum done in the test; a purchase over the balance throws and changes
nothing; selling a 45-Ducat item credits 23; a Glory item debits Glory only; a
roster with `treasuryDucats: 120` and a founding-only ledger loads with a
balance of 120 and one reconciliation entry. Docs: `ROSTER-FILE.md`,
`CAMPAIGN-SYNC.md` (the ledger is the authority; the cached fields are not),
`RESTRUCTURE-PLAN.md` line 419 marked done.

**Split, as landed.** PR #73 carries items 3 and 4 — the refusal, the
rounding and the currency — as FD-05c, and defers items 1, 2 and 5 (the
ledger as the authority, every movement an entry, the reconciliation on
load) to FD-05d. Accepted: the three are rules defects provable on their
own, and a money migration hiding behind them is the worse diff. Two things
FD-05d must also carry, found reviewing #73: the Arsenal modal buys from the
store's legacy `weapons`, `armour` and `equipment` lists, not from
`armouryFor`, so no row it offers carries a currency and the `currency` #73
added never reaches the store from the UI; and a hire still never debits
(`store/slices/units.ts` line 15), which is item 2's first entry.

**Corrected by the developer's FD-05d probe, verified here.** The root cause
above said the ledger is "written once, at founding" and left it at that.
It is worse: `createWarband` (`store/slices/roster.ts` lines 154 to 169)
opens the ledger with an entry crediting the WHOLE founding allowance and
writes `treasuryDucats: 0` on the same object, and nothing ever debits the
entry. The ledger and the Strongbox have disagreed by the full allowance
since the moment of founding, on every campaign Warband. So item 5's
reconciliation cannot append "the difference": nothing has ever read these
entries, and the stored balance is the only number a player has seen. The
migration OPENS the account from the stored balance, once, and keeps the
founding figure as a note. The developer also names FD-05e, which it holds
back deliberately: the founding allowance and the Strongbox are one pot
(the Warbands book's "any unspent Ducats are put into your Warband's
Strongbox", cited as page 10; the PR must quote the line), so a Warband
founded on 700 that spends 620 holds 80 and today holds 0. FD-05d moves no
number; FD-05e corrects one.

### FD-05e. The founding allowance and the Strongbox are one pot

From PR #75's body, verified against the book: Warbands line 441, "Any
unspent Ducats are put into your Warband's Strongbox", and page 123's Hire
New Recruits, "in the same way as you did when you first created it". The
app treats the allowance and the Strongbox as two pots, so a Warband
founded on 700 that spends 620 holds 0 where the book says 80, and a hire
never debits because there is nothing to debit from. Three parts, one PR,
because a hire that debits without the founding credit leaves every
campaign Warband unable to recruit: the founding muster books the
allowance as a credit; recruiting books a `quartermaster` debit; the
builder's budget is the Strongbox, not `ducatLimit`. Migration for a
Warband already in play: its opened balance stands, and the cost of its
roster is not re-charged. Test: found on 700, recruit 620, hold 80; hire
in the Quartermaster Step, hold less by the price; an existing roster
loads with the balance it had.

### FD-05f. A Glory-priced item in the Arsenal is free

From PR #75's addendum, verified: `ArmoryStashModal` renders every row
with the Ducat field as its cost and never reads `gloryCost`, so an item
priced only in Glory prints "0 D", is always affordable, and is bought for
nothing; the dataset carries 113 non-zero Glory prices. The developer's
design question, "`Cost` has both fields and `StashedItem.currency` is one
discriminator, so an item priced in both cannot be represented", is
answered here: a stashed item carries `price: Cost`, both numbers, as the
Armoury row does; `cost` stays as the Ducat number for readers that exist
and `currency: 'glory'` on an older stash reads as a price of zero Ducats
and `cost` Glory. Buying debits both fields and is refused if either
Strongbox is short; selling credits half of each, rounded up. The modal's
rows come from `armouryFor` with the row's `Cost`, and `BuyRow` prints
whichever currencies the price has. Test: a 4-Glory item debits 4 Glory
and no Ducats; a 30-Ducat item debits no Glory; an item with both debits
both; an old stash entry marked `glory` sells back in Glory.

## FD-06. RR-05: the Promotions and Experience Step

### Root cause

Step 3 of the wizard (`src/components/campaign/PostBattleWizardModal.tsx`
from line 1020) awards the survivor's Experience Point and offers the RR-03
list. There is no Promotion Pool, no roll and no miss counter; promotion is
`handleToggleElite` in `src/components/builder/UnitAdvancementModal.tsx` line
189, a free switch. The award is a flat 1 (`earnsExperience`,
`src/rules/trauma.ts` line 245).

The second point for a Glorious Deed (page 105, lines 6027 to 6029) is not
awarded, and it is not derivable today: Play Mode records a Deed against a
side, not a model. `completedDeeds` in `src/rules/matchState.ts` line 25 is
title to turn, and `src/rules/battleFromMatch.ts` lines 91 to 104 carries that
into `DeedClaim` with a `sideId` and no model. **This corrects RR-05**, which
said the model was known; the review document carries the same correction.

**Corrected by PR #70:** the value under that comment held the performer's
name, written by a picker Play Mode had all along; the comment was wrong, not
the review. The id was not stored, so the award could not safely be made from
a name a player can edit. #70 stores `unitId` and `unitName` on the mark and
the claim, recovers a name misfiled as `turn` in every record already written,
and derives the second point from the id.

The book, page 104 to 106 and 111:

- the Pool is 1D6 plus 1D6 per Glorious Deed, plus Show Off (lines 5956 to
  5965; `campaign.skills` carries Show Off's text);
- no third die on a Troop until every Troop has two, and so on (5966 to 5971);
- roll one die at a time, a 6 promotes, note misses in a row on the Roster,
  after five the sixth is a 6 (5972 to 5979);
- a promoted model gains ELITE, a new entry, 0 Experience and then the point
  for surviving (5980 to 5987);
- skip the step at 6 ELITE, stop when a promotion makes 6 (6010 to 6015);
- Models That Cannot Be Promoted, a faction-by-faction table that the extract
  prints cleanly at lines 6123 to 6139 as a faction heading followed by names
  or `-`;
- Limited Potential, 7 Experience at most, the same shape at lines 6425 to
  6438.

The dataset carries LIMITED POTENTIAL as a keyword on six units; the book's
list has seven. The Brazen Bull is the difference, and its entry was replaced
by `dispatch-01`, so the Dispatch's own keyword row decides, not this page.

**On the assignment rule, from the review of PR #69.** Page 104, lines 5967
to 5971: "You cannot assign a 3rd dice to the same model until all Troop
models in your Warband have at least 2 dice each, or assign a 4th dice until
all Troop models have at least 3 dice each, and so on." The constraint starts
at the third die: a model may hold k dice, for k of 3 or more, only when every
eligible model holds at least k minus 1. A second die is unconstrained, so two
dice on one Troop while another holds none is legal. A rule written as "the
most may exceed the least by no more than one" forbids that legal case and is
stricter than the book.

**Corrected by PR #63, with evidence.** The catalogue gives all seven of the
book's models LIMITED POTENTIAL and `dispatch-01` removes the Bull's, so this
is precedence working: `experienceCap` reads the keyword, the table ships as
provenance, and the build prints the one disagreement. A faction heading with
nothing under it is not a failure: two factions print a bare `-` in each
table, and that is the book saying none. The failures worth catching are a
heading that resolves to no faction, a model name that resolves to no unit,
and a number whose sentence stopped matching; page 111 breaks its number onto
the next line, so the numbers are read from the joined text. Faction headings
are spelled three ways across the book, the faction list and the unit label,
so the match is a two-way subset on stemmed words. Three of the four names
the dataset appeared not to have were the catalogue's entry name against its
profile name (`Anchorite Shrine` / `Anchorite`), so units now carry
`entryName`; the one real rename, the book's `Fly Thralls` for the catalogue's
`Winged Thrall`, is a cited equivalence in a
`promotion-model-names.json` file under `data-sources/rulebook/` (on PR #63)
that fails the build in both directions.

### The change

1. **Derive `campaign.promotions`** in `parse-campaign.mjs`:
   `{ poolBase, poolPerDeed, promoteOn, autoAfterMisses, maxElites,
   cannotPromote: [{ faction, models }], limitedPotential: { maxXp, models:
   [{ faction, models }] } }`. Each number is read from its sentence; the two
   tables are read by one function that takes the heading and returns faction
   to names, because both pages print the same shape. Fail if a number is
   missing or a faction heading has nothing under it.
2. **A rules module**, a new `promotions.ts` under `src/rules/`:
   `promotionPool(dataset, deeds, showOffCount)`;
   `assignmentIsLegal(assignment)`; `rollPromotions(assignment, rolls,
   missesBefore)` returning each model's outcome and the new miss count, a 6
   resetting it; `canBePromoted(dataset, unit, eliteCount)`;
   `experienceCap(dataset, unit)`.
3. **Roster.** `warband.promotionMisses?: number`: the book says to note it
   "on your Roster", so it is one count per warband, and the comment says
   that is a reading of an ambiguous sentence. `unit.isElite` stays as the
   promotion flag; the promoted unit's `profileSnapshot.category` becomes
   `Elite`.
4. **Step 3, in the book's order.** The Maximum Elites check, then the pool
   with its parts shown, then assignment with the rule enforced, then the
   roll (entered or rolled, one die at a time), then the promotions, then
   Experience: the point for surviving, the point for a Deed, War Stories,
   Bitter Lessons (D3, which the wizard shows and does not apply), each
   capped by `experienceCap`.
5. **A Deed knows its model.** `completedDeeds` values become `{ turn,
   unitId? }`, set from a model picker when the Deed is claimed in Play Mode;
   a Deed claimed with no model is still the side's. `DeedClaim.unitId?` and
   `MatchHandover.deedUnitIds` carry it through. Old records read as before.
6. **The switch goes.** `handleToggleElite` is removed; promotion happens in
   the step. An admin override, if the group wants one, is an admin tool with
   a note in the history, not a button on every card.
7. Latecomers (page 95, lines 5290 to 5300) stay a separate item.

### The test

Against `DATASET`: `promotions.maxElites` is 6 and `limitedPotential.maxXp`
is 7, read in the test from the dataset rather than typed; `cannotPromote`
lists the Amalgam under the Cult; `promotionPool` with two Deeds and one Show
Off is the dataset's base plus three; `assignmentIsLegal` rejects a third die
while another Troop has one; `rollPromotions` with four misses and a roll of 3
promotes and resets the count; a promoted model reads 0 before the award and
1 after; Experience on a LIMITED POTENTIAL model never exceeds the cap; a
handover from a record with a model on a Deed awards that model 2.

### Acceptance

`docs/RULESET-MODEL.md` (`campaign.promotions`), `docs/FEATURES.md` rows for
Promotions and Experience, `docs/ROSTER-FILE.md` (`promotionMisses`, the deed
`unitId`), `docs/CHRONICLE.md` (`DeedClaim.unitId`).

## FD-07. RR-10: the Exploration roll

### Root cause

`handleRollExploration` (`PostBattleWizardModal.tsx` line 430) sums N dice
with `explorationDice(dataset, gamesPlayed) ?? 3`, which is rule 2: a dataset
that cannot say gets three. There is no re-roll; page 113, lines 6552 to
6555: one die may be re-rolled, a second if the game was won, never the same
die twice. `warband.explorationDiscoveries` has a reader (wizard line 410) and,
by grep at `bdf0bd8`, no writer; confirm that before anything else, because
if it holds it means every Location found so far was never recorded.
Exploration Skills (page 115, lines 6666 to 6700) and Pot of Manna have no
field to live in.

### The change

1. Drop the `?? 3`. Where `explorationDice` returns null the step says the
   ruleset carries no Exploration band for this game and the roll is
   disabled; the manual entry stays.
2. Keep the dice as an array in state and render them. After the first roll,
   a die can be tapped to re-roll, once each, up to one die, or two when
   `handover.result` is `Victory`; the total updates. The rule text sits
   beside the dice.
3. `warband.explorationEffects?: { name, source, sinceGame }[]`, written when
   a Location's text grants one. The seven Skills come from page 115 into
   `campaign.exploration.skills` by name and text; each Location's grant is
   read from its own text ("gains the Re-roll Exploration Skill"). The roll
   applies Extra Dice, Re-roll and Lucky as arithmetic and lists Duplicate,
   Set Dice, Seek and Circle Back for the player to apply by hand until they
   are modelled. Pot of Manna is `lootBonus` on the same record.
4. The writer for `explorationDiscoveries`, if it is missing.

### The test

A null band disables the roll and never yields three dice; one re-roll after
a loss, two after a win, and the same die cannot be re-rolled twice; a warband
with Extra Dice rolls one more; loot with Pot of Manna is the roll times the
dataset's `lootPerPoint` plus ten; a Location that grants a Skill leaves it in
`explorationEffects` after commit.

### Acceptance

`docs/ROSTER-FILE.md` for the new field, `docs/FEATURES.md` for Exploration,
and the RR-10 entry in the review marked with what landed.

## FD-08. DA-01 and DA-02: abilities a Variant reveals, and a second Unit profile

### Root cause

DA-01. The catalogues mark an Ability profile `hidden="true"` when a Variant
owns it and reveal it with a `set hidden=false` modifier whose condition names
the Variant (`New Antioch.cat` line 4246, Weapon Familiarity, is the shape).
`scripts/lib/parse-battlescribe.mjs` reads the profile and not the attribute,
so `unit.abilities` carries no `hidden`, and `recruitable()`
(`src/rules/recruitable.ts` line 271) copies every ability into
`innateAbilities`. `applyVariant` (`src/rules/applyVariant.ts` line 64) runs
only the Variant's own `ops` and breaks on `field === 'hidden'`; the unit's
`modifiers` with a `profile:<name>` origin, which are where the catalogue's
reveal lives, are read by nothing but `variantLocks`, and that reads them for
the unit as a whole, never per ability.

The shipped Shocktrooper carries one reveal modifier, for Axe Mastery, where
the catalogue reveals four abilities. The dedup at the end of the modifier
reader (`parse-battlescribe.mjs`, the `seen` set after line 416) keys on the
rule with `origin` removed, so four identical "reveal when Remnants of
Byzantium" rules on four profiles collapse to one. Verify by counting the
Shocktrooper's `hidden` modifiers before and after that filter; if it holds,
that is the first fix.

The conditions are trees: the Shocktrooper's Shock Charge is hidden when
`all[Remnants of Byzantium, Shields, any[...]]`. Forty-three hidden toggles
on twenty units; eighteen name a Variant, the rest name the unit's own
selections (`Shields`, `Infected`, `Hellhound`, `Lost Arm [26]`) or a Court
sin, and eleven carry a compound `when` with no top-level name.

DA-02. `Black Grail.cat` line 3166 and 3207: the Thrall entry holds two
`upgrade` sub-entries, `Grounded` and `Winged`, each carrying a Unit profile.
The parser (line 872, first Unit profile per entry) emits one unit per
sub-entry, so `Winged Thrall` ships as a 0-Ducat unit with no roles, keywords
or abilities and `recruitable()` offers it. The Carcass Front layer already
has the shape for this: `secondaryProfile` (`scripts/lib/carcass-front-layer.mjs`
line 114), which `recruitable()` filters at line 169.

### The change

1. **Parser, abilities.** Record `hidden: true` on an ability whose profile
   attribute is `hidden="true"`. Key the modifier dedup on `origin` as well
   as the rule, so per-profile reveals survive; keep the entry-versus-profile
   collapse only when the origin is the same.
2. **Parser, profiles.** When an entry's Unit profile comes from a sub-entry
   and the entry has more than one, emit one unit from the parent (cost,
   limits, keywords, abilities from the parent; stats from the first
   profile) and each further profile as its own `UnitProfile` with
   `secondaryProfile: true`, the parent's `entryId` as `parentEntryId`, and
   the parent's cost, roles, keywords and abilities copied so the Codex card
   is not blank. Nothing new is typed; the Fly Thrall's statline is the
   second profile's.
3. **A visibility function.** `visibleAbilities(profile, ctx)` in
   `src/rules/applyVariant.ts`, where `ctx` is `{ variant, selections }`
   and `selections` is the names of the model's options, gear and injuries.
   Start from the abilities that are not `hidden`; walk the unit's
   `profile:<name>` modifiers with `field === 'hidden'` in order; evaluate
   `when` as a tree: `all` and `any` combine; a leaf with `scope: 'roster'`
   whose `childId` is a Variant's `entryId` or whose `childName` is a
   Variant's name is true when `ctx.variant` matches; a leaf with `scope:
   'self'` or `'model'` is true when `selections` holds `childName`; any
   other leaf is unknown, and an unknown leaf leaves the modifier unapplied
   and is reported by the build's cross-check so it cannot pass silently.
   `value: 'false'` reveals, `'true'` hides.
4. **Callers.** `recruitable()` builds `innateAbilities` with
   `visibleAbilities(u, { variant, selections: [] })`; the unit card, the
   recruit sheet and the Play Mode reference sheet call it with the
   `ActiveUnit`'s selections, so Shock Charge appears when the Shields are
   carried. An ability whose only reveal is a Variant is tagged
   `variantOnly: [names]` for the Codex, which shows every ability with that
   label rather than hiding it.

### The test

Against `DATASET`: the Shocktrooper's abilities with no Variant are `Shock
Charge` and `Assault Drill` and nothing else; with the Remnants of Byzantium
Variant they include Axe Mastery, Shield Bash, Indomitable and Weapon
Familiarity; the Desecrated Saint shows one Aura for one Court Variant and
none without; a Hound of the Black Grail with `Infected` among its
selections loses `Teeths & Claws`; no unit named `Winged Thrall` is
recruitable and the Thrall's secondary profile carries the Fly Thrall's
statline; a modifier with an unknown leaf is listed by the cross-check, and
the count is zero on the shipped catalogues.

### Acceptance

`npm run rules:audit:book` before and after: the `ability.variant (revealed
by X)` rows in the DA report go to zero, and the `APP ONLY` list loses
Winged Thrall. `docs/RULESET-MODEL.md` (`hidden` on abilities,
`secondaryProfile` from the catalogues), `docs/ROSTER-PATHS.md` if it names
the Thrall sub-entries.

## FD-09. RR-17 and RR-27: one game counter, and a post-game for every side

### Root cause

RR-17. `currentTurn` has two writers, `applyPostBattleResults`
(`src/store/slices/campaign.ts` line 667) and `logCampaignMatch` (line 982),
and each adds one. Neither queues a `campaign.settings` op; the only writer
of that op is the house-rules toggle (line 893). `docs/CAMPAIGN-SYNC.md`'s
authority table gives the turn number to the organiser. So three things go
wrong at once: a member's own post-battle moves a campaign-wide number, two
members each committing game 1 leave the counter reading 3, and the value
never reaches the cloud, so adoption (line 195, `currentTurn:
theirs.currentTurn`) puts it back. Every Threshold and Exploration band reads
this number through `campaignGameOf`.

RR-27. `handleEndMatch` (`src/components/play/PlayModeView.tsx`, #59 line
435) builds the handover for `primaryWarband` and opens one wizard. A side
that is another of the player's own warbands, or another user's in a hosted
match, gets no Trauma, no Experience and no Exploration; the Chronicle has
the game and the campaign does not. `BattleRecord.campaignMatchId` (#59,
RR-23) is one id per battle, which cannot hold two sides' post-battles.

### The change

1. **One writer.** `currentGame` is written only by
   `advanceCampaignGame()`, an organiser action in the Hub ("Start game
   N+1"), which queues `campaign.settings` with `{ currentGame }`. The two
   increments go. Adoption keeps taking the server's value, which is now the
   right one. An organiser setting `autoAdvance`, on by default for a
   campaign with one member, advances the game when every member has a
   `post_battle` snapshot for the current game.
2. **The game a warband is on** stays `campaignGameOf`, with its documented
   latecomer decision; nothing per warband changes.
3. **Per-side links.** `BattleRecord.campaignMatchIds?: Record<sideId,
   matchId>` replaces the single id; the old field is read as the primary
   side's entry. `BattleSide.deployedUnitIds?: string[]` is written from Play
   Mode's `deployedUnitIds` (line 149) so a post-battle run later, or
   elsewhere, still knows who sat out.
4. **Local sides.** After the wizard commits, if another side is a warband in
   the local store with no entry in `campaignMatchIds`, Play Mode offers
   "Post-battle for <name>": it sets that warband active and opens the wizard
   with `matchHandover(battle, { ownSideId: thatId, ... })`. It repeats until
   every local side is linked or the player declines.
5. **Remote sides.** The Chronicle already syncs the record. When a client
   holds a battle where one of its own warbands is a side with no entry in
   `campaignMatchIds`, the Campaign Hub lists it under "Unresolved battles"
   with a button that opens the wizard on that handover. Placeholder sides
   get nothing; they have no roster.

### The test

A post-battle commit leaves `currentGame` unchanged and queues no settings
op; `advanceCampaignGame` queues exactly one with the next number; two
members' commits do not move it; `autoAdvance` moves it once both have a
snapshot for the game. A battle with two local sides yields two match
records and both ids on the record; the unresolved list holds a battle until
its side is linked and not after; deployed ids round-trip through the
record and seed `satOutUnitIds`.

### Acceptance

`docs/CAMPAIGN-SYNC.md` (the counter's single writer and op),
`docs/CHRONICLE.md` (`campaignMatchIds`, `deployedUnitIds`, the unresolved
list), `docs/FEATURES.md`.

## FD-10. RR-13, RR-14 and RR-09: what the Quartermaster Step still lacks

Three small things and one branch, each its own PR, after FD-05.

### RR-13: `Limit: N` counts the Arsenal

`rules/validate.ts` lines 203 to 215 build `rosterCounts` from each unit's
`items`; `roster.stash` (`rules/fromWarband.ts` lines 279 to 289) is not
counted. Page 123, lines 7234 to 7238, counts "in its Arsenal and/or equipped
by a model". Add the stash to the count. Test: one equipped and one stashed
copy of a Limit 2 item refuse a third purchase, and a copy sold back allows
it again.

### RR-14: retiring at two Battle Scars

Page 123, lines 7214 to 7218. After FD-05a and FD-05c: a "Retire" action on
a unit card with two or more scars moves the model to `fallen` with
`retired: true` and its kit to the Arsenal, or sold at half rounded up
through the ledger. Test: a model with one scar has no action; with two the
action appears; retiring with "sell" credits the ledger `ceil(cost / 2)`.

### RR-14: Glory Items behind their gate

Page 125, lines 7373 to 7381: Glory Items are bought only after an
Exploration discovery permits it (Trench Merchant, Black Market, Black
Network), from the faction's Glory Item Table with its own stipulations.
`warband.explorationEffects` (FD-07) records the gate as an effect with the
Location's name; `armouryFor` exposes the Glory rows only when one is
present; each row's stipulation is read from the table as `restrictions`
are today. Test: a warband with no effect sees no Glory rows; one with the
Trench Merchant effect sees them; a "Limit: 1" Glory Item refuses a second.

### RR-14: the campaign scenario tables

Page 96, lines 5350 to 5384: Early (games 1 to 3), Mid (4 to 8), Endgame (9
to 11) D6 tables and the Great War at 12. Parse them into
`campaign.scenarioTables` in `parse-campaign.mjs` and have the Mission
Generator offer "Roll for game N" from `campaignGameOf`. Test: the three
tables cover 1 to 6 each, name only scenarios the dataset holds, and game 12
returns the Great War.

### RR-09: the Carcass Front branch

`rules/campaign.ts` implements the Carcass Front Exploration Step
(`resolveCarcassFrontExploration`, `hasThreeOfAKind`, `carcassFrontResources`)
with no caller. The wizard's step 5 branches on `campaign.framework ===
'carcass-front'`: three dice, three of a kind, the resource result, loot at
the supplement's rate. Test: a Carcass Front warband's step never calls
`resolveExploration` and its loot is the supplement's, read from the dataset.

## FD-11. The April 2026 Mercenaries review: the rest of the Mercenary entries

The owner asked for the app to be checked against the official "April 2026
Rules Review: Mercenaries" article. The article is a rationale post; the
card changes it announces are images, and the sandbox cannot reach the site
at all. Its rules text is the Mercenaries section of the Trench Dispatch,
pp.11 to 16, which is transcribed in
`data-sources/dispatch/trench-dispatch-01-april-2026.txt` lines 540 to 861.
That transcription, and the Warbands book for what the Dispatch does not
restate, are the sources below. Every line number is in those two files
unless it says otherwise.

### What the article changes, and where the dataset stands

Checked against the dataset the default ruleset builds on `main`:

| Entry | The Dispatch says | On `main` |
| --- | --- | --- |
| MERCENARY glossary keyword (L544–552) | new keyword | present |
| Combat Biologist (L553–564) | hosts NEW ANTIOCH and SULTANATE; keywords MERCENARY, NEGATE FEAR | both right; **no abilities and no Battlekit at all** |
| Communicant Anti-Tank Hunter (L565–576) | hosts; keywords | right |
| Mamluk Faris (L577–589) | hosts; keywords | right |
| Mendelist Ammo Monk (L596–628) | hosts; Ammunition Sacrament rewritten; keywords | right |
| Observer (L629–643) | hosts; Cost 5; keywords | right |
| Sister of Saint Cosmas (L644–655) | hosts PILGRIM; keywords MERCENARY, NEGATE FEAR | **the entry is still named "Combat Medic", carries no keywords, and is offered to all eight Warbands** |
| Sin Eater (L662–716) | Devour the Guilty rewritten; Tenderiser Maul rewritten (Mulch); keywords | ability and keywords right; **the Maul has the catalogue's old rule and is not on the model's Battlekit**; hosts unrestricted, so New Antioch may hire it |
| Scripture Guardian (L723–768) | whole entry replaced: Cost 7, any Warband, statline, Battlekit line, Slow, Vengeful Scripture as Battlekit | cost, hosts, statline, keywords right; **Slow has the catalogue's text; Vengeful Scripture is still an ability with the catalogue's older rules; Battlekit empty; no Vengeful Scripture weapon** |
| Goetic Warlock (L775–819) | whole entry replaced: Battlekit line, Powers, abilities, Flaying Iron Claws | cost, hosts, statline, keywords, abilities right; **the claws are still the catalogue's "Reaping Claws" with a rule the new profile does not print, and are not on the model's Battlekit** |
| Witchburner (L822–861) | whole entry replaced: Cost 6, statline, Battlekit line, four abilities, Gavel of Justice CRITICAL, FIRE | cost, hosts, statline, keywords, abilities right; **the Gavel lacks FIRE, still carries the catalogue's "Wrath of God" rule alongside Found Guilty, and is not on the model's Battlekit** |

So the numbers are right and the rules text is right where the layer wrote
it; what is missing is everything the layer's own `_note` lists as "STILL
OUTSTANDING", plus one thing it got wrong.

### Root causes

**1. The layer stopped where the entity model stopped.** Items 1 and 2 of
the `_note` in `data-sources/dispatch/dispatch-01.layer.json`. Item 2 is now
stale: `battlekitNote` exists (ops 74 and 89 use it) and `add` writes
weapons (ops 66 to 79). Item 1 is wrong: the Sister of Saint Cosmas IS in the
catalogues, as the Mercenaries entry named "Combat Medic" (entryId
`39c2-abb6-fef0-f96e`, profile id `aa7f-02df-a12f-1ed3`). Its two abilities
say "the Sisters" and "a Sister of Saint Cosmas", and its kit is hers
(Standard Armour, Gas Mask, Medikit, Misericordia, book L10382–10383). The
catalogue kept the model's pre-rename name; the layer took the name as
proof of absence.

**2. `forcedKitOf` reads one of four ways the catalogue states fixed kit.**
`scripts/lib/parse-battlescribe.mjs` lines 209 to 256 read only an
`entryLink` whose `min` equals its `max`. The Mercenaries catalogue also
states "always has" as:

- an `entryLink` with `min="1"` and no `max` — the Combat Biologist's Gas
  Grenades, Gas Mask and Standard Armour, `data-sources/battlescribe/Mercenaries.cat`
  lines 861 to 875;
- a nested `selectionEntry` with `min` = `max` = 1 carrying a Weapon
  profile — the Sin Eater's Tenderizer Maul (line 367, its profile at 373) and the
  Warlock's Iron-Clawed Hands, whose profile is Reaping Claws (1816 and 1818);
- a Weapon profile on the unit node itself, inline or through an
  `infoLink type="profile"` — the Biologist's Vivisector (line 833) and the
  Witchburner's Gavel of Justice (line 285).

The second and third shapes DO reach `dataset.weapons` (lines 1039 to 1046
emit them), but with the unit's own cost: the Gavel is a 6-Glory weapon and
the Vivisector a 3-Glory one in the dataset, because `cost` there is the
node's. Nothing sells them today, but a weapon that says it costs what the
model costs is wrong data waiting for a caller.

**3. `findTarget` takes the first name match.** `scripts/lib/layers.mjs`
lines 48 to 58. Two units are named "Combat Medic", and the New Antioch
Troop comes first, so a name-addressed op meant for the Sister would edit
the wrong model and report success.

**4. Nothing carries what the book states and the catalogue lacks.** The
Biologist's two abilities and Battlekit line (book L9802–9813), the Sister's
name, statline and "+1 INJURY DICE" (L10366–10392), the Sin Eater's hosts
"Fallen Warbands" (L10273), and each core faction's alignment (L1241,
L2744, L4100, L5994, L7254, L8380). `data-sources/resolutions.json` states
the precedence as Dispatch over rulebook over catalogue, but the rulebook
rung is applied only through a resolution, and a resolution is for a
CONFLICT. An empty catalogue field is a gap, and no gap is filled from the
book today.

### The change, in three PRs

#### FD-11a. Parser: fixed kit the catalogue states three other ways

`scripts/lib/parse-battlescribe.mjs` only, plus its tests.

1. `forcedKitOf` also reads the three shapes above. For a `min`-only link,
   quantity is the `min`. For a nested `selectionEntry`, `id` and `linkId`
   are the child entry's id and `profileId` its Weapon or Battlekit
   profile. For a profile the unit carries itself, `id` and `profileId` are
   the profile's id and `linkId` is the `infoLink`'s id where there is one,
   else the profile's. Keep `seen` by id so a weapon reached two ways is one
   entry. The rule the existing comment states still holds: a `min` on a
   GROUP is a choice and stays with `options`.
2. The weapon record emitted for a profile the unit carries (lines 1039 to
   1046) has cost zero, as the forced links do and for the reason the
   comment at lines 245 to 250 gives: the model is priced to include it.
3. `UnitCard` (`src/components/builder/UnitCard.tsx`) shows a forced WEAPON
   with its profile — type, range, keywords, rules — looked up by
   `profileId`, not just its name. Check whether it does; if it renders
   names only, add the lookup. `AddEquipmentModal` needs nothing: the rows
   it hides by Battlekit name (line 250) are armoury rows, and none of these
   weapons has one.
4. Check where the armour keyword on a Battlekit entry flows.
   `src/rules/recruitable.ts` line 383 reads an `INJURY MODIFIER` off the
   Battlekit; the Dispatch says "the Injury Modifier for any Armour they have
   has been included in the model's Profile" (L551–552). If that value is
   ever added to `stats.armour`, it must not be for a unit with the
   MERCENARY keyword. Report what you find in the PR body either way.

Tests in `scripts/lib/__tests__/pipeline.test.mjs`, fixtures in the style of
the Combat Medic test at line 584: one per shape, and one that the emitted
weapon costs zero. Then the built dataset, in `src/rules/__tests__/dispatch.test.ts`:
Combat Biologist's Battlekit names are Gas Grenades, Gas Mask, Standard
Armour, Vivisector; Sin Eater's are Combat Helmet, Reinforced Armour and the
Maul; Goetic Warlock's are Reinforced Armour and the claws; Witchburner's
are Combat Helmet, Reinforced Armour, Gavel of Justice; the Gavel and the
Vivisector cost 0 Ducats and 0 Glory.

Acceptance: `npm run rules:audit:battlekit` before and after. List in the
PR body every unit outside the Mercenaries whose Battlekit changed. Each
must be one the book prints as "always has"; one that is not is a bug in
the new rule, not a bonus.

#### FD-11b. Layers: the entries as printed, and a book layer for what the Dispatch does not restate

1. **Ambiguity guard.** `findTarget` in `scripts/lib/layers.mjs` returns
   unresolved when a name matches more than one entity, naming the ids, and
   the build fails as it does for any unresolved op. Test with two "Combat
   Medic" fixtures (the pipeline test at line 148 already builds that pair).
   Every op below that touches the Sister targets `aa7f-02df-a12f-1ed3`.

2. **Faction alignment, derived.** `parseFactionRules` in
   `scripts/lib/parse-warbands.mjs` already walks each Warband Creation
   block. Read the sentence that ends it — "New Antioch Warbands are
   Faithful." (L1241), "Trench Pilgrims are Faithful." (L2744), "The
   Sultanate of the Iron Wall are Faithful." (L4100), "The Heretic Legions
   are Fallen." (L5994), "The Cult of the Black Grail are Fallen." (L7254),
   "…Serpent are Fallen." (L8379–8380, wrapped) — into `alignment` on the
   faction, the field `src/types/catalogue.ts` line 476 already declares
   and the Carcass Front layer already fills for its two. A block with no
   such sentence fails the parse; do not default. Test: all eight factions
   in the built dataset carry one, three Faithful and three Fallen among
   the core six.

3. **`allowedAlignment` on a unit.** New optional field on `UnitProfile`,
   `'Faithful' | 'Fallen'`, for a host rule stated by alignment rather than
   by name. `src/rules/recruitable.ts` lines 302 to 305 resolve it to the
   factions whose `alignment` matches, ahead of the permissive default. The
   build fails if a unit states one and no faction carries an alignment: a
   filter that matches nothing is a hire nobody can make. The Carcass Front
   comment at `scripts/lib/carcass-front-layer.mjs` line 352 refused to
   invent an alignment for a Mercenary; this is not that — it is the
   book's own sentence, and the factions' alignments are now read, not
   assumed.

4. **A Warbands-book layer.** A new layer file, `warbands-book.layer.json`,
   in the layers directory `loadLayer` already searches
   (`scripts/rules-build.mjs` line 84), id `warbands-book`, applied
   BEFORE `dispatch-01` in the `trenchline` ruleset in
   `scripts/lib/rulesets.mjs`, so the Dispatch still wins. Same shape as the
   Dispatch layer: every op carries `_src` naming the book file and a line
   range. It holds only what the book states and the catalogue lacks:

   - Sister (`aa7f-02df-a12f-1ed3`): `set name` "Sister of Saint Cosmas"
     (L10366); `set stats.ranged` "+0 DICE" and `set stats.melee` "+0 DICE"
     (L10381 — the catalogue's bare "0" is the parse artefact op 46 records
     on the Witchburner); `replaceAbility` "Finish the Fallen" with the
     book's text, which says "+1 INJURY DICE" where the catalogue says
     "+1 DICE" (L10387–10392); `set battlekitNote` (L10382–10383).
   - Combat Biologist (`02df-b4d5-3ca5-9a2b`): `addAbility` "Battlefield
     Vivisection" (L9804–9809, the Gather Knowledge sentence included in the
     description) and "Prize Specimens" (L9810–9813); `set battlekitNote`
     (L9802–9803).
   - Sin Eater (`2d21-7af1-0770-da4c`): `set allowedAlignment` "Fallen"
     (L10273).

   The layer is a transcription, so prove it: a test in
   `scripts/lib/__tests__/` reads the layer and the extract and checks that
   every `name`, `battlekitNote` and ability `description` value appears in
   the cited lines after whitespace is normalised. An op whose text is not
   on its cited lines fails.

   The rename has consequences to check, not assume: `entryName` (the
   catalogue's "Combat Medic") is what promotions key on and stays as it
   is; `scripts/rules-audit-book.mjs` matches by name, so its "Sister of
   Saint Cosmas — no dataset unit" and "Combat Medic [Mercenaries] — no
   book entry" rows both disappear, and that is the acceptance check; any
   saved roster keeps its snapshot name and its stable unit id.

5. **Dispatch layer additions**, in `data-sources/dispatch/dispatch-01.layer.json`,
   each with `_src`, by id:

   - Sister: `setKeywords` MERCENARY, NEGATE FEAR (L655); `set
     allowedFactions` ["Trench Pilgrims"] (L650–651; the Procession follows
     by the delegation the build already applies).
   - Scripture Guardian (`3fe9-1530-6fcd-1855`): `replaceAbility` "Slow"
     (L754–755); `removeAbility` "Vengeful Scripture" — it is Battlekit now
     (L748, L757); `add` to `weapons` with id `dispatch01-vengeful-scripture`:
     type Special, range 18”, keywords ASSAULT, IGNORE COVER (L761), rules
     the Unmaking and Spoken paragraphs (L762–768), description L759,
     factionId "Mercenaries", cost zero; `set battlekitNote` to the whole
     Battlekit paragraph (L748–753); and the model's three fixed items.
     The parser cannot supply those — the catalogue entry links nothing —
     so add one op, `addBattlekit`, to `layers.mjs`: target a unit, name a
     weapon; it resolves the weapon by name in `dataset.weapons`
     (unresolved when the name matches none or more than one) and appends
     a `ForcedBattlekit` with `id` the weapon's `entryId` or `id`,
     `linkId` `dispatch01:<unit id>:<slug>`, quantity 1, the weapon's
     keywords, cost zero and `profileId` the weapon's id. Three ops:
     Reinforced Armour, Combat Helmet, Vengeful Scripture. Order the weapon
     `add` before them.
   - Sin Eater's Maul (weapon `c63d-fe53-a980-4a2a`): `set rules` to the
     Mulch paragraph (L708–714). Type, range and keywords already match
     L706–707. Leave the catalogue's "Tenderizer" spelling; the
     `_gearNames` mechanism in `data-sources/resolutions.json` is where a
     spelling ruling goes, and it is a ruling, not this PR's.
   - Goetic Warlock's claws (weapon `e8d8-c2a3-9a3e-b3b8`): `set name`
     "Flaying Iron Claws", `set type` "2-Handed", `set rules` to empty
     (L797–799: the new profile prints keywords and no rule; the
     catalogue's "even though it does not have a Melee Weapon" describes a
     model that now has one). Keywords already CLEAVE 2, CRITICAL. `set
     battlekitNote` (L785–786).
   - Witchburner's Gavel (weapon `ddce-0973-220d-51e0`): `set keywords`
     CRITICAL, FIRE (L863); `set rules` to empty — the Dispatch's Gavel
     prints none (L858–863) and Found Guilty (L853–855, already on the
     unit) is what replaced Wrath of God; with both, a Fallen model takes
     two extra markers. `set battlekitNote` (L835).

   Update the `_note`: strike items 1 and 2, say why item 1 was wrong, and
   record that ops on the Sister address the id because the name is shared.

Tests, in `src/rules/__tests__/dispatch.test.ts` against the built dataset:
the Sister by her name, keywords, hosts (Trench Pilgrims and the
Procession, not New Antioch), Finish the Fallen contains "+1 INJURY DICE";
Combat Biologist has the two abilities; Sin Eater's hosts are exactly the
Fallen factions and never New Antioch, the Pilgrims, the Sultanate or the
Procession; the Scripture Guardian has no ability named Vengeful Scripture,
has a Battlekit weapon of that name whose profile carries ASSAULT and
IGNORE COVER, and Slow reads "3”/Infantry when it takes a Dash ACTION"; the
Gavel's keywords are exactly CRITICAL, FIRE and its rules are empty; the
claws are "Flaying Iron Claws", 2-Handed, no rules.

Acceptance: `npm run rules:audit:book` before and after, in the PR body.
The Sister's two rows go; the Scripture Guardian's Slow row goes; count the
rest and they must be unchanged.

#### FD-11c. Builder: a Mercenary's kit is fixed, and the Scripture Guardian buys its weapons

The glossary: "A Mercenaries' Battlekit cannot be removed or lost over the
course of the campaign for any reason, and they cannot have any other
Battlekit" (L550–551). The one exception is the Scripture Guardian, which
"must have either two 1-Handed Melee Weapons or one 2-Handed Melee Weapon"
bought "from your Faction Armoury Tables at their normal Cost" obeying
"any stipulations that apply" (L748–753).

1. `AddEquipmentModal` offers a unit with the MERCENARY keyword nothing,
   and says so with the glossary sentence, except the Scripture Guardian,
   which is offered the host Warband's Melee rows only, at their printed
   cost, with the rows' own stipulations applied as for any model (it is
   not ELITE, so ELITE-only rows are out). Find where the modal decides
   which rows a unit may see and put the gate there, not in the render.
2. `src/rules/validate.ts`: a MERCENARY unit carrying anything beyond its
   Battlekit is an error naming the item; a Scripture Guardian with
   neither two 1-Handed nor one 2-Handed Melee weapon is a warning quoting
   L748–749; a Scripture Guardian with a Ranged weapon or armour beyond its
   kit is the same error as any Mercenary.
3. The Combat Biologist's deed. "add the Gather Knowledge Glorious Deed to
   those normally available in each scenario you play" (L9804–9806). The
   ability op in FD-11b carries `grantsDeed: { name, description }`
   transcribed from L9807–9809, `Ability` gains that optional field, and
   Play Mode's deed list is the scenario's deeds plus any `grantsDeed` on
   an ability of a model in the roster. Test: a roster with a Combat
   Biologist lists Gather Knowledge; one without does not.

Tests for 1 and 2 in the existing validate and modal test files; tests for
3 with the match-state tests.

### Order within FD-11

FD-11a first (it changes what the layers see), then FD-11b, then FD-11c.
Each PR body carries the audit counts before and after, and the list of
every entry whose Battlekit or hosts changed.

### Corrected by PR #76 and PR #77

Three corrections from the developer, each checked here.

1. **The third shape is not a rule.** A Weapon profile on the model node
   means "always has" for the Mercenaries and something else elsewhere: the
   Ecclesiastic Prisoner's node carries Feeble Flailing where the book says
   it "always has an Iron Capirote" (Warbands L3229), the Heralds of
   Beelzebub's carries an Infected Proboscis where the book allows only a
   Compound Eyes Helmet, and the Artillery Witch's carries three bombs where
   the book names one. Read structurally it changed 23 units' Battlekit and
   most were wrong, which is exactly what the acceptance line was written to
   catch. So the Vivisector and the Gavel of Justice are stated from the book
   in FD-11b through `addBattlekit`, the op FD-11b already defines, and
   FD-11a reads the two shapes that do hold. The price fix for that shape
   stands: 36 gear records that carried their model's price now cost zero,
   and `src/rules/fromWarband.ts` line 197 falls back to the record's cost
   for an item with no Armoury row, so it was a price waiting for a caller.
2. **The acceptance scripts live on this branch, not on `main`.**
   `scripts/rules-audit-book.mjs` and `scripts/rules-audit-battlekit.mjs`
   are part of PR #58 and have not merged, so an order that says "run
   `rules:audit:book`" names a script the developer's checkout does not
   have. Until #58 merges, run them from this branch without committing
   them: `git checkout origin/claude/trenchline-rulebook-review-d6lpss --
   scripts/rules-audit-book.mjs scripts/rules-audit-battlekit.mjs`, run
   with `node`, then `git checkout -- scripts` before committing. The
   developer diffed the built dataset instead, which is the same evidence.
3. **Two questions FD-11a asked are answered.** `UnitCard` does not look a
   forced weapon up by `profileId`; the lookup belongs in FD-11b, where the
   first forced weapons arrive. The armour keyword on a Battlekit entry is
   read onto an Armoury row for display only and never reaches
   `stats.armour`, so the MERCENARY guard is unnecessary.

One catalogue-only addition to note: the Crimson Communicant gained an
Atonement Bell, stated by the catalogue in the nested min = max shape and
by no text we hold. Recorded rather than doubted; the catalogue is the base.

PR #77 turned the ambiguity guard on and the first build failed on three
WEAPON ops the design never mentioned: the Dispatch's "Add the FUMBLE
Keyword to: … Incendiary Grenades … Molotov Cocktail" reached the Iron
Sultanate's copy of each and not the shared Ranged Weapons copy every
other faction draws from. Verified against the dataset on `main` before
#77: the shared copies lacked FUMBLE. A target may now say `"all": true`
to mean the item wherever it appears, expanded into one id-addressed op
per match before the applier runs; a weapon `setCost` is exempt because it
already resolves by name and faction list. Two weapons change and nothing
else.

## FD-12. The Warband Roster Sheet, in the app

The owner supplied the official sheet, now committed as
`data-sources/rulebook/warband-roster-sheet.pdf` with its text at
`data-sources/rulebook/extracted/warband-roster-sheet.txt`. Three pages:

- **Page 1.** Warband Name, Player, Warband, Patron, Campaign Battle,
  Faction. STRONGBOX with Ducats and Glory, each as TOTAL and UNSPENT.
  WARBAND BIO & EXPLORATION NOTES. HERALDRY. ARSENAL. Then the campaign
  table: GAME 1 to 12, THRESHOLD 700 to 1800, FIELD STRENGTH 10 to 20 and
  22 at game 12, SCENARIO NAME, RESULT (W/L/D), CAMPAIGN VPS, and TOTAL
  CAMPAIGN VICTORY POINTS.
- **Pages 2 and 3.** Unit cards, two large and four small: NAME, MODEL
  NAME, COST, the five characteristics, EXPERIENCE as eighteen boxes of
  which six are circles, SCARS as two boxes, Battlekit, Abilities, Skills
  & Injuries, Keywords, and a portrait on the large card.

Two things checked against the dataset before designing: the sheet's twelve
Threshold and Field Strength rows equal `campaign.thresholds` exactly,
including 22 at game 12; and the six circles sit at boxes 2, 4, 7, 10, 14
and 18, which is `campaign.experience.advancementAt`. Both are therefore
drawn from data, not from the picture.

This is the feature the owner describes as what NewRecruit never had: an
evolving record of every battle a warband has fought, and the paper tracker
represented in full. It also carries two requests made alongside it: a
review of every exploration reward and skill a warband holds and how each
was earned, and the Experience track drawn on the model the way the book
draws it.

### The change

1. **An `ExperienceTrack` component**, used in three places: the unit card
   in the builder, the wizard's Promotions step, and the sheet. Eighteen
   boxes, a circle at each `advancementAt` value, filled to `unit.xp`; a
   LIMITED POTENTIAL model greys the boxes past `experienceCap`
   (`src/rules/promotions.ts`), so the cap is visible rather than stated.
   Display only, so 16px boxes are fine: eighteen of them fit a 375px row
   with the card's gutters, and the component must not wrap. Beside it,
   two SCARS boxes filled from `unit.scars`, since two is the retire rule
   (FD-10).
2. **Provenance on what a model holds.** Skills, injuries, scars and
   exploration rewards each carry `source`: `advancement` (with the game
   and the roll, from `advancementRolls`), `trauma` (the game and the
   roll), `exploration` (the game and the Location), `import` (came in
   from a roster file), or `manual-pre-app` with a free-text note. Nothing
   existing is back-filled with a guess: an entry with no record reads as
   `import`, never as a roll that did not happen. The owner's answer on
   pre-app history was manual entry marked as such, so the unit card and
   the sheet gain "Add a skill / injury / reward recorded before the app",
   which writes `manual-pre-app` and the note, and the wizard's counters
   (Advancement Rolls due, scars toward retirement) treat a pre-app entry
   exactly as they treat a rolled one. `src/types/warband.ts` holds the
   fields; `ROSTER-FILE.md` documents them in the same commit.
3. **The Roster Sheet view.** A route under the warband, reached from the
   builder and the campaign Hub, rendering the three pages from the roster
   and the campaign:
   - the header from the warband and its campaign (Player is
     `creatorName`; Campaign Battle is the campaign's name; Patron and
     Heraldry are the warband's own fields);
   - STRONGBOX from the ledger after FD-05d: TOTAL is everything ever
     credited in that currency, UNSPENT is the balance;
   - BIO & EXPLORATION NOTES as the warband's lore plus the structured
     list from item 2 aggregated across the warband: every reward and
     skill with its source, which is the "what I have at my disposal and
     how I got it" review;
   - ARSENAL from the stash;
   - the campaign table from the warband's matches in order: game n's row
     shows Threshold and Field Strength from `forceLimits`, the scenario,
     W/L/D, and that game's Campaign Victory Points from FD-03a; games not
     yet played stay blank; the total at the foot;
   - the unit cards from item 1's component and the card's existing
     sections, Battlekit and Abilities, Skills & Injuries printed the way
     the sheet groups them.
4. **Print.** A print stylesheet: page 1 landscape, then two large cards a
   page, in the sheet's order. `window.print()` under a "Print / PDF"
   button; the browser does the PDF. On the phone the same route is a
   scrolling review page with no print chrome. Mobile-first still applies:
   the sheet is read at the table.

Tests: the table's twelve rows equal `campaign.thresholds`; the circles
equal `advancementAt`; a warband with three recorded matches fills three
rows and leaves nine blank with the total right; a pre-app skill renders
with its marker and counts toward the next Advancement Roll; a LIMITED
POTENTIAL model greys boxes past its cap. Acceptance: the owner's own
warband, side by side with the paper sheet.

## FD-13. The Homunculi: the Takwin and the Book of Golems

The owner's Iron Sultanate warband holds two: a Takwin Homunculus from The
House of Wisdom, and a second granted by the Book of Golems. No version of
the app has handled both. The sources:

- Warbands L5294–5301: a House of Wisdom warband may include one Takwin
  Homunculus per Jabirean Alchemist; each is associated with one Alchemist
  and vice versa; when the Alchemist dies the association cannot change
  "and no Alchemical Formulas can be applied to it".
- Warbands L5309–5330, the entry: 40 Ducats; "cannot have any Battlekit but
  can have Alchemical Formulas"; Artificial Life; Pummelling Blows;
  Re-creation, "If a Takwin Homunculus is killed in the post-battle
  sequence, you do not have to remove it from your roster. Instead, you can
  spend 40 Ducats in the following Quartermaster Step to leave it on the
  Roster"; keywords SULTANATE, ARTIFICIAL.
- Warbands L5357–5450, the Formulas: one or more, permanent, none twice;
  Additional Arm 15; Elemental Resistance 40; Enslaved Mind 10; Gargantuan
  Size 20 (needs Human Hands, Inhuman Strength and Massive Size; may use one
  Weapon usually Brazen Bull only; 60mm); Hawk Eyes 10 (+1 DICE Ranged; not
  with Hypnotic Eyes unless Two Heads); Human Hands 10 (Ranged and Melee
  Weapons from the Iron Sultanate Armoury, a Trench Shield or Fire Shield;
  not with Wings; no Pummelling Blows while armed); Hypnotic Eyes 15;
  Inhuman Strength 15 (STRONG, Melee +1 DICE, 32mm); Massive Size 30
  (TOUGH, 50mm; not with Wings); Regenerative Tissue 25; Seal of Solomon
  10; Startling Speed 10; Terrifying Appearance 10; Two Heads 5; Wings 30
  (8"/Flying, FLYING). And the allowance, L5386–5396: with Human Hands and
  an Additional Arm, "three 1-Handed Melee Weapons or one 1-Handed Melee
  Weapon and one 2-Handed Melee Weapon", the same for Ranged, a Shield
  replacing one Melee Weapon with no Shield Combo, and the attack rules.
- Rulebook L3247–3249, STRONG: "it can equip and use one 2-Handed Melee
  Weapon as if it were a 1-Handed Melee Weapon". ONE. So a Homunculus with
  Human Hands, an Additional Arm and Inhuman Strength holds at most two
  2-Handed Melee Weapons: the one STRONG converts in a 1-Handed slot, and
  the one the allowance's second pattern permits. Three is not in the book,
  and the design does not allow it; the owner should know that is what the
  page says.
- Rulebook L6902–6912, Exploration 17, Book of Golems: "Add a Takwin
  Homunculus from The House of Wisdom Variant Warband … to your Warband. It
  has the Human Hands Alchemical Formula, plus Alchemical Formulas worth a
  total of up to 50 Ducats for free … The Golem has the GOLEM Keyword, and
  replaces the SULTANATE Keyword with your Faction's Keyword. You can
  purchase Battlekit for it in the Quartermaster Step, using your own
  Armoury Tables … treated as an Ally that can never be Promoted or receive
  additional Alchemical Formulas." GOLEM is L3115.

### Where the app stands

- The catalogue's entry (`data-sources/battlescribe/Iron Sultanate.cat` line
  3255, named "Takwin Homunculus", profile "Homunculus", dataset unit
  `02c4-88da-ec78-8a33`) carries the Formulas as an `Alchemical Formulae`
  option group and states Wings, Massive Size, Gargantuan Size, Inhuman
  Strength and Hawk Eyes as modifiers on the entry. The other factions'
  "Homunculus" entries are the catalogue's Book-of-Golems copies. The
  keywords LIMITED POTENTIAL and SULTANATE are on the Sultanate entry.
- `src/rules/formulae.ts` identifies a Formula by the catalogue group, and
  keeps `INVENTED_FORMULAE`, the nine names an earlier hand-written list
  offered, so old saves can be cleaned. `src/rules/battlekitLimits.ts`
  reads the book's allowance sentence (`dataset.carryAllowances` holds the
  Homunculus one) and `experienceCap` in `src/rules/promotions.ts` reads
  LIMITED POTENTIAL. That is the engine, and it is largely right.
- The player never meets the engine. `src/components/builder/AddEquipmentModal.tsx`
  lines 185 to 215 do their own arithmetic: `isStrong` is a regular
  expression over ability names (`/strong|bulky|large|ogre/`), the hand
  count is `hasExtraArm ? 3 : 2`, an item with no `hands` counts as one,
  and every 2-Handed weapon counts as 1-Handed for a STRONG model rather
  than one of them. That is why the third arm "does not allow three pieces"
  in one place and would allow three 2-Handed weapons in another: two
  engines, and the guessing one decides what can be added.
- `src/components/builder/UnitAdvancementModal.tsx` line 71 decides a model
  is a Homunculus by regular expression over its name and abilities, and
  only then shows the Formulas tab it builds from the catalogue's options
  (line 107). A renamed model, or the Golem, loses the tab. Nothing books a
  Formula purchase against the Strongbox.
- Re-creation exists nowhere in `src/`. The Book of Golems exists nowhere:
  `grantedFree` on `src/types/warband.ts` line 118 is a string, and nothing
  gives a model the GOLEM keyword, swaps SULTANATE for the host's, tracks a
  free-Formula budget, or bars it from promotion.
- The catalogue's modifiers that change the statline when a Formula is
  held (Wings 8"/Flying, Massive Size 50mm, Gargantuan 60mm, Inhuman
  Strength +1 DICE Melee) are stated on the entry, and `src/rules/modifiers.ts`
  is the evaluator; whether the card applies option-conditioned modifiers
  is to be verified first, and if it does not, that is item 3.

### The change, two PRs

**FD-13a, the engine and the modal.**

1. `AddEquipmentModal` asks the engine. For each candidate item the modal
   computes "would adding this breach?" through `battlekitBreaches` with
   the model's traits from `traitsOf`, and shows the breach sentence as
   the reason a row is disabled. Its own `isStrong`, `hasExtraArm`,
   `maxMeleeHands` and `w.hands || 1` are deleted. STRONG converts one
   2-Handed Melee Weapon and no more, from the keyword's own text.
2. Formulas in the Quartermaster Step. The Formulas tab appears for any
   model whose catalogue entry has options in the `Alchemical Formulae`
   group, not by name. Buying one books a `quartermaster` debit through
   the ledger; one already held, in `specialUpgrades` or imported into
   `equippedEquipment`, is not offered again; the book's prerequisites and
   exclusions (Gargantuan Size's three, Hawk against Hypnotic without Two
   Heads, Human Hands against Wings, Massive Size against Wings) are read
   from the catalogue's constraints where it states them and otherwise
   enforced from the sentences quoted above, cited in the code; a Takwin
   whose Alchemist has died cannot buy (L5298–5300). The owner's ruling
   stands as the default: Formulas are purchasable between battles.
3. The card. Formulas listed under their group with their rule text, and
   the statline the catalogue's modifiers give the model once a Formula is
   held. Verify whether option-conditioned modifiers reach the card today;
   if not, evaluate them there.

Tests: a Human Hands + Additional Arm + Inhuman Strength Homunculus may
hold a 2-Handed, a 2-Handed and nothing else, or a 2-Handed and two
1-Handed, and is refused a third 2-Handed; without Human Hands it is
refused any weapon; Formulas appear for the Sultanate entry and the Golem
copies and for no Janissary; a second Additional Arm is refused; a Formula
purchase debits the Strongbox.

**FD-13b, the post-battle and the Book of Golems.**

1. Re-creation. When a Takwin Homunculus is killed, the wizard's Trauma
   step offers "Re-create for 40 Ducats in the Quartermaster Step" instead
   of moving it to `fallen` at once; the Quartermaster step then books the
   40 or lets it fall. The Golem is a Takwin Homunculus too and gets the
   same offer.
2. The Golem. An Exploration result of 17, or a manual "granted by the
   Book of Golems" action for a model already on the roster (the owner's
   case), adds the House of Wisdom entry with `grantedBy: 'Book of Golems'`,
   Human Hands held, a free-Formula budget of 50 Ducats tracked on the
   unit and spent by the Formulas tab before the Strongbox is touched,
   GOLEM added and SULTANATE replaced by the host faction's keyword on the
   card, Battlekit from the host's Armoury, and the model excluded from the
   promotion pool and from further Formulas once the budget is spent, each
   with the sentence that says so. The book states no price for the model
   itself; the catalogue prints 40 Ducats on its copies. The design adds
   it free, as the other Exploration results that add a model do, and
   records that reading in `data-sources/resolutions.json` for the owner
   to confirm or overturn.

Tests: a killed Takwin with 40 Ducats paid is on the roster next game; one
unpaid is in `fallen`; a Golem's card shows GOLEM and the host keyword and
no SULTANATE; the Golem is absent from the promotion pool; its fifty
Ducats of Formulas cost nothing and the fifty-first costs.

Two things to ask the owner rather than decide: the Golem's price, above,
and their roster file, so that "Formulas not showing up properly" and
"wrong rules on the card" are reproduced against the real model before
FD-13a is built.

## FD-14. The pass for invented content

The owner asked for a pass over what the original generator seeded and the
app never dropped. Two read-only sweeps covered `src/`, `prisma/`,
`scripts/`, `public/` and `docs/`; every finding below was re-verified on
`main` at b652f7d, at the line cited.

What is clean, so nobody re-audits it: the store's weapons, armour,
equipment, units and faction rules hydrate from the generated dataset
through `src/rules/recruitable.ts`; `src/rules/` is derived throughout;
the Chronicle, the Hub, `ModelReferenceSheet` and `RosterPrintSheet` read
the dataset and refuse on a miss; the Codex's Skills tab now carries the
real 2D6 roll (the fabricated `idx + 1` numbering is gone, and the comment
at `src/components/codex/CodexView.tsx` line 885 records why). The
sixteen small rule constants in `src/rules/dice.ts`, the range and attack
calculators and `DiceProbabilityModal` are faithful to the pages they cite.

### AI-1. One player's warband shipped as source — harmful, live

`src/data/warbandLore.ts`, 850 lines: biographies, quotes, titles and deeds
for ten named models; the warband's lore, motto, patron and chronicle;
three hand-typed roster snapshots holding some ninety weapon, armour and
equipment entries with costs, ranges, dice modifiers and keywords; an
invented match history. It is injected live: `src/services/newRecruitImporter.ts`
line 680 runs `enrichUnitWithLore` over every imported model, and lines
682 to 698 give any import whose faction is the Iron Sultanate, or whose
name merely contains "qarn" or "sultanate", that warband's lore, motto,
patron and chronicle; `src/store/slices/roster.ts` line 67 does the same
to every warband pulled from the cloud. `src/store/init.ts` lines 56 to 77
say all of this was removed; only the localStorage seeding was.

The warband is the owner's own, Al-Qarn Rihla. So, before deleting: the
PR reads that warband's production rows, read-only, and reports whether
the lore, quotes, titles and deeds are stored on the records or only ever
supplied from this file at read time. If the latter, the owner decides
whether to copy them into the record once; that is a production data
write and is asked first, never done. Then delete the file, both call
sites, and `defaultSultanateWarband` in `src/store/seed.ts`, whose one
consumer is a test that moves to a fixture under `data-sources/fixtures/`.

### AI-2. Invented data in the seed, and in every new campaign

`prisma/seed.ts` is wired by `package.json`'s `prisma.seed` and runs under
`prisma migrate dev` and `db seed`. It creates a demo user, a Lieutenant
with an invented statline (Ranged +1, Melee +2, Armour "+2"), a
"Standard Issue Bolt-Action Rifle" with the keywords Reliable and Bayonet
Lug, a "Standard (1 Wound)" damage line in a game with no Wounds, an
invented injury, and a campaign whose four territories carry the perks
(lines 111 to 129: "+5 Ducats supply bonus per round", "Reroll 1 failed
Morale check per match", "Free Frag Grenade in Warband Stash after each
game", "+2 Glory on Victory when defending") that `src/store/seed.ts` and
the campaigns API both say were blanked. The seed creates nothing with
game data in it, or nothing at all.

`src/app/api/campaigns/route.ts` line 149, `STARTING_TERRITORIES`: every
new cloud campaign is still given the four example territories that
`scripts/clear-example-campaigns.mjs` uses as its deletion signature, so
the script's premise, that only the old API made them, is no longer true.
A new campaign starts with no territories unless its framework supplies
them; Carcass Front does. `src/store/seed.ts` lines 151 to 167,
`defaultFreshCampaign` (invite code TRENCH-1099, threshold 25), is every
new device's starting campaign; a fresh device starts with none.

Production data: the clear script deletes campaigns only, so a database
that ran the seed keeps the demo user and warband. The PR reports what
exists in production, read-only; deleting it is the owner's call and is
asked, per the standing grant.

### AI-3. Rules text typed into the Codex and the modals

- `CodexView.tsx` lines 513 to 580: a hand-typed "OFFICIAL 1.0.2 CHANGELOG
  & ERRATA INDEX", ten rows. One row, ARMOUR PIERCING, is the base
  glossary's text presented as an erratum.
- `src/data/rulesets/index.ts`, `keyChanges` rendered as "Key Mechanics":
  paraphrases ("take 3 highest" where the book says highest or lowest), a
  1.0 ruleset with no source in the repository, and marketing lines.
- `CodexView.tsx` line 1104: "every model that was taken Out of Action must
  roll on this D66 Trauma Table". The book has Troops take a D6 Survival
  Roll and only ELITE models roll D66; the wizard says so at
  `src/components/campaign/PostBattleWizardModal.tsx` line 724, the Codex
  says the opposite.
- `CodexView.tsx` line 1676: `|| '48" x 48"'` under the words "Official
  Rulebook Diagram"; `src/components/codex/MissionGenerator.tsx` lines 100
  to 103 seed a custom mission with 48" x 48", "6" from board edge" and "4
  Turns" against its own comment at line 118.
- `CodexView.tsx` line 831: "Roll D66 for Skill" on a 2D6 table.
- `src/components/builder/UnitCard.tsx` line 752 and
  `src/components/builder/UnitAdvancementModal.tsx` line 566: `roll ||
  'D66'`, a fabricated roll for a skill with none recorded.
- `UnitAdvancementModal.tsx` line 409: "Warriors gain 1 XP per game
  survived"; the book gives the point to ELITE models, even when taken Out
  of Action.
- `src/components/play/QuickSearchModal.tsx` line 109: the Trauma table
  labelled "D66 Injury Chart".

The change: the changelog table and the `keyChanges` are either derived
from `data-sources/rulebook/extracted/changelog-1.0.2.txt` by a parser
into the dataset, or deleted; the banner and the labels take the book's
words; the defaults go blank; a skill with no roll prints no roll.

### AI-4. A source nobody parses

`src/data/allOutWarData.ts`: three scenarios, with table sizes the rulebook
never prints, and twelve Betrayal cards, typed by hand and reaching the
Codex, Play Mode and the scenario picker, while
`data-sources/rulebook/all-out-war.pdf` and its extract are committed and
unparsed. Parse them, in `scripts/lib/parse-scenarios.mjs` or a sibling,
into the dataset; drop the file. Its `derived: false` marker stays only
until then.

### AI-5. Fallbacks that invent

- `PostBattleWizardModal.tsx` line 582: `?? 3` Exploration dice. FD-07
  carries it.
- `newRecruitImporter.ts` line 495: an armour with no INJURY MODIFIER
  keyword is given "-1 Injury Modifier".
- `src/services/xmlParser.ts` lines 70 to 89: default category, Movement
  and characteristics for any catalogue entry missing them, reached only
  through `fetchAndParseAllRemoteCatalogs` and `generateDiffs` in
  `src/services/githubSync.ts`, which nothing calls. Delete all three.
- `src/components/customizer/CustomizerView.tsx` lines 43 to 47: invented
  stats seeding the editor.
- The honorific title maps in `src/store/slices/campaign.ts` lines 424 to
  441 and `src/store/slices/progression.ts` lines 209 to 226, two copies of
  app flavour keyed on Trauma-result substrings. One copy, marked as
  flavour and not as a rule, or none.

### AI-6. Residue

`scratch/` is ignored but 77 files are tracked, among them the generators
that wrote the invented data into `src/data/`: `git rm -r --cached
scratch/`. Placeholders naming Sorcerer Zortan, Commander Valerius and
Bayt al-Nahas (`src/components/campaign/LogMatchModal.tsx` line 243,
`PostBattleWizardModal.tsx` line 2156, `src/components/builder/UnitLoreModal.tsx`
line 353, `src/components/builder/WarbandChronicleModal.tsx` line 146,
`src/components/auth/AuthModal.tsx` line 181) become neutral examples.
`docs/FEATURES.md`'s "what must be deleted" and `init.ts`'s "all four are
gone" say what is true after AI-1. The faction blurbs in
`src/data/defaultRules.ts` are presentation and stay.

### Order within FD-14

AI-1 and the scratch removal first, one PR, because it changes what other
people's rosters receive. AI-2 second, with the production report and no
deletion. AI-3 and AI-5 together, after the milestone. AI-4 last, as a
pipeline PR with the audit counts.

## Order

1. Merge PR #59 when its check is green (FD-00). No further findings on it.
2. FD-01 and FD-02, one PR each, pipeline only, with the audit counts before
   and after in the PR body.
3. FD-04, then FD-06, then FD-03. All change the wizard's later steps; #59
   changed its first step, so they rebase cleanly once it has merged.
4. FD-05a, FD-05b, FD-05c, in that order, one PR each.
5. FD-07, then FD-08, then FD-09.
6. FD-10, one PR per heading, and then DA-03/05/04 and the rest of the two lists.
7. FD-11a, FD-11b, FD-11c, one PR each, ahead of item 4: the owner asked for
   the Mercenaries first, and FD-11a changes what every later layer sees.
8. FD-14's AI-1 and AI-2 right after FD-11c and before FD-05e: small
   deletions, and the first changes what other people's rosters receive.
9. After the READY FOR TESTING milestone (Order 14): FD-13a, FD-13b, then
   FD-12, then FD-14's AI-3 and AI-5, then FD-08 and FD-10, then FD-14's
   AI-4. The Experience track component in FD-12 item 1 is small and
   phone-visible, so it may ride with WIZ-2 if the developer judges it fits.
