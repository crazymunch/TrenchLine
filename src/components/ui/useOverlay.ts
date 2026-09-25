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
 *
 * First adopter: `TerritoryMap`'s dossier.
 */
import { useCallback, useEffect, useRef } from 'react';

/**
 * Every open overlay, innermost last.
 *
 * Escape must close **one** overlay: the topmost. Each overlay adds its own
 * capture-phase `keydown` listener to `document`, and `stopPropagation` does
 * not stop the other listeners already registered on that same node — it stops
 * the event travelling to other nodes. So with a picker open over the
 * post-battle wizard, one Escape ran both handlers, and because the wizard's
 * was added first it ran first: the whole wizard closed and the rolls in
 * progress went with it (review round 1, finding K).
 *
 * A module-level stack is the fix, and it is the general case rather than a
 * special one for that picker: an overlay handles Escape only while it is the
 * last entry. Module-level because the overlays are siblings in the tree with
 * no common ancestor to hang a context on, and because `Sheet` and the thirty
 * modals that still roll their own both come through this hook.
 *
 * Entries are the hook's own token objects, so two overlays can never collide
 * and an unmount removes exactly its own.
 */
const stack: object[] = [];

/**
 * The three operations the hook performs on it, exported so the test drives the
 * REAL mechanism rather than a copy of the guard that could drift from it.
 *
 * This suite runs without a DOM, and what broke was the ORDER two listeners on
 * one node run in — a property of the stack, not of the rendering.
 */
export const overlayStack = {
  push(token: object) { stack.push(token); },
  /*
    By identity, never by popping. React may unmount an OUTER overlay first — a
    route change closing the page that owns the wizard while the picker is still
    up — and popping would then remove the wrong entry, leaving the picker
    unable to handle its own Escape for the rest of its life.
  */
  remove(token: object) {
    const at = stack.lastIndexOf(token);
    if (at >= 0) stack.splice(at, 1);
  },
  /** Whether this overlay is the one a keystroke belongs to. */
  isTopmost: (token: object) => stack[stack.length - 1] === token,
  count: () => stack.length,
};

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

  /*
    This overlay's place in the stack, for as long as it is open.

    Pushed in the same effect that registers the key handler so the two can
    never disagree about whether this overlay is open, and removed by identity
    rather than by popping — React may unmount an outer overlay first.
  */
  const token = useRef<object>({});
  useEffect(() => {
    if (!open) return;
    const mine = token.current;
    overlayStack.push(mine);
    return () => overlayStack.remove(mine);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const mine = token.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        /* The topmost overlay only. Every other open overlay's handler is on
           this same node and will run whatever this one does about the event. */
        if (!overlayStack.isTopmost(mine)) return;
        e.stopPropagation();
        close();
        return;
      }
      /* And Tab, for the same reason: two traps fighting over one keystroke
         is how focus ends up somewhere neither of them meant. */
      if (e.key !== 'Tab' || !trapFocus || !overlayStack.isTopmost(mine)) return;

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
