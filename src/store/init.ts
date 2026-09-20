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
import { emptyCampaign } from './seed';

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
    campaign: emptyCampaign(),
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

    All four are gone. A visitor with no warbands has no warbands, and the
    dashboard already says so — "Your command ledger is currently empty" —
    which is both true and more useful than a stranger's roster.
  */
  const warbands = storage.getWarbands();
  const activeWarbandId = storage.getActiveWarbandId() || warbands[0]?.id || null;
  const customUnits = storage.getCustomUnits();
  const customWeapons = storage.getCustomWeapons();
  /*
    The stored campaign, with the map it was saved with.

    This used to overwrite that map whenever it failed a shape test —

      territories.length >= 6 && territories[0].x !== undefined

    — and substitute the app's twelve world theatres. Both halves were wrong.
    Carcass Front zones carry no `x` at all (`carcassFrontTerritories` builds
    them from the published map, which has no pin coordinates), so a Carcass
    Front campaign failed the test on EVERY read and was reseated on the
    classic theatres, losing its 32 zones and the Outpost Bonuses the book
    prints. And a campaign with five territories or fewer failed on the count,
    including one whose organiser had set a house-rule perk on a zone.

    A campaign's map is the campaign's. Where there is none, there is none:
    `createCampaign` supplies one from the framework at the moment of creation,
    which is the only place that knows which framework was chosen.
  */
  const storedCampaign: Campaign = storage.getCampaign() || emptyCampaign();
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
