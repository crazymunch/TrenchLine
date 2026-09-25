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

/**
 * Whether this overlay is the one that should act on a keystroke.
 *
 * The guard itself, named and exported (review round 2 item 6). It was an inline
 * `overlayStack.isTopmost(mine)` in the hook, and the suite tested a hand-written
 * copy of the same line — so deleting the guard from the hook left the tests
 * green, which is the one thing a regression test for this must not allow.
 *
 * Trivial by design. Its value is that there is exactly one of it: the hook calls
 * this and the test calls this.
 */
export const handlesKey = (mine: object): boolean => overlayStack.isTopmost(mine);

/**
 * What one overlay does with an Escape keystroke (Order 44 item 4d).
 *
 * The behaviour, not the source text. Round 2's test asserted that the hook
 * CONTAINED the guard, by regex — so commenting the guard out failed it, but
 * moving it after `close()` did not, and neither did any other rearrangement that
 * keeps the characters present and the effect wrong. A guard that runs too late
 * is a guard that does nothing.
 *
 * So the decision and the action are one function, and it returns whether it
 * closed. `isTopmost` is injectable purely so a test can stand a stack up
 * without a DOM; every caller in the app leaves it alone.
 *
 * Every open overlay has its own `keydown` listener on `document`, and
 * `stopPropagation` does not stop the listeners already registered on that same
 * node — it stops the event reaching other nodes. So with a picker open over the
 * post-battle wizard, one Escape ran both handlers, the wizard's first because it
 * registered first, and the whole wizard closed with the rolls in progress. The
 * stack is what makes only the top one act.
 */
export function handleEscape(
  event: { key: string; stopPropagation: () => void },
  mine: object,
  close: () => void,
  isTopmost: (token: object) => boolean = overlayStack.isTopmost,
): boolean {
  if (event.key !== 'Escape') return false;
  /* Before anything else happens, and before `close`. */
  if (!isTopmost(mine)) return false;
  event.stopPropagation();
  close();
  return true;
}

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
      /* The topmost overlay only, and the decision plus the action are one
         function so a test can drive the behaviour rather than match the source
         (Order 44 item 4d). Every other open overlay's handler is on this same
         node and will run whatever this one does about the event. */
      if (e.key === 'Escape') {
        handleEscape(e, mine, close);
        return;
      }
      /* And Tab, for the same reason: two traps fighting over one keystroke
         is how focus ends up somewhere neither of them meant. */
      if (e.key !== 'Tab' || !trapFocus || !handlesKey(mine)) return;

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
