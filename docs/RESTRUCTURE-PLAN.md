# Restructure Plan

Phased plan to take TrenchLine from the audited state ([`AUDIT.md`](AUDIT.md)) to
the target architecture ([`ARCHITECTURE.md`](ARCHITECTURE.md)).

## Sequencing principle

**Data before layout.** Fixing layouts around fabricated data means doing the
layout work twice — corrected profiles change what a unit card has to display
(Glory costs, base sizes, options, constraint violations). Phase 0 is the one
exception: a handful of mobile fixes are cheap, isolated, and worth shipping
immediately.

Each phase is independently shippable and leaves the app working.

---

## Phase 0 — Stop the bleeding ✅ COMPLETE

*Small, isolated, high-impact. No architectural commitment.*

| # | Task | Status |
|---|---|---|
| 0.1 | Fix the broken mobile nav grid | ✅ flex + `flex-1`; no dynamic class to fail |
| 0.2 | `vh` → `dvh` across all modals | ✅ 27 utilities in 22 files, plus `h-screen`/`min-h-screen` |
| 0.3 | Safe-area insets + `viewport-fit=cover` | ✅ `--safe-*` vars, `.pb-safe`/`.pb-nav-safe`, Next `viewport` export |
| 0.4 | Remove `overflow-x: hidden` from `body` | ✅ removed; the overflow it hid was the Navbar, now fixed |
| 0.5 | Delete the fabricated GitHub commit fallback | ✅ **three** fabrications removed, not one |
| 0.6 | Link `manifest.json`, generate real maskable icons | ✅ 5 icons generated; manifest wired through Next metadata |
| 0.7 | Delete dead Vite scaffolding | ✅ |
| 0.8 | Rewrite root `README.md` | ✅ (done earlier on this branch) |
| 0.9 | Compress `public/` images | ✅ 17 MB → 1.7 MB of served imagery |

**Verified** in Chromium against a production build at 375×667 and 768×1024:
`scrollWidth === clientWidth` at both sizes; the bottom nav computes
`position: fixed`, 53px tall, flush to the viewport bottom, rendering as a row
with all 7 buttons at exactly 44px.

**Bugs found while verifying, also fixed:**

- `TerritoryMap` pointed at `/world_map.png`, which does not exist — the campaign
  map had no background at all.
- The Navbar forced the document to 777px on a 375px screen (every header child
  was `flex-shrink-0`). Invisible until `overflow-x: hidden` came off.

**Explicitly not done here** — these are Phase 3, and Phase 0 does not claim them:

- **122 interactive elements are still under 44px tall.** The nav is fixed; the
  rest is the type-scale and density work that needs the `UnitCard` rebuild.
- `next/image` migration. The 9 raw `<img>` tags remain; the compression win is
  banked, but the responsive-srcset work belongs with the component rebuild.
- **84 MB of unreferenced files under `public/maps`.** These are real official
  scenario maps that are not wired up yet, not junk. Deleting them is a separate
  decision — the alternative is to wire them into the scenario data in Phase 1.

---

## Phase 1 — The data pipeline ✅ COMPLETE

*The foundation. Nothing else is durable without it.*

| # | Task | Status |
|---|---|---|
| 1.1 | Scaffold `data-sources/`, `scripts/` | ✅ |
| 1.2 | `rules:extract` — PDF → page-delimited text | ✅ |
| 1.3 | `rules:fetch` — pin the catalogue SHA, checksums, fail loudly | ✅ |
| 1.4 | `rules:parse` — BattleScribe XML → entities | ✅ `scripts/lib/parse-battlescribe.mjs` |
| 1.4a | Parse the rulebook's warband entries and variants | ✅ `scripts/lib/parse-warbands.mjs` |
| 1.5 | New entity model | ✅ `src/types/catalogue.ts` |
| 1.6 | Layer engine + provenance stamping | ✅ `scripts/lib/layers.mjs` |
| 1.7 | Transcribe `dispatch-01.layer.json` | 🟡 the four Grail Strains done; Amalgam/Thrall entry replacements and the Mercenary keyword rewrites outstanding |
| 1.7a | Parse the 14 Warband Variants | ✅ all 14, with their special rules |
| 1.7b | Preserve the kept warband | ⬜ deferred to Phase 2 with the roster model |
| 1.8 | `rules:verify` | ✅ `scripts/lib/verify.mjs`; fails on unresolved conflicts |
| 1.9 | `rules:build` → `*.generated.ts` + provenance | ✅ |
| 1.10 | Define the two rulesets | ✅ `scripts/lib/rulesets.mjs` |
| 1.11 | Vitest | ✅ 32 tests |
| 1.12 | CI workflow | ✅ `.github/workflows/ci.yml` |

### What it produces

```
units 89  weapons 389  variants 14
verified against the rulebook: 42 units
  confirmed 248   unconfirmed 282   resolved 4   CONFLICTS 0
```

**Acceptance test passes.** The Lieutenant reports `6"/Infantry`, `+2 Dice`,
`+2 Dice`, Armour `0`, Base `32mm`, 70 Ducats, `min=1 max=1` — every field
traceable to `New Antioch.cat@1b463a8` *and* marked
`verified: rulebook:warbands-of-trench-crusade`.

Against the old hand-written data: **89 units** (was 45), **69 with recruitment
limits** (was 0), **17 with Glory costs** (was 0), **89 with base sizes** (was 0).

The build is **reproducible** — byte-identical across runs — so CI can prove the
committed data still matches `data-sources/`.

### Bugs the pipeline found in its own tooling

Worth recording, because each one would have looked like a data conflict:

- The rulebook prices ten Mercenary entries in **Glory (`☼`)**, not Ducats
  (`👑`). Reading the glyph wrong made every one of them a false conflict.
- `normaliseStat('0')` returned `'+0'` — the "prefix bare numbers" rule undid
  the "+0 ≡ 0" rule, inventing a conflict on every Armour of 0.
- The precedence check used `??`, which stopped at the truthy `base` record and
  never saw the layer override, so the Dispatch looked like a conflict.
- `Combat Medic` exists as both a New Antioch and a Mercenary entry while the
  book has one; comparing both manufactured a conflict.

All four are covered by regression tests.

### Still outstanding

- **1.7 is partial.** `dispatch-01.layer.json` covers the changes that map onto
  the current model. Still to transcribe: the Black Grail Strains and Vile
  Corpus (needs `UnitOption` wired through the build), the Amalgam and Grail
  Thrall replacements, the Mercenary keyword rewrites, and the new Glory Items.
- **Three Dispatch ops cannot be applied**: `Demonic Aura Grenade`, `Holy
  Grenade` and `Parasite Grenades` do not exist in the catalogues under any
  name. Reported, not dropped — this is the catalogue lag the design predicted.
- **`defaultRules.ts` is not deleted yet.** The app still reads the old model;
  migrating the UI onto `src/data/generated/` is Phase 2, so both exist for now.
  Phase 1 is verifiable on its own without a UI rewrite.

## Phase 2 — The rules engine

*Turns correct data into the feature that makes this a NewRecruit replacement.*

| # | Task |
|---|---|
| 2.1 | `src/rules/validate.ts` — constraint evaluation (min/max, roster/parent scope, conditions) |
| 2.2 | `src/rules/costs.ts` — Ducats **and** Glory, including options and Glory Items |
| 2.3 | ✅ `UnitOption` support — 315 options across 55 units in 22 groups. **Catalogue modifiers done** ([`RULESET-MODEL.md` §7b](RULESET-MODEL.md#7b-catalogue-modifiers--the-conditional-layer)): 820 parsed, evaluated by `src/rules/modifiers.ts`, verified against the real roster. |
| 2.4 | Wargear legality — "ELITE only", "Limit: 2", hand/slot capacity, faction armoury scoping |
| 2.5 | Warband creation rules — required entries ("must include 1 Yüzbaşı"), budget presets |
| 2.5a | ✅ Faction Special Rules — 6 factions with budgets, the Fireteam cap enforced and overridable by a variant |
| 2.6 | ✅ Surface violations in the builder — `LegalityStrip` renders the verdict, every violation naming the rule that produced it |
| 2.7 | ✅ Ruleset switcher + reconciliation — `RulesetSwitcher` shows a computed diff, roster entries first, before anything is applied |
| 2.10 | ✅ **Warband Variants** — 17 variants, 16 with ops derived from catalogue modifiers; `validate.ts` uses them in preference to the prose reader. Roster-side `variantId` still needs the UI. ([`RULESET-MODEL.md`](RULESET-MODEL.md) §7a). **Scope reduced**: the mechanical effects derive from catalogue modifiers (§7b), so this is wiring rather than transcription. |
| 2.8 | ✅ Provenance UI — `ProvenanceTag`, per field, served per entity from `/api/dataset/provenance` |
| 2.9 | ✅ 124 tests, including the real 1,320-Ducat roster against the real dataset |

| 2.11 | 🟡 **Migrate the app onto the generated dataset** — legality is migrated; **recruitment is not**. See below. |

**Done when:** an illegal roster cannot be silently built; every violation names
the rule and cites its source; switching rulesets shows a diff rather than
mutating saved data.

Two of those three hold. The third does not yet: recruitment still runs on
`defaultRules.ts`, so an illegal roster can still be *built* — it just cannot
be built *silently*. See 2.11 below.

### 2.11 — the migration: what moved, and what did not

**Both blockers are resolved.** Weapon pricing is per faction, so the Armoury
Table became its own entity (`src/rules/armoury.ts`) and is the pricing and
legality authority: 6 armouries, 213 rows. The 1.6 MB dataset is served from
`GET /api/dataset` rather than imported, and First Load JS stayed at 103 kB.

**What is migrated: checking.** `LegalityStrip`, `RulesetSwitcher` and
`ProvenanceTag` all read the generated dataset through `useDataset`, and
`fromWarband.toRoster` joins the saved warband to it by name, re-pricing from
the armoury.

**What is not: recruiting.** `useStore.ts` still builds its unit list as
`[...BASE_UNITS, ...customUnits]` from `defaultRules.ts`, and `AddUnitModal`
reads it. So the models a player can *add* still come from the hand-written
data the audit measured as 97% wrong on statlines, with 38% of its wargear
invented. `QuickSearchModal`, `newRecruitImporter` and `warbandLore` read it too.

This is the gap between the two halves of Phase 2's own acceptance test. A
finished roster is now checked against sourced data and told exactly what is
wrong with it — but it is still *assembled* from unsourced data, so the check
fires after the fact rather than preventing the mistake. Until the recruit path
moves, **"an illegal roster cannot be silently built" is not true**; only "an
illegal roster does not stay silent" is.

Moving it is a store restructure, not a data change, and `useStore.ts` is the
2,364-line file Phase 4.2 exists to split — so it is sequenced with that work
rather than bolted on ahead of it.

### Also outstanding in Phase 2

- **`variantId` is never set on a saved warband.** The field exists on
  `Warband` and the validator honours it, but no UI writes it, so variant rules
  do not fire. This is why a House of Wisdom warband still reports "must include
  1 Yüzbaşı" — a correct rule applied to a warband that has not been told which
  variant it is. Last mile of 2.10.
- **Variant armoury grants are not modelled.** The House of Wisdom's *Weapon
  Collections* extends the faction armoury; nothing reads that yet, so
  `wargear-not-stocked` is advisory rather than blocking (2.4).
- **2.5 budget presets** — required entries are enforced through variant ops;
  per-faction starting budgets exist, but presets are not surfaced in the UI.

---

## Phase 3 — Mobile rebuild

*Now that the data is right and we know what a card must show.*

| # | Task |
|---|---|
| 3.1 | `src/components/ui/` primitives — `Modal`/`Sheet` (scroll lock, focus trap, `Escape`, safe areas), `Field`, `Stepper`, `DataTable` |
| 3.2 | Migrate all 30 modals onto the primitive |
| 3.3 | Rebuild `UnitCard` mobile-first — collapsed row, tap to expand, scrollable statline strip, actions in a sheet |
| 3.4 | Touch targets ≥44px and the type scale from [`MOBILE.md`](MOBILE.md) applied app-wide |
| 3.5 | Replace 3,698 hardcoded hex values with theme tokens — makes the 7 themes real |
| 3.6 | Play Mode phone pass: one-handed reachability, larger steppers, landscape tablet |
| 3.7 | Playwright E2E at 375×667 and 768×1024 |

**Done when:** every view meets the [`MOBILE.md`](MOBILE.md) definition of done.

---

## Phase 4 — Structure

*Deferred deliberately: valuable, but nothing above depends on it.*

| # | Task |
|---|---|
| 4.1 | Real routes — `/roster/[id]`, `/play/[matchId]`, `/campaign/[id]`, `/codex/[...slug]` |
| 4.2 | Split `useStore.ts` (2,364 lines) into roster / match / campaign / settings |
| 4.3 | Resolve the `localStorage` ⇄ Postgres dual source of truth |
| 4.4 | Remove `eslint.ignoreDuringBuilds` and fix the fallout |
| 4.5 | Offline-first PWA — service worker, cached rules data for table use with no signal |

---

## Phase 5 — Carcass Front preview (backburner)

*Blocked on Phases 1–2. Do not start before the pipeline and rules engine work.*

Build a **predicted** Carcass Front ruleset from published community reporting,
so a warband can be drafted before the box ships. Sources so far:

- `tabletopbattles.com/trench-crusade-carcass-front-box-roundtable`
- `tabletopbattles.com/trench-crusade-faction-focus-naval-raiders`
- `tabletopbattles.com/trench-crusade-faction-focus-procession-of-the-sacred-affliction`

| # | Task |
|---|---|
| 5.1 | Archive each article to `data-sources/preview/carcass-front/` with fetch date and URL — articles get edited and deleted |
| 5.2 | Widen the search: other previews, designer commentary, event reports |
| 5.2a | **Check what is already published first.** Two of the three linked articles name things that already exist in the current Warbands book — `Heretic Naval Raiders` and `Procession of the Sacred Affliction` are both existing Warband Variants with published special rules. Sort genuinely-new Carcass Front content from reworks of existing entries before predicting anything; published rules go in a normal layer, not the speculative one. |
| 5.3 | Transcribe to `carcass-front.layer.json` with `status: 'speculative'`, per-field citation and `stated`/`inferred` confidence |
| 5.4 | `carcass-front-preview` ruleset — opt-in only, never a layer on `trenchline` |
| 5.5 | Speculative UI treatment: roster banner, per-entry badges, stamped exports |
| 5.6 | `rules:verify` inverse mode — fail on any field lacking a citation or confidence |
| 5.7 | On release: delete the speculative layer, replace with a PDF-primary layer |

**The rule that makes this safe:** a value nobody published is left *absent and
shown as unknown*, never filled with a plausible guess. See
[`RULESET-MODEL.md`](RULESET-MODEL.md) § `status: 'speculative'`.

This is also a live rehearsal for 5.7 — the same-day turnaround that is the
app's main advantage over NewRecruit.

## Rough shape

| Phase | Relative size | Blocks |
|---|---|---|
| 0 | Small | nothing |
| 1 | **Large** | 2, 3 |
| 2 | Large | — |
| 3 | Medium–large | — |
| 4 | Medium | — |
| 5 | Small–medium | blocked on 1, 2 |

Phase 1 is the bulk of the work and the only one that cannot be parallelised or
skipped. Phases 0 and 4 can be picked up any time.

## Decisions — status

| # | Decision | Status |
|---|---|---|
| 1 | Rulebook PDFs | **Partly resolved.** Changelog 1.0.2, Rules Commentaries 1.0.2 and All Out War are committed. **Still needed: Core Rulebook + Warbands of Trench Crusade** — the two that unblock statline verification. Delivery via GitHub release asset (verified reachable) or split uploads. |
| 2 | Saved warbands | **Closed.** No general migration. One warband is preserved (1,320-Ducat Iron Sultanate *House of Wisdom*, heavy lore); the rest are discarded. Its narrative fields are carried over verbatim and it becomes a regression fixture. See [`RULESET-MODEL.md`](RULESET-MODEL.md) §8. |
| 3 | Licensing | **Closed.** Not a blocker; sources stay in `data-sources/`. |
| 4 | Fabricated data | **Closed.** Delete what is verifiably invented — but verify each file first rather than tossing wholesale. All Out War data turned out to be correct; see [`FEATURES.md`](FEATURES.md). |
| 5 | Faction rules | **Closed.** Keep the field, replace the content. The Warbands book gives each faction a real Special Rules section (New Antioch Fireteams / Concentrated Attack). They affect roster construction, so they belong in the rules engine, not only the Codex. See [`AUDIT.md`](AUDIT.md) §1.4. |

## Standing requirement: fast turnaround on new releases

The community catalogues lag official releases by months. Getting new content
into the app within a day of the PDF dropping is a **primary product goal**, not
a nice-to-have — it is the main advantage over NewRecruit for this game.

The Carcass Front release is the first test. The mechanism is a PDF-primary
layer; see [`RULESET-MODEL.md`](RULESET-MODEL.md) § "Adding a brand-new faction".
Phase 1 must land with that path working end-to-end, not just the correction path.

## Feature parity

[`FEATURES.md`](FEATURES.md) is the checklist: everything NewRecruit does, plus
everything the original draft attempted. Phase 2 is scoped by the ❌ rows in its
NewRecruit-parity table — unit limits, required entries, wargear legality and
roster legality are the four that do not exist today and are the reason the app
cannot yet replace NewRecruit.
