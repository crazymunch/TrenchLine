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

## Phase 0 — Stop the bleeding

*Small, isolated, high-impact. No architectural commitment.*

| # | Task | File |
|---|---|---|
| 0.1 | Fix the broken mobile nav grid | `layout/MobileNav.tsx:32` |
| 0.2 | `vh` → `dvh` across all modals | 30 files |
| 0.3 | Add safe-area insets + `viewport-fit=cover` | `globals.css`, `app/layout.tsx` |
| 0.4 | Remove `overflow-x: hidden` from `body`, fix what it was hiding | `globals.css` |
| 0.5 | Delete the fabricated GitHub commit fallback | `services/githubSync.ts:32-51` |
| 0.6 | Link `manifest.json`, generate real maskable icons | `app/layout.tsx`, `public/` |
| 0.7 | Delete dead Vite scaffolding | `src/App.tsx`, `src/main.tsx`, `src/index.css`, `tsconfig.*.tsbuildinfo` |
| 0.8 | Rewrite root `README.md` to describe the actual stack | `README.md` |
| 0.9 | Compress and convert `public/` images; `next/image` everywhere | 102 MB → target < 10 MB |

**Done when:** the bottom nav renders as a row on a phone; modals are fully
reachable on iOS; no fabricated data path remains; first paint ships < 200 kB of
imagery.

---

## Phase 1 — The data pipeline

*The foundation. Nothing else is durable without it.*

| # | Task |
|---|---|
| 1.1 | Scaffold `data-sources/`, `scripts/`; promote the good extractions out of `scratch/` |
| 1.2 | `scripts/extract-pdf.mjs` — deterministic, page-delimited PDF → text |
| 1.3 | `rules:fetch` — pin the catalogue SHA, write `MANIFEST.json` with checksums, fail loudly |
| 1.4 | `rules:parse` — BattleScribe XML → normalised entities (shared entries, category links, cost types, constraints) |
| 1.5 | New entity model in `src/types/rules.ts` — Glory cost, base size, movement type, constraints, `UnitOption` |
| 1.6 | `rules:layer` — layer op engine + provenance stamping |
| 1.7 | Transcribe `dispatch-01.layer.json` from the extracted Dispatch text |
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
| 2.6 | Surface violations in the builder: per-unit, per-roster, blocking vs advisory |
| 2.7 | Ruleset switcher + the reconciliation review screen ([`RULESET-MODEL.md`](RULESET-MODEL.md) §8) |
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

## Rough shape

| Phase | Relative size | Blocks |
|---|---|---|
| 0 | Small | nothing |
| 1 | **Large** | 2, 3 |
| 2 | Large | — |
| 3 | Medium–large | — |
| 4 | Medium | — |

Phase 1 is the bulk of the work and the only one that cannot be parallelised or
skipped. Phases 0 and 4 can be picked up any time.

## Decisions — status

| # | Decision | Status |
|---|---|---|
| 1 | Rulebook PDFs | **Partly resolved.** Changelog 1.0.2, Rules Commentaries 1.0.2 and All Out War are committed. **Still needed: Core Rulebook + Warbands of Trench Crusade** — the two that unblock statline verification. Delivery via GitHub release asset (verified reachable) or split uploads. |
| 2 | Saved warbands | Open — confirm reconciliation-review over automatic migration ([`RULESET-MODEL.md`](RULESET-MODEL.md) §8). |
| 3 | Licensing | **Closed.** Not a blocker; sources stay in `data-sources/`. |
| 4 | Fabricated data | **Closed.** Delete what is verifiably invented — but verify each file first rather than tossing wholesale. All Out War data turned out to be correct; see [`FEATURES.md`](FEATURES.md). |
| 5 | Faction rules | Open — `FACTIONS[].rules` is fabricated and will be deleted. Replace with real rulebook faction rules, or drop the concept? |

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
