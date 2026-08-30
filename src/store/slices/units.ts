/**
 * Models on a roster: recruiting, naming, and what they carry.
 *
 * `addUnitToWarband` looks the profile up in `units`, which the dataset fills —
 * so what a player can add is now what the catalogues actually contain.
 */
import type { StateCreator } from 'zustand';
import type { AppState } from '../state';
import { storage } from '../../services/storage';
import type { ActiveUnit, EquippedWeapon, EquippedArmour, EquippedEquipment } from '../../types/warband';
import type { UnitCategory } from '../../types/rules';

export type UnitsSlice = Pick<AppState, 'addUnitToWarband' | 'duplicateUnit' | 'removeUnitFromWarband' | 'updateUnitName' | 'updateUnitCategory' | 'setUnitAsLeader' | 'updateUnitLore' | 'equipWeapon' | 'removeWeapon' | 'equipArmour' | 'removeArmour' | 'equipEquipment' | 'removeEquipment'>;

export const createUnitsSlice: StateCreator<AppState, [], [], UnitsSlice> = (set, get) => ({
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
});
