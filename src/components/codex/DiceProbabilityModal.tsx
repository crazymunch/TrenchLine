'use client';

import React, { useMemo, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { successOdds, describePool, formatSigned, successOutcome } from '../../rules/dice';

/**
 * The odds of a Success Roll at a given +/- DICE.
 *
 * What this replaced modelled a modifier as a number ADDED TO THE 2D6 SUM, and
 * offered target numbers of 6, 8 and 9 to go with it. Both are wrong about the
 * game, and in a way that matters for the decision a player is using this to
 * make:
 *
 *   - Trench Crusade has no flat modifiers on a Success Roll. Every one is
 *     +/- DICE, which changes the SHAPE of the distribution — roll more dice,
 *     keep the best or worst two — rather than sliding it along. +1 DICE and
 *     "+1 to the roll" are not the same bet.
 *   - There is one target number, and it is 7. The three others were invented.
 *   - Double 1 was labelled a "Fumble". There is no fumble band: 2-6 is a
 *     Failure however it was rolled.
 *
 * The numbers come from `rules/dice.ts`, which enumerates every outcome rather
 * than approximating, and the same function backs the tests that check 2D6
 * against the 36 combinations anyone can count by hand.
 */

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

interface DiceProbabilityModalProps {
  onClose: () => void;
}

export const DiceProbabilityModal: React.FC<DiceProbabilityModalProps> = ({ onClose }) => {
  const [dice, setDice] = useState(0);

  const odds = useMemo(() => successOdds(dice), [dice]);
  const base = useMemo(() => successOdds(0), []);

  const rows = useMemo(() => {
    const totals = [...odds.byTotal.entries()].sort((a, b) => a[0] - b[0]);
    const peak = Math.max(...totals.map(([, p]) => p));
    return totals.map(([total, p]) => ({ total, p, width: (p / peak) * 100 }));
  }, [odds]);

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title="Success Roll Odds"
      subtitle="What +/- DICE actually does to the roll"
      label="Success roll odds"
    >
      <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 font-mono text-xs">

        <div className="p-4 bg-theme-elevated rounded border border-theme-border space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <span className="text-theme-muted uppercase font-bold">+/- DICE</span>
            <span className="text-sm font-bold text-theme-primary">
              {dice === 0 ? 'No modifier' : `${formatSigned(dice)} DICE`}
              {' — '}
              <span className="text-theme-text">{describePool(2, dice)}</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((d) => (
              <button
                key={d}
                onClick={() => setDice(d)}
                className={`px-2.5 py-2 rounded font-bold border transition-all min-h-[44px] sm:min-h-0 ${
                  dice === d
                    ? 'bg-theme-primary text-theme-base border-theme-primary shadow'
                    : 'bg-theme-base text-theme-muted border-theme-border hover:text-theme-text'
                }`}
              >
                {d === 0 ? '0' : formatSigned(d)}
              </button>
            ))}
          </div>

          <p className="text-theme-muted leading-relaxed">
            Every modifier in the game is dice, not points. Cover is -1 DICE, Long Range is
            -1 DICE, an elevated position is +1 DICE, and opposite ones cancel before anything
            is rolled.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center">
          {([
            ['Failure', odds.failure, base.failure, 'text-status-error', '2-6'],
            ['Success', odds.success, base.success, 'text-status-legal', '7-11'],
            ['Critical Success', odds.critical, base.critical, 'text-theme-primary', '12+'],
          ] as const).map(([label, p, basis, tone, band]) => (
            <div key={label} className="p-3 bg-theme-base rounded border border-theme-border space-y-1">
              <span className="text-theme-muted block uppercase font-bold">{label}</span>
              <span className={`text-xl font-bold block ${tone}`}>{pct(p)}</span>
              <span className="text-theme-muted block">
                {band}
                {dice !== 0 && (
                  <>
                    {' · '}
                    <span className={p > basis ? 'text-status-legal' : p < basis ? 'text-status-error' : ''}>
                      {p === basis ? 'no change' : `${p > basis ? '+' : ''}${((p - basis) * 100).toFixed(1)} pts`}
                    </span>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="p-3 bg-theme-base rounded border border-theme-border flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-theme-muted uppercase font-bold">Hits (7 or more)</span>
          <span className="text-lg font-bold text-theme-text">
            {pct(odds.hit)}
            {dice !== 0 && (
              <span className="text-theme-muted font-normal">
                {' '}vs {pct(base.hit)} unmodified
              </span>
            )}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-theme-muted uppercase font-bold">
              Distribution of the total
            </span>
            <span className="text-theme-muted">
              mean {odds.mean.toFixed(2)}
            </span>
          </div>

          <div className="space-y-1.5">
            {rows.map(({ total, p, width }) => {
              const outcome = successOutcome(total);
              const bar = outcome === 'critical' ? 'bg-theme-primary'
                : outcome === 'success' ? 'bg-status-legal'
                : 'bg-theme-muted';
              return (
                <div key={total} className="flex items-center gap-2">
                  <span className="w-6 text-right tabular-nums text-theme-text flex-shrink-0">{total}</span>
                  <div className="flex-1 min-w-0 h-4 bg-theme-elevated rounded-sm overflow-hidden">
                    <div className={`h-full ${bar}`} style={{ width: `${width}%` }} />
                  </div>
                  <span className="w-14 text-right tabular-nums text-theme-muted flex-shrink-0">
                    {pct(p)}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-theme-muted leading-relaxed">
            Bars are scaled to the most likely total, so the shape is comparable across
            modifiers. Note that -DICE does not simply mirror +DICE: keeping the two lowest of
            four is a different distribution from keeping the two highest.
          </p>
        </div>

      </div>
    </Sheet>
  );
};
