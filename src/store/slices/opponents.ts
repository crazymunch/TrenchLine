/**
 * Opponents whose warband is not in this app.
 *
 * Its own slice, and its own `localStorage` key, for one reason: a placeholder
 * must never be mistaken for one of the player's warbands. Keeping it out of
 * `warbands` is what makes that true everywhere at once — the roster picker,
 * the dashboard count, the legality engine and cloud sync all read that list
 * and none of them needs to learn about a second kind of thing.
 *
 * See `src/types/opponent.ts` for what one carries, and `rules/matchSides.ts`
 * for how a match resolves an id to either kind of side.
 */
import type { StateCreator } from 'zustand';
import type { AppState } from '../state';
import { storage } from '../../services/storage';
import type { PlaceholderOpponent } from '../../types/opponent';
import { PLACEHOLDER_ID_PREFIX } from '../../types/opponent';
import type { InitialState } from '../init';

export type OpponentsSlice = Pick<AppState,
  'opponents' | 'saveOpponent' | 'deleteOpponent'>;

export const createOpponentsSlice = (
  init: InitialState,
): StateCreator<AppState, [], [], OpponentsSlice> => (set) => ({
  opponents: init.opponents,

  /**
   * Add one, or replace it where the id already exists.
   *
   * Takes everything but the id and the timestamp so a caller cannot mint an
   * id in the wrong shape — `opp-` is what tells a placeholder side from a
   * warband in a match, and a placeholder without it would be looked up in
   * the wrong list and silently vanish.
   */
  saveOpponent: (opponent) => {
    set((state) => {
      const id = opponent.id ?? `${PLACEHOLDER_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const saved: PlaceholderOpponent = {
        id,
        name: opponent.name.trim(),
        factionId: opponent.factionId,
        /* Absent, not zero: "they did not say" and "they field nothing" are
           different answers, and a scenario rule keying off size must be able
           to tell them apart. */
        ...(typeof opponent.fieldStrength === 'number' && opponent.fieldStrength > 0
          ? { fieldStrength: opponent.fieldStrength } : {}),
        createdAt: state.opponents.find((o) => o.id === id)?.createdAt
          ?? new Date().toISOString(),
      };
      const next = [...state.opponents.filter((o) => o.id !== id), saved]
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      storage.saveOpponents(next);
      return { opponents: next };
    });
  },

  /**
   * Forget one.
   *
   * A match already in progress keeps its ids, so a side deleted mid-match
   * resolves to nothing and the caller's existing `undefined` guard shows it
   * as missing. That is better than rewriting a match's participants under
   * the player, which is the same class of surprise as an opponent's score
   * disappearing.
   */
  deleteOpponent: (id) => {
    set((state) => {
      const next = state.opponents.filter((o) => o.id !== id);
      storage.saveOpponents(next);
      return { opponents: next };
    });
  },
});
