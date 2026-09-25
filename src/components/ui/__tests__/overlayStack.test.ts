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
import { overlayStack } from '../useOverlay';

/**
 * The hook's Escape branch, with the real guard in it.
 *
 * `useOverlay` does exactly this: `if (!overlayStack.isTopmost(mine)) return;`
 * before closing. Calling both handlers below is not artificial — it is what
 * the browser does, because both listeners are on `document`.
 */
const escapeHandler = (mine: object, onClose: () => void) => () => {
  if (!overlayStack.isTopmost(mine)) return;
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
