# Al-Qarn Rihla — preserved warband

The one warband carried across the data rebuild. Everything else in the app's
saved state is discarded when the data is regenerated
([`RULESET-MODEL.md`](../../../docs/RULESET-MODEL.md) §8).

**Iron Sultanate**, Warband Variant **The House of Wisdom**.
*"The Wall may forget, but the Copper remembers!"*

## Roster history

Four NewRecruit exports, oldest to newest. The newest is the current warband;
the earlier three are the campaign history.

| File | Ducats | Glory | Entries |
|---|---|---|---|
| `01-campaign-799d.json` | 799 / 880 | 4 / 4 | 31 |
| `02-3-force-match-983d.json` | 983 / 1050 | 4 / 6 | 44 |
| `03-july-gator-1000d.json` | 1000 / 1220 | 4 / 8 | 45 |
| **`04-august-1320d-CURRENT.json`** | **1320 / 1320** | **6 / 9** | **58** |

## Why these are the regression fixture

This roster exercises every part of the data model the current app cannot
express — which makes it a far better test than anything synthetic:

- **Warband Variant** — `The House of Wisdom` (app has no `variantId` at all)
- **Glory-costed wargear** — `Sniper Scope — 2 Glory` (app has no Glory cost)
- **Per-model options** — the Takwin Homunculus carries eight stacked upgrades
  (`Massive Size`, `Additional Arm`, `Two Heads`, `Hawk Eyes`, `Hypnotic Eyes`,
  `Gargantuan Size`…), which is exactly the `UnitOption` shape
- **Advancements and injuries** — `Ranged Proficiency [7]`, `Strength of
  Samson [8]`, `Leg Wound [31]`, `Lost Arm [26]`
- **Elite Promotions**, **Fireteams** (`Fireteam: Mamluk-Guarded`)
- **Armoury stash** (`Pile of Stuff`) and campaign rules
  (`Book of Golems`, `Sublime Gate`, `Unleveraged Glory`, `Reroll`)

Acceptance test for Phase 1/2: this roster imports, validates as legal, and
totals 1320 Ducats / 6 Glory against regenerated data.

## Where the lore lives

⚠️ These NewRecruit files carry the **roster** — custom names, wargear,
advancements — but **not** the prose.

The written lore is in **`src/data/warbandLore.ts`** and is already committed, so
it is not at risk. It holds the warband identity (name, patron, motto, a full
markdown history, chronicle log), 11 character entries with biographies, titles,
quotes and deeds, plus match history and snapshots.

**That file must be treated as user content, not game data.** It currently sits
in `src/data/` alongside files the pipeline will regenerate, and it mixes
narrative with `profileSnapshot` blocks carrying their own (wrong) statlines —
see [`AUDIT.md`](../../../docs/AUDIT.md) §1.10. Phase 1 splits it:

- narrative → `data-sources/fixtures/al-qarn-rihla/lore.json`, preserved verbatim
- `profileSnapshot` blocks → discarded, rebuilt from source

`scripts/extract-warband-lore.mjs` performs that split and can re-attach the
narrative to a rebuilt roster, matching units on identity and **reporting**
anything it cannot match rather than dropping it.
