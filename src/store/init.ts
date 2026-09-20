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
import type { PlaceholderOpponent } from '../types/opponent';
import { storage } from '../services/storage';
import { DEFAULT_WORLD_THEATERS, defaultFreshCampaign } from './seed';

export interface InitialState {
  warbands: Warband[];
  /** Opponents with no roster in this app. Their own list, never `warbands`. */
  opponents: PlaceholderOpponent[];
  activeWarbandId: string | null;
  customUnits: UnitProfile[];
  customWeapons: WeaponProfile[];
  campaign: Campaign;
  theme: string;
  ruleset: RulesetVersion;
}

/**
 * What the store starts with, before the browser's saved state is read.
 *
 * The store is created when its module is imported, which on the client is
 * BEFORE React hydrates. Reading `localStorage` there makes the first client
 * render differ from the HTML built at deploy time — which cannot see saved
 * state and therefore always renders "no warbands" — and React reports the
 * difference as a hydration mismatch (#418) on every view.
 *
 * So nothing is read here. `readInitialState` does the read, and the app calls
 * it from an effect once mounted: both passes then render the same empty state
 * and the saved one arrives immediately after. That is also why the prerendered
 * HTML stays useful offline — it is a real, if empty, page rather than a blank
 * waiting for JavaScript.
 */
export function emptyInitialState(): InitialState {
  return {
    warbands: [],
    opponents: [],
    activeWarbandId: null,
    customUnits: [],
    customWeapons: [],
    campaign: { ...defaultFreshCampaign, territories: DEFAULT_WORLD_THEATERS },
    theme: 'iron-sanctum',
    ruleset: '1.0.2',
  };
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

    This comment used to say "All four are gone". Only the first was: the
    localStorage seeding. `enrichUnitWithLore` and the `isSultanate` branch
    went on running in `newRecruitImporter.ts` and `store/slices/roster.ts`
    until FD-14's AI-1, and they were not idle — a second player's warband
    reached production carrying that player's lore, motto, patron and
    chronicle, byte-identical to the source file's, and his biographies on
    three of its models.

    NOW all four are gone, the file with them. A visitor with no warbands has
    no warbands, and the dashboard already says so — "Your command ledger is
    currently empty" — which is both true and more useful than a stranger's
    roster.
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
    opponents: storage.getOpponents(),
    activeWarbandId,
    customUnits,
    customWeapons,
    campaign: storedCampaign,
    theme: initialTheme,
    ruleset: initialRuleset,
  };
}
