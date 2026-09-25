# Importing a warband from Trench Companion

`src/services/trenchCompanionImporter.ts`, `src/services/trenchCompanion.ts` and
`src/app/api/import/trench-companion/route.ts`. Sibling to
[`NEWRECRUIT-IMPORT.md`](NEWRECRUIT-IMPORT.md), and deliberately the opposite
of it on the one question that document is about.

CI-1 in [`DESIGNS-2026-09-25.md`](DESIGNS-2026-09-25.md). A player who builds
in [Trench Companion](https://trench-companion.com) and plays here should not
have to rebuild. Their share page carries the whole campaign state — the
Experience, the Skills, the injuries, the Strongbox, the round — which the
NewRecruit import has to reconstruct from a list of models and a budget.

## The endpoint

A share link is `trench-companion.com/warband/detail/<id>`. The JSON behind it
is served without a login at:

```
https://synod.trench-companion.com/wp-json/synod/v1/warband/<id>
```

It returns an envelope — `id`, `warband_id`, `warband_user_id`,
`warband_campaigns`, `warband_campaign_invites`, `warband_data` — whose
`warband_data` field is **a JSON string inside the JSON**. That is their shape,
not a mistake, and both the route and the importer parse it.

The shape was first measured against a public warband on 25 September 2026.
That warband belongs to a stranger: it is **not committed**, nothing reads it,
and its id is written down nowhere in this repository — measuring a shape
against a public record is one thing, publishing the pointer to somebody's
roster is another.

**The committed fixture is the owner's own**,
`data-sources/fixtures/trench-companion/al-qarn-rihla-505410.json` — Al-Qarn
Rihla, Iron Sultanate, House of Wisdom, thirteen models, campaign round 5,
supplied by them for this purpose and kept exactly as their endpoint returned
it. It is what `trenchCompanionFixture.test.ts` runs the real importer over,
and most of what this document says about their shape is a fact measured on it
rather than a reading of their bundle.

## The etiquette

This is the only place in the app that makes a request to somebody else's
server, so the rules it follows are written down rather than left to the code:

- **The user's own link, on the user's own action.** Nothing fetches until a
  player pastes a link and presses Fetch.
- **The browser never calls their host.** A page on our origin cannot read a
  cross-origin JSON response without CORS headers they have no reason to
  publish, so the request is made server-side. **Only the warband id is sent** —
  no session, no cookie, no referrer, nothing about who is importing.
- **Nothing is cached.** The response carries `no-store` and the fetch opts out
  of Next's data cache. A player who fixes a typo on their share page and
  imports again gets what the page says now.
- **Nothing in bulk.** One id per request, rate-limited per IP
  (`BUCKETS.companionImport`, twenty in a quarter of an hour). Enumerating
  their warbands is not something this endpoint can be turned into by calling
  it faster.
- **Redirects are not followed.** Their endpoint answers 200 directly, and
  following a 3xx would send our server wherever the answer points — to any
  host, including one a user could never reach themselves. A 3xx is reported
  with its status, so if that ever changes it is a one-line change made
  deliberately rather than a door left open in case it is needed.
- **Nothing is stored.** The envelope is passed straight back to the browser.
  It reaches our database only if the player presses Import, and then as our
  own shapes, with none of their ids in it.

Every failure is an error the player sees **with the upstream status in it**: a
non-200, a body that is not JSON, a missing `warband_data`, a `warband_data`
that is not JSON, a host that cannot be reached. There is no cached copy and no
partial warband to fall back to
([rule 2](../CLAUDE.md#2-never-invent-a-fallback)).

## Resolution is by name, which is the opposite of the NewRecruit rule

[`NEWRECRUIT-IMPORT.md`](NEWRECRUIT-IMPORT.md) is a document about why a roster
line is resolved by `entryId` and **not** by its name. That conclusion does not
transfer, and the reason is worth stating so the two are not read as
contradicting each other:

| | what the file carries | what it means |
| --- | --- | --- |
| BattleScribe `.ros` | `entryId`, the catalogue's own id | **our** id. The file is telling us which entry it is, and matching on the name instead threw that answer away. |
| Trench Companion | `md_plagueknight`, `sk_standfirm`, `eq_gasgrenades` | **their** id. It names nothing in our dataset and would mean nothing to a later reader of ours. |

Their ids are slugs of their published names, and every object in their record
also carries the name. So the join is by name — and **none of their ids is
stored on a warband**.

**The slug first, then the name.** That order is the owner's fixture's doing.
On the warband the shape was first measured against, every `model.name` was the
entry's own display name, so resolving by name worked — by accident. On a real
roster the name is the PLAYER's: `Jawhar al-Sari` on a `md_mamlukfaris`,
`Al-Qahhar, the Crippled` on a `md_brazenbull`. Their id is the stable half of
their record, so it answers first; the name is the fallback for an id no rule
reaches, and is otherwise just `customName`.

Their slugs carry structure, and it is structure about our data:

| in their id | what it means |
| --- | --- |
| `md_azeb_mv_kavass` | the Azeb under a named Variant. `_mv_` separates the base entry from the Variant's own name for it, and our Variant-applied list calls that model a `Kavass` |
| `md_takwincreation_golem` | the same Takwin Homunculus entry, created by the Book of Golems. The suffix says how the model ARRIVED, not which entry it is, so it is stripped before resolution and answered separately as `grantedBy` |
| `up_alchemicalformulae_massive_size` | an upgrade namespaced by the option GROUP, with underscores inside the name. The first segment is dropped whatever the group is called; `nameKey` makes `massive_size` and `Massive Size` the same key |
| `el_ransackedalchemistworkshop_cf` | a Location, with the book that printed it (`_cf`, Carcass Front). Our tables hold one row per Location whatever printed it, so the suffix comes off before the name is matched |

Where the `_mv_` half names something no list here carries, the model resolves
to the base entry and the report **says so**: a Variant can reprice a model as
well as rename it. `md_mamlukfaris_mv_sipahi` is the case — the Defenders of
the Iron Wall state the Sipahi as a Variant rule, at 110 Ducats, "using the
Mercenary Entry for a Mamluk Faris", and the base Mamluk Faris it falls back to
costs no Ducats at all.

What is matched, in order, for each kind of thing:

| thing | resolved against |
| --- | --- |
| the link itself | the share path **exactly**: `/warband/detail/<id>` on `trench-companion.com` (with or without `www.`). Another `/…/detail/<id>` page on their own host is refused — `/campaign/detail/4412` is a campaign, and the endpoint behind this serves warbands, so taking the id out of it would fetch a different object belonging to somebody else |
| faction | the `fc_<slug>` part of `faction.faction_property.object_id`, against each faction's `id` and printed name |
| Warband Variant | the `_fv_<slug>` part, against each Variant's `id` and printed name, with a leading `The` folded away on both sides |
| model | the `md_` slug within the warband's faction — whole, then the part after `_mv_`, then the part before it — then the same across the whole recruitable list, and only where exactly one entry carries the name; then `model.name`, which is the player's |
| item | `equipment.name`, then the relation's `custom_rel.name`, then the `eq_` slug — all three are names they publish for the same thing, and they differ (their `Urn of Bitter Ashes` is the Dirge of the Great Hegemon's `Broken Crown`, their `Greatsword / Greataxe` is bought through a relation called `Great-Sword/Axe`) |
| upgrade | the `up_` slug against the model's own entry options: the whole tail, the tail without its first (group) segment, and the tail with the model's own `md_` slug taken off the front. Where the options answer nothing, the gear shelves below — their "upgrades" and our options are not the same split |
| Skill | the `sk_` slug against the four Advancement Skills tables |
| injury | the `in_` slug against the Trauma Table |
| Exploration Skill | the `es_` slug against the seven Exploration Skills this ruleset carries. Their bundle offers one this ruleset has no Skill for, `es_scoutreport`; a Warband holding it is told so by name |
| Exploration Location | the `el_` slug, with the book suffix off, against the Common, Rare and Legendary tables — then the equivalence file below |
| Patron | `faction.patron_id` (`pt_houseofwisdom`) against the eleven Patrons. Not a label: both ends of every 2D6 Skill Table are a `Patron Skill`, and `patronSkillsFor` matches `Warband.patron` against these names to fill them |

**Ambiguity resolves to nothing.** Six entries in the shipped ruleset are called
`Homunculus` (ID-1); a name that names six things names none of them, and it is
reported rather than bound to whichever was first in the list.

**Anything unresolved is reported and left off.** Their catalogue is not ours —
it carries Preview entries, its own promotion ranks and its own spellings — and
an importer that reached for the closest name would put a model on a roster the
player never bought.

An item is looked for on three shelves in turn: this faction's Armoury Table
(where a price for wargear lives, because the same item is priced differently by
different factions), then the model's own entry options, then the catalogue's
Battlekit. An item found only on the third is priced at the catalogue's own cost
and the report says the Armoury does not stock it, because the legality check is
about to say the same thing. *Secrets of Takwin* is the case that reaches the
third shelf from their **upgrade** list: the catalogue states the House of
Wisdom's Secrets on the Warband rather than on the Alchemist
(`Iron Sultanate.cat:2831`), so this ruleset holds it beside the gear, and the
model may have one — *"Each Jabirean Alchemist in a House of Wisdom Warband can
have one of following abilities at the cost indicated below."*

### Two names for one entry

Every shelf is asked by name first and, only where no name answered at all, by
the catalogue's **other** name for the same entry. The Iron Sultanate's
`selectionEntry name="Elixer of Al-Khidr"` (`Iron Sultanate.cat:77`) wraps a
profile called `Elixir of Al-Khidr` (`:90`) — their misspelling and ours in one
entry — and the pipeline now ships the entry's spelling as
`WeaponProfile.aliases` instead of deleting it. So a file written against that
spelling resolves **from the catalogue**, which is what keeps it out of the
equivalence file below.

Names always first. An alias can only fill a gap, never redirect an item that
some entry holds outright — the failure an earlier attempt produced when it made
entry names into names (`Melee -> Knight Companion of the Bladed Fly`; see the
bundle note in `scripts/lib/parse-battlescribe.mjs`).

### When no rule of spelling reaches

`data-sources/trench-companion/id-name-equivalence.json` names the handful of
their ids that no slug rule and no alias reaches. The app reads the **generated
copy** of it (`src/data/generated/trench-companion-ids.generated.ts`, written by
`rules-build.mjs`), because no deployment carries `data-sources/` — see
[`DEPLOYMENT.md`](DEPLOYMENT.md#what-the-deployment-does-not-carry); the guard
asserts the two are identical. Three today:
`md_takwincreation` (their `Takwin Homunculus`, our `Homunculus`),
`up_meleemight` (their `Kavass`, our `Studied Blade`) and `el_snipersnest`
(their `Sniper's Nest`, our `Sniper’s Lair`). Each entry cites **both sides**,
states no cost, statline, keyword or constraint
([rule 1](../CLAUDE.md#1-never-write-game-data-by-hand)), and is guarded by
`trenchCompanionEquivalence.test.ts`, which fails when an entry stops being
needed — when the ordinary rules would now reach it on their own, when it names
something this ruleset no longer has, or when its prefix has no domain the
guard knows how to check.

**The rules run first and the table second, everywhere it is consulted.** The
other way round is how `up_meleemight` came to be dropped: a table entry saying
"nothing to resolve to" was read before the rules that would have found
something, and three models each lost a point of Melee and 5 Ducats.

## The prices are ours

[Rule 1](../CLAUDE.md#1-never-write-game-data-by-hand): a cost in this app comes
from the generated dataset or it does not exist. Their `cost_value` is read for
two purposes only: so the report can say, per item, where the two differ, and
so a line their record states as **not a purchase** is not charged as one.

One line per item, listing the models it is on. The same Standard Armour on
four Kavass is one entry in the price report with four names against it, not
the same sentence four times.

### Kit the model already has is not bought twice

Their record lists a model's Battlekit as equipment lines like any other, and
pricing each one off the Armoury Table charged the player for kit the catalogue
prices into the model: 45 Ducats of armour and helmet on a Scripture Guardian,
5 for the Sultanate Sapper's own Shovel, 55 on a Mamluk Faris whose price is 4
Glory.

Two facts answer it, in this order:

1. **Our entry carries it.** `carriesAsBattlekit` (`src/rules/battlekit.ts`) —
   the same answer the equip sheet uses to hide an Armoury row from a model
   that already has the item. The line is left off the equipped lists
   altogether: forced kit lives on the profile snapshot, which is where the
   card renders it, where the carrying limits count it and where the Mercenary
   rule reads it. Putting it in `equippedArmour` as well would print it twice
   and give a Mercenary's Battlekit — which "cannot be removed or lost over the
   course of the campaign for any reason" — a delete button.
2. **Their record says it came with the model.** A line bought through a MODEL
   relation (`rel_md_eq_mamlukfarisbase`) at `cost_value: 0` is not a purchase
   on their side either. It is kept on the model, priced at nothing, and the
   report says per model that the price came from their record rather than from
   this ruleset. The Mamluk Faris is why: the errata gives it "Reinforced
   Armour, a Combat Helmet, and a a Jezzail with Alchemical Ammunition" inside
   its price (Warbands 1.0.2 p179), the catalogue states the armour and helmet
   as `infoLinks` rather than forced `entryLink`s, and this ruleset holds no
   Battlekit for the entry at all — the gap `rules/equipGate.ts` documents.

The Book of Golems is the same rule on an upgrade: *"It has the Human Hands
Alchemical Formula, plus Alchemical Formulas worth a total of up to 50 👑 for
free"*, so the Formula the grant names is priced at nothing. It is read from
the grant (`rules/golem.ts`, which reads it out of the shipped Exploration
table), not from a name, and `rules/formulaShelf.ts` excludes the same Formula
from the 50-Ducat allowance.

The ledger is opened the way `migrateFoundingPot` opens an imported NewRecruit
warband:

| entry | from their record |
| --- | --- |
| `founding` | `ducat_bank` and `glory_bank` |
| `quartermaster` | `ducat_bank − spare_ducat` and `glory_bank − spare_glory`, negative |

which leaves `spare_ducat` and `spare_glory` as the Strongbox, exactly.

**The debit is derived from their Strongbox, not read off `rating_*`.** This is
an amendment to the design, and the reason is a field the design did not have:
`stored_ratings` carries **`stash_rating_ducat` and `stash_rating_glory`**
beside `rating_ducat` and `rating_glory`, and the two are separate numbers.
`rating_*` is the **roster's** value; `stash_rating_*` is the **Arsenal's**. So
a warband holding anything in its stash had `bank − rating` larger than
`spare` by exactly the stash's worth, and debiting `rating` alone left the
Strongbox here richer than the Strongbox on their page by that amount.

The figure that has to come out right is `spare_*` — it is what their page
prints and what the player expects to see — so the debit is derived from it.
Both of their own figures are named in the entry's note, so the ledger still
says where the money went rather than only how much. Where their roster and
stash valuations do not add up to what the bank is down by, the report says so
and names all four — banked, roster, stash and Strongbox; the Strongbox here is
their own `spare_*` either way.

**Our arithmetic over the roster is deliberately not used.** A model or an item
that did not resolve is not on our roster and never cost us anything, so
summing our own prices would hand the player back the Ducats they spent on it.

A non-zero `debts` is a warning: this app has no debt of its own, so nothing is
booked for it.

## Campaign state

| theirs | ours |
| --- | --- |
| `experience` | `ActiveUnit.xp` |
| `elite` | `ActiveUnit.isElite` |
| `list_skills` | `ActiveUnit.skills`, with the table and roll the name resolved to |
| `list_injury` | `ActiveUnit.injuries` |
| `list_upgrades` | `ActiveUnit.specialUpgrades`, priced from our entry |
| `context.failed_promotions` | `Warband.promotionMisses` (FD-06b) |
| `exploration.explorationskills` | `Warband.explorationEffects` (FD-07) |
| `exploration.locations` | `Warband.explorationDiscoveries` (FD-07), **and what each Location grants for the rest of the campaign**, read from the Location's own text by pack G's `explorationGrants` — the Black Market's *"From now on … you can purchase Glory Items costing 8 ☼ or less"* is a permission the Warband keeps |
| `exploration.location_mods` | read as a CHECK, not as a source. Their standing-effect record says nothing the Location's own text does not, so a mod whose Location is discovered and whose text offers no choice needs no line; one for a Location we did not resolve, or one recording an option, is named in the report |
| `faction.patron_id` | `Warband.patron` |
| `context.campaign_round`, `context.victory_points` | `Warband.importedCampaign`, **each only where their record states it** |
| `scar_reserves` | `ActiveUnit.scars`, **on top of one Scar per injury** — see below |
| `active` | the model's place on the roster — see *Their fighter status* below |

`importedCampaign` is its own field rather than a write into our own numbers,
and that needs saying. Our Campaign Victory Points are **derived** from the
win/loss/draw record a campaign keeps (`campaignVictoryPoints`) and never
stored, so writing an imported total into them would mean either inventing a
results record to justify the number or having two answers to the same question.
So their round and their total are kept as what they are — a fact about somebody
else's record — and applied to a campaign only when the warband joins one, at
which point a person decides what they mean.

Both halves are optional, and absent where their record says nothing. A missing
`campaign_round` is **not** recorded as round 1: that would put a fact about
their campaign on the record that their record never asserted, and a player
reading it here would take it for their own. Where neither field is stated, the
warband carries no `importedCampaign` at all.

### Battle Scars

**Measured on the owner's own Companion screen, 25 September 2026.** Al-Qahhar,
the Crippled — a Brazen Bull carrying `in_lostarm` with `scar_reserves: 0` —
shows exactly **one** Battle Scar. So:

> Scars = one per entry in `list_injury`, **plus** `scar_reserves`.

which is what the book implies anyway: a Full Recovery and a paid ransom each
leave a Scar with no injury behind it, so the two counts were never going to be
the same number.

Both halves land on `ActiveUnit.scars`, not on `injuries`. That is the list
`scarCount` reads and `unfitForDuty` retires a model on, so an imported model
is judged by the same rule as a home-grown one. The two arrays are separate on
purpose and RC-05 is specifically about not inferring either from the other.

A Scar that came with an injury carries that Trauma row's name and roll. A Scar
from the reserves is named `Battle Scar` and carries **no roll**: their record
says how many there are and not which result caused each, and labelling one
with a row it does not have is the invention [rule 2](../CLAUDE.md) forbids.

*The same screen shows the Experience track with circles at 2, 4 and 7, which
agrees with our derived `campaign.experience.advancementAt`, and three Scar
boxes with a skull on the third, which agrees with `unfitAt` 3.*

### Their fighter status

`active` is not a flag but a state, and their own bundle names the values it
tests for — `IsDead(){return "dead"==this.State}`, `IsReserve()` on
`"reserved"`, `IsLost()` on `"lost"`, and `"dog"==e.model.State` for a Trench
Dog attached to a handler.

**Only the value `active` has been measured on a real warband.** All thirteen
models of the owner's carry it. The other four are read from their bundle —
which is where the five values and their spellings come from — and what each
one means here is a reading of the book, not of a warband anybody has seen. In
particular, what a `dog` model does when it also carries purchases of its own
is not measured: it is imported as the model its id names, and the attachment
is reported.

**It is asked before anything else is read off the model.** It used to be asked
last, so a model their record does not put on the roster still spent its gear
and its upgrades into the report — prices compared, shelves warned about, items
named as unmatched, all for a model that was never imported.

**A value that is not a string is treated as `lost`**, not as `active`. The
reading used to be `typeof raw === 'string' ? … : 'active'`, so a record whose
`active` was a number, an object or missing put the model on the roster as a
fighting member — a default dressed as a reading, on the one field that says
whether the model is there at all.

| theirs | here |
| --- | --- |
| `active` | on the roster |
| `reserved` | on the roster, `benched` — *"any models you do not use will have to sit the game out"* (p.97) is the same choice, and durable for the same reason |
| `dead` | to `fallen` with its Battlekit, through `removeFromRoster` — the one path a removed model leaves by (RR-25 / FD-05a) — and a warning naming it |
| `dog` | imported as the model it names, since our dataset holds the Trench Dog as its own entry. The attachment to a handler is theirs and is reported as not mapped |
| `lost` | **not imported**, and named in the report with their own word |

`lost` is the one that must not be guessed. What it means is stated nowhere
public, and neither reading is safe: taking it for dead removes a model the
player may still have, and taking it for benched keeps one they have lost.

## Not mapped

Reported on every import, whether or not the warband carries a value, because a
player is owed the knowledge that a field was skipped rather than finding out
later that something did not arrive. Each line says what the field is and why
nothing was taken from it, and appends how many models carry a value:

| field | why not |
| --- | --- |
| `stat_selections` | What a stat selection changes is not stated anywhere public, so there is nothing to read it from. It waits for a record that says what one does. |
| `subproperties` | Their ids for the abilities the model's ENTRY carries — `ab_artificialbody` is this ruleset's Artificial Life, `ab_pummellingblows` its Pummeling Blows — rather than anything the player chose. A model's abilities are read from its entry here, which is why the spellings differing does not matter. Two of theirs name something no entry here does: `ab_chosenhomunculus`, which marks an Alchemist as having a Homunculus without saying WHICH (the association `rules/golem.ts` searched for and did not find), and `ab_limitedupgrades`, which is the Book of Golems' own restriction and is carried as the model's grant instead. |
| `list_modelequipment` | The relation a model's Battlekit came through, which says nothing the entry does not — plus, where the entry offers a choice of kit, which package was taken. What a package contains is not stated anywhere public, so each choice is named rather than applied: the Mamluk Faris's three-way loadout is `rel_md_eq_mamlukpackage_1`, and which of the three that is nobody outside their app can say. |

`scar_reserves` and `active` **were** in this table and are not any more: both
were measured on the owner's own warband and both now map, as above. That is
what the table is for — a field sits here until somebody can show what it
means, and then it leaves.

Reported when they hold something: `fireteams` (a Fireteam is a name on a model
here, and their grouping has not been measured), `modifiers`, `modifiersloc`,
`consumables`, `restrictions_list`, `expansion_data` with `expansion_ids` (a
whole campaign state per expansion — resources, unlocked tiers, special
properties — and TrenchLine models none of it), `faction_rules` where one of
their faction rules records a choice (`rl_weaponcollections` naming the Armoury
rows the House of Wisdom's *Weapon Collections* opened; the item is on the
roster and priced from the shelf, but which rule opened it is not recorded
against it), and `notes` where their record keeps it as a list rather than as
one piece of text.

Not read at all and not reported, because they are about their site rather than
about the warband: `id`, `source`, `contextdata`, `tags.UPDATE_VERSION_REFERENCE`,
`context.id`, `context.homebrew_id`, `exploration.templocations`, `recruited`,
their per-purchase UI bookkeeping (`purchaseid`, `discount`, `count_limit`,
`count_cap`, `sell_item`, `sell_full`, `modelpurch`), `warband_user_id`,
`warband_campaigns` and `warband_campaign_invites`.

**Every one of those classifications is a test.** `trenchCompanionFixture.test.ts`
walks the keys of the committed envelope — the Warband, its context, its
ratings, its exploration, its faction, all thirteen models and every purchase
line — and fails on any key that holds a value and is neither read (with the
reader named) nor reported. That walk is what found `subproperties`,
`list_modelequipment`, `location_mods`, `expansion_data`, `faction_rules` and
`patron_id` unhandled; the next field their export grows is a failing test
rather than a silent loss.

## Checking it

- `src/services/__tests__/trenchCompanionRef.test.ts` — which warband a pasted
  link means, including that nothing a user pastes can steer the request at
  another path or another host.
- `src/app/api/__tests__/trenchCompanionRoute.test.ts` — only the id is sent,
  nothing is cached, and each way the fetch can fail is an error carrying the
  upstream status.
- `src/services/__tests__/trenchCompanionImport.test.ts` — the reading, against
  an envelope built in their shape. Every one of OUR numbers in it is read off
  the generated data; the numbers that are typed are theirs, and they are typed
  precisely because they differ from ours. `unmatched` is asserted exactly,
  not merely for the names it should contain.
- `src/services/__tests__/trenchCompanionFixture.test.ts` — **the real
  importer over the owner's own committed envelope**: the thirteen models and
  the entry each resolves to, the money, the Scars, the fighter states, every
  equipment line accounted for on every model, and the key walk above.
- `src/services/__tests__/trenchCompanionEquivalence.test.ts` — the equivalence
  file cannot outlive the drift it records, on every prefix it carries.

What this ruleset is missing, rather than what the reading gets wrong, is
reported by name and listed in the fixture test: the Lion of Jabir's
`Fierce Lion` and the Azeb's `Light Skirmisher` are real catalogue entries that
`optionsOf` does not emit — one is declared outside a `selectionEntryGroup`,
the other states its rule through an `infoLink type="rule"` — and
`es_scoutreport` is an Exploration Skill this ruleset does not carry.
