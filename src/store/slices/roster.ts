/**
 * Warbands: creating, cloning, importing, snapshotting, and the cloud sync.
 *
 * Also the armoury stash and the favourites list, both of which are warband
 * scoped rather than unit scoped.
 */
import type { StateCreator } from 'zustand';
import type { AppState } from '../state';
import { storage } from '../../services/storage';
import type { Warband, ActiveUnit, StashedItem, WarbandSnapshot } from '../../types/warband';
import { stashPrice } from '../../types/warband';
import type { CampaignMember } from '../../types/campaign';
import type { InitialState } from '../init';
import { persistWarbands, mergeWarbands } from '../persist';
import { outbox } from '../../services/sync';
import { book, strongbox } from '../../rules/ledger';
import { formatCost, isZero } from '../../rules/costs';
import { campaignGameOf } from '../../rules/campaign';

export type RosterSlice = Pick<AppState, 'takeGrantedGloryItem' | 'allCloudWarbands' | 'fetchAllCloudWarbands' | 'syncUserWarbandsWithCloud' | 'sync' | 'warbands' | 'activeWarbandId' | 'getActiveWarband' | 'createWarband' | 'importWarband' | 'saveWarbandSnapshot' | 'restoreWarbandSnapshot' | 'enrollWarbandInCampaign' | 'removeWarbandFromCampaign' | 'deleteWarband' | 'cloneWarband' | 'setActiveWarbandId' | 'updateWarbandNotes' | 'updateWarbandDucatLimit' | 'updateWarbandTreasury' | 'updateWarbandGlory' | 'updateWarbandVariant' | 'setWarbandAllowThirdParty' | 'updateWarbandLore' | 'updateWarbandChronicleLog' | 'addWarbandChronicleEntry' | 'saveUnitAsFavourite' | 'removeUnitFromFavourites' | 'addUnitFromFavourite' | 'buyToStash' | 'sellFromStash' | 'assignStashToUnit'>;

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
        /* The cloud's units, as the cloud holds them. This used to map
           `enrichUnitWithLore` over every model on every pull, which is how one
           player's biographies reached another player's roster. */
        units: cw.units ?? [],
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
      `founding` carries the things that are decided at muster and nowhere else.
      The Variant changes what the Warband may recruit, so choosing it after the
      first models are on the roster means recruiting against a list that was
      not the one in force.

      The two Glory fields are not the same number and must not be merged.
      `gloryPoints` is a balance the *player* sets, which only an unrestricted
      Warband may do. `startingGlory` is *published* — the Papal States
      Intervention Force musters on 11 ☼ by its Specialist Force rule — so it
      applies to a campaign Warband, where the player has no say. Almost every
      Warband's is 0, which is why "a campaign Warband starts on zero" read as
      a rule here for so long; it was a generalisation from 26 of 27 Variants.
      The caller resolves it with `musterBudget`, never by typing a number.
    */
    createWarband: (name, factionId, ducatLimit = 700, forceMode = 'campaign', founding) => {
      /*
        The published starting Glory: 0 for every Variant but the Papal States
        Intervention Force, whose Specialist Force rule musters it on 11 ☼.
        Resolved once, because it is now needed in three places and the two
        copies of this expression were how the Warband ended up holding
        double — see the founding booking below.
      */
      const startingGlory = forceMode === 'unrestricted'
        ? (founding?.gloryPoints ?? 0)
        : (founding?.startingGlory ?? 0);

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
        gloryPoints: startingGlory,
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
        /*
          The ledger opens empty and the founding booking below fills it.

          FD-05d made the ledger the Strongbox's authority but deliberately
          booked NO Ducats at founding, because the allowance was not
          Strongbox money in this app: the builder measured recruitment
          against `ducatLimit` on its own and unspent Ducats went nowhere.
          That note pointed here, and this is FD-05e.

          The allowance and the Strongbox are one pot, and the book says so
          in the sentence that introduces the Strongbox at all:

            "As you make your choices, subtract the cost of each choice from
             your starting amount of 👑. You can continue spending until you
             have bought everything you can, or decide to stop. Any unspent
             👑 are put into your Warband's Strongbox (to represent your
             in-game treasury) and the 👑 can be used later or hoarded to buy
             something more expensive."
                        — Warbands of Trench Crusade, p.10 (extract line 441)

          So there is one account, opened with the allowance and drawn down
          by each choice; what is left at the end of the muster is simply
          what is left. A Warband founded on 700 that spends 620 holds 80,
          where it used to hold 0.

          And the Quartermaster Step spends from that same pot, which is why
          a recruit debits it (`addUnitToWarband`):

            "You can recruit models to your Warband in the Quartermaster Step
             in the same way as you did when you first created it."
                        — Trench Crusade Digital Rulebook (extract line 7219)
            "If you have any 👑 in your Strongbox, you can spend them to
             purchase new Battlekit from your Warband's Armoury Tables"
                        — the same page (extract line 7228)
        */
        ledger: [],
        ducatLimit,
        /*
          Both zero here, and both set by the founding booking below. Carrying
          a balance on the object AND booking it credits the Warband twice —
          `book` opens the account on what it finds before appending, so a
          Papal States muster arrived holding 22 Glory instead of 11. Money
          enters this Warband through exactly one door, and it is `book`.
        */
        treasuryDucats: 0,
        gloryPoints: 0,
        units: [],
        armoryStash: [],
        snapshots: [foundingSnapshot],
        createdAt: now,
        updatedAt: now
      };

      /*
        Booked after the object is built so it reads the totals set above
        rather than restating them, and so a Warband is reconciled from birth
        — `openLedger` at the roster doors then finds nothing to do for it.
      */
      /*
        Campaign force only.

        `forceMode: 'unrestricted'` is for one-off games, where the player
        sets the Ducats and Glory themselves and `ducatLimit` is a list cap
        they chose rather than a treasury the campaign issued. Crediting it
        would put a number in the Strongbox that means nothing and that the
        player is also setting by hand. The same split already exists as
        `isCampaignForce` in the builder and `campaignForce` in
        `src/rules/campaign.ts`.
      */
      const founded = book(newWarband, {
        reason: 'founding',
        ducats: forceMode === 'campaign' ? ducatLimit : 0,
        glory: startingGlory,
        game: 1,
        note: forceMode === 'campaign'
          ? `Founded on an allowance of ${ducatLimit} Ducats.`
          : 'Founded.',
      }, now);

      set((state) => {
        let updated = [...state.warbands, founded];
        updated = persistWarbands(updated, state.warbands);
        storage.setActiveWarbandId(founded.id);
        return { warbands: updated, activeWarbandId: founded.id };
      });

      return founded;
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

    /*
      Setting the Strongbox by hand, which stays possible and becomes visible.

      The player types a total; the ledger records the MOVEMENT that total
      implies. Typing 400 over a balance of 340 is a credit of 60, and the
      entry says so — otherwise a corrected balance is indistinguishable from
      a purchase that never happened, which is the whole complaint this
      change exists to answer.

      `admin-adjust` rather than `admin-grant`: a grant is a campaign
      decision with someone's name on it, and this is whoever holds the
      phone. `reversible` treats neither as a player's to undo.
    */
    updateWarbandTreasury: (warbandId, treasuryDucats) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const target = Math.max(0, Number(treasuryDucats) || 0);
          const delta = target - strongbox(w).ducats;
          return { ...book(w, {
            reason: 'admin-adjust',
            ducats: delta,
            note: `Strongbox set to ${target} Ducats.`,
          }), updatedAt: new Date().toISOString() };
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    updateWarbandGlory: (warbandId, gloryPoints) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const target = Math.max(0, Number(gloryPoints) || 0);
          const delta = target - strongbox(w).glory;
          return { ...book(w, {
            reason: 'admin-adjust',
            glory: delta,
            note: `Glory set to ${target}.`,
          }), updatedAt: new Date().toISOString() };
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

    /*
      Buying Battlekit into the Arsenal.

      Two things were wrong with the money, and the second is the serious one.

      `Math.max(0, treasury - cost)` does not refuse a purchase the Strongbox
      cannot cover — it takes everything there is and hands over the item. A
      player with 10 Ducats could buy a 50-Ducat weapon, keep it, and watch the
      Strongbox read 0. The 40 Ducats they did not have were simply forgiven,
      and nothing anywhere said so.

      And the Quartermaster debited Ducats whatever the item was priced in, so
      a Glory Item cost Ducats and left the Glory alone: free in the currency
      it is priced in, paid for in one it is not.

      The price is the Armoury row's own `Cost` — both currencies, because a
      row can carry both — and both sides are debited. A purchase either
      Strongbox cannot cover is REFUSED and the warband is returned untouched.
      The caller checks first and disables the control; this is the same
      refusal for anything that reaches the store another way.
    */
    /*
      Take a Glory Item a Location handed over, at no cost (finding F).

      "Relic: Choose one Glory Item worth up to 7 ☼ and add it to your Arsenal"
      — the item is GIVEN, so nothing is charged and no ledger entry is written:
      a ledger records movements of money and none happened. The grant is marked
      spent on the effect that carries it, which is what stops a player taking a
      second Relic off the same find.

      Refused rather than clamped where the grant is already spent or does not
      cover the price, for the same reason a purchase over the balance is.
    */
    takeGrantedGloryItem: (warbandId, item, grantSource) => {
      let outcome: 'taken' | 'no-grant' | 'too-dear' = 'no-grant';
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;

          const price = stashPrice(item);
          const effects = w.explorationEffects ?? [];
          const at = effects.findIndex((e) =>
            typeof e.gloryItemOnce === 'number'
            && e.takenAtGame === undefined
            && (e.source || e.name) === grantSource);
          if (at < 0) return w;
          if (price.glory > (effects[at].gloryItemOnce ?? 0)) {
            outcome = 'too-dear';
            return w;
          }

          const held = (w.armoryStash ?? []).find((i) => i.id === item.id);
          const stash: StashedItem[] = held
            ? w.armoryStash.map((i) => (i.id === item.id
              ? { ...i, quantity: i.quantity + 1 } : i))
            : [...(w.armoryStash ?? []), {
                id: item.id, name: item.name, type: item.type,
                cost: price.ducats, price, quantity: 1,
              }];

          /* Spent, on the effect that granted it. A second list of "grants
             used" would be a second place to forget. */
          const spentAt = campaignGameOf(w, state.campaign);
          const marked = effects.map((e, i) => (i === at
            ? { ...e, takenAtGame: spentAt, takenItem: item.name }
            : e));

          outcome = 'taken';
          return {
            ...w,
            armoryStash: stash,
            explorationEffects: marked,
            updatedAt: new Date().toISOString(),
          };
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
      return outcome;
    },

    buyToStash: (warbandId, item) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;

          /* The row's Cost where the caller has one; otherwise the single
             number under the label it came with, which is all an older
             caller says. */
          const price = stashPrice(item);
          /* Refused, not clamped, and refused if EITHER side is short: an
             item priced in both is not half-bought. A player cannot spend
             what they do not hold, and a Strongbox silently emptied is worse
             than a button that will not press. */
          if (price.ducats > (w.treasuryDucats ?? 0) || price.glory > (w.gloryPoints ?? 0)) return w;

          const existing = w.armoryStash.find((i) => i.id === item.id);
          let newStash: StashedItem[];
          if (existing) {
            newStash = w.armoryStash.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
          } else {
            newStash = [...w.armoryStash, {
              id: item.id, name: item.name, type: item.type,
              /* `cost` stays the Ducat number, for the readers that have
                 only ever meant Ducats by it. `price` is what was paid, and
                 is recorded at purchase so selling it back knows which
                 Strongboxes to credit however long the item sits there. */
              cost: price.ducats, price,
              quantity: 1,
            }];
          }
          /* Booked, not assigned. `book` re-derives both totals from the
             whole ledger, so the balance and its history cannot disagree. */
          return book({ ...w, armoryStash: newStash }, {
            reason: 'quartermaster',
            ...(price.ducats ? { ducats: -price.ducats } : {}),
            ...(price.glory ? { glory: -price.glory } : {}),
            note: `Bought ${item.name}.`,
          });
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    /*
      Selling Battlekit back, at the price the book sets.

      Page 121:

        "If you do so, you receive half the Cost of the item you were
         selling, ROUNDING ANY FRACTIONS UP."

      It rounded down. Every odd-priced item paid a Ducat less than it should
      — a 45-Ducat weapon returned 22 instead of 23 — which is small once and
      is not small across a season's Arsenal.

      And it credited Ducats whatever the item was priced in, so selling a
      Glory Item paid out in the wrong currency: the Glory was gone and the
      Ducats went up. Half of each side of the price comes back, each rounded
      up on its own — the book halves the Cost, and an item's Cost is what the
      Armoury row prints, in both currencies where it prints both.
    */
    sellFromStash: (warbandId, stashItemId) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const item = w.armoryStash.find((i) => i.id === stashItemId);
          if (!item) return w;

          const paid = stashPrice(item);
          const back = { ducats: Math.ceil(paid.ducats / 2), glory: Math.ceil(paid.glory / 2) };
          let newStash: StashedItem[];
          if (item.quantity > 1) {
            newStash = w.armoryStash.map((i) => (i.id === stashItemId ? { ...i, quantity: i.quantity - 1 } : i));
          } else {
            newStash = w.armoryStash.filter((i) => i.id !== stashItemId);
          }

          return book({ ...w, armoryStash: newStash }, {
            reason: 'sold',
            ...(back.ducats ? { ducats: back.ducats } : {}),
            ...(back.glory ? { glory: back.glory } : {}),
            note: `Sold ${item.name} for ${isZero(back) ? 'nothing' : formatCost(back)}.`,
          });
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

      /*
        `settled`: the Arsenal bought this, so the Strongbox has already paid.

        Without it the equip charged for the item a second time — a 40-Ducat
        weapon bought into the Arsenal for 40 cost another 40 the moment it
        was handed to a model. FD-05e-2 gave the equip actions a charge and
        this call site, which is the one place the item is NOT a purchase, was
        never told.

        The second charge also carried the instance's `ref`, so taking the
        item off in the same game reversed THAT charge and returned before the
        branch that puts the item back in the Arsenal: the item vanished and
        the first payment stood (FD-05e-3).
      */
      if (stashItem.type === 'Weapon') {
        state.equipWeapon(warbandId, unitId, stashItem.id, true);
      } else if (stashItem.type === 'Armour') {
        state.equipArmour(warbandId, unitId, stashItem.id, true);
      } else if (stashItem.type === 'Equipment') {
        state.equipEquipment(warbandId, unitId, stashItem.id, true);
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
