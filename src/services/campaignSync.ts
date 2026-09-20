/**
 * The client half of campaign sync.
 *
 * `src/services/sync.ts` queues WARBANDS — one entry per warband id, because a
 * warband is pushed whole and the last state is the only one that matters.
 * Campaigns cannot work that way. A campaign is edited by several people at
 * once, so two edits to one territory are two facts and not one later state,
 * and a queue keyed by entity would collapse them into a last-writer-wins blob
 * before the request was even made.
 *
 * So this queue is keyed by OPERATION. Each entry is one thing somebody did,
 * with the id it will be acknowledged under and the version it was made
 * against. See `docs/CAMPAIGN-SYNC.md`.
 */
import type { CampaignHouseRules } from '@/types/campaign';

/** What one queued operation looks like, matching the endpoint's schema. */
export type CampaignOp =
  | {
      kind: 'campaign.settings';
      opId: string;
      campaignId: string;
      baseVersion: number;
      data: {
        name?: string;
        currentTurn?: number;
        /* No `currentGame`: the Campaign table has no such column, so the
           endpoint no longer accepts one — see `/api/campaigns/sync`. */
        maxWarbandDucats?: number;
        gloryVictoryThreshold?: number;
        framework?: 'classic' | 'carcass-front';
        houseRules?: CampaignHouseRules;
      };
    }
  | {
      kind: 'territory.perk';
      opId: string;
      campaignId: string;
      entityId: string;
      baseVersion: number;
      data: { perk: string };
    }
  | {
      kind: 'territory.claim';
      opId: string;
      campaignId: string;
      entityId: string;
      baseVersion: number;
      data: { warbandId: string };
    };

export interface SyncConflict {
  opId: string;
  /** The server's copy of the entity, for the app to show. */
  server: unknown;
}

/**
 * The server's copy of a territory, as a conflict carries it.
 *
 * Read through a guard rather than cast. It is our own endpoint's payload, but
 * it has been over the wire, and a cast that turns out to be wrong would show
 * the player `undefined` where the campaign's real value should be — the one
 * thing a conflict panel exists to get right.
 */
export interface ServerTerritory {
  version: number;
  perk: string;
  perkSource: 'published' | 'campaign' | null;
  controlledByWarbandId: string | null;
  controlledByPlayerName: string | null;
}

/** The server's copy of the campaign's settings, as a conflict carries it. */
export interface ServerCampaign {
  version: number;
  name: string;
  currentTurn: number;
  houseRules: CampaignHouseRules | null;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const strOrNull = (v: unknown): v is string | null => typeof v === 'string' || v === null;

/**
 * Read a conflicting territory, or `null` if the payload is not one.
 *
 * Strict: every field must be the type it is declared as, and there are no
 * defaults. `null` here means "the server sent something this version does not
 * understand", which the panel says out loud while showing the raw payload —
 * useless, but true. A defaulted object would be an invented campaign state
 * presented to the group as theirs.
 */
export function serverTerritory(v: unknown): ServerTerritory | null {
  if (!isRecord(v)) return null;
  const { version, perk, perkSource, controlledByWarbandId, controlledByPlayerName } = v;
  if (typeof version !== 'number' || typeof perk !== 'string') return null;
  if (!(perkSource === 'published' || perkSource === 'campaign' || perkSource === null)) return null;
  if (!strOrNull(controlledByWarbandId) || !strOrNull(controlledByPlayerName)) return null;
  return { version, perk, perkSource, controlledByWarbandId, controlledByPlayerName };
}

/** As above, for a `campaign.settings` conflict. */
export function serverCampaign(v: unknown): ServerCampaign | null {
  if (!isRecord(v)) return null;
  const { version, name, currentTurn, houseRules } = v;
  if (typeof version !== 'number' || typeof name !== 'string' || typeof currentTurn !== 'number') return null;
  if (houseRules !== null && !isRecord(houseRules)) return null;
  return {
    version,
    name,
    currentTurn,
    houseRules: houseRules === null
      ? null
      : { reinforcementsKeepExploration: houseRules.reinforcementsKeepExploration === true },
  };
}

/**
 * `v1` in the key, like the warband outbox.
 *
 * A queue whose shape changes under a client that still has entries in it is a
 * queue that throws on read, and the entries it throws away are exactly the
 * edits it existed to protect. A new shape gets a new key.
 */
const OUTBOX_KEY = 'tc_campaign_outbox_v1';

/*
  Checked per call, not captured at module load.

  A module-level `const` freezes the answer at import time, which is wrong
  twice: it is evaluated during server rendering and never revisited, and it
  makes the queue untestable without a DOM because the module decides it has
  no storage before a test can give it one.
*/
const isBrowser = () => typeof window !== 'undefined' && !!window.localStorage;

function read(): CampaignOp[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CampaignOp[]) : [];
  } catch {
    return [];
  }
}

function write(ops: CampaignOp[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(ops));
  } catch {
    /* A full quota must not take the edit down with it: the change is already
       in the local campaign, and losing the queue costs a delayed push. */
  }
}

/**
 * A new operation id.
 *
 * Generated by the CLIENT, before the first attempt, and reused on every
 * retry — that is what lets the server recognise a repeat. An id minted per
 * attempt would make each retry a new operation, which is the bug this
 * protocol exists to prevent.
 */
export const newOpId = (): string =>
  (isBrowser() && window.crypto?.randomUUID)
    ? window.crypto.randomUUID()
    : `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const campaignOutbox = {
  pending: (): CampaignOp[] => read(),
  size: (): number => read().length,

  /**
   * Queue an operation. Order is preserved, because a batch's operations may
   * touch the same entity and the second only makes sense after the first.
   */
  add(op: CampaignOp): void {
    const ops = read();
    /* Re-queuing an id already waiting is a no-op rather than a duplicate: it
       would be sent twice, and the second would come back `skipped` anyway. */
    if (ops.some((o) => o.opId === op.opId)) return;
    ops.push(op);
    write(ops);
  },

  /** Remove operations the server has accounted for. */
  clear(opIds: string[]): void {
    if (!opIds.length) return;
    const gone = new Set(opIds);
    write(read().filter((o) => !gone.has(o.opId)));
  },

  /** Everything queued for one campaign, oldest first. */
  forCampaign(campaignId: string): CampaignOp[] {
    return read().filter((o) => o.campaignId === campaignId);
  },
};

export type PushResult =
  | { ok: true; applied: string[]; skipped: string[]; conflicts: SyncConflict[] }
  | { ok: false; reason: 'offline' | 'auth' | 'server'; detail: string };

/**
 * Send everything queued for one campaign.
 *
 * **Fetch before push, and stop if the fetch fails.** An offline device that
 * pushes blind overwrites a newer cloud copy with an older one, and a fetch
 * that cannot be made is not permission to write — it is the absence of the
 * information the push needed. The caller does the fetch; this refuses to run
 * without evidence it succeeded.
 *
 * **Applied and skipped both clear the queue.** `skipped` means the server had
 * already applied that operation, which is the retry working as designed.
 *
 * **Conflicts stay queued and are returned.** They are not resolved here:
 * `docs/DATABASE.md`'s rule is that a wrong answer is worse than a visible
 * question, and merging two people's edits without asking is a wrong answer
 * that nobody sees. The app shows them; the player decides.
 *
 * **Nothing is cleared when the request fails.** The distinction that matters
 * is between "the server said no" and "the server was not reached", and only
 * the first is an answer.
 */
export async function pushCampaignOps(
  campaignId: string,
  { fetched }: { fetched: boolean },
): Promise<PushResult> {
  if (!fetched) {
    return {
      ok: false,
      reason: 'offline',
      detail: 'The campaign could not be fetched, so nothing was pushed. '
            + 'Pushing without it would overwrite a newer copy with an older one.',
    };
  }

  const ops = campaignOutbox.forCampaign(campaignId);
  if (!ops.length) return { ok: true, applied: [], skipped: [], conflicts: [] };

  let res: Response;
  try {
    res = await fetch('/api/campaigns/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      /* `campaignId` is stripped: the endpoint takes it once, at the top, and
         an operation carrying its own would be a second place to disagree. */
      body: JSON.stringify({
        campaignId,
        ops: ops.map(({ campaignId: _drop, ...op }) => op),
      }),
    });
  } catch (e) {
    return { ok: false, reason: 'offline', detail: e instanceof Error ? e.message : 'Network error.' };
  }

  if (res.status === 401 || res.status === 403) {
    return { ok: false, reason: 'auth', detail: 'You are not allowed to change that campaign.' };
  }
  if (!res.ok) {
    /* Left queued. A 500 is not the server saying no, it is the server not
       answering, and discarding the queue would lose the work. */
    return { ok: false, reason: 'server', detail: `The server returned ${res.status}.` };
  }

  const body = await res.json() as {
    applied?: string[]; skipped?: string[]; conflicts?: SyncConflict[];
  };
  const applied = body.applied ?? [];
  const skipped = body.skipped ?? [];
  const conflicts = body.conflicts ?? [];

  campaignOutbox.clear([...applied, ...skipped]);
  return { ok: true, applied, skipped, conflicts };
}

/**
 * What the campaign's cloud copy is doing, as a value the UI can render.
 *
 * Deliberately the same five states as the warband indicator (`SyncState` in
 * `services/sync.ts`), plus one the warband queue cannot produce.
 *
 * A warband is pushed WHOLE, so there is nothing to conflict about: the last
 * writer wins by design and the merge decides on `editedAt`. A campaign is
 * edited by several people at once and pushed as operations, each stating the
 * version it was made against — so "the server moved on under this edit" is a
 * real outcome, and it is neither a failure nor a success. It is a question
 * for the player, which is why it is its own state rather than an `error`
 * with a special `reason`: colouring a conflict red says the app broke, and
 * hiding it inside `pending` says nothing happened.
 */
export type CampaignSyncState =
  /** No cloud identity — a local campaign, which is a supported way to play. */
  | { kind: 'local-only' }
  /**
   * Acquiring a cloud identity for the first time.
   *
   * Its own state rather than `syncing`, because it is a different act and it
   * takes visibly longer: publishing sends the campaign AND its whole map —
   * twelve theatres, or 32 published Carcass Front zones — in one request,
   * where a sync sends the operations queued since the last one. Calling both
   * "Syncing" would leave a player watching a spinner with no idea whether the
   * thing they just decided to do had started.
   */
  | { kind: 'publishing' }
  | { kind: 'syncing' }
  /** Everything this device did is in the cloud. */
  | { kind: 'synced'; at: string }
  /** Edits are held here and will go up when the server can be reached. */
  | { kind: 'pending'; count: number }
  /** The server had a newer copy of something this device edited. */
  | { kind: 'conflict'; conflicts: SyncConflict[]; pending: number }
  | { kind: 'error'; reason: 'offline' | 'unauthenticated' | 'server'; detail: string; pending: number };
