'use client';

import React, { useState } from 'react';
import { soundEffects } from '../../services/soundEffects';
import { 
  Dices, 
  Sparkles, 
  Skull, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Volume2, 
  VolumeX, 
  Zap,
  Shield,
  Flame,
  Crosshair,
  Sliders
} from 'lucide-react';

type DiceMode = 'action' | 'injury' | 'pool';

export const DiceRoller: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeMode, setActiveMode] = useState<DiceMode>('action');
  
  // Action Modifiers
  const [actionDiceModifier, setActionDiceModifier] = useState<number>(0); // -2, -1, 0, +1, +2
  const [isRiskyAction, setIsRiskyAction] = useState<boolean>(false);
  
  // Injury Modifiers
  const [injuryDiceCount, setInjuryDiceCount] = useState<number>(2); // 1 to 4
  const [injuryFlatModifier, setInjuryFlatModifier] = useState<number>(0); // -3 to +3 (armor vs blood/ap)
  
  // Multi-D6 Pool
  const [customPoolCount, setCustomPoolCount] = useState<number>(4);

  const [diceHistory, setDiceHistory] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<{
    type: string;
    rawDice: number[];
    keptDice: number[];
    discardedDice: number[];
    modifier: number;
    finalTotal: number;
    label: string;
    verdict: string;
    verdictColor: string;
    isCrit?: boolean;
    isFumble?: boolean;
  } | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const handleToggleMute = () => {
    const next = soundEffects.toggleMute();
    setIsMuted(next);
  };

  // 1. Roll Action / Success Test (2D6 base with +/- Dice modifiers)
  const rollActionTest = () => {
    setIsRolling(true);
    soundEffects.playDiceRoll();

    setTimeout(() => {
      // Total dice to roll = 2 + Math.abs(actionDiceModifier)
      const numDiceToRoll = 2 + Math.abs(actionDiceModifier);
      const rawDice: number[] = [];
      for (let i = 0; i < numDiceToRoll; i++) {
        rawDice.push(Math.floor(Math.random() * 6) + 1);
      }

      // Sort dice
      const sorted = [...rawDice].sort((a, b) => b - a); // Descending

      let keptDice: number[] = [];
      let discardedDice: number[] = [];

      if (actionDiceModifier >= 0) {
        // Keep 2 highest
        keptDice = sorted.slice(0, 2);
        discardedDice = sorted.slice(2);
      } else {
        // Keep 2 lowest
        keptDice = sorted.slice(sorted.length - 2);
        discardedDice = sorted.slice(0, sorted.length - 2);
      }

      const sum = keptDice.reduce((a, b) => a + b, 0);
      const isCrit = keptDice[0] === 6 && keptDice[1] === 6;
      const isFumble = keptDice[0] === 1 && keptDice[1] === 1;

      let verdict = '';
      let verdictColor = 'text-[#ECEFF4]';

      if (isCrit) {
        verdict = '⭐ CRITICAL SUCCESS!';
        verdictColor = 'text-[#D4AF37]';
        soundEffects.playCathedralBell();
      } else if (isFumble) {
        verdict = '💀 FUMBLE / DISASTER!';
        verdictColor = 'text-[#E53935]';
        soundEffects.playGunfire();
      } else if (sum >= 7) {
        verdict = '✅ SUCCESS (Passed TN 7)';
        verdictColor = 'text-[#4E9A6E]';
      } else {
        verdict = isRiskyAction ? '❌ FAILED (Activation Ends Immediately)' : '❌ FAILED (Missed TN 7)';
        verdictColor = 'text-[#E53935]';
      }

      const modStr = actionDiceModifier > 0 ? `+${actionDiceModifier} DICE` : actionDiceModifier < 0 ? `${actionDiceModifier} DICE` : 'Standard';
      const label = `Action Roll (${modStr}): [${keptDice.join(' + ')} = ${sum}] — ${verdict}`;

      const res = {
        type: `Action Success Roll (${modStr})`,
        rawDice,
        keptDice,
        discardedDice,
        modifier: 0,
        finalTotal: sum,
        label,
        verdict,
        verdictColor,
        isCrit,
        isFumble
      };

      setLastResult(res);
      setDiceHistory((prev) => [label, ...prev.slice(0, 7)]);
      setIsRolling(false);
    }, 200);
  };

  // 2. Roll Injury / Bloodbath Multi-D6
  const rollInjuryTest = () => {
    setIsRolling(true);
    soundEffects.playDiceRoll();

    setTimeout(() => {
      const rawDice: number[] = [];
      for (let i = 0; i < injuryDiceCount; i++) {
        rawDice.push(Math.floor(Math.random() * 6) + 1);
      }

      // Injury roll in Trench Crusade takes the HIGHEST single die (or sum depending on scenario/heavy) + modifiers
      const sorted = [...rawDice].sort((a, b) => b - a);
      const bestDie = sorted[0];
      const discardedDice = sorted.slice(1);
      const finalTotal = bestDie + injuryFlatModifier;

      let verdict = '';
      let verdictColor = 'text-[#ECEFF4]';

      if (finalTotal >= 9) {
        verdict = '💀 OUT OF ACTION! (Fatal/Incapacitated)';
        verdictColor = 'text-[#E53935]';
        soundEffects.playGunfire();
      } else if (finalTotal >= 7) {
        verdict = '🩸 SERIOUS INJURY (+1 Blood Marker)';
        verdictColor = 'text-[#FF6B6B]';
      } else if (finalTotal >= 4) {
        verdict = '⚠️ DOWNED (Knocked Off Feet)';
        verdictColor = 'text-[#FFB300]';
      } else {
        verdict = '🛡️ FLESH WOUND / DEFLECTED BY ARMOUR';
        verdictColor = 'text-[#4E9A6E]';
      }

      const modStr = injuryFlatModifier > 0 ? `+${injuryFlatModifier}` : injuryFlatModifier < 0 ? `${injuryFlatModifier}` : '';
      const label = `Injury Roll (${injuryDiceCount}D6 ${modStr}): Best Die [${bestDie}] ${modStr} = ${finalTotal} — ${verdict}`;

      const res = {
        type: `Injury Test (${injuryDiceCount}D6 ${modStr})`,
        rawDice,
        keptDice: [bestDie],
        discardedDice,
        modifier: injuryFlatModifier,
        finalTotal,
        label,
        verdict,
        verdictColor
      };

      setLastResult(res);
      setDiceHistory((prev) => [label, ...prev.slice(0, 7)]);
      setIsRolling(false);
    }, 200);
  };

  // 3. Roll Multi-D6 Pool
  const rollCustomPool = () => {
    setIsRolling(true);
    soundEffects.playDiceRoll();

    setTimeout(() => {
      const rawDice: number[] = [];
      for (let i = 0; i < customPoolCount; i++) {
        rawDice.push(Math.floor(Math.random() * 6) + 1);
      }

      const sixes = rawDice.filter((d) => d === 6).length;
      const ones = rawDice.filter((d) => d === 1).length;
      const sum = rawDice.reduce((a, b) => a + b, 0);

      const verdict = `${sixes} Sixes (Crits) • ${ones} Ones (Fumbles) • Sum: ${sum}`;
      const label = `Pool (${customPoolCount}D6): [${rawDice.join(', ')}] — ${verdict}`;

      const res = {
        type: `Dice Pool (${customPoolCount}D6)`,
        rawDice,
        keptDice: rawDice,
        discardedDice: [],
        modifier: 0,
        finalTotal: sum,
        label,
        verdict,
        verdictColor: 'text-[#D4AF37]'
      };

      setLastResult(res);
      setDiceHistory((prev) => [label, ...prev.slice(0, 7)]);
      setIsRolling(false);
    }, 200);
  };

  return (
    <div className="bg-[#161920] border-2 border-[#323846] rounded-md overflow-hidden shadow-xl bevel-container">
      
      {/* Header Bar */}
      <div
        className="px-4 py-3 bg-[#20242E] flex items-center justify-between cursor-pointer select-none border-b border-[#323846]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-2">
          <Dices className="w-5 h-5 text-[#D4AF37]" />
          <h3 className="font-gothic font-bold text-sm text-[#ECEFF4] uppercase tracking-wider">
            TABLETOP COMBAT DICE ENGINE
          </h3>
          {lastResult && !isOpen && (
            <span className="hidden sm:inline-block text-xs font-mono px-2 py-0.5 rounded bg-[#0C0E12] text-[#D4AF37] border border-[#323846] truncate max-w-xs">
              {lastResult.label}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleMute();
            }}
            className="p-1 text-[#8E95A5] hover:text-[#D4AF37] rounded"
            title={isMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-[#E53935]" /> : <Volume2 className="w-4 h-4 text-[#4E9A6E]" />}
          </button>

          <button className="text-[#8E95A5] hover:text-white">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Combat Dice Console */}
      {isOpen && (
        <div className="p-4 space-y-4 bg-[#0C0E12] animate-fade-in font-mono text-xs">
          
          {/* Mode Tabs */}
          <div className="flex items-center space-x-2 border-b border-[#323846] pb-3">
            {[
              { id: 'action', label: 'Action & Success Test (2D6)', icon: <Zap className="w-3.5 h-3.5" /> },
              { id: 'injury', label: 'Injury & Bloodbath (Multi-D6)', icon: <Skull className="w-3.5 h-3.5" /> },
              { id: 'pool', label: 'Custom Dice Pool', icon: <Dices className="w-3.5 h-3.5" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMode(tab.id as DiceMode)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded uppercase font-bold transition-all ${
                  activeMode === tab.id
                    ? 'bg-[#D4AF37] text-black shadow'
                    : 'bg-[#161920] text-[#8E95A5] hover:text-white border border-[#323846]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* MODE 1: ACTION / SUCCESS TEST */}
          {activeMode === 'action' && (
            <div className="space-y-3 p-3 bg-[#161920] border border-[#323846] rounded-md">
              <div className="flex flex-wrap items-center justify-between gap-3">
                
                {/* Dice Modifiers Selector */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-[#8E95A5] uppercase font-bold text-[11px]">Dice Modifier:</span>
                  {[-2, -1, 0, 1, 2].map((mod) => (
                    <button
                      key={mod}
                      onClick={() => setActionDiceModifier(mod)}
                      className={`px-2.5 py-1 rounded font-bold transition-all ${
                        actionDiceModifier === mod
                          ? 'bg-[#D4AF37] text-black font-extrabold shadow'
                          : 'bg-[#20242E] text-[#8E95A5] hover:text-white border border-[#323846]'
                      }`}
                    >
                      {mod > 0 ? `+${mod} DICE` : mod < 0 ? `${mod} DICE` : 'Standard'}
                    </button>
                  ))}
                </div>

                {/* Risky Action Toggle */}
                <label className="flex items-center space-x-2 cursor-pointer bg-[#20242E] px-3 py-1 rounded border border-[#323846]">
                  <input
                    type="checkbox"
                    checked={isRiskyAction}
                    onChange={(e) => setIsRiskyAction(e.target.checked)}
                    className="rounded border-[#323846] text-[#D4AF37] focus:ring-0"
                  />
                  <span className={`font-bold uppercase text-[11px] ${isRiskyAction ? 'text-[#FF6B6B]' : 'text-[#8E95A5]'}`}>
                    Risky Action
                  </span>
                </label>

              </div>

              {/* Roll Trigger Button */}
              <button
                onClick={rollActionTest}
                disabled={isRolling}
                className="w-full py-3 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded flex items-center justify-center space-x-2 shadow-lg shadow-[#D4AF37]/20 text-xs tracking-wider"
              >
                <Zap className="w-4 h-4" />
                <span>
                  Roll Action Test ({actionDiceModifier > 0 ? `+${actionDiceModifier} DICE (Roll ${2 + actionDiceModifier} keep 2 high)` : actionDiceModifier < 0 ? `${actionDiceModifier} DICE (Roll ${2 - actionDiceModifier} keep 2 low)` : '2D6 Standard'})
                </span>
              </button>
            </div>
          )}

          {/* MODE 2: INJURY & BLOODBATH */}
          {activeMode === 'injury' && (
            <div className="space-y-3 p-3 bg-[#161920] border border-[#323846] rounded-md">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Dice Count */}
                <div className="space-y-1.5">
                  <span className="text-[#8E95A5] uppercase font-bold text-[11px] block">
                    Injury Dice Pool:
                  </span>
                  <div className="flex space-x-1.5">
                    {[
                      { count: 1, label: '1D6 (Light)' },
                      { count: 2, label: '2D6 (Standard)' },
                      { count: 3, label: '3D6 (Bloodbath / +1 Inj)' },
                      { count: 4, label: '4D6 (+2 Inj)' }
                    ].map((btn) => (
                      <button
                        key={btn.count}
                        onClick={() => setInjuryDiceCount(btn.count)}
                        className={`flex-1 py-1.5 rounded font-bold uppercase text-[10px] transition-all ${
                          injuryDiceCount === btn.count
                            ? 'bg-[#B22222] text-white font-extrabold shadow'
                            : 'bg-[#20242E] text-[#8E95A5] hover:text-white border border-[#323846]'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Flat Modifiers (Armour vs Blood/AP) */}
                <div className="space-y-1.5">
                  <span className="text-[#8E95A5] uppercase font-bold text-[11px] block">
                    Injury Modifier (Armour / Blood / AP):
                  </span>
                  <div className="flex space-x-1">
                    {[-3, -2, -1, 0, 1, 2, 3].map((mod) => (
                      <button
                        key={mod}
                        onClick={() => setInjuryFlatModifier(mod)}
                        className={`flex-1 py-1.5 rounded font-bold text-xs transition-all ${
                          injuryFlatModifier === mod
                            ? 'bg-[#D4AF37] text-black font-extrabold shadow'
                            : 'bg-[#20242E] text-[#8E95A5] hover:text-white border border-[#323846]'
                        }`}
                      >
                        {mod > 0 ? `+${mod}` : mod}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Roll Trigger Button */}
              <button
                onClick={rollInjuryTest}
                disabled={isRolling}
                className="w-full py-3 bg-[#B22222] hover:bg-[#A30000] text-white font-bold uppercase rounded flex items-center justify-center space-x-2 shadow-lg shadow-[#B22222]/30 text-xs tracking-wider"
              >
                <Skull className="w-4 h-4" />
                <span>
                  Roll Injury Table ({injuryDiceCount}D6 {injuryFlatModifier > 0 ? `+${injuryFlatModifier}` : injuryFlatModifier < 0 ? `${injuryFlatModifier}` : ''})
                </span>
              </button>
            </div>
          )}

          {/* MODE 3: CUSTOM MULTI-D6 POOL */}
          {activeMode === 'pool' && (
            <div className="space-y-3 p-3 bg-[#161920] border border-[#323846] rounded-md">
              <div className="flex items-center space-x-3">
                <span className="text-[#8E95A5] uppercase font-bold text-[11px]">Number of D6s:</span>
                {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                  <button
                    key={num}
                    onClick={() => setCustomPoolCount(num)}
                    className={`px-3 py-1 rounded font-bold transition-all ${
                      customPoolCount === num
                        ? 'bg-[#D4AF37] text-black font-extrabold shadow'
                        : 'bg-[#20242E] text-[#8E95A5] hover:text-white border border-[#323846]'
                    }`}
                  >
                    {num}D6
                  </button>
                ))}
              </div>

              <button
                onClick={rollCustomPool}
                disabled={isRolling}
                className="w-full py-3 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded flex items-center justify-center space-x-2 shadow-lg text-xs"
              >
                <Dices className="w-4 h-4" />
                <span>Roll {customPoolCount} D6 Pool</span>
              </button>
            </div>
          )}

          {/* Visual Interactive Result Box */}
          {lastResult && (
            <div className="p-4 bg-[#161920] border-2 border-[#D4AF37]/60 rounded-md flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
              
              <div className="space-y-2">
                <span className="text-[10px] text-[#8E95A5] uppercase font-bold block">
                  {lastResult.type}
                </span>

                {/* Dice Avatars */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Kept Dice */}
                  {lastResult.keptDice.map((d, idx) => (
                    <div
                      key={`kept-${idx}`}
                      className="w-11 h-11 rounded bg-[#0C0E12] border-2 border-[#D4AF37] text-[#D4AF37] flex items-center justify-center font-mono font-bold text-lg shadow-lg ring-1 ring-[#D4AF37]/50"
                      title="Kept Die"
                    >
                      {d}
                    </div>
                  ))}

                  {/* Discarded Dice */}
                  {lastResult.discardedDice.map((d, idx) => (
                    <div
                      key={`disc-${idx}`}
                      className="w-11 h-11 rounded bg-[#0C0E12] border border-[#323846] text-[#555E70] line-through flex items-center justify-center font-mono font-bold text-lg opacity-40"
                      title="Discarded / Dropped Die"
                    >
                      {d}
                    </div>
                  ))}

                  {lastResult.modifier !== 0 && (
                    <div className="px-2.5 py-1 rounded bg-[#20242E] text-[#D4AF37] border border-[#323846] font-bold text-sm">
                      {lastResult.modifier > 0 ? `+${lastResult.modifier}` : lastResult.modifier} Mod
                    </div>
                  )}

                  <span className="text-sm font-bold text-[#ECEFF4] px-1">=</span>
                  <div className="px-3 py-1 rounded bg-[#D4AF37] text-black font-extrabold text-base shadow">
                    {lastResult.finalTotal}
                  </div>
                </div>
              </div>

              {/* Verdict Banner */}
              <div className="text-right">
                <span className="text-[10px] text-[#8E95A5] uppercase block">Result & Effect</span>
                <span className={`font-gothic font-bold text-sm sm:text-base ${lastResult.verdictColor} block`}>
                  {lastResult.verdict}
                </span>
              </div>

            </div>
          )}

          {/* Roll History Rollout */}
          {diceHistory.length > 0 && (
            <div className="space-y-1 border-t border-[#323846] pt-2">
              <span className="text-[9px] font-mono uppercase text-[#8E95A5] block">Recent Rolls:</span>
              <div className="flex flex-wrap gap-1.5">
                {diceHistory.map((item, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono bg-[#161920] px-2 py-0.5 rounded text-[#8E95A5] border border-[#323846]/60"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
