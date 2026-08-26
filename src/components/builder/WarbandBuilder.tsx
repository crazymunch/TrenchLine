import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { UnitCard } from './UnitCard';
import { AddUnitModal } from './AddUnitModal';
import { ExportModal } from './ExportModal';
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
  Info
} from 'lucide-react';

export const WarbandBuilder: React.FC = () => {
  const { getActiveWarband, factions, setCurrentView, updateWarbandNotes } = useStore();
  const warband = getActiveWarband();
  
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
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

  const categories = ['All', 'Leader', 'Elite', 'Trooper', 'Mercenary'];

  const filteredUnits = warband.units.filter((u) => {
    if (activeCategoryFilter === 'All') return true;
    return u.profileSnapshot.category === activeCategoryFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* Warband Command Header */}
      <div className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 shadow-xl relative overflow-hidden">
        <div 
          className="absolute top-0 right-0 w-96 h-96 bg-radial from-transparent to-transparent opacity-10 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${faction?.color || '#D4AF37'} 20%, transparent 70%)` }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Left: Warband Identity */}
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div 
                className="w-3.5 h-3.5 rounded-full shadow" 
                style={{ backgroundColor: faction?.color || '#D4AF37' }} 
              />
              <span className="font-mono text-xs text-[#D4AF37] uppercase tracking-widest font-bold">
                {faction?.name || warband.factionId}
              </span>
            </div>
            <h1 className="font-gothic font-bold text-3xl text-[#ECEFF4] tracking-wide">{warband.name}</h1>
            <p className="text-xs text-[#8E95A5] italic max-w-xl">{faction?.tagline}</p>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setCurrentView('play')}
              className="flex items-center space-x-2 px-4 py-2 bg-[#8B0000] hover:bg-[#A30000] text-white rounded font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-[#8B0000]/20"
            >
              <Swords className="w-4 h-4" />
              <span>Enter Play Mode</span>
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
          <div className="mt-4 p-2.5 bg-[#8B0000]/15 border border-[#8B0000]/40 rounded flex items-center space-x-2 text-xs font-mono text-[#E53935]">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>
              {!hasLeader && '• Roster requires at least 1 Leader unit. '}
              {isOverBudget && '• Total ducat cost exceeds allowed point budget! '}
            </span>
          </div>
        )}

      </div>

      {/* Notes / Lore Collapsible Drawer */}
      {isNotesOpen && (
        <div className="bg-[#161920] border border-[#323846] rounded-md p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase font-bold text-[#D4AF37] flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Warband Narrative & Campaign Notes</span>
            </span>
          </div>
          <textarea
            value={warband.notes || ''}
            onChange={(e) => updateWarbandNotes(warband.id, e.target.value)}
            placeholder="Write campaign history, battle vows, heraldry lore, or tactical notes here..."
            className="w-full h-24 bg-[#0C0E12] border border-[#323846] rounded p-2 text-xs text-[#ECEFF4] placeholder-[#8E95A5] focus:outline-none focus:border-[#D4AF37] font-sans"
          />
        </div>
      )}

      {/* Roster Controls & Category Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-1.5 bg-[#161920] p-1 rounded border border-[#323846] overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded text-xs font-mono uppercase font-bold transition-all whitespace-nowrap ${
                activeCategoryFilter === cat
                  ? 'bg-[#D4AF37] text-black shadow'
                  : 'text-[#8E95A5] hover:text-[#ECEFF4]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="text-xs font-mono text-[#8E95A5]">
          Showing <strong>{filteredUnits.length}</strong> of <strong>{warband.units.length}</strong> Warriors
        </div>
      </div>

      {/* Warriors Grid */}
      {warband.units.length === 0 ? (
        <div className="p-12 text-center bg-[#161920] border-2 border-dashed border-[#323846] rounded-md space-y-4">
          <ShieldAlert className="w-12 h-12 text-[#8E95A5] mx-auto opacity-50" />
          <div>
            <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">WARBAND HAS NO WARRIORS</h3>
            <p className="text-xs font-mono text-[#8E95A5]">Recruit your Leader and troops to begin your crusade.</p>
          </div>
          <button
            onClick={() => setIsAddUnitOpen(true)}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black rounded font-mono text-xs font-bold uppercase tracking-wider"
          >
            Recruit First Unit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUnits.map((unit) => (
            <UnitCard key={unit.id} unit={unit} warbandId={warband.id} />
          ))}
        </div>
      )}

      {/* Modals */}
      {isAddUnitOpen && (
        <AddUnitModal
          warbandId={warband.id}
          factionId={warband.factionId}
          onClose={() => setIsAddUnitOpen(false)}
        />
      )}

      {isExportOpen && (
        <ExportModal
          warband={warband}
          faction={faction}
          onClose={() => setIsExportOpen(false)}
        />
      )}

    </div>
  );
};
