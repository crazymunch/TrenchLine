'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { WeaponProfile, ArmourProfile, EquipmentItem } from '../../types/rules';
import { soundEffects } from '../../services/soundEffects';
import { 
  X, 
  Shield, 
  Swords, 
  Package, 
  Plus, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  Crosshair, 
  Flame, 
  Search,
  Sparkles,
  Layers,
  AlertTriangle
} from 'lucide-react';

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
  const [weaponSubCategory, setWeaponSubCategory] = useState<'all' | 'ranged' | 'melee' | 'shield' | 'grenade'>('all');
  const [equipmentSubCategory, setEquipmentSubCategory] = useState<'all' | 'headgear' | 'relic' | 'gear'>('all');
  const [filterLegalOnly, setFilterLegalOnly] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const activeWarband = getActiveWarband();
  const unit = activeWarband?.units.find(u => u.id === unitId);
  const factionId = activeWarband?.factionId || 'universal';
  const unitProfileName = unit?.profileSnapshot.name || unitName;

  // Calculate hands and equipment loadout counts
  const currentWeapons = unit?.equippedWeapons || [];
  const currentArmour = unit?.equippedArmour || [];
  const currentEquipment = unit?.equippedEquipment || [];

  const totalHandsUsed = currentWeapons.reduce((sum, w) => sum + (w.hands || 1), 0);
  const hasTwoHanded = currentWeapons.some(w => (w.hands || 1) >= 2);
  const isOverHandsLimit = totalHandsUsed > 2;
  const isOverArmourLimit = currentArmour.length > 1;

  // Accurate Unit and Faction Legality Filter for Weapons
  const isWeaponLegal = (w: WeaponProfile) => {
    // 1. Explicit Allowed Units check
    if (w.allowedUnits && w.allowedUnits.length > 0) {
      return w.allowedUnits.some(uName => 
        unitProfileName.toLowerCase().includes(uName.toLowerCase()) ||
        unitName.toLowerCase().includes(uName.toLowerCase())
      );
    }

    // 2. Heavy / Exoskeleton restrictions (e.g. Titan weapons, heavy flamers)
    const isHeavySpecialWeapon = /titan|cannon|heavy machine gun|mortar|autocannon/i.test(w.name);
    const isHeavyUnit = /heavy|brazen|golem|mamluk|mechanized/i.test(unitProfileName);
    if (isHeavySpecialWeapon && !isHeavyUnit) {
      return false;
    }

    // 3. Faction restriction
    if (w.allowedFactions && w.allowedFactions.length > 0) {
      if (!w.allowedFactions.includes(factionId)) return false;
    } else if (w.factionId && w.factionId !== 'universal' && w.factionId !== factionId) {
      return false;
    }

    return true;
  };

  // Accurate Legality Filter for Armour
  const isArmourLegal = (a: ArmourProfile) => {
    if (a.allowedUnits && a.allowedUnits.length > 0) {
      return a.allowedUnits.some(uName => 
        unitProfileName.toLowerCase().includes(uName.toLowerCase()) ||
        unitName.toLowerCase().includes(uName.toLowerCase())
      );
    }
    if (a.id === 'arm-machine' || a.name.includes('Machine Armour')) {
      return /heavy|brazen|golem|mechanized/i.test(unitProfileName);
    }
    if (a.allowedFactions && a.allowedFactions.length > 0) {
      if (!a.allowedFactions.includes(factionId)) return false;
    } else if (a.factionId && a.factionId !== 'universal' && a.factionId !== factionId) {
      return false;
    }
    return true;
  };

  // Accurate Legality Filter for Equipment & Relics
  const isEquipmentLegal = (e: EquipmentItem) => {
    if (e.allowedUnits && e.allowedUnits.length > 0) {
      return e.allowedUnits.some(uName => 
        unitProfileName.toLowerCase().includes(uName.toLowerCase()) ||
        unitName.toLowerCase().includes(uName.toLowerCase())
      );
    }
    if (e.allowedFactions && e.allowedFactions.length > 0) {
      if (!e.allowedFactions.includes(factionId)) return false;
    } else if (e.factionId && e.factionId !== 'universal' && e.factionId !== factionId) {
      return false;
    }
    return true;
  };

  // Filtering Weapons
  let displayedWeapons = filterLegalOnly ? weapons.filter(isWeaponLegal) : weapons;
  if (weaponSubCategory === 'ranged') {
    displayedWeapons = displayedWeapons.filter(w => w.type === 'Ranged' || (w.range && w.range !== 'Melee' && !w.range.startsWith('Melee')));
  } else if (weaponSubCategory === 'melee') {
    displayedWeapons = displayedWeapons.filter(w => w.type === 'Melee' || w.range === 'Melee' || w.range?.startsWith('Melee'));
  } else if (weaponSubCategory === 'shield') {
    displayedWeapons = displayedWeapons.filter(w => /shield|mantlet|instrument|flag/i.test(w.name) || w.keywords?.includes('SHIELD'));
  } else if (weaponSubCategory === 'grenade') {
    displayedWeapons = displayedWeapons.filter(w => /grenade|bomb|molotov|dynamite/i.test(w.name) || w.keywords?.includes('GRENADE'));
  }

  // Filtering Armour
  const displayedArmour = filterLegalOnly ? armour.filter(isArmourLegal) : armour;

  // Filtering Equipment
  let displayedEquipment = filterLegalOnly ? equipment.filter(isEquipmentLegal) : equipment;
  if (equipmentSubCategory === 'headgear') {
    displayedEquipment = displayedEquipment.filter(e => /helmet|gas mask|mask|goggles|hood|crown/i.test(e.name));
  } else if (equipmentSubCategory === 'relic') {
    displayedEquipment = displayedEquipment.filter(e => /relic|amulet|icon|elixir|tome|scripture|chalice|shrine/i.test(e.name));
  } else if (equipmentSubCategory === 'gear') {
    displayedEquipment = displayedEquipment.filter(e => !/helmet|gas mask/i.test(e.name));
  }

  // Search filter
  const sQuery = searchFilter.toLowerCase().trim();
  if (sQuery) {
    displayedWeapons = displayedWeapons.filter(w => w.name.toLowerCase().includes(sQuery) || (w.description || '').toLowerCase().includes(sQuery));
    displayedEquipment = displayedEquipment.filter(e => e.name.toLowerCase().includes(sQuery) || (e.effect || '').toLowerCase().includes(sQuery));
  }

  const handleEquipWeapon = (w: WeaponProfile) => {
    equipWeapon(warbandId, unitId, w.id);
    soundEffects.playGunfire();
  };

  const handleEquipArmour = (a: ArmourProfile) => {
    equipArmour(warbandId, unitId, a.id);
    soundEffects.playCathedralBell();
  };

  const handleEquipEquipment = (e: EquipmentItem) => {
    equipEquipment(warbandId, unitId, e.id);
    soundEffects.playDiceRoll();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-mono text-xs">
      <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-3xl max-h-[92vh] rounded-lg shadow-2xl overflow-hidden flex flex-col bevel-container">
        
        {/* Header */}
        <div className="p-4 bg-[#0C0E12] border-b border-[#323846] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={() => setFilterLegalOnly(!filterLegalOnly)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded font-mono text-xs font-bold uppercase border transition-all ${
                filterLegalOnly
                  ? 'bg-[#161920] border-[#4E9A6E] text-[#4E9A6E] shadow'
                  : 'bg-[#20242E] border-[#323846] text-[#8E95A5] hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{filterLegalOnly ? '✓ Legal Gear Only' : 'All Armoury (Override)'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-[#8E95A5] hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loadout Status & Hand Capacity Banner */}
        <div className="bg-[#161920] px-4 py-2 border-b border-[#323846] flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center space-x-3">
            <span className="text-[#8E95A5]">
              Hands Used: <strong className={isOverHandsLimit ? 'text-[#E53935]' : 'text-[#D4AF37]'}>{totalHandsUsed} / 2</strong>
            </span>
            <span>•</span>
            <span className="text-[#8E95A5]">
              Weapons: <strong className="text-[#ECEFF4]">{currentWeapons.length}</strong>
            </span>
            <span>•</span>
            <span className="text-[#8E95A5]">
              Armour: <strong className={isOverArmourLimit ? 'text-[#E53935]' : 'text-[#ECEFF4]'}>{currentArmour.length} / 1</strong>
            </span>
          </div>

          {isOverHandsLimit && (
            <span className="px-2 py-0.5 rounded bg-[#8B0000]/40 border border-[#8B0000] text-[#E53935] font-bold text-[10px] flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Exceeds 2-Hand Capacity</span>
            </span>
          )}
        </div>

        {/* Main Tab Navigation */}
        <div className="flex border-b border-[#323846] bg-[#161920] px-4 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setTab('weapons')}
            className={`px-4 py-2 border-b-2 font-bold uppercase flex items-center space-x-1.5 transition-colors text-xs ${
              tab === 'weapons'
                ? 'border-[#D4AF37] text-[#D4AF37] bg-[#20242E]/80 rounded-t'
                : 'border-transparent text-[#8E95A5] hover:text-[#ECEFF4]'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Weapons ({displayedWeapons.length})</span>
          </button>

          <button
            onClick={() => setTab('armour')}
            className={`px-4 py-2 border-b-2 font-bold uppercase flex items-center space-x-1.5 transition-colors text-xs ${
              tab === 'armour'
                ? 'border-[#D4AF37] text-[#D4AF37] bg-[#20242E]/80 rounded-t'
                : 'border-transparent text-[#8E95A5] hover:text-[#ECEFF4]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Armour ({displayedArmour.length})</span>
          </button>

          <button
            onClick={() => setTab('equipment')}
            className={`px-4 py-2 border-b-2 font-bold uppercase flex items-center space-x-1.5 transition-colors text-xs ${
              tab === 'equipment'
                ? 'border-[#D4AF37] text-[#D4AF37] bg-[#20242E]/80 rounded-t'
                : 'border-transparent text-[#8E95A5] hover:text-[#ECEFF4]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Gear & Relics ({displayedEquipment.length})</span>
          </button>
        </div>

        {/* Sub-Category Filter & Search Toolbar */}
        <div className="p-3 bg-[#0C0E12] border-b border-[#323846] flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Sub-Categories for Weapons */}
          {tab === 'weapons' && (
            <div className="flex flex-wrap gap-1 w-full sm:w-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'melee', label: '⚔️ Melee' },
                { id: 'ranged', label: '🎯 Ranged' },
                { id: 'shield', label: '🛡️ Utility / Shields' },
                { id: 'grenade', label: '💣 Grenades' }
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setWeaponSubCategory(sub.id as any)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                    weaponSubCategory === sub.id
                      ? 'bg-[#D4AF37] text-black shadow'
                      : 'bg-[#161920] text-[#8E95A5] hover:text-white border border-[#323846]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}

          {/* Sub-Categories for Gear */}
          {tab === 'equipment' && (
            <div className="flex flex-wrap gap-1 w-full sm:w-auto">
              {[
                { id: 'all', label: 'All Equipment' },
                { id: 'headgear', label: '🪖 Headgear (0/1)' },
                { id: 'relic', label: '✨ Relics & Elixirs' },
                { id: 'gear', label: '🎒 Battlefield Gear' }
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setEquipmentSubCategory(sub.id as any)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                    equipmentSubCategory === sub.id
                      ? 'bg-[#D4AF37] text-black shadow'
                      : 'bg-[#161920] text-[#8E95A5] hover:text-white border border-[#323846]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}

          {tab === 'armour' && (
            <div className="text-[11px] text-[#8E95A5]">
              Select 1 body armour suite (Standard, Reinforced, or Faction Exoskeleton).
            </div>
          )}

          {/* Search Input */}
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-[#8E95A5] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search gear..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-[#161920] border border-[#323846] rounded pl-8 pr-2.5 py-1 text-xs text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {/* Item List Body */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          
          {/* WEAPONS LIST */}
          {tab === 'weapons' && (
            <div className="space-y-2">
              {displayedWeapons.length === 0 ? (
                <p className="text-center text-[#8E95A5] py-8 italic">No weapons match the selected category filter.</p>
              ) : (
                displayedWeapons.map((wep) => {
                  const is2H = (wep.hands || 1) >= 2 || wep.keywords?.includes('2-HANDED');
                  return (
                    <div
                      key={wep.id}
                      className="p-3 bg-[#0C0E12] border border-[#323846] rounded-md flex items-center justify-between gap-3 hover:border-[#D4AF37]/50 transition-colors"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="font-gothic font-bold text-sm text-[#ECEFF4]">{wep.name}</strong>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#20242E] text-[#8E95A5]">
                            {wep.type} • {wep.range}
                          </span>
                          {is2H && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#8B0000]/40 text-[#E53935] font-bold">
                              2-HANDED
                            </span>
                          )}
                          {wep.factionId && wep.factionId !== 'universal' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#20242E] text-[#D4AF37] border border-[#D4AF37]/30">
                              {wep.factionId}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#8E95A5]">
                          <span>Mod: <strong className="text-[#ECEFF4]">{wep.modifiers || '+0'}</strong></span>
                          <span>Dmg: <strong className="text-[#ECEFF4]">{wep.damage || 'Standard'}</strong></span>
                        </div>

                        {wep.keywords && wep.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {wep.keywords.map((kw, kIdx) => (
                              <span key={kIdx} className="text-[9px] px-1 py-0.2 rounded bg-[#161920] text-[#D4AF37]">
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 flex-shrink-0">
                        <strong className="text-sm font-bold text-[#D4AF37]">{wep.cost} D</strong>
                        <button
                          onClick={() => handleEquipWeapon(wep)}
                          className="p-2 bg-[#8B0000] hover:bg-[#A30000] text-white rounded font-bold shadow flex items-center justify-center transition-colors"
                          title="Equip Weapon"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ARMOUR LIST */}
          {tab === 'armour' && (
            <div className="space-y-2">
              {displayedArmour.length === 0 ? (
                <p className="text-center text-[#8E95A5] py-8 italic">No armour suites match the filter.</p>
              ) : (
                displayedArmour.map((arm) => (
                  <div
                    key={arm.id}
                    className="p-3 bg-[#0C0E12] border border-[#323846] rounded-md flex items-center justify-between gap-3 hover:border-[#D4AF37]/50 transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <strong className="font-gothic font-bold text-sm text-[#ECEFF4]">{arm.name}</strong>
                        {arm.factionId && arm.factionId !== 'universal' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#20242E] text-[#D4AF37] border border-[#D4AF37]/30">
                            {arm.factionId}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#D4AF37]">
                        Protection: <strong>{arm.armourModifier || arm.modifier}</strong>
                      </div>
                      <p className="text-[11px] text-[#8E95A5] leading-relaxed">
                        {arm.description}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <strong className="text-sm font-bold text-[#D4AF37]">{arm.cost} D</strong>
                      <button
                        onClick={() => handleEquipArmour(arm)}
                        className="p-2 bg-[#8B0000] hover:bg-[#A30000] text-white rounded font-bold shadow flex items-center justify-center transition-colors"
                        title="Equip Armour"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* EQUIPMENT LIST */}
          {tab === 'equipment' && (
            <div className="space-y-2">
              {displayedEquipment.length === 0 ? (
                <p className="text-center text-[#8E95A5] py-8 italic">No equipment matches the filter.</p>
              ) : (
                displayedEquipment.map((eq) => (
                  <div
                    key={eq.id}
                    className="p-3 bg-[#0C0E12] border border-[#323846] rounded-md flex items-center justify-between gap-3 hover:border-[#D4AF37]/50 transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <strong className="font-gothic font-bold text-sm text-[#ECEFF4]">{eq.name}</strong>
                        {eq.factionId && eq.factionId !== 'universal' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#20242E] text-[#D4AF37] border border-[#D4AF37]/30">
                            {eq.factionId}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#8E95A5] leading-relaxed">
                        {eq.effect || eq.description}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <strong className="text-sm font-bold text-[#D4AF37]">{eq.cost} D</strong>
                      <button
                        onClick={() => handleEquipEquipment(eq)}
                        className="p-2 bg-[#8B0000] hover:bg-[#A30000] text-white rounded font-bold shadow flex items-center justify-center transition-colors"
                        title="Add Equipment"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0C0E12] border-t border-[#323846] flex items-center justify-between">
          <span className="text-[10px] text-[#8E95A5]">
            Warrior Cost: <strong className="text-[#D4AF37]">{unit?.totalCost} Ducats</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded text-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
