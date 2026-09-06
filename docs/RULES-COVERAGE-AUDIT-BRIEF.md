# Rules coverage audit: brief for Codex

Status: a request for an audit, not a design proposal. Nothing here changes
code, data or infrastructure.
Author: Claude. Date: 6 September 2026.
Related: [ruleset model](RULESET-MODEL.md), [data sources](DATA-SOURCES.md),
[features](FEATURES.md), [audit](AUDIT.md).

## 1. The question

**Which published rules have no representation in the app at all?**

Not "are the statlines right" — that is automated and covered (§3). This asks
the question the automation cannot: what did the pipeline never notice?

## 2. Why this is worth an audit rather than a script

Every check the project runs is **value-oriented**. It takes something that
exists in the dataset, finds the matching thing in a source, and compares them.
That is a good check and it has caught real errors. It is also structurally
incapable of finding a rule that was never parsed, because there is no dataset
value to anchor the comparison to. A rule the pipeline never noticed is
invisible to every test we have, and will stay invisible.

Three findings from 6 September 2026, all of that shape:

| Finding | How it failed | How it was found |
|---|---|---|
| **Papal States "Specialist Force"** — 500 Ducats + 11 Glory, Threshold −200, +4 Glory at Reinforcements | The rule was parsed as prose and **displayed to the player**, while the muster screen handed out the standard 700/0 | A player, at a table |
| **Demonic Aura Grenade / FUMBLE** | A Dispatch op targeted the rulebook's name; the dataset shipped the catalogue profile's misspelling; the op printed `target not found` on every build and the build stayed green | Auditing a stale docs row |
| **Goetic Powers** | `FEATURES.md` recorded them as unmodelled; all 23 were present | Checking the claim |

Three in one day. Two were "the data exists and nothing reads it"; one was "the
documentation is wrong about what exists". None was findable by the checks in
§3. The first is the dangerous class: **the app showed the rule and did the
opposite.**

## 3. What is already automated — please do not redo this

- **Statline and cost verification** against the Warbands book, in
  `scripts/lib/verify.mjs`. Exactly six fields per unit:
  `stats.ranged`, `stats.melee`, `stats.armour`, `stats.base`, `cost.ducats`,
  `cost.glory`. Outcomes are `confirmed` / `unconfirmed` / `conflict`; a
  conflict fails the build unless ruled on in `data-sources/resolutions.json`.
- **Catalogue drift**, via `npm run rules:crosscheck` → `reports/crosscheck-*.md`.
- **Layer op placement**: as of PR #42 an unresolved layer op **fails the
  build**, so an op that cannot find its target is now loud. It was silent
  before, which is how FUMBLE was lost.
- **Gear naming**: PR #43 reconciles a catalogue's `selectionEntry` name against
  its profile name using the books as authority.

Re-running any of these produces known output. The audit's value is entirely in
the space they do not cover.

## 4. The corpus

All committed and readable in-repo. Extracted text is what the pipeline parses
and is sufficient for this audit; the four largest PDFs are gitignored release
assets, and their text is present.

| Source | Lines |
|---|---|
| `data-sources/rulebook/extracted/trench-crusade-digital-rulebook.txt` | 11,672 |
| `data-sources/rulebook/extracted/warbands-of-trench-crusade.txt` | 10,459 |
| `data-sources/carcass-front/extracted/carcass-front-book.txt` | 5,807 |
| `data-sources/dispatch/trench-dispatch-01-april-2026.txt` | 919 |
| `data-sources/rulebook/extracted/changelog-1.0.2.txt` | 878 |
| `data-sources/rulebook/extracted/all-out-war.txt` | 849 |
| plus commentaries, weather, quickstart, vision cards, the two CF warband PDFs | ~1,300 |

≈32,000 lines total. Also: the 12 BattleScribe catalogues in
`data-sources/battlescribe/`, the Dispatch layer
(`data-sources/dispatch/dispatch-01.layer.json`, **73 ops**), and the generated
output.

## 5. What the dataset can currently carry

A rule has a home only if some collection can hold it. Present collections:

```
units 105        weapons 654      battlekit 137     armouries 8
factions 8       variants 27      keywords 61       keywordGrants 5
scenarios 17     terrain 2        markers 2         counters 11
patrons 11       campaigns 2      visionCards 16    coreRules 59
commentaries 51  carryAllowances 4  battlekitLimits  campaign
bundles 2        weather          scenarioGenerator  carcassFrontMap
```

**"There is nowhere to put it" is a legitimate and useful finding.** Several of
these collections were added because an audit found a rule with no home —
`carryAllowances`, `battlekitLimits`, `keywordGrants` and `markers` all exist
for that reason.

## 6. What to classify, and how

For each published rule that **changes what a player may do, must track, or is
entitled to**, assign one of three states. The third is the point of the
exercise; the second is the most dangerous.

1. **Derived and enforced.** A dataset field carries it and app code reads that
   field. Cite both.
2. **Derived but inert.** The dataset carries it — often as prose in a
   `specialRules` or `rules` string — and nothing enforces it. *This is the
   Papal States class.* Note whether the app **displays** the rule, because
   showing a rule while contradicting it is worse than silence.
3. **Not derived.** No dataset field carries it. Say whether an existing
   collection could, or whether a new one is needed.

In scope: recruitment constraints and limits; faction and variant special
rules; keyword effects; marker, resource and economy rules; campaign-step
obligations; scenario and deployment constraints; wargear legality.

Out of scope: pure narrative and lore; anything already covered by §3; and
per-model statlines, which are verified.

## 7. Highest-yield places to start

1. **`changelog-1.0.2.txt` and the Dispatch.** An errata that renames or
   re-costs an entry can silently fail to apply — that is exactly how FUMBLE
   was lost for months. The Dispatch's 73 ops break down as: `set` 21,
   `setKeywords` 11, `addAbility` 11, `addKeyword` 7, `setCost` 5, `addOption`
   5, `replaceAbility` 5, `add` 4, `addArmouryRow` 2, `removeAbility` 2. For
   each: does it still find its target, and does the source agree it should
   exist? Equally: **does the changelog contain changes for which no op was ever
   written?**
2. **Faction and variant special rules.** The Papal States finding was here.
   0 of 8 factions and 1 of 27 variants state a non-standard economy — but
   special rules do far more than set budgets, and each is currently prose.
3. **Campaign Phase obligations.** Six steps, with ordering that carries a rule
   (Reinforcements before Exploration, and taking it forfeits both Exploration
   and the Quartermaster). Which obligations does the post-battle wizard
   actually enforce?
4. **Keyword effects.** 61 glossary entries; `keywordGrants` holds 5 and
   `battlekitLimits` 4 by keyword. What do the other keywords *do*, and does
   anything act on them?
5. **Carcass Front.** The newest layer, the least exercised.

## 8. What a finding needs to be useful

- The **source quotation** with file and line, not a paraphrase.
- Which of the three states, and the evidence: the dataset field, or its
  absence; the code that reads it, or the absence of any reader.
- Whether the app **displays** the rule while not enforcing it.
- A rough severity: does getting this wrong change a legal roster, a battle
  outcome, or a campaign record?

Please **do not propose implementations** in this pass, and do not change data.
A ranked list of gaps is the deliverable. We will scope fixes separately, and
any fix must come through the pipeline — game data is never typed by hand
(rule 1), and a rule that cannot be read must fail loudly rather than default
(rule 2).

An estimate of what fraction of the corpus you actually covered is more useful
than a claim of completeness. Partial coverage, honestly bounded, is fine.

## 9. Suggested output

`docs/RULES-COVERAGE-AUDIT.md`, with a findings table ordered by severity and a
short statement of method and coverage. If the audit is long, split by source
document rather than truncating.

## 10. Known-answer calibration

Three findings whose answers are established, useful for checking the method
against known ground truth. They should come out as stated:

| | Expected |
|---|---|
| Papal States Specialist Force | Now **derived and enforced** (PR #41) — purse, Threshold delta and Reinforcements payout, all read from the rule prose |
| Demonic Aura Grenade FUMBLE | Now **derived and enforced** (PR #42) |
| Goetic Powers | **Derived**; 23 of 23 present, 10 as unit options grouped by Deadly Sin, 13 as priced spell profiles |

If the method reports any of these as missing, the method is producing false
positives and that is worth knowing before trusting the rest.
