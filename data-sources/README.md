# data-sources

Committed inputs to the game-data pipeline. **Nothing in here is hand-edited
game data** — these are sources, and `src/data/*.generated.ts` is derived from
them.

See [`docs/DATA-SOURCES.md`](../docs/DATA-SOURCES.md) for provenance and
[`docs/RULESET-MODEL.md`](../docs/RULESET-MODEL.md) for how they combine.

```
battlescribe/    BattleScribe catalogues — the base layer. Fetched, pinned by
                 commit SHA in MANIFEST.json. Refresh: npm run rules:fetch
rulebook/        Official PDFs from trenchcrusade.com + extracted text.
                 NOT YET POPULATED — the sandbox cannot reach that domain, so
                 the PDFs must be downloaded and committed by hand.
dispatch/        Trench Dispatch — the newest rules, applied as a patch layer.
                 #1 (April 2026) extracted and present.
```

## Refreshing the catalogues

```bash
npm run rules:fetch                    # latest main, pinned to its SHA
npm run rules:fetch -- --ref <sha>     # a specific commit
npm run rules:crosscheck               # report drift against current app data
```

`rules:fetch` fails loudly if any file cannot be retrieved and refuses to write
a manifest for a partial fetch. It never substitutes placeholder data.

## Adding a rulebook PDF

```bash
cp ~/Downloads/core-rules.pdf data-sources/rulebook/
npm run rules:extract -- data-sources/rulebook/core-rules.pdf \
                         data-sources/rulebook/extracted/core-rules.txt
```

Commit the PDF and the extracted text together, so verification does not depend
on re-running extraction.

Extraction of the official rulebooks is imperfect — they are multi-column and
line order within a page is unreliable. That is expected and handled; see
[`docs/DATA-SOURCES.md`](../docs/DATA-SOURCES.md) § "Official rulebooks".
