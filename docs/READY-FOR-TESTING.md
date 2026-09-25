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

---

# READY FOR TESTING 2

*What pack D2 adds, for the owner to test. Three designs: FD-12 (the official
Warband Roster Sheet, the Experience track, provenance), FD-15 (a Patron Skill
result needs a Patron) and SH-1 (a public share page).*

## 1. The Warband Roster Sheet

**Where.** The roster screen's toolbar has a new **Sheet** button, and a
warband's name in the campaign Hub's standings is now a link to the same page.
The URL is `/roster/<id>/sheet`.

**What to check, side by side with your paper sheet.** This is the acceptance
case and it needs your eyes, not a test:

- the header's six blanks — WARBAND NAME, PLAYER, WARBAND (the Variant), PATRON,
  CAMPAIGN BATTLE, FACTION;
- **STRONGBOX** as a pair per currency: TOTAL is everything ever credited,
  UNSPENT is what is left. A roster with no ledger says so rather than printing a
  TOTAL it did not compute;
- **WARBAND BIO & EXPLORATION NOTES**, with the review underneath it: every
  reward, Skill, injury and scar the Warband holds, whose it is, and how it was
  got;
- **HERALDRY** (your motto — the paper box is for a drawn device) and **ARSENAL**;
- the **campaign table**: twelve rows, Threshold and Field Strength on each, the
  scenario and W/L/D on the games you have played, and the Campaign VP total at
  the foot. Games not yet played stay blank;
- a **unit card** per model: the five characteristics including Base, the
  Experience track, SCARS, Battlekit, Abilities/Skills & Injuries, Keywords.
- **The Fallen** at the bottom, which the printed sheet has no room for.

**Print / PDF.** The button calls the browser's own print, so use its dialog to
save a PDF. Page 1 comes out landscape, then two unit cards a page. **Nothing
here has been tested on paper** — if the pagination is wrong on your printer,
that is the thing to report.

**The numbers to distrust first.** Everything on the table and the track is read
from the dataset, and the tests assert it matches the printed sheet. If a
Threshold or a circle is in the wrong place, the dataset is wrong, not the sheet.

## 2. The Experience track

Eighteen boxes with circles at 2, 4, 7, 10, 14 and 18, filled to the model's
Experience, with two SCARS boxes beside them. It appears in **three** places, and
they should agree: the unit card in the builder, the XP & Promotion tab of a
model's advancement sheet, and the Roster Sheet.

A model with **LIMITED POTENTIAL** — the Brazen Bull is the entry — greys the
boxes past its cap rather than hiding them, so the cap is visible on the model.

## 3. How a model came by what it holds

Every Skill, injury, scar and reward now records where it came from. Two things
to try:

- **Import your September export again.** Each Skill should arrive with the roll
  NewRecruit prints in brackets — Point Blank [9], Champion [11] — and each
  injury with its D66. Kasim's Skills should read "Imported · rolled 9" rather
  than sitting in the free-text advancements list.
- **Record something from before the app.** A model's advancement sheet (Skills
  and Trauma Scars tabs) has a note field: what you add there is marked
  *Recorded before the app* with your note, and it counts towards the next
  Advancement Roll and towards retirement exactly as a rolled one does. The
  Trauma tab also has a new **injury without a Battle Scar** entry — a scar
  retires a model at its third and an injury does not, and the modal used to
  write everything as a scar.
- **Warband-level rewards** have their own entry on the Sheet page, under
  **Rewards**: an Exploration reward, a Patron's entitlement, anything standing.

**An entry with no record reads as "Imported", never as a roll.** Nothing was
back-filled with a guess.

## 4. The Patron

Your Iron Sultanate warband's Patron is the **Sublime Gate**, and the import now
reads that out of the roster's own `Campaign Rules > Enabled` subtree.

- **At the muster.** New Warband → Campaign Force now asks for a Patron, from the
  book's list for the faction. It is not enforced: "Not decided yet" is allowed.
- **On the roster masthead.** The Patron is now a button beside the faction. A
  campaign Warband with none reads **Patron not set** in amber.
- **In the post-battle wizard.** It asks once when the wizard opens on a campaign
  Warband with no Patron, and it asks **on the spot** if a Patron Skill result
  lands with none set — pick the Patron and the same roll immediately offers that
  Patron's six Skills. Before this, that roll dead-ended and the only way out was
  to close the wizard.

Which Patrons a faction may take is read from each Patron's own printed
restriction, so check the list against the book: New Antioch should see Temporal
Lord, Warrior Saint, Learned Saint and Blessed Bartolomeo; the Iron Sultanate the
Sublime Gate, the House of Wisdom and Blessed Bartolomeo.

## 5. The share link

**Where.** The roster toolbar's new **Share** button.

- A roster that is **only on this device** cannot be shared, and the button says
  so — sharing needs the warband in the cloud, which means signed in and synced.
- **Share** gives you a link like `https://…/w/<token>`. Paste it anywhere: it
  opens the Roster Sheet, read only, with no sign-in.
- **Sharing twice keeps the same link**, on purpose — a second tap must not break
  a link you have already sent.
- **Stop sharing** breaks it for good. The old link then answers **404**, not an
  empty sheet. Sharing again mints a **different** link.
- The page is not indexed by search engines.

**What to check.** Open your own link in a private window, or send it to somebody
in the group: the sheet should read exactly as it does for you, minus your private
notes on individual models. Your Warband's own lore and motto **are** shared —
that is what a roster is shared for.

## What this pack does NOT do

- **The sheet is not editable.** It renders the roster; the builder edits it.
- **Print is not verified on paper.** Stated in millimetres and points for that
  reason.
- **A shared roster is read under the published default ruleset**, not the
  reader's own selection and not the owner's. A warband does not record its
  ruleset yet — that is RV-1.
- **The campaign table's total is the per-game scale only.** Two Exploration
  results move Campaign Victory Points outside it (`16 Treasure of the Holies`
  scores D3, `23 Patron's Visit` exchanges Glory for points); neither is
  derivable from a win/loss/draw record, so the sheet says so and you write those
  in.
- **The Patron is not enforced** at the muster, and a Patron the dataset cannot
  place is not written by the importer.
