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
import { factionOf } from '../../rules/variants';
import { gloryItemPermission } from '../../rules/gloryItems';
import type { InitialState } from '../init';

export type CatalogSlice = Pick<AppState, 'markers' | 'factions' | 'units' | 'weapons' | 'armour' | 'equipment' | 'catalogsLoaded' | 'catalogsError' | 'gloryPriced' | 'hydrateCatalogs' | 'customUnits' | 'customWeapons' | 'customArmour' | 'customEquipment' | 'favouriteUnits' | 'saveCustomUnit' | 'deleteCustomUnit' | 'saveCustomWeapon' | 'deleteCustomWeapon' | 'saveCustomArmour' | 'deleteCustomArmour' | 'saveCustomEquipment' | 'deleteCustomEquipment'>;

export const createCatalogSlice = (init: InitialState): StateCreator<AppState, [], [], CatalogSlice> =>
  (set, get) => ({
    markers: [],
    factions: FACTIONS,
    units: [...init.customUnits],
    weapons: [...init.customWeapons],
    armour: [],
    equipment: [],
    catalogsLoaded: false,
    catalogsError: null,
    gloryPriced: [],
    hydrateCatalogs: (dataset, factionId, variantId, held) => {
      // The app's faction ids, so the recruit list filters on the spelling it
      // uses rather than the catalogue's. The Variant decides what that list
      // actually contains and what each entry is called — see `recruitable`.
      //
      // `held` is the Warband's Exploration effects, which is what opens its
      // Glory Item Table (p.125, RR-14). Passed as the effects rather than as a
      // permission so the one place that reads the Locations' sentences stays
      // `gloryItemPermission`; a store slice is not where a rule is decided.
      const r = recruitable(
        dataset, factionId, get().factions.map((f) => f.id), variantId,
        gloryItemPermission(dataset, held));
      set((s) => ({
        /*
          The battle marker pools, so the match slice clamps to the cap the
          book prints rather than to a literal. Empty until now, which is why
          a cap is not enforced before the dataset has loaded rather than
          being guessed at.
        */
        markers: dataset.markers ?? [],
        /*
          The faction's special rules, from the books.

          `FACTIONS` used to carry a hand-written `rules` array — "Voice of
          Command", "Ecstatic Zeal" — and none of those rules is printed
          anywhere. The books' actual faction rules are parsed into
          `dataset.factions[].specialRules`, and the validator has read them
          from there since Phase 2; only the UI was still showing the invented
          ones. Matched with `sameFaction` because the app, the catalogues and
          the rulebook parser each spell a faction id differently.

          A faction the dataset does not carry keeps an empty list rather than
          a stand-in, so "this faction has no special rules in the ruleset you
          selected" reads as exactly that.
        */
        factions: s.factions.map((f) => ({
          ...f,
          specialRules: factionOf(dataset, f.id)?.specialRules ?? [],
        })),
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
