'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { UnitCard } from './UnitCard';
import { AddUnitModal } from './AddUnitModal';
import { ExportModal } from './ExportModal';
import { ArmoryStashModal } from './ArmoryStashModal';
import { WarbandChronicleModal } from './WarbandChronicleModal';
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
  BookOpen
} from 'lucide-react';

export const WarbandBuilder: React.FC = () => {
  const { getActiveWarband, factions, setCurrentView, updateWarbandNotes, setUnitAsLeader } = useStore();
  const warband = getActiveWarband();
  
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isStashOpen, setIsStashOpen] = useState(false);
  const [isChronicleOpen, setIsChronicleOpen] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');
  const [isNotesOpen, setIsNotesOpen] = useState(false);

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
  const hasLeader = warband.units.some((u) => u.profileSnapshot.category === 'Leader');
  const eliteCount = warband.units.filter((u) => u.profileSnapshot.category === 'Elite').length;
  const trooperCount = warband.units.filter((u) => u.profileSnapshot.category === 'Trooper').length;
  const mercenaryCount = warband.units.filter((u) => u.profileSnapshot.category === 'Mercenary').length;
  const totalStashItems = warband.armoryStash.reduce((s, i) => s + i.quantity, 0);

  const categories = ['All', 'Leader', 'Elite', 'Trooper', 'Mercenary'];

  const filteredUnits = warband.units.filter((u) => {
    if (activeCategoryFilter === 'All') return true;
    return u.profileSnapshot.category === activeCategoryFilter;
  });

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
                "{warband.motto}"
              </div>
            ) : (
              <p className="text-xs text-[#8E95A5] max-w-xl">{faction?.tagline}</p>
            )}
          </div>

          {/* Builder Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsChronicleOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#20242E] hover:bg-[#323846] text-[#D4AF37] border border-[#D4AF37]/40 rounded font-mono text-xs font-bold uppercase transition-colors"
              title="Warband Narrative Chronicle, House Origins, Oaths & Timeline"
            >
              <Scroll className="w-4 h-4" />
              <span>Chronicle & Lore</span>
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

        {/* Budget Bar & Validation Stats */}
        <div className="mt-6 pt-4 border-t border-[#323846] grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          
          {/* Budget Meter */}
          <div className="md:col-span-2 space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#8E95A5] flex items-center space-x-1">
                <Coins className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Ducat Point Limit:</span>
              </span>
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

          {/* Treasury & Glory */}
          <div className="flex items-center justify-around bg-[#0C0E12] p-2 rounded border border-[#323846] font-mono text-xs">
            <div className="text-center">
              <span className="text-[10px] text-[#8E95A5] block">TREASURY</span>
              <span className="font-bold text-[#D4AF37]">{warband.treasuryDucats} D</span>
            </div>
            <div className="h-6 w-[1px] bg-[#323846]" />
            <div className="text-center">
              <span className="text-[10px] text-[#8E95A5] block">GLORY</span>
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

            {!hasLeader && warband.units.length > 0 && (
              <div className="flex items-center space-x-2 flex-shrink-0">
                <span className="text-[#ECEFF4] text-[11px] font-bold">Appoint Leader:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      setUnitAsLeader(warband.id, e.target.value);
                    }
                  }}
                  defaultValue=""
                  className="bg-[#161920] border border-[#D4AF37] text-[#D4AF37] text-xs font-bold rounded px-2.5 py-1 cursor-pointer focus:outline-none shadow"
                >
                  <option value="" disabled className="bg-[#161920] text-gray-400">Choose Warrior...</option>
                  {warband.units.map((u) => (
                    <option key={u.id} value={u.id} className="text-white bg-[#161920]">
                      {u.customName} ({u.profileSnapshot.name})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Campaign Notes Drawer */}
      {isNotesOpen && (
        <div className="bg-[#161920] border border-[#323846] rounded-md p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase font-bold text-[#8E95A5] flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Warband Chronicle & Campaign Dossier Notes</span>
            </span>
          </div>
          <textarea
            value={warband.notes || ''}
            onChange={(e) => updateWarbandNotes(warband.id, e.target.value)}
            placeholder="Record warband lore, tactical objectives, grudge matches, and deeds..."
            className="w-full h-24 bg-[#0C0E12] border border-[#323846] rounded p-2.5 text-xs font-mono text-[#ECEFF4] placeholder-[#8E95A5] focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
      )}

      {/* Category Filter Pills & Quick Counts */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategoryFilter(cat)}
              className={`px-3 py-1 rounded text-xs font-mono uppercase font-bold transition-all whitespace-nowrap ${
                activeCategoryFilter === cat
                  ? 'bg-[#D4AF37] text-black shadow'
                  : 'bg-[#161920] text-[#8E95A5] hover:text-[#ECEFF4] border border-[#323846]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="text-xs font-mono text-[#8E95A5]">
          Displaying <strong className="text-[#ECEFF4]">{filteredUnits.length}</strong> of {warband.units.length} Warriors
        </div>
      </div>

      {/* Unit Cards Roster Grid */}
      {filteredUnits.length === 0 ? (
        <div className="bg-[#161920] border-2 border-dashed border-[#323846] rounded-md p-12 text-center space-y-4">
          <p className="text-sm font-mono text-[#8E95A5]">
            No warriors found in category &quot;{activeCategoryFilter}&quot;.
          </p>
          <button
            onClick={() => setIsAddUnitOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black rounded font-mono text-xs font-bold uppercase"
          >
            <UserPlus className="w-4 h-4" />
            <span>Recruit First Warrior</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUnits.map((unit) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              warbandId={warband.id}
            />
          ))}
        </div>
      )}

      {/* Recruitment Modal */}
      {isAddUnitOpen && (
        <AddUnitModal
          warbandId={warband.id}
          factionId={warband.factionId}
          onClose={() => setIsAddUnitOpen(false)}
        />
      )}

      {/* Export Modal */}
      {isExportOpen && (
        <ExportModal
          warband={warband}
          faction={faction}
          onClose={() => setIsExportOpen(false)}
        />
      )}

      {/* Armory Stash Modal */}
      {isStashOpen && (
        <ArmoryStashModal
          warband={warband}
          onClose={() => setIsStashOpen(false)}
        />
      )}

      {/* Warband Chronicle & Lore Dossier Modal */}
      {isChronicleOpen && (
        <WarbandChronicleModal
          warband={warband}
          onClose={() => setIsChronicleOpen(false)}
        />
      )}
    </div>
  );
};
