'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { WeaponProfile, ArmourProfile, EquipmentItem } from '../../types/rules';
import { X, Shield, Swords, Package, Plus, Filter, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AddEquipmentModalProps {
  warbandId: string;
  unitId: string;
  unitName: string;
  onClose: () => void;
}

export const AddEquipmentModal: React.FC<AddEquipmentModalProps> = ({
  warbandId,
  unitId,
  unitName,
  onClose
}) => {
  const { 
    weapons, 
    armour, 
    equipment, 
    equipWeapon, 
    equipArmour, 
    equipEquipment, 
    getActiveWarband 
  } = useStore();

  const [tab, setTab] = useState<'weapons' | 'armour' | 'equipment'>('weapons');
  const [filterLegalOnly, setFilterLegalOnly] = useState<boolean>(true);

  const activeWarband = getActiveWarband();
  const unit = activeWarband?.units.find(u => u.id === unitId);
  const factionId = activeWarband?.factionId || 'universal';
  const unitProfileName = unit?.profileSnapshot.name || unitName;

  // Legality Checker for Weapons
  const isWeaponLegal = (w: WeaponProfile) => {
    if (w.allowedUnits && w.allowedUnits.length > 0) {
      return w.allowedUnits.some(uName => 
        unitProfileName.toLowerCase().includes(uName.toLowerCase()) ||
        unitName.toLowerCase().includes(uName.toLowerCase())
      );
    }
    if (w.allowedFactions && w.allowedFactions.length > 0) {
      return w.allowedFactions.includes(factionId);
    }
    if (w.factionId && w.factionId !== 'universal' && w.factionId !== factionId) {
      return false;
    }
    return true;
  };

  // Legality Checker for Armour
  const isArmourLegal = (a: ArmourProfile) => {
    if (a.allowedUnits && a.allowedUnits.length > 0) {
      return a.allowedUnits.some(uName => 
        unitProfileName.toLowerCase().includes(uName.toLowerCase()) ||
        unitName.toLowerCase().includes(uName.toLowerCase())
      );
    }
    if (a.allowedFactions && a.allowedFactions.length > 0) {
      return a.allowedFactions.includes(factionId);
    }
    if (a.factionId && a.factionId !== 'universal' && a.factionId !== factionId) {
      return false;
    }
    return true;
  };

  // Legality Checker for Equipment
  const isEquipmentLegal = (e: EquipmentItem) => {
    if (e.allowedUnits && e.allowedUnits.length > 0) {
      return e.allowedUnits.some(uName => 
        unitProfileName.toLowerCase().includes(uName.toLowerCase()) ||
        unitName.toLowerCase().includes(uName.toLowerCase())
      );
    }
    if (e.allowedFactions && e.allowedFactions.length > 0) {
      return e.allowedFactions.includes(factionId);
    }
    if (e.factionId && e.factionId !== 'universal' && e.factionId !== factionId) {
      return false;
    }
    return true;
  };

  const displayedWeapons = filterLegalOnly ? weapons.filter(isWeaponLegal) : weapons;
  const displayedArmour = filterLegalOnly ? armour.filter(isArmourLegal) : armour;
  const displayedEquipment = filterLegalOnly ? equipment.filter(isEquipmentLegal) : equipment;

  // Helper to format range without double Melee
  const formatRange = (range: string, type: string) => {
    if (range.toLowerCase().startsWith('melee')) return range;
    if (type.toLowerCase() === 'melee') return `Melee (${range})`;
    return range;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161920] border-2 border-[#323846] w-full max-w-2xl max-h-[88vh] rounded-md flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#323846] bg-[#0C0E12]">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-gothic font-bold text-lg text-[#ECEFF4] tracking-wide">
                EQUIP WARRIOR: <span className="text-[#D4AF37]">{unitName}</span>
              </h2>
            </div>
            <p className="text-xs font-mono text-[#8E95A5]">
              Base Profile: <strong className="text-[#ECEFF4]">{unitProfileName}</strong> ({factionId})
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Legal Filter Toggle */}
            <button
              onClick={() => setFilterLegalOnly(!filterLegalOnly)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold uppercase transition-all ${
                filterLegalOnly
                  ? 'bg-[#2E7D32]/20 border border-[#4CAF50] text-[#81C784]'
                  : 'bg-[#161920] border border-[#323846] text-[#8E95A5] hover:text-[#ECEFF4]'
              }`}
              title="Toggle Legal vs All Wargear"
            >
              <Filter className="w-3 h-3" />
              <span>{filterLegalOnly ? 'Legal Gear' : 'All Armory'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 text-[#8E95A5] hover:text-[#ECEFF4] rounded hover:bg-[#20242E] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-3 border-b border-[#323846] bg-[#161920]">
          <button
            onClick={() => setTab('weapons')}
            className={`py-2.5 flex items-center justify-center space-x-2 font-mono text-xs font-bold uppercase transition-colors ${
              tab === 'weapons' ? 'bg-[#20242E] text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-[#8E95A5] hover:text-white'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Weapons ({displayedWeapons.length})</span>
          </button>
          <button
            onClick={() => setTab('armour')}
            className={`py-2.5 flex items-center justify-center space-x-2 font-mono text-xs font-bold uppercase transition-colors ${
              tab === 'armour' ? 'bg-[#20242E] text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-[#8E95A5] hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Armour ({displayedArmour.length})</span>
          </button>
          <button
            onClick={() => setTab('equipment')}
            className={`py-2.5 flex items-center justify-center space-x-2 font-mono text-xs font-bold uppercase transition-colors ${
              tab === 'equipment' ? 'bg-[#20242E] text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-[#8E95A5] hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Gear & Relics ({displayedEquipment.length})</span>
          </button>
        </div>

        {/* Content List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {tab === 'weapons' && (
            <>
              {displayedWeapons.map((wep) => {
                const legal = isWeaponLegal(wep);
                return (
                  <div
                    key={wep.id}
                    className={`p-3 bg-[#20242E] border rounded hover:border-[#D4AF37]/50 transition-colors flex items-center justify-between gap-4 ${
                      legal ? 'border-[#323846]' : 'border-[#FF9800]/40 opacity-85'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-gothic font-bold text-sm text-[#ECEFF4]">{wep.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161920] text-[#8E95A5] border border-[#323846]">
                          {wep.type} • {formatRange(wep.range, wep.type)}
                        </span>
                        {wep.hands === 2 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#8B0000]/20 text-[#E53935] border border-[#8B0000]/40">
                            2-Handed
                          </span>
                        )}
                        {!legal && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#FF9800]/20 text-[#FFB74D] border border-[#FF9800]/40 flex items-center space-x-1">
                            <AlertCircle className="w-2.5 h-2.5 inline mr-1" />
                            Special / Variant
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-[#8E95A5] flex items-center space-x-3">
                        <span>Mod: <strong className="text-[#ECEFF4]">{wep.modifiers}</strong></span>
                        <span>Dmg: <strong className="text-[#ECEFF4]">{wep.damage}</strong></span>
                      </div>
                      {wep.keywords && wep.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {wep.keywords.map((kw) => (
                            <span key={kw} className="text-[9px] font-mono bg-[#161920] px-1.5 py-0.2 rounded text-[#D4AF37]">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-xs font-mono font-bold text-[#D4AF37] whitespace-nowrap">
                        {wep.cost} D
                      </div>
                      <button
                        onClick={() => {
                          equipWeapon(warbandId, unitId, wep.id);
                          onClose();
                        }}
                        className="p-2 bg-[#8B0000] hover:bg-[#A30000] text-white rounded transition-colors"
                        title="Equip Weapon"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {tab === 'armour' && (
            <>
              {displayedArmour.map((arm) => {
                const legal = isArmourLegal(arm);
                return (
                  <div
                    key={arm.id}
                    className={`p-3 bg-[#20242E] border rounded hover:border-[#D4AF37]/50 transition-colors flex items-center justify-between gap-4 ${
                      legal ? 'border-[#323846]' : 'border-[#FF9800]/40 opacity-85'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-gothic font-bold text-sm text-[#ECEFF4]">{arm.name}</h3>
                        {!legal && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#FF9800]/20 text-[#FFB74D] border border-[#FF9800]/40 flex items-center space-x-1">
                            <AlertCircle className="w-2.5 h-2.5 inline mr-1" />
                            Special / Faction Locked
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-[#D4AF37]">
                        Protection: <strong>{arm.armourModifier}</strong>
                      </p>
                      {arm.description && <p className="text-xs text-[#8E95A5]">{arm.description}</p>}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-xs font-mono font-bold text-[#D4AF37] whitespace-nowrap">
                        {arm.cost} D
                      </div>
                      <button
                        onClick={() => {
                          equipArmour(warbandId, unitId, arm.id);
                          onClose();
                        }}
                        className="p-2 bg-[#8B0000] hover:bg-[#A30000] text-white rounded transition-colors"
                        title="Equip Armour"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {tab === 'equipment' && (
            <>
              {displayedEquipment.map((item) => {
                const legal = isEquipmentLegal(item);
                return (
                  <div
                    key={item.id}
                    className={`p-3 bg-[#20242E] border rounded hover:border-[#D4AF37]/50 transition-colors flex items-center justify-between gap-4 ${
                      legal ? 'border-[#323846]' : 'border-[#FF9800]/40 opacity-85'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-gothic font-bold text-sm text-[#ECEFF4]">{item.name}</h3>
                        {!legal && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#FF9800]/20 text-[#FFB74D] border border-[#FF9800]/40 flex items-center space-x-1">
                            <AlertCircle className="w-2.5 h-2.5 inline mr-1" />
                            Special / Locked
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8E95A5]">{item.effect}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-xs font-mono font-bold text-[#D4AF37] whitespace-nowrap">
                        {item.cost} D
                      </div>
                      <button
                        onClick={() => {
                          equipEquipment(warbandId, unitId, item.id);
                          onClose();
                        }}
                        className="p-2 bg-[#8B0000] hover:bg-[#A30000] text-white rounded transition-colors"
                        title="Equip Item"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

      </div>
    </div>
  );
};
