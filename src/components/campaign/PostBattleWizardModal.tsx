'use client';

import React, { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { useStore } from '../../store/useStore';
import { useDataset } from '../../rules/useDataset';
import { useScenarios } from '../../rules/useScenarios';
import {
  explorationDice, explorationTables, resolveExploration, campaignGameOf,
  reinforcementGlory,
} from '../../rules/campaign';
import {
  traumaProcedure, eliteVerdict, survivalOutcome, rollSurvival,
  unfitForDuty, alreadySuffered, earnsExperience, xpBarringInjuries,
} from '../../rules/trauma';
import { DEFAULT_RULESET_ID } from '../../rules/rulesets';
import type { ExplorationTableName } from '../../types/catalogue';
import { CasualtyRecord } from '../../types/campaign';
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

interface PostBattleWizardModalProps {
  onClose: () => void;
}

export const PostBattleWizardModal: React.FC<PostBattleWizardModalProps> = ({ onClose }) => {
  const {
    getActiveWarband, applyPostBattleResults, campaign, setCampaignHouseRule,
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
    Glory the Warband's Variant is paid for calling Reinforcements.

    "A Papal States Intervention Force gains 4 ☼ each time it calls for
    Reinforcements" — the same Specialist Force rule that gives them a smaller
    purse gives some of it back here. 0 for every other Variant, and read from
    the dataset rather than keyed off a faction name.
  */
  const variantReinforcementGlory =
    dataset ? reinforcementGlory(dataset, warband?.variantId) : 0;
  const reinforcementBonus = tookReinforcements ? variantReinforcementGlory : 0;
  // Empty until the dataset loads; `scenario` below falls back to the first.
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [outcome, setOutcome] = useState<'Victory' | 'Defeat' | 'Draw'>('Victory');
  const [gloryGained, setGloryGained] = useState<number>(3);
  const [ducatsGained, setDucatsGained] = useState<number>(30);
  const [narrativeLog] = useState<string>('');
  
  // Narrative & Battle Report Fields
  const [opponentWarbandName, setOpponentWarbandName] = useState<string>('');
  const [mvpUnitName, setMvpUnitName] = useState<string>('');
  const [battleReportText, setBattleReportText] = useState<string>('');

  // Physical vs In-App Roll Toggles
  const [traumaRollMode, setTraumaRollMode] = useState<'digital' | 'manual'>('digital');
  const [explorationRollMode, setExplorationRollMode] = useState<'digital' | 'manual'>('digital');

  // Casualties from match
  const ooaUnits = warband?.units.filter((u) => u.status === 'Out of Action') || [];
  const [casualtyOutcomes, setCasualtyOutcomes] = useState<Record<string, { outcome: string; isDead: boolean }>>({});
  /*
    The player's answer where the roster cannot say whether a model is ELITE.

    Only reached for a Mercenary recruited before `profileSnapshot.elite`
    existed — some Mercenary entries are ELITE and some are not, and the roster
    category cannot tell them apart. Asking is the honest move: the alternative
    is picking a die on a guess, and the die decides whether the model dies.
  */
  const [eliteOverrides, setEliteOverrides] = useState<Record<string, boolean>>({});
  /*
    Which models sat the game out. Empty by default because the common case is
    that the whole warband fought, and the app records no participation of its
    own — so this is the one place a player can say otherwise, and the
    Experience rule ("took part in a game") needs the answer.
  */
  const [satOut, setSatOut] = useState<Record<string, boolean>>({});

  // Advancements
  const [unitAdvancements, setUnitAdvancements] = useState<Record<string, string>>({});

  // Exploration roll
  const [selectedExplorationTable, setSelectedExplorationTable] = useState<ExplorationTableName>('common');
  const [explorationResult, setExplorationResult] = useState<{ roll?: string; title: string; reward: string; description: string } | null>(null);

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

  // Games already played drives both the dice count and which Location tables
  // are open, so it is one less than the game being prepared for.
  const gamesPlayed = Math.max(1, campaignGameOf(warband, campaign) - 1 || 1);
  const openTables = dataset ? explorationTables(dataset, gamesPlayed) : null;
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
  const barring = xpBarringInjuries(dataset);
  const experienceFor = (unitId: string) => {
    const u = warband.units.find((x) => x.id === unitId);
    if (!u) return { earns: false as const, blocked: 'elite-unknown' as const };
    const override = unitId in eliteOverrides
      ? { ...u, profileSnapshot: { ...u.profileSnapshot, elite: eliteOverrides[unitId] } }
      : u;
    return earnsExperience(override, {
      tookPart: !satOut[unitId],
      died: casualtyOutcomes[unitId]?.isDead ?? false,
      xpBarringInjuries: barring,
    });
  };

  /** Why a model earns nothing, in the rule's terms rather than the code's. */
  const XP_REASON: Record<string, string> = {
    'not-elite': 'Troops do not gain Experience',
    'did-not-take-part': 'did not take part in this game',
    died: 'did not survive the game',
    'head-wound': 'Head Wound — can no longer gain Experience Points',
    'elite-unknown': 'ELITE status not recorded — resolve it in the Trauma Step',
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
  const resolveExplorationRoll = (rollNum: number) => {
    if (!dataset) return;
    const found = warband.explorationDiscoveries ?? [];
    const outcome = resolveExploration(dataset, rollNum, explorationTable, found);
    if (!outcome) return;

    setExplorationResult({
      roll: `${rollNum}`,
      title: outcome.location?.name
        ?? (outcome.nothingBecause === 'already-discovered'
              ? 'Pillaged — already discovered'
              : 'Nothing discovered'),
      reward: `${outcome.loot} Ducats`,
      description: outcome.location?.description
        ?? 'No Location on this table matches the roll. You still collect the loot.',
    });
    // Loot replaces rather than accumulates: rolling again is a correction, not
    // a second Exploration.
    setDucatsGained(outcome.loot);
  };

  /** Sum the Exploration Dice this warband is entitled to. */
  const handleRollExploration = () => {
    const n = dataset ? explorationDice(dataset, gamesPlayed) ?? 3 : 3;
    let total = 0;
    for (let i = 0; i < n; i++) total += Math.floor(Math.random() * 6) + 1;
    resolveExplorationRoll(total);
  };

  const handleFinalSubmit = () => {
    const casualties: CasualtyRecord[] = Object.entries(casualtyOutcomes).map(([unitId, data]) => {
      const u = warband.units.find((item) => item.id === unitId);
      return {
        unitId,
        unitName: u?.customName || 'Unknown Warrior',
        outcome: data.outcome,
        isDead: data.isDead
      };
    });

    const advancements = Object.entries(unitAdvancements)
      .filter(([_, adv]) => adv.trim().length > 0)
      .map(([unitId, advancement]) => ({ unitId, advancement }));

    /*
      Every model gets a row, earning or not, and the ones earning nothing carry
      the rule that stopped them. The store used to award one point to all of
      them without asking any of these questions.
    */
    const experience: XpAward[] = warband.units.map((u) => {
      const verdict = experienceFor(u.id);
      return {
        unitId: u.id,
        earns: verdict.earns,
        ...(verdict.earns ? {} : { reason: XP_REASON[verdict.blocked ?? ''] ?? verdict.blocked }),
      };
    });

    applyPostBattleResults(
      scenario.id,
      scenario.name,
      outcome,
      // The Variant's Reinforcements payout is published, so it is added to
      // what the player recorded rather than expected to be typed in.
      gloryGained + reinforcementBonus,
      ducatsGained,
      casualties,
      advancements,
      experience,
      narrativeLog,
      battleReportText.trim().length > 0 ? battleReportText : undefined,
      mvpUnitName.trim().length > 0 ? mvpUnitName : undefined,
      opponentWarbandName.trim().length > 0 ? opponentWarbandName : undefined
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
                className="flex items-center space-x-1.5 px-5 py-2 bg-theme-accent hover:bg-status-error text-white text-xs font-bold uppercase rounded shadow-lg shadow-theme-accent/40"
              >
                <Check className="w-4 h-4" />
                <span>Commit to Campaign Chronicle</span>
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
                      onClick={() => {
                        setOutcome(res);
                        if (res === 'Victory') {
                          setGloryGained(3);
                          setDucatsGained(35);
                        } else if (res === 'Draw') {
                          setGloryGained(1);
                          setDucatsGained(20);
                        } else {
                          setGloryGained(0);
                          setDucatsGained(10);
                        }
                      }}
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
                Each <strong>ELITE</strong> model that took part in this game and
                survived gains 1 Experience Point. Troops gain none. Choose
                promotions or official Skills from the Melee, Ranged, Stealth or
                Wildcard trees.
              </div>

              <div className="space-y-3">
                {warband.units.map((unit) => {
                  const xp = experienceFor(unit.id);
                  const reason = xp.earns ? null : (XP_REASON[xp.blocked ?? ''] ?? xp.blocked);
                  return (
                  <div key={unit.id} className="p-3 bg-theme-elevated border border-theme-border rounded space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="font-gothic font-bold text-sm text-theme-text">{unit.customName}</span>
                      <span className={`text-xs ${xp.earns ? 'text-theme-primary' : 'text-theme-muted'}`}>
                        {xp.earns ? `${unit.xp} → ${unit.xp + 1} XP` : `${unit.xp} XP · no gain`}
                      </span>
                    </div>
                    {/* Why, in the rule's terms. "No XP" beside a Leader's name reads as a bug. */}
                    {reason && (
                      <p className="text-xs sm:text-[11px] text-theme-muted">{reason}</p>
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
                          className="h-4 w-4 accent-current"
                        />
                        <span>Did not take part in this game</span>
                      </label>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {['+1 Melee', '+1 Ranged', '+1 Armour', '+1" Move', 'Eagle Eye (Skill)', 'Mighty Blow (Skill)', 'Diehard (Skill)', 'Shadow Walker (Skill)'].map((adv) => {
                        const isSelected = unitAdvancements[unit.id] === adv;
                        return (
                          <button
                            key={adv}
                            type="button"
                            onClick={() =>
                              setUnitAdvancements({
                                ...unitAdvancements,
                                [unit.id]: isSelected ? '' : adv
                              })
                            }
                            className={`py-1 px-2 rounded font-semibold transition-all truncate text-xs sm:text-[11px] ${
                              isSelected
                                ? 'bg-theme-primary text-theme-base font-bold'
                                : 'bg-theme-base text-theme-muted hover:text-theme-text border border-theme-border'
                            }`}
                          >
                            {adv}
                          </button>
                        );
                      })}
                    </div>
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
              ) : (
              <div className="p-4 bg-theme-elevated border border-theme-border rounded space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-gothic font-bold text-sm text-theme-primary">
                      EXPLORATION — {explorationDice(dataset, gamesPlayed) ?? '?'}D6
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
                        className="flex items-center space-x-1.5 px-3 py-1 bg-theme-primary hover:bg-theme-primary-hover text-theme-base rounded text-xs font-bold uppercase transition-colors"
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
                          if (n > 0) resolveExplorationRoll(n);
                        }}
                        className="w-24 min-h-[44px] bg-theme-base border border-theme-border text-theme-primary rounded px-2 py-1 text-base sm:text-sm focus:outline-none focus:border-theme-primary"
                      />
                    )}
                  </div>
                </div>

                {explorationResult && (
                  <div className="p-3 bg-theme-base border border-theme-primary rounded space-y-1">
                    <span className="text-xs font-bold text-theme-primary">
                      {/* Not D66: the Exploration Roll is 3 to 6 D6 summed. */}
                      {explorationResult.roll ? `Roll ${explorationResult.roll} — ` : ''}{explorationResult.title} ({explorationResult.reward})
                    </span>
                    <p className="text-xs text-theme-text leading-relaxed">{explorationResult.description}</p>
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
                    <label className="text-xs sm:text-[10px] uppercase text-theme-muted block">Opponent Warband / Commander:</label>
                    <input
                      type="text"
                      value={opponentWarbandName}
                      onChange={(e) => setOpponentWarbandName(e.target.value)}
                      placeholder="e.g. Court of the Seven-Headed Serpent (Sorcerer Zortan)"
                      className="w-full bg-theme-base border border-theme-border rounded px-2.5 py-1.5 text-xs text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs sm:text-[10px] uppercase text-theme-muted block">Match MVP (Awards Heroic Deed):</label>
                    <select
                      value={mvpUnitName}
                      onChange={(e) => setMvpUnitName(e.target.value)}
                      className="w-full bg-theme-base border border-theme-border rounded px-2.5 py-1.5 text-xs text-theme-text focus:outline-none focus:border-theme-primary"
                    >
                      <option value="">-- Select MVP Warrior --</option>
                      {warband.units.map((u) => (
                        <option key={u.id} value={u.customName}>
                          {u.customName} ({u.profileSnapshot.name})
                        </option>
                      ))}
                    </select>
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

    </Sheet>
  );
};
