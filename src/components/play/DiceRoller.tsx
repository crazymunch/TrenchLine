'use client';

import React, { useState } from 'react';
import { Dices, Sparkles, Skull, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

export const DiceRoller: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [diceHistory, setDiceHistory] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const rollD6 = () => {
    const r = Math.floor(Math.random() * 6) + 1;
    const msg = `D6: [ ${r} ] ${r === 6 ? 'CRITICAL SUCCESS!' : r === 1 ? 'Fumble / Miss' : ''}`;
    setLastResult(msg);
    setDiceHistory((prev) => [msg, ...prev.slice(0, 5)]);
  };

  const roll2D6 = () => {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;
    const msg = `2D6 Action: [ ${d1} + ${d2} = ${total} ]`;
    setLastResult(msg);
    setDiceHistory((prev) => [msg, ...prev.slice(0, 5)]);
  };

  const rollD66 = () => {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const d66 = `${d1}${d2}`;
    const msg = `D66 Injury / Table Roll: [ ${d66} ]`;
    setLastResult(msg);
    setDiceHistory((prev) => [msg, ...prev.slice(0, 5)]);
  };

  return (
    <div className="bg-[#161920] border border-[#323846] rounded-md overflow-hidden shadow-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-[#20242E] flex items-center justify-between text-xs font-mono font-bold uppercase text-[#D4AF37] hover:bg-[#2A303D] transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Dices className="w-4 h-4" />
          <span>Trench Dice & Action Roller</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="p-4 space-y-4 bg-[#161920]">
          {/* Quick Roll Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={rollD6}
              className="py-2 px-3 bg-[#0C0E12] hover:bg-[#8B0000] text-[#ECEFF4] hover:text-white border border-[#323846] rounded font-mono text-xs font-bold transition-all shadow"
            >
              Roll 1D6
            </button>
            <button
              onClick={roll2D6}
              className="py-2 px-3 bg-[#0C0E12] hover:bg-[#8B0000] text-[#ECEFF4] hover:text-white border border-[#323846] rounded font-mono text-xs font-bold transition-all shadow"
            >
              Roll 2D6 (Action)
            </button>
            <button
              onClick={rollD66}
              className="py-2 px-3 bg-[#0C0E12] hover:bg-[#D4AF37] text-[#ECEFF4] hover:text-black border border-[#323846] rounded font-mono text-xs font-bold transition-all shadow"
            >
              Roll D66 (Table)
            </button>
          </div>

          {/* Last Result Box */}
          {lastResult && (
            <div className="p-3 bg-[#0C0E12] border-2 border-[#D4AF37] rounded text-center">
              <span className="text-[10px] font-mono text-[#8E95A5] uppercase tracking-widest block mb-0.5">
                Dice Result
              </span>
              <span className="text-sm font-mono font-bold text-[#D4AF37]">{lastResult}</span>
            </div>
          )}

          {/* History */}
          {diceHistory.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-[#8E95A5] uppercase">Recent Rolls:</span>
              <div className="space-y-1 text-[11px] font-mono text-[#8E95A5]">
                {diceHistory.map((item, idx) => (
                  <div key={idx} className="bg-[#0C0E12]/60 px-2 py-1 rounded border border-[#323846]/40">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
