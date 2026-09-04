/**
 * The store, composed from its slices.
 *
 * This file was 2,471 lines: every domain the app has, in one object literal —
 * warbands, models, progression, play mode, the campaign, the customizer and
 * the theme. Phase 4.2 of docs/RESTRUCTURE-PLAN.md exists to undo that, and
 * this is it. The behaviour moved to `slices/`, unchanged; what is here is the
 * assembly.
 *
 * Zustand's slice pattern keeps one store and one `AppState`, so nothing about
 * how components use it changes — `useStore()` still returns everything, and a
 * slice's `get()` still reaches the whole store. What changes is that a person
 * looking for how a model earns a scar opens a 400-line file about progression
 * instead of scrolling a 2,400-line file about everything.
 *
 * `readInitialState()` does the one read of `localStorage`, and the slices that
 * need a seed take it as an argument rather than closing over a variable
 * defined four hundred lines above them.
 */
import { create } from 'zustand';

import type { AppState } from './state';
import { emptyInitialState, readInitialState } from './init';
import { createSettingsSlice } from './slices/settings';
import { createCatalogSlice } from './slices/catalog';
import { createRosterSlice } from './slices/roster';
import { createUnitsSlice } from './slices/units';
import { createProgressionSlice } from './slices/progression';
import { createMatchSlice } from './slices/match';
import { createCampaignSlice } from './slices/campaign';

export type { AppState, AppView } from './state';
export { DEFAULT_WORLD_THEATERS } from './seed';

export const useStore = create<AppState>()((...a) => {
  /*
    Empty, deliberately. The saved state is read by `hydrateStore()` from an
    effect once React has mounted — see `emptyInitialState` for why reading it
    here made every view report a hydration mismatch.
  */
  const init = emptyInitialState();

  // Applying the theme here rather than in the settings slice keeps the slice
  // a pure state creator: this is a side effect on the document, and it belongs
  // with the one-time setup.
  if (typeof window !== 'undefined') {
    document.documentElement.setAttribute('data-theme', init.theme);
  }

  return {
    ...createSettingsSlice(init)(...a),
    ...createCatalogSlice(init)(...a),
    ...createRosterSlice(init)(...a),
    ...createUnitsSlice(...a),
    ...createProgressionSlice(...a),
    ...createMatchSlice(...a),
    ...createCampaignSlice(init)(...a),
  };
});

/**
 * Read the browser's saved state into the store.
 *
 * Called once from the app shell's mount effect. Separate from store creation
 * because the store is built at import time, before React hydrates, and
 * reading `localStorage` then makes the first client render disagree with the
 * prerendered HTML.
 */
export function hydrateStore(): void {
  const saved = readInitialState();
  useStore.setState({
    warbands: saved.warbands,
    activeWarbandId: saved.activeWarbandId,
    customUnits: saved.customUnits,
    customWeapons: saved.customWeapons,
    campaign: saved.campaign,
    currentTheme: saved.theme,
    rulesetVersion: saved.ruleset,
  });
  if (typeof window !== 'undefined') {
    document.documentElement.setAttribute('data-theme', saved.theme);
  }
}
