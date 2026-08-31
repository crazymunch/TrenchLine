/**
 * The sync outbox, and the one place that knows whether the cloud copy is
 * current.
 *
 * ## What was wrong
 *
 * The app kept warbands in `localStorage` and in Postgres with no rule about
 * which one is authoritative, and four separate defects made that lose data:
 *
 * 1. **21 of the 44 warband mutations pushed to the cloud without bumping
 *    `updatedAt`.** The merge is last-write-wins on that timestamp, so an edit
 *    that did not bump it was invisible to the merge and any other device's
 *    copy silently won. Every Play Mode mutation was in this group.
 *
 * 2. **The server's `updatedAt` was a *push* time, not an *edit* time.**
 *    Prisma's `@updatedAt` rewrites it on every write, and sync pushed every
 *    warband it held on every run — so merely opening the app on a second
 *    device made that device's copies newer than the first device's real
 *    edits, and the first device's work lost the next time it synced.
 *
 * 3. **A failed fetch was indistinguishable from an empty cloud.** Every call
 *    caught its own error and returned `null`, the merge treated that as "the
 *    cloud has nothing", and then pushed the local list over the top. An
 *    offline sync could therefore overwrite good cloud data with a stale local
 *    copy.
 *
 * 4. **A signed-out GET returned every warband in the database** (the `where`
 *    collapsed to `{}` with no user), which the client then merged into local
 *    storage as the visitor's own and pushed back under a shared
 *    `commander@trenchline.org` account.
 *
 * ## The rule now
 *
 * `localStorage` is the working copy and is authoritative for the device.
 * The cloud is a backup that a signed-in user can restore from. A warband
 * carries `editedAt`, set only when its content actually changes, and the
 * merge compares that — never a push time.
 *
 * Nothing here fails silently: every outcome is a value the caller can act on
 * and the UI can show, because "did my roster save?" is a question a player
 * asks at a table with no signal.
 */
import type { Warband } from '../types/warband';

/** What a cloud call actually did. `offline` and `empty` are not the same. */
export type CloudResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'offline' | 'unauthenticated' | 'server'; detail: string };

export type SyncState =
  /** No signed-in user. Local-only, and that is a valid way to use the app. */
  | { kind: 'local-only' }
  | { kind: 'syncing' }
  /** Everything the device has is in the cloud. */
  | { kind: 'synced'; at: string }
  /** Edits are held locally and will go up when the cloud is reachable. */
  | { kind: 'pending'; count: number }
  | { kind: 'error'; reason: 'offline' | 'unauthenticated' | 'server'; detail: string; pending: number };

/**
 * Warbands edited since their last successful push, by id.
 *
 * Held in `localStorage` rather than in memory: the reason the queue exists is
 * that the network is unreliable at a table, and a queue that a refresh empties
 * would drop exactly the edits it was there to protect.
 */
const OUTBOX_KEY = 'tc_sync_outbox_v1';

const isBrowser = typeof window !== 'undefined';

function readOutbox(): Set<string> {
  if (!isBrowser) return new Set();
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeOutbox(ids: Set<string>): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify([...ids]));
  } catch {
    // A full quota must not take the edit down with it. The edit is already in
    // `warbands`; losing the queue costs a delayed push, not the work.
  }
}

export const outbox = {
  ids: (): string[] => [...readOutbox()],
  size: (): number => readOutbox().size,
  add(id: string): void {
    const ids = readOutbox();
    ids.add(id);
    writeOutbox(ids);
  },
  clear(id: string): void {
    const ids = readOutbox();
    if (ids.delete(id)) writeOutbox(ids);
  },
};

/**
 * The fields a change to which means the player edited the warband.
 *
 * Deliberately not "the whole object": `updatedAt` is derived from this
 * comparison, so including it would make every warband differ from itself, and
 * the transient Play Mode fields on a unit (`hasActedThisTurn`, `bloodMarkers`,
 * `currentWounds`) change constantly during a game. Those are match state, not
 * roster state — they are saved locally so a phone that sleeps mid-game does
 * not lose the board, but they must not mark the roster dirty and start a push
 * on every wound.
 */
const TRANSIENT_UNIT_FIELDS = new Set([
  'hasActedThisTurn', 'bloodMarkers', 'currentWounds', 'status', 'activationOrder',
]);

function stableShape(w: Warband): string {
  return JSON.stringify(w, (key, value) => {
    if (key === 'updatedAt' || key === 'editedAt') return undefined;
    if (TRANSIENT_UNIT_FIELDS.has(key)) return undefined;
    return value;
  });
}

/** True when the player changed something worth syncing. */
export function hasRosterChange(before: Warband | undefined, after: Warband): boolean {
  if (!before) return true;
  return stableShape(before) !== stableShape(after);
}
