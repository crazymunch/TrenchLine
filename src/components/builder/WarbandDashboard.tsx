'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { WarbandBuilder } from './WarbandBuilder';
import { ImportWarbandModal } from './ImportWarbandModal';
import { WarbandComparatorModal } from './WarbandComparatorModal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useSession } from 'next-auth/react';
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

  const { data: session } = useSession();
  const userEmail = session?.user?.email?.toLowerCase().trim();
  const isAdmin = userEmail === 'crazymunch@gmail.com' || Boolean((session?.user as any)?.isAdmin);
  const userId = (session?.user as any)?.id;

  const isMyWarband = (wb: any) => {
    if (!wb.creatorName && !wb.creatorId) return true;
    if (userEmail && wb.creatorName && wb.creatorName.toLowerCase().trim() === userEmail) return true;
    if (session?.user?.name && wb.creatorName && wb.creatorName === session?.user?.name) return true;
    if (userId && wb.creatorId && wb.creatorId === userId) return true;
    return false;
  };

  const displayedWarbands = warbands.filter(isMyWarband);

  const canManageWarband = (wb: any) => {
    if (isAdmin) return true;
    return isMyWarband(wb);
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isComparatorOpen, setIsComparatorOpen] = useState(false);
  const [newWarbandName, setNewWarbandName] = useState('');
  const [newFactionId, setNewFactionId] = useState(factions[0]?.id || 'new-antioch');
  const [newDucatLimit, setNewDucatLimit] = useState(700);
  // How the budget is governed. 'campaign' is the published economy and is the
  // default, because it is what the book describes and what a campaign needs.
  const [newForceMode, setNewForceMode] = useState<'campaign' | 'unrestricted'>('campaign');
  const [warbandToDelete, setWarbandToDelete] = useState<{ id: string; name: string } | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWarbandName.trim()) return;
    createWarband(
      newWarbandName.trim(),
      newFactionId,
      // A campaign warband always starts on the book's allowance; the field is
      // only the player's to set in unrestricted mode.
      newForceMode === 'campaign' ? 700 : newDucatLimit,
      newForceMode,
    );
    setNewWarbandName('');
    setIsCreateModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Header & Warband Management Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-border pb-4">
        <div>
          <h2 className="font-gothic font-bold text-xl text-theme-text tracking-wide">WARBAND COMMAND</h2>
          <p className="text-xs font-mono text-theme-muted">Select, build, import, and equip your holy or damned strike forces</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {warbands.length > 1 && (
            <button
              onClick={() => setIsComparatorOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-theme-elevated hover:bg-theme-border text-theme-text border border-theme-border font-mono text-xs font-bold uppercase rounded transition-colors"
            >
              <Scale className="w-4 h-4 text-theme-primary" />
              <span>Compare Rosters</span>
            </button>
          )}

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-theme-elevated hover:bg-theme-border text-theme-text border border-theme-border font-mono text-xs font-bold uppercase rounded transition-colors"
          >
            <UploadCloud className="w-4 h-4 text-theme-primary" />
            <span>Import NewRecruit</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-black font-mono text-xs font-bold uppercase rounded transition-colors shadow"
          >
            <Plus className="w-4 h-4" />
            <span>New Warband</span>
          </button>
        </div>
      </div>

      {/* When No Warbands Exist (Clean State) */}
      {displayedWarbands.length === 0 ? (
        <div className="bg-theme-surface border-2 border-dashed border-theme-border rounded-md p-12 text-center space-y-6 max-w-2xl mx-auto my-8 bevel-container">
          <div className="w-16 h-16 rounded-full bg-theme-base border-2 border-theme-primary flex items-center justify-center mx-auto text-theme-primary shadow-glow">
            <Swords className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="font-gothic font-bold text-2xl text-theme-text">NO WARBANDS ACTIVE</h3>
            <p className="text-xs font-mono text-theme-muted max-w-md mx-auto leading-relaxed">
              Your command ledger is currently empty. Muster a fresh Trench Crusade warband from scratch or import an existing roster from NewRecruit or BattleScribe.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 bg-theme-primary hover:bg-theme-primary-hover text-black font-mono text-xs font-bold uppercase rounded shadow-lg shadow-theme-primary/20 flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Muster New Warband</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 bg-theme-elevated hover:bg-theme-border text-theme-text border border-theme-border font-mono text-xs font-bold uppercase rounded flex items-center justify-center space-x-2"
            >
              <UploadCloud className="w-4 h-4 text-theme-primary" />
              <span>Import from NewRecruit</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Warband Selector Cards Carousel / List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedWarbands.map((wb) => {
              const faction = factions.find((f) => f.id === wb.factionId);
              const isActive = wb.id === activeWarbandId;
              const totalCost = wb.units.reduce((sum, u) => sum + u.totalCost, 0);

              return (
                <div
                  key={wb.id}
                  onClick={() => setActiveWarbandId(wb.id)}
                  className={`p-4 rounded-md border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between bevel-container ${
                    isActive
                      ? 'bg-theme-surface border-theme-primary shadow-lg shadow-black/60 ring-1 ring-theme-primary'
                      : 'bg-theme-surface/60 border-theme-border hover:border-theme-muted/60 hover:bg-theme-surface'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: faction?.color || '#D4AF37' }}
                        />
                        <span className="text-[10px] font-mono text-theme-primary uppercase font-semibold">
                          {faction?.name || wb.factionId}
                        </span>
                      </div>
                      {isActive && (
                        <span className="text-[9px] font-mono font-bold bg-theme-primary text-black px-1.5 py-0.2 rounded uppercase">
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <h3 className="font-gothic font-bold text-base text-theme-text truncate">{wb.name}</h3>

                    <div className="flex items-center justify-between text-xs font-mono text-theme-muted">
                      <span>{wb.units.length} Warriors</span>
                      <span className="text-theme-text font-bold">{totalCost} / {wb.ducatLimit} D</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-theme-border/60 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1 text-theme-primary font-mono">
                      <Sparkles className="w-3 h-3" />
                      <span>{wb.gloryPoints} Glory</span>
                    </div>

                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => cloneWarband(wb.id)}
                        className="p-1 text-theme-muted hover:text-theme-text rounded transition-colors"
                        title="Clone / Fork Warband"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {canManageWarband(wb) && (
                        <button
                          onClick={() => setWarbandToDelete({ id: wb.id, name: wb.name })}
                          className="p-1 text-theme-muted hover:text-status-error rounded transition-colors"
                          title="Delete Warband"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
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
          <div className="bg-theme-surface border-2 border-theme-border w-full max-w-lg rounded-md shadow-2xl overflow-hidden bevel-container">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border bg-theme-base">
              <div className="flex items-center space-x-2">
                <Skull className="w-5 h-5 text-theme-primary" />
                <h3 className="font-gothic font-bold text-lg text-theme-text">MUSTER NEW WARBAND</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-theme-muted hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-theme-muted mb-1">
                  Warband Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 7th Iron Vanguard, Heretics of Golgotha"
                  value={newWarbandName}
                  onChange={(e) => setNewWarbandName(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded p-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-theme-muted mb-1">
                  Faction Allegiance
                </label>
                <select
                  value={newFactionId}
                  onChange={(e) => setNewFactionId(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded p-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                >
                  {factions.map((f) => (
                    <option key={f.id} value={f.id} className="bg-theme-surface">
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-theme-muted mb-2">
                  Budget
                </label>
                <div className="space-y-2">
                  {([
                    { id: 'campaign' as const, name: 'Campaign Force',
                      blurb: "The published economy. Starts on 700 Ducats and 0 Glory; the per-game limit comes from the Warband Threshold Table and is not edited by hand." },
                    { id: 'unrestricted' as const, name: 'Unrestricted',
                      blurb: 'You set the Ducats and Glory. For one-off games, imports, and trying a list out.' },
                  ]).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setNewForceMode(m.id)}
                      className={`w-full text-left p-3 min-h-[44px] rounded-sm border transition-colors ${
                        newForceMode === m.id
                          ? 'border-theme-primary bg-theme-elevated'
                          : 'border-theme-border hover:border-theme-primary/50'
                      }`}
                    >
                      <span className="font-gothic font-bold text-sm text-theme-text">{m.name}</span>
                      <p className="text-xs sm:text-[11px] text-theme-muted mt-1 leading-relaxed">{m.blurb}</p>
                    </button>
                  ))}
                </div>

                {/* Only an unrestricted warband has a number to set: a campaign
                    warband's allowance is published, and offering to edit it is
                    how the app ended up with a hand-set limit in the first place. */}
                {newForceMode === 'unrestricted' && (
                  <div className="mt-3">
                    <label className="block text-xs font-mono uppercase text-theme-muted mb-1">
                      Starting Ducats
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="5000"
                      step="50"
                      value={newDucatLimit}
                      onChange={(e) => setNewDucatLimit(parseInt(e.target.value) || 700)}
                      className="w-full min-h-[44px] bg-theme-base border border-theme-border rounded p-2 text-base sm:text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-theme-border flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-theme-elevated hover:bg-theme-border text-theme-text font-mono text-xs font-bold uppercase rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-black font-mono text-xs font-bold uppercase rounded shadow"
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
