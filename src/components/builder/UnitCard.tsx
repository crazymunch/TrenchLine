'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { ActiveUnit } from '../../types/warband';
import { UnitCategory } from '../../types/rules';
import { AddEquipmentModal } from './AddEquipmentModal';
import { UnitLoreModal } from './UnitLoreModal';
import { UnitAdvancementModal } from './UnitAdvancementModal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { forcedBattlekit } from '../../rules/battlekit';
import { isAlchemicalFormula, ALCHEMICAL_FORMULAE } from '../../rules/formulae';
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
  Flame,
  Users,
  Star,
  MoreVertical,
  Package,
  Trophy
} from 'lucide-react';

interface UnitCardProps {
  unit: ActiveUnit;
  warbandId: string;
  /** The roster-level collapse state. A card can still be opened on its own. */
  collapseAll?: boolean;
}

export const UnitCard: React.FC<UnitCardProps> = ({ unit, warbandId, collapseAll = false }) => {
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

  /*
    Formulae are separated from gear by the group the CATALOGUE put them in,
    which the importer now keeps. It used to be a regex over the item's name:

        /formula|elixir|salve|phial|alkahest|vitriol|brimstone|cinnabar/i

    None of the eight real Alchemical Formulae a Takwin Homunculus can buy
    contains any of those words, so every one of them rendered here as ordinary
    gear — `Additional Arm` under "Protection & Gear", beside a Gas Mask.
  */
  const formulaEquipment = unit.equippedEquipment.filter(isAlchemicalFormula);
  const gear = unit.equippedEquipment.filter((e) => !isAlchemicalFormula(e));

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

  /*
    Collapse-to-summary (3.3).

    Nine warriors at full detail is about 6,000px of scroll on a phone, and
    what you are usually doing — checking who is in the roster and what they
    cost — needs the header and the statline and nothing else. Collapsed, a
    card is those two bands; expanded, it is everything.

    `collapseAll` is the roster-level control and the local state overrides it
    per card: collapse the lot, then open the one warrior you are editing.
    Re-seeding when `collapseAll` changes is what keeps the roster button
    working after you have touched individual cards.
  */
  const [collapsed, setCollapsed] = useState(collapseAll);
  useEffect(() => { setCollapsed(collapseAll); }, [collapseAll]);

  const toggleAbilityExpand = (id: string) => {
    setExpandedAbilities(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      <div 
        className={`bg-theme-surface border rounded-md overflow-hidden shadow-lg transition-all flex flex-col justify-between bevel-container ${
          isLeader 
            ? 'border-theme-primary'
            : 'border-theme-border hover:border-theme-muted'
        }`}
      >
        
        {/* Card Header: Spacious, No Truncation, Clean 3-Dots Menu */}
        {/* Two rows, always: the badge and the actions share the first, and the
            name gets the second to itself. As one row, a warrior called "Kasim
            bin Malik, The Living Engineer, Master of Construction" was left
            about 90px in a three-column grid and wrapped a word per line.
            `contents` promotes the badge and the name to direct flex children
            so `order` and `basis-full` can place them without moving the JSX. */}
        <div className={`px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 ${
          isLeader
            ? 'bg-theme-primary text-theme-base'
            : 'bg-theme-elevated border-b border-theme-border'
        }`}>
          <div className="contents">
            
            {/* Interactive Category Badge / Dropdown */}
            <div className="relative flex-shrink-0 order-1">
              <button
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                className={`tap text-xs sm:text-[10px] font-mono tracking-[0.11em] uppercase flex items-center gap-1 cursor-pointer transition-colors ${
                  isLeader
                    ? 'text-theme-base font-semibold'
                    : 'text-theme-muted hover:text-theme-text'
                }`}
                title="Click to change unit role"
              >
                {isLeader && <Crown className="w-2.5 h-2.5" />}
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
                  className="bg-theme-surface border border-theme-primary rounded px-2 py-1 text-xs text-theme-text focus:outline-none w-full font-gothic"
                  autoFocus
                />
                <button onClick={handleSaveName} className="text-status-legal hover:text-theme-text min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 lg:p-1 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setIsEditingName(false)} className="text-status-error hover:text-theme-text min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 lg:p-1 flex items-center justify-center flex-shrink-0">
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
                  <h3 className={`font-bold text-sm sm:text-base leading-snug break-words transition-colors ${
                    isLeader ? 'text-theme-base' : 'text-theme-text group-hover:text-theme-primary'
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
            <div className={`font-mono text-sm tabular-nums ${
              isLeader ? 'text-theme-base' : 'text-theme-text'
            }`}>
              {unit.totalCost} D
            </div>

            {/* Collapse toggle, beside the cost: the cost is the other thing
                you read when scanning, and the two are what a collapsed card
                still shows. */}
            <button
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              className={`min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 lg:p-1.5 flex items-center justify-center transition-colors ${
                isLeader ? 'text-theme-base hover:opacity-70' : 'text-theme-muted hover:text-theme-text'
              }`}
              title={collapsed ? 'Show the full warrior card' : 'Collapse to summary'}
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
            </button>

            {/* 3-Dots Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                className={`min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 lg:p-1.5 flex items-center justify-center transition-colors ${
                  isLeader ? 'text-theme-base hover:opacity-70' : 'text-theme-muted hover:text-theme-text'
                }`}
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

          {/*
            Everything but the statline hides when the card is collapsed.

            What survives is what you scan a roster for: who they are, what they
            cost, and the four characteristics. Nine warriors at full detail is
            about 6,000px of scroll on a phone.
          */}
          {!collapsed && (<>

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

          </>)}

          {/* Stat Block */}
          {/*
            The statline as the rulebook prints it: a ruled row of cells, not
            four floating pairs. Divided by hairlines rather than by gaps, so
            the numbers line up in a column across every card in the grid.
          */}
          {/*
            Movement is two facts in one string — `6"/Infantry` — and it was
            printed whole into a quarter of the row, sized by the widest of the
            other three (`+3 Dice`). It overflowed its cell on every card, over
            the top of the Ranged value beside it.

            Split rather than truncated or shrunk: the movement TYPE decides
            what a model may cross and is not decoration, so it keeps its own
            line under the distance instead of being cut off or ellipsised.
            `min-w-0` lets each cell shrink below its content's natural width,
            which is what a grid track otherwise refuses to do.
          */}
          <div className="grid grid-cols-4 bg-theme-base border border-theme-border divide-x divide-theme-border">
            {([
              ['MOV', unit.profileSnapshot.stats.movementInches
                ? `${unit.profileSnapshot.stats.movementInches}"`
                : unit.profileSnapshot.stats.movement,
                unit.profileSnapshot.stats.movementType],
              ['RNG', unit.profileSnapshot.stats.ranged, undefined],
              ['MELEE', unit.profileSnapshot.stats.melee, undefined],
              ['ARM', unit.profileSnapshot.stats.armour, undefined],
            ] as const).map(([label, value, sub]) => (
              <div key={label} className="min-w-0 px-1 py-1.5 text-center">
                <span className="block font-mono text-xs sm:text-[10px] tracking-[0.06em] text-theme-muted">
                  {label}
                </span>
                <span className="block font-mono text-base sm:text-sm tabular-nums text-theme-text mt-0.5 truncate">
                  {value}
                </span>
                {sub && (
                  <span className="block font-mono text-xs sm:text-[9px] uppercase tracking-[0.06em] text-theme-muted truncate">
                    {sub}
                  </span>
                )}
              </div>
            ))}
          </div>

          {!collapsed && (<>

          {/*
            The entry's own Battlekit sentence, where the book prints one.

            It restricts what this model may buy — "The only Ranged Weapons
            they can have are Automatic Pistols and Pistols" — and neither the
            Armoury Table nor the engine can express it, so it sits above the
            gear the player is about to add to rather than in a rules list.
          */}
          {unit.profileSnapshot.battlekitNote && (
            <p className="text-xs sm:text-[11px] text-theme-muted leading-relaxed border-l-2 border-theme-accent/40 pl-2">
              <span className="font-semibold text-theme-primary font-mono">BATTLEKIT </span>
              {unit.profileSnapshot.battlekitNote}
            </p>
          )}

          {/* Innate Abilities & Rules: Collapsed by Default with Expand Arrow */}
          {unit.profileSnapshot.innateAbilities && unit.profileSnapshot.innateAbilities.length > 0 && (
            <div className="space-y-1">
              {unit.profileSnapshot.innateAbilities.map((ab) => {
                const isExpanded = expandedAbilities[ab.id];
                return (
                  <div key={ab.id} className="text-xs bg-theme-elevated/60 p-1.5 rounded border border-theme-border/60">
                    <button
                      onClick={() => toggleAbilityExpand(ab.id)}
                      className="w-full flex items-center justify-between text-left font-semibold text-theme-primary font-mono text-xs sm:text-[11px] hover:text-theme-text transition-colors min-h-[44px] lg:min-h-0"
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

          {/*
            Battlekit: the gear the model always has.

            Listed above the weapons it bought and without a remove button,
            because it cannot be removed — the catalogue forces it on with a
            `min="1"` link and the book prints it as "a Combat Medic always
            has...". It carries no price here because the model's own cost
            already includes it. See `rules/battlekit.ts`.
          */}
          {forcedBattlekit(unit.profileSnapshot).length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs sm:text-[10px] font-mono font-bold text-theme-muted uppercase tracking-wider flex items-center space-x-1">
                <Package className="w-3 h-3" />
                <span>Battlekit (always carried)</span>
              </span>
              <div className="space-y-1">
                {forcedBattlekit(unit.profileSnapshot).map((b) => (
                  <div
                    key={b.linkId}
                    className="flex items-center justify-between gap-2 text-xs bg-theme-base px-2 py-1 rounded border border-dashed border-theme-border"
                  >
                    <span className="font-semibold text-theme-text truncate">{b.name}</span>
                    {b.keywords.length > 0 && (
                      <span className="text-xs sm:text-[10px] font-mono text-theme-muted truncate flex-shrink-0">
                        {b.keywords.join(' · ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
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
          {(unit.equippedArmour.length > 0 || gear.length > 0) && (
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
                {gear.map((eq) => {
                  return (
                    <span
                      key={eq.instanceId}
                      className="inline-flex items-center space-x-1 text-xs font-mono px-2 py-0.5 rounded border bg-theme-elevated text-theme-text border-theme-border"
                      title={eq.effect}
                    >
                      <span>{eq.name}</span>
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

          {/* Alchemical Formulae and other faction upgrades */}
          {((unit.specialUpgrades?.length ?? 0) > 0 || formulaEquipment.length > 0) && (
            <div className="space-y-1">
              <span className="text-xs sm:text-[10px] font-mono font-bold text-theme-primary uppercase tracking-wider flex items-center space-x-1">
                <Flame className="w-3 h-3" />
                {/*
                  Named by the catalogue group when the Formulae were imported,
                  and only otherwise by whatever category an in-app upgrade was
                  filed under.
                */}
                <span>{formulaEquipment.length > 0 ? ALCHEMICAL_FORMULAE : unit.specialUpgrades![0].category}:</span>
              </span>
              <div className="flex flex-wrap gap-1">
                {formulaEquipment.map((eq) => (
                  <span
                    key={eq.instanceId}
                    title={eq.effect}
                    className="inline-flex items-center space-x-1 text-xs sm:text-[10px] font-mono px-2 py-0.5 rounded bg-theme-primary/15 border border-theme-primary/40 text-theme-primary font-bold"
                  >
                    <span>{eq.name} ({eq.cost} D)</span>
                    <button
                      onClick={() => removeEquipment(warbandId, unit.id, eq.instanceId)}
                      className="tap text-theme-muted hover:text-status-error ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {(unit.specialUpgrades ?? []).map((upg) => (
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

          </>)}

        </div>

        {/* Card Footer Actions. Hidden when collapsed: Bio, Skills and Equip
            all open something, and a summary row is for scanning, not acting. */}
        {!collapsed && (
        <div className="p-2 bg-theme-elevated border-t border-theme-border grid grid-cols-3 gap-1.5 text-xs font-mono">
          <button
            onClick={() => setIsLoreModalOpen(true)}
            className="flex items-center justify-center space-x-1 min-h-[44px] lg:min-h-0 lg:py-1.5 bg-theme-surface hover:bg-theme-border border border-theme-border rounded font-bold text-theme-muted hover:text-theme-primary uppercase text-xs sm:text-[10px] tracking-wider transition-colors"
          >
            <Scroll className="w-3 h-3" />
            <span>Bio</span>
          </button>

          <button
            onClick={() => setIsAdvancementModalOpen(true)}
            className="flex items-center justify-center space-x-1 min-h-[44px] lg:min-h-0 lg:py-1.5 bg-theme-surface hover:bg-theme-border border border-theme-border rounded font-bold text-theme-muted hover:text-theme-primary uppercase text-xs sm:text-[10px] tracking-wider transition-colors"
            title="Skills, XP & Faction Upgrades"
          >
            <Sparkles className="w-3 h-3 text-theme-primary" />
            <span>Skills</span>
          </button>

          <button
            onClick={() => setIsEquipModalOpen(true)}
            className="flex items-center justify-center space-x-1 min-h-[44px] lg:min-h-0 lg:py-1.5 bg-theme-surface hover:bg-theme-border border border-theme-border rounded font-bold text-theme-primary uppercase text-xs sm:text-[10px] tracking-wider transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Equip</span>
          </button>
        </div>
        )}

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
