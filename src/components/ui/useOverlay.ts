'use client';

/**
 * The behaviour every overlay owes the user, as a hook.
 *
 * `Sheet` had all of this and nothing else did: across thirty other modals there
 * was **one** Escape handler, **one** body scroll lock and **one** focus trap —
 * all three inside `Sheet` itself. So a modal you opened anywhere else let the
 * page scroll under your finger, could not be closed from the keyboard, and let
 * Tab walk out into the page behind it.
 *
 * Migrating thirty modals to `Sheet` structurally is the right end state and is
 * a lot of JSX surgery. The behaviour does not have to wait for it: this is the
 * same implementation `Sheet` uses, extracted so a component that still renders
 * its own overlay gets the guarantees today by calling one hook.
 *
 *     const ref = useOverlay(isOpen, onClose);
 *     return <div ref={ref} className="fixed inset-0 …">…</div>;
 *
 * A component that has moved to `Sheet` does not call this — `Sheet` does.
 */
import { useCallback, useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
  'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface OverlayOptions {
  /** Set false for a destructive confirm that must be answered deliberately. */
  dismissible?: boolean;
  /** Skip the focus trap where the overlay is a transient popover, not a dialog. */
  trapFocus?: boolean;
}

/**
 * Returns a ref to put on the overlay's outermost element.
 *
 * Owns, for as long as `open` is true:
 *   - the body scroll lock, restored to whatever it was rather than to ''
 *     (two stacked overlays must not leave the page unlocked when the inner
 *     one closes)
 *   - `Escape`
 *   - a focus trap, with focus returned to whatever opened the overlay
 */
export function useOverlay(
  open: boolean,
  onClose: () => void,
  { dismissible = true, trapFocus = true }: OverlayOptions = {}
) {
  const ref = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => { if (dismissible) onClose(); }, [dismissible, onClose]);

  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const previous = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => { body.style.overflow = previous; };
  }, [open]);

  useEffect(() => {
    if (!open || !trapFocus) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? ref.current)?.focus();
    return () => restoreFocus.current?.focus?.();
  }, [open, trapFocus]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key !== 'Tab' || !trapFocus) return;

      const items = [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
        .filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      // Wrapped manually: otherwise Tab leaves the overlay for the page behind
      // it, which is still rendered and still focusable.
      if (e.shiftKey && (active === first || !ref.current?.contains(active))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, close, trapFocus]);

  return ref;
}
