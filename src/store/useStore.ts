import { create } from 'zustand';
import { Warband, ActiveUnit, EquippedWeapon, EquippedArmour, EquippedEquipment } from '../types/warband';
import { Campaign, MatchRecord, CasualtyRecord, CampaignMember } from '../types/campaign';
import { UnitProfile, WeaponProfile, ArmourProfile, EquipmentItem, Faction, RuleKeyword, Scenario } from '../types/rules';
import { RuleDiffItem } from '../types/diff';
import { FACTIONS, BASE_UNITS, BASE_WEAPONS, BASE_ARMOUR, BASE_EQUIPMENT, KEYWORDS, SCENARIOS } from '../data/defaultRules';
import { storage } from '../services/storage';

export type AppView = 'builder' | 'play' | 'campaign' | 'codex' | 'customizer';

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

  // Warband Management
  warbands: Warband[];
  activeWarbandId: string | null;
  getActiveWarband: () => Warband | null;
  createWarband: (name: string, factionId: string, ducatLimit?: number) => Warband;
  deleteWarband: (id: string) => void;
  cloneWarband: (id: string) => void;
  setActiveWarbandId: (id: string) => void;
  updateWarbandNotes: (warbandId: string, notes: string) => void;

  // Active Warband Unit Management
  addUnitToWarband: (warbandId: string, baseProfileId: string, customName?: string) => void;
  duplicateUnit: (warbandId: string, unitId: string) => void;
  removeUnitFromWarband: (warbandId: string, unitId: string) => void;
  updateUnitName: (warbandId: string, unitId: string, name: string) => void;
  equipWeapon: (warbandId: string, unitId: string, weaponId: string) => void;
  removeWeapon: (warbandId: string, unitId: string, instanceId: string) => void;
  equipArmour: (warbandId: string, unitId: string, armourId: string) => void;
  removeArmour: (warbandId: string, unitId: string, instanceId: string) => void;
  equipEquipment: (warbandId: string, unitId: string, equipmentId: string) => void;
  removeEquipment: (warbandId: string, unitId: string, instanceId: string) => void;

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
    narrative: string
  ) => void;

  // Multiplayer Campaign State
  campaign: Campaign;
  createCampaign: (name: string, maxDucats: number, gloryThreshold: number) => void;
  claimTerritory: (territoryId: string, warbandId: string, playerName: string) => void;

  // Customizer & Overrides
  saveCustomUnit: (unit: UnitProfile) => void;
  deleteCustomUnit: (id: string) => void;
  saveCustomWeapon: (weapon: WeaponProfile) => void;

  // GitHub Diff & Sync
  pendingDiffs: RuleDiffItem[];
  setPendingDiffs: (diffs: RuleDiffItem[]) => void;
  resolveDiff: (diffId: string, resolution: 'keep_user' | 'accept_upstream') => void;
}

// Initial Sample Warband
const initialWarbands: Warband[] = [
  {
    id: 'wb-demo-1',
    name: '3rd Holy Trench Lancers',
    factionId: 'new-antioch',
    ducatLimit: 700,
    treasuryDucats: 45,
    gloryPoints: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: 'Veteran trench vanguard of the Antioch Front.',
    armoryStash: [
      { id: 'frag-grenades', name: 'Stick Grenade Bundle', type: 'Equipment', cost: 10, quantity: 2 },
      { id: 'gas-mask', name: 'Standard Issue Gas Mask', type: 'Equipment', cost: 5, quantity: 1 }
    ],
    units: [
      {
        id: 'u-1',
        customName: 'Lieutenant Valerius',
        baseProfileId: 'na-lieutenant',
        profileSnapshot: BASE_UNITS[0],
        equippedWeapons: [
          { ...BASE_WEAPONS[6], instanceId: 'w-1' }, // Service rifle
          { ...BASE_WEAPONS[0], instanceId: 'w-2' }  // Trench knife
        ],
        equippedArmour: [{ ...BASE_ARMOUR[0], instanceId: 'a-1' }],
        equippedEquipment: [{ ...BASE_EQUIPMENT[0], instanceId: 'e-1' }],
        xp: 4,
        advancements: ['+1 Melee'],
        injuries: ['Lost Eye (-1 RNG)'],
        isDead: false,
        totalCost: 120,
        currentWounds: 3,
        maxWounds: 3,
        bloodMarkers: 0,
        status: 'Active',
        hasActedThisTurn: false
      },
      {
        id: 'u-2',
        customName: 'Brother Gabriel',
        baseProfileId: 'na-cleric',
        profileSnapshot: BASE_UNITS[1],
        equippedWeapons: [{ ...BASE_WEAPONS[2], instanceId: 'w-3' }], // Sanctified greatsword
        equippedArmour: [{ ...BASE_ARMOUR[0], instanceId: 'a-2' }],
        equippedEquipment: [{ ...BASE_EQUIPMENT[1], instanceId: 'e-2' }],
        xp: 2,
        advancements: [],
        injuries: [],
        isDead: false,
        totalCost: 100,
        currentWounds: 2,
        maxWounds: 2,
        bloodMarkers: 0,
        status: 'Active',
        hasActedThisTurn: false
      },
      {
        id: 'u-3',
        customName: 'Trooper Klaus',
        baseProfileId: 'na-shocktrooper',
        profileSnapshot: BASE_UNITS[2],
        equippedWeapons: [
          { ...BASE_WEAPONS[6], instanceId: 'w-4' },
          { ...BASE_WEAPONS[0], instanceId: 'w-5' }
        ],
        equippedArmour: [{ ...BASE_ARMOUR[0], instanceId: 'a-3' }],
        equippedEquipment: [],
        xp: 1,
        advancements: [],
        injuries: [],
        isDead: false,
        totalCost: 55,
        currentWounds: 1,
        maxWounds: 1,
        bloodMarkers: 0,
        status: 'Active',
        hasActedThisTurn: false
      },
      {
        id: 'u-4',
        customName: 'Trooper Meyer',
        baseProfileId: 'na-shocktrooper',
        profileSnapshot: BASE_UNITS[2],
        equippedWeapons: [
          { ...BASE_WEAPONS[7], instanceId: 'w-6' }, // Trench shotgun
          { ...BASE_WEAPONS[0], instanceId: 'w-7' }
        ],
        equippedArmour: [{ ...BASE_ARMOUR[0], instanceId: 'a-4' }],
        equippedEquipment: [],
        xp: 0,
        advancements: [],
        injuries: [],
        isDead: false,
        totalCost: 60,
        currentWounds: 1,
        maxWounds: 1,
        bloodMarkers: 0,
        status: 'Active',
        hasActedThisTurn: false
      }
    ]
  }
];

const initialCampaign: Campaign = {
  id: 'camp-101',
  name: 'The Siege of Antioch Sector IV',
  inviteCode: 'TRENCH-7749',
  adminName: 'Nick (Commander)',
  status: 'active',
  currentTurn: 3,
  maxWarbandDucats: 700,
  gloryVictoryThreshold: 25,
  members: [
    {
      userId: 'user-1',
      playerName: 'Nick',
      warbandId: 'wb-demo-1',
      warbandName: '3rd Holy Trench Lancers',
      factionId: 'new-antioch',
      glory: 12,
      rating: 335,
      wins: 2,
      losses: 0,
      draws: 1,
      treasury: 45
    },
    {
      userId: 'user-2',
      playerName: 'Marcus',
      warbandId: 'wb-demo-2',
      warbandName: 'The Red Penance',
      factionId: 'trench-pilgrims',
      glory: 9,
      rating: 290,
      wins: 1,
      losses: 1,
      draws: 1,
      treasury: 20
    },
    {
      userId: 'user-3',
      playerName: 'Dave',
      warbandId: 'wb-demo-3',
      warbandName: 'Lords of the Ashen Gate',
      factionId: 'heretic-legion',
      glory: 14,
      rating: 360,
      wins: 2,
      losses: 1,
      draws: 0,
      treasury: 60
    }
  ],
  territories: [
    {
      id: 't-1',
      name: 'North Trench Sector A-1',
      type: 'Trench Line',
      controlledByWarbandId: 'wb-demo-1',
      controlledByPlayerName: 'Nick',
      perk: '+5 Ducats supply bonus per round',
      description: 'Heavily fortified firing step overlooking the crater field.'
    },
    {
      id: 't-2',
      name: 'Shrine of the Weeping Martyr',
      type: 'Ruined Shrine',
      controlledByWarbandId: 'wb-demo-2',
      controlledByPlayerName: 'Marcus',
      perk: 'Reroll 1 failed Morale check per match',
      description: 'Shattered marble chapel providing divine reassurance.'
    },
    {
      id: 't-3',
      name: 'The Iron Foundry Bunker',
      type: 'Munitions Bunker',
      controlledByWarbandId: 'wb-demo-3',
      controlledByPlayerName: 'Dave',
      perk: 'Free Frag Grenade in Warband Stash after each game',
      description: 'Underground armory depot filled with unexploded ordinance.'
    },
    {
      id: 't-4',
      name: 'Dead Man\'s Crater (Center)',
      type: 'No Man\'s Land',
      perk: '+2 Glory on Victory when defending',
      description: 'Contested central wasteland strewn with barbed wire and ruined tanks.'
    }
  ],
  matches: [
    {
      id: 'm-1',
      campaignId: 'camp-101',
      date: '2026-08-24',
      scenarioId: 'trench-raid',
      scenarioName: 'Scenario 1: Trench Night Raid',
      narrativeLog: 'The 3rd Holy Trench Lancers held the north bunker against an assault by the Lords of the Ashen Gate.',
      participants: [
        {
          warbandId: 'wb-demo-1',
          warbandName: '3rd Holy Trench Lancers',
          playerName: 'Nick',
          result: 'Victory',
          gloryGained: 4,
          ducatsGained: 35,
          casualties: []
        },
        {
          warbandId: 'wb-demo-3',
          warbandName: 'Lords of the Ashen Gate',
          playerName: 'Dave',
          result: 'Defeat',
          gloryGained: 1,
          ducatsGained: 15,
          casualties: [{ unitId: 'hl-trooper-1', unitName: 'Heretic Soldier', outcome: 'D66: 33 - Cracked Skull', isDead: false }]
        }
      ]
    }
  ],
  chronicleLogs: [
    {
      id: 'c-1',
      timestamp: '2 days ago',
      text: 'Campaign initiated with 3 warbands contesting Sector IV.',
      category: 'territory'
    },
    {
      id: 'c-2',
      timestamp: 'Yesterday',
      text: '3rd Holy Trench Lancers defeated Lords of the Ashen Gate in Scenario 1 (Trench Night Raid).',
      category: 'battle'
    }
  ]
};

export const useStore = create<AppState>((set, get) => {
  const storedWarbands = storage.getWarbands();
  const warbands = storedWarbands.length > 0 ? storedWarbands : initialWarbands;
  const activeWarbandId = storage.getActiveWarbandId() || warbands[0]?.id || null;
  const customUnits = storage.getCustomUnits();
  const customWeapons = storage.getCustomWeapons();
  const storedCampaign = storage.getCampaign() || initialCampaign;

  return {
    currentView: 'builder',
    setCurrentView: (view) => set({ currentView: view }),

    factions: FACTIONS,
    units: [...BASE_UNITS, ...customUnits],
    weapons: [...BASE_WEAPONS, ...customWeapons],
    armour: BASE_ARMOUR,
    equipment: BASE_EQUIPMENT,
    keywords: KEYWORDS,
    scenarios: SCENARIOS,
    customUnits,
    customWeapons,

    warbands,
    activeWarbandId,

    getActiveWarband: () => {
      const state = get();
      return state.warbands.find((w) => w.id === state.activeWarbandId) || null;
    },

    createWarband: (name, factionId, ducatLimit = 700) => {
      const newWarband: Warband = {
        id: `wb-${Date.now()}`,
        name,
        factionId,
        ducatLimit,
        treasuryDucats: 0,
        gloryPoints: 0,
        units: [],
        armoryStash: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      set((state) => {
        const updated = [...state.warbands, newWarband];
        storage.saveWarbands(updated);
        storage.setActiveWarbandId(newWarband.id);
        return { warbands: updated, activeWarbandId: newWarband.id };
      });

      return newWarband;
    },

    deleteWarband: (id) => {
      set((state) => {
        const updated = state.warbands.filter((w) => w.id !== id);
        storage.saveWarbands(updated);
        const nextActive = updated[0]?.id || null;
        if (nextActive) storage.setActiveWarbandId(nextActive);
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
        return { warbands: updated, activeWarbandId: cloned.id };
      });
    },

    setActiveWarbandId: (id) => {
      storage.setActiveWarbandId(id);
      set({ activeWarbandId: id });
    },

    updateWarbandNotes: (warbandId, notes) => {
      set((state) => {
        const updated = state.warbands.map((w) => (w.id === warbandId ? { ...w, notes } : w));
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

      const maxHp = profile.stats.keywords.some(k => k.toLowerCase().includes('tough')) ? 2 : 1;

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
          return {
            ...w,
            units: [...w.units, newUnit],
            updatedAt: new Date().toISOString()
          };
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
          return {
            ...w,
            units: [...w.units, clonedUnit],
            updatedAt: new Date().toISOString()
          };
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    removeUnitFromWarband: (warbandId, unitId) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          return {
            ...w,
            units: w.units.filter((u) => u.id !== unitId),
            updatedAt: new Date().toISOString()
          };
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    updateUnitName: (warbandId, unitId, name) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          return {
            ...w,
            units: w.units.map((u) => (u.id === unitId ? { ...u, customName: name } : u))
          };
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
          return {
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
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    removeWeapon: (warbandId, unitId, instanceId) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          return {
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
          return {
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
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    removeArmour: (warbandId, unitId, instanceId) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          return {
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
          return {
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
        });
        storage.saveWarbands(updated);
        return { warbands: updated };
      });
    },

    removeEquipment: (warbandId, unitId, instanceId) => {
      set((state) => {
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          return {
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
              const next = Math.max(0, Math.min(u.maxWounds, u.currentWounds + delta));
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
              return { ...u, bloodMarkers: Math.max(0, u.bloodMarkers + delta) };
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
      narrative
    ) => {
      const state = get();
      const activeWb = state.getActiveWarband();
      if (!activeWb) return;

      // Update active warband units (injuries, xp, advancements)
      const updatedUnits = activeWb.units.map((u) => {
        const cas = casualties.find((c) => c.unitId === u.id);
        const adv = advancements.find((a) => a.unitId === u.id);

        let newInjuries = [...u.injuries];
        let isDead = u.isDead;
        if (cas) {
          newInjuries.push(cas.outcome);
          if (cas.isDead) isDead = true;
        }

        let newAdvancements = [...u.advancements];
        let newXp = u.xp + 1; // standard battle survival XP
        if (adv) {
          newAdvancements.push(adv.advancement);
        }

        return {
          ...u,
          injuries: newInjuries,
          isDead,
          advancements: newAdvancements,
          xp: newXp,
          currentWounds: u.maxWounds,
          bloodMarkers: 0,
          status: isDead ? ('Out of Action' as const) : ('Active' as const),
          hasActedThisTurn: false
        };
      });

      const updatedWarband: Warband = {
        ...activeWb,
        gloryPoints: activeWb.gloryPoints + gloryGained,
        treasuryDucats: activeWb.treasuryDucats + ducatsGained,
        units: updatedUnits
      };

      const updatedWarbands = state.warbands.map((w) => (w.id === activeWb.id ? updatedWarband : w));
      storage.saveWarbands(updatedWarbands);

      // Create Match Record
      const newMatch: MatchRecord = {
        id: `m-${Date.now()}`,
        campaignId: state.campaign.id,
        date: new Date().toISOString().split('T')[0],
        scenarioId,
        scenarioName,
        narrativeLog: narrative || `Match completed with outcome: ${outcome}`,
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
        territories: initialCampaign.territories,
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
