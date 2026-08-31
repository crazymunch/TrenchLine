/**
 * The one read of persisted state, done once at store creation.
 *
 * This was the preamble of the `create()` callback. It is here so the slices
 * that need a seed value can take it as an argument instead of closing over a
 * variable defined 400 lines above them.
 */
import type { Warband } from '../types/warband';
import type { Campaign } from '../types/campaign';
import type { UnitProfile, WeaponProfile, RulesetVersion } from '../types/rules';
import { storage } from '../services/storage';
import { enrichUnitWithLore, SULTANATE_WARBAND_LORE, SULTANATE_MATCH_HISTORY, SULTANATE_WARBAND_SNAPSHOTS } from '../data/warbandLore';
import { DEFAULT_WORLD_THEATERS, defaultFreshCampaign, defaultSultanateWarband } from './seed';

export interface InitialState {
  warbands: Warband[];
  activeWarbandId: string | null;
  customUnits: UnitProfile[];
  customWeapons: WeaponProfile[];
  campaign: Campaign;
  theme: string;
  ruleset: RulesetVersion;
}

export function readInitialState(): InitialState {
  const storedWarbands = storage.getWarbands();
  const rawList = storedWarbands.length > 0 ? storedWarbands : [defaultSultanateWarband];

  const warbands = rawList.map((wb) => {
    const isSultanate = wb.factionId === 'iron-sultanate' || wb.name.toLowerCase().includes('qarn') || wb.name.toLowerCase().includes('sultanate');
    
    // Preserve the user's actual stored units if they exist
    const actualUnits = (wb.units && wb.units.length > 0)
      ? wb.units.map(enrichUnitWithLore)
      : (isSultanate ? SULTANATE_WARBAND_SNAPSHOTS[2].units : []);

    const actualSnapshots = (wb.snapshots && wb.snapshots.length > 0)
      ? wb.snapshots
      : (isSultanate ? SULTANATE_WARBAND_SNAPSHOTS : []);

    return {
      ...wb,
      units: actualUnits,
      snapshots: actualSnapshots,
      lore: wb.lore || (isSultanate ? SULTANATE_WARBAND_LORE.lore : undefined),
      motto: wb.motto || (isSultanate ? SULTANATE_WARBAND_LORE.motto : undefined),
      patron: wb.patron || (isSultanate ? SULTANATE_WARBAND_LORE.patron : undefined),
      chronicleLog: (wb.chronicleLog && wb.chronicleLog.length > 0) ? wb.chronicleLog : (isSultanate ? SULTANATE_WARBAND_LORE.chronicleLog : [])
    };
  });

  // Only seed to localStorage if it was empty
  if (storedWarbands.length === 0) {
    storage.saveWarbands(warbands);
  }
  const activeWarbandId = storage.getActiveWarbandId() || warbands[0]?.id || null;
  const customUnits = storage.getCustomUnits();
  const customWeapons = storage.getCustomWeapons();
  const rawCampaign = storage.getCampaign() || defaultFreshCampaign;
  const territories = (rawCampaign.territories && rawCampaign.territories.length >= 6 && rawCampaign.territories[0].x !== undefined)
    ? rawCampaign.territories
    : DEFAULT_WORLD_THEATERS;

  const storedCampaign: Campaign = {
    ...rawCampaign,
    territories,
    matches: (rawCampaign.matches && rawCampaign.matches.length > 0) ? rawCampaign.matches : SULTANATE_MATCH_HISTORY
  };
  const initialTheme = storage.getTheme();
  const initialRuleset = (storage.getRulesetVersion() as RulesetVersion) || '1.0.2';

  // Apply theme to document on init if browser
  if (typeof window !== 'undefined') {
    document.documentElement.setAttribute('data-theme', initialTheme);
  }

  return {
    warbands,
    activeWarbandId,
    customUnits,
    customWeapons,
    campaign: storedCampaign,
    theme: initialTheme,
    ruleset: initialRuleset,
  };
}
