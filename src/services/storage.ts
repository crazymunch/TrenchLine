import { Warband } from '../types/warband';
import { Campaign } from '../types/campaign';
import { UnitProfile, WeaponProfile } from '../types/rules';

const WARBANDS_KEY = 'tc_warbands_v1';
const ACTIVE_WARBAND_KEY = 'tc_active_warband_id';
const CAMPAIGN_KEY = 'tc_campaign_v1';
const CUSTOM_UNITS_KEY = 'tc_custom_units_v1';
const CUSTOM_WEAPONS_KEY = 'tc_custom_weapons_v1';

const isBrowser = typeof window !== 'undefined';

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

  async syncWarbandToCloud(warband: Warband): Promise<void> {
    if (!isBrowser) return;
    try {
      await fetch('/api/warbands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(warband),
      });
    } catch (e) {
      console.warn('Cloud sync warband failed:', e);
    }
  },

  async deleteWarbandFromCloud(id: string): Promise<void> {
    if (!isBrowser) return;
    try {
      await fetch(`/api/warbands?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Cloud delete warband failed:', e);
    }
  },

  async fetchWarbandsFromCloud(): Promise<Warband[] | null> {
    if (!isBrowser) return null;
    try {
      const res = await fetch('/api/warbands');
      if (!res.ok) return null;
      const data = await res.json();
      if (Array.isArray(data.warbands)) {
        return data.warbands;
      }
      return null;
    } catch (e) {
      console.warn('Fetch warbands from cloud failed:', e);
      return null;
    }
  },

  async fetchAllWarbandsFromCloud(): Promise<Warband[] | null> {
    if (!isBrowser) return null;
    try {
      const res = await fetch('/api/warbands?all=true');
      if (!res.ok) return null;
      const data = await res.json();
      if (Array.isArray(data.warbands)) {
        return data.warbands;
      }
      return null;
    } catch (e) {
      console.warn('Fetch all warbands from cloud failed:', e);
      return null;
    }
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

  async syncCampaignToCloud(campaign: Campaign): Promise<void> {
    if (!isBrowser) return;
    try {
      await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...campaign }),
      });
    } catch (e) {
      console.warn('Cloud sync campaign failed:', e);
    }
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
  }
};

