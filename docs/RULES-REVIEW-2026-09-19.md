# Rulebook-versus-app review, 19 September 2026

Reviewed revision: `41c0442` on `main`. Scope: the campaign rules chapter of the
1.0.2 digital rulebook (pages 95 to 127) against the post-battle wizard, the
campaign and roster store slices, the rules modules under `src/rules/`, the
campaign section of the generated dataset and the parser that produces it. A
second, broader pass covered the builder economy, the validator, the API layer
and the test state.

Every claim below was re-tested in this checkout. Rulebook citations give the
page and the line in `data-sources/rulebook/extracted/trench-crusade-digital-rulebook.txt`
(page N's text ends at the `-- N of 197 --` marker). Code citations are
file:line at `41c0442`.

Nothing was fixed here. This is a findings list for whoever implements them.

## Result in one paragraph

The derived campaign tables are right. The Threshold table, the starting
allowance, the Exploration bands and Locations, the four Skills tables, the
phase steps, the Reinforcements sequence and the Trauma procedure numbers all
match the book. What is still wrong sits in three places the previous passes
did not reach: the Trauma Table's rules text is taken from the community
catalogue where the rulebook says something different (RR-01); the wizard and
two other screens still carry hand-written game data, including invented Glory
and Ducat payouts and an invented advancement list (RR-02, RR-03, RR-04); and
several procedures that the rules modules implement are not wired into the
screens, so the app computes the right answer and then does not use it
(RR-06, RR-07, RR-09, RR-11, RR-12). Each of those is a rule 1 or rule 2
failure in `CLAUDE.md`'s terms, and each is invisible to the pipeline's checks
because the pipeline only verifies values it derived.

## Ranked findings

| ID | Severity | Area | One line |
| --- | --- | --- | --- |
| RR-01 | High | Data | Trauma Table text comes from the catalogue; 12 of 22 rows differ from the 1.0.2 rulebook, one is a different rule |
| RR-02 | High | Wizard | Invented Glory and Ducat payouts for win, draw and loss; Campaign Victory Points not tracked |
| RR-03 | High | Wizard | Invented advancement list: `+1 Melee`, `Eagle Eye`, `Mighty Blow`, `Diehard` |
| RR-04 | High | Codex, Advancement modal | Invented "5 XP unlocks a Skill" rule, uniform-random skill roller with a fake D66 label |
| RR-05 | High | Wizard | Promotion Pool, Glorious Deed XP, ELITE ceiling, non-promotable models and Limited Potential all unimplemented |
| RR-06 | High | Wizard | Games-played is one short from game 2 onward, so Exploration dice and tables lag a game |
| RR-07 | High | Wizard, store | Battle Scars never recorded; Full Recovery and the four no-injury results are written as injuries and then trigger the reroll prompt |
| RR-08 | Medium | Store | Selling rounds down; the book rounds up |
| RR-09 | High | Wizard | A Carcass Front campaign explores on the rulebook's tables at twice the book's loot |
| RR-10 | Medium | Wizard | Exploration re-rolls and Exploration Skills unmodelled; a `?? 3` dice fallback |
| RR-11 | High | Builder | Threshold is computed and shown as a badge; the budget meter and over-budget check still use the founding 700, and dead models count |
| RR-12 | High | Store | The Strongbox ledger is designed, documented and dead; recruiting never debits the Strongbox; stash purchases clamp instead of refusing |
| RR-13 | Medium | Validator | `Limit: N` counts equipped copies only, not the Arsenal |
| RR-14 | Medium | Gaps | Retire-at-two-scars, Glory Item gating and tables, the campaign scenario selection tables |
| RR-15 | Low | Design | Threshold read from the campaign rather than per warband is a house rule and is not labelled as one |
| RR-16 | High | Tests | Integration suites connect to whatever `DATABASE_URL` is set to; here that is production, and they fail rather than skip |
| RR-17 | Medium | Sync | The turn counter is bumped by two write paths, never synced, and reset on re-adopt |
| RR-18 | Medium | Code | Eight rules functions have tests and no production caller |
| RR-19 | Low | Play Mode | A "wounds" stat the game does not have |
| RR-20 | Medium | Docs | `FEATURES.md` marks four of the above areas done |

---

## Part A. The campaign rules against the wizard and stores

### RR-01. The Trauma Table ships catalogue text where the rulebook says otherwise

`scripts/lib/parse-campaign.mjs`, `parseTraumaTable`, reads the eighteen injury
rows from `data-sources/battlescribe/Campaign Rules.cat` and only Dead, Captured,
Robbed and Full Recovery from the rulebook. Its own comment calls the catalogue
"the authority for the eighteen injuries". That inverts the project's stated
precedence: `docs/RULESET-MODEL.md` section 6 and the header of
`data-sources/resolutions.json` both say Dispatch, then rulebook, then
catalogue.

The catalogue is revision 5 of a community transcription and predates 1.0.2.
Comparing `dataset.campaign.trauma` (generated file lines 69211 to 69344)
against pages 102 and 103 (lines 5866 to 5930):

| Roll | Book 1.0.2 says | Dataset says | Kind |
| --- | --- | --- | --- |
| 24 Dark Memory | Write down the Warband's name; **-1 DICE to Melee Attacks** against models from that Warband | The model **FEARS all enemy models** if it plays the same scenario against the same warband type | Different rule |
| 34 Muscle Damage | Cannot have Battlekit with HEAVY. **Any that it has when the Injury is suffered is lost** | Cannot carry HEAVY weapons | Loss clause missing |
| 35 Minor Wound | Cannot be used in the next game | Cannot be fielded next battle. "It maintains this as a Scar" | Extra sentence not in the book |
| 26 Lost Arm | Cannot use 2-hand Battlekit; only one piece of 1-hand Battlekit | "One less hand, which limits the types of weapons/equipment" | Vague where the book is exact |
| 33 Possessed | Dash first if more than 1" from enemies; first 3" straight away from start; stand then move 3" if Down | Older wording with a melee-combat exemption the book does not print | Different conditions |
| 15 Lost an Eye | Adds "Treat this injury as a Full Recovery if it is inflicted on a Sniper Priest" | No Sniper Priest clause | Exception missing |
| 16 Chest Wound | +1 INJURY DICE | "+1 DICE" | Wrong keyword |
| 13, 14, 21, 25, 31, 32, 64 | Book wording | Paraphrase | Wording only |
| 11 Dead | "Remove the model **and its Battlekit**" | "Remove the model" | Minor |

Rows 22, 23, 36, 41-63, 65 and 66 match. The 1.0.2 changelog (extract lines
325 to 330 and 375 to 379) only rewrites Head Wound and Captured, so the other differences are
the catalogue drifting from 1.0.1, not an errata the app is behind on.

Pages 102 and 103 extract cleanly in the same `NN Name<TAB>text` shape the
parser already uses for rows 11, 12 and 36 (its `readRow`). The fix is to read
all 22 rows from the book and demote the catalogue to a cross-check, which is
what the model doc says should already be the case. This matters beyond the
Codex: `rules/capture.ts` and `rules/trauma.ts` regex the row text to find
rules, and the wizard writes the text onto the model permanently.

### RR-02. The wizard invents the payout, and Campaign Victory Points do not exist

`src/components/campaign/PostBattleWizardModal.tsx`:

- lines 112 and 113 start every post-battle on 3 Glory and 30 Ducats;
- lines 654 to 665 set Victory to 3 Glory and 35 Ducats, Draw to 1 and 20,
  Defeat to 0 and 10.

`src/components/campaign/LogMatchModal.tsx` lines 29 to 32 do the same on the
organiser's path (3/30 and 1/15).

The book has no result-based payout of either currency. Glory is one point per
Glorious Deed carried out (page 98, lines 5514 to 5521; page 150, lines 8905 to
8918), plus specific Skills and Locations. Ducats between games come from the
Exploration Roll times ten and from nowhere else (page 114, lines 6626 to
6634). The Ducat default is overwritten only if the player rolls Exploration in
step 5; a player who enters nothing commits 35 Ducats for a win that the book
pays nothing for.

Play Mode already counts the deeds. `rules/battleFromMatch.ts` writes every
claimed deed and its side into the Battle record, and `PlayModeView.tsx` line
419 opens the wizard right after. The wizard never reads that record, so the
one number the book derives mechanically is retyped from a guess.

Separately, the book scores the campaign in Campaign Victory Points: 15 for a
win, 7 for a loss, 10 each for a draw (page 95, lines 5283 to 5289), with
Legendary Locations and the Patron's Visit adding to them. Nothing in the app
records CVP. The `classic` framework's Glory threshold is documented as the
app's own, which is fine, but the published scoring is then absent from both
frameworks, and the Weather module's "player with the fewest Campaign Victory
Points" cannot be answered.

### RR-03. The advancement list in the wizard is hand-written and wrong

`PostBattleWizardModal.tsx` line 1129 offers every model
`'+1 Melee', '+1 Ranged', '+1 Armour', '+1" Move', 'Eagle Eye (Skill)',
'Mighty Blow (Skill)', 'Diehard (Skill)', 'Shadow Walker (Skill)'`, and
`src/store/slices/campaign.ts` lines 476 to 478 write the chosen string into
`unit.advancements`.

Trench Crusade has no characteristic advances. The only advancement is an
Advancement Roll: pick two Skill tables, roll 2D6 on each, choose one of the
two results (page 105, lines 6034 to 6046). Eagle Eye, Mighty Blow and Diehard
appear in no source. Shadow Walker is a real Stealth Skill but is offered here
outside its table and its roll. This is the `RC-03` finding: the XP award was
fixed and the invented list beside it was not.

### RR-04. "5 XP unlocks a Skill" and the Codex roller

Three places state an XP rule the book does not contain:

- `src/components/builder/UnitAdvancementModal.tsx` line 385: "5 XP unlocks an
  official Compendium Skill roll."
- `src/components/codex/CodexView.tsx` lines 811, 877 and 935: "Awarded during
  Campaign Promotions when spending 5 XP or when a Troop model is Promoted to
  Elite."

The book: Experience is checked off on the roster sheet and an Advancement Roll
is made "when you reach a box that is a circle" (page 105, lines 6030 to 6033).
XP is never spent. A promoted model "begin[s] with 0 Experience Points" (page
104, lines 5984 to 5987) and receives no Skill for being promoted.

The circled boxes are not in the extracted text, but the catalogue encodes
them. `Campaign Rules.cat` lines 5893 to 5955 cap Experience at 18 (line 5902)
and raise the
Skills allowance to 1, 2, 3, 4, 5 and 6 when the Advancement count exceeds 1,
3, 6, 9, 13 and 17. For a model that started ELITE that is a roll at 2, 4, 7,
10, 14 and 18 XP. That should be derived and checked against the roster sheet
page of the PDF rather than typed, and the "5 XP" sentence removed.

The Codex roller itself (lines 801 to 811) picks a row uniformly at random with
`Math.floor(Math.random() * list.length)` and then rolls two unrelated dice to
print as a "D66" label. The tables are 2D6, which is triangular, not uniform:
Melee Proficiency at 7 should come up six times as often as Patron Skill at 2.
The card view (line 871) labels a row's roll as `${idx+1} (or D66 ...)`, which
is not a roll at all.

### RR-05. The Promotions and Experience Step is a toggle

What the wizard's step 3 does: awards 1 XP to each surviving, participating
ELITE model (correct, RC-02 and RC-03) and offers the list in RR-03. What the
book's step contains and the app does not (pages 104 to 106 and 111, lines
5946 to 6100 and 6424 to 6428):

- **The Promotion Pool.** 1D6 plus 1D6 per Glorious Deed, plus Show Off;
  assigned to Troops with the "no third die until every Troop has two" rule;
  rolled one at a time; a 6 promotes; after five failures in a row the sixth
  die is an automatic 6, and that counter persists on the roster. Promotion is
  a free "Promote to Elite" button in `UnitAdvancementModal.tsx` lines 189 to
  191 with no pool, no roll and no counter field on `ActiveUnit`.
- **Maximum Elites.** Skip the step at 6 or more ELITE models; stop when a
  promotion makes 6. Bad Company exempts its holder. Not checked anywhere.
- **Models that cannot be Promoted** (page 106, lines 6089 to 6100): Ecclesiastic Prisoners,
  Anchorite Shrine, War Wolf Assault Beast, Wretched, Grail Thralls, Fly
  Thralls, Hounds of the Black Grail, Amalgam, Yoke Fiends. The dataset carries
  the sentence only on the Artillery Witch's own text; the table on page 106 is
  not derived and the toggle promotes any of them.
- **Limited Potential** (page 111, lines 6424 to 6438): Communicant, Lion of Jabir, Brazen Bull,
  Homunculi, Artillery Witch, Pit Locust, Desecrated Saint cannot exceed 7 XP.
  The text reaches six of those entries; the `+` button on the modal is
  unbounded and the wizard's award does not check it.
- **The second XP for a Glorious Deed.** "Any ELITE model that performed at
  least one Glorious Deed gains a second Experience Point" (page 105, lines
  6026 to 6029). The wizard awards a flat 1. Play Mode knows which model
  claimed which deed (`completedDeeds` in `rules/matchState.ts`), so this is
  derivable, not a question for the player.
- **War Stories** (+1 XP to every other ELITE) and **Bitter Lessons** (Trauma
  65, D3 extra XP, which the wizard displays and does not apply).
- **Latecomers** (page 95, lines 5290 to 5300): 4 XP per game the top player
  has played, split among ELITE models. Not offered on enrolment.

### RR-06. Games played is one short from the second game

`PostBattleWizardModal.tsx` line 181:

```ts
const gamesPlayed = Math.max(1, campaignGameOf(warband, campaign) - 1 || 1);
```

and line 337:

```ts
const nextGame = campaignGameOf(warband, campaign) + 1;
```

`campaignGameOf` returns `campaign.currentTurn`, which `applyPostBattleResults`
increments on commit (`campaign.ts` line 667). So while the wizard is open,
`currentTurn` is the number of the game just played, not the game being
prepared for. `nextGame` is right and `gamesPlayed` is wrong, and the comment
above line 181 ("one less than the game being prepared for") describes the
post-commit state.

| Game just played | `gamesPlayed` computed | Dice per book | Dice given | Tables per book | Tables given |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | 3 | 3 | Common | Common |
| 2 | 1 | 3 | 3 | Common | Common |
| 3 | 2 | 4 | 3 | Common or Rare | Common |
| 6 | 5 | 5 | 4 | Rare | Common or Rare |
| 10 | 9 | 6 | 5 | Rare or Legendary | Rare |

Every transition is a game late, and loot is ten Ducats per pip.

Two related defects on the same counter. `logCampaignMatch` (`campaign.ts` line
982) also increments `currentTurn`, so an organiser who logs a match and a
player who runs the wizard for the same game on one device advance it twice.
And the wizard's increment is a plain state write with no `campaign.settings`
op queued, so it never reaches the cloud; `services/campaignFromCloud.ts` line
186 takes the server's value on adoption, which resets the Threshold for a
player who re-joins from another device.

### RR-07. Battle Scars are never recorded, and Full Recovery is recorded as an injury

`src/store/slices/campaign.ts` line 405:

```ts
if (!cas.fullRecovery) newInjuries.push(cas.outcome);
```

`fullRecovery` is set only by a ransomed capture. Every other result, including
a rolled 41-63 Full Recovery, 36 Robbed, 64 Hardened, 65 Bitter Lessons and 66
Prominent Scar, is appended to `unit.injuries` although each says "It does not
receive an Injury or a Battle Scar". Nothing in the slice writes `unit.scars`
(there is no `scars` in the file), so:

- `unfitForDuty` (`PostBattleWizardModal.tsx` lines 762 to 763) counts only
  scars added by hand in the Advancement modal, and third-scar retirement
  cannot be reached through play.
- `alreadySuffered` (`rules/trauma.ts` lines 178 to 185, called at wizard line
  1006) matches on `injuries`, so after one Full Recovery every later Full
  Recovery, which is 15 of the 36 results, shows "This warrior already carries
  that injury. Unless the result says otherwise, roll again".
- The Codex and the print sheet list "Full Recovery" under a model's injuries.

The rows already say which case they are. A row whose text contains "does not
receive an Injury or a Battle Scar" writes nothing; every other ELITE result
writes one scar and, for 13 to 35, one injury.

### RR-08. Selling rounds down

`src/store/slices/roster.ts` line 622 and `ArmoryStashModal.tsx` lines 139 to
141 use `Math.floor(item.cost / 2)`. Page 124, lines 7280 to 7283: "you receive
half the Cost of the item you were selling, rounding any fractions up". Most
Battlekit is priced at an odd multiple of 5, so this underpays by 1 Ducat on
most sales.

### RR-09. A Carcass Front campaign explores by the rulebook

`rules/campaign.ts` implements the Carcass Front Exploration Step in full
(`resolveCarcassFrontExploration`, `hasThreeOfAKind`, `carcassFrontResources`,
`CARCASS_FRONT_LOOT_PER_POINT`) and its comment lists the four differences and
warns that getting them wrong "pays a warband roughly twice what the book pays
it". None of those exports has a caller outside tests, and the wizard has no
branch on `campaign.framework` (no match for `framework` or `carcass` in the
file). A Carcass Front warband therefore rolls the rulebook's rarity bands,
collects roll times ten, and both players consult a table.

### RR-10. Exploration mechanics the in-app roll leaves out

- Re-rolls: "you can re-roll one of the Exploration Dice, and if you won the
  game that was just played you are allowed to reroll another" (page 113, lines
  6551 to 6556). The in-app roll (wizard line 430) sums N dice with no re-roll
  and does not know who won; only the manual path can express it.
- Exploration Skills (page 115, lines 6666 to 6700): Extra Dice, Duplicate, Re-roll, Set Dice,
  Seek, Circle Back, Lucky. Seven Locations and two Wildcard Skills grant them,
  and `Warband` has no field to hold one, so a Map & Document Bag discovery is
  recorded in `explorationDiscoveries` and then forgotten.
- Pot of Manna: +10 loot per Exploration for the rest of the campaign. Same.
- Wizard line 431: `explorationDice(dataset, gamesPlayed) ?? 3`. A dataset that
  cannot say how many dice defaults to three, which is rule 2.

### RR-11. The builder computes the Threshold and measures against 700

`src/components/builder/WarbandBuilder.tsx` line 122 resolves `forceLimits` for
the current game and the Variant, and uses it only for the "Game N" badge at
lines 462 to 467. The numbers a player acts on still read `warband.ducatLimit`:

- line 144: `const isOverBudget = totalCost > warband.ducatLimit;`
- lines 482 and 489: the meter, `{totalCost} / {warband.ducatLimit} D`;
- line 554: "Roster exceeds the {ducatLimit} Ducat point limit";
- `AddUnitModal.tsx` line 150: remaining Ducats from `ducatLimit`.

`ducatLimit` is set to the muster allowance at founding and never changes for a
campaign warband: the only writer is `updateWarbandDucatLimit`, reachable from
the unrestricted-mode budget modal. So from game 2 a Force that is legal at 800
is reported over a 700 limit. `checkForceLimits` in `rules/validate.ts` line
937, the function written to produce the "N Ducats' worth must sit this game
out" warning, has no production caller.

Two further things the same line does wrong. `totalCost` at line 144 sums every
unit including `isDead` ones, and `toRoster` in `rules/fromWarband.ts` has no
`isDead` filter either, so a dead model keeps consuming Threshold and budget
until it is deleted by hand. And the Threshold caps the Force fielded, not the
roster (page 97, lines 5455 to 5460, which `checkForceLimits` quotes); the
roster has no way to mark who sits out, so the builder cannot answer the
question the book asks.

### RR-12. The Strongbox is a stored number and recruiting never touches it

`docs/RESTRUCTURE-PLAN.md` line 419: "The Strongbox is the sum of a ledger,
never a stored total". `rules/campaign.ts` implements it (`strongboxOf`,
`reversible`, `explorationLedgerEntry`). The ledger is written exactly once,
at founding (`roster.ts` line 156), and none of the three functions has a
production caller. `treasuryDucats` is the stored total everywhere.

Consequences in play:

- Hiring a model (`store/slices/units.ts`, `addUnitToWarband`) and equipping
  it never debit `treasuryDucats`. After founding, the only way Ducats leave
  the Strongbox is `buyToStash`.
- `buyToStash` (`roster.ts` line 606) writes
  `Math.max(0, w.treasuryDucats - item.cost)`: a 10-Ducat Strongbox buys a
  40-Ducat item and reads 0, rather than refusing.
- The stash path carries one `cost` number, so a Glory-priced purchase debits
  Ducats and leaves `gloryPoints` untouched.

The two economies the app has, "budget versus limit" from founding and
"Strongbox" from the campaign rules, are the same Ducats, and today neither
constrains the other.

### RR-13. `Limit: N` ignores the Arsenal

`rules/validate.ts` lines 203 to 215 build `rosterCounts` from each unit's
`items` only. `roster.stash` exists (`fromWarband.ts` lines 279 to 289) and is
not counted. Page 123, lines 7234 to 7238: "if the Battlekit had a Limit of 2,
and your Warband already has 2 such items in its Arsenal and/or equipped by a
model, then you could not purchase any more."

### RR-14. Quartermaster and scenario rules with no home

- **Retire Injured Models** (page 123, lines 7214 to 7218): a model with 2
  Battle Scars may be retired, keeping or selling its kit. Not offered;
  depends on RR-07.
- **Glory Items** (page 125, lines 7373 to 7381): purchasable only after an
  Exploration discovery that permits it (Trench Merchant 5, Black Market 8,
  Black Network 12), from the faction's Glory Item Table with its own
  stipulations (Battlefield Title "ELITE only, Limit: 1", Field Hospital
  "Limit: 1", and so on). The dataset carries Glory Items as catalogue Battlekit
  rows with Glory costs but has no derived Glory Item Table per faction, no
  gate on discovery, and no record on the Warband of which gate it has earned.
- **Selecting a Campaign Scenario** (page 96, lines 5350 to 5384): Early
  (games 1 to 3), Mid (4 to 8), Endgame (9 to 11) D6 tables and the Great War
  at 12. Absent from the dataset and the app; the Mission Generator rolls only
  the Carcass Front generator and the Hunt for Heroes Unforeseen Events.

### RR-15. The campaign-level Threshold is a house rule

`rules/campaign.ts`, `campaignGameOf`, reads the game number from the campaign
and documents why. The book ties it to the warband: "Your Warband's Threshold
Value ... increases after each game that you play" (page 97, lines 5443 to
5446), and only a latecomer's new warband takes the top player's value (page
95, lines 5290 to 5300). The reasoning in the code is sound for the group it serves, but the app
presents the result as "Set by the Warband Threshold Table". The Reinforcements
house rule shows how this should be labelled: as the campaign's rule, with the
book's stated beside it.

---

## Part B. Broader review

### RR-16. Integration suites run against production and fail here

`npm test` at `41c0442` in this sandbox: 125 files pass, 9 fail, 1695 tests
pass, 117 skipped. All nine failures are integration suites and every one
reports `Can't reach database server at ep-lucky-boat-...neon.tech:5432`, the
production host named by this environment's `DATABASE_URL`. TCP 5432 is
blocked here, which is the only reason `accountDeletion.integration.test.ts`
and `ownership.integration.test.ts` did not run against production data.
`docs/GEMINI-AUDIT-REVIEW.md` finding 5 describes exactly this and is marked
not implemented. A guard that refuses any host that is not localhost or a
`*_TEST` URL belongs in the shared integration setup before anything else in
this list.

### RR-17. The turn counter has two writers, no sync and a reset

Covered under RR-06. The `docs/CAMPAIGN-SYNC.md` authority table (line 339)
gives the turn number to the organiser via `campaign.settings`; the code never
sends it.

### RR-18. Rules code with tests and no callers

`checkForceLimits`, `strongboxOf`, `reversible`, `explorationLedgerEntry`,
`hasThreeOfAKind`, `resolveCarcassFrontExploration`, `carcassFrontResources`
and `CARCASS_FRONT_LOOT_PER_POINT` are exported from `src/rules/`, tested, and
referenced by nothing under `src/components` or `src/store`. The unit tests
pass and the app behaves as if the modules were not there. The same pattern
produced RC-09 (`reinforcementAllowance` "written and never called"). A lint
rule or a test that asserts each `rules/` export has a non-test importer would
catch the next one.

### RR-19. Play Mode tracks wounds

`store/slices/units.ts` line 38 gives a model `maxWounds` of 2 if it has TOUGH
and 1 otherwise, and `PlayModeView.tsx` line 1767 renders `current / max`.
Trench Crusade has no wounds characteristic; TOUGH is "the first time a model
with this Keyword suffers an Out of Action result on the Injury Table, it is
treated as a Down result instead" (`dataset.keywords`). The app's own comment
in `rules/unforeseen.ts` lists "wounds" among the vocabulary that gives invented
rules away. Low impact, but it is hand-written game state on the play screen.

### RR-20. `FEATURES.md` overstates four rows

Rows marked ✅ that the findings above contradict: "Post-battle sequence wizard"
(RR-02, RR-06), "D66 Trauma / injury rolls: Verified against the rulebook"
(RR-01, RR-07), "XP & advancement: The award is now the book's" (RR-03, RR-04,
RR-05), and the Carcass Front campaign framework's exploration (RR-09). Each
should read 🟡 with the RR id until the fix lands, or the checklist will keep
telling the next reviewer these are done.

### Things looked at and found sound

So the next pass does not re-check them:

- Threshold table, 700 starting allowance, Papal States 500/11/-200/+4, all
  three Exploration Location tables, dice and table bands, loot multiplier,
  four Skills tables, phase steps, Reinforcements sequence and its price,
  Trauma procedure (D6 dead on 1-2, D66 for ELITE, third scar), Captured
  handling, duplicate-injury reroll rule text.
- Success Roll and Injury Roll bands, Bloodbath, the ranged and melee attack
  modifier lists, and the -3 INJURY MODIFIER floor in `rules/dice.ts` and the
  attack calculator, against pages 16 to 18 and 45 to 48.
- Scenario game lengths and Glorious Deeds are derived and complete; the deed
  parser rejoins wrapped lines.
- Battlekit Limits, Shield restrictions, HELD, STRONG and CUMBERSOME in
  `rules/battlekitLimits.ts` against page 69.
- 61 keywords, matching the glossary plus the changelog additions.
- The API layer: every route goes through `policy.ts`, bodies are bounded,
  failures do not echo exceptions, the invite code is 75 bits, the CSP's
  `unsafe-inline` is documented with its cost. Typecheck is clean; lint is 0
  errors and 42 warnings, exactly at the cap.

## Suggested order

1. RR-16 (a test guard, before anyone runs the suite where 5432 is open).
2. RR-01 (parser change; everything downstream reads the text).
3. RR-07 and RR-06 together (both in the wizard's commit path).
4. RR-02, RR-03, RR-04 (delete the invented data; wire Glory to the Battle
   record's deeds).
5. RR-11 and RR-12 (one economy: Threshold caps the Force, the Strongbox pays
   for recruits and kit, dead models drop out of both).
6. RR-09, RR-08, RR-13.
7. RR-05, RR-10, RR-14 as the next feature block, each derived from its page.
8. RR-15, RR-18, RR-19, RR-20 as the tidy-up.
