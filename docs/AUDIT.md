# Codebase Audit — August 2026

Audit of TrenchLine at commit `80f3451`, the last commit of the original
AI-generated build. Every claim below is backed by something reproducible from
the repository or from the official sources listed in
[`DATA-SOURCES.md`](DATA-SOURCES.md).

## Summary

| Area | State |
|---|---|
| Build & typecheck | Passing (`next build` needs `NODE_ENV=production`; see `CLAUDE.md`) |
| Game data accuracy | **Critical** — 97% of checkable unit statlines are wrong |
| Roster validation | **Missing** — the core builder feature does not exist |
| Mobile / tablet | **Critical** — one hard bug plus systemic desktop-only layout |
| Documentation | **Absent** — README describes a different tech stack |
| Tests / CI | **Absent** — no test runner, no workflows |

The application shell, the feature set, and the visual direction are worth
keeping. The game data and the responsive layer need to be rebuilt.

---

## 1. Game data is invented

### 1.1 The evidence

The official BattleScribe catalogues at
[`Fawkstrot11/TrenchCrusade`](https://github.com/Fawkstrot11/TrenchCrusade) —
the same data NewRecruit uses for this system — expose every unit's
Movement / Ranged / Melee / Armour / Base as structured XML. Comparing them
against `src/data/defaultRules.ts`:

```
app units parsed        38
catalogue unit profiles 79
matched by name         30
  correct               1
  MISMATCHED            29  (97%)
unmatched               8
```

Reproduce:

```bash
npm run rules:fetch      # pulls the catalogues into data-sources/battlescribe/
npm run rules:crosscheck # prints the table above; --full for all rows
```

**One** of the thirty checkable units — the New Antioch Yeoman — has a fully
correct statline.

Representative failures:

| Unit | Field | App | Source |
|---|---|---|---|
| Lieutenant | Ranged / Melee / Armour | +1 / +1 / −1 | **+2 / +2 / 0** |
| Sniper Priest | Melee / Armour | +0 / −1 | **−1 / 0** |
| War Prophet | Ranged / Melee / Armour | +1 / +1 / −1 | **+2 / +2 / 0** |
| Communicant | Ranged / Armour | +1 / −2 | **−3 / 0** |
| Brazen Bull | Armour / Movement | −3 / 5" | **0 / 6"/Infantry** |
| Stigmatic Nun | Movement | 6" | **8"/Infantry** |

Three further entries were only matched after adding an alias map for the app's
invented naming (`Trench Dog / War Hound` → `Trench Dog`, `Anchorite Shrine` →
`Anchorite`, `Yüzbaşı` → `Yüzbaşı Captain`) — and all three turned out to be
mismatched too. The 8 still unmatched (`Combat Engineer`, `The Faithful`,
`Martyr / Flagellant`, `Mechanized Heavy Infantry`, `Takwin Homunculus` and
others) need checking against the rulebook to establish whether they are real
entries under another name or inventions. `Combat Engineer` is a known case of
the *catalogue* being incomplete: it has a full profile in both the rulebook and
the Dispatch.

### 1.2 Ducat costs are wrong about a fifth of the time

Measured against the official Warbands book across every comparable entry:

```
Ducat costs comparable  28
  correct               22
  WRONG                  6   (21%)
```

| Unit | App | Rulebook |
|---|---|---|
| Shock Troopers | 40 | **45** |
| Mechanized Heavy Infantry | 95 | **85** |
| Communicant | 90 | **100** |
| Castigator | 65 | **50** |
| Stigmatic Nuns | 45 | **50** |
| Anchorite Shrine | 120 | **140** |

An earlier pass on this audit reported costs as "largely right" from a two-unit
sample. With the full book parsed, 21% are wrong — enough to make a roster
illegal at a tournament. Statlines are worse, but costs are not a safe area
either.

Two systematic tells in the surrounding data:

- **Armour was filled in with a default.** 22 of 45 units carry `armour: '-1'`.
  Every unit checked should be `0`.
- **Weapon costs are a generated ladder.** In `BASE_WEAPONS`, the first seven
  melee weapons cost 1, 2, 3, 4, 5, 6, 7 Ducats in file order.

### 1.2a The two sources broadly agree with each other

Running the same comparison between the **rulebook** and the **catalogues**
(`npm run rules:threeway`):

```
rulebook vs catalogue  compared   42
                       DISAGREE    3
app      vs rulebook   DISAGREE    0
```

All three are real, and all three now carry a written resolution:

| Entry | Disagreement | Resolved |
|---|---|---|
| Scripture Guardian | Ranged `-` (book) vs `+1 Dice` (catalogue) | book, then superseded by the Dispatch's `+2 DICE` |
| Mamluk Faris | Armour `-2 (-3)` (book) vs `-2` (catalogue) | catalogue — the conditional is not yet expressible |
| Combat Medic | Cost `65` (book) vs `40` (catalogue) | book — see below |

The earlier run of this comparison reported **7**, of which five were the
tool's own formatting rather than the sources' — `-` vs `N/A`, `30 by 60mm`
vs `30x60mm`, `+1 DICE` vs `1`. Both this script and the build had their own
copy of the normalisation rules and the copies had drifted; they now share one
definition in `scripts/lib/verify.mjs`.

The **Combat Medic** was not in that count at all. The book prints 65 Ducats
and `New Antioch.cat` 40, and the check skipped the entry entirely because two
catalogues carry a model of that name — the New Antioch troop and the Mercenary
hireling — and it gave up on any duplicated name rather than choose. The book
names each entry's faction in its keywords, so it can now choose, and the
25-Ducat gap it had been hiding turns out to be exactly the Battlekit the book
says a Medic always has (Standard Armour 15 + Gas Mask 5 + Medi-kit 5). The
catalogue forces all three onto the model and then leaves them unpriced.

This is still good news for the plan. The catalogues are a sound base; the
rulebook layer is a light correction pass plus the constraint data, not a
rewrite.

### 1.3 Keywords are partly fabricated

Checked against the full official texts (an earlier pass used only the partial
`scratch/` extraction and got two of these wrong):

| Term | Warbands book | Digital Rulebook | Verdict |
|---|---|---|---|
| `Bayonet Lug` | 30 | 0 | **Real** — a weapon property in the Armoury Tables |
| `Shield Combo` | 48 | 3 | **Real** — a weapon property |
| `Slashing` | 1 | 0 | Real *as a word*, but not a keyword: "Slashing Attack" is a named ability on the Assassin's Dagger. The app applies it as a keyword on a generic Sword/Axe, which is wrong. |
| `Concussive` | 0 | 0 | **Invented** |
| `Fast Strike` | 0 | 0 | **Invented** |

So the fabrication here is narrower than first reported: two invented keywords
and one misapplied ability name, not four inventions. The real problem is that
`Bayonet Lug` and `Shield Combo` are attached to the wrong weapons and carry no
enforcement — they are restriction markers in the Armoury Tables
(`Automatic Rifle — Bayonet Lug, Limit: 1 — 40 👑`), and the app treats them as
decorative text.

Keyword *descriptions* in `officialRulesData.ts` remain paraphrases rather than
rules text. `COVER` is described as "subtract 1 or 2 from enemy ranged hit
rolls", where Trench Crusade expresses cover as a DICE modifier.

### 1.3a Claimed but not delivered

`src/data/rulesets/index.ts:36` advertises the 1.0.2 update as adding:

> *"New Keywords: CLEAVE (X), DEADLY, DEPLOYABLE, DANGEROUS TERRAIN, DIFFICULT
> TERRAIN, FLYING, IMPASSABLE TERRAIN, MINED, REGENERATE (X), SCATTER,
> SKIRMISHER."*

Checked against the 116-keyword glossary the app actually ships
(`officialRulesData.ts`), **7 of the 11 are absent** — not under a variant name,
absent entirely:

| Claimed | In the glossary? |
|---|---|
| DEPLOYABLE, FLYING, MINED, SCATTER | present |
| **CLEAVE (X), DEADLY, DANGEROUS TERRAIN, DIFFICULT TERRAIN, IMPASSABLE TERRAIN, REGENERATE (X), SKIRMISHER** | **absent** |

`CLEAVE (X)` and `DEADLY` are core combat keywords — both are used repeatedly in
the Trench Dispatch (`CLEAVE 3` on the Gluttonous Arsenal, `CLEAVE 2` on the
Flaying Iron Claws, `DEADLY` on the M.U.R.A.D. Bombard). A player looking either
up in the Codex gets nothing.

Cross-checked against the official `Changelog 1.0.2` PDF, which defines 12
keywords in total; the app is missing 7 of those 12.

This is the failure mode to guard against most carefully: not invented data,
but a **claim of completeness that the code does not honour**. It is why
[`FEATURES.md`](FEATURES.md) records status verified by reading the code rather
than by trusting the UI or the changelog text.

### 1.3b Wargear: 38% of it does not exist

Full sweep of every hand-written weapon, armour and equipment entry against the
BattleScribe catalogues (389 profiles) and the rulebook Armoury Tables (206
rows, 348 distinct names). Reproduce with `npm run rules:audit -- --full`.

| Array | Entries | Real | Renamed | **Invented** |
|---|---|---|---|---|
| `BASE_WEAPONS` | 58 | 31 | 5 | **22 (38%)** |
| `BASE_ARMOUR` | 12 | 5 | 1 | **6 (50%)** |
| `BASE_EQUIPMENT` | 30 | 7 | 9 | **14 (47%)** |
| `OFFICIAL_WEAPONS` | 24 | 14 | 3 | **7 (29%)** |
| `OFFICIAL_ARMOUR` | 4 | 3 | 0 | **1** |
| `OFFICIAL_EQUIPMENT` | 6 | 3 | 2 | **1** |
| **Total** | **134** | **63** | **20** | **51 (38%)** |

*Renamed* means the entry decorates a real item — "Holy Water Phial" for the
book's "Holy Water of Lalibela". *Invented* means no source contains the name,
or any stem of it, under any spelling.

A representative sample of the inventions, none of which appear anywhere in the
rulebooks, the Dispatch or the catalogues:

> Executioner Blade · Two-Handed Morningstar · Alchemical Scimitar · Blessed
> Halberd · Holy Reliquary Mace · Sacred Flail of Flagellation · Corrupted
> Chainblade · Daemonic Cleaver · Rusted Scythe of Pestilence · Bile Spewer ·
> Virulent Spore Projector · Heavy Machine Gun · Sawed-Off Shotgun · Smoke
> Grenades · Wire Cutters · Entrenching Shovel · Spiked Shield of the Damned ·
> Daemon-Forged Plate · Plague-Hardened Carapace · Horn of Gabriel

The pattern is decoration of something real: the game has a **Machine Gun**, so
the data invented a **Heavy Machine Gun**; it has a **Shovel**, so the data
invented an **Entrenching Shovel**. Both look plausible on a roster and neither
is legal.

The whole `Formula of …` / `Essence of …` alchemical equipment family — nine
entries — is invented. The real Sultanate equivalents are the Dispatch's
Al-inbīq Kit, Alchemical Fire and Corrosive Ammunition.

### 1.3c Keywords: 36 of 116 exist in no source

The same sweep over the keyword glossary. Against 95 keywords found across the
rulebooks, the Changelog, the Dispatch and the catalogues, **36 of the app's 116
entries appear in no source**, including a run of invented abilities —
`Berserk Rage`, `Weapon Master`, `Duelist`, `Shield Wall`, `Decapitating
Strike`, `Eagle Eye`, `Crack Shot`, `Rapid Reload`, `Shadow Step`, `Trench
Stalker`, `Unshakable Faith`, `Field Medic`, `Tough as Nails`, `Demolitions
Expert`, `Tactical Genius`, `Blessed Aura`.

Some are parameter-form spellings of real keywords (`AUTOMATIC X` for
`AUTOMATIC (X)`, `BLAST X`, `BLESSED X`, `REACH X`) and are a formatting
problem rather than an invention. The named abilities are not.

Taken with §1.3a — where 7 of 11 advertised 1.0.2 keywords are missing — the
glossary both **omits real keywords and contains invented ones**.

### 1.4 Faction special rules: right concept, invented content

`FACTIONS[].rules` contains "Voice of Command", "Ecstatic Zeal", "Prophetic
Vision", "Infernal Blood Tithe" and others. None of these are published rules.

But the **concept is legitimate** — the Warbands book gives each faction a
"Special Rules" section. New Antioch's is:

> **New Antioch Fireteams:** A New Antioch Warband can include up to 2 Fireteams.
> Each Fireteam consists of any two models from the Warband… given the FIRETEAM
> Keyword at no additional cost.
> **Concentrated Attack:** If a model from a Fireteam hits a target that had been
> hit by the other member of their Fireteam earlier in the same joint Activation,
> you can spend 3 BLOOD MARKERS to convert the Injury Roll for the second attack
> to a Bloodbath Roll, even if the target is not Down.

(Independently corroborated: the Trench Dispatch refers to "the New Antioch
Concentrated Attack rule" when defining `MERCENARY`.)

**Resolution: keep the field, replace the content** from each faction's Special
Rules section. These are not flavour text — Fireteams change roster construction
and are enforceable, so they belong in the rules engine, not just the Codex.

### 1.5 Rosters are incomplete, and one faction is orphaned

| Faction | App units | Catalogue model entries |
|---|---|---|
| New Antioch | 9 | 12 |
| Iron Sultanate | 9 | 16 |
| Heretic Legions | 7 | 12 |
| Trench Pilgrims | 7 | 11 |
| Black Grail | **3** | 11 |
| Court of the Seven-Headed Serpent | **3** | 12 |
| Mercenaries | 7 (orphaned) | 11 |
| **Total** | **45** | **85** |

Seven units carry `factionId: 'mercenaries'`, but there is no `mercenaries`
entry in `FACTIONS` (`src/data/defaultRules.ts:17`). Those units are
unreachable by any faction lookup in the app.

### 1.6 The data model cannot express the rules

Beyond wrong values, the schema in `src/types/rules.ts` is missing concepts the
game depends on:

- **No Glory cost.** `UnitProfile.baseCost` is Ducats only. The catalogues carry
  `<cost name="Glory Points">` as a first-class second currency, and the
  Dispatch describes a whole **Glory Items** system (`Blessings of Beelzebub —
  Limit: 1 — 9 Glory`). The app cannot represent any of it.
- **No constraints.** Zero units set `maxCount`. The catalogues carry **1,187
  `<constraint>` elements** — `min`/`max`, scoped to `roster` or `parent` —
  encoding "an Iron Sultanate Warband must include 1 Yüzbaşı", "0-1 Amalgam",
  "Halberd-Gun: ELITE only, Limit: 2".
- **No base sizes.** `Statline.baseSize` exists and is never populated. Base
  size is load-bearing in the rules (the Amalgam's *Unstoppable*, the Sin
  Eater's *Devour the Guilty*, and the Brazen Bull's *Living Battering Ram* all
  branch on 32mm/40mm/60mm).
- **No movement type.** The source is `6"/Infantry`; the app stores `6"`,
  discarding the type that `FLYING` and terrain rules depend on.
- **No per-model upgrades.** Strains, Vile Corpus, Goetic Powers and Glory Items
  are all "purchasable option attached to a model, with a cost and a limit". The
  app has no such concept.

### 1.6a Warband Variants are entirely unsupported

The Warbands book defines **14 official Warband Variants**:

| | |
|---|---|
| Papal States Intervention Force | Procession of the Sacred Affliction |
| War Pilgrimage of Saint Methodius | Fida'i of Alamut |
| House of Wisdom | Defenders of the Iron Wall |
| Stosstruppen of the Free State of Prussia | Kingdom of Alba Assault Detachment |
| Expeditionary Forces of Abyssinia | Trench Ghosts |
| Heretic Naval Raiders | Cavalcade of the Tenth Plague |
| Knights of Avarice | Dirge of the Great Hegemon |

The app supports **none of them**. The word "variant" does not appear in
`src/types/`, `src/store/useStore.ts` or `src/data/defaultRules.ts` — there is no
`variantId` on `Warband`, so a warband cannot even record which variant it is.

This is not cosmetic. Variant special rules change roster legality:

> **Far from Home:** A Papal States Intervention Force Warband cannot include
> Trench Moles.
> **Lector:** A Papal States Intervention Force Warband must include 1 Trench
> Cleric.
> **Face thy Fears:** Models in a Procession of the Sacred Affliction Warband
> cannot have Iron Capirotes.

They add and remove entries, change costs, force and forbid units, and alter
starting budgets — the existing `src/data/rulesets/index.ts` even mentions
"Papal States 500 D + 11 Glory" without modelling any of it.

Confirmed against a real roster: the maintainer's own 1,320-Ducat Iron Sultanate
warband carries a `Warband Variant → The House of Wisdom` selection that the app
has nowhere to put.

### 1.7 Roster validation, the core feature, is absent

`src/components/builder/WarbandBuilder.tsx:79-83` computes `eliteCount`,
`trooperCount` and `mercenaryCount` — and never uses them. The only validation
that runs is *has a Leader* and *over budget*
(`WarbandBuilder.tsx:289`). No unit limits, no composition requirements, no
wargear legality, no Glory budget.

This is the feature that would make TrenchLine a NewRecruit replacement, and it
does not exist.

### 1.8 Fabricated network fallback

`src/services/githubSync.ts:32-51` — when the GitHub API call fails,
`fetchLatestRepoCommit` returns an invented commit:

```js
return {
  sha: 'a4f91e2b',
  commit: {
    message: 'v1.4.2 Community Errata: Updated Trench Pilgrim Martyr abilities & Ducat costs',
    author: { name: 'Fawkstrot11 (Maintainer)', date: new Date().toISOString() }
  }
};
```

This presents fabricated data to the user as a real upstream sync result. It
must be deleted, not repaired.

### 1.9 Ruleset metadata is unsourced

`src/data/rulesets/index.ts` dates the "1.0.2 Official Digital Errata" to
"August 2026" and lists changes with no traceable source. The `1.0.2TD`
("Trench Dispatch Preview") entry describes content that does not match the
actual Trench Dispatch. The whole file is replaced by the model in
[`RULESET-MODEL.md`](RULESET-MODEL.md).

### 1.10 User content and game data are mixed in the same file

`src/data/warbandLore.ts` (851 lines) holds the maintainer's own warband —
*Al-Qarn Rihla* — and is genuinely valuable, hand-written content: warband
identity, a markdown history, a chronicle log, 11 character biographies with
titles, quotes and deeds, plus match history and snapshots.

It also holds `profileSnapshot` blocks with full statlines, weapon profiles,
armour and costs. That is game data, sitting in a file whose real purpose is
narrative, in a directory the pipeline will regenerate.

The consequence is a third, independent copy of the game data — and the three
copies do not agree:

| Source | Ranged | Melee | Armour |
|---|---|---|---|
| `warbandLore.ts` | +2 DICE | +1 DICE | **−2** |
| `defaultRules.ts` | **+1 DICE** | **+0 DICE** | **−1** |
| BattleScribe catalogue | +2 Dice | +1 Dice | **0** |

*(Jabirean Alchemist. `warbandLore.ts` is closer to correct than the app's
primary data file, and both get Armour wrong.)*

Phase 1 splits the file: narrative moves to
`data-sources/fixtures/al-qarn-rihla/` and is preserved verbatim; the
`profileSnapshot` blocks are discarded and rebuilt from source.

---

### 1.11 The parser discarded the catalogues' conditional layer

Found while tracing why the preserved Al-Qarn Rihla roster contains models
(`Favoured Brazen Bull`, `Favoured Kavass`, `Kavass`) that appear in no dataset.

They are not missing entries. `Kavass` **is** the catalogue's `Azeb`, renamed by
a `modifier` that fires when the roster has selected The House of Wisdom.
`Favoured Brazen Bull` is the `Brazen Bull` entry with an ELITE promotion.

The catalogues carry **1,862 modifiers**. The first parser read the static
`selectionEntry` and none of them, so everything conditional was lost:

- a model's Armour, which is derived from the armour it has equipped — the
  reason every generated Armour value is the bare base
- Warband Variant renames and stat changes
- variant changes to recruitment limits
- options that change a cost

This is not fabricated data — everything shipped was traceable — but it is a
whole mechanism silently dropped, and it made the app structurally unable to
show what a model actually looks like once equipped.

Fixed: modifiers are parsed with their condition trees intact, ids resolved to
readable names, and evaluated by `src/rules/modifiers.ts`. Verified by replaying
the real roster: **every printed field — name and all four statline values —
now reproduces exactly from the catalogue base plus modifiers**, including the
`Favoured` elite-promotion title, with nothing hand-written.
See [`RULESET-MODEL.md` §7b](RULESET-MODEL.md#7b-catalogue-modifiers--the-conditional-layer).

**Correction to §1.6a.** That section says the fourteen Warband Variants have to
be transcribed from the Warbands PDF. Much of that is wrong: the variants'
mechanical effects are already machine-readable in the catalogues as modifiers.
*Pride of Jabir* (Lions 0-2 → 0-3) and *Alchemists* (must include 1-2) both
derive exactly. The PDF prose remains the cross-check, not the source.

### 1.12 The catalogue fetch used a hardcoded file list, and it had gone stale

Found while tracing the same roster: the `Elite Promotion` entry it selects
resolved to nothing.

`scripts/rules-fetch.mjs` held a literal array of eleven catalogue file names.
Upstream publishes twelve. The missing one is **`Campaign Rules.cat`** — 470 KB
containing every Advancement, Injury, Glory Item, Exploration Reward and
Exploration Skill, the Patron selection, and the elite-promotion titles.

Nothing failed. No warning, no conflict, no missing-provenance error: the
pipeline fetched what it was told to fetch and reported success. The dataset was
simply incomplete, which is the quietest possible version of the failure this
project exists to prevent.

Impact once fetched, with no other change:

| | before | after |
|---|---|---|
| gear / battlekit entries | 389 | 543 |
| conditional modifiers | 820 | 971 |
| unresolvable Dispatch ops | 3 | 2 |

Fixed: the file list is now **discovered** from the repository, and the fetch
reports files that newly appear (`new upstream: Campaign Rules.cat`) and warns
about any it previously held that upstream no longer publishes. A guessed list
is refused outright rather than fetched partially.

**Lesson generalised.** Every hardcoded list of things-from-a-source is a
staleness bug waiting to happen. Rule 2 says never invent a fallback; this is
its sibling — never assume you know the whole of a source you did not enumerate.

---

### 1.13 The campaign tables are invented, and their roll mechanics are wrong

Found by `npm run rules:audit:campaign`, run before wiring the campaign economy
to them. These tables were never in the original audit, and they are the ones
that would drive a **persistent** economy: an Exploration result adds Ducats to
a Strongbox that survives for the rest of the campaign, so an error compounds
rather than showing up once.

**The Trauma Table is sound.** `Campaign Rules.cat` carries every injury as a
real entry with its D66 roll in the name — `Lost an Eye [15]` — and 18 of the
app's 22 rows match it exactly, roll number included. The other four (11 Dead,
12 Captured, 36 Robbed, 41–63 Full Recovery) have no catalogue entry because
they add nothing to a model, which is correct rather than missing. No conflicts.

**The three Exploration Location tables are fabricated.** 22 entries, none of
which appears anywhere in the rulebook. The real tables are legible in the
extraction, so this is invention and not an extraction failure:

| | app | rulebook |
|---|---|---|
| Common | 11-13 Empty Trench, 14-16 Discarded Ammunition, 21-23 Holy Water Vials… | 4 Moonshine Stash, 5 Heavy Weapons Cache, 6 Trench Shrine, 8 Ruined House, 9 Survivor… |
| Rare | 11-16 Pristine Heavy Flamer, 21-26 Reinforced Gothic Plate… | 5 Angelic Instrument, 9 Abandoned Prophetic Radio Post, 11 Pot of Manna… |
| Legendary | 11-25 The Book of Golems, 26-40 Holy Grail Splinter… | 6 Battlefield of Corpses, 8 Esoteric Library, 10 Hidden Passages… |

**The roll mechanic is wrong too.** The app models these as D66 ranges. The book
uses an Exploration Roll to pick *which* table (1–2 Common, 3–5 Common or Rare,
6–9 Rare, 10+ Rare or Legendary) and single ascending thresholds to pick the
row. The same roll also sets the income: *"The value of the Loot you find is
equal to your Exploration Roll times 10 in 👑."* A D66 range cannot express
either, so the app cannot compute loot at all.

**The four Skills tables are fabricated.** 24 entries with no roll numbers,
against real 2D6 tables of 11 rows each (2–12, with Patron Skill at both ends).
Real: Stand Firm, Parry, Close Quarters Combat, Relentless Charge, Melee
Proficiency, Strength of Samson, Hard as Nails, Surgical Strike, Champion.
App: Berserk Rage, Weapon Master, Crushing Blow, Duelist, Shield Wall,
Decapitating Strike — five of which the wargear-and-keyword sweep had already
flagged as invented abilities, so this is the same fabrication surfacing twice.

46 invented entries across seven tables. The Trauma Table can stay; the other
six need deriving from the rulebook before anything reads them.

**All seven tables are now derived, and the wizard reads them.**

`parseExploration` supplies the three Location tables plus the mechanic the app
never had: dice by games played (3/4/5/6 D6), table selection by the same bands,
and loot at ten Ducats a point *whether or not anything is discovered*.
`parseSkillsTables` supplies the four 2D6 Skills tables, 11 rows each, complete
from 2 to 12 — a gap there fails the build, since these are dense where the
Exploration tables are deliberately sparse. `parseTraumaTable` merges the
catalogue's 18 injuries with the four rulebook-only results and records which
source each row came from.

Migrating `PostBattleWizardModal` and `UnitAdvancementModal` onto them fixed four
further bugs that were nothing to do with the data:

- Exploration rolled **D66** (two dice concatenated) rather than summing 3-6 D6.
- It added a **flat 20 Ducats** rather than the roll times 10.
- It **fell back to the first row** of the table when a roll matched nothing,
  inventing a discovery where the rule is "you discover nothing".
- The advancement modal **synthesised roll numbers from the array index**
  (`1${i+1}` through `4${i+1}`), producing D66-looking values corresponding to
  nothing at all.

`officialRulesData.ts` still holds the fabricated copies, and `CodexView` still
reads them for reference display.

### 1.14 The Codex's rules prose was written, not extracted

`src/data/officialCoreRules.ts` held eight chapters of hand-written Core and
Comprehensive Rules — the Codex tab a player opens mid-game, precisely when
they do not have the book to hand. Three of its errors are on the rules looked
up most:

| | the app said | the rulebook says |
|---|---|---|
| Initiative | "Both players roll a D6. The player who rolls highest wins Initiative" | the player with the **fewest models** has the Initiative; the dice are only the tiebreaker |
| Success table | "**1-6**: Failure / Mishap" | "**2-6** Failure" — 1 is not a result on 2D6 |
| Morale | "50% or more of **starting** models" | "half the models in your Warband are Down or Out of Action **(rounded up)**" |

The rest is the same shape: plausible, fluent, and unsourced. A "Bloodbath
Roll" that converts an Injury Roll so "all doubles result in instant Out of
Action"; a Charge that "grants a Charge Bonus (+1 DICE) on the initial melee
attack" the book does not give; falling damage "with +1 INJURY DICE per 2\"
fallen"; Light and Heavy Cover at -1 and -2 DICE, the same two invented cover
tiers the keyword sweep found in §1.3.

Replaced by `scripts/lib/parse-core-rules.mjs`, which walks the rulebook's own
table of contents through the body and emits **59 sections** — 17 Core, 42
Comprehensive — each carrying the printed page it came from. A heading the
contents lists and the walk cannot find fails the build rather than leaving the
Codex silently a chapter short.

### 1.15 The dice console kept one die and threw the rest away

The tabletop dice engine — the thing a player has open on the table — resolved
an Injury Roll by sorting the pool and keeping the **single highest die**. A
Bloodbath of 6, 5, 4 against -3 Armour read as `6 - 3 = 3`, a Minor Hit. The
book gives `15 - 3 = 12` and the model is Out of Action.

The result tables were invented alongside it:

| | the app said | the rulebook says |
|---|---|---|
| Injury | `>=9` Out of Action, `>=7` Serious Injury, `>=4` Downed, else Flesh Wound | `1 or less` No Effect, `2-6` Minor Hit, `7-8` Down, `9+` Out of Action |
| Success | a "FUMBLE / DISASTER" on double 1 | `2-6` is a Failure however it was rolled |

And the attack calculator applied **every modifier as a flat number added to the
2D6 total**. Trench Crusade has no flat modifiers on a Success Roll: each one is
`+/- DICE`, which changes how many dice you roll and which end you keep. Its
modifier list was part invented too — Light and Heavy Cover at -1 and -2 (cover
is one tier, -1 DICE), a "Charge Momentum +1" (melee gets +1 DICE for a *Diving
Charge* specifically), a Critical Success worth +2 to the Injury Roll (it is +1
INJURY DICE), and the attacker's own BLOOD MARKERS deducted automatically —
markers are spent by the opponent, as dice, either way round. Long Range at -1
DICE, probably the most common modifier in a real game, was missing.

Replaced by `src/rules/dice.ts`, pure and with its randomness injected, whose
tests are the rulebook's own worked examples.

### 1.16 The battlefield conditions were invented, all eighteen of them

The Codex's Mission Generator rolled six weather conditions, six
"complications" and six "Secret Secondary Agendas" with Glory and Ducat
rewards; Play Mode's lobby offered five more conditions. None of the twenty-three
appears anywhere in the sources, and they gave themselves away on vocabulary
alone: they deal "Poison wounds" and "D3 wounds", fire "at the end of each
battle round", impose "-1 Morale", and reward "the player who wins priority in
Turn 1". Trench Crusade has no wounds, no battle rounds, no Morale
characteristic and no priority — it has BLOOD MARKERS, Turns, Morale Checks and
the Initiative.

The game published exactly one such table at the time, and it belonged to one
scenario: **UNFORESEEN EVENTS** in *Hunt for Heroes*. A D6 at the start of each
Turn after the first, nothing on 1-4, then a D3 for Rising Fog, Rain Mud and
Guts, or Deep Craters. That is what the generator rolls; the other eleven
scenarios get nothing offered, and are told why.

**Since resolved from the other end.** The *Hell on Earth* module publishes a
real Weather Events table — 11 rows on 2D6, each player rolling once after the
battlefield is set up and before deployment, with the player on the fewest
Campaign Victory Points choosing which of the rolled Events applies. It is in
`data-sources/rulebook/hell-on-earth-weather-events.pdf` and parsed by
`scripts/lib/parse-weather.mjs`. So the app has weather again, and this time it
is the game's.

## 2. Mobile and tablet

### 2.1 The hard bug

`src/components/layout/MobileNav.tsx:32`:

```jsx
<div className={`grid grid-cols-${navItems.length + 2} gap-1`}>
```

Tailwind resolves class names by static scanning; it cannot see interpolated
strings. `grid-cols-7` and `grid-cols-8` appear nowhere else in the source, so
neither class is ever generated. The element falls back to a single-column
grid — **the bottom navigation renders as 7–8 stacked full-width buttons
covering most of the phone screen.**

This alone accounts for much of "unusable on mobile".

### 2.2 Systemic issues

| Issue | Evidence |
|---|---|
| Viewport units break on iOS | `max-h-[90vh]` and friends in 30 modals; zero uses of `dvh`. `vh` resolves to the *large* viewport under Safari's collapsing toolbar, so modal footers and close buttons sit off-screen. |
| No safe areas | Zero occurrences of `env(safe-area-inset-*)`. The fixed bottom nav sits under the iOS home indicator. |
| Overflow masked, not fixed | `overflow-x: hidden` on `body` (`globals.css`) hides horizontal overflow instead of fixing it, so layout bugs clip content silently. |
| Desktop-only density | 431 uses of 9–11px text. `UnitCard.tsx` — the most-used component in the app — is 622 lines with **one** breakpoint. `UnitAdvancementModal.tsx` is 681 lines with two. |
| Touch targets below minimum | `UnitCard` action buttons are `py-1.5` + `text-[10px]` ≈ 26px tall, against a 44px minimum. |
| 30 duplicated modal shells | Every modal hand-rolls `fixed inset-0 flex items-center justify-center p-4`. No shared primitive, so no scroll lock, no focus trap, no escape handling, and no way to fix any of it once. |
| Unoptimised images | **102 MB** in `public/` (88 MB of scenario maps). 9 raw `<img>` tags, zero `next/image`. A single 5.9 MB world-map PNG ships at full size to phones. |
| PWA broken | `public/manifest.json` is never linked from `layout.tsx`, and its declared 192/512 icons point at 2.5 MB design mockups. "Add to home screen" — the highest-value feature for a table-side companion — does not work. |

### 2.3 Single-route architecture

`src/app/page.tsx` renders all six views and switches between them with Zustand
state. Consequences: 266 kB first-load JS with no code splitting, no deep
links, no shareable roster URLs, and the browser back button does nothing.

---

## 3. Project hygiene

- **README is wrong.** It describes "React 19 + TypeScript + **Vite**"; the app
  is Next.js 15 App Router. It claims 7 factions; the data defines 6.
- **Dead Vite scaffolding.** `src/App.tsx`, `src/main.tsx`, `src/index.css` and
  both `tsconfig.*.tsbuildinfo` files are orphans from before the Next.js
  migration. `App.tsx` is a stale duplicate of `page.tsx`.
- **The only real source material is gitignored.** `scratch/` holds genuine
  extracted rulebook text and ~40 extraction scripts, and `.gitignore` excludes
  it. The project's most valuable asset is unversioned.
- **The theme system is decorative.** Seven themes, a switcher modal, CSS custom
  properties and Tailwind token mappings — against **3,698 hardcoded hex colours
  in components and 0 uses of the theme tokens**. Switching themes changes
  almost nothing.
- **No tests, no CI.** No test runner in `package.json`, no `.github/`.
- **`ignoreDuringBuilds: true`** for ESLint in `next.config.mjs`.

---

## 4. What is genuinely good

### Verified correct: the All Out War data

`src/data/allOutWarData.ts` was checked against the official All Out War PDF and
is **correct** — the three scenarios and the full 52-card Betrayal Table match
essentially word-for-word, including the Coup/Ruse split, card values and timing
clauses.

This matters for how the rest of the data is handled: **where the original build
had the source PDF, the data is good; where it did not, it invented.** So each
data file gets verified individually rather than deleted wholesale. See
[`FEATURES.md`](FEATURES.md) for the file-by-file position.


Worth stating, because the rebuild should preserve it:

- The Next.js + Prisma + NextAuth + Zustand stack is a reasonable choice.
- The feature scope — builder, play HUD, campaign hub, codex, post-battle
  sequence — is the right set of features for this game.
- `PlayModeView` is actually responsive (`grid-cols-1 md:… lg:…` throughout).
  The responsive work is uneven, not absent.
- The visual direction is strong and consistent.
- `services/xmlParser.ts` + `newRecruitImporter.ts` already parse BattleScribe
  XML. The mechanism for the correct data pipeline is already in the repo — it
  was just wired up as a runtime "diff" feature alongside hand-written data,
  instead of being the source of that data.
