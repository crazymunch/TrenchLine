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
`Winged Thrall`, is a cited equivalence in
`data-sources/rulebook/promotion-model-names.json` that fails the build in
both directions.

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

## Order

1. Merge PR #59 when its check is green (FD-00). No further findings on it.
2. FD-01 and FD-02, one PR each, pipeline only, with the audit counts before
   and after in the PR body.
3. FD-04, then FD-06, then FD-03. All change the wizard's later steps; #59
   changed its first step, so they rebase cleanly once it has merged.
4. FD-05a, FD-05b, FD-05c, in that order, one PR each.
5. FD-07, then FD-08, then FD-09.
6. FD-10, one PR per heading, and then DA-03/05/04 and the rest of the two lists.
