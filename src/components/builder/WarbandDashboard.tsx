'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { WarbandBuilder } from './WarbandBuilder';
import { ImportWarbandModal } from './ImportWarbandModal';
import { WarbandComparatorModal } from './WarbandComparatorModal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { 
  Plus, 
  Copy, 
  Trash2, 
  Sparkles, 
  Skull,
  X,
  UploadCloud,
  Scale,
  ShieldAlert,
  Swords
} from 'lucide-react';

export const WarbandDashboard: React.FC = () => {
  const { 
    warbands, 
    activeWarbandId, 
    setActiveWarbandId, 
    createWarband, 
    cloneWarband, 
    deleteWarband, 
    factions 
  } = useStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isComparatorOpen, setIsComparatorOpen] = useState(false);
  const [newWarbandName, setNewWarbandName] = useState('');
  const [newFactionId, setNewFactionId] = useState(factions[0]?.id || 'new-antioch');
  const [newDucatLimit, setNewDucatLimit] = useState(700);
  const [warbandToDelete, setWarbandToDelete] = useState<{ id: string; name: string } | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWarbandName.trim()) return;
    createWarband(newWarbandName.trim(), newFactionId, newDucatLimit);
    setNewWarbandName('');
    setIsCreateModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Header & Warband Management Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#323846] pb-4">
        <div>
          <h2 className="font-gothic font-bold text-xl text-[#ECEFF4] tracking-wide">WARBAND COMMAND</h2>
          <p className="text-xs font-mono text-[#8E95A5]">Select, build, import, and equip your holy or damned strike forces</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {warbands.length > 1 && (
            <button
              onClick={() => setIsComparatorOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] font-mono text-xs font-bold uppercase rounded transition-colors"
            >
              <Scale className="w-4 h-4 text-[#D4AF37]" />
              <span>Compare Rosters</span>
            </button>
          )}

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] font-mono text-xs font-bold uppercase rounded transition-colors"
          >
            <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
            <span>Import NewRecruit</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-mono text-xs font-bold uppercase rounded transition-colors shadow"
          >
            <Plus className="w-4 h-4" />
            <span>New Warband</span>
          </button>
        </div>
      </div>

      {/* When No Warbands Exist (Clean State) */}
      {warbands.length === 0 ? (
        <div className="bg-[#161920] border-2 border-dashed border-[#323846] rounded-md p-12 text-center space-y-6 max-w-2xl mx-auto my-8 bevel-container">
          <div className="w-16 h-16 rounded-full bg-[#0C0E12] border-2 border-[#D4AF37] flex items-center justify-center mx-auto text-[#D4AF37] shadow-glow">
            <Swords className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="font-gothic font-bold text-2xl text-[#ECEFF4]">NO WARBANDS ACTIVE</h3>
            <p className="text-xs font-mono text-[#8E95A5] max-w-md mx-auto leading-relaxed">
              Your command ledger is currently empty. Muster a fresh Trench Crusade warband from scratch or import an existing roster from NewRecruit or BattleScribe.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-mono text-xs font-bold uppercase rounded shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Muster New Warband</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] font-mono text-xs font-bold uppercase rounded flex items-center justify-center space-x-2"
            >
              <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
              <span>Import from NewRecruit</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Warband Selector Cards Carousel / List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {warbands.map((wb) => {
              const faction = factions.find((f) => f.id === wb.factionId);
              const isActive = wb.id === activeWarbandId;
              const totalCost = wb.units.reduce((sum, u) => sum + u.totalCost, 0);

              return (
                <div
                  key={wb.id}
                  onClick={() => setActiveWarbandId(wb.id)}
                  className={`p-4 rounded-md border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between bevel-container ${
                    isActive
                      ? 'bg-[#161920] border-[#D4AF37] shadow-lg shadow-black/60 ring-1 ring-[#D4AF37]'
                      : 'bg-[#161920]/60 border-[#323846] hover:border-[#8E95A5]/60 hover:bg-[#161920]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: faction?.color || '#D4AF37' }}
                        />
                        <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-semibold">
                          {faction?.name || wb.factionId}
                        </span>
                      </div>
                      {isActive && (
                        <span className="text-[9px] font-mono font-bold bg-[#D4AF37] text-black px-1.5 py-0.2 rounded uppercase">
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <h3 className="font-gothic font-bold text-base text-[#ECEFF4] truncate">{wb.name}</h3>

                    <div className="flex items-center justify-between text-xs font-mono text-[#8E95A5]">
                      <span>{wb.units.length} Warriors</span>
                      <span className="text-[#ECEFF4] font-bold">{totalCost} / {wb.ducatLimit} D</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-[#323846]/60 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1 text-[#D4AF37] font-mono">
                      <Sparkles className="w-3 h-3" />
                      <span>{wb.gloryPoints} Glory</span>
                    </div>

                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => cloneWarband(wb.id)}
                        className="p-1 text-[#8E95A5] hover:text-[#ECEFF4] rounded transition-colors"
                        title="Clone Warband"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setWarbandToDelete({ id: wb.id, name: wb.name })}
                        className="p-1 text-[#8E95A5] hover:text-[#E53935] rounded transition-colors"
                        title="Delete Warband"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Warband Builder Detail View */}
          <WarbandBuilder />
        </>
      )}

      {/* Create Warband Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#161920] border-2 border-[#323846] w-full max-w-lg rounded-md shadow-2xl overflow-hidden bevel-container">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#323846] bg-[#0C0E12]">
              <div className="flex items-center space-x-2">
                <Skull className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">MUSTER NEW WARBAND</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#8E95A5] hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[#8E95A5] mb-1">
                  Warband Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 7th Iron Vanguard, Heretics of Golgotha"
                  value={newWarbandName}
                  onChange={(e) => setNewWarbandName(e.target.value)}
                  className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-sm text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#8E95A5] mb-1">
                  Faction Allegiance
                </label>
                <select
                  value={newFactionId}
                  onChange={(e) => setNewFactionId(e.target.value)}
                  className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-sm text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
                >
                  {factions.map((f) => (
                    <option key={f.id} value={f.id} className="bg-[#161920]">
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#8E95A5] mb-1">
                  Starting Ducat Limit
                </label>
                <input
                  type="number"
                  min="300"
                  max="2000"
                  step="50"
                  value={newDucatLimit}
                  onChange={(e) => setNewDucatLimit(parseInt(e.target.value) || 700)}
                  className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-sm text-[#ECEFF4] focus:outline-none"
                />
                <span className="text-[10px] font-mono text-[#8E95A5] mt-1 block">
                  Standard Trench Crusade skirmishes use 700 Ducats.
                </span>
              </div>

              <div className="pt-4 border-t border-[#323846] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] font-mono text-xs font-bold uppercase rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-mono text-xs font-bold uppercase rounded shadow"
                >
                  Muster Roster
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Import NewRecruit Modal */}
      {isImportModalOpen && (
        <ImportWarbandModal onClose={() => setIsImportModalOpen(false)} />
      )}

      {/* Matchup Comparator Modal */}
      {isComparatorOpen && (
        <WarbandComparatorModal onClose={() => setIsComparatorOpen(false)} />
      )}

      {/* Disband Warband Confirmation Dialog */}
      <ConfirmModal
        isOpen={!!warbandToDelete}
        title="DISBAND WARBAND"
        message={`Are you sure you want to permanently disband "${warbandToDelete?.name}"? All rostered warriors, wargear, chronicle milestones, and growth records will be permanently erased.`}
        confirmLabel="Disband Warband"
        onConfirm={() => {
          if (warbandToDelete) {
            deleteWarband(warbandToDelete.id);
            setWarbandToDelete(null);
          }
        }}
        onCancel={() => setWarbandToDelete(null)}
      />

    </div>
  );
};
