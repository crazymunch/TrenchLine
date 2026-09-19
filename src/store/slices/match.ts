/**
 * Play Mode: the turn counter, wounds, blood markers, status and activation.
 *
 * All of it is transient — a match is not saved, it is played and then written
 * back through the post-battle wizard — which is why `resetMatchState` can
 * simply clear it.
 */
import type { StateCreator } from 'zustand';
import type { AppState } from '../state';
import type { BattleMarker } from '../../types/catalogue';
import { persistWarbands } from '../persist';

export type MatchSlice = Pick<AppState, 'playTurn' | 'incrementTurn' | 'setPlayTurn' | 'resetMatchState' | 'updateUnitWounds' | 'updateUnitBloodMarkers' | 'updateUnitBlessingMarkers' | 'setUnitStatus' | 'toggleUnitActed' | 'activeKeyword' | 'setActiveKeyword'>;

/**
 * How many of a marker a model may hold.
 *
 * From `dataset.markers`, which the pipeline reads out of the rulebook, not
 * from a literal here. This was `Math.min(6, …)` under a comment reading
 * "Official Rulebook Cap" — the cap is a rule, and rules are derived.
 *
 * `undefined` for two different reasons, and both mean the same thing to this
 * function: the book states no cap (Blessing Markers have none), or the
 * dataset has not loaded yet. Neither is a licence to invent one.
 */
function capOf(markers: BattleMarker[], id: string): number | undefined {
  const marker = markers.find((m) => m.id === id);
  return marker?.cap ?? undefined;
}

/** Adds `delta`, floored at zero and capped only where the book caps it. */
function stepMarker(current: unknown, delta: number, cap: number | undefined): number {
  const next = Math.max(0, (Number(current) || 0) + delta);
  return cap === undefined ? next : Math.min(cap, next);
}

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

    /*
      Straight to a turn number, which only a restore should do.

      Not a substitute for `incrementTurn`: that also clears every model's
      acted-this-turn flag, and a restore must not, because the flags it is
      restoring alongside are the real ones from the turn being resumed.
    */
    setPlayTurn: (turn) => set({ playTurn: Math.max(1, Math.floor(turn)) }),

    resetMatchState: () => {
      set((state) => {
        const activeWb = state.getActiveWarband();
        if (!activeWb) return { playTurn: 1 };

        const updatedUnits = activeWb.units.map((u) => ({
          ...u,
          currentWounds: u.maxWounds,
          bloodMarkers: 0,
          // Both pools are match state, so both are cleared when a match is.
          blessingMarkers: 0,
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
      const cap = capOf(get().markers, 'blood-markers');
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          return {
            ...w,
            units: w.units.map((u) => (u.id === unitId
              ? { ...u, bloodMarkers: stepMarker(u.bloodMarkers, delta, cap) }
              : u)),
          };
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    /*
      BLESSING MARKERS.

      Not a recolour of the pool above. The book caps Blood at 6 and states no
      cap at all for Blessing, so `capOf` returns undefined and nothing is
      clamped from above — a model that has been blessed seven times is a legal
      board state, and the app had no way to record even one of them.
    */
    updateUnitBlessingMarkers: (warbandId, unitId, delta) => {
      const cap = capOf(get().markers, 'blessing-markers');
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          return {
            ...w,
            units: w.units.map((u) => (u.id === unitId
              ? { ...u, blessingMarkers: stepMarker(u.blessingMarkers, delta, cap) }
              : u)),
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
