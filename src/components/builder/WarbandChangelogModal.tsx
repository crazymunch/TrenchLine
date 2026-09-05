'use client';

import React, { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { useStore } from '../../store/useStore';
import { Warband, WarbandSnapshot, ActiveUnit } from '../../types/warband';
import { soundEffects } from '../../services/soundEffects';
import { ConfirmModal } from '../ui/ConfirmModal';
import { 
  History, 
  Shield, 
  Clock
} from 'lucide-react';
import { unitGlory, formatUnitCost } from '@/rules/savedGlory';

interface WarbandChangelogModalProps {
  warband: Warband;
  onClose: () => void;
}

export const WarbandChangelogModal: React.FC<WarbandChangelogModalProps> = ({ warband, onClose }) => {
  const { saveWarbandSnapshot, restoreWarbandSnapshot } = useStore();

  /*
    The warband's own history, always. Never a fixture standing in for it.

    This used to read:

        const rawSnapshots = (warband.snapshots && warband.snapshots.length >= 3
          && !warband.snapshots.some(s => s.id === 'snap-founding' || s.ducatCost === 1320))
          ? warband.snapshots
          : (isSultanate ? SULTANATE_WARBAND_SNAPSHOTS : (warband.snapshots || []));

    Read the condition carefully. A Sultanate warband whose real history had
    **fewer than three entries**, or contained a snapshot **costing exactly
    1320 Ducats**, had its entire Growth History replaced by
    SULTANATE_WARBAND_SNAPSHOTS — the demo fixture, which tops out at 1000.

    So the closer a real roster got to the hard-coded number, the more
    certainly the app hid its actual history and showed someone else's. There
    is no reading of 1320 that is anything but a magic number written to make a
    specific roster display the fixture.

    It is the fabricated-fallback rule (docs/README.md) in its most damaging
    form: not invented data alongside real data, but invented data *in place
    of* real data, keyed on the real data looking right.
  */
  const [snapshots] = useState<WarbandSnapshot[]>(warband.snapshots ?? []);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>(
    warband.snapshots?.length ? warband.snapshots[warband.snapshots.length - 1].id : ''
  );
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [customNote, setCustomNote] = useState('');

  const selectedSnapshot = snapshots.find(s => s.id === selectedSnapshotId) || snapshots[snapshots.length - 1];

  /*
    `handleResetToCanonical` was DELETED, not wired up.

    It replaced the warband's snapshots and its entire unit list with the
    hard-coded SULTANATE_WARBAND_SNAPSHOTS fixture. Unreachable was the
    correct state for it: a button that silently overwrites a player's roster
    with demo data is one misclick from destroying a campaign's worth of work,
    and the fixture is seed data for a specific warband rather than anything
    "canonical" about a player's own.

    Surfaced when the linter came on in 4.4. Two other unused handlers in this
    pass were features with no way to reach them and got their buttons; this
    one was a hazard with no way to reach it, and got deleted.
  */

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
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title="WARBAND GROWTH CHRONICLE & HISTORY"
      subtitle={`${warband.name} • ${snapshots.length} Historical Milestones Recorded`}
    >
      {/* Modal Body: Split Timeline & Details */}
      <div className="p-6 overflow-y-auto flex-1 space-y-6">
  
        {/* Manual Checkpoint Form */}
        {isCreatingSnapshot && (
          <form onSubmit={handleCreateManualSnapshot} className="p-4 bg-theme-base border-2 border-theme-primary rounded-md space-y-3 text-xs">
            <span className="font-gothic font-bold text-sm text-theme-primary block">
              CREATE MANUAL CAMPAIGN CHECKPOINT
            </span>
            <div className="space-y-1">
              <label className="text-xs sm:text-[10px] uppercase text-theme-muted block">Checkpoint Label:</label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g. Mid-Campaign Re-Equip, Recruited Sniper Priest"
                className="w-full bg-theme-surface border border-theme-border rounded px-3 py-2 text-xs text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs sm:text-[10px] uppercase text-theme-muted block">Changes / Rationale:</label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. Sold 2 Jezzails, purchased Machine Armour for Captain"
                className="w-full bg-theme-surface border border-theme-border rounded px-3 py-2 text-xs text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary"
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
                className="px-4 py-1.5 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded shadow"
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
                            <span className={`text-xs sm:text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                              snap.outcome === 'Victory' 
                                ? 'bg-status-legal/30 text-status-legal border border-status-legal/50' 
                                : 'bg-theme-accent/30 text-status-error border border-theme-accent/50'
                            }`}>
                              {snap.outcome}
                            </span>
                          )}
                        </div>
                        <span className="text-xs sm:text-[10px] text-theme-muted flex items-center space-x-1 mt-0.5">
                          <Clock className="w-3 h-3 text-theme-primary" />
                          <span>{new Date(snap.timestamp).toLocaleDateString()}</span>
                        </span>
                      </div>

                      {/* Financial / Strength Summary */}
                      <div className="flex items-center space-x-3 text-xs">
                        <div className="text-right">
                          <span className="text-xs sm:text-[9px] uppercase text-theme-muted block">Rating</span>
                          <strong className="text-theme-primary">{snap.ducatCost} D</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-xs sm:text-[9px] uppercase text-theme-muted block">Treasury</span>
                          <strong className="text-theme-text">{snap.treasuryDucats} D</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-xs sm:text-[9px] uppercase text-theme-muted block">Glory</span>
                          <strong className="text-theme-primary">{snap.gloryPoints}</strong>
                        </div>
                      </div>
                    </div>

                    {/*
                      Restore.

                      A snapshot has always carried the whole roster — every
                      unit, the stash, the treasury, the Glory — and there was
                      no way to apply one. A player whose roster went backwards
                      could read the state they wanted off this list and not
                      get to it.

                      Only on the selected card, so it cannot be hit while
                      scrolling, and behind a confirm because it replaces the
                      current roster. The restore itself takes a checkpoint
                      first, so it is undoable from this same list.
                    */}
                    {isSelected && (
                      <div className="flex items-center justify-between gap-3 border-t border-theme-border pt-2.5 mt-2.5">
                        <span className="eyebrow">
                          {snap.unitCount} warriors &middot; {snap.ducatCost} D
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setPendingRestoreId(snap.id); }}
                          className="px-3 py-2 bg-theme-base hover:bg-theme-elevated text-theme-primary border border-theme-primary/50 font-mono text-xs font-bold uppercase tracking-wider transition-colors flex-shrink-0"
                          title="Put the warband back to this milestone"
                        >
                          Restore this state
                        </button>
                      </div>
                    )}

                    {/* Changes Summary Bullets */}
                    {snap.changesSummary && snap.changesSummary.length > 0 && (
                      <div className="space-y-1 text-xs">
                        <span className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted block">
                          Milestone Advancements & Events:
                        </span>
                        <ul className="space-y-1 pl-2">
                          {snap.changesSummary.map((change, cIdx) => (
                            <li key={cIdx} className="text-theme-text text-xs sm:text-[11px] flex items-start space-x-2">
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
                          <span className="text-xs sm:text-[10px] uppercase font-bold text-theme-primary flex items-center space-x-1.5">
                            <Shield className="w-3.5 h-3.5" />
                            <span>Rostered Warriors at this Milestone ({snap.units.length} Models):</span>
                          </span>
                          <span className="text-xs sm:text-[10px] text-theme-muted">
                            Total: {snap.ducatCost} Ducats
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {snap.units.map((unit: ActiveUnit) => (
                            <div
                              key={unit.id}
                              className="p-2.5 bg-theme-surface border border-theme-border rounded space-y-1.5 text-xs sm:text-[11px]"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <strong className="text-theme-text block font-gothic text-xs">{unit.customName}</strong>
                                  <span className="text-xs sm:text-[9px] text-theme-muted">
                                    {unit.profileSnapshot.name} • {unit.profileSnapshot.category}
                                  </span>
                                </div>
                                <span className="font-bold text-theme-primary text-xs whitespace-nowrap">
                                  {formatUnitCost(unit.totalCost, unitGlory(unit))}
                                </span>
                              </div>

                              {/* Weapons */}
                              {unit.equippedWeapons && unit.equippedWeapons.length > 0 && (
                                <div className="text-xs sm:text-[10px] text-theme-muted space-x-1">
                                  <span className="text-theme-text">⚔️</span>
                                  <span>{unit.equippedWeapons.map(w => w.name).join(', ')}</span>
                                </div>
                              )}

                              {/* Armour */}
                              {unit.equippedArmour && unit.equippedArmour.length > 0 && (
                                <div className="text-xs sm:text-[10px] text-theme-muted space-x-1">
                                  <span className="text-theme-text">🛡️</span>
                                  <span>{unit.equippedArmour.map(a => a.name).join(', ')}</span>
                                </div>
                              )}

                              {/* Skills / Advancements / Injuries */}
                              {(unit.advancements.length > 0 || unit.injuries.length > 0 || unit.xp > 0) && (
                                <div className="pt-1 border-t border-theme-border/60 text-xs sm:text-[10px] space-y-0.5">
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
      {/* Restoring replaces the current roster, so it asks first — and the
          message says exactly what is being replaced with what. */}
      <ConfirmModal
        isOpen={pendingRestoreId !== null}
        title="RESTORE THIS MILESTONE"
        message={(() => {
          const snap = snapshots.find((x) => x.id === pendingRestoreId);
          if (!snap) return '';
          const nowCost = warband.units.reduce((sum, u) => sum + u.totalCost, 0);
          return `Put "${warband.name}" back to "${snap.label}" — ${snap.unitCount} warriors at ` +
            `${snap.ducatCost} Ducats, ${snap.treasuryDucats} in the treasury and ${snap.gloryPoints} Glory.\n\n` +
            `This replaces the current roster (${warband.units.length} warriors at ${nowCost} Ducats). ` +
            `A checkpoint of the current state is saved to this list first, so you can undo it.`;
        })()}
        confirmLabel="Restore"
        onConfirm={() => {
          if (pendingRestoreId) restoreWarbandSnapshot(warband.id, pendingRestoreId);
          setPendingRestoreId(null);
          onClose();
        }}
        onCancel={() => setPendingRestoreId(null)}
      />
    </Sheet>
  );
};
