'use client';

import React, { useState } from 'react';
import { hasExtraLimb } from '../../rules/formulae';
import { Sheet } from '../ui/Sheet';
import { useStore } from '../../store/useStore';
import { carriesAsBattlekit, forcedBattlekit } from '../../rules/battlekit';
import { WeaponProfile, ArmourProfile, EquipmentItem } from '../../types/rules';
import { 
  Shield, 
  Swords, 
  Package, 
  Plus, 
  Search,
  AlertTriangle,
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
  const [filterLegalOnly] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const activeWarband = getActiveWarband();
  const unit = activeWarband?.units.find(u => u.id === unitId);
  const factionId = activeWarband?.factionId || 'universal';
  const unitProfileName = unit?.profileSnapshot.name || unitName;

  // Unit Type Flags
  const isHomunculus = /homunculus/i.test(unitProfileName) || /homunculus/i.test(unitName);
  const isBeast = /lion|dog|hound|beast/i.test(unitProfileName) || /lion|dog|hound/i.test(unitName);
  const isHeavyConstruct = /brazen|golem|mamluk|mechanized/i.test(unitProfileName);

  // Equipment arrays
  const currentWeapons = unit?.equippedWeapons || [];
  const currentArmour = unit?.equippedArmour || [];

  // Check special traits: STRONG and Extra Limbs (3rd Arm / Homunculus)
  const isStrong = Boolean(
    unit?.profileSnapshot.innateAbilities?.some(a => /strong|bulky|large|ogre/i.test(a.name) || /strong/i.test(a.description)) ||
    unit?.specialUpgrades?.some(u => /strong/i.test(u.name)) ||
    unit?.skills?.some(s => /strong/i.test(s.name))
  );

  /*
    Derived from the Formula, not from a name that reads like one.

    This was `/third arm|extra arm|limb/i` over the same lists — and the real
    Formula, `Additional Arm`, matches none of those three alternatives. So a
    model that had bought the entry the catalogue prints was refused its third
    weapon, while a model carrying `Third Arm (Extra Limb)` — from a
    hand-written list that appears in no book — was allowed it.

    It also never looked at `equippedEquipment`, which is where an imported
    roster's Formulae actually land.
  */
  const hasExtraArm = hasExtraLimb(unit);

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

  /*
    Gear the model already has.

    The catalogue forces Standard Armour, a Gas Mask and a Medi-kit onto a
    Combat Medic and then hides those Armoury rows from it, because a model
    cannot buy what it is already wearing. The app carried neither half of
    that, so it would sell a Medic a second 5-Ducat Gas Mask.

    Hidden rather than greyed out: the list is what a player can spend on, and
    a row they can never take is noise at a table. The kit itself is shown on
    the model's own card, where it belongs.
  */
  const kit = forcedBattlekit(unit?.profileSnapshot);
  const alreadyCarried = <T extends { id?: string; name: string }>(item: T) =>
    carriesAsBattlekit(unit?.profileSnapshot, item);

  // Filtering Weapons
  let displayedWeapons = (filterLegalOnly ? weapons.filter(isWeaponLegal) : weapons)
    .filter((w) => !alreadyCarried(w));
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
  let displayedArmour = (filterLegalOnly ? armour.filter(isArmourLegal) : armour)
    .filter((a) => !alreadyCarried(a));

  // Filtering Equipment
  let displayedEquipment = (filterLegalOnly ? equipment.filter(isEquipmentLegal) : equipment)
    .filter((e) => !alreadyCarried(e));
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
    // Was `displayedArmour.filter(...)` with the result thrown away, so typing
    // in the search box filtered weapons and equipment but never armour.
    displayedArmour = displayedArmour.filter(a => a.name.toLowerCase().includes(sQuery) || (a.description || '').toLowerCase().includes(sQuery));
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
    <Sheet
      open
      onClose={onClose}
      size="xl"
      title={<>EQUIP WARRIOR: <span className="text-theme-primary">{unitName}</span></>}
      label="Equip warrior"
      footer={<div className="flex items-center justify-between w-full gap-3">
            <span>
              {tab === 'weapons' ? `${displayedWeapons.length} weapons available` : tab === 'armour' ? `${displayedArmour.length} armour/shields available` : `${displayedEquipment.length} gear items & formulae available`}
            </span>
            <button
              onClick={onClose}
              className="px-5 py-1.5 bg-theme-elevated hover:bg-theme-border text-theme-text rounded uppercase font-bold text-xs border border-theme-border"
            >
              Done
            </button>
      </div>}
    >

        {/*
          What the model is already wearing.

          Shown because the rows for these are deliberately absent from the
          lists below, and a player looking for the Gas Mask they know the
          Armoury stocks needs to be told why it is not there.
        */}
        {kit.length > 0 && (
          <div className="px-4 py-2 bg-theme-base border-b border-theme-border flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs flex-shrink-0">
            <span className="font-bold uppercase text-theme-muted tracking-wide">Battlekit:</span>
            <span className="text-theme-text">
              a {unitProfileName} always has{' '}
              {kit.map((b) => b.name).join(', ')}.
            </span>
            <span className="text-theme-muted">Already carried, so not listed below.</span>
          </div>
        )}

        {/* Loadout Status & Hand Limits Banner */}
        <div className="px-4 py-2 bg-theme-elevated border-b border-theme-border flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-theme-muted">
              Melee Hands: <strong className={`font-bold ${isOverMeleeHands ? 'text-status-error' : 'text-theme-text'}`}>{meleeHandsUsed} / {maxMeleeHands}</strong>
            </span>
            <span>•</span>
            <span className="text-theme-muted">
              Ranged Hands: <strong className={`font-bold ${isOverRangedHands ? 'text-status-error' : 'text-theme-text'}`}>{rangedHandsUsed} / {maxRangedHands}</strong>
            </span>
            <span>•</span>
            <span className="text-theme-muted">
              Armour Slots: <strong className={`font-bold ${isOverArmourLimit ? 'text-status-error' : 'text-theme-text'}`}>{currentArmour.length} / 1</strong>
            </span>
            {isStrong && (
              <span className="text-xs sm:text-[10px] px-1.5 py-0.2 rounded bg-theme-primary text-theme-base font-bold uppercase">
                STRONG (2H Melee = 1H)
              </span>
            )}
            {hasExtraArm && (
              <span className="text-xs sm:text-[10px] px-1.5 py-0.2 rounded bg-status-legal text-white font-bold uppercase">
                3rd Arm (+1 Hand Capacity)
              </span>
            )}
          </div>

          {(isOverMeleeHands || isOverRangedHands) && (
            <span className="text-xs sm:text-[11px] text-status-error flex items-center space-x-1 font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {isOverMeleeHands ? `Exceeds Melee Hands (${meleeHandsUsed}/${maxMeleeHands})` : `Exceeds Ranged Hands (${rangedHandsUsed}/${maxRangedHands})`}
              </span>
            </span>
          )}
        </div>

        {/* Fixed Main Category Tabs: Large, Prominent, Clear */}
        <div className="flex border-b border-theme-border bg-theme-base px-4 pt-2.5 gap-2 flex-shrink-0">
          <button
            onClick={() => setTab('weapons')}
            className={`px-5 py-2.5 font-bold uppercase flex items-center space-x-2 transition-all text-xs rounded-t ${
              tab === 'weapons'
                ? 'bg-theme-elevated text-theme-primary border-t-2 border-x border-theme-border border-t-theme-primary'
                : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface'
            }`}
          >
            <Swords className="w-4 h-4 text-theme-primary" />
            <span>WEAPONS ({displayedWeapons.length})</span>
          </button>

          <button
            onClick={() => setTab('armour')}
            className={`px-5 py-2.5 font-bold uppercase flex items-center space-x-2 transition-all text-xs rounded-t ${
              tab === 'armour'
                ? 'bg-theme-elevated text-theme-primary border-t-2 border-x border-theme-border border-t-theme-primary'
                : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface'
            }`}
          >
            <Shield className="w-4 h-4 text-theme-primary" />
            <span>ARMOUR & SHIELDS ({displayedArmour.length})</span>
          </button>

          <button
            onClick={() => setTab('equipment')}
            className={`px-5 py-2.5 font-bold uppercase flex items-center space-x-2 transition-all text-xs rounded-t ${
              tab === 'equipment'
                ? 'bg-theme-elevated text-theme-primary border-t-2 border-x border-theme-border border-t-theme-primary'
                : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface'
            }`}
          >
            <Package className="w-4 h-4 text-theme-primary" />
            <span>GEAR & FORMULAE ({displayedEquipment.length})</span>
          </button>
        </div>

        {/* Fixed Sub-Category Filter & Search Toolbar */}
        <div className="p-3 bg-theme-surface border-b border-theme-border flex flex-col sm:flex-row items-center justify-between gap-2 flex-shrink-0">
          
          {/* Sub-Category Pills for Weapons */}
          {tab === 'weapons' && (
            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setWeaponSubCategory('all')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-xs sm:text-[10px] transition-colors ${
                  weaponSubCategory === 'all' ? 'bg-theme-primary text-theme-base font-extrabold' : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setWeaponSubCategory('melee')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-xs sm:text-[10px] transition-colors ${
                  weaponSubCategory === 'melee' ? 'bg-theme-primary text-theme-base font-extrabold' : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
                }`}
              >
                ⚔️ Melee
              </button>
              <button
                onClick={() => setWeaponSubCategory('ranged')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-xs sm:text-[10px] transition-colors ${
                  weaponSubCategory === 'ranged' ? 'bg-theme-primary text-theme-base font-extrabold' : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
                }`}
              >
                🎯 Ranged
              </button>
              <button
                onClick={() => setWeaponSubCategory('shield')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-xs sm:text-[10px] transition-colors ${
                  weaponSubCategory === 'shield' ? 'bg-theme-primary text-theme-base font-extrabold' : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
                }`}
              >
                🛡️ Utility / Shields
              </button>
              <button
                onClick={() => setWeaponSubCategory('grenade')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-xs sm:text-[10px] transition-colors ${
                  weaponSubCategory === 'grenade' ? 'bg-theme-primary text-theme-base font-extrabold' : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
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
                className={`px-2.5 py-1 rounded font-bold uppercase text-xs sm:text-[10px] transition-colors ${
                  equipmentSubCategory === 'all' ? 'bg-theme-primary text-theme-base font-extrabold' : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setEquipmentSubCategory('formulae')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-xs sm:text-[10px] transition-colors flex items-center space-x-1 ${
                  equipmentSubCategory === 'formulae' ? 'bg-theme-primary text-theme-base font-extrabold' : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
                }`}
              >
                <FlaskConical className="w-3 h-3 text-status-error" />
                <span>🧪 Formulae & Elixirs</span>
              </button>
              <button
                onClick={() => setEquipmentSubCategory('headgear')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-xs sm:text-[10px] transition-colors ${
                  equipmentSubCategory === 'headgear' ? 'bg-theme-primary text-theme-base font-extrabold' : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
                }`}
              >
                🪖 Headgear
              </button>
              <button
                onClick={() => setEquipmentSubCategory('relic')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-xs sm:text-[10px] transition-colors ${
                  equipmentSubCategory === 'relic' ? 'bg-theme-primary text-theme-base font-extrabold' : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
                }`}
              >
                ✨ Relics & Icons
              </button>
              <button
                onClick={() => setEquipmentSubCategory('gear')}
                className={`px-2.5 py-1 rounded font-bold uppercase text-xs sm:text-[10px] transition-colors ${
                  equipmentSubCategory === 'gear' ? 'bg-theme-primary text-theme-base font-extrabold' : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
                }`}
              >
                🎒 Gear & Ammo
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-theme-muted" />
            <input
              type="text"
              placeholder="Search by name or keyword..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded pl-8 pr-2.5 py-1.5 text-xs text-theme-text focus:outline-none focus:border-theme-primary"
            />
          </div>
        </div>

        {/* Scrollable List Body */}
          
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
                        ? 'bg-theme-base border-theme-border hover:border-theme-primary'
                        : 'bg-theme-base/50 border-theme-accent/40 opacity-70'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-xs text-theme-text block">{w.name}</strong>
                          <span className="text-xs sm:text-[10px] text-theme-muted block">
                            {w.type} • {w.hands || 1}H • Range: {w.range}
                          </span>
                        </div>
                        <span className="font-bold text-xs text-theme-primary px-2 py-0.5 rounded bg-theme-surface border border-theme-border flex-shrink-0">
                          {w.cost > 0 || !w.gloryCost ? `${w.cost} D` : ''}
                          {w.gloryCost ? `${w.cost > 0 ? ' + ' : ''}${w.gloryCost} Glory` : ''}
                        </span>
                      </div>

                      {w.description && (
                        <p className="text-xs sm:text-[11px] text-theme-muted italic leading-relaxed pt-0.5">
                          {w.description}
                        </p>
                      )}

                      {w.keywords && w.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {w.keywords.map((kw, kwIdx) => (
                            <span key={kwIdx} className="text-xs sm:text-[9px] px-1.5 py-0.2 rounded bg-theme-elevated text-theme-text border border-theme-border">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-theme-border/60 flex items-center justify-between">
                      <span className="text-xs sm:text-[10px] text-theme-muted">
                        Mod: <strong className="text-theme-text">{typeof w.modifiers === 'string' ? w.modifiers : '-'}</strong>
                      </span>
                      <button
                        onClick={() => handleEquipWeapon(w)}
                        className="px-3 py-1 bg-theme-elevated hover:bg-theme-primary hover:text-theme-base text-theme-text border border-theme-border rounded text-xs sm:text-[11px] font-bold uppercase transition-colors flex items-center space-x-1"
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
                        ? 'bg-theme-base border-theme-border hover:border-theme-primary'
                        : 'bg-theme-base/50 border-theme-accent/40 opacity-70'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <strong className="text-xs text-theme-text block">{a.name}</strong>
                            {isShield && (
                              <span className="text-xs sm:text-[9px] px-1.5 py-0.2 rounded bg-status-legal text-white font-bold uppercase">
                                Shield
                              </span>
                            )}
                          </div>
                          <span className="text-xs sm:text-[10px] text-theme-muted block">
                            Type: {a.category || 'Standard'} • Mod: {a.armourModifier || a.modifier || '-'}
                          </span>
                        </div>
                        <span className="font-bold text-xs text-theme-primary px-2 py-0.5 rounded bg-theme-surface border border-theme-border flex-shrink-0">
                          {a.cost > 0 || !a.gloryCost ? `${a.cost} D` : ''}
                          {a.gloryCost ? `${a.cost > 0 ? ' + ' : ''}${a.gloryCost} Glory` : ''}
                        </span>
                      </div>

                      {a.description && (
                        <p className="text-xs sm:text-[11px] text-theme-muted italic leading-relaxed pt-0.5">
                          {a.description}
                        </p>
                      )}

                      {!legal && isHomunculus && (
                        <span className="text-xs sm:text-[10px] text-status-error block font-bold">
                          ⚠️ Homunculus restriction: Shields only. Body armour prohibited.
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-theme-border/60 flex items-center justify-between">
                      <span className="text-xs sm:text-[10px] text-theme-muted">
                        Save Mod: <strong className="text-theme-primary">{a.armourModifier || a.modifier || '-'}</strong>
                      </span>
                      <button
                        onClick={() => handleEquipArmour(a)}
                        className="px-3 py-1 bg-theme-elevated hover:bg-theme-primary hover:text-theme-base text-theme-text border border-theme-border rounded text-xs sm:text-[11px] font-bold uppercase transition-colors flex items-center space-x-1"
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
                        ? 'bg-theme-surface border-theme-primary/50 ring-1 ring-theme-primary/20 hover:border-theme-primary'
                        : legal
                        ? 'bg-theme-base border-theme-border hover:border-theme-primary'
                        : 'bg-theme-base/50 border-theme-accent/40 opacity-70'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <strong className={`text-xs block ${isFormula ? 'text-theme-primary' : 'text-theme-text'}`}>
                              {e.name}
                            </strong>
                            {isFormula && (
                              <span className="text-xs sm:text-[9px] px-1.5 py-0.2 rounded bg-theme-accent text-white font-bold uppercase">
                                Formula
                              </span>
                            )}
                          </div>
                          <span className="text-xs sm:text-[10px] text-theme-muted block">
                            Faction: {e.factionId || 'Universal'}
                          </span>
                        </div>
                        <span className="font-bold text-xs text-theme-primary px-2 py-0.5 rounded bg-theme-surface border border-theme-border flex-shrink-0">
                          {e.cost > 0 || !e.gloryCost ? `${e.cost} D` : ''}
                          {e.gloryCost ? `${e.cost > 0 ? ' + ' : ''}${e.gloryCost} Glory` : ''}
                        </span>
                      </div>

                      {e.effect && (
                        <p className="text-xs sm:text-[11px] text-theme-text leading-relaxed pt-0.5">
                          {e.effect}
                        </p>
                      )}

                      {e.keywords && e.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {e.keywords.map((kw, kwIdx) => (
                            <span key={kwIdx} className="text-xs sm:text-[9px] px-1.5 py-0.2 rounded bg-theme-elevated text-theme-text border border-theme-border">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-theme-border/60 flex items-center justify-between">
                      <span className="text-xs sm:text-[10px] text-theme-muted">
                        {isFormula ? 'Alchemical Infusion' : 'Gear / Relic'}
                      </span>
                      <button
                        onClick={() => handleEquipEquipment(e)}
                        className={`px-3 py-1 rounded text-xs sm:text-[11px] font-bold uppercase transition-colors flex items-center space-x-1 ${
                          isFormula
                            ? 'bg-theme-accent hover:bg-status-error text-white'
                            : 'bg-theme-elevated hover:bg-theme-primary hover:text-theme-base text-theme-text border border-theme-border'
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

    </Sheet>
  );
};
