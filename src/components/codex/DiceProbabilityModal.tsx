'use client';

import React, { useState } from 'react';
import { useOverlay } from '../ui/useOverlay';
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

  // Scroll lock, focus trap and Escape (docs/MOBILE.md §7).
  const overlayRef = useOverlay(true, onClose);

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
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-theme-surface border-2 border-theme-primary w-full max-w-2xl max-h-[90dvh] rounded-md flex flex-col shadow-2xl overflow-hidden bevel-container">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border bg-theme-base">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-theme-primary" />
            <div>
              <h2 className="font-gothic font-bold text-lg text-theme-text">
                2D6 COMBAT PROBABILITY MATRIX & ODDS
              </h2>
              <p className="text-xs font-mono text-theme-muted">
                Mathematical breakdown of Action tests, hit distributions, and modifiers
              </p>
            </div>
          </div>
          <button onClick={onClose} className="tap p-1 text-theme-muted hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Interactive Modifier Slider */}
          <div className="p-4 bg-theme-elevated rounded border border-theme-border space-y-3">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-theme-muted uppercase font-bold">Simulated Modifier (Cover / Weapon / Blood):</span>
              <span className="text-sm font-bold text-theme-primary">
                {modifier > 0 ? `+${modifier}` : modifier} Modifier
              </span>
            </div>

            <input
              type="range"
              min="-4"
              max="4"
              value={modifier}
              onChange={(e) => setModifier(parseInt(e.target.value))}
              className="w-full accent-theme-primary cursor-pointer"
            />

            <div className="flex justify-between text-xs sm:text-[10px] font-mono text-theme-muted">
              <span>-4 (Heavy Trench + Blood)</span>
              <span>0 (Neutral)</span>
              <span>+4 (Point Blank + Elite)</span>
            </div>
          </div>

          {/* Target Number Success Rates Grid */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-theme-muted font-bold block">
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
                  <div key={item.tn} className="p-3 bg-theme-base rounded border border-theme-border space-y-1">
                    <span className="text-xs sm:text-[10px] text-theme-muted block uppercase font-bold">{item.label}</span>
                    <span className={`text-xl font-bold block ${
                      rateNum >= 70 ? 'text-status-legal' : rateNum >= 50 ? 'text-theme-primary' : 'text-status-error'
                    }`}>
                      {rate}%
                    </span>
                    <span className="text-xs sm:text-[9px] text-theme-muted block">Target {item.tn}</span>
                  </div>
                );
              })}

            </div>
          </div>

          {/* Dynamic Bell Curve Distribution Visualizer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-theme-muted font-bold block">
                2D6 Probability Bell Curve (With {modifier >= 0 ? `+${modifier}` : modifier} Modifier):
              </span>
              <span className="text-xs sm:text-[10px] font-mono text-theme-primary">
                Standard TN 7 Pass: {calcSuccessRate(7)}%
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              {outcomes.map((o) => {
                const effectiveSum = o.sum + modifier;
                const isCriticalFail = o.sum === 2;
                const isCriticalSuccess = o.sum === 12 || effectiveSum >= 12;
                const isSuccess = effectiveSum >= 7 && !isCriticalFail;

                let barColor = 'bg-theme-muted';
                let tagColor = 'text-theme-muted';
                let tagLabel = 'Failure';

                if (isCriticalFail) {
                  barColor = 'bg-status-error';
                  tagColor = 'text-status-error font-bold';
                  tagLabel = 'Fumble (Double 1s)';
                } else if (isCriticalSuccess) {
                  barColor = 'bg-status-legal';
                  tagColor = 'text-status-legal font-bold';
                  tagLabel = 'Critical (12+)';
                } else if (isSuccess) {
                  barColor = 'bg-theme-primary';
                  tagColor = 'text-theme-primary font-bold';
                  tagLabel = 'Success (≥7)';
                } else {
                  barColor = 'bg-status-error/70';
                  tagColor = 'text-status-error';
                  tagLabel = 'Failure (<7)';
                }

                return (
                  <div key={o.sum} className="flex items-center space-x-3 bg-theme-base p-2 rounded border border-theme-border/60">
                    <div className="w-16 flex items-center justify-between text-xs">
                      <span className="text-theme-muted">[{o.sum}]</span>
                      <span className="text-theme-text font-bold">➔ {effectiveSum}</span>
                    </div>

                    <div className="flex-1 bg-theme-surface h-3.5 rounded overflow-hidden">
                      <div
                        className={`h-full rounded transition-all duration-300 ${barColor}`}
                        style={{ width: `${(o.baseProb / 16.67) * 100}%` }}
                      />
                    </div>

                    <span className={`w-28 text-right text-xs sm:text-[10px] ${tagColor}`}>
                      {tagLabel}
                    </span>

                    <span className="w-12 text-right text-xs sm:text-[11px] text-theme-muted font-mono">{o.baseProb}%</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-theme-border bg-theme-base flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-theme-elevated hover:bg-theme-border text-theme-text font-mono text-xs font-bold uppercase rounded"
          >
            Close Matrix
          </button>
        </div>

      </div>
    </div>
  );
};
