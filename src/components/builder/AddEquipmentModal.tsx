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
  Zap,
  FlaskConical
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
  const [equipmentSubCategory, setEquipmentSubCategory] = useState<'all' | 'formulae' | 'headgear' | 'relic' | 'gear'>('all');
  const [filterLegalOnly, setFilterLegalOnly] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const activeWarband = getActiveWarband();
  const unit = activeWarband?.units.find(u => u.id === unitId);
  const factionId = activeWarband?.factionId || 'universal';
  const unitProfileName = unit?.profileSnapshot.name || unitName;

  // Unit Type Flags
  const isHomunculus = /homunculus/i.test(unitProfileName) || /homunculus/i.test(unitName);
  const isAlchemist = /alchemist|kasim|zayd/i.test(unitProfileName) || /alchemist/i.test(unitName);
  const isBeast = /lion|dog|hound|beast/i.test(unitProfileName) || /lion|dog|hound/i.test(unitName);
  const isHeavyConstruct = /brazen|golem|mamluk|mechanized/i.test(unitProfileName);

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
    if (isBeast) return false;

    // Homunculus rules: Melee weapons & Shields only; no heavy 2H firearms or heavy weaponry
    if (isHomunculus) {
      if (w.type === 'Ranged' && (w.hands === 2 || /cannon|mortar|mg|heavy|sniper|anti-materiel|flamethrower/i.test(w.name))) {
        return false;
      }
    }

    // Explicit Allowed Units check
    if (w.allowedUnits && w.allowedUnits.length > 0) {
      return w.allowedUnits.some(uName => 
        unitProfileName.toLowerCase().includes(uName.toLowerCase()) ||
        unitName.toLowerCase().includes(uName.toLowerCase())
      );
    }

    // Heavy Construct restrictions (e.g. Titan weapons, flame cannons)
    const isHeavySpecialWeapon = /titan|cannon|autocannon/i.test(w.name);
    if (isHeavySpecialWeapon && !isHeavyConstruct) {
      return false;
    }

    // Faction restriction
    if (w.allowedFactions && w.allowedFactions.length > 0) {
      if (!w.allowedFactions.includes(factionId)) return false;
    } else if (w.factionId && w.factionId !== 'universal' && w.factionId !== factionId) {
      return false;
    }

    return true;
  };

  // Accurate Legality Filter for Armour
  const isArmourLegal = (a: ArmourProfile) => {
    if (isBeast) return false;

    // HOMUNCULUS RULE: Homunculi cannot wear body armour; they may ONLY carry Shields!
    if (isHomunculus) {
      const isShield = a.category === 'Shield' || /shield|pavise|mantlet/i.test(a.name) || Boolean(a.keywords?.includes('SHIELD'));
      return isShield;
    }

    if (a.allowedUnits && a.allowedUnits.length > 0) {
      return a.allowedUnits.some(uName => 
        unitProfileName.toLowerCase().includes(uName.toLowerCase()) ||
        unitName.toLowerCase().includes(uName.toLowerCase())
      );
    }

    // Machine Armour only on heavy constructs
    if (a.id === 'arm-machine' || a.name.includes('Machine Armour')) {
      return isHeavyConstruct;
    }

    if (a.allowedFactions && a.allowedFactions.length > 0) {
      if (!a.allowedFactions.includes(factionId)) return false;
    } else if (a.factionId && a.factionId !== 'universal' && a.factionId !== factionId) {
      return false;
    }

    return true;
  };

  // Accurate Legality Filter for Equipment, Relics & Formulae
  const isEquipmentLegal = (e: EquipmentItem) => {
    if (isBeast) return false;

    // HOMUNCULUS RULE: Full access to Alchemical Formulae and Elixirs!
    const isFormula = e.category === 'Formula' || /formula|elixir|salve|phial|alkahest|vitriol|brimstone|cinnabar/i.test(e.name) || Boolean(e.keywords?.includes('FORMULA')) || Boolean(e.keywords?.includes('ELIXIR'));
    if (isHomunculus && isFormula) {
      return true;
    }

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
  if (equipmentSubCategory === 'formulae') {
    displayedEquipment = displayedEquipment.filter(e => 
      e.category === 'Formula' || 
      /formula|elixir|salve|phial|alkahest|vitriol|brimstone|cinnabar/i.test(e.name) || 
      e.keywords?.includes('FORMULA') || 
      e.keywords?.includes('ELIXIR')
    );
  } else if (equipmentSubCategory === 'headgear') {
    displayedEquipment = displayedEquipment.filter(e => /helmet|gas mask|mask|goggles|hood|crown/i.test(e.name));
  } else if (equipmentSubCategory === 'relic') {
    displayedEquipment = displayedEquipment.filter(e => /relic|amulet|icon|tome|scripture|chalice|shrine|cross/i.test(e.name));
  } else if (equipmentSubCategory === 'gear') {
    displayedEquipment = displayedEquipment.filter(e => !/helmet|gas mask|formula|elixir|salve|phial/i.test(e.name));
  }

  // Search filter
  const sQuery = searchFilter.toLowerCase().trim();
  if (sQuery) {
    displayedWeapons = displayedWeapons.filter(w => w.name.toLowerCase().includes(sQuery) || (w.description || '').toLowerCase().includes(sQuery));
    displayedArmour.filter(a => a.name.toLowerCase().includes(sQuery) || (a.description || '').toLowerCase().includes(sQuery));
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
              {isHomunculus && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#8B0000] text-white font-bold uppercase">
                  🧪 Homunculus (Shields & Formulae Only)
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-[#8E95A5]">
              Base Profile: <strong className="text-[#ECEFF4]">{unitProfileName}</strong> ({factionId})
            </p>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={() => setFilterLegalOnly(!filterLegalOnly)}
              className={`px-3 py-1.5 rounded font-mono text-xs font-bold uppercase flex items-center space-x-1.5 border transition-all ${
                filterLegalOnly
                  ? 'bg-[#20242E] text-[#D4AF37] border-[#D4AF37]'
                  : 'bg-[#0C0E12] text-[#8E95A5] border-[#323846]'
              }`}
              title="Toggle filter to only show legal wargear per official faction rules"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{filterLegalOnly ? 'Legal Gear Only' : 'All Armouries'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#8E95A5] hover:text-white rounded bg-[#20242E] hover:bg-[#323846] border border-[#323846]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loadout Status & Hand Limits Banner */}
        <div className="px-4 py-2 bg-[#20242E] border-b border-[#323846] flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[#8E95A5]">
              Melee Hands: <strong className={`font-bold ${isOverMeleeHands ? 'text-[#E53935]' : 'text-[#ECEFF4]'}`}>{meleeHandsUsed} / {maxMeleeHands}</strong>
            </span>
            <span>•</span>
            <span className="text-[#8E95A5]">
              Ranged Hands: <strong className={`font-bold ${isOverRangedHands ? 'text-[#E53935]' : 'text-[#ECEFF4]'}`}>{rangedHandsUsed} / {maxRangedHands}</strong>
            </span>
            <span>•</span>
            <span className="text-[#8E95A5]">
              Armour Slots: <strong className={`font-bold ${isOverArmourLimit ? 'text-[#E53935]' : 'text-[#ECEFF4]'}`}>{currentArmour.length} / 1</strong>
            </span>
            {isStrong && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#D4AF37] text-black font-bold uppercase">
                STRONG (2H Melee = 1H)
              </span>
            )}
            {hasExtraArm && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#4E9A6E] text-white font-bold uppercase">
                3rd Arm (+1 Hand Capacity)
              </span>
            )}
          </div>

          {(isOverMeleeHands || isOverRangedHands) && (
            <span className="text-[11px] text-[#E53935] flex items-center space-x-1 font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
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
            <span>GEAR & FORMULAE ({displayedEquipment.length})</span>
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
                All
              </button>
              <button
                onClick={() => setEquipmentSubCategory('formulae')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-[10px] transition-colors flex items-center space-x-1 ${
                  equipmentSubCategory === 'formulae' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-[#20242E] text-[#8E95A5] hover:text-white'
                }`}
              >
                <FlaskConical className="w-3 h-3 text-[#E53935]" />
                <span>🧪 Formulae & Elixirs</span>
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
                ✨ Relics & Icons
              </button>
              <button
                onClick={() => setEquipmentSubCategory('gear')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-[10px] transition-colors ${
                  equipmentSubCategory === 'gear' ? 'bg-[#D4AF37] text-black font-extrabold' : 'bg-[#20242E] text-[#8E95A5] hover:text-white'
                }`}
              >
                🎒 Gear & Ammo
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#8E95A5]" />
            <input
              type="text"
              placeholder="Search by name or keyword..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-[#0C0E12] border border-[#323846] rounded pl-8 pr-2.5 py-1.5 text-xs text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {/* Scrollable List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          
          {/* WEAPONS LIST */}
          {tab === 'weapons' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayedWeapons.map((w) => {
                const legal = isWeaponLegal(w);
                return (
                  <div
                    key={w.id}
                    className={`p-3 rounded border flex flex-col justify-between space-y-2 transition-all ${
                      legal
                        ? 'bg-[#0C0E12] border-[#323846] hover:border-[#D4AF37]'
                        : 'bg-[#0C0E12]/50 border-[#8B0000]/40 opacity-70'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-xs text-[#ECEFF4] block">{w.name}</strong>
                          <span className="text-[10px] text-[#8E95A5] block">
                            {w.type} • {w.hands || 1}H • Range: {w.range}
                          </span>
                        </div>
                        <span className="font-bold text-xs text-[#D4AF37] px-2 py-0.5 rounded bg-[#161920] border border-[#323846] flex-shrink-0">
                          {w.cost} D
                        </span>
                      </div>

                      {w.description && (
                        <p className="text-[11px] text-[#8E95A5] italic leading-relaxed pt-0.5">
                          {w.description}
                        </p>
                      )}

                      {w.keywords && w.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {w.keywords.map((kw, kwIdx) => (
                            <span key={kwIdx} className="text-[9px] px-1.5 py-0.2 rounded bg-[#20242E] text-[#ECEFF4] border border-[#323846]">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#323846]/60 flex items-center justify-between">
                      <span className="text-[10px] text-[#8E95A5]">
                        Mod: <strong className="text-[#ECEFF4]">{typeof w.modifiers === 'string' ? w.modifiers : '-'}</strong>
                      </span>
                      <button
                        onClick={() => handleEquipWeapon(w)}
                        className="px-3 py-1 bg-[#20242E] hover:bg-[#D4AF37] hover:text-black text-[#ECEFF4] border border-[#323846] rounded text-[11px] font-bold uppercase transition-colors flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Equip</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ARMOUR LIST */}
          {tab === 'armour' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayedArmour.map((a) => {
                const legal = isArmourLegal(a);
                const isShield = a.category === 'Shield' || /shield|pavise|mantlet/i.test(a.name) || Boolean(a.keywords?.includes('SHIELD'));

                return (
                  <div
                    key={a.id}
                    className={`p-3 rounded border flex flex-col justify-between space-y-2 transition-all ${
                      legal
                        ? 'bg-[#0C0E12] border-[#323846] hover:border-[#D4AF37]'
                        : 'bg-[#0C0E12]/50 border-[#8B0000]/40 opacity-70'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <strong className="text-xs text-[#ECEFF4] block">{a.name}</strong>
                            {isShield && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#4E9A6E] text-white font-bold uppercase">
                                Shield
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#8E95A5] block">
                            Type: {a.category || 'Standard'} • Mod: {a.armourModifier || a.modifier || '-'}
                          </span>
                        </div>
                        <span className="font-bold text-xs text-[#D4AF37] px-2 py-0.5 rounded bg-[#161920] border border-[#323846] flex-shrink-0">
                          {a.cost} D
                        </span>
                      </div>

                      {a.description && (
                        <p className="text-[11px] text-[#8E95A5] italic leading-relaxed pt-0.5">
                          {a.description}
                        </p>
                      )}

                      {!legal && isHomunculus && (
                        <span className="text-[10px] text-[#E53935] block font-bold">
                          ⚠️ Homunculus restriction: Shields only. Body armour prohibited.
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#323846]/60 flex items-center justify-between">
                      <span className="text-[10px] text-[#8E95A5]">
                        Save Mod: <strong className="text-[#D4AF37]">{a.armourModifier || a.modifier || '-'}</strong>
                      </span>
                      <button
                        onClick={() => handleEquipArmour(a)}
                        className="px-3 py-1 bg-[#20242E] hover:bg-[#D4AF37] hover:text-black text-[#ECEFF4] border border-[#323846] rounded text-[11px] font-bold uppercase transition-colors flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Equip</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* EQUIPMENT, RELICS & FORMULAE LIST */}
          {tab === 'equipment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayedEquipment.map((e) => {
                const isFormula = e.category === 'Formula' || /formula|elixir|salve|phial|alkahest|vitriol|brimstone|cinnabar/i.test(e.name) || Boolean(e.keywords?.includes('FORMULA')) || Boolean(e.keywords?.includes('ELIXIR'));
                const legal = isEquipmentLegal(e);

                return (
                  <div
                    key={e.id}
                    className={`p-3 rounded border flex flex-col justify-between space-y-2 transition-all ${
                      isFormula
                        ? 'bg-[#161920] border-[#D4AF37]/50 ring-1 ring-[#D4AF37]/20 hover:border-[#D4AF37]'
                        : legal
                        ? 'bg-[#0C0E12] border-[#323846] hover:border-[#D4AF37]'
                        : 'bg-[#0C0E12]/50 border-[#8B0000]/40 opacity-70'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <strong className={`text-xs block ${isFormula ? 'text-[#D4AF37]' : 'text-[#ECEFF4]'}`}>
                              {e.name}
                            </strong>
                            {isFormula && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#8B0000] text-white font-bold uppercase">
                                Formula
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#8E95A5] block">
                            Faction: {e.factionId || 'Universal'}
                          </span>
                        </div>
                        <span className="font-bold text-xs text-[#D4AF37] px-2 py-0.5 rounded bg-[#161920] border border-[#323846] flex-shrink-0">
                          {e.cost} D
                        </span>
                      </div>

                      {e.effect && (
                        <p className="text-[11px] text-[#ECEFF4] leading-relaxed pt-0.5">
                          {e.effect}
                        </p>
                      )}

                      {e.keywords && e.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {e.keywords.map((kw, kwIdx) => (
                            <span key={kwIdx} className="text-[9px] px-1.5 py-0.2 rounded bg-[#20242E] text-[#ECEFF4] border border-[#323846]">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#323846]/60 flex items-center justify-between">
                      <span className="text-[10px] text-[#8E95A5]">
                        {isFormula ? 'Alchemical Infusion' : 'Gear / Relic'}
                      </span>
                      <button
                        onClick={() => handleEquipEquipment(e)}
                        className={`px-3 py-1 rounded text-[11px] font-bold uppercase transition-colors flex items-center space-x-1 ${
                          isFormula
                            ? 'bg-[#8B0000] hover:bg-[#A30000] text-white'
                            : 'bg-[#20242E] hover:bg-[#D4AF37] hover:text-black text-[#ECEFF4] border border-[#323846]'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isFormula ? 'Infuse Formula' : 'Equip'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Fixed Footer */}
        <div className="p-3 bg-[#0C0E12] border-t border-[#323846] flex items-center justify-between text-xs text-[#8E95A5] flex-shrink-0">
          <span>
            {tab === 'weapons' ? `${displayedWeapons.length} weapons available` : tab === 'armour' ? `${displayedArmour.length} armour/shields available` : `${displayedEquipment.length} gear items & formulae available`}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] rounded uppercase font-bold text-xs border border-[#323846]"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
