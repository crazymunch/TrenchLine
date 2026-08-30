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

export type SettingsSlice = Pick<AppState, 'currentView' | 'setCurrentView' | 'currentTheme' | 'setTheme' | 'rulesetVersion' | 'setRulesetVersion' | 'pendingDiffs' | 'setPendingDiffs' | 'resolveDiff'>;

export const createSettingsSlice = (init: InitialState): StateCreator<AppState, [], [], SettingsSlice> =>
  (set, get) => ({
    currentView: 'builder',
    setCurrentView: (view) => set({ currentView: view }),

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
