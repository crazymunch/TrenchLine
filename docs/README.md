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
| [`MOBILE.md`](MOBILE.md) | Phone, tablet and desktop standards, and the specific defects to fix. |
| [`DESIGN.md`](DESIGN.md) | The Iron Ledger — the visual language, the two-surface token mechanism, and the type and colour rules. |
| [`RESTRUCTURE-PLAN.md`](RESTRUCTURE-PLAN.md) | Phased delivery plan with acceptance criteria. |
| [`DATA-SOURCES.md`](DATA-SOURCES.md) | Where every piece of game data comes from, and how to refresh it. |
| [`NEWRECRUIT-SPIKE.md`](NEWRECRUIT-SPIKE.md) | Whether a BattleScribe/NewRecruit `.ros` export is possible, measured against a real exported roster rather than assumed. |
| [`ROSTER-FILE.md`](ROSTER-FILE.md) | The roster file TrenchLine writes and reads: the envelope, the field inventory, the round-trip promise and the compatibility policy. |
| [`FEATURES.md`](FEATURES.md) | Feature checklist — NewRecruit parity plus TrenchLine's own ideas, with honest status. |
| [`HANDOVER-CARCASS-FRONT.md`](HANDOVER-CARCASS-FRONT.md) | Picking up the Carcass Front work: what has landed, what is left, and the five things about this book and this pipeline that cost a day to learn. |
| [`ENGINEERING-AUDIT-FOLLOWUP.md`](ENGINEERING-AUDIT-FOLLOWUP.md) | Current disposition of the 3 September engineering audit and sequenced work packages for what remains. |
| [`../design/canvas/README.md`](../design/canvas/README.md) | The interface design canvas — seven artboards drawn from the real Al-Qarn Rihla roster and the app's own tokens. |

## The one-paragraph version

*What the audit found, in the present tense it was written in — and where each
finding stands now. Read this as history plus a status column, not as a
description of the app today.*

The app's UI shell was largely sound and the feature ideas were good. Two things
were badly broken. **First, the game data was invented** — written from an LLM's
recollection of Trench Crusade rather than derived from any source, and 97% of
the unit statlines that could be checked against the official BattleScribe
catalogues were wrong. **Second, the mobile and tablet layouts were unusable**,
with one outright bug (a Tailwind class that never compiles) collapsing the
mobile navigation bar over the whole screen.

The fix was to stop hand-writing game data. Data is now a **generated artefact**
built from real sources by a checked-in pipeline, with every value carrying
provenance and a verification pass that fails the build when a number has no
source. Layout was then rebuilt mobile-first on top of correct data.

**Both are addressed.** The pipeline is in `scripts/` and `src/data/*.generated.ts`
is its output; `npm run rules:crosscheck` reports drift. `MobileNav` is fixed —
a flex row of `flex-1` buttons that takes any number of items without naming a
column count — and the file carries a comment saying why it is written that way.
The rules they came from are the four non-negotiables below, and those stand
whatever the status of any individual finding.

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

- [`DEPLOYMENT.md`](DEPLOYMENT.md) — what the environment must provide, and which layer enforces rate limiting.
- [`CAMPAIGN-SYNC.md`](CAMPAIGN-SYNC.md) — the design for campaign cloud sync, the model decision behind it, and the authority table the code follows.
- [`LIVE-MODE.md`](LIVE-MODE.md) — the last unbuilt feature, scoped in two stages: a read-only mirror that needs no new infrastructure, and what a full two-way version would actually cost.
- [`LEGAL.md`](LEGAL.md) — the `/about`, `/privacy` and `/terms` pages: why they exist, which claims are checkable and where, and what is left to lift the Safe Browsing flag.
