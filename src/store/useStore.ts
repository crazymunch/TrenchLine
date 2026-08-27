import { create } from 'zustand';
import { Warband, ActiveUnit, EquippedWeapon, EquippedArmour, EquippedEquipment, StashedItem, WarbandSnapshot, UnitTitleRecord } from '../types/warband';
import { Campaign, MatchRecord, CasualtyRecord, CampaignMember, TerritoryNode } from '../types/campaign';
import { UnitProfile, WeaponProfile, ArmourProfile, EquipmentItem, Faction, RuleKeyword, Scenario, UnitCategory, RulesetVersion } from '../types/rules';
import { RuleDiffItem } from '../types/diff';
import { FACTIONS, BASE_UNITS, BASE_WEAPONS, BASE_ARMOUR, BASE_EQUIPMENT, KEYWORDS, SCENARIOS } from '../data/defaultRules';
import { enrichUnitWithLore, SULTANATE_WARBAND_LORE, SULTANATE_MATCH_HISTORY, SULTANATE_WARBAND_SNAPSHOTS } from '../data/warbandLore';
import { storage } from '../services/storage';

export type AppView = 'builder' | 'play' | 'campaign' | 'codex' | 'customizer' | 'directory';

interface AppState {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;

  // Rule catalogs
  factions: Faction[];
  units: UnitProfile[];
  weapons: WeaponProfile[];
  armour: ArmourProfile[];
  equipment: EquipmentItem[];
  keywords: RuleKeyword[];
  scenarios: Scenario[];
  customUnits: UnitProfile[];
  customWeapons: WeaponProfile[];

  // Global Warband Directory & Cloud
  allCloudWarbands: Warband[];
  fetchAllCloudWarbands: () => Promise<void>;
  syncUserWarbandsWithCloud: (userEmail?: string, userName?: string) => Promise<void>;

  // Warband Management
  warbands: Warband[];
  activeWarbandId: string | null;
  getActiveWarband: () => Warband | null;
  createWarband: (name: string, factionId: string, ducatLimit?: number) => Warband;
  deleteWarband: (id: string) => void;
  cloneWarband: (id: string) => void;
  setActiveWarbandId: (id: string | null) => void;
  updateWarbandNotes: (warbandId: string, notes: string) => void;
  updateWarbandLore: (warbandId: string, lore: string, motto?: string, patron?: string) => void;
  updateWarbandChronicleLog: (warbandId: string, chronicleLog: string[]) => void;
  addWarbandChronicleEntry: (warbandId: string, entry: string) => void;
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
  createCampaign: (name: string, maxDucats: number, gloryThreshold: number) => void;
  claimTerritory: (territoryId: string, warbandId: string, playerName: string) => void;
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

// Default Strategic Theaters matching the overarching World Map ("The Lands of the Great Powers")
export const DEFAULT_WORLD_THEATERS: TerritoryNode[] = [
  {
    id: 'th-iron-wall',
    name: 'The Great Iron Wall & New Antioch',
    type: 'Strategic Bastion',
    region: 'Levant Front',
    x: 82.5,
    y: 77.0,
    perk: '+15 Ducats & +1 Alchemical Formula discount per match',
    description: 'The monumental 800-year-old alchemically reinforced wall holding back the demonic incursions of the Jerusalem Hell Breach.'
  },
  {
    id: 'th-jerusalem-gates',
    name: 'The Gates of Hell & Jerusalem',
    type: 'Infernal Breach',
    region: 'The Holy Land',
    x: 79.5,
    y: 83.5,
    perk: '+2 Glory on Victory; -1 Morale check penalty for opposing forces',
    description: 'Epicenter of the Ultimate Heresy where mortal earth and Hell collide in volcanic brimstone and madness.'
  },
  {
    id: 'th-baghdad-alamut',
    name: 'Baghdad & Alamut (House of Wisdom)',
    type: 'Alchemical Citadel',
    region: 'Iron Sultanate',
    x: 89.0,
    y: 74.0,
    perk: 'Free Alchemical Reagents & +10 Ducats exploration bonus',
    description: 'Seat of golden alchemical science, where master alchemists forge living brass golems and naphtha flamethrowers.'
  },
  {
    id: 'th-kyiv-steppes',
    name: 'Principality of Kyiv & Cossack Steppes',
    type: 'Frontier Steppes',
    region: 'Rus Frontier',
    x: 69.0,
    y: 46.0,
    perk: 'Reroll 1 failed Initiative roll per battle',
    description: 'Snow-dusted trenches and rolling steppes defended by fierce Cossacks against barbarian and demon hordes.'
  },
  {
    id: 'th-novgorod-finland',
    name: 'Tzardom of Novgorod & Finland',
    type: 'Boreal Bastion',
    region: 'Northern Frontier',
    x: 71.0,
    y: 22.0,
    perk: '+1 Armour Characteristic on Turn 1 from hardened winter fortifications',
    description: 'Frozen tundras and iron cathedral-citadels standing vigil against abominations from the Arctic deeps.'
  },
  {
    id: 'th-holy-roman-empire',
    name: 'Holy Roman Empire & Aachen',
    type: 'Cathedral City',
    region: 'Central Europe',
    x: 46.0,
    y: 46.0,
    perk: 'Free Reinforced Armour upgrade in Warband Stash after battle',
    description: 'Heartland of Church industry and knightly orders, churning out heavy machine plate and blessed ammunition.'
  },
  {
    id: 'th-britannia',
    name: 'Insulae Britannorum & England',
    type: 'Fortress Island',
    region: 'Britannic Sector',
    x: 32.0,
    y: 36.0,
    perk: '+10 Ducats supply income & +1 Ranged DICE on defensive turns',
    description: 'Moated island redoubt guarded by massive dreadnought fleets and razor-wire shoreline trenches.'
  },
  {
    id: 'th-hungary-danube',
    name: 'Kingdom of Hungary & Balkans Breach',
    type: 'Contested Trench Line',
    region: 'Danubian Sector',
    x: 57.0,
    y: 55.0,
    perk: 'Ignore first casualty in post-battle Trauma phase (Full Recovery)',
    description: 'Grisly mountain passes and fortified river crossings resisting incursions from the Cult of the Black Grail.'
  },
  {
    id: 'th-rome-sancta-sedis',
    name: 'Papal Gates & Rome (Sancta Sedis)',
    type: 'Holy Sanctuary',
    region: 'Italian Peninsula',
    x: 45.0,
    y: 69.0,
    perk: 'Warband starts each match with 1 permanent Blessing Marker',
    description: 'Sacred throne of the Supreme Pontiff, defended by walking Anchorite shrines and zealot crusaders.'
  },
  {
    id: 'th-numidia-marruecos',
    name: 'Kingdom of Numidia & Marruecos',
    type: 'Desert Redoubt',
    region: 'North African Bulwark',
    x: 18.0,
    y: 81.0,
    perk: '+1" Movement Characteristic across difficult or open ground',
    description: 'Sun-scorched fortresses and nomadic warriors guarding the southern flank from demonic desert horrors.'
  },
  {
    id: 'th-domain-mammon',
    name: 'Domain of Mammon & Ekron',
    type: 'Demonic Waste',
    region: 'Southern Infernal Sector',
    x: 73.0,
    y: 92.0,
    perk: '+25 Ducats loot bounty upon winning a match in this theater',
    description: 'Avarice-choked salt plains and demonic refineries guarded by Heretic Shocktroopers and brass fiends.'
  },
  {
    id: 'th-mecca-sanctuary',
    name: 'Mecca (Sanctuary of the Prophet)',
    type: 'Divine Citadel',
    region: 'Arabian Heartland',
    x: 94.0,
    y: 90.0,
    perk: '+1 Glory Point & +1 Reroll on Morale Checks',
    description: 'Inviolable holy sanctuary protected by miraculous alchemical storms and elite Janissary cohorts.'
  }
];

// Clean Default Campaign
const defaultFreshCampaign: Campaign = {
  id: 'camp-default',
  name: 'Crusade for the Lands of the Great Powers',
  inviteCode: 'TRENCH-1099',
  adminName: 'Commander',
  status: 'active',
  currentTurn: 1,
  maxWarbandDucats: 700,
  gloryVictoryThreshold: 25,
  members: [],
  territories: DEFAULT_WORLD_THEATERS,
  matches: SULTANATE_MATCH_HISTORY,
  chronicleLogs: []
};

const defaultSultanateWarband: Warband = {
  id: 'wb-al-qarn-rihla',
  name: 'Al-Qarn Rihla',
  factionId: 'iron-sultanate',
  ducatLimit: 1220,
  treasuryDucats: 220,
  gloryPoints: 4,
  lore: SULTANATE_WARBAND_LORE.lore,
  motto: SULTANATE_WARBAND_LORE.motto,
  patron: SULTANATE_WARBAND_LORE.patron,
  chronicleLog: SULTANATE_WARBAND_LORE.chronicleLog,
  snapshots: SULTANATE_WARBAND_SNAPSHOTS,
  units: SULTANATE_WARBAND_SNAPSHOTS[2].units,
  armoryStash: [],
  createdAt: '2026-06-01T10:00:00Z',
  updatedAt: new Date().toISOString()
};

export const useStore = create<AppState>((set, get) => {
  const storedWarbands = storage.getWarbands();
  const rawList = storedWarbands.length > 0 ? storedWarbands : [defaultSultanateWarband];

  const warbands = rawList.map((wb) => {
    const isSultanate = wb.factionId === 'iron-sultanate' || wb.name.toLowerCase().includes('qarn') || wb.name.toLowerCase().includes('sultanate');
    const hasOldDummySnapshots = isSultanate && (wb.snapshots?.some(s => s.id === 'snap-founding' || s.id === 'snap-match-1' || s.ducatCost === 1320 || s.label.includes('1320') || s.units.length === 0) || wb.units.length === 11);
    const cleanSnapshots = (isSultanate && (!wb.snapshots || wb.snapshots.length < 3 || hasOldDummySnapshots))
      ? SULTANATE_WARBAND_SNAPSHOTS
      : (wb.snapshots && wb.snapshots.length > 0 ? wb.snapshots : (isSultanate ? SULTANATE_WARBAND_SNAPSHOTS : []));

    const cleanUnits = (isSultanate && (hasOldDummySnapshots || wb.units.length === 11))
      ? SULTANATE_WARBAND_SNAPSHOTS[2].units
      : wb.units.map(enrichUnitWithLore);

    return {
      ...wb,
      ducatLimit: isSultanate ? 1220 : wb.ducatLimit,
      gloryPoints: (isSultanate && wb.gloryPoints < 4) ? 4 : wb.gloryPoints,
      lore: wb.lore || (isSultanate ? SULTANATE_WARBAND_LORE.lore : undefined),
      motto: wb.motto || (isSultanate ? SULTANATE_WARBAND_LORE.motto : undefined),
      patron: wb.patron || (isSultanate ? SULTANATE_WARBAND_LORE.patron : undefined),
      chronicleLog: (wb.chronicleLog && wb.chronicleLog.length > 0) ? wb.chronicleLog : (isSultanate ? SULTANATE_WARBAND_LORE.chronicleLog : []),
      snapshots: cleanSnapshots,
      units: cleanUnits
    };
  });

  // Ensure cleaned warbands with authentic snapshots are persisted to localStorage
  storage.saveWarbands(warbands);
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
    currentView: 'builder',
    setCurrentView: (view) => set({ currentView: view }),

    currentTheme: initialTheme,
    setTheme: (themeId: string) => {
      storage.saveTheme(themeId);
      if (typeof window !== 'undefined') {
        document.documentElement.setAttribute('data-theme', themeId);
      }
      set({ currentTheme: themeId });
    },

    rulesetVersion: initialRuleset,
    setRulesetVersion: (version: RulesetVersion) => {
      storage.saveRulesetVersion(version);
      set({ rulesetVersion: version });
    },

    factions: FACTIONS,
    units: [...BASE_UNITS, ...customUnits],
    weapons: [...BASE_WEAPONS, ...customWeapons],
    armour: BASE_ARMOUR,
    equipment: BASE_EQUIPMENT,
    keywords: KEYWORDS,
    scenarios: SCENARIOS,
    customUnits,
    customWeapons,
    customArmour: [],
    customEquipment: [],
    favouriteUnits: storage.getFavouriteUnits(),

    allCloudWarbands: [],
    fetchAllCloudWarbands: async () => {
      const cloudWbs = await storage.fetchAllWarbandsFromCloud();
      if (cloudWbs) {
        set({ allCloudWarbands: cloudWbs });
      }
    },

    syncUserWarbandsWithCloud: async (userEmail?: string, userName?: string) => {
      try {
        const cloudWbs = await storage.fetchWarbandsFromCloud();
        const state = get();
        
        let mergedMap = new Map<string, Warband>();
        // 1. Put current local state
        state.warbands.forEach(w => mergedMap.set(w.id, w));

        // 2. Merge cloud warbands (cloud takes precedence if present)
        if (cloudWbs && cloudWbs.length > 0) {
          cloudWbs.forEach(cw => {
            const local = mergedMap.get(cw.id);
            if (!local || new Date(cw.updatedAt) >= new Date(local.updatedAt)) {
              mergedMap.set(cw.id, {
                ...cw,
                creatorName: cw.creatorName || userName || 'Crusade Commander',
                units: cw.units.map(enrichUnitWithLore)
              });
            }
          });
        }

        const mergedList = Array.from(mergedMap.values());
        storage.saveWarbands(mergedList);

        // 3. Sync any local warbands that aren't yet in the cloud database
        mergedList.forEach(w => {
          storage.syncWarbandToCloud({
            ...w,
            creatorName: w.creatorName || userName || 'Crusade Commander'
          });
        });

        const activeId = state.activeWarbandId && mergedMap.has(state.activeWarbandId)
          ? state.activeWarbandId
          : mergedList[0]?.id || null;

        set({
          warbands: mergedList,
          activeWarbandId: activeId
        });
      } catch (e) {
        console.warn('Cloud sync on auth failed:', e);
      }
    },

    warbands,
    activeWarbandId,

    getActiveWarband: () => {
      const state = get();
      return state.warbands.find((w) => w.id === state.activeWarbandId) || null;
    },

    createWarband: (name, factionId, ducatLimit = 700) => {
      const foundingSnapshot: WarbandSnapshot = {
        id: `snap-${Date.now()}`,
        timestamp: new Date().toISOString(),
        label: '1. Founding Muster',
        type: 'founding',
        ducatCost: 0,
        treasuryDucats: 0,
        gloryPoints: 0,
        unitCount: 0,
        units: [],
        armoryStash: [],
        changesSummary: ['Warband established and ready for initial recruitment.']
      };

      const newWarband: Warband = {
        id: `wb-${Date.now()}`,
        name,
        factionId,
        ducatLimit,
        treasuryDucats: 0,
        gloryPoints: 0,
        units: [],
        armoryStash: [],
        snapshots: [foundingSnapshot],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      set((state) => {
        const updated = [...state.warbands, newWarband];
        storage.saveWarbands(updated);
        storage.setActiveWarbandId(newWarband.id);
        storage.syncWarbandToCloud(newWarband);
        return { warbands: updated, activeWarbandId: newWarband.id };
      });

      return newWarband;
    },

    importWarband: (newWarband: Warband) => {
      const existingSnapshots = newWarband.snapshots && newWarband.snapshots.length > 0
        ? newWarband.snapshots
        : [{
            id: `snap-${Date.now()}`,
            timestamp: new Date().toISOString(),
            label: '1. Founding Muster (Imported)',
            type: 'founding' as const,
            ducatCost: newWarband.units.reduce((s, u) => s + u.totalCost, 0),
            treasuryDucats: newWarband.treasuryDucats || 0,
            gloryPoints: newWarband.gloryPoints || 0,
            unitCount: newWarband.units.length,
            units: JSON.parse(JSON.stringify(newWarband.units)),
            armoryStash: JSON.parse(JSON.stringify(newWarband.armoryStash || [])),
            changesSummary: [`Imported roster with ${newWarband.units.length} warriors.`]
          }];

      const enrichedWarband: Warband = {
        ...newWarband,
        snapshots: existingSnapshots
      };

      set((state) => {
        const updated = [...state.warbands.filter(w => w.id !== enrichedWarband.id), enrichedWarband];
        storage.saveWarbands(updated);
        storage.setActiveWarbandId(enrichedWarband.id);
        storage.syncWarbandToCloud(enrichedWarband);
        return { warbands: updated, activeWarbandId: enrichedWarband.id };
      });
    },

    saveWarbandSnapshot: (warbandId, label, type, changesSummary = [], matchId, scenarioName, outcome) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const newSnapshot: WarbandSnapshot = {
            id: `snap-${Date.now()}`,
            timestamp: new Date().toISOString(),
            label,
            type,
            matchId,
            scenarioName,
            outcome,
            ducatCost: w.units.reduce((sum, u) => sum + u.totalCost, 0),
            treasuryDucats: w.treasuryDucats,
            gloryPoints: w.gloryPoints,
            unitCount: w.units.filter((u) => !u.isDead).length,
            units: JSON.parse(JSON.stringify(w.units)),
            armoryStash: JSON.parse(JSON.stringify(w.armoryStash)),
            changesSummary: changesSummary.length > 0 ? changesSummary : ['Milestone checkpoint recorded.']
          };

          const existingSnapshots = w.snapshots || [];
          const updatedWb: Warband = {
            ...w,
            snapshots: [...existingSnapshots, newSnapshot]
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });

        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    enrollWarbandInCampaign: (warband, campaignId) => {
      set((state) => {
        const targetCampId = campaignId || state.campaign.id;
        const exists = state.campaign.members.some((m) => m.warbandId === warband.id);
        if (exists) return state;

        const newMember: CampaignMember = {
          userId: warband.creatorId || 'user-default',
          playerName: warband.creatorName || 'Commander',
          warbandId: warband.id,
          warbandName: warband.name,
          factionId: warband.factionId,
          glory: warband.gloryPoints || 0,
          rating: warband.units.reduce((sum, u) => sum + u.totalCost, 0),
          wins: 0,
          losses: 0,
          draws: 0,
          treasury: warband.treasuryDucats || 0
        };

        const updatedCampaign = {
          ...state.campaign,
          members: [...state.campaign.members, newMember]
        };

        storage.saveCampaign(updatedCampaign);
        storage.syncCampaignToCloud(updatedCampaign);
        return { campaign: updatedCampaign };
      });
    },

    removeWarbandFromCampaign: (warbandId, campaignId) => {
      set((state) => {
        const updatedCampaign = {
          ...state.campaign,
          members: state.campaign.members.filter((m) => m.warbandId !== warbandId)
        };
        storage.saveCampaign(updatedCampaign);
        storage.syncCampaignToCloud(updatedCampaign);
        return { campaign: updatedCampaign };
      });
    },

    deleteWarband: (id) => {
      set((state) => {
        const updated = state.warbands.filter((w) => w.id !== id);
        storage.saveWarbands(updated);
        storage.deleteWarbandFromCloud(id);
        const nextActive = updated[0]?.id || null;
        storage.setActiveWarbandId(nextActive);
        return { warbands: updated, activeWarbandId: nextActive };
      });
    },

    cloneWarband: (id) => {
      const state = get();
      const target = state.warbands.find((w) => w.id === id);
      if (!target) return;

      const cloned: Warband = {
        ...target,
        id: `wb-${Date.now()}`,
        name: `${target.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      set((s) => {
        const updated = [...s.warbands, cloned];
        storage.saveWarbands(updated);
        storage.setActiveWarbandId(cloned.id);
        storage.syncWarbandToCloud(cloned);
        return { warbands: updated, activeWarbandId: cloned.id };
      });
    },

    setActiveWarbandId: (id) => {
      storage.setActiveWarbandId(id);
      set({ activeWarbandId: id });
    },

    updateWarbandNotes: (warbandId, notes) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = { ...w, notes };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    updateWarbandLore: (warbandId, lore, motto, patron) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb: Warband = {
            ...w,
            lore,
            motto: motto !== undefined ? motto : w.motto,
            patron: patron !== undefined ? patron : w.patron,
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    updateWarbandChronicleLog: (warbandId, chronicleLog) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb: Warband = {
            ...w,
            chronicleLog,
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    addWarbandChronicleEntry: (warbandId, entry) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const existing = w.chronicleLog || [];
          const updatedWb: Warband = {
            ...w,
            chronicleLog: [entry, ...existing],
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    // Units
    addUnitToWarband: (warbandId, baseProfileId, customName) => {
      const state = get();
      const profile = state.units.find((u) => u.id === baseProfileId);
      if (!profile) return;

      const defaultWeapons: EquippedWeapon[] = (profile.defaultWeapons || [])
        .map((wId) => {
          const w = state.weapons.find((item) => item.id === wId);
          return w ? { ...w, instanceId: `w-${Date.now()}-${Math.random()}` } : null;
        })
        .filter(Boolean) as EquippedWeapon[];

      const defaultArmour: EquippedArmour[] = (profile.defaultArmour || [])
        .map((aId) => {
          const a = state.armour.find((item) => item.id === aId);
          return a ? { ...a, instanceId: `a-${Date.now()}-${Math.random()}` } : null;
        })
        .filter(Boolean) as EquippedArmour[];

      const gearCost =
        defaultWeapons.reduce((sum, w) => sum + w.cost, 0) +
        defaultArmour.reduce((sum, a) => sum + a.cost, 0);

      const maxHp = profile.stats.keywords?.some(k => k.toLowerCase().includes('tough')) ? 2 : 1;

      const newUnit: ActiveUnit = {
        id: `u-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        customName: customName || profile.name,
        baseProfileId,
        profileSnapshot: profile,
        equippedWeapons: defaultWeapons,
        equippedArmour: defaultArmour,
        equippedEquipment: [],
        xp: 0,
        advancements: [],
        injuries: [],
        isDead: false,
        totalCost: profile.baseCost + gearCost,
        currentWounds: maxHp,
        maxWounds: maxHp,
        bloodMarkers: 0,
        status: 'Active',
        hasActedThisTurn: false
      };

      set((s) => {
        const updated = s.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: [...w.units, newUnit],
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    duplicateUnit: (warbandId, unitId) => {
      const state = get();
      const activeWb = state.warbands.find((w) => w.id === warbandId);
      if (!activeWb) return;

      const target = activeWb.units.find((u) => u.id === unitId);
      if (!target) return;

      const clonedUnit: ActiveUnit = {
        ...target,
        id: `u-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        customName: `${target.customName} (Copy)`,
        equippedWeapons: target.equippedWeapons.map((w) => ({
          ...w,
          instanceId: `w-${Date.now()}-${Math.random()}`
        })),
        equippedArmour: target.equippedArmour.map((a) => ({
          ...a,
          instanceId: `a-${Date.now()}-${Math.random()}`
        })),
        equippedEquipment: target.equippedEquipment.map((e) => ({
          ...e,
          instanceId: `e-${Date.now()}-${Math.random()}`
        }))
      };

      set((s) => {
        const updated = s.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: [...w.units, clonedUnit],
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    removeUnitFromWarband: (warbandId, unitId) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.filter((u) => u.id !== unitId),
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    updateUnitName: (warbandId, unitId, name) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => (u.id === unitId ? { ...u, customName: name } : u)),
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    updateUnitCategory: (warbandId, unitId, category) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedUnits = w.units.map((u) => {
            if (u.id === unitId) {
              return {
                ...u,
                profileSnapshot: {
                  ...u.profileSnapshot,
                  category
                }
              };
            }
            // If promoting this unit to Leader, demote any existing previous Leader to Elite
            if (category === 'Leader' && u.profileSnapshot.category === 'Leader') {
              return {
                ...u,
                profileSnapshot: {
                  ...u.profileSnapshot,
                  category: 'Elite' as any
                }
              };
            }
            return u;
          });
          const updatedWb = {
            ...w,
            units: updatedUnits,
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    setUnitAsLeader: (warbandId, unitId) => {
      get().updateUnitCategory(warbandId, unitId, 'Leader');
    },

    updateUnitLore: (warbandId, unitId, lore, quote, titles, deeds) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              return {
                ...u,
                lore,
                quote: quote !== undefined ? quote : u.quote,
                titles: titles !== undefined ? titles : u.titles,
                deeds: deeds !== undefined ? deeds : u.deeds
              };
            }),
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    equipWeapon: (warbandId, unitId, weaponId) => {
      const state = get();
      const weapon = state.weapons.find((w) => w.id === weaponId);
      if (!weapon) return;

      const equipped: EquippedWeapon = {
        ...weapon,
        instanceId: `w-${Date.now()}`
      };

      set((s) => {
        const updated = s.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const newWeapons = [...u.equippedWeapons, equipped];
              return {
                ...u,
                equippedWeapons: newWeapons,
                totalCost: u.totalCost + weapon.cost
              };
            })
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    removeWeapon: (warbandId, unitId, instanceId) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const target = u.equippedWeapons.find((wep) => wep.instanceId === instanceId);
              const deductedCost = target ? target.cost : 0;
              return {
                ...u,
                equippedWeapons: u.equippedWeapons.filter((wep) => wep.instanceId !== instanceId),
                totalCost: Math.max(0, u.totalCost - deductedCost)
              };
            })
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    equipArmour: (warbandId, unitId, armourId) => {
      const state = get();
      const arm = state.armour.find((a) => a.id === armourId);
      if (!arm) return;

      const equipped: EquippedArmour = {
        ...arm,
        instanceId: `a-${Date.now()}`
      };

      set((s) => {
        const updated = s.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              return {
                ...u,
                equippedArmour: [...u.equippedArmour, equipped],
                totalCost: u.totalCost + arm.cost
              };
            })
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    removeArmour: (warbandId, unitId, instanceId) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const target = u.equippedArmour.find((a) => a.instanceId === instanceId);
              const deductedCost = target ? target.cost : 0;
              return {
                ...u,
                equippedArmour: u.equippedArmour.filter((a) => a.instanceId !== instanceId),
                totalCost: Math.max(0, u.totalCost - deductedCost)
              };
            })
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    equipEquipment: (warbandId, unitId, equipmentId) => {
      const state = get();
      const item = state.equipment.find((e) => e.id === equipmentId);
      if (!item) return;

      const equipped: EquippedEquipment = {
        ...item,
        instanceId: `e-${Date.now()}`
      };

      set((s) => {
        const updated = s.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              return {
                ...u,
                equippedEquipment: [...u.equippedEquipment, equipped],
                totalCost: u.totalCost + item.cost
              };
            })
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    removeEquipment: (warbandId, unitId, instanceId) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const target = u.equippedEquipment.find((e) => e.instanceId === instanceId);
              const deductedCost = target ? target.cost : 0;
              return {
                ...u,
                equippedEquipment: u.equippedEquipment.filter((e) => e.instanceId !== instanceId),
                totalCost: Math.max(0, u.totalCost - deductedCost)
              };
            })
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    // Warrior Progression, Skills & Faction Upgrades
    updateUnitAdvancement: (warbandId, unitId, xp, isElite) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              return {
                ...u,
                xp,
                isElite,
                profileSnapshot: {
                  ...u.profileSnapshot,
                  category: isElite && u.profileSnapshot.category === 'Trooper' ? 'Elite' : u.profileSnapshot.category
                }
              };
            }),
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    addUnitSkill: (warbandId, unitId, skill) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const existing = u.skills || [];
              if (existing.some(s => s.name === skill.name)) return u;
              return {
                ...u,
                skills: [...existing, skill]
              };
            }),
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    removeUnitSkill: (warbandId, unitId, skillName) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              return {
                ...u,
                skills: (u.skills || []).filter(s => s.name !== skillName)
              };
            }),
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    addUnitScar: (warbandId, unitId, scar) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const existing = u.scars || [];
              if (existing.some(s => s.name === scar.name)) return u;

              const norm = scar.name.toLowerCase();
              let earnedTitle: { title: string; origin: string } | null = null;
              if (norm.includes('prominent scar') || norm.includes('scarred')) {
                earnedTitle = { title: 'the Scarred', origin: 'Trauma: Prominent Scar' };
              } else if (norm.includes('lost arm') || norm.includes('crippled') || norm.includes('severed hand')) {
                earnedTitle = { title: 'the Crippled', origin: 'Trauma: Lost Arm' };
              } else if (norm.includes('leg wound') || norm.includes('lame') || norm.includes('limp')) {
                earnedTitle = { title: 'the Lame', origin: 'Trauma: Leg Wound' };
              } else if (norm.includes('lost an eye') || norm.includes('blind') || norm.includes('one-eyed')) {
                earnedTitle = { title: 'the One-Eyed', origin: 'Trauma: Lost an Eye' };
              } else if (norm.includes('chest wound') || norm.includes('iron-ribbed')) {
                earnedTitle = { title: 'the Iron-Ribbed', origin: 'Trauma: Chest Wound' };
              } else if (norm.includes('shell-shocked') || norm.includes('shell shock')) {
                earnedTitle = { title: 'the Shell-Shocked', origin: 'Trauma: Shell-shocked' };
              } else if (norm.includes('possessed')) {
                earnedTitle = { title: 'the Possessed', origin: 'Trauma: Possessed' };
              } else if (norm.includes('hardened') || norm.includes('fearless')) {
                earnedTitle = { title: 'the Fearless', origin: 'Trauma: Hardened' };
              }

              let currentRecords: UnitTitleRecord[] = u.titleRecords || (u.titles || []).map(t => ({
                title: t,
                source: 'user',
                active: true
              }));

              if (earnedTitle && !currentRecords.some(r => r.title.toLowerCase() === earnedTitle!.title.toLowerCase())) {
                currentRecords = [
                  ...currentRecords,
                  {
                    title: earnedTitle.title,
                    source: 'injury',
                    origin: earnedTitle.origin,
                    active: true
                  }
                ];
              }

              const activeTitles = currentRecords.filter(r => r.active).map(r => r.title);

              return {
                ...u,
                scars: [...existing, scar],
                titleRecords: currentRecords,
                titles: activeTitles
              };
            }),
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    removeUnitScar: (warbandId, unitId, scarName) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              return {
                ...u,
                scars: (u.scars || []).filter(s => s.name !== scarName)
              };
            }),
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    setUnitFireteam: (warbandId, unitId, fireteam) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              return {
                ...u,
                fireteam
              };
            }),
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    toggleUnitSpecialUpgrade: (warbandId, unitId, upgrade) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const current = u.specialUpgrades || [];
              const exists = current.some(x => x.id === upgrade.id);
              let nextUpgrades = [];
              let costDelta = 0;
              if (exists) {
                nextUpgrades = current.filter(x => x.id !== upgrade.id);
                costDelta = -upgrade.cost;
              } else {
                nextUpgrades = [...current, upgrade];
                costDelta = upgrade.cost;
              }
              return {
                ...u,
                specialUpgrades: nextUpgrades,
                totalCost: Math.max(0, u.totalCost + costDelta)
              };
            }),
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    addUnitDeed: (warbandId, unitId, deed) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const existing = u.deeds || [];
              if (existing.includes(deed)) return u;
              return { ...u, deeds: [...existing, deed] };
            }),
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    removeUnitDeed: (warbandId, unitId, deedIndex) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const existing = u.deeds || [];
              return { ...u, deeds: existing.filter((_, idx) => idx !== deedIndex) };
            }),
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    setUnitTitles: (warbandId, unitId, titles) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const records: UnitTitleRecord[] = titles.map(t => ({
                title: t,
                source: 'user',
                active: true
              }));
              return { ...u, titles, titleRecords: records };
            }),
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    addUnitTitleRecord: (warbandId, unitId, title, source = 'user', origin, active = true) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const currentRecords: UnitTitleRecord[] = u.titleRecords || (u.titles || []).map(t => ({
                title: t,
                source: 'user',
                active: true
              }));
              const existingIdx = currentRecords.findIndex(r => r.title.toLowerCase() === title.toLowerCase());
              let nextRecords: UnitTitleRecord[];
              if (existingIdx >= 0) {
                nextRecords = currentRecords.map((r, idx) => idx === existingIdx ? { ...r, active: true } : r);
              } else {
                nextRecords = [...currentRecords, { title, source, origin, active }];
              }
              const activeTitles = nextRecords.filter(r => r.active).map(r => r.title);
              return {
                ...u,
                titleRecords: nextRecords,
                titles: activeTitles
              };
            }),
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    toggleUnitTitleActive: (warbandId, unitId, title) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const currentRecords: UnitTitleRecord[] = u.titleRecords || (u.titles || []).map(t => ({
                title: t,
                source: 'user',
                active: true
              }));
              const nextRecords = currentRecords.map(r => r.title.toLowerCase() === title.toLowerCase() ? { ...r, active: !r.active } : r);
              const activeTitles = nextRecords.filter(r => r.active).map(r => r.title);
              return {
                ...u,
                titleRecords: nextRecords,
                titles: activeTitles
              };
            }),
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    removeUnitTitleRecord: (warbandId, unitId, title) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const currentRecords: UnitTitleRecord[] = u.titleRecords || (u.titles || []).map(t => ({
                title: t,
                source: 'user',
                active: true
              }));
              const nextRecords = currentRecords.filter(r => r.title.toLowerCase() !== title.toLowerCase());
              const activeTitles = nextRecords.filter(r => r.active).map(r => r.title);
              return {
                ...u,
                titleRecords: nextRecords,
                titles: activeTitles
              };
            }),
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    setUnitTitleRecords: (warbandId, unitId, records) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const activeTitles = records.filter(r => r.active).map(r => r.title);
              return {
                ...u,
                titleRecords: records,
                titles: activeTitles
              };
            }),
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    saveUnitAsFavourite: (unit) => {
      set((state) => {
        const existing = state.favouriteUnits.filter(u => u.id !== unit.id && u.customName !== unit.customName);
        const updated = [...existing, { ...unit, id: `fav-${Date.now()}` }];
        storage.saveFavouriteUnits(updated);
        return { favouriteUnits: updated };
      });
    },

    removeUnitFromFavourites: (favouriteId) => {
      set((state) => {
        const updated = state.favouriteUnits.filter(u => u.id !== favouriteId);
        storage.saveFavouriteUnits(updated);
        return { favouriteUnits: updated };
      });
    },

    addUnitFromFavourite: (warbandId, favouriteUnit) => {
      set((state) => {
        const newUnit: ActiveUnit = {
          ...favouriteUnit,
          id: `u-${Date.now()}`,
          equippedWeapons: (favouriteUnit.equippedWeapons || []).map(w => ({ ...w, instanceId: `w-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` })),
          equippedArmour: (favouriteUnit.equippedArmour || []).map(a => ({ ...a, instanceId: `a-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` })),
          equippedEquipment: (favouriteUnit.equippedEquipment || []).map(e => ({ ...e, instanceId: `e-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` })),
          status: 'Active',
          currentWounds: 0,
          maxWounds: 1,
          bloodMarkers: 0,
          hasActedThisTurn: false
        };

        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: [...w.units, newUnit],
            updatedAt: new Date().toISOString()
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    // Armory Stash Management
    buyToStash: (warbandId, item) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const existing = w.armoryStash.find((i) => i.id === item.id);
          let newStash: StashedItem[];
          if (existing) {
            newStash = w.armoryStash.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
          } else {
            newStash = [...w.armoryStash, { id: item.id, name: item.name, type: item.type, cost: item.cost, quantity: 1 }];
          }
          const updatedWb = {
            ...w,
            armoryStash: newStash,
            treasuryDucats: Math.max(0, w.treasuryDucats - item.cost)
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    sellFromStash: (warbandId, stashItemId) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const item = w.armoryStash.find((i) => i.id === stashItemId);
          if (!item) return w;

          const sellValue = Math.floor(item.cost / 2);
          let newStash: StashedItem[];
          if (item.quantity > 1) {
            newStash = w.armoryStash.map((i) => (i.id === stashItemId ? { ...i, quantity: i.quantity - 1 } : i));
          } else {
            newStash = w.armoryStash.filter((i) => i.id !== stashItemId);
          }

          const updatedWb = {
            ...w,
            armoryStash: newStash,
            treasuryDucats: w.treasuryDucats + sellValue
          };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    assignStashToUnit: (warbandId, stashItemId, unitId) => {
      const state = get();
      const wb = state.warbands.find((w) => w.id === warbandId);
      if (!wb) return;
      const stashItem = wb.armoryStash.find((i) => i.id === stashItemId);
      if (!stashItem) return;

      if (stashItem.type === 'Weapon') {
        state.equipWeapon(warbandId, unitId, stashItem.id);
      } else if (stashItem.type === 'Armour') {
        state.equipArmour(warbandId, unitId, stashItem.id);
      } else if (stashItem.type === 'Equipment') {
        state.equipEquipment(warbandId, unitId, stashItem.id);
      }

      // Deduct from stash
      set((s) => {
        const updated = s.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          let newStash: StashedItem[];
          if (stashItem.quantity > 1) {
            newStash = w.armoryStash.map((i) => (i.id === stashItemId ? { ...i, quantity: i.quantity - 1 } : i));
          } else {
            newStash = w.armoryStash.filter((i) => i.id !== stashItemId);
          }
          const updatedWb = { ...w, armoryStash: newStash };
          storage.syncWarbandToCloud(updatedWb);
          return updatedWb;
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    // Play Mode
    playTurn: 1,
    incrementTurn: () => {
      set((state) => {
        const nextTurn = state.playTurn + 1;
        const activeWb = state.getActiveWarband();
        if (!activeWb) return { playTurn: nextTurn };

        const updatedUnits = activeWb.units.map((u) => ({
          ...u,
          hasActedThisTurn: false
        }));

        const updatedWarbands = state.warbands.map((w) =>
          w.id === activeWb.id ? { ...w, units: updatedUnits } : w
        );
        storage.saveWarbands(updatedWarbands);
        return { playTurn: nextTurn, warbands: updatedWarbands };
      });
    },

    resetMatchState: () => {
      set((state) => {
        const activeWb = state.getActiveWarband();
        if (!activeWb) return { playTurn: 1 };

        const updatedUnits = activeWb.units.map((u) => ({
          ...u,
          currentWounds: u.maxWounds,
          bloodMarkers: 0,
          status: 'Active' as const,
          hasActedThisTurn: false
        }));

        const updatedWarbands = state.warbands.map((w) =>
          w.id === activeWb.id ? { ...w, units: updatedUnits } : w
        );
        storage.saveWarbands(updatedWarbands);
        return { playTurn: 1, warbands: updatedWarbands };
      });
    },

    updateUnitWounds: (warbandId, unitId, delta) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          return {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const max = Number(u.maxWounds) || 1;
              const cur = Number(u.currentWounds) || 0;
              const next = Math.max(0, Math.min(max, cur + delta));
              let status = u.status;
              if (next === 0 && status === 'Active') status = 'Downed';
              if (next > 0 && status === 'Downed') status = 'Active';
              return { ...u, currentWounds: next, status };
            })
          };
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    updateUnitBloodMarkers: (warbandId, unitId, delta) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          return {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const cur = Number(u.bloodMarkers) || 0;
              // Official Rulebook Cap: max 6 blood markers per warrior
              const next = Math.max(0, Math.min(6, cur + delta));
              return { ...u, bloodMarkers: next };
            })
          };
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    setUnitStatus: (warbandId, unitId, status) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          return {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              return { ...u, status };
            })
          };
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    toggleUnitActed: (warbandId, unitId) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          return {
            ...w,
            units: w.units.map((u) => (u.id === unitId ? { ...u, hasActedThisTurn: !u.hasActedThisTurn } : u))
          };
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    // Keyword popover
    activeKeyword: null,
    setActiveKeyword: (keyword) => set({ activeKeyword: keyword }),

    // Post battle modal
    isPostBattleOpen: false,
    setIsPostBattleOpen: (open) => set({ isPostBattleOpen: open }),

    applyPostBattleResults: (
      scenarioId,
      scenarioName,
      outcome,
      gloryGained,
      ducatsGained,
      casualties,
      advancements,
      narrative,
      narrativeReport,
      mvpUnitName,
      opponentWarbandName,
      notableMoments
    ) => {
      const state = get();
      const activeWb = state.getActiveWarband();
      if (!activeWb) return;

      const updatedUnits = activeWb.units.map((u) => {
        const cas = casualties.find((c) => c.unitId === u.id);
        const adv = advancements.find((a) => a.unitId === u.id);

        let newInjuries = [...u.injuries];
        let isDead = u.isDead;
        let currentRecords: UnitTitleRecord[] = u.titleRecords || (u.titles || []).map(t => ({
          title: t,
          source: 'user',
          active: true
        }));

        if (cas) {
          newInjuries.push(cas.outcome);
          if (cas.isDead) isDead = true;

          const norm = cas.outcome.toLowerCase();
          let earnedTitle: { title: string; origin: string } | null = null;
          if (norm.includes('prominent scar') || norm.includes('scarred')) {
            earnedTitle = { title: 'the Scarred', origin: 'Trauma: Prominent Scar' };
          } else if (norm.includes('lost arm') || norm.includes('crippled') || norm.includes('severed hand')) {
            earnedTitle = { title: 'the Crippled', origin: 'Trauma: Lost Arm' };
          } else if (norm.includes('leg wound') || norm.includes('lame') || norm.includes('limp')) {
            earnedTitle = { title: 'the Lame', origin: 'Trauma: Leg Wound' };
          } else if (norm.includes('lost an eye') || norm.includes('blind') || norm.includes('one-eyed')) {
            earnedTitle = { title: 'the One-Eyed', origin: 'Trauma: Lost an Eye' };
          } else if (norm.includes('chest wound') || norm.includes('iron-ribbed')) {
            earnedTitle = { title: 'the Iron-Ribbed', origin: 'Trauma: Chest Wound' };
          } else if (norm.includes('shell-shocked') || norm.includes('shell shock')) {
            earnedTitle = { title: 'the Shell-Shocked', origin: 'Trauma: Shell-shocked' };
          } else if (norm.includes('possessed')) {
            earnedTitle = { title: 'the Possessed', origin: 'Trauma: Possessed' };
          } else if (norm.includes('hardened') || norm.includes('fearless')) {
            earnedTitle = { title: 'the Fearless', origin: 'Trauma: Hardened' };
          }

          if (earnedTitle && !currentRecords.some(r => r.title.toLowerCase() === earnedTitle!.title.toLowerCase())) {
            currentRecords = [
              ...currentRecords,
              {
                title: earnedTitle.title,
                source: 'injury',
                origin: earnedTitle.origin,
                active: true
              }
            ];
          }
        }

        // Leader Exploration Rewards auto-title check
        if (u.profileSnapshot.category === 'Leader' && narrative) {
          const normN = narrative.toLowerCase();
          if (normN.includes('book of golems') || normN.includes('takwin')) {
            if (!currentRecords.some(r => r.title.toLowerCase() === 'weaver of flesh')) {
              currentRecords = [
                ...currentRecords,
                {
                  title: 'Weaver of Flesh',
                  source: 'exploration',
                  origin: 'Exploration: The Book of Golems',
                  active: true
                }
              ];
            }
          }
        }
        let newAdvancements = [...u.advancements];
        let newXp = u.xp + 1;
        if (adv) {
          newAdvancements.push(adv.advancement);
        }

        let newDeeds = u.deeds ? [...u.deeds] : [];
        if (mvpUnitName && (u.customName.toLowerCase().includes(mvpUnitName.toLowerCase()) || mvpUnitName.toLowerCase().includes(u.customName.toLowerCase()))) {
          newDeeds.unshift(`Match MVP: ${scenarioName} (${outcome})`);
        }

        const activeTitles = currentRecords.filter(r => r.active).map(r => r.title);

        return {
          ...u,
          injuries: newInjuries,
          isDead,
          advancements: newAdvancements,
          deeds: newDeeds,
          titleRecords: currentRecords,
          titles: activeTitles,
          xp: newXp,
          currentWounds: u.maxWounds,
          bloodMarkers: 0,
          status: isDead ? ('Out of Action' as const) : ('Active' as const),
          hasActedThisTurn: false
        };
      });

      const changesSummary: string[] = [
        `Match Result: ${outcome} in ${scenarioName} (+${gloryGained} Glory, +${ducatsGained} Ducats).`
      ];
      if (casualties.length > 0) {
        casualties.forEach((c) => changesSummary.push(`Casualty: ${c.unitName} - ${c.outcome}`));
      }
      if (advancements.length > 0) {
        advancements.forEach((a) => {
          const u = activeWb.units.find((item) => item.id === a.unitId);
          changesSummary.push(`Advancement: ${u?.customName || 'Warrior'} learned ${a.advancement}`);
        });
      }
      if (mvpUnitName) {
        changesSummary.push(`Match MVP: ${mvpUnitName}`);
      }

      const matchId = `m-${Date.now()}`;
      const matchSnapshot: WarbandSnapshot = {
        id: `snap-${Date.now()}`,
        timestamp: new Date().toISOString(),
        label: `Post-Battle: ${scenarioName} (${outcome})`,
        type: 'post_battle',
        matchId,
        scenarioName,
        outcome,
        ducatCost: updatedUnits.reduce((s, u) => s + u.totalCost, 0),
        treasuryDucats: activeWb.treasuryDucats + ducatsGained,
        gloryPoints: activeWb.gloryPoints + gloryGained,
        unitCount: updatedUnits.filter((u) => !u.isDead).length,
        units: JSON.parse(JSON.stringify(updatedUnits)),
        armoryStash: JSON.parse(JSON.stringify(activeWb.armoryStash)),
        changesSummary,
        notes: narrativeReport || narrative
      };

      const existingSnapshots = activeWb.snapshots || [];
      const updatedWarband: Warband = {
        ...activeWb,
        gloryPoints: activeWb.gloryPoints + gloryGained,
        treasuryDucats: activeWb.treasuryDucats + ducatsGained,
        units: updatedUnits,
        snapshots: [...existingSnapshots, matchSnapshot]
      };

      const updatedWarbands = state.warbands.map((w) => (w.id === activeWb.id ? updatedWarband : w));
      storage.saveWarbands(updatedWarbands);
      storage.syncWarbandToCloud(updatedWarband);

      // Create Match Record
      const newMatch: MatchRecord = {
        id: matchId,
        campaignId: state.campaign.id,
        date: new Date().toISOString().split('T')[0],
        scenarioId,
        scenarioName,
        narrativeLog: narrative || `Match completed with outcome: ${outcome}`,
        narrativeReport,
        mvpUnitName,
        opponentWarbandName,
        notableMoments,
        participants: [
          {
            warbandId: activeWb.id,
            warbandName: activeWb.name,
            playerName: 'Commander',
            result: outcome,
            gloryGained,
            ducatsGained,
            casualties
          }
        ]
      };

      // Update Campaign Leaderboard
      const updatedMembers: CampaignMember[] = state.campaign.members.map((m) => {
        if (m.warbandId === activeWb.id) {
          return {
            ...m,
            glory: m.glory + gloryGained,
            treasury: m.treasury + ducatsGained,
            wins: outcome === 'Victory' ? m.wins + 1 : m.wins,
            losses: outcome === 'Defeat' ? m.losses + 1 : m.losses,
            draws: outcome === 'Draw' ? m.draws + 1 : m.draws
          };
        }
        return m;
      });

      const newLog = {
        id: `c-${Date.now()}`,
        timestamp: 'Just now',
        text: `${activeWb.name} fought in ${scenarioName} (${outcome}). Gained ${gloryGained} Glory & ${ducatsGained} Ducats.`,
        category: 'battle' as const
      };

      const updatedCampaign: Campaign = {
        ...state.campaign,
        currentTurn: state.campaign.currentTurn + 1,
        members: updatedMembers,
        matches: [newMatch, ...state.campaign.matches],
        chronicleLogs: [newLog, ...state.campaign.chronicleLogs]
      };

      storage.saveCampaign(updatedCampaign);
      storage.syncCampaignToCloud(updatedCampaign);

      set({
        warbands: updatedWarbands,
        campaign: updatedCampaign,
        isPostBattleOpen: false,
        playTurn: 1
      });
    },

    // Campaign Management
    campaign: storedCampaign,
    createCampaign: (name, maxDucats, gloryThreshold) => {
      const state = get();
      const activeWb = state.getActiveWarband();

      const newCampaign: Campaign = {
        id: `camp-${Date.now()}`,
        name,
        inviteCode: `TRENCH-${Math.floor(1000 + Math.random() * 9000)}`,
        adminName: 'Commander',
        status: 'active',
        currentTurn: 1,
        maxWarbandDucats: maxDucats,
        gloryVictoryThreshold: gloryThreshold,
        members: activeWb
          ? [
              {
                userId: 'user-1',
                playerName: 'Commander',
                warbandId: activeWb.id,
                warbandName: activeWb.name,
                factionId: activeWb.factionId,
                glory: activeWb.gloryPoints,
                rating: activeWb.units.reduce((sum, u) => sum + u.totalCost, 0),
                wins: 0,
                losses: 0,
                draws: 0,
                treasury: activeWb.treasuryDucats
              }
            ]
          : [],
        territories: defaultFreshCampaign.territories,
        matches: [],
        chronicleLogs: [
          {
            id: `c-${Date.now()}`,
            timestamp: 'Just now',
            text: `Crusade campaign "${name}" established.`,
            category: 'territory'
          }
        ]
      };

      storage.saveCampaign(newCampaign);
      storage.syncCampaignToCloud(newCampaign);
      set({ campaign: newCampaign });
    },

    claimTerritory: (territoryId, warbandId, playerName) => {
      set((state) => {
        const updatedTerritories = state.campaign.territories.map((t) =>
          t.id === territoryId
            ? { ...t, controlledByWarbandId: warbandId, controlledByPlayerName: playerName }
            : t
        );

        const newLog = {
          id: `c-${Date.now()}`,
          timestamp: 'Just now',
          text: `${playerName} captured territory: ${
            state.campaign.territories.find((t) => t.id === territoryId)?.name
          }`,
          category: 'territory' as const
        };

        const updatedCampaign: Campaign = {
          ...state.campaign,
          territories: updatedTerritories,
          chronicleLogs: [newLog, ...state.campaign.chronicleLogs]
        };

        storage.saveCampaign(updatedCampaign);
        return { campaign: updatedCampaign };
      });
    },

    logCampaignMatch: (
      p1WarbandId,
      p2WarbandId,
      scenarioName,
      outcome,
      p1Glory,
      p1Ducats,
      p2Glory,
      p2Ducats,
      narrative
    ) => {
      set((state) => {
        const m1 = state.campaign.members.find((m) => m.warbandId === p1WarbandId);
        const m2 = state.campaign.members.find((m) => m.warbandId === p2WarbandId);

        const updatedMembers = state.campaign.members.map((m) => {
          if (m.warbandId === p1WarbandId) {
            return {
              ...m,
              glory: m.glory + p1Glory,
              treasury: m.treasury + p1Ducats,
              wins: outcome === 'p1' ? m.wins + 1 : m.wins,
              losses: outcome === 'p2' ? m.losses + 1 : m.losses,
              draws: outcome === 'draw' ? m.draws + 1 : m.draws
            };
          }
          if (m.warbandId === p2WarbandId) {
            return {
              ...m,
              glory: m.glory + p2Glory,
              treasury: m.treasury + p2Ducats,
              wins: outcome === 'p2' ? m.wins + 1 : m.wins,
              losses: outcome === 'p1' ? m.losses + 1 : m.losses,
              draws: outcome === 'draw' ? m.draws + 1 : m.draws
            };
          }
          return m;
        });

        const newMatch: MatchRecord = {
          id: `m-${Date.now()}`,
          campaignId: state.campaign.id,
          date: new Date().toISOString().split('T')[0],
          scenarioId: 'custom-match',
          scenarioName,
          narrativeLog: narrative || `${m1?.warbandName || 'Warband 1'} vs ${m2?.warbandName || 'Warband 2'} in ${scenarioName}`,
          participants: [
            {
              warbandId: p1WarbandId,
              warbandName: m1?.warbandName || 'Warband 1',
              playerName: m1?.playerName || 'Player 1',
              result: outcome === 'p1' ? 'Victory' : outcome === 'p2' ? 'Defeat' : 'Draw',
              gloryGained: p1Glory,
              ducatsGained: p1Ducats,
              casualties: []
            },
            {
              warbandId: p2WarbandId,
              warbandName: m2?.warbandName || 'Warband 2',
              playerName: m2?.playerName || 'Player 2',
              result: outcome === 'p2' ? 'Victory' : outcome === 'p1' ? 'Defeat' : 'Draw',
              gloryGained: p2Glory,
              ducatsGained: p2Ducats,
              casualties: []
            }
          ]
        };

        const newLog = {
          id: `c-${Date.now()}`,
          timestamp: 'Just now',
          text: `Match logged: ${m1?.warbandName || 'P1'} vs ${m2?.warbandName || 'P2'} (${scenarioName}).`,
          category: 'battle' as const
        };

        const updatedCampaign: Campaign = {
          ...state.campaign,
          currentTurn: state.campaign.currentTurn + 1,
          members: updatedMembers,
          matches: [newMatch, ...state.campaign.matches],
          chronicleLogs: [newLog, ...state.campaign.chronicleLogs]
        };

        storage.saveCampaign(updatedCampaign);
        storage.syncCampaignToCloud(updatedCampaign);
        return { campaign: updatedCampaign };
      });
    },

    updateMatchNarrative: (campaignId, matchId, narrativeReport, mvpUnitName, opponentName, notableMoments) => {
      set((state) => {
        const updatedMatches = state.campaign.matches.map((m) => {
          if (m.id !== matchId) return m;
          return {
            ...m,
            narrativeReport,
            mvpUnitName: mvpUnitName !== undefined ? mvpUnitName : m.mvpUnitName,
            opponentWarbandName: opponentName !== undefined ? opponentName : m.opponentWarbandName,
            notableMoments: notableMoments !== undefined ? notableMoments : m.notableMoments
          };
        });

        const updatedCampaign: Campaign = {
          ...state.campaign,
          matches: updatedMatches
        };

        storage.saveCampaign(updatedCampaign);
        storage.syncCampaignToCloud(updatedCampaign);
        return { campaign: updatedCampaign };
      });
    },

    // Customizer
    saveCustomUnit: (unit) => {
      set((state) => {
        const existing = state.customUnits.filter((u) => u.id !== unit.id);
        const updated = [...existing, { ...unit, isCustom: true }];
        storage.saveCustomUnits(updated);
        return {
          customUnits: updated,
          units: [...BASE_UNITS, ...updated]
        };
      });
    },

    deleteCustomUnit: (id) => {
      set((state) => {
        const updated = state.customUnits.filter((u) => u.id !== id);
        storage.saveCustomUnits(updated);
        return {
          customUnits: updated,
          units: [...BASE_UNITS, ...updated]
        };
      });
    },

    saveCustomWeapon: (weapon) => {
      set((state) => {
        const existing = state.customWeapons.filter((w) => w.id !== weapon.id);
        const updated = [...existing, { ...weapon, isCustom: true }];
        storage.saveCustomWeapons(updated);
        return {
          customWeapons: updated,
          weapons: [...BASE_WEAPONS, ...updated]
        };
      });
    },

    deleteCustomWeapon: (id) => {
      set((state) => {
        const updated = state.customWeapons.filter((w) => w.id !== id);
        storage.saveCustomWeapons(updated);
        return {
          customWeapons: updated,
          weapons: [...BASE_WEAPONS, ...updated]
        };
      });
    },

    saveCustomArmour: (armourItem) => {
      set((state) => {
        const existing = state.customArmour.filter((a) => a.id !== armourItem.id);
        const updated = [...existing, { ...armourItem, isCustom: true }];
        return {
          customArmour: updated,
          armour: [...BASE_ARMOUR, ...updated]
        };
      });
    },

    deleteCustomArmour: (id) => {
      set((state) => {
        const updated = state.customArmour.filter((a) => a.id !== id);
        return {
          customArmour: updated,
          armour: [...BASE_ARMOUR, ...updated]
        };
      });
    },

    saveCustomEquipment: (equipmentItem) => {
      set((state) => {
        const existing = state.customEquipment.filter((e) => e.id !== equipmentItem.id);
        const updated = [...existing, { ...equipmentItem, isCustom: true }];
        return {
          customEquipment: updated,
          equipment: [...BASE_EQUIPMENT, ...updated]
        };
      });
    },

    deleteCustomEquipment: (id) => {
      set((state) => {
        const updated = state.customEquipment.filter((e) => e.id !== id);
        return {
          customEquipment: updated,
          equipment: [...BASE_EQUIPMENT, ...updated]
        };
      });
    },

    // GitHub Diff & Sync
    pendingDiffs: [],
    setPendingDiffs: (diffs) => set({ pendingDiffs: diffs }),
    resolveDiff: (diffId) => {
      set((state) => {
        const updated = state.pendingDiffs.filter((d) => d.id !== diffId);
        return { pendingDiffs: updated };
      });
    }
  };
});
