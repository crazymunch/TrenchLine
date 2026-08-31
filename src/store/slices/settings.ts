/**
 * Settings: which view is showing, the theme, the ruleset version, and the
 * customizer's pending diffs.
 *
 * All four persist to `localStorage` and none of them touches game data.
 */
import type { StateCreator } from 'zustand';
import type { AppState } from '../state';
import { storage } from '../../services/storage';
import type { RulesetVersion } from '../../types/rules';
import type { InitialState } from '../init';

export type SettingsSlice = Pick<AppState, 'currentView' | 'setCurrentView' | 'setCurrentViewLocal' | 'navigate' | 'registerNavigate' | 'currentTheme' | 'setTheme' | 'rulesetVersion' | 'setRulesetVersion' | 'pendingDiffs' | 'setPendingDiffs' | 'resolveDiff'>;

export const createSettingsSlice = (init: InitialState): StateCreator<AppState, [], [], SettingsSlice> =>
  (set, get) => ({
    currentView: 'builder',

    /*
      `currentView` is DERIVED from the URL, which is the authority.

      Every view used to render from one page switching on this field, so the
      whole app had a single URL: no deep links, no shareable roster, and a
      back button that did nothing. Now the route decides, and the app shell
      pushes the value in here on every navigation — including a back or
      forward, which no click handler can cover.

      `setCurrentView` keeps its old signature on purpose. Nineteen call sites
      across the components say `setCurrentView('play')`, and they should not
      have to know whether that is a state write or a navigation. It routes
      when a router is registered and falls back to a plain write when there
      is none — server rendering, and unit tests that exercise the store
      without a tree around it.
    */
    setCurrentView: (view) => {
      const nav = get().navigate;
      if (nav) {
        // A roster deep link needs the id, and only the store knows which one
        // is active at the moment of the click.
        nav(view, view === 'builder' ? get().activeWarbandId ?? undefined : undefined);
        return;
      }
      set({ currentView: view });
    },

    /** Set the view without navigating. The shell's route sync uses this. */
    setCurrentViewLocal: (view) => set({ currentView: view }),

    navigate: null,
    registerNavigate: (nav) => set({ navigate: nav }),

    currentTheme: init.theme,
    setTheme: (themeId: string) => {
      storage.saveTheme(themeId);
      if (typeof window !== 'undefined') {
        document.documentElement.setAttribute('data-theme', themeId);
      }
      set({ currentTheme: themeId });
    },

    rulesetVersion: init.ruleset,
    setRulesetVersion: (version: RulesetVersion) => {
      storage.saveRulesetVersion(version);
      set({ rulesetVersion: version });
    },

    pendingDiffs: [],
    setPendingDiffs: (diffs) => set({ pendingDiffs: diffs }),
    resolveDiff: (diffId) => {
      set((state) => {
        const updated = state.pendingDiffs.filter((d) => d.id !== diffId);
        return { pendingDiffs: updated };
      });
    }
});
