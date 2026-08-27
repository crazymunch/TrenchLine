'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { DiceRoller } from './DiceRoller';
import { KeywordPopover } from './KeywordPopover';
import { PostBattleWizardModal } from '../campaign/PostBattleWizardModal';
import { AttackCalculatorModal } from './AttackCalculatorModal';
import { RangeCalculatorModal } from './RangeCalculatorModal';
import { QuickSearchModal } from './QuickSearchModal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { AllOutWarCardConsole } from './AllOutWarCardConsole';
import { ActiveUnit, Warband } from '../../types/warband';
import { soundEffects } from '../../services/soundEffects';
import { 
  Heart, 
  Droplet, 
  RotateCcw, 
  Skull, 
  ArrowRight,
  Crosshair,
  UserCheck,
  Zap,
  Search,
  BookOpen,
  Ruler,
  Compass,
  Award,
  Sparkles,
  Users,
  CheckSquare,
  Square,
  Plus,
  Minus,
  XCircle,
  Shield,
  Layers,
  ChevronDown,
  ChevronUp,
  Settings,
  Swords,
  MapPin,
  Flame,
  Check,
  Sliders,
  Play
} from 'lucide-react';

export const PlayModeView: React.FC = () => {
  const { 
    warbands,
    activeWarbandId,
    setActiveWarbandId,
    getActiveWarband, 
    playTurn, 
    incrementTurn, 
    resetMatchState,
    updateUnitWounds, 
    updateUnitBloodMarkers, 
    setUnitStatus, 
    toggleUnitActed,
    setActiveKeyword,
    keywords,
    scenarios,
    isPostBattleOpen,
    setIsPostBattleOpen,
    setCurrentView
  } = useStore();

  const primaryWarband = getActiveWarband();

  // Match Lifecycle State: false = Setup/Lobby, true = Combat Active
  const [isMatchActive, setIsMatchActive] = useState<boolean>(false);

  // Multi-Player / Multi-Warband State (1 to 4 Players)
  const [matchWarbandIds, setMatchWarbandIds] = useState<string[]>(
    primaryWarband ? [primaryWarband.id] : []
  );
  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);

  // Active viewing warband
  const currentViewingWarbandId = matchWarbandIds[activePlayerIndex] || primaryWarband?.id || '';
  const viewingWarband = warbands.find((w) => w.id === currentViewingWarbandId) || primaryWarband;

  // Scenario & Scoring State
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('claim-no-mans-land');
  const [warbandScores, setWarbandScores] = useState<Record<string, { vp: number; completedDeeds: Record<string, string> }>>({});
  
  // Squad / Sub-list Deployment Filter
  const [deployedUnitIds, setDeployedUnitIds] = useState<Record<string, string[]>>({});
  const [isSquadSelectOpen, setIsSquadSelectOpen] = useState(false);
  const [isObjectivesPanelOpen, setIsObjectivesPanelOpen] = useState(true);

  // Environmental Condition
  const [environmentalHazard, setEnvironmentalHazard] = useState<string>('Standard (Clear)');

  // Modals & Tools
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [attackingUnit, setAttackingUnit] = useState<ActiveUnit | null>(null);
  const [rangingUnit, setRangingUnit] = useState<ActiveUnit | null>(null);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const [isAbortConfirmOpen, setIsAbortConfirmOpen] = useState(false);
  const [isCardConsoleOpen, setIsCardConsoleOpen] = useState(false);

  if (!viewingWarband) {
    return (
      <div className="p-8 text-center space-y-4 max-w-lg mx-auto">
        <Skull className="w-12 h-12 text-[#D4AF37] mx-auto opacity-75" />
        <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">NO WARBAND SELECTED</h3>
        <p className="text-xs font-mono text-[#8E95A5]">Select or build a warband in the roster builder to enter Play Mode.</p>
      </div>
    );
  }

  // Deployed units for current warband
  const currentDeployedIds = deployedUnitIds[viewingWarband.id] || viewingWarband.units.map((u) => u.id);
  const deployedUnits = viewingWarband.units.filter((u) => currentDeployedIds.includes(u.id));
  const deployedCost = deployedUnits.reduce((sum, u) => sum + u.totalCost, 0);

  // Statistics
  const activeCount = deployedUnits.filter((u) => u.status === 'Active').length;
  const downedCount = deployedUnits.filter((u) => u.status === 'Downed').length;
  const ooaCount = deployedUnits.filter((u) => u.status === 'Out of Action').length;
  const totalBlood = deployedUnits.reduce((sum, u) => sum + u.bloodMarkers, 0);

  const filteredUnits = deployedUnits.filter((u) => {
    if (filterStatus === 'All') return true;
    return u.status === filterStatus;
  });

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  // Score for current warband
  const currentScoreObj = warbandScores[viewingWarband.id] || { vp: 0, completedDeeds: {} };

  const handleStartCombat = () => {
    soundEffects.playTrenchWhistle();
    setIsMatchActive(true);
  };

  const handleAbortMatch = () => {
    soundEffects.playGunfire();
    resetMatchState();
    setIsMatchActive(false);
    setIsAbortConfirmOpen(false);
  };

  const handleAdjustVp = (delta: number) => {
    setWarbandScores((prev) => {
      const cur = prev[viewingWarband.id] || { vp: 0, completedDeeds: {} };
      return {
        ...prev,
        [viewingWarband.id]: {
          ...cur,
          vp: Math.max(0, cur.vp + delta)
        }
      };
    });
  };

  const handleToggleDeed = (deedName: string, unitName: string = '') => {
    setWarbandScores((prev) => {
      const cur = prev[viewingWarband.id] || { vp: 0, completedDeeds: {} };
      const nextDeeds = { ...cur.completedDeeds };
      if (nextDeeds[deedName]) {
        delete nextDeeds[deedName];
      } else {
        nextDeeds[deedName] = unitName || 'Squad';
      }
      return {
        ...prev,
        [viewingWarband.id]: {
          ...cur,
          completedDeeds: nextDeeds
        }
      };
    });
  };

  const handleToggleDeployUnit = (unitId: string) => {
    setDeployedUnitIds((prev) => {
      const currentList = prev[viewingWarband.id] || viewingWarband.units.map((u) => u.id);
      const nextList = currentList.includes(unitId)
        ? currentList.filter((id) => id !== unitId)
        : [...currentList, unitId];
      return {
        ...prev,
        [viewingWarband.id]: nextList
      };
    });
  };

  const handleSelectAllSquad = () => {
    setDeployedUnitIds((prev) => ({
      ...prev,
      [viewingWarband.id]: viewingWarband.units.map((u) => u.id)
    }));
  };

  const handleAddPlayerWarband = (wbId: string) => {
    if (matchWarbandIds.length >= 4 || matchWarbandIds.includes(wbId)) return;
    setMatchWarbandIds((prev) => [...prev, wbId]);
  };

  const handleRemovePlayerWarband = (wbId: string) => {
    if (matchWarbandIds.length <= 1) return;
    setMatchWarbandIds((prev) => prev.filter((id) => id !== wbId));
    setActivePlayerIndex(0);
  };

  const handleNextTurnWithWhistle = () => {
    soundEffects.playTrenchWhistle();
    incrementTurn();
  };

  // Parse Scenario Deeds into discrete list items
  const parseDeedsList = (deedsText?: string) => {
    if (!deedsText) return [];
    return deedsText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('- **') || l.startsWith('* **') || l.includes(':'))
      .map((l) => {
        const cleaned = l.replace(/^[-*]\s*/, '');
        const parts = cleaned.split(':');
        const title = parts[0].replace(/\*\*/g, '').trim();
        const desc = parts.slice(1).join(':').replace(/\*\*/g, '').trim();
        return { title, desc };
      });
  };

  const scenarioDeeds = parseDeedsList(selectedScenario?.gloriousDeeds);

  // ----------------------------------------------------------------------------
  // VIEW A: MATCH DESIGNER & BATTLE LOBBY (BEFORE COMMENCING COMBAT)
  // ----------------------------------------------------------------------------
  if (!isMatchActive) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24 font-mono">
        
        {/* Lobby Header */}
        <div className="bg-[#161920] border-2 border-[#D4AF37] rounded-md p-6 shadow-2xl space-y-4 bevel-container">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <Swords className="w-7 h-7 text-[#D4AF37]" />
                <h1 className="font-gothic font-bold text-2xl text-[#ECEFF4] tracking-wide">
                  TACTICAL MATCH DESIGNER & CRUSADE LOBBY
                </h1>
              </div>
              <p className="text-xs text-[#8E95A5] pt-1">
                Configure scenario parameters, field strength, multiplayer participants (2 to 4 Players), and battle conditions before taking to the field.
              </p>
            </div>

            <button
              onClick={handleStartCombat}
              className="flex items-center space-x-2 px-6 py-3.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded text-sm shadow-xl shadow-[#D4AF37]/30 transition-all flex-shrink-0"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Commence Tabletop Combat</span>
            </button>
          </div>
        </div>

        {/* 1. Scenario Selection & Tactical Briefing */}
        <div className="bg-[#161920] border border-[#323846] rounded-md p-6 space-y-4 bevel-container">
          <div className="flex items-center space-x-2 border-b border-[#323846] pb-3">
            <Compass className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="font-gothic font-bold text-lg text-[#ECEFF4]">
              1. OFFICIAL SCENARIO BRIEFING & TACTICAL MAP
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Scenario Picker */}
            <div className="space-y-3">
              <label className="text-[11px] uppercase font-bold text-[#8E95A5] block">
                Select Scenario (12 Official Scenarios):
              </label>
              <select
                value={selectedScenarioId}
                onChange={(e) => setSelectedScenarioId(e.target.value)}
                className="w-full bg-[#0C0E12] border-2 border-[#D4AF37] rounded p-2.5 text-xs text-[#ECEFF4] focus:outline-none"
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Map Preview */}
              {selectedScenario?.mapImage && (
                <div className="bg-[#0C0E12] border border-[#323846] rounded p-2 space-y-1 text-center">
                  <img
                    src={selectedScenario.mapImage}
                    alt={selectedScenario.name}
                    className="w-full h-48 object-contain rounded"
                  />
                  <span className="text-[10px] text-[#8E95A5] block">Official Deployment Diagram</span>
                </div>
              )}
            </div>

            {/* Scenario Details & Rules */}
            <div className="lg:col-span-2 space-y-4 bg-[#0C0E12] p-4 rounded border border-[#323846]">
              <div>
                <h3 className="font-gothic font-bold text-base text-[#D4AF37]">{selectedScenario?.name}</h3>
                <p className="text-xs text-[#8E95A5] italic pt-0.5">{selectedScenario?.tagline || selectedScenario?.flavor}</p>
                
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#ECEFF4] pt-2 border-b border-[#323846] pb-2">
                  <span>Table: <strong>{selectedScenario?.tableSize || '48" x 48"'}</strong></span>
                  <span>•</span>
                  <span>Game Length: <strong>{selectedScenario?.gameLength || '4-5 Turns'}</strong></span>
                  <span>•</span>
                  <span>Deployment: <strong>{selectedScenario?.deployment || 'Standard'}</strong></span>
                </div>
              </div>

              {/* Victory Conditions */}
              <div className="space-y-1 text-xs">
                <span className="text-[10px] uppercase font-bold text-[#4E9A6E] block flex items-center space-x-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>Victory Conditions:</span>
                </span>
                <p className="text-[#ECEFF4] text-[11px] leading-relaxed whitespace-pre-line bg-[#161920] p-2.5 rounded border border-[#323846]/60">
                  {selectedScenario?.victoryConditions}
                </p>
              </div>

              {/* Glorious Deeds Preview */}
              {scenarioDeeds.length > 0 && (
                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#D4AF37] block flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Glorious Deeds Available ({scenarioDeeds.length}):</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {scenarioDeeds.map((deed, dIdx) => (
                      <div key={dIdx} className="p-2 bg-[#161920] rounded border border-[#323846] text-[10px]">
                        <strong className="text-[#D4AF37] block">{deed.title}</strong>
                        <span className="text-[#8E95A5]">{deed.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Multiplayer Match Integration (2 to 4 Players) */}
        <div className="bg-[#161920] border border-[#323846] rounded-md p-6 space-y-4 bevel-container">
          <div className="flex items-center justify-between border-b border-[#323846] pb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="font-gothic font-bold text-lg text-[#ECEFF4]">
                2. WARBAND INTEGRATION & SQUAD MUSTER (1 TO 4 PLAYERS)
              </h2>
            </div>
            <span className="text-xs text-[#8E95A5]">
              {matchWarbandIds.length} Warband{matchWarbandIds.length > 1 ? 's' : ''} Linked
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {matchWarbandIds.map((wbId, idx) => {
              const wb = warbands.find((w) => w.id === wbId);
              const depIds = deployedUnitIds[wbId] || wb?.units.map((u) => u.id) || [];
              const depCost = wb?.units.filter((u) => depIds.includes(u.id)).reduce((s, u) => s + u.totalCost, 0) || 0;

              return (
                <div key={wbId} className="p-4 bg-[#0C0E12] border-2 border-[#D4AF37] rounded-md space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#D4AF37]">
                      PLAYER {idx + 1} {idx === 0 ? '(YOU)' : ''}
                    </span>
                    {idx > 0 && (
                      <button
                        onClick={() => handleRemovePlayerWarband(wbId)}
                        className="text-[#8E95A5] hover:text-[#E53935] text-xs"
                        title="Remove Player"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div>
                    <h3 className="font-gothic font-bold text-base text-[#ECEFF4]">{wb?.name}</h3>
                    <span className="text-[10px] text-[#8E95A5] block">
                      Faction: {wb?.factionId}
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#161920] rounded border border-[#323846] text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#8E95A5]">Deployed Models:</span>
                      <strong className="text-[#ECEFF4]">{depIds.length} / {wb?.units.length}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8E95A5]">Deployed Rating:</span>
                      <strong className="text-[#D4AF37]">{depCost} D</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActivePlayerIndex(idx);
                      setIsSquadSelectOpen(true);
                    }}
                    className="w-full py-1.5 bg-[#20242E] hover:bg-[#323846] border border-[#323846] text-[#ECEFF4] text-xs font-bold uppercase rounded flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Select Squad ({depIds.length})</span>
                  </button>
                </div>
              );
            })}

            {/* Add Player Slot Button (up to 4) */}
            {matchWarbandIds.length < 4 && (
              <div className="p-4 bg-[#0C0E12]/50 border-2 border-dashed border-[#323846] rounded-md flex flex-col items-center justify-center space-y-2 text-center">
                <Users className="w-6 h-6 text-[#8E95A5]" />
                <span className="text-xs text-[#8E95A5] font-bold uppercase">
                  Add Opponent / Ally ({matchWarbandIds.length + 1} of 4)
                </span>
                
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddPlayerWarband(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                  className="bg-[#161920] border border-[#323846] text-xs text-[#D4AF37] rounded p-1.5 w-full focus:outline-none"
                >
                  <option value="" disabled>-- Link Warband --</option>
                  {warbands
                    .filter((w) => !matchWarbandIds.includes(w.id))
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.factionId})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 3. Match Parameters & Environmental Conditions */}
        <div className="bg-[#161920] border border-[#323846] rounded-md p-6 space-y-4 bevel-container">
          <div className="flex items-center space-x-2 border-b border-[#323846] pb-3">
            <Sliders className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="font-gothic font-bold text-lg text-[#ECEFF4]">
              3. TACTICAL RULES & ENVIRONMENTAL HAZARDS
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-[#8E95A5] block">
                Environmental Condition / Battlefield Hazard:
              </label>
              <select
                value={environmentalHazard}
                onChange={(e) => setEnvironmentalHazard(e.target.value)}
                className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="Standard (Clear)">Standard (Clear Weather)</option>
                <option value="Heavy Trench Fog">Heavy Trench Fog (Max 18" Ranged Sight)</option>
                <option value="Chlorine Gas Pockets">Chlorine Gas Pockets (Dangerous Terrain)</option>
                <option value="Mud-Choked Trenches">Mud-Choked Trenches (-1" Movement)</option>
                <option value="Volcanic Ashfall">Volcanic Brimstone Ashfall (Risky Dash)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-[#8E95A5] block">
                Deployment Rules:
              </label>
              <div className="p-2.5 bg-[#0C0E12] border border-[#323846] rounded text-[#8E95A5] text-[11px]">
                Infiltrators & Forward Positions deploy per official scenario diagram.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA Bar */}
        <div className="bg-[#0C0E12] border-2 border-[#D4AF37] rounded-md p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">
              READY TO ENTER THE TRENCHES?
            </h3>
            <p className="text-xs text-[#8E95A5]">
              Scenario: <strong>{selectedScenario?.name}</strong> • {deployedUnits.length} Models ({deployedCost} D)
            </p>
          </div>

          <div className="flex items-center space-x-3 flex-shrink-0">
            <button
              onClick={() => setIsCardConsoleOpen(true)}
              className="flex items-center space-x-2 px-5 py-3.5 bg-[#8B0000] hover:bg-[#A30000] text-white font-bold uppercase rounded text-sm shadow-xl transition-all"
            >
              <Layers className="w-4 h-4 text-[#D4AF37]" />
              <span>🃏 CARD & BETRAYAL ENGINE</span>
            </button>

            <button
              onClick={handleStartCombat}
              className="flex items-center space-x-2 px-8 py-3.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded text-sm shadow-xl shadow-[#D4AF37]/30 transition-all"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>⚔️ ENTER TABLETOP COMBAT</span>
            </button>
          </div>
        </div>

        {/* SQUAD / ACTIVE DEPLOYMENT SELECTION MODAL */}
        {isSquadSelectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
            <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-lg rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              
              <div className="p-4 bg-[#20242E] border-b border-[#323846] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-gothic font-bold text-base text-white">
                    SQUAD SELECTION & FIELD STRENGTH
                  </h3>
                </div>
                <button
                  onClick={() => setIsSquadSelectOpen(false)}
                  className="text-[#8E95A5] hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                <div className="flex items-center justify-between bg-[#0C0E12] p-3 rounded border border-[#323846]">
                  <div>
                    <span className="text-[10px] text-[#8E95A5] block">DEPLOYED STRENGTH</span>
                    <strong className="text-[#D4AF37] text-sm">
                      {deployedUnits.length} / {viewingWarband.units.length} Models ({deployedCost} D)
                    </strong>
                  </div>
                  <button
                    onClick={handleSelectAllSquad}
                    className="px-3 py-1 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] rounded font-bold uppercase text-[10px] border border-[#323846]"
                  >
                    Deploy All
                  </button>
                </div>

                <div className="space-y-2">
                  {viewingWarband.units.map((unit) => {
                    const isDeployed = currentDeployedIds.includes(unit.id);
                    return (
                      <div
                        key={unit.id}
                        onClick={() => handleToggleDeployUnit(unit.id)}
                        className={`p-3 rounded border cursor-pointer flex items-center justify-between transition-all ${
                          isDeployed
                            ? 'bg-[#20242E] border-[#D4AF37]'
                            : 'bg-[#161920]/40 border-[#323846] opacity-60'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isDeployed}
                            onChange={() => {}}
                            className="rounded border-[#323846] text-[#D4AF37]"
                          />
                          <div>
                            <span className="font-gothic font-bold text-sm text-[#ECEFF4] block">
                              {unit.customName}
                            </span>
                            <span className="text-[10px] text-[#8E95A5]">
                              {unit.profileSnapshot.name} • {unit.profileSnapshot.category}
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-[#D4AF37]">{unit.totalCost} D</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-[#20242E] border-t border-[#323846] flex justify-end">
                <button
                  onClick={() => setIsSquadSelectOpen(false)}
                  className="px-4 py-1.5 bg-[#D4AF37] hover:bg-[#C49F27] text-black font-bold uppercase rounded text-xs"
                >
                  Confirm Deployment
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // VIEW B: ACTIVE TABLETOP COMBAT (DURING LIVE MATCH)
  // ----------------------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      
      {/* Top Tactical HUD (Sticky) */}
      <div className="bg-[#161920] border-2 border-[#D4AF37] rounded-md p-4 shadow-2xl sticky top-20 z-30 space-y-4 bevel-container">
        
        {/* Multi-Player / Warband Bar (if multiple players) */}
        {matchWarbandIds.length > 1 && (
          <div className="flex items-center justify-between border-b border-[#323846] pb-3 bg-[#0C0E12] -mx-4 -mt-4 p-3 rounded-t">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs font-mono font-bold uppercase text-[#ECEFF4]">
                Linked Match Room ({matchWarbandIds.length} Warbands):
              </span>
            </div>
            
            <div className="flex space-x-2 font-mono text-xs">
              {matchWarbandIds.map((id, idx) => {
                const wb = warbands.find((w) => w.id === id);
                const score = warbandScores[id]?.vp || 0;
                const isSelected = idx === activePlayerIndex;

                return (
                  <button
                    key={id}
                    onClick={() => setActivePlayerIndex(idx)}
                    className={`px-3 py-1 rounded font-bold uppercase flex items-center space-x-2 transition-all ${
                      isSelected
                        ? 'bg-[#D4AF37] text-black shadow'
                        : 'bg-[#20242E] text-[#8E95A5] hover:text-white border border-[#323846]'
                    }`}
                  >
                    <span>{wb?.name || `Player ${idx + 1}`}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-[#ECEFF4]">
                      {score} VP
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Warband Identity & Turn info */}
          <div className="flex items-center space-x-4">
            <div className="bg-[#0C0E12] border-2 border-[#D4AF37] px-4 py-2 rounded text-center min-w-[90px]">
              <span className="text-[10px] font-mono text-[#8E95A5] uppercase tracking-widest block">ROUND</span>
              <span className="text-2xl font-mono font-bold text-[#D4AF37]">{playTurn}</span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-gothic font-bold text-xl text-[#ECEFF4]">{viewingWarband.name}</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#8B0000] text-white font-bold uppercase animate-pulse">
                  COMBAT ACTIVE
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono text-[#8E95A5]">
                <span>Deployed: {deployedUnits.length}/{viewingWarband.units.length} warriors</span>
                <span>•</span>
                <span className="text-[#D4AF37]">{deployedCost} Ducats</span>
              </div>
            </div>
          </div>

          {/* Center: Live Casualty & Blood Tracker */}
          <div className="flex items-center space-x-4 bg-[#0C0E12] px-4 py-2 rounded border border-[#323846] text-xs font-mono">
            <div className="text-center">
              <span className="text-[9px] text-[#8E95A5] block uppercase">Active</span>
              <span className="text-sm font-bold text-[#4E9A6E]">{activeCount}</span>
            </div>
            <div className="h-6 w-[1px] bg-[#323846]" />
            <div className="text-center">
              <span className="text-[9px] text-[#8E95A5] block uppercase">Downed</span>
              <span className="text-sm font-bold text-[#FFB300]">{downedCount}</span>
            </div>
            <div className="h-6 w-[1px] bg-[#323846]" />
            <div className="text-center">
              <span className="text-[9px] text-[#8E95A5] block uppercase">Casualties</span>
              <span className="text-sm font-bold text-[#E53935]">{ooaCount}</span>
            </div>
            <div className="h-6 w-[1px] bg-[#323846]" />
            <div className="text-center">
              <span className="text-[9px] text-[#8E95A5] block uppercase">Blood Pool</span>
              <span className="text-sm font-bold text-[#E53935] flex items-center justify-center space-x-0.5">
                <Droplet className="w-3 h-3 fill-[#E53935]" />
                <span>{totalBlood}</span>
              </span>
            </div>
          </div>

          {/* Right: Actions Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsSquadSelectOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] rounded font-mono text-xs font-bold uppercase transition-colors"
              title="Select which warriors are deployed in this match"
            >
              <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Squad ({deployedUnits.length})</span>
            </button>

            <button
              onClick={() => setIsCardConsoleOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#8B0000] hover:bg-[#A30000] text-white border border-[#D4AF37]/50 rounded font-mono text-xs font-bold uppercase transition-colors"
              title="All Out War 52-card deck, Betrayal hands, and 3-minute alliance console"
            >
              <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Cards & Alliances</span>
            </button>

            <button
              onClick={() => setIsQuickSearchOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#20242E] hover:bg-[#323846] text-[#D4AF37] border border-[#D4AF37]/50 rounded font-mono text-xs font-bold uppercase transition-colors"
              title="Lookup rules and keywords"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Rules</span>
            </button>

            <button
              onClick={handleNextTurnWithWhistle}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] rounded font-mono text-xs font-bold uppercase transition-colors"
              title="Advance to next turn (Sounds Trench Command Whistle)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Next Turn</span>
            </button>

            <button
              onClick={() => setIsPostBattleOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#8B0000] hover:bg-[#A30000] text-white rounded font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-[#8B0000]/40"
            >
              <Skull className="w-4 h-4" />
              <span>End Match</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsAbortConfirmOpen(true)}
              className="p-2 text-[#8E95A5] hover:text-[#FF4D6D] bg-[#0C0E12] hover:bg-[#20242E] border border-[#323846] rounded transition-colors"
              title="Cancel / Abort Match"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 border-t border-[#323846] pt-3 overflow-x-auto">
          {['All', 'Active', 'Downed', 'Out of Action'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded text-xs font-mono uppercase font-bold transition-all whitespace-nowrap ${
                filterStatus === st
                  ? 'bg-[#D4AF37] text-black shadow'
                  : 'bg-[#0C0E12] text-[#8E95A5] hover:text-[#ECEFF4] border border-[#323846]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

      </div>

      {/* INTERACTIVE MISSION SCORING & GLORIOUS DEEDS CHECKLIST PANEL */}
      <div className="bg-[#161920] border-2 border-[#323846] rounded-md overflow-hidden shadow-xl bevel-container">
        
        {/* Panel Header */}
        <div 
          className="p-4 bg-[#20242E] border-b border-[#323846] flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
          onClick={() => setIsObjectivesPanelOpen(!isObjectivesPanelOpen)}
        >
          <div className="flex items-center space-x-3">
            <Compass className="w-5 h-5 text-[#D4AF37]" />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-gothic font-bold text-base text-[#ECEFF4]">
                  SCENARIO OBJECTIVES & GLORIOUS DEEDS TRACKER
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0C0E12] text-[#D4AF37] border border-[#323846] font-bold">
                  {selectedScenario?.name}
                </span>
              </div>
              <p className="text-xs font-mono text-[#8E95A5]">
                Progressive victory points tally and warrior glorious feat checklist
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 font-mono text-xs">
            {/* Live VP Meter */}
            <div className="flex items-center space-x-2 bg-[#0C0E12] px-3 py-1.5 rounded border border-[#323846]" onClick={(e) => e.stopPropagation()}>
              <span className="text-[#8E95A5] uppercase font-bold text-[11px]">Victory Points:</span>
              <button
                onClick={() => handleAdjustVp(-1)}
                className="w-6 h-6 rounded bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] flex items-center justify-center font-bold"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-sm font-bold text-[#D4AF37] px-1">{currentScoreObj.vp} VP</span>
              <button
                onClick={() => handleAdjustVp(1)}
                className="w-6 h-6 rounded bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] flex items-center justify-center font-bold"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <button className="text-[#8E95A5] hover:text-white">
              {isObjectivesPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Panel Body */}
        {isObjectivesPanelOpen && (
          <div className="p-5 bg-[#0C0E12] space-y-4 font-mono text-xs animate-fade-in">
            
            {/* Scenario Selector & Victory Rules */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Scenario Picker */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-[#8E95A5] block">
                  Active Scenario:
                </label>
                <select
                  value={selectedScenarioId}
                  onChange={(e) => setSelectedScenarioId(e.target.value)}
                  className="w-full bg-[#161920] border border-[#323846] rounded p-2 text-xs text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
                >
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {selectedScenario?.tagline && (
                  <p className="text-[11px] text-[#8E95A5] italic pt-1">{selectedScenario.tagline}</p>
                )}
              </div>

              {/* Victory Conditions Rules */}
              <div className="md:col-span-2 p-3 bg-[#161920] border border-[#323846] rounded space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#4E9A6E] flex items-center space-x-1.5">
                  <Award className="w-3.5 h-3.5" />
                  <span>Victory Conditions & Scoring Rules:</span>
                </span>
                <p className="text-[11px] text-[#ECEFF4] leading-relaxed whitespace-pre-line">
                  {selectedScenario?.victoryConditions}
                </p>
              </div>

            </div>

            {/* Glorious Deeds Checklist */}
            <div className="space-y-2 pt-2 border-t border-[#323846]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#D4AF37] flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Glorious Deeds Checklist (Attach Performing Warrior):</span>
                </span>
                <span className="text-[10px] text-[#8E95A5]">
                  {Object.keys(currentScoreObj.completedDeeds).length} Deeds Claimed
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {scenarioDeeds.map((deed, idx) => {
                  const isChecked = !!currentScoreObj.completedDeeds[deed.title];
                  const performer = currentScoreObj.completedDeeds[deed.title] || '';

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded border transition-all space-y-2 ${
                        isChecked
                          ? 'bg-[#161920] border-[#D4AF37] ring-1 ring-[#D4AF37]/30'
                          : 'bg-[#161920]/60 border-[#323846]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <label className="flex items-start space-x-2.5 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleDeed(deed.title, deployedUnits[0]?.customName || 'Squad')}
                            className="mt-0.5 rounded border-[#323846] text-[#D4AF37] focus:ring-0"
                          />
                          <div>
                            <strong className={`block text-xs ${isChecked ? 'text-[#D4AF37]' : 'text-[#ECEFF4]'}`}>
                              {deed.title}
                            </strong>
                            <p className="text-[11px] text-[#8E95A5] leading-relaxed pt-0.5">
                              {deed.desc}
                            </p>
                          </div>
                        </label>
                      </div>

                      {/* Attaching warrior performer */}
                      {isChecked && (
                        <div className="pt-2 border-t border-[#323846]/60 flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-[#8E95A5]">Achieved by:</span>
                          <select
                            value={performer}
                            onChange={(e) => handleToggleDeed(deed.title, e.target.value)}
                            className="bg-[#0C0E12] border border-[#323846] rounded px-2 py-1 text-xs text-[#D4AF37] focus:outline-none focus:border-[#D4AF37]"
                          >
                            <option value="Squad">Entire Warband</option>
                            {deployedUnits.map((u) => (
                              <option key={u.id} value={u.customName}>
                                {u.customName} ({u.profileSnapshot.name})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Combat Dice Engine */}
      <DiceRoller />

      {/* Tactical Unit Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUnits.map((unit) => {
          const isDowned = unit.status === 'Downed';
          const isOOA = unit.status === 'Out of Action';
          const hasActed = unit.hasActedThisTurn;

          return (
            <div
              key={unit.id}
              className={`rounded-md border-2 transition-all p-4 space-y-4 shadow-xl flex flex-col justify-between bevel-container ${
                isOOA
                  ? 'bg-[#161920]/40 border-[#323846] opacity-60 grayscale'
                  : isDowned
                  ? 'bg-[#161920] border-[#FFB300]/80 ring-1 ring-[#FFB300]/50'
                  : hasActed
                  ? 'bg-[#161920] border-[#323846] opacity-80'
                  : 'bg-[#161920] border-[#D4AF37]/50 shadow-black/80'
              }`}
            >
              
              {/* Unit Header & Activation */}
              <div className="flex items-start justify-between border-b border-[#323846] pb-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                        unit.profileSnapshot.category === 'Leader'
                          ? 'bg-[#D4AF37] text-black'
                          : 'bg-[#20242E] text-[#ECEFF4]'
                      }`}
                    >
                      {unit.profileSnapshot.category}
                    </span>
                    <h3 className="font-gothic font-bold text-base text-[#ECEFF4]">{unit.customName}</h3>
                  </div>
                  <span className="text-xs font-mono text-[#8E95A5] block">
                    Base: {unit.profileSnapshot.name}
                  </span>
                </div>

                <button
                  onClick={() => toggleUnitActed(viewingWarband.id, unit.id)}
                  className={`px-3 py-1.5 rounded font-mono text-xs font-bold uppercase transition-all flex items-center space-x-1 ${
                    hasActed
                      ? 'bg-[#20242E] text-[#8E95A5] border border-[#323846]'
                      : 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20 font-extrabold'
                  }`}
                  title={hasActed ? 'Reset Activation' : 'Mark as Activated'}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{hasActed ? 'Acted' : 'Activate'}</span>
                </button>
              </div>

              {/* Statline Matrix */}
              <div className="grid grid-cols-4 gap-1 p-2 bg-[#0C0E12] border border-[#323846] rounded text-center font-mono text-xs">
                <div>
                  <span className="text-[9px] text-[#8E95A5] uppercase block">MOV</span>
                  <strong className="text-[#ECEFF4]">{unit.profileSnapshot.stats.movement}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-[#8E95A5] uppercase block">RNG</span>
                  <strong className="text-[#ECEFF4]">{unit.profileSnapshot.stats.ranged}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-[#8E95A5] uppercase block">MEL</span>
                  <strong className="text-[#ECEFF4]">{unit.profileSnapshot.stats.melee}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-[#8E95A5] uppercase block">ARM</span>
                  <strong className="text-[#ECEFF4]">{unit.profileSnapshot.stats.armour}</strong>
                </div>
              </div>

              {/* Interactive Wounds & Blood Marker Trackers */}
              <div className="space-y-3 font-mono text-xs bg-[#20242E]/60 p-3 rounded border border-[#323846]/60">
                
                {/* Wounds / HP Counter */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-[#ECEFF4]">
                    <Heart className="w-4 h-4 text-[#E53935]" />
                    <span className="font-bold">WOUNDS:</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateUnitWounds(viewingWarband.id, unit.id, unit.currentWounds - 1)}
                      className="w-6 h-6 rounded bg-[#161920] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <span className="font-bold text-sm text-[#ECEFF4] min-w-[20px] text-center">
                      {unit.currentWounds} / {unit.maxWounds}
                    </span>
                    <button
                      onClick={() => updateUnitWounds(viewingWarband.id, unit.id, unit.currentWounds + 1)}
                      className="w-6 h-6 rounded bg-[#161920] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Blood Markers (Sacrificial / Lethal currency) */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-[#ECEFF4]">
                    <Droplet className="w-4 h-4 text-[#E53935] fill-[#E53935]" />
                    <span className="font-bold">BLOOD MARKERS:</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateUnitBloodMarkers(viewingWarband.id, unit.id, unit.bloodMarkers - 1)}
                      className="w-6 h-6 rounded bg-[#161920] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <span className="font-bold text-sm text-[#E53935] min-w-[20px] text-center">
                      {unit.bloodMarkers}
                    </span>
                    <button
                      onClick={() => updateUnitBloodMarkers(viewingWarband.id, unit.id, unit.bloodMarkers + 1)}
                      className="w-6 h-6 rounded bg-[#161920] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

              </div>

              {/* Status Quick Bar */}
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                {(['Active', 'Downed', 'Out of Action'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setUnitStatus(viewingWarband.id, unit.id, st)}
                    className={`py-1.5 rounded font-bold uppercase transition-all ${
                      unit.status === st
                        ? st === 'Active'
                          ? 'bg-[#4E9A6E] text-white shadow'
                          : st === 'Downed'
                          ? 'bg-[#FFB300] text-black shadow'
                          : 'bg-[#E53935] text-white shadow'
                        : 'bg-[#0C0E12] text-[#8E95A5] hover:text-white border border-[#323846]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Equipped Weapons List */}
              {unit.equippedWeapons.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-[#323846]">
                  <span className="text-[9px] font-mono uppercase text-[#8E95A5] block">Weapons:</span>
                  <div className="space-y-1">
                    {unit.equippedWeapons.map((wep) => (
                      <div
                        key={wep.instanceId}
                        className="p-1.5 bg-[#0C0E12] border border-[#323846] rounded flex items-center justify-between text-xs font-mono"
                      >
                        <span className="font-bold text-[#ECEFF4]">{wep.name}</span>
                        <div className="flex items-center space-x-2 text-[10px] text-[#D4AF37]">
                          <span>RNG: {wep.range}</span>
                          <span>MOD: {wep.modifiers}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tactical Actions Footer */}
              <div className="flex items-center space-x-2 pt-2 border-t border-[#323846]">
                <button
                  onClick={() => setAttackingUnit(unit)}
                  className="flex-1 py-1.5 bg-[#20242E] hover:bg-[#323846] border border-[#323846] rounded font-mono text-xs font-bold text-[#D4AF37] uppercase flex items-center justify-center space-x-1 transition-colors"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Attack</span>
                </button>
                <button
                  onClick={() => setRangingUnit(unit)}
                  className="flex-1 py-1.5 bg-[#20242E] hover:bg-[#323846] border border-[#323846] rounded font-mono text-xs font-bold text-[#8E95A5] hover:text-white uppercase flex items-center justify-center space-x-1 transition-colors"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>Range</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* SQUAD / ACTIVE DEPLOYMENT SELECTION MODAL */}
      {isSquadSelectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
          <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-lg rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="p-4 bg-[#20242E] border-b border-[#323846] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-gothic font-bold text-base text-white">
                  SQUAD SELECTION & FIELD STRENGTH
                </h3>
              </div>
              <button
                onClick={() => setIsSquadSelectOpen(false)}
                className="text-[#8E95A5] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between bg-[#0C0E12] p-3 rounded border border-[#323846]">
                <div>
                  <span className="text-[10px] text-[#8E95A5] block">DEPLOYED STRENGTH</span>
                  <strong className="text-[#D4AF37] text-sm">
                    {deployedUnits.length} / {viewingWarband.units.length} Models ({deployedCost} D)
                  </strong>
                </div>
                <button
                  onClick={handleSelectAllSquad}
                  className="px-3 py-1 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] rounded font-bold uppercase text-[10px] border border-[#323846]"
                >
                  Deploy All
                </button>
              </div>

              <div className="space-y-2">
                {viewingWarband.units.map((unit) => {
                  const isDeployed = currentDeployedIds.includes(unit.id);
                  return (
                    <div
                      key={unit.id}
                      onClick={() => handleToggleDeployUnit(unit.id)}
                      className={`p-3 rounded border cursor-pointer flex items-center justify-between transition-all ${
                        isDeployed
                          ? 'bg-[#20242E] border-[#D4AF37]'
                          : 'bg-[#161920]/40 border-[#323846] opacity-60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isDeployed}
                          onChange={() => {}}
                          className="rounded border-[#323846] text-[#D4AF37]"
                        />
                        <div>
                          <span className="font-gothic font-bold text-sm text-[#ECEFF4] block">
                            {unit.customName}
                          </span>
                          <span className="text-[10px] text-[#8E95A5]">
                            {unit.profileSnapshot.name} • {unit.profileSnapshot.category}
                          </span>
                        </div>
                      </div>
                      <span className="font-bold text-[#D4AF37]">{unit.totalCost} D</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-[#20242E] border-t border-[#323846] flex justify-end">
              <button
                onClick={() => setIsSquadSelectOpen(false)}
                className="px-4 py-1.5 bg-[#D4AF37] hover:bg-[#C49F27] text-black font-bold uppercase rounded text-xs"
              >
                Confirm Deployment
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Attack Calculator Modal */}
      {attackingUnit && (
        <AttackCalculatorModal
          attacker={attackingUnit}
          onClose={() => setAttackingUnit(null)}
        />
      )}

      {/* Range Calculator Modal */}
      {rangingUnit && (
        <RangeCalculatorModal
          unit={rangingUnit}
          onClose={() => setRangingUnit(null)}
        />
      )}

      {/* Quick Search Modal */}
      {isQuickSearchOpen && (
        <QuickSearchModal onClose={() => setIsQuickSearchOpen(false)} />
      )}

      {/* Post-Battle End Match Wizard */}
      {isPostBattleOpen && (
        <PostBattleWizardModal
          onClose={() => setIsPostBattleOpen(false)}
        />
      )}

      {/* Abort Match Confirmation Dialog */}
      <ConfirmModal
        isOpen={isAbortConfirmOpen}
        title="ABORT LIVE MATCH"
        message="Are you sure you want to cancel and exit this live combat session? All temporary in-game wound and blood markers will be discarded and the warband will return to its standard roster."
        confirmLabel="Abort Match"
        onConfirm={handleAbortMatch}
        onCancel={() => setIsAbortConfirmOpen(false)}
      />

      {/* All Out War 52-Card Deck, Betrayal & Alliance Console */}
      {isCardConsoleOpen && (
        <AllOutWarCardConsole
          warbands={matchWarbandIds.map((id) => warbands.find((w) => w.id === id)).filter(Boolean) as Warband[]}
          activeWarbandId={viewingWarband.id}
          round={playTurn}
          warbandScores={warbandScores}
          onAdjustVp={(wbId, delta) => {
            setWarbandScores((prev) => {
              const cur = prev[wbId] || { vp: 0, completedDeeds: {} };
              return {
                ...prev,
                [wbId]: {
                  ...cur,
                  vp: Math.max(0, cur.vp + delta)
                }
              };
            });
          }}
          onClose={() => setIsCardConsoleOpen(false)}
        />
      )}

    </div>
  );
};
