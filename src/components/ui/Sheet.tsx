'use client';

/**
 * The one overlay primitive. Phase 3.1 of docs/RESTRUCTURE-PLAN.md.
 *
 * Thirty modals hand-roll `fixed inset-0 flex items-center justify-center p-4`,
 * and each one re-decides — usually by omission — what happens to body scroll,
 * to focus, to Escape, and to the home indicator. That is why the audit found
 * `vh` in thirty places and `env(safe-area-inset-*)` in none: those are not
 * thirty bugs, they are one bug written thirty times.
 *
 * So this owns all of it:
 *
 *   - **Body scroll lock**, restored exactly as found. Without it the page
 *     behind scrolls under your finger while the sheet stays put, which on a
 *     phone reads as the app having lost your place.
 *   - **Focus trap** with focus returned to whatever opened it.
 *   - **Escape**, and click-outside on pointer devices.
 *   - **`dvh`, never `vh`** — iOS resolves `vh` against the *large* viewport, so
 *     `90vh` puts the footer under the collapsing toolbar. That is how a
 *     "Confirm" button becomes unreachable.
 *   - **Safe areas** on the bottom edge, so a full-height sheet clears the home
 *     indicator rather than hiding its own footer behind it.
 *
 * Shape follows docs/MOBILE.md §7: a bottom sheet on a phone, a centred dialog
 * from `sm:` up. Header and footer are sticky so the primary action stays put
 * while the body scrolls — the thing you cannot do with a plain centred div.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Small print under the title. */
  subtitle?: React.ReactNode;
  /** Pinned to the bottom, above the safe area. Usually the primary action. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Desktop width. Phone is always full-bleed. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Set false for a destructive confirm that must be answered deliberately. */
  dismissible?: boolean;
  /** Accessible name when there is no visible title. */
  label?: string;
}

/** Static class names: Tailwind cannot see an interpolated one (MOBILE.md §5). */
const WIDTH: Record<NonNullable<SheetProps['size']>, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
  'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export const Sheet: React.FC<SheetProps> = ({
  open, onClose, title, subtitle, footer, children,
  size = 'md', dismissible = true, label,
}) => {
  const panel = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => { if (dismissible) onClose(); }, [dismissible, onClose]);

  // Body scroll lock. Reads the existing value and puts it back rather than
  // assuming '' — two stacked sheets must not leave the page unlocked when the
  // inner one closes.
  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const previous = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => { body.style.overflow = previous; };
  }, [open]);

  // Focus: move into the panel on open, and back to the opener on close, so
  // keyboard and screen-reader users are not dropped at the top of the document.
  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel.current)?.focus();
    return () => restoreFocus.current?.focus?.();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key !== 'Tab') return;

      const items = [...(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
        .filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      // Wrap manually: without this, Tab walks out of the sheet and into the
      // page behind it, which is still there and still focusable.
      if (e.shiftKey && (active === first || !panel.current?.contains(active))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label ?? (typeof title === 'string' ? title : undefined)}
        tabIndex={-1}
        // dvh, not vh. Bottom sheet on a phone, centred dialog from sm: up.
        className={`w-full ${WIDTH[size]} max-h-[90dvh] flex flex-col overflow-hidden
                    bg-[#161920] border border-[#323846]
                    rounded-t-xl sm:rounded-md outline-none`}
      >
        {(title || dismissible) && (
          <header className="flex items-start justify-between gap-3 px-4 py-3 bg-[#20242E] border-b border-[#323846] flex-shrink-0">
            <div className="min-w-0">
              {/* Grab handle: a phone affordance, and it says "this came from
                  the bottom edge" before anything is read. */}
              <div className="sm:hidden w-9 h-1 rounded-full bg-[#323846] mx-auto mb-2 -mt-1" />
              {title && (
                <h2 className="font-gothic font-bold text-lg sm:text-base text-[#ECEFF4] truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-xs sm:text-[11px] font-mono text-[#8E95A5] mt-0.5">{subtitle}</p>
              )}
            </div>
            {dismissible && (
              <button
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 flex items-center justify-center
                           text-[#8E95A5] hover:text-[#ECEFF4] flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </header>
        )}

        <div className="overflow-y-auto overscroll-contain flex-1 p-4">{children}</div>

        {footer && (
          <footer className="flex-shrink-0 flex gap-2 p-3 pb-safe sm:pb-3 bg-[#20242E] border-t border-[#323846]">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};

export default Sheet;
