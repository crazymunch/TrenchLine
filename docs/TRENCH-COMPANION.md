# Trench Companion, and where TrenchLine goes from here

*25 September 2026. Research from the public web and the app's own
published bundle; nothing behind a login was used. The owner has offered a
demo of the campaign side, which is the one part this could not see.*

TrenchLine set out to be the warband builder and campaign companion for a
group of friends. Since August 2025 a community team has been shipping the
same thing at [trench-companion.com](https://trench-companion.com/), and
in September 2026 it carries the page title "The officially supported
Trench Crusade resource". This document records what it is, how it works,
what it does better than TrenchLine, what TrenchLine does better, and a
recommendation.

## 1. What it is

- **Lineage.** The successor to Bob The Seagull King's open-source
  [Trench Compendium](https://github.com/Bob-The-Seagull-King/trenchcrusadecompendium),
  a React rules reference and builder with its game data in JSON files.
  Trench Companion launched in early August 2025 with a redesign, accounts
  and cross-device sync; the Compendium now redirects to it.
- **Who.** A small volunteer team; the launch write-up names Bob as the
  lead. Free, with a premium membership through PayPal that unlocks
  homebrew authoring and a public MMR badge.
- **Status.** Community-made and, by its own title, officially supported.
  The Carcass Front rules (a paid expansion) went in on 29 August 2026.
  Two rule versions are live, Official and Preview.
- **Frontend source is not public.** The Compendium repo stopped in
  October 2025 apart from a redirect; a
  [data snapshot repo](https://github.com/Bob-The-Seagull-King/trenchcompaniondatasnapshot)
  from 1 June 2026 is published for homebrew authors. A
  [Trench-Crusade](https://github.com/Trench-Crusade) GitHub organisation
  holds a Java microservice backend last touched in April 2025, which the
  live app does not use.

## 2. How it works

**Architecture.** A single-page React app (Create React App, Redux plus
Zustand, Bootstrap, a PWA manifest and a service worker) served from
trench-companion.com. The backend is a WordPress site at
synod.trench-companion.com exposing custom REST endpoints under
`wp-json/synod/v1/`: warband create, update and fetch; campaigns and
campaign invites; game reports; post-game records; promotions; homebrew
create, update, subscribe and like; user search, public profiles and
settings; a multi-dataset fetch for the campaign screens; the blog and
pages. Authentication is a JWT with a refresh endpoint. Premium is a
"premium until" date on the user.

**Game data ships in the bundle.** The whole ruleset is embedded in the
JavaScript as about 1,300 typed JSON objects, each with an id prefix that
names its kind: `md_` models (122), `eq_` equipment (216), `ab_`
abilities (263), `up_` upgrades (82), `sk_` skills (105), `in_` injuries
(20), `el_` exploration locations (208), `es_` and `et_` exploration
skills and tables, `pt_` patrons (13), `sc_` scenarios (10), `gd_`
glorious deeds (92), `rl_` faction rules (146), `fc_` factions and
variants (24), `kw_` keywords (61), `zn_` map zones (28), plus the rules
chapters. Every object carries a `source` (core, carcass_front, westfalia,
creature_caster), so an expansion is a layer on the core, as it is here.

**Rules text is structured prose.** A description is a list of blocks,
each with a style tag, content, and glossary links into keywords, so the
app can hyperlink a keyword without parsing the sentence. Mechanics that
the app enforces are `contextdata` hooks on the object rather than
parsed from text: a model's `model_equipment_restriction`, a weapon's
`injury_dice_mod`, an upgrade's `keyword_mod`, a restriction override on a
variant. That is the opposite of TrenchLine's approach, which derives
each rule from the published sentence and cites it. Their way is cheaper
to build and cannot drift from the text it does not read; ours catches a
Dispatch or a catalogue reword and can prove a ruling against the book.

**Variants are deltas.** A variant model has a `base_id`, a
`variant_name`, `cut_keywords`, `cut_abilities` and `new_abilities`; a
variant faction has a `base_id`, `cut_rules` and `rules`. Recruitment is a
relation record per faction and model: cost, cost type (Ducats or Glory),
captain flag, mercenary flag, minimum and maximum. An armoury row is a
relation per faction and equipment: cost, cost type, limit. This is the
same shape TrenchLine reached from the other direction.

**A warband is one JSON document** stored as a string on the server:
banks of Ducats and Glory, a `context` with victory points, campaign round,
failed promotions and stored ratings; an `exploration` block with skills
and locations; the faction and its variant; and `models`, each a
`purchase` (cost, sell flags, the recruitment relation it came from) and a
`model` (equipment, upgrades, injuries, skills, experience, elite flag,
recruited round, scar reserves, stat selections). A `tc_version` tag
binds it to a rule version; the builder can convert a warband between
versions, refunding what the other version lacks.

**Public share pages.** Every warband has a share URL of the form
`trench-companion.com/warband/detail/<id>`, and the JSON behind it is
served without a login from the warband endpoint. That is the cleanest
import source TrenchLine could have: it already encodes the campaign
state the NewRecruit import has to reconstruct.

**Exports.** Print, plain text, and a Tabletop Simulator JSON that a
third-party Steam mod consumes. Imports: a JSON migration path from the
old Compendium, and nothing from NewRecruit or BattleScribe.

**Campaigns and games.** Campaigns with invites between accounts. A game
report is filed by one player, the opponent is notified, edits and signs
off; a verified report is locked and feeds two ratings, an Elo MMR for
ranked two-player games and a non-decreasing Trench Rating. The Post Game
Reporter (April 2026) is a linear flow off a game report: troop injury
rolls and deaths, promotions with the failed-attempt count and the dice
pool, elite advancements and injuries per model, exploration with the roll
matched to the location table or reinforcements instead, custom rewards,
then campaign values and the round advance. Most entry is manual; the
exploration match is automatic. Play Mode is listed as coming soon.

## 3. Feature by feature

| Area | Trench Companion | TrenchLine |
| --- | --- | --- |
| Rules reference | Full compendium, hyperlinked keywords, model images | Codex with the book's text; no images |
| Warband builder | Live validation, greyed options, hand limits, variants, mercenaries, Glory items | Same, with each refusal quoting the sentence it comes from |
| Rule versions | Official and Preview, switch in settings, convert a warband | Two rulesets in the build, no per-warband conversion |
| Campaigns | Multi-player with invites, rounds, victory points | Campaign hub with cloud sync, organiser, Threshold, standings |
| Post-battle | Linear reporter off a shared game record, both players sign off | Wizard with rolled Trauma, Promotion dice pool, Exploration dice, reinforcements, ledger |
| Economy | Banks and stored ratings, refunds on sell | A ledger: every Ducat and Glory movement booked, reversible within the game it was bought in |
| Play at the table | Coming soon | Play Mode: live wounds, blood markers, dice roller, deeds, per-model reference sheet |
| Ratings | Elo MMR, Trench Rating | None |
| Share | Public warband page, profiles | None |
| Import | Old Compendium JSON | NewRecruit JSON and `.ros` |
| Export | Print, text, TTS JSON | `.ros` (gaps recorded in EXP-1), roster file |
| Homebrew | Yes, premium authors, everyone can use | No |
| Mobile | Responsive web | Mobile-first, 375px base, 44px targets |
| Data provenance | Hand-entered JSON, hooks per object | Derived from the books and catalogues, cited per rule |

## 4. What it does better than TrenchLine

In the order they would matter to the owner's group.

1. **A shared game record with two-player sign-off.** One player files,
   the other confirms, and the post-battle for both sides hangs off the
   same record. TrenchLine has a post-battle per side and the Chronicle,
   but no opponent confirmation and no link between the two sides' results
   beyond the match id.
2. **Campaign invites.** A campaign is a thing you join from your own
   account. Ours is organiser-run with sync, which suits one group and is
   awkward for a pickup game.
3. **A public share page per warband.** A link anyone can open, with the
   full roster. Ours has none.
4. **Rule-version switching with conversion.** A warband can move between
   Official and Preview and be told what was lost. Our two rulesets are a
   build choice.
5. **Model images and hyperlinked keywords in the compendium.** Presentation,
   not rules, and still what people notice first.
6. **The linear Post Game Reporter.** Not more correct than our wizard, and
   in places less (it takes typed results where ours rolls and cites), but
   it is one screen with six numbered sections and no branching, and that
   is easier at a table.

Not worth mirroring now: MMR and Trench Rating (a competitive ladder is
not what this group plays for), homebrew authoring, TTS export.

## 5. What TrenchLine does better

- **Play Mode exists**, and theirs does not. Live wounds and markers, the
  dice roller with the injury arithmetic, deeds claimed in play, the
  reference sheet showing every rule a model carries. This is the part
  used at the table with a phone in one hand, and it is the part nobody
  else has shipped.
- **The economy is a ledger.** Every purchase, refund, hire and payout is
  an entry; the Strongbox is the sum; a same-game purchase is reversible
  and a played one is settled. Theirs is two banks and a refund flag.
- **Rules are derived and cited.** A refusal quotes the sentence; a
  reword in the book or the catalogue changes the app on the next build
  and shows up in a test. Theirs is hand-entered JSON with hooks, which
  is where TrenchLine's own 97 percent wrong statlines came from.
- **Import from NewRecruit**, which is where this group's rosters live.
- **The post-battle is rolled, not typed.** Trauma, Promotion, Exploration
  and the Experience rules are enforced from the book rather than entered.

## 6. Three directions

**A. Play-side only.** Stop building the builder and the campaign
bookkeeping; import a warband from Trench Companion by its share link and
be the app that runs the game at the table. Cheapest to maintain and the
sharpest identity, but it makes TrenchLine a client of a product that does
not publish an API and could change or close the share endpoint at any
time, and it discards a builder and a wizard that are now in better shape
than the one they would defer to.

**B. Full app, mirror what they do better, add the import.** Keep the
builder, the ledger and the wizard; add the four things in section 4 that
are worth having; add an import from a Companion share link so a player who
builds there can still play here. Most work, and the only direction that
keeps every advantage in section 5.

**C. Stop.** Use Trench Companion. Honest to consider: it is free,
maintained by more people than this project has, and now officially
supported. What it costs the group is Play Mode, the ledger, and any rule
the app cannot enforce because nobody typed it in.

## 7. Recommendation

**Direction B**, in this order, each one a pack:

1. **Import from a Trench Companion share link.** Read the warband JSON
   from the public endpoint by the id in the link, map it onto the roster
   file the way the NewRecruit import does, with the campaign state
   (banks, round, experience, injuries, skills, exploration) carried
   across rather than reconstructed. Only the user's own link, on their
   action; never a scrape of their dataset, whose contents are theirs and
   whose rules TrenchLine derives from the book in any case. Small, and it
   is what lets a group split between the two apps still play together.
2. **A shared game record with sign-off.** The match already has an id on
   both sides; add the opponent's confirmation, lock the record when both
   agree, and hang both post-battles off it. The Chronicle is the record.
3. **Campaign invites**, on top of the sync that exists: a campaign link
   that a signed-in player joins.
4. **A public share page per warband**, read-only, from the roster file.
5. **Per-warband ruleset conversion**, with the report of what was lost.

Play Mode stays the centre. Model images and the linear reporter are
worth doing after these five, not before; MMR, homebrew and TTS are not
on the list.

## 8. Open questions for the owner

- A demo of the campaign manager and the Post Game Reporter behind the
  login, to check section 2's account of them.
- Does the group already keep warbands in Trench Companion? If so, item 1
  moves from useful to necessary.
- Whether the group would use invites and sign-off, or whether one
  organiser keying both sides is how they actually play.

## Sources

[Trench Companion](https://trench-companion.com/) ·
[its blog](https://trench-companion.com/blog) ·
[Homebrew part B](https://synod.trench-companion.com/blog/introducing-homebrew-part-b-creating-homebrew) ·
[Post Game Reporter](https://synod.trench-companion.com/blog/new-post-game-reporter) ·
[Game Reports, Trench Rating and MMR](https://synod.trench-companion.com/blog/game-reports-trench-rating-and-mmr) ·
[Accessing Preview Rules](https://synod.trench-companion.com/blog/accessing-preview-rules) ·
[Trench Compendium repository](https://github.com/Bob-The-Seagull-King/trenchcrusadecompendium) ·
[data snapshot repository](https://github.com/Bob-The-Seagull-King/trenchcompaniondatasnapshot) ·
[Trench-Crusade organisation](https://github.com/Trench-Crusade) ·
[A Troll in the Trenches: launch](https://atrollinthetrenches.com/2025/08/04/welcome-to-the-trench-companion/) ·
[A Troll in the Trenches: warband creation](https://atrollinthetrenches.com/2026/01/07/warband-creation-2/) ·
[Trench Hub](https://trench-hub.com/), a smaller client-only builder and
campaign tracker, noted for completeness.
