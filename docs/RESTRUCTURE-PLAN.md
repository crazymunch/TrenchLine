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

## Phase 1 — The data pipeline

*The foundation. Nothing else is durable without it.*

| # | Task |
|---|---|
| 1.1 | Scaffold `data-sources/`, `scripts/`; promote the good extractions out of `scratch/` |
| 1.2 | `scripts/extract-pdf.mjs` — deterministic, page-delimited PDF → text |
| 1.3 | `rules:fetch` — pin the catalogue SHA, write `MANIFEST.json` with checksums, fail loudly |
| 1.4 | `rules:parse` — BattleScribe XML → normalised entities (shared entries, category links, cost types, constraints) |
| 1.4a | `rules:warbands` — extend the PDF parser to the Armoury Tables (`Automatic Rifle \| Bayonet Lug, Limit: 1 \| 40 👑`) and faction Special Rules sections |
| 1.5 | New entity model in `src/types/rules.ts` — Glory cost, base size, movement type, constraints, `UnitOption` |
| 1.6 | `rules:layer` — layer op engine + provenance stamping |
| 1.7 | Transcribe `dispatch-01.layer.json` from the extracted Dispatch text |
| 1.7a | Parse the 14 Warband Variants and their special rules out of the Warbands book |
| 1.7b | Preserve the one kept warband: `scripts/extract-warband-lore.mjs` → `data-sources/fixtures/`, re-map onto corrected profiles, report anything unmatched |
| 1.8 | `rules:verify` — fuzzy rulebook cross-check, `reports/crosscheck.md`, non-zero exit on conflict |
| 1.9 | `rules:build` — emit `*.generated.ts` + `provenance.json` |
| 1.10 | Define the two rulesets; delete `src/data/rulesets/index.ts` and the unsourced 1.0/1.0.2 metadata |
| 1.11 | Vitest: layer ops, cost maths, known-good fixtures (Lieutenant = +2/+2/0/32mm) |
| 1.12 | CI workflow: `rules:build` + `lint` + `typecheck` + `test` on every PR |

**Done when:** `npm run rules:build` produces the full dataset from
`data-sources/` alone; every field has provenance; the build fails on an
unresolved conflict; `defaultRules.ts` is deleted.

**Acceptance test:** Lieutenant reports Movement `6"/Infantry`, Ranged `+2
DICE`, Melee `+2 DICE`, Armour `0`, Base `32mm`, 70 Ducats — each traceable to
`New Antioch.cat` at the pinned SHA and confirmed against the rulebook.

---

## Phase 2 — The rules engine

*Turns correct data into the feature that makes this a NewRecruit replacement.*

| # | Task |
|---|---|
| 2.1 | `src/rules/validate.ts` — constraint evaluation (min/max, roster/parent scope, conditions) |
| 2.2 | `src/rules/costs.ts` — Ducats **and** Glory, including options and Glory Items |
| 2.3 | `UnitOption` support — Strains, Vile Corpus, Goetic Powers, Glory Items, variants |
| 2.4 | Wargear legality — "ELITE only", "Limit: 2", hand/slot capacity, faction armoury scoping |
| 2.5 | Warband creation rules — required entries ("must include 1 Yüzbaşı"), budget presets |
| 2.5a | Faction Special Rules as engine rules — e.g. New Antioch "up to 2 Fireteams", granting FIRETEAM at no cost |
| 2.6 | Surface violations in the builder: per-unit, per-roster, blocking vs advisory |
| 2.7 | Ruleset switcher + reconciliation review screen — needed for *Latest GitHub* ⇄ *TrenchLine* switching; no longer blocks Phase 1 |
| 2.10 | **Warband Variants** — `variantId` on `Warband`, variant selection at creation, variant ops applied to roster validation ([`RULESET-MODEL.md`](RULESET-MODEL.md) §7a). 14 official variants. |
| 2.8 | Provenance UI — "where does this number come from?" in the Codex |
| 2.9 | Comprehensive unit tests for `src/rules/*` |

**Done when:** an illegal roster cannot be silently built; every violation names
the rule and cites its source; switching rulesets shows a diff rather than
mutating saved data.

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
