import { Warband } from '../types/warband';
import { repairInventedFormulae } from './repairSavedRosters';
import type { CloudResult } from './sync';
import { Campaign } from '../types/campaign';
import { UnitProfile, WeaponProfile } from '../types/rules';

const WARBANDS_KEY = 'tc_warbands_v1';
const ACTIVE_WARBAND_KEY = 'tc_active_warband_id';
const CAMPAIGN_KEY = 'tc_campaign_v1';
const CUSTOM_UNITS_KEY = 'tc_custom_units_v1';
const CUSTOM_WEAPONS_KEY = 'tc_custom_weapons_v1';

const isBrowser = typeof window !== 'undefined';

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
    return { ok: false, reason: 'server', detail: `HTTP ${res.status}` };
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
      const { warbands, repairs } = repairInventedFormulae(JSON.parse(data));
      if (repairs.length) {
        localStorage.setItem(WARBANDS_KEY, JSON.stringify(warbands));
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

