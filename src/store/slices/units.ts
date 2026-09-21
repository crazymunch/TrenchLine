/**
 * Models on a roster: recruiting, naming, and what they carry.
 *
 * `addUnitToWarband` looks the profile up in `units`, which the dataset fills —
 * so what a player can add is now what the catalogues actually contain.
 */
import type { StateCreator } from 'zustand';
import type { AppState } from '../state';
import type { ActiveUnit, EquippedWeapon, EquippedArmour, EquippedEquipment } from '../../types/warband';
import { persistWarbands } from '../persist';
import { book, undoPurchases } from '../../rules/ledger';
import { campaignGameOf } from '../../rules/campaign';
import { removeFromRoster } from '../../rules/fallen';
import { recreationLapsed } from '../../rules/recreation';
import type { Warband, StashedItem } from '../../types/warband';
import type { Cost } from '../../types/catalogue';
import { profileCost, isZero } from '../../rules/costs';
import { unitGlory } from '../../rules/savedGlory';

/*
  Every purchase in the builder goes through these two, and both are no-ops on
  an unrestricted Warband — its Ducats are the player's to set, so the app
  neither charges nor refunds them. See `createWarband` for that split.

  FD-05e made the builder's remaining figure the Strongbox. FD-05e-2 is the
  other half: the things that spend it. Equipping Battlekit added its cost to
  the model's `totalCost` and booked nothing, so once the budget stopped being
  `ducatLimit - rosterCost` a campaign Warband could equip its whole Armoury
  for free. `duplicateUnit` was a free hire for the same reason.
*/

/**
 * Charge a campaign Warband for something, tagged so removal can undo it.
 *
 * A `Cost`, both currencies, because an Armoury Table row is both (FD-05g).
 * This took a single number and spent it as Ducats, and every Glory-priced row
 * in the dataset is ZERO Ducats — so a Takwin Anqā Bird, 2 Glory on the Iron
 * Sultanate's table, was bought for nothing the moment it went onto a model.
 * The Arsenal had already been fixed for exactly this (FD-05f); the model's
 * own Battlekit had not.
 *
 * Nothing is refused here, and that is FD-05e-2's decision rather than an
 * omission: a muster may run the balance negative while a player rearranges —
 * "users can make any variations from the end of one game to the start of the
 * next" — and `strongbox-overdrawn` in `rules/validate.ts` is what stops it
 * reaching a game.
 */
const charge = (w: Warband, price: Cost, ref: string, note: string, game: number): Warband =>
  (w.forceMode === 'unrestricted' || isZero(price) || (price.ducats <= 0 && price.glory <= 0))
    ? w
    : book(w, {
        reason: 'quartermaster',
        ...(price.ducats > 0 ? { ducats: -price.ducats } : {}),
        ...(price.glory > 0 ? { glory: -price.glory } : {}),
        ref,
        note,
        game,
      }, w.updatedAt);

/**
 * Take back what was paid for `refs`, where the player may still take it back.
 *
 * "Users can make any variations from the end of one game to the start of the
 * next": a model added and removed in the same muster costs nothing. Once the
 * game it was bought in has been played the purchase is settled — a removed
 * model refunds nothing, because the book sells Battlekit and never models,
 * and removed Battlekit goes to the Arsenal where selling it gives half back.
 */
const refund = (w: Warband, refs: readonly string[], game: number) =>
  w.forceMode === 'unrestricted'
    ? { warband: w, undone: new Set<string>() }
    : undoPurchases(w, refs, game);

export type UnitsSlice = Pick<AppState, 'recreateUnit' | 'letUnitFall' | 'addUnitToWarband' | 'duplicateUnit' | 'removeUnitFromWarband' | 'updateUnitName' | 'updateUnitCategory' | 'setUnitBenched' | 'setUnitAsLeader' | 'updateUnitLore' | 'equipWeapon' | 'removeWeapon' | 'equipArmour' | 'removeArmour' | 'equipEquipment' | 'removeEquipment'>;

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

      /*
        The first Leader-eligible model recruited becomes the Leader.

        A Warband has exactly one, and every faction's list is built around
        theirs — so the recruit that *can* lead almost always *is* the leader,
        and making the player find "Set as Leader" afterwards means a roster
        that silently has none. `canLead` is the catalogue's own `Leader` role,
        not a guess from cost or a limit of 1.

        Only when the Warband has no Leader yet: a later eligible recruit (a
        Technomancer joining a Heretic Priest) leaves the nomination alone,
        because demoting the standing Leader is the player's call.
      */
      const warband = state.warbands.find((w) => w.id === warbandId);
      const hasLeader = warband?.units.some((u) => u.profileSnapshot.category === 'Leader');
      const snapshot = profile.canLead && warband && !hasLeader
        ? { ...profile, category: 'Leader' as const }
        : profile;

      const newUnit: ActiveUnit = {
        id: `u-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        customName: customName || profile.name,
        baseProfileId,
        profileSnapshot: snapshot,
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
        blessingMarkers: 0,
        status: 'Active',
        hasActedThisTurn: false
      };

      set((s) => {
        let updated = s.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: [...w.units, newUnit],
            updatedAt: new Date().toISOString()
          };
          /*
            The recruit is paid for out of the Strongbox (FD-05e).

            It never was. The allowance and the Strongbox were two pots: the
            builder measured the roster against `ducatLimit` and nothing was
            ever debited, so a Warband's treasury was untouched by a muster
            that spent every Ducat of it. One pot now — founding credits the
            allowance, and each choice subtracts its cost, which is the
            book's own sequence:

              "subtract the cost of each choice from your starting amount of
               👑 … Any unspent 👑 are put into your Warband's Strongbox"
                          — Warbands of Trench Crusade, p.10

            The Quartermaster Step hires "in the same way as you did when you
            first created it" (Digital Rulebook, extract line 7219), so the
            same debit serves both and carries the same reason.

            Campaign force only, for the reason `createWarband` gives: an
            unrestricted Warband's Ducats are the player's to set, and
            debiting a pot they never opened would drive it negative.
          */
          /* `charge`, so the entry carries the `ref` and `game` that let
             removal undo it — see the helper at the top of this file. */
          /*
            Both currencies (FD-05h).

            This passed `glory: 0`, on the reasoning that charging Glory would
            drive a Warband negative in a currency `strongbox-overdrawn` did
            not check. That check now reads both, so the reason is gone — and
            what it was protecting was worse than the risk: **all 17 unit
            entries that carry a Glory cost are priced ZERO Ducats**, every one
            a Mercenary, from a 1 Glory Guard Dog to a 7 Glory Pairika. So
            `totalCost` was 0, `charge` short-circuited on `isZero`, and hiring
            one booked **no ledger entry at all**. Not undercharged: free, and
            invisible in the Strongbox's own record of where the money went.
            The same defect FD-05g fixed for an equipped item, one layer up.

            `unitGlory` rather than the snapshot's own `gloryCost`, to stay the
            exact parallel of `totalCost` — which is `baseCost + gearCost`, so
            the hire pays for the model AND whatever it is constructed holding.
            `recruitable` returns `defaultWeapons: undefined` today, so the two
            are the same number on the shipped dataset; they stop being the
            same the day a starting loadout carries a Glory-priced item, and
            the one that is still right then is this one.
          */
          return charge(updatedWb, { ducats: newUnit.totalCost, glory: unitGlory(newUnit) },
            newUnit.id, `Recruited ${newUnit.customName}.`, campaignGameOf(w, s.campaign));
        });
        updated = persistWarbands(updated, s.warbands);
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
        /*
          A Warband has one Leader. Copying the Leader used to copy the
          nomination too, leaving two — and the roster then rendered two
          crowns and the campaign narrative picked whichever came first.
          The copy is the same profile, demoted to what the catalogue calls
          it (Leader-role entries are Elite in the role list).
        */
        profileSnapshot: target.profileSnapshot.category === 'Leader'
          ? { ...target.profileSnapshot, category: 'Elite' as const }
          : target.profileSnapshot,
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
        const game = campaignGameOf(activeWb, s.campaign);
        let updated = s.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: [...w.units, clonedUnit],
            updatedAt: new Date().toISOString()
          };
          /* A copy is a hire and costs what the model costs. */
          /*
            Both currencies, for the reason given in `addUnitToWarband` — and
            `unitGlory` of the COPY, which carries the original's gear: the
            Ducat side already charges that gear again, because a copy is a
            second model holding a second set of it.
          */
          return charge(updatedWb, { ducats: clonedUnit.totalCost, glory: unitGlory(clonedUnit) },
            clonedUnit.id, `Recruited ${clonedUnit.customName}.`, game);
        });
        updated = persistWarbands(updated, s.warbands);
        return { warbands: updated };
      });
    },

    removeUnitFromWarband: (warbandId, unitId) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const going = w.units.find((u) => u.id === unitId);
          const updatedWb = {
            ...w,
            units: w.units.filter((u) => u.id !== unitId),
            updatedAt: new Date().toISOString()
          };
          if (!going) return updatedWb;
          /*
            The model and everything bought onto it. Its Battlekit was paid for
            separately, so taking the model off in the same muster has to take
            those purchases back too — otherwise the player is down the gear's
            price with neither the gear nor the Ducats.
          */
          const refs = [
            going.id,
            ...going.equippedWeapons.map((i) => i.instanceId),
            ...going.equippedArmour.map((i) => i.instanceId),
            ...going.equippedEquipment.map((i) => i.instanceId),
          ];
          return refund(updatedWb, refs, campaignGameOf(w, state.campaign)).warband;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    /*
      Settle a Re-creation offer the post-battle sequence left outstanding.

      The offer is written by `applyPostBattleResults` when the sequence kills
      a model whose own profile grants one — see `ActiveUnit.awaitingRecreation`
      and `rules/recreation.ts`. It is settled HERE because the book puts the
      payment in the Quartermaster Step, which in this app is the builder:

      > **Re-creation:** If a Takwin Homunculus is killed in the post-battle
      > sequence, you do not have to remove it from your roster. Instead, you
      > can spend 40 👑 in the following Quartermaster Step to leave it on the
      > Roster.  — Warbands L5324 to L5327

      Paying charges the Strongbox through the ledger like any other
      Quartermaster purchase, so the money leaves a record and the balance is
      still the sum of its entries (FD-05d). `ref` is the model's id, which is
      what would let the purchase be undone in the same muster — and it is
      deliberately the same ref shape a hire uses, because this is the model
      being paid for a second time.

      Refused where the Strongbox cannot cover it, rather than clamped: the
      Quartermaster's own rule since RR-12, and the alternative here is a model
      resurrected for money the Warband does not have.
    */
    recreateUnit: (warbandId, unitId) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const unit = w.units.find((u) => u.id === unitId);
          const offer = unit?.awaitingRecreation;
          if (!unit || !offer) return w;

          /* An expired offer buys nothing. `letUnitFall` is the only way out
             of one, and the builder says so rather than taking the money. */
          if (recreationLapsed(offer, campaignGameOf(w, state.campaign))) return w;

          const short: Cost = {
            ducats: Math.max(0, offer.cost.ducats - (w.treasuryDucats ?? 0)),
            glory: Math.max(0, offer.cost.glory - (w.gloryPoints ?? 0)),
          };
          if (!isZero(short) && w.forceMode !== 'unrestricted') return w;

          const restored = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const { awaitingRecreation: _gone, ...rest } = u;
              return { ...rest, isDead: false, status: 'Active' as const };
            }),
            updatedAt: new Date().toISOString(),
          };
          return charge(
            restored,
            offer.cost,
            unit.id,
            `${offer.ability}: ${unit.customName} stays on the Roster.`,
            campaignGameOf(w, state.campaign),
          );
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    /*
      Decline a Re-creation offer, or clear one that has lapsed.

      The model goes where it would have gone the moment it was killed, by the
      same path everything else killed takes — `removeFromRoster`, which moves
      it to `fallen` with its Battlekit and nothing deleted. Nothing is
      refunded: the book sells Battlekit, never models.
    */
    letUnitFall: (warbandId, unitId) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const unit = w.units.find((u) => u.id === unitId);
          if (!unit?.awaitingRecreation) return w;

          const cleared = w.units.map((u) => {
            if (u.id !== unitId) return u;
            const { awaitingRecreation: _gone, ...rest } = u;
            return { ...rest, isDead: true };
          });
          const { units, fallen } = removeFromRoster({ units: cleared, fallen: w.fallen }, [unitId]);
          return { ...w, units, fallen, updatedAt: new Date().toISOString() };
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    updateUnitName: (warbandId, unitId, name) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => (u.id === unitId ? { ...u, customName: name } : u)),
            updatedAt: new Date().toISOString()
          };
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    /*
      Bench a model, or bring it back.

      The Threshold Value caps the Ducats a Force may field and Field Strength
      caps its models (p.97), and the roster is allowed to exceed both: "any
      models you do not use will have to sit the game out". So this is a
      choice, not a correction — nothing is removed, nothing is refused, and
      the builder's warning simply stops naming the Ducats once enough of the
      roster is on the bench.
    */
    setUnitBenched: (warbandId, unitId, benched) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          return {
            ...w,
            units: w.units.map((u) => (u.id === unitId
              /* Omitted rather than stored false, so an un-benched model looks
                 in a file exactly like one that was never benched. */
              ? (() => { const { benched: _was, ...rest } = u; return benched ? { ...rest, benched: true } : rest; })()
              : u)),
          };
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    updateUnitCategory: (warbandId, unitId, category) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
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
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    setUnitAsLeader: (warbandId, unitId) => {
      get().updateUnitCategory(warbandId, unitId, 'Leader');
    },

    updateUnitLore: (warbandId, unitId, lore, quote, titles, deeds) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
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
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    equipWeapon: (warbandId, unitId, weaponId, settled) => {
      const state = get();
      const weapon = state.weapons.find((w) => w.id === weaponId);
      if (!weapon) return;

      const equipped: EquippedWeapon = {
        ...weapon,
        instanceId: `w-${Date.now()}`
      };

      set((s) => {
        let updated = s.warbands.map((w) => {
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
          /* Battlekit is paid for out of the Strongbox (FD-05e-2). It was
             added to the model's cost and charged to nobody.

             Unless the Arsenal already paid: `assignStashToUnit` moves an
             item the Warband owns onto a model, and charging there took the
             price a second time (FD-05e-3). */
          if (settled) return updatedWb;
          return charge(updatedWb, profileCost(equipped), equipped.instanceId,
            `Bought ${equipped.name}.`, campaignGameOf(w, s.campaign));
        });
        updated = persistWarbands(updated, s.warbands);
        return { warbands: updated };
      });
    },

    removeWeapon: (warbandId, unitId, instanceId) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const unit = w.units.find((u) => u.id === unitId);
          const target = unit?.equippedWeapons.find((wep) => wep.instanceId === instanceId);
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const deductedCost = target ? target.cost : 0;
              return {
                ...u,
                equippedWeapons: u.equippedWeapons.filter((wep) => wep.instanceId !== instanceId),
                totalCost: Math.max(0, u.totalCost - deductedCost)
              };
            })
          };
          if (!target) return updatedWb;

          /*
            Unequipping in the same game undoes the purchase; after that
            game has been played the item is property, so it goes to the
            Arsenal rather than evaporating. The book sells Battlekit from
            there for half, which is the existing `sold` path.
          */
          const back = refund(updatedWb, [instanceId], campaignGameOf(w, state.campaign));
          if (back.undone.has(instanceId)) return back.warband;
          if (w.forceMode === 'unrestricted') return updatedWb;

          const stash = back.warband.armoryStash ?? [];
          const held = stash.find((i) => i.id === target.id);
          const stashed: StashedItem[] = held
            ? stash.map((i) => (i.id === target.id ? { ...i, quantity: i.quantity + 1 } : i))
            : [...stash, {
                id: target.id, name: target.name, type: 'Weapon' as const,
                /* The price it was bought at, both currencies, so selling it
                   out of the Arsenal returns half of each (FD-05g). `cost`
                   stays the Ducat number, as every reader has meant it. */
                cost: target.cost, price: profileCost(target), quantity: 1,
              }];
          return { ...back.warband, armoryStash: stashed };
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    equipArmour: (warbandId, unitId, armourId, settled) => {
      const state = get();
      const arm = state.armour.find((a) => a.id === armourId);
      if (!arm) return;

      const equipped: EquippedArmour = {
        ...arm,
        instanceId: `a-${Date.now()}`
      };

      set((s) => {
        let updated = s.warbands.map((w) => {
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
          /* Battlekit is paid for out of the Strongbox (FD-05e-2). It was
             added to the model's cost and charged to nobody.

             Unless the Arsenal already paid: `assignStashToUnit` moves an
             item the Warband owns onto a model, and charging there took the
             price a second time (FD-05e-3). */
          if (settled) return updatedWb;
          return charge(updatedWb, profileCost(equipped), equipped.instanceId,
            `Bought ${equipped.name}.`, campaignGameOf(w, s.campaign));
        });
        updated = persistWarbands(updated, s.warbands);
        return { warbands: updated };
      });
    },

    removeArmour: (warbandId, unitId, instanceId) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const unit = w.units.find((u) => u.id === unitId);
          const target = unit?.equippedArmour.find((a) => a.instanceId === instanceId);
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const deductedCost = target ? target.cost : 0;
              return {
                ...u,
                equippedArmour: u.equippedArmour.filter((a) => a.instanceId !== instanceId),
                totalCost: Math.max(0, u.totalCost - deductedCost)
              };
            })
          };
          if (!target) return updatedWb;

          /*
            Unequipping in the same game undoes the purchase; after that
            game has been played the item is property, so it goes to the
            Arsenal rather than evaporating. The book sells Battlekit from
            there for half, which is the existing `sold` path.
          */
          const back = refund(updatedWb, [instanceId], campaignGameOf(w, state.campaign));
          if (back.undone.has(instanceId)) return back.warband;
          if (w.forceMode === 'unrestricted') return updatedWb;

          const stash = back.warband.armoryStash ?? [];
          const held = stash.find((i) => i.id === target.id);
          const stashed: StashedItem[] = held
            ? stash.map((i) => (i.id === target.id ? { ...i, quantity: i.quantity + 1 } : i))
            : [...stash, {
                id: target.id, name: target.name, type: 'Armour' as const,
                /* The price it was bought at, both currencies, so selling it
                   out of the Arsenal returns half of each (FD-05g). `cost`
                   stays the Ducat number, as every reader has meant it. */
                cost: target.cost, price: profileCost(target), quantity: 1,
              }];
          return { ...back.warband, armoryStash: stashed };
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    equipEquipment: (warbandId, unitId, equipmentId, settled) => {
      const state = get();
      const item = state.equipment.find((e) => e.id === equipmentId);
      if (!item) return;

      const equipped: EquippedEquipment = {
        ...item,
        instanceId: `e-${Date.now()}`
      };

      set((s) => {
        let updated = s.warbands.map((w) => {
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
          /* Battlekit is paid for out of the Strongbox (FD-05e-2). It was
             added to the model's cost and charged to nobody.

             Unless the Arsenal already paid: `assignStashToUnit` moves an
             item the Warband owns onto a model, and charging there took the
             price a second time (FD-05e-3). */
          if (settled) return updatedWb;
          return charge(updatedWb, profileCost(equipped), equipped.instanceId,
            `Bought ${equipped.name}.`, campaignGameOf(w, s.campaign));
        });
        updated = persistWarbands(updated, s.warbands);
        return { warbands: updated };
      });
    },

    removeEquipment: (warbandId, unitId, instanceId) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const unit = w.units.find((u) => u.id === unitId);
          const target = unit?.equippedEquipment.find((e) => e.instanceId === instanceId);
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const deductedCost = target ? target.cost : 0;
              return {
                ...u,
                equippedEquipment: u.equippedEquipment.filter((e) => e.instanceId !== instanceId),
                totalCost: Math.max(0, u.totalCost - deductedCost)
              };
            })
          };
          if (!target) return updatedWb;

          /*
            Unequipping in the same game undoes the purchase; after that
            game has been played the item is property, so it goes to the
            Arsenal rather than evaporating. The book sells Battlekit from
            there for half, which is the existing `sold` path.
          */
          const back = refund(updatedWb, [instanceId], campaignGameOf(w, state.campaign));
          if (back.undone.has(instanceId)) return back.warband;
          if (w.forceMode === 'unrestricted') return updatedWb;

          const stash = back.warband.armoryStash ?? [];
          const held = stash.find((i) => i.id === target.id);
          const stashed: StashedItem[] = held
            ? stash.map((i) => (i.id === target.id ? { ...i, quantity: i.quantity + 1 } : i))
            : [...stash, {
                id: target.id, name: target.name, type: 'Equipment' as const,
                /* The price it was bought at, both currencies, so selling it
                   out of the Arsenal returns half of each (FD-05g). `cost`
                   stays the Ducat number, as every reader has meant it. */
                cost: target.cost, price: profileCost(target), quantity: 1,
              }];
          return { ...back.warband, armoryStash: stashed };
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    // Warrior Progression, Skills & Faction Upgrades
});
