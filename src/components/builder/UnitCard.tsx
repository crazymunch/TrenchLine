import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { ActiveUnit } from '../../types/warband';
import { AddEquipmentModal } from './AddEquipmentModal';
import { 
  Trash2, 
  Plus, 
  Swords, 
  Shield, 
  Package, 
  Sparkles, 
  AlertTriangle, 
  Edit3, 
  Check, 
  X,
  Crosshair,
  Coins
} from 'lucide-react';

interface UnitCardProps {
  unit: ActiveUnit;
  warbandId: string;
}

export const UnitCard: React.FC<UnitCardProps> = ({ unit, warbandId }) => {
  const { 
    removeUnitFromWarband, 
    updateUnitName, 
    removeWeapon, 
    removeArmour, 
    removeEquipment,
    setActiveKeyword,
    keywords
  } = useStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(unit.customName);
  const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);

  const handleSaveName = () => {
    updateUnitName(warbandId, unit.id, nameVal);
    setIsEditingName(false);
  };

  const handleKeywordClick = (kwName: string) => {
    const found = keywords.find((k) => k.name.toLowerCase() === kwName.toLowerCase());
    if (found) {
      setActiveKeyword(found);
    }
  };

  return (
    <>
      <div className="bg-[#161920] border border-[#323846] rounded-md overflow-hidden shadow-lg hover:border-[#D4AF37]/50 transition-all flex flex-col justify-between">
        
        {/* Card Header */}
        <div className="p-3.5 bg-[#20242E] border-b border-[#323846] flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 mr-2">
            <span
              className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                unit.profileSnapshot.category === 'Leader'
                  ? 'bg-[#D4AF37] text-black'
                  : unit.profileSnapshot.category === 'Elite'
                  ? 'bg-[#7C4DFF] text-white'
                  : unit.profileSnapshot.category === 'Mercenary'
                  ? 'bg-[#00897B] text-white'
                  : 'bg-[#323846] text-[#ECEFF4]'
              }`}
            >
              {unit.profileSnapshot.category}
            </span>

            {isEditingName ? (
              <div className="flex items-center space-x-1 flex-1">
                <input
                  type="text"
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  className="bg-[#161920] border border-[#D4AF37] rounded px-1.5 py-0.5 text-xs text-white focus:outline-none w-full"
                  autoFocus
                />
                <button onClick={handleSaveName} className="text-[#4E9A6E] hover:text-white p-1">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setIsEditingName(false)} className="text-[#E53935] hover:text-white p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                <h3 className="font-gothic font-bold text-sm text-[#ECEFF4] group-hover:text-[#D4AF37] transition-colors">
                  {unit.customName}
                </h3>
                <Edit3 className="w-3 h-3 text-[#8E95A5] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-xs font-mono font-bold text-[#D4AF37] bg-[#161920] px-2 py-0.5 rounded border border-[#323846]">
              {unit.totalCost} D
            </div>
            <button
              onClick={() => removeUnitFromWarband(warbandId, unit.id)}
              className="text-[#8E95A5] hover:text-[#E53935] p-1 rounded transition-colors"
              title="Dismiss Warrior"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-3.5 space-y-3 flex-1">
          
          {/* Base Profile Subtitle */}
          <div className="text-[11px] font-mono text-[#8E95A5] flex items-center justify-between">
            <span>Base: {unit.profileSnapshot.name}</span>
            {unit.xp > 0 && (
              <span className="text-[#D4AF37] flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>{unit.xp} XP</span>
              </span>
            )}
          </div>

          {/* Stat Block */}
          <div className="grid grid-cols-4 gap-1.5 font-mono text-center text-xs bg-[#0C0E12] p-1.5 rounded border border-[#323846]">
            <div>
              <span className="text-[9px] text-[#8E95A5] block">MOV</span>
              <span className="font-bold text-[#ECEFF4]">{unit.profileSnapshot.stats.movement}</span>
            </div>
            <div>
              <span className="text-[9px] text-[#8E95A5] block">RNG</span>
              <span className="font-bold text-[#ECEFF4]">{unit.profileSnapshot.stats.ranged}</span>
            </div>
            <div>
              <span className="text-[9px] text-[#8E95A5] block">MELEE</span>
              <span className="font-bold text-[#ECEFF4]">{unit.profileSnapshot.stats.melee}</span>
            </div>
            <div>
              <span className="text-[9px] text-[#8E95A5] block">ARMOUR</span>
              <span className="font-bold text-[#ECEFF4]">{unit.profileSnapshot.stats.armour}</span>
            </div>
          </div>

          {/* Innate Abilities */}
          {unit.profileSnapshot.innateAbilities.length > 0 && (
            <div className="space-y-1">
              {unit.profileSnapshot.innateAbilities.map((ab) => (
                <div key={ab.id} className="text-xs bg-[#20242E]/60 p-1.5 rounded border border-[#323846]/60">
                  <span className="font-semibold text-[#D4AF37] font-mono text-[11px]">{ab.name}: </span>
                  <span className="text-[#8E95A5] text-[11px]">{ab.description}</span>
                </div>
              ))}
            </div>
          )}

          {/* Equipped Weapons */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold text-[#8E95A5] uppercase tracking-wider flex items-center space-x-1">
              <Swords className="w-3 h-3" />
              <span>Weapons ({unit.equippedWeapons.length})</span>
            </span>

            {unit.equippedWeapons.length === 0 ? (
              <p className="text-[11px] text-[#8E95A5] italic">Unarmed</p>
            ) : (
              <div className="space-y-1">
                {unit.equippedWeapons.map((wep) => (
                  <div
                    key={wep.instanceId}
                    className="flex items-center justify-between text-xs bg-[#0C0E12] px-2 py-1 rounded border border-[#323846]"
                  >
                    <div className="flex-1 mr-2">
                      <div className="font-semibold text-[#ECEFF4]">{wep.name}</div>
                      <div className="text-[10px] font-mono text-[#8E95A5]">
                        {wep.range} | Mod: {wep.modifiers} | {wep.damage}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono text-[#D4AF37]">{wep.cost} D</span>
                      <button
                        onClick={() => removeWeapon(warbandId, unit.id, wep.instanceId)}
                        className="text-[#8E95A5] hover:text-[#E53935]"
                        title="Unequip"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Equipped Armour & Gear */}
          {(unit.equippedArmour.length > 0 || unit.equippedEquipment.length > 0) && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-[#8E95A5] uppercase tracking-wider flex items-center space-x-1">
                <Shield className="w-3 h-3" />
                <span>Protection & Gear</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {unit.equippedArmour.map((arm) => (
                  <span
                    key={arm.instanceId}
                    className="inline-flex items-center space-x-1 bg-[#20242E] text-xs font-mono px-2 py-0.5 rounded border border-[#323846]"
                  >
                    <span>{arm.name} ({arm.armourModifier})</span>
                    <button
                      onClick={() => removeArmour(warbandId, unit.id, arm.instanceId)}
                      className="text-[#8E95A5] hover:text-[#E53935]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {unit.equippedEquipment.map((eq) => (
                  <span
                    key={eq.instanceId}
                    className="inline-flex items-center space-x-1 bg-[#20242E] text-xs font-mono px-2 py-0.5 rounded border border-[#323846]"
                  >
                    <span>{eq.name}</span>
                    <button
                      onClick={() => removeEquipment(warbandId, unit.id, eq.instanceId)}
                      className="text-[#8E95A5] hover:text-[#E53935]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Injuries & Battle Scars */}
          {unit.injuries.length > 0 && (
            <div className="p-2 bg-[#8B0000]/10 border border-[#8B0000]/30 rounded text-xs">
              <span className="font-mono text-[#E53935] font-bold flex items-center space-x-1 mb-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Injuries & Scars:</span>
              </span>
              <ul className="list-disc list-inside text-[#ECEFF4] space-y-0.5 text-[11px]">
                {unit.injuries.map((inj, idx) => (
                  <li key={idx}>{inj}</li>
                ))}
              </ul>
            </div>
          )}

        </div>

        {/* Card Footer Actions */}
        <div className="p-2.5 bg-[#20242E] border-t border-[#323846]">
          <button
            onClick={() => setIsEquipModalOpen(true)}
            className="w-full flex items-center justify-center space-x-1.5 py-1.5 bg-[#161920] hover:bg-[#323846] border border-[#323846] rounded text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-wider transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Equip Armory</span>
          </button>
        </div>

      </div>

      {/* Equipment Modal */}
      {isEquipModalOpen && (
        <AddEquipmentModal
          warbandId={warbandId}
          unitId={unit.id}
          unitName={unit.customName}
          onClose={() => setIsEquipModalOpen(false)}
        />
      )}
    </>
  );
};
