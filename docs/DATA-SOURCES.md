# Data Sources

Every piece of game data in TrenchLine traces back to something in
`data-sources/`. This document says what is there, where it came from, and how
to refresh it.

See [`RULESET-MODEL.md`](RULESET-MODEL.md) for how these are combined.

## Layout

```
data-sources/
├── battlescribe/
│   ├── MANIFEST.json                  pinned commit SHA + per-file checksums
│   └── *.cat, *.gst                   fetched, never hand-edited
├── rulebook/
│   ├── *.pdf                          official PDFs (manually added)
│   └── extracted/*.txt                pdf → text, produced by scripts/extract-pdf.mjs
├── dispatch/
│   ├── trench-dispatch-01-april-2026.txt      extracted text  ✅ present
│   └── trench-dispatch-01.layer.json          transcribed patch ops
└── resolutions.json                   human decisions on source conflicts
```

## 1. BattleScribe catalogues — the base layer

**Source:** <https://github.com/Fawkstrot11/TrenchCrusade>
**Reachable from CI:** yes, via `raw.githubusercontent.com`.

Ten files, pinned by commit SHA:

| File | Size | Model entries | Unit profiles | Constraints |
|---|---|---|---|---|
| `New Antioch.cat` | 427K | 12 | 14 | 194 |
| `Trench Pilgrims.cat` | 276K | 11 | 11 | 127 |
| `Heretic Legion.cat` | 367K | 12 | 11 | 172 |
| `Iron Sultanate.cat` | 508K | 16 | 15 | 218 |
| `Black Grail.cat` | 315K | 11 | 10 | 151 |
| `Court of the Seven-Headed Serpent.cat` | 407K | 12 | 11 | 207 |
| `Mercenaries.cat` | 138K | 11 | 16 | 83 |
| `Equipment.cat` | 34K | — | — | 26 |
| `Melee Weapons.cat` | 13K | — | — | 4 |
| `Ranged Weapons.cat` | 35K | — | — | 5 |
| `Trench Crusade.gst` | 132K | game system: categories, cost types, profile types |
| **Total** | | **85** | **88** | **1,187** |

Compare against the 45 hand-written units and 0 constraints currently in
`src/data/defaultRules.ts`.

**What they give us:** statlines including movement type and base size, Ducats
**and Glory Points** as separate cost types, category links (keywords and
Elite/Troop role), 1,187 min/max constraints scoped to roster or parent, and
conditional modifiers.

**Refresh:** `npm run rules:fetch` — updates `MANIFEST.json`, then
`npm run rules:verify` reports what changed. Bumping the pinned SHA is a
deliberate, reviewed commit.

## 2. Official rulebooks — cross-check and prose

**Source:** <https://www.trenchcrusade.com/rules/> (all PDFs linked there)
**Reachable from CI:** **no.** The domain is blocked by the sandbox network
policy (`CONNECT` returns 403), so the PDFs must be downloaded and committed to
`data-sources/rulebook/` by hand.

**Used for:** verifying the catalogues (§6 of `RULESET-MODEL.md`), keyword
rules text, scenarios, injury/exploration/skill tables, and lore.

**A caveat on extraction:** the rulebooks are multi-column and `pdftotext`-style
extraction interleaves columns and can reverse line order. Existing evidence in
`scratch/core_rules_pages.txt` shows paragraphs reading bottom-to-top. This is
why verification is a fuzzy matcher rather than a parser, and why an
`unconfirmed` result never fails the build — it usually means extraction was
unreliable, not that the value is wrong.

## 3. Trench Dispatch — the patch layer

**Present:** `data-sources/dispatch/trench-dispatch-01-april-2026.txt`
(18 pages, ~39k characters, extracted cleanly).

**What it is:** *Trench Dispatch #1 — April 2026 Rules Updates*, a compilation
of the April Rules Review updates published on Trench Wire, covering
Infiltrators, Grenades, Amalgam & Strains, Iron Sultanate, Mercenaries, and The
Court hotfix.

**Status:** the document states it is *"an unofficial, fan-made digital rules
update… not affiliated with or endorsed by Factory Fortress Inc."* It compiles
official updates but is not itself an official publication, and most of its
content is marked **Public Beta**. It carries the newest rules and therefore
sits top of precedence, but the layer records `status: 'public-beta'` and the UI
surfaces that.

**Why it matters:** it supersedes both other sources. Checked against the
catalogues, the following Dispatch content is **absent** from GitHub: the
`FUMBLE` keyword, Bolgias Gut / Tapeworm Throng / Vile Corpus (Black Grail
Strains), Al-inbīq Kit, Corrosive Ammunition, the Mehterân ability, and the
Regimental Kaşık Glory Item. It also revises statlines the catalogues carry —
e.g. the Combat Engineer profile and the Yüzbaşı and Brazen Bull entries.

**Transcription:** the Dispatch is already written as errata operations, so
`trench-dispatch-01.layer.json` is a transcription of the text, not an
interpretation of it. Each op records the page it came from.

## Extracting PDFs

The environment can extract text from PDFs; it cannot download them from
trenchcrusade.com. `scripts/extract-pdf.mjs` wraps `pdf-parse` (already a
devDependency) and is what produced the Dispatch text:

```bash
node scripts/extract-pdf.mjs data-sources/rulebook/core-rules.pdf \
                            data-sources/rulebook/extracted/core-rules.txt
```

Output is deterministic, page-delimited (`-- N of M --`), and committed
alongside the PDF so verification does not depend on re-running extraction.

## What to do about `scratch/`

`scratch/` holds genuine extracted rulebook text and ~40 ad-hoc extraction
scripts from the original build — and is excluded by `.gitignore`. It is the
most valuable material in the project and it is unversioned.

Plan: promote the good extractions into `data-sources/rulebook/extracted/`,
replace the 40 one-off scripts with the handful in `scripts/`, and leave
`scratch/` ignored for genuinely throwaway work.

## Licensing

The repository is public and already contains substantial verbatim rules text
(`defaultRules.ts`, `officialRulesData.ts`, `warbandLore.ts`). Committing
extracted source text under `data-sources/` is consistent with that, but it is
worth a deliberate decision rather than drift. Options:

1. **Keep as-is** — a personal/community tool, as the README states.
2. **Private submodule** for `data-sources/`, public app repo.
3. **Ship derived values plus citations only** — the app stores numbers and page
   references, not rules prose. Highest friction, lowest exposure.

No action taken; flagged for the maintainer.
