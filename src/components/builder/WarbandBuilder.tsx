'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { UnitCard } from './UnitCard';
import { AddUnitModal } from './AddUnitModal';
import { ExportModal } from './ExportModal';
import { ArmoryStashModal } from './ArmoryStashModal';
import { WarbandChronicleModal } from './WarbandChronicleModal';
import { WarbandChangelogModal } from './WarbandChangelogModal';
import { soundEffects } from '../../services/soundEffects';
import { LegalityStrip } from './LegalityStrip';
import { RulesetSwitcher } from './RulesetSwitcher';
import { VariantPicker } from './VariantPicker';
import { useDataset } from '../../rules/useDataset';
import { variantById } from '../../rules/variants';
import { forceLimits, campaignGameOf } from '../../rules/campaign';
import { DEFAULT_RULESET_ID, rulesetInfo } from '../../rules/rulesets';
import { 
  ChevronDown,
  UserPlus, 
  Coins, 
  Sparkles, 
  FileText, 
  Share2, 
  ShieldAlert,
  Archive,
  Crown,
  Scroll,
  History,
  Edit2,
  Check,
  Flag,
  Lock,
} from 'lucide-react';

export const WarbandBuilder: React.FC = () => {
  const { 
    getActiveWarband, 
    factions, 
    updateWarbandNotes, 
    updateWarbandDucatLimit,
    updateWarbandTreasury,
    updateWarbandGlory,
    updateWarbandVariant,
    campaign
  } = useStore();
  
  const warband = getActiveWarband();
  // The generated ruleset, served rather than bundled. Legality is the first
  // thing in the app to read it; nothing else has migrated yet.
  // Which ruleset this session is building against. Persisted per browser, so
  // it survives a reload; the reconciliation screen is what makes changing it
  // safe (docs/RULESET-MODEL.md §8).
  const [rulesetId, setRulesetId] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_RULESET_ID;
    return window.localStorage.getItem('trenchline_ruleset') || DEFAULT_RULESET_ID;
  });
  const [isRulesetOpen, setIsRulesetOpen] = useState(false);
  const [isVariantOpen, setIsVariantOpen] = useState(false);
  const { dataset, loading: datasetLoading, error: datasetError } = useDataset(rulesetId);
  
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isStashOpen, setIsStashOpen] = useState(false);
  const [isChronicleOpen, setIsChronicleOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [collapseAll, setCollapseAll] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  // Budget & Limit Edit Modal State
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editLimit, setEditLimit] = useState<number>(warband?.ducatLimit || 700);
  const [editTreasury, setEditTreasury] = useState<number>(warband?.treasuryDucats || 0);
  const [editGlory, setEditGlory] = useState<number>(warband?.gloryPoints || 0);

  if (!warband) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm font-mono text-theme-muted">No active warband selected.</p>
      </div>
    );
  }

  const faction = factions.find((f) => f.id === warband.factionId);
  // Matched by id or name, so a warband saved with either spelling resolves.
  const activeVariant = dataset ? variantById(dataset, warband.variantId) : undefined;

  // A campaign warband's limit is published, not chosen: it comes from the
  // Warband Threshold Table for the game being prepared for. Only an
  // unrestricted warband has a number the player owns.
  const isCampaignForce = warband.forceMode !== 'unrestricted';
  const limits = dataset && isCampaignForce
    ? forceLimits(dataset, campaignGameOf(warband, campaign))
    : null;
  const totalCost = warband.units.reduce((sum, u) => sum + u.totalCost, 0);
  const isOverBudget = totalCost > warband.ducatLimit;

  // Total unequipped stash items
  const totalStashItems = Array.isArray(warband.armoryStash) ? warband.armoryStash.length : 0;

  // Validation Rules
  const hasLeader = warband.units.some((u) => u.profileSnapshot.category === 'Leader');
  const eliteCount = warband.units.filter((u) => u.profileSnapshot.category === 'Elite').length;
  const trooperCount = warband.units.filter((u) => u.profileSnapshot.category === 'Trooper').length;
  const mercenaryCount = warband.units.filter((u) => u.profileSnapshot.category === 'Mercenary').length;

  const filteredUnits = warband.units.filter((u) => {
    if (activeCategoryFilter === 'All') return true;
    return u.profileSnapshot.category === activeCategoryFilter;
  });

  const handleOpenBudgetModal = () => {
    setEditLimit(warband.ducatLimit);
    setEditTreasury(warband.treasuryDucats || 0);
    setEditGlory(warband.gloryPoints || 0);
    setIsBudgetModalOpen(true);
  };

  const handleSaveBudget = () => {
    updateWarbandDucatLimit(warband.id, editLimit);
    updateWarbandTreasury(warband.id, editTreasury);
    updateWarbandGlory(warband.id, editGlory);
    soundEffects.playDiceRoll();
    setIsBudgetModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Warband Command Header */}
      {/*
        The warband masthead.

        Three bands stacked, not a two-column header: an identity band, a
        toolbar rail, and a ledger strip of numbers. The old header put the
        identity and a seven-button toolbar side by side, which is a layout
        that only has one good size — at 768px the buttons wrapped into three
        ragged rows beside a squeezed title, and at 375px the faction name
        broke over four lines.

        Bands stack the same way at every width. The only thing that changes
        with the viewport is how the middle band handles overflow: it scrolls
        sideways on a phone rather than wrapping, because a toolbar that
        reflows moves the button you were reaching for.
      */}
      <div className="bg-theme-surface border border-theme-border relative bevel-container">

        {/* Identity */}
        <div className="border-l-2 border-l-theme-primary p-4 sm:p-6 space-y-2.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: faction?.color || '#D4AF37' }}
            />
            <span className="eyebrow accent font-bold">{faction?.name}</span>
            {warband.patron && (
              <>
                <span className="text-theme-muted text-xs" aria-hidden="true">/</span>
                <span className="eyebrow truncate max-w-[14rem] sm:max-w-sm">{warband.patron}</span>
              </>
            )}
          </div>

          <h1 className="font-gothic text-[1.75rem] leading-[1.05] sm:text-4xl lg:text-5xl text-theme-text tracking-tight break-words">
            {warband.name}
          </h1>

          {warband.motto ? (
            <button
              onClick={() => setIsChronicleOpen(true)}
              className="tap block text-left border-l-2 border-theme-border hover:border-theme-primary pl-2.5 py-0.5 flavour text-sm transition-colors"
              title="Click to view full Warband Chronicle & Lore Dossier"
            >
              &ldquo;{warband.motto}&rdquo;
            </button>
          ) : (
            <p className="flavour text-sm max-w-xl">{faction?.tagline}</p>
          )}
        </div>

        {/*
          Toolbar rail.

          One primary action and six secondary ones. `overflow-x-auto` with a
          `min-w-max` track is the sanctioned way to carry a wide row on a
          narrow screen (docs/MOBILE.md) — the alternative is wrapping, and a
          wrapping toolbar is a toolbar whose buttons move.

          The negative margins let the strip bleed to the container edge so the
          last button is visibly cut off, which is what tells you it scrolls.
        */}
        <div className="border-t border-theme-border p-4 sm:p-6 space-y-3">
          <button
            onClick={() => setIsAddUnitOpen(true)}
            className="w-full lg:w-auto flex items-center justify-center lg:justify-start space-x-2 px-4 py-3 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-mono text-xs font-bold uppercase tracking-widest transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Recruit Warrior</span>
          </button>

          <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              <button
                onClick={() => setIsChronicleOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-theme-base hover:bg-theme-elevated text-theme-primary border border-theme-border hover:border-theme-primary font-mono text-xs font-bold uppercase transition-colors"
                title="House Chronicle & Lore Dossier"
              >
                <Scroll className="w-4 h-4" />
                <span>Chronicle</span>
              </button>

              <button
                onClick={() => setIsChangelogOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-theme-base hover:bg-theme-elevated text-theme-text border border-theme-border hover:border-theme-primary font-mono text-xs font-bold uppercase transition-colors"
                title="Warband Growth Chronicle & Changelog"
              >
                <History className="w-4 h-4 text-theme-primary" />
                <span>History ({warband.snapshots?.length || 1})</span>
              </button>

              <button
                onClick={() => setIsStashOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-theme-base hover:bg-theme-elevated text-theme-primary border border-theme-border hover:border-theme-primary font-mono text-xs font-bold uppercase transition-colors"
                title="View & manage unassigned munitions in Warband Stash"
              >
                <Archive className="w-4 h-4" />
                <span>Stash ({totalStashItems})</span>
              </button>

              <button
                onClick={() => setIsRulesetOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-theme-base hover:bg-theme-elevated text-theme-text border border-theme-border hover:border-theme-primary font-mono text-xs font-bold uppercase transition-colors"
                title="Which rules this warband is built and checked against"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-legal" />
                <span>{rulesetInfo(rulesetId)?.name ?? rulesetId}</span>
              </button>

              <button
                onClick={() => setIsVariantOpen(true)}
                disabled={!dataset}
                className="flex items-center space-x-1.5 px-3 py-2 bg-theme-base hover:bg-theme-elevated text-theme-text border border-theme-border hover:border-theme-primary font-mono text-xs font-bold uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Which Warband Variant this warband is built as"
              >
                <Flag className="w-4 h-4" />
                <span>{activeVariant?.name ?? 'Standard list'}</span>
              </button>

              <button
                onClick={() => setIsExportOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-theme-base hover:bg-theme-elevated text-theme-text border border-theme-border hover:border-theme-primary font-mono text-xs font-bold uppercase transition-colors"
                title="Export & Print"
              >
                <Share2 className="w-4 h-4" />
                <span>Export</span>
              </button>

              <button
                onClick={() => setIsNotesOpen(!isNotesOpen)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-theme-base hover:bg-theme-elevated text-theme-text border border-theme-border hover:border-theme-primary font-mono text-xs font-bold uppercase transition-colors"
                title="Campaign Notes"
              >
                <FileText className="w-4 h-4" />
                <span>Notes</span>
              </button>
            </div>
          </div>
        </div>

        {isVariantOpen && dataset && (
          <VariantPicker
            dataset={dataset}
            factionId={warband.factionId}
            factionName={faction?.name}
            current={warband.variantId}
            onPick={(id) => {
              updateWarbandVariant(warband.id, id);
              setIsVariantOpen(false);
            }}
            onClose={() => setIsVariantOpen(false)}
          />
        )}

        {isRulesetOpen && dataset && (
          <RulesetSwitcher
            current={rulesetId}
            currentDataset={dataset}
            rosterUnitNames={warband.units.map((u) => u.profileSnapshot?.name ?? u.customName)}
            onApply={(id) => {
              setRulesetId(id);
              window.localStorage.setItem('trenchline_ruleset', id);
              setIsRulesetOpen(false);
            }}
            onClose={() => setIsRulesetOpen(false)}
          />
        )}

        {/*
          The ledger strip.

          Budget over the full width, then treasury and composition beside each
          other. The old grid went straight from one column to four at `md:`,
          which is 768px — four cells of 180px each, and "TROOPERS" in a 9px
          font because that was the only size it fitted at. Two columns at
          `md:` and four only at `lg:` keeps every label at a readable 10px.
        */}
        <div className="border-t border-theme-border grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 divide-theme-border">

          {/* Budget */}
          <div className="md:col-span-2 lg:col-span-2 p-4 sm:p-5 space-y-2 md:border-b lg:border-b-0 md:border-theme-border lg:border-r lg:border-theme-border">
            <div className="flex flex-wrap justify-between items-center gap-2 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="eyebrow flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-theme-primary" />
                  <span>Ducat Limit</span>
                </span>
                {isCampaignForce ? (
                  /* Not editable, and it says why rather than just being absent:
                     a player who cannot find the button should learn that the
                     number is published, not that the app lost a feature. */
                  <span
                    className="px-1.5 py-0.5 bg-theme-elevated text-theme-muted border border-theme-border text-xs sm:text-[10px] uppercase font-bold flex items-center space-x-1"
                    title={limits
                      ? `Game ${limits.game} of the campaign. Set by the Warband Threshold Table, not by hand.`
                      : 'Set by the Warband Threshold Table, not by hand.'}
                  >
                    <Lock className="w-2.5 h-2.5" />
                    <span>{limits ? `Game ${limits.game}` : 'Campaign'}</span>
                  </span>
                ) : (
                  <button
                    onClick={handleOpenBudgetModal}
                    className="tap px-1.5 py-0.5 bg-theme-elevated hover:bg-theme-border text-theme-primary border border-theme-primary/50 text-xs sm:text-[10px] uppercase font-bold flex items-center space-x-1 transition-colors"
                    title="Manually adjust warband Ducat Point Limit"
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              <span className={`font-bold tabular-nums ${isOverBudget ? 'text-status-error' : 'text-theme-text'}`}>
                {totalCost} / {warband.ducatLimit} D
              </span>
            </div>

            <div className={`meter ${isOverBudget ? '' : 'accent'}`}>
              <i
                style={{
                  width: `${Math.min(100, (totalCost / warband.ducatLimit) * 100)}%`,
                  background: isOverBudget ? 'rgb(var(--status-error))' : undefined,
                }}
              />
            </div>
          </div>

          {/* Treasury & Glory (clickable to edit) */}
          <button
            onClick={handleOpenBudgetModal}
            className="p-4 sm:p-5 text-left bg-transparent hover:bg-theme-elevated transition-colors group lg:border-r lg:border-theme-border"
            title="Click to adjust Treasury Ducats & Glory Points"
          >
            <span className="eyebrow flex items-center gap-1.5">
              <span>Stores</span>
              <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <span className="mt-1.5 grid grid-cols-2 divide-x divide-theme-border font-mono">
              <span className="block pr-3">
                <span className="block text-xs sm:text-[10px] uppercase tracking-wider text-theme-muted">Treasury</span>
                <span className="block font-bold text-theme-primary tabular-nums">{warband.treasuryDucats} D</span>
              </span>
              <span className="block pl-3">
                <span className="block text-xs sm:text-[10px] uppercase tracking-wider text-theme-muted">Glory</span>
                <span className="flex items-center gap-1 font-bold text-theme-primary tabular-nums">
                  <Sparkles className="w-3 h-3" />
                  {warband.gloryPoints}
                </span>
              </span>
            </span>
          </button>

          {/* Composition */}
          <div className="p-4 sm:p-5">
            <span className="eyebrow block">Composition</span>
            <div className="mt-1.5 grid grid-cols-4 divide-x divide-theme-border font-mono">
              {([
                ['Leader', hasLeader ? '1/1' : '0/1', hasLeader ? 'text-status-legal' : 'text-status-error'],
                ['Elite', String(eliteCount), 'text-theme-text'],
                ['Troop', String(trooperCount), 'text-theme-text'],
                ['Merc', String(mercenaryCount), 'text-theme-text'],
              ] as const).map(([label, value, tone], i) => (
                <div key={label} className={i === 0 ? 'pr-2' : 'px-2 last:pr-0'}>
                  <span className="block text-xs sm:text-[10px] uppercase tracking-wider text-theme-muted">{label}</span>
                  <span className={`block font-bold tabular-nums ${tone}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Validation Warnings */}
        {(!hasLeader || isOverBudget) && (
          <div className="border-t-2 border-status-error bg-status-error/10 p-4 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-status-error">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-px" />
              <div className="space-y-1">
                {!hasLeader && (
                  <p>
                    • Roster requires exactly 1 Leader warrior. Appoint below or click the crown <Crown className="w-3 h-3 inline text-theme-primary" /> on any warrior card.
                  </p>
                )}
                {isOverBudget && (
                  <p>
                    • Roster exceeds the {warband.ducatLimit} Ducat point limit by {totalCost - warband.ducatLimit} Ducats.
                  </p>
                )}
              </div>
            </div>
            {isOverBudget && (
              <button
                onClick={handleOpenBudgetModal}
                className="px-3 py-2 bg-status-error text-theme-base uppercase font-bold text-xs tracking-wider flex-shrink-0 transition-colors hover:opacity-90"
              >
                Adjust Limit
              </button>
            )}
          </div>
        )}

        {/* Roster legality, from the generated ruleset. */}
        {datasetError ? (
          <div className="border-t-2 border-status-error bg-status-error/10 px-4 py-2.5 text-xs font-mono text-status-error">
            Legality unavailable: {datasetError}
          </div>
        ) : datasetLoading ? (
          <div className="border-t border-theme-border bg-theme-elevated px-4 py-2.5 text-xs font-mono text-theme-muted">
            Checking legality…
          </div>
        ) : dataset ? (
          <LegalityStrip warband={warband} dataset={dataset} rulesetId={rulesetId} />
        ) : null}

      </div>

      {/* Campaign Notes Popover */}
      {isNotesOpen && (
        <div className="bg-theme-surface border border-theme-border rounded-md p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-theme-primary uppercase font-bold flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Warband Field Journal & Notes</span>
            </span>
            <button
              onClick={() => setIsNotesOpen(false)}
              className="text-theme-muted hover:text-theme-text text-xs"
            >
              ✕
            </button>
          </div>
          <textarea
            value={warband.notes || ''}
            onChange={(e) => updateWarbandNotes(warband.id, e.target.value)}
            placeholder="Record post-match casualty notes, campaign upgrades, tactical reminders, or narrative deeds..."
            className="w-full h-28 bg-theme-base border border-theme-border rounded p-3 text-xs font-mono text-theme-text focus:outline-none focus:border-theme-primary"
          />
        </div>
      )}

      {/* Category Filter Pills, and the roster-wide collapse. */}
      <div className="flex items-center gap-2">
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 min-w-0">
        {['All', 'Leader', 'Elite', 'Trooper', 'Mercenary'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all whitespace-nowrap ${
              activeCategoryFilter === cat
                ? 'bg-theme-primary text-theme-base shadow'
                : 'bg-theme-surface text-theme-muted hover:text-theme-text border border-theme-border'
            }`}
          >
            {cat} ({cat === 'All' ? warband.units.length : warband.units.filter((u) => u.profileSnapshot.category === cat).length})
          </button>
        ))}
      </div>

        {/*
          Collapse the roster in one tap.

          Nine warriors at full detail is roughly 6,000px of scroll on a phone,
          and the common task — checking who is in the warband and what they
          cost — needs the header and the statline. Collapse the lot, then open
          the one you are editing; a card's own chevron overrides this.
        */}
        <button
          onClick={() => setCollapseAll((c) => !c)}
          aria-pressed={collapseAll}
          className="flex items-center gap-1.5 px-3 py-2 bg-theme-surface hover:bg-theme-elevated text-theme-text border border-theme-border font-mono text-xs font-bold uppercase transition-colors flex-shrink-0 ml-auto"
          title={collapseAll ? 'Show every warrior in full' : 'Collapse every warrior to a summary'}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${collapseAll ? '-rotate-90' : ''}`} />
          <span className="hidden sm:inline">{collapseAll ? 'Expand all' : 'Collapse all'}</span>
        </button>
      </div>

      {/* Unit Cards Grid */}
      {filteredUnits.length === 0 ? (
        <div className="bg-theme-surface border-2 border-dashed border-theme-border rounded-md p-12 text-center space-y-4 bevel-container">
          <p className="text-xs font-mono text-theme-muted">No warriors in this category.</p>
          <button
            onClick={() => setIsAddUnitOpen(true)}
            className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-mono text-xs font-bold uppercase rounded"
          >
            Recruit First Warrior
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUnits.map((unit) => (
            <UnitCard key={unit.id} warbandId={warband.id} unit={unit} collapseAll={collapseAll} />
          ))}
        </div>
      )}

      {/* RECRUIT UNIT MODAL */}
      {isAddUnitOpen && (
        <AddUnitModal
          warbandId={warband.id}
          factionId={warband.factionId}
          onClose={() => setIsAddUnitOpen(false)}
        />
      )}

      {/* EXPORT / PRINT ROSTER MODAL */}
      {isExportOpen && (
        <ExportModal
          warband={warband}
          onClose={() => setIsExportOpen(false)}
        />
      )}

      {/* ARMORY STASH MODAL */}
      {isStashOpen && (
        <ArmoryStashModal
          warband={warband}
          onClose={() => setIsStashOpen(false)}
        />
      )}

      {/* HOUSE CHRONICLE & LORE DOSSIER MODAL */}
      {isChronicleOpen && (
        <WarbandChronicleModal
          warband={warband}
          onClose={() => setIsChronicleOpen(false)}
        />
      )}

      {/* WARBAND CHANGELOG & GROWTH SNAPSHOTS MODAL */}
      {isChangelogOpen && (
        <WarbandChangelogModal
          warband={warband}
          onClose={() => setIsChangelogOpen(false)}
        />
      )}

      {/* EDIT WARBAND BUDGET & STATS MODAL */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-mono text-xs">
          <div className="bg-theme-surface border-2 border-theme-primary w-full max-w-lg rounded-md shadow-2xl overflow-hidden bevel-container flex flex-col">
            
            {/* Header */}
            <div className="p-4 bg-theme-base border-b border-theme-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-theme-primary" />
                <h3 className="font-gothic font-bold text-base text-theme-text">
                  WARBAND BUDGET & CAMPAIGN LEDGER
                </h3>
              </div>
              <button
                onClick={() => setIsBudgetModalOpen(false)}
                className="text-theme-muted hover:text-theme-text"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5">
              
              {/* Ducat Limit Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-[10px] uppercase font-bold text-theme-primary block">
                    1. Ducat Point Limit (Match Budget):
                  </label>
                  <span className="text-theme-muted text-xs sm:text-[11px]">Current: {warband.ducatLimit} D</span>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={100}
                    max={5000}
                    step={10}
                    value={editLimit}
                    onChange={(e) => setEditLimit(parseInt(e.target.value, 10) || 700)}
                    className="flex-1 bg-theme-base border-2 border-theme-primary rounded p-2.5 text-sm font-bold text-theme-text focus:outline-none"
                  />
                  <span className="text-xs font-bold text-theme-primary">Ducats</span>
                </div>

                {/* Preset Quick Limit Buttons */}
                <div className="space-y-1 pt-1">
                  <span className="text-xs sm:text-[10px] text-theme-muted block uppercase">Standard Rulebook Limits:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      { label: '700 D (Standard Skirmish)', value: 700 },
                      { label: '1,000 D (Patrol)', value: 1000 },
                      { label: '1,220 D (Campaign)', value: 1220 },
                      { label: '1,500 D (Grand Crusade)', value: 1500 },
                      { label: '2,000 D (Apocalypse)', value: 2000 }
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => setEditLimit(preset.value)}
                        className={`py-1.5 px-2 rounded text-xs sm:text-[10px] font-bold transition-all border ${
                          editLimit === preset.value
                            ? 'bg-theme-primary text-theme-base border-theme-primary'
                            : 'bg-theme-base text-theme-muted hover:text-theme-text border-theme-border'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Treasury Ducats */}
              <div className="space-y-2 pt-3 border-t border-theme-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted block">
                    2. Unspent Treasury Ducats:
                  </label>
                  <span className="text-theme-muted text-xs sm:text-[11px]">Unspent Cash</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={0}
                    value={editTreasury}
                    onChange={(e) => setEditTreasury(parseInt(e.target.value, 10) || 0)}
                    className="flex-1 bg-theme-base border border-theme-border rounded p-2 text-xs font-bold text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                  <button
                    onClick={() => setEditTreasury((prev) => prev + 50)}
                    className="px-2.5 py-2 bg-theme-elevated hover:bg-theme-border text-theme-text rounded border border-theme-border text-xs sm:text-[10px] font-bold"
                  >
                    +50 D
                  </button>
                  <button
                    onClick={() => setEditTreasury((prev) => prev + 100)}
                    className="px-2.5 py-2 bg-theme-elevated hover:bg-theme-border text-theme-text rounded border border-theme-border text-xs sm:text-[10px] font-bold"
                  >
                    +100 D
                  </button>
                </div>
              </div>

              {/* Glory Points */}
              <div className="space-y-2 pt-3 border-t border-theme-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted block">
                    3. Campaign Glory Points:
                  </label>
                  <span className="text-theme-muted text-xs sm:text-[11px]">Glory Level</span>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={0}
                    value={editGlory}
                    onChange={(e) => setEditGlory(parseInt(e.target.value, 10) || 0)}
                    className="flex-1 bg-theme-base border border-theme-border rounded p-2 text-xs font-bold text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                  <button
                    onClick={() => setEditGlory((prev) => Math.max(0, prev - 1))}
                    className="w-8 h-8 bg-theme-elevated hover:bg-theme-border text-theme-text rounded border border-theme-border font-bold"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => setEditGlory((prev) => prev + 1)}
                    className="w-8 h-8 bg-theme-elevated hover:bg-theme-border text-theme-primary rounded border border-theme-border font-bold"
                  >
                    +1
                  </button>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-3 bg-theme-base border-t border-theme-border flex items-center justify-between">
              <button
                onClick={() => setIsBudgetModalOpen(false)}
                className="px-4 py-1.5 bg-theme-elevated hover:bg-theme-border text-theme-muted hover:text-theme-text rounded uppercase font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBudget}
                className="px-6 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-base rounded uppercase font-bold text-xs shadow-lg flex items-center space-x-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Budget & Stats</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
