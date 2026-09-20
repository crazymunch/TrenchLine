# Al-Qarn Rihla — preserved warband

The one warband carried across the data rebuild. Everything else in the app's
saved state is discarded when the data is regenerated
([`RULESET-MODEL.md`](../../../docs/RULESET-MODEL.md) §8).

**Iron Sultanate**, Warband Variant **The House of Wisdom**.
*"The Wall may forget, but the Copper remembers!"*

## Roster history

Five NewRecruit exports, oldest to newest. `04` keeps its `CURRENT` suffix
because it is the snapshot the app was loaded from and the tests name it;
`05` is the newest, the same Warband after the game played the week of 14
September 2026, and the diff between the two is described in
[`../newrecruit/README.md`](../newrecruit/README.md).

| File | Ducats | Glory | Entries |
|---|---|---|---|
| `01-campaign-799d.json` | 799 / 880 | 4 / 4 | 31 |
| `02-3-force-match-983d.json` | 983 / 1050 | 4 / 6 | 44 |
| `03-july-gator-1000d.json` | 1000 / 1220 | 4 / 8 | 45 |
| **`04-august-1320d-CURRENT.json`** | **1320 / 1320** | **6 / 9** | **58** |
| `05-september-1330d.json` | 1330 / 1440 | 13 / 13 | 103 |

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

## Lore coverage, checked

Cross-checked `KNOWN_UNIT_LORES` against the current (August) roster:

- **10 of 11 characters have a full lore entry** — biography, titles, quote, deeds.
- **1 has none: `Al-Mudawwan, the Inscribed` (Homunculus).** The one gap in an
  otherwise complete set.

  The raw material for it **does** exist in `lore-transcript.md`; it simply never
  became a `KNOWN_UNIT_LORES` entry:

  > *Al-Mudawwan (The Inscribed): refers to the secret runes from the Book of
  > Golems etched directly into its clay skin alongside copper wiring.*
  > *Clay Golem (Homunculus). A hulking vessel moulded from desert clay and
  > inscribed with the ancient runes of the Book of Golems, bound together with
  > copper filigree.*

  Promoting that into a biography is the maintainer's call, not something to
  generate — this is authored content, and inventing it is the exact failure the
  project exists to prevent.

### Lore attaches by fuzzy string match — fix this in migration

`KnownUnitLore` binds to models with `matchPatterns`:

```ts
matchPatterns: ['kasim', 'living engineer', 'malik']
```

`enrichUnitWithLore` substring-matches these against a model's custom name. So
renaming a warrior silently detaches their biography, and a short pattern can
attach the wrong one. For content that cannot be regenerated, that is too
fragile.

The migration binds lore to stable unit IDs instead, keeping `matchPatterns`
only as the one-time mechanism for the initial attach.

`scripts/extract-warband-lore.mjs` performs that split and can re-attach the
narrative to a rebuilt roster, matching units on identity and **reporting**
anything it cannot match rather than dropping it.

## The lore transcript

`lore-transcript.docx` / `.md` — ~21,000 words, the source the app's
`warbandLore.ts` was written from.

⚠️ **This is a conversation transcript, not settled canon.** It interleaves:

- **Canon** — the house, its characters, and genuine battle reports written by
  the maintainer (the 13–4 victory over Zortan's Wrath, Kasim's leg wound from
  Hell Knight Ugar, Al-Qahhar losing an arm standing over him, Idris stealing
  the Golden Mantle).
- **Rejected alternatives** — six candidate names for the Brazen Bull, competing
  "Thematic Options" and "Alchemical Options", a superseded 700-Ducat roster.
- **Assistant commentary** — advice, questions, and rules interpretations.

Anything promoted to canon must be picked deliberately from this file. Do not
bulk-import it.

## Rules claims in the transcript, checked

The transcript states the House of Wisdom restrictions. Checked against the
Warbands book (p.93):

| Transcript claim | Verdict |
|---|---|
| "cannot include a Yüzbaşı, Janissaries, or Sultanate Assassins" | **Correct** — matches *Private Venture* exactly |
| "You can take your Alchemist, Brazen Bull, Lions of Jabir, and Azebs" | **Incomplete.** *Alchemists* is a **requirement** (must include 1–2 Jabirean Alchemists), not a permission; *Pride of Jabir* caps Lions at 0–3. |
| "Azebs … can be upgraded to elite Kavass bodyguards" | **Imprecise.** *Kavasses* changes the Melee Characteristic of up to 3 Azebs, and **they lose the Light Skirmisher ability** — a cost the transcript omits. |
| — | **Missed entirely:** *Noble Guardians* — a House of Wisdom can include 0–2 **Fāris**, who use the Janissary Warband Entry but gain ELITE at no cost. Note this is a different entry from the **Mamluk Faris** mercenary in the roster. |
| "If you want to use all your models in one list, run them as a Standard Iron Sultanate warband" | **Unnecessary** — the roster is legal as House of Wisdom; see below. |

### The current roster is legal

Validated against the House of Wisdom special rules:

```
PASS  Alchemists: must include 1-2 Jabirean Alchemists   (found 2)
PASS  Pride of Jabir: 0-3 Lions of Jabir                 (found 1)
PASS  Private Venture: no Yüzbaşı                        (found 0)
PASS  Private Venture: no Janissaries                    (found 0)
PASS  Private Venture: no Sultanate Assassins            (found 0)
```

Jawhar al-Sari is a **Mamluk Faris mercenary**, which the Trench Dispatch
confirms is recruitable by SULTANATE warbands — legal, and distinct from the
House of Wisdom Fāris.

This is precisely the check the app should run automatically, and today cannot:
it has no variant support, no unit limits and no required-entry rules. It is the
acceptance test for Phase 2.
