# TrenchLine Documentation

TrenchLine is a Trench Crusade warband builder and campaign companion — a
purpose-built alternative to [NewRecruit](https://www.newrecruit.eu/app/MySystems)
for one game system, with campaign tooling (activation tracking, blood/blessing
markers, Ducats and Glory, lore) built around it.

This directory is the project's design record. It was written in August 2026
after an audit of the original AI-generated codebase; before that the project had
no design documentation at all.

## Read in this order

| Document | What it covers |
|---|---|
| [`AUDIT.md`](AUDIT.md) | What is wrong with the codebase today, with evidence. Start here — everything else is a response to it. |
| [`RULESET-MODEL.md`](RULESET-MODEL.md) | **The centrepiece.** How game data is sourced, layered, versioned and verified. Defines the "Latest GitHub" vs "TrenchLine" rulesets. |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Current and target application architecture. |
| [`MOBILE.md`](MOBILE.md) | Mobile/tablet standards and the specific defects to fix. |
| [`RESTRUCTURE-PLAN.md`](RESTRUCTURE-PLAN.md) | Phased delivery plan with acceptance criteria. |
| [`DATA-SOURCES.md`](DATA-SOURCES.md) | Where every piece of game data comes from, and how to refresh it. |
| [`FEATURES.md`](FEATURES.md) | Feature checklist — NewRecruit parity plus TrenchLine's own ideas, with honest status. |
| [`../design/canvas/README.md`](../design/canvas/README.md) | The interface design canvas — seven artboards drawn from the real Al-Qarn Rihla roster and the app's own tokens. |

## The one-paragraph version

The app's UI shell is largely sound and the feature ideas are good. Two things
are badly broken. **First, the game data is invented** — it was written from an
LLM's recollection of Trench Crusade rather than derived from any source, and 97%
of the unit statlines that can be checked against the official BattleScribe
catalogues are wrong. **Second, the mobile and tablet layouts are unusable**,
with one outright bug (a Tailwind class that never compiles) collapsing the
mobile navigation bar over the whole screen.

The fix is to stop hand-writing game data. Data becomes a **generated artefact**
built from real sources by a checked-in pipeline, with every value carrying
provenance and a verification pass that fails the build when a number has no
source. Layout is then rebuilt mobile-first on top of correct data.

## Non-negotiables

These exist because the original codebase violated all four.

1. **No hand-written game data.** Every stat, cost, keyword and constraint is
   generated from a source in `data-sources/`, or it does not ship.
   `src/data/*.generated.ts` is build output and is never edited by hand.
2. **No invented fallbacks.** If a fetch or lookup fails, it fails visibly.
   Never synthesise plausible-looking data to fill a gap.
   (See `AUDIT.md` § "Fabricated network fallback" for the one that shipped.)
3. **Mobile-first.** Base styles target a 375px phone. Desktop is the
   enhancement, added at `sm:` and up. See `MOBILE.md`.
4. **Documented decisions.** A change to the data model, the ruleset layering,
   or the source list updates the relevant document in the same commit.
