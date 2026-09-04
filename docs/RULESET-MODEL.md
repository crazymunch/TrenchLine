# The Ruleset Model

How TrenchLine sources, layers, versions and verifies game data.

This is the most important document in the project. The original codebase's
central failure was that game data was *typed in* rather than *derived*, with no
way to tell a verified number from an invented one. Everything here exists to
make that failure impossible to repeat.

---

## 1. Principles

1. **Data is generated, never authored.** `src/data/*.generated.ts` is build
   output. Hand-editing it is a bug.
2. **Every field carries provenance.** A value knows which source it came from
   and which layer last touched it. A field with no provenance fails the build.
3. **Sources disagree — that is expected and must be visible.** The pipeline
   does not silently pick a winner. Conflicts are surfaced, resolved
   explicitly in a checked-in file, and the resolution is itself provenance.
4. **Rulesets are compositions, not copies.** A ruleset is a base plus an
   ordered list of patch layers. Adding a new Dispatch must never mean forking
   the whole dataset.
5. **Failures are loud.** No fallback ever invents data. If a source cannot be
   fetched, the build fails with the reason.

---

## A Variant's rules, as ops rather than as prose

A Warband Variant changes what a Warband may recruit. The BattleScribe
catalogues state that as machine-readable modifiers and `parse-battlescribe.mjs`
lifts them out. A supplement states the same things in English, and
[`parse-variant-ops.mjs`](../scripts/lib/parse-variant-ops.mjs) reads these
constructs out of that prose — the ones the five Carcass Front Variants use,
and no more:

| the book says | the op |
|---|---|
| `The X use the Y Warband entry` | rename Y to X |
| `must include N-M X` | max **and** min on X |
| `may / can include N-M X` | max on X only |
| `cannot include X` | hide X |
| `have a <Characteristic> Characteristic of V` | `set stats.<characteristic>` |
| `replace the A Ability with the B Ability` | `replaceAbility` |
| `must wear a suit of <noun>` | `requireGear` on that Armoury section |

The last three are read **per sentence**, because which model they describe is a
property of the sentence and not of the paragraph:

> "The Leper-Knights use the Lazarist Castigator Warband entry but …have a Melee
> Characteristic of **+2 DICE**…" — the entry just renamed
>
> "**Wretched** models in a Drowned Choir cost 30 👑 and have a Melee
> Characteristic of **+0 DICE**." — the Wretched, named in place

Scanning a paragraph would give the Leper-Knight the Wretched's statline
wherever a Variant mentions both, which the Drowned Choir does.

A `replaceAbility` needs the replacement's **rules text**, and the book supplies
it: `Knightly Code` is a named special rule on the same Variant, printed
directly beneath the rule that says to swap it in. Where that text is missing
the op is not emitted — a model carrying an ability with no rules is worse than
one still carrying the ability it was meant to lose.

**`may` never sets a minimum.** "May include 1-3" states a ceiling; reading it
as a requirement makes the app demand a model the book merely permits — the
failure that told every Trench Pilgrims warband it must include a Chieftain.

**A name that does not resolve to an entry in the faction's own list is left
alone**, and reported by the build. The same sentences talk about wargear
("cannot have Automatic Pistols") in the same words they talk about models
("cannot include Anchorite Shrines"), and the verb does not separate them —
"can only have 0-2 Stigmatic Nuns" uses `have` about a model. Resolving the
name against the roster is the only reliable discriminator.

### One applier, not a reader per field

A Variant's ops are the same vocabulary as an errata Layer's, and
`scripts/lib/layers.mjs` has applied that vocabulary since Phase 1 — at **build**
time, to the whole dataset. That is right for errata and wrong for a Variant:
two Warbands of the same faction take different Variants, so the same entry has
to read differently for each.

Nothing applied a Variant's ops at roster-build time at all. Instead four
readers each reached into `variant.ops` for one field apiece — `variantLimits`
for constraints, `variantForbids` and `variantReveals` for `hidden`,
`variantRenames` for `name` — and anything beyond those four was simply not
read. So the Knights of Saint Lazarus could rename an entry and raise its limit
and could not give it the +2 Melee the same sentence grants.

[`applyVariant`](../src/rules/applyVariant.ts) is that missing step: the whole
op vocabulary, applied to one profile, at the point a roster is built. It is
**pure** — a Variant is a lens on the catalogue, not an edit to it, and mutating
the dataset's profile would leak one Warband's Variant into every other Warband
on the device. A test asserts the base Lazarist Castigator still has `-1 DICE`
and its Whip of God while the Leper-Knight has neither.

`hidden` stays outside it, deliberately: whether an entry is on the list is a
question about the **list**, not about the profile.

### Replacement beats exclusion, and the order is the whole subtlety

The Knights of Saint Lazarus says both of these:

> **Sacred Code:** …it cannot include Lazarist Communicants or Lazarist Castigators…
>
> **Knightly Order:** …must include 1-3 Leper-Knights. The Leper-Knights **use the
> Lazarist Castigator Warband entry**…

Those contradict only if the exclusion is applied to an entry the rename has
already claimed. The Castigator has not been banned; it has **become** something
else, and the ban is about the model it used to be. Apply them the other way
round and the Warband cannot take the model the book says it must have 1-3 of.

So renames resolve first, limits resolve *through* them — `must include 1-3
Leper-Knights` lands on the Castigator entry — and an exclusion naming a
renamed entry is skipped.

### A requirement is not a profile change

The Leper-Knight "must wear a suit of Armour". The model is identical whether
or not it is wearing any — there is nothing for `applyVariant` to do. What
changes is whether the **roster** is legal, so this is emitted as `requireGear`
and read by `checkVariantGear` in the validator, alongside "must include 1-3".

What satisfies it is the **Armoury Table section**, not the item's name:

| | |
|---|---|
| Procession `Armour` section | Holy Icon Armour, Ragged Vestments, Reinforced Armour, Standard Armour |
| Procession `Shield` section | Holy Icon Shield, Trench Shield |

Matching on the word "Armour" would accept **Armour-Piercing Bullets** and
reject **Ragged Vestments** — the only one of the four suits a 50 👑 model can
comfortably afford. The section is the catalogue's own answer to what an item
*is*, and the name is not.

A noun with no section behind it is reported as unresolved prose rather than
guessed at. A legality error the player cannot act on is the same failure as no
error at all, which is why the violation names the suits they can actually buy.

### What is deliberately not derived

**Cost.** A Leper-Knight *uses the Lazarist Castigator Warband entry*, and the
book does not restate a price — so it is bought at the Castigator's 50 👑. The
silence is the rule, and inheriting the entry's own cost is what obeying it
looks like. Nothing emits a `setCost` here; deriving a new number from the
better Melee and the swapped ability would be arithmetic nobody published.


## 2. The three sources

| Source | Role | Format | Reachable from CI |
|---|---|---|---|
| **BattleScribe catalogues** — [`Fawkstrot11/TrenchCrusade`](https://github.com/Fawkstrot11/TrenchCrusade) | **Base layer.** Structured, complete, community-maintained, pinned by commit SHA. | `.cat` / `.gst` XML | Yes — `raw.githubusercontent.com` |
| **Official rulebooks** — [trenchcrusade.com/rules](https://www.trenchcrusade.com/rules/) | **Cross-check + prose.** Authoritative for keyword text, scenarios, tables, lore. | PDF | **No** — must be committed to `data-sources/` manually |
| **Trench Dispatch** | **Patch layer.** The newest rules, superseding the books and the catalogues. | PDF → extracted text → patch file | **No** — committed to `data-sources/` |

### Why the catalogues are the base

They are the only machine-readable source. They carry everything the app needs
and the app currently lacks: statlines with movement type, Ducats **and Glory
Points** as separate costs, base sizes, category/keyword links, and 1,187
`<constraint>` elements encoding warband composition rules.

They are also what NewRecruit itself consumes for this system, so a roster
imported from NewRecruit lines up with our data by construction.

### Why the catalogues are not sufficient

They lag the official rules. Checked against Trench Dispatch #1 (April 2026) at
the time of writing:

| Dispatch content | In the catalogues? |
|---|---|
| `FUMBLE` keyword | **Absent** |
| Bolgias Gut / Vile Corpus (Black Grail Strains) | **Absent** |
| Al-inbīq Kit, Corrosive Ammunition | **Absent** |
| Mehterân ability, Regimental Kaşık | **Absent** |
| Hellfly Host, Alaybozan, Halberd-Gun | Present |
| Scripture Guardian, Witchburner, Goetic Warlock | Present |

They also have gaps the rulebook fills — `Combat Engineer` has a full profile in
both the rulebook and the Dispatch, but no matching entry in the catalogues.

**This is precisely why the layered model exists.** No single source is correct.

---

## 3. Layers

A **layer** is an ordered set of operations against the accumulated dataset.
Layers are declarative data, not code, so they are diffable and reviewable.

```ts
type LayerOp =
  | { op: 'set';     target: Ref; field: string; value: Json }
  | { op: 'replace'; target: Ref; entity: Json }          // whole-entity replacement
  | { op: 'add';     collection: Collection; entity: Json }
  | { op: 'remove';  target: Ref }
  | { op: 'addKeyword';    target: Ref; keyword: string }
  | { op: 'setKeywords';   target: Ref; keywords: string[] }
  | { op: 'addAbility';    target: Ref; ability: Ability }
  | { op: 'replaceAbility'; target: Ref; name: string; ability: Ability }
  | { op: 'setCost';       target: Ref; currency: 'ducats' | 'glory'; value: number
                         ; scope?: Ref[] };               // e.g. per-faction armoury tables

interface Layer {
  id: string;              // 'dispatch-01'
  name: string;            // 'Trench Dispatch #1 — April 2026'
  sourceRef: string;       // 'data-sources/dispatch/trench-dispatch-01-april-2026.txt'
  publishedAt: string;     // '2026-04'
  status: 'official' | 'public-beta' | 'community';
  ops: LayerOp[];
}
```

This shape is not invented for convenience — it is the shape the Dispatch is
already written in. Compare the source text to the ops it compiles to:

> *"Add the FUMBLE Keyword to: Frag Grenades, Gas Grenades, Incendiary Grenades, Molotov Cocktail…"*
> → seven `addKeyword` ops.

> *"Change the Cost of Incendiary Grenades to 10 Ducats in the following Armoury Tables: New Antioch, Trench Pilgrims, Iron Sultanate, Heretic Legions, The Court"*
> → one `setCost` op with a five-faction `scope`.

> *"Change the Profile of a Combat Engineer to: Movement 6"/Infantry, Ranged +1 DICE, Melee +0 DICE, Armour -2, Base 25mm"*
> → one `replace` op.

> *"Replace the Counter Charge ability with the following ability: ✥ Mehterân: …"*
> → one `replaceAbility` op.

Writing the Dispatch patch file is therefore transcription, not interpretation —
which is exactly the property we want, because transcription is checkable.

### `status: 'speculative'` — predicted rules

A layer may be built from **community reporting rather than a published source**:
previews, faction-focus articles and roundtables that appear months before a box
drops. The Carcass Front is the first case — enough has been written publicly to
reconstruct most of it before release, and being able to draft a warband early is
genuinely useful.

This is also, obviously, the exact shape of the failure this whole document
exists to prevent. The difference between *predicted* and *invented* is not the
confidence of the guess — it is whether the reader can tell. So a speculative
layer carries hard constraints:

1. **Never in a default ruleset.** It is its own opt-in ruleset
   (`carcass-front-preview`), never a layer on `trenchline`.
2. **Per-field sourcing is mandatory.** Every value cites the article and URL it
   came from. A value nobody published is not "predicted", it is invented, and
   it does not go in — the field is left absent and rendered as *unknown*, not
   filled with a plausible number.
3. **Confidence is part of the data.** `stated` (an article gives the number
   outright) vs `inferred` (derived from comparable units or partial text).
   Inferred values render differently.
4. **The UI cannot be subtle about it.** Persistent banner on the roster,
   speculative badge on every affected entry, and exports stamped
   "PREDICTED RULES — NOT FOR ORGANISED PLAY".
5. **It expires.** When the real PDF lands, the speculative layer is deleted and
   replaced by a normal PDF-primary layer. It is never merged into `trenchline`.

The verification pass treats a speculative layer inversely to a normal one: it
does not check values against a rulebook (there is none), it checks that every
field has a citation and a confidence, and fails the build otherwise.

Recorded as a Phase 5 task; see [`RESTRUCTURE-PLAN.md`](RESTRUCTURE-PLAN.md).

### `status: 'public-beta'`

Most of Dispatch #1 is marked *Public Beta* in the source. The layer records
that, the UI surfaces it on affected entries, and a ruleset can choose to
include or exclude beta ops. This matters for tournament play.

---

## 4. Rulesets

A **ruleset** is a base plus an ordered layer list.

```ts
interface Ruleset {
  id: string;
  name: string;
  description: string;
  base: { source: 'battlescribe'; repo: string; commit: string };
  layers: string[];          // applied in order
  includeBeta: boolean;
  isDefault?: boolean;
}
```

### The two that ship

```ts
export const RULESETS: Ruleset[] = [
  {
    id: 'github-latest',
    name: 'Latest GitHub Rules',
    description:
      'The community BattleScribe catalogues exactly as published, with no ' +
      'TrenchLine corrections applied. Matches what NewRecruit shows. Use this ' +
      'when you need to agree with an opponent who is using NewRecruit.',
    base: { source: 'battlescribe', repo: 'Fawkstrot11/TrenchCrusade', commit: '<pinned>' },
    layers: [],
    includeBeta: false,
  },
  {
    id: 'trenchline',
    name: 'TrenchLine Rules',
    description:
      'The GitHub catalogues, corrected against the official rulebooks and ' +
      'brought up to date with the Trench Dispatch. The most accurate ruleset ' +
      'available in the app.',
    base: { source: 'battlescribe', repo: 'Fawkstrot11/TrenchCrusade', commit: '<pinned>' },
    layers: ['rulebook-corrections', 'dispatch-01'],
    includeBeta: true,
    isDefault: true,
  },
];
```

`rulebook-corrections` is generated by the cross-check in §6 and reviewed by a
human before it lands. It is not automatic.

### Adding a future Dispatch

Extract → transcribe to `data-sources/dispatch/NN.layer.json` → append
`'dispatch-NN'` to the `trenchline` ruleset. No dataset fork, no data rewrite.

### Adding a brand-new faction (the Carcass Front case)

**This is a first-class requirement, not an edge case.** The community
catalogues typically lag a new release by months, so for new content the
BattleScribe base has *nothing* to correct — the PDF is the only source.

A layer can therefore be **PDF-primary**: an `add` op carrying whole entities
rather than a patch to existing ones. Nothing about the engine changes — `add`
already exists because the Dispatch needs it (Strains, Glory Items, the
Scripture Guardian).

#### Transcribed or generated?

The Dispatch layer is a hand-written `.layer.json`, and that is right for it: a
Dispatch **is** a list of errata sentences — *"Change the Cost of Incendiary
Grenades to 10"* — and turning one into an op is transcription, one op per
sentence, each quoting the line it came from.

A faction list is not. Carcass Front is two Warbands: 15 entries, 88 armoury
rows, 15 unique Battlekit items, 4 Variants, 6 faction special rules. Typing
those out is precisely the act Rule 1 forbids, at precisely the scale that
produced the app's 97%-wrong statlines. So the Carcass Front layer is
**generated on every build**:

```
data-sources/carcass-front/carcass-front-book.pdf     the source, sha256-pinned
  -> scripts/extract-pdf.mjs                          text
  -> scripts/lib/parse-carcass-front.mjs              structure
  -> scripts/lib/carcass-front-layer.mjs              add ops + armouries
  -> scripts/rules-build.mjs                          layered, verified, emitted
```

Nothing in that chain is authored. `rules-build.mjs` calls
`buildCarcassFrontLayer()` where it would otherwise read a `.layer.json`, and if
the extraction breaks the build breaks with it, rather than shipping a stale
hand-copy that nothing re-checks.

**The rule of thumb.** A source that states *changes* is transcribed. A source
that states *content* is parsed.

#### What the pipeline had to learn

Three things this case added, each because the first pass got it wrong:

- **`add` stamps every leaf.** The Dispatch's `add` ops write flat scalars, so
  a single stamp per top-level key was enough. An entity carrying a `stats`
  block needs `stats.ranged` stamped, or `findMissingProvenance` correctly
  refuses to emit it.
- **`add` refuses a duplicate.** Carcass Front *reprints* the Combat Biologist,
  which the Warbands book and the catalogues already carry. A faithful read of
  the book therefore adds a Mercenary the dataset already has, and two copies in
  the recruit list is worse than none: a player picks one and cannot tell which.
  Matched on name **plus faction**, so the Naval Raiders' Wretched and the
  Heretic Legion's Wretched — different models sharing a name — stay two
  entries.
- **A reprint is cross-checked, not dropped.** The skipped copy is a second
  independent printing of an entry the dataset already had. Where the two agree
  the value has two sources; where they disagree the build fails until
  `resolutions.json` rules on it. It found one on the first run: Carcass Front
  prints the Ducat glyph on the Combat Biologist's `Cost: 3` where Warbands of
  Trench Crusade prints the Glory glyph on the same number.

#### Two collections are merged, not layered

`dataset.variants` and `dataset.armouries` are **assigned wholesale** by
`rules-build.mjs` after the layers run — both are derived from the catalogues
and the Armoury Tables rather than patched onto them — so an `add` op against
either is applied and then thrown away. The generated layer hands those back
separately and the build merges them where those collections exist.

#### When the catalogues catch up

The base gains the same entries. The layer's `add` ops become redundant rather
than conflicting: the duplicate guard reports each as *"already in the dataset,
so the layer is reprinting it"*, and the reprint cross-check then compares the
book against the catalogue field by field. Retiring the layer becomes a
deliberate decision made against a report, not a guess.

**Turnaround target: same day**, and Carcass Front met it: release to shipped in
one pass with no hand-typed rules in between. This is the app's main advantage
over NewRecruit for this game.

### Historical rulesets

The app's existing `1.0` / `1.0.2` / `1.0.2TD` entries are deleted — their
changelogs are unsourced (see [`AUDIT.md`](AUDIT.md) §1.9).

**1.0.2 itself is real and now sourceable.** The official
`Changelog 1.0.2` PDF is committed and is a structured errata table
(`Page | Location | Errata`) written in exactly the same operation form as the
Dispatch — *"Add the following sentence to the end of the Move rule"*,
*"Change to:"*. It transcribes to a `changelog-1-0-2` layer like any other.

Whether to *expose* 1.0.2 as a selectable ruleset is a separate question: the
catalogues already track current rules, so 1.0.2 is mainly valuable as the
authoritative text for keyword definitions and core-rules prose that the
catalogues do not carry.

### What a ruleset selection affects

Selecting a ruleset changes the profiles, costs, keywords and constraints used
for **new** decisions. It does **not** silently rewrite saved warbands — see §8.

---

## 5. The pipeline

```
data-sources/                          scripts/                    src/data/
├── battlescribe/           ──┐
│   ├── *.cat  (pinned)       │      1. fetch    ─┐
│   └── MANIFEST.json         │      2. parse     │
├── rulebook/                 ├───►  3. layer     ├──►  *.generated.ts
│   ├── *.pdf                 │      4. verify    │     + provenance.json
│   └── extracted/*.txt       │      5. emit     ─┘
└── dispatch/               ──┘
    ├── *.txt  (extracted)
    └── *.layer.json
```

| Step | Script | Does |
|---|---|---|
| 1 | `rules:fetch` | Pulls catalogues at the pinned SHA into `data-sources/battlescribe/`. Writes `MANIFEST.json` with SHA, fetch time, per-file checksum. Fails loudly; never falls back. |
| 2 | `rules:parse` | BattleScribe XML → normalised entities. Resolves `sharedSelectionEntries`, category links, cost types, constraints. |
| 3 | `rules:layer` | Applies each ruleset's layers in order. Every write stamps `{ layer, sourceRef }` onto the field. |
| 4 | `rules:verify` | Cross-checks against extracted rulebook text; writes `reports/crosscheck.md`; **exits non-zero on an unresolved conflict or a field with no provenance**. |
| 5 | `rules:build` | Emits `src/data/*.generated.ts` + `provenance.json`. Runs 1–4 first. |

`npm run rules:build` runs in CI on every PR. A drifted or unverified dataset
fails the build.

### Provenance

Every generated field carries its origin:

```ts
{
  id: 'na-lieutenant',
  name: 'Lieutenant',
  stats: { movement: '6"/Infantry', ranged: '+2 DICE', melee: '+2 DICE', armour: '0', base: '32mm' },
  costs: { ducats: 70, glory: 0 },
  _provenance: {
    'stats.ranged': { layer: 'base', source: 'battlescribe:New Antioch.cat@9c4f1ab', verified: 'rulebook:p.27' },
    'stats.armour': { layer: 'base', source: 'battlescribe:New Antioch.cat@9c4f1ab', verified: 'rulebook:p.27' },
    'costs.ducats': { layer: 'base', source: 'battlescribe:New Antioch.cat@9c4f1ab', verified: 'rulebook:p.27' },
  }
}
```

This is what the Codex "where does this number come from?" affordance renders,
and what makes the "TrenchLine vs GitHub" diff view possible for free.

---

## 6. Cross-checking and conflicts

`rules:verify` compares the layered dataset against text extracted from the
official rulebook PDFs. Rulebook extraction is *fuzzy* — the PDFs are
multi-column and text order is unreliable — so verification is a **matcher, not
a parser**: it looks for the expected value near the entity name, and reports
three outcomes.

| Outcome | Meaning | Build |
|---|---|---|
| `confirmed` | Value found in the rulebook near the entity | passes |
| `unconfirmed` | Extraction could not locate it — not evidence of an error | passes, counted in the report |
| `conflict` | Rulebook clearly states a different value | **fails** until resolved |

Conflicts are resolved by hand in `data-sources/resolutions.json`, keyed
`<Unit Name>.<field>`:

```json
{
  "Lieutenant.stats.armour": {
    "chose": "battlescribe",
    "value": "0",
    "because": "Rulebook p.27 column extraction interleaved the Sniper Priest row; visual check of the PDF confirms Armour 0.",
    "reviewed": "2026-08-30",
    "reviewer": "crazymunch"
  }
}
```

Every resolution needs a reason. The file is the project's record of *why* the
data says what it says — the thing the original build never had.

A resolution is **applied, not merely recorded**:

| `chose` | Effect |
|---|---|
| `rulebook` | the book's value is written into the dataset, with provenance `layer: 'resolution'` |
| `battlescribe` | the catalogue's value is kept |

Either way the build checks the stated `value` against the source it names and
**fails** if the two have drifted apart, so the file cannot describe a decision
the data has not taken. It used to only silence the conflict, and one entry
claimed the Scripture Guardian's Ranged had been set to the book's `-` while
the app shipped the catalogue's `+1 Dice` — the file said one thing and the app
did another.

A field a layer has already written is **skipped**, not overwritten: the
Dispatch outranks the rulebook, so there is nothing left to choose. The same
entry can still be doing real work in the unlayered base ruleset, which is why
it is skipped rather than rejected.

Precedence when sources genuinely disagree, absent an explicit resolution:

```
Trench Dispatch  >  Official rulebook  >  BattleScribe catalogue
```

The Dispatch wins because it is the most recent rules update. The rulebook beats
the catalogues because the catalogues are a community transcription of it.

> **On the Dispatch's status:** the document describes itself as *"an unofficial,
> fan-made digital rules update… not affiliated with or endorsed by Factory
> Fortress Inc."* It is a **compilation** of official Trench Wire rules updates,
> not an official publication. It sits top of precedence because it carries the
> newest official changes, but the layer is marked `status: 'public-beta'` and
> the UI says so.

---

## 7. The entity model

Replaces `src/types/rules.ts`. Only the parts that change materially:

```ts
interface Statline {
  movement: string;        // '6"/Infantry'  — full string, type included
  movementInches: number;  // 6              — derived, for range maths
  movementType: string;    // 'Infantry' | 'Flying' | …
  ranged: string;          // '+2 DICE' | '-' | 'N/A'
  melee: string;
  armour: string;          // '0' | '-1'
  baseSize: string;        // '32mm'         — load-bearing in the rules
}

interface Cost {
  ducats: number;
  glory: number;           // NEW — a first-class second currency
}

interface Constraint {
  type: 'min' | 'max';
  value: number;
  scope: 'roster' | 'parent';
  appliesTo: Ref;
  condition?: Condition;   // e.g. 'warband total >= 1000 Ducats'
}

interface UnitOption {         // NEW — Strains, Vile Corpus, Goetic Powers, Glory Items
  id: string;
  name: string;
  kind: 'strain' | 'vile-corpus' | 'goetic-power' | 'glory-item' | 'variant';
  cost: Cost;
  constraints: Constraint[];
  effect: string;
  modifies?: LayerOp[];        // reuses the layer ops — an option is a patch scoped to one model
}
```

### Roles, and who may lead

A catalogue entry carries a `roles` list — `Elite`, `Troop`, `Mercenary`, and on
nine entries `Leader`. The roster format has a single `category` field instead,
and it means something different: it records what a model **is on this roster**,
so a nominated Leader's category is `'Leader'` while every other copy of the
same profile still reads `'Elite'`.

The two cannot be collapsed. `recruitable()` therefore maps `roles` to
`category` for the first three and carries the fourth separately as
`UnitProfile.canLead`. That is what lets the builder nominate the first
Leader-eligible recruit automatically without inferring leadership from cost,
rarity or a recruitment limit of 1 — all of which would be invented rules.

`UnitOption.modifies` reusing `LayerOp` is deliberate: *"A model with the Hellfly
Host Strain replaces their Movement Characteristic with 6"/Flying and gains the
FLYING Keyword"* is the same kind of operation as an errata change, just applied
to one model at build-a-roster time rather than to the dataset at build time.
One engine, two uses.

---

## 7b. Catalogue modifiers — the conditional layer

The single largest thing the first pass threw away.

BattleScribe does not store a model's printed profile. It stores a **base**
profile plus `modifier` elements that fire when a condition holds. There are
**1,862** of them in the pinned catalogues; the parser read none, which is why
the generated data had no `Kavass`, derived no Armour from equipped armour, and
could not reach `Favoured Brazen Bull` at all.

They are now parsed into `Modifier` (`src/types/catalogue.ts`) and evaluated by
[`src/rules/modifiers.ts`](../src/rules/modifiers.ts).

### What they encode

| Target | Count | Example |
|---|---|---|
| `hidden` | 772 | availability — the machine-readable "cannot include" |
| Armour | 171 | `set stats.armour = -2` when Reinforced Armour is equipped |
| `name` | 91 | `set name = Kavass` when the roster has The House of Wisdom |
| `category` | 77 | grants ELITE at no cost |
| Melee / Ranged | 141 | `set stats.melee = +0 Dice` when Studied Blade |
| constraints | ~60 | `increment` the Lion of Jabir's roster max under a variant |
| Ducats / Glory | 41 | an option that changes the price |

### Why this matters more than it sounds

**The variant rules are derivable, not transcribable.** §7a describes reading
the fourteen variants out of the Warbands PDF as prose and hand-writing ops.
Most of that work is already done, in machine-readable form, in the catalogues:

```
Lion of Jabir     base max 2  +  increment 1 when "The House of Wisdom"   -> 0-3
Jabirean Alchemist base max 1  +  increment 1 when "The House of Wisdom"   -> 0-2
                   base min 0  +  increment 1 when "The House of Wisdom"   -> must include 1
```

which is *Pride of Jabir* and *Alchemists*, word for word, without anyone
transcribing them. Prefer the derived form; keep the PDF prose as the
cross-check, not the source.

### Rules this file obeys

- **Document order.** A later `set` overrides an earlier `increment`. That is
  BattleScribe's own semantics and we reproduce it rather than imposing one we
  find tidier.
- **Three-valued conditions.** `instanceOf` needs a type hierarchy the
  catalogues do not give us. Such a condition evaluates to `null`, never to
  `false`, and the modifier is reported as unevaluated rather than dropped.
- **No invented fields.** A field id we cannot resolve is kept verbatim under
  `rawField` and counted by the build (currently 3 of 820 on units and weapons).

### Verified against a real roster

`src/rules/__tests__/modifiers.test.ts` replays the Al-Qarn Rihla NewRecruit
export through the evaluator and compares every statline against what NewRecruit
itself printed. **All of them match** from the catalogue base plus modifiers.

### Elite promotion titles

A promoted model prints with a faction title: `Favoured Brazen Bull`,
`Ascendant …`, `Blasphemous …`. These are a **community convention**, not a rule
in any book — but they are real catalogue data, held on the shared
`Elite Promotion` entry and chosen by an `instanceOf` against the roster's
primary catalogue:

| Faction | Title |
|---|---|
| Principality of New Antioch | Commissioned Officer |
| Trench Pilgrims | Exalted |
| Iron Sultanate | **Favoured** |
| Heretic Legions | Blasphemous |
| Court of the Seven-Headed Serpent | Ascendant |
| The Black Grail | Putrid |

So they are derived, never hand-written. Trench Companion publishes a competing
set that agrees on five of six and calls the Sultanate's *Veteran*; the
maintainer has ruled for the NewRecruit set, which is the one the catalogues
carry, so no layer is needed to express that preference today. If it ever is,
it belongs in a layer with a citation.

The separator is U+00A0, carried on the modifier's `join` attribute — a
non-breaking space, so a title never wraps away from the name it decorates.
The parser reads attribute values verbatim for exactly this reason; trimming
them turned the separator into `''` and produced `FavouredBrazen Bull`.

---

## 7a. Warband Variants

A **Variant** (Papal States Intervention Force, House of Wisdom, Trench Ghosts…)
is a named modifier a warband selects at creation, on top of its faction. There
are 14 official ones and the app currently models none — see
[`AUDIT.md`](AUDIT.md) §1.6a.

Variants need no new machinery: a variant *is* a layer, scoped to one roster
instead of the dataset.

```ts
interface Variant {
  id: string;                 // 'house-of-wisdom'
  factionId: string;          // 'iron-sultanate'
  name: string;
  loreText: string;
  specialRules: FactionSpecialRule[];
  budget?: Partial<Cost>;     // e.g. Papal States: 500 Ducats + 11 Glory
  ops: LayerOp[];             // applied to the roster's view of the dataset
}
```

The rules from the book map straight onto existing ops:

| Book text | Op |
|---|---|
| "cannot include Trench Moles" | `remove` (or a `max: 0` constraint) |
| "must include 1 Trench Cleric" | `add` constraint `{min:1}` |
| "cannot have Iron Capirotes" | `remove` from the armoury, scoped to the roster |
| "Ecclesiastic Prisoners do not have Iron Capirotes, but their cost remains the same" | `replace` on the entry |
| "Papal States: 500 Ducats + 11 Glory" | `budget` |

So the same engine serves three jobs: dataset errata (Dispatch, 1.0.2), per-model
upgrades (`UnitOption.modifies`), and now per-roster variants. `Warband` gains a
`variantId`, and roster validation resolves faction → variant → model options in
that order.

### When the Variant is chosen, and when it stops being a choice

A Variant changes **what the Warband may recruit**, so it is a founding decision
and is offered on the muster screen alongside the faction. Choosing it later
means the models already on the roster were recruited against a list that was
not the one in force — which is the failure the variant work existed to stop,
just moved one step earlier.

It stays editable from the roster screen until the Warband's **first game**, so a
list can be reconsidered while it is still being built. `canChangeVariant()` in
`rules/campaign.ts` decides, and it reads the Warband's own record rather than a
flag anyone sets:

- a `post_battle` snapshot, written when a game is resolved;
- a ledger entry for `exploration` or `reinforcements`, neither of which
  happens before a battle;
- any ledger entry attributed to a game after the first.

An **unrestricted** Warband is exempt and stays editable for good: it exists to
try lists out, has no campaign to stay consistent with, and already owns its
budget. Its starting **Glory** is set at muster too, beside its Ducats — the
screen offered one currency, so an unrestricted list could not include anything
the catalogues price in Glory (a Witch Coven Matriarch is 0 Ducats and 5 Glory).
A campaign Warband starts on 0 Glory, which is published, so the field is
ignored for one.

## 7c. Third-party content

A meaningful slice of what the community catalogues carry is **not official**:
condoned by Factory Fortress, but written by other people and, in the source's
own words, offering *"no assurances ... to balance or consistency with rules"*.
The builder showed it beside the published entries with nothing to tell them
apart.

It is marked in the data, in **two different places**, and the two are not
equivalent — the small one is easy to find and the large one is easy to miss:

### 1. The `Third Party` Ability profile — one entry

The Disciple of St. Roch carries an Ability profile literally named
`Third Party`, whose description is that disclaimer, and is revealed by the
`Allow Third-Party Mercenaries?` roster option in `Campaign Rules.cat`
(`8397-95ab-8729-eb60`).

### 2. Third-party **Warband Variants** — twenty-one units and thirty-three wargear entries

The larger mechanism by far. Each faction catalogue holds a
`selectionEntryGroup` named **`Third Party`** containing unofficial Variants,
and the entries they unlock are `hidden="true"` with a `set hidden false`
modifier naming that Variant:

| Variant | Faction | Unlocks |
|---|---|---|
| Cadaver Corps | Heretic Legion | Technomancer *(Leader)*, Witch Coven Matriarch, Anointed Heavy Infantry, War Wolf |
| Children of Yggdrasil | Trench Pilgrims | Chieftain *(Leader)*, Huscarl, Captive Giant |
| Nomads of Al-Badia | Iron Sultanate | Archeologist, Bedu Sharpshooter, "Zamburak" Weapon Platform |
| Ghazi of the Golden Path | Iron Sultanate | Teğmen, Shirdal, Sultanate Sapper, Pairika |
| Fang of the Seething Black | Court of the Seven-Headed Serpent | Faceless, Stalker, Desecrated Saint, Yoke Fiend, Sin Eater, Goetic Warlock |
| Remnants of Byzantium | New Antioch | Shocktrooper |

Two of those are their faction's **Leader**, which is why this cannot be waved
through: a Warband that never opted in was being offered the Technomancer and
the Chieftain as though they were published.

**The data is split across the tree.** The gate condition lives on the *unit*;
the Variant it names lives in a group somewhere else. Detection has to join the
two, and neither half means anything alone.

**The group's name is the signal, not its position.** Five factions nest
`Third Party` under `Warband Variant > Variant Selection`. The Court of the
Seven-Headed Serpent has no `Warband Variant` entry at all — its Fang of the
Seething Black sits under `Seven Deadly Sins > Chosen Sin > Third Party`. Keying
on the variant ancestry finds five of six.

### How it is read

`parse-battlescribe.mjs` flags any variant inside a `Third Party` group, at any
depth and under any parent, as `WarbandVariant.thirdParty`.
`rules/thirdParty.ts` then joins a unit's reveal condition to those ids. Three
independent marks, any one of which is enough — requiring agreement would mean
that dropping one upstream silently promotes unofficial content to official.

`Warband.allowThirdParty` is the app's copy of the roster option and defaults
**off**, matching the catalogue default. Unlike the Variant it is a table
agreement rather than a founding decision, so it is set at muster and stays
editable from the roster; `validate.ts` raises `third-party-not-allowed` if a
model is left rostered after it is switched off. The Variant picker hides
third-party Variants under the same switch, since offering a Variant while
hiding what it unlocks would be half a switch.

> **Two traps, both of which this code hit.**
>
> **`hidden="true"` is not the marker.** Thirty-three model entries are hidden by
> default and twenty-six ship. It is how BattleScribe expresses "available under
> a condition", and plenty are ordinary official units — the Matagot Hag, the
> Witchburner, the Observer. Gating on it would delete a third of the roster.
>
> **A modifier's `when` is either a group or a bare condition.** `{all: [...]}`
> / `{any: [...]}` *or* a single condition object. Every real gate here uses the
> bare form, so a reader that only walks `all`/`any` returns nothing and matches
> nothing. That bug found 1 entry where there are 22.

### Models a Variant unlocks

Twenty-one entries exist only inside one Variant — the Technomancer in the
Cadaver Corps, the Matagot Hag in The Great Hunger, the Mendelist Ammo Monk in
the War Pilgrimage of Saint Methodius. The app offered every one of them to
every Warband of the faction, so a standard Black Grail list could recruit a
Leader it is not entitled to. `rules/variantLocks.ts` reads the lock;
`validate.ts` raises `variant-locked` when the Variant is changed out from under
a rostered model.

**The lock needs both halves, and this is the whole subtlety:**

| entry | + variant `set hidden false` | means |
|---|---|---|
| `hidden="true"` | yes | the Variant is what unlocks it — **a lock** |
| `hidden="false"` | yes | a re-reveal undoing another Variant's ban — **not a lock** |

The Janissary proves it: a core Iron Sultanate troop, banned by Nomads of
Al-Badia and Ghazi of the Golden Path, and re-revealed under Fida'i of Alamut.
Reading that reveal as a lock makes Janissaries exclusive to the Cabal of
Assassins — the opposite of the book. So the entry's own `hidden` attribute is
now carried through as `hiddenByDefault`; it is not recoverable from the
modifiers, and without it the two cases are indistinguishable.

An entry reachable another way is not locked either: the Desecrated Saint and
the Yoke Fiend answer to the Court's Chosen Sin selections as well as to the
Fang of the Seething Black.

> This cut both ways. Third-party detection originally read *any*
> variant-conditioned reveal as a gate, and so hid six ordinary faction units —
> Anointed Heavy Infantry, Sultanate Sapper, Shocktrooper, Desecrated Saint,
> Yoke Fiend and War Wolf — from every Warband that had not opted in. Same
> missing datum, opposite symptom.

### Wargear

Thirty-three weapons hang off the same six Variants — Greek Fire off the
Remnants of Byzantium, the Dane Axe, the Blood Eagle Banner, the Khyber Knife.
**None reaches the app today**, because the arsenal is built from the rulebook's
Armoury Tables (§3) and those are official. That is a property of how the
arsenal is sourced, not a guarantee, so a test asserts it rather than leaving it
to hold by accident.

### Hosts

The Disciple's `set hidden false` modifier also names its hosts — Iron
Sultanate, New Antioch and Trench Pilgrims. The Trench Dispatch, where every
other Mercenary's hosts come from (§7b), never mentions it, so before this it
fell through to the permissive default and all six Warbands were offered it.

## 7d. Loadout bundles

One selectable name that grants several items.

`Polearm and Shield` is a `selectionEntry` in the Mamluk Faris's `Loadout`
group with **no profile of its own**, which reaches a `Polearm` (Weapon) and a
`Shield` (Battlekit) through `infoLink`s. It therefore matched no weapon and no
Armoury Table row, and a roster holding it was told it was *"not in this
ruleset"* — which drops the item out of every legality check while telling the
player their list is only provisional.

### Why own-versus-linked is the safe distinction

An earlier attempt keyed on *"the entry's name differs from its profile's
name"* and produced `Automatic Pistol -> Stolen: Automatic Pistol` and
`Melee -> Knight Companion of the Bladed Fly` — aliases that would redirect
ordinary wargear to another entry entirely. It was thrown away rather than
shipped.

A bundle is narrower and checkable: it contributes **no profile of its own**
and hands out **two or more**, and its name resolves to nothing else in the
dataset. Across every catalogue that yields exactly two, both real:

| Bundle | Grants |
| --- | --- |
| `Polearm and Shield` | `Shield` + `Polearm` |
| `Sword and Pistol` | `Sword/Axe` + `Pistol` |

### Priced as one thing

The bundle carries the **entry's own** cost, not the sum of its parts'. Both of
these are free options in a `Loadout` group; pricing the parts out of the
Armoury Table billed the Mamluk Faris 7 Ducats for a Polearm the book hands it
for nothing.

### The profiles a bundle grants reach the Battlekit chapter

`Shield` is a generic Battlekit profile in the shared `.gst`. The chapter
prints `Trench Shield`, a **different** entry that also exists, so neither may
be renamed into the other; and the weapon emit deliberately skips Battlekit
links, because resolving them there turns a Black Grail Strain into equipment
anyone can buy. Granted and then unknown, the Shield counted against no limit
at all — a model could carry two.

So the build carries a granted profile nothing else names into
`dataset.battlekit`, as a third source after the rulebook and Warbands of
Trench Crusade. Its **section is derived from the chapter's own Type → section
pairings**, not from a mapping written in the pipeline, and an ambiguous one is
left unset: a wrong section is a legality error on a legal roster.

### "Unless otherwise stated"

The Battlekit Limits rule opens with those three words, and a model's own entry
is where the book states otherwise:

> A Mamluk Faris always has either a Greatsword, or a **Polearm and a Trench
> Shield**, or a Pistol and a Sword/Axe.

The catalogue names the generic `Shield` in that loadout rather than the Trench
Shield the book names, and only the Trench Shield carries the `Shield Combo`
stipulation. Policed against each other, the two halves of a loadout the book
hands the model raise *"Polearm is 2-Handed and cannot be carried with a
Shield"* — a legality error on a legal roster.

`battlekitBreaches` therefore does not judge one stated loadout's items against
each other. The exemption is scoped to items of **one** bundle, so a Shield
bought on top of a bundled one is still counted: the entry states what it
grants, not what may be added to it.

### Counters are not wargear

`Alchemical Ammuntion (Loaded)` is a hidden `selectionEntry` with a roster max
of **zero** that a modifier increments by one for each `Alchemical Ammunition`
the roster holds. It exists so BattleScribe can count purchases: no cost, no
profile, no rules, and a player cannot choose it. Eleven of these are emitted
as `dataset.counters`, and a roster carrying one no longer reports it as *"not
in this ruleset"* — which told the player their list was provisional over a
thing that is not an item.

They are found by that **signature** and not by the `(Loaded)` most of them
carry: the same shape without it is `Dog's Friend`, counting one marker per
`Man's Best Friend`, and four of the names are spelled `Ammuntion` — the
catalogue's own typo — so reading the name would need a table of misspellings.

Two guards, each for a case that was wrong before it was added:

- **Never a counter whose name is the name it counts.** `Satchel Charge` has an
  entry of this shape counting `Satchel Charge`, and a Satchel Charge is a real
  piece of wargear a model buys and throws. Dropping that name would lose the
  item rather than the bookkeeping.
- **A roster may carry the corrected spelling.** So the name is matched against
  the counter's own name *and* against the counted item's name plus that
  counter's parenthetical, which reaches `Alchemical Ammuntion (Loaded)` from
  `Alchemical Ammunition (Loaded)`. Both strings come from the catalogue.

### A territory perk the campaign writes

The app publishes no territory perk of its own. Sixteen invented ones were
removed because they rendered under the same *"Strategic Territory Perk"*
heading a derived rule would, so a player could not tell the app's invention
from the book.

That left the campaign hub with no way to have a perk at all, which is honest
but less useful than the group writing their own — provided the app says whose
rule it is. `TerritoryNode.perkSource` records that:

| `perkSource` | Meaning | Editable |
| --- | --- | --- |
| `published` | A rule a book prints — the Carcass Front Special Zone Outpost Bonuses, verbatim | **No** |
| `campaign` | A house rule the organiser wrote in the app, shown as *"House rule (set by this campaign)"* | Yes |
| absent | No perk | Yes — this is where a house rule starts |

`setTerritoryPerk` refuses a `published` territory and returns `false`.
Overwriting the book's own Outpost Bonus with invented text under a published
label is exactly the bug the sixteen removed perks were, so it is closed in the
store rather than only hidden in the UI.

Clearing the text clears the source with it: a house rule with no words in it
would render as an attributed rule that says nothing.

### An allowance a model's own entry states

*"Unless otherwise stated"* is the first line of the Battlekit Limits, and some
entries state otherwise. Warbands of Trench Crusade, under `Human Hands`:

> If a Takwin Homunculus with Human hands also has an Additional Arm, then it
> can have three 1-Handed Melee Weapons or one 1-Handed Melee Weapon and one
> 2-Handed Melee Weapon, and it can have three 1-Handed Ranged Weapons or one
> 1-Handed Ranged Weapon and one 2-Handed Ranged Weapon. **If it takes a
> Shield, then the Shield replaces one of the Melee Weapons** it can have but
> the Shield Combo rule cannot be used for any of its weapons.

`dataset.carryAllowances` carries these, and where one applies it **replaces**
the chapter's rule for that section — including the chapter's Shield
restrictions, which is the point: the app was calling a Homunculus's Siege
Jezzail illegal because the chapter forbids a 2-Handed weapon beside a Shield,
while this entry says the Shield replaces a *melee* weapon and forbids using
Shield Combo at all. Demanding the stipulation demanded something the model may
not do.

**Combinations, not hand arithmetic.** The book states alternatives, and they
are not a single capacity: this entry allows three items or three hands, while
another in the same book allows *"up to three 1-Handed OR two 1-Handed and one
2-Handed"* — three items in one branch and four hands in the other. Any formula
over one capacity number gets one of the two wrong.

**Only self-describing sentences are read.** `parse-carry-allowances.mjs` takes
the condition from the sentence itself (*"If a X with Y also has Z, then…"*), so
nothing about which Formula grants what is written in the app. The book states
four more allowances of the same shape that say *"It can have…"*, where *it* is
the entry the paragraph sits under; those need document structure this reader
does not have, and the build **reports** them rather than attributing them by
guess.

## 8. Migration of saved warbands

**Decided (Aug 2026):** existing saved warbands are not worth a general migration
path. The maintainer has confirmed that only **one** warband matters — a
1,320-Ducat Iron Sultanate *House of Wisdom* roster carrying substantial
hand-written lore. Everything else is discarded when the data is regenerated.

That removes the reconciliation-review screen from Phase 1's critical path. What
replaces it:

1. **A one-off import for the preserved warband.** Export it from the running app
   (`ExportModal` → Download JSON, which serialises the whole `Warband` object),
   commit it to `data-sources/fixtures/`, and write a migration that re-maps it
   onto corrected profiles.
2. **Narrative content is preserved verbatim, never regenerated.** Warband `lore`,
   `motto`, `patron`, `chronicleLog`, `notes`, and per-unit `lore`, `quote`,
   `titles`, `titleRecords`, `deeds`, `notes` are copied across untouched. Only
   *derived* fields — statlines, costs, keywords — are rebuilt from source.
3. **It doubles as a test fixture.** A real roster with campaign rules enabled,
   XP and advancements (`Ranged Proficiency [7]`, `Assassinate [4]`), an injury
   (`Leg Wound [31]`), a Glory-costed item (`Sniper Scope — 2 Glory`), an armoury
   stash and a Warband Variant is a far better regression test than anything
   synthetic. It exercises Glory costs, variants and options — the three things
   the current model cannot express.
4. **Anything that cannot be re-mapped is surfaced, not silently dropped.** The
   migration reports every unit it could not match rather than guessing.

A general ruleset-switching diff is still wanted eventually — switching between
*Latest GitHub* and *TrenchLine* needs it — but it moves to Phase 2.7 and stops
blocking the data work.

## 9. Open questions

- **`Combat Engineer` is missing from the catalogues** but present in the
  rulebook and the Dispatch. Decide whether TrenchLine adds it via a layer op
  (and ideally upstream a PR to the catalogues).
- **Faction identity.** With `FACTIONS[].rules` deleted as fabricated, decide
  what replaces it — real faction rules from the rulebook, or nothing.
- **Rulebook licensing.** The repo is public and already contains substantial
  verbatim rules text. Committing more extracted rules text under
  `data-sources/` is consistent with that but worth a deliberate decision.
  Options: keep as-is, move sources to a private submodule, or ship only
  derived values plus page citations.
