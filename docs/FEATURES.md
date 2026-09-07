# Feature Inventory

The target is **everything NewRecruit does for Trench Crusade, plus everything
the original TrenchLine draft attempted** — with the second group actually
working rather than merely present.

This document is the checklist. `Status` is what the code genuinely does today,
verified by reading it, not what the UI or the README claims.

Which means it goes stale, and has twice: after Phase 2 shipped variants, unit
limits, required entries and the legality summary, this file still listed all
four as ❌ for weeks. Then three more rows drifted the same way — hand/slot
capacity, importer equipment and the live mirror all described work that had
since been done. A checklist that lags the code is worse than none, because it
is the file someone reads to decide what to build next.

A fourth row said the Court's Goetic Powers were not modelled; all 23 are. And
chasing the one that genuinely looked absent found a real bug — the app was
shipping it under a misspelling, along with a weapon whose published FUMBLE
Keyword had never reached a player (see [`RULESET-MODEL.md`](RULESET-MODEL.md)
§6, "Names: the books decide"). Auditing this file is not busywork.

Every drift has been in the same direction: **understating** what is built.
So re-read it whenever a phase closes, and verify each non-✅ row against the
code rather than trusting the note beside it — every one of the six checked in
September 2026 took a grep to settle, and half of them were wrong.

| Status | Meaning |
|---|---|
| ✅ | Works |
| 🟡 | Present but incomplete, or works on wrong data |
| ❌ | Claimed somewhere but not implemented |
| ⬜ | Not attempted yet |

---

## Part 1 — NewRecruit parity

The baseline. A roster builder is only useful if it refuses to build an illegal
roster.

| Feature | Status | Notes |
|---|---|---|
| Faction/warband selection | ✅ | 6 factions; Mercenaries orphaned (`AUDIT.md` §1.5) |
| **Warband Variants / sub-factions** | ✅ | 17 derived from the catalogues, `variantId` on `Warband`, `VariantPicker` in the builder, and variant ops that change legality and armoury |
| Add/remove/duplicate models | ✅ | |
| Points budget with live total | ✅ | Both currencies; `validate.ts` raises `over-budget-glory` as well as Ducats |
| **Unit min/max limits** (`0-2 Sniper Priests`) | ✅ | Derived per unit, raised or lowered by a variant |
| **Required entries** (`must include 1 Lieutenant`) | ✅ | `unit-min`, scoped to the roster's own faction, with variant overrides |
| **Wargear legality** (`ELITE only`, `Limit: 2`) | ✅ | Rule-driven from the armouries, per faction and per variant. **A compound requirement used to admit everybody.** `satisfiesOnlyFor` matched the whole restriction string at once, so "Janissaries & Yüzbaşı with Janissary Veteran only" matched nothing and the function returned `true` — a Sultanate Azeb could be handed the Regimental Kaşık with nothing on screen at all, because the clause parses cleanly as `onlyFor` and so never reached the `unparsed-restriction` warning either. It is now read in two halves by `onlyForVerdict`: the identity half ("Janissaries & Yüzbaşı", alternatives, plural against the entry's singular) is checked and refuses; the condition half ("with Janissary Veteran") is answered from what the **player chose**, never from the entry's own printed abilities — every Yüzbaşı carries a `Janissary Veteran` ability whose text is an offer priced at +5 — and where the roster cannot answer it, the permit stands with a visible caveat rather than a refusal that would make the entry unbuyable by anyone (RC-06) |
| Earned recruitment bounds (Curse on Creation) | ✅ | **A published ability nothing consumed.** *Curse on Creation* raises the Amalgam limit to 0-2 for a Black Grail Warband whose other models are worth 1000 Ducats, in exchange for six Grail Thralls removed in a Promotion Step, plus an immediate free Amalgam. Its text was derived and rendered on the unit card, and the recruitment path never read it: the Amalgam's `max` of 1 stayed correct as a *base* bound, so a second Amalgam was illegal whether or not the player had earned it — there was no state that could tell the two apart. The Warband now carries `earnedRecruitment` claims, checked once when claimed and never again (a Warband that shrinks next game has still paid), and the claim happens in the Promotion Step, where the rule says it does. The six leave the Roster rather than being marked dead, and the model the rule gives is marked `grantedFree` so `toRoster` prices it at zero — without which the free Amalgam is billed and the entitlement is worth nothing (RC-08) |
| Option-group limits (Strains, Vile Corpus) | ✅ | **Five options, and none of their governing clauses.** A Grail Thrall "can have up to 1 Strain", with a second only once the *other* models in the Warband are worth 1000 Ducats, and "once a model has a Strain, it cannot be removed or lost for any reason"; each Amalgam has one Vile Corpus and "each Amalgam in a Warband must have a different" one. The options were present, priced and displayed with empty `constraints`, so all four Strains were takeable, buying one and dropping it cost nothing, and two Amalgams could share a Corpus. `Constraint` sits on a single option and can only say "at most one Bolgias Gut" — these are about the group, so the unit carries `optionGroups` and `rules/optionGroups.ts` counts them. "Other models" excludes the model being checked, or an expensive Thrall qualifies itself for its own second Strain. Permanence asks before undoing rather than refusing: a roster is the player's own record and a mis-tap is a real thing, but the rule is now said out loud first (RC-07) |
| Hand/slot capacity (1H/2H, shield combo) | ✅ | `rules/battlekitLimits.ts`. Every number comes from `dataset.battlekitLimits`, parsed off the BATTLEKIT LIMITS page — one 2-Handed or two 1-Handed per section, one Armour, one Shield with its own restrictions, and the STRONG / CUMBERSOME / HEAVY carrying rules. "Hand-rolled" described the name-pattern engine that was deleted |
| **Roster legality summary** | ✅ | `LegalityStrip` renders the verdict, each violation naming the rule that produced it |
| Per-model wargear costs rolled into total | ✅ | |
| **Glory Items / per-model upgrades** | ✅ | `UnitOption`; the Grail Strains and the Vile Corpus are derived onto their entries, and the Dispatch's two new Glory Items are stocked and priced. "Goetic Powers are still not modelled" was the fourth stale note here — all 23 the Warbands book prints are in the dataset, 10 as unit options grouped by Deadly Sin and 13 as priced spell profiles, every cost matching the book. Checking the one that looked missing is what found the gear-naming bug: it was shipping as *Call of Flesh* |
| Import from NewRecruit / BattleScribe | 🟡 | JSON/XML/text, resolved against the generated dataset. An entry it cannot match is **reported, not invented** — it used to become a 35-Ducat Trooper with a made-up statline. Weapons, armour, equipment, Formulae, XP and advancements **are** carried across now, on both the JSON and XML paths: the XML path never read a selection's children, so a `.ros` import arrived as bare profiles and reported success. What is still missing is a matched-entry report the importer shows *before* committing |
| Print a roster | ✅ | **Three modes: Plain, Pretty and Cards.** There was no print stylesheet at all — One `print:hidden` on an action bar, and `window.print()` produced the screen — theme colours, the overlay, the navigation, paginated wherever the browser landed — over a panel with no roster in it at all. Two modes now: Plain (one column for a photocopier) and Pretty (statlines, Keywords, abilities, campaign history and a ruled notes box per model). Stated in points and millimetres, `@page { size: auto; margin: 12mm }` so A4 and Letter both work, and black on white. Pagination is a repeated table header rather than `break-inside: avoid`, which is not a pagination algorithm — a model with long rules can exceed a page, and the header gives a continuation page with its name at the top instead of a clip or a blank. The notes box is `22mm`, because "space for handwritten notes mid game" is a measurement. Cards are `91 x 124mm`, four to a page — two columns and two rows of the area **both** A4 and Letter can print, since a card sized to A4 alone is wrong on every American printer — with a 34mm writing area, and each named ability's text printed once for the whole warband in an appendix rather than once per model. **Not yet verified on paper** — see [`docs/DESIGN.md`](DESIGN.md) |
| Export roster (print / text) | ✅ | **Three presets, one rendering, one privacy choice.** The text export was two hand-built strings with no options: it ran the list cost and the Strongbox balance together under one label (`Points: 640 / 1000 Ducats | Glory: 3`, where the Glory was a balance), never said which ruleset or Variant the roster was built under, and put whatever the player had typed straight into Discord markdown — a warband called `**The Ninefold**` bolded every line after it and a model named `@everyone` was a mass ping. Summary / Roster / Full, with plain or Discord as a *rendering* of the same content rather than a fourth level; lore, quotes and notes are their own opt-in, default off, because asking for full rules detail is not consent to paste personal writing into a public channel. Copy failure is reported rather than claimed as success. The content lives in `services/rosterText.ts` so the print renderer can share it. Print still has no stylesheet — that is Package 3 |
| Export to shareable file | 🟡 | `ExportModal` writes a file; a roster now also has a URL (`/roster/[id]`), though it is device-local until the owner is signed in |
| NewRecruit / BattleScribe export | 🔬 | **Spiked, deliberately not built.** A `.ros` selection is not identified by a catalogue entry id but by the chain of `entryLink` ids from the force root — so one weapon has a different identity under every model that can carry it, and the generated dataset, which flattens weapons into one list with one id each, cannot express that (`entryId` values containing `::`: 0). Measured against a real NewRecruit export: 100% of its path segments exist in the catalogues, 97% of its full paths are reconstructible by `scripts/lib/newrecruit-paths.mjs`. The blocker is dataset shape, not missing data. See [`docs/NEWRECRUIT-SPIKE.md`](NEWRECRUIT-SPIKE.md) |
| **TrenchLine roster file** | ✅ | **The export was `JSON.stringify(warband)`** — the internal type, unversioned, with no record of the ruleset, carrying mid-battle wounds and the exporter's own account and campaign ids. Those files are already in users' hands, so a `Warband` refactor silently changed what every one of them meant and nothing declared a version to detect it. It is now a versioned envelope with an ordered rules manifest — the same base commit under a different layer stack is a different ruleset, and the app ships two — over an explicit projection whose every field is classified in a `Record<keyof T, …>`, so a new field on `Warband` or `ActiveUnit` fails to compile until someone decides whether it belongs in a file. The old dump still opens, as a roster with no provenance; it is never handed today's ruleset. Import-as-new and restore are separate operations, because a file's ids are a reference and not authority. See [`docs/ROSTER-FILE.md`](ROSTER-FILE.md) |
| Multiple saved rosters | ✅ | |
| Ruleset version selection | ✅ | Two sourced rulesets, SHA-pinned, switchable with reconciliation |
| Data freshness / upstream sync | ✅ | `compareToUpstream` compares `dataset.meta.baseCommit` against upstream's head and reports **which pinned catalogues changed**, not a commit count — upstream commits READMEs too. The file list is the fetch manifest's (`meta.baseFiles`); the app's own copy had drifted, missing `Campaign Rules.cat`, so an upstream change to the injury, skill or exploration tables did not count. A failed check throws rather than reporting "current" |
| Offline use | ✅ | Service worker caches the shell and the ruleset; `e2e/offline.spec.ts` cuts the network for real |

**All four of the ❌ rows above are now done.** They were the whole point of
the app and they were Phase 2.

What is left in this table is honest rather than tidy: `🟡` means the feature
works and something specific about it does not, and each row says which.

## Part 2 — TrenchLine's own ideas

These are what make it better than NewRecruit for this game. The ideas are good;
the execution is the problem.

### Tabletop Play Mode

| Feature | Status | Notes |
|---|---|---|
| Wound / status steppers | ✅ | Active / Downed / Out of Action |
| **Blood Marker pool** | ✅ | 6-marker cap enforced |
| Blessing markers | ✅ | Uncapped, as the book prints them — see below |
| Activation tracking (acted this turn) | ✅ | `toggleUnitActed` |
| Turn/phase counter | ✅ | |
| Dice roller (D6 / 2D6 / D66) | ✅ | `DiceRoller.tsx`, 523 lines |
| Risky Success Roll support | ✅ | |
| Keyword popovers | ✅ | **The fifth stale row, now true.** The 61 derived glossary entries were real; nothing surfaced them. `KeywordPopover` existed, was never imported anywhere, and nothing ever called `setActiveKeyword` — and it read `category`/`summary`/`fullText` against a dataset that ships `type`/`description`, so mounted as written it would have rendered "undefined Keyword" over two empty paragraphs. It had never been run. Now mounted once in the app shell and fed by `src/components/ui/KeywordText.tsx` from unit cards, the Codex's arsenal and its rules prose. Matching is `src/rules/keywordMatch.ts` and is not a string compare: the sources print **89** distinct Keyword strings and only 41 are a glossary name spelled exactly, so `+2 DICE`, `AUTOMATIC 3`, `BLAST 3''`, `NEGATE GAS`, `IGNORES ARMOUR` and 43 others resolve by shape. 84 of the 89 link; the five that do not are named in the tests and are data gaps, not matcher failures |
| Attack calculator | ✅ | Reads `profileSnapshot`, so it runs on the derived statlines now |
| Range calculator | ✅ | |
| Dice probability tool | ✅ | |
| Scenario reference + map lightbox | ✅ | Real official maps |
| **Live multi-device match sync** | 🟡 | **Stage one is built.** A host publishes their board to the campaign every two seconds and anyone in it can open a read-only mirror — `api/campaigns/live`, `services/liveMatch.ts`, `components/play/LiveMirrorPanel.tsx`. No realtime vendor and no new company in the data path, and the board carries seven fields per model so watching a match cannot leak the host's roster. Stage two is two-way editing, still undesigned on purpose — see [`LIVE-MODE.md`](LIVE-MODE.md). The **LIVE** badge that advertised this before it existed is gone |

**The marker pools are not mirror images.** The row above used to read 🟡
"Less complete than Blood", which was generous: Blessing Markers had no state
in the app at all. They do now, and the two pools differ in both ways the book
states — Blood is capped at 6 and spent by your *opponent*; Blessing has no
printed cap and is spent by *you*. A Blessing pool written as a copy of the
Blood pool caps at six and then cannot record a seventh blessing, which is a
legal board state.

Both caps come from `dataset.markers`, read out of the rulebook by
`scripts/lib/parse-markers.mjs`. The store used to clamp Blood with a literal
`Math.min(6, …)` under a comment reading "Official Rulebook Cap" — the cap is
a rule, and rules are derived (CLAUDE.md rule 1). Where the book prints no cap
the app enforces none, and where the dataset has not loaded yet it enforces
none either, rather than falling back to a number the code remembers.

### Campaign

| Feature | Status | Notes |
|---|---|---|
| Multi-player campaign hub | ✅ | |
| Glory / Ducats / W-L leaderboard | ✅ | |
| Shared campaign invite codes | ✅ | |
| Territory map with node claiming | ✅ | |
| Narrative chronicle feed | ✅ | |
| **Post-battle sequence wizard** | ✅ | **Rebuilt on the book's sequence.** It ran four steps, two of them named things the book does not use (`Scavenge`, `Chronicle`), and had no Reinforcements Step — so a player who called for reinforcements was still offered an Exploration roll they are not entitled to. It now runs the book's steps in the book's order, their names read from `dataset.campaign.phaseSteps` rather than retyped, plus one the app needs first (which scenario was fought, and how it went). The Quartermaster and Roster Steps are deliberately not in it: they are what the roster builder already is, and duplicating them would give a player two places to spend the same Ducats. Taking Reinforcements **warns and lets the player through** rather than blocking, and a campaign house rule (`reinforcementsKeepExploration`) makes it not a deviation for groups that play it that way — see `docs/CAMPAIGN-SYNC.md` for how that setting syncs |
| D66 Trauma / injury rolls | ✅ | **Verified against the rulebook.** 22 rows, derived. Two were wrong: `12 Captured` was cut at a comma and lost the clause saying a paid ransom counts as a Full Recovery, and `65 Bitter Lessons` had run on into `66 Prominent Scar` and showed a player 66's rule. Both fixed and pinned; the build now fails on a rule that stops mid-sentence or carries another row's heading |
| Dispatch content nobody transcribed | ✅ | **Seven published rules that were simply absent** — not mis-parsed, absent, so every check stayed green: the placement gate can ask "did this op find its target", never "was an op written at all". The Gluttonous Arsenal (referred to by another option and having no profile), three Iron Sultanate Battlekit entries, the Janissary's Mehterân replacement and the Janissary Veteran option the Regimental Kaşık depends on, Ferocious Claws, Masters of the Grenade's over-8" penalty, the Goetic Warlock's spell-payment restriction, the Court's Quartermaster surcharge and the Hell Knight's Corpse Candles. 16 new ops, and two new op kinds — `addSpecialRule`/`setSpecialRule` — because a faction's or variant's prose rules had no addressable home (RC-10 to RC-16) |
| Reinforcements Step price | ✅ | **The bail-out was free, so it was not a bail-out.** The book's sequence is six steps; the app applied one — forfeiting Exploration and the Quartermaster — and charged nothing for the rest. The Arsenal was kept ("It is abandoned when you fall back"), the Strongbox was kept ("Reduce the number of Ducats in your Strongbox to zero"), and unspent Ducats were never lost. Taking the step left a player strictly better off than not taking it. Now derived as `dataset.campaign.reinforcements`, priced by `reinforcementCost`, shown in full before the choice is committed, and applied on submit. `reinforcementAllowance` — written in RULES-3 and never called from anywhere — is finally wired (RC-09) |
| Captured (Trauma 12) | ✅ | **The one result the table does not decide, and the app decided it anyway.** Two players negotiate a ransom; if it is not paid the model is executed, and if it is paid the Ducats leave the Strongbox and the result becomes a Full Recovery. The wizard set `isDead` only where the row's name was exactly `Dead`, so a captured model walked out of the step alive, uninjured and unransomed — the more forgiving branch, chosen by nobody. The negotiation is still two people at a table: what changed is that the step **will not commit** until one of them says which branch happened. Found by its own text — "Before continuing the Trauma Step" — so a Dispatch that adds or renames a deferring result needs no code change, and a build that loses the sentence stops finding the rule rather than quietly stopping enforcing it (RC-04) |
| Trauma Step procedure | ✅ | **The table was right and the procedure was missing.** Every Out of Action model was offered a D66 Trauma roll; the book gives that table to ELITE models and gives Troops a single `D6` Survival Roll, dead on 1-2. A Troop was drawing from 36 results with one Dead in them, so the wizard was handing out survival. Found by the rules-coverage audit (RC-01) — invisible to every check we had, because there was no dataset field to compare against a book. Now `dataset.campaign.traumaProcedure`, parsed from the rulebook's own passage, read by `src/rules/trauma.ts`. Also carries Battle Scars, Unfit for Duty at the third (reported, never auto-removed) and the duplicate-injury reroll |
| XP & advancement | ✅ | `UnitAdvancementModal`, 681 lines. **The award is now the book's.** `campaign.ts` ran `u.xp + 1` over every unit on the roster: Troops, models that sat the game out, models it had just recorded dead, and models carrying Head Wound — whose text, *"This model can no longer gain Experience Points"*, the wizard displayed on the same submission that added the point. It is now ELITE-only, survivors only, participants only, and the barring injury is derived from the Trauma Table's own text rather than matched by name (RC-02, RC-03) |
| Exploration (No Man's Land) | ✅ | **Verified against the rulebook.** Three rows carried page furniture: `9 Survivor` and `20 Warband Strongbox` ended in the sidebar's `Glory Item Tables`, and `36 Fruit from the Tree…` in a stray `VM` mark. Fixed and pinned |
| Skills roller & compendium | ✅ | **Verified against the rulebook.** All four tables dense from 2 to 12. The Patron Skill row at 12 in every one of them ended in the sidebar's `Glory Item Tables`. Fixed and pinned |
| Warband treasury & stash | ✅ | |
| Titles / deeds / scars | ✅ | A genuinely nice original idea |
| Warband lore & chronicle | ✅ | |

### Reference & tooling

| Feature | Status | Notes |
|---|---|---|
| **All Out War multiplayer pack** | ✅ | **Verified correct** against the official PDF — see below |
| Betrayal card engine (52-card) | ✅ | **Verified word-for-word** against All Out War |
| Scenario compendium + maps | ✅ | |
| Mission designer / generator | ✅ | |
| Keyword glossary | ✅ | 61 entries, derived. Was 116 hand-written ones missing 7 of the 12 the 1.0.2 changelog defines; `CLEAVE` and `DEADLY` are both present now (`AUDIT.md` §1.3a) |
| Armoury / weapon / armour tables | ✅ | **Derived.** This row said "values invented" long after Phase 1 replaced them: weapons and units come from `src/data/generated/trenchline.generated.ts` (2.6 MB, built from the BattleScribe catalogues), and `src/rules/arsenal.ts` and `battlekitLimits.ts` read them from there. Inventing those values is what the pipeline exists to have stopped |
| Rules customizer (local overrides) | ✅ | |
| GitHub 3-way diff resolver | ✅ | Wired up and functional |
| Warband comparator | ✅ | |
| Roster directory (global registry) | ✅ | |
| Bug report + diagnostics | ✅ | |
| Theme switcher (7 faction themes) | ✅ | **Migrated.** ~3,700 hardcoded hex literals became `theme-*` tokens; 12 remain across 7 files, and several of those are correctly fixed rather than themed — Google's own brand colours on the OAuth button, for one. The row described the state before that migration |
| Auth + cloud sync | ✅ | NextAuth + Prisma |

---

## What is genuinely correct today

Worth recording, because the instinct to throw out all of Gemini's data would
lose real work:

- **All Out War scenario pack** — `src/data/allOutWarData.ts`. The three
  scenarios (The Looters, Brothers in Arms, Alliance & Betrayal) and the full
  52-card Betrayal Table match the official PDF essentially word-for-word,
  including Coup/Ruse split, card values and timing clauses. **Keep it.**
- **Ducat costs** — largely correct (Lieutenant 70, Sniper Priest 50).
- **Unit and faction names** — real, if sometimes with invented decoration
  (`Trench Dog / War Hound`, `Anchorite Shrine`).
- **Scenario maps** — genuine official artwork.

The pattern: **where Gemini had the source PDF, the data is good. Where it
didn't, it invented.** That is the strongest possible argument for the pipeline
in [`RULESET-MODEL.md`](RULESET-MODEL.md) — and the reason each data file gets
verified individually rather than deleted wholesale.

## What must be deleted

- `FACTIONS[].rules` — fabricated faction special rules.
- `BASE_UNITS` statlines and keywords — 29 of 30 checkable entries wrong.
- `BASE_WEAPONS` / `BASE_ARMOUR` keyword sets — `Slashing`, `Concussive`,
  `Fast Strike`, `Bayonet Lug` do not exist.
- `src/data/rulesets/index.ts` — unsourced changelogs, superseded by the real
  1.0.2 changelog PDF.
- `githubSync.ts` fabricated commit fallback.

## Verification queue

What has been read against the committed PDFs. A row leaves this table by
being checked, not by looking fine — and every row has now been checked.

| Data | Source | State |
|---|---|---|
| D66 Trauma table | Core Rulebook | ✅ Checked. Two rows wrong; both fixed and pinned |
| Exploration tables | Core Rulebook | ✅ Checked. Three rows carried page furniture; fixed and pinned |
| Skills tables | Core Rulebook | ✅ Checked. The Patron Skill row in all four tables carried page furniture; fixed and pinned |
| Scenarios | Core Rulebook + All Out War | ✅ Checked |
| Unit statlines | BattleScribe + Warbands book | ✅ Checked both ways — `rules:crosscheck` reports 0 mismatched over 96 units, `rules:threeway` reports 0 app-vs-rulebook disagreements over 42 |
| Keyword glossary | 1.0.2 Changelog | ✅ Checked. The 7 gaps §1.3a found — `CLEAVE (X)`, `DEADLY`, the three terrain Keywords, `REGENERATE (X)`, `SKIRMISHER` — are closed. All **17** Keywords the changelog names are present, and `scripts/__tests__/keywordGlossary.test.mjs` re-checks it |
| Injury/Down/Out of Action rules | 1.0.2 Changelog | ✅ Checked. Nothing to apply: the digital rulebook the app derives from **is** 1.0.2 and already carries the changelog's rewrites — see below |
| FAQ / edge cases | Rules Commentaries 1.0.2 | ✅ Read and shipped. All 51 entries are derived into `dataset.commentaries` and shown in the Codex under **Rules FAQ**. The file had been fetched, extracted and committed, and nothing in the tree ever opened it |

Five of these sat here as "needs checking" after they had been checked and
fixed, in a document whose own tables above said so. That is the failure AUD-1
was about, three sections apart in one file: a queue that does not empty stops
being read, and then the entries that ARE still outstanding — the two at the
bottom — are invisible for the same reason.

**The changelog is not a layer, and never needed to be.** The digital rulebook
in `data-sources/rulebook/` is version 1.0.2 — its cover reads `1`0`2`, the
PDF's own glyph substitution for the dots — so the changelog records what
changed from 1.0.1 rather than a delta to apply on top of it. Every rewrite it
lists was checked against the book and is already there: `STRONG`'s second
sentence, `RISKY`'s last, `SKIRMISHER`'s evade, `MINED`'s detonation, the
Bloodbath Roll, the added line under Injury Rolls, and each of the three
terrain Keywords. No layer transcribes the changelog, none should, and
`data-sources/rulebook/SOURCES.json` said otherwise until this was checked.

Where the two differ it is wording, not rules, and the book reads as the later
refinement in each case — its `CLEAVE (X)` is "take a Fight ACTION **and choose
a Weapon with this Keyword** to make a Melee Attack" where the changelog has
"with a Weapon that has this Keyword"; `AUTOMATIC (X)` differs the same way;
`SKIRMISHER` says "a model with this Keyword" where the changelog says "a
friendly model"; and the Comprehensive-rules Down Results bullet on p49 keeps
"cannot **be moved** for any reason", matching its Core-rules twin on p20,
where the changelog's p49 entry alone says "cannot **move**". The app carries
the book's wording, which is right: the book is what a player owns.

That whole chain rests on one fact that could go silently false — swap in a
1.0.1 rulebook and none of it holds, with nothing else in the build to notice
— so `scripts/__tests__/keywordGlossary.test.mjs` asserts the extract's version.

The Keyword row is the sharpest case, because it was stale in the direction
that matters least to notice and most to fix. It read "7 gaps already
confirmed" long after all seven had been closed; reading the changelog back
out and comparing found **nothing** missing, from a list of 17 that is wider
than the 12 the audit measured against. The audit called this failure mode "a
claim of completeness that the code does not honour" — so the claim is now a
test rather than a sentence, and it fails if a Keyword the changelog names
leaves the glossary.
