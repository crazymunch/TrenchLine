'use client';

import React, { useState } from 'react';
import { 
  X, 
  Dices, 
  BarChart3, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Percent 
} from 'lucide-react';

interface DiceProbabilityModalProps {
  onClose: () => void;
}

export const DiceProbabilityModal: React.FC<DiceProbabilityModalProps> = ({ onClose }) => {
  const [modifier, setModifier] = useState<number>(0);

  // 2D6 probability table (sums from 2 to 12)
  const outcomes = [
    { sum: 2, ways: 1, baseProb: 2.78, label: 'Double 1s (Fumble)' },
    { sum: 3, ways: 2, baseProb: 5.56, label: '1+2, 2+1' },
    { sum: 4, ways: 3, baseProb: 8.33, label: '1+3, 2+2, 3+1' },
    { sum: 5, ways: 4, baseProb: 11.11, label: '1+4, 2+3, 3+2, 4+1' },
    { sum: 6, ways: 5, baseProb: 13.89, label: '1+5, 2+4, 3+3...' },
    { sum: 7, ways: 6, baseProb: 16.67, label: 'Average Roll (6 ways)' },
    { sum: 8, ways: 5, baseProb: 13.89, label: '2+6, 3+5, 4+4...' },
    { sum: 9, ways: 4, baseProb: 11.11, label: '3+6, 4+5, 5+4, 6+3' },
    { sum: 10, ways: 3, baseProb: 8.33, label: '4+6, 5+5, 6+4' },
    { sum: 11, ways: 2, baseProb: 5.56, label: '5+6, 6+5' },
    { sum: 12, ways: 1, baseProb: 2.78, label: 'Double 6s (Critical)' }
  ];

  // Helper to calculate success rate given target number and modifier
  const calcSuccessRate = (targetNumber: number) => {
    const effectiveTN = targetNumber - modifier;
    let passingWays = 0;
    for (let d1 = 1; d1 <= 6; d1++) {
      for (let d2 = 1; d2 <= 6; d2++) {
        if (d1 + d2 >= effectiveTN) passingWays++;
      }
    }
    return ((passingWays / 36) * 100).toFixed(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-2xl max-h-[90dvh] rounded-md flex flex-col shadow-2xl overflow-hidden bevel-container">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#323846] bg-[#0C0E12]">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-[#D4AF37]" />
            <div>
              <h2 className="font-gothic font-bold text-lg text-[#ECEFF4]">
                2D6 COMBAT PROBABILITY MATRIX & ODDS
              </h2>
              <p className="text-xs font-mono text-[#8E95A5]">
                Mathematical breakdown of Action tests, hit distributions, and modifiers
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[#8E95A5] hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Interactive Modifier Slider */}
          <div className="p-4 bg-[#20242E] rounded border border-[#323846] space-y-3">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[#8E95A5] uppercase font-bold">Simulated Modifier (Cover / Weapon / Blood):</span>
              <span className="text-sm font-bold text-[#D4AF37]">
                {modifier > 0 ? `+${modifier}` : modifier} Modifier
              </span>
            </div>

            <input
              type="range"
              min="-4"
              max="4"
              value={modifier}
              onChange={(e) => setModifier(parseInt(e.target.value))}
              className="w-full accent-[#D4AF37] cursor-pointer"
            />

            <div className="flex justify-between text-[10px] font-mono text-[#8E95A5]">
              <span>-4 (Heavy Trench + Blood)</span>
              <span>0 (Neutral)</span>
              <span>+4 (Point Blank + Elite)</span>
            </div>
          </div>

          {/* Target Number Success Rates Grid */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-[#8E95A5] font-bold block">
              Success Chance by Target Number (with {modifier >= 0 ? `+${modifier}` : modifier} mod):
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-center">
              
              {[
                { tn: 6, label: 'TN 6 (Easy)' },
                { tn: 7, label: 'TN 7 (Standard Action)' },
                { tn: 8, label: 'TN 8 (Challenging)' },
                { tn: 9, label: 'TN 9 (Difficult)' }
              ].map((item) => {
                const rate = calcSuccessRate(item.tn);
                const rateNum = parseFloat(rate);

                return (
                  <div key={item.tn} className="p-3 bg-[#0C0E12] rounded border border-[#323846] space-y-1">
                    <span className="text-[10px] text-[#8E95A5] block uppercase font-bold">{item.label}</span>
                    <span className={`text-xl font-bold block ${
                      rateNum >= 70 ? 'text-[#4E9A6E]' : rateNum >= 50 ? 'text-[#D4AF37]' : 'text-[#E53935]'
                    }`}>
                      {rate}%
                    </span>
                    <span className="text-[9px] text-[#8E95A5] block">Target {item.tn}</span>
                  </div>
                );
              })}

            </div>
          </div>

          {/* Dynamic Bell Curve Distribution Visualizer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#8E95A5] font-bold block">
                2D6 Probability Bell Curve (With {modifier >= 0 ? `+${modifier}` : modifier} Modifier):
              </span>
              <span className="text-[10px] font-mono text-[#D4AF37]">
                Standard TN 7 Pass: {calcSuccessRate(7)}%
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              {outcomes.map((o) => {
                const effectiveSum = o.sum + modifier;
                const isCriticalFail = o.sum === 2;
                const isCriticalSuccess = o.sum === 12 || effectiveSum >= 12;
                const isSuccess = effectiveSum >= 7 && !isCriticalFail;

                let barColor = 'bg-[#8E95A5]';
                let tagColor = 'text-[#8E95A5]';
                let tagLabel = 'Failure';

                if (isCriticalFail) {
                  barColor = 'bg-[#E53935]';
                  tagColor = 'text-[#E53935] font-bold';
                  tagLabel = 'Fumble (Double 1s)';
                } else if (isCriticalSuccess) {
                  barColor = 'bg-[#4E9A6E]';
                  tagColor = 'text-[#4E9A6E] font-bold';
                  tagLabel = 'Critical (12+)';
                } else if (isSuccess) {
                  barColor = 'bg-[#D4AF37]';
                  tagColor = 'text-[#D4AF37] font-bold';
                  tagLabel = 'Success (≥7)';
                } else {
                  barColor = 'bg-[#E53935]/70';
                  tagColor = 'text-[#E53935]';
                  tagLabel = 'Failure (<7)';
                }

                return (
                  <div key={o.sum} className="flex items-center space-x-3 bg-[#0C0E12] p-2 rounded border border-[#323846]/60">
                    <div className="w-16 flex items-center justify-between text-xs">
                      <span className="text-[#8E95A5]">[{o.sum}]</span>
                      <span className="text-[#ECEFF4] font-bold">➔ {effectiveSum}</span>
                    </div>

                    <div className="flex-1 bg-[#161920] h-3.5 rounded overflow-hidden">
                      <div
                        className={`h-full rounded transition-all duration-300 ${barColor}`}
                        style={{ width: `${(o.baseProb / 16.67) * 100}%` }}
                      />
                    </div>

                    <span className={`w-28 text-right text-[10px] ${tagColor}`}>
                      {tagLabel}
                    </span>

                    <span className="w-12 text-right text-[11px] text-[#8E95A5] font-mono">{o.baseProb}%</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#323846] bg-[#0C0E12] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] font-mono text-xs font-bold uppercase rounded"
          >
            Close Matrix
          </button>
        </div>

      </div>
    </div>
  );
};
