/**
 * Play Mode: the turn counter, wounds, blood markers, status and activation.
 *
 * All of it is transient — a match is not saved, it is played and then written
 * back through the post-battle wizard — which is why `resetMatchState` can
 * simply clear it.
 */
import type { StateCreator } from 'zustand';
import type { AppState } from '../state';
import { storage } from '../../services/storage';
import type { RuleKeyword } from '../../types/rules';
import { persistWarbands } from '../persist';

export type MatchSlice = Pick<AppState, 'playTurn' | 'incrementTurn' | 'resetMatchState' | 'updateUnitWounds' | 'updateUnitBloodMarkers' | 'setUnitStatus' | 'toggleUnitActed' | 'activeKeyword' | 'setActiveKeyword'>;

export const createMatchSlice: StateCreator<AppState, [], [], MatchSlice> = (set, get) => ({
    playTurn: 1,
    incrementTurn: () => {
      set((state) => {
        const nextTurn = state.playTurn + 1;
        const activeWb = state.getActiveWarband();
        if (!activeWb) return { playTurn: nextTurn };

        const updatedUnits = activeWb.units.map((u) => ({
          ...u,
          hasActedThisTurn: false
        }));

        let updatedWarbands = state.warbands.map((w) =>
          w.id === activeWb.id ? { ...w, units: updatedUnits } : w
        );
        updatedWarbands = persistWarbands(updatedWarbands, state.warbands);
        return { playTurn: nextTurn, warbands: updatedWarbands };
      });
    },

    resetMatchState: () => {
      set((state) => {
        const activeWb = state.getActiveWarband();
        if (!activeWb) return { playTurn: 1 };

        const updatedUnits = activeWb.units.map((u) => ({
          ...u,
          currentWounds: u.maxWounds,
          bloodMarkers: 0,
          status: 'Active' as const,
          hasActedThisTurn: false
        }));

        let updatedWarbands = state.warbands.map((w) =>
          w.id === activeWb.id ? { ...w, units: updatedUnits } : w
        );
        updatedWarbands = persistWarbands(updatedWarbands, state.warbands);
        return { playTurn: 1, warbands: updatedWarbands };
      });
    },

    updateUnitWounds: (warbandId, unitId, delta) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          return {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const max = Number(u.maxWounds) || 1;
              const cur = Number(u.currentWounds) || 0;
              const next = Math.max(0, Math.min(max, cur + delta));
              let status = u.status;
              if (next === 0 && status === 'Active') status = 'Downed';
              if (next > 0 && status === 'Downed') status = 'Active';
              return { ...u, currentWounds: next, status };
            })
          };
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    updateUnitBloodMarkers: (warbandId, unitId, delta) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          return {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const cur = Number(u.bloodMarkers) || 0;
              // Official Rulebook Cap: max 6 blood markers per warrior
              const next = Math.max(0, Math.min(6, cur + delta));
              return { ...u, bloodMarkers: next };
            })
          };
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    setUnitStatus: (warbandId, unitId, status) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          return {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              return { ...u, status };
            })
          };
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    toggleUnitActed: (warbandId, unitId) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          return {
            ...w,
            units: w.units.map((u) => (u.id === unitId ? { ...u, hasActedThisTurn: !u.hasActedThisTurn } : u))
          };
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    // Keyword popover
    activeKeyword: null,
    setActiveKeyword: (keyword) => set({ activeKeyword: keyword }),

    // Post battle modal
});
