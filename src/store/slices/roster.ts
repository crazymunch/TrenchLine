/**
 * Warbands: creating, cloning, importing, snapshotting, and the cloud sync.
 *
 * Also the armoury stash and the favourites list, both of which are warband
 * scoped rather than unit scoped.
 */
import type { StateCreator } from 'zustand';
import type { AppState } from '../state';
import { storage } from '../../services/storage';
import { enrichUnitWithLore } from '../../data/warbandLore';
import type { Warband, ActiveUnit, StashedItem, WarbandSnapshot } from '../../types/warband';
import type { CampaignMember } from '../../types/campaign';
import type { InitialState } from '../init';
import { persistWarbands, mergeWarbands } from '../persist';
import { outbox } from '../../services/sync';

export type RosterSlice = Pick<AppState, 'allCloudWarbands' | 'fetchAllCloudWarbands' | 'syncUserWarbandsWithCloud' | 'sync' | 'warbands' | 'activeWarbandId' | 'getActiveWarband' | 'createWarband' | 'importWarband' | 'saveWarbandSnapshot' | 'restoreWarbandSnapshot' | 'enrollWarbandInCampaign' | 'removeWarbandFromCampaign' | 'deleteWarband' | 'cloneWarband' | 'setActiveWarbandId' | 'updateWarbandNotes' | 'updateWarbandDucatLimit' | 'updateWarbandTreasury' | 'updateWarbandGlory' | 'updateWarbandVariant' | 'setWarbandAllowThirdParty' | 'updateWarbandLore' | 'updateWarbandChronicleLog' | 'addWarbandChronicleEntry' | 'saveUnitAsFavourite' | 'removeUnitFromFavourites' | 'addUnitFromFavourite' | 'buyToStash' | 'sellFromStash' | 'assignStashToUnit'>;

export const createRosterSlice = (init: InitialState): StateCreator<AppState, [], [], RosterSlice> =>
  (set, get) => ({
    allCloudWarbands: [],
    fetchAllCloudWarbands: async () => {
      const res = await storage.fetchAllWarbandsFromCloud();
      // The public directory. A failure leaves the previous list alone rather
      // than blanking the view; the sync banner carries the reason.
      if (res.ok) set({ allCloudWarbands: res.data });
    },

    sync: { kind: 'local-only' },

    /**
     * Reconcile the device with the cloud.
     *
     * The order is the fix. Fetch first, and if the fetch fails, **stop** — do
     * not push. The previous version treated a failed fetch as an empty cloud,
     * merged against nothing and then pushed the local list over the top, so
     * syncing while offline could overwrite good cloud data with a stale local
     * copy.
     *
     * Then push only what the outbox says is unpushed. The previous version
     * pushed every warband it held on every run, which rewrote each one's
     * server timestamp to now — so merely opening the app on a second device
     * made that device's copies look newer than the first device's real edits,
     * and the first device's work lost on its next sync. That is the defect
     * that compounded, because every sync made it worse.
     */
    syncUserWarbandsWithCloud: async (userEmail?: string, userName?: string) => {
      // No signed-in user is not a failure. Local-only is a supported way to
      // use the app, and saying so beats a spinner that never resolves.
      if (!userEmail) {
        set({ sync: { kind: 'local-only' } });
        return;
      }

      set({ sync: { kind: 'syncing' } });

      const fetched = await storage.fetchWarbandsFromCloud();
      if (!fetched.ok) {
        set({ sync: { kind: 'error', reason: fetched.reason, detail: fetched.detail, pending: outbox.size() } });
        return;
      }

      const state = get();
      const named = fetched.data.map((cw) => ({
        ...cw,
        creatorName: cw.creatorName || userName || 'Crusade Commander',
        units: (cw.units ?? []).map(enrichUnitWithLore),
      }));

      // Deliberately not through persistWarbands: taking a warband from the
      // cloud is not the player editing it, and stamping it here would queue
      // it straight back for a push and make it beat the copy it came from.
      const { merged } = mergeWarbands(state.warbands, named, new Set(outbox.ids()));
      storage.saveWarbands(merged);

      const activeId = state.activeWarbandId && merged.some((w) => w.id === state.activeWarbandId)
        ? state.activeWarbandId
        : merged[0]?.id || null;
      set({ warbands: merged, activeWarbandId: activeId });

      // Push the backlog. A warband leaves the outbox only once the server has
      // taken it, so a failure keeps it queued rather than losing it.
      let firstFailure: { reason: 'offline' | 'unauthenticated' | 'server'; detail: string } | null = null;

      for (const id of outbox.ids()) {
        const wb = merged.find((w) => w.id === id);
        if (!wb) { outbox.clear(id); continue; }
        const res = await storage.syncWarbandToCloud({
          ...wb,
          creatorName: wb.creatorName || userName || 'Crusade Commander',
        });
        if (res.ok) outbox.clear(id);
        else if (!firstFailure) firstFailure = { reason: res.reason, detail: res.detail };
      }

      const pending = outbox.size();
      if (firstFailure) set({ sync: { kind: 'error', ...firstFailure, pending } });
      else if (pending) set({ sync: { kind: 'pending', count: pending } });
      else set({ sync: { kind: 'synced', at: new Date().toISOString() } });
    },

    warbands: init.warbands,
    activeWarbandId: init.activeWarbandId,

    getActiveWarband: () => {
      const state = get();
      return state.warbands.find((w) => w.id === state.activeWarbandId) || null;
    },

    /*
      `founding` carries the two things that are decided at muster and nowhere
      else. The Variant changes what the Warband may recruit, so choosing it
      after the first models are on the roster means recruiting against a list
      that was not the one in force. Glory is a starting balance an unrestricted
      Warband sets alongside its Ducats — a campaign Warband starts on zero,
      which is published, so the field is ignored for one.
    */
    createWarband: (name, factionId, ducatLimit = 700, forceMode = 'campaign', founding) => {
      const foundingSnapshot: WarbandSnapshot = {
        id: `snap-${Date.now()}`,
        timestamp: new Date().toISOString(),
        label: '1. Founding Muster',
        type: 'founding',
        ducatCost: 0,
        treasuryDucats: 0,
        // The founding snapshot records the Warband as it was founded, so a
        // starting Glory balance belongs in it — restoring to the founding
        // state otherwise silently zeroed it.
        gloryPoints: forceMode === 'unrestricted' ? (founding?.gloryPoints ?? 0) : 0,
        unitCount: 0,
        units: [],
        armoryStash: [],
        changesSummary: ['Warband established and ready for initial recruitment.']
      };

      const now = new Date().toISOString();
      const newWarband: Warband = {
        id: `wb-${Date.now()}`,
        name,
        factionId,
        forceMode,
        variantId: founding?.variantId,
        allowThirdParty: founding?.allowThirdParty ?? false,
        // A campaign warband opens its ledger with the founding allowance, so
        // the Strongbox is the sum of a history from the first Ducat rather than
        // a number that was set and is later edited.
        ledger: forceMode === 'campaign'
          ? [{
              id: `led-${Date.now()}`,
              at: now,
              reason: 'founding' as const,
              ducats: ducatLimit,
              glory: 0,
              game: 1,
              note: 'Starting allowance.',
            }]
          : [],
        ducatLimit,
        treasuryDucats: 0,
        // 0 for a campaign Warband: the book starts one on no Glory, and that
        // is not the player's to set.
        gloryPoints: forceMode === 'unrestricted' ? (founding?.gloryPoints ?? 0) : 0,
        units: [],
        armoryStash: [],
        snapshots: [foundingSnapshot],
        createdAt: now,
        updatedAt: now
      };

      set((state) => {
        let updated = [...state.warbands, newWarband];
        updated = persistWarbands(updated, state.warbands);
        storage.setActiveWarbandId(newWarband.id);
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
        let updated = [...state.warbands.filter(w => w.id !== enrichedWarband.id), enrichedWarband];
        updated = persistWarbands(updated, state.warbands);
        storage.setActiveWarbandId(enrichedWarband.id);
        return { warbands: updated, activeWarbandId: enrichedWarband.id };
      });
    },

    /**
     * Put a warband back to one of its own recorded milestones.
     *
     * The Growth History has always held everything needed for this — a
     * snapshot carries the full `units` array, the stash, the treasury and the
     * Glory at that moment — and there was no way to apply one. A player whose
     * roster went backwards (a bad sync, a device that had a stale copy) could
     * see the state they wanted listed in front of them and not get to it.
     *
     * It takes a snapshot of the CURRENT state first, so restoring is itself
     * undoable. Overwriting a roster with no way back is how a recovery
     * feature becomes a second data-loss bug.
     */
    restoreWarbandSnapshot: (warbandId, snapshotId) => {
      set((state) => {
        const now = new Date().toISOString();
        const updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const snap = (w.snapshots ?? []).find((s) => s.id === snapshotId);
          if (!snap) return w;

          const safety: WarbandSnapshot = {
            id: `snap-${Date.now()}`,
            timestamp: now,
            label: `Before restoring "${snap.label}"`,
            type: 'manual',
            ducatCost: w.units.reduce((sum, u) => sum + u.totalCost, 0),
            treasuryDucats: w.treasuryDucats,
            gloryPoints: w.gloryPoints,
            unitCount: w.units.filter((u) => !u.isDead).length,
            units: JSON.parse(JSON.stringify(w.units)),
            armoryStash: JSON.parse(JSON.stringify(w.armoryStash)),
            changesSummary: ['Automatic checkpoint taken before a restore, so the restore can be undone.'],
          };

          return {
            ...w,
            units: JSON.parse(JSON.stringify(snap.units)),
            armoryStash: JSON.parse(JSON.stringify(snap.armoryStash ?? [])),
            treasuryDucats: snap.treasuryDucats,
            gloryPoints: snap.gloryPoints,
            // The history grows; restoring never erases the milestones between
            // here and there.
            snapshots: [...(w.snapshots ?? []), safety],
          };
        });
        return { warbands: persistWarbands(updated, state.warbands) };
      });
    },

    saveWarbandSnapshot: (warbandId, label, type, changesSummary = [], matchId, scenarioName, outcome) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
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
          return updatedWb;
        });

        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    enrollWarbandInCampaign: (warband, _campaignId) => {
      set((state) => {
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

    removeWarbandFromCampaign: (warbandId, _campaignId) => {
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

    /*
      Local first, then the cloud, and the cloud's answer is returned rather
      than dropped.

      The Directory needs it: deleting someone else's warband there comes back
      403, and with the old fire-and-forget shape the row just disappeared from
      the list and reappeared on the next refresh, with nothing said. It also
      has to leave `allCloudWarbands` — the Directory reads that list, not the
      local one, so a deleted warband stayed on screen until a manual refresh.
    */
    deleteWarband: async (id) => {
      set((state) => {
        let updated = state.warbands.filter((w) => w.id !== id);
        updated = persistWarbands(updated, state.warbands);
        const nextActive = updated[0]?.id || null;
        storage.setActiveWarbandId(nextActive);
        return {
          warbands: updated,
          activeWarbandId: nextActive,
          allCloudWarbands: state.allCloudWarbands.filter((w) => w.id !== id),
        };
      });

      const res = await storage.deleteWarbandFromCloud(id);
      if (res.ok) return { ok: true };

      // It is gone from this device either way, but the caller must be able to
      // say that the copy in the cloud is not.
      return { ok: false, error: res.detail || res.reason };
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
        let updated = [...s.warbands, cloned];
        updated = persistWarbands(updated, s.warbands);
        storage.setActiveWarbandId(cloned.id);
        return { warbands: updated, activeWarbandId: cloned.id };
      });
    },

    setActiveWarbandId: (id) => {
      storage.setActiveWarbandId(id);
      set({ activeWarbandId: id });
    },

    updateWarbandNotes: (warbandId, notes) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = { ...w, notes };
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    updateWarbandDucatLimit: (warbandId, ducatLimit) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb: Warband = {
            ...w,
            ducatLimit: Math.max(100, Number(ducatLimit) || 700),
            updatedAt: new Date().toISOString()
          };
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    updateWarbandTreasury: (warbandId, treasuryDucats) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb: Warband = {
            ...w,
            treasuryDucats: Math.max(0, Number(treasuryDucats) || 0),
            updatedAt: new Date().toISOString()
          };
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    updateWarbandGlory: (warbandId, gloryPoints) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb: Warband = {
            ...w,
            gloryPoints: Math.max(0, Number(gloryPoints) || 0),
            updatedAt: new Date().toISOString()
          };
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    setWarbandAllowThirdParty: (warbandId, allow) => {
      set((state) => {
        let updated = state.warbands.map((w) =>
          (w.id === warbandId ? { ...w, allowThirdParty: allow } : w));
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    updateWarbandVariant: (warbandId, variantId) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb: Warband = {
            ...w,
            // Empty string is the "standard list" choice in the picker, and it
            // must clear the field rather than store '' — validate.ts matches a
            // variant by id OR name, and '' would match neither while still
            // reading as "a variant was chosen".
            variantId: variantId || undefined,
            updatedAt: new Date().toISOString()
          };
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    updateWarbandLore: (warbandId, lore, motto, patron) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb: Warband = {
            ...w,
            lore,
            motto: motto !== undefined ? motto : w.motto,
            patron: patron !== undefined ? patron : w.patron,
            updatedAt: new Date().toISOString()
          };
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    updateWarbandChronicleLog: (warbandId, chronicleLog) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb: Warband = {
            ...w,
            chronicleLog,
            updatedAt: new Date().toISOString()
          };
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    addWarbandChronicleEntry: (warbandId, entry) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const existing = w.chronicleLog || [];
          const updatedWb: Warband = {
            ...w,
            chronicleLog: [entry, ...existing],
            updatedAt: new Date().toISOString()
          };
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    // Units

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

        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: [...w.units, newUnit],
            updatedAt: new Date().toISOString()
          };
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    // Armory Stash Management
    buyToStash: (warbandId, item) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
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
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    sellFromStash: (warbandId, stashItemId) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
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
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
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
        let updated = s.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          let newStash: StashedItem[];
          if (stashItem.quantity > 1) {
            newStash = w.armoryStash.map((i) => (i.id === stashItemId ? { ...i, quantity: i.quantity - 1 } : i));
          } else {
            newStash = w.armoryStash.filter((i) => i.id !== stashItemId);
          }
          const updatedWb = { ...w, armoryStash: newStash };
          return updatedWb;
        });
        updated = persistWarbands(updated, s.warbands);
        return { warbands: updated };
      });
    },

    // Play Mode
});
