import { Warband } from '../types/warband';
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
      return data ? JSON.parse(data) : [];
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
   * Campaigns are LOCAL-ONLY. This does nothing, deliberately.
   *
   * What it used to do was not sync. It POSTed `{ action: 'create', ...campaign }`
   * on **every** campaign mutation — six call sites, each firing on an ordinary
   * edit — so each change minted a brand new campaign row rather than updating
   * one. There is no update action on the API and nothing reconciles the local
   * campaign's id with the server's, so nothing ever read those rows back.
   * Signed out, they were all filed under the shared
   * `commander@trenchline.org` account.
   *
   * It also swallowed every failure and returned `void`, so none of that was
   * visible: the UI could not tell saved from unauthenticated from offline —
   * the exact distinction `CloudResult` exists to make for warbands, three
   * functions above this one.
   *
   * Restoring it needs an API that can update a campaign, a rule about which
   * copy wins, and the outbox treatment warbands already have. Until then this
   * says so rather than generating rows nobody reads, and returns a
   * `CloudResult` so a caller that starts checking gets a truthful answer.
   */
  async syncCampaignToCloud(_campaign: Campaign): Promise<CloudResult<void>> {
    return { ok: false, reason: 'server', detail: 'Campaign cloud sync is not implemented.' };
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

