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

Measured on the public warband `225201` on 25 September 2026. That warband
belongs to a stranger and is **not committed**.

**There is no committed fixture yet.** The design's acceptance test runs on a
share link from a warband the owner owns, and that link has not been supplied.
Until it is, the reading is covered by an envelope built in their shape (see
*Checking it* below), which proves what resolves and what does not but cannot
prove the shape is right for a real second warband.

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

What is matched, in order, for each kind of thing:

| thing | resolved against |
| --- | --- |
| the link itself | the share path **exactly**: `/warband/detail/<id>` on `trench-companion.com` (with or without `www.`). Another `/…/detail/<id>` page on their own host is refused — `/campaign/detail/4412` is a campaign, and the endpoint behind this serves warbands, so taking the id out of it would fetch a different object belonging to somebody else |
| faction | the `fc_<slug>` part of `faction.faction_property.object_id`, against each faction's `id` and printed name |
| Warband Variant | the `_fv_<slug>` part, against each Variant's `id` and printed name, with a leading `The` folded away on both sides |
| model | `model.name` within the warband's faction, then the `md_` slug; then both again across the whole recruitable list, and only where exactly one entry carries the name |
| item | `equipment.name`, then the relation's `custom_rel.name`, then the `eq_` slug — all three are names they publish for the same thing, and they differ (their `Urn of Bitter Ashes` is the Dirge of the Great Hegemon's `Broken Crown`, their `Greatsword / Greataxe` is bought through a relation called `Great-Sword/Axe`) |
| upgrade | the `up_` slug against the model's own entry options, with the model's own `md_` slug stripped from the front where their id is namespaced by it |
| Skill | the `sk_` slug against the four Advancement Skills tables |
| injury | the `in_` slug against the Trauma Table |
| Exploration Skill | the `es_` slug against the seven Exploration Skills |

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
about to say the same thing.

## The prices are ours

[Rule 1](../CLAUDE.md#1-never-write-game-data-by-hand): a cost in this app comes
from the generated dataset or it does not exist. Their `cost_value` is read for
one purpose only — so the report can say, per item, where the two differ.

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
and names all three; the Strongbox here is their own `spare_*` either way.

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
| `exploration.locations` | `Warband.explorationDiscoveries` (FD-07) |
| `context.campaign_round`, `context.victory_points` | `Warband.importedCampaign`, **each only where their record states it** |

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

## Not mapped

Reported on every import, whether or not the warband carries a value, because a
player is owed the knowledge that a field was skipped rather than finding out
later that something did not arrive:

| field | why not |
| --- | --- |
| `scar_reserves` | Battle Scars are recorded from the Trauma Table here, and what this counter holds is not stated anywhere public. |
| `stat_selections` | What a stat selection changes is not stated anywhere public. |
| `active` | It is not known whether this marks a model benched for a game or retired from the roster. |

All three wait to be measured on a warband the owner owns, rather than be mapped
on a reading of one stranger's record.

Reported when they hold something: `fireteams` (a Fireteam is a name on a model
here, and their grouping has not been measured), `modifiers`, `consumables`, and
`notes` where their record keeps it as a list rather than as one piece of text.

Not read at all, and not reported, because they are about their site rather than
about the warband: `id`, `source`, `contextdata`, `modifiersloc`,
`restrictions_list`, `warband_user_id`, `warband_campaigns`,
`warband_campaign_invites`, and the `faction_rules` list (our faction rules come
from our own dataset).

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

The acceptance test on a real share link is **still outstanding** and waits on
the owner's own link, as above.
