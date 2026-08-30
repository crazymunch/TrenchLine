# Roster prototype

`roster.html` — a self-contained, clickable prototype of the Warband Roster view.
Open it in a browser; no build step, no dependencies beyond Google Fonts.

## Why it exists

The Iron Ledger design pass (`design_handoff_trenchline_roster`) established the
visual language, but two things were unresolved:

1. **Most of the app's options had nowhere to go.** The current roster view
   carries ~26 interactive affordances; the static mocks showed 6. Warrior
   actions were *deferred* to the existing modals rather than deleted, but that
   was never drawn, so the interaction model could not be reviewed.
2. **Desktop lost the module navigation.** `src/components/layout/Sidebar.tsx`
   is the primary nav — Warband Roster, Tabletop Combat, Crusade Campaign,
   Roster Directory, Rules Codex, Rules Customizer — and the redesigned rail
   replaced it with warband context, leaving the six views homeless.

This prototype resolves both, in the design's own tokens, without changing them.

## What it demonstrates

| Affordance | Holds |
|---|---|
| Tap a warrior | Statline + provenance, wargear with per-item unequip, Equip, advancements, injuries, and eight warrior actions |
| `⋯` on a card | The same quick actions without leaving the list |
| `⋯` in the toolbar | Growth history, Notes, Export, Import, Compare, Edit budget, Theme, Bug report |
| `REVIEW` | All five variant rules with bounds and counts, plus the unverifiable restriction |
| Filter chips | The role filter the current app has |
| Cards / Table | The layout toggle from the design |

Desktop rail order: warband identity and points → **Modules** → Warbands →
Campaign Rules → Provenance. Tablet keeps the 76px icon rail, phone the bottom
nav. Every control is at least 44px.

## The middle ground

Three things review raised, and how this settles them.

**1. Options.** Restored in full behind progressive disclosure — see the table
above. The card also carries back the density the mock dropped: earned titles,
the battlefield quote, innate abilities, fireteam and XP, all at a glance with
the full text one tap away.

**2. Desktop.** Module navigation is back in the rail, above the warband
context.

**3. Theming — the substantive one.** The mock fixed a single palette (cream
paper, oxblood accent) and with it discarded the app's six faction themes and
the switcher that drives them. That is a regression, not a simplification. So
two things become variables while the Iron Ledger structure stays exactly as
designed:

| | |
|---|---|
| `surface` | `paper` (the mock) or `iron` (the app's dark ground) |
| `faction` | the six themes, driving the accent on Glory, Leader and active states |

Accent values are the app's own, read from `src/types/theme.ts` — `primaryColor`
on iron, `accentColor` on paper.

**Open decision.** Two factions have no colour in their theme dark enough to
carry text on cream: **Iron Sultanate** (teal `#76D6D5` / gold `#E9C349`) and
**Principality of Hell** (`#FF5540` / `#DDB7FF`). Both currently fall back to the
mock's oxblood on the paper ground. Choosing a dark accent for them is a
maintainer's call — inventing one here would be exactly the kind of unsourced
decision this project avoids.

## Data

Every value is joined from `data-sources/fixtures/al-qarn-rihla/` against the
generated dataset. **All 11 statlines resolve** — including the four that only
exist once catalogue modifiers are evaluated (`Favoured Brazen Bull`,
`Favoured Kavass`, `Favoured Homunculus`, `Kavass`).

The handoff mocks show six warriors with an amber *"statline not in export"*
strip; that was an artifact of having only the NewRecruit JSON. **Keep that
affordance in the product** for genuine join failures — it is the right
behaviour, per rule 2 — it is simply not needed for this roster.

## Status

A design artefact, not production code. It is a reference for the shape of the
interaction; the implementation is Phase 2.6–2.8 against
`src/components/builder/`.
