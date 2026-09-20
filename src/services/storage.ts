import { Warband } from '../types/warband';
import { repairInventedFormulae } from './repairSavedRosters';
import { migrateFallen } from '../rules/fallen';
import type { CloudResult } from './sync';
import { Campaign } from '../types/campaign';
import { parseCampaign } from './campaignFromCloud';
import type { PlaceholderOpponent } from '../types/opponent';
import { parseSavedMatch, type SavedMatch } from '../rules/matchState';
import { parseBattle, type BattleRecord } from '../types/battle';
import { UnitProfile, WeaponProfile } from '../types/rules';

const WARBANDS_KEY = 'tc_warbands_v1';
const ACTIVE_WARBAND_KEY = 'tc_active_warband_id';
const CAMPAIGN_KEY = 'tc_campaign_v1';
const CUSTOM_UNITS_KEY = 'tc_custom_units_v1';
const CUSTOM_WEAPONS_KEY = 'tc_custom_weapons_v1';
/*
  Placeholder opponents, in their own key.

  Never in `tc_warbands_v1`. They are not the player's rosters: they must not
  appear in the roster picker, must not be counted as warbands, and must not be
  pushed by cloud sync, all of which follow from simply not being in that list.
*/
const OPPONENTS_KEY = 'tc_opponents_v1';
/*
  The match in progress.

  Its own key rather than a field on the warband: a match spans several
  warbands and two coalitions, and it is the one piece of state here that is
  deliberately THROWN AWAY when the game ends. Keeping it beside the rosters
  would make ending a match a roster write.
*/
const MATCH_KEY = 'tc_match_v1';
/*
  Battles that have been fought.

  Append-only in practice: a record is written when a match ends and is never
  edited afterwards. That is the point of it — a chronicle you can revise is a
  chronicle nobody trusts.
*/
const BATTLES_KEY = 'tc_battles_v1';

const isBrowser = typeof window !== 'undefined';

/** One live match, as the campaign's listing shows it. Never a board. */
export interface LiveMatchSummary {
  id: string;
  hostId: string;
  hostName: string | null;
  revision: number;
  startedAt: string;
  updatedAt: string;
}

/** What an invite code shows someone who is not in the campaign yet. */
export interface CampaignInvitePreview {
  id: string;
  name: string;
  memberCount: number;
  maxWarbandDucats: number;
}

/**
 * One fetch wrapper, so every cloud call classifies its failure the same way.
 *
 * 401 is called out separately because it is not an error the user should be
 * asked to retry — it means "sign in to sync", which is a normal state of the
 * app, not a fault.
 */
async function request<T>(
  url: string,
  init: RequestInit,
  parse: (data: any) => T,
): Promise<CloudResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    // A rejected fetch is the network, not the server: DNS, no signal, CORS,
    // or the tab going offline mid-request.
    return { ok: false, reason: 'offline', detail: e instanceof Error ? e.message : String(e) };
  }

  if (res.status === 401 || res.status === 403) {
    return { ok: false, reason: 'unauthenticated', detail: `HTTP ${res.status}` };
  }
  if (!res.ok) {
    /*
      The server's own sentence, when it wrote one.

      `HTTP 409` is not something to show a person who has just typed an invite
      code — "You already have a warband in that campaign" is, and the route
      already says exactly that. Every failure from these routes carries an
      `error` string (see `lib/api/http.ts`), so the status is the fallback
      rather than the answer.
    */
    const message = await res.json()
      .then((b) => (typeof b?.error === 'string' ? b.error : null))
      .catch(() => null);
    return { ok: false, reason: 'server', detail: message ?? `HTTP ${res.status}` };
  }

  try {
    return { ok: true, data: parse(await res.json().catch(() => ({}))) };
  } catch (e) {
    return { ok: false, reason: 'server', detail: e instanceof Error ? e.message : String(e) };
  }
}

export const storage = {
  getWarbands(): Warband[] {
    if (!isBrowser) return [];
    try {
      const data = localStorage.getItem(WARBANDS_KEY);
      if (!data) return [];

      /*
        The one place a saved roster enters the app, and therefore the place to
        repair one. Rosters written while the invented Alchemical Formulae were
        on offer still carry them; see `repairInventedFormulae`.

        Written back immediately so the repair happens once rather than on every
        read, and reported rather than done quietly — a roster's Ducat total
        changing without explanation is worse than the bug.
      */
      const { warbands: repaired, repairs } = repairInventedFormulae(JSON.parse(data));

      /*
        A roster written before the dead left the Roster carries them in
        `units` behind `isDead: true` — which is the state that let the
        builder count a dead model's Ducats and Play Mode deploy it. Moving
        them here means the rest of the app only ever sees one shape.

        Driven by the flag rather than a `schemaVersion`, because the flag is
        the evidence and a version number is a claim an older writer may not
        have made. Idempotent, so a second read finds nothing to move.
      */
      const warbands = repaired.map(migrateFallen);
      const moved = warbands.reduce(
        (n, w, i) => n + Math.max(0, (w.fallen?.length ?? 0) - (repaired[i].fallen?.length ?? 0)), 0);
      if (moved) {
        console.warn(
          `TrenchLine: moved ${moved} fallen model(s) out of the active roster. ` +
          'The Trauma Table removes a dead model from the Warband Roster; they are ' +
          'kept under `fallen` and no longer counted, offered or deployed.',
        );
      }

      if (repairs.length || moved) {
        localStorage.setItem(WARBANDS_KEY, JSON.stringify(warbands));
      }
      if (repairs.length) {
        for (const r of repairs) {
          console.warn(
            `TrenchLine: removed ${r.removed.join(', ')} from ${r.unit} (${r.warband}) ` +
            `and refunded ${r.ducatsRefunded} Ducats — not an entry in any published list.`,
          );
        }
      }
      return warbands;
    } catch {
      return [];
    }
  },

  saveWarbands(warbands: Warband[]): void {
    if (!isBrowser) return;
    try {
      localStorage.setItem(WARBANDS_KEY, JSON.stringify(warbands));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  },

  /*
    The cloud calls return what happened rather than swallowing it.

    They used to catch their own errors, log a warning and return `null` or
    `undefined`. The caller could not then tell "the cloud has nothing for you"
    from "the request never left the building" — and the sync merge read the
    first meaning, treated the cloud as empty and pushed the local list over
    the top. An offline sync could overwrite good cloud data with a stale local
    copy, and the only trace was a console warning nobody was reading.

    `CloudResult` makes the distinction a value. A caller that ignores it gets
    a type error, which is the point.
  */
  async syncWarbandToCloud(warband: Warband): Promise<CloudResult<void>> {
    if (!isBrowser) return { ok: false, reason: 'offline', detail: 'not a browser' };
    return request<void>('/api/warbands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(warband),
    }, () => undefined);
  },

  async deleteWarbandFromCloud(id: string): Promise<CloudResult<void>> {
    if (!isBrowser) return { ok: false, reason: 'offline', detail: 'not a browser' };
    return request<void>(
      `/api/warbands?id=${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      () => undefined,
    );
  },

  async fetchWarbandsFromCloud(): Promise<CloudResult<Warband[]>> {
    if (!isBrowser) return { ok: false, reason: 'offline', detail: 'not a browser' };
    return request<Warband[]>('/api/warbands', {}, (data) =>
      Array.isArray(data?.warbands) ? data.warbands : []);
  },

  async fetchAllWarbandsFromCloud(): Promise<CloudResult<Warband[]>> {
    if (!isBrowser) return { ok: false, reason: 'offline', detail: 'not a browser' };
    return request<Warband[]>('/api/warbands?all=true', {}, (data) =>
      Array.isArray(data?.warbands) ? data.warbands : []);
  },

  getActiveWarbandId(): string | null {
    if (!isBrowser) return null;
    try {
      return localStorage.getItem(ACTIVE_WARBAND_KEY);
    } catch {
      return null;
    }
  },

  setActiveWarbandId(id: string | null): void {
    if (!isBrowser) return;
    try {
      if (id) {
        localStorage.setItem(ACTIVE_WARBAND_KEY, id);
      } else {
        localStorage.removeItem(ACTIVE_WARBAND_KEY);
      }
    } catch (e) {
      console.warn('Set active warband failed:', e);
    }
  },

  getCampaign(): Campaign | null {
    if (!isBrowser) return null;
    try {
      const data = localStorage.getItem(CAMPAIGN_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveCampaign(campaign: Campaign): void {
    if (!isBrowser) return;
    try {
      localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
    } catch (e) {
      console.warn('Campaign save failed:', e);
    }
  },

  /**
   * The campaign's cloud copy, read before anything is pushed to it.
   *
   * **This is the gate, not a merge.** `docs/CAMPAIGN-SYNC.md` requires a
   * fetch before every push and requires the push to stop if that fetch fails:
   * an offline device that writes blind overwrites a newer cloud copy with an
   * older one, and a fetch that cannot be made is not permission to write. So
   * what comes back is used for exactly two things — proof the server is
   * reachable, and proof this campaign is still there and still ours.
   *
   * Deliberately NOT used to adopt the server's version numbers. The client
   * chains its own as it queues (see `queueOp` in the campaign slice), and
   * overwriting that chain mid-flight would make the operations already in the
   * outbox state a version they were not made against. Where the two genuinely
   * disagree, the push comes back with a conflict carrying the server's copy,
   * and the app shows it.
   *
   * What this replaces: a `syncCampaignToCloud` that POSTed
   * `{ action: 'create', ...campaign }` on **every** campaign mutation, so
   * each edit minted a new campaign row that nothing ever read back — and
   * swallowed every failure, so the UI could not tell saved from offline. The
   * update path it lacked is now `POST /api/campaigns/sync`, and the
   * fire-and-forget calls are gone rather than pointed at it.
   */
  /**
   * Give a campaign a cloud identity, under an id this device minted.
   *
   * The gap SYNC-2 closes. `createCampaign` mints `camp-<timestamp>` locally
   * and always has, which is not an id the API would recognise — so every
   * campaign in the app was local, the outbox never had anywhere to push, and
   * the indicator said "On this device" forever.
   *
   * **The id is minted here, before the request goes out**, and the caller
   * saves it before awaiting. Publishing sends the whole map in one POST; if
   * the response is lost the retry has to name the same campaign or it makes a
   * second one, and a server-assigned id gives the client nothing to retry
   * with. `crypto.randomUUID` rather than a counter or a timestamp: it has to
   * be unguessable, because a client-supplied primary key can always be aimed
   * at a row that already exists — the route answers a miss with 409 and
   * nothing else.
   *
   * `alreadyPublished` comes back true when the server recognised the id as
   * this account's own campaign. That is the retry working, and the server
   * copy is returned untouched rather than overwritten: a retry that rewrote
   * the campaign would undo every edit made between the two attempts.
   */
  async publishCampaignToCloud(
    campaign: Campaign,
    cloudId: string,
  ): Promise<CloudResult<{ id: string; inviteCode: string; alreadyPublished: boolean }>> {
    if (!isBrowser) return { ok: false, reason: 'offline', detail: 'not a browser' };

    return request('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'publish',
        cloudId,
        name: campaign.name,
        framework: campaign.framework,
        houseRules: campaign.houseRules,
        currentTurn: campaign.currentTurn,
        maxWarbandDucats: campaign.maxWarbandDucats,
        gloryVictoryThreshold: campaign.gloryVictoryThreshold,
        /*
          The map as this device holds it, each territory carrying the id it
          has here. The server stores that as `localId` beside a primary key
          of its own, which is what lets a later `territory.perk` operation
          name a territory without this device keeping a mapping.
        */
        territories: campaign.territories.map((t) => ({
          localId: t.id,
          name: t.name,
          type: t.type,
          perk: t.perk ?? '',
          perkSource: t.perkSource,
          description: t.description ?? '',
        })),
      }),
    }, (data) => {
      const c = data?.campaign;
      /* Thrown, not defaulted: `request` turns it into a `server` failure. A
         campaign the server did not return is not a campaign at some id we
         made up, and storing a `cloudId` the server never confirmed would
         point every later push at a row that does not exist. */
      if (!c?.id) throw new Error('The server returned no campaign.');
      if (typeof c.inviteCode !== 'string') {
        throw new Error('The campaign came back without an invite code.');
      }
      return {
        id: String(c.id),
        inviteCode: c.inviteCode,
        alreadyPublished: Boolean(data?.alreadyPublished),
      };
    });
  },

  /**
   * What an invite code names, before spending it.
   *
   * A name and a size, which is what the route will give a caller who is not
   * in the campaign yet: holding a code is not membership, and the code
   * travels through channels nobody here controls. Enough to tell you that
   * you have the right campaign and no more.
   */
  async previewCampaignInvite(code: string): Promise<CloudResult<CampaignInvitePreview>> {
    if (!isBrowser) return { ok: false, reason: 'offline', detail: 'not a browser' };
    return request(`/api/campaigns?code=${encodeURIComponent(code)}`, {}, (data) => {
      const c = data?.campaign;
      /* Thrown rather than defaulted, per the rule this file lives under: a
         preview the server did not return is not a campaign called "" with
         nobody in it. */
      if (!c?.id || typeof c.name !== 'string') {
        throw new Error('The server returned no campaign.');
      }
      return {
        id: String(c.id),
        name: c.name,
        memberCount: Number(c._count?.members ?? 0),
        maxWarbandDucats: Number(c.maxWarbandDucats ?? 0),
      };
    });
  },

  /**
   * Spend the code: put one of your warbands into that campaign.
   *
   * `alreadyMember` comes back true when this warband was already in it. That
   * is the retry working — the first attempt landed and the response was lost
   * — and it is a success, not a duplicate: the route returns the campaign
   * either way rather than letting the unique constraint produce a 500.
   *
   * Only the code, the warband and an optional display name are sent. The
   * warband's NAME and FACTION are read off the row by the server; a client
   * that could state them could enter a Heretic roster in the standings as
   * New Antioch.
   */
  async joinCampaignWithInvite(
    code: string,
    warbandId: string,
    playerName?: string,
  ): Promise<CloudResult<{ id: string; alreadyMember: boolean }>> {
    if (!isBrowser) return { ok: false, reason: 'offline', detail: 'not a browser' };
    return request('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'join',
        inviteCode: code,
        warbandId,
        ...(playerName ? { playerName } : {}),
      }),
    }, (data) => {
      const c = data?.campaign;
      if (!c?.id) throw new Error('The server returned no campaign.');
      return { id: String(c.id), alreadyMember: Boolean(data?.alreadyMember) };
    });
  },

  /**
   * The whole campaign, mapped into the shape this device plays.
   *
   * SYNC-5, and the counterpart to `publishCampaignToCloud`. Until now the
   * only read was `fetchCampaignFromCloud` below, which takes the id and the
   * version and discards everything else — enough to push against, and nothing
   * a device could play. So a player who spent an invite code got a real
   * membership and a device that never showed them the campaign.
   *
   * Membership is what the server checks: a campaign the caller is not in is a
   * 404, so this cannot be used to read a campaign by guessing its id.
   *
   * `parseCampaign` throws on a response that is not a campaign, and `request`
   * turns that into a `server` failure — a malformed payload becomes a message
   * on screen rather than an empty map.
   */
  async pullCampaignFromCloud(campaignId: string): Promise<CloudResult<Campaign>> {
    if (!isBrowser) return { ok: false, reason: 'offline', detail: 'not a browser' };
    return request(
      `/api/campaigns?id=${encodeURIComponent(campaignId)}`,
      {},
      (data) => parseCampaign(data?.campaign),
    );
  },

  /**
   * Push the board, as this device holds it.
   *
   * LIVE-1. A SNAPSHOT, not a stream of operations — see `docs/LIVE-MODE.md`
   * and the route. The caller coalesces: this is cheap but it is not free, and
   * a write per wound stepper tap is a write per keystroke.
   */
  async pushLiveMatch(
    matchId: string,
    campaignId: string,
    state: unknown,
  ): Promise<CloudResult<{ revision: number }>> {
    if (!isBrowser) return { ok: false, reason: 'offline', detail: 'not a browser' };
    return request('/api/campaigns/live', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, campaignId, state }),
    }, (data) => {
      const r = data?.match?.revision;
      /* Thrown rather than defaulted: a revision the server did not send is
         not revision 1, and storing one would make the next poll think it
         already had the newest board. */
      if (typeof r !== 'number') throw new Error('The server returned no revision.');
      return { revision: r };
    });
  },

  /**
   * Read the board, cheaply.
   *
   * `knownRevision` becomes `If-None-Match`, and a 304 comes back as
   * `unchanged` — which is the normal answer while nobody is moving, and the
   * reason a two-second poll is affordable at all. It is a SUCCESS, not a
   * failure: a watcher that treated it as an error would show a spinner over
   * a board that is simply still.
   */
  async pollLiveMatch(
    matchId: string,
    knownRevision?: number,
  ): Promise<CloudResult<{ unchanged: true } | { unchanged: false; revision: number; state: unknown }>> {
    if (!isBrowser) return { ok: false, reason: 'offline', detail: 'not a browser' };

    const headers: Record<string, string> = {};
    if (knownRevision !== undefined) headers['If-None-Match'] = `W/"${knownRevision}"`;

    let res: Response;
    try {
      res = await fetch(`/api/campaigns/live?id=${encodeURIComponent(matchId)}`, { headers });
    } catch (e) {
      return { ok: false, reason: 'offline', detail: e instanceof Error ? e.message : String(e) };
    }
    /* Handled here rather than in `request`, because 304 is not a body this
       can parse and not an error either. */
    if (res.status === 304) return { ok: true, data: { unchanged: true } };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, reason: 'unauthenticated', detail: `HTTP ${res.status}` };
    }
    if (!res.ok) {
      const message = await res.json()
        .then((b) => (typeof b?.error === 'string' ? b.error : null))
        .catch(() => null);
      return { ok: false, reason: 'server', detail: message ?? `HTTP ${res.status}` };
    }

    try {
      const data = await res.json();
      const m = data?.match;
      if (typeof m?.revision !== 'number') throw new Error('The match came back without a revision.');
      return { ok: true, data: { unchanged: false, revision: m.revision, state: m.state } };
    } catch (e) {
      return { ok: false, reason: 'server', detail: e instanceof Error ? e.message : String(e) };
    }
  },

  /** What is live in a campaign right now. A name and a clock, never a board. */
  async listLiveMatches(campaignId: string): Promise<CloudResult<LiveMatchSummary[]>> {
    if (!isBrowser) return { ok: false, reason: 'offline', detail: 'not a browser' };
    return request(
      `/api/campaigns/live?campaignId=${encodeURIComponent(campaignId)}`,
      {},
      (data) => {
        if (!Array.isArray(data?.matches)) throw new Error('The server returned no matches.');
        return data.matches as LiveMatchSummary[];
      },
    );
  },

  /** End the match. The host's to call, and the server enforces that. */
  async endLiveMatch(matchId: string): Promise<CloudResult<void>> {
    if (!isBrowser) return { ok: false, reason: 'offline', detail: 'not a browser' };
    return request(
      `/api/campaigns/live?id=${encodeURIComponent(matchId)}`,
      { method: 'DELETE' },
      () => undefined,
    );
  },

  async fetchCampaignFromCloud(campaignId: string): Promise<CloudResult<{ id: string; version: number }>> {
    if (!isBrowser) return { ok: false, reason: 'offline', detail: 'not a browser' };
    return request(`/api/campaigns?id=${encodeURIComponent(campaignId)}`, {}, (data) => {
      const c = data?.campaign;
      /* Thrown rather than defaulted: `request` turns it into a `server`
         failure, and a campaign the server did not return is not a campaign
         at version 1. Inventing one here would push against a row that may
         not exist. */
      if (!c?.id) throw new Error('The server returned no campaign.');
      /* No default for a missing version. The column has one — every row is at
         least 1 — so its absence means the response is not the shape this
         thinks it is, and guessing turns that into a push against a version
         nobody holds. */
      if (typeof c.version !== 'number') throw new Error('The campaign came back without a version.');
      return { id: String(c.id), version: c.version };
    });
  },

  getCustomUnits(): UnitProfile[] {
    if (!isBrowser) return [];
    try {
      const data = localStorage.getItem(CUSTOM_UNITS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCustomUnits(units: UnitProfile[]): void {
    if (!isBrowser) return;
    try {
      localStorage.setItem(CUSTOM_UNITS_KEY, JSON.stringify(units));
    } catch (e) {
      console.warn('Custom units save failed:', e);
    }
  },

  getOpponents(): PlaceholderOpponent[] {
    if (!isBrowser) return [];
    try {
      const data = localStorage.getItem(OPPONENTS_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      // A hand-edited or half-written key is discarded rather than handed on
      // as a list of `undefined`s — the same rule the warband reader follows.
      return Array.isArray(parsed) ? parsed.filter((o) => o && o.id && o.factionId) : [];
    } catch {
      return [];
    }
  },

  saveOpponents(opponents: PlaceholderOpponent[]): void {
    if (!isBrowser) return;
    try {
      localStorage.setItem(OPPONENTS_KEY, JSON.stringify(opponents));
    } catch (e) {
      console.warn('Opponents save failed:', e);
    }
  },

  getMatch(): SavedMatch | null {
    if (!isBrowser) return null;
    try {
      const data = localStorage.getItem(MATCH_KEY);
      return data ? parseSavedMatch(JSON.parse(data)) : null;
    } catch {
      // A corrupt match is no match. Resuming half of a scorecard is worse
      // than starting one, because only the second is obvious.
      return null;
    }
  },

  saveMatch(match: SavedMatch): void {
    if (!isBrowser) return;
    try {
      localStorage.setItem(MATCH_KEY, JSON.stringify(match));
    } catch (e) {
      console.warn('Match save failed:', e);
    }
  },

  clearMatch(): void {
    if (!isBrowser) return;
    try {
      localStorage.removeItem(MATCH_KEY);
      localStorage.removeItem(BATTLES_KEY);
    } catch (e) {
      console.warn('Match clear failed:', e);
    }
  },

  getBattles(): BattleRecord[] {
    if (!isBrowser) return [];
    try {
      const data = localStorage.getItem(BATTLES_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      // One unreadable battle does not cost the others: a chronicle is a list
      // of independent records, not a document that fails as a whole.
      return parsed.map(parseBattle).filter((b): b is BattleRecord => b !== null);
    } catch {
      return [];
    }
  },

  /** Append one. Newest last; the view sorts. */
  addBattle(battle: BattleRecord): BattleRecord[] {
    if (!isBrowser) return [];
    const next = [...this.getBattles().filter((b) => b.id !== battle.id), battle];
    try {
      localStorage.setItem(BATTLES_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Battle save failed:', e);
    }
    return next;
  },

  deleteBattle(id: string): BattleRecord[] {
    if (!isBrowser) return [];
    const next = this.getBattles().filter((b) => b.id !== id);
    try {
      localStorage.setItem(BATTLES_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Battle delete failed:', e);
    }
    return next;
  },

  getCustomWeapons(): WeaponProfile[] {
    if (!isBrowser) return [];
    try {
      const data = localStorage.getItem(CUSTOM_WEAPONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCustomWeapons(weapons: WeaponProfile[]): void {
    if (!isBrowser) return;
    try {
      localStorage.setItem(CUSTOM_WEAPONS_KEY, JSON.stringify(weapons));
    } catch (e) {
      console.warn('Custom weapons save failed:', e);
    }
  },

  clearAllData(): void {
    if (!isBrowser) return;
    try {
      localStorage.removeItem(WARBANDS_KEY);
      localStorage.removeItem(ACTIVE_WARBAND_KEY);
      localStorage.removeItem(CAMPAIGN_KEY);
      localStorage.removeItem(CUSTOM_UNITS_KEY);
      localStorage.removeItem(CUSTOM_WEAPONS_KEY);
      localStorage.removeItem(OPPONENTS_KEY);
      localStorage.removeItem(MATCH_KEY);
      localStorage.removeItem(BATTLES_KEY);
      localStorage.removeItem('tc_theme_id');
    } catch (e) {
      console.warn('Clear data failed:', e);
    }
  },

  getTheme(): string {
    if (!isBrowser) return 'iron-sanctum';
    try {
      return localStorage.getItem('tc_theme_id') || 'iron-sanctum';
    } catch {
      return 'iron-sanctum';
    }
  },

  saveTheme(themeId: string): void {
    if (!isBrowser) return;
    try {
      localStorage.setItem('tc_theme_id', themeId);
    } catch (e) {
      console.warn('Theme save failed:', e);
    }
  },

  getRulesetVersion(): string {
    if (!isBrowser) return '1.0.2';
    try {
      return localStorage.getItem('tc_ruleset_version') || '1.0.2';
    } catch {
      return '1.0.2';
    }
  },

  saveRulesetVersion(version: string): void {
    if (!isBrowser) return;
    try {
      localStorage.setItem('tc_ruleset_version', version);
    } catch (e) {
      console.warn('Ruleset save failed:', e);
    }
  },

  getFavouriteUnits(): any[] {
    if (!isBrowser) return [];
    try {
      const data = localStorage.getItem('tc_favourite_units_v1');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveFavouriteUnits(units: any[]): void {
    if (!isBrowser) return;
    try {
      localStorage.setItem('tc_favourite_units_v1', JSON.stringify(units));
    } catch (e) {
      console.warn('Favourites save failed:', e);
    }
  }
};

