# Data alignment audit, 19 September 2026

Companion to [`RULES-REVIEW-2026-09-19.md`](RULES-REVIEW-2026-09-19.md), which
covered the campaign rules. This one asks a narrower question about the unit and
wargear data: **does what the app shows for a model line up with what the books
print for it**, entry by entry, field by field, including the fields the
pipeline's own verification never compares.

Two new report-only scripts produced the evidence and are committed so the
comparison can be re-run after every fix:

```bash
npm run rules:audit:book          # every unit vs the Warbands book, all fields
npm run rules:audit:battlekit     # every weapon vs the Battlekit chapter, and armoury prices
```

Both read `src/data/generated/trenchline.generated.ts` (pass `--ruleset
github-latest` to the first for the unlayered base) and the extracted texts
under `data-sources/`. Neither changes anything. Findings are numbered DA-nn
and continue the RR-nn series in the companion document.

## What the existing checks cover, and what they miss

`npm run rules:check` reports `verified against the rulebook: 43 units ...
CONFLICTS 0`. That is true and it is much narrower than it reads:

- `scripts/lib/verify.mjs` compares six fields: Ranged, Melee, Armour, Base and
  the two costs. **Movement, Keywords, the recruitment limit and every ability
  are never compared.**
- `parseWarbandEntries` in `scripts/lib/parse-warbands.mjs` requires a leading
  recruitment count in the entry header. Troop entries print none ("Heretic
  Troopers - Cost: 30"), so **eleven Troop entries and everything under a
  Variant page were never read**: 47 of the book's 59 priced entries reach the
  check, and 43 of the 89 base units are compared.
- `scripts/audit-wargear.mjs` audits `src/data/officialRulesData.ts`, which is
  empty. It reports `TOTAL 0 entries ... INVENTED 0 (0%)` and cannot fail.
- `scripts/rules-audit-campaign.mjs` compares the shipped Trauma Table against
  `Campaign Rules.cat`, which is the file it was derived from. Every row reads
  `MATCH`, Dark Memory included (RR-01). It cannot fail either.

So a catalogue entry whose ability names, keywords or limits drifted from the
book passes every gate the project runs. The findings below are what those
gates were not looking at.

## Ranked findings

| ID | Severity | What |
| --- | --- | --- |
| DA-01 | High | 28 variant-only Ability profiles, marked `hidden="true"` in the catalogues, ship as innate abilities on the base unit |
| DA-02 | High | The Winged Thrall is a second Unit profile on the Thrall entry, emitted as a recruitable model at 0 Ducats with no keywords or abilities |
| DA-03 | High | The Sister of Saint Cosmas ships under the name "Combat Medic" |
| DA-04 | High | Ten abilities the book prints are absent from the catalogues entirely; six more exist in the catalogue and are not attached to their unit |
| DA-05 | High | Ability headings the book does not print: "On my Command!", "Parasitic Tick", pipe-delimited Goetic spell names |
| DA-06 | High | The Warbands-book Battlekit parser drops wrapped keywords and every special rule under them, and the Codex prefers that empty result |
| DA-07 | High | The Dispatch's "Change the Cost of Incendiary Grenades to 10" is applied to the weapon profile; the app prices from armoury rows, which still say 15 |
| DA-08 | Medium | Recruitment limits the book prints and the dataset lacks: Mamluk Faris, Scripture Guardian, Anointed Heavy Infantry |
| DA-09 | Medium | Keywords the book prints and the dataset lacks: Anchorite Shrine (four), Sapper and Combat Engineer (NEGATE MINED), Combat Medic (NEGATE FEAR), FLYING on four Court entries |
| DA-10 | Medium | Catalogue ability text that states a different rule from the book: Chorister, Castigator (two), Sapper (Forward Positions), Desecrated Saint, Stigmatic Nun, Ecclesiastic Prisoner, Communicant |
| DA-11 | Medium | Catalogue weapon profiles that differ from the book: Fire Shield (four factions carry a different rule and no keywords), IGNORES ARMOUR, Molotov text names the wrong grenade, Shotel and Tank Palanquin have no rule |
| DA-12 | Medium | Dogs: the book sells a Trench Dog as a 1 to 3 Glory item given to a model; the app offers Guard, Mercy and Attack Dogs as 5-Ducat Troopers |
| DA-13 | Medium | Three Variants and their units are in no committed book and are not flagged third-party: The Great Hunger, The Red Brigade, Eire Rangers |
| DA-14 | Low | Name drift the books do not print: Engineer for Combat Engineer, Heavy Infantry for Mechanized Heavy Infantry, War Wolf for War Wolf Assault Beast, CLERGY keyword, "Tawkin" |
| DA-15 | Low | Book text the catalogue paraphrases without changing the rule: about 20 abilities, listed by the script |

---

### DA-01. Hidden variant-only abilities ship on the base unit

The catalogues mark an Ability profile `hidden="true"` when it belongs to a
Variant and is revealed by a `set hidden=false` modifier naming that Variant.
`scripts/lib/parse-battlescribe.mjs` reads Ability profiles by `typeName` and
ignores the attribute, so the dataset carries them in `unit.abilities` with no
flag, `recruitable()` copies every one into `innateAbilities`, and the unit
card and the recruit sheet print them for every Warband of the faction.

Twenty-eight such profiles on fourteen units. The ones a player of the standard
list will see and the book does not print on the entry:

| Unit | Abilities shown | Belong to |
| --- | --- | --- |
| Shocktrooper | Axe Mastery, Shield Bash, Indomitable, Weapon Familiarity | Remnants of Byzantium (Varangian Guard) |
| Desecrated Saint | Aura of Envy, Gluttony, Greed, Lust, Pride, Sloth, Wrath, the Void | one per Court Variant |
| Yoke Fiend | Infinite Duress, Unstable, Willing Sacrifice, Low on the Blood Chain | Fang of the Seething Black and others |
| Stalker | Living Shadow, Gruesome Cover, Undying Vassal | Fang of the Seething Black |
| Corpse Guard | Shredding, More Worm than Man | The Great Hunger |
| Plague Knight | Ravenous Infection | The Great Hunger |
| Anointed Heavy Infantry, War Wolf | Incandescent, Appetisers | Cadaver Corps |
| Sultanate Sapper, Janissary | Improvised Trap, Whirling Dervishes | Ghazi of the Golden Path, Fida'i of Alamut |
| Trench Cleric, War Prophet | Away, Serpents!; Day of His Wrath | Eire Rangers, Cavalcade of the Tenth Plague |

The Shocktrooper case is the one to check first: the abilities are hidden by
the profile attribute and revealed by unit-level modifiers
(`profile:Axe Mastery set hidden=false when Remnants of Byzantium`), which the
dataset already carries under `unit.modifiers`. The fix is in the parser
(record the profile's `hidden`) and `applyVariant` (drop hidden abilities the
Variant does not reveal), and nothing needs typing.

### DA-02. The Winged Thrall is a profile, not a recruit

`Black Grail.cat` line 3215 carries a second Unit profile named "Winged Thrall"
on the Thrall entry, for the Fly Thrall the book prints as "Grail Thralls / Fly
Thralls" (one entry, one cost, one abilities block). The parser emits it as its
own unit: cost 0/0, no roles, no keywords, no abilities, `secondaryProfile`
unset, so `recruitable()` offers it and the recruit sheet lists a 0-Ducat
"Winged Thrall" Trooper with an empty statline beside the 25-Ducat Thrall. The
Carcass Front parser already has the right shape for this (`secondaryProfile`,
which keeps the Martyr Penitent off the list); the catalogue parser needs the
same for a second Unit profile under one entry.

### DA-03. The Sister of Saint Cosmas is named "Combat Medic"

`Mercenaries.cat` line 4: the selectionEntry is "Sister of Saint Cosmas" and its
Unit profile (line 24) is named "Combat Medic". The pipeline ships the
profile's name. The dataset therefore has two Combat Medics, one New Antioch
and one Mercenaries, and the Mercenaries one has abilities that say "the
Sisters are experts" and "when a Sister of Saint Cosmas carries out a Treat
ACTION". The book's entry (Warbands L10366, "Sister of Saint Cosmas") reports as
having no dataset unit, and a Trench Pilgrims player hiring one sees a Combat
Medic. `RULES-COVERAGE-AUDIT.md` left this as an unconfirmed candidate; it is
confirmed. The `reconcileGearNames` rule in `rules-build.mjs` (the books decide
when entry and profile disagree) is the right rule; it is applied to gear and
not to units.

### DA-04. Abilities the book prints and the dataset does not carry

Absent from every catalogue, so no parser change can supply them:

| Unit | Missing ability (book) |
| --- | --- |
| Heretic Trooper | Heretic Legionnaires |
| Azeb | Light Skirmishers |
| Yeoman | Trench Moles |
| Plague Knight | Plague Knight Ranks |
| Hound of the Black Grail | Infested Carcasses, Teeth & Claws |
| Heralds of Beelzebub | Maddening Buzzing |
| Combat Biologist | Battlefield Vivisection, Prize Specimens |
| Artillery Witch | Artillery Witch Battery |

Present in a catalogue as an Ability profile and not attached to the unit by
the parser (nested in a selectionEntryGroup, or reached through an infoLink):

| Unit | Ability | Where it sits |
| --- | --- | --- |
| Castigator, Trench Pilgrim | Zealot Strength | Trench Pilgrims.cat, two copies |
| Heretic Priest | Puppet Master | Heretic Legion.cat |
| War Wolf | Assault Beast | Heretic Legion.cat |
| Artillery Witch | Abiotic Life, Levitate | infoLinks |
| Janissary, Yüzbaşı | Counter-Charge | replaced by the Dispatch; the layer removed it without the book-side check |

Heralds of Beelzebub's Infected Proboscis is a Weapon profile and Demonic Aura
is an option, so those two are represented, differently. Every row above is a
rule a player at the table cannot read in the app.

### DA-05. Ability headings the book does not print

| Unit | App shows | Book prints | Source |
| --- | --- | --- | --- |
| Lieutenant | On my Command! | Hold Your Fire! | `New Antioch.cat` line 3208; the text under it already says "Hold Your Fire! ACTION" |
| Corpse Guard | Parasitic Tick | Parasite Host | catalogue |
| War Prophet | Laying on Hands | Laying on of Hands | catalogue |
| Takwin Homunculus | Pummeling Blows | Pummelling Blows | catalogue |
| Goetic Warlock | "Goetic Portal \| Spell (Cost 2) \| Goetic Warlock only", "Necrotic Gaze \| Spell (Cost 0) \| Goetic Warlock only" | Goetic Portal, Necrotic Gaze | `dispatch-01.layer.json` lines 723 and 737 used the Dispatch's table header row as the ability name |

The Anchorite Shrine's "Broken on the Wheel" text also begins "Broken on the
Wheel: Broken on the Wheel:", a doubled prefix from the catalogue.

### DA-06. The Warbands-book Battlekit parser stops at a wrapped keyword line

`parseWarbandsBattlekit` in `scripts/lib/parse-battlekit.mjs` reads the profile
row from one line and then scans for `**` rules, stopping at a "section banner"
defined as `WB_BANNER = /^[^a-z]{8,}$/`. A keyword line that wraps prints its
continuation in capitals, `SHOTGUN, SHRAPNEL`, which matches the banner test,
so the continuation is dropped AND every rule under it is never read.

Affected, with what the dataset's `battlekit` entry lost:

| Item | Keywords lost | Rules lost |
| --- | --- | --- |
| Punt Gun | SHOTGUN, SHRAPNEL | Overcharge |
| Trench Mortar | IGNORES COVER, SCATTER (and Range reads `6”` with `-36”` inside a keyword) | High Trajectory |
| Tank-Splitter Sword | CRITICAL, CUMBERSOME | the 1.0.2 armour rule |
| Titan Zulfiqar | CRITICAL, HEAVY | |
| Engineer Body Armour | NEGATE SHRAPNEL | Ballistic Box Armour |
| Sultanate Grand Cannon | HEAVY, IGNORE ARMOUR | Unstoppable Object |
| Corruption Belcher | GAS, IGNORE ARMOUR | |
| Ophidian Rifle | IGNORE COVER, IGNORE LONG RANGE | |

`src/rules/arsenal.ts` line 105 takes `b?.rules ?? [p.rules]`: the book entry's
`rules` is an empty array, not undefined, so the Codex shows nothing for these
where the catalogue has the rule. The same page-furniture initials that the
campaign parser filters (`VM`) appear here as `PW` and reach four keyword and
rule strings (`SHOTGUN PW`, `CUMBERSOME PW`, `Ranged Attack. PW`).

### DA-07. The Dispatch price change never reaches the price

`dispatch-01.layer.json` line 248: `setCost` on `{ kind: "weapon", id:
"Incendiary Grenades" }`, quoting "Change the Cost of Incendiary Grenades to 10
in the following Armoury Tables". The op writes the catalogue weapon profile
(the Iron Sultanate copy now reads 10). The app prices from
`dataset.armouries[].rows[].cost`, via `priceOf` in `rules/armoury.ts`, and all
six rows still read 15. The layer vocabulary has `addArmouryRow` but no
`setArmouryRowCost`, so the four other `setCost` ops should be checked the same
way. The armoury-price section of `rules:audit:battlekit` lists every row whose
book price and catalogue price disagree; Engineer Body Armour (45 vs 80),
Malebranche Sword (50 vs 35) and Serpent Assault Gun (50 vs 45) are the ones
where neither source is a Dispatch change and someone has to decide.

### DA-08. Recruitment limits missing

| Unit | Book | Dataset |
| --- | --- | --- |
| Mamluk Faris | 0-1 | none |
| Scripture Guardian | 0-1 | none |
| Anointed Heavy Infantry | 0-5 | none |

Nothing stops a roster taking three Scripture Guardians. The book audit also
shows every unit's `min` and `max` against the header, so any Variant op that
shifts a limit can be checked the same way.

### DA-09. Keywords missing

| Unit | Missing from the dataset |
| --- | --- |
| Anchorite Shrine | FEAR, NEGATE SHRAPNEL, STRONG, TOUGH |
| Sultanate Sapper, Combat Engineer | NEGATE MINED (the 1.0.2 changelog adds it; the entry text carries it as an ability named "Negate Mined" instead) |
| Combat Medic (New Antioch), Sister of Saint Cosmas | NEGATE FEAR |
| Praetor, Sorcerer, Pit Locust, Heralds of Beelzebub | FLYING |
| Takwin Homunculus | SULTANATE |

The Anchorite Shrine matters most: `battlekitLimits.ts` reads STRONG and the
Trauma procedure reads TOUGH, so the app applies neither to it.

### DA-10. Ability text that states a different rule

The script prints the full pair; the material ones:

- **Chorister, Unholy Hymns.** Catalogue: "-1 DICE for all ACTIONS they
  attempt". Book: "Add -1 DICE to Success Rolls taken for enemy models that are
  within 8" of one or more Choristers."
- **Castigator, Enforced Orthodoxy and Whip of God.** Both catalogue texts
  are an older draft; the book's Whip of God sets aside a D6 per attack.
- **Sultanate Sapper, Forward Positions.** Catalogue "you must deploy them up
  to 6" away"; book "you can deploy". Set Mine and Defuse Mine also carry the
  pre-MINED wording.
- **Desecrated Saint, Annihilator.** Different sentence, same intent, but the
  catalogue's version adds a clause the book does not have.
- **Stigmatic Nun, Agile; Ecclesiastic Prisoner, Mad Dash.** The book ties
  the bonus to the Risky Success Roll; the catalogue says "with +1 DICE".
- **Communicant Cross.** The catalogue lists "Iron Capirote, Combat Helmet and
  a Gas Mask"; the book lists the Equipment it counts as having at no cost.

### DA-11. Weapon profiles that differ from the Battlekit chapter

- **Fire Shield.** In the Court, New Antioch and Trench Pilgrims catalogues it
  has no keywords and the rule "Always takes one hand to use in both melee and
  in ranged combat. Grants -1 to all injury rolls against the model. This bonus
  stacks with any armour". The book: `-1 INJURY MODIFIER, NEGATE FIRE` and
  "Flame Repellent". The Heretic Legion copy is right but its text starts "dd
  -1 INJURY DICE". This is a wrong rule on a shield four factions can buy.
- **IGNORES ARMOUR** on the Flamethrower and Heavy Flamethrower
  (`Heretic Legion.cat`). The glossary keyword is IGNORE ARMOUR; a keyword
  lookup on the card finds nothing.
- **Sultanate Grand Cannon** carries `HEAVY IGNORE ARMOUR` as one keyword
  (a missing comma).
- **Molotov Cocktail**'s Liquid Fire text says "made with an Incendiary
  Grenade"; **Assassin's Dagger**'s text says "Assassin's Blade".
- **Shotel** has no Bypass Shield rule; **Tank Palanquin** has no Bulky rule;
  **Holy Water of Lalibela** lacks CONSUMABLE.
- Rules whose book heading the catalogue drops: Holy Smoke (Chemical Incense),
  M.U.R.A.D Bombard (Echoing Blast), Hashashin Leaf (Enhanced Strength),
  Tarnished Armour (Target of Wrath), Broken Crown (Locus of Despair), Grail
  Devotee (Grovelling Followers), Banner of Desert Wind (Sandstorm).
- Type: Fire Shield, Sarcophagus Mine, Tarnished Armour, Hashashin Leaf, Grail
  Devotee and Compound Eyes Helmet are typed `Battlekit` where the book says
  Shield, Armour or Equipment. The limit engine reads the armoury section first
  so this is mostly display, but it is the field `sectionOf` falls back to.

### DA-12. Dogs

Rulebook page 142: a Trench Dog is a Glory Item, Limit 1, 1 to 3 Glory, given
to a model, with Special Training (Guard Dog, Hellhound, Mercy Dog and so on)
at +1 Glory each and "Trench Dogs cannot, of course, be Promoted". The New
Antioch catalogue models Guard Dog, Mercy Dog and Attack Dog as `upgrade`
entries carrying a Unit profile, and the parser emits them as standalone
Troopers at 5 Ducats with no gate, so the New Antioch recruit list offers
three 5-Ducat dogs. The Mercenaries copies (Guard, Martyrdom, Mercy, Hellhound
at 1 Glory) are closer to the book's price but are still offered as recruits
rather than as an item on a model. Neither is what the page says.

### DA-13. Content with no book in the repository

The dataset carries 27 Variants. Six are flagged third-party and gate their
units behind the "Allow third-party" switch: Cadaver Corps, Nomads of
Al-Badia, Ghazi of the Golden Path, Remnants of Byzantium, Children of
Yggdrasil, Fang of the Seething Black. Three more are in no committed source
at all and carry no flag:

| Variant | Units it unlocks | Mentioned in |
| --- | --- | --- |
| The Great Hunger (Black Grail) | Matagot Hag, Gregori Gula | nothing under `data-sources/` |
| The Red Brigade (New Antioch) | Trench Dog, Crimson Communicant | nothing |
| Eire Rangers (New Antioch) | reveals Away, Serpents! on the Trench Cleric | nothing |

Their statlines, costs, abilities and rules text rest on the community
catalogue alone, and `rules:check` counts them as `unconfirmed` and passes.
Either the source they come from (a Trench Wire issue, most likely) should be
extracted and committed like the Dispatch, or the Variants should be flagged
so the app says what it can and cannot vouch for.

### DA-14. Names the books do not print

Catalogue names shipped where every book prints another: Engineer (Combat
Engineer), Heavy Infantry (Mechanized Heavy Infantry), War Wolf (War Wolf
Assault Beast), the CLERGY keyword on the Sniper Priest (no book), "Tawkin
Homunculus" in Artificial Life's text, "Hound of the Cult of the Black Grail"
and "Cult of the Black Grail model" in three Black Grail abilities, "Cultist"
for the Yoke Fiend in Hateful. Low impact individually; collectively they are
what a `.ros` round-trip and an armoury restriction ("Combat Engineer only")
match against.

### DA-15. Paraphrases

The remaining `ability.text` rows the script prints are catalogue paraphrases
that do not change the rule (Sworn Brethren, Temporal Assassin, Symphony of
Slaughter, Resurrection and about fifteen more). They are listed so that a
pass which replaces catalogue text with book text can do them all at once, and
so nobody re-reads them looking for a rules difference.

## What the audits show is right

So the next pass need not re-check it: every statline the old six-field check
covers still agrees; the Dispatch's changes to the Yüzbaşı, Brazen Bull,
Amalgam, Observer, Witchburner, Scripture Guardian and the Mercenary keyword
set are attributed to `dispatch-01` in provenance and are not drift; the
Court's NEGATE FIRE is implied by DEMONIC; the seven Aura abilities are gated
by Variant in the catalogue and only DA-01 stops the app honouring that; the
attack calculator's weapon keyword lookups otherwise match the chapter.

## Suggested order

1. DA-06 and DA-07 (parser and layer defects; each fix is a few lines and
   restores rules and prices the books state).
2. DA-01 and DA-02 (parser: record `hidden` on Ability profiles and treat a
   second Unit profile as `secondaryProfile`).
3. DA-03 and DA-05 (apply the book-decides-the-name rule to units and ability
   headings; fix the two Dispatch op names).
4. DA-08 and DA-09 (constraints and keywords, all from the book audit's output).
5. DA-04, DA-10, DA-11 as a `rulebook-corrections` layer, which
   `RULESET-MODEL.md` section 4 already names and nothing yet generates.
6. DA-12 and DA-13 need a decision from the maintainer before any change.
