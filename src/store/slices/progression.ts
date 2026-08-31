/**
 * What a model earns between games: advancements, skills, scars, titles and
 * deeds, plus the Fireteam and faction-specific upgrades.
 *
 * The campaign's output, applied per model.
 */
import type { StateCreator } from 'zustand';
import type { AppState } from '../state';
import { storage } from '../../services/storage';
import type { UnitTitleRecord } from '../../types/warband';
import { persistWarbands } from '../persist';

export type ProgressionSlice = Pick<AppState, 'updateUnitAdvancement' | 'addUnitSkill' | 'removeUnitSkill' | 'addUnitScar' | 'removeUnitScar' | 'setUnitFireteam' | 'toggleUnitSpecialUpgrade' | 'addUnitDeed' | 'removeUnitDeed' | 'setUnitTitles' | 'addUnitTitleRecord' | 'toggleUnitTitleActive' | 'removeUnitTitleRecord' | 'setUnitTitleRecords'>;

export const createProgressionSlice: StateCreator<AppState, [], [], ProgressionSlice> = (set, get) => ({
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
                skills: [...existing, skill]
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
              return {
                ...u,
                skills: (u.skills || []).filter(s => s.name !== skillName)
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

    toggleUnitSpecialUpgrade: (warbandId, unitId, upgrade) => {
      set((state) => {
        let updated = state.warbands.map((w) => {
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
          return updatedWb;
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
