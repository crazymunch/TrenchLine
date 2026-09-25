'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { ActiveUnit } from '../../types/warband';
import { UnitCategory } from '../../types/rules';
import { AddEquipmentModal } from './AddEquipmentModal';
import { UnitLoreModal } from './UnitLoreModal';
import { UnitAdvancementModal } from './UnitAdvancementModal';
import { RetireUnitModal } from './RetireUnitModal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { forcedBattlekit, battlekitProfile } from '../../rules/battlekit';
import { isAlchemicalFormula, ALCHEMICAL_FORMULAE } from '../../rules/formulae';
import { unitGlory, formatUnitCost } from '../../rules/savedGlory';
import { formulaeHeld } from '../../rules/formulaShelf';
import { catalogueUnitFor } from '../../rules/catalogueUnit';
import { golemGrant, isGolem } from '../../rules/golem';
import { mayRetire } from '../../rules/retire';
import { modelSelections } from '../../rules/applyVariant';
import { swappedProfile } from '../../rules/statlineOptions';
import { shownAbilitiesFor } from '../../rules/shownAbilities';
import { variantById } from '../../rules/variants';
import { useDataset } from '../../rules/useDataset';
import { ExperienceTrack } from '../ExperienceTrack';
import { DEFAULT_RULESET_ID } from '../../rules/rulesets';
import { roleStyle, ROLE_STYLES } from '../ui/unitRole';
import { KeywordText, KeywordChip } from '../ui/KeywordText';
import { DATASET } from '@/data/generated/trenchline.generated';
import { effectiveMovement, type TraumaRow } from '@/rules/effectiveStats';
import { soundEffects } from '../../services/soundEffects';
import { 
  Trash2, 
  LogOut,

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
  Armchair,
  ChevronDown,
  ChevronUp,
  Scroll,
  Award,
  BookOpen,
  Flame,
  FlaskConical,
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
    setUnitAsGolem,
    updateUnitName, 
    updateUnitCategory,
    setUnitAsLeader,
    setUnitBenched,
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
  /* Gear is everything equipped that is NOT a Formula; the Formulae
     themselves come from `heldFormulae` below, with their rules text. */
  const gear = unit.equippedEquipment.filter((e) => !isAlchemicalFormula(e));

  /*
    FD-13a item 3. The Formulae this model holds, each with the sentence the
    catalogue prints for it.

    Until now the card showed a bought Formula's NAME and PRICE and nothing
    else — `specialUpgrades` is `{ id, name, cost, category }` and has no
    description field — and an imported one's text only in a `title`
    attribute, which is a hover tooltip on an app built for a 375px phone
    with no pointer. `formulaeHeld` resolves the text from the model's own
    entry instead of storing a copy, so a Dispatch that rewrites a Formula
    rewrites it here too.
  */
  const { dataset: cardDataset } = useDataset(
    (typeof window !== 'undefined'
      && window.localStorage.getItem('trenchline_ruleset')) || DEFAULT_RULESET_ID);
  const warbandFaction = useStore(
    (st) => st.warbands.find((w) => w.id === warbandId)?.factionId);
  const warbandRules = useStore(
    (st) => st.warbands.find((w) => w.id === warbandId)?.campaignRules);
  const warbandUnitsHere = useStore(
    (st) => st.warbands.find((w) => w.id === warbandId)?.units);
  const heldFormulae = React.useMemo(
    () => formulaeHeld(unit, catalogueUnitFor(cardDataset, unit, warbandFaction)),
    [cardDataset, unit, warbandFaction]);

  /*
    The second statline this model has been given, where its entry offers one
    (DA-02, finding N). A Fly Thrall moves 6"/Flying where the Thrall walks 5";
    a Guard Dog is its own profile. Null for a model that has taken none, which
    is every model whose entry states one profile.
  */
  const swapped = React.useMemo(
    () => swappedProfile(
      cardDataset,
      catalogueUnitFor(cardDataset, unit, warbandFaction),
      modelSelections(unit)),
    [cardDataset, unit, warbandFaction]);
  const shownStats = swapped ? swapped.stats : unit.profileSnapshot.stats;
  /* Injuries reaching the statline they modify — reported from a live game,
     where a Leg Wound left the printed Movement on the card. Computed after
     `swapped`, which it reads: a Leg Wound takes 2" off the statline the model
     actually has, and a Fly Thrall's is not the Thrall's. */
  const injuredMovement = effectiveMovement(
    shownStats.movementInches ? `${shownStats.movementInches}"` : shownStats.movement,
    unit.injuries ?? [],
    (cardDataset?.campaign?.trauma ?? DATASET.campaign.trauma) as TraumaRow[],
  );

  /*
    The abilities this MODEL prints, as equipped (DA-01).

    `profileSnapshot.innateAbilities` was resolved when the model was recruited,
    so it already answers for the Warband's Variant — `recruitable` applies
    `visibleAbilities` on the way in. What it cannot answer for is what the
    model is carrying NOW, and one shipped rule turns on exactly that: the
    Varangian Guard's Weapon Familiarity reads "They lose Shock Charge if they
    equip a shield together with a two-handed axe", which the catalogue states
    as a `set hidden=true` on Shock Charge conditioned on those two selections.

    So the card re-asks the question against the model's own entry. Where the
    entry cannot be resolved — an imported roster with a hand-written profile id
    — the snapshot stands, which is the roster's own record rather than a guess.
  */
  const warbandVariantId = useStore(
    (st) => st.warbands.find((w) => w.id === warbandId)?.variantId);
  const shownAbilities = React.useMemo(
    () => shownAbilitiesFor({
      dataset: cardDataset,
      entry: catalogueUnitFor(cardDataset, unit, warbandFaction),
      variant: cardDataset ? variantById(cardDataset, warbandVariantId) : undefined,
      unit,
    }),
    [cardDataset, unit, warbandFaction, warbandVariantId]);
  /*
    The Book of Golems, GOLEM-1.

    Offered only where the Warband has EARNED the grant — `campaignRules`
    carries what the roster's `Campaign Rules > Enabled` subtree said — and
    only on a model whose entry could be the one the row adds, which is an
    entry that offers Alchemical Formulae. The import marks the model where
    the roster can say which one (`golemOnImport`); this is the other half,
    for a roster where more than one model fits and for a Warband built in
    the app rather than imported.
  */
  const golemGrantHere = React.useMemo(() => golemGrant(cardDataset), [cardDataset]);
  const warbandHoldsBook = Boolean(golemGrantHere) && (warbandRules ?? []).some(
    (r) => r.trim().toLowerCase() === golemGrantHere!.name.trim().toLowerCase());
  const thisIsGolem = isGolem(unit);
  const couldBeGolem = warbandHoldsBook
    && (catalogueUnitFor(cardDataset, unit, warbandFaction)?.options ?? [])
      .some(isAlchemicalFormula);
  /* One grant, one model: another model already carrying the mark is named,
     so marking this one reads as MOVING it rather than as a second grant. */
  const golemElsewhere = (warbandUnitsHere ?? []).find(
    (u) => u.id !== unit.id && isGolem(u));

  /* Everything in `specialUpgrades` that is NOT a Formula — Strains, Sagas,
     Goetic Powers — which keep their own pills below. */
  const formulaIds = new Set(heldFormulae.map((f) => f.id).filter(Boolean));
  const otherUpgrades = (unit.specialUpgrades ?? []).filter((u) => !formulaIds.has(u.id));

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(unit.customName);
  const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
  const [isAdvancementModalOpen, setIsAdvancementModalOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isLoreModalOpen, setIsLoreModalOpen] = useState(false);
  const [isConfirmDismissOpen, setIsConfirmDismissOpen] = useState(false);
  const [isRetireOpen, setIsRetireOpen] = useState(false);
  /* Whether the Quartermaster Step offers to retire this model (p.123).
     Against the ruleset the card is READING, not the one bundled at build time:
     a player on another ruleset was being offered a retirement its own dataset
     may not state. */
  const retirement = mayRetire(cardDataset, unit);
  const [expandedAbilities, setExpandedAbilities] = useState<Record<string, boolean>>({});
  const [favouriteSaved, setFavouriteSaved] = useState(false);

  const isLeader = unit.profileSnapshot.category === 'Leader';
  const role = roleStyle(unit.profileSnapshot.category);
  const RoleIcon = role.icon;
  const glory = unitGlory(unit);

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
        className={`bg-theme-surface border rounded-md overflow-hidden shadow-lg transition-all flex flex-col justify-between bevel-container ${role.card}`}
      >
        
        {/* Card Header: Spacious, No Truncation, Clean 3-Dots Menu */}
        {/* Two rows, always: the badge and the actions share the first, and the
            name gets the second to itself. As one row, a warrior called "Kasim
            bin Malik, The Living Engineer, Master of Construction" was left
            about 90px in a three-column grid and wrapped a word per line.
            `contents` promotes the badge and the name to direct flex children
            so `order` and `basis-full` can place them without moving the JSX. */}
        {/* `data-role` is for `e2e/roles.spec.ts`, which reads the painted
            colours off a production build to prove the classes compiled. The
            role word itself is uppercased by CSS, so matching on it means
            matching rendered text — which is exactly the kind of coupling that
            makes a layout test fail for a copy change. */}
        <div
          data-role={unit.profileSnapshot.category}
          className={`px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 ${role.header}`}
        >
          <div className="contents">
            
            {/* Interactive Category Badge / Dropdown */}
            <div className="relative flex-shrink-0 order-1">
              <button
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                className={`tap text-xs sm:text-[10px] font-mono tracking-[0.11em] uppercase flex items-center gap-1 cursor-pointer transition-colors ${role.label}`}
                title="Click to change unit role"
              >
                {RoleIcon && <RoleIcon className="w-2.5 h-2.5" />}
                <span>{unit.profileSnapshot.category}</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>

              {/* Role Dropdown Menu */}
              {isCategoryMenuOpen && (
                <div className="absolute left-0 top-full mt-1 w-36 bg-theme-surface border border-theme-border rounded-md shadow-2xl z-30 py-1 font-mono text-xs">
                  {/* Each role with the mark it wears on the card, so the
                      language is learnt where the choice is made. A Trooper
                      has none, which is the whole reason the other three
                      read; the spacer keeps the four words in one column. */}
                  {(['Leader', 'Elite', 'Trooper', 'Mercenary'] as UnitCategory[]).map((cat) => {
                    const CatIcon = ROLE_STYLES[cat].icon;
                    return (
                      <button
                        key={cat}
                        onClick={() => handleCategorySelect(cat)}
                        className={`w-full px-2.5 py-1.5 text-left flex items-center space-x-2 hover:bg-theme-elevated transition-colors ${
                          unit.profileSnapshot.category === cat ? 'text-theme-primary font-bold' : 'text-theme-text'
                        }`}
                      >
                        {CatIcon
                          ? <CatIcon className={`w-3 h-3 ${ROLE_STYLES[cat].iconOffCard}`} />
                          : <span className="w-3 h-3" aria-hidden />}
                        <span>{cat}</span>
                      </button>
                    );
                  })}
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
                    role.filled ? 'text-theme-base' : 'text-theme-text group-hover:text-theme-primary'
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
            {/*
              Benched, and said on the card rather than only in the menu that
              set it. A model left out of the Force is still on the Roster and
              still looks exactly like one that is fielded — which is the
              whole difficulty of the rule: the Threshold caps what you field,
              and the list you are reading is what you own.
            */}
            {unit.benched && (
              <span
                className="font-mono text-xs sm:text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-theme-border text-theme-muted whitespace-nowrap"
                title="Sits this game out — not counted against the Threshold Value or Field Strength, and earns no Experience"
              >
                Sits out
              </span>
            )}
            {/*
              Cost badge — both currencies, because the app prices in two.

              It printed `{unit.totalCost} D` and nothing else, so a Mercenary
              hired for 4 Glory and no Ducats read `0 D`: a free model, on a
              card that gives no other hint it cost anything. See
              `rules/savedGlory.ts` for why the Glory is added up separately
              rather than folded into `totalCost`.
            */}
            <div className={`font-mono text-sm tabular-nums whitespace-nowrap ${
              role.filled ? 'text-theme-base' : 'text-theme-text'
            }`}>
              {formatUnitCost(unit.totalCost, glory)}
            </div>

            {/* Collapse toggle, beside the cost: the cost is the other thing
                you read when scanning, and the two are what a collapsed card
                still shows. */}
            <button
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              className={`min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 lg:p-1.5 flex items-center justify-center transition-colors ${
                role.filled ? 'text-theme-base hover:opacity-70' : 'text-theme-muted hover:text-theme-text'
              }`}
              title={collapsed ? 'Show the full warrior card' : 'Collapse to summary'}
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
            </button>

            {/* 3-Dots Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                /* Named, because it had no name at all: three dots and an
                   icon, which a screen reader reads as "button". */
                aria-label={`Actions for ${unit.customName}`}
                aria-expanded={isActionMenuOpen}
                className={`min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 lg:p-1.5 flex items-center justify-center transition-colors ${
                  role.filled ? 'text-theme-base hover:opacity-70' : 'text-theme-muted hover:text-theme-text'
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

                  {/*
                    The bench. "Any models you do not use will have to sit the
                    game out" (p.97) — the Threshold Value and Field Strength
                    cap the Force, and the roster is allowed to exceed both.
                    So this is a choice the player makes, not a correction the
                    app applies: nothing is removed and nothing is refused.
                  */}
                  <button
                    onClick={() => {
                      setUnitBenched(warbandId, unit.id, !unit.benched);
                      setIsActionMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2 text-theme-text hover:bg-theme-elevated hover:text-theme-primary transition-colors"
                  >
                    <Armchair className={`w-3.5 h-3.5 ${unit.benched ? 'text-theme-primary' : 'text-theme-muted'}`} />
                    <span>{unit.benched ? 'Bring back into the Force' : 'Sit this game out'}</span>
                  </button>

                  {/*
                    The Book of Golems, GOLEM-1.

                    The mark is `grantedBy` and nothing else; everything the
                    grant DOES — the free 50-Ducat Formula allowance, "can
                    never be Promoted", the Keyword swap — is derived from it.
                    Shown only where the Warband holds the grant and this
                    entry could be the model it adds, so it is not a menu item
                    on every warrior in the game.
                  */}
                  {couldBeGolem && (
                    <button
                      onClick={() => {
                        setUnitAsGolem(warbandId, unit.id, !thisIsGolem);
                        setIsActionMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left flex items-start space-x-2 text-theme-text hover:bg-theme-elevated hover:text-theme-primary transition-colors"
                    >
                      <FlaskConical className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${thisIsGolem ? 'text-theme-primary' : 'text-theme-muted'}`} />
                      <span className="space-y-0.5">
                        <span className="block">
                          {thisIsGolem
                            ? `Not the ${golemGrantHere!.name} model`
                            : `Created by the ${golemGrantHere!.name}`}
                        </span>
                        {/* Which model already carries it, so marking this one
                            reads as moving the grant rather than adding one. */}
                        {!thisIsGolem && golemElsewhere && (
                          <span className="block text-xs sm:text-[10px] text-theme-muted">
                            Moves it from {golemElsewhere.customName}.
                          </span>
                        )}
                      </span>
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

          {/*
            The Experience track, drawn the way the book draws it (FD-12 item 1).

            The number beside the name says how much; the track says how close
            the model is to its next Advancement Roll and where its cap stops it,
            which is the thing a player is actually looking for in the Promotion
            Step. Same component as the wizard's Promotions step and the Roster
            Sheet.
          */}
          <ExperienceTrack dataset={cardDataset} unit={unit} />

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
              /*
                Movement AFTER injuries.

                A Leg Wound reduces it by 2", and this card used to show the
                printed number — so a player checking a model between games saw
                a distance it can no longer move. The modifier is read out of
                the Trauma table's own text; see `rules/effectiveStats.ts`.
              */
              ['MOV', injuredMovement.effective, injuredMovement.delta !== 0
                ? `was ${injuredMovement.base}`
                : shownStats.movementType],
              ['RNG', shownStats.ranged, undefined],
              ['MELEE', shownStats.melee, undefined],
              ['ARMOUR', shownStats.armour, undefined],
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
              <KeywordText inline>{unit.profileSnapshot.battlekitNote}</KeywordText>
            </p>
          )}

          {/* Innate Abilities & Rules: Collapsed by Default with Expand Arrow */}
          {shownAbilities.length > 0 && (
            <div className="space-y-1">
              {shownAbilities.map((ab) => {
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
                      /* Keywords in the rule are tappable — see ui/KeywordText. */
                      <KeywordText className="text-theme-muted text-xs sm:text-[11px] pt-1.5 leading-relaxed border-t border-theme-border/40 mt-1">
                        {ab.description}
                      </KeywordText>
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
                {forcedBattlekit(unit.profileSnapshot).map((b) => {
                  /*
                    A forced WEAPON is still a weapon.

                    The row used to be a name and its Keyword chips, which says
                    everything there is to say about Reinforced Armour and far
                    too little about the Scripture Guardian's Vengeful
                    Scripture — Special, 18", with two rules that decide how it
                    is used. The same weapon bought from an Armoury Table
                    showed its whole row, so the model that always carries one
                    saw less of it than the model that paid.
                  */
                  const profile = battlekitProfile(b, DATASET.weapons);
                  const line = [profile?.type, profile?.range]
                    .filter((v) => v && v !== '-').join(' | ');
                  const ruleId = `kit-${b.linkId}`;
                  const ruleOpen = expandedAbilities[ruleId];
                  return (
                    <div
                      key={b.linkId}
                      className="text-xs bg-theme-base px-2 py-1 rounded border border-dashed border-theme-border"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/*
                          The name WRAPS rather than truncating. At 375px the
                          chips take the right-hand half of the row, and
                          "Vengeful Scripture" came out as "Vengeful Script…" —
                          a weapon the player then cannot look up. Two words on
                          two lines costs a row of height and says the whole
                          name.
                        */}
                        <div className="min-w-0">
                          <span className="font-semibold text-theme-text block">{b.name}</span>
                          {line && (
                            <span className="text-xs sm:text-[10px] font-mono text-theme-muted block">
                              {line}
                            </span>
                          )}
                        </div>
                        {b.keywords.length > 0 && (
                          /*
                            One chip per Keyword rather than a joined string, so
                            each is its own tap target. `KeywordChip` shows an
                            unrecognised one plain rather than guessing at it.
                          */
                          <span className="flex flex-wrap justify-end gap-1 flex-shrink-0">
                            {b.keywords.map((k) => (
                              <KeywordChip
                                key={k}
                                name={k}
                                className="font-mono text-xs sm:text-[10px] rounded px-1"
                              />
                            ))}
                          </span>
                        )}
                      </div>
                      {profile?.rules && (
                        <>
                          <button
                            onClick={() => toggleAbilityExpand(ruleId)}
                            className="w-full flex items-center justify-between text-left font-mono text-xs sm:text-[10px] uppercase text-theme-muted hover:text-theme-text transition-colors min-h-[44px] lg:min-h-0"
                          >
                            <span>{ruleOpen ? 'Hide rule' : 'Rule'}</span>
                            {ruleOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          {ruleOpen && (
                            <KeywordText className="text-theme-muted text-xs sm:text-[11px] pt-1.5 leading-relaxed border-t border-theme-border/40">
                              {profile.rules}
                            </KeywordText>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
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
                      <span className="text-xs sm:text-[10px] font-mono text-theme-primary whitespace-nowrap">
                        {formatUnitCost(wep.cost, wep.gloryCost ?? 0)}
                      </span>
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

          {/*
            ALCHEMICAL FORMULAE — FD-13a item 3.

            A row each rather than a strip of pills, because a Formula is a
            RULE and a rule needs its sentence. The pills carried a name and a
            price; the text was either nowhere (a Formula bought in the app)
            or in a `title` tooltip (one imported), and a tooltip is not
            reachable on the phone this layout is built for.
          */}
          {heldFormulae.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs sm:text-[10px] font-mono font-bold text-theme-primary uppercase tracking-wider flex items-center space-x-1">
                <Flame className="w-3 h-3" />
                <span>{ALCHEMICAL_FORMULAE} ({heldFormulae.length}):</span>
              </span>
              <div className="space-y-1">
                {heldFormulae.map((f) => (
                  <div
                    key={`${f.from}-${f.instanceId ?? f.id ?? f.name}`}
                    className="rounded border border-theme-primary/40 bg-theme-primary/10 px-2 py-1 space-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs sm:text-[10px] font-mono font-bold text-theme-primary">
                        {f.name}
                        {' '}
                        <span className="text-theme-muted">
                          {/* The entry's own, not a purchase: it cost nothing. */}
                          {f.from === 'innate'
                            ? '(from its entry)'
                            : `(${formatUnitCost(f.price.ducats, f.price.glory)})`}
                        </span>
                      </span>
                      {f.instanceId && (
                        <button
                          onClick={() => removeEquipment(warbandId, unit.id, f.instanceId!)}
                          className="tap text-theme-muted hover:text-status-error shrink-0"
                          aria-label={`Remove ${f.name}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {/*
                      The published sentence, with its Keywords tappable — the
                      statline effects a Formula gives are stated IN this text
                      ("base size of 32mm", "+1 DICE to its Melee
                      characteristic", "gains the Keyword TOUGH"), not in the
                      catalogue's modifiers, which carry only `hidden` and
                      `category`. Showing the sentence is what lets a player
                      apply them; deriving a statline from prose would be
                      inventing game data.
                    */}
                    {f.description && (
                      <KeywordText className="text-xs sm:text-[10px] text-theme-text leading-relaxed">
                        {f.description}
                      </KeywordText>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strains, Sagas, Goetic Powers — everything bought that is not a Formula */}
          {otherUpgrades.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs sm:text-[10px] font-mono font-bold text-theme-primary uppercase tracking-wider flex items-center space-x-1">
                <Flame className="w-3 h-3" />
                <span>{otherUpgrades[0].category}:</span>
              </span>
              <div className="flex flex-wrap gap-1">
                {otherUpgrades.map((upg) => (
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

              {/*
                Retire Injured Models, p.123 (RR-14).

                Offered here rather than in the action menu because the count
                that unlocks it is the row above: a player looking at two Battle
                Scars is looking at the reason. The threshold is the dataset's
                (`quartermaster.retireInjured.atScars`), never the Trauma Step's
                third-scar removal — see `rules/retire.ts`.
              */}
              {retirement.eligible && (
                <button
                  onClick={() => setIsRetireOpen(true)}
                  className="w-full min-h-[44px] lg:min-h-0 lg:py-1.5 flex items-center justify-center gap-1.5 rounded border border-theme-accent/50 bg-theme-surface font-mono text-xs sm:text-[10px] font-bold uppercase tracking-wider text-theme-accent transition-colors hover:bg-theme-accent hover:text-theme-base"
                >
                  <LogOut className="w-3 h-3 flex-shrink-0" />
                  <span>Retire at {retirement.scars} Battle Scars</span>
                </button>
              )}
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

      {/* Retire Injured Models — the Quartermaster Step's own removal. */}
      {isRetireOpen && (
        <RetireUnitModal
          warbandId={warbandId}
          unit={unit}
          /* The card's own ruleset, so the modal and the button that opened it
             cannot disagree about whether the rule exists. */
          dataset={cardDataset}
          onClose={() => setIsRetireOpen(false)}
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
