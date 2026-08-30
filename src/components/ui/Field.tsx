'use client';

/**
 * Labelled form controls. Phase 3.1 of docs/RESTRUCTURE-PLAN.md.
 *
 * The one rule this exists to enforce: **an input is never below 16px**
 * (docs/MOBILE.md §4). Below that, iOS Safari zooms the page on focus and does
 * not zoom back — the player is left in a viewport they have to pinch out of,
 * mid-edit, at a table. It is not a density preference, and it is why the size
 * is baked into the primitive rather than left to each call site: the app
 * currently uses 9–11px text in 431 places, so any control that takes its size
 * from its surroundings will end up too small.
 *
 * Desktop can be denser — but only from `sm:` up, and never for the input text.
 */
import React, { useId } from 'react';

interface FieldProps {
  label: string;
  /** Rendered under the control; use for units, ranges, or a rule citation. */
  hint?: React.ReactNode;
  /** Replaces the hint and marks the control invalid. */
  error?: string;
  required?: boolean;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
}

/** A label bound to whatever control the caller renders. */
export const Field: React.FC<FieldProps> = ({ label, hint, error, required, children }) => {
  const id = useId();
  const helpId = `${id}-help`;
  const help = error ?? hint;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs sm:text-[11px] font-mono font-bold uppercase tracking-wider text-theme-muted"
      >
        {label}
        {required && <span className="text-status-error ml-1">*</span>}
      </label>

      {children(id, help ? helpId : undefined)}

      {help && (
        <p
          id={helpId}
          className={`text-xs sm:text-[11px] font-mono leading-relaxed ${
            error ? 'text-status-error' : 'text-theme-muted'
          }`}
        >
          {help}
        </p>
      )}
    </div>
  );
};

/**
 * 16px on the phone, 44px tall, always. `text-base` is not overridable from
 * outside on purpose — see the note above.
 */
const CONTROL =
  'w-full min-h-[44px] px-3 py-2 rounded-sm text-base sm:text-sm ' +
  'bg-theme-base border border-theme-border text-theme-text ' +
  'focus:outline-none focus:border-theme-primary transition-colors ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className={`${CONTROL} ${props.className ?? ''}`} />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select {...props} className={`${CONTROL} ${props.className ?? ''}`} />
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea {...props} className={`${CONTROL} min-h-[88px] ${props.className ?? ''}`} />
);

export default Field;
