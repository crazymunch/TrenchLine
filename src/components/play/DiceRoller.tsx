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
  Zap 
} from 'lucide-react';

export const DiceRoller: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [diceHistory, setDiceHistory] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<{
    type: string;
    d1: number;
    d2?: number;
    total: number;
    label: string;
    isCrit?: boolean;
    isFumble?: boolean;
  } | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const handleToggleMute = () => {
    const next = soundEffects.toggleMute();
    setIsMuted(next);
  };

  const rollD6 = () => {
    setIsRolling(true);
    soundEffects.playDiceRoll();

    setTimeout(() => {
      const r = Math.floor(Math.random() * 6) + 1;
      const res = {
        type: 'D6',
        d1: r,
        total: r,
        label: `Rolled D6: [ ${r} ]`,
        isCrit: r === 6,
        isFumble: r === 1
      };
      setLastResult(res);
      setDiceHistory((prev) => [res.label, ...prev.slice(0, 7)]);
      setIsRolling(false);
    }, 200);
  };

  const roll2D6Action = () => {
    setIsRolling(true);
    soundEffects.playDiceRoll();

    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const sum = d1 + d2;
      const isCrit = d1 === 6 && d2 === 6;
      const isFumble = d1 === 1 && d2 === 1;

      if (isCrit) soundEffects.playCathedralBell();
      else if (isFumble) soundEffects.playGunfire();

      const label = `Action Test (2D6): [ ${d1} + ${d2} = ${sum} ] ${
        isCrit ? '— ⭐ CRITICAL!' : isFumble ? '— 💀 FUMBLE!' : sum >= 7 ? '— (PASS TN 7)' : '— (FAIL)'
      }`;

      const res = {
        type: '2D6 Action',
        d1,
        d2,
        total: sum,
        label,
        isCrit,
        isFumble
      };
      setLastResult(res);
      setDiceHistory((prev) => [res.label, ...prev.slice(0, 7)]);
      setIsRolling(false);
    }, 200);
  };

  const rollD66 = () => {
    setIsRolling(true);
    soundEffects.playDiceRoll();

    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const val = d1 * 10 + d2;
      const label = `D66 Roll: [ ${val} ] (Tens: ${d1}, Units: ${d2})`;

      const res = {
        type: 'D66 Table',
        d1,
        d2,
        total: val,
        label
      };
      setLastResult(res);
      setDiceHistory((prev) => [res.label, ...prev.slice(0, 7)]);
      setIsRolling(false);
    }, 200);
  };

  return (
    <div className="bg-[#161920] border-2 border-[#323846] rounded-md overflow-hidden shadow-xl bevel-container">
      
      {/* Header Bar */}
      <div
        className="px-4 py-3 bg-[#20242E] flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-2">
          <Dices className="w-5 h-5 text-[#D4AF37]" />
          <h3 className="font-gothic font-bold text-sm text-[#ECEFF4] uppercase tracking-wider">
            TACTICAL ACTION & DICE TRAY
          </h3>
          {lastResult && !isOpen && (
            <span className="hidden sm:inline-block text-xs font-mono px-2 py-0.5 rounded bg-[#0C0E12] text-[#D4AF37] border border-[#323846]">
              Last: {lastResult.label}
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

      {/* Expanded Dice Tray */}
      {isOpen && (
        <div className="p-4 space-y-4 bg-[#0C0E12] animate-fade-in">
          
          {/* Action Roll Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={rollD6}
              disabled={isRolling}
              className="py-2.5 px-4 bg-[#161920] hover:bg-[#20242E] text-[#ECEFF4] border border-[#323846] rounded font-mono text-xs font-bold uppercase transition-all flex items-center justify-center space-x-2 hover:border-[#D4AF37]/60 shadow"
            >
              <Dices className="w-4 h-4 text-[#D4AF37]" />
              <span>Roll 1D6</span>
            </button>

            <button
              onClick={roll2D6Action}
              disabled={isRolling}
              className="py-2.5 px-4 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-mono text-xs font-bold uppercase rounded transition-all flex items-center justify-center space-x-2 shadow-lg shadow-[#D4AF37]/20"
            >
              <Zap className="w-4 h-4" />
              <span>2D6 Action Test (TN 7)</span>
            </button>

            <button
              onClick={rollD66}
              disabled={isRolling}
              className="py-2.5 px-4 bg-[#161920] hover:bg-[#20242E] text-[#ECEFF4] border border-[#323846] rounded font-mono text-xs font-bold uppercase transition-all flex items-center justify-center space-x-2 hover:border-[#8B0000]/60 shadow"
            >
              <Skull className="w-4 h-4 text-[#E53935]" />
              <span>Roll D66 Chart</span>
            </button>
          </div>

          {/* Visual Dice Display Box */}
          {lastResult && (
            <div className="p-4 bg-[#161920] border border-[#323846] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                {/* Die 1 */}
                <div className={`w-12 h-12 rounded-lg bg-[#0C0E12] border-2 flex items-center justify-center text-xl font-mono font-bold shadow-inner ${
                  lastResult.isCrit ? 'border-[#D4AF37] text-[#D4AF37] shadow-glow' : lastResult.isFumble ? 'border-[#E53935] text-[#E53935]' : 'border-[#323846] text-[#ECEFF4]'
                }`}>
                  {lastResult.d1}
                </div>

                {/* Die 2 (if 2D6 or D66) */}
                {lastResult.d2 !== undefined && (
                  <div className={`w-12 h-12 rounded-lg bg-[#0C0E12] border-2 flex items-center justify-center text-xl font-mono font-bold shadow-inner ${
                    lastResult.isCrit ? 'border-[#D4AF37] text-[#D4AF37] shadow-glow' : lastResult.isFumble ? 'border-[#E53935] text-[#E53935]' : 'border-[#323846] text-[#ECEFF4]'
                  }`}>
                    {lastResult.d2}
                  </div>
                )}

                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase text-[#8E95A5] block">{lastResult.type}</span>
                  <div className="font-mono text-sm font-bold text-[#ECEFF4]">{lastResult.label}</div>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {lastResult.isCrit && (
                  <span className="px-3 py-1 bg-[#D4AF37] text-black font-mono text-xs font-bold uppercase rounded shadow">
                    CRITICAL STRIKE!
                  </span>
                )}
                {lastResult.isFumble && (
                  <span className="px-3 py-1 bg-[#8B0000] text-white font-mono text-xs font-bold uppercase rounded shadow">
                    FUMBLE / MISFIRE!
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Roll History Rollout */}
          {diceHistory.length > 0 && (
            <div className="space-y-1 border-t border-[#323846] pt-2">
              <span className="text-[9px] font-mono uppercase text-[#8E95A5] block">Roll History:</span>
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
