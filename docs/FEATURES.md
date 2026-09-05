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
| **Glory Items / per-model upgrades** | 🟡 | `UnitOption` exists; the Grail Strains and the Vile Corpus are derived onto their entries, and the Dispatch's two new Glory Items are stocked and priced. Goetic Powers are still not modelled |
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
| Blessing markers | ✅ | Uncapped, as the book prints them — see below |
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

**The marker pools are not mirror images.** The row above used to read 🟡
"Less complete than Blood", which was generous: Blessing Markers had no state
in the app at all. They do now, and the two pools differ in both ways the book
states — Blood is capped at 6 and spent by your *opponent*; Blessing has no
printed cap and is spent by *you*. A Blessing pool written as a copy of the
Blood pool caps at six and then cannot record a seventh blessing, which is a
legal board state.

Both caps come from `dataset.markers`, read out of the rulebook by
`scripts/lib/parse-markers.mjs`. The store used to clamp Blood with a literal
`Math.min(6, …)` under a comment reading "Official Rulebook Cap" — the cap is
a rule, and rules are derived (CLAUDE.md rule 1). Where the book prints no cap
the app enforces none, and where the dataset has not loaded yet it enforces
none either, rather than falling back to a number the code remembers.

### Campaign

| Feature | Status | Notes |
|---|---|---|
| Multi-player campaign hub | ✅ | |
| Glory / Ducats / W-L leaderboard | ✅ | |
| Shared campaign invite codes | ✅ | |
| Territory map with node claiming | ✅ | |
| Narrative chronicle feed | ✅ | |
| **Post-battle sequence wizard** | ✅ | **Rebuilt on the book's sequence.** It ran four steps, two of them named things the book does not use (`Scavenge`, `Chronicle`), and had no Reinforcements Step — so a player who called for reinforcements was still offered an Exploration roll they are not entitled to. It now runs the book's steps in the book's order, their names read from `dataset.campaign.phaseSteps` rather than retyped, plus one the app needs first (which scenario was fought, and how it went). The Quartermaster and Roster Steps are deliberately not in it: they are what the roster builder already is, and duplicating them would give a player two places to spend the same Ducats. Taking Reinforcements **warns and lets the player through** rather than blocking, and a campaign house rule (`reinforcementsKeepExploration`) makes it not a deviation for groups that play it that way — see `docs/CAMPAIGN-SYNC.md` for how that setting syncs |
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

What has been read against the committed PDFs, and what has not. A row leaves
this table by being checked, not by looking fine.

| Data | Source | State |
|---|---|---|
| D66 Trauma table | Core Rulebook | ✅ Checked. Two rows wrong; both fixed and pinned |
| Exploration tables | Core Rulebook | ✅ Checked. Three rows carried page furniture; fixed and pinned |
| Skills tables | Core Rulebook | ✅ Checked. The Patron Skill row in all four tables carried page furniture; fixed and pinned |
| Scenarios | Core Rulebook + All Out War | ✅ Checked |
| Unit statlines | BattleScribe + Warbands book | ✅ Checked both ways — `rules:crosscheck` reports 0 mismatched over 96 units, `rules:threeway` reports 0 app-vs-rulebook disagreements over 42 |
| Keyword glossary | 1.0.2 Changelog | ✅ Checked. The 7 gaps §1.3a found — `CLEAVE (X)`, `DEADLY`, the three terrain Keywords, `REGENERATE (X)`, `SKIRMISHER` — are closed. All **17** Keywords the changelog names are present, and `scripts/__tests__/keywordGlossary.test.mjs` re-checks it |
| Injury/Down/Out of Action rules | 1.0.2 Changelog | ✅ Checked. Nothing to apply: the digital rulebook the app derives from **is** 1.0.2 and already carries the changelog's rewrites — see below |
| FAQ / edge cases | Rules Commentaries 1.0.2 | ⛔ **Not checked** |

Five of these sat here as "needs checking" after they had been checked and
fixed, in a document whose own tables above said so. That is the failure AUD-1
was about, three sections apart in one file: a queue that does not empty stops
being read, and then the entries that ARE still outstanding — the two at the
bottom — are invisible for the same reason.

**The changelog is not a layer, and never needed to be.** The digital rulebook
in `data-sources/rulebook/` is version 1.0.2 — its cover reads `1`0`2`, the
PDF's own glyph substitution for the dots — so the changelog records what
changed from 1.0.1 rather than a delta to apply on top of it. Every rewrite it
lists was checked against the book and is already there: `STRONG`'s second
sentence, `RISKY`'s last, `SKIRMISHER`'s evade, `MINED`'s detonation, the
Bloodbath Roll, the added line under Injury Rolls, and each of the three
terrain Keywords. No layer transcribes the changelog, none should, and
`data-sources/rulebook/SOURCES.json` said otherwise until this was checked.

Where the two differ it is wording, not rules, and the book reads as the later
refinement in each case — its `CLEAVE (X)` is "take a Fight ACTION **and choose
a Weapon with this Keyword** to make a Melee Attack" where the changelog has
"with a Weapon that has this Keyword"; `AUTOMATIC (X)` differs the same way;
`SKIRMISHER` says "a model with this Keyword" where the changelog says "a
friendly model"; and the Comprehensive-rules Down Results bullet on p49 keeps
"cannot **be moved** for any reason", matching its Core-rules twin on p20,
where the changelog's p49 entry alone says "cannot **move**". The app carries
the book's wording, which is right: the book is what a player owns.

That whole chain rests on one fact that could go silently false — swap in a
1.0.1 rulebook and none of it holds, with nothing else in the build to notice
— so `scripts/__tests__/keywordGlossary.test.mjs` asserts the extract's version.

The Keyword row is the sharpest case, because it was stale in the direction
that matters least to notice and most to fix. It read "7 gaps already
confirmed" long after all seven had been closed; reading the changelog back
out and comparing found **nothing** missing, from a list of 17 that is wider
than the 12 the audit measured against. The audit called this failure mode "a
claim of completeness that the code does not honour" — so the claim is now a
test rather than a sentence, and it fails if a Keyword the changelog names
leaves the glossary.
