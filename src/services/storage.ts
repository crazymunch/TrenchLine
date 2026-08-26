import { Warband } from '../types/warband';
import { Campaign } from '../types/campaign';
import { UnitProfile, WeaponProfile } from '../types/rules';

const WARBANDS_KEY = 'tc_warbands_v1';
const ACTIVE_WARBAND_KEY = 'tc_active_warband_id';
const CAMPAIGN_KEY = 'tc_campaign_v1';
const CUSTOM_UNITS_KEY = 'tc_custom_units_v1';
const CUSTOM_WEAPONS_KEY = 'tc_custom_weapons_v1';

export const storage = {
  getWarbands(): Warband[] {
    try {
      const data = localStorage.getItem(WARBANDS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveWarbands(warbands: Warband[]): void {
    localStorage.setItem(WARBANDS_KEY, JSON.stringify(warbands));
  },

  getActiveWarbandId(): string | null {
    return localStorage.getItem(ACTIVE_WARBAND_KEY);
  },

  setActiveWarbandId(id: string): void {
    localStorage.setItem(ACTIVE_WARBAND_KEY, id);
  },

  getCampaign(): Campaign | null {
    try {
      const data = localStorage.getItem(CAMPAIGN_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveCampaign(campaign: Campaign): void {
    localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
  },

  getCustomUnits(): UnitProfile[] {
    try {
      const data = localStorage.getItem(CUSTOM_UNITS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCustomUnits(units: UnitProfile[]): void {
    localStorage.setItem(CUSTOM_UNITS_KEY, JSON.stringify(units));
  },

  getCustomWeapons(): WeaponProfile[] {
    try {
      const data = localStorage.getItem(CUSTOM_WEAPONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCustomWeapons(weapons: WeaponProfile[]): void {
    localStorage.setItem(CUSTOM_WEAPONS_KEY, JSON.stringify(weapons));
  }
};
