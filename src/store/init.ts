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
import { DEFAULT_WORLD_THEATERS, defaultFreshCampaign } from './seed';

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
  /*
    What the browser has, and nothing else.

    This used to seed one specific player's warband — Al-Qarn Rihla, nine
    models, its lore, its match history — into every browser that arrived with
    empty storage, so a stranger opening the site was shown someone else's
    warband as if it were their own. It then went further and injected that
    player's content into warbands that were not theirs:

      isSultanate           any warband whose faction was iron-sultanate, or
                            whose NAME contained "qarn" or "sultanate", took
                            that player's lore, motto, patron and chronicle
                            wherever its own were empty
      enrichUnitWithLore    any model whose name matched a pattern took that
                            player's biography, quote, titles and deeds
      SULTANATE_MATCH_HISTORY  every campaign with no matches of its own was
                            given that player's battle record

    All four are gone. A visitor with no warbands has no warbands, and the
    dashboard already says so — "Your command ledger is currently empty" —
    which is both true and more useful than a stranger's roster.
  */
  const warbands = storage.getWarbands();
  const activeWarbandId = storage.getActiveWarbandId() || warbands[0]?.id || null;
  const customUnits = storage.getCustomUnits();
  const customWeapons = storage.getCustomWeapons();
  const rawCampaign = storage.getCampaign() || defaultFreshCampaign;
  const territories = (rawCampaign.territories && rawCampaign.territories.length >= 6 && rawCampaign.territories[0].x !== undefined)
    ? rawCampaign.territories
    : DEFAULT_WORLD_THEATERS;

  const storedCampaign: Campaign = { ...rawCampaign, territories };
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
