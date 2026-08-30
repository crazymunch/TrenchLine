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
        className={`bg-theme-surface border rounded-md overflow-hidden shadow-lg transition-all flex flex-col justify-between bevel-container ${
          isLeader 
            ? 'border-theme-primary shadow-theme-primary/10 shadow-lg ring-1 ring-theme-primary/30' 
            : 'border-theme-border hover:border-theme-primary/50'
        }`}
      >
        
        {/* Card Header: Spacious, No Truncation, Clean 3-Dots Menu */}
        {/* Two rows, always: the badge and the actions share the first, and the
            name gets the second to itself. As one row, a warrior called "Kasim
            bin Malik, The Living Engineer, Master of Construction" was left
            about 90px in a three-column grid and wrapped a word per line.
            `contents` promotes the badge and the name to direct flex children
            so `order` and `basis-full` can place them without moving the JSX. */}
        <div className={`p-3.5 border-b border-theme-border flex flex-wrap items-center gap-x-3 gap-y-2 ${
          isLeader ? 'bg-theme-elevated border-b-theme-primary/40' : 'bg-theme-elevated'
        }`}>
          <div className="contents">
            
            {/* Interactive Category Badge / Dropdown */}
            <div className="relative flex-shrink-0 order-1">
              <button
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                className={`tap text-xs sm:text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase flex items-center space-x-1 cursor-pointer transition-all ${
                  isLeader
                    ? 'bg-theme-primary text-black shadow font-extrabold'
                    : unit.profileSnapshot.category === 'Elite'
                    ? 'bg-[#7C4DFF] text-white'
                    : unit.profileSnapshot.category === 'Mercenary'
                    ? 'bg-[#00897B] text-white'
                    : 'bg-theme-border text-theme-text'
                }`}
                title="Click to change unit role"
              >
                {isLeader && <Crown className="w-2.5 h-2.5 fill-black" />}
                <span>{unit.profileSnapshot.category}</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>

              {/* Role Dropdown Menu */}
              {isCategoryMenuOpen && (
                <div className="absolute left-0 top-full mt-1 w-36 bg-theme-surface border border-theme-border rounded-md shadow-2xl z-30 py-1 font-mono text-xs">
                  {(['Leader', 'Elite', 'Trooper', 'Mercenary'] as UnitCategory[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCategorySelect(cat)}
                      className={`w-full px-2.5 py-1.5 text-left flex items-center space-x-2 hover:bg-theme-elevated transition-colors ${
                        unit.profileSnapshot.category === cat ? 'text-theme-primary font-bold' : 'text-theme-text'
                      }`}
                    >
                      {cat === 'Leader' && <Crown className="w-3 h-3 text-theme-primary" />}
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Unit Name Edit (Full Name Display, Multi-line wrapping allowed) */}
            {isEditingName ? (
              <div className="flex items-center space-x-1 order-3 basis-full min-w-0">
                <input
                  type="text"
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  className="bg-theme-surface border border-theme-primary rounded px-2 py-1 text-xs text-white focus:outline-none w-full font-gothic"
                  autoFocus
                />
                <button onClick={handleSaveName} className="text-status-legal hover:text-white min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:p-1 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setIsEditingName(false)} className="text-status-error hover:text-white min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:p-1 flex items-center justify-center flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div 
                className="flex flex-col group cursor-pointer order-3 basis-full min-w-0" 
                onClick={() => setIsEditingName(true)}
                title="Click to rename"
              >
                <div className="flex items-center space-x-1.5">
                  <h3 className={`font-gothic font-bold text-sm sm:text-base leading-snug break-words transition-colors ${
                    isLeader ? 'text-theme-primary' : 'text-theme-text group-hover:text-theme-primary'
                  }`}>
                    {fullDisplayName}
                  </h3>
                  <Edit3 className="w-3 h-3 text-theme-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
                {favouriteSaved && (
                  <span className="text-xs sm:text-[10px] text-status-legal font-mono font-bold animate-pulse">
                    ⭐ Saved to Favourites!
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Header Right: Rating Badge & 3-Dots Action Menu */}
          <div className="flex items-center space-x-2 flex-shrink-0 order-2 ml-auto">
            {/* Cost Badge */}
            <div className="text-xs font-mono font-bold text-theme-primary bg-theme-surface px-2.5 py-1 rounded border border-theme-border shadow-sm">
              {unit.totalCost} D
            </div>

            {/* 3-Dots Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:p-1.5 flex items-center justify-center rounded bg-theme-surface hover:bg-theme-border border border-theme-border text-theme-text hover:text-theme-primary transition-colors"
                title="Warrior Actions & Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* 3-Dots Menu Dropdown */}
              {isActionMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-theme-surface border border-theme-primary/50 rounded-md shadow-2xl z-40 py-1 font-mono text-xs divide-y divide-theme-border/60">
                  {!isLeader && (
                    <button
                      onClick={handlePromoteToLeader}
                      className="w-full px-3 py-2 text-left flex items-center space-x-2 text-theme-text hover:bg-theme-elevated hover:text-theme-primary transition-colors"
                    >
                      <Crown className="w-3.5 h-3.5 text-theme-primary" />
                      <span>Make Leader</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      duplicateUnit(warbandId, unit.id);
                      setIsActionMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2 text-theme-text hover:bg-theme-elevated hover:text-theme-primary transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-theme-muted" />
                    <span>Duplicate Warrior</span>
                  </button>

                  <button
                    onClick={handleSaveFavourite}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2 text-theme-text hover:bg-theme-elevated hover:text-theme-primary transition-colors"
                  >
                    <Star className="w-3.5 h-3.5 text-theme-primary" />
                    <span>Save as Favourite</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsLoreModalOpen(true);
                      setIsActionMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2 text-theme-text hover:bg-theme-elevated hover:text-theme-primary transition-colors"
                  >
                    <Scroll className="w-3.5 h-3.5 text-theme-muted" />
                    <span>Dossier & Bio</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsConfirmDismissOpen(true);
                      setIsActionMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2 text-status-error hover:bg-theme-accent/20 transition-colors"
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
          <div className="text-xs sm:text-[11px] font-mono text-theme-muted flex items-center justify-between">
            <span>Base Profile: <strong className="text-theme-text">{unit.profileSnapshot.name}</strong></span>
            {unit.xp > 0 && (
              <span className="text-theme-primary flex items-center space-x-1">
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
                    className={`text-xs sm:text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center space-x-1 cursor-pointer transition-colors ${
                      isEarned
                        ? 'bg-theme-elevated text-theme-primary border border-theme-primary/50 hover:border-theme-primary'
                        : 'bg-theme-base text-theme-muted border border-theme-border hover:text-theme-text'
                    }`}
                    title={rec?.origin || (isEarned ? 'Special Earned Title' : 'Custom Title')}
                  >
                    {isEarned ? (
                      <Trophy className="w-2.5 h-2.5 text-theme-primary" />
                    ) : (
                      <Sparkles className="w-2.5 h-2.5 text-theme-muted" />
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
              className="p-1.5 bg-theme-base border-l-2 border-theme-primary rounded-r text-xs sm:text-[10px] italic text-theme-muted hover:text-theme-text font-serif cursor-pointer transition-colors leading-tight"
              title="Click to view warrior dossier & biography"
            >
              "{unit.quote}"
            </div>
          )}

          {/* Stat Block */}
          <div className="grid grid-cols-4 gap-1.5 font-mono text-center text-xs bg-theme-base p-1.5 rounded border border-theme-border">
            <div>
              <span className="text-xs sm:text-[9px] text-theme-muted block">MOV</span>
              <span className="font-bold text-theme-text">{unit.profileSnapshot.stats.movement}</span>
            </div>
            <div>
              <span className="text-xs sm:text-[9px] text-theme-muted block">RNG</span>
              <span className="font-bold text-theme-text">{unit.profileSnapshot.stats.ranged}</span>
            </div>
            <div>
              <span className="text-xs sm:text-[9px] text-theme-muted block">MELEE</span>
              <span className="font-bold text-theme-text">{unit.profileSnapshot.stats.melee}</span>
            </div>
            <div>
              <span className="text-xs sm:text-[9px] text-theme-muted block">ARMOUR</span>
              <span className="font-bold text-theme-text">{unit.profileSnapshot.stats.armour}</span>
            </div>
          </div>

          {/* Innate Abilities & Rules: Collapsed by Default with Expand Arrow */}
          {unit.profileSnapshot.innateAbilities && unit.profileSnapshot.innateAbilities.length > 0 && (
            <div className="space-y-1">
              {unit.profileSnapshot.innateAbilities.map((ab) => {
                const isExpanded = expandedAbilities[ab.id];
                return (
                  <div key={ab.id} className="text-xs bg-theme-elevated/60 p-1.5 rounded border border-theme-border/60">
                    <button
                      onClick={() => toggleAbilityExpand(ab.id)}
                      className="w-full flex items-center justify-between text-left font-semibold text-theme-primary font-mono text-xs sm:text-[11px] hover:text-theme-text transition-colors min-h-[44px] sm:min-h-0"
                    >
                      <span className="truncate">{ab.name}</span>
                      <div className="flex items-center space-x-1 text-theme-muted flex-shrink-0">
                        <span className="text-xs sm:text-[9px] uppercase">{isExpanded ? 'Hide' : 'Rule'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <p className="text-theme-muted text-xs sm:text-[11px] pt-1.5 leading-relaxed border-t border-theme-border/40 mt-1">
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
            <span className="text-xs sm:text-[10px] font-mono font-bold text-theme-muted uppercase tracking-wider flex items-center space-x-1">
              <Swords className="w-3 h-3" />
              <span>Weapons ({unit.equippedWeapons.length})</span>
            </span>

            {unit.equippedWeapons.length === 0 ? (
              <p className="text-xs sm:text-[11px] text-theme-muted italic">Unarmed</p>
            ) : (
              <div className="space-y-1">
                {unit.equippedWeapons.map((wep) => (
                  <div
                    key={wep.instanceId}
                    className="flex items-center justify-between text-xs bg-theme-base px-2 py-1 rounded border border-theme-border"
                  >
                    <div className="flex-1 mr-2 min-w-0">
                      <div className="font-semibold text-theme-text truncate">{wep.name}</div>
                      <div className="text-xs sm:text-[10px] font-mono text-theme-muted truncate">
                        {wep.type === 'Melee' ? `Melee (${wep.range})` : wep.range} | Mod: {wep.modifiers} | {wep.damage}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="text-xs sm:text-[10px] font-mono text-theme-primary">{wep.cost} D</span>
                      <button
                        onClick={() => removeWeapon(warbandId, unit.id, wep.instanceId)}
                        className="tap text-theme-muted hover:text-status-error"
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
              <span className="text-xs sm:text-[10px] font-mono font-bold text-theme-muted uppercase tracking-wider flex items-center space-x-1">
                <Shield className="w-3 h-3" />
                <span>Protection & Gear</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {unit.equippedArmour.map((arm) => (
                  <span
                    key={arm.instanceId}
                    className="inline-flex items-center space-x-1 bg-theme-elevated text-xs font-mono px-2 py-0.5 rounded border border-theme-border"
                  >
                    <span>{arm.name} ({arm.armourModifier || arm.modifier})</span>
                    <button
                      onClick={() => removeArmour(warbandId, unit.id, arm.instanceId)}
                      className="tap text-theme-muted hover:text-status-error"
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
                          ? 'bg-theme-accent/30 text-theme-primary border-theme-accent ring-1 ring-theme-primary/30'
                          : 'bg-theme-elevated text-theme-text border-theme-border'
                      }`}
                      title={eq.effect}
                    >
                      <span>{isFormula ? `🧪 ${eq.name}` : eq.name}</span>
                      <button
                        onClick={() => removeEquipment(warbandId, unit.id, eq.instanceId)}
                        className="tap text-theme-muted hover:text-status-error ml-1"
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
              <span className="text-xs sm:text-[10px] font-mono font-bold text-theme-primary uppercase tracking-wider flex items-center space-x-1">
                <Flame className="w-3 h-3" />
                <span>{unit.specialUpgrades[0].category}:</span>
              </span>
              <div className="flex flex-wrap gap-1">
                {unit.specialUpgrades.map((upg) => (
                  <span
                    key={upg.id}
                    className="text-xs sm:text-[10px] font-mono px-2 py-0.5 rounded bg-theme-primary/15 border border-theme-primary/40 text-theme-primary font-bold"
                  >
                    ✓ {upg.name} ({upg.cost} D)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Fireteam Protocol */}
          {unit.fireteam && (
            <div className="p-1.5 bg-theme-elevated rounded border border-theme-border text-xs sm:text-[10px] font-mono text-theme-text flex items-center space-x-1.5">
              <Users className="w-3 h-3 text-theme-primary" />
              <span><strong>Fireteam:</strong> {unit.fireteam}</span>
            </div>
          )}

          {/* Acquired Skills Pills */}
          {unit.skills && unit.skills.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs sm:text-[10px] font-mono font-bold text-theme-primary uppercase tracking-wider flex items-center space-x-1">
                <BookOpen className="w-3 h-3" />
                <span>Skills ({unit.skills.length}):</span>
              </span>
              <div className="flex flex-wrap gap-1">
                {unit.skills.map((sk, idx) => (
                  <span
                    key={idx}
                    className="text-xs sm:text-[10px] font-mono px-1.5 py-0.2 rounded bg-theme-base border border-theme-border text-theme-text"
                  >
                    {sk.name} <strong className="text-theme-primary">[{sk.roll || 'D66'}]</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Heroic Feats Quick Pill */}
          {unit.deeds && unit.deeds.length > 0 && (
            <div 
              onClick={() => setIsLoreModalOpen(true)}
              className="p-1.5 bg-theme-primary/10 border border-theme-primary/30 rounded text-xs sm:text-[10px] font-mono text-theme-primary flex items-center space-x-1.5 cursor-pointer hover:bg-theme-primary/20 transition-colors"
              title="Click to view all heroic feats"
            >
              <Award className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate"><strong>{unit.deeds.length} Heroic Feat{unit.deeds.length > 1 ? 's' : ''}:</strong> {unit.deeds[0]}</span>
            </div>
          )}

          {/* Injuries & Battle Scars */}
          {((unit.scars && unit.scars.length > 0) || unit.injuries.length > 0) && (
            <div className="p-2 bg-theme-accent/10 border border-theme-accent/30 rounded text-xs space-y-1">
              <span className="font-mono text-status-error font-bold flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Battle Scars & Trauma:</span>
              </span>
              <div className="flex flex-wrap gap-1">
                {(unit.scars || []).map((sc, sIdx) => (
                  <span key={sIdx} className="text-xs sm:text-[10px] font-mono px-1.5 py-0.2 rounded bg-theme-accent/20 text-status-error border border-theme-accent/40">
                    {sc.name} [{sc.roll}]
                  </span>
                ))}
                {unit.injuries.map((inj, idx) => (
                  <span key={`inj-${idx}`} className="text-xs sm:text-[10px] font-mono px-1.5 py-0.2 rounded bg-theme-accent/20 text-status-error border border-theme-accent/40">
                    {inj}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Card Footer Actions */}
        <div className="p-2 bg-theme-elevated border-t border-theme-border grid grid-cols-3 gap-1.5 text-xs font-mono">
          <button
            onClick={() => setIsLoreModalOpen(true)}
            className="flex items-center justify-center space-x-1 min-h-[44px] sm:min-h-0 sm:py-1.5 bg-theme-surface hover:bg-theme-border border border-theme-border rounded font-bold text-theme-muted hover:text-theme-primary uppercase text-xs sm:text-[10px] tracking-wider transition-colors"
          >
            <Scroll className="w-3 h-3" />
            <span>Bio</span>
          </button>

          <button
            onClick={() => setIsAdvancementModalOpen(true)}
            className="flex items-center justify-center space-x-1 min-h-[44px] sm:min-h-0 sm:py-1.5 bg-theme-surface hover:bg-theme-border border border-theme-border rounded font-bold text-theme-muted hover:text-theme-primary uppercase text-xs sm:text-[10px] tracking-wider transition-colors"
            title="Skills, XP & Faction Upgrades"
          >
            <Sparkles className="w-3 h-3 text-theme-primary" />
            <span>Skills</span>
          </button>

          <button
            onClick={() => setIsEquipModalOpen(true)}
            className="flex items-center justify-center space-x-1 min-h-[44px] sm:min-h-0 sm:py-1.5 bg-theme-surface hover:bg-theme-border border border-theme-border rounded font-bold text-theme-primary uppercase text-xs sm:text-[10px] tracking-wider transition-colors"
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
