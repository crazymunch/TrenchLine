import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { UnitProfile } from '../../types/rules';
import { X, Plus, Shield, Coins, Sparkles, UserPlus } from 'lucide-react';

interface AddUnitModalProps {
  warbandId: string;
  factionId: string;
  onClose: () => void;
}

export const AddUnitModal: React.FC<AddUnitModalProps> = ({ warbandId, factionId, onClose }) => {
  const { units, addUnitToWarband, factions } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customNameInput, setCustomNameInput] = useState<Record<string, string>>({});

  // Filter units belonging to this faction or mercenaries
  const availableUnits = units.filter(
    (u) => u.factionId === factionId || u.factionId === 'mercenaries' || u.category === 'Mercenary'
  );

  const categories = ['All', 'Leader', 'Elite', 'Trooper', 'Mercenary'];

  const filtered = availableUnits.filter((u) => {
    if (selectedCategory === 'All') return true;
    return u.category === selectedCategory;
  });

  const handleAdd = (unit: UnitProfile) => {
    const customName = customNameInput[unit.id] || unit.name;
    addUnitToWarband(warbandId, unit.id, customName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161920] border-2 border-[#323846] w-full max-w-3xl max-h-[85vh] rounded-md flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#323846] bg-[#0C0E12]">
          <div className="flex items-center space-x-3">
            <UserPlus className="w-5 h-5 text-[#D4AF37]" />
            <div>
              <h2 className="font-gothic font-bold text-lg text-[#ECEFF4] tracking-wide">RECRUIT WARRIOR</h2>
              <p className="text-xs font-mono text-[#8E95A5]">Select a unit profile to induct into your warband roster</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8E95A5] hover:text-[#ECEFF4] rounded hover:bg-[#20242E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
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

        {/* Units Grid */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {filtered.map((unit) => {
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
                      <span className="text-[10px] font-mono text-[#D4AF37] bg-[#D4AF37]/10 px-1.5 py-0.5 rounded border border-[#D4AF37]/30">
                        Hired Gun
                      </span>
                    )}
                  </div>

                  {unit.lore && <p className="text-xs text-[#8E95A5] italic">{unit.lore}</p>}

                  {/* Stat Block */}
                  <div className="grid grid-cols-4 gap-2 max-w-xs font-mono text-center text-xs bg-[#161920] p-1.5 rounded border border-[#323846]">
                    <div>
                      <span className="text-[9px] text-[#8E95A5] block">MOV</span>
                      <span className="font-bold text-[#ECEFF4]">{unit.stats.movement}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#8E95A5] block">RNG</span>
                      <span className="font-bold text-[#ECEFF4]">{unit.stats.ranged}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#8E95A5] block">MELEE</span>
                      <span className="font-bold text-[#ECEFF4]">{unit.stats.melee}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#8E95A5] block">ARMOUR</span>
                      <span className="font-bold text-[#ECEFF4]">{unit.stats.armour}</span>
                    </div>
                  </div>

                  {/* Abilities */}
                  {unit.innateAbilities.length > 0 && (
                    <div className="space-y-1">
                      {unit.innateAbilities.map((ab) => (
                        <div key={ab.id} className="text-xs">
                          <span className="font-semibold text-[#D4AF37] font-mono">{ab.name}: </span>
                          <span className="text-[#8E95A5]">{ab.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom Name & Add Action */}
                <div className="flex flex-col space-y-2 md:items-end min-w-[200px]">
                  <div className="flex items-center space-x-1 text-sm font-mono text-[#D4AF37]">
                    <Coins className="w-4 h-4" />
                    <span className="font-bold">{unit.baseCost} Ducats</span>
                  </div>

                  <input
                    type="text"
                    placeholder={`Name (default: ${unit.name})`}
                    value={customNameInput[unit.id] || ''}
                    onChange={(e) =>
                      setCustomNameInput({ ...customNameInput, [unit.id]: e.target.value })
                    }
                    className="w-full bg-[#161920] border border-[#323846] rounded px-2 py-1 text-xs text-[#ECEFF4] placeholder-[#8E95A5] focus:outline-none focus:border-[#D4AF37]"
                  />

                  <button
                    onClick={() => handleAdd(unit)}
                    className="w-full flex items-center justify-center space-x-1 bg-[#8B0000] hover:bg-[#A30000] text-white px-3 py-1.5 rounded font-mono text-xs font-bold tracking-wider uppercase transition-colors shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Recruit Unit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
