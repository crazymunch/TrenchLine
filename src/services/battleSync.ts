/**
 * The Chronicle's cloud half.
 *
 * A battle record is written on the ONE device that ran the tracker. That was
 * the whole of CHRON-1 and it is the wrong place for it twice over: in a 2v2
 * the other three players fought the same game and had no record of it at all,
 * and the recording device losing its browser storage lost the lot.
 *
 * ## Local first, always
 *
 * The record is written to `localStorage` BEFORE this is called and is never
 * removed by a failure here. A phone at a club with no signal must still end a
 * match and keep what happened; the push is an extra copy, not the copy.
 *
 * ## No fallbacks
 *
 * Every function here reports what it actually knows. A failed fetch returns
 * an error the view renders — it does NOT return an empty list, because "the
 * cloud has no battles for you" and "the cloud could not be reached" are
 * different facts and only one of them is an answer. `services/githubSync.ts`
 * is the shipped example of getting this wrong, and the rule is rule 2 in
 * CLAUDE.md.
 *
 * ## No merge
 *
 * Unlike a roster, a battle record is immutable — written once when the match
 * ends and never edited. So there is nothing to reconcile: a record present in
 * both places is the same record, and `id` is enough to say so. The whole of
 * `campaignSync.ts` (versions, operations, conflicts, a human to ask) exists
 * for a problem this does not have.
 */
import { parseBattle, type BattleRecord } from '@/types/battle';

/** Why a cloud read or write did not happen. Rendered, not swallowed. */
export type BattleSyncFailure =
  /** The request never reached the server. */
  | { kind: 'offline'; detail: string }
  /** Signed out. The Chronicle is local-only, which is a supported way to play. */
  | { kind: 'signed-out' }
  /** The server answered, and the answer was no. */
  | { kind: 'refused'; detail: string };

export interface CloudBattle extends BattleRecord {
  /** Context about the ROW, not part of the immutable record. */
  cloud: {
    ownerName: string;
    campaignId: string | null;
    visibility: 'PRIVATE' | 'CAMPAIGN' | 'PUBLIC';
  };
}

export type FetchResult =
  | { ok: true; battles: CloudBattle[] }
  | { ok: false; failure: BattleSyncFailure };

export type PushResult =
  | { ok: true; created: boolean }
  | { ok: false; failure: BattleSyncFailure };

/** One place that turns a non-2xx into a failure, so no caller invents one. */
function failureFor(status: number): BattleSyncFailure {
  if (status === 401) return { kind: 'signed-out' };
  if (status === 403) return { kind: 'refused', detail: 'That battle is not yours.' };
  return { kind: 'refused', detail: `The server returned ${status}.` };
}

/**
 * Every battle the signed-in account may read.
 *
 * What comes back is re-validated with `parseBattle` rather than trusted: a
 * row written by an older build is exactly the case that function exists for,
 * and a record it rejects is dropped rather than rendered half-formed.
 */
export async function fetchCloudBattles(): Promise<FetchResult> {
  let res: Response;
  try {
    res = await fetch('/api/battles', { headers: { Accept: 'application/json' } });
  } catch (e) {
    return {
      ok: false,
      failure: { kind: 'offline', detail: e instanceof Error ? e.message : 'Network error.' },
    };
  }

  if (!res.ok) return { ok: false, failure: failureFor(res.status) };

  let body: { battles?: unknown[] };
  try {
    body = await res.json() as { battles?: unknown[] };
  } catch {
    return { ok: false, failure: { kind: 'refused', detail: 'The server sent something unreadable.' } };
  }

  const battles: CloudBattle[] = [];
  for (const raw of body.battles ?? []) {
    const record = parseBattle(raw);
    if (!record) continue;
    const cloud = (raw as { cloud?: CloudBattle['cloud'] }).cloud;
    battles.push({
      ...record,
      cloud: {
        ownerName: cloud?.ownerName || 'Crusade Commander',
        campaignId: cloud?.campaignId ?? null,
        visibility: cloud?.visibility ?? 'CAMPAIGN',
      },
    });
  }
  return { ok: true, battles };
}

/**
 * Push a battle to the cloud.
 *
 * Safe to call twice with the same record: the endpoint is idempotent on the
 * record's own id, so a retry after a lost response acknowledges the row
 * already there rather than writing a second copy of the same game. That
 * matters because the normal condition at a table in a club is a phone that
 * half-loses its signal.
 */
export async function pushBattle(
  battle: BattleRecord,
  opts: { campaignId?: string } = {},
): Promise<PushResult> {
  /* The record, plus the one field the server needs and the record does not
     carry: which campaign — if any — decides who else may read it. The
     server checks the caller is in it; this only names it. */
  const payload = {
    id: battle.id,
    endedAt: battle.endedAt,
    scenarioId: battle.scenarioId,
    scenarioName: battle.scenarioName,
    turns: battle.turns,
    sides: battle.sides,
    deeds: battle.deeds,
    ...(battle.coalitionTotals ? { coalitionTotals: battle.coalitionTotals } : {}),
    ...(battle.weather ? { weather: battle.weather } : {}),
    ...(battle.campaignMatchId ? { campaignMatchId: battle.campaignMatchId } : {}),
    ...(opts.campaignId ? { campaignId: opts.campaignId } : {}),
  };

  let res: Response;
  try {
    res = await fetch('/api/battles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return {
      ok: false,
      failure: { kind: 'offline', detail: e instanceof Error ? e.message : 'Network error.' },
    };
  }

  if (!res.ok) return { ok: false, failure: failureFor(res.status) };

  const body = await res.json().catch(() => ({})) as { created?: boolean };
  return { ok: true, created: body.created === true };
}

/** Remove a battle from the cloud. The recorder only; the server enforces it. */
export async function deleteCloudBattle(id: string): Promise<PushResult> {
  let res: Response;
  try {
    res = await fetch(`/api/battles?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (e) {
    return {
      ok: false,
      failure: { kind: 'offline', detail: e instanceof Error ? e.message : 'Network error.' },
    };
  }
  if (!res.ok) return { ok: false, failure: failureFor(res.status) };
  return { ok: true, created: false };
}

/**
 * One list from the two copies.
 *
 * Local wins on a tie, and the reason is not arbitrary: the device that
 * recorded a battle holds the record as it was written, while the cloud copy
 * has been through a serialisation and a re-parse. They should be identical —
 * and where they are not, the original is the one to keep.
 *
 * Sorted by when the match ENDED, never by when a row arrived. A phone that
 * recorded a battle offline and pushed it two days later must not sort above
 * a game played since.
 */
export function mergeBattles(local: BattleRecord[], cloud: CloudBattle[]): BattleRecord[] {
  const byId = new Map<string, BattleRecord>();
  for (const b of cloud) byId.set(b.id, b);
  for (const b of local) byId.set(b.id, b);
  return [...byId.values()].sort((a, b) => b.endedAt.localeCompare(a.endedAt));
}

/** True where a merged record came from someone else's device. */
export function isFromCloud(b: BattleRecord, localIds: Set<string>): boolean {
  return !localIds.has(b.id);
}
