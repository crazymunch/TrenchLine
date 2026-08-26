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
      // Optional async cloud sync
      fetch('/api/warbands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(warbands[0] || {})
      }).catch(() => {});
    } catch (e) {
      console.warn('Storage save failed:', e);
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

  setActiveWarbandId(id: string): void {
    if (!isBrowser) return;
    try {
      localStorage.setItem(ACTIVE_WARBAND_KEY, id);
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
  }
};
