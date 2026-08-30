/**
 * The rule catalogs, and the player's own additions to them.
 *
 * The base entries come from the generated dataset via `hydrateCatalogs` — see
 * `src/rules/recruitable.ts` for why, and for what the hand-written
 * `BASE_UNITS` this replaced got wrong. Custom entries are the player's and the
 * pipeline has nothing to say about them, so the two are kept apart: a custom
 * entry carries `isCustom`, and hydrating replaces everything that does not.
 */
import type { StateCreator } from 'zustand';
import type { AppState } from '../state';
import { storage } from '../../services/storage';
import { FACTIONS } from '../../data/defaultRules';
import { recruitable } from '../../rules/recruitable';
import type { InitialState } from '../init';

export type CatalogSlice = Pick<AppState, 'factions' | 'units' | 'weapons' | 'armour' | 'equipment' | 'catalogsLoaded' | 'catalogsError' | 'gloryPriced' | 'hydrateCatalogs' | 'customUnits' | 'customWeapons' | 'customArmour' | 'customEquipment' | 'favouriteUnits' | 'saveCustomUnit' | 'deleteCustomUnit' | 'saveCustomWeapon' | 'deleteCustomWeapon' | 'saveCustomArmour' | 'deleteCustomArmour' | 'saveCustomEquipment' | 'deleteCustomEquipment'>;

export const createCatalogSlice = (init: InitialState): StateCreator<AppState, [], [], CatalogSlice> =>
  (set, get) => ({
    factions: FACTIONS,
    units: [...init.customUnits],
    weapons: [...init.customWeapons],
    armour: [],
    equipment: [],
    catalogsLoaded: false,
    catalogsError: null,
    gloryPriced: [],
    hydrateCatalogs: (dataset, factionId) => {
      // The app's faction ids, so the recruit list filters on the spelling it
      // uses rather than the catalogue's.
      const r = recruitable(dataset, factionId, get().factions.map((f) => f.id));
      set((s) => ({
        // Custom entries stay: they are the player's own, and the pipeline
        // has nothing to say about them.
        units: [...r.units, ...s.customUnits],
        weapons: [...r.weapons, ...s.customWeapons],
        armour: [...r.armour, ...s.customArmour],
        equipment: [...r.equipment, ...s.customEquipment],
        gloryPriced: r.gloryPriced,
        catalogsLoaded: true,
        catalogsError: null,
      }));
    },
    customUnits: init.customUnits,
    customWeapons: init.customWeapons,
    customArmour: [],
    customEquipment: [],
    favouriteUnits: storage.getFavouriteUnits(),

    saveCustomUnit: (unit) => {
      set((state) => {
        const existing = state.customUnits.filter((u) => u.id !== unit.id);
        const updated = [...existing, { ...unit, isCustom: true }];
        storage.saveCustomUnits(updated);
        return {
          customUnits: updated,
          // Keep whatever the dataset put here; swap only the custom tail.
          units: [...state.units.filter((x) => !x.isCustom), ...updated]
        };
      });
    },

    deleteCustomUnit: (id) => {
      set((state) => {
        const updated = state.customUnits.filter((u) => u.id !== id);
        storage.saveCustomUnits(updated);
        return {
          customUnits: updated,
          // Keep whatever the dataset put here; swap only the custom tail.
          units: [...state.units.filter((x) => !x.isCustom), ...updated]
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
          // Keep whatever the dataset put here; swap only the custom tail.
          weapons: [...state.weapons.filter((x) => !x.isCustom), ...updated]
        };
      });
    },

    deleteCustomWeapon: (id) => {
      set((state) => {
        const updated = state.customWeapons.filter((w) => w.id !== id);
        storage.saveCustomWeapons(updated);
        return {
          customWeapons: updated,
          // Keep whatever the dataset put here; swap only the custom tail.
          weapons: [...state.weapons.filter((x) => !x.isCustom), ...updated]
        };
      });
    },

    saveCustomArmour: (armourItem) => {
      set((state) => {
        const existing = state.customArmour.filter((a) => a.id !== armourItem.id);
        const updated = [...existing, { ...armourItem, isCustom: true }];
        return {
          customArmour: updated,
          // Keep whatever the dataset put here; swap only the custom tail.
          armour: [...state.armour.filter((x) => !x.isCustom), ...updated]
        };
      });
    },

    deleteCustomArmour: (id) => {
      set((state) => {
        const updated = state.customArmour.filter((a) => a.id !== id);
        return {
          customArmour: updated,
          // Keep whatever the dataset put here; swap only the custom tail.
          armour: [...state.armour.filter((x) => !x.isCustom), ...updated]
        };
      });
    },

    saveCustomEquipment: (equipmentItem) => {
      set((state) => {
        const existing = state.customEquipment.filter((e) => e.id !== equipmentItem.id);
        const updated = [...existing, { ...equipmentItem, isCustom: true }];
        return {
          customEquipment: updated,
          // Keep whatever the dataset put here; swap only the custom tail.
          equipment: [...state.equipment.filter((x) => !x.isCustom), ...updated]
        };
      });
    },

    deleteCustomEquipment: (id) => {
      set((state) => {
        const updated = state.customEquipment.filter((e) => e.id !== id);
        return {
          customEquipment: updated,
          // Keep whatever the dataset put here; swap only the custom tail.
          equipment: [...state.equipment.filter((x) => !x.isCustom), ...updated]
        };
      });
    },

    // GitHub Diff & Sync
});
