/**
 * What a model earns between games: advancements, skills, scars, titles and
 * deeds, plus the Fireteam and faction-specific upgrades.
 *
 * The campaign's output, applied per model.
 */
import type { StateCreator } from 'zustand';
import type { AppState } from '../state';
import type { UnitTitleRecord } from '../../types/warband';
import { persistWarbands } from '../persist';
import { book, undoPurchases } from '../../rules/ledger';
import { campaignGameOf } from '../../rules/campaign';
import { isZero } from '../../rules/costs';
import type { Cost } from '../../types/catalogue';
import type { Warband } from '../../types/warband';
import type { Dataset } from '../../types/catalogue';
import { eligibility } from '../../rules/earnedRecruitment';

export type ProgressionSlice = Pick<AppState, 'updateUnitAdvancement' | 'addUnitSkill' | 'removeUnitSkill' | 'addUnitScar' | 'removeUnitScar' | 'addUnitInjury' | 'removeUnitInjury' | 'addWarbandReward' | 'removeWarbandReward' | 'setUnitFireteam' | 'toggleUnitSpecialUpgrade' | 'addUnitDeed' | 'removeUnitDeed' | 'setUnitTitles' | 'addUnitTitleRecord' | 'toggleUnitTitleActive' | 'removeUnitTitleRecord' | 'setUnitTitleRecords' | 'claimEarnedRecruitment'>;

export const createProgressionSlice: StateCreator<AppState, [], [], ProgressionSlice> = (set, _get) => ({
    /**
     * Claim a recruitment bound the Warband has earned in play.
     *
     * "If the total cost of all of the other models in the Warband ... adds up
     * to 1000 or higher, in any Promotion Step after making all Advancement
     * Rolls, you can remove 6 Grail Thralls from your Warband Roster. If you do
     * so, increase the Limit of Amalgams your Warband can have to 0-2, and
     * immediately recruit an Amalgam at no cost."
     *
     * Every condition is checked HERE, once, because the claim is then a
     * historical fact the validator only reads. It is also the only place they
     * can be checked: a Warband that shrinks next game has still paid.
     *
     * Returns the outcome rather than throwing. The caller is a screen and
     * "the Warband has 5 Thralls, not 6" is a sentence to show a player
     * (docs/RULES-COVERAGE-AUDIT.md RC-08).
     */
    claimEarnedRecruitment: (warbandId: string, profileId: string, dataset: Dataset) => {
      const state = _get();
      const warband = state.warbands.find((w) => w.id === warbandId);
      if (!warband) return { ok: false as const, blockers: ['No such Warband.'] };

      const profile = (dataset.units ?? []).find((u) => u.id === profileId);
      if (!profile) {
        return { ok: false as const, blockers: ['That entry is not in this ruleset.'] };
      }

      const verdict = eligibility(dataset, profile, {
        units: warband.units.map((u) => ({
          id: u.id,
          /* The snapshot's name, not `baseProfileId`: hydration re-keys the
             catalogue, so the roster's ids are not the dataset's. */
          profileName: u.profileSnapshot?.name ?? u.customName,
          name: u.customName,
          totalCost: u.totalCost ?? 0,
        })),
        claims: warband.earnedRecruitment,
      });
      if (!verdict.eligible) return { ok: false as const, blockers: verdict.blockers };

      const spentIds = new Set(verdict.spendable.map((u) => u.id));
      const spent = verdict.spendable.map((u) => u.name);

      set((st) => {
        const updated = persistWarbands(
          st.warbands.map((w) => (w.id !== warbandId ? w : {
            ...w,
            /* Removed from the Roster, not marked dead: the rule gives them up
               rather than killing them, and a dead model is still on the sheet. */
            units: w.units.filter((u) => !spentIds.has(u.id)),
            earnedRecruitment: [
              ...(w.earnedRecruitment ?? []),
              {
                profileId,
                grantedBy: profile.earnedRecruitment!.grantedBy,
                claimedAt: new Date().toISOString(),
                spent,
              },
            ],
            updatedAt: new Date().toISOString(),
          })),
          st.warbands,
        );
        return { warbands: updated };
      });

      /*
        "…and immediately recruit an Amalgam at no cost."

        Through the ordinary recruit path, so the model gets its default gear,
        its wound track and its Leader nomination like any other — then marked
        `grantedFree`, which is what stops the roster charging for it.

        `addUnitToWarband` reads the hydrated catalogue, which can be empty if
        the dataset has not loaded. That is reported rather than passed over:
        a claim that took six Thralls and gave nothing back is the worst
        possible silence here.
      */
      let freeRecruit: 'added' | 'unavailable' | 'not-granted' = 'not-granted';
      if (profile.earnedRecruitment!.freeRecruit) {
        const before = new Set(
          (_get().warbands.find((w) => w.id === warbandId)?.units ?? []).map((u) => u.id));
        /* Recruit through the HYDRATED catalogue's id, which is not the
           dataset's — the same re-keying `eligibility` works around. */
        const catalogueId = _get().units.find((u) => u.name === profile.name)?.id;
        if (catalogueId) _get().addUnitToWarband(warbandId, catalogueId, profile.name);
        const added = (_get().warbands.find((w) => w.id === warbandId)?.units ?? [])
          .find((u) => !before.has(u.id));
        freeRecruit = added ? 'added' : 'unavailable';
        if (added) {
          set((st) => ({
            warbands: persistWarbands(
              st.warbands.map((w) => (w.id !== warbandId ? w : {
                ...w,
                units: w.units.map((u) => (u.id !== added.id ? u : {
                  ...u,
                  grantedFree: profile.earnedRecruitment!.grantedBy,
                  totalCost: 0,
                })),
              })),
              st.warbands,
            ),
          }));
        }
      }

      return { ok: true as const, spent, freeRecruit };
    },

    updateUnitAdvancement: (warbandId, unitId, xp, isElite) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
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
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    addUnitSkill: (warbandId, unitId, skill) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const existing = u.skills || [];
              if (existing.some(s => s.name === skill.name)) return u;
              return {
                ...u,
                skills: [...existing, skill],
                /*
                  And the roll it used (review round 1, finding F).

                  A Skill recorded by ANY route is one Advancement Roll taken.
                  `advancementRollsDue` counts the circles the model's Experience
                  has passed and subtracts the rolls TAKEN, and hand entry never
                  incremented that — so typing in a Skill the player had rolled
                  at the table left the app offering them the roll again.

                  The post-battle wizard increments it for the Skills it rolls,
                  in the same units, so the rule is one rule.
                */
                advancementRolls: (u.advancementRolls ?? 0) + 1,
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

    removeUnitSkill: (warbandId, unitId, skillName) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const updatedWb = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const kept = (u.skills || []).filter(s => s.name !== skillName);
              const removed = (u.skills || []).length - kept.length;
              return {
                ...u,
                skills: kept,
                /* The roll goes back with the Skill. Otherwise a mis-tap and an
                   undo costs the model an Advancement Roll for good — the
                   count only ever climbing is how a correction becomes a
                   penalty. Floored at zero. */
                advancementRolls: Math.max(0, (u.advancementRolls ?? 0) - removed),
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

    addUnitScar: (warbandId, unitId, scar) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
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
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    removeUnitScar: (warbandId, unitId, scarName) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
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
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    /*
      An injury, into BOTH arrays.

      `injuries` is the authority on which injuries a model has — it is what
      `alreadySuffered`, the card, the presentation projection and every roster
      file read — and `injuryRecords` carries where each came from. Writing them
      in one action is what stops the two lists disagreeing; `injuriesHeld`
      joins them back for a reader.
    */
    addUnitInjury: (warbandId, unitId, injury) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          return {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const name = injury.name.trim();
              if (!name) return u;
              const key = (s: string) => s.trim().toLowerCase();
              if ((u.injuries ?? []).some((i) => key(i) === key(name))) return u;
              return {
                ...u,
                injuries: [...(u.injuries ?? []), name],
                injuryRecords: [
                  ...(u.injuryRecords ?? []),
                  { name, ...(injury.source ? { source: injury.source } : {}) },
                ],
              };
            }),
            updatedAt: new Date().toISOString(),
          };
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    removeUnitInjury: (warbandId, unitId, name) => {
      set((state) => {
        const key = (s: string) => s.trim().toLowerCase();
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          return {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              return {
                ...u,
                injuries: (u.injuries ?? []).filter((i) => key(i) !== key(name)),
                injuryRecords: (u.injuryRecords ?? []).filter((r) => key(r.name) !== key(name)),
              };
            }),
            updatedAt: new Date().toISOString(),
          };
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    /*
      A standing grant the Warband holds.

      `campaignRules` gains the name as well, because that list is what the
      rules modules read to decide whether the Warband HAS a grant — `golemGrant`
      matches the Book of Golems by the sentence its Exploration row prints, on
      the strength of the name being in that list. A reward the player recorded
      by hand is evidence of the same kind as one the importer read, so it goes
      in the same place; `rewards` carries the text and the provenance a name
      cannot.
    */
    addWarbandReward: (warbandId, reward) => {
      set((state) => {
        const key = (s: string) => s.trim().toLowerCase();
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          const name = reward.name.trim();
          if (!name) return w;
          if ((w.rewards ?? []).some((r) => key(r.name) === key(name))) return w;
          const rules = w.campaignRules ?? [];
          return {
            ...w,
            rewards: [...(w.rewards ?? []), { ...reward, name }],
            campaignRules: rules.some((r) => key(r) === key(name)) ? rules : [...rules, name],
            updatedAt: new Date().toISOString(),
          };
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    /*
      Removing a reward removes its name from `campaignRules` too.

      Leaving the name behind would keep the grant in force for every rules
      module that reads that list while the record of it was gone from the
      sheet — a Warband that still held the Book of Golems and could not say
      why.
    */
    removeWarbandReward: (warbandId, name) => {
      set((state) => {
        const key = (s: string) => s.trim().toLowerCase();
        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;
          return {
            ...w,
            rewards: (w.rewards ?? []).filter((r) => key(r.name) !== key(name)),
            campaignRules: (w.campaignRules ?? []).filter((r) => key(r) !== key(name)),
            updatedAt: new Date().toISOString(),
          };
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    setUnitFireteam: (warbandId, unitId, fireteam) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
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
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    /*
      Buy or sell back a unit option, and MAKE THE STRONGBOX PAY FOR IT.

      This added the option's price to the model's `totalCost` and charged
      nobody — the same defect as FD-05e-2 (equipping Battlekit), FD-05g (a
      Glory-priced item) and FD-05h (a Glory-priced model), one layer further
      out and the last of them. **280 priced options across 18 groups** were
      free: every Alchemical Formula, every Saga, every Goetic Power, the
      Strains, the Arts of Assassination, and the Armour options at up to 50
      Ducats each.

      `charge` and `refund` are the same two the units slice uses, so an
      option behaves exactly like a piece of Battlekit: booked through the
      ledger with a reason, and reversible right up until the game it was
      bought in has been played — "users can make any variations from the end
      of one game to the start of the next". After that the purchase is
      settled and removing the option refunds nothing, because the book sells
      Battlekit and never a model's own upgrades.

      `ref` is the MODEL and the option together. The same option id is on
      every model that can take it, so keying on the option alone would let
      one Homunculus's refund cancel another's purchase.

      The whole `Cost` is spent, not its Ducat half. `Devouring Jaws` is the
      one option in the ruleset priced in Glory (2 ☼), and FD-05g's lesson is
      that an entry costing zero Ducats and some Glory is free to anything
      reading only the first number.
    */
    toggleUnitSpecialUpgrade: (warbandId, unitId, upgrade) => {
      set((state) => {
        const price: Cost = upgrade.price
          ?? { ducats: upgrade.cost ?? 0, glory: 0 };

        let updated = state.warbands.map((w) => {
          if (w.id !== warbandId) return w;

          const unit = w.units.find((u) => u.id === unitId);
          const held = unit?.specialUpgrades ?? [];
          const removing = held.some((x) => x.id === upgrade.id);
          const ref = `${unitId}:${upgrade.id}`;
          const game = campaignGameOf(w, state.campaign);

          const updatedWb: Warband = {
            ...w,
            units: w.units.map((u) => {
              if (u.id !== unitId) return u;
              const current = u.specialUpgrades || [];
              return {
                ...u,
                specialUpgrades: removing
                  ? current.filter((x) => x.id !== upgrade.id)
                  : [...current, upgrade],
                totalCost: Math.max(0, u.totalCost + (removing ? -price.ducats : price.ducats)),
              };
            }),
            updatedAt: new Date().toISOString(),
          };

          if (w.forceMode === 'unrestricted' || isZero(price)) return updatedWb;

          if (removing) return undoPurchases(updatedWb, [ref], game).warband;

          return book(updatedWb, {
            reason: 'quartermaster',
            ...(price.ducats > 0 ? { ducats: -price.ducats } : {}),
            ...(price.glory > 0 ? { glory: -price.glory } : {}),
            ref,
            note: `${upgrade.name} for ${unit?.customName ?? 'a model'}.`,
            game,
          }, updatedWb.updatedAt);
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    addUnitDeed: (warbandId, unitId, deed) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
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
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    removeUnitDeed: (warbandId, unitId, deedIndex) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
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
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    setUnitTitles: (warbandId, unitId, titles) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
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
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    addUnitTitleRecord: (warbandId, unitId, title, source = 'user', origin, active = true) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
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
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    toggleUnitTitleActive: (warbandId, unitId, title) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
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
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    removeUnitTitleRecord: (warbandId, unitId, title) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
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
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },

    setUnitTitleRecords: (warbandId, unitId, records) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
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
          return updatedWb;
        });
        updated = persistWarbands(updated, state.warbands);
        return { warbands: updated };
      });
    },
});
