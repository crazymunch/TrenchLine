'use client';

/**
 * Increment / decrement, sized for a thumb. Phase 3.1 of the plan.
 *
 * This is the control Play Mode is made of — blood markers, ammo, Glory, the
 * Ducat limit — and it is used mid-game, one-handed, with dice in the other.
 * The existing buttons are around 26px (`py-1.5` + `text-[10px]`), which is
 * roughly half the 44px minimum and misses often enough to matter when the
 * thing being counted is a model's remaining wounds.
 *
 * The buttons are deliberately the largest thing here: on a phone the value is
 * read once and the buttons are hit repeatedly, so the tap targets get the
 * space and the number gets the contrast.
 */
import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface Props {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  /** Shown under the value — a unit, or a limit. */
  hint?: string;
  disabled?: boolean;
}

export const Stepper: React.FC<Props> = ({
  value, onChange, min = 0, max = Infinity, step = 1, label, hint, disabled,
}) => {
  // Clamped here rather than at every call site, so a long press on the last
  // step cannot take a counter negative.
  const set = (next: number) => onChange(Math.max(min, Math.min(max, next)));
  const atMin = value <= min;
  const atMax = value >= max;

  const button =
    'w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-sm ' +
    'bg-theme-elevated border border-theme-border text-theme-text ' +
    'active:bg-theme-border transition-colors ' +
    'disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => set(value - step)}
        disabled={disabled || atMin}
        className={button}
        aria-label={`Decrease ${label}`}
      >
        <Minus className="w-5 h-5" />
      </button>

      <div className="flex-1 text-center min-w-0">
        <div className="text-2xl sm:text-xl font-gothic font-bold text-theme-text tabular-nums leading-none">
          {value}
        </div>
        <div className="text-xs sm:text-[11px] font-mono text-theme-muted mt-1 truncate">
          {hint ?? label}
        </div>
      </div>

      <button
        type="button"
        onClick={() => set(value + step)}
        disabled={disabled || atMax}
        className={button}
        aria-label={`Increase ${label}`}
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Stepper;
