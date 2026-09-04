# Feature Inventory

The target is **everything NewRecruit does for Trench Crusade, plus everything
the original TrenchLine draft attempted** — with the second group actually
working rather than merely present.

This document is the checklist. `Status` is what the code genuinely does today,
verified by reading it, not what the UI or the README claims.

Which means it goes stale, and did: after Phase 2 shipped variants, unit
limits, required entries and the legality summary, this file still listed all
four as ❌ for weeks. A checklist that lags the code is worse than none,
because it is the file someone reads to decide what to build next. Re-read it
whenever a phase closes.

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
| **Warband Variants / sub-factions** | ✅ | 17 derived from the catalogues, `variantId` on `Warband`, `VariantPicker` in the builder, and variant ops that change legality and armoury |
| Add/remove/duplicate models | ✅ | |
| Points budget with live total | ✅ | Both currencies; `validate.ts` raises `over-budget-glory` as well as Ducats |
| **Unit min/max limits** (`0-2 Sniper Priests`) | ✅ | Derived per unit, raised or lowered by a variant |
| **Required entries** (`must include 1 Lieutenant`) | ✅ | `unit-min`, scoped to the roster's own faction, with variant overrides |
| **Wargear legality** (`ELITE only`, `Limit: 2`) | ✅ | Rule-driven from the armouries, per faction and per variant |
| Hand/slot capacity (1H/2H, shield combo) | 🟡 | Partial, hand-rolled |
| **Roster legality summary** | ✅ | `LegalityStrip` renders the verdict, each violation naming the rule that produced it |
| Per-model wargear costs rolled into total | ✅ | |
| **Glory Items / per-model upgrades** | 🟡 | `UnitOption` exists and the Grail Strains are derived onto the Thrall; Vile Corpus, Goetic Powers and Glory Items are not modelled yet |
| Import from NewRecruit / BattleScribe | 🟡 | JSON/XML/text, resolved against the generated dataset. An entry it cannot match is now **reported, not invented** — it used to become a 35-Ducat Trooper with a made-up statline. Equipment is still not carried across from the export |
| Export roster (print / text) | ✅ | `ExportModal` with real print styles |
| Export to shareable file | 🟡 | `ExportModal` writes a file; a roster now also has a URL (`/roster/[id]`), though it is device-local until the owner is signed in |
| Multiple saved rosters | ✅ | |
| Ruleset version selection | ✅ | Two sourced rulesets, SHA-pinned, switchable with reconciliation |
| Data freshness / upstream sync | 🟡 | `CustomizerView` diffs against GitHub; had a fabricated fallback |
| Offline use | ✅ | Service worker caches the shell and the ruleset; `e2e/offline.spec.ts` cuts the network for real |

**All four of the ❌ rows above are now done.** They were the whole point of
the app and they were Phase 2.

What is left in this table is honest rather than tidy: `🟡` means the feature
works and something specific about it does not, and each row says which.

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
| Keyword popovers | ✅ | 61 keywords, derived from the glossary rather than paraphrased |
| Attack calculator | ✅ | Reads `profileSnapshot`, so it runs on the derived statlines now |
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
| D66 Trauma / injury rolls | ✅ | **Verified against the rulebook.** 22 rows, derived. Two were wrong: `12 Captured` was cut at a comma and lost the clause saying a paid ransom counts as a Full Recovery, and `65 Bitter Lessons` had run on into `66 Prominent Scar` and showed a player 66's rule. Both fixed and pinned; the build now fails on a rule that stops mid-sentence or carries another row's heading |
| XP & advancement | ✅ | `UnitAdvancementModal`, 681 lines |
| Exploration (No Man's Land) | ✅ | **Verified against the rulebook.** Three rows carried page furniture: `9 Survivor` and `20 Warband Strongbox` ended in the sidebar's `Glory Item Tables`, and `36 Fruit from the Tree…` in a stray `VM` mark. Fixed and pinned |
| Skills roller & compendium | ✅ | **Verified against the rulebook.** All four tables dense from 2 to 12. The Patron Skill row at 12 in every one of them ended in the sidebar's `Glory Item Tables`. Fixed and pinned |
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
| Keyword glossary | ✅ | 61 entries, derived. Was 116 hand-written ones missing 7 of the 12 the 1.0.2 changelog defines; `CLEAVE` and `DEADLY` are both present now (`AUDIT.md` §1.3a) |
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
