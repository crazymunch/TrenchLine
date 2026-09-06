# Rules coverage audit — source-first, bounded pass

Audit date: 6 September 2026. Audited revision: `aad0216124c2d43815e63b16458b7de1246d3bd3`, branch `claude/project-handover-e0sj82` (PR #43), **not main**.

This answers [the audit brief](RULES-COVERAGE-AUDIT-BRIEF.md), not the earlier design rounds. No implementations are proposed. No game data, application code, infrastructure or privacy settings were changed.

## Result

The source-first read found both requested failure classes. Entire procedural rules and several Dispatch additions are absent from the generated dataset. Other rules are present, sometimes displayed, but the app's campaign or legality behavior does not implement them. The most consequential confirmed contradictions concern survival/Trauma, campaign XP, captured models and the Regimental Kaşık eligibility condition.

**This is not a complete corpus audit.** Approximately 8–9% of the roughly 32,000 extracted-text lines were read in substantive blocks. Far fewer rules were traced end-to-end. The findings below are positive evidence of gaps, not an estimate of the percentage of all rules that are missing.

### Classification and evidence conventions

- **E — Derived and enforced:** the relevant data has a behavioral consumer. A displayed definition alone is not automated gameplay enforcement. The calibration table distinguishes keyword application from attack resolution.
- **I — Derived but inert:** the specific obligation is represented, but not acted on by the inspected workflow. Manual bookkeeping may still be possible. An intentional house-rule override is identified rather than mistaken for an absent rule.
- **N — Not derived:** the specific rule/definition was not found in the generated dataset after checking relevant collections, alternate names and surrounding records. A passing mention of a weapon is not its profile; a reference to a Survival Roll is not its procedure. Source files and code comments do not count as derived rules data.

“Displayed” means a source-level rendering path exists, not that a browser session was exercised. “No reader” means the relevant consumers and repository searches described below yielded none; it is not a proof about code outside the audited revision. High severity changes roster legality or persistent campaign outcomes. Medium changes an available option, entitlement or battle decision, without a demonstrated automated wrong outcome. None of these labels imply an implementation priority approved by the owner.

All line numbers refer to the pinned revision. Source abbreviations below name the actual files:

| Alias | File |
| --- | --- |
| D | [`data-sources/dispatch/trench-dispatch-01-april-2026.txt`](../data-sources/dispatch/trench-dispatch-01-april-2026.txt) |
| C | [`data-sources/rulebook/extracted/changelog-1.0.2.txt`](../data-sources/rulebook/extracted/changelog-1.0.2.txt) |
| R | [`data-sources/rulebook/extracted/trench-crusade-digital-rulebook.txt`](../data-sources/rulebook/extracted/trench-crusade-digital-rulebook.txt) |
| W | [`data-sources/rulebook/extracted/warbands-of-trench-crusade.txt`](../data-sources/rulebook/extracted/warbands-of-trench-crusade.txt) |
| G | [`src/data/generated/trenchline.generated.ts`](../src/data/generated/trenchline.generated.ts) |
| PW | [`src/components/campaign/PostBattleWizardModal.tsx`](../src/components/campaign/PostBattleWizardModal.tsx) |
| CS | [`src/store/slices/campaign.ts`](../src/store/slices/campaign.ts) |

D describes itself as an unofficial compilation of Trench Wire updates, predominantly Public Beta (D:4–6, 31–38). Findings against D concern the app's opted-in `trenchline` ruleset, which includes that layer; they do not assert that a catalogue-only ruleset must adopt beta rules. Currency glyphs disappear in this extraction. Bare-number omissions below do not infer a currency that the text cannot establish.

## Ranked findings

| ID | Severity | State | Rule gap | Display / contradiction |
| --- | --- | --- | --- | --- |
| RC-01 | High | N | Non-ELITE Survival Roll procedure | Wizard instead offers D66 Trauma to every Out of Action model |
| RC-02 | High | I | Head Wound prohibits XP | Injury text is displayed; post-battle code still adds XP |
| RC-03 | High | N | XP eligibility and promotion procedure | Wizard awards every roster member XP and offers advancements without the published procedure |
| RC-04 | High | I | Captured: ransom or execution before continuing | Table text is displayed; unresolved capture is saved as a surviving active model |
| RC-05 | High | N | Third Battle Scar retirement and repeat-injury procedure | Neither procedure is represented; injury strings accumulate |
| RC-06 | High | I | Regimental Kaşık's recipient restriction | Restriction is derived; shared predicate explicitly returns true for the compound condition |
| RC-07 | High | N | Grail Strain count, threshold and permanence; Vile Corpus uniqueness/permanence | Options exist, governing clauses do not; toggles allow removal and multiple Strains |
| RC-08 | High | I | Curse on Creation's conditional second/free Amalgam | Ability is displayed; recruitment still uses static maximum/cost |
| RC-09 | High | N | Reinforcements' Arsenal/Strongbox discard and temporary spending lifecycle | The selection exists, but submission preserves stash and adds to treasury |
| RC-10 | Medium | N | Gluttonous Arsenal's profile and Amalgam's exclusive compulsory kit | Its name survives only in another option's description |
| RC-11 | Medium | N | Dispatch's Al-inbīq Kit, Alchemical Fire and Corrosive Ammunition definitions | No matching purchasable entries or rule definitions |
| RC-12 | Medium | N | Janissary Mehterân replacement, Janissary Veteran and Ferocious Claws | Old Counter-Charge remains; replacement/added rules absent |
| RC-13 | Medium | N | Masters of the Grenade's over-8-inch penalty | Old benefit is displayed without the new qualification |
| RC-14 | Medium | N | Goetic Warlock's restricted spell-payment sources | Its named spells are present; this governing restriction is absent |
| RC-15 | Medium | N | Court Quartermaster power-learning surcharge | Powers exist; new learning obligation is absent |
| RC-16 | Medium | N | Hell Knight Corpse Candles entitlement | No ability/option carrying the specific entitlement |

Rows group closely related clauses; **16 rows does not mean 16 atomic rules**. In particular RC-03 and RC-07 contain several obligations, explicitly separated below.

### RC-01 — Non-ELITE casualties use the wrong procedure

**Source:** R:5676–5687 distinguishes Troops from ELITE casualties. R:5678–5679: “You must make a Survival Roll for each Troop model”. The prescribed roll is D6; 1–2 removes the model, 3+ survives. Only ELITE models proceed to D66 Trauma.

**N, high.** `dataset.campaign.trauma` contains the D66 table, and `phaseSteps` contains a generic Trauma-step summary. No Survival Roll definition or troop/elite dispatch rule was found. Searching every generated string for “Survival Roll” found a Patron skill allowing a reroll, not the underlying procedure. `campaign` contains thresholds, budget, exploration tables, skills, trauma and phaseSteps, with no troop-survival procedure. This is an absent campaign procedure, not a missing table value; the existing campaign domain is its conceptual home, but its current fields do not carry it.

**Behavior:** PW:117–119 selects casualties solely by `status === 'Out of Action'`; PW:183–189 rolls two dice into D66 for any selected unit. PW:469 instructs a D66 roll for each Out of Action warrior and PW:519–525 offers that button to every casualty. There is no ELITE branch. CS:391–395 records the outcome/death supplied by that lookup. This can change who permanently survives, not merely what explanatory text is shown.

### RC-02 — Head Wound is displayed and then ignored by automatic XP

**Source:** C:325–330, specifically C:328: “This model can no longer gain Experience Points.” The source also allows a Promotion Dice recovery process; R:5823–5827 carries the same rule.

**I, high.** G:69139–69144, `campaign.trauma[roll='22'].description`, contains the complete prohibition and recovery text. PW:168–174 incorporates the description into the casualty outcome; PW:512–515 displays it. The separate injury picker also displays its derived effect (`UnitAdvancementModal.tsx:529–533, 558–568`).

**Behavior:** CS:449–453 sets `newXp = u.xp + 1` unconditionally. No check reads Head Wound from existing `injuries` or `scars`, nor from the new casualty. The prohibition is contradicted on the same submission that can record it, and on subsequent submissions. The recovery condition is also not tracked by the inspected promotion workflow. This finding is specifically about XP, not an assertion that every Trauma effect is broken.

### RC-03 — The promotion and XP procedures are not the wizard's procedure

**Source:** R:6026–6027: “each ELITE model that took part in a game and survived will gain 1 Experience Point”. R:5966–5987 and C:331–347 specify Promotion Dice allocation, successful promotion and initial XP. R:5979–5980 makes the sixth roll automatically successful after five failures. R:6020–6045 gives the six-ELITE promotion ceiling, Glorious Deed XP and two-table advancement selection.

**N, high, for the governing procedures.** Individual skill rows and some references to Promotion Pool dice exist. No representation of the pool allocation procedure, failure-streak guarantee, promotion ceiling or complete XP eligibility procedure was found in the campaign data or other generated collections. `phaseSteps` only names and summarizes the step. A skill table is not the entitlement to roll on it. These are campaign-procedure/state gaps; the existing campaign tables do not describe them.

**Behavior:** PW:561–569 iterates over *all* roster units, displays `unit.xp + 1`, and offers eight hard-coded advancement labels. CS:382–475 likewise processes every unit and increments XP, including nonparticipants and models recorded dead. It accepts a selected advancement string, not the published pair of skill-table rolls. `src/store/slices/progression.ts` permits manual XP/ELITE edits but does not implement the pool procedure. `ActiveUnit` (`src/types/warband.ts:24–40`) has XP and ELITE state but no promotion-failure streak. No procedural reader was found by repository searches for Promotion Dice/Pool and the inspected progression consumers.

Manual editing can record an outcome decided correctly on paper. It does not make the wizard's default award correct. This is separate from RC-02's explicitly derived exception.

### RC-04 — An unresolved Captured result becomes an active survivor

**Source:** R:5797–5804, specifically R:5800: “If the ransom is not paid, the captured model is executed”. Resolution must precede continuing the Trauma Step. C:375–379 changes the negotiation sentence, not the obligation.

**I, high.** G:69103–69108, `campaign.trauma[roll='12']`, carries ransom, transfer, execution and Full Recovery instructions. PW displays that outcome as above.

**Behavior:** PW:168–179 sets `isDead` only when the result name exactly matches Dead. Captured is therefore false. The supplied result has no ransom/payment/resolution state. CS:391–395 only sets death when `cas.isDead`; CS:470–475 resets other survivors to Active. The wizard can be completed without recording either ransom or execution, leaving the model available. The app does not transfer ransom or require proof of the manual resolution. This is not a demand for cross-player financial automation: it is a finding that the existing automatic survivor result has no basis in the unresolved rule.

### RC-05 — Battle Scar retirement and duplicate-injury rerolls are absent

**Source:** R:5697–5707; R:5697 starts “When a model receives their third Battle Scar”. The rule retires that model, with qualified kit salvage. A repeated injury normally requires rerolling until a usable result; explicit exceptions remain in individual injury rows.

**N, high, for these two general procedures.** The specific injury descriptions are derived, but no third-scar retirement rule or general duplicate-injury reroll rule was found in G. Search of generated strings for “third Battle Scar” found none. The campaign schema has injury rows, not the general Trauma obligations. These procedures belong to the existing campaign domain but have no current procedural representation.

**Behavior:** PW's lookup does not inspect previous injuries; CS:387–395 appends the result string without duplicate handling. It does not count actual Battle Scars or retire a model at three. `scars` and `injuries` are separate arrays in ActiveUnit; adding one outcome string is not counting Battle Scars correctly, since several results explicitly award none. Manual scar editing is available, but does not supply this missing rule. Do not infer retirement merely from array length.

### RC-06 — Regimental Kaşık's compound eligibility condition fails open

**Source:** D:415: “Janissaries & Yüzbaşı with Janissary Veteran only, Limit: 1”.

**I, high.** G:70652–70660 has the correct armoury restriction, including the conditional recipient requirement. `parseRestrictions` recognizes it as `onlyFor`, not `unparsed` (`src/rules/restrictions.ts:53–55`). But `satisfiesOnlyFor` at lines 98–101 explicitly returns true whenever the requirement contains `&` or `with`.

Both actual consumers use this predicate: `src/rules/equipGate.ts:63–71` and `src/rules/validate.ts:240–258`. The Add Equipment dialog calls that gate at lines 245–259. Therefore the stated recipient condition does not exclude, for example, an otherwise eligible Sultanate Azeb; the independent Limit:1 check does not repair that omission. Other unrelated restrictions can still reject an item—this finding is specifically the missing recipient check.

**Display:** the derived arsenal exposes restrictions in its offers (`src/rules/arsenal.ts:112–120`), and the Codex's selected-item details render those offers. The comment promises an “unparsed” caveat, but this clause has already been parsed as `onlyFor`; there is no unknown-condition result at this decision point. The item is not missing, nor is its price the subject of this finding.

### RC-07 — Strain and Vile Corpus choices survive without their governing rules

**Source:** D:155: “can have up to 1 Strain”; D:167–170 grants an additional Strain once the *other* models meet the stated threshold and makes Strains permanent. D:264–266 makes a Vile Corpus permanent and says “each Amalgam in a Warband must have a different Vile Corpus.”

**N, high, for the aggregate constraints and permanence.** The four Thrall options at G:558–603 and Amalgam option at G:979–990 are present. They contain individual effects and empty constraints arrays. No general one-Strain allowance, other-model threshold exception, Strain permanence, or cross-Amalgam distinctness/permanence clause was found elsewhere in G. A single available Vile Corpus does not make a second copy legal; it makes distinctness relevant if there is a second Amalgam.

**Behavior:** `UnitAdvancementModal.tsx:604–638` displays each option with an independent toggle. `src/store/slices/progression.ts:193–226` adds/removes the option and changes cost. It does not examine other selected options, roster value or permanence. `validateRoster` checks unit counts and kit but has no Strain/Vile Corpus group-count or acquisition-history check. Individual option descriptions are displayed, but the omitted governing clauses are not.

Existing `UnitOption.constraints` can express ordinary bounds; its current empty arrays do not do so. The aggregate conditional/history obligations have no populated representation. This finding does not claim Strains or Bombardment Horde themselves are absent.

### RC-08 — Curse on Creation does not change the Amalgam recruitment bound

**Source:** D:234–237: “increase the Limit of Amalgams your Warband can have to 0-2”. The entitlement is conditional on other-model value, Promotion-step timing and removal of six Thralls; it includes immediate recruitment at no cost.

**I, high.** `units[name='Amalgam'].abilities[name='Curse on Creation'].description` contains the complete clause (G, Amalgam record beginning at line 928). Unit abilities have a rendering path in `UnitCard.tsx:477–495`.

**Behavior:** Amalgam's generated `max` is still 1, correctly as its *base* bound. `src/rules/validate.ts:78–111` checks that bound after variant limits only; it has no earned Curse-on-Creation state. Neither the promotion store nor the wizard consumes this ability. The same generic recruitment/cost path has no source for the free earned recruit. A player can make manual adjustments, but there is no rule-aware state distinguishing a legal second Amalgam from an illegal one. This is not a request to raise the default maximum to two: that would contradict the condition.

### RC-09 — Calling for Reinforcements does not apply its discard/spending obligations

**Source:** R:6481–6484: “Discard any Battlekit that you have in the Arsenal”; reduce the Strongbox to zero. R:6488–6499 specifies a temporary recruitment allowance, loss of unspent funds and forfeiture of later steps.

**N for the discard and temporary-spending procedure; high.** The generic Reinforcements phase summary and threshold table are derived. The function `reinforcementAllowance` (`src/rules/campaign.ts:160–168`) calculates the difference, but no production caller was found; references outside its definition were comments/tests. The discard obligations are quoted in that file's comments, not represented as dataset rules. The current campaign domain has no structured or full-prose Reinforcements sequence.

**Behavior:** PW keeps `tookReinforcements` only in component state. Its submission at lines 247–263 passes ordinary Glory/Ducat gains, casualties and advancements; it does not pass that selection to the store. CS:503–508 snapshots the unchanged stash and treasury plus gains; CS:514–519 preserves that stash via the roster spread and adds gains to treasury. The call does not establish a temporary recruitment allowance or discard balance.

**Important boundary:** the Exploration/Quartermaster forfeiture itself is NOT wholly missing. PW:648–699 explicitly warns, labels the campaign house-rule override, and PW:719–735 suppresses the Exploration controls when forfeited. That part is derived and behaviorally consumed. However, a player can roll Exploration, go back and choose Reinforcements, and submit the previously populated `ducatsGained`: the final submission does not clear or condition that value. This is a stale-outcome hole, separate from the intentional override. Papal States' +4 Glory consumer also exists and passes calibration; this finding does not retract it.

### RC-10 — Gluttonous Arsenal is referenced but has no weapon definition

**Source:** D:222–224: “An Amalgam always has a Gluttonous Arsenal.” D:249–255 supplies its profile, multi-mode range/attack keywords and melee Infection effect, as well as the entry's exclusive-kit rule.

**N, medium.** The only G string containing Gluttonous Arsenal is Bombardment Horde's option description (G:989). There is no weapon/Battlekit record, compulsory-kit link or full rule description for it. Amalgam's `battlekit` array is empty. The existing `weapons`/`battlekit` collections can hold its definition, and unit `battlekit` can reference compulsory gear; no such data exists here.

**Display:** Bombardment Horde refers the player to a weapon the app cannot supply. `UnitCard` renders derived compulsory kit at lines 520–531 and otherwise renders equipped weapons; no corresponding Amalgam entry can reach that path. Removal of the obsolete Amalgam abilities in ops 71–72 is correctly present and is not reported missing.

### RC-11 — Three Dispatch Sultanate Battlekit additions never enter the dataset

**Source:** D:330–343 introduces Al-inbīq Kit and its action; D:340–341 includes “pick 1 friendly model with the ARTIFICIAL”. D:357–375 defines Alchemical Fire/Unfettered Flame and Corrosive Ammunition/Volatile Concoction; D:374–375 says “you cannot reallocate Corrosive Ammunition to another model.”

**N, medium.** No Al-inbīq Kit or Corrosive Ammunition entry occurs in G's weapons, Battlekit, armouries or options. No Alchemical Fire item or Unfettered Flame rule occurs; the words “alchemical fire” appear as Flame Cannon lore, which is not the new item. Accent-insensitive/name-fragment searches and inspection of Sultanate armoury/options did not reveal aliases for these definitions. Existing Alchemical Ammunition is present, but neither its name nor its Guiding Path text carries Corrosive Ammunition's new rule.

There is no Dispatch op for these additions. The existing item/profile/armoury collections are capable of carrying them, but do not. No app rendering path can display a derived record that is absent. This is about omitted rules/options, not rechecking the six automated price/stat fields.

### RC-12 — The Janissary update is absent while the old rule remains

**Source:** D:442–445: “Replace the Counter Charge ability with the following ability”. The replacement is Mehterân. D:481–487 adds the Janissary Veteran option and Yüzbaşı's associated Mehterân. D:455–457 adds Ferocious Claws to Lions of Jabir.

**N, medium, for those new/replacement rules.** The generated Janissary (G:14430 onward) still has Counter-Charge and a Counter-Charge training option, not Mehterân. Yüzbaşı Captain (G:16079 onward) has Mubarizun and older options, no Janissary Veteran or Mehterân. Lion of Jabir (G:17067 onward) has no Ferocious Claws option. The only Mehterân reference located in G is Regimental Kaşık's text; it does not define the ability.

No corresponding ops exist in the Dispatch layer. `units[].abilities` and `units[].options` already support these kinds of entries. The old Janissary ability follows the ordinary ability display path. Thus this is not merely absent UI automation: the app's reference material itself retains the superseded instruction.

### RC-13 — Masters of the Grenade loses its new range qualification

**Source:** D:71–72: “if the range to the target is more than 8”, followed by the printed negative-die instruction.

**N, medium, for the added penalty clause.** G:74825–74826, `variants[Stoßtruppen].specialRules[Masters of the Grenade]`, contains only the range increase. The new qualification is absent from that rule and no equivalent definition was found elsewhere. No Dispatch op updates it.

**Display:** `WarbandDashboard.tsx:425–470` renders the variant's special rules. The player can therefore read the benefit without its published condition. This is a rule-coverage gap even if all attacks are rolled physically. `specialRules.description` already has a home for the omitted sentence.

### RC-14 — Goetic Warlock's payment restriction is absent, not its spells

**Source:** D:787–789: “can only remove BLOOD MARKERS from enemy models, or friendly Wretched models”.

**N, medium.** Goetic Portal, Necrotic Gaze, Barbed Embrace and Disturbing Presence are present in the Goetic Warlock's abilities. None carries the quoted payment-source limitation. Global generated-string searches for the friendly-Wretched/payment condition found no definition. The layer's own outstanding note acknowledges the Powers paragraph, but that note is not generated app rules.

Unit ability/prose structures can carry a description; the current model has no populated spell-payment entitlement. No consumer was found in the play/store code. This finding must not be confused with “Goetic Powers unmodelled”: the three calibration cases below explicitly pass.

### RC-15 — Court Quartermaster power-learning surcharge is absent

**Source:** D:874–875: “each model that you wish to purchase a Goetic Power in the Quartermaster Step”. The preceding text requires an additional payment of 1; its currency glyph is absent from the extracted text, so this audit does **not** assert the currency.

**N, medium.** No power-learning surcharge/timing rule was found anywhere in G. Court faction `specialRules` is empty; individual powers have their own acquisition costs, not this per-model Quartermaster obligation. No op was written for the sentence. The general rule could have a prose home in faction special rules; no such entry is populated.

The option selection UI records option IDs/costs and does not distinguish recruitment from later Quartermaster learning (`UnitAdvancementModal.tsx:98–119, 604–615`; `progression.ts:193–226`). Individual powers are displayed; the added learning obligation is not. The currency requires source-page evidence before making a more specific financial claim.

### RC-16 — Corpse Candles' entitlement was never transcribed

**Source:** D:900–901: “A Hell Knight can have an Unholy Relic at a modified cost of 5”. The source's currency glyph is lost; the finding is the missing entitlement, not a currency assertion.

**N, medium.** G's Hell Knight record (starts at line 5234) has no abilities and no Corpse Candles option. No generated string contains Corpse Candles. Its ordinary equipment/options do not contain a description of this specific concession. No Dispatch op supplies it. The existing unit ability/option representation has room for the rule; it is not populated. No rule-aware offer reader was found. Ordinary Unholy Relic availability is not equivalent to the special entitlement.

## Calibration results and false-positive controls

| Calibration | Dataset evidence | Consumer / outcome |
| --- | --- | --- |
| Papal States Specialist Force | G:74586–74593: budget 500/11, thresholdDelta −200, reinforcementGlory 4 | **E for all three sampled obligations.** `musterBudget` at `rules/campaign.ts:73–80`, Dashboard:139; `forceLimits`:141–143; `reinforcementGlory`:98–99 and PW:94–96, 253. Not missing. |
| Demonic Aura Grenade FUMBLE | G:37001 weapon carries FUMBLE; G:61632–61635 defines it; Dispatch op 15 targets the corrected name | **E for application of the keyword to the weapon**, the calibration's repaired layer behavior. Keyword arrays reach weapon/reference UI (`CodexView.tsx:1265–1272`); not missing. This is not a claim that the attack calculator automatically retargets a fumble. |
| All 23 named Goetic Powers | Names from W:8778–9228 all found across unit options and weapon-profile records | **Derived, no missing power reported.** Ten names are unit options; the other thirteen are weapon-profile records. Those thirteen include Morphean Mind and Daemonium Meridianum with type Ability, so “13 spell profiles” is imprecise terminology, not missing coverage. Ability options render in UnitAdvancementModal. Gameplay enforcement of all 23 is not certified here. |

The lookup specifically avoids “not in options ⇒ missing”: Sloth's two Ability-typed weapon records at G:43163 and G:43260 would otherwise be false positives. It also avoids treating a absent Dispatch op as an omission by itself. Flame Cannon/Greek Fire, for example, is already represented via the base sources; the op need not exist twice.

## Dispatch reconciliation: what the 73-op count does and does not prove

Read all 919 extracted lines and all 73 operation records, comparing the requested changes to the generated target records. **No unresolved top-level target was identified in this read.** The two armoury insertions are a deferred pass, not missing targets. This did not rerun the automated placement gate or the stat/cost verification suite. For replaced/removed abilities, the final record plus layer implementation was inspected; a fresh execution of the historical pre-layer state was not performed.

Operation numbers below are one-based positions in `dispatch-01.layer.json.ops`. Every number is accounted for. “Present” concerns representation, not a blanket certification of runtime enforcement.

| Ops | Source span in D | Target / source correspondence and result |
| --- | --- | --- |
| 1–8 | 461–536 | Yüzbaşı/Brazen Bull entries. Targets exist; keyword/ability payloads correspond to printed sections. Existing stat/cost checks not repeated. This does not cover Janissary Veteran, which needs its own clause (RC-12). |
| 9 | 61–64 | FUMBLE glossary definition present. |
| 10, 34 | 543–552 | MERCENARY created then expanded to full text. Do not mistake op 10's earlier abridgement for final output; 34 supersedes it. |
| 11–17 | 93–108 | All seven named grenades resolve and carry FUMBLE, including Demonic Aura Grenade. |
| 18 | 112–124 | Incendiary Grenades target exists; scope names five armouries. Existing pricing checks not repeated. |
| 19–22 | 173–193 | Four Strain option definitions present. General limits/permanence are separate omitted sentences (RC-07). |
| 23–26 | 136–163 | Thrall target (catalogue alias of Grail Thrall) exists; both abilities present. Repeated Burst ACTION text is already repeated in the supplied extraction, not evidence of an app omission. |
| 27–33 | 203–248 | Amalgam target and new abilities/keywords present. Exclusive kit/profile is separately absent (RC-10); Curse on Creation is inert (RC-08). |
| 35–43 | 564, 576, 588–589, 628, 643, 716, 756, 796, 856–857 | Nine mercenary keyword targets present, including wrapped keyword lines. Sister of Saint Cosmas is not one of these nine; see limitations below. |
| 44–48 | 639, 743–744, 821–833 | Observer/Witchburner costs and Scripture Guardian/Witchburner stat targets exist. No re-audit of numeric fields. |
| 49 | 606–624 | Ammo Monk replacement retains all three Sacrament paragraphs. |
| 50 | 665–698 | Sin Eater replacement retains devour, release, damage, end-of-game and Purge clauses. Representation present; no full swallowed-model workflow audit. |
| 51–54 | 790–814 | Warlock abilities and renamed spells present. The preceding Powers restriction is not included (RC-14). |
| 55–58 | 835–855 | Witchburner's four ability descriptions present. Compulsory kit is a separate statement, not proved complete by these ops. |
| 59–66 | 559–560, 571–572, 583–584, 602–603, 635–636, 729–730, 778, 824 | Eight recruitment sentences have corresponding targets/allowedFactions; Scripture Guardian is explicitly unrestricted. Carcass Front delegation extends some final lists, so literal list inequality is not automatically wrong. |
| 67–68 | 276–306 | Blessings of Beelzebub definition and Black Grail armoury offer present; Lord-of-Tumours restriction is carried. |
| 69–70 | 415–432 | Regimental Kaşık definition and Sultanate offer present. Recipient condition is inert (RC-06). |
| 71–72 | 200–248 | Old Six-armed Monstrosity and Strong-ish abilities are absent as the replacement requires; layer records printed-page confirmation. Not reported as a gap. |
| 73 | 264–272 | Bombardment Horde present. Distinctness/permanence and the weapon it modifies are separate missing rules. |

The layer's `_src` metadata has stale page/line references in places; the spans above were read from the current extracted file rather than trusted from those annotations. Its opening “still outstanding” commentary is likewise not used as proof of absence. The actual dataset and consumers decide the findings.

### Inverse read: source clauses without corresponding ops

Confirmed omissions from this inverse read are RC-07 and RC-10 through RC-16. **An omitted op alone is not the finding**: absence from the final dataset, including base-derived definitions and alternate representations, is required.

Other clauses remain unclosed, not silently counted as covered: the changed general Grenades targeting restriction (D:56–59); parts of the full Scripture Guardian/Vengeful Scripture replacement (D:748–768); Tenderiser Maul modes (D:701–714); Sister of Saint Cosmas recruitment/keyword identity (D:644–655). The last has a misleading near-match: an existing generated Combat Medic record carries Sister-named ability prose. This needs identity/provenance tracing before asserting a missing unit or a safe alias. They are **unconfirmed candidates**, not additional ranked findings.

## Changelog inverse read

All 878 lines were read, including the middle campaign/gear section, not merely the new Keyword headings. A changelog entry need not have a layer op if its amended text already enters through the current book/catalogue parser. Representative dispositions:

| Changelog obligation | Disposition in this pass |
| --- | --- |
| Head Wound and promotion/XP changes, C:324–347 | RC-02/03: injury description survives; general procedure is not derived/consumed. |
| Reinforcements forfeiture, C:360–364 | Warning/Exploration visibility is implemented; discard lifecycle and stale prior roll remain RC-09. |
| Papal States Specialist Force, C:571–577 | Calibration passes; not repeated as a finding. |
| Alchemical Ammunition's non-reallocation clause, C:638–644 | Text exists in unit options and `battlekit[Alchemical Ammunition].rules`. Transfer/removal enforcement not fully traced; not ranked. |
| Grail Devotee's non-reallocation clause, C:761–765 | Text exists in `battlekit[Grail Devotee].rules[1]`; not “never parsed.” Behavioral audit not closed. |
| Goetic casting rules, C:799–811 | Some obligations appear in commentary/individual references. Full general-rule coverage not certified; do not conflate with the 23 present named powers. |
| Geometry, movement, scenario conditions and remaining keyword changes | Read for triage, but most not traced through all consumers. No completeness claim. |

The absence search was source-led: choose a published obligation, inspect the relevant generated records and related collections, then inspect consumers. It was not “find every dataset value and compare it back to the book.” No new finding above depends on rerunning the six automated stat/cost fields, catalogue crosscheck, layer placement gate or gear naming sweep.

## Coverage, method and limitations

**Material read:** entire Dispatch (919 lines), entire changelog (878 lines); rulebook campaign block R:5610–6080 and Reinforcements R:6473–6499; Court general rules W:8413–8450 and portions of its power-list block W:8778–9228. Additional targeted snippets and named-record searches are not counted as whole chapters. On a conservative block-read basis this is roughly 2,600–2,800 lines, or 8–9% of the brief's approximate 32,000-line corpus. This counts layout/navigation lines as well as rules, so it is only a transparent proxy for reading effort, not a rules-coverage statistic.

**End-to-end scope:** the ranked clauses, three calibration cases, selected non-findings and the Dispatch representation ledger above. Reading a source paragraph for triage did not certify its enforcement. No percentage of “rules covered” is defensible without first enumerating atomic obligations.

**Code/data checks:** inspected the pinned generated dataset across collections, Dispatch layer and layer consumer, campaign/progression stores, post-battle wizard, option selection UI, roster validator/equipment gate and relevant display adapters. Used `rg` to look for definitions/readers and read-only Node queries to inspect JSON-shaped generated records. Queries were navigation aids, not absence verdicts by themselves. No application test suite or build was run, and no existing quality-gate output is presented as new audit evidence. Static control-flow consequences are not claimed as browser-observed incidents.

**Not audited comprehensively:** the 12 catalogues; all faction/variant special rules; all 61 keyword effects; Carcass Front's full campaign/map/resource procedures, new factions and equipment; All Out War; weather; vision cards; complete commentaries; deployment/scenario enforcement; all reallocation/consumable rules. Carcass Front was encountered only incidentally while checking cross-collection matches and is not counted as substantive source coverage.

**Interpretation limits:** a tabletop companion can deliberately leave physical adjudication to people. A displayed-only rule is not automatically a bug of the same severity as a wrong automated award. Conversely, automatic XP, survivor status or a validator's positive permission cannot be justified solely by the availability of manual editing. The findings separate those cases. The existing Reinforcements house-rule behavior is explicitly acknowledged.

No source is silently repaired here. Lost currency glyphs and ambiguous aliases remain limitations. No new game values, proposed data structures, implementation tasks or processor changes are part of this audit.
