import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { INJURY_TABLE_D66, EXPLORATION_TABLE_D66 } from '../../data/defaultRules';
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
  Award
} from 'lucide-react';

interface PostBattleWizardModalProps {
  onClose: () => void;
}

export const PostBattleWizardModal: React.FC<PostBattleWizardModalProps> = ({ onClose }) => {
  const { getActiveWarband, scenarios, applyPostBattleResults } = useStore();
  const warband = getActiveWarband();

  const [step, setStep] = useState<number>(1);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(scenarios[0]?.id || 'trench-raid');
  const [outcome, setOutcome] = useState<'Victory' | 'Defeat' | 'Draw'>('Victory');
  const [gloryGained, setGloryGained] = useState<number>(3);
  const [ducatsGained, setDucatsGained] = useState<number>(30);
  const [narrativeLog, setNarrativeLog] = useState<string>('');

  // Casualties from match
  const ooaUnits = warband?.units.filter((u) => u.status === 'Out of Action') || [];
  const [casualtyOutcomes, setCasualtyOutcomes] = useState<Record<string, { outcome: string; isDead: boolean }>>({});

  // Advancements
  const [unitAdvancements, setUnitAdvancements] = useState<Record<string, string>>({});

  // Exploration roll
  const [explorationResult, setExplorationResult] = useState<{ title: string; reward: string; description: string } | null>(null);

  if (!warband) return null;

  const scenario = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  // Roll D66 Injury for a unit
  const handleRollInjury = (unitId: string) => {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const rollNum = parseInt(`${d1}${d2}`);

    let matched = INJURY_TABLE_D66[INJURY_TABLE_D66.length - 1];
    if (rollNum <= 16) matched = INJURY_TABLE_D66[0]; // Dead
    else if (rollNum <= 25) matched = INJURY_TABLE_D66[1]; // Grievous
    else if (rollNum <= 32) matched = INJURY_TABLE_D66[2]; // Lost eye
    else if (rollNum <= 41) matched = INJURY_TABLE_D66[3]; // Shellshock
    else if (rollNum <= 53) matched = INJURY_TABLE_D66[4]; // Hardened
    else matched = INJURY_TABLE_D66[5]; // Full recovery

    setCasualtyOutcomes((prev) => ({
      ...prev,
      [unitId]: {
        outcome: `D66: ${rollNum} - ${matched.title}: ${matched.effect}`,
        isDead: !!matched.isDead
      }
    }));
  };

  // Roll Exploration Table D66
  const handleRollExploration = () => {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const rollNum = parseInt(`${d1}${d2}`);

    let matched = EXPLORATION_TABLE_D66[0];
    if (rollNum <= 16) matched = EXPLORATION_TABLE_D66[0];
    else if (rollNum <= 26) matched = EXPLORATION_TABLE_D66[1];
    else if (rollNum <= 42) matched = EXPLORATION_TABLE_D66[2];
    else if (rollNum <= 54) matched = EXPLORATION_TABLE_D66[3];
    else matched = EXPLORATION_TABLE_D66[4];

    setExplorationResult(matched);
    // Add bonus ducats
    setDucatsGained((prev) => prev + 15);
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
      narrativeLog
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-3xl max-h-[90vh] rounded-md flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#323846] bg-[#0C0E12]">
          <div className="flex items-center space-x-3">
            <Award className="w-6 h-6 text-[#D4AF37]" />
            <div>
              <h2 className="font-gothic font-bold text-lg text-[#ECEFF4] tracking-wide">
                POST-BATTLE CAMPAIGN SEQUENCE
              </h2>
              <p className="text-xs font-mono text-[#8E95A5]">Step {step} of 4: Official Trench Crusade Sequence</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[#8E95A5] hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Tabs */}
        <div className="grid grid-cols-4 border-b border-[#323846] bg-[#161920] text-center font-mono text-xs">
          <div className={`py-2.5 ${step === 1 ? 'bg-[#20242E] text-[#D4AF37] font-bold border-b-2 border-[#D4AF37]' : 'text-[#8E95A5]'}`}>
            1. Outcome
          </div>
          <div className={`py-2.5 ${step === 2 ? 'bg-[#20242E] text-[#D4AF37] font-bold border-b-2 border-[#D4AF37]' : 'text-[#8E95A5]'}`}>
            2. Casualties ({ooaUnits.length})
          </div>
          <div className={`py-2.5 ${step === 3 ? 'bg-[#20242E] text-[#D4AF37] font-bold border-b-2 border-[#D4AF37]' : 'text-[#8E95A5]'}`}>
            3. Advancements
          </div>
          <div className={`py-2.5 ${step === 4 ? 'bg-[#20242E] text-[#D4AF37] font-bold border-b-2 border-[#D4AF37]' : 'text-[#8E95A5]'}`}>
            4. Loot & Chronicle
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* STEP 1: OUTCOME & SCENARIO */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[#8E95A5] mb-1">
                  Scenario Fought
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

              <div>
                <label className="block text-xs font-mono uppercase text-[#8E95A5] mb-2">
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
                      className={`py-3 rounded font-mono text-sm font-bold uppercase transition-all ${
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

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-mono uppercase text-[#8E95A5] mb-1">
                    Glory Points Earned
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={gloryGained}
                    onChange={(e) => setGloryGained(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-sm text-[#D4AF37] font-bold font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-[#8E95A5] mb-1">
                    Base Ducats Looted
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={ducatsGained}
                    onChange={(e) => setDucatsGained(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-sm text-[#D4AF37] font-bold font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#8E95A5] mb-1">
                  Narrative Battle Summary
                </label>
                <textarea
                  placeholder="e.g. Lieutenant Valerius led the charge across Crater 4 to secure the bunker..."
                  value={narrativeLog}
                  onChange={(e) => setNarrativeLog(e.target.value)}
                  className="w-full h-20 bg-[#0C0E12] border border-[#323846] rounded p-2 text-xs text-[#ECEFF4] placeholder-[#8E95A5] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: CASUALTIES & D66 INJURIES */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-[#0C0E12] border border-[#323846] rounded text-xs font-mono text-[#8E95A5]">
                Roll D66 on the Injury Table for all warriors who were taken Out of Action during the match.
              </div>

              {ooaUnits.length === 0 ? (
                <div className="p-8 text-center bg-[#0C0E12] rounded border border-[#323846] space-y-2">
                  <Sparkles className="w-8 h-8 text-[#4E9A6E] mx-auto" />
                  <p className="text-sm font-gothic font-bold text-[#4E9A6E]">NO WARRIORS OUT OF ACTION!</p>
                  <p className="text-xs font-mono text-[#8E95A5]">Your warband emerged from the mud without casualties.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ooaUnits.map((unit) => {
                    const res = casualtyOutcomes[unit.id];
                    return (
                      <div
                        key={unit.id}
                        className="p-4 bg-[#20242E] border border-[#323846] rounded flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div>
                          <h4 className="font-gothic font-bold text-sm text-[#ECEFF4]">{unit.customName}</h4>
                          <p className="text-xs font-mono text-[#8E95A5]">{unit.profileSnapshot.name}</p>
                          {res && (
                            <p className={`text-xs font-mono mt-1 ${res.isDead ? 'text-[#E53935] font-bold' : 'text-[#D4AF37]'}`}>
                              {res.outcome}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleRollInjury(unit.id)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#8B0000] hover:bg-[#A30000] text-white rounded font-mono text-xs font-bold uppercase transition-colors whitespace-nowrap"
                        >
                          <Dices className="w-3.5 h-3.5" />
                          <span>{res ? 'Re-roll D66' : 'Roll D66 Injury'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: ADVANCEMENTS & PROMOTIONS */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-[#0C0E12] border border-[#323846] rounded text-xs font-mono text-[#8E95A5]">
                Surviving warriors gain +1 XP. Choose stat promotions or skills for advancing heroes.
              </div>

              <div className="space-y-3">
                {warband.units.map((unit) => (
                  <div key={unit.id} className="p-3 bg-[#20242E] border border-[#323846] rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-gothic font-bold text-sm text-[#ECEFF4]">{unit.customName}</span>
                      <span className="text-xs font-mono text-[#D4AF37]">{unit.xp + 1} XP Total</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      {['+1 Melee', '+1 Ranged', '+1 Armour', '+1" Move'].map((adv) => {
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
                            className={`py-1 px-2 rounded font-mono text-xs font-semibold transition-all ${
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

          {/* STEP 4: EXPLORATION & CHRONICLE */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 bg-[#20242E] border border-[#323846] rounded space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-gothic font-bold text-sm text-[#D4AF37]">
                    NO MAN'S LAND EXPLORATION CHART (D66)
                  </span>
                  <button
                    onClick={handleRollExploration}
                    className="flex items-center space-x-1.5 px-3 py-1 bg-[#D4AF37] hover:bg-[#E5C158] text-black rounded font-mono text-xs font-bold uppercase transition-colors"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    <span>Roll Scavenge</span>
                  </button>
                </div>

                {explorationResult && (
                  <div className="p-3 bg-[#0C0E12] border border-[#D4AF37] rounded space-y-1">
                    <span className="text-xs font-mono font-bold text-[#D4AF37]">
                      {explorationResult.title} ({explorationResult.reward})
                    </span>
                    <p className="text-xs text-[#8E95A5]">{explorationResult.description}</p>
                  </div>
                )}
              </div>

              {/* Total Rewards Summary Box */}
              <div className="p-4 bg-[#0C0E12] border-2 border-[#D4AF37] rounded-md space-y-2 font-mono text-xs">
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
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-[#323846] bg-[#0C0E12] flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center space-x-1 px-4 py-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] font-mono text-xs font-bold uppercase rounded"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center space-x-1 px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-mono text-xs font-bold uppercase rounded shadow"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinalSubmit}
              className="flex items-center space-x-1.5 px-5 py-2 bg-[#8B0000] hover:bg-[#A30000] text-white font-mono text-xs font-bold uppercase rounded shadow-lg shadow-[#8B0000]/40"
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
