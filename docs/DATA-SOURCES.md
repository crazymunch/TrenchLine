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
├── carcass-front/
│   ├── SOURCES.json                   release asset ids + sha256, per file
│   ├── *.pdf                          fetched from the release, gitignored if large
│   └── extracted/*.txt                pdf → text
└── resolutions.json                   human decisions on source conflicts
```

`carcass-front/` has **no `.layer.json`**, and that is the point: its layer is
generated from the book on every build. See §4.

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

### What `rules:crosscheck` reports, and what each line means

`npm run rules:crosscheck` compares every unit in the generated dataset against
these catalogues on Movement / Ranged / Melee / Armour. Its buckets are not
interchangeable, and the distinction is the whole value of the report:

| line | means |
|---|---|
| `MISMATCHED` | The catalogue and the app disagree, and no layer says why. A defect. |
| `explained by a layer` | They disagree because an erratum or the Carcass Front layer changed it on purpose. Listed apart so an intentional change is never re-investigated as drift. |
| `unmatched` | The app says a unit came from a named `.cat` and that file has no such entry. Also a defect: a wrong name, or an entry that has gone. |
| `outside the catalogue` | The unit came from a book BattleScribe does not carry. A fact about coverage, named per source and per unit. |
| `no source recorded` | Nothing says where the unit came from. The state the pipeline exists to end. |

**Exit code:** 0 for a statline disagreement — deciding one needs the book, and
that gate is `rules:verify`'s, per the restructure plan. Non-zero for
`unmatched` or `no source recorded`, which are not questions about the game but
about the app's own bookkeeping, are answerable without opening a rulebook, and
are both currently zero. Not wired into CI here: which checks gate the build is
a policy decision the plan assigns to `rules:verify`.

**`unmatched` and `outside the catalogue` used to be one bucket**, and that hid
things in both directions. Fifteen Carcass Front models sat under "no catalogue
entry of this name" as if the app had invented them, while a genuine naming
error would have been the sixteenth line in that list. Splitting them on the
unit's own `sourceFile` — the pipeline already records it — took `unmatched` to
0 and made the nine genuinely uncovered models visible **by name**, which is
what lets a reader spot one the catalogue does in fact carry.

Two matching rules, both narrower than they look:

- **Five Carcass Front models are aliased to their catalogue entries.** The
  book reprints models the catalogues already have under its own warband's
  names — a Procession of the Sacred Affliction `Lazarist Castigator` is the
  Trench Pilgrims `Castigator`. The pairing is asserted only where the two
  statlines were confirmed identical at the four compared fields; if the book
  ever restates one differently, the check reports a mismatch, which is the
  signal wanted. No parent-faction relationship is assumed — the Carcass Front
  parser records none, and inferring one from overlapping models would be a
  claim the source does not make.
- **A name-only fallback may now match several agreeing candidates.** It used
  to demand a globally unique name, because "Guard Dog" exists in both
  `Mercenaries.cat` and `New Antioch.cat` with different statlines and picking
  blind reported four mismatches that were the check's own bookkeeping. But
  uniqueness is stricter than its reason: candidates that agree on every
  compared field offer nothing to choose wrongly. `Wretched` is the case —
  identical profiles in `Heretic Legion.cat` and `Court of the Seven-Headed
  Serpent.cat`, and the app's copy went unchecked against both for want of a
  tie-break that was never needed.

## 2. Official rulebooks — cross-check and prose

**Source:** <https://www.trenchcrusade.com/rules/> (all PDFs linked there)
**Reachable from CI:** **no.** The domain is blocked by the sandbox network
policy (`CONNECT` returns 403), so the PDFs must be supplied by the maintainer.

All five committed:

| PDF | Pages | What it gives us |
|---|---|---|
| `warbands-of-trench-crusade.pdf` | 186 | **The statline authority.** 48 warband entries, each with recruitment limits, Ducat cost, full statline, keywords and abilities. Machine-parseable — see below. |
| `trench-crusade-digital-rulebook.pdf` | 197 | Core + Comprehensive rules, keyword glossary, D66 trauma/exploration/skills tables, scenarios. |
| `changelog-1.0.2.pdf` | 15 | **Official errata table** (`Page \| Location \| Errata`) — a record of what changed from 1.0.1, **not** a delta to apply. The digital rulebook above is already 1.0.2 and carries every rewrite it lists, so nothing transcribes it to a layer. Kept as evidence: it is where the Keyword completeness check reads the expected list from. |
| `rules-commentaries-1.0.2.pdf` | 8 | **Official FAQ**, 51 entries. Not layer material: it answers questions about the rules rather than changing them. Parsed by `scripts/lib/parse-commentaries.mjs` into `dataset.commentaries` and shown in the Codex under **Rules FAQ**. |
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

It also proved the **Carcass Front path**: a new faction's PDF can be parsed the
same way on the day it drops, months before the catalogues catch up. §4 is that
path, used in anger.

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

### Reading the Rules Commentaries

Attribution is the document's own. Every question opens with a label —
`RULES Q1`, `KEYWORDS Q4`, `MISC. Q7` — and that label IS the section, so the
parser detects no headings at all.

That matters because heading detection is where this class of parser goes
wrong. In this document headings **stack**: `Faction Lists Questions` sits above
`Trench Pilgrims`, which sits above the section's first question. And the
running head `Rules Commentaries 1.0.2` looks like a heading on every page. A
label the document repeats on every single entry cannot drift from the entry it
labels.

Two failures the parser is built against, both of which happened while writing
it:

- **`MISC.` has a full stop in its label.** A character class without one
  matches 44 of the 51 questions and reports no error — the silent
  under-read that is worse than a crash.
- **A section heading sits between one section's last answer and the next
  section's first question.** An answer that keeps reading swallows it, and
  ships "It has no effect on a Blast that targets a point on the ground. The
  Cult of the Black Grail" as the official answer. That is the sidebar bleed
  the D66 tables had, in a different document — so the same shape check backs
  it up: a short capitalised fragment dangling after the answer's last full
  stop throws, without consulting any list of heading names.

The parser also refuses a near-empty read, throws on a question with no answer,
and throws when two answers run together. Extraction spacing is tidied — the
PDF's justified text leaves `itself ?` and a stray full stop — which changes no
word.

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

## 4. Carcass Front — a generated layer

**Present:** `data-sources/carcass-front/`, fetched from a GitHub release by
`npm run rules:pdfs`, every asset pinned by `sha256` in `SOURCES.json`. The two
largest (the 104-page book, the vision cards) are marked `committed: false` and
gitignored; the manifest still records their digests, so a re-fetch is verified
against the same bytes.

**What it is:** the Carcass Front digital rules — two new Warband lists, five
scenarios, terrain rules, a random scenario generator, new Patrons and
exploration tables, and a campaign with its own Vision Cards.

Seven parsers read it today: `parse-carcass-front.mjs` for the faction lists,
`parse-cf-scenarios.mjs` for the five scenarios and the terrain pieces,
`parse-cf-generator.mjs` for the Random Scenario Generator,
`parse-cf-exploration.mjs` for the four Exploration Tables,
`parse-patrons.mjs` for the three new Patrons, `parse-cf-campaign.mjs` for the
two campaigns, and `parse-vision-cards.mjs` for the sixteen Vision cards —
which reads a separate PDF, not the book. All but the first and the last share
`cf-prose.mjs`, which turns a chapter's pages into ordered lines and a run of
lines into Markdown — page furniture, wrapped lines and tab-separated tables
are the same three problems whatever the chapter is about.

`parse-patrons.mjs` is the one that reads **two books**, because Carcass
Front's three Patrons are explicit that they are not a Carcass Front feature —
*"The following new Patrons can be taken by eligible Warbands in any Campaign
(not just a Carcass Front Campaign)"* — so they belong beside the rulebook's
eight rather than behind the supplement's layer.

**Status:** official, published by Factory Fortress.

**Why it is not transcribed.** The Dispatch is a list of errata sentences, so
`trench-dispatch-01.layer.json` is a transcription and each op quotes its page.
A faction list is content, not changes: 15 entries, 88 armoury rows, 15 unique
Battlekit items. Typing those is Rule 1's forbidden act at the scale that
produced the app's 97%-wrong statlines. So `scripts/lib/parse-carcass-front.mjs`
reads the book and `scripts/lib/carcass-front-layer.mjs` turns what it read into
`add` ops, on every build. Nothing in between is authored.

The rule of thumb, and what the pipeline had to learn to support it, are in
[`RULESET-MODEL.md`](RULESET-MODEL.md) § "Adding a brand-new faction".

**What reading it by shape costs.** The extraction places page furniture —
section banners, chapter openers, and some entry headers — at the **foot of the
page it heads**, not the top. That one fact caused four separate parser bugs
(the Lazarist Prophet dropped, variants swallowing the next chapter, the whole
Mercenary section empty, roles assigned from the wrong banner). Every one of
them produced a *plausible* warband rather than an obviously broken one, which
is why `scripts/lib/__tests__/carcass-front.test.mjs` asserts a printed value
for each and says in a comment which failure it guards.

The Scenarios & Terrain chapter (`parse-cf-scenarios.mjs`) hits the same class
of problem three more times, and the tests are written the same way:

- **The map image in the PDF is not the map.** What the PDF *stores* for each
  scenario is the deployment map's **background art**: the terrain drawing,
  with no deployment zones, no objective markers, no midpoint and no
  dimensions. The map is that art with all of those drawn over it in vector, so
  pulling the embedded image gets the layer underneath the map. Twelve
  deployment maps with no deployment zones on them — and nothing reported it,
  because the build's check only asks whether a file is *there*.
  `scripts/crop-scenario-maps.py` crops the composed map out of the rendered
  page instead, finding the box rather than measuring it: the rulebook draws a
  red rule around every deployment map, and the vertical sides of that rule
  give the crop its extent. A page whose rule is not found, or not closed, is
  reported and skipped rather than cropped to a guess — a map cropped to the
  wrong rectangle is worse than the art alone, because it looks authoritative.
  `arsenal.test.ts` asserts the app is pointed at the crop and not at a `.png`.
  The Carcass Front's five maps come out of the same script but not the same
  way: that book draws no rule, and its map is a single large grey-filled
  rectangle in the page's **vector drawings**, so the rectangle *is* the crop
  box — read out of the PDF rather than detected in pixels. All five were
  `mapImage: null` until then, which was the honest answer while the maps could
  not be got out of the book.
- **The deployment maps extract into the prose.** Labels and dimensions —
  `DEPLOYMENT ZONE`, `24’’`, `SWORD OF GOD` — arrive as bare lines mid-sentence.
  In scenario V they land between "within 1” of the Altar of Leviathan and" and
  "not within 1” of any enemy models", cutting the sentence that says who may
  attempt a Summon Roll. Found by shape — a run of label-or-dimension lines
  containing at least one measurement — rather than by a list of labels per
  scenario.
- **Each scenario closes on a quotation** printed straight under the last
  Glorious Deed, in a face the extraction drops. It truncated the last deed of
  all five before the split existed. Three facts locate the boundary and all
  three must hold: every deed opens `Name: `, the quotation begins a sentence
  on a capital, and it contains no rules vocabulary.
- **Tables are tab-separated rows.** A Search Table, a 2D6 naval-mine
  detonation table, a Lunatic Monk's statline. Flattened into prose the mine's
  table reads `2-6 The naval mine does not explode now, but you must roll again
  7-11 The naval mine is jostled…` — a roll table nobody can use at the moment
  they are rolling on it — so they stay tables through to the Codex.
- **A merged cell is flattened.** The generator's Deployment & Game Length
  chart merges its last column vertically: rows 1-4 share one Game Length and
  rows 5-6 share another, so the extraction gives a third cell only on rows 1
  and 5. A printed value applies from the row it appears on until the next one
  does; nothing is invented, a value is repeated.
- **A cell is only continued if it was long enough to have wrapped.** Without
  that, the Victory Conditions chart's last row — `Take and Hold`, ending on
  no full stop — swallowed the six pages of rules printed under the chart as
  part of its own name.
- **Maps are dropped per page, never across a page break.** Dropping them
  chapter-wide swallowed the `VICTORY CONDITIONS CHART` heading: the page
  before it ends on a deployment map, and a short all-caps heading at the top
  of the next page looked like one more label on it. The generator lost a
  quarter of itself, silently.

### Patrons: an invariant instead of a boundary

Every Patron in both books has **exactly six Skills**, and that fact is the
whole of `parse-patrons.mjs`'s error checking. It is worth writing down because
it is a better check than any boundary rule would have been.

The rulebook's Patrons are the last thing in their chapter, and the six
bulleted Campaign Phase steps printed on the page after it — `** Trauma Step:`,
`** Exploration Step:`, `** Quartermaster Step:` — are set exactly like a
Patron Skill. Read to the end of the file, the Antipope of Avignon came out
with twelve Skills. Nothing else about the output looked wrong: eleven Patrons,
each with a name, a restriction, lore and a Skill list.

Two more things the chapter teaches:

- **The sentence separating lore from Skills wraps, in both books** — after
  `allows you to take` for the Antipope, after `allows you to take the` for the
  House of Wisdom — and the wording varies (five entries say *the following
  Skills*, four say *following Skills*). Anchoring on the half that ends in
  `Skills:` left the other half on the end of two lore paragraphs.
- **A block in a Skill's shape is not always a Skill.** `Zīj Seal` is printed
  among the House of Wisdom's Skills and is the Alchemical Formula that the
  `Whispering Zīj` Skill above it lets a Takwin Homunculus buy for 20 👑. The
  evidence is outside the prose, which is what makes it usable: the four
  Formulae the entry's other Skills name — Hypnotic Eyes, Terrifying
  Appearance, Regenerative Tissue, Startling Speed — are all in the BattleScribe
  catalogues, and `Zīj Seal` is in none of them, so it is new here and this book
  has to print its rules. It is carried as `introduces` rather than dropped: a
  Formula a player can buy for 20 👑 is game data.

### The Exploration Tables: contiguity is the check

A Carcass Front campaign uses its four Resource tables — Favour 👁, Relic 🏺,
Supplies 📦, Territories 🌍 — *instead of* the rulebook's three, and the rows are
ranges rather than sparse single numbers: *"A Location is discovered if the
Exploration Roll corresponds to any number in the range."*

So every table must run from 1 upwards with no gap, no overlap, and an
open-ended last row (`34+`, because the dice pool grows all campaign and a roll
can exceed any printed number). `parse-cf-exploration.mjs` asserts exactly
that, and a row count would not have done: Favour has twelve rows and the other
three have thirteen, because Favour prints `6-9` where the others print `6-8`
and `9-11`.

It caught a real bug on the first run. `cf-prose.mjs`'s shared `CHART_ROW` was
written for the Random Scenario Generator's charts and matches a single number
or a closed band only, so all four `34+` rows failed it and were read as wrapped
continuations of the row above them. Each table stopped at 33, and `Patron's
Visit` carried `Chosen Blessing`'s rules on the end of its own.

`ExplorationLocation.roll` widened from `number` to `{ from, to }` for this, so
one lookup serves both books. The conversion happens in `parseExploration` and
**not** in the shared `parseRollTable`, which the four Skills tables also use: a
Skills row is a single 2D6 result, and widening the shared helper reported all
four Skills tables as having lost all eleven rows.

### The campaigns: prose, with the actionable parts lifted out

Most of both campaign chapters is rules a player *reads* rather than numbers an
app can hold — how the Aggressor is chosen, what each Campaign Tracker box
does, how a Strafing Run is shot down. That is carried as sourced Markdown,
section by section, and rendered by `RulesProse`, which is the same treatment
the rulebook's Core Rules chapters get and for the same reason: a player opens
the Codex exactly when they cannot open the book.

Four things are lifted into structure on top, because the app can do something
with them that prose cannot: the twelve **Camp building tiers**, the fourteen
**Campaign Tracker rewards**, the two **Shared Objectives**, and the three
**Campaign Conclusions** of the Path to Leviathan.

**Four rules separate a heading from prose that starts like one**, and each is
there because a line in these chapters breaks it. The Aerial Bombardment rules
are set in a narrow column beside an illustration, so nearly every line of them
is short enough to be a heading:

| the line | why it is not a heading |
|---|---|
| `In order to use an Aerial Bom-` | ends on a hyphen |
| `We have provided an example of` | ends on a function word |
| `The ceremony of innocence` | the next line continues it (`is drowned”`) |
| `Roll \t Result` | it is a table's header row |

Consecutive headings are one heading that wrapped: `Carcass Front` /
`Campaign Games` is the section the book cross-references as *"Carcass Front
Campaign Games"*.

**The Tracker reward table is structured because it does not survive
otherwise.** The extraction keeps the tab between its two columns on five of
the fourteen rows and drops it on the other nine, so `toMarkdown` renders five
table rows with two walls of run-on text either side — *"+1 🎲 Roll an extra
Exploration Dice in each Exploration Step. Reroll 🎲 You can reroll 1…"*. That
is a lookup table nobody can look anything up in, the same failure the naval
mine's detonation table had. The four building rewards are cross-checked
against the four buildings read from the section above it, which is a real
check between two independently read parts of the same chapter.

**The Path to Leviathan's chapter closes on fiction.** An eyewitness account of
the battle, in quotation marks, under no heading, and therefore inside the
Campaign Conclusions section. Read as rules it gives `Serpent.`, `Dragon.`,
`Monster.` and `Evil Absolute.` as four more conclusions — four short
sentences, each opening a line, each following one that finished. The rules end
where the fiction is introduced: a line closing on a colon whose next line
opens a quotation.

**The campaign map is not in the book's PDF** — but it is not unobtainable.
The zone board, the Carcass Front Zones table (which zone offers which
Resources, and which scenario is played there), the Special Zones table and the
Scenario Generator charts are printed on the fold-out map in the box, and the
release carries that as `Carcass.Front.Map.pdf`. Its first page extracts to
text: 33 zones with their Resources and scenario, ten Special Zone Outpost
Bonuses, and the generator's Deployment × Victory Conditions charts. `parse-cf-map.mjs`
reads all three; the file is in `SOURCES.json` and its extract is committed.

Two of the three tables extract badly, and neither is put back together by
guessing at the layout — both are reassembled against a vocabulary the sources
already state:

- **The Outpost Bonuses' zone names wrap.** A name that fits its column stays
  on the row (`Kurd Dagh <tab> You can re-roll…`); one that does not is set
  over as many as three lines with the bonus starting after it. So the boundary
  is found by NAME — a line, or a run of up to three joined, that is one of the
  32 zones the table above lists. Longest match first: read shortest-first,
  `Ruins of Nineveh Novus` became `Ruins of`, which is not a zone either, so
  the row was lost entirely and `Nineveh Novus` became the opening words of
  somebody else's bonus.
- **The D6 charts' cells wrap.** A row's six cells arrive over as many as six
  lines with the tabs falling wherever the wrap did, so the row is flattened
  and read against the vocabulary the **book's own** generator states — six
  deployments, six victory conditions, three archetypes. A row that does not
  resolve into exactly six published names is reported, not repaired: a chart
  that sends a player to a deployment the book does not print is worse than no
  chart. Hyphens and spaces are treated alike when matching, because the book
  prints `Long-Distance Battle` and the map prints `Long Distance Battle`, and
  what is emitted is the book's spelling so a chart cell and the generator's
  rules text for that deployment are the same string.

The Resource glyphs are read from the book's own legend (`Favour 👁`) rather
than from a table typed into the pipeline: the map prints only the glyph.

`requiresMap` still records that the campaign needs the **zone board** — which
zone borders which, for supply lines and adjacency — which is a graphic on the
printed sheet.

### The Vision cards: a card is not a chapter

`vision-cards.pdf` is sixteen print-ready cards on four sheets, so the
extraction hands back each card's pieces in whatever order the page laid them
out. Two invariants hold the parse together — sixteen cards of three tiers
each, and every card scoring 10, 15 and 20 (cumulative, so a card fully
achieved is worth 45) — and four things had to be learned:

- **The title sits before its objectives on the first two cards and after them
  on the other fourteen.** Nearest-title alone gives Idol, Butcher and Survivor
  two cards each and leaves Specialist, Lion and Diplomat with none, and every
  one of those mis-assignments reads perfectly well, because all sixteen words
  describe a warband. What makes the match a rule rather than a guess is that
  **no other card's objectives may lie between a title and its own**.
- **A card's quotation is printed under its tiers.** A card region bounded by
  the *previous* card's last line cuts across it, and Ascetic inherited
  Warlord's quotation while Legend inherited Ascetic's.
- **An attribution wraps too.** The Architect's runs `– Recipe for infernal
  concrete,` / `also sold as “Little Horn's Moonshine”`, so ending the
  quotation at the attribution line put the second half into that card's rules
  notes, where it read as a rule.
- **A tier ends at its score, not at a line break.** `** One ELITE` / `model
  has 2 or more` / `Glory Items: 10` is one objective over three lines.

**The printed card numbers are deliberately not emitted.** All sixteen are in
the extraction and none of them can be attached to a card safely: they land
wherever the sheet's layout put them, `10101` is printed twice, and `10104`
sits beside a different card's title. A Vision card labelled with another
card's number is exactly the plausible-looking wrong value this pipeline exists
to prevent, so the title — unique, and what a player reads off the card in
their hand — is the identity instead.

### Hyphens at a line break

`scripts/lib/dehyphenate.mjs`, because it is a decision and not a formatting
detail. A justified column ends a line on a hyphen for two reasons and the
extraction records both identically: a soft hyphen the typesetter inserted
(`bo-\nnus`, `SHOT-\nGUN`) and a real one that belongs to the word
(`roll-\noff`, `co-\nopted`).

Always dropping gives `rolloff` and `coopted`; always keeping gives `bo-nus`
and `SHOT-GUN` — and SHOTGUN is a Keyword, so that turns a searchable rules
term into one that matches nothing. Two signals separate them: a
compound-forming left fragment (`co-`, `half-`, `corpse-`), or a capital on
**both** sides (`Off-Hand`, `Meta-Christ`). Between them they get all 44
hyphenated breaks in the book right, and the test lists every one.

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

## Artwork the app ships

Distinct from the rules data above, and governed by a different rule: rules and
statlines are DERIVED from the publisher's documents and cited, which is what
the whole pipeline exists to do. Artwork is not derived, it is *copied* — so
the app ships its own.

| | provenance |
|---|---|
| `public/brand/mark.svg` | **Ours.** Original, drawn from primitives: a cross, and a crenellated line for a fire trench in plan view. The source of every icon and the masthead. |
| `public/icons/*`, `public/logo.*` | Derived from the mark above by `npm run icons:build`. |
| `public/images/world-map.webp` | **Not ours** — still the publisher's. See below. |
| `public/maps/*` | Scenario deployment maps, drawn in vector by the pipeline from the scenarios' own text. |

Until this change the masthead and every home-screen icon were the Trench
Crusade badge. That is two problems, not one: copyright in the artwork, and
trademark — an unofficial companion using the publisher's logo as its own
identity reads as endorsement, which the footer disclaimer softens but does not
cure while the logo IS the identity. The rulebook's own notice is explicit:
*"All trademarks, service marks, product names, and logos appearing in this
publication are the property of Factory Fortress Inc."*

**Still outstanding: the campaign world map.** `public/images/world-map.webp`
is the publisher's, and the Territory Map renders it. Unlike a logo it cannot
be replaced by a geometry exercise — it needs a map drawn for the purpose, or
the theatre list without a background behind it. Recorded here rather than
quietly left, because it is the same issue as the icon and only the icon has
been fixed.

Two unreferenced copies sit beside it — `trench_crusade_world_map.png` (6.1 MB)
and `.webp` (1.1 MB). No component loads either.

## Licensing

**Decided (Aug 2026): not a blocker.** The repository already contains
substantial verbatim rules text, and this is a personal/community tool as the
README states. Sources stay in `data-sources/`. Revisit only if the project is
ever distributed more widely.
