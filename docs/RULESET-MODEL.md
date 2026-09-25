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
                         ; factions?: string[] }          // faction slugs; REQUIRED on a weapon
  | { op: 'addBattlekit';  target: Ref; weapon: string }  // weapon BY NAME, unresolved unless exactly one
  | { op: 'unset';         target: Ref; field: string };  // DELETE the key — not `set` to ''

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
> → one `setCost` op naming those five in `factions`.

### `unset` is not `set` to an empty string

A weapon with no special rule carries **no `rules` key at all** — 69 of the 658
do — and the app tests the field's presence. Writing `""` would give it a rules
section containing nothing, which reads as *"this weapon has a rule and we lost
it"*. Deleting the key says what the printed entry says: there is no rule here.

It exists because the Dispatch **reprints** entries. The Gavel of Justice comes
back with Type, Range and Keywords and no rule, and the catalogue's `Wrath of
God` on it is what the Witchburner's new `Found Guilty` ability replaced — on
different terms, so keeping both would place the extra BLOOD MARKER twice.

### A weapon's name is one fact, stored twice

Forced kit carries the name the catalogue's `selectionEntry` used; the profile
it points at carries its own. Across the whole dataset these agreed everywhere
but one place: the Goetic Warlock's kit said `Iron-Clawed Hands` while its
profile said `Reaping Claws`, and the Dispatch calls the weapon `Flaying Iron
Claws`. Three names, one weapon — and a card printing one while the rules popup
printed the other.

So a `set name` on a weapon **follows through** to every kit entry pointing at
it, and `rules-build.mjs` then asserts the two agree. The assertion fails the
build on a ruleset that carries corrections; on `github-latest`, which promises
the catalogues exactly as published, it reports instead — the disagreement is
what the catalogues publish, and correcting it there would break the one thing
that ruleset is for.

**A weapon `setCost` must name its Armoury Tables, and is unresolved without
them.** A weapon is priced per table, and the app charges from the armoury
ROW — `priceOf` reads the row, not the profile.

This paragraph is new, and the field above used to read `scope?: Ref[]` with
the comment *"e.g. per-faction armoury tables"*. The example below it has said
"a five-faction scope" since the model was written. **Neither was ever
implemented**: the Dispatch layer omitted the field, and `applyLayer` wrote
`target.cost` on the one weapon profile the name resolved to first and touched
no armoury row at all. The result shipped for as long as the Dispatch has:
seven rows reading 15, one profile reading 10, and the number a player saw
depending on which screen asked. A field that is documented, never written and
never read is indistinguishable from one that does not exist — see DA-07.

A **unit** `setCost` takes no faction list: a unit is a single entry priced
from `unit.cost`. The two are deliberately different, and the op says which it
is through `target.kind`.

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
    layers: ['warbands-book', 'dispatch-01', 'carcass-front'],
    includeBeta: true,
    isDefault: true,
  },
];
```

The order is the precedence in §6, read bottom-up: `warbands-book` carries what
the rulebook states, `dispatch-01` lands after it so the newer source still wins
wherever the two speak about the same thing, and `carcass-front` is a separate
book that adds rather than corrects.

### Where a layer file lives

`loadLayer` looks in two places, in this order:

| Path | Holds |
|---|---|
| `data-sources/dispatch/<id>.layer.json` | the Dispatches |
| `data-sources/layers/<id>.layer.json` | every other transcribed layer |

`carcass-front` is in neither — it is generated from the PDF on every build
(§4, *Transcribed or generated?*).

### Adding a future Dispatch

Extract → transcribe to `data-sources/dispatch/<NN>.layer.json` → append
`'dispatch-NN'` to the `trenchline` ruleset. No dataset fork, no data rewrite.

### `warbands-book` — the rulebook rung, which had no layer

Precedence has read **Dispatch > rulebook > catalogue** since the model was
written, but the rulebook rung had only ever been applied through a
*resolution*, and a resolution settles a **conflict**: two sources that state
the same field differently. An empty catalogue field is not a conflict, it is a
**gap**, and no gap had ever been filled from the book.

`data-sources/layers/warbands-book.layer.json` is that rung. Nothing in it
changes a published value; each op is the printed entry reaching a field the
catalogue left empty, or a name the catalogue never caught up with — the
Mercenary `Combat Medic` is the book's **Sister of Saint Cosmas**, and the
Combat Biologist, who has no abilities at all in the catalogue, has two in the
book.

Two conventions make it checkable rather than trusted:

- **Every op addresses its target by id.** Two units are named *Combat Medic*;
  `findTarget` refuses an ambiguous name outright rather than picking one.

> **A correction.** This layer first shipped without the Sister's `MERCENARY`
> keyword, on the reasoning that no source stated it for her — the book's
> Keywords rows in that section print only the model's own, because the heading
> already says *Mercenaries*. That reasoning was wrong about the sources: the
> **Dispatch** reprints her entry and prints both (`Replace the Keywords with:
> MERCENARY NEGATE FEAR`, L654-655), and that reprint had no op. It has one
> now, in `dispatch-01`, which supersedes the book's `addKeyword` here — the
> two sources agree on NEGATE FEAR, and only the Dispatch states MERCENARY.
>
> Worth the note because the failure was in the survey, not the reasoning: I
> checked the book's Mercenary section and the Dispatch's *nine* transcribed
> keyword reprints, and never asked whether the Dispatch had a reprint with no
> op at all. It had two — hers, and the Desecrated Saint's.
- **Every op carries `_src`**, one or more `L<a>-<b>` spans into the extract.
  `scripts/lib/__tests__/layerTranscription.test.mjs` reads every span and
  fails unless the transcribed value appears in the lines it cites, so a line
  that drifts breaks the suite instead of shipping.

That test also reads `dispatch-01`, for the ops that cite lines — the older
ones cite pages (*"p.6 The Cult of the Black Grail Glory Items"*), which it
cannot read back, and those are left alone. Turning it on found three
citations that had drifted off their sentence and one keyword transcribed
without the `▶` the page prints; the drift had been invisible because nothing
had ever read a citation back.

It forgives exactly two things, both written down in the file: the `✥` bullet,
which marks where a named rule starts and carries no meaning, and the kerning
artefact that prints `+2DICE` in the second statline column only.

### The Dispatch's Mercenaries section

Pages 13–16 of Trench Dispatch #1 say *"Replace the Scripture Guardian, Goetic
Warlock and Witchburner Mercenary Entries with the following"* and reprint the
Tenderiser Maul. **No op had ever been written for any of it.** The app was
showing the catalogue's pre-Dispatch versions, and in four places that is not
merely out of date:

| What the app showed | What the Dispatch prints |
|---|---|
| Scripture Guardian with an **empty Battlekit** and Vengeful Scripture as an *ability* whose text ignores armour outright and works in Melee | three items it always has, and a Special / 18" weapon whose IGNORE ARMOUR is conditional on a Critical Success |
| Tenderiser Maul with **Swinging Blow only** | **Mulch**, of which Swinging Blow is one of two choices — the other, Crushing Blow, is a +2 INJURY MODIFIER |
| Gavel of Justice with **CRITICAL** and the old `Wrath of God` | **CRITICAL, FIRE**, and no rule: `Found Guilty` on the Witchburner replaced it |
| Witchburner **not carrying** the Gavel that `Found Guilty` triggers off | *"always has Reinforced Armour, a Combat Helmet, and a Gavel of Justice"* |

A forced weapon also now shows its profile on the card. The row used to be a
name and its Keyword chips — the whole of Reinforced Armour, and almost none of
Vengeful Scripture — so the model that always carries a weapon saw less of it
than the model that paid for one.

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
│                             │                   │     + rosterpaths.json
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
| 5 | `rules:build` | Emits `src/data/*.generated.ts` + `provenance.json` + `rosterpaths.json` ([`ROSTER-PATHS.md`](ROSTER-PATHS.md)). Runs 1–4 first. |

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

### Freshness: what the app is pinned to

`rules:fetch` pins the catalogues by commit SHA, and the dataset ships that as
`meta.baseCommit` together with `meta.baseFiles` — the manifest's own list of
what was pinned. `compareToUpstream` uses both to answer the only question a
reader can act on: **has anything this build is made of changed upstream?**

Not a commit count. Upstream commits READMEs and roster files like anyone else,
so "40 commits behind" says nothing about whether the rules moved; what counts
is which of the pinned catalogue files appear in the compare. The file list is
shipped rather than kept in the app because the app's copy had already drifted
— `GITHUB_CATALOG_FILES` in `githubSync.ts` was missing `Campaign Rules.cat`,
so an upstream change to the injury, skill or exploration tables would not have
registered.

A failed check **throws**. Reporting "up to date" when the comparison could not
run is the fabricated-commit failure wearing a different hat, and worse in one
way: a wrong "current" is exactly what stops someone looking.

### Names: the books decide

A BattleScribe gear entry carries **two** names — the `selectionEntry`'s and
its profile's — and this pipeline ships the profile's. Usually they agree.
Where they do not, it is often deliberate structure: a `Swiss Guard` entry
holding a `Papal Courage` ability profile, or the Court's `Claimed: Automatic
Pistol` marking a looted copy of a New Antioch weapon. Sometimes it is a
transcription slip in a community catalogue, and then the app ships an official
weapon under a name **no official document prints**.

That is not cosmetic. A layer op targets an entity by name, so a slip makes the
op miss:

> The Trench Dispatch adds the FUMBLE Keyword to the **Demonic Aura Grenade**.
> The rulebook prints that name in the Glory Items table and four times in its
> rules text; the catalogue's own entry agrees; its *profile* says "Demonic
> Grenade". So the app carried the weapon under the profile's name, the op
> reported `target not found` on every build, and FUMBLE never reached a
> player.

`reconcileGearNames` in `scripts/rules-build.mjs` settles it on the project's
own principle — **the books are the authority, the catalogues are the
convenience.** A rename happens only when all three hold:

1. the two names are a **spelling slip** — a letter changed (*Catphract*,
   *Elixer*) or a single word dropped (*Demonic Grenade*, *Call of Flesh*).
   Character distance alone does not catch the second: "Demonic Grenade" is
   only 0.75 alike to "Demonic Aura Grenade", below any threshold that does not
   also sweep in genuinely different entries;
2. **neither name contains the other**, which is what excludes the deliberate
   decorations — `Claimed:`, `Stolen:`, `Pilfered:`, `Secrets of`, a Campaign
   Rules `[9]` roll number. A first pass without this guard renamed 123 entries
   and would have collapsed entries the game keeps apart;
3. the books print **exactly one** of the two. Both attested or neither, and
   nothing is touched — so this can never invent a third spelling or choose
   between two real ones. A pair where neither is printed is reported.

Three renames result today: *Demonic Grenade* → *Demonic Aura Grenade*, *Call
of Flesh* → *Call of the Flesh*, *War Cross* → *Warcross*. Each keeps
`profileName` so the app's name can be traced back to the catalogue's.

#### The same two names, on a unit

Units have the problem too, and it bit in a different place. A unit shipped
only its **profile** name, so a model the rulebook names by its **entry** could
not be found from the rulebook's own words:

| rulebook | selectionEntry | profile |
| --- | --- | --- |
| Anchorite Shrine | Anchorite Shrine | Anchorite |
| War Wolf Assault Beast | War Wolf Assault Beast | War Wolf |
| Grail Thralls | Grail Thrall | Thrall |

`reconcileGearNames` is not the answer here: none of these is a spelling slip,
each name contains the other, and both spellings are real and wanted. The unit
simply carries `entryName` alongside `name` now — absent where the two agree,
so its presence means *the books may call this model something else*.

That resolved three of the four models the Promotions tables named and the
dataset appeared not to have. Plural, parenthetical and Latin-plural spellings
(`Hounds of the Black Grail`, `Homunculi (House of Wisdom)`) are reduced in the
parser, because they are spellings of one name.

One case is left, and it is not a spelling at all. The rulebook's `Fly Thralls`
is the catalogue's **Winged Thrall** — a rename — and the catalogue reaches it
through an *option* named `Winged` under the `Grail Thrall` entry, so neither
of the unit's two names is the book's. A matcher loose enough to bridge that
would mismatch half the table, so it is recorded instead, with a citation on
each side, in `data-sources/rulebook/promotion-model-names.json`.

That file states **name equivalences only** — never a cost, a statline, a
keyword or a constraint. Both directions fail the build: a book name that
resolves to nothing, and an equivalence that nothing needs any more. The second
matters as much as the first, because an equivalence that has outlived its
drift is a claim about the data that has quietly stopped being true.

**An unresolved layer op now fails the build.** It used to print and carry on,
under a comment that already said why that was wrong — "a published rule the
app does not have — the one thing this pipeline exists to make visible" — while
the build went green. One op sat unresolved for the whole of that time, and the
line was read as noise on every build.

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

> **The Trauma Table was the exception, and is not any more.** Until
> 2026-09-19 `parseTraumaTable` read eighteen of its twenty-two rows from
> `Campaign Rules.cat` and only the four the catalogue cannot express from the
> book — inverting this order for the one table whose text is read back to a
> player as a rule to apply. Fourteen rows differed. Most were wording, but
> **24 Dark Memory was a different rule entirely** (the catalogue makes the
> model FEAR every enemy in a rematch; the book gives −1 DICE to Melee Attacks
> against that Warband), **16 Chest Wound** named the wrong dice pool, and
> **15 Lost an Eye**, **34 Muscle Damage** and **35 Minor Wound** each gained or
> lost a clause. The catalogue is revision 5 of a community transcription and
> predates 1.0.2, whose changelog rewrites only Head Wound and Captured — so
> these were drift, not errata the app was behind on. All twenty-two rows now
> come from the rulebook and the catalogue supplies row names and a drift
> report. See RR-01 in the rules review, opened separately as PR #58.

> **Limited Potential, and the Brazen Bull: precedence working.** The rule is
> stated twice. The rulebook prints a table of seven models on p.111 that
> *"cannot have more than 7 Experience Points"*; the catalogue puts a
> `LIMITED POTENTIAL` keyword on the unit. The two agree on all seven — and
> then `dispatch-01` **replaces the Brazen Bull's whole Warband Entry**, and
> the keyword row it prints (p.10: SULTANATE ARTIFICIAL FEAR NEGATE SHRAPNEL
> STRONG TOUGH) has no `LIMITED POTENTIAL` in it. This is not drift and not a
> stale catalogue: it is the Dispatch changing a model, which is what the
> Dispatch is for, so the Bull's Experience is no longer capped.
>
> The consequence for code is that `experienceCap` reads the **keyword**, not
> the rulebook's table, because only the keyword carries the layer. The table
> still ships as `campaign.promotions.limitedPotential` — provenance and a
> cross-check — and `promotionKeywordDrift` prints any model the two disagree
> about on every build, so a future divergence is visible rather than silently
> preferred. Note also that the pre-layer catalogue is the wrong thing to
> compare against: a layer that overwrites a field does not rewrite the entry's
> `sourceFile`, so the Bull's provenance still reads `Iron Sultanate.cat` and
> its unlayered keywords still include the one the Dispatch removed.

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

### `campaign.victoryPoints` — the scale a season is won on

Derived from rulebook p.95 by `parseCampaignVictoryPoints`:

```ts
{ win: 15, loss: 7, draw: 10 }
```

> *"In a campaign you score Campaign Victory Points for each game that you
> play… At the end of the campaign, the player with the most Campaign Victory
> Points is the winner. In the case of a tie, all tied players are joint
> winners."*

**The total is derived, never stored.** `campaignVictoryPoints(dataset,
member)` computes it from the win/loss/draw record the campaign already keeps,
so there is no new field to sync, no second writer, and nothing that can drift
from the results it is computed from. A stored total would be one more number
two members could disagree about after a merge.

Three things the parser refuses on, each proved by sabotage: a bullet that
stops matching, a scale that is not ordered `win > draw > loss` (which is what
crossed bullets look like — 7 for a win and 15 for a loss is a working scale
that decides every season backwards), and a loss worth nothing.

**Not counted here.** Two Exploration results move Campaign Victory Points
outside the per-game scale: `16 Treasure of the Holies` scores D3, and
`23 Patron's Visit` exchanges up to 10 ☼ for the same number of points. Neither
is a function of a win/loss/draw record — one is a die roll, the other a
decision at the table — so both need an adjustments ledger the campaign does
not have yet. `campaignVictoryPoints` is the per-game total and says so.

**Optional on the type**, for the same reason as `traumaProcedure`: a ruleset
built before this existed states nothing, and "no scale" must stay
distinguishable from "everyone on zero".

---

### `campaign.promotions` — who may be Promoted, and how much Experience

Derived from rulebook pp.105–111 by `parsePromotions`. It carries the two
bounds that apply *before* any dice are picked up, and the four numbers that
decide what happens once they are.

```ts
interface PromotionRules {
  maxElites: number;                     // 6 — the step is skipped at this many
  poolBase?: number;                     // 1 — `1D6` before any Deeds
  poolPerDeed?: number;                  // 1 — `plus 1D6 for each Glorious Deed`
  promoteOn?: number;                    // 6 — the face that Promotes
  autoAfterMisses?: number;              // 5 — misses after which the next die is automatic
  cannotPromote: PromotionTableRow[];    // p.107
  limitedPotential: { maxXp: number; factions: PromotionTableRow[] };  // p.111
}

interface PromotionTableRow {
  faction: string;     // the heading as the rulebook prints it
  factionId: string;
  models: { name: string; unitId: string | null; unitName: string | null }[];
}
```

Three things about it are load-bearing:

- **Every model resolves to a `unitId` at build time, or the build fails.** The
  app never matches these by name — see *Names: the books decide* above for why
  `Fly Thralls` makes that impossible.
- **`faction` keeps the book's own words.** The headings are spelled three ways
  across three sources (`The Sultanate of the Iron Wall` / `Iron Sultanate` /
  the unit's `Iron Sultanate`), and a failure that reports a slug sends a
  maintainer looking for a string that appears on no page.
- **`models: []` is an answer.** Two factions have a bare `-` in each table.
  That is the book saying "none", not a row we failed to read.

`limitedPotential` is provenance, not the operative rule — see the Brazen Bull
note under precedence above.

**Optional on the type.** A ruleset built before this existed says nothing, and
"no rules" must stay distinguishable from "anyone may be promoted, without
limit" — which is what the app did for two years, with a switch on the unit
card. The four dice numbers are optional for the same reason one step down: a
ruleset built between FD-06a and FD-06b carries the bounds and not the dice,
and a pool of `0` is a real answer that has to stay distinguishable from a
ruleset that cannot say.

Each of the four is read from its own sentence on p.105 and guarded, because a
silently-missing number here is a rule the app applies wrongly rather than a
build that stops: `promoteOn` must be a face a D6 has (1–6), and
`autoAfterMisses` must be at least 1, or the build fails naming the sentence it
could not read. `rollPromotions` checks the five-miss rule *before* it reads
the die, so the sixth die Promotes whatever it rolls.

**The miss count lives on the Warband, not the step.** `warband.promotionMisses`
persists between games — five misses spread across three games still make the
sixth die a Promotion — so it is `durable` in the roster file. See
[`ROSTER-FILE.md`](ROSTER-FILE.md#progression-skills-advancementrolls-and-the-legacy-advancements).

### `campaign.quartermaster` — the step's own two rules

Derived from rulebook pp.123 and 125 by `parseQuartermasterStep`.

```ts
interface QuartermasterStep {
  retireInjured: { atScars: number; text: string };   // p.123
  gloryItems: { needsDiscovery: boolean; text: string };  // p.125
}
```

`retireInjured.atScars` is **two**, and it is not
`traumaProcedure.battleScars.unfitAt`, which is three. The two counts are one
apart and they are opposite rules — `unfitAt` is the book removing a model in
the Trauma Step whether the player likes it or not, `atScars` is the player
being *allowed* to retire one in the Quartermaster Step while it is still fit to
fight. Reading either for the other either strands a veteran on the roster or
deletes it, so both are parsed, both throw on a wording that stops saying what
they say, and `src/rules/retire.ts` carries the distinction in prose.

`gloryItems` is the gate, not the ceiling. What a particular discovery permits —
*"you can purchase Glory Items costing 5 ☼ or less"* — is stated by that
discovery and read from `campaign.exploration.locations`; duplicating the three
ceilings here would be a second source that goes stale the first time the
Dispatch prints a fourth merchant.

### `campaign.scenarioTables` — which scenario a campaign game uses

Derived from rulebook p.96 by `parseCampaignScenarioTables`. Three D6 bands and
a Final Battle that is named rather than rolled, with every scenario name
resolved against `dataset.scenarios` — a table naming a scenario the ruleset
does not carry fails the build rather than offering a game nobody can play.

Three things are checked at build time because a silent hole in any of them
would read as a plausible table: each band covers 1 to 6 with no gap, the bands
tile their game range in order with no gap, and the Final Battle is the game
after the last band. The sixth row of each table is recorded as a result in its
own right (`choose: true`) with its own sentence, because it is one — *"The
player who has played fewer games chooses one of the scenarios listed above"* —
and rerolling it would take the compensation the book gives the player who is
behind.

### The Glory Item Tables are armoury rows

Derived from rulebook pp.125–127 by `parseGloryItemTables`, and joined to each
faction's existing `Armoury` as a section named `Glory Items`. Fifty-four rows
across the six rulebook factions.

They live in the armoury rather than in a collection of their own because every
reader of an offer already goes through `armouryFor` / `offersOf` / `priceOf` /
`restrictionsFor`, and a second collection would be a second place each of them
has to learn about. It is also the shape the Dispatch's own ops assume — *"Add
the following entry to the BLACK GRAIL Glory Items Table"* had no table to add
to, and reported as unapplied on every build.

**The section is load-bearing.** Page 125 distinguishes a Glory Item from the
Glory-priced Battlekit in a faction's Armoury Table, and only the first needs an
Exploration discovery to buy, so the gate in `src/rules/gloryItems.ts` keys on
`row.section` and never on `row.cost.glory`. A Troop Flag is 1 Glory and needs
no discovery; a Knighthood is 4 Glory and does. `recruitable` therefore lets a
Glory Item keep its own section where it normally lets the Battlekit chapter's
win — a Sniper Scope is Equipment in that chapter and would otherwise walk
straight through the gate.

Three extraction hazards are read from the page rather than guessed:

| Hazard | Example | How it is read |
|---|---|---|
| A footnote marker glued to a limit | `Limit: 11`, `Limit: 33` | Split only when the table defines a footnote of that number, and the footnote's text is carried onto the row as a stipulation. A multi-digit limit with no matching footnote throws |
| A name wrapped across two lines | `Great Banner` / `of New Antioch` | Buffered and joined, the same repair ARM-1 made for the Armoury Tables |
| A price printed as a range | `Trench Dog … 1-3 ☼` | `cost` is the lowest, so nothing is refused that the Warband can afford, and `priceRange` keeps the row as printed |

A Glory Item's profile is resolved from `Campaign Rules.cat` and from nowhere
else, because that is the catalogue the Glory Items are entered in. Matching by
name across every catalogue leaked: the Iron Sultanate catalogue carries a
`Rocket-Propelled Grenade` gated on Nomads of Al-Badia, which `thirdPartyGate`
classes as unofficial content, and the rulebook prints an official one in five
Glory Item Tables. A row that resolves to nothing keeps `weaponId: null`, which
is the answer the Armoury Tables already give for Battlekit the catalogues lack.

### `hidden` on an Ability profile, and on an entry

A profile marked `hidden="true"` is not on its entry until something reveals it,
and the catalogues use it for both a MODEL and an ABILITY:

```
selectionEntry  hidden="true"   the model is off the recruit list
profile/Ability hidden="true"   the ability is not printed on the entry
```

Both are now recorded — `UnitProfile.hiddenByDefault` and `Ability.hidden` — and
they must not be confused, because the modifier that reveals each is written the
same way. That is precisely what the modifier dedup was doing: it compared rules
with the origin discarded, so an entry-level reveal and a profile-level reveal
with the same condition became one statement. `modifiersOf` now keys `hidden` on
its origin. Measured on the shipped catalogues, four rules are stated on more
than one profile and every one of them is `hidden`; thirteen are stated on both
an entry and a profile, of which one is. Keying just `hidden` recovers all five
and changes none of the other twelve.

`src/rules/applyVariant.ts` reads the two halves together. A condition it cannot
evaluate leaves the ability exactly as printed, and `unknownVisibilityLeaves`
counts those across the dataset so the rule cannot fail quietly; it is zero on
the shipped catalogues, asserted by a test.

### `secondaryProfile` from the catalogues

A model entry may state more than one Unit profile, and only the first of them
is a recruit. The `Grail Thrall` entry holds `Grounded` and `Winged` as
sub-entries with a Unit profile each, for what the book prints as one entry with
one cost; the Trench Dog's `Specialization` group holds four or five more, which
p.121 states are *"special abilities"* the dog is given, not models.

The parser marks every Unit profile after the first `secondaryProfile: true`
with `parentEntryId`, which is the shape `carcass-front-layer.mjs` already uses
for the Martyr Penitent and `recruitable()` already filters. Nothing is
invented: the statline is that profile's own, and only what the sub-entry does
not state — its cost, roles, keywords and abilities — is filled from the parent
entry that does, so a sub-entry with a price of its own keeps it.

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
is a named modifier a warband selects at creation, on top of its faction. The
dataset carries 27, and they are modelled: their ops are derived from the
catalogues, their special rules are shown on the muster screen, and — since
RULES-3 — the economy one of them states for itself is enforced rather than
merely printed. The "models none" this section used to describe was true when
[`AUDIT.md`](AUDIT.md) §1.6a was written.

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
  thresholdDelta?: number;    // e.g. Papal States: -200 against every table row
  reinforcementGlory?: number;// e.g. Papal States: 4 per Reinforcements call
  economyFrom?: string;       // the rule the three above were read from
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
A campaign Warband's starting Glory is published rather than chosen, so the
field is ignored for one — but "published" is not the same as "zero", which is
the assumption the next section exists to correct.

### The economy a Variant states for itself

Almost every warband musters on its faction's 700 👑 and no Glory. One does not.
The Papal States Intervention Force's **Specialist Force** rule (Warbands p.35,
as changed by the 1.0.2 errata) states four things, and the app enforced none of
them until RULES-3 — while displaying the rule that states them on the muster
screen:

| Book text | Field | Applied in |
|---|---|---|
| "You have 500 👑 and 11 ☼ to recruit a … Warband" | `budget` | `musterBudget()` → the muster screen |
| "its Threshold Value is reduced by 200 👑" | `thresholdDelta` | `forceLimits()`, so the Force validator and `reinforcementAllowance()` both get it |
| "gains 4 ☼ each time it calls for Reinforcements" | `reinforcementGlory` | the post-battle wizard's Reinforcements Step |
| "for a one-off game … reduce by 200 👑, increase by 11 ☼" | — | an unrestricted Warband already owns both numbers; the rule tells the player what to agree, and there is nothing for the app to enforce |

All four numbers are **read from the rule's prose** by `parseVariantEconomy()`
in `scripts/lib/parse-warbands.mjs`, never typed — the catalogues encode no
budgets at all, so the prose is the only source. Both sources carry the rule in
different spellings (glyphs in the PDF, words in the catalogue), the parser
handles both, and `rules-build` requires them to agree: a disagreement means one
has been errata'd and the other has not, which is a resolution for a maintainer
rather than a coin-flip for the build.

`thresholdDelta` is a signed **delta**, not a replacement: the published table
still governs and the rule shifts it, so it applies to every row including the
held-at-last-row value past game 12.

A survey of every faction and variant across the Warbands book, the digital
rulebook, the 1.0.2 changelog, the commentaries and the Carcass Front book found
this is the **only** exception — 1 of 27 variants, 0 of 8 factions. The parser
does not treat that as licence to assume: a rule that states a purse it cannot
read throws, because "no economy stated" and "we failed to read the economy" are
indistinguishable to a caller and the second one musters a warband on the wrong
money in silence.

One related rule is deliberately **not** modelled here, because it is not a
starting allowance: the Cavalcade of the Tenth Plague prices Communicants at
3 ☼ each instead of Ducats ("Stolen Communicants"). That is a per-model cost
change, and it belongs to the unit's own entry.

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

#### A host stated by alignment, not by name

Some Mercenaries are offered to a **side** rather than to a list: *"A Sin Eater
is Fallen and can be recruited as a Mercenary by Fallen Warbands."* Writing that
out as a list of the Fallen factions is how a list goes stale — the Heretic
Naval Raiders were missed by exactly that kind of hand-written list.

So the unit carries `allowedAlignment?: 'Faithful' | 'Fallen'` and each
`Faction` carries its own `alignment`, parsed from the Warband Creation block
(`parse-warbands.mjs`). `recruitable.ts` resolves the one against the other at
hydration, and the resolution order is:

1. the Dispatch's explicit `hosts`, if the layer states any;
2. the unit's own `allowedFactions`;
3. every faction matching `allowedAlignment`;
4. otherwise, all factions.

`parse-warbands.mjs` **throws** when a Warband Creation block states no
alignment rather than defaulting to one, because a guess here offers models to
the wrong Warbands (rule 2). `rules-build.mjs` fails the build if a unit's
`allowedAlignment` matches no faction at all, so a typo cannot ship as "nobody
may recruit this".

### A Mercenary may have no Battlekit but its own

> *"A Mercenaries' Battlekit cannot be removed or lost over the course of the
> campaign for any reason, and they cannot have any other Battlekit."*
> — Warbands L9751-9752

That is a **total** gate, not a weapons gate. The Digital Rulebook's BATTLEKIT
LIMITS (L3810-3818) defines Battlekit as weapons, grenades, armour, shields and
equipment alike, so the default for a Mercenary is nothing at all. The app had
been selling them gear the game does not let them carry.

Three things decide it, and each is a deliberate choice:

**Keyed on the Mercenary ROLE, not the MERCENARY keyword.** Four of the
fourteen Mercenaries do not carry that keyword — the Witch Coven Matriarch,
Pairika, the Trench Dog and the Disciple of St. Roch. All fourteen carry the
role, so the role is what the gate reads.

**The one exception is a field, not a name.** The Scripture Guardian "must have
either two 1-Handed Melee Weapons or one 2-Handed Melee Weapon" bought "from
your Faction Armoury Tables at their normal Cost" (Dispatch L748-753). That is
`UnitProfile.mercenaryMayBuy`, set by a cited layer op. `equipGate.ts` exists
*because* the modal used to decide this with regexes over model names, and one
more of those would undo the point of the file. `'Melee'` means a weapon whose
`range` is exactly `Melee` — a Pistol's `Melee/16"` is a Ranged weapon usable
in melee, not a Melee Weapon.

**A Mercenary whose Battlekit the app does not hold is NOT refused.** The rule
forbids any *other* Battlekit, and where the entry's own kit has not been
modelled the app cannot say what "other" means. The Mamluk Faris is the live
case: the book (L10055-10063) gives it Reinforced Armour, a Combat Helmet, a
Jezzail with Alchemical Ammunition *from the Iron Sultanate list*, and a
three-way loadout choice that changes its Armour Characteristic — and the
dataset has none of it. Refusing everything would leave it permanently
unarmed, which is worse than the over-permissive sheet it has today. Failing
loudly is the rule; asserting a fact the data does not support is not.

Both halves read the same field, so a greyed-out button and a legality error
can never disagree: `equipGate.ts`'s `mercenaryRefusal` stops the player
reaching it from the equip sheet, and `validate.ts`'s `checkMercenaryKit`
catches a roster that already has it — an import, a cloud pull, or a Warband
built before the gate shipped. A Guardian with neither two 1-Handed nor one
2-Handed Melee weapon is a **warning**, not an error: unfinished is not
illegal, and refusing the roster would stop a player saving mid-build.

### A Deed an ability brings with it

Battlefield Vivisection reads *"add the Gather Knowledge Glorious Deed to those
normally available in each scenario you play."* The Deed is not a property of
the scenario, it is a property of having that model on the roster — so the
`Ability` carries it:

```ts
grantsDeed?: { name: string; description: string };
```

The field carries the Deed with the ability that grants it, so nothing has to
hand-maintain a second list that could disagree. Play Mode's deed list is the
scenario's printed Deeds plus these, across **every** participating Warband —
the Deeds available in a game are what the game offers, and each side claims
from the same list.

**Read from the dataset, not from the roster's `profileSnapshot`.** A snapshot
is frozen at recruitment and `recruitable.ts`'s `abilityOf` copies only `id`,
`name` and `description`, so no roster in existence carries `grantsDeed` and
one recruited before this shipped never would. Which Deeds an entry grants is a
rules fact about the entry, not a stat the model was hired with — so
`rosterDeeds` looks it up live, matching on `entryId || id` because that is
what the hydrated profile's `id` is. A Warband saved months ago gets the Deed
too.

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

**Two ways an allowance is attributed, and both must hold.** A sentence that
names its own condition (*"If a X with Y also has Z, then…"*) is believed as
written, so nothing about which Formula grants what is in the app. The rest say
*"It can have…"*, where *it* is the entry the paragraph sits under — the book
prints one heading per entry (`0-1 Desecrated Saint - Cost: 140 👑`), and that
heading is the *it*. Structure alone is not trusted, because the extracted text
carries page furniture between entries: the heading is **cross-checked against
the prose**, which must name the model the heading names, and an allowance that
cannot clear both is reported rather than guessed at.

Four were reported and unenforced before this. Three were entries — the
Desecrated Saint, the Scripture Guardian and the Anchorite Shrine — and the
fourth was the **STRONG** Keyword, which states a carrying rule about a Keyword
rather than a model and is read by `parseKeywordCarryRules`. It is detected by
the glossary's own shape (`STRONG (Effect):`) and not by where it falls, because
the book prints two worked example entries *before* the glossary: by position
the glossary sits inside an entry and belongs to none of it.

**A Keyword that changes how many hands a weapon needs applies here too.**
An entry's allowance replaces the chapter's *rule*; it does not put the model
outside the Keyword Glossary. STRONG — *"it can equip and use one 2-Handed
Melee Weapon as if it were a 1-Handed Melee Weapon"* — and CUMBERSOME, which
opts a weapon back out of it, are read from `battlekitLimits.byKeyword` and
applied by `effectiveHands` **before** either branch counts anything.

This was the second bug reported on the same model. The conversion originally
lived inside the chapter's hand arithmetic, and a model whose entry states an
allowance never reaches that branch — so a Takwin Homunculus with Human Hands,
an Additional Arm and Inhuman Strength was told a Zulfiqar, a Great Sword and a
Shield was more Melee Weapons than its entry allows. Its entry allows three
1-Handed Melee Weapons with the Shield taking one of them, and STRONG makes the
Great Sword one of them: three of three, legal. The app had the allowance, had
the conversion, and applied them in two places that never met. Anything that
changes what a weapon *is* has to be resolved once, before the counting, or the
next branch added will miss it the same way.

**Modality: a ceiling is enforced, a floor is recorded.** The three entries do
different things with the combinations they name:

| Modality | Stated as | Example |
| --- | --- | --- |
| `permitted` | *"can have up to…"* | Desecrated Saint, Takwin Homunculus |
| `required` | *"must have either…"* | Scripture Guardian |
| `innate` | *"is armed with…"* | Anchorite Shrine |

All three **cap** what the model may carry, and that is what `battlekitBreaches`
enforces. The last two also state a **floor**, and `noOtherBattlekit` (the
Desecrated Saint's *"It cannot have any other Battlekit"*) closes the entry off
entirely. Those are recorded on the allowance and **printed by the build** —
*"ceiling enforced, floor recorded only"* — rather than enforced. A rule we have
decided not to enforce yet and a rule nobody knows went unread are different
things, and only the first is acceptable.

**An unconditional allowance is matched on the entry, never on `requires`.**
`requires` is empty for these, and `[].every(…)` is true — so matching on it
alone hands the Desecrated Saint's several arms to every model in the game.
`CarrierContext.modelName` carries the *entry's* name (not what the player
called the model), and with no entry name supplied the chapter's limits stand.

**A guard on the alternatives.** The book interposes clauses inside a list —
*"up to three 1-Handed Melee Weapons **from The Court's Armoury Tables** or two
1-Handed Melee Weapons and one 2-Handed Melee Weapon"* — and a single pattern
spanning the list stops at the first `Weapons`, never sees the `or`, and keeps
the last fragment. That is how the Desecrated Saint read as *"one 2-Handed Melee
Weapon"*. The combinations are now built from the connectors between items, and
the build **fails** where a sentence has an `or` between two items of one kind
and fewer than two combinations came out of it. The guard is checked against the
sentence, not against a list of entries the reader keeps, so it cannot pass by
agreeing with itself; reverting the connector reading makes it fire.

## 7e. Who stocks a piece of kit

The Armoury Table is what a faction may **buy**. It is not the only way gear
reaches a model, and the legality engine used to treat it as though it were:
everything a model carried that the table had no row for was reported as
*"not in the Iron Sultanate Armoury Table"*. Driving the owner's August export
through the real importer produced five such findings and none of them was a
purchase (FD-17 finding 3, with Order 35's correction to finding 1):

| Reported as unstocked | What actually stocks it |
| --- | --- |
| Weaponized Shovel | the Sapper's own fixed kit — *"A Sultanate Sapper always has a Shovel"*, Warbands L4739 |
| Coordinated Engagement (×2) | the FIRETEAM profile a Fireteam option grants |
| Secrets of Takwin | the Jabirean Alchemist's own entry, Warbands L5248 |
| Fire Shield | the Human Hands Formula — *"It can also have a Trench Shield or a Fire Shield"*, L5382 |
| Curative Fluids | an Exploration find, out of the Campaign Rules catalogue |

The ruling: **entry-granted kit is stocked by the entry and is never measured
against the Armoury Table.** `rules/entryGrants.ts` holds it, and it is
consulted only *after* `stocks` and `stockedAnywhere` have both said no — so
an item the faction really does buy is answered by the table first and the
grant is never reached.

Each granter is derived, never a list of item names:

1. the model's own forced Battlekit, by entry id or by any name the kit entry
   prints;
2. an option the model holds, by name;
3. an option the model holds whose own rules text says the model may have the
   item;
4. a Battlekit profile, which the Armoury Tables do not sell;
5. the Campaign Rules catalogue, which is not a faction armoury.

**4 and 5 are measured, not assumed,** and `rules/__tests__/entryGrants.test.ts`
re-measures them on every run: of the 334 weapons the catalogues type
`Battlekit`, exactly one is also an Armoury Table row (the Cult of the Black
Grail's Compound Eyes Helmet, reached by `stocks` long before this), and of the
155 entries in the Campaign Rules catalogue, none is a row in any faction.

### A link names the entry; a roster records the profile

Rule 1 needs `ForcedBattlekit.profileNames`, which is new. The shared `Shovel`
entry (`Equipment.cat` L343) nests an `Include Weapon Profile?` child whose
profile is called **`Weaponized Shovel`** — and that is the name NewRecruit
writes. Matching the Sapper's kit on the link's name alone therefore missed the
Sapper's own Shovel. `forcedKitOf` now carries every name a kit entry prints,
its own and one level of children's; one level is enough, because the child
exists to hold a profile rather than more children.

### Reading a permission out of rules text

Rule 3 matches on what the text **says**, not on the option's name: the options
that grant gear are not a class the catalogue marks — Human Hands is an
Alchemical Formula, filed beside Wings and Two Heads, which grant nothing.

Two traps, both live in the catalogues:

- **A clause that forbids is not a clause that permits.** The same paragraph
  says *"It cannot use its Pummelling Blows ability if it is armed with any
  Melee Weapons"*, and the House of Wisdom's copy grants and withholds in one
  sentence — *"…though they cannot select ELITE only items, grenades or items
  limited to specific units"*. A clause carrying a negation grants nothing.
- **A name has to begin a noun phrase.** A word boundary is not enough: in
  *"a Trench Shield or a Fire Shield"* the bare name `Shield` is preceded by a
  space either way, so a boundary test lets an item called `Shield` collect a
  grant written for two other ones. The word before the name must be a
  determiner, a conjunction or the permitting verb.

### What a model IS, for a restriction that names a kind of model

FD-17 finding 2, in the same measurement. The Iron Sultanate's Reinforced
Armour row reads *"ELITE & Janissaries only"*, and an `X & Y only` stipulation
admits either — so a Favoured Kavass, an Azeb **promoted** to ELITE, may wear
it. The gate agreed; it was being handed the wrong subject.

`toRoster` set `keywords` from the dataset entry alone and never set `roles` at
all. An Elite Promotion does not rewrite the entry — it writes `Elite` onto the
model's own `profileSnapshot` — so no promoted model could satisfy a
requirement naming ELITE, and the owner's Idris the Relic Hound was refused
armour the book gives it.

Both halves are **unioned**, never one replacing the other: the entry says what
the model is by type, the model says what it has become. The `name` stays the
entry's, because `matchesIdentity` matches loosely by containment and `u.name`
is the player's own text — a model someone called *"Janissary Hunter"* would
otherwise let itself through every Janissary-only row in the table.

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
