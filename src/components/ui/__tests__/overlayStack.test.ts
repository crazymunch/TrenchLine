/**
 * Escape closes ONE overlay: the topmost.
 *
 * Review round 1, finding K. Every overlay adds its own capture-phase `keydown`
 * listener to `document`, and `stopPropagation` does not stop the listeners
 * already registered on that same node — it stops the event travelling to other
 * nodes. So with the Patron picker open over the post-battle wizard, one Escape
 * ran both handlers, and because the wizard's was registered first it ran first:
 * the whole wizard closed and the rolls in progress went with it.
 *
 * The fix is a module-level stack, and it is the general case rather than a
 * special case for that picker — `Sheet` and the thirty modals that still roll
 * their own overlay both come through `useOverlay`.
 *
 * Driven against the REAL stack (`overlayStack`, which the hook itself calls)
 * rather than a copy of the guard, which could drift from it. This suite runs
 * without a DOM, and what broke was the order two listeners on one node run in —
 * a property of the stack, not of the rendering.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { handleEscape, handlesKey, overlayStack } from '../useOverlay';

/**
 * The hook's Escape branch, calling the hook's OWN guard.
 *
 * Round 1's version of this restated the guard — `if
 * (!overlayStack.isTopmost(mine)) return;` — written out again here, so deleting
 * the guard from `useOverlay` left this suite green (review round 2 item 6).
 * `handlesKey` is that decision, exported, and this calls it. Deleting it from
 * the hook now fails the source assertion at the foot of this file.
 *
 * Calling both handlers below is not artificial — it is what the browser does,
 * because both listeners are on `document`.
 */
const escapeHandler = (mine: object, onClose: () => void) => () => {
  if (!handlesKey(mine)) return;
  onClose();
};

describe('the overlay stack', () => {
  it('counts what is open', () => {
    const a = {};
    const b = {};
    const before = overlayStack.count();
    overlayStack.push(a);
    overlayStack.push(b);
    expect(overlayStack.count()).toBe(before + 2);
    overlayStack.remove(b);
    overlayStack.remove(a);
    expect(overlayStack.count()).toBe(before);
  });

  it('only the topmost overlay handles Escape', () => {
    const closed: string[] = [];

    const wizard = {};
    overlayStack.push(wizard);
    const wizardEscape = escapeHandler(wizard, () => closed.push('wizard'));

    const picker = {};
    overlayStack.push(picker);
    const pickerEscape = escapeHandler(picker, () => closed.push('picker'));

    /*
      Both listeners run — that is the thing that cannot be prevented, and the
      wizard's runs FIRST because it was registered first. The guard is what
      makes that harmless.
    */
    wizardEscape();
    pickerEscape();

    expect(closed).toEqual(['picker']);

    overlayStack.remove(picker);
    overlayStack.remove(wizard);
  });

  it('and the one underneath takes the next Escape', () => {
    const closed: string[] = [];

    const wizard = {};
    overlayStack.push(wizard);
    const wizardEscape = escapeHandler(wizard, () => closed.push('wizard'));

    const picker = {};
    overlayStack.push(picker);
    /* The picker closed and unmounted, so its entry goes. */
    overlayStack.remove(picker);

    wizardEscape();
    expect(closed).toEqual(['wizard']);

    overlayStack.remove(wizard);
  });

  it('an entry is removed by identity, not by popping', () => {
    /*
      React may unmount an OUTER overlay first — a route change closes the page
      that owns the wizard while the picker is still mounted. Popping would
      remove the wrong entry and leave the picker unable to handle its own
      Escape for the rest of its life.
    */
    const outer = {};
    const inner = {};
    overlayStack.push(outer);
    overlayStack.push(inner);

    overlayStack.remove(outer);

    expect(overlayStack.isTopmost(inner)).toBe(true);
    const closed: string[] = [];
    escapeHandler(inner, () => closed.push('inner'))();
    expect(closed).toEqual(['inner']);

    overlayStack.remove(inner);
  });

  it('removing something that is not there changes nothing', () => {
    const open = {};
    overlayStack.push(open);
    overlayStack.remove({});
    expect(overlayStack.isTopmost(open)).toBe(true);
    overlayStack.remove(open);
  });
});

describe('Order 44 item 4d: what an Escape actually DOES, per overlay', () => {
  /*
    Round 2's version of this matched the guard with a regex — so commenting the
    line out failed, and moving it after `close()` did not. A guard that runs too
    late is a guard that does nothing, and the test could not tell.

    `handleEscape` is the decision and the action together, and it returns whether
    it closed. The stack is injected, so these are about behaviour and need no DOM.
  */
  const press = (key = 'Escape') => {
    let stopped = false;
    return { event: { key, stopPropagation: () => { stopped = true; } }, stopped: () => stopped };
  };

  const TOP = { id: 'top' };
  const UNDER = { id: 'under' };
  const stack = (top: object) => (t: object) => t === top;

  it('closes the overlay that is on top', () => {
    let closed = 0;
    const { event, stopped } = press();
    expect(handleEscape(event, TOP, () => { closed += 1; }, stack(TOP))).toBe(true);
    expect(closed).toBe(1);
    expect(stopped()).toBe(true);
  });

  it('does NOTHING for an overlay underneath — the case the bug was', () => {
    /*
      This is the assertion a source match cannot make. With the guard removed,
      or moved below `close()`, the wizard under the picker closes on the picker's
      Escape and takes the rolls in progress with it.
    */
    let closed = 0;
    const { event, stopped } = press();
    expect(handleEscape(event, UNDER, () => { closed += 1; }, stack(TOP))).toBe(false);
    expect(closed, 'an overlay that is not on top closed itself').toBe(0);
    /* And it does not swallow the event either, or the top one never sees it. */
    expect(stopped()).toBe(false);
  });

  it('one keystroke closes exactly one of two stacked overlays', () => {
    /* Both handlers run, because both listeners are on `document`. */
    const closed: string[] = [];
    const { event } = press();
    handleEscape(event, UNDER, () => closed.push('under'), stack(TOP));
    handleEscape(event, TOP, () => closed.push('top'), stack(TOP));
    expect(closed).toEqual(['top']);
  });

  it('and the one underneath takes the NEXT Escape, once it is on top', () => {
    const closed: string[] = [];
    handleEscape(press().event, UNDER, () => closed.push('under'), stack(UNDER));
    expect(closed).toEqual(['under']);
  });

  it('ignores any other key', () => {
    let closed = 0;
    const { event, stopped } = press('Enter');
    expect(handleEscape(event, TOP, () => { closed += 1; }, stack(TOP))).toBe(false);
    expect(closed).toBe(0);
    expect(stopped()).toBe(false);
  });

  it('defaults to the real stack, so the app gets the real behaviour', () => {
    /* No stub: the module-level stack decides, as it does in the hook. */
    const a = {};
    const b = {};
    overlayStack.push(a);
    overlayStack.push(b);
    try {
      let closedA = 0;
      let closedB = 0;
      handleEscape(press().event, a, () => { closedA += 1; });
      handleEscape(press().event, b, () => { closedB += 1; });
      expect(closedA).toBe(0);
      expect(closedB).toBe(1);
    } finally {
      overlayStack.remove(b);
      overlayStack.remove(a);
    }
  });

  it('the hook delegates to it rather than inlining the decision again', () => {
    /* Narrow, and the only source assertion left here: the behaviour above is
       worthless if the hook stops calling it. */
    const hook = readFileSync(
      join(process.cwd(), 'src/components/ui/useOverlay.ts'), 'utf8');
    const handler = hook.slice(hook.indexOf('const onKey'));
    expect(handler).toMatch(/handleEscape\(e, mine, close\)/);
    /* And does not re-decide it inline beside the call. */
    expect(handler).not.toMatch(/overlayStack\.isTopmost/);
  });

  it('Tab is still guarded, and still by the shared decision', () => {
    const hook = readFileSync(
      join(process.cwd(), 'src/components/ui/useOverlay.ts'), 'utf8');
    expect(hook).toMatch(/e\.key !== 'Tab'[^\n]*!handlesKey\(mine\)/);
    expect(handlesKey).toBeTypeOf('function');
  });
});
