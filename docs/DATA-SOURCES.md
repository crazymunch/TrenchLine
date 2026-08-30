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
policy (`CONNECT` returns 403), so the PDFs must be supplied by the maintainer.

All five committed:

| PDF | Pages | What it gives us |
|---|---|---|
| `warbands-of-trench-crusade.pdf` | 186 | **The statline authority.** 48 warband entries, each with recruitment limits, Ducat cost, full statline, keywords and abilities. Machine-parseable — see below. |
| `trench-crusade-digital-rulebook.pdf` | 197 | Core + Comprehensive rules, keyword glossary, D66 trauma/exploration/skills tables, scenarios. |
| `changelog-1.0.2.pdf` | 15 | **Official errata table** (`Page \| Location \| Errata`) — transcribes directly to a layer. Defines 12 keywords and rewrites core rules (Retreat, Line of Sight, Terrain Types, Model Placement). |
| `rules-commentaries-1.0.2.pdf` | 8 | Official FAQ. Not layer material — feeds the Codex and resolves rules-engine edge cases. |
| `all-out-war.pdf` | 23 | Multiplayer scenario pack. **Confirms the app's existing All Out War data is correct** (see [`FEATURES.md`](FEATURES.md)). |

### The Warbands book is parseable, not just searchable

This was the open risk in the original plan, and it resolved well. The official
PDF extracts to a tab-delimited structure with correct line ordering:

```
0-2 Sniper Priests - Cost: 50
Movement 	Ranged 	Melee 	Armour 	Base
6"/Infantry 	+2 DICE 	-1 DICE 	0 	25mm
Keywords 	NEW ANTIOCH, ELITE
```

`scripts/parse-warbands-pdf.mjs` reads **48 entries, 47 statlines and 48 keyword
sets** from it. Two consequences:

1. **Verification is structural, not fuzzy.** `rules:verify` can compare field
   to field rather than grepping for a value near a name. (The earlier caveat
   about column interleaving applies to the older `scratch/` extractions, not to
   these — `pdf-parse` handles this document cleanly.)
2. **The recruitment limits are in the entry headers.** `0-2 Sniper Priests`,
   `1 Lieutenant`, `0-5 Shock Troopers` — the constraint data the app entirely
   lacks, available from the book as well as the catalogues.
3. **The Armoury Tables are equally structured**, and carry the wargear legality
   rules directly:

   ```
   Automatic Pistol 	ELITE only, Limit: 3 	20 👑
   Automatic Rifle 	Bayonet Lug, Limit: 1 	40 👑
   Pistol 	6 👑
   ```

   Name, restrictions, cost — the exact inputs the roster validator needs.
4. **Faction Special Rules sections parse too** (New Antioch Fireteams /
   Concentrated Attack), and some of them constrain roster construction rather
   than being flavour.

It also proves the **Carcass Front path**: a new faction's PDF can be parsed the
same way on the day it drops, months before the catalogues catch up.

### Getting large PDFs in

**Use a GitHub release asset.** Attach the PDF to a release on this repo — up to
2 GB per asset, and it does **not** bloat git history the way committing a large
binary would. This is the route for future drops such as Carcass Front.

⚠️ **This repository is private**, so the public
`https://github.com/<owner>/<repo>/releases/download/<tag>/<file>` URL returns
**404**. Fetch through the authenticated API endpoint instead:

```bash
# asset id comes from the release JSON
curl -sSL -H "Accept: application/octet-stream" -o out.pdf \
  "https://api.github.com/repos/<owner>/<repo>/releases/assets/<asset_id>"
```

The release JSON also publishes a `digest` (`sha256:…`) per asset — always check
the download against it before extracting.

Once fetched, run `npm run rules:extract` and commit the extracted text. Whether
the PDF itself is committed is a size judgement; the extracted text always is.

**Used for:** verifying the catalogues (§6 of `RULESET-MODEL.md`), keyword
rules text, scenarios, injury/exploration/skill tables, and lore.

**A caveat on extraction:** the *older* `scratch/` extractions interleave columns
and reverse line order (see `scratch/core_rules_pages.txt`, which reads
bottom-to-top). The current `scripts/extract-pdf.mjs` output does not have this
problem on these documents — the Warbands book parses cleanly. Verification
still treats an `unconfirmed` result as non-fatal, because prose sections of the
Digital Rulebook are less regular than the warband entry tables.

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

**Decided (Aug 2026): not a blocker.** The repository already contains
substantial verbatim rules text, and this is a personal/community tool as the
README states. Sources stay in `data-sources/`. Revisit only if the project is
ever distributed more widely.
