/**
 * The one way a warband is written.
 *
 * Every mutation used to do this by hand — save to `localStorage`, push to the
 * cloud, and stamp `updatedAt` — and 21 of the 44 forgot the stamp. Since the
 * merge is last-write-wins on that timestamp, a mutation that forgot it was
 * invisible to sync and lost to any other device's copy. Every Play Mode
 * mutation was in that group, so a whole game's worth of state could be
 * overwritten by a phone that had merely opened the app.
 *
 * Fixing 21 call sites fixes them once. Instead the persistence layer works
 * out what changed by comparing against the previous list, so a mutation
 * cannot fail to declare a change it did not know it had to declare. A new
 * mutation written next year inherits it for free.
 */
import { storage } from '../services/storage';
import { hasRosterChange, outbox } from '../services/sync';
import type { Warband } from '../types/warband';

/**
 * Persist a new warband list.
 *
 * Returns the list to put in the store, which is not the list passed in: any
 * warband whose roster actually changed comes back stamped.
 *
 * `prev` is the list as the store held it before the mutation. Callers inside
 * `set((s) => …)` already have it as `s.warbands`.
 */
export function persistWarbands(next: Warband[], prev: Warband[]): Warband[] {
  const before = new Map(prev.map((w) => [w.id, w]));
  const now = new Date().toISOString();

  const stamped = next.map((w) => {
    const old = before.get(w.id);

    // Unchanged in every respect: hand back the identical object so React sees
    // no new reference and the row does not re-render.
    if (old && old === w) return w;

    // Written, but only transient match state moved (wounds, blood markers,
    // whose turn it is). It is saved locally so a phone that sleeps mid-game
    // keeps the board, but it is not a roster edit: it must not queue a push,
    // or a single game would fire a hundred of them.
    if (!hasRosterChange(old, w)) return { ...w, updatedAt: now };

    outbox.add(w.id);
    return { ...w, updatedAt: now, editedAt: now };
  });

  storage.saveWarbands(stamped);
  return stamped;
}

/**
 * Merge the cloud's warbands into the device's.
 *
 * Pure, and separated from the fetch so it can be tested against the cases
 * that actually lose data rather than only against a happy path.
 *
 * Rules, in order:
 *
 *  - A warband only the device has is kept. It is either unsynced work or a
 *    local-only roster; deleting it because the cloud has not heard of it is
 *    how a first sync eats a warband.
 *  - A warband only the cloud has is taken. That is the restore case — a new
 *    device, or one whose storage was cleared.
 *  - A warband both have is decided on `editedAt`, the time the *player* last
 *    changed the roster, never on a push time. Ties go to the device, because
 *    the device is where the person is.
 *  - A local warband with unpushed edits always wins, whatever the timestamps
 *    say. Losing an edit that has not reached the cloud yet is the one outcome
 *    with no recovery.
 */
export function mergeWarbands(
  local: Warband[],
  cloud: Warband[],
  pendingIds: ReadonlySet<string>,
): { merged: Warband[]; tookFromCloud: string[]; keptLocal: string[] } {
  const editTime = (w: Warband) => Date.parse(w.editedAt ?? w.updatedAt ?? '') || 0;

  const byId = new Map(local.map((w) => [w.id, w]));
  const tookFromCloud: string[] = [];
  const keptLocal: string[] = [];

  for (const remote of cloud) {
    const mine = byId.get(remote.id);
    if (!mine) {
      byId.set(remote.id, remote);
      tookFromCloud.push(remote.id);
      continue;
    }
    if (pendingIds.has(remote.id) || editTime(mine) >= editTime(remote)) {
      keptLocal.push(remote.id);
      continue;
    }
    byId.set(remote.id, remote);
    tookFromCloud.push(remote.id);
  }

  return { merged: [...byId.values()], tookFromCloud, keptLocal };
}
