# Design canvas — TrenchLine interface

Source artboards for the published Claude Design canvas:

**https://claude.ai/code/artifact/dee31052-8bbd-4abe-a616-0a07490d6bba**

Each `*.dc.html` is one artboard; `canvas.json` places them on the canvas and
carries the sticky notes. The published `.html` is a 2.5 MB payload (the design
editor is bundled into it), so it is **not** committed — it is regenerated from
these files.

## Boards

| File | Size | What it argues |
|---|---|---|
| `Main.dc.html` | 375×812 | Roster, phone, above the fold. Two currency meters. |
| `AddUnit.dc.html` | 375×900 | Recruit list with Warband Variant rules enforced and *named*. |
| `Illegal.dc.html` | 375×812 | The six violation shapes `src/rules/validate.ts` produces. |
| `PlayHUD.dc.html` | 375×812 | Table HUD — activation queue, 44px wound/blood steppers. |
| `UnitCard.dc.html` | 375×980 | Expanded warrior card with the provenance affordance. |
| `Rulesets.dc.html` | 375×940 | TrenchLine vs GitHub Latest, with the real reconciliation diff. |
| `Desktop.dc.html` | 1280×800 | Roster grid plus a legality + provenance rail. |

## Rules these boards were drawn under

Both of the project's data rules apply to mockups too — a design that shows a
wrong statline teaches the wrong statline.

- **No invented game data.** Every value is joined from
  `data-sources/fixtures/al-qarn-rihla/04-august-1320d-CURRENT.json` against
  `src/data/generated/`. The 1320 👑 / 6 ☼ totals were recomputed from the
  export and tie out exactly; the Brazen Bull diff on `Rulesets.dc.html` is the
  real `dispatch-01` layer applied over `github-latest`.
- **No invented design tokens.** Colours, fonts, radii, paddings and control
  sizes are lifted from `src/app/globals.css` (Iron Sanctum), `tailwind.config.ts`,
  `UnitCard.tsx`, `MobileNav.tsx` and `PlayModeView.tsx`.
- **Mobile-first.** Phone boards are 375×812, the target in `docs/MOBILE.md`.
  Every control is ≥44px, form text ≥16px, nothing below 12px.

## Regenerating and republishing

```bash
SK=<claude design skill base directory>
node "$SK/seed-canvas.mjs" \
  --template "$SK/payload.template.html" \
  --out trenchline-interface.html \
  --title "TrenchLine Interface" \
  --artboard design/canvas/Main.dc.html \
  --artboard design/canvas/UnitCard.dc.html \
  --artboard design/canvas/AddUnit.dc.html \
  --artboard design/canvas/Illegal.dc.html \
  --artboard design/canvas/PlayHUD.dc.html \
  --artboard design/canvas/Rulesets.dc.html \
  --artboard design/canvas/Desktop.dc.html \
  --canvas design/canvas/canvas.json
node "$SK/seed-canvas.mjs" --check trenchline-interface.html
```

Then publish the seeded file to the URL above. Editing the canvas in the browser
and hitting **Save** republishes it there too — that leaves these files behind,
so pull the changes back out (`seed-canvas.mjs --extract`) before editing here.

The leading `<script src="./support.js"></script>` line in each artboard is
required by the editor. Do not remove it.
