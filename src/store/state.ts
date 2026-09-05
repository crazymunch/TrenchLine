/**
 * The store's shared surface.
 *
 * `useStore.ts` was 2,471 lines covering warbands, units, progression, play
 * mode, the campaign, the customizer and the theme in one object literal —
 * every domain in one file, which is what Phase 4.2 exists to undo. The
 * behaviour now lives in `slices/`; this is the type they are all written
 * against.
 *
 * `AppState` stays whole rather than being cut into seven interfaces. Zustand's
 * slice pattern types each creator as
 * `StateCreator<AppState, [], [], ItsOwnKeys>` precisely so `get()` still
 * reaches the whole store, and seven partial types importing each other would
 * be the same coupling spread over more files. The split that matters is of the
 * 2,000 lines of *behaviour*, not of the type.
 */
import { Warband, ActiveUnit, UnitTitleRecord } from '../types/warband';
import { Campaign, CampaignFramework, CampaignHouseRules, CasualtyRecord, TerritoryNode } from '../types/campaign';
import { UnitProfile, WeaponProfile, ArmourProfile, EquipmentItem, Faction, RuleKeyword, UnitCategory, RulesetVersion } from '../types/rules';
import { RuleDiffItem } from '../types/diff';
import type { Dataset, BattleMarker } from '../types/catalogue';
import { type DroppedDetail } from '../rules/recruitable';
import type { SyncState } from '../services/sync';

export type AppView = 'builder' | 'play' | 'campaign' | 'codex' | 'customizer' | 'directory';

/**
 * How the store asks for a navigation.
 *
 * Registered by the app shell, because a Zustand store lives outside React and
 * cannot call `useRouter` itself. Null before the shell mounts and on the
 * server, where `setCurrentView` falls back to a plain state write.
 */
export type Navigate = (view: AppView, rosterId?: string) => void;

export interface AppState {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  /** Set the view without navigating — the shell's route sync uses this. */
  setCurrentViewLocal: (view: AppView) => void;
  navigate: Navigate | null;
  registerNavigate: (nav: Navigate | null) => void;

  /*
    Rule catalogs — from the generated dataset, not from `defaultRules.ts`.

    These start **empty** and are filled by `hydrateCatalogs` once the dataset
    has loaded. That is deliberate and it is the whole point of the change:
    they used to be seeded from `BASE_UNITS` / `BASE_WEAPONS`, the hand-written
    data the audit measured as 97% wrong on statlines with 38% of its wargear
    invented, so the models a player could *add* came from data the same app
    then told them was illegal.

    Empty-until-loaded is the honest state. A component that renders before the
    dataset arrives must say so — see `catalogsLoaded` — and must not fall back
    to the old data, which is the `githubSync` failure this project deleted
    (docs/AUDIT.md §1.8).
  */
  factions: Faction[];
  units: UnitProfile[];
  weapons: WeaponProfile[];
  armour: ArmourProfile[];
  equipment: EquipmentItem[];
  /* `keywords` is gone: the glossary is derived and reaches the app as
     `dataset.keywords`. `activeKeyword` below stays — it is UI state, not data. */
  /* `scenarios` is gone: the twelve are derived and reach the app through
     `useScenarios()`, which also marks the All Out War pack as un-derived. */
  /** False until the dataset has loaded. Show it; never substitute for it. */
  catalogsLoaded: boolean;
  /** Set when the dataset could not be loaded at all. */
  catalogsError: string | null;
  /**
   * Fill the catalogs from a loaded dataset, scoped to a faction for gear.
   * Wargear is priced per faction, so the armoury cannot be a shared list.
   */
  hydrateCatalogs: (dataset: Dataset, factionId?: string, variantId?: string) => void;
  /**
   * Entries whose published cost includes Glory. The saved roster format has a
   * single Ducat cost, so their Glory component is not in `units`/`weapons` —
   * this is what the builder shows instead of pricing them as if free.
   */
  gloryPriced: DroppedDetail[];

  customUnits: UnitProfile[];
  customWeapons: WeaponProfile[];

  // Global Warband Directory & Cloud
  allCloudWarbands: Warband[];
  fetchAllCloudWarbands: () => Promise<void>;
  syncUserWarbandsWithCloud: (userEmail?: string, userName?: string) => Promise<void>;

  /**
   * What the cloud copy is doing, as a value the UI can render.
   *
   * It used to be nothing: every cloud call caught its own error, logged a
   * console warning and carried on, so "your roster is backed up" and "the
   * request never left the building" looked identical from the outside. A
   * player at a table with no signal had no way to tell. See
   * `services/sync.ts`.
   */
  sync: SyncState;

  // Warband Management
  warbands: Warband[];
  activeWarbandId: string | null;
  getActiveWarband: () => Warband | null;
  /**
   * `forceMode` decides how the budget is governed for the warband's whole life.
   * 'campaign' takes the book's published economy — the starting allowance and a
   * per-game cap from the Warband Threshold Table. 'unrestricted' lets the
   * player set both, for one-off games, imports and testing a list.
   */
  createWarband: (name: string, factionId: string, ducatLimit?: number,
                  forceMode?: 'campaign' | 'unrestricted',
                  founding?: { variantId?: string; gloryPoints?: number;
                               allowThirdParty?: boolean }) => Warband;
  /**
   * Delete a warband from this device and from the cloud.
   *
   * Awaits the cloud call and resolves with what happened, so a caller that
   * needs to tell the user whether it worked can. `void` was the old shape and
   * the Directory could not report a 403 with it — the row simply vanished
   * locally and came back on the next refresh.
   */
  deleteWarband: (id: string) => Promise<{ ok: boolean; error?: string }>;
  cloneWarband: (id: string) => void;
  setActiveWarbandId: (id: string | null) => void;
  updateWarbandNotes: (warbandId: string, notes: string) => void;
  updateWarbandDucatLimit: (warbandId: string, ducatLimit: number) => void;
  updateWarbandTreasury: (warbandId: string, treasuryDucats: number) => void;
  updateWarbandGlory: (warbandId: string, gloryPoints: number) => void;
  /**
   * Which Warband Variant this warband is built as, e.g. 'houseofwisdom'.
   * `undefined` means the standard list. Nothing set this before, so every
   * variant rule in the ruleset went unenforced — see docs/RULESET-MODEL.md §7a.
   */
  /**
   * Whether this Warband may hire third-party entries — the app's copy of the
   * catalogues' "Allow Third-Party Mercenaries?" roster option. Unlike the
   * Variant this is not a founding decision: it is a table agreement, and the
   * table can change its mind.
   */
  setWarbandAllowThirdParty: (warbandId: string, allow: boolean) => void;
  updateWarbandVariant: (warbandId: string, variantId: string | undefined) => void;
  updateWarbandLore: (warbandId: string, lore: string, motto?: string, patron?: string) => void;
  updateWarbandChronicleLog: (warbandId: string, chronicleLog: string[]) => void;
  addWarbandChronicleEntry: (warbandId: string, entry: string) => void;
  /** Put a warband back to one of its own recorded milestones. */
  restoreWarbandSnapshot: (warbandId: string, snapshotId: string) => void;
  saveWarbandSnapshot: (
    warbandId: string, 
    label: string, 
    type: 'founding' | 'post_battle' | 'recruitment' | 'equipment' | 'manual', 
    changesSummary?: string[], 
    matchId?: string, 
    scenarioName?: string, 
    outcome?: 'Victory' | 'Defeat' | 'Draw'
  ) => void;
  importWarband: (warband: Warband) => void;
  enrollWarbandInCampaign: (warband: Warband, campaignId?: string) => void;
  removeWarbandFromCampaign: (warbandId: string, campaignId?: string) => void;

  // Active Warband Unit Management
  addUnitToWarband: (warbandId: string, baseProfileId: string, customName?: string) => void;
  duplicateUnit: (warbandId: string, unitId: string) => void;
  removeUnitFromWarband: (warbandId: string, unitId: string) => void;
  updateUnitName: (warbandId: string, unitId: string, name: string) => void;
  updateUnitCategory: (warbandId: string, unitId: string, category: UnitCategory) => void;
  setUnitAsLeader: (warbandId: string, unitId: string) => void;
  updateUnitLore: (warbandId: string, unitId: string, lore: string, quote?: string, titles?: string[], deeds?: string[]) => void;
  equipWeapon: (warbandId: string, unitId: string, weaponId: string) => void;
  removeWeapon: (warbandId: string, unitId: string, instanceId: string) => void;
  equipArmour: (warbandId: string, unitId: string, armourId: string) => void;
  removeArmour: (warbandId: string, unitId: string, instanceId: string) => void;
  equipEquipment: (warbandId: string, unitId: string, equipmentId: string) => void;
  removeEquipment: (warbandId: string, unitId: string, instanceId: string) => void;

  // Warband Stash Management
  buyToStash: (warbandId: string, item: { id: string; name: string; type: 'Weapon' | 'Armour' | 'Equipment'; cost: number }) => void;
  sellFromStash: (warbandId: string, stashItemId: string) => void;
  assignStashToUnit: (warbandId: string, stashItemId: string, unitId: string) => void;

  // Tabletop Play Mode
  playTurn: number;
  incrementTurn: () => void;
  resetMatchState: () => void;
  updateUnitWounds: (warbandId: string, unitId: string, delta: number) => void;
  updateUnitBloodMarkers: (warbandId: string, unitId: string, delta: number) => void;
  updateUnitBlessingMarkers: (warbandId: string, unitId: string, delta: number) => void;
  /**
   * The battle marker pools, from the rulebook.
   *
   * Empty until `hydrateCatalogs` runs, like the catalogs above and for the
   * same reason: the cap used to be a literal `6` in the match slice, so a
   * rule the book states was a number in the app's source. Empty means "not
   * loaded", and an unloaded cap is not enforced rather than guessed at.
   */
  markers: BattleMarker[];
  setUnitStatus: (warbandId: string, unitId: string, status: 'Active' | 'Downed' | 'Out of Action') => void;
  toggleUnitActed: (warbandId: string, unitId: string) => void;

  // Keyword Popover / Tooltips
  activeKeyword: RuleKeyword | null;
  setActiveKeyword: (keyword: RuleKeyword | null) => void;

  // Post-Battle Campaign Wizard
  isPostBattleOpen: boolean;
  setIsPostBattleOpen: (open: boolean) => void;
  applyPostBattleResults: (
    scenarioId: string,
    scenarioName: string,
    outcome: 'Victory' | 'Defeat' | 'Draw',
    gloryGained: number,
    ducatsGained: number,
    casualties: CasualtyRecord[],
    advancements: { unitId: string; advancement: string }[],
    narrative: string,
    narrativeReport?: string,
    mvpUnitName?: string,
    opponentWarbandName?: string,
    notableMoments?: string[]
  ) => void;

  // Multiplayer Campaign State
  campaign: Campaign;
  createCampaign: (
    name: string,
    maxDucats: number,
    gloryThreshold: number,
    /**
     * Which rules the campaign is played under, and the territories that go
     * with them. Fixed here and never changed after — see
     * `src/rules/campaignFramework.ts`.
     *
     * The territories arrive from the caller rather than being built here
     * because a Carcass Front campaign's are the published zones, which live
     * in the dataset, and the dataset is fetched asynchronously by the view.
     */
    framework?: CampaignFramework,
    territories?: TerritoryNode[],
  ) => void;
  claimTerritory: (territoryId: string, warbandId: string, playerName: string) => void;
  /**
   * Write a house rule onto a territory, or clear it with an empty string.
   *
   * The app ships no perk of its own any more — sixteen invented ones were
   * removed because they read as published rules — so this is how a campaign
   * gets one at all: its organiser writes it, and it is labelled as theirs.
   *
   * Refuses a territory whose perk the book publishes. Returns whether it
   * wrote, so a caller can say why nothing happened.
   */
  setTerritoryPerk: (territoryId: string, perk: string) => boolean;
  /**
   * Record a house rule the organiser has chosen for this campaign.
   *
   * Returns false where there is no campaign to write to, the same shape as
   * `setTerritoryPerk`. Every rule it can set is a documented deviation from
   * a published one — see `CampaignHouseRules`.
   */
  setCampaignHouseRule: <K extends keyof CampaignHouseRules>(
    rule: K, value: CampaignHouseRules[K]) => boolean;
  logCampaignMatch: (
    p1WarbandId: string,
    p2WarbandId: string,
    scenarioName: string,
    outcome: 'p1' | 'p2' | 'draw',
    p1Glory: number,
    p1Ducats: number,
    p2Glory: number,
    p2Ducats: number,
    narrative: string
  ) => void;
  updateMatchNarrative: (
    campaignId: string, 
    matchId: string, 
    narrativeReport: string, 
    mvpUnitName?: string, 
    opponentName?: string, 
    notableMoments?: string[]
  ) => void;

  // Warrior Progression, Skills & Faction Upgrades
  updateUnitAdvancement: (warbandId: string, unitId: string, xp: number, isElite: boolean) => void;
  addUnitSkill: (warbandId: string, unitId: string, skill: { name: string; category: string; roll?: string; effect?: string }) => void;
  removeUnitSkill: (warbandId: string, unitId: string, skillName: string) => void;
  addUnitScar: (warbandId: string, unitId: string, scar: { name: string; roll?: string; effect?: string }) => void;
  removeUnitScar: (warbandId: string, unitId: string, scarName: string) => void;
  setUnitFireteam: (warbandId: string, unitId: string, fireteam?: string) => void;
  toggleUnitSpecialUpgrade: (warbandId: string, unitId: string, upgrade: { id: string; name: string; cost: number; category: string }) => void;
  addUnitDeed: (warbandId: string, unitId: string, deed: string) => void;
  removeUnitDeed: (warbandId: string, unitId: string, deedIndex: number) => void;
  setUnitTitles: (warbandId: string, unitId: string, titles: string[]) => void;
  addUnitTitleRecord: (warbandId: string, unitId: string, title: string, source?: 'user' | 'injury' | 'exploration' | 'deed', origin?: string, active?: boolean) => void;
  toggleUnitTitleActive: (warbandId: string, unitId: string, title: string) => void;
  removeUnitTitleRecord: (warbandId: string, unitId: string, title: string) => void;
  setUnitTitleRecords: (warbandId: string, unitId: string, records: UnitTitleRecord[]) => void;

  // Favourites Database
  favouriteUnits: ActiveUnit[];
  saveUnitAsFavourite: (unit: ActiveUnit) => void;
  removeUnitFromFavourites: (favouriteId: string) => void;
  addUnitFromFavourite: (warbandId: string, favouriteUnit: ActiveUnit) => void;

  // Customizer & Overrides
  customArmour: ArmourProfile[];
  customEquipment: EquipmentItem[];
  saveCustomUnit: (unit: UnitProfile) => void;
  deleteCustomUnit: (id: string) => void;
  saveCustomWeapon: (weapon: WeaponProfile) => void;
  deleteCustomWeapon: (id: string) => void;
  saveCustomArmour: (armour: ArmourProfile) => void;
  deleteCustomArmour: (id: string) => void;
  saveCustomEquipment: (equipment: EquipmentItem) => void;
  deleteCustomEquipment: (id: string) => void;

  // GitHub Diff & Sync
  pendingDiffs: RuleDiffItem[];
  setPendingDiffs: (diffs: RuleDiffItem[]) => void;
  resolveDiff: (diffId: string, resolution: 'keep_user' | 'accept_upstream') => void;

  // Theme & Visual System
  currentTheme: string;
  setTheme: (themeId: string) => void;

  // Ruleset Version Switcher (1.0 vs 1.0.2 vs 1.0.2TD)
  rulesetVersion: RulesetVersion;
  setRulesetVersion: (version: RulesetVersion) => void;
}
