'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { UnitProfile } from '../../types/rules';
import { ActiveUnit } from '../../types/warband';
import { soundEffects } from '../../services/soundEffects';
import { 
  X, 
  Plus, 
  Shield, 
  Coins, 
  Sparkles, 
  UserPlus, 
  Star, 
  Trash2, 
  Swords, 
  Award, 
  Crown,
  BookOpen
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
    removeUnitFromFavourites 
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono text-xs">
      <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-3xl max-h-[85dvh] rounded-md flex flex-col shadow-2xl overflow-hidden bevel-container">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#323846] bg-[#0C0E12]">
          <div className="flex items-center space-x-3">
            <UserPlus className="w-5 h-5 text-[#D4AF37]" />
            <div>
              <h2 className="font-gothic font-bold text-lg text-[#ECEFF4] tracking-wide">RECRUIT WARRIOR</h2>
              <p className="text-xs font-mono text-[#8E95A5]">Select a unit profile or induct a saved veteran from your Favourites</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8E95A5] hover:text-[#ECEFF4] rounded hover:bg-[#20242E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-2 px-6 py-3 border-b border-[#323846] bg-[#161920] overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs font-mono rounded font-semibold uppercase transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#D4AF37] text-black shadow-md'
                  : 'bg-[#20242E] text-[#8E95A5] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Units Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB: FAVOURITES HALL */}
          {isFavouritesTab ? (
            <div className="space-y-3">
              {favouriteUnits.length === 0 ? (
                <div className="p-12 text-center bg-[#0C0E12] rounded border border-[#323846] space-y-3">
                  <Star className="w-8 h-8 text-[#8E95A5] mx-auto opacity-40" />
                  <h3 className="font-gothic font-bold text-base text-[#ECEFF4]">NO SAVED FAVOURITES YET</h3>
                  <p className="text-xs text-[#8E95A5] max-w-md mx-auto leading-relaxed">
                    Save your seasoned veterans, custom champions, and customized warriors to Favourites via the 3-dots menu on any warrior card!
                  </p>
                </div>
              ) : (
                favouriteUnits.map((fav) => {
                  const titlesStr = fav.titles && fav.titles.length > 0 ? `, ${fav.titles.join(', ')}` : '';
                  return (
                    <div
                      key={fav.id}
                      className="p-4 bg-[#20242E] border border-[#D4AF37]/50 rounded hover:border-[#D4AF37] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-[#D4AF37] text-black">
                            {fav.profileSnapshot.category}
                          </span>
                          <h3 className="font-gothic font-bold text-base text-[#ECEFF4]">
                            {fav.customName}{titlesStr}
                          </h3>
                        </div>

                        <div className="text-xs text-[#8E95A5] space-x-3">
                          <span>Base: <strong className="text-[#ECEFF4]">{fav.profileSnapshot.name}</strong></span>
                          <span>•</span>
                          <span>XP: <strong className="text-[#D4AF37]">{fav.xp || 0} XP</strong></span>
                          <span>•</span>
                          <span>Rating: <strong className="text-[#D4AF37]">{fav.totalCost} D</strong></span>
                        </div>

                        {/* Wargear Summary */}
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {fav.equippedWeapons?.map((w, idx) => (
                            <span key={idx} className="px-1.5 py-0.2 rounded bg-[#0C0E12] text-[#ECEFF4] border border-[#323846]">
                              ⚔️ {w.name}
                            </span>
                          ))}
                          {fav.equippedArmour?.map((a, idx) => (
                            <span key={idx} className="px-1.5 py-0.2 rounded bg-[#0C0E12] text-[#ECEFF4] border border-[#323846]">
                              🛡️ {a.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => removeUnitFromFavourites(fav.id)}
                          className="p-2 text-[#8E95A5] hover:text-[#E53935] rounded border border-[#323846] hover:bg-[#8B0000]/20"
                          title="Remove from Favourites"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleInductFavourite(fav)}
                          className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded shadow flex items-center space-x-1.5"
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
          ) : (
            /* TAB: STANDARD PROFILES */
            filtered.map((unit) => {
              const isMercenary = unit.category === 'Mercenary' || unit.factionId === 'mercenaries';
              return (
                <div
                  key={unit.id}
                  className="p-4 bg-[#20242E] border border-[#323846] rounded hover:border-[#D4AF37]/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Unit Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          unit.category === 'Leader'
                            ? 'bg-[#D4AF37] text-black'
                            : unit.category === 'Elite'
                            ? 'bg-[#7C4DFF] text-white'
                            : unit.category === 'Mercenary'
                            ? 'bg-[#00897B] text-white'
                            : 'bg-[#323846] text-[#ECEFF4]'
                        }`}
                      >
                        {unit.category}
                      </span>
                      <h3 className="font-gothic font-bold text-base text-[#ECEFF4]">{unit.name}</h3>
                      {isMercenary && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#00897B]/20 text-[#00897B] border border-[#00897B]/40 font-bold uppercase">
                          Mercenary
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-2 font-mono text-xs max-w-xs bg-[#161920] p-1.5 rounded border border-[#323846]">
                      <div>
                        <span className="text-[9px] text-[#8E95A5] block">MOV</span>
                        <span className="font-bold text-[#ECEFF4]">{unit.stats.movement}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#8E95A5] block">RNG</span>
                        <span className="font-bold text-[#ECEFF4]">{unit.stats.ranged}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#8E95A5] block">MEL</span>
                        <span className="font-bold text-[#ECEFF4]">{unit.stats.melee}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#8E95A5] block">ARM</span>
                        <span className="font-bold text-[#ECEFF4]">{unit.stats.armour}</span>
                      </div>
                    </div>

                    {/* Innate Abilities */}
                    {unit.innateAbilities && unit.innateAbilities.length > 0 && (
                      <div className="text-[11px] text-[#8E95A5] space-y-0.5 pt-1">
                        {unit.innateAbilities.map((ab) => (
                          <div key={ab.id}>
                            <strong className="text-[#D4AF37]">{ab.name}:</strong> {ab.description}
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
                      className="bg-[#161920] border border-[#323846] rounded px-3 py-1.5 text-xs text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37] w-full sm:w-44"
                    />

                    <button
                      onClick={() => handleAdd(unit)}
                      className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-mono text-xs font-bold uppercase rounded shadow flex items-center justify-center space-x-1.5 transition-colors whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{unit.baseCost} D</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
