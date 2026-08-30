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
