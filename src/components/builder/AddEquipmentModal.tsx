'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { WeaponProfile, ArmourProfile, EquipmentItem } from '../../types/rules';
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
  AlertTriangle,
  Zap
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
  const [weaponSubCategory, setWeaponSubCategory] = useState<'all' | 'melee' | 'ranged' | 'shield' | 'grenade'>('all');
  const [equipmentSubCategory, setEquipmentSubCategory] = useState<'all' | 'headgear' | 'relic' | 'gear'>('all');
  const [filterLegalOnly, setFilterLegalOnly] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const activeWarband = getActiveWarband();
  const unit = activeWarband?.units.find(u => u.id === unitId);
  const factionId = activeWarband?.factionId || 'universal';
  const unitProfileName = unit?.profileSnapshot.name || unitName;

  // Equipment arrays
  const currentWeapons = unit?.equippedWeapons || [];
  const currentArmour = unit?.equippedArmour || [];
  const currentEquipment = unit?.equippedEquipment || [];

  // Check special traits: STRONG and Extra Limbs (3rd Arm / Homunculus)
  const isStrong = Boolean(
    unit?.profileSnapshot.innateAbilities?.some(a => /strong|bulky|large|ogre/i.test(a.name) || /strong/i.test(a.description)) ||
    unit?.specialUpgrades?.some(u => /strong/i.test(u.name)) ||
    unit?.skills?.some(s => /strong/i.test(s.name))
  );

  const hasExtraArm = Boolean(
    unit?.profileSnapshot.innateAbilities?.some(a => /third arm|extra arm|extra limb|four arm/i.test(a.name) || /third arm/i.test(a.description)) ||
    unit?.specialUpgrades?.some(u => /third arm|extra arm|limb/i.test(u.name)) ||
    unit?.skills?.some(s => /extra arm/i.test(s.name))
  );

  const maxMeleeHands = hasExtraArm ? 3 : 2;
  const maxRangedHands = hasExtraArm ? 3 : 2;

  // Melee hands calculation: 2H weapons count as 1H if model has STRONG
  const meleeWeapons = currentWeapons.filter(w => w.type === 'Melee' || w.range === 'Melee' || w.range?.startsWith('Melee') || /shield|mantlet/i.test(w.name));
  const meleeHandsUsed = meleeWeapons.reduce((sum, w) => {
    const rawHands = w.hands || 1;
    const effectiveHands = (isStrong && rawHands >= 2) ? 1 : rawHands;
    return sum + effectiveHands;
  }, 0);

  // Ranged hands calculation
  const rangedWeapons = currentWeapons.filter(w => w.type === 'Ranged' || (w.range && w.range !== 'Melee' && !w.range?.startsWith('Melee') && !/shield|mantlet/i.test(w.name)));
  const rangedHandsUsed = rangedWeapons.reduce((sum, w) => sum + (w.hands || 1), 0);

  const isOverMeleeHands = meleeHandsUsed > maxMeleeHands;
  const isOverRangedHands = rangedHandsUsed > maxRangedHands;
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
    const isHeavySpecialWeapon = /titan|cannon|autocannon/i.test(w.name);
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
    displayedWeapons = displayedWeapons.filter(w => w.type === 'Ranged' || (w.range && w.range !== 'Melee' && !w.range.startsWith('Melee') && !/shield/i.test(w.name)));
  } else if (weaponSubCategory === 'melee') {
    displayedWeapons = displayedWeapons.filter(w => w.type === 'Melee' || w.range === 'Melee' || w.range?.startsWith('Melee'));
  } else if (weaponSubCategory === 'shield') {
    displayedWeapons = displayedWeapons.filter(w => /shield|mantlet|instrument|flag/i.test(w.name) || w.keywords?.includes('SHIELD'));
  } else if (weaponSubCategory === 'grenade') {
    displayedWeapons = displayedWeapons.filter(w => /grenade|bomb|molotov|dynamite|flask|pot/i.test(w.name) || w.keywords?.includes('GRENADE'));
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
  };

  const handleEquipArmour = (a: ArmourProfile) => {
    equipArmour(warbandId, unitId, a.id);
  };

  const handleEquipEquipment = (e: EquipmentItem) => {
    equipEquipment(warbandId, unitId, e.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-mono text-xs">
      <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-4xl h-[88vh] rounded-lg shadow-2xl overflow-hidden flex flex-col bevel-container">
        
        {/* Fixed Header */}
        <div className="p-4 bg-[#0C0E12] border-b border-[#323846] flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
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
              <span>{filterLegalOnly ? '✓ Faction Armoury Legal' : 'All Armoury (Override)'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-[#8E95A5] hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Fixed Loadout Status & Hand Capacity Banner */}
        <div className="bg-[#161920] px-4 py-2.5 border-b border-[#323846] flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[#8E95A5]">
              ⚔️ Melee Hands: <strong className={isOverMeleeHands ? 'text-[#E53935]' : 'text-[#D4AF37]'}>{meleeHandsUsed} / {maxMeleeHands}</strong>
            </span>
            <span>•</span>
            <span className="text-[#8E95A5]">
              🎯 Ranged Hands: <strong className={isOverRangedHands ? 'text-[#E53935]' : 'text-[#D4AF37]'}>{rangedHandsUsed} / {maxRangedHands}</strong>
            </span>
            <span>•</span>
            <span className="text-[#8E95A5]">
              🛡️ Armour: <strong className={isOverArmourLimit ? 'text-[#E53935]' : 'text-[#ECEFF4]'}>{currentArmour.length} / 1</strong>
            </span>
            {isStrong && (
              <span className="px-1.5 py-0.2 rounded bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-bold">
                STRONG (2H as 1H)
              </span>
            )}
            {hasExtraArm && (
              <span className="px-1.5 py-0.2 rounded bg-[#7C4DFF]/20 border border-[#7C4DFF]/40 text-[#7C4DFF] text-[10px] font-bold">
                3rd Arm (+1 Hand)
              </span>
            )}
          </div>

          {(isOverMeleeHands || isOverRangedHands) && (
            <span className="px-2 py-0.5 rounded bg-[#8B0000]/40 border border-[#8B0000] text-[#E53935] font-bold text-[10px] flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3" />
              <span>
                {isOverMeleeHands ? `Exceeds Melee Hands (${meleeHandsUsed}/${maxMeleeHands})` : `Exceeds Ranged Hands (${rangedHandsUsed}/${maxRangedHands})`}
              </span>
            </span>
          )}
        </div>

        {/* Fixed Main Category Tabs: Large, Prominent, Clear */}
        <div className="flex border-b border-[#323846] bg-[#0C0E12] px-4 pt-2.5 gap-2 flex-shrink-0">
          <button
            onClick={() => setTab('weapons')}
            className={`px-5 py-2.5 font-bold uppercase flex items-center space-x-2 transition-all text-xs rounded-t ${
              tab === 'weapons'
                ? 'bg-[#20242E] text-[#D4AF37] border-t-2 border-x border-[#323846] border-t-[#D4AF37]'
                : 'text-[#8E95A5] hover:text-[#ECEFF4] hover:bg-[#161920]'
            }`}
          >
            <Swords className="w-4 h-4 text-[#D4AF37]" />
            <span>WEAPONS ({displayedWeapons.length})</span>
          </button>

          <button
            onClick={() => setTab('armour')}
            className={`px-5 py-2.5 font-bold uppercase flex items-center space-x-2 transition-all text-xs rounded-t ${
              tab === 'armour'
                ? 'bg-[#20242E] text-[#D4AF37] border-t-2 border-x border-[#323846] border-t-[#D4AF37]'
                : 'text-[#8E95A5] hover:text-[#ECEFF4] hover:bg-[#161920]'
            }`}
          >
            <Shield className="w-4 h-4 text-[#D4AF37]" />
            <span>ARMOUR & SHIELDS ({displayedArmour.length})</span>
          </button>

          <button
            onClick={() => setTab('equipment')}
            className={`px-5 py-2.5 font-bold uppercase flex items-center space-x-2 transition-all text-xs rounded-t ${
              tab === 'equipment'
                ? 'bg-[#20242E] text-[#D4AF37] border-t-2 border-x border-[#323846] border-t-[#D4AF37]'
                : 'text-[#8E95A5] hover:text-[#ECEFF4] hover:bg-[#161920]'
            }`}
          >
            <Package className="w-4 h-4 text-[#D4AF37]" />
            <span>GEAR & RELICS ({displayedEquipment.length})</span>
          </button>
        </div>

        {/* Fixed Sub-Category Filter & Search Toolbar */}
        <div className="p-3 bg-[#161920] border-b border-[#323846] flex flex-col sm:flex-row items-center justify-between gap-2 flex-shrink-0">
          
          {/* Sub-Category Pills for Weapons */}
          {tab === 'weapons' && (
            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setWeaponSubCategory('all')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-[10px] transition-colors ${
                  weaponSubCategory === 'all' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-[#20242E] text-[#8E95A5] hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setWeaponSubCategory('melee')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-[10px] transition-colors ${
                  weaponSubCategory === 'melee' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-[#20242E] text-[#8E95A5] hover:text-white'
                }`}
              >
                ⚔️ Melee
              </button>
              <button
                onClick={() => setWeaponSubCategory('ranged')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-[10px] transition-colors ${
                  weaponSubCategory === 'ranged' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-[#20242E] text-[#8E95A5] hover:text-white'
                }`}
              >
                🎯 Ranged
              </button>
              <button
                onClick={() => setWeaponSubCategory('shield')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-[10px] transition-colors ${
                  weaponSubCategory === 'shield' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-[#20242E] text-[#8E95A5] hover:text-white'
                }`}
              >
                🛡️ Utility / Shields
              </button>
              <button
                onClick={() => setWeaponSubCategory('grenade')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-[10px] transition-colors ${
                  weaponSubCategory === 'grenade' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-[#20242E] text-[#8E95A5] hover:text-white'
                }`}
              >
                💣 Grenades
              </button>
            </div>
          )}

          {/* Sub-Category Pills for Equipment */}
          {tab === 'equipment' && (
            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setEquipmentSubCategory('all')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-[10px] transition-colors ${
                  equipmentSubCategory === 'all' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-[#20242E] text-[#8E95A5] hover:text-white'
                }`}
              >
                All Gear
              </button>
              <button
                onClick={() => setEquipmentSubCategory('headgear')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-[10px] transition-colors ${
                  equipmentSubCategory === 'headgear' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-[#20242E] text-[#8E95A5] hover:text-white'
                }`}
              >
                🪖 Headgear
              </button>
              <button
                onClick={() => setEquipmentSubCategory('relic')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-[10px] transition-colors ${
                  equipmentSubCategory === 'relic' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-[#20242E] text-[#8E95A5] hover:text-white'
                }`}
              >
                ✨ Relics & Elixirs
              </button>
              <button
                onClick={() => setEquipmentSubCategory('gear')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-[10px] transition-colors ${
                  equipmentSubCategory === 'gear' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-[#20242E] text-[#8E95A5] hover:text-white'
                }`}
              >
                🎒 Battlefield Gear
              </button>
            </div>
          )}

          {tab === 'armour' && <div className="text-xs text-[#8E95A5]">Official Body Armour & Machine Protection</div>}

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#8E95A5] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search gear..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-[#0C0E12] border border-[#323846] rounded pl-8 pr-2.5 py-1 text-xs text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {/* Scrollable Items List Body */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 bg-[#0C0E12]">
          
          {/* TAB 1: WEAPONS */}
          {tab === 'weapons' && (
            displayedWeapons.length === 0 ? (
              <p className="text-[#8E95A5] italic text-center py-12">No weapons found matching the filter criteria.</p>
            ) : (
              displayedWeapons.map((wep) => (
                <div
                  key={wep.id}
                  className="p-3 bg-[#161920] border border-[#323846] rounded-md hover:border-[#D4AF37]/70 transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-gothic font-bold text-sm text-[#ECEFF4] truncate">{wep.name}</h4>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#20242E] text-[#8E95A5]">
                        {wep.type} • {wep.range}
                      </span>
                      {wep.hands && wep.hands > 1 && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#8B0000]/30 text-[#E53935] font-bold">
                          {wep.hands}-HANDED
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-mono text-[#8E95A5] flex items-center space-x-3">
                      <span>Mod: <strong className="text-[#ECEFF4]">{wep.modifiers}</strong></span>
                      <span>•</span>
                      <span>Dmg: <strong className="text-[#ECEFF4]">{wep.damage}</strong></span>
                    </div>

                    {wep.keywords && wep.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {wep.keywords.map((kw, i) => (
                          <span key={i} className="text-[9px] font-mono px-1 py-0.1 rounded bg-[#0C0E12] border border-[#323846] text-[#D4AF37]">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <span className="font-mono font-bold text-sm text-[#D4AF37]">{wep.cost} D</span>
                    <button
                      onClick={() => handleEquipWeapon(wep)}
                      className="p-2 bg-[#8B0000] hover:bg-[#A30000] text-white rounded transition-colors"
                      title="Equip Weapon"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {/* TAB 2: ARMOUR */}
          {tab === 'armour' && (
            displayedArmour.length === 0 ? (
              <p className="text-[#8E95A5] italic text-center py-12">No armour found matching criteria.</p>
            ) : (
              displayedArmour.map((arm) => (
                <div
                  key={arm.id}
                  className="p-3 bg-[#161920] border border-[#323846] rounded-md hover:border-[#D4AF37]/70 transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-gothic font-bold text-sm text-[#ECEFF4] truncate">{arm.name}</h4>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#20242E] text-[#D4AF37] font-bold">
                        {arm.armourModifier || arm.modifier}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8E95A5] leading-relaxed">{arm.description}</p>
                  </div>

                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <span className="font-mono font-bold text-sm text-[#D4AF37]">{arm.cost} D</span>
                    <button
                      onClick={() => handleEquipArmour(arm)}
                      className="p-2 bg-[#8B0000] hover:bg-[#A30000] text-white rounded transition-colors"
                      title="Equip Armour"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {/* TAB 3: EQUIPMENT & RELICS */}
          {tab === 'equipment' && (
            displayedEquipment.length === 0 ? (
              <p className="text-[#8E95A5] italic text-center py-12">No equipment or relics found matching criteria.</p>
            ) : (
              displayedEquipment.map((eq) => (
                <div
                  key={eq.id}
                  className="p-3 bg-[#161920] border border-[#323846] rounded-md hover:border-[#D4AF37]/70 transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="font-gothic font-bold text-sm text-[#ECEFF4] truncate">{eq.name}</h4>
                    <p className="text-[11px] text-[#8E95A5] leading-relaxed">{eq.effect || eq.description}</p>
                  </div>

                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <span className="font-mono font-bold text-sm text-[#D4AF37]">{eq.cost} D</span>
                    <button
                      onClick={() => handleEquipEquipment(eq)}
                      className="p-2 bg-[#8B0000] hover:bg-[#A30000] text-white rounded transition-colors"
                      title="Equip Item"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )
          )}

        </div>

        {/* Fixed Footer */}
        <div className="p-3 bg-[#161920] border-t border-[#323846] flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-[#8E95A5]">
            Warrior Cost: <strong className="text-[#D4AF37] font-mono">{unit?.totalCost || 0} Ducats</strong>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded text-xs shadow transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
