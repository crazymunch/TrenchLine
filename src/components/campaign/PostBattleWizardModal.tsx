'use client';

import React, { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { useStore } from '../../store/useStore';
import { useDataset } from '../../rules/useDataset';
import { useScenarios } from '../../rules/useScenarios';
import {
  explorationBandFor, resolveExploration, campaignGameOf,
  explorationPool, explorationGrants, explorationLootBonus, explorationFromModels,
  explorationChoices,
  explorationRerolls,
  type ExplorationEffect,
  reinforcementGlory, reinforcementCost, reinforcementsSequence,
} from '../../rules/campaign';
import {
  traumaProcedure, eliteVerdict, survivalOutcome, rollSurvival,
  unfitForDuty, alreadySuffered, earnsExperience, xpBarringInjuries, traumaWriteFor,
} from '../../rules/trauma';
import {
  cappedExperience, experienceCap, canBePromoted, eliteCount, promotionRules,
  promotionPool, assignmentIsLegal, rollPromotions,
  type DiceAssignment, type PromotionResult,
} from '../../rules/promotions';
import {
  advancementRollsDue, nextAdvancementAt, advancementRoll, patronSkillsFor,
  SKILL_TABLES, SKILL_TABLE_LABEL,
  type SkillLearned, type SkillOffer,
} from '../../rules/advancement';
import { captureRuleIn, captureOutcome, type CaptureResolution } from '../../rules/capture';
import type { MatchHandover } from '../../rules/matchHandover';
import { entitlementOf, eligibility } from '../../rules/earnedRecruitment';
import { DEFAULT_RULESET_ID } from '../../rules/rulesets';
import { fieldable } from '../../rules/recreation';
import { PatronPicker } from '../builder/PatronPicker';
import { patronMissing } from '../../rules/patrons';
import { ExperienceTrack } from '../ExperienceTrack';
import {
  warStoriesOffer, warStoriesEligible, extraExperienceFor, isValidRoll,
  type ExtraExperienceRule,
} from '../../rules/extraExperience';
import type { ExplorationTableName, SkillsTableName, SkillRow } from '../../types/catalogue';
import { frameworkOf } from '../../rules/campaignFramework';
import { CarcassFrontExploration } from './CarcassFrontExploration';
import { CasualtyRecord } from '../../types/campaign';
import type { ActiveUnit } from '../../types/warband';
import { soundEffects } from '../../services/soundEffects';
import type { XpAward } from '../../store/state';
import { 
  Dices, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Award,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';

import { opponentLabel } from '@/types/opponent';

interface PostBattleWizardModalProps {
  /**
   * What the match this follows already recorded.
   *
   * Absent where the wizard is opened outside Play Mode, and the screen then
   * starts empty exactly as it used to — it is a starting point, never a
   * substitute for one (RR-22).
   */
  handover?: MatchHandover | null;
  onClose: () => void;
}

export const PostBattleWizardModal: React.FC<PostBattleWizardModalProps> = ({ handover, onClose }) => {
  const {
    getActiveWarband, applyPostBattleResults, campaign, setCampaignHouseRule,
    claimEarnedRecruitment, opponents, factions, warbands, updateWarbandLore,
  } = useStore();

  const warband = getActiveWarband();

  // The post-battle tables come from the generated dataset. The hand-written
  // ones this used to read were fabricated: every Exploration Location and
  // every Skill was invented, and the roll mechanics were wrong as well as the
  // contents (AUDIT §1.13). There is deliberately no fallback to them — a
  // wizard that silently resolved an injury from invented data would write that
  // result permanently onto a warband.
  const rulesetId = typeof window !== 'undefined'
    ? window.localStorage.getItem('trenchline_ruleset') || DEFAULT_RULESET_ID
    : DEFAULT_RULESET_ID;
  const { dataset, loading: datasetLoading, error: datasetError } = useDataset(rulesetId);

  /*
    The steps, in the book's order.

    The Campaign Phase is SIX steps and this wizard covered four of them, with
    no Reinforcements Step at all — so a player who called for reinforcements
    was still offered an Exploration roll they are not entitled to. The names
    of the book's steps come from `dataset.campaign.phaseSteps`, parsed out of
    the rulebook, rather than being retyped here.

    Two are deliberately NOT in the wizard. The Quartermaster Step (recruit,
    hire, buy, sell, reallocate) and the Roster Step are what the roster
    builder already is, and duplicating them here would give a player two
    places to spend the same Ducats.
  */
  const bookStep = (name: string) =>
    dataset?.campaign?.phaseSteps?.find((s) => s.name.startsWith(name));

  const STEPS = [
    /* Not a step the book prints: the app has to know which scenario was
       fought and how it went before it can run any of the others. */
    { key: 'result', label: 'Scenario & Result', book: undefined },
    { key: 'trauma', label: 'Trauma', book: bookStep('Trauma') },
    { key: 'promotions', label: 'Promotions', book: bookStep('Promotions') },
    { key: 'reinforcements', label: 'Reinforcements', book: bookStep('Reinforcements') },
    { key: 'exploration', label: 'Exploration', book: bookStep('Exploration') },
  ] as const;
  const LAST = STEPS.length;

  const [step, setStep] = useState<number>(1);
  /*
    The Reinforcements Step is optional, and taking it costs the Exploration
    and Quartermaster Steps. The app WARNS and lets the player through rather
    than blocking: the maintainer's group plays the campaign loosely, and a
    wizard that refuses to continue is a wizard people abandon halfway. What it
    will not do is stay silent about it.
  */
  const [tookReinforcements, setTookReinforcements] = useState(false);
  const houseRuleKeepsExploration =
    campaign?.houseRules?.reinforcementsKeepExploration === true;
  const explorationForfeited = tookReinforcements && !houseRuleKeepsExploration;
  /*
    Which Exploration Step this campaign runs (RR-09). Chosen at creation and
    never afterwards — see `rules/campaignFramework.ts` — so this is a fact
    about the campaign rather than a setting on the step.
  */
  const isCarcassFront = frameworkOf(campaign) === 'carcass-front';

  /*
    Glory the Warband's Variant is paid for calling Reinforcements.

    "A Papal States Intervention Force gains 4 ☼ each time it calls for
    Reinforcements" — the same Specialist Force rule that gives them a smaller
    purse gives some of it back here. 0 for every other Variant, and read from
    the dataset rather than keyed off a faction name.
  */
  const variantReinforcementGlory =
    dataset ? reinforcementGlory(dataset, warband?.variantId) : 0;
  const reinforcementBonus = tookReinforcements ? variantReinforcementGlory : 0;
  /*
    Seeded from the match this follows, where there was one.

    All three of these used to start at a fixed value with the real answer
    sitting in a record written one line earlier: the scenario fell back to the
    first in the list, the result was Victory whatever the score, and the
    opponent was an empty box. Where they default, they commit (RR-22).

    `useState`'s initial value, not an effect: the handover is fixed for the
    life of this wizard, and re-seeding on a later render would overwrite an
    answer the player had already corrected.
  */
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(handover?.scenarioId ?? '');
  const [outcome, setOutcome] = useState<'Victory' | 'Defeat' | 'Draw'>(handover?.result ?? 'Victory');
  /*
    The book's two between-game payouts, and neither is decided by the result.

    Glory: "Each time you carry out a Glorious Deed in a campaign, your Warband
    gains 1 ☼" (page 99). Play Mode already records every Deed and who claimed
    it, so this opens on that count.

    Ducats: "The value of the Loot you find is equal to your Exploration Roll
    times 10 in 👑" (page 114), and from nowhere else between games. So it
    starts at zero and the Exploration Step in step 5 sets it.

    Both started at a fixed 3 and 30, and the three result buttons below
    overwrote them with 3/35, 1/20 and 0/10 — a scale that appears nowhere in
    the rulebook (RR-02). A player who entered nothing committed 35 Ducats for
    a win the book pays nothing for. Both fields are still editable: the
    default stops being invented, the player still decides.
  */
  const [gloryGained, setGloryGained] = useState<number>(handover?.gloryEarned ?? 0);
  const [ducatsGained, setDucatsGained] = useState<number>(0);
  const [narrativeLog] = useState<string>('');
  
  // Narrative & Battle Report Fields
  const [opponentWarbandName, setOpponentWarbandName] = useState<string>(handover?.opponentName ?? '');
  const [mvpUnitName, setMvpUnitName] = useState<string>('');
  const [battleReportText, setBattleReportText] = useState<string>('');

  // Physical vs In-App Roll Toggles
  const [traumaRollMode, setTraumaRollMode] = useState<'digital' | 'manual'>('digital');
  const [explorationRollMode, setExplorationRollMode] = useState<'digital' | 'manual'>('digital');

  /*
    The models this battle could have involved.

    A model killed in an earlier post-battle sequence and held on the roster
    awaiting Re-creation is stored with `isDead` false — that flag is false
    only so the roster keeps the entry its payment is made against — and it is
    dead until it is paid for. It fought nothing, so it earns no Experience,
    brings no Exploration die and no War Story, cannot be promoted, and cannot
    be one of this battle's casualties. It stays on the roster and in the
    Re-creation panel; it is out of every list here. See `takesTheField`.
  */
  const battleRoster = fieldable(warband?.units);

  // Casualties from match
  const ooaUnits = battleRoster.filter((u) => u.status === 'Out of Action');
  const [casualtyOutcomes, setCasualtyOutcomes] = useState<Record<string, { outcome: string; isDead: boolean }>>({});
  /*
    Roll 12 Captured is the one result the table does not decide: two players
    negotiate a ransom, and the model is either bought back or executed. The
    wizard used to record it as neither — `isDead` was set only where the row's
    name was exactly `Dead`, so a captured model walked out of the step alive,
    uninjured and unransomed, which is the more forgiving branch chosen by
    nobody (RULES-COVERAGE-AUDIT RC-04).

    Held here as an explicit `null` until a player says. Nothing commits while
    one is outstanding.
  */
  const [captures, setCaptures] = useState<Record<string, { resolution: CaptureResolution; ransom: number }>>({});
  /** What claiming an earned recruitment bound did, once a player has. */
  const [claimed, setClaimed] = useState<string | null>(null);
  /*
    The player's answer where the roster cannot say whether a model is ELITE.

    Only reached for a Mercenary recruited before `profileSnapshot.elite`
    existed — some Mercenary entries are ELITE and some are not, and the roster
    category cannot tell them apart. Asking is the honest move: the alternative
    is picking a die on a guess, and the die decides whether the model dies.
  */
  const [eliteOverrides, setEliteOverrides] = useState<Record<string, boolean>>({});

  /*
    The Promotion Dice Pool, in the book's three steps (p.105).

    `assignment` is step 2 — how many dice each Troop has been given.
    `promotionRolls` is step 3's result, held so the player can see what the
    dice did before it is committed, and re-roll if they mis-entered.
    `extraDice` is the Glory Items the app does not model: a number the player
    types, kept apart from the derived ones so the pool can show its working.
  */
  const [assignment, setAssignment] = useState<DiceAssignment>({});
  const [extraDice, setExtraDice] = useState(0);
  const [physicalDice, setPhysicalDice] = useState('');
  const [promotionRolls, setPromotionRolls] = useState<PromotionResult | null>(null);
  /*
    Which models sat the game out, and the Experience rule ("took part in a
    game") needs the answer.

    Ticked for two groups, both of which the app already knows about, and
    neither of which it used to read:

    - **The models Play Mode did not deploy.** It started empty for every
      model although the tracker knew exactly who had been on the table, so a
      model left in the Arsenal earned its Experience Point unless the player
      remembered to tick it by hand.
    - **The models the player benched.** "Any models you do not use will have
      to sit the game out; they will not earn any experience" (p.97) — the
      same sentence that puts a model over the Threshold on the bench says it
      earns nothing. Read here as well as from the handover, because the
      wizard can be opened without a match and the bench is on the roster
      either way.

    The player can still change any of them; what changed is which way they
    start.
  */
  const [satOut, setSatOut] = useState<Record<string, boolean>>(() => Object.fromEntries([
    ...(handover?.satOutUnitIds ?? []).map((id) => [id, true] as const),
    ...fieldable(warband?.units).filter((u) => u.benched)
      .map((u) => [u.id, true] as const),
  ]));

  // Advancements
  /*
    One Advancement Roll in progress, per model.

    `tables` is the player's step-1 choice ("Pick two of the Skill Tables"),
    `rolls` the two 2D6 totals, and `chosen` the step-3 decision. Held apart
    from the submitted list so that re-rolling does not silently overwrite a
    Skill the player already picked.
  */
  const [advRolls, setAdvRolls] = useState<Record<string, {
    tables: [SkillsTableName, SkillsTableName];
    rolls: [number, number] | null;
  }>>({});
  const [skillPicks, setSkillPicks] = useState<SkillLearned[]>([]);
  /*
    FD-15: the step asks for the Patron on the spot.

    A Patron Skill result on a Warband with none recorded used to end the roll —
    "nothing can be offered" — with the player's only route out being to close
    the wizard, open the Chronicle dossier, type the Patron's name correctly and
    start the post-battle again. The rule is not optional ("they MUST pick a
    Patron for it", L4753-4755), so the gap is closable here.
  */
  const [patronAskOpen, setPatronAskOpen] = useState(false);
  /*
    And the wizard ASKS when it opens on a campaign Warband with none (FD-15: "a
    Warband already in a campaign with none recorded is asked for it the first
    time the wizard opens").

    Asked as a prompt on the first step rather than as a picker opened over it,
    which is a deviation from the design's wording and a deliberate one. This is
    a Sheet, and opening a second Sheet on top of it the moment the wizard mounts
    puts a dialog in front of a player who has not done anything yet — and hides
    the step they came for behind it. The prompt is unmissable, it is on the
    screen the player is already reading, and the picker is one tap away.

    Computed, not stored: it has to stop showing the moment the Patron is picked,
    and a flag would have to be cleared by every path that sets one.
  */
  const patronGap = patronMissing(warband);

  /*
    War Stories (Wildcard Skill 11), taken or left — FD-06d.

    ONE switch for the whole offer, not one per model, because that is the
    shape of the sentence: *"you can give each model with the ELITE Keyword
    that does not also have this Skill +1 extra Experience Point"*. The "can"
    governs the giving; the "each" is not a menu. A per-model picker would be
    offering a choice the book does not contain.

    Default on. The rule costs nothing, spends nothing and is refused by
    nobody — a player who has gone to the trouble of holding the Skill wants
    its points — and unlike FD-07's by-hand Exploration modifiers, which
    change a die the player is rolling at the table where the app cannot see,
    this is bookkeeping the app is doing itself and can show in full before
    anything is committed.
  */
  const [takeWarStories, setTakeWarStories] = useState(true);

  /*
    The D3 owed to a model that rolled Bitter Lessons (Trauma 65).

    `null` is "owed and not yet rolled", and nothing commits while one is
    outstanding — the same refusal an unresolved ransom gets. A roll the app
    invented would be a number the player never saw a die make.
  */
  const [extraXpRolls, setExtraXpRolls] = useState<Record<string, number | null>>({});
  const [extraXpRollMode, setExtraXpRollMode] = useState<'digital' | 'manual'>('digital');

  // Exploration roll
  const [selectedExplorationTable, setSelectedExplorationTable] = useState<ExplorationTableName>('common');
  const [explorationResult, setExplorationResult] = useState<{ roll?: string; title: string; reward: string; description: string } | null>(null);
  /*
    The dice themselves, not just their total.

    The book gives a re-roll after the roll — page 113: "If you wish, you can
    re-roll one of the Exploration Dice, and if you won the game that was just
    played you are allowed to reroll another Exploration Dice (you can't
    re-roll the same Exploration Dice twice)." — and a single number cannot
    express any of it. Each die is kept with whether it has been spent, so the
    last clause is the state rather than a thing to remember.
  */
  const [explorationDiceRolled, setExplorationDiceRolled] =
    useState<{ value: number; rerolled: boolean }[] | null>(null);
  /*
    What the step found, to be written to the Roster on commit.

    `explorationDiscoveries` was read by this very step and written by nothing
    (FD-07 / RR-10). It is collected here and passed to the store, so a
    Location found is a Location recorded.
  */
  /*
    Which of a Location's options the player took (finding B).

    Thirteen of the shipped Locations print "Choose one of the following
    options:" and the Trench Merchant's two are opposites — 2 Glory now, or the
    Glory Item Table open for the rest of the campaign. The step read the whole
    description and recorded the permission whichever one was chosen, so a
    Warband that banked the Glory got the shop as well.

    Held beside the roll and cleared with it: a re-roll finds a different
    Location and the answer to the old one means nothing.
  */
  const [explorationChoice, setExplorationChoice] = useState<string | null>(null);
  const [explorationLocation, setExplorationLocation] =
    useState<{ name: string; description?: string } | null>(null);
  const [explorationFound, setExplorationFound] =
    useState<{ discovered?: string; text?: string; effects: ExplorationEffect[] }>({ effects: [] });

  /*
    Above the early return, and it has to be. React identifies a hook by its
    call order, so calling this after `if (!warband) return null` meant the
    component ran one fewer hook when there was no warband than when there
    was — and the render where one appears is the transition that breaks.

    The derived twelve plus the All Out War pack, in place of the hand-written
    set whose game lengths and Glorious Deeds were invented.
  */
  const { scenarios } = useScenarios(rulesetId);

  if (!warband) return null;

  /* Games already played drives both the Exploration dice count and which
     Location tables are open. The count and the bands are derived together in
     `explorationBandFor`, which carries why this is not `- 1`. */
  const band = explorationBandFor(dataset, warband, campaign);
  const gamesPlayed = band.gamesPlayed;
  /*
    The pool this Warband actually rolls: the band, plus a die for every Extra
    dice Exploration Skill it holds, plus the re-rolls and the Skills the
    player applies themselves. `dice` stays NULL where the ruleset has no band
    — the roll is disabled and the step says so, rather than handing out three
    dice and their loot from a dataset that said nothing (FD-07 / RR-10).
  */
  /*
    What this Warband holds: the Skills its Locations granted, which are the
    Warband's and are stored, plus the ones its MODELS carry, which are the
    models' and are derived — the Wildcard Skills Scavenger and Friends In
    High Places each grant one, and a Scavenger that dies takes its extra die
    with it (`explorationFromModels`).
  */
  const explorationHeld = [
    ...(warband.explorationEffects ?? []),
    ...explorationFromModels(dataset, battleRoster, gamesPlayed),
  ];
  const explorePool = explorationPool(dataset, band, explorationHeld);
  /*
    Page 113: one re-roll, "and if you won the game that was just played you
    are allowed to reroll another", plus one for each Re-roll Skill held.

    Off the step's own recorded `outcome`, not the handover: a post-battle
    opened without a match behind it has no handover at all, and the player's
    recorded Victory is what the book's sentence is about either way.
  */
  const explorationRerollAllowance = explorationRerolls(outcome, explorePool.rerolls);
  /* The options the Location just found offers, if any. */
  const explorationLocationChoices = explorationChoices(explorationLocation);
  const explorationRerollsLeft =
    explorationRerollAllowance - (explorationDiceRolled ?? []).filter((d) => d.rerolled).length;
  const openTables = band.tables.length ? { tables: band.tables, choose: band.choose } : null;
  // A band change must not leave a table selected that is no longer open.
  const explorationTable: ExplorationTableName =
    openTables?.tables.includes(selectedExplorationTable)
      ? selectedExplorationTable
      : (openTables?.tables[0] ?? 'common');

  const scenario = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  /**
   * Look a D66 result up on the derived Trauma Table.
   *
   * The table covers every D66 result — 11 to 36 individually, 41-63 as one
   * range, 64 to 66 individually — and the parser fails the build if any roll is
   * uncovered. So a miss here is a bug, and it says so rather than defaulting to
   * Full Recovery, which is what the old index-based fallback did: it turned an
   * unrecognised roll into the most forgiving possible outcome.
   */
  const resolveTraumaRoll = (unitId: string, rollNum: number) => {
    const rows = dataset?.campaign.trauma ?? [];
    const matched = rows.find((t) => {
      if (t.roll.includes('-')) {
        const [lo, hi] = t.roll.split('-').map(Number);
        return rollNum >= lo && rollNum <= hi;
      }
      return Number(t.roll) === rollNum;
    });

    /* A fresh result is a fresh question: whatever was settled about the last
       one is no longer about anything. */
    setCaptures(({ [unitId]: _dropped, ...rest }) => rest);
    setCasualtyOutcomes((prev) => ({
      ...prev,
      [unitId]: matched
        ? {
            outcome: `D66: ${rollNum} - ${matched.name}: ${matched.description}`,
            isDead: /^dead$/i.test(matched.name),
          }
        : {
            outcome: `D66: ${rollNum} - no row on the Trauma Table. This is a data bug; ` +
                     `record the result by hand and report it.`,
            isDead: false,
          },
    }));
  };

  // Roll D66 Trauma/Injury Table for an Out of Action warrior
  const handleRollInjury = (unitId: string) => {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const rollNum = parseInt(`${d1}${d2}`);
    resolveTraumaRoll(unitId, rollNum);
  };

  /*
    Which procedure each casualty takes.

    The book splits the Trauma Step in two and the app did not: every Out of
    Action model was offered a D66 Trauma roll, so a Troop — who takes one D6
    and dies on a 1-2 — drew instead from a table with one Dead result in
    thirty-six. See rules/trauma.ts.
  */
  const procedure = traumaProcedure(dataset);

  /** ELITE-ness, with the player's answer taking priority where they gave one. */
  const eliteOf = (unitId: string) => {
    if (unitId in eliteOverrides) {
      return { elite: eliteOverrides[unitId], basis: 'player' as const, needsConfirmation: false };
    }
    const u = warband.units.find((x) => x.id === unitId);
    return u ? eliteVerdict(u) : { elite: null, basis: 'unknown' as const, needsConfirmation: true };
  };

  /*
    Captures, and what is still outstanding.

    The rule is found by what the Trauma row SAYS — "Before continuing the
    Trauma Step" — rather than by the roll 12 or the name "Captured", so a
    Dispatch that adds or renames one needs no change here. See rules/capture.ts.
  */
  const captureRuleFor = (unitId: string) =>
    captureRuleIn(dataset, casualtyOutcomes[unitId]?.outcome);

  /** The settled outcome for one capture, or `null` while nobody has said. */
  const captureSettlement = (unitId: string) => {
    const rule = captureRuleFor(unitId);
    const chosen = captures[unitId];
    if (!rule || !chosen?.resolution) return null;
    try {
      return captureOutcome(rule, chosen.resolution, chosen.ransom);
    } catch (e) {
      /*
        The table no longer states the branch. Rule 2: say so on the screen
        that is about to write the result, rather than picking the branch where
        the model lives.
      */
      return { error: e instanceof Error ? e.message : String(e) } as const;
    }
  };

  const settled = (unitId: string) => {
    const out = captureSettlement(unitId);
    return out && !('error' in out) ? out : null;
  };

  /** Models whose capture nobody has resolved. Nothing commits while any remain. */
  const unresolvedCaptures = ooaUnits.filter(
    (u) => captureRuleFor(u.id) && !settled(u.id));

  /** Death as the step finally leaves it, capture included. */
  const diedInStep = (unitId: string) =>
    settled(unitId)?.removed ?? casualtyOutcomes[unitId]?.isDead ?? false;

  /** Resolve a Troop's D6 Survival Roll onto the same outcome record. */
  const resolveSurvivalRoll = (unitId: string, roll: number) => {
    if (!procedure) return;
    let result;
    try {
      result = survivalOutcome(procedure, roll);
    } catch {
      /* Outside the die: a typed digit. Say so rather than reading it as alive. */
      setCasualtyOutcomes((prev) => ({
        ...prev,
        [unitId]: {
          outcome: `${roll} is not a result on a ${procedure.troops.die}.`,
          isDead: false,
        },
      }));
      return;
    }
    setCasualtyOutcomes((prev) => ({
      ...prev,
      [unitId]: { outcome: result.text, isDead: result.dead },
    }));
  };

  const handleRollSurvival = (unitId: string) => {
    if (procedure) resolveSurvivalRoll(unitId, rollSurvival(procedure));
  };

  /*
    The Experience each model earns, and the reason where it earns none.

    Computed here so the same answer drives what step 3 shows and what the store
    writes. It used to be `u.xp + 1` in the store, for every unit on the roster.
  */
  /*
    What Calling for Reinforcements will actually take.

    Shown before the choice is committed, because two of the six steps empty
    things the player has been accumulating for a whole campaign — the Arsenal
    and the Strongbox — and until now the app charged neither. A screen that
    offers a bail-out has to say what the bail-out costs.
  */
  const reinforcements = reinforcementsSequence(dataset);
  const nextGame = campaignGameOf(warband, campaign) + 1;
  const cost = dataset
    ? reinforcementCost(dataset, {
      units: warband.units,
      armoryStash: warband.armoryStash,
      treasuryDucats: warband.treasuryDucats,
      variantId: warband.variantId,
    }, nextGame)
    : null;

  /*
    Recruitment bounds this Warband could claim now, and why not where it
    cannot. Every entry in the ruleset that states one, so a second faction
    gaining such a rule needs no change here.
  */
  const earnable = (dataset?.units ?? []).flatMap((profile) => {
    const rule = entitlementOf(profile);
    if (!rule) return [];
    const verdict = eligibility(dataset!, profile, {
      units: warband.units.map((u) => ({
        id: u.id,
        profileName: u.profileSnapshot?.name ?? u.customName,
        name: u.customName,
        totalCost: u.totalCost ?? 0,
      })),
      claims: warband.earnedRecruitment,
    });
    /* Hidden entirely for a Warband that could never claim it — the rule is on
       one faction's entry and every other roster would see a wall of
       blockers about models it has never heard of. */
    if (!verdict.eligible && verdict.have === 0) return [];
    return [{ profile, rule, verdict }];
  });

  const barring = xpBarringInjuries(dataset);

  /*
    The models that performed a Glorious Deed, from the match this wizard was
    handed.

    *"Any ELITE model that performed at least one Glorious Deed gains a second
    Experience Point"* (p.105). The set is derived, not asked for: Play Mode
    records the model against the claim, so putting the question to the player
    again would be asking them to retype what the app already watched them do.

    Empty where the wizard was opened without a match, and empty for a record
    written before Deeds carried a model — in both cases nobody is awarded a
    second point rather than somebody being guessed at.
  */
  const deedUnitIds = new Set(handover?.deedUnitIds ?? []);

  /*
    War Stories, and who in this Warband is holding it (FD-06d).

    Derived from the roster on every render, never stored — the rule FD-07
    settled for Scavenger and Friends In High Places. A model that held the
    Skill and died in this game is not in the Warband any more, and a stored
    flag would go on paying the roster on its behalf.
  */
  const warStories = warStoriesOffer(dataset, battleRoster);

  /** Whether one model may take the War Stories point, ELITE resolved as everywhere else. */
  const takesWarStories = (unitId: string) =>
    takeWarStories && warStoriesEligible(warStories, unitId, eliteOf(unitId).elite === true);

  /**
   * The models a Trauma result owes extra Experience, with the rule that owes it.
   *
   * Read off the recorded outcome rather than the roll, so a Dispatch that
   * renumbers 65 changes nothing here. Only ELITE models reach the D66 chart
   * at all — a Troop takes the D6 Survival Roll — so this never meets one.
   */
  const extraXpOwed = battleRoster
    .map((u) => ({
      unit: u,
      rule: extraExperienceFor(dataset, casualtyOutcomes[u.id]?.outcome),
    }))
    .filter((x): x is { unit: typeof x.unit; rule: ExtraExperienceRule } => x.rule !== null);

  /** Rolls owed and not yet made. Nothing commits while any remain. */
  const unresolvedExtraXp = extraXpOwed.filter(
    (x) => x.rule.die !== null && typeof extraXpRolls[x.unit.id] !== 'number');

  /** What a Trauma result has actually handed this model, once rolled. */
  const extraXpFor = (unitId: string) => {
    const owed = extraXpOwed.find((x) => x.unit.id === unitId);
    if (!owed) return 0;
    if (owed.rule.die === null) return owed.rule.fixed ?? 0;
    const rolled = extraXpRolls[unitId];
    return typeof rolled === 'number' ? rolled : 0;
  };

  const experienceFor = (unitId: string) => {
    const u = warband.units.find((x) => x.id === unitId);
    if (!u) {
      return {
        earns: false as const, points: 0, forDeed: false,
        fromTrauma: 0, fromWarStories: 0, want: 0, withheld: 0,
        blocked: 'elite-unknown' as const,
      };
    }
    const override = unitId in eliteOverrides
      ? { ...u, profileSnapshot: { ...u.profileSnapshot, elite: eliteOverrides[unitId] } }
      : u;
    const verdict = earnsExperience(override, {
      tookPart: !satOut[unitId],
      /* An executed captive died; a ransomed one is a Full Recovery and earns
         its point like any other survivor. */
      died: diedInStep(unitId),
      xpBarringInjuries: barring,
    });
    if (!verdict.earns) return { ...verdict, points: 0, forDeed: false, fromTrauma: 0, fromWarStories: 0, want: 0, withheld: 0 };

    /* The Deed's point rides on the survivor's point and is not a separate
       entitlement: a model that earns nothing this game — dead, sat out, Head
       Wound — earns nothing for its Deed either, which is why this is reached
       only after the verdict above. */
    const forDeed = deedUnitIds.has(unitId);
    /*
      The two awards FD-06d adds, both riding on the survivor's point for the
      same reason the Deed's does: a model that earns nothing this game — dead,
      sat out, Head Wound — earns nothing extra either.

      Head Wound is the case that makes that more than a tidiness argument. It
      is permanent, the model keeps playing, and it can go Out of Action again
      and roll Bitter Lessons: one row says "gains D3 extra Experience Points"
      and the other says "can no longer gain Experience Points". A prohibition
      beats a grant, and the early return above is already where that is
      settled.
    */
    const fromTrauma = extraXpFor(unitId);
    const fromWarStories = takesWarStories(unitId) ? (warStories?.rule.points ?? 0) : 0;
    const want = 1 + (forDeed ? 1 : 0) + fromTrauma + fromWarStories;

    /*
      Limited Potential: "The following models cannot have more than 7
      Experience Points" (p.111). The cap trims the award rather than refusing
      it, so a model one point short of its cap that also took a Deed gains the
      one point it has room for. A model with no room at all earns nothing, and
      is listed with everyone else who earns nothing so the player can see why
      rather than watching a number fail to move.
    */
    const { withheld } = cappedExperience(dataset, u, want);
    const granted = want - withheld;
    if (granted <= 0) {
      return {
        earns: false as const, points: 0, forDeed,
        fromTrauma, fromWarStories, want, withheld,
        blocked: 'at-experience-cap' as const,
      };
    }
    return { ...verdict, points: granted, forDeed, fromTrauma, fromWarStories, want, withheld };
  };

  /** The cap a model is sitting on, for the sentence that explains it. */
  const capFor = (unitId: string) => {
    const u = warband.units.find((x) => x.id === unitId);
    return u ? experienceCap(dataset, u) : null;
  };

  /** Why a model earns nothing, in the rule's terms rather than the code's. */
  const XP_REASON: Record<string, string> = {
    'not-elite': 'Troops do not gain Experience',
    'did-not-take-part': 'did not take part in this game',
    died: 'did not survive the game',
    'head-wound': 'Head Wound — can no longer gain Experience Points',
    'elite-unknown': 'ELITE status not recorded — resolve it in the Trauma Step',
    'at-experience-cap': 'LIMITED POTENTIAL — already at its Experience maximum',
  };

  /**
   * The sentence for a model that earns nothing, with the cap's own number in
   * it where that is the reason. "already at its Experience maximum" invites
   * the question the rule already answers.
   */
  const xpReasonFor = (unitId: string, blocked: string | undefined) => {
    const base = XP_REASON[blocked ?? ''] ?? blocked;
    if (blocked !== 'at-experience-cap') return base;
    const cap = capFor(unitId);
    return cap == null ? base : `LIMITED POTENTIAL — capped at ${cap} Experience Points`;
  };

  /**
   * Resolve an Exploration Roll.
   *
   * Three things the old version got wrong, all of which changed the money:
   *
   *   - It rolled D66 (two dice concatenated). The book sums 3 to 6 D6
   *     depending on games played, so the range was wrong end to end.
   *   - It added a flat 20 Ducats. Loot is the roll times 10.
   *   - It fell back to the first row when a roll matched nothing, inventing a
   *     discovery. The tables are sparse on purpose: an unlisted roll finds
   *     nothing and still pays loot.
   */
  const resolveExplorationRoll = (rollNum: number, choice?: string) => {
    if (!dataset) return;
    const found = warband.explorationDiscoveries ?? [];
    /*
      The total as rolled. Seek and Circle Back are NOT added here: the book
      makes using them a choice — "you can use any Mercenaries, pieces of
      Equipment…" — so they are offered beside the dice and the player applies
      them, through the same total-entry box a physical roll uses. A Warband
      holding Circle Back is not made to lose a point off every roll.
    */
    const total = Math.max(0, rollNum);
    /*
      The Pot of Manna pays "each Exploration Step (including this one)", so
      the bonus counted here is what the Warband holds AFTER this roll — what
      it already had, plus anything this Location is about to grant.
    */
    const held = explorationHeld;
    const peek = resolveExploration(dataset, total, explorationTable, found);
    /* A Location with options grants nothing until one is picked; the radio
       rows below re-run this through `chooseExploration`. */
    const granted = explorationGrants(dataset, peek?.location, gamesPlayed, choice);
    const outcome = resolveExploration(dataset, total, explorationTable, found,
      explorationLootBonus([...held, ...granted]));
    if (!outcome) return;

    setExplorationResult({
      roll: `${total}`,
      title: outcome.location?.name
        ?? (outcome.nothingBecause === 'already-discovered'
              ? 'Pillaged — already discovered'
              : 'Nothing discovered'),
      reward: `${outcome.loot} Ducats`,
      description: outcome.location?.description
        ?? 'No Location on this table matches the roll. You still collect the loot.',
    });
    /* Only a Location actually discovered is recorded: a Pillaged result is
       one this Warband already has, and a roll off the table found nothing. */
    setExplorationLocation(outcome.location ?? null);
    setExplorationChoice(choice ?? null);
    setExplorationFound(outcome.location
      ? {
        discovered: outcome.location.name,
        /* The Location's own printed text, so the Warband's record of what it
           holds carries the rule rather than just its name (FD-12 item 2).
           Copied from the dataset, never retyped. */
        text: outcome.location.description,
        effects: granted,
      }
      : { effects: [] });
    // Loot replaces rather than accumulates: rolling again is a correction, not
    // a second Exploration.
    setDucatsGained(outcome.loot);
  };

  /*
    Take one of the Location's options. Re-runs the same resolution with the
    label, so the loot, the record and the effects all come from one place —
    the alternative was a second path that decided what a choice grants, and two
    readers of one sentence is how they drift.
  */
  const chooseExploration = (label: string) => {
    setExplorationChoice(label);
    const total = explorationDiceRolled
      ? explorationDiceRolled.reduce((sum, die) => sum + die.value, 0)
      : Number(explorationResult?.roll ?? 0);
    if (total > 0) resolveExplorationRoll(total, label);
  };

  const d6 = () => Math.floor(Math.random() * 6) + 1;

  /**
   * Roll the pool this Warband is entitled to, and keep the dice.
   *
   * `pool.dice` is null where the ruleset carries no Exploration band for this
   * game, and the control is disabled in that case — it used to be
   * `explorationDice(...) ?? 3`, which paid out three dice and their loot from
   * a dataset that had said nothing at all.
   */
  const handleRollExploration = () => {
    if (explorePool.dice === null) return;
    const dice = Array.from({ length: explorePool.dice }, () => ({ value: d6(), rerolled: false }));
    setExplorationDiceRolled(dice);
    resolveExplorationRoll(dice.reduce((sum, die) => sum + die.value, 0));
  };

  /**
   * Re-roll one die, page 113:
   *
   *   "If you wish, you can re-roll one of the Exploration Dice, and if you
   *    won the game that was just played you are allowed to reroll another
   *    Exploration Dice (you can't re-roll the same Exploration Dice twice)."
   *
   * Plus one more for each Re-roll Exploration Skill held. A die that has been
   * re-rolled is marked, so the last sentence is enforced by the data rather
   * than by the player's memory.
   */
  const rerollExplorationDie = (index: number) => {
    if (!explorationDiceRolled) return;
    if (explorationDiceRolled[index]?.rerolled) return;
    if (explorationRerollsLeft <= 0) return;
    const dice = explorationDiceRolled.map((die, i) =>
      (i === index ? { value: d6(), rerolled: true } : die));
    setExplorationDiceRolled(dice);
    resolveExplorationRoll(dice.reduce((sum, die) => sum + die.value, 0));
  };

  /* ---------------------------------------------------------------- *
   * Advancement Rolls (RR-03 / RR-04 / FD-04b)
   *
   * This step offered every model the same eight buttons — `+1 Melee`,
   * `+1 Ranged`, `+1 Armour`, `+1" Move` and four named Skills — and wrote
   * the label of whichever one was pressed onto the model. Trench Crusade has
   * no characteristic advances at all, and three of those Skills do not exist.
   * The buttons were also offered to every model on the roster, including the
   * ones that had just earned no Experience.
   *
   * The book, page 105: a roll is earned when Experience reaches a circled box
   * on the Roster Sheet, and then: pick two of the Skill Tables, roll 2D6 on
   * each, and pick one of the two Skills. Where the circles are is derived —
   * see `parseExperienceTrack`.
   * ---------------------------------------------------------------- */

  /**
   * Every model the player could name as the game's standout, grouped by
   * roster.
   *
   * It offered the active Warband's models and nothing else, which is the
   * wrong shape for the thing it records: the model that decided a game is
   * frequently on the other side of the table, and a note that cannot say so
   * is a note about half the game.
   *
   * So every Warband on this device is offered, the active one first, and the
   * field stays free text for a model on a roster this device does not hold —
   * an opponent in a hosted match, or a placeholder, which has no roster at
   * all. That is why it is an `input` with a `datalist` rather than a
   * `select`: pick a name or type one, in one control.
   */
  const standoutOptions = [
    ...(warband ? [warband] : []),
    ...warbands.filter((w) => w.id !== warband?.id),
  ]
    .filter((w) => (w.units ?? []).length > 0)
    .map((w) => ({
      warbandName: w.name,
      units: (w.units ?? []).map((u) => ({
        name: u.customName,
        profile: u.profileSnapshot?.name ?? '',
      })),
    }));

  /* ---------------------------------------------------------------- *
   * The Promotion Dice Pool (RR-05 / FD-06b)
   *
   * Promotion was `handleToggleElite` on the unit card: a switch that set
   * `isElite` and asked nothing. No pool, no assignment rule, no roll, no
   * ceiling — so a Warband could promote its whole roster, in one click each,
   * and a model the rulebook forbids along with them.
   * ---------------------------------------------------------------- */

  /** Troops this Warband may actually promote, by the book's two tables. */
  const promotable = battleRoster.filter((u) =>
    canBePromoted(dataset, u, warband).eligible);

  const pool = promotionPool(dataset, {
    deeds: handover?.deedsClaimed ?? 0,
    warband,
    extraDice,
  });

  const assignmentCheck = assignmentIsLegal(
    assignment, promotable.map((u) => u.id), pool?.dice ?? 0);

  const elitesNow = eliteCount(warband);
  const stepApplies = Boolean(pool) && elitesNow < (promotionRules(dataset)?.maxElites ?? 0);

  const setDice = (unitId: string, delta: number) => {
    setPromotionRolls(null);
    setAssignment((p) => {
      const next = Math.max(0, (p[unitId] ?? 0) + delta);
      return { ...p, [unitId]: next };
    });
  };

  /**
   * Roll the assigned dice.
   *
   * In-app or physical, the way the Exploration Step already offers: the
   * player types the dice they rolled at the table, in any order, and the app
   * reads them left to right exactly as `rollPromotions` consumes them.
   */
  const rollThePool = (physical: boolean) => {
    const total = assignmentCheck.assigned;
    const dice = physical
      ? physicalDice.split(/[^1-6]+/).filter(Boolean).map(Number)
      : Array.from({ length: total }, () => Math.floor(Math.random() * 6) + 1);

    const result = rollPromotions(
      dataset,
      promotable.map((u) => u.id),
      assignment,
      dice,
      { missesBefore: warband.promotionMisses ?? 0, eliteBefore: elitesNow },
    );
    setPromotionRolls(result);

    /*
      A promoted model is ELITE "from then on, including for the rest of the
      Promotions and Experience Step" — so it earns its Experience Point in
      this same submission, and the Experience list below must already know.
    */
    const promoted = (result?.outcomes ?? []).filter((o) => o.promoted).map((o) => o.unitId);
    setEliteOverrides((p) => ({
      ...p,
      ...Object.fromEntries(promoted.map((id) => [id, true])),
    }));
    if (!physical) soundEffects.playDiceRoll();
  };

  /** The Patron's own list, for a roll of 2. Empty if the Patron is unknown. */
  const patronSkills = patronSkillsFor(dataset, warband.patron);

  /**
   * How many rolls this model is owed, counting the Experience it is about to
   * gain in this very step.
   *
   * Counting only `unit.xp` would make the player commit the wizard and
   * reopen it to spend a roll the same submission just earned.
   */
  const rollsDueFor = (unit: ActiveUnit) => {
    /*
      ELITE only, and this is not the same question as "does it earn a point
      today". Advancement Rolls come off the Experience track, and page 105
      gives Experience to ELITE models — so a Troop has none to spend, however
      much its roster says it has.

      That matters because rosters DO say it: the step this replaces granted a
      point to every model on the roster for two years (RC-02), so a Warband
      carried over from then has Troops sitting on double figures. Counting the
      track alone would hand each of them three Skills on the first submission
      after this ships.
    */
    if (eliteVerdict(unit).elite !== true) return 0;

    /* Both points, where the model earned two: a Glorious Deed's second point
       can carry a model across an Advancement Roll threshold on its own, and
       counting one would hold back the roll the book has just given it. */
    const gain = experienceFor(unit.id).points;
    const taken = (unit.advancementRolls ?? 0)
      + skillPicks.filter((p) => p.unitId === unit.id).length;
    return advancementRollsDue(dataset, { xp: unit.xp + gain, advancementRolls: taken });
  };

  const rollStateFor = (unitId: string) =>
    advRolls[unitId] ?? { tables: ['melee', 'ranged'] as [SkillsTableName, SkillsTableName], rolls: null };

  const setTable = (unitId: string, which: 0 | 1, table: SkillsTableName) => {
    const cur = rollStateFor(unitId);
    const tables: [SkillsTableName, SkillsTableName] = which === 0
      ? [table, cur.tables[1]] : [cur.tables[0], table];
    /* Changing a table invalidates the roll made on the old one. */
    setAdvRolls((p) => ({ ...p, [unitId]: { tables, rolls: null } }));
  };

  const rollAdvancement = (unitId: string) => {
    const d6 = () => Math.floor(Math.random() * 6) + 1;
    const two = (): number => d6() + d6();
    setAdvRolls((p) => ({
      ...p,
      [unitId]: { ...rollStateFor(unitId), rolls: [two(), two()] },
    }));
    soundEffects.playDiceRoll();
  };

  /** A total entered by hand, for a player who rolled real dice at the table. */
  const setRollTotal = (unitId: string, which: 0 | 1, value: number) => {
    const cur = rollStateFor(unitId);
    const base = cur.rolls ?? [7, 7];
    const rolls: [number, number] = which === 0 ? [value, base[1]] : [base[0], value];
    setAdvRolls((p) => ({ ...p, [unitId]: { ...cur, rolls } }));
  };

  /** The two offers for a model whose dice are on the table. */
  const offersFor = (unit: ActiveUnit) => {
    const st = rollStateFor(unit.id);
    if (!st.rolls) return null;
    const held = [
      ...(unit.skills ?? []).map((sk) => sk.name),
      ...skillPicks.filter((p) => p.unitId === unit.id).map((p) => p.name),
    ];
    return advancementRoll(dataset, st.tables, st.rolls, held, patronSkills);
  };

  const learnSkill = (unit: ActiveUnit, offer: SkillOffer, row: SkillRow) => {
    setSkillPicks((p) => [...p, {
      unitId: unit.id,
      name: row.name,
      table: offer.substitution === 'patron' ? 'patron' : offer.table,
      roll: offer.rolled,
      substitution: offer.substitution,
      description: row.description ?? '',
    }]);
    /* The roll is spent; clear it so the next one due starts clean. */
    setAdvRolls((p) => ({ ...p, [unit.id]: { ...rollStateFor(unit.id), rolls: null } }));
  };

  const handleFinalSubmit = () => {
    /* The button is disabled while a capture is outstanding; this is the same
       refusal for anything that reaches the handler another way. */
    if (unresolvedCaptures.length > 0) return;
    /* Same refusal for a Trauma result that owes a die nobody has rolled. */
    if (unresolvedExtraXp.length > 0) return;

    const casualties: CasualtyRecord[] = Object.entries(casualtyOutcomes).map(([unitId, data]) => {
      const u = warband.units.find((item) => item.id === unitId);
      const capture = settled(unitId);
      const removed = capture ? capture.removed : data.isDead;
      /*
        The Trauma row's own text decides what is written: five results say
        "It does not receive an Injury or a Battle Scar" and were being
        recorded as injuries anyway, and no result ever added the Battle Scar
        the book gives an ELITE model taken Out of Action.
      */
      const write = traumaWriteFor(dataset, data.outcome, {
        /* `elite` is nullable — the dataset may not say. Unknown takes no
           scar: three of them retire a model, and that is not a conclusion to
           reach from a missing Keyword. */
        elite: eliteOf(unitId).elite === true,
        alreadyRemoved: removed || capture?.fullRecovery,
      });
      return {
        unitId,
        unitName: u?.customName || 'Unknown Warrior',
        /* The row's text, then what the two players did about it. */
        outcome: capture ? `${data.outcome} ${capture.text}` : data.outcome,
        isDead: removed,
        ...(capture?.fullRecovery ? { fullRecovery: true } : {}),
        ...(capture && capture.ransom > 0 ? { ransomPaid: capture.ransom } : {}),
        records: {
          injury: write.injury,
          ...(write.scar ? { scar: write.scar } : {}),
          /* The row the result came off, so the injury the store writes can say
             where it came from as the scar already could (FD-12 item 2). */
          ...(write.row?.roll ? { roll: String(write.row.roll) } : {}),
        },
      };
    });

    const skillsLearned = skillPicks;

    /*
      Every model gets a row, earning or not, and the ones earning nothing carry
      the rule that stopped them. The store used to award one point to all of
      them without asking any of these questions.
    */
    const experience: XpAward[] = battleRoster.map((u) => {
      const verdict = experienceFor(u.id);
      return {
        unitId: u.id,
        earns: verdict.earns,
        points: verdict.points,
        ...(verdict.forDeed ? { forDeed: true } : {}),
        ...(verdict.earns ? {} : { reason: xpReasonFor(u.id, verdict.blocked) }),
      };
    });

    applyPostBattleResults(
      scenario.id,
      scenario.name,
      outcome,
      // The Variant's Reinforcements payout is published, so it is added to
      // what the player recorded rather than expected to be typed in.
      gloryGained + reinforcementBonus,
      /*
        Exploration loot a player rolled and then walked away from.

        The steps are reachable in any order, so someone could roll Exploration,
        go back, choose Reinforcements — which forfeits that step — and submit
        the Ducats anyway. The forfeiture is the book's step 6 and the loot is
        the Exploration Step's; taking one means not having the other.

        Unless the campaign's house rule keeps Exploration, in which case the
        organiser has said the two coexist and the loot stands.
      */
      explorationForfeited ? 0 : ducatsGained,
      casualties,
      skillsLearned,
      /*
        The Promotions this step made. `misses` is the whole new count, not a
        delta — it runs across models and between games, and only a Promotion
        clears it. An unrolled pool commits nothing and carries the old count
        forward unchanged.
      */
      {
        unitIds: (promotionRolls?.outcomes ?? []).filter((o) => o.promoted).map((o) => o.unitId),
        misses: promotionRolls?.misses ?? warband.promotionMisses ?? 0,
      },
      experience,
      tookReinforcements,
      narrativeLog,
      battleReportText.trim().length > 0 ? battleReportText : undefined,
      mvpUnitName.trim().length > 0 ? mvpUnitName : undefined,
      opponentWarbandName.trim().length > 0 ? opponentWarbandName : undefined,
      /* notableMoments — nothing collects them yet. */
      undefined,
      /* Joins this MatchRecord to the Chronicle's BattleRecord for the same
         game, which is what stops the two disagreeing (RR-23). */
      handover?.battleId,
      /*
        What Exploration found, for the Roster to keep (FD-07 / RR-10).

        Forfeited along with the loot when Reinforcements were called: the
        step did not happen, so nothing was discovered in it.
      */
      explorationForfeited
        ? undefined
        : {
          discovered: explorationFound.discovered,
          text: explorationFound.text,
          effects: explorationFound.effects,
        },
    );
  };

  // The post-battle sequence writes permanent results onto a warband — an
  // injury, an advancement, Ducats in the Strongbox. Without the tables it must
  // refuse, not improvise: resolving an injury from absent data and recording it
  // is worse than not opening at all.
  if (datasetLoading || datasetError || !dataset) {
    return (
      <Sheet
        open
        onClose={onClose}
        size="sm"
        title="Post-battle sequence"
      >
            <h2 className="font-gothic font-bold text-base text-theme-text">Post-battle sequence</h2>
            <p className="text-xs sm:text-[11px] text-theme-muted leading-relaxed">
              {datasetError
                ? `The rules tables could not be loaded: ${datasetError}. Nothing has been ` +
                  'recorded. The sequence writes permanent results, so it will not run without them.'
                : 'Loading the Trauma and Exploration tables…'}
            </p>
            <button
              onClick={onClose}
              className="w-full min-h-[44px] rounded-sm border border-theme-border text-theme-muted text-xs font-bold uppercase tracking-wider hover:text-theme-text"
            >
              Close
            </button>
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      size="xl"
      title="POST-BATTLE SEQUENCE"
      subtitle={`Step ${step} of ${LAST}: ${STEPS[step - 1].label}`}
      footer={<div className="flex items-center justify-between w-full gap-3">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center space-x-1 px-4 py-2 bg-theme-elevated hover:bg-theme-border text-theme-text text-xs font-bold uppercase rounded"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : <div />}
    
            {step < LAST ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center space-x-1 px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-base text-xs font-bold uppercase rounded shadow"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleFinalSubmit}
                disabled={unresolvedCaptures.length > 0 || unresolvedExtraXp.length > 0}
                title={unresolvedCaptures.length > 0
                  ? `Resolve the ransom for ${unresolvedCaptures.map((u) => u.customName).join(', ')} first.`
                  : unresolvedExtraXp.length > 0
                    ? `Roll the ${unresolvedExtraXp[0].rule.name} Experience for `
                      + `${unresolvedExtraXp.map((x) => x.unit.customName).join(', ')} first.`
                    : undefined}
                className="flex items-center space-x-1.5 px-5 py-2 bg-theme-accent hover:bg-status-error disabled:cursor-not-allowed disabled:bg-theme-elevated disabled:text-theme-muted disabled:shadow-none text-white text-xs font-bold uppercase rounded shadow-lg shadow-theme-accent/40"
              >
                <Check className="w-4 h-4" />
                <span>
                  {unresolvedCaptures.length > 0
                    ? 'Ransom unresolved'
                    : unresolvedExtraXp.length > 0
                      ? `${unresolvedExtraXp[0].rule.name} unrolled`
                      : 'Commit to Campaign Chronicle'}
                </span>
              </button>
            )}
      </div>}
    >
      {/* The step tabs scroll with the content. Sheet's header is
          already sticky, and on a phone a second fixed bar plus a
          fixed footer leaves about a third of the screen for the
          step you are actually filling in. */}
        {/* Step Tabs */}
        {/* `grid-cols-5` is a literal: a templated `grid-cols-${n}` does not
            compile, which is the mistake MobileNav is a monument to
            (docs/MOBILE.md §5). */}
        <div className="grid grid-cols-5 border-b border-theme-border bg-theme-surface text-center text-xs">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`py-2.5 ${step === i + 1 ? 'bg-theme-elevated text-theme-primary font-bold border-b-2 border-theme-primary' : 'text-theme-muted'}`}
            >
              {i + 1}. {s.label}
              {s.key === 'trauma' ? ` (${ooaUnits.length})` : ''}
              {s.key === 'exploration' && explorationForfeited ? ' —' : ''}
            </div>
          ))}
        </div>
          
          {/* STEP 1: OUTCOME & SCENARIO */}
          {step === 1 && (
            <div className="space-y-4">
              {/*
                FD-15. "Once they have recruited their Warband, they must pick a
                Patron for it" — so a campaign Warband with none recorded is a gap
                in the record, and the post-battle is where it starts to matter:
                an Advancement Roll of 2 sends the player to a list this Warband
                does not have.
              */}
              {patronGap && (
                <div className="rounded border border-status-warning bg-status-warning/10 p-3 space-y-2">
                  <p className="text-xs text-theme-muted leading-relaxed">
                    <strong className="text-status-warning">No Patron recorded.</strong>{' '}
                    &ldquo;Once they have recruited their Warband, they must pick a
                    Patron for it.&rdquo; The Patron decides which Skill you may
                    take on a Patron Skill result, so that roll cannot be answered
                    until one is set.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPatronAskOpen(true)}
                    className="min-h-[44px] w-full rounded border border-status-warning bg-theme-base px-3 text-xs font-bold uppercase text-status-warning"
                  >
                    Pick this Warband&rsquo;s Patron
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs uppercase text-theme-muted mb-1">
                  Official Scenario Fought (12 Official Scenarios)
                </label>
                <select
                  value={selectedScenarioId}
                  onChange={(e) => setSelectedScenarioId(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded p-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                >
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id} className="bg-theme-surface">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scenario Detail Card */}
              {scenario && (
                <div className="p-3 bg-theme-base border border-theme-border rounded-md flex flex-col sm:flex-row gap-3">
                  {scenario.mapImage && (
                    <div className="w-full sm:w-28 h-28 bg-theme-surface border border-theme-border rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                      <img 
                        src={scenario.mapImage} 
                        alt={scenario.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="text-xs space-y-1">
                    <span className="text-theme-primary font-bold block">{scenario.name}</span>
                    <p className="text-theme-muted text-xs sm:text-[11px] italic">{scenario.tagline}</p>
                    {/* No `|| '5 Turns'` fallback. That default is what hid the
                        hand-written game lengths being wrong for all twelve —
                        every one fell through to it, so the app showed five
                        Turns for scenarios the book plays over four. */}
                    {scenario.gameLength && (
                      <p className="text-xs sm:text-[10px] text-theme-text pt-1">{scenario.gameLength}</p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs uppercase text-theme-muted mb-2">
                  Battle Outcome
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Victory', 'Draw', 'Defeat'] as const).map((res) => (
                    <button
                      key={res}
                      type="button"
                      /* Records the result and nothing else. It used to
                         rewrite both payouts from a result-based scale the
                         book does not print (RR-02). */
                      onClick={() => setOutcome(res)}
                      className={`py-3 rounded text-sm font-bold uppercase transition-all ${
                        outcome === res
                          ? res === 'Victory'
                            ? 'bg-theme-primary text-theme-base shadow-lg'
                            : res === 'Draw'
                            ? 'bg-theme-muted text-white shadow-lg'
                            : 'bg-theme-accent text-white shadow-lg'
                          : 'bg-theme-base text-theme-muted hover:text-theme-text border border-theme-border'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-theme-muted mb-1">
                    Glory Points (☼)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={gloryGained}
                    onChange={(e) => setGloryGained(parseInt(e.target.value) || 0)}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                  <p className="mt-1 text-xs text-theme-muted">
                    {handover
                      ? `1 per Glorious Deed — ${handover.deedsClaimed} recorded this game.`
                      : '1 per Glorious Deed carried out.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs uppercase text-theme-muted mb-1">
                    Ducats (👑)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={ducatsGained}
                    onChange={(e) => setDucatsGained(parseInt(e.target.value) || 0)}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                  <p className="mt-1 text-xs text-theme-muted">
                    Loot is the Exploration Roll &times; 10, set in the Exploration Step.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: OFFICIAL TRAUMA TABLE */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-theme-base border border-theme-border rounded text-xs text-theme-muted">
                {/*
                  Two procedures, not one. The header said "Roll on the D66
                  Trauma Table" for every casualty; the book gives that table to
                  ELITE models and gives Troops a single D6.
                */}
                <span>
                  {procedure
                    ? <>ELITE models roll <strong>D66</strong> on the Trauma Table.
                        Troops make a <strong>{procedure.troops.die} Survival Roll</strong> —
                        dead on {procedure.troops.deadUpTo === 1 ? '1' : `1-${procedure.troops.deadUpTo}`},
                        alive on {procedure.troops.survivesFrom}+.</>
                    : <>Resolve each Out of Action warrior:</>}
                </span>
                
                {/* Digital vs Physical Roll Toggle */}
                <div className="flex space-x-1.5 flex-shrink-0">
                  <button
                    onClick={() => setTraumaRollMode('digital')}
                    className={`px-2.5 py-1 rounded text-xs sm:text-[11px] font-bold uppercase transition-all ${
                      traumaRollMode === 'digital' ? 'bg-theme-primary text-theme-base' : 'bg-theme-elevated text-theme-muted'
                    }`}
                  >
                    🎲 In-App Roll
                  </button>
                  <button
                    onClick={() => setTraumaRollMode('manual')}
                    className={`px-2.5 py-1 rounded text-xs sm:text-[11px] font-bold uppercase transition-all ${
                      traumaRollMode === 'manual' ? 'bg-theme-primary text-theme-base' : 'bg-theme-elevated text-theme-muted'
                    }`}
                  >
                    ✍️ Physical Roll
                  </button>
                </div>
              </div>

              {ooaUnits.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-theme-border rounded text-xs text-status-legal">
                  Praise be! No warriors from your warband were taken Out of Action.
                </div>
              ) : (
                <div className="space-y-3">
                  {ooaUnits.map((unit) => {
                    const outcomeData = casualtyOutcomes[unit.id];
                    const { elite } = eliteOf(unit.id);
                    /* Scars are ELITE-only, and this casualty is about to take one. */
                    const fate = procedure && elite
                      ? unfitForDuty(procedure, unit, 1) : null;
                    return (
                      <div
                        key={unit.id}
                        className="p-3 bg-theme-elevated border border-theme-border rounded space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <span className="font-gothic font-bold text-sm text-theme-text block">
                              {unit.customName}
                            </span>
                            <span className="text-xs text-theme-muted">
                              {unit.profileSnapshot.name} ({unit.profileSnapshot.category})
                              {elite !== null && (
                                <span className="ml-1 text-theme-primary">
                                  · {elite ? 'ELITE' : 'Troop'}
                                </span>
                              )}
                            </span>
                            {outcomeData && (
                              <p className={`text-xs mt-1 ${outcomeData.isDead ? 'text-status-error font-bold' : 'text-theme-primary'}`}>
                                {outcomeData.outcome}
                              </p>
                            )}
                          </div>

                          {/*
                            Three cases, and the third is the point: where the
                            roster does not record whether the model is ELITE we
                            ask, rather than pick a die on a guess. Only reached
                            for a Mercenary saved before the field existed —
                            some Mercenary entries are ELITE and some are not.
                          */}
                          {elite === null ? null : elite ? (
                            traumaRollMode === 'digital' ? (
                              <button
                                onClick={() => handleRollInjury(unit.id)}
                                className="flex items-center justify-center space-x-1.5 min-h-[44px] px-3 py-1.5 bg-theme-accent hover:bg-status-error text-white rounded text-xs font-bold uppercase transition-colors flex-shrink-0"
                              >
                                <Dices className="w-3.5 h-3.5" />
                                <span>Roll D66 Trauma</span>
                              </button>
                            ) : (
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <span className="text-xs sm:text-[11px] text-theme-muted">D66:</span>
                                <input
                                  type="number"
                                  min={11}
                                  max={66}
                                  inputMode="numeric"
                                  placeholder="D66"
                                  aria-label={`D66 Trauma roll for ${unit.customName}`}
                                  onChange={(e) => {
                                    const n = parseInt(e.target.value, 10);
                                    if (n >= 11 && n <= 66) resolveTraumaRoll(unit.id, n);
                                  }}
                                  className="w-20 min-h-[44px] bg-theme-base border border-theme-border text-theme-primary rounded px-2 py-1 text-base sm:text-sm focus:outline-none focus:border-theme-primary"
                                />
                              </div>
                            )
                          ) : (
                            traumaRollMode === 'digital' ? (
                              <button
                                onClick={() => handleRollSurvival(unit.id)}
                                disabled={!procedure}
                                className="flex items-center justify-center space-x-1.5 min-h-[44px] px-3 py-1.5 bg-theme-accent hover:bg-status-error disabled:opacity-50 text-white rounded text-xs font-bold uppercase transition-colors flex-shrink-0"
                              >
                                <Dices className="w-3.5 h-3.5" />
                                <span>Roll {procedure?.troops.die ?? 'D6'} Survival</span>
                              </button>
                            ) : (
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <span className="text-xs sm:text-[11px] text-theme-muted">
                                  {procedure?.troops.die ?? 'D6'}:
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  max={6}
                                  inputMode="numeric"
                                  placeholder={procedure?.troops.die ?? 'D6'}
                                  aria-label={`Survival Roll for ${unit.customName}`}
                                  onChange={(e) => {
                                    const n = parseInt(e.target.value, 10);
                                    if (Number.isInteger(n)) resolveSurvivalRoll(unit.id, n);
                                  }}
                                  className="w-20 min-h-[44px] bg-theme-base border border-theme-border text-theme-primary rounded px-2 py-1 text-base sm:text-sm focus:outline-none focus:border-theme-primary"
                                />
                              </div>
                            )
                          )}
                        </div>

                        {elite === null && (
                          <div className="rounded border border-theme-border bg-theme-base p-3 space-y-2">
                            <p className="flex items-start gap-2 text-xs text-theme-muted">
                              <HelpCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-theme-primary" />
                              <span>
                                This warband was saved before TrenchLine recorded which
                                models are ELITE, and a Mercenary can be either. The
                                answer decides the roll, so it is not guessed here.
                              </span>
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEliteOverrides((p) => ({ ...p, [unit.id]: true }))}
                                className="flex-1 min-h-[44px] rounded border border-theme-border bg-theme-elevated px-3 font-mono text-xs font-bold uppercase text-theme-text hover:border-theme-primary"
                              >
                                ELITE — D66 Trauma
                              </button>
                              <button
                                onClick={() => setEliteOverrides((p) => ({ ...p, [unit.id]: false }))}
                                className="flex-1 min-h-[44px] rounded border border-theme-border bg-theme-elevated px-3 font-mono text-xs font-bold uppercase text-theme-text hover:border-theme-primary"
                              >
                                Troop — {procedure?.troops.die ?? 'D6'} Survival
                              </button>
                            </div>
                          </div>
                        )}

                        {/*
                          Unfit for Duty. Reported, never applied: "Remove the
                          model from your Warband Roster" is unambiguous, but a
                          roster is the player's own record and this is a scar
                          count the app inferred.
                        */}
                        {fate?.unfit && (
                          <p className="flex items-start gap-2 rounded border border-status-error bg-theme-base p-3 text-xs text-status-error">
                            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                            <span>
                              <strong>Unfit for Duty.</strong> This is Battle Scar{' '}
                              {fate.scars} of {fate.at}. {fate.text}
                            </span>
                          </p>
                        )}

                        {/*
                          Captured: the one result the table does not decide.

                          Two branches, and the app used to take neither — it
                          recorded the model as an uninjured survivor with the
                          ransom unpaid, which is not an outcome the rule
                          reaches. The negotiation happens between two people at
                          a table and this does not automate it; it refuses to
                          write down a result nobody has stated (RC-04).
                        */}
                        {captureRuleFor(unit.id) && (() => {
                          const rule = captureRuleFor(unit.id)!;
                          const chosen = captures[unit.id];
                          const outcome = captureSettlement(unit.id);
                          const purse = warband.treasuryDucats ?? 0;
                          const choose = (resolution: CaptureResolution) =>
                            setCaptures((prev) => ({
                              ...prev,
                              [unit.id]: { ransom: prev[unit.id]?.ransom ?? 0, resolution },
                            }));
                          return (
                            <div className="rounded border border-theme-accent bg-theme-base p-3 space-y-3">
                              <p className="text-xs text-theme-text">
                                <strong className="text-theme-accent">
                                  {rule.name} ({rule.roll}).
                                </strong>{' '}
                                {rule.text}
                              </p>

                              <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                  onClick={() => choose('ransomed')}
                                  aria-pressed={chosen?.resolution === 'ransomed'}
                                  className={`min-h-[44px] flex-1 rounded border px-3 text-xs font-bold uppercase transition-colors ${
                                    chosen?.resolution === 'ransomed'
                                      ? 'border-theme-primary bg-theme-primary text-theme-base'
                                      : 'border-theme-border bg-theme-elevated text-theme-text'
                                  }`}
                                >
                                  Ransom paid
                                </button>
                                <button
                                  onClick={() => choose('executed')}
                                  aria-pressed={chosen?.resolution === 'executed'}
                                  className={`min-h-[44px] flex-1 rounded border px-3 text-xs font-bold uppercase transition-colors ${
                                    chosen?.resolution === 'executed'
                                      ? 'border-status-error bg-status-error text-white'
                                      : 'border-theme-border bg-theme-elevated text-theme-text'
                                  }`}
                                >
                                  Not paid — executed
                                </button>
                              </div>

                              {chosen?.resolution === 'ransomed' && (
                                <label className="flex items-center gap-2 text-xs text-theme-muted">
                                  <span className="flex-shrink-0">Ransom, in Ducats</span>
                                  {/*
                                    Capped at what is in the Strongbox: the rule
                                    transfers Ducats out of it, and a Strongbox
                                    cannot go negative. `text-base` because iOS
                                    zooms a font under 16px on focus.
                                  */}
                                  <input
                                    type="number"
                                    min={0}
                                    max={purse}
                                    inputMode="numeric"
                                    value={chosen.ransom}
                                    onChange={(e) => {
                                      const n = Math.max(0,
                                        Math.min(purse, Math.floor(Number(e.target.value) || 0)));
                                      setCaptures((prev) => ({
                                        ...prev,
                                        [unit.id]: { resolution: 'ransomed', ransom: n },
                                      }));
                                    }}
                                    aria-label={`Ransom paid for ${unit.customName}, in Ducats`}
                                    className="min-h-[44px] w-24 rounded border border-theme-border bg-theme-elevated px-2 text-base sm:text-xs text-theme-text"
                                  />
                                  <span className="text-theme-muted">of {purse} held</span>
                                </label>
                              )}

                              {outcome && 'error' in outcome ? (
                                <p className="text-xs font-bold text-status-error">
                                  {outcome.error} Resolve it by hand and record it in the
                                  chronicle.
                                </p>
                              ) : outcome ? (
                                <p className="text-xs text-theme-primary">{outcome.text}</p>
                              ) : (
                                <p className="text-xs font-bold text-status-error">
                                  Say what the two of you agreed. The step will not commit
                                  until you do.
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        {/*
                          A repeat of an injury the model already carries is
                          rerolled until a usable result. The app used to append
                          the same injury string twice and say nothing.
                        */}
                        {outcomeData && !outcomeData.isDead
                          && alreadySuffered(unit, outcomeData.outcome.replace(/^D66: \d+ - /, '').split(':')[0]) && (
                          <p className="rounded border border-theme-border bg-theme-base p-3 text-xs text-theme-muted">
                            This warrior already carries that injury. Unless the result
                            says otherwise, roll again until you get one that can be used.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: PROMOTIONS & EXPERIENCE */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-theme-base border border-theme-border rounded text-xs text-theme-muted">
                {/*
                  The book's sentence, not the app's old one. "Surviving warriors
                  gain Experience Points" was wrong in three ways at once, and the
                  code behind it was wrong in four: it gave a point to Troops, to
                  models that sat the game out, to models it had just recorded
                  dead, and to models carrying the injury that forbids Experience.
                */}
                {/*
                  "Choose promotions or official Skills from the Melee,
                  Ranged, Stealth or Wildcard trees" was the old sentence, and
                  neither half survives: a Promotion is won on a Promotion
                  Die, and a Skill comes off a 2D6 roll on two tables the
                  player picks. Nothing here is chosen from a list.
                */}
                Promotions first, then Experience — the book's order. A Troop is
                Promoted by a Promotion Die, out of a pool this Warband earned from
                its Glorious Deeds. Then each <strong>ELITE</strong> model that took
                part in this game and survived gains 1 Experience Point, including one
                Promoted a moment ago, and a second for having performed at least one
                Glorious Deed — taken from the match, not asked for again. Troops
                gain none.
              </div>

              {/* ---------------- THE PROMOTION DICE POOL ---------------- */}
              {/*
                Before any Experience, because the book puts it there and the
                order is load-bearing: a model promoted here is ELITE "from
                then on, including for the rest of the Promotions and
                Experience Step", so it earns its point in this same
                submission.
              */}
              <div className="rounded border border-theme-border bg-theme-base p-3 space-y-3">
                <h4 className="text-xs uppercase font-bold text-theme-text">Promotions</h4>

                {!pool ? (
                  <p className="text-xs sm:text-[11px] text-theme-muted">
                    This ruleset does not carry the Promotion rules, so no Promotion
                    Dice can be rolled.
                  </p>
                ) : !stepApplies ? (
                  /* "Ignore the Promotion step completely if there are already
                     6 or more models with the ELITE Keyword…" */
                  <p className="text-xs sm:text-[11px] text-theme-muted">
                    This Warband has <strong className="text-theme-text">{elitesNow}</strong> models
                    with the ELITE Keyword, so the Promotion step is skipped.
                  </p>
                ) : promotable.length === 0 ? (
                  <p className="text-xs sm:text-[11px] text-theme-muted">
                    No model on this Roster can be Promoted.
                  </p>
                ) : (
                  <>
                    {/* The pool, showing its working: a number a player cannot
                        check against the page is a number they will not trust. */}
                    <div className="space-y-1">
                      <p className="text-xs text-theme-accent">
                        Promotion Dice Pool: <strong>{pool.dice}</strong>
                      </p>
                      <p className="text-xs sm:text-[11px] text-theme-muted">
                        {pool.parts.map((part) => `${part.label} ${part.dice}`).join(' + ')}
                      </p>
                      <label className="flex min-h-[44px] items-center gap-2 text-xs sm:text-[11px] text-theme-muted">
                        <span>Extra dice from Glory Items or Skills the app does not model:</span>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={extraDice}
                          onChange={(e) => { setPromotionRolls(null); setExtraDice(Math.max(0, Number(e.target.value))); }}
                          className="h-[44px] w-16 shrink-0 rounded border border-theme-border bg-theme-elevated px-2 text-center text-base text-theme-text"
                        />
                      </label>
                    </div>

                    {/* Step 2: assign. The rule is enforced, not described. */}
                    <div className="space-y-2">
                      {promotable.map((u) => (
                        <div key={u.id} className="flex items-center justify-between gap-2">
                          <span className="min-w-0 flex-1 truncate text-xs text-theme-text">
                            {u.customName}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setDice(u.id, -1)}
                              className="rounded bg-theme-elevated px-3 font-bold text-theme-text"
                              aria-label={`One fewer Promotion Die for ${u.customName}`}
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-theme-primary">
                              {assignment[u.id] ?? 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => setDice(u.id, 1)}
                              className="rounded bg-theme-elevated px-3 font-bold text-theme-text"
                              aria-label={`One more Promotion Die for ${u.customName}`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                      <p className="text-xs sm:text-[11px] text-theme-muted">
                        {assignmentCheck.assigned} of {pool.dice} assigned.
                        {assignmentCheck.assigned < pool.dice
                          && ' Dice left in the pool are lost.'}
                      </p>
                      {!assignmentCheck.legal && (
                        <p className="text-xs sm:text-[11px] text-theme-danger">
                          {assignmentCheck.detail}
                        </p>
                      )}
                    </div>

                    {/* Step 3: roll. In-app or the dice already on the table. */}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        disabled={!assignmentCheck.legal || assignmentCheck.assigned === 0}
                        onClick={() => rollThePool(false)}
                        className="min-h-[44px] flex-1 rounded bg-theme-primary px-3 text-xs font-bold uppercase text-theme-base disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Roll {assignmentCheck.assigned} in app
                      </button>
                      <div className="flex flex-1 gap-2">
                        <input
                          value={physicalDice}
                          onChange={(e) => setPhysicalDice(e.target.value)}
                          placeholder="or type the dice: 6 2 4"
                          aria-label="Promotion Dice rolled at the table"
                          className="min-h-[44px] min-w-0 flex-1 rounded border border-theme-border bg-theme-elevated px-2 text-base sm:text-xs text-theme-text"
                        />
                        <button
                          type="button"
                          disabled={!assignmentCheck.legal || physicalDice.trim().length === 0}
                          onClick={() => rollThePool(true)}
                          className="min-h-[44px] shrink-0 rounded bg-theme-elevated px-3 text-xs font-bold uppercase text-theme-text disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Use
                        </button>
                      </div>
                    </div>

                    {(warband.promotionMisses ?? 0) > 0 && !promotionRolls && (
                      <p className="text-xs sm:text-[11px] text-theme-muted">
                        {warband.promotionMisses} dice rolled without a Promotion so far.
                        {' '}At {promotionRules(dataset)?.autoAfterMisses}, the next one is
                        automatically a Promotion.
                      </p>
                    )}

                    {promotionRolls && (
                      <div className="space-y-1 rounded border border-theme-accent bg-theme-elevated p-2">
                        {promotionRolls.outcomes.map((o) => {
                          const u = promotable.find((x) => x.id === o.unitId);
                          if (!u || o.rolled.length === 0) return null;
                          return (
                            <p key={o.unitId} className="text-xs text-theme-text">
                              <strong>{u.customName}</strong>: {o.rolled.join(', ')}
                              {o.promoted
                                ? o.automatic
                                  ? ' — PROMOTED (automatic, after the run of misses)'
                                  : ' — PROMOTED'
                                : ' — no Promotion'}
                            </p>
                          );
                        })}
                        <p className="text-xs sm:text-[11px] text-theme-muted">
                          Misses in a row, carried on the Roster: {promotionRolls.misses}.
                          {promotionRolls.unrolled > 0
                            && ` ${promotionRolls.unrolled} dice were not rolled: the Warband reached its ELITE ceiling.`}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/*
                Recruitment bounds this Warband can EARN, claimed here because
                this is where the rule says they are claimed: "in any Promotion
                Step after making all Advancement Rolls".

                The Black Grail's Curse on Creation trades six Grail Thralls for
                a second Amalgam. Its text was derived and rendered on the unit
                card and consumed by nothing, so the app had no state that could
                tell a legal second Amalgam from an illegal one (RC-08).
              */}
              {dataset && earnable.map(({ profile, rule, verdict }) => (
                <div key={profile.id} className="rounded border border-theme-accent bg-theme-base p-3 space-y-3">
                  <p className="text-xs text-theme-text">
                    <strong className="text-theme-accent">{rule.grantedBy}.</strong>{' '}
                    {rule.text}
                  </p>

                  {verdict.eligible ? (
                    <>
                      <p className="text-xs text-theme-muted">
                        Claiming this removes{' '}
                        <strong className="text-theme-text">
                          {verdict.spendable.map((u) => u.name).join(', ')}
                        </strong>{' '}
                        from the Roster.
                      </p>
                      <button
                        onClick={() => {
                          const res = claimEarnedRecruitment(warband.id, profile.id, dataset);
                          setClaimed(res.ok
                            ? `${rule.grantedBy} claimed. Gave up ${res.spent.join(', ')}.`
                              + (res.freeRecruit === 'added'
                                ? ` A ${profile.name} joined the Warband at no cost.`
                                : res.freeRecruit === 'unavailable'
                                  ? ` The free ${profile.name} could not be recruited — the`
                                    + ' catalogue has not loaded. Add it by hand and set its cost to 0.'
                                  : '')
                            : res.blockers.join(' '));
                        }}
                        className="min-h-[44px] w-full rounded border border-theme-accent bg-theme-accent px-3 text-xs font-bold uppercase text-white transition-colors hover:bg-status-error"
                      >
                        Claim {rule.grantedBy}
                      </button>
                    </>
                  ) : (
                    <ul className="space-y-1 text-xs text-theme-muted">
                      {verdict.blockers.map((b) => <li key={b}>· {b}</li>)}
                    </ul>
                  )}
                </div>
              ))}

              {claimed && (
                <p className="rounded border border-theme-border bg-theme-base p-3 text-xs text-theme-primary">
                  {claimed}
                </p>
              )}

              {/*
                War Stories (Wildcard Skill 11), where a model holds it.

                Hidden entirely otherwise, rather than shown greyed out: a
                Warband with nobody holding the Skill has no decision to make,
                and a permanent empty panel is a rule the player has to learn
                to ignore.
              */}
              {warStories && (
                <div className="space-y-2 rounded border border-theme-border bg-theme-base p-3">
                  <p className="font-gothic text-sm font-bold text-theme-text">
                    {warStories.rule.name}
                  </p>
                  <p className="text-xs text-theme-muted">{warStories.rule.text}</p>
                  <p className="text-xs text-theme-muted">
                    Held by{' '}
                    {battleRoster
                      .filter((u) => warStories.holderIds.has(u.id))
                      .map((u) => u.customName).join(', ')}
                    .
                  </p>
                  <label className="flex min-h-[44px] items-center gap-2 text-xs text-theme-primary">
                    <input
                      type="checkbox"
                      checked={takeWarStories}
                      onChange={(e) => setTakeWarStories(e.target.checked)}
                      className="h-4 w-4 shrink-0 accent-current"
                    />
                    <span>
                      Give every other ELITE model +{warStories.rule.points} Experience Point
                    </span>
                  </label>
                </div>
              )}

              {/*
                The die a Trauma result owes, one panel per model that rolled
                one. The roll is the player's: digital rolls it here, manual
                takes the number off the table's own dice, exactly as the
                Trauma and Exploration steps already do.
              */}
              {extraXpOwed.map(({ unit, rule }) => {
                const rolled = extraXpRolls[unit.id];
                const sides = rule.die;
                return (
                  <div key={`extra-xp-${unit.id}`} className="space-y-2 rounded border border-theme-accent bg-theme-base p-3">
                    <p className="font-gothic text-sm font-bold text-theme-text">
                      {unit.customName} — {rule.name}
                    </p>
                    <p className="text-xs text-theme-muted">{rule.text}</p>
                    {sides === null ? (
                      <p className="text-xs text-theme-primary">+{rule.fixed} Experience.</p>
                    ) : typeof rolled === 'number' ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-theme-primary">
                          Rolled {rolled} — +{rolled} Experience.
                        </span>
                        <button
                          onClick={() => setExtraXpRolls((r) => ({ ...r, [unit.id]: null }))}
                          className="min-h-[44px] rounded border border-theme-border px-3 text-xs uppercase text-theme-muted"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setExtraXpRollMode('digital')}
                            className={`min-h-[44px] flex-1 rounded border px-3 text-xs uppercase ${
                              extraXpRollMode === 'digital'
                                ? 'border-theme-accent bg-theme-accent text-white'
                                : 'border-theme-border text-theme-muted'}`}
                          >
                            Roll here
                          </button>
                          <button
                            onClick={() => setExtraXpRollMode('manual')}
                            className={`min-h-[44px] flex-1 rounded border px-3 text-xs uppercase ${
                              extraXpRollMode === 'manual'
                                ? 'border-theme-accent bg-theme-accent text-white'
                                : 'border-theme-border text-theme-muted'}`}
                          >
                            Enter a roll
                          </button>
                        </div>
                        {extraXpRollMode === 'digital' ? (
                          <button
                            onClick={() => setExtraXpRolls((r) => ({
                              ...r,
                              [unit.id]: 1 + Math.floor(Math.random() * sides),
                            }))}
                            className="min-h-[44px] w-full rounded border border-theme-accent bg-theme-accent px-3 text-xs font-bold uppercase text-white"
                          >
                            Roll D{sides}
                          </button>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: sides }, (_, i) => i + 1).map((n) => (
                              <button
                                key={n}
                                onClick={() => setExtraXpRolls((r) => ({ ...r, [unit.id]: n }))}
                                disabled={!isValidRoll(rule, n)}
                                aria-label={`${unit.customName} rolled ${n}`}
                                className="min-h-[44px] min-w-[44px] rounded border border-theme-border text-sm text-theme-text"
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="space-y-3">
                {battleRoster.map((unit) => {
                  const xp = experienceFor(unit.id);
                  const reason = xp.earns ? null : xpReasonFor(unit.id, xp.blocked);
                  return (
                  <div key={unit.id} className="p-3 bg-theme-elevated border border-theme-border rounded space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="font-gothic font-bold text-sm text-theme-text">{unit.customName}</span>
                      <span className={`text-xs ${xp.earns ? 'text-theme-primary' : 'text-theme-muted'}`}>
                        {xp.earns ? `${unit.xp} → ${unit.xp + xp.points} XP` : `${unit.xp} XP · no gain`}
                      </span>
                    </div>
                    {/* Why, in the rule's terms. "No XP" beside a Leader's name reads as a bug. */}
                    {reason && (
                      <p className="text-xs sm:text-[11px] text-theme-muted">{reason}</p>
                    )}
                    {/*
                      Two points is the unusual case, so it says which rule
                      gave the second — and the trimmed case says so too,
                      because a Deed that earned nothing looks like the app
                      forgetting rather than the cap working.
                    */}
                    {/*
                      The award, broken into the rules that made it. Two points
                      was already the unusual case; with War Stories and a
                      Trauma result in play an award can now be five, and a
                      number that large with no working shown is one a player
                      cannot check against the page.
                    */}
                    {xp.earns && (xp.forDeed || xp.fromTrauma > 0 || xp.fromWarStories > 0) && (
                      <p className="text-xs sm:text-[11px] text-theme-primary">
                        {[
                          '+1 for surviving',
                          ...(xp.forDeed ? ['+1 for a Glorious Deed'] : []),
                          ...(xp.fromTrauma > 0
                            ? [`+${xp.fromTrauma} from ${
                                extraXpOwed.find((x) => x.unit.id === unit.id)?.rule.name}`]
                            : []),
                          ...(xp.fromWarStories > 0
                            ? [`+${xp.fromWarStories} from ${warStories?.rule.name}`]
                            : []),
                        ].join(', ')}
                        {xp.withheld > 0
                          && ` — ${xp.withheld} withheld at its cap of ${capFor(unit.id)}`}
                      </p>
                    )}
                    {/*
                      The one condition the app cannot know on its own: it records
                      no participation, so this is where a player says a model sat
                      the game out.
                    */}
                    {!unit.isDead && (
                      <label className="flex min-h-[44px] items-center gap-2 text-xs text-theme-muted">
                        <input
                          type="checkbox"
                          checked={!!satOut[unit.id]}
                          onChange={(e) => setSatOut((p) => ({ ...p, [unit.id]: e.target.checked }))}
                          className="h-4 w-4 shrink-0 accent-current"
                        />
                        <span>Did not take part in this game</span>
                      </label>
                    )}

                    {/*
                      The track (FD-12 item 1), the same component the unit card
                      and the Roster Sheet draw. The circles are where the rolls
                      below come from, so the player can see the one they are
                      about to spend and the next one coming.

                      `xp + xp.points`, not `unit.xp`: the rolls due beneath it
                      are computed from the Experience this submission awards,
                      so a track drawn on the figure from BEFORE the battle
                      showed a model one box short of a circle while offering it
                      the roll that circle earns (review round 1, finding L).
                      `justPromoted` resets to zero first, exactly as the commit
                      does — a model Promoted in this step "begins with 0
                      Experience Points, but will gain at least 1".
                    */}
                    <ExperienceTrack
                      dataset={dataset}
                      unit={{
                        ...unit,
                        xp: (promotionRolls?.outcomes ?? []).some(
                          (o) => o.promoted && o.unitId === unit.id)
                          ? xp.points
                          : unit.xp + xp.points,
                      }}
                    />

                    {/*
                      The Advancement Roll, in the book's three steps.

                      Shown only for a model that has actually earned one. The
                      eight buttons this replaces were offered to every model
                      on the roster, including the ones the step above had just
                      told the player earn nothing.
                    */}
                    {(() => {
                      const due = rollsDueFor(unit);
                      const mine = skillPicks.filter((p) => p.unitId === unit.id);
                      const st = rollStateFor(unit.id);
                      const offers = offersFor(unit);
                      const nextAt = nextAdvancementAt(dataset, unit.xp + xp.points);
                      /*
                        Only an ELITE model is on the Experience track at all,
                        so only an ELITE model has a next Advancement Roll. A
                        Troop was being told "Next Advancement Roll at 10
                        Experience" beside the line saying it gains none —
                        an appointment it will never keep.
                      */
                      const onTheTrack = eliteVerdict(unit).elite === true;

                      return (
                        <div className="space-y-2">
                          {mine.map((p, i) => (
                            <p key={`${p.name}-${i}`} className="text-xs text-theme-primary">
                              Learned <strong>{p.name}</strong>
                              {p.table === 'patron'
                                ? ' from the Patron’s list (rolled 2)'
                                : ` — ${SKILL_TABLE_LABEL[p.table]}, rolled ${p.roll}`}
                              {p.substitution === 'next-lowest' && ' (already had that Skill; took the next lowest)'}
                              {p.substitution === 'next-highest' && ' (had every lower Skill; took the next highest)'}
                            </p>
                          ))}

                          {due === 0 && onTheTrack && (
                            <p className="text-xs sm:text-[11px] text-theme-muted">
                              {nextAt === null
                                ? 'At the end of the Experience track — no further Advancement Rolls.'
                                : `Next Advancement Roll at ${nextAt} Experience.`}
                            </p>
                          )}

                          {due > 0 && (
                            <div className="space-y-2 rounded border border-theme-accent bg-theme-base p-2">
                              <p className="text-xs text-theme-accent">
                                <strong>{due}</strong> Advancement Roll{due > 1 ? 's' : ''} due.
                                Pick two Skill Tables and roll 2D6 on each.
                              </p>

                              {/*
                                Each table beside the total rolled on it, in
                                one column per pick. The two were a row of
                                selects and then a separate row of inputs, each
                                input repeating its table's name to say which
                                was which — three copies of "Melee & Strength"
                                on a 375px screen, and the row overflowed.
                              */}
                              <div className="flex flex-col gap-2 sm:flex-row">
                                {([0, 1] as const).map((which) => (
                                  <div key={which} className="flex flex-1 gap-2">
                                    <select
                                      value={st.tables[which]}
                                      onChange={(e) => setTable(unit.id, which, e.target.value as SkillsTableName)}
                                      aria-label={`Skill Table ${which + 1}`}
                                      className="min-h-[44px] min-w-0 flex-1 rounded border border-theme-border bg-theme-elevated px-2 text-base text-theme-text sm:text-xs"
                                    >
                                      {SKILL_TABLES.map((t) => (
                                        <option key={t} value={t}>{SKILL_TABLE_LABEL[t]}</option>
                                      ))}
                                    </select>
                                    {/*
                                      Typed as well as rolled: this app is used
                                      at a table, where the dice are real.
                                    */}
                                    <input
                                      type="number"
                                      min={2}
                                      max={12}
                                      value={st.rolls ? st.rolls[which] : ''}
                                      onChange={(e) => setRollTotal(unit.id, which, Number(e.target.value))}
                                      aria-label={`2D6 total on ${SKILL_TABLE_LABEL[st.tables[which]]}`}
                                      placeholder="2D6"
                                      className="h-[44px] w-16 shrink-0 rounded border border-theme-border bg-theme-elevated px-2 text-center text-base text-theme-text"
                                    />
                                  </div>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() => rollAdvancement(unit.id)}
                                className="min-h-[44px] w-full rounded bg-theme-primary px-3 text-xs font-bold uppercase text-theme-base"
                              >
                                Roll 2D6 on both
                              </button>

                              {offers && offers.map((offer, i) => (
                                <div key={`${offer.table}-${i}`} className="space-y-1">
                                  {offer.offered.length === 0 ? (
                                    /*
                                      Reported rather than filled in. A roll of
                                      2 with no Patron recorded, or a table the
                                      model has exhausted, is a real answer —
                                      and substituting a Skill from elsewhere is
                                      what this step used to do.
                                    */
                                    <>
                                      <p className="text-xs sm:text-[11px] text-theme-muted">
                                        {SKILL_TABLE_LABEL[offer.table]} on {offer.rolled}:{' '}
                                        {offer.substitution === 'patron'
                                          ? 'Patron Skill — this Warband has no Patron recorded, so nothing can be offered.'
                                          : offer.landedOn === null
                                            ? 'that total is not on this table.'
                                            : 'the model already has every Skill on this table.'}
                                      </p>
                                      {/*
                                        FD-15. The gap is closable here: pick the
                                        Patron and the same roll offers its Skills,
                                        without leaving the post-battle.
                                      */}
                                      {offer.substitution === 'patron' && (
                                        <button
                                          type="button"
                                          onClick={() => setPatronAskOpen(true)}
                                          className="min-h-[44px] w-full rounded border border-theme-accent bg-theme-base px-3 text-xs font-bold uppercase text-theme-accent"
                                        >
                                          Pick this Warband&rsquo;s Patron
                                        </button>
                                      )}
                                    </>
                                  ) : offer.offered.map((row) => (
                                    <button
                                      key={row.name}
                                      type="button"
                                      onClick={() => learnSkill(unit, offer, row)}
                                      className="min-h-[44px] w-full rounded border border-theme-border bg-theme-elevated p-2 text-left hover:border-theme-accent"
                                    >
                                      <span className="block text-xs font-bold text-theme-text">
                                        {row.name}
                                      </span>
                                      <span className="block text-xs sm:text-[11px] text-theme-muted">
                                        {SKILL_TABLE_LABEL[offer.table]}, rolled {offer.rolled}
                                        {offer.substitution === 'next-lowest' && ' — already held; next lowest'}
                                        {offer.substitution === 'next-highest' && ' — had every lower; next highest'}
                                        {offer.substitution === 'patron' && ' — from the Patron’s list'}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              ))}

                              {offers && (
                                <p className="text-xs sm:text-[11px] text-theme-muted">
                                  Pick one of the two.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: REINFORCEMENTS STEP (OPTIONAL) */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-gothic font-bold text-base text-theme-text">
                  {STEPS[3].book?.name ?? 'Reinforcements Step (Optional)'}
                </h3>
                {/* The book's own sentence, not a paraphrase of it. */}
                <p className="mt-1 text-xs sm:text-[13px] text-theme-muted leading-relaxed">
                  {STEPS[3].book?.description
                    ?? 'If your Warband has suffered heavy losses, you can call for '
                     + 'reinforcements. However, if you do so you will not be able to '
                     + 'Explore or visit the Quartermaster, so it is not a decision to '
                     + 'be taken lightly.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {([
                  { taken: false, label: 'Skip reinforcements',
                    note: 'Explore and visit the Quartermaster as usual.' },
                  { taken: true, label: 'Call for reinforcements',
                    note: 'Recruit in the roster builder after this phase.' },
                ] as const).map((choice) => (
                  <button
                    key={String(choice.taken)}
                    type="button"
                    onClick={() => setTookReinforcements(choice.taken)}
                    aria-pressed={tookReinforcements === choice.taken}
                    className={`tap w-full text-left p-3.5 rounded border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary ${
                      tookReinforcements === choice.taken
                        ? 'border-theme-primary bg-theme-primary/10 ring-1 ring-theme-primary'
                        : 'border-theme-border bg-theme-base hover:border-theme-primary'
                    }`}
                  >
                    <span className="block font-bold text-xs uppercase text-theme-text">
                      {choice.label}
                    </span>
                    <span className="block mt-1 text-xs sm:text-[11px] text-theme-muted">
                      {choice.note}
                    </span>
                  </button>
                ))}
              </div>

              {/*
                Warned, never blocked — and the wording distinguishes the two
                cases, because "you are breaking a rule" and "your group plays
                it this way" are different things to tell a player.
              */}
              {tookReinforcements && !houseRuleKeepsExploration && (
                <div className="p-3.5 rounded border border-status-warning bg-status-warning/10 text-xs leading-relaxed">
                  <p className="font-bold text-status-warning uppercase">
                    This costs you the Exploration and Quartermaster Steps
                  </p>
                  <p className="mt-1 text-theme-text">
                    The Exploration Step is skipped on the next screen. You can
                    still continue — the app does not stop you — but the printed
                    rule is that calling for reinforcements gives both up.
                  </p>
                </div>
              )}
              {tookReinforcements && houseRuleKeepsExploration && (
                <div className="p-3.5 rounded border border-theme-primary bg-theme-primary/5 text-xs leading-relaxed">
                  <p className="font-bold text-theme-primary uppercase">
                    House rule (set by this campaign)
                  </p>
                  <p className="mt-1 text-theme-text">
                    Reinforcements does not cost this campaign its Exploration
                    and Quartermaster Steps, so Exploration is still available.
                    The book gives both up.
                  </p>
                </div>
              )}

              {/*
                The rest of the price, which the app used to charge nothing for.

                Steps 1, 2 and 5 empty the Arsenal and the Strongbox. Both are
                things a player has been building up all campaign, so the
                numbers are named before the choice is committed rather than
                discovered afterwards. The house rule above covers only step 6;
                it does not make the Arsenal survive.
              */}
              {tookReinforcements && cost && (
                <div className="p-3.5 rounded border border-status-error bg-status-error/5 text-xs leading-relaxed space-y-2">
                  <p className="font-bold text-status-error uppercase">
                    You give up your Arsenal and your Strongbox
                  </p>
                  <ul className="space-y-1 text-theme-text">
                    <li>
                      <strong>{cost.strongboxLost} Ducats</strong> in the Strongbox,
                      reduced to zero.
                    </li>
                    <li>
                      {cost.arsenalDiscarded.length === 0
                        ? 'No Battlekit in the Arsenal to discard.'
                        : <>
                            <strong>{cost.arsenalDiscarded.length} item(s)</strong> in
                            the Arsenal, discarded:{' '}
                            {cost.arsenalDiscarded.map((i) => i.name).join(', ')}.
                          </>}
                    </li>
                    <li>
                      {cost.allowance === null
                        ? <span className="text-status-warning">
                            The next game&rsquo;s Threshold Value could not be read, so
                            the recruiting allowance is not shown rather than guessed.
                          </span>
                        : <>You may then spend up to <strong>{cost.allowance} Ducats</strong>{' '}
                          recruiting, against game {nextGame}&rsquo;s Threshold — your
                          Warband costs {cost.warbandTotalCost}. Anything unspent is lost.</>}
                    </li>
                  </ul>
                  {/* The book's own six steps, not a paraphrase of them. */}
                  {reinforcements && (
                    <details className="pt-1">
                      <summary className="tap cursor-pointer font-mono text-xs uppercase text-theme-muted hover:text-theme-text">
                        The published sequence
                      </summary>
                      <ol className="mt-2 space-y-1 pl-4 text-theme-muted list-decimal">
                        {reinforcements.steps.map((st) => (
                          <li key={st.step}>{st.text}</li>
                        ))}
                      </ol>
                    </details>
                  )}
                </div>
              )}

              {/*
                The organiser's override.

                Not gated on "am I the admin": nothing in this client can
                answer that question — `adminName` is a string it displays, and
                the real check lives on the campaign API. A checkbox that
                pretended to enforce it would be theatre, so it is labelled for
                whoever is running the campaign instead, and it writes to the
                chronicle so the group can see when it changed.
              */}
              {campaign?.id && (
                <label className="tap flex items-start gap-2.5 p-3 rounded border border-theme-border bg-theme-base cursor-pointer">
                  <input
                    type="checkbox"
                    checked={houseRuleKeepsExploration}
                    onChange={(e) =>
                      setCampaignHouseRule('reinforcementsKeepExploration', e.target.checked || undefined)}
                    className="mt-0.5 w-5 h-5 flex-shrink-0 accent-theme-primary"
                  />
                  <span className="text-xs leading-relaxed">
                    <span className="block font-bold uppercase text-theme-text">
                      Campaign house rule: Reinforcements keeps Exploration
                    </span>
                    <span className="block mt-0.5 text-theme-muted">
                      For the organiser. Applies to the whole campaign, is
                      recorded in the chronicle, and is shown as this
                      campaign&apos;s rule rather than as the book&apos;s.
                    </span>
                  </span>
                </label>
              )}
            </div>
          )}

          {/* STEP 5: EXPLORATION STEP & BATTLE CHRONICLE */}
          {step === 5 && (
            <div className="space-y-4">
              
              {/*
                Exploration, unless it was given up.

                Rendered as a notice rather than a disabled panel: a greyed-out
                roll button invites a player to keep trying it, and the thing
                worth showing here is the REASON, which is a decision they made
                one screen ago and can still go back and change.
              */}
              {/*
                A Carcass Front campaign runs a DIFFERENT Exploration Step, and
                until now ran the rulebook's (RR-09). Three dice rather than up
                to six, loot at five per point rather than ten, a Resource table
                rather than a rarity band, and a table only the Aggressor
                consults. `rules/campaign.ts` has had all of it since the
                supplement landed and nothing called it.
              */}
              {explorationForfeited ? (
                <div className="p-4 bg-theme-elevated border border-status-warning rounded space-y-2 text-xs leading-relaxed">
                  <p className="font-gothic font-bold text-sm text-status-warning">
                    EXPLORATION — GIVEN UP
                  </p>
                  <p className="text-theme-text">
                    You called for reinforcements, and the book gives up both
                    the Exploration and the Quartermaster Steps for it.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="tap mt-1 text-theme-primary underline underline-offset-2 font-bold uppercase text-xs"
                  >
                    Go back and change it
                  </button>
                </div>
              ) : isCarcassFront ? (
                dataset ? (
                  <CarcassFrontExploration
                    dataset={dataset}
                    alreadyDiscovered={warband.explorationDiscoveries ?? []}
                    onLoot={setDucatsGained}
                    onDiscovered={(name) => setExplorationFound(
                      /* No `effects`: the Carcass Front tables grant no
                         Exploration Skill, and `explorationGrants` reads the
                         rulebook's sentences, which these Locations do not
                         print. Recording an empty list is the honest answer. */
                      name ? { discovered: name, effects: [] } : { effects: [] })}
                  />
                ) : null
              ) : (
              <div className="p-4 bg-theme-elevated border border-theme-border rounded space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-gothic font-bold text-sm text-theme-primary">
                      EXPLORATION — {explorePool.dice === null
                        ? 'NO BAND'
                        : `${explorePool.dice}D6`}
                    </span>
                    {/* Only the tables this warband's games-played band opens.
                        Offering all three would let a first-game warband roll on
                        the Legendary table, which the book does not allow. */}
                    <select
                      value={explorationTable}
                      onChange={(e) => setSelectedExplorationTable(e.target.value as ExplorationTableName)}
                      disabled={!openTables?.choose}
                      className="bg-theme-base border border-theme-border text-theme-primary text-base sm:text-xs rounded px-2 py-1 min-h-[44px] lg:min-h-0 disabled:opacity-60"
                    >
                      {(openTables?.tables ?? ['common']).map((t) => (
                        <option key={t} value={t}>
                          {t[0].toUpperCase() + t.slice(1)} Table
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Digital vs Physical Roll Toggle */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setExplorationRollMode('digital')}
                        className={`px-2 py-0.5 rounded text-xs sm:text-[10px] font-bold uppercase transition-all ${
                          explorationRollMode === 'digital' ? 'bg-theme-primary text-theme-base' : 'bg-theme-base text-theme-muted'
                        }`}
                      >
                        🎲 In-App
                      </button>
                      <button
                        onClick={() => setExplorationRollMode('manual')}
                        className={`px-2 py-0.5 rounded text-xs sm:text-[10px] font-bold uppercase transition-all ${
                          explorationRollMode === 'manual' ? 'bg-theme-primary text-theme-base' : 'bg-theme-base text-theme-muted'
                        }`}
                      >
                        ✍️ Physical
                      </button>
                    </div>

                    {explorationRollMode === 'digital' ? (
                      <button
                        onClick={handleRollExploration}
                        disabled={explorePool.dice === null}
                        title={explorePool.dice === null
                          ? 'This ruleset carries no Exploration Dice band for this game.'
                          : undefined}
                        className="flex items-center space-x-1.5 px-3 py-1 bg-theme-primary hover:bg-theme-primary-hover text-theme-base rounded text-xs font-bold uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Dices className="w-3.5 h-3.5" />
                        <span>Roll Scavenge</span>
                      </button>
                    ) : (
                      <input
                        type="number"
                        min={1}
                        max={60}
                        inputMode="numeric"
                        placeholder="Roll"
                        aria-label="Exploration Roll total"
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          if (!(n > 0)) return;
                          /* A typed total is not the dice on screen — it is
                             the one the player got on the table, Skills and
                             re-rolls already applied. Clearing them keeps the
                             two from disagreeing. */
                          setExplorationDiceRolled(null);
                          resolveExplorationRoll(n);
                        }}
                        className="w-24 min-h-[44px] bg-theme-base border border-theme-border text-theme-primary rounded px-2 py-1 text-base sm:text-sm focus:outline-none focus:border-theme-primary"
                      />
                    )}
                  </div>
                </div>

                {/*
                  A ruleset that cannot say how many dice says so, and the roll
                  is off. It used to read `explorationDice(...) ?? 3`: three is
                  the FIRST BAND'S number, so a dataset carrying no Exploration
                  at all paid out exactly as though it had carried the opening
                  band — dice, Location and loot, invented (FD-07 / RR-10). The
                  total can still be typed in, because a player with the book
                  open is a better source than a fallback.
                */}
                {explorePool.dice === null && (
                  <p className="text-xs text-status-warning leading-relaxed">
                    This ruleset carries no Exploration Dice band for game {gamesPlayed},
                    so the app will not roll one. Roll on the table in the book and
                    enter the total.
                  </p>
                )}

                {/*
                  The dice, not just their sum, so the book's re-roll is a
                  thing the player can do: tap a die to re-roll it, once each.
                */}
                {explorationDiceRolled && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {explorationDiceRolled.map((die, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => rerollExplorationDie(i)}
                          disabled={die.rerolled || explorationRerollsLeft <= 0}
                          aria-label={die.rerolled
                            ? `Exploration die ${i + 1} showing ${die.value}, already re-rolled`
                            : `Re-roll Exploration die ${i + 1}, showing ${die.value}`}
                          title={die.rerolled
                            ? 'You can’t re-roll the same Exploration Dice twice.'
                            : explorationRerollsLeft <= 0
                              ? 'No re-rolls left.'
                              : 'Re-roll this die'}
                          className={`min-w-[44px] min-h-[44px] rounded border font-gothic font-bold text-lg
                            ${die.rerolled
                              ? 'bg-theme-surface border-theme-border text-theme-muted'
                              : explorationRerollsLeft > 0
                                ? 'bg-theme-base border-theme-primary text-theme-primary hover:bg-theme-primary hover:text-theme-base'
                                : 'bg-theme-base border-theme-border text-theme-text'}`}
                        >
                          {die.value}
                        </button>
                      ))}
                      <span className="text-xs sm:text-[11px] font-mono text-theme-muted">
                        = {explorationDiceRolled.reduce((sum, die) => sum + die.value, 0)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-[11px] text-theme-muted leading-relaxed">
                      {/* The rule beside the control it governs, in the book's words. */}
                      “If you wish, you can re-roll one of the Exploration Dice, and if you
                      won the game that was just played you are allowed to reroll another
                      Exploration Dice (you can’t re-roll the same Exploration Dice twice).”
                      {' '}<strong className="text-theme-primary">
                        {explorationRerollsLeft} of {explorationRerollAllowance} left
                      </strong>.
                    </p>
                  </div>
                )}

                {/*
                  The Skills this Warband holds that the app does not apply for
                  it — the three that need a die chosen, and the two that move
                  the total, which the book makes optional ("you can use"). Shown
                  with their published text, beside the dice they are about.
                */}
                {explorePool.byHand.length > 0 && (
                  <div className="p-3 bg-theme-base border border-theme-border rounded space-y-1.5">
                    <p className="text-xs sm:text-[11px] font-bold uppercase text-theme-primary">
                      Your Exploration Skills — yours to apply
                    </p>
                    {explorePool.byHand.map((skill, i) => (
                      <p key={`${skill.name}-${i}`} className="text-xs text-theme-text leading-relaxed">
                        <strong className="text-theme-primary">{skill.name}:</strong> {skill.text}
                      </p>
                    ))}
                    <p className="text-xs sm:text-[11px] text-theme-muted leading-relaxed">
                      Apply them to the dice above, then enter the total you ended up with.
                    </p>
                  </div>
                )}

                {explorationResult && (
                  <div className="p-3 bg-theme-base border border-theme-primary rounded space-y-1">
                    <span className="text-xs font-bold text-theme-primary">
                      {/* Not D66: the Exploration Roll is 3 to 6 D6 summed. */}
                      {explorationResult.roll ? `Roll ${explorationResult.roll} — ` : ''}{explorationResult.title} ({explorationResult.reward})
                    </span>
                    <p className="text-xs text-theme-text leading-relaxed">{explorationResult.description}</p>

                    {/*
                      The Location's own options, where it offers a choice
                      (finding B). Thirteen do, and the Trench Merchant's are
                      opposites — 2 Glory now, or the Glory Item Table open for
                      good — so the step must ask rather than read both.

                      A column of full-width 44px rows: each carries a sentence,
                      and sentences side by side at 375px are unreadable.
                    */}
                    {explorationLocationChoices.length > 0 && (
                      <fieldset className="space-y-1.5 pt-1.5">
                        <legend className="text-xs sm:text-[11px] font-bold uppercase text-theme-primary">
                          Choose one
                        </legend>
                        {explorationLocationChoices.map((c) => (
                          <label
                            key={c.label}
                            className={`flex min-h-[44px] w-full cursor-pointer items-start gap-2 rounded border p-2 transition-colors ${
                              explorationChoice === c.label
                                ? 'border-theme-primary bg-theme-elevated'
                                : 'border-theme-border bg-theme-surface hover:border-theme-primary/60'
                            }`}
                          >
                            <input
                              type="radio"
                              name="exploration-choice"
                              className="mt-1 h-5 w-5 flex-shrink-0 accent-current text-theme-primary"
                              checked={explorationChoice === c.label}
                              onChange={() => chooseExploration(c.label)}
                            />
                            <span className="min-w-0 text-xs leading-relaxed">
                              <strong className="block text-theme-text">{c.label}</strong>
                              <span className="block text-theme-muted">{c.text}</span>
                            </span>
                          </label>
                        ))}
                        {!explorationChoice && (
                          <p className="text-xs sm:text-[11px] leading-relaxed text-status-warning">
                            Nothing is recorded on the Roster until one is chosen.
                          </p>
                        )}
                      </fieldset>
                    )}
                  </div>
                )}
              </div>
              )}

              {/* Payout Summary */}
              <div className="p-4 bg-theme-base border-2 border-theme-primary rounded-md space-y-2 text-xs">
                <span className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted block">Post-Battle Payout:</span>
                <div className="flex justify-between text-sm">
                  <span>Glory Points Gained:</span>
                  <strong className="text-theme-primary">+{gloryGained + reinforcementBonus} Glory</strong>
                </div>
                {/* Named, not folded in silently: a player who sees a number
                    they did not enter needs to know which rule produced it. */}
                {reinforcementBonus > 0 && (
                  <div className="flex justify-between text-xs text-theme-muted">
                    <span>&nbsp;&nbsp;including Reinforcements payout:</span>
                    <span>+{reinforcementBonus} Glory</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Total Ducats Deposited into Treasury:</span>
                  <strong className="text-theme-primary">+{ducatsGained} Ducats</strong>
                </div>
              </div>

              {/* Narrative Battle Report Section */}
              <div className="p-4 bg-theme-elevated border border-theme-border rounded-md space-y-3 text-xs">
                <span className="text-xs sm:text-[11px] uppercase font-bold text-theme-primary flex items-center space-x-1.5">
                  <Award className="w-3.5 h-3.5" />
                  <span>Battlefield Chronicle & Narrative Report</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="pb-opponent" className="text-xs sm:text-[10px] uppercase text-theme-muted block">Opponent Warband / Commander:</label>
                    <input
                      id="pb-opponent"
                      type="text"
                      value={opponentWarbandName}
                      onChange={(e) => setOpponentWarbandName(e.target.value)}
                      placeholder="e.g. Court of the Seven-Headed Serpent (Sorcerer Zortan)"
                      className="w-full bg-theme-base border border-theme-border rounded px-2.5 py-1.5 text-xs text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary"
                    />
                    {/*
                      The opponents you have already played, one tap each.

                      Still free text underneath, because the field records who
                      you played and that is not always somebody you have saved.
                      These only fill it in — the record keeps the NAME, not a
                      reference, so forgetting an opponent later cannot rewrite
                      a battle you have already fought.
                    */}
                    {opponents.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {opponents.map((o) => {
                          const label = opponentLabel(
                            o, (id) => factions.find((f) => f.id === id)?.name);
                          return (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => setOpponentWarbandName(label)}
                              className="min-h-[44px] rounded border border-theme-border px-2.5 text-xs text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    {/* Was "Match MVP (Awards Heroic Deed)", and it did award
                        one: a fabricated Deed on the model's roster entry,
                        beside the real Glorious Deeds. The game has no MVP and
                        no Heroic Deed, so this is a battle-report note and is
                        now labelled as one (RR-24). */}
                    <label
                      htmlFor="standout-model"
                      className="text-xs sm:text-[10px] uppercase text-theme-muted block"
                    >
                      Standout model of the game (battle report only):
                    </label>
                    {/*
                      Any roster, not just this one. The model that decided a
                      game is often on the other side of the table, and it
                      offered only the active Warband's — so the note could not
                      say what it was for.

                      Free text as well as a list: an opponent in a hosted
                      match, or a placeholder, has no roster on this device,
                      and "not in the list" must not mean "cannot be named".
                    */}
                    <input
                      id="standout-model"
                      list="standout-model-options"
                      value={mvpUnitName}
                      onChange={(e) => setMvpUnitName(e.target.value)}
                      placeholder="Pick a model, or type any name"
                      className="w-full min-h-[44px] bg-theme-base border border-theme-border rounded px-2.5 py-1.5 text-base sm:text-xs text-theme-text focus:outline-none focus:border-theme-primary"
                    />
                    <datalist id="standout-model-options">
                      {standoutOptions.flatMap((roster) =>
                        roster.units.map((u) => (
                          <option key={`${roster.warbandName}-${u.name}`} value={u.name}>
                            {u.profile
                              ? `${u.profile} — ${roster.warbandName}`
                              : roster.warbandName}
                          </option>
                        )))}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs sm:text-[10px] uppercase text-theme-muted block">Battle Narrative / Turning Points (Markdown):</label>
                  <textarea
                    value={battleReportText}
                    onChange={(e) => setBattleReportText(e.target.value)}
                    placeholder="Write a comprehensive tactical battle report: key charges, heroic saves, objective snatches, and narrative turning points..."
                    rows={4}
                    className="w-full bg-theme-base border border-theme-border rounded px-2.5 py-2 text-xs text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary"
                  />
                </div>
              </div>

            </div>
          )}

      {/*
        FD-15. Rendered at the modal's root rather than inside the model's row:
        the picker is a Sheet of its own, and nesting one inside a mapped row
        would mount one per model.
      */}
      {warband && (
        <PatronPicker
          open={patronAskOpen}
          onClose={() => setPatronAskOpen(false)}
          dataset={dataset}
          factionId={warband.factionId}
          factionName={factions.find((f) => f.id === warband.factionId)?.name}
          current={warband.patron}
          reason={'A Patron Skill was rolled and this Warband has no Patron recorded. '
            + '“If a Patron Skill is rolled, use one of the Patron Skills for the Patron '
            + 'you picked for your Warband.” Pick it here and the roll offers that '
            + 'Patron’s Skills.'}
          onPick={(name) => {
            updateWarbandLore(warband.id, warband.lore ?? '', warband.motto ?? '', name);
            setPatronAskOpen(false);
          }}
        />
      )}

    </Sheet>
  );
};
