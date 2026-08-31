import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { mergeWarbands } from '../persist';
import { hasRosterChange } from '../../services/sync';
import type { Warband } from '../../types/warband';

const wb = (id: string, o: Partial<Warband> = {}): Warband => ({
  id,
  name: id,
  factionId: 'iron-sultanate',
  ducatLimit: 700,
  treasuryDucats: 0,
  gloryPoints: 0,
  units: [],
  armoryStash: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...o,
} as Warband);

const none = new Set<string>();

/**
 * Each case here is a way the old sync lost a roster, written as the sequence
 * that produced it rather than as an abstract property.
 */
describe('mergeWarbands', () => {
  it('keeps a warband the cloud has never heard of', () => {
    // The first sync on an account that has never pushed. Dropping it because
    // the cloud is empty is how a first sign-in eats a warband.
    const { merged } = mergeWarbands([wb('a')], [], none);
    expect(merged.map((w) => w.id)).toEqual(['a']);
  });

  it('restores a warband the device has lost', () => {
    // A new phone, or cleared site data.
    const { merged, tookFromCloud } = mergeWarbands([], [wb('a')], none);
    expect(merged.map((w) => w.id)).toEqual(['a']);
    expect(tookFromCloud).toEqual(['a']);
  });

  it('takes the cloud copy when the cloud was edited more recently', () => {
    const mine = wb('a', { name: 'stale', editedAt: '2026-01-01T00:00:00.000Z' });
    const theirs = wb('a', { name: 'fresh', editedAt: '2026-06-01T00:00:00.000Z' });
    const { merged } = mergeWarbands([mine], [theirs], none);
    expect(merged[0].name).toBe('fresh');
  });

  it('keeps the device copy when the device was edited more recently', () => {
    const mine = wb('a', { name: 'fresh', editedAt: '2026-06-01T00:00:00.000Z' });
    const theirs = wb('a', { name: 'stale', editedAt: '2026-01-01T00:00:00.000Z' });
    const { merged, keptLocal } = mergeWarbands([mine], [theirs], none);
    expect(merged[0].name).toBe('fresh');
    expect(keptLocal).toEqual(['a']);
  });

  it('never discards an edit that has not reached the cloud', () => {
    /*
      The bug this whole change exists for. Device B opens the app, which used
      to push its copies and so make them newer than device A's real edits.
      Even with a newer-looking cloud copy, an edit still in the outbox wins:
      losing it is the one outcome with no recovery, because it exists nowhere
      else.
    */
    const mine = wb('a', { name: 'my unsynced work', editedAt: '2026-01-01T00:00:00.000Z' });
    const theirs = wb('a', { name: 'whatever the cloud says', editedAt: '2026-12-01T00:00:00.000Z' });
    const { merged } = mergeWarbands([mine], [theirs], new Set(['a']));
    expect(merged[0].name).toBe('my unsynced work');
  });

  it('gives a tie to the device', () => {
    const t = '2026-06-01T00:00:00.000Z';
    const { merged } = mergeWarbands(
      [wb('a', { name: 'mine', editedAt: t })],
      [wb('a', { name: 'theirs', editedAt: t })],
      none,
    );
    expect(merged[0].name).toBe('mine');
  });

  it('falls back to updatedAt for a warband saved before editedAt existed', () => {
    const mine = wb('a', { name: 'old local', updatedAt: '2026-01-01T00:00:00.000Z' });
    const theirs = wb('a', { name: 'newer cloud', updatedAt: '2026-06-01T00:00:00.000Z' });
    const { merged } = mergeWarbands([mine], [theirs], none);
    expect(merged[0].name).toBe('newer cloud');
  });

  it('does not let an unparseable timestamp decide the winner by accident', () => {
    // `new Date(undefined) >= x` is false, so the old comparison silently kept
    // whichever side happened to be malformed. Both sides score 0 here, and
    // the tie rule — the device wins — decides it.
    const mine = wb('a', { name: 'mine', editedAt: 'not a date' });
    const theirs = wb('a', { name: 'theirs', editedAt: 'also not a date' });
    const { merged } = mergeWarbands([mine], [theirs], none);
    expect(merged[0].name).toBe('mine');
  });
});

describe('hasRosterChange', () => {
  it('sees a recruit', () => {
    const before = wb('a');
    const after = wb('a', { units: [{ id: 'u1' }] as any });
    expect(hasRosterChange(before, after)).toBe(true);
  });

  it('sees a spend', () => {
    expect(hasRosterChange(wb('a'), wb('a', { treasuryDucats: 40 }))).toBe(true);
  });

  it('ignores a timestamp moving on its own', () => {
    const before = wb('a', { updatedAt: '2026-01-01T00:00:00.000Z' });
    const after = wb('a', { updatedAt: '2026-06-01T00:00:00.000Z' });
    expect(hasRosterChange(before, after)).toBe(false);
  });

  it('ignores match state, which changes on every wound', () => {
    /*
      Play Mode writes constantly — wounds, blood markers, whose turn it is.
      Those are saved so a phone that sleeps mid-game keeps the board, but they
      are not roster edits: treating them as such would queue a cloud push per
      wound and mark the roster dirty for a game that changed nothing about it.
    */
    const before = wb('a', { units: [{ id: 'u1', currentWounds: 3, bloodMarkers: 0, hasActedThisTurn: false }] as any });
    const after = wb('a', { units: [{ id: 'u1', currentWounds: 1, bloodMarkers: 4, hasActedThisTurn: true }] as any });
    expect(hasRosterChange(before, after)).toBe(false);
  });

  it('still sees a roster edit made during a game', () => {
    const before = wb('a', { units: [{ id: 'u1', customName: 'Kasim', bloodMarkers: 0 }] as any });
    const after = wb('a', { units: [{ id: 'u1', customName: 'Kasim the Fallen', bloodMarkers: 4 }] as any });
    expect(hasRosterChange(before, after)).toBe(true);
  });

  it('treats a warband the device has not seen before as changed', () => {
    expect(hasRosterChange(undefined, wb('a'))).toBe(true);
  });
});

/**
 * A structural guard, not a behavioural one.
 *
 * The defect this whole change fixes was not one wrong line — it was 21
 * mutations that each forgot the same two steps, spread over five files. Tests
 * of the merge cannot catch the 22nd, because the 22nd simply will not call it.
 *
 * So: the store slices may not write warbands themselves. `persistWarbands` is
 * the only way, and it derives what changed rather than trusting the caller to
 * declare it.
 */
describe('the persistence choke point is not bypassed', () => {
  // Read from disk rather than through a bundler glob: the guard is about what
  // is committed, and it should not depend on Vite's import graph.
  const dir = path.resolve(__dirname, '../slices');
  const slices = Object.fromEntries(
    fs.readdirSync(dir).filter((f) => f.endsWith('.ts'))
      .map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]),
  ) as Record<string, string>;

  it('is not empty, or the glob is wrong and this test proves nothing', () => {
    expect(Object.keys(slices).length).toBeGreaterThan(5);
  });

  it('leaves no slice calling storage.saveWarbands directly', () => {
    const offenders: string[] = [];
    for (const [file, src] of Object.entries(slices)) {
      // roster.ts writes the merge result deliberately: warbands arriving FROM
      // the cloud are not a local edit, and stamping them would queue them
      // straight back and let them beat the copy they came from.
      const allowed = file === 'roster.ts' ? 1 : 0;
      const hits = (src.match(/storage\.saveWarbands\(/g) ?? []).length;
      if (hits > allowed) offenders.push(`${file} (${hits})`);
    }
    expect(offenders, 'slices writing warbands outside persistWarbands').toEqual([]);
  });

  it('leaves no slice pushing to the cloud from a mutation', () => {
    const offenders: string[] = [];
    for (const [file, src] of Object.entries(slices)) {
      // Only the sync routine pushes, and only what the outbox holds.
      const allowed = file === 'roster.ts' ? 1 : 0;
      const hits = (src.match(/storage\.syncWarbandToCloud\(/g) ?? []).length;
      if (hits > allowed) offenders.push(`${file} (${hits})`);
    }
    expect(offenders, 'mutations pushing to the cloud by hand').toEqual([]);
  });
});
