'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Warband, WarbandSnapshot, ActiveUnit } from '../../types/warband';
import { SULTANATE_WARBAND_SNAPSHOTS } from '../../data/warbandLore';
import { soundEffects } from '../../services/soundEffects';
import { 
  X, 
  History, 
  Sparkles, 
  Shield, 
  Coins, 
  Award, 
  Skull, 
  Swords, 
  PlusCircle, 
  Calendar, 
  CheckCircle, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Eye, 
  FileText,
  Clock,
  RotateCcw,
  Zap
} from 'lucide-react';

interface WarbandChangelogModalProps {
  warband: Warband;
  onClose: () => void;
}

export const WarbandChangelogModal: React.FC<WarbandChangelogModalProps> = ({ warband, onClose }) => {
  const { saveWarbandSnapshot } = useStore();
  
  // Snapshots list: check if sultanate and needs canonical
  const isSultanate = warband.factionId === 'iron-sultanate' || warband.name.toLowerCase().includes('qarn') || warband.name.toLowerCase().includes('sultanate');
  const rawSnapshots = (warband.snapshots && warband.snapshots.length >= 3 && !warband.snapshots.some(s => s.id === 'snap-founding' || s.ducatCost === 1320)) 
    ? warband.snapshots 
    : (isSultanate ? SULTANATE_WARBAND_SNAPSHOTS : (warband.snapshots || []));

  const [snapshots, setSnapshots] = useState<WarbandSnapshot[]>(rawSnapshots);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>(
    rawSnapshots.length > 0 ? rawSnapshots[rawSnapshots.length - 1].id : ''
  );
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customNote, setCustomNote] = useState('');

  const selectedSnapshot = snapshots.find(s => s.id === selectedSnapshotId) || snapshots[snapshots.length - 1];

  const handleResetToCanonical = () => {
    if (isSultanate) {
      setSnapshots(SULTANATE_WARBAND_SNAPSHOTS);
      setSelectedSnapshotId(SULTANATE_WARBAND_SNAPSHOTS[2].id);
      useStore.setState((state) => {
        const updated = state.warbands.map((wb) => {
          if (wb.id === warband.id) {
            return {
              ...wb,
              snapshots: SULTANATE_WARBAND_SNAPSHOTS,
              units: SULTANATE_WARBAND_SNAPSHOTS[2].units
            };
          }
          return wb;
        });
        return { warbands: updated };
      });
      soundEffects.playCathedralBell();
    }
  };

  const handleCreateManualSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLabel.trim()) return;

    saveWarbandSnapshot(
      warband.id,
      customLabel.trim(),
      'manual',
      customNote.trim() ? [customNote.trim()] : ['Manual checkpoint saved by commander.']
    );

    soundEffects.playCathedralBell();
    setIsCreatingSnapshot(false);
    setCustomLabel('');
    setCustomNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-mono">
      <div className="bg-theme-surface border-2 border-theme-primary w-full max-w-5xl max-h-[90dvh] rounded-md shadow-2xl flex flex-col overflow-hidden bevel-container">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border bg-theme-base">
          <div className="flex items-center space-x-3">
            <History className="w-6 h-6 text-theme-primary" />
            <div>
              <h2 className="font-gothic font-bold text-xl text-theme-text tracking-wide">
                WARBAND GROWTH CHRONICLE & HISTORY
              </h2>
              <p className="text-xs text-theme-muted">
                {warband.name} • {snapshots.length} Historical Milestones Recorded
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isSultanate && (
              <button
                onClick={handleResetToCanonical}
                className="px-3 py-1.5 bg-theme-base hover:bg-theme-elevated border border-theme-border text-theme-muted hover:text-theme-primary text-xs font-bold uppercase rounded transition-colors flex items-center space-x-1.5"
                title="Reload the 3 authentic historical iterations (799 D, 983 D, 1000 D)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sync Canonical History</span>
              </button>
            )}
            <button
              onClick={() => setIsCreatingSnapshot(!isCreatingSnapshot)}
              className="px-3 py-1.5 bg-theme-elevated hover:bg-theme-border border border-theme-primary/50 text-theme-primary text-xs font-bold uppercase rounded transition-colors flex items-center space-x-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Save Checkpoint</span>
            </button>
            <button onClick={onClose} className="p-1 text-theme-muted hover:text-white rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split Timeline & Details */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Manual Checkpoint Form */}
          {isCreatingSnapshot && (
            <form onSubmit={handleCreateManualSnapshot} className="p-4 bg-theme-base border-2 border-theme-primary rounded-md space-y-3 text-xs">
              <span className="font-gothic font-bold text-sm text-theme-primary block">
                CREATE MANUAL CAMPAIGN CHECKPOINT
              </span>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-theme-muted block">Checkpoint Label:</label>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="e.g. Mid-Campaign Re-Equip, Recruited Sniper Priest"
                  className="w-full bg-theme-surface border border-theme-border rounded px-3 py-2 text-xs text-white placeholder-theme-muted focus:outline-none focus:border-theme-primary"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-theme-muted block">Changes / Rationale:</label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. Sold 2 Jezzails, purchased Machine Armour for Captain"
                  className="w-full bg-theme-surface border border-theme-border rounded px-3 py-2 text-xs text-white placeholder-theme-muted focus:outline-none focus:border-theme-primary"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreatingSnapshot(false)}
                  className="px-3 py-1.5 bg-theme-elevated hover:bg-theme-border text-theme-muted rounded font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-theme-primary hover:bg-theme-primary-hover text-black font-bold uppercase rounded shadow"
                >
                  Save Snapshot
                </button>
              </div>
            </form>
          )}

          {/* Timeline Visual Track */}
          <div className="space-y-6">
            <h3 className="font-gothic font-bold text-base text-theme-primary border-b border-theme-border pb-2 flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>CHRONOLOGICAL EVOLUTION TIMELINE</span>
            </h3>

            <div className="relative pl-6 border-l-2 border-theme-primary/40 space-y-6">
              {snapshots.map((snap, idx) => {
                const isSelected = selectedSnapshot?.id === snap.id;
                return (
                  <div key={snap.id || idx} className="relative group">
                    
                    {/* Timeline Dot Marker */}
                    <div 
                      className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 transition-all ${
                        snap.type === 'founding'
                          ? 'bg-theme-primary border-white shadow-glow'
                          : snap.outcome === 'Victory'
                          ? 'bg-status-legal border-white'
                          : snap.outcome === 'Defeat'
                          ? 'bg-theme-accent border-white'
                          : 'bg-theme-elevated border-theme-primary'
                      }`} 
                    />

                    {/* Snapshot Card */}
                    <div
                      onClick={() => setSelectedSnapshotId(snap.id)}
                      className={`p-4 rounded-md border-2 transition-all cursor-pointer space-y-3 bevel-container ${
                        isSelected
                          ? 'bg-theme-elevated border-theme-primary shadow-xl'
                          : 'bg-theme-surface border-theme-border hover:border-theme-primary/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-theme-border pb-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-gothic font-bold text-base text-theme-text">
                              {snap.label}
                            </h4>
                            {snap.outcome && (
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                snap.outcome === 'Victory' 
                                  ? 'bg-status-legal/30 text-status-legal border border-status-legal/50' 
                                  : 'bg-theme-accent/30 text-status-error border border-theme-accent/50'
                              }`}>
                                {snap.outcome}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-theme-muted flex items-center space-x-1 mt-0.5">
                            <Clock className="w-3 h-3 text-theme-primary" />
                            <span>{new Date(snap.timestamp).toLocaleDateString()}</span>
                          </span>
                        </div>

                        {/* Financial / Strength Summary */}
                        <div className="flex items-center space-x-3 text-xs">
                          <div className="text-right">
                            <span className="text-[9px] uppercase text-theme-muted block">Rating</span>
                            <strong className="text-theme-primary">{snap.ducatCost} D</strong>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] uppercase text-theme-muted block">Treasury</span>
                            <strong className="text-theme-text">{snap.treasuryDucats} D</strong>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] uppercase text-theme-muted block">Glory</span>
                            <strong className="text-theme-primary">{snap.gloryPoints} ☼</strong>
                          </div>
                        </div>
                      </div>

                      {/* Changes Summary Bullets */}
                      {snap.changesSummary && snap.changesSummary.length > 0 && (
                        <div className="space-y-1 text-xs">
                          <span className="text-[10px] uppercase font-bold text-theme-muted block">
                            Milestone Advancements & Events:
                          </span>
                          <ul className="space-y-1 pl-2">
                            {snap.changesSummary.map((change, cIdx) => (
                              <li key={cIdx} className="text-theme-text text-[11px] flex items-start space-x-2">
                                <span className="text-theme-primary font-bold">•</span>
                                <span>{change}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Notes / Battle Report Snippet */}
                      {snap.notes && (
                        <div className="p-3 bg-theme-base border border-theme-border rounded text-xs text-theme-muted italic leading-relaxed">
                          {snap.notes}
                        </div>
                      )}

                      {/* DETAILED ROSTER BREAKDOWN FOR THIS MILESTONE */}
                      {isSelected && snap.units && snap.units.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-theme-border space-y-3 bg-theme-base/80 p-3 rounded">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-theme-primary flex items-center space-x-1.5">
                              <Shield className="w-3.5 h-3.5" />
                              <span>Rostered Warriors at this Milestone ({snap.units.length} Models):</span>
                            </span>
                            <span className="text-[10px] text-theme-muted">
                              Total: {snap.ducatCost} Ducats
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {snap.units.map((unit: ActiveUnit) => (
                              <div
                                key={unit.id}
                                className="p-2.5 bg-theme-surface border border-theme-border rounded space-y-1.5 text-[11px]"
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <strong className="text-theme-text block font-gothic text-xs">{unit.customName}</strong>
                                    <span className="text-[9px] text-theme-muted">
                                      {unit.profileSnapshot.name} • {unit.profileSnapshot.category}
                                    </span>
                                  </div>
                                  <span className="font-bold text-theme-primary text-xs">{unit.totalCost} D</span>
                                </div>

                                {/* Weapons */}
                                {unit.equippedWeapons && unit.equippedWeapons.length > 0 && (
                                  <div className="text-[10px] text-theme-muted space-x-1">
                                    <span className="text-theme-text">⚔️</span>
                                    <span>{unit.equippedWeapons.map(w => w.name).join(', ')}</span>
                                  </div>
                                )}

                                {/* Armour */}
                                {unit.equippedArmour && unit.equippedArmour.length > 0 && (
                                  <div className="text-[10px] text-theme-muted space-x-1">
                                    <span className="text-theme-text">🛡️</span>
                                    <span>{unit.equippedArmour.map(a => a.name).join(', ')}</span>
                                  </div>
                                )}

                                {/* Skills / Advancements / Injuries */}
                                {(unit.advancements.length > 0 || unit.injuries.length > 0 || unit.xp > 0) && (
                                  <div className="pt-1 border-t border-theme-border/60 text-[10px] space-y-0.5">
                                    {unit.xp > 0 && (
                                      <span className="text-theme-primary block font-bold">{unit.xp} XP</span>
                                    )}
                                    {unit.advancements.map((adv, aIdx) => (
                                      <span key={aIdx} className="text-status-legal block truncate">
                                        ⭐ {adv}
                                      </span>
                                    ))}
                                    {unit.injuries.map((inj, iIdx) => (
                                      <span key={iIdx} className="text-status-error block truncate">
                                        💀 {inj}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>

                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
