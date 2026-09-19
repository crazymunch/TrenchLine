/**
 * Placeholder opponents are stored, and stored SEPARATELY.
 *
 * The separation is the feature. Everything in this app that asks "what are
 * the player's warbands" reads `warbands` — the roster picker, the dashboard
 * count, the legality engine, cloud sync — so an opponent that never enters
 * that list is invisible to all of them without any of them being changed.
 * These tests hold that boundary at the two places it could leak: the store
 * and `localStorage`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

/*
  A browser, enough of one.

  This project runs vitest with no DOM environment — every other suite tests a
  pure function — and `services/storage.ts` decides `isBrowser` once, at import
  time, from `typeof window`. So the globals have to exist BEFORE that module
  is imported, which is what `vi.hoisted` is for: it runs above the imports
  below. A real jsdom would do this too, at the cost of a dependency and a
  config change on the evening the feature is wanted.
*/
vi.hoisted(() => {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
  (globalThis as Record<string, unknown>).localStorage = localStorage;
  (globalThis as Record<string, unknown>).window = globalThis;
  /* The store applies the saved theme to the document as it is created. Only
     `setAttribute` is ever called, so only that is provided — a fuller fake
     would be inventing a DOM nobody here uses. */
  (globalThis as Record<string, unknown>).document = {
    documentElement: { setAttribute: () => {} },
  };
});

import { useStore } from '../useStore';
import { storage } from '@/services/storage';
import { isPlaceholderId } from '@/types/opponent';

const reset = () => {
  localStorage.clear();
  useStore.setState({ opponents: [], warbands: [] });
};

describe('saving an opponent', () => {
  beforeEach(reset);

  it('mints an id that marks it as a placeholder', () => {
    useStore.getState().saveOpponent({ name: 'Dave', factionId: 'heretic-legions' });

    const [saved] = useStore.getState().opponents;
    expect(saved.name).toBe('Dave');
    // The prefix is the whole mechanism by which a match tells the two apart.
    expect(isPlaceholderId(saved.id)).toBe(true);
  });

  it('never puts it in the warband list', () => {
    useStore.getState().saveOpponent({ name: 'Dave', factionId: 'heretic-legions' });

    expect(useStore.getState().warbands).toEqual([]);
    expect(useStore.getState().opponents).toHaveLength(1);
  });

  it('never writes it to the warband key', () => {
    useStore.getState().saveOpponent({ name: 'Dave', factionId: 'heretic-legions' });

    // The second half of the same invariant: a reload must not bring it back
    // as a roster. Read through the real reader rather than the raw key.
    expect(storage.getWarbands()).toEqual([]);
    expect(storage.getOpponents()).toHaveLength(1);
  });

  it('keeps a blank name blank rather than inventing one', () => {
    // `opponentLabel` falls back to the faction at the point of display. The
    // stored record says what the player actually typed, which was nothing.
    useStore.getState().saveOpponent({ name: '  ', factionId: 'heretic-legions' });
    expect(useStore.getState().opponents[0].name).toBe('');
  });

  it('stores a stated model count, and omits one never given', () => {
    useStore.getState().saveOpponent({ name: 'A', factionId: 'f', fieldStrength: 9 });
    useStore.getState().saveOpponent({ name: 'B', factionId: 'f' });
    useStore.getState().saveOpponent({ name: 'C', factionId: 'f', fieldStrength: 0 });

    const by = (n: string) => useStore.getState().opponents.find((o) => o.name === n)!;
    expect(by('A').fieldStrength).toBe(9);
    // Absent, not zero — "did not say" is a different answer from "fields none".
    expect(by('B').fieldStrength).toBeUndefined();
    expect(by('C').fieldStrength).toBeUndefined();
  });

  it('replaces by id rather than adding a duplicate', () => {
    useStore.getState().saveOpponent({ name: 'Dave', factionId: 'heretic-legions' });
    const { id, createdAt } = useStore.getState().opponents[0];

    useStore.getState().saveOpponent({ id, name: 'Dave (Grail now)', factionId: 'black-grail' });

    const list = useStore.getState().opponents;
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Dave (Grail now)');
    expect(list[0].factionId).toBe('black-grail');
    // The record is the same record, so when you first played them survives.
    expect(list[0].createdAt).toBe(createdAt);
  });
});

describe('forgetting an opponent', () => {
  beforeEach(reset);

  it('removes it from the store and from storage', () => {
    useStore.getState().saveOpponent({ name: 'Dave', factionId: 'heretic-legions' });
    const { id } = useStore.getState().opponents[0];

    useStore.getState().deleteOpponent(id);

    expect(useStore.getState().opponents).toEqual([]);
    expect(storage.getOpponents()).toEqual([]);
  });
});

describe('reading a damaged opponents key', () => {
  beforeEach(reset);

  it('discards rows with no id or faction rather than handing them on', () => {
    // A half-written key, or one edited by hand. A row with no id resolves to
    // no side and would show as a nameless player in the score bar.
    localStorage.setItem('tc_opponents_v1', JSON.stringify([
      { id: 'opp-1', name: 'Real', factionId: 'heretic-legions', createdAt: 'x' },
      { name: 'No id', factionId: 'heretic-legions' },
      { id: 'opp-3', name: 'No faction' },
      null,
    ]));

    const read = storage.getOpponents();
    expect(read).toHaveLength(1);
    expect(read[0].id).toBe('opp-1');
  });

  it('returns an empty list for a key that is not JSON', () => {
    localStorage.setItem('tc_opponents_v1', 'not json at all');
    expect(storage.getOpponents()).toEqual([]);
  });
});
