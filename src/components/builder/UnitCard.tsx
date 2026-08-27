'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { ActiveUnit } from '../../types/warband';
import { UnitCategory } from '../../types/rules';
import { AddEquipmentModal } from './AddEquipmentModal';
import { UnitLoreModal } from './UnitLoreModal';
import { UnitAdvancementModal } from './UnitAdvancementModal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { soundEffects } from '../../services/soundEffects';
import { 
  Trash2, 
  Plus, 
  Swords, 
  Shield, 
  Sparkles, 
  AlertTriangle, 
  Edit3, 
  Check, 
  X,
  Copy,
  Crown,
  ChevronDown,
  ChevronUp,
  Scroll,
  Award,
  BookOpen,
  Quote,
  Flame,
  Users,
  Star,
  MoreVertical,
  Trophy
} from 'lucide-react';

interface UnitCardProps {
  unit: ActiveUnit;
  warbandId: string;
}

export const UnitCard: React.FC<UnitCardProps> = ({ unit, warbandId }) => {
  const { 
    removeUnitFromWarband, 
    duplicateUnit,
    updateUnitName, 
    updateUnitCategory,
    setUnitAsLeader,
    removeWeapon, 
    removeArmour, 
    removeEquipment,
    saveUnitAsFavourite
  } = useStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(unit.customName);
  const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
  const [isAdvancementModalOpen, setIsAdvancementModalOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isLoreModalOpen, setIsLoreModalOpen] = useState(false);
  const [isConfirmDismissOpen, setIsConfirmDismissOpen] = useState(false);
  const [expandedAbilities, setExpandedAbilities] = useState<Record<string, boolean>>({});
  const [favouriteSaved, setFavouriteSaved] = useState(false);

  const isLeader = unit.profileSnapshot.category === 'Leader';
  const hasLore = !!(unit.lore || (unit.deeds && unit.deeds.length > 0) || (unit.titles && unit.titles.length > 0));

  const handleSaveName = () => {
    updateUnitName(warbandId, unit.id, nameVal);
    setIsEditingName(false);
  };

  const handleCategorySelect = (category: UnitCategory) => {
    updateUnitCategory(warbandId, unit.id, category);
    setIsCategoryMenuOpen(false);
  };

  const handlePromoteToLeader = () => {
    setUnitAsLeader(warbandId, unit.id);
    setIsActionMenuOpen(false);
  };

  const handleSaveFavourite = () => {
    saveUnitAsFavourite(unit);
    soundEffects.playCathedralBell();
    setFavouriteSaved(true);
    setIsActionMenuOpen(false);
    setTimeout(() => setFavouriteSaved(false), 2500);
  };

  // Active titles (from titleRecords if present, or legacy titles)
  const activeTitlesList = unit.titleRecords
    ? unit.titleRecords.filter(r => r.active).map(r => r.title)
    : (unit.titles || []);

  // Full name with active titles (safely filtering out any title already contained in customName)
  const titlesToAppend = activeTitlesList.filter(t => !unit.customName.toLowerCase().includes(t.toLowerCase()));
  const fullDisplayName = titlesToAppend.length > 0
    ? `${unit.customName}, ${titlesToAppend.join(', ')}`
    : unit.customName;

  const toggleAbilityExpand = (id: string) => {
    setExpandedAbilities(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      <div 
        className={`bg-[#161920] border rounded-md overflow-hidden shadow-lg transition-all flex flex-col justify-between bevel-container ${
          isLeader 
            ? 'border-[#D4AF37] shadow-[#D4AF37]/10 shadow-lg ring-1 ring-[#D4AF37]/30' 
            : 'border-[#323846] hover:border-[#D4AF37]/50'
        }`}
      >
        
        {/* Card Header: Spacious, No Truncation, Clean 3-Dots Menu */}
        <div className={`p-3.5 border-b border-[#323846] flex items-start justify-between gap-3 ${
          isLeader ? 'bg-[#20242E] border-b-[#D4AF37]/40' : 'bg-[#20242E]'
        }`}>
          <div className="flex items-start space-x-2.5 flex-1 min-w-0">
            
            {/* Interactive Category Badge / Dropdown */}
            <div className="relative flex-shrink-0 mt-0.5">
              <button
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase flex items-center space-x-1 cursor-pointer transition-all ${
                  isLeader
                    ? 'bg-[#D4AF37] text-black shadow font-extrabold'
                    : unit.profileSnapshot.category === 'Elite'
                    ? 'bg-[#7C4DFF] text-white'
                    : unit.profileSnapshot.category === 'Mercenary'
                    ? 'bg-[#00897B] text-white'
                    : 'bg-[#323846] text-[#ECEFF4]'
                }`}
                title="Click to change unit role"
              >
                {isLeader && <Crown className="w-2.5 h-2.5 fill-black" />}
                <span>{unit.profileSnapshot.category}</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>

              {/* Role Dropdown Menu */}
              {isCategoryMenuOpen && (
                <div className="absolute left-0 top-full mt-1 w-36 bg-[#161920] border border-[#323846] rounded-md shadow-2xl z-30 py-1 font-mono text-xs">
                  {(['Leader', 'Elite', 'Trooper', 'Mercenary'] as UnitCategory[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCategorySelect(cat)}
                      className={`w-full px-2.5 py-1.5 text-left flex items-center space-x-2 hover:bg-[#20242E] transition-colors ${
                        unit.profileSnapshot.category === cat ? 'text-[#D4AF37] font-bold' : 'text-[#ECEFF4]'
                      }`}
                    >
                      {cat === 'Leader' && <Crown className="w-3 h-3 text-[#D4AF37]" />}
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Unit Name Edit (Full Name Display, Multi-line wrapping allowed) */}
            {isEditingName ? (
              <div className="flex items-center space-x-1 flex-1 min-w-0">
                <input
                  type="text"
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  className="bg-[#161920] border border-[#D4AF37] rounded px-2 py-1 text-xs text-white focus:outline-none w-full font-gothic"
                  autoFocus
                />
                <button onClick={handleSaveName} className="text-[#4E9A6E] hover:text-white p-1 flex-shrink-0">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setIsEditingName(false)} className="text-[#E53935] hover:text-white p-1 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div 
                className="flex flex-col group cursor-pointer flex-1 min-w-0" 
                onClick={() => setIsEditingName(true)}
                title="Click to rename"
              >
                <div className="flex items-center space-x-1.5">
                  <h3 className={`font-gothic font-bold text-sm sm:text-base leading-snug break-words transition-colors ${
                    isLeader ? 'text-[#D4AF37]' : 'text-[#ECEFF4] group-hover:text-[#D4AF37]'
                  }`}>
                    {fullDisplayName}
                  </h3>
                  <Edit3 className="w-3 h-3 text-[#8E95A5] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
                {favouriteSaved && (
                  <span className="text-[10px] text-[#4E9A6E] font-mono font-bold animate-pulse">
                    ⭐ Saved to Favourites!
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Header Right: Rating Badge & 3-Dots Action Menu */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Cost Badge */}
            <div className="text-xs font-mono font-bold text-[#D4AF37] bg-[#161920] px-2.5 py-1 rounded border border-[#323846] shadow-sm">
              {unit.totalCost} D
            </div>

            {/* 3-Dots Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                className="p-1.5 rounded bg-[#161920] hover:bg-[#323846] border border-[#323846] text-[#ECEFF4] hover:text-[#D4AF37] transition-colors"
                title="Warrior Actions & Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* 3-Dots Menu Dropdown */}
              {isActionMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-[#161920] border border-[#D4AF37]/50 rounded-md shadow-2xl z-40 py-1 font-mono text-xs divide-y divide-[#323846]/60">
                  {!isLeader && (
                    <button
                      onClick={handlePromoteToLeader}
                      className="w-full px-3 py-2 text-left flex items-center space-x-2 text-[#ECEFF4] hover:bg-[#20242E] hover:text-[#D4AF37] transition-colors"
                    >
                      <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Make Leader</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      duplicateUnit(warbandId, unit.id);
                      setIsActionMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2 text-[#ECEFF4] hover:bg-[#20242E] hover:text-[#D4AF37] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#8E95A5]" />
                    <span>Duplicate Warrior</span>
                  </button>

                  <button
                    onClick={handleSaveFavourite}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2 text-[#ECEFF4] hover:bg-[#20242E] hover:text-[#D4AF37] transition-colors"
                  >
                    <Star className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Save as Favourite</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsLoreModalOpen(true);
                      setIsActionMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2 text-[#ECEFF4] hover:bg-[#20242E] hover:text-[#D4AF37] transition-colors"
                  >
                    <Scroll className="w-3.5 h-3.5 text-[#8E95A5]" />
                    <span>Dossier & Bio</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsConfirmDismissOpen(true);
                      setIsActionMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2 text-[#E53935] hover:bg-[#8B0000]/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Dismiss Warrior</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-3.5 space-y-2.5 flex-1">
          
          {/* Base Profile Subtitle & XP */}
          <div className="text-[11px] font-mono text-[#8E95A5] flex items-center justify-between">
            <span>Base Profile: <strong className="text-[#ECEFF4]">{unit.profileSnapshot.name}</strong></span>
            {unit.xp > 0 && (
              <span className="text-[#D4AF37] flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>{unit.xp} XP</span>
              </span>
            )}
          </div>

          {/* Active Honorific & Earned Titles Badges */}
          {activeTitlesList.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {activeTitlesList.map((t, idx) => {
                const rec = (unit.titleRecords || []).find(r => r.title.toLowerCase() === t.toLowerCase());
                const isEarned = rec ? rec.source !== 'user' : false;
                return (
                  <span
                    key={idx}
                    onClick={() => setIsLoreModalOpen(true)}
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center space-x-1 cursor-pointer transition-colors ${
                      isEarned
                        ? 'bg-[#20242E] text-[#D4AF37] border border-[#D4AF37]/50 hover:border-[#D4AF37]'
                        : 'bg-[#0C0E12] text-[#8E95A5] border border-[#323846] hover:text-[#ECEFF4]'
                    }`}
                    title={rec?.origin || (isEarned ? 'Special Earned Title' : 'Custom Title')}
                  >
                    {isEarned ? (
                      <Trophy className="w-2.5 h-2.5 text-[#D4AF37]" />
                    ) : (
                      <Sparkles className="w-2.5 h-2.5 text-[#8E95A5]" />
                    )}
                    <span>{t}</span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Battlefield Quote Snippet */}
          {unit.quote && (
            <div 
              onClick={() => setIsLoreModalOpen(true)}
              className="p-1.5 bg-[#0C0E12] border-l-2 border-[#D4AF37] rounded-r text-[10px] italic text-[#8E95A5] hover:text-[#ECEFF4] font-serif cursor-pointer transition-colors leading-tight"
              title="Click to view warrior dossier & biography"
            >
              "{unit.quote}"
            </div>
          )}

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

          {/* Innate Abilities & Rules: Collapsed by Default with Expand Arrow */}
          {unit.profileSnapshot.innateAbilities && unit.profileSnapshot.innateAbilities.length > 0 && (
            <div className="space-y-1">
              {unit.profileSnapshot.innateAbilities.map((ab) => {
                const isExpanded = expandedAbilities[ab.id];
                return (
                  <div key={ab.id} className="text-xs bg-[#20242E]/60 p-1.5 rounded border border-[#323846]/60">
                    <button
                      onClick={() => toggleAbilityExpand(ab.id)}
                      className="w-full flex items-center justify-between text-left font-semibold text-[#D4AF37] font-mono text-[11px] hover:text-[#ECEFF4] transition-colors"
                    >
                      <span className="truncate">{ab.name}</span>
                      <div className="flex items-center space-x-1 text-[#8E95A5] flex-shrink-0">
                        <span className="text-[9px] uppercase">{isExpanded ? 'Hide' : 'Rule'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <p className="text-[#8E95A5] text-[11px] pt-1.5 leading-relaxed border-t border-[#323846]/40 mt-1">
                        {ab.description}
                      </p>
                    )}
                  </div>
                );
              })}
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
                    <div className="flex-1 mr-2 min-w-0">
                      <div className="font-semibold text-[#ECEFF4] truncate">{wep.name}</div>
                      <div className="text-[10px] font-mono text-[#8E95A5] truncate">
                        {wep.type === 'Melee' ? `Melee (${wep.range})` : wep.range} | Mod: {wep.modifiers} | {wep.damage}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
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
                    <span>{arm.name} ({arm.armourModifier || arm.modifier})</span>
                    <button
                      onClick={() => removeArmour(warbandId, unit.id, arm.instanceId)}
                      className="text-[#8E95A5] hover:text-[#E53935]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {unit.equippedEquipment.map((eq) => {
                  const isFormula = /formula|elixir|salve|phial|alkahest|vitriol|brimstone|cinnabar/i.test(eq.name);
                  return (
                    <span
                      key={eq.instanceId}
                      className={`inline-flex items-center space-x-1 text-xs font-mono px-2 py-0.5 rounded border ${
                        isFormula
                          ? 'bg-[#8B0000]/30 text-[#D4AF37] border-[#8B0000] ring-1 ring-[#D4AF37]/30'
                          : 'bg-[#20242E] text-[#ECEFF4] border-[#323846]'
                      }`}
                      title={eq.effect}
                    >
                      <span>{isFormula ? `🧪 ${eq.name}` : eq.name}</span>
                      <button
                        onClick={() => removeEquipment(warbandId, unit.id, eq.instanceId)}
                        className="text-[#8E95A5] hover:text-[#E53935] ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Faction Upgrades (e.g. Secrets of the House of Wisdom) */}
          {unit.specialUpgrades && unit.specialUpgrades.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-[#D4AF37] uppercase tracking-wider flex items-center space-x-1">
                <Flame className="w-3 h-3" />
                <span>{unit.specialUpgrades[0].category}:</span>
              </span>
              <div className="flex flex-wrap gap-1">
                {unit.specialUpgrades.map((upg) => (
                  <span
                    key={upg.id}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] font-bold"
                  >
                    ✓ {upg.name} ({upg.cost} D)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Fireteam Protocol */}
          {unit.fireteam && (
            <div className="p-1.5 bg-[#20242E] rounded border border-[#323846] text-[10px] font-mono text-[#ECEFF4] flex items-center space-x-1.5">
              <Users className="w-3 h-3 text-[#D4AF37]" />
              <span><strong>Fireteam:</strong> {unit.fireteam}</span>
            </div>
          )}

          {/* Acquired Skills Pills */}
          {unit.skills && unit.skills.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-[#D4AF37] uppercase tracking-wider flex items-center space-x-1">
                <BookOpen className="w-3 h-3" />
                <span>Skills ({unit.skills.length}):</span>
              </span>
              <div className="flex flex-wrap gap-1">
                {unit.skills.map((sk, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#0C0E12] border border-[#323846] text-[#ECEFF4]"
                  >
                    {sk.name} <strong className="text-[#D4AF37]">[{sk.roll || 'D66'}]</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Heroic Feats Quick Pill */}
          {unit.deeds && unit.deeds.length > 0 && (
            <div 
              onClick={() => setIsLoreModalOpen(true)}
              className="p-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded text-[10px] font-mono text-[#D4AF37] flex items-center space-x-1.5 cursor-pointer hover:bg-[#D4AF37]/20 transition-colors"
              title="Click to view all heroic feats"
            >
              <Award className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate"><strong>{unit.deeds.length} Heroic Feat{unit.deeds.length > 1 ? 's' : ''}:</strong> {unit.deeds[0]}</span>
            </div>
          )}

          {/* Injuries & Battle Scars */}
          {((unit.scars && unit.scars.length > 0) || unit.injuries.length > 0) && (
            <div className="p-2 bg-[#8B0000]/10 border border-[#8B0000]/30 rounded text-xs space-y-1">
              <span className="font-mono text-[#E53935] font-bold flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Battle Scars & Trauma:</span>
              </span>
              <div className="flex flex-wrap gap-1">
                {(unit.scars || []).map((sc, sIdx) => (
                  <span key={sIdx} className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#8B0000]/20 text-[#E53935] border border-[#8B0000]/40">
                    {sc.name} [{sc.roll}]
                  </span>
                ))}
                {unit.injuries.map((inj, idx) => (
                  <span key={`inj-${idx}`} className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#8B0000]/20 text-[#E53935] border border-[#8B0000]/40">
                    {inj}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Card Footer Actions */}
        <div className="p-2 bg-[#20242E] border-t border-[#323846] grid grid-cols-3 gap-1.5 text-xs font-mono">
          <button
            onClick={() => setIsLoreModalOpen(true)}
            className="flex items-center justify-center space-x-1 py-1.5 bg-[#161920] hover:bg-[#323846] border border-[#323846] rounded font-bold text-[#8E95A5] hover:text-[#D4AF37] uppercase text-[10px] tracking-wider transition-colors"
          >
            <Scroll className="w-3 h-3" />
            <span>Bio</span>
          </button>

          <button
            onClick={() => setIsAdvancementModalOpen(true)}
            className="flex items-center justify-center space-x-1 py-1.5 bg-[#161920] hover:bg-[#323846] border border-[#323846] rounded font-bold text-[#8E95A5] hover:text-[#D4AF37] uppercase text-[10px] tracking-wider transition-colors"
            title="Skills, XP & Faction Upgrades"
          >
            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
            <span>Skills</span>
          </button>

          <button
            onClick={() => setIsEquipModalOpen(true)}
            className="flex items-center justify-center space-x-1 py-1.5 bg-[#161920] hover:bg-[#323846] border border-[#323846] rounded font-bold text-[#D4AF37] uppercase text-[10px] tracking-wider transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Equip</span>
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

      {/* Unit Advancement & Skills Modal */}
      {isAdvancementModalOpen && (
        <UnitAdvancementModal
          warbandId={warbandId}
          unit={unit}
          onClose={() => setIsAdvancementModalOpen(false)}
        />
      )}

      {/* Unit Lore Dossier Modal */}
      {isLoreModalOpen && (
        <UnitLoreModal
          warbandId={warbandId}
          unit={unit}
          onClose={() => setIsLoreModalOpen(false)}
        />
      )}

      {/* Dismiss Warrior Confirmation Dialog */}
      <ConfirmModal
        isOpen={isConfirmDismissOpen}
        title="DISMISS WARRIOR"
        message={`Are you sure you want to dismiss "${unit.customName}" from the warband? All equipped weapons, armour, experience points, and heroic feats recorded on this warrior will be permanently removed.`}
        confirmLabel="Dismiss Warrior"
        onConfirm={() => {
          removeUnitFromWarband(warbandId, unit.id);
          setIsConfirmDismissOpen(false);
        }}
        onCancel={() => setIsConfirmDismissOpen(false)}
      />
    </>
  );
};
