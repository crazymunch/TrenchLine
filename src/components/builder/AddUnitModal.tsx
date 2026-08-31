'use client';

import React, { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { useStore } from '../../store/useStore';
import { UnitProfile } from '../../types/rules';
import { ActiveUnit } from '../../types/warband';
import { soundEffects } from '../../services/soundEffects';
import { 
  Plus, 
  UserPlus, 
  Star, 
  Trash2
} from 'lucide-react';

interface AddUnitModalProps {
  warbandId: string;
  factionId: string;
  onClose: () => void;
}

export const AddUnitModal: React.FC<AddUnitModalProps> = ({ warbandId, factionId, onClose }) => {
  const { 
    units, 
    addUnitToWarband, 
    favouriteUnits, 
    addUnitFromFavourite, 
    removeUnitFromFavourites,
    catalogsLoaded,
    catalogsError,
  } = useStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const [customNameInput, setCustomNameInput] = useState<Record<string, string>>({});

  // Filter units belonging to this faction, or mercenaries specifically allowed for this faction
  const availableUnits = units.filter((u) => {
    if (u.factionId === factionId) return true;
    if (u.category === 'Mercenary' || u.factionId === 'mercenaries') {
      return Array.isArray(u.allowedFactions) && u.allowedFactions.includes(factionId);
    }
    return false;
  });

  const categories = ['All', 'Leader', 'Elite', 'Trooper', 'Mercenary', `⭐ Favourites (${favouriteUnits.length})`];

  const isFavouritesTab = selectedCategory.startsWith('⭐');

  const filtered = availableUnits.filter((u) => {
    if (selectedCategory === 'All') return true;
    return u.category === selectedCategory;
  });

  const handleAdd = (unit: UnitProfile) => {
    const customName = customNameInput[unit.id] || unit.name;
    addUnitToWarband(warbandId, unit.id, customName);
    soundEffects.playGunfire();
    onClose();
  };

  const handleInductFavourite = (favUnit: ActiveUnit) => {
    addUnitFromFavourite(warbandId, favUnit);
    soundEffects.playCathedralBell();
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      size="xl"
      title="RECRUIT WARRIOR"
      subtitle="Select a unit profile or induct a saved veteran from your Favourites"
      label="Recruit a warrior"
    >
      {/* The filter row stays with the content rather than the header:
          Sheet's header is sticky, and a second sticky bar costs a
          quarter of a phone screen before a single result is shown. */}
    {/* Filter Tabs */}
    <div className="flex items-center space-x-2 px-6 py-3 border-b border-theme-border bg-theme-surface overflow-x-auto">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => setSelectedCategory(cat)}
          className={`px-3 py-1 text-xs font-mono rounded font-semibold uppercase transition-colors whitespace-nowrap ${
            selectedCategory === cat
              ? 'bg-theme-primary text-theme-base shadow-md'
              : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
          
          {/* TAB: FAVOURITES HALL */}
          {isFavouritesTab ? (
            <div className="space-y-3">
              {favouriteUnits.length === 0 ? (
                <div className="p-12 text-center bg-theme-base rounded border border-theme-border space-y-3">
                  <Star className="w-8 h-8 text-theme-muted mx-auto opacity-40" />
                  <h3 className="font-gothic font-bold text-base text-theme-text">NO SAVED FAVOURITES YET</h3>
                  <p className="text-xs text-theme-muted max-w-md mx-auto leading-relaxed">
                    Save your seasoned veterans, custom champions, and customized warriors to Favourites via the 3-dots menu on any warrior card!
                  </p>
                </div>
              ) : (
                favouriteUnits.map((fav) => {
                  const titlesStr = fav.titles && fav.titles.length > 0 ? `, ${fav.titles.join(', ')}` : '';
                  return (
                    <div
                      key={fav.id}
                      className="p-4 bg-theme-elevated border border-theme-primary/50 rounded hover:border-theme-primary transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs sm:text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-theme-primary text-theme-base">
                            {fav.profileSnapshot.category}
                          </span>
                          <h3 className="font-gothic font-bold text-base text-theme-text">
                            {fav.customName}{titlesStr}
                          </h3>
                        </div>

                        <div className="text-xs text-theme-muted space-x-3">
                          <span>Base: <strong className="text-theme-text">{fav.profileSnapshot.name}</strong></span>
                          <span>•</span>
                          <span>XP: <strong className="text-theme-primary">{fav.xp || 0} XP</strong></span>
                          <span>•</span>
                          <span>Rating: <strong className="text-theme-primary">{fav.totalCost} D</strong></span>
                        </div>

                        {/* Wargear Summary */}
                        <div className="flex flex-wrap gap-1 text-xs sm:text-[10px]">
                          {fav.equippedWeapons?.map((w, idx) => (
                            <span key={idx} className="px-1.5 py-0.2 rounded bg-theme-base text-theme-text border border-theme-border">
                              ⚔️ {w.name}
                            </span>
                          ))}
                          {fav.equippedArmour?.map((a, idx) => (
                            <span key={idx} className="px-1.5 py-0.2 rounded bg-theme-base text-theme-text border border-theme-border">
                              🛡️ {a.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => removeUnitFromFavourites(fav.id)}
                          className="p-2 text-theme-muted hover:text-status-error rounded border border-theme-border hover:bg-theme-accent/20"
                          title="Remove from Favourites"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleInductFavourite(fav)}
                          className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded shadow flex items-center space-x-1.5"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Induct Veteran</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : !catalogsLoaded ? (
            /*
              The recruitable list comes from the generated dataset, which is
              fetched. Until it arrives there is nothing to show — and saying so
              is the point. This modal used to be backed by `defaultRules.ts`,
              whose statlines the audit measured as 97% wrong, so it was always
              instantly full and always partly wrong. An empty list that says
              why beats a full one that lies.
            */
            <div className="p-8 text-center text-theme-muted">
              {catalogsError ? (
                <>
                  <p className="font-bold text-status-error">The ruleset could not be loaded.</p>
                  <p className="mt-1">{catalogsError}</p>
                  <p className="mt-2">
                    Nothing is shown rather than falling back to older data —
                    recruiting from the wrong ruleset is worse than not
                    recruiting yet.
                  </p>
                </>
              ) : (
                <p>Loading the roster from the ruleset…</p>
              )}
            </div>
          ) : (
            /* TAB: STANDARD PROFILES */
            filtered.map((unit) => {
              const isMercenary = unit.category === 'Mercenary' || unit.factionId === 'mercenaries';
              return (
                <div
                  key={unit.id}
                  className="p-4 bg-theme-elevated border border-theme-border rounded hover:border-theme-primary/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Unit Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs sm:text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          unit.category === 'Leader'
                            ? 'bg-theme-primary text-theme-base'
                            : unit.category === 'Elite'
                            ? 'bg-theme-primary text-white'
                            : unit.category === 'Mercenary'
                            ? 'bg-status-legal text-white'
                            : 'bg-theme-border text-theme-text'
                        }`}
                      >
                        {unit.category}
                      </span>
                      <h3 className="font-gothic font-bold text-base text-theme-text">{unit.name}</h3>
                      {isMercenary && (
                        <span className="text-xs sm:text-[9px] font-mono px-1.5 py-0.2 rounded bg-status-legal/15 text-status-legal border border-status-legal/40 font-bold uppercase">
                          Mercenary
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-2 font-mono text-xs max-w-xs bg-theme-surface p-1.5 rounded border border-theme-border">
                      <div>
                        <span className="text-xs sm:text-[9px] text-theme-muted block">MOV</span>
                        <span className="font-bold text-theme-text">{unit.stats.movement}</span>
                      </div>
                      <div>
                        <span className="text-xs sm:text-[9px] text-theme-muted block">RNG</span>
                        <span className="font-bold text-theme-text">{unit.stats.ranged}</span>
                      </div>
                      <div>
                        <span className="text-xs sm:text-[9px] text-theme-muted block">MEL</span>
                        <span className="font-bold text-theme-text">{unit.stats.melee}</span>
                      </div>
                      <div>
                        <span className="text-xs sm:text-[9px] text-theme-muted block">ARM</span>
                        <span className="font-bold text-theme-text">{unit.stats.armour}</span>
                      </div>
                    </div>

                    {/* Innate Abilities */}
                    {unit.innateAbilities && unit.innateAbilities.length > 0 && (
                      <div className="text-xs sm:text-[11px] text-theme-muted space-y-0.5 pt-1">
                        {unit.innateAbilities.map((ab) => (
                          <div key={ab.id}>
                            <strong className="text-theme-primary">{ab.name}:</strong> {ab.description}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right side: Custom Name & Recruit Button */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    <input
                      type="text"
                      placeholder="Custom warrior name..."
                      value={customNameInput[unit.id] || ''}
                      onChange={(e) =>
                        setCustomNameInput({ ...customNameInput, [unit.id]: e.target.value })
                      }
                      className="bg-theme-surface border border-theme-border rounded px-3 py-1.5 text-xs text-theme-text focus:outline-none focus:border-theme-primary w-full sm:w-44"
                    />

                    <button
                      onClick={() => handleAdd(unit)}
                      className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-mono text-xs font-bold uppercase rounded shadow flex items-center justify-center space-x-1.5 transition-colors whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {/* Both currencies. This read "0 D" for every Mercenary
                          the catalogues price in Glory — free, and hireable
                          without limit. */}
                      <span>
                        {unit.baseCost > 0 || !unit.gloryCost ? `${unit.baseCost} D` : ''}
                        {unit.gloryCost ? `${unit.baseCost > 0 ? ' + ' : ''}${unit.gloryCost} Glory` : ''}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
    </Sheet>
  );
};
