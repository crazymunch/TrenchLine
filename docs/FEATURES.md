# Feature Inventory

The target is **everything NewRecruit does for Trench Crusade, plus everything
the original TrenchLine draft attempted** — with the second group actually
working rather than merely present.

This document is the checklist. `Status` is what the code genuinely does today,
verified by reading it, not what the UI or the README claims.

| Status | Meaning |
|---|---|
| ✅ | Works |
| 🟡 | Present but incomplete, or works on wrong data |
| ❌ | Claimed somewhere but not implemented |
| ⬜ | Not attempted yet |

---

## Part 1 — NewRecruit parity

The baseline. A roster builder is only useful if it refuses to build an illegal
roster.

| Feature | Status | Notes |
|---|---|---|
| Faction/warband selection | ✅ | 6 factions; Mercenaries orphaned (`AUDIT.md` §1.5) |
| Add/remove/duplicate models | ✅ | |
| Points budget with live total | 🟡 | Ducats only — **no Glory budget** |
| **Unit min/max limits** (`0-2 Sniper Priests`) | ❌ | 0 of 45 units carry `maxCount`; catalogues have 1,187 constraints |
| **Required entries** (`must include 1 Lieutenant`) | ❌ | Only a generic "has a Leader" check |
| **Wargear legality** (`ELITE only`, `Limit: 2`) | 🟡 | Ad-hoc filters in `AddEquipmentModal`, not rule-driven |
| Hand/slot capacity (1H/2H, shield combo) | 🟡 | Partial, hand-rolled |
| **Roster legality summary** | ❌ | Only over-budget + no-leader |
| Per-model wargear costs rolled into total | ✅ | |
| **Glory Items / per-model upgrades** | ❌ | Strains, Vile Corpus, Goetic Powers, Glory Items — no concept exists |
| Import from NewRecruit / BattleScribe | 🟡 | `newRecruitImporter.ts` handles JSON/XML/text; maps onto wrong profiles |
| Export roster (print / text) | ✅ | `ExportModal` with real print styles |
| Export to shareable file | 🟡 | |
| Multiple saved rosters | ✅ | |
| Ruleset version selection | 🟡 | Exists, but versions are unsourced (`AUDIT.md` §1.9) |
| Data freshness / upstream sync | 🟡 | `CustomizerView` diffs against GitHub; had a fabricated fallback |
| Offline use | ⬜ | No service worker; PWA manifest not linked |

**The four ❌ rows are the whole point of the app.** They are Phase 2.

## Part 2 — TrenchLine's own ideas

These are what make it better than NewRecruit for this game. The ideas are good;
the execution is the problem.

### Tabletop Play Mode

| Feature | Status | Notes |
|---|---|---|
| Wound / status steppers | ✅ | Active / Downed / Out of Action |
| **Blood Marker pool** | ✅ | 6-marker cap enforced |
| Blessing markers | 🟡 | Less complete than Blood |
| Activation tracking (acted this turn) | ✅ | `toggleUnitActed` |
| Turn/phase counter | ✅ | |
| Dice roller (D6 / 2D6 / D66) | ✅ | `DiceRoller.tsx`, 523 lines |
| Risky Success Roll support | ✅ | |
| Keyword popovers | ✅ | Text is paraphrased, not official |
| Attack calculator | ✅ | Runs on wrong statlines |
| Range calculator | ✅ | |
| Dice probability tool | ✅ | |
| Scenario reference + map lightbox | ✅ | Real official maps |
| **Live multi-device match sync** | ❌ | Honestly labelled "Coming Soon" in-app |

### Campaign

| Feature | Status | Notes |
|---|---|---|
| Multi-player campaign hub | ✅ | |
| Glory / Ducats / W-L leaderboard | ✅ | |
| Shared campaign invite codes | ✅ | |
| Territory map with node claiming | ✅ | |
| Narrative chronicle feed | ✅ | |
| **Post-battle sequence wizard** | 🟡 | 4 steps; D66 tables need verification |
| D66 Trauma / injury rolls | 🟡 | Table needs verification against rulebook |
| XP & advancement | ✅ | `UnitAdvancementModal`, 681 lines |
| Exploration (No Man's Land) | 🟡 | Common/Rare/Legendary tables need verification |
| Skills roller & compendium | 🟡 | Melee/Ranged/Stealth/Wildcard — need verification |
| Warband treasury & stash | ✅ | |
| Titles / deeds / scars | ✅ | A genuinely nice original idea |
| Warband lore & chronicle | ✅ | |

### Reference & tooling

| Feature | Status | Notes |
|---|---|---|
| **All Out War multiplayer pack** | ✅ | **Verified correct** against the official PDF — see below |
| Betrayal card engine (52-card) | ✅ | **Verified word-for-word** against All Out War |
| Scenario compendium + maps | ✅ | |
| Mission designer / generator | ✅ | |
| Keyword glossary | 🟡 | 116 entries, paraphrased; **missing 7 of the 12 keywords the 1.0.2 changelog defines**, including `CLEAVE (X)` and `DEADLY` (`AUDIT.md` §1.3a) |
| Armoury / weapon / armour tables | 🟡 | Present, values invented |
| Rules customizer (local overrides) | ✅ | |
| GitHub 3-way diff resolver | ✅ | Wired up and functional |
| Warband comparator | ✅ | |
| Roster directory (global registry) | ✅ | |
| Bug report + diagnostics | ✅ | |
| Theme switcher (7 faction themes) | 🟡 | Themes defined; components ignore them |
| Auth + cloud sync | ✅ | NextAuth + Prisma |

---

## What is genuinely correct today

Worth recording, because the instinct to throw out all of Gemini's data would
lose real work:

- **All Out War scenario pack** — `src/data/allOutWarData.ts`. The three
  scenarios (The Looters, Brothers in Arms, Alliance & Betrayal) and the full
  52-card Betrayal Table match the official PDF essentially word-for-word,
  including Coup/Ruse split, card values and timing clauses. **Keep it.**
- **Ducat costs** — largely correct (Lieutenant 70, Sniper Priest 50).
- **Unit and faction names** — real, if sometimes with invented decoration
  (`Trench Dog / War Hound`, `Anchorite Shrine`).
- **Scenario maps** — genuine official artwork.

The pattern: **where Gemini had the source PDF, the data is good. Where it
didn't, it invented.** That is the strongest possible argument for the pipeline
in [`RULESET-MODEL.md`](RULESET-MODEL.md) — and the reason each data file gets
verified individually rather than deleted wholesale.

## What must be deleted

- `FACTIONS[].rules` — fabricated faction special rules.
- `BASE_UNITS` statlines and keywords — 29 of 30 checkable entries wrong.
- `BASE_WEAPONS` / `BASE_ARMOUR` keyword sets — `Slashing`, `Concussive`,
  `Fast Strike`, `Bayonet Lug` do not exist.
- `src/data/rulesets/index.ts` — unsourced changelogs, superseded by the real
  1.0.2 changelog PDF.
- `githubSync.ts` fabricated commit fallback.

## Verification queue

Each needs checking against the now-committed PDFs before it can be trusted:

| Data | Source to check against |
|---|---|
| Keyword glossary | 1.0.2 Changelog ✅ available — **7 gaps already confirmed** |
| D66 Trauma table | Core Rulebook |
| Exploration tables | Core Rulebook |
| Skills tables | Core Rulebook |
| Scenarios | Core Rulebook + All Out War ✅ |
| Injury/Down/Out of Action rules | 1.0.2 Changelog ✅ available |
| FAQ / edge cases | Rules Commentaries 1.0.2 ✅ available |
