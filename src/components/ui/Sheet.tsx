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
import React from 'react';
import { X } from 'lucide-react';

import { useOverlay } from './useOverlay';

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

export const Sheet: React.FC<SheetProps> = ({
  open, onClose, title, subtitle, footer, children,
  size = 'md', dismissible = true, label,
}) => {
  // Scroll lock, focus trap and Escape live in `useOverlay`, so the thirty
  // modals that have not moved to `Sheet` yet can have them too.
  const panel = useOverlay(open, onClose, { dismissible });
  const close = () => { if (dismissible) onClose(); };

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
                    bg-theme-surface border border-theme-border
                    rounded-t-xl sm:rounded-md outline-none`}
      >
        {(title || dismissible) && (
          <header className="flex items-start justify-between gap-3 px-4 py-3 bg-theme-elevated border-b border-theme-border flex-shrink-0">
            <div className="min-w-0">
              {/* Grab handle: a phone affordance, and it says "this came from
                  the bottom edge" before anything is read. */}
              <div className="sm:hidden w-9 h-1 rounded-full bg-theme-border mx-auto mb-2 -mt-1" />
              {title && (
                <h2 className="font-gothic font-bold text-lg sm:text-base text-theme-text truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-xs sm:text-[11px] font-mono text-theme-muted mt-0.5">{subtitle}</p>
              )}
            </div>
            {dismissible && (
              <button
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 flex items-center justify-center
                           text-theme-muted hover:text-theme-text flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </header>
        )}

        <div className="overflow-y-auto overscroll-contain flex-1 p-4">{children}</div>

        {footer && (
          <footer className="flex-shrink-0 flex gap-2 p-3 pb-safe sm:pb-3 bg-theme-elevated border-t border-theme-border">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};

export default Sheet;
