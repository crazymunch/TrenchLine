'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useDataset } from '../../rules/useDataset';
import {
  explorationDice, explorationTables, resolveExploration, campaignGameOf,
} from '../../rules/campaign';
import { DEFAULT_RULESET_ID } from '../../rules/rulesets';
import type { ExplorationTableName } from '../../types/catalogue';
import { CasualtyRecord } from '../../types/campaign';
import { 
  X, 
  Skull, 
  Sparkles, 
  Coins, 
  Dices, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  AlertTriangle, 
  Flag,
  Award,
  MapPin,
  Image as ImageIcon,
  Edit3
} from 'lucide-react';

interface PostBattleWizardModalProps {
  onClose: () => void;
}

export const PostBattleWizardModal: React.FC<PostBattleWizardModalProps> = ({ onClose }) => {
  const { getActiveWarband, scenarios, applyPostBattleResults, campaign } = useStore();
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

  const [step, setStep] = useState<number>(1);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(scenarios[0]?.id || 'claim-no-mans-land');
  const [outcome, setOutcome] = useState<'Victory' | 'Defeat' | 'Draw'>('Victory');
  const [gloryGained, setGloryGained] = useState<number>(3);
  const [ducatsGained, setDucatsGained] = useState<number>(30);
  const [narrativeLog, setNarrativeLog] = useState<string>('');
  
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

  // Advancements
  const [unitAdvancements, setUnitAdvancements] = useState<Record<string, string>>({});

  // Exploration roll
  const [selectedExplorationTable, setSelectedExplorationTable] = useState<ExplorationTableName>('common');
  const [explorationResult, setExplorationResult] = useState<{ roll?: string; title: string; reward: string; description: string } | null>(null);

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

    applyPostBattleResults(
      scenario.id,
      scenario.name,
      outcome,
      gloryGained,
      ducatsGained,
      casualties,
      advancements,
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
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm font-mono">
        <div className="w-full sm:max-w-md bg-[#161920] border border-[#323846] sm:rounded-md p-5 space-y-3">
          <h2 className="font-gothic font-bold text-base text-[#ECEFF4]">Post-battle sequence</h2>
          <p className="text-xs sm:text-[11px] text-[#8E95A5] leading-relaxed">
            {datasetError
              ? `The rules tables could not be loaded: ${datasetError}. Nothing has been ` +
                'recorded. The sequence writes permanent results, so it will not run without them.'
              : 'Loading the Trauma and Exploration tables…'}
          </p>
          <button
            onClick={onClose}
            className="w-full min-h-[44px] rounded-sm border border-[#323846] text-[#8E95A5] text-xs font-bold uppercase tracking-wider hover:text-[#ECEFF4]"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-mono">
      <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-3xl max-h-[90dvh] rounded-md flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#323846] bg-[#0C0E12]">
          <div className="flex items-center space-x-3">
            <Award className="w-6 h-6 text-[#D4AF37]" />
            <div>
              <h2 className="font-gothic font-bold text-lg text-[#ECEFF4] tracking-wide">
                OFFICIAL TRENCH CRUSADE POST-BATTLE SEQUENCE
              </h2>
              <p className="text-xs text-[#8E95A5]">Step {step} of 4: Trauma, Experience, Scavenge & Chronicle</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[#8E95A5] hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Tabs */}
        <div className="grid grid-cols-4 border-b border-[#323846] bg-[#161920] text-center text-xs">
          <div className={`py-2.5 ${step === 1 ? 'bg-[#20242E] text-[#D4AF37] font-bold border-b-2 border-[#D4AF37]' : 'text-[#8E95A5]'}`}>
            1. Scenario & Result
          </div>
          <div className={`py-2.5 ${step === 2 ? 'bg-[#20242E] text-[#D4AF37] font-bold border-b-2 border-[#D4AF37]' : 'text-[#8E95A5]'}`}>
            2. Trauma Table ({ooaUnits.length})
          </div>
          <div className={`py-2.5 ${step === 3 ? 'bg-[#20242E] text-[#D4AF37] font-bold border-b-2 border-[#D4AF37]' : 'text-[#8E95A5]'}`}>
            3. Promotions & Skills
          </div>
          <div className={`py-2.5 ${step === 4 ? 'bg-[#20242E] text-[#D4AF37] font-bold border-b-2 border-[#D4AF37]' : 'text-[#8E95A5]'}`}>
            4. Exploration & Report
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* STEP 1: OUTCOME & SCENARIO */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-[#8E95A5] mb-1">
                  Official Scenario Fought (12 Official Scenarios)
                </label>
                <select
                  value={selectedScenarioId}
                  onChange={(e) => setSelectedScenarioId(e.target.value)}
                  className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-sm text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
                >
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#161920]">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scenario Detail Card */}
              {scenario && (
                <div className="p-3 bg-[#0C0E12] border border-[#323846] rounded-md flex flex-col sm:flex-row gap-3">
                  {scenario.mapImage && (
                    <div className="w-full sm:w-28 h-28 bg-[#161920] border border-[#323846] rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                      <img 
                        src={scenario.mapImage} 
                        alt={scenario.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="text-xs space-y-1">
                    <span className="text-[#D4AF37] font-bold block">{scenario.name}</span>
                    <p className="text-[#8E95A5] text-[11px] italic">{scenario.tagline || scenario.flavor}</p>
                    <div className="text-[10px] text-[#ECEFF4] space-x-2 pt-1">
                      <span>Length: <strong>{scenario.gameLength || '5 Turns'}</strong></span>
                      <span>•</span>
                      <span>Table: <strong>{scenario.tableSize || '48" x 48"'}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs uppercase text-[#8E95A5] mb-2">
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
                            ? 'bg-[#D4AF37] text-black shadow-lg'
                            : res === 'Draw'
                            ? 'bg-[#78909C] text-white shadow-lg'
                            : 'bg-[#8B0000] text-white shadow-lg'
                          : 'bg-[#0C0E12] text-[#8E95A5] hover:text-white border border-[#323846]'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-[#8E95A5] mb-1">
                    Glory Points (☼)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={gloryGained}
                    onChange={(e) => setGloryGained(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-sm text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase text-[#8E95A5] mb-1">
                    Ducats (👑)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={ducatsGained}
                    onChange={(e) => setDucatsGained(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-sm text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: OFFICIAL TRAUMA TABLE */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#0C0E12] border border-[#323846] rounded text-xs text-[#8E95A5]">
                <span>Roll on the <strong>D66 Trauma Table</strong> for each Out of Action warrior:</span>
                
                {/* Digital vs Physical Roll Toggle */}
                <div className="flex space-x-1.5 flex-shrink-0">
                  <button
                    onClick={() => setTraumaRollMode('digital')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition-all ${
                      traumaRollMode === 'digital' ? 'bg-[#D4AF37] text-black' : 'bg-[#20242E] text-[#8E95A5]'
                    }`}
                  >
                    🎲 In-App Roll
                  </button>
                  <button
                    onClick={() => setTraumaRollMode('manual')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition-all ${
                      traumaRollMode === 'manual' ? 'bg-[#D4AF37] text-black' : 'bg-[#20242E] text-[#8E95A5]'
                    }`}
                  >
                    ✍️ Physical Roll
                  </button>
                </div>
              </div>

              {ooaUnits.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-[#323846] rounded text-xs text-[#4E9A6E]">
                  Praise be! No warriors from your warband were taken Out of Action.
                </div>
              ) : (
                <div className="space-y-3">
                  {ooaUnits.map((unit) => {
                    const outcomeData = casualtyOutcomes[unit.id];
                    return (
                      <div
                        key={unit.id}
                        className="p-3 bg-[#20242E] border border-[#323846] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex-1">
                          <span className="font-gothic font-bold text-sm text-[#ECEFF4] block">
                            {unit.customName}
                          </span>
                          <span className="text-xs text-[#8E95A5]">
                            {unit.profileSnapshot.name} ({unit.profileSnapshot.category})
                          </span>
                          {outcomeData && (
                            <p className={`text-xs mt-1 ${outcomeData.isDead ? 'text-[#E53935] font-bold' : 'text-[#D4AF37]'}`}>
                              {outcomeData.outcome}
                            </p>
                          )}
                        </div>

                        {traumaRollMode === 'digital' ? (
                          <button
                            onClick={() => handleRollInjury(unit.id)}
                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#8B0000] hover:bg-[#A30000] text-white rounded text-xs font-bold uppercase transition-colors flex-shrink-0"
                          >
                            <Dices className="w-3.5 h-3.5" />
                            <span>Roll D66 Trauma</span>
                          </button>
                        ) : (
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <span className="text-[11px] text-[#8E95A5]">D66:</span>
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
                              className="w-20 min-h-[44px] bg-[#0C0E12] border border-[#323846] text-[#D4AF37] rounded px-2 py-1 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                            />
                          </div>
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
              <div className="p-3 bg-[#0C0E12] border border-[#323846] rounded text-xs text-[#8E95A5]">
                Surviving warriors gain Experience Points. Choose promotions or official Skills from Melee, Ranged, Stealth or Wildcard trees.
              </div>

              <div className="space-y-3">
                {warband.units.map((unit) => (
                  <div key={unit.id} className="p-3 bg-[#20242E] border border-[#323846] rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-gothic font-bold text-sm text-[#ECEFF4]">{unit.customName}</span>
                      <span className="text-xs text-[#D4AF37]">{unit.xp + 1} XP Total</span>
                    </div>

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
                            className={`py-1 px-2 rounded font-semibold transition-all truncate text-[11px] ${
                              isSelected
                                ? 'bg-[#D4AF37] text-black font-bold'
                                : 'bg-[#0C0E12] text-[#8E95A5] hover:text-white border border-[#323846]'
                            }`}
                          >
                            {adv}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: EXPLORATION TABLES & BATTLE CHRONICLE */}
          {step === 4 && (
            <div className="space-y-4">
              
              {/* Exploration Section */}
              <div className="p-4 bg-[#20242E] border border-[#323846] rounded space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-gothic font-bold text-sm text-[#D4AF37]">
                      EXPLORATION — {explorationDice(dataset, gamesPlayed) ?? '?'}D6
                    </span>
                    {/* Only the tables this warband's games-played band opens.
                        Offering all three would let a first-game warband roll on
                        the Legendary table, which the book does not allow. */}
                    <select
                      value={explorationTable}
                      onChange={(e) => setSelectedExplorationTable(e.target.value as ExplorationTableName)}
                      disabled={!openTables?.choose}
                      className="bg-[#0C0E12] border border-[#323846] text-[#D4AF37] text-base sm:text-xs rounded px-2 py-1 min-h-[44px] sm:min-h-0 disabled:opacity-60"
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
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                          explorationRollMode === 'digital' ? 'bg-[#D4AF37] text-black' : 'bg-[#0C0E12] text-[#8E95A5]'
                        }`}
                      >
                        🎲 In-App
                      </button>
                      <button
                        onClick={() => setExplorationRollMode('manual')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                          explorationRollMode === 'manual' ? 'bg-[#D4AF37] text-black' : 'bg-[#0C0E12] text-[#8E95A5]'
                        }`}
                      >
                        ✍️ Physical
                      </button>
                    </div>

                    {explorationRollMode === 'digital' ? (
                      <button
                        onClick={handleRollExploration}
                        className="flex items-center space-x-1.5 px-3 py-1 bg-[#D4AF37] hover:bg-[#E5C158] text-black rounded text-xs font-bold uppercase transition-colors"
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
                        className="w-24 min-h-[44px] bg-[#0C0E12] border border-[#323846] text-[#D4AF37] rounded px-2 py-1 text-base sm:text-sm focus:outline-none focus:border-[#D4AF37]"
                      />
                    )}
                  </div>
                </div>

                {explorationResult && (
                  <div className="p-3 bg-[#0C0E12] border border-[#D4AF37] rounded space-y-1">
                    <span className="text-xs font-bold text-[#D4AF37]">
                      {/* Not D66: the Exploration Roll is 3 to 6 D6 summed. */}
                      {explorationResult.roll ? `Roll ${explorationResult.roll} — ` : ''}{explorationResult.title} ({explorationResult.reward})
                    </span>
                    <p className="text-xs text-[#ECEFF4] leading-relaxed">{explorationResult.description}</p>
                  </div>
                )}
              </div>

              {/* Payout Summary */}
              <div className="p-4 bg-[#0C0E12] border-2 border-[#D4AF37] rounded-md space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-[#8E95A5] block">Post-Battle Payout:</span>
                <div className="flex justify-between text-sm">
                  <span>Glory Points Gained:</span>
                  <strong className="text-[#D4AF37]">+{gloryGained} Glory</strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Ducats Deposited into Treasury:</span>
                  <strong className="text-[#D4AF37]">+{ducatsGained} Ducats</strong>
                </div>
              </div>

              {/* Narrative Battle Report Section */}
              <div className="p-4 bg-[#20242E] border border-[#323846] rounded-md space-y-3 text-xs">
                <span className="text-[11px] uppercase font-bold text-[#D4AF37] flex items-center space-x-1.5">
                  <Award className="w-3.5 h-3.5" />
                  <span>Battlefield Chronicle & Narrative Report</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-[#8E95A5] block">Opponent Warband / Commander:</label>
                    <input
                      type="text"
                      value={opponentWarbandName}
                      onChange={(e) => setOpponentWarbandName(e.target.value)}
                      placeholder="e.g. Court of the Seven-Headed Serpent (Sorcerer Zortan)"
                      className="w-full bg-[#0C0E12] border border-[#323846] rounded px-2.5 py-1.5 text-xs text-white placeholder-[#8E95A5] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-[#8E95A5] block">Match MVP (Awards Heroic Deed):</label>
                    <select
                      value={mvpUnitName}
                      onChange={(e) => setMvpUnitName(e.target.value)}
                      className="w-full bg-[#0C0E12] border border-[#323846] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
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
                  <label className="text-[10px] uppercase text-[#8E95A5] block">Battle Narrative / Turning Points (Markdown):</label>
                  <textarea
                    value={battleReportText}
                    onChange={(e) => setBattleReportText(e.target.value)}
                    placeholder="Write a comprehensive tactical battle report: key charges, heroic saves, objective snatches, and narrative turning points..."
                    rows={4}
                    className="w-full bg-[#0C0E12] border border-[#323846] rounded px-2.5 py-2 text-xs text-white placeholder-[#8E95A5] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-[#323846] bg-[#0C0E12] flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center space-x-1 px-4 py-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] text-xs font-bold uppercase rounded"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center space-x-1 px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black text-xs font-bold uppercase rounded shadow"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinalSubmit}
              className="flex items-center space-x-1.5 px-5 py-2 bg-[#8B0000] hover:bg-[#A30000] text-white text-xs font-bold uppercase rounded shadow-lg shadow-[#8B0000]/40"
            >
              <Check className="w-4 h-4" />
              <span>Commit to Campaign Chronicle</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
