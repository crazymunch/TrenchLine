'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { DiceRoller } from './DiceRoller';
import { KeywordPopover } from './KeywordPopover';
import { PostBattleWizardModal } from '../campaign/PostBattleWizardModal';
import { AttackCalculatorModal } from './AttackCalculatorModal';
import { RangeCalculatorModal } from './RangeCalculatorModal';
import { QuickSearchModal } from './QuickSearchModal';
import { ActiveUnit } from '../../types/warband';
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
  Ruler
} from 'lucide-react';

export const PlayModeView: React.FC = () => {
  const { 
    getActiveWarband, 
    playTurn, 
    incrementTurn, 
    updateUnitWounds, 
    updateUnitBloodMarkers, 
    setUnitStatus, 
    toggleUnitActed,
    setActiveKeyword,
    keywords,
    isPostBattleOpen,
    setIsPostBattleOpen
  } = useStore();

  const warband = getActiveWarband();
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [attackingUnit, setAttackingUnit] = useState<ActiveUnit | null>(null);
  const [rangingUnit, setRangingUnit] = useState<ActiveUnit | null>(null);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);

  if (!warband) {
    return (
      <div className="p-8 text-center space-y-4 max-w-lg mx-auto">
        <Skull className="w-12 h-12 text-[#D4AF37] mx-auto opacity-75" />
        <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">NO WARBAND SELECTED</h3>
        <p className="text-xs font-mono text-[#8E95A5]">Select or build a warband in the roster builder to enter Play Mode.</p>
      </div>
    );
  }

  const activeCount = warband.units.filter((u) => u.status === 'Active').length;
  const downedCount = warband.units.filter((u) => u.status === 'Downed').length;
  const ooaCount = warband.units.filter((u) => u.status === 'Out of Action').length;
  const totalBlood = warband.units.reduce((sum, u) => sum + u.bloodMarkers, 0);

  const filteredUnits = warband.units.filter((u) => {
    if (filterStatus === 'All') return true;
    return u.status === filterStatus;
  });

  const handleKeywordTap = (kwName: string) => {
    const clean = kwName.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const found = keywords.find((k) => k.name.toLowerCase().includes(clean));
    if (found) {
      setActiveKeyword(found);
    }
  };

  const handleNextTurnWithWhistle = () => {
    soundEffects.playTrenchWhistle();
    incrementTurn();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      
      {/* Top Tactical HUD (Sticky) */}
      <div className="bg-[#161920] border-2 border-[#D4AF37] rounded-md p-4 shadow-2xl sticky top-20 z-30 space-y-4 bevel-container">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Warband Identity & Turn info */}
          <div className="flex items-center space-x-4">
            <div className="bg-[#0C0E12] border-2 border-[#D4AF37] px-4 py-2 rounded text-center min-w-[90px]">
              <span className="text-[10px] font-mono text-[#8E95A5] uppercase tracking-widest block">ROUND</span>
              <span className="text-2xl font-mono font-bold text-[#D4AF37]">{playTurn}</span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-gothic font-bold text-xl text-[#ECEFF4]">{warband.name}</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#8B0000] text-white font-bold uppercase animate-pulse">
                  COMBAT ACTIVE
                </span>
              </div>
              <p className="text-xs font-mono text-[#8E95A5]">Tactical Tabletop Companion Sheet</p>
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

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsQuickSearchOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#20242E] hover:bg-[#323846] text-[#D4AF37] border border-[#D4AF37]/50 rounded font-mono text-xs font-bold uppercase transition-colors"
              title="Lookup rules and keywords"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Rules Lookup</span>
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

      {/* Dice Roller Tool */}
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
                    <h3 className="font-gothic font-bold text-base text-[#ECEFF4] leading-tight">
                      {unit.customName}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-[#8E95A5] block">
                    {unit.profileSnapshot.name}
                  </span>
                </div>

                {/* Activation Pill Toggle */}
                {!isOOA && (
                  <button
                    onClick={() => toggleUnitActed(warband.id, unit.id)}
                    className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold uppercase flex items-center space-x-1 transition-all ${
                      hasActed
                        ? 'bg-[#20242E] text-[#8E95A5] border border-[#323846]'
                        : 'bg-[#4E9A6E] text-white shadow-md'
                    }`}
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>{hasActed ? 'ACTED' : 'READY'}</span>
                  </button>
                )}
              </div>

              {/* Combat Stat Block */}
              <div className="grid grid-cols-4 gap-1.5 font-mono text-center text-xs bg-[#0C0E12] p-2 rounded border border-[#323846]">
                <div>
                  <span className="text-[9px] text-[#8E95A5] block">MOV</span>
                  <span className="font-bold text-[#ECEFF4]">{unit.profileSnapshot.stats.movement}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#8E95A5] block">RNG</span>
                  <span className="font-bold text-[#ECEFF4]">{unit.profileSnapshot.stats.ranged}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#8E95A5] block">MELEE</span>
                  <span className="font-bold text-[#ECEFF4]">{unit.profileSnapshot.stats.melee}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#8E95A5] block">ARMOUR</span>
                  <span className="font-bold text-[#ECEFF4]">{unit.profileSnapshot.stats.armour}</span>
                </div>
              </div>

              {/* Large Tappable Wound & Blood Counters */}
              <div className="grid grid-cols-2 gap-3">
                
                {/* Wounds Stepper */}
                <div className="bg-[#0C0E12] p-2.5 rounded border border-[#323846] space-y-1 text-center">
                  <span className="text-[10px] font-mono text-[#8E95A5] uppercase flex items-center justify-center space-x-1">
                    <Heart className="w-3 h-3 text-[#E53935]" />
                    <span>Wounds</span>
                  </span>
                  <div className="flex items-center justify-center space-x-3">
                    <button
                      onClick={() => updateUnitWounds(warband.id, unit.id, -1)}
                      disabled={unit.currentWounds <= 0}
                      className="w-8 h-8 rounded bg-[#20242E] hover:bg-[#8B0000] text-white font-mono font-bold text-base disabled:opacity-30 transition-colors"
                    >
                      -
                    </button>
                    <span className="font-mono text-lg font-bold text-[#ECEFF4]">
                      {unit.currentWounds} <span className="text-xs text-[#8E95A5]">/ {unit.maxWounds}</span>
                    </span>
                    <button
                      onClick={() => updateUnitWounds(warband.id, unit.id, 1)}
                      disabled={unit.currentWounds >= unit.maxWounds}
                      className="w-8 h-8 rounded bg-[#20242E] hover:bg-[#4E9A6E] text-white font-mono font-bold text-base disabled:opacity-30 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Blood Markers Stepper */}
                <div className="bg-[#0C0E12] p-2.5 rounded border border-[#323846] space-y-1 text-center">
                  <span className="text-[10px] font-mono text-[#8E95A5] uppercase flex items-center justify-center space-x-1">
                    <Droplet className="w-3 h-3 text-[#E53935] fill-[#E53935]" />
                    <span>Blood Tokens</span>
                  </span>
                  <div className="flex items-center justify-center space-x-3">
                    <button
                      onClick={() => updateUnitBloodMarkers(warband.id, unit.id, -1)}
                      disabled={unit.bloodMarkers <= 0}
                      className="w-8 h-8 rounded bg-[#20242E] hover:bg-[#323846] text-white font-mono font-bold text-base disabled:opacity-30 transition-colors"
                    >
                      -
                    </button>
                    <span className={`font-mono text-lg font-bold ${unit.bloodMarkers > 0 ? 'text-[#E53935]' : 'text-[#8E95A5]'}`}>
                      {unit.bloodMarkers}
                    </span>
                    <button
                      onClick={() => updateUnitBloodMarkers(warband.id, unit.id, 1)}
                      className="w-8 h-8 rounded bg-[#20242E] hover:bg-[#8B0000] text-white font-mono font-bold text-base transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

              </div>

              {/* Status Chips */}
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px] font-bold uppercase">
                <button
                  onClick={() => setUnitStatus(warband.id, unit.id, 'Active')}
                  className={`py-1.5 rounded transition-all ${
                    unit.status === 'Active'
                      ? 'bg-[#4E9A6E] text-white shadow'
                      : 'bg-[#0C0E12] text-[#8E95A5] hover:text-white border border-[#323846]'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setUnitStatus(warband.id, unit.id, 'Downed')}
                  className={`py-1.5 rounded transition-all ${
                    unit.status === 'Downed'
                      ? 'bg-[#FFB300] text-black shadow font-extrabold'
                      : 'bg-[#0C0E12] text-[#8E95A5] hover:text-white border border-[#323846]'
                  }`}
                >
                  Downed
                </button>
                <button
                  onClick={() => setUnitStatus(warband.id, unit.id, 'Out of Action')}
                  className={`py-1.5 rounded transition-all ${
                    unit.status === 'Out of Action'
                      ? 'bg-[#8B0000] text-white shadow'
                      : 'bg-[#0C0E12] text-[#8E95A5] hover:text-white border border-[#323846]'
                  }`}
                >
                  O.O.A.
                </button>
              </div>

              {/* Weapons & Attacks Strip with Attack Calculator & Range Ruler Triggers */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#8E95A5] uppercase tracking-wider">
                    Armaments & Attacks:
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setRangingUnit(unit)}
                      className="text-[10px] font-mono text-[#4E9A6E] hover:text-[#5BAE7E] flex items-center space-x-1 font-bold"
                      title="Tactical Range & Charge Ruler"
                    >
                      <Ruler className="w-3 h-3" />
                      <span>Ruler</span>
                    </button>

                    {unit.equippedWeapons.length > 0 && !isOOA && (
                      <button
                        onClick={() => setAttackingUnit(unit)}
                        className="text-[10px] font-mono text-[#D4AF37] hover:text-[#E5C158] flex items-center space-x-1 font-bold"
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>Attack Calc</span>
                      </button>
                    )}
                  </div>
                </div>

                {unit.equippedWeapons.map((wep) => (
                  <div
                    key={wep.instanceId}
                    className="p-2 bg-[#0C0E12] rounded border border-[#323846] space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-[#ECEFF4]">{wep.name}</span>
                      <span className="text-[10px] text-[#D4AF37]">{wep.range}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#8E95A5]">
                      <span>Mod: <strong className="text-[#ECEFF4]">{wep.modifiers}</strong></span>
                      <span>Dmg: <strong className="text-[#ECEFF4]">{wep.damage}</strong></span>
                    </div>
                    {wep.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {wep.keywords.map((kw) => (
                          <button
                            key={kw}
                            onClick={() => handleKeywordTap(kw)}
                            className="text-[9px] font-mono bg-[#20242E] hover:bg-[#D4AF37] hover:text-black px-1.5 py-0.2 rounded text-[#D4AF37] border border-[#323846] transition-colors"
                          >
                            {kw}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </div>
          );
        })}
      </div>

      {/* Tooltip popover */}
      <KeywordPopover />

      {/* Quick Search Rules Modal */}
      {isQuickSearchOpen && (
        <QuickSearchModal onClose={() => setIsQuickSearchOpen(false)} />
      )}

      {/* Range & Charge Ruler Modal */}
      {rangingUnit && (
        <RangeCalculatorModal
          unit={rangingUnit}
          onClose={() => setRangingUnit(null)}
        />
      )}

      {/* Attack Calculator Modal */}
      {attackingUnit && (
        <AttackCalculatorModal
          attacker={attackingUnit}
          onClose={() => setAttackingUnit(null)}
        />
      )}

      {/* Post Battle Sequence Wizard */}
      {isPostBattleOpen && (
        <PostBattleWizardModal onClose={() => setIsPostBattleOpen(false)} />
      )}

    </div>
  );
};
