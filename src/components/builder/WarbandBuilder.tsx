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
import { useDataset } from '../../rules/useDataset';
import { DEFAULT_RULESET_ID, rulesetInfo } from '../../rules/rulesets';
import { 
  UserPlus, 
  Coins, 
  Sparkles, 
  AlertCircle, 
  FileText, 
  Swords, 
  Share2, 
  ShieldAlert,
  Archive,
  ChevronRight,
  Info,
  Crown,
  Scroll,
  BookOpen,
  History,
  Edit2,
  X,
  Check,
  Plus,
  Minus,
  Settings
} from 'lucide-react';

export const WarbandBuilder: React.FC = () => {
  const { 
    getActiveWarband, 
    factions, 
    setCurrentView, 
    updateWarbandNotes, 
    setUnitAsLeader,
    updateWarbandDucatLimit,
    updateWarbandTreasury,
    updateWarbandGlory
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
  const { dataset, loading: datasetLoading, error: datasetError } = useDataset(rulesetId);
  
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isStashOpen, setIsStashOpen] = useState(false);
  const [isChronicleOpen, setIsChronicleOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
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
        <p className="text-sm font-mono text-[#8E95A5]">No active warband selected.</p>
      </div>
    );
  }

  const faction = factions.find((f) => f.id === warband.factionId);
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
      <div className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 shadow-xl relative overflow-hidden bevel-container">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: faction?.color || '#D4AF37' }} 
              />
              <span className="text-xs font-mono uppercase font-bold text-[#D4AF37] tracking-wider">
                {faction?.name}
              </span>
              {warband.patron && (
                <>
                  <span className="text-[#8E95A5]">•</span>
                  <span className="text-xs font-mono text-[#8E95A5] truncate max-w-sm">
                    {warband.patron}
                  </span>
                </>
              )}
            </div>
            <h1 className="font-gothic font-bold text-2xl sm:text-3xl text-[#ECEFF4] tracking-wide">
              {warband.name}
            </h1>
            {warband.motto ? (
              <div 
                onClick={() => setIsChronicleOpen(true)}
                className="inline-block p-1.5 bg-[#0C0E12] border-l-2 border-[#D4AF37] rounded-r text-xs italic text-[#ECEFF4] font-serif cursor-pointer hover:border-[#E5C158] transition-colors"
                title="Click to view full Warband Chronicle & Lore Dossier"
              >
                &quot;{warband.motto}&quot;
              </div>
            ) : (
              <p className="text-xs text-[#8E95A5] max-w-xl">{faction?.tagline}</p>
            )}
          </div>

          {/* Builder Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsChronicleOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#20242E] hover:bg-[#323846] text-[#D4AF37] border border-[#D4AF37]/50 rounded font-mono text-xs font-bold uppercase transition-colors shadow"
              title="House Chronicle & Lore Dossier"
            >
              <Scroll className="w-4 h-4" />
              <span>House Chronicle</span>
            </button>

            <button
              onClick={() => setIsChangelogOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] rounded font-mono text-xs font-bold uppercase transition-colors"
              title="Warband Growth Chronicle & Changelog"
            >
              <History className="w-4 h-4 text-[#D4AF37]" />
              <span>Growth History ({warband.snapshots?.length || 1})</span>
            </button>

            <button
              onClick={() => setIsStashOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#20242E] hover:bg-[#323846] text-[#D4AF37] border border-[#D4AF37]/40 rounded font-mono text-xs font-bold uppercase transition-colors"
              title="View & manage unassigned munitions in Warband Stash"
            >
              <Archive className="w-4 h-4" />
              <span>Stash ({totalStashItems})</span>
            </button>

            <button
              onClick={() => setIsAddUnitOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black rounded font-mono text-xs font-bold uppercase tracking-wider transition-all shadow"
            >
              <UserPlus className="w-4 h-4" />
              <span>Recruit Warrior</span>
            </button>

            <button
              onClick={() => setIsRulesetOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] rounded font-mono text-xs font-bold uppercase transition-colors"
              title="Which rules this warband is built and checked against"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#4E9A6E]" />
              <span>{rulesetInfo(rulesetId)?.name ?? rulesetId}</span>
            </button>

            <button
              onClick={() => setIsExportOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] rounded font-mono text-xs font-bold uppercase transition-colors"
              title="Export & Print"
            >
              <Share2 className="w-4 h-4" />
              <span>Export</span>
            </button>

            <button
              onClick={() => setIsNotesOpen(!isNotesOpen)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] rounded font-mono text-xs font-bold uppercase transition-colors"
              title="Campaign Notes"
            >
              <FileText className="w-4 h-4" />
              <span>Notes</span>
            </button>
          </div>
        </div>

        {/* Roster legality, from the generated ruleset. */}
        {datasetError ? (
          <div className="mt-6 -mx-6 -mb-6 px-4 py-2.5 bg-[#8B0000]/15 border-t border-[#8B0000]/50 text-xs font-mono text-[#E53935]">
            Legality unavailable: {datasetError}
          </div>
        ) : datasetLoading ? (
          <div className="mt-6 -mx-6 -mb-6 px-4 py-2.5 bg-[#20242E] border-t border-[#323846] text-xs font-mono text-[#8E95A5]">
            Checking legality…
          </div>
        ) : dataset ? (
          <div className="mt-6 -mx-6 -mb-6">
            <LegalityStrip warband={warband} dataset={dataset} />
          </div>
        ) : null}

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

        {/* Budget Bar & Validation Stats */}
        <div className="mt-6 pt-4 border-t border-[#323846] grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          
          {/* Budget Meter with Edit Limit Trigger */}
          <div className="md:col-span-2 space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <div className="flex items-center space-x-2">
                <span className="text-[#8E95A5] flex items-center space-x-1">
                  <Coins className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Ducat Point Limit:</span>
                </span>
                <button
                  onClick={handleOpenBudgetModal}
                  className="px-1.5 py-0.5 rounded bg-[#20242E] hover:bg-[#323846] text-[#D4AF37] border border-[#D4AF37]/50 text-[10px] uppercase font-bold flex items-center space-x-1 transition-colors"
                  title="Manually adjust warband Ducat Point Limit"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                  <span>Edit Limit</span>
                </button>
              </div>

              <span className={`font-bold ${isOverBudget ? 'text-[#E53935]' : 'text-[#ECEFF4]'}`}>
                {totalCost} / {warband.ducatLimit} Ducats
              </span>
            </div>

            <div className="w-full bg-[#0C0E12] h-2.5 rounded-full overflow-hidden border border-[#323846]">
              <div
                className={`h-full transition-all duration-300 ${
                  isOverBudget ? 'bg-[#E53935]' : 'bg-[#D4AF37]'
                }`}
                style={{ width: `${Math.min(100, (totalCost / warband.ducatLimit) * 100)}%` }}
              />
            </div>
          </div>

          {/* Treasury & Glory (Clickable to Edit) */}
          <div 
            onClick={handleOpenBudgetModal}
            className="flex items-center justify-around bg-[#0C0E12] hover:bg-[#161920] p-2 rounded border border-[#323846] hover:border-[#D4AF37]/60 font-mono text-xs cursor-pointer transition-colors group"
            title="Click to adjust Treasury Ducats & Glory Points"
          >
            <div className="text-center">
              <span className="text-[10px] text-[#8E95A5] block flex items-center justify-center space-x-1">
                <span>TREASURY</span>
                <Edit2 className="w-2.5 h-2.5 text-[#8E95A5] opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
              <span className="font-bold text-[#D4AF37]">{warband.treasuryDucats} D</span>
            </div>
            <div className="h-6 w-[1px] bg-[#323846]" />
            <div className="text-center">
              <span className="text-[10px] text-[#8E95A5] block flex items-center justify-center space-x-1">
                <span>GLORY</span>
                <Edit2 className="w-2.5 h-2.5 text-[#8E95A5] opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
              <span className="font-bold text-[#D4AF37] flex items-center justify-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>{warband.gloryPoints}</span>
              </span>
            </div>
          </div>

          {/* Composition Badges */}
          <div className="flex items-center justify-around bg-[#0C0E12] p-2 rounded border border-[#323846] font-mono text-[11px]">
            <div className="text-center">
              <span className="text-[9px] text-[#8E95A5] block">LEADER</span>
              <span className={hasLeader ? 'text-[#4E9A6E] font-bold' : 'text-[#E53935] font-bold'}>
                {hasLeader ? '1/1' : '0/1'}
              </span>
            </div>
            <div className="text-center">
              <span className="text-[9px] text-[#8E95A5] block">ELITES</span>
              <span className="font-bold text-[#ECEFF4]">{eliteCount}</span>
            </div>
            <div className="text-center">
              <span className="text-[9px] text-[#8E95A5] block">TROOPERS</span>
              <span className="font-bold text-[#ECEFF4]">{trooperCount}</span>
            </div>
            <div className="text-center">
              <span className="text-[9px] text-[#8E95A5] block">MERC</span>
              <span className="font-bold text-[#ECEFF4]">{mercenaryCount}</span>
            </div>
          </div>

        </div>

        {/* Validation Warnings */}
        {(!hasLeader || isOverBudget) && (
          <div className="mt-4 p-3 bg-[#8B0000]/20 border border-[#8B0000] rounded text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#E53935]">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <div>
                {!hasLeader && (
                  <p>
                    • Roster requires exactly 1 Leader warrior. Appoint below or click the crown <Crown className="w-3 h-3 inline text-[#D4AF37]" /> on any warrior card.
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
                className="px-3 py-1 bg-[#8B0000] text-white rounded uppercase font-bold text-xs hover:bg-[#A30000] flex-shrink-0 transition-colors"
              >
                Adjust Limit
              </button>
            )}
          </div>
        )}

      </div>

      {/* Campaign Notes Popover */}
      {isNotesOpen && (
        <div className="bg-[#161920] border border-[#323846] rounded-md p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#D4AF37] uppercase font-bold flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Warband Field Journal & Notes</span>
            </span>
            <button
              onClick={() => setIsNotesOpen(false)}
              className="text-[#8E95A5] hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <textarea
            value={warband.notes || ''}
            onChange={(e) => updateWarbandNotes(warband.id, e.target.value)}
            placeholder="Record post-match casualty notes, campaign upgrades, tactical reminders, or narrative deeds..."
            className="w-full h-28 bg-[#0C0E12] border border-[#323846] rounded p-3 text-xs font-mono text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {['All', 'Leader', 'Elite', 'Trooper', 'Mercenary'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all whitespace-nowrap ${
              activeCategoryFilter === cat
                ? 'bg-[#D4AF37] text-black shadow'
                : 'bg-[#161920] text-[#8E95A5] hover:text-[#ECEFF4] border border-[#323846]'
            }`}
          >
            {cat} ({cat === 'All' ? warband.units.length : warband.units.filter((u) => u.profileSnapshot.category === cat).length})
          </button>
        ))}
      </div>

      {/* Unit Cards Grid */}
      {filteredUnits.length === 0 ? (
        <div className="bg-[#161920] border-2 border-dashed border-[#323846] rounded-md p-12 text-center space-y-4 bevel-container">
          <p className="text-xs font-mono text-[#8E95A5]">No warriors in this category.</p>
          <button
            onClick={() => setIsAddUnitOpen(true)}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-mono text-xs font-bold uppercase rounded"
          >
            Recruit First Warrior
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUnits.map((unit) => (
            <UnitCard key={unit.id} warbandId={warband.id} unit={unit} />
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
          <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-lg rounded-md shadow-2xl overflow-hidden bevel-container flex flex-col">
            
            {/* Header */}
            <div className="p-4 bg-[#0C0E12] border-b border-[#323846] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-gothic font-bold text-base text-[#ECEFF4]">
                  WARBAND BUDGET & CAMPAIGN LEDGER
                </h3>
              </div>
              <button
                onClick={() => setIsBudgetModalOpen(false)}
                className="text-[#8E95A5] hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5">
              
              {/* Ducat Limit Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-[#D4AF37] block">
                    1. Ducat Point Limit (Match Budget):
                  </label>
                  <span className="text-[#8E95A5] text-[11px]">Current: {warband.ducatLimit} D</span>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={100}
                    max={5000}
                    step={10}
                    value={editLimit}
                    onChange={(e) => setEditLimit(parseInt(e.target.value, 10) || 700)}
                    className="flex-1 bg-[#0C0E12] border-2 border-[#D4AF37] rounded p-2.5 text-sm font-bold text-[#ECEFF4] focus:outline-none"
                  />
                  <span className="text-xs font-bold text-[#D4AF37]">Ducats</span>
                </div>

                {/* Preset Quick Limit Buttons */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-[#8E95A5] block uppercase">Standard Rulebook Limits:</span>
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
                        className={`py-1.5 px-2 rounded text-[10px] font-bold transition-all border ${
                          editLimit === preset.value
                            ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                            : 'bg-[#0C0E12] text-[#8E95A5] hover:text-[#ECEFF4] border-[#323846]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Treasury Ducats */}
              <div className="space-y-2 pt-3 border-t border-[#323846]">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-[#8E95A5] block">
                    2. Unspent Treasury Ducats:
                  </label>
                  <span className="text-[#8E95A5] text-[11px]">Unspent Cash</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={0}
                    value={editTreasury}
                    onChange={(e) => setEditTreasury(parseInt(e.target.value, 10) || 0)}
                    className="flex-1 bg-[#0C0E12] border border-[#323846] rounded p-2 text-xs font-bold text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    onClick={() => setEditTreasury((prev) => prev + 50)}
                    className="px-2.5 py-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] rounded border border-[#323846] text-[10px] font-bold"
                  >
                    +50 D
                  </button>
                  <button
                    onClick={() => setEditTreasury((prev) => prev + 100)}
                    className="px-2.5 py-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] rounded border border-[#323846] text-[10px] font-bold"
                  >
                    +100 D
                  </button>
                </div>
              </div>

              {/* Glory Points */}
              <div className="space-y-2 pt-3 border-t border-[#323846]">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-[#8E95A5] block">
                    3. Campaign Glory Points:
                  </label>
                  <span className="text-[#8E95A5] text-[11px]">Glory Level</span>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={0}
                    value={editGlory}
                    onChange={(e) => setEditGlory(parseInt(e.target.value, 10) || 0)}
                    className="flex-1 bg-[#0C0E12] border border-[#323846] rounded p-2 text-xs font-bold text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    onClick={() => setEditGlory((prev) => Math.max(0, prev - 1))}
                    className="w-8 h-8 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] rounded border border-[#323846] font-bold"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => setEditGlory((prev) => prev + 1)}
                    className="w-8 h-8 bg-[#20242E] hover:bg-[#323846] text-[#D4AF37] rounded border border-[#323846] font-bold"
                  >
                    +1
                  </button>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-3 bg-[#0C0E12] border-t border-[#323846] flex items-center justify-between">
              <button
                onClick={() => setIsBudgetModalOpen(false)}
                className="px-4 py-1.5 bg-[#20242E] hover:bg-[#323846] text-[#8E95A5] hover:text-white rounded uppercase font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBudget}
                className="px-6 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black rounded uppercase font-bold text-xs shadow-lg flex items-center space-x-1.5"
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
