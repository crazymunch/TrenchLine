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
import type { PlaceholderOpponent } from '../types/opponent';
import { Campaign, CampaignFramework, CampaignHouseRules, CasualtyRecord, TerritoryNode } from '../types/campaign';
import { UnitProfile, WeaponProfile, ArmourProfile, EquipmentItem, Faction, RuleKeyword, UnitCategory, RulesetVersion } from '../types/rules';
import { RuleDiffItem } from '../types/diff';
import type { Cost, Dataset, BattleMarker } from '../types/catalogue';
import { type DroppedDetail } from '../rules/recruitable';
import type { SkillLearned } from '../rules/advancement';
import type { ExplorationEffect } from '../rules/campaign';
import type { SyncState } from '../services/sync';
import type { CampaignSyncState } from '../services/campaignSync';

export type AppView = 'builder' | 'play' | 'campaign' | 'chronicle' | 'codex' | 'customizer' | 'directory';

/**
 * How the store asks for a navigation.
 *
 * Registered by the app shell, because a Zustand store lives outside React and
 * cannot call `useRouter` itself. Null before the shell mounts and on the
 * server, where `setCurrentView` falls back to a plain state write.
 */
export type Navigate = (view: AppView, rosterId?: string) => void;

/**
 * One model's Experience outcome for a game, with the reason when it is none.
 *
 * `reason` is carried so the post-battle summary can say *why* a model got
 * nothing. "No XP" beside a Leader's name reads as a bug; "no XP — Head Wound"
 * reads as the rule it is.
 */
export interface XpAward {
  unitId: string;
  earns: boolean;
  /**
   * How many Experience Points, where it earns any.
   *
   * 1 for surviving the game, 2 where the model also performed at least one
   * Glorious Deed (p.105), and less than either where LIMITED POTENTIAL
   * leaves less room than that. A number rather than a flag because the book
   * awards two different points in the same step, and the slice that writes
   * it must not have to work out which.
   */
  points: number;
  /** Whether the second of those points is the Glorious Deed's. */
  forDeed?: boolean;
  reason?: string;
}

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

  /**
   * Opponents with no roster in this app — see `types/opponent.ts`.
   *
   * Separate from `warbands` on purpose. Everything that asks "what are the
   * player's warbands" reads that list, so keeping these out of it is what
   * stops a placeholder appearing in the roster picker or syncing as one.
   */
  opponents: PlaceholderOpponent[];
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

  /**
   * What the CAMPAIGN's cloud copy is doing. Same idea as `sync` above, one
   * state richer: a campaign is pushed as operations against a version, so
   * "the server moved on under this edit" is an outcome a warband push cannot
   * produce. See `services/campaignSync.ts`.
   */
  campaignSync: CampaignSyncState;
  /**
   * Fetch the campaign, then push everything queued for it.
   *
   * In that order, and it stops if the fetch fails: an offline device that
   * pushes blind overwrites a newer cloud copy with an older one, and a fetch
   * that cannot be made is not permission to write.
   */
  syncCampaignWithCloud: () => Promise<void>;
  /**
   * Take the campaign's copy for every conflicting edit this device made.
   *
   * The one resolution the app offers, and deliberately the one that cannot
   * invent anything: the server's value is adopted locally and the operation
   * leaves the queue. "Keep mine" would mean re-issuing the edit over somebody
   * else's, which is a decision with a person on the other end of it, so it is
   * not offered until there is a screen that says whose change it overwrites.
   */
  discardCampaignConflicts: () => void;
  /**
   * Give this campaign a cloud identity, so it can sync at all.
   *
   * Until this runs a campaign is local — `createCampaign` mints
   * `camp-<timestamp>`, which is not an id the API would recognise — so the
   * outbox has nowhere to push and the indicator says "On this device"
   * forever. Publishing sends the campaign and its whole map once, under an id
   * this device mints; everything after it is an operation.
   *
   * Deliberately an explicit act rather than something the first edit does
   * quietly. Publishing mints an invite code and puts a group's map on a
   * server, and local-only play is supported everywhere else in this app — so
   * it is a decision the organiser makes, not a side effect of typing a
   * campaign name.
   */
  publishCampaignToCloud: () => Promise<void>;
  /**
   * Replace this device's campaign with one the server holds (SYNC-5).
   *
   * Returns whether it happened, so a caller can keep its sheet open on a
   * failure instead of closing on a campaign that never arrived. Destructive
   * by construction — the store holds one campaign — so the caller asks first.
   */
  adoptCampaignFromCloud: (cloudId: string) => Promise<boolean>;

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
                               /**
                                * The Variant's *published* starting Glory, from
                                * `musterBudget` — distinct from `gloryPoints`,
                                * which is the player's own opening balance and
                                * is ignored in campaign mode.
                                */
                               startingGlory?: number;
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
  /**
   * Leave a model out of the Force, or bring it back in.
   *
   * The Threshold Value and Field Strength cap what a Warband FIELDS, not
   * what it owns (p.97), so this removes nothing — it is the player saying
   * which models sit this game out.
   */
  setUnitBenched: (warbandId: string, unitId: string, benched: boolean) => void;
  setUnitAsLeader: (warbandId: string, unitId: string) => void;
  updateUnitLore: (warbandId: string, unitId: string, lore: string, quote?: string, titles?: string[], deeds?: string[]) => void;
  /**
   * Give a model a piece of Battlekit, and charge the Strongbox for it.
   *
   * `settled` says the Strongbox has already paid: the item came out of the
   * Arsenal, which bought it. Without it, moving an item from the Arsenal onto
   * a model charged for it a **second** time — `assignStashToUnit` calls these,
   * and FD-05e-2 gave them a charge without telling it.
   */
  equipWeapon: (warbandId: string, unitId: string, weaponId: string, settled?: boolean) => void;
  removeWeapon: (warbandId: string, unitId: string, instanceId: string) => void;
  equipArmour: (warbandId: string, unitId: string, armourId: string, settled?: boolean) => void;
  removeArmour: (warbandId: string, unitId: string, instanceId: string) => void;
  equipEquipment: (warbandId: string, unitId: string, equipmentId: string, settled?: boolean) => void;
  removeEquipment: (warbandId: string, unitId: string, instanceId: string) => void;

  // Warband Stash Management
  /**
   * Buy Battlekit into the Arsenal.
   *
   * **Refuses** a purchase either Strongbox cannot cover, rather than taking
   * whatever is there. `price` is the Armoury row's own `Cost` and is what
   * this spends when it is given: an item can be priced in both currencies at
   * once, and a purchase is refused if either side is short. `cost` and
   * `currency` remain for a caller that has only the single number — omitted
   * `currency` means Ducats, which is what every purchase before this was.
   */
  buyToStash: (warbandId: string, item: {
    id: string; name: string; type: 'Weapon' | 'Armour' | 'Equipment';
    cost: number; currency?: 'ducats' | 'glory'; price?: Cost;
  }) => void;
  sellFromStash: (warbandId: string, stashItemId: string) => void;
  assignStashToUnit: (warbandId: string, stashItemId: string, unitId: string) => void;

  // Tabletop Play Mode
  playTurn: number;
  incrementTurn: () => void;
  /** Set the turn directly, for a match restored from storage. */
  setPlayTurn: (turn: number) => void;
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
    /**
     * The Skills models learned from their Advancement Rolls.
     *
     * Was `{ unitId, advancement: string }[]`, filled from a grid of eight
     * buttons offering `+1 Melee`, `+1 Ranged`, `+1 Armour`, `+1" Move` and
     * four named Skills. Trench Crusade has no characteristic advances at all,
     * and three of those Skills do not exist — so this parameter's whole
     * vocabulary was invented, and a free-text string could not tell a Skill a
     * model rolled for from one somebody typed.
     *
     * Each entry now carries the table and the 2D6 total that produced it, and
     * lands on `unit.skills` rather than on the legacy `unit.advancements`.
     * See `rules/advancement.ts` and RULES-COVERAGE-AUDIT RR-03/RR-04.
     */
    skillsLearned: SkillLearned[],
    /**
     * The Promotions this step made, and the miss count to carry forward.
     *
     * Promotion used to be a switch on the unit card that set `isElite` and
     * asked nothing — no pool, no assignment rule, no roll, no ceiling. The
     * Promotion Dice are rolled in the wizard now and the result is passed
     * here, because the roll is a rules question and this slice is a writer.
     *
     * Applied BEFORE the Experience award, in the book's order: "They begin
     * with 0 Experience Points, but will gain at least 1 due to surviving the
     * game after which they were Promoted." So a promoted model's Experience
     * is reset and then its point is added, which is why the caller must have
     * counted it as ELITE when it worked out `experience`.
     *
     * `misses` is the whole new count, not a delta: it runs across models and
     * between games, and only a Promotion clears it.
     */
    promotions: { unitIds: string[]; misses: number },
    /**
     * Which models earn their Experience Point, decided by the caller.
     *
     * Required, and passed in rather than computed here, because it is a rules
     * question: "each ELITE model that took part in a game and survived will
     * gain 1 Experience Point", and Head Wound removes the entitlement
     * permanently. This slice used to run `u.xp + 1` over every unit on the
     * roster — Troops, models that sat the game out, and models it had just
     * recorded as dead — on the same submission that displayed the sentence
     * forbidding it. See `rules/trauma.ts` and RULES-COVERAGE-AUDIT RC-02/03.
     *
     * A unit absent from this list earns nothing. An empty array is a valid and
     * common answer: a warband of Troops earns no Experience at all.
     */
    experience: XpAward[],
    /**
     * Whether the player Called for Reinforcements, and so pays its price.
     *
     * The book's sequence has six steps. This slice applied one of them — the
     * forfeiture of Exploration and the Quartermaster, which the wizard
     * enforces by hiding controls — and none of the five that cost anything:
     * the Arsenal was kept, the Strongbox was kept, and unspent Ducats were
     * never lost. See `rules/campaign.ts` and RULES-COVERAGE-AUDIT RC-09.
     *
     * Required rather than optional. A caller that forgets it would silently
     * restore exactly the bug this closes.
     */
    tookReinforcements: boolean,
    narrative: string,
    narrativeReport?: string,
    mvpUnitName?: string,
    opponentWarbandName?: string,
    notableMoments?: string[],
    /**
     * The Chronicle `BattleRecord` this post-battle belongs to.
     *
     * The same game produces two records — a scored `BattleRecord` written by
     * Play Mode and a `MatchRecord` written here — read by different screens,
     * which never agreed because one was measured and the other typed.
     * `BattleRecord.campaignMatchId` was designed to join them and nothing
     * ever set it: the field is in the type, the sync payload, the API schema
     * and `battleFromMatch`'s options, and no caller passed it (RR-23).
     *
     * Optional because a post-battle can still be opened without a match
     * behind it, and that case has no battle to link to.
     */
    battleId?: string,
    /**
     * What the Exploration Step found, for the Roster to keep.
     *
     * `discovered` is the Location's name. `warband.explorationDiscoveries`
     * existed, was read by this very step to decide a Pillaged result — "You
     * can discover a Location only once during the campaign" — and **had no
     * writer anywhere in the app** (FD-07 / RR-10). So the list was always
     * empty, the rule never fired, and every Location a player had ever found
     * went unrecorded.
     *
     * `effects` are the Exploration Skills and standing loot the Location's
     * own text hands over, from `explorationGrants`. Appended, never replaced:
     * page 115 says a Warband can hold multiples of any of them.
     */
    exploration?: { discovered?: string; effects?: ExplorationEffect[] },
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
  /**
   * Claim a recruitment bound the Warband has earned in play.
   *
   * The Black Grail's *Curse on Creation* trades six Grail Thralls for a
   * second Amalgam. Returns what happened rather than throwing: the caller is
   * a screen, and "you have five Thralls, not six" is a sentence to show
   * (docs/RULES-COVERAGE-AUDIT.md RC-08).
   */
  claimEarnedRecruitment: (warbandId: string, profileId: string, dataset: Dataset)
    => { ok: true; spent: string[]; freeRecruit: 'added' | 'unavailable' | 'not-granted' }
     | { ok: false; blockers: string[] };
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
  /**
   * Add or replace a placeholder opponent. Omit `id` to create one.
   *
   * Returns the id it saved under, so a caller that has just created an
   * opponent can put them straight into the match. Without that the picker had
   * to save, wait for the list to re-render, and ask the player to click the
   * same opponent a second time — which read as the app ignoring them.
   */
  saveOpponent: (opponent: {
    id?: string; name: string; factionId: string; fieldStrength?: number;
  }) => string;
  deleteOpponent: (id: string) => void;
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
