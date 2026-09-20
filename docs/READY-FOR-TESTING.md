# READY FOR TESTING

The campaign side of TrenchLine is complete enough to play a game against.
This is what a mock game reaches, rule by rule, and — the more useful half —
what it does not.

`e2e/mockGame.spec.ts` drives the sequence this describes: a campaign Warband
into a match, out of it with a casualty, and through all five post-battle steps
to the commit, at 375px. It is one spec rather than many because **the defects
in this app have been in how rules compose**, and no unit test of a single rule
sees a model earn four different Experience awards in one submission and cross
two Advancement thresholds on the total.

## What a mock game exercises

### The match

| Rule | Where it is decided | Citation |
| --- | --- | --- |
| Scenario chosen from one list, locked for the match | `rules/useScenarios.ts`, Play Mode | 17 derived (12 core + 5 Carcass Front) plus the 3 All Out War, flagged `derived: false` |
| Glorious Deeds come off the scenario, and record the model that performed one | `rules/matchState.ts`, `DeedClaim.unitId` | p.105 |
| Victory Points per turn, and 1 VP per Deed at the end | Play Mode's tracker | the scenario's own text |
| Coalitions score as a side | `rules/coalitions.ts` | All Out War scenarios |
| A placeholder opponent can be seated without a roster | `rules/matchSides.ts` | — |
| The battle is kept, with its Deeds, weather and per-turn scores | `types/battle.ts` | — |

### Step 1 — Scenario & Result

| Rule | Where | Citation |
| --- | --- | --- |
| Glory is **1 per Glorious Deed**, not an invented payout | the step reads the match | p.99 (RR-02) |
| Ducats are the **Exploration Roll × 10**, set in step 5 | `campaign.exploration.lootPerPoint` | p.114 |
| The step opens on the match it follows — scenario, result, who deployed | `rules/matchHandover.ts` | RR-22 |

### Step 2 — Trauma

| Rule | Where | Citation |
| --- | --- | --- |
| **ELITE** models roll **D66**; **Troops** take a **D6 Survival Roll** | `rules/trauma.ts` | RC-01 |
| All 22 rows come from the **rulebook**, not the catalogue | `campaign.trauma`, `source: "rulebook"` | RR-01 |
| Five results say *"does not receive an Injury or a Battle Scar"* and now don't | `traumaWriteFor` | p.107 |
| An ELITE taken Out of Action takes a **Battle Scar** | `traumaWriteFor` | p.107 |
| **12 Captured** blocks the step until the ransom is resolved; paid is a Full Recovery | `rules/capture.ts` | RC-04 |
| **22 Head Wound** bars Experience permanently | `barsExperience`, derived from the row's text | p.107 |
| **65 Bitter Lessons** owes the model a **D3**, and the commit refuses until it is rolled | `rules/extraExperience.ts` | FD-06d |
| Rolled in the app or entered off the table's own dice | both modes, every roll in the wizard | — |

### Step 3 — Promotions & Experience

| Rule | Where | Citation |
| --- | --- | --- |
| The step is **skipped at 6 ELITE models** | `promotions.maxElites` | p.105 |
| Models the book forbids promoting are refused, resolved by **unit id** | `promotions.cannotPromote` | p.111 |
| Pool is **1D6 + 1D6 per Glorious Deed**, plus **Show Off** counted off the roster | `promotionPool` | p.105 |
| Dice assignment obeys the spread rule **from the third die up** | `assignmentIsLegal` | p.105 |
| A die **Promotes on a 6**; **5 misses** make the next automatic, counted on the *Warband* | `rollPromotions`, `warband.promotionMisses` | p.105 |
| **+1 Experience** for an ELITE model that took part and survived | `earnsExperience` | RC-02 / RC-03 |
| **+1 more** for at least one Glorious Deed — **derived** from the recorded model | `deedUnitIds` | p.105 (RR-05) |
| **+D3** from Bitter Lessons | `extraExperienceFor` | FD-06d |
| **+1** to every *other* ELITE model from **War Stories**, offered not applied | `warStoriesOffer` | p.110 (RR-05) |
| **LIMITED POTENTIAL caps at 7**, read from the model's **keyword** not the table | `experienceCap` | p.111, and `dispatch-01` |
| The award **shows its working**, and names the cap where it trimmed one | the step | — |
| **Advancement Rolls** fall due on the derived track — 2, 4, 7, 10, 14, 18 | `advancementRollsDue` | p.105 |
| The roll is **2D6 on two chosen tables**, with the already-held, next-highest and Patron substitutions | `offerFor` | p.105 (RR-03 / RR-04) |

### Step 4 — Reinforcements

| Rule | Where | Citation |
| --- | --- | --- |
| Optional, and **warns rather than blocks** | the step | p.113 |
| Taking it **forfeits Exploration** — overridable by campaign house rule | `reinforcementsKeepExploration` | p.113 |
| It **empties the Strongbox** as a booked debit, not an assignment of zero | `rules/ledger.ts` | RR-12 |

### Step 5 — Exploration

| Rule | Where | Citation |
| --- | --- | --- |
| Dice count and table band come from **games played** | `explorationBandFor` | p.113 (RR-06) |
| **One re-roll, a second if the game was won, never the same die twice** | `explorationRerolls` | p.113 (RR-10) |
| Extra dice and re-rolls from **Exploration Skills held by models**, derived | `explorationFromModels` | p.115 |
| A Location's grant is read from **its own text** | `explorationGrants` | p.114 |
| Loot is the roll **× 10** | `campaign.exploration.lootPerPoint` | p.114 |
| Discoveries are **recorded** — `explorationDiscoveries` had no writer at all | `store/slices/campaign.ts` | RR-10 |

### The commit

| Rule | Where | Citation |
| --- | --- | --- |
| Every movement is a **ledger entry with a reason**; the Strongbox is its sum | `rules/ledger.ts` | RR-12 |
| A purchase made and undone **in the same muster** leaves no entry | `undoPurchases` | p.121 |
| A hire spends **both currencies** | `store/slices/units.ts` | FD-05h |
| An **overdrawn** Strongbox — either currency — keeps the roster out of a game | `strongbox-overdrawn` | RR-08 |
| The **campaign game counter has one writer** | `advanceCampaignGame` | RR-17 |
| A game has **as many post-battles as it has rosters** | `BattleSide.campaignMatchId` | RR-27 |
| A snapshot is written with the game number it belongs to | `WarbandSnapshot.campaignGame` | — |

## What it does NOT exercise

Honest list. These are implemented but not reached by the mock game, or not
implemented at all.

### Implemented, not driven by this spec

- **Captured (Trauma 12)** and its ransom branch. The guard is unit-tested and
  shares the commit-blocking machinery the D3 uses, but the mock game rolls a
  65 rather than a 12.
- **The promotion dice**: pool, assignment and the miss counter. The mock
  Warband is three ELITE models with no Troops, so the step correctly reports
  *"No model on this Roster can be Promoted."* A mock game with Troops would
  reach it.
- **The Advancement Roll itself** — the mock game asserts rolls fall due but
  does not spend one; `e2e/advancement.spec.ts` drives that.
- **LIMITED POTENTIAL trimming an award.** Unit-tested; no capped model in the
  mock roster.
- **Reinforcements and Exploration** are stepped through but not committed
  with a payout.
- **Cloud sync**, invites, and a second device — `e2e/campaignSync.spec.ts`.
- **Coalitions and All Out War** scoring.

### Not implemented

- **Latecomers** (p.95): 4 XP per game the top player has played, split among
  ELITE models, offered on enrolment. Filed, not built.
- **A Patron is not a required field.** A Patron Skill result on a Warband with
  none recorded reports that nothing can be offered — deliberately, rather than
  substituting a Skill from elsewhere — but the founding path never asks for
  one. This is FD-15, designed and not built.
- **The Mamluk Faris's Battlekit** and its loadout choice (task #130).
- **The Desecrated Saint's Dispatch keyword reprint** has no op, and writing
  one naively would drop LIMITED POTENTIAL (task #131).
- **Glory Items** that add Promotion Dice are a number the player types, not a
  modelled item.
- **The Quartermaster and Roster Steps** are not in the wizard on purpose: they
  are what the roster builder already is, and duplicating them would give a
  player two places to spend the same Ducats.

### Known rough edges

- For a **campaign** Warband the budget modal still offers `ducatLimit`, and
  `handleSaveBudget` writes `updateWarbandTreasury` absolutely — which cancels
  any `admin-adjust` delta two lines earlier. Filed during FD-05.
- The **Brazen Bull** carries no LIMITED POTENTIAL keyword because
  `dispatch-01` replaces its whole entry. That is precedence working, and
  `rules:check` prints the disagreement every build; it is listed here so it is
  not mistaken for a data bug during testing.
- The **three All Out War scenarios are hand-written**, not derived. They are
  spot-checked against `data-sources/rulebook/extracted/all-out-war.txt` — 20
  of their 24 bolded terms are real and the four that are not are the app's own
  section labels — and they carry `derived: false` rather than passing as
  sourced. `dataset.scenarios` holds 17; the pack is added by
  `rules/useScenarios.ts`. Treat their wording as the least trustworthy text in
  the app.

## Running it

```bash
npx playwright test e2e/mockGame.spec.ts
```

Phone, tablet and desktop. The mobile-floor case skips on desktop, because
`docs/MOBILE.md` §3 restores density at `lg:` and asserting 44px there would
ask the app to break its own standard.
