'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useDataset } from '../../rules/useDataset';
import { DEFAULT_RULESET_ID } from '../../rules/rulesets';
import { variantsForFaction } from '../../rules/variants';
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
  Swords
} from 'lucide-react';
import { sessionIsAdmin } from '../../lib/session';

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
  const isAdmin = sessionIsAdmin(session);
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
  const [newGlory, setNewGlory] = useState(0);
  const [newVariantId, setNewVariantId] = useState<string | undefined>(undefined);
  // Off by default, which is the catalogues' default: third-party entries are
  // hidden until the roster takes the "Allow Third-Party Mercenaries?" option.
  const [newAllowThirdParty, setNewAllowThirdParty] = useState(false);
  // How the budget is governed. 'campaign' is the published economy and is the
  // default, because it is what the book describes and what a campaign needs.
  const [newForceMode, setNewForceMode] = useState<'campaign' | 'unrestricted'>('campaign');
  const [warbandToDelete, setWarbandToDelete] = useState<{ id: string; name: string } | null>(null);

  /*
    The Variant is chosen here because this is the only moment it is a free
    choice. It changes what the Warband may recruit, so picking it after the
    first models are on the roster means those models were recruited against a
    list that was not the one in force — which is how a House of Wisdom Warband
    ended up holding a Yüzbaşı its own variant forbids. It stays editable from
    the roster screen until the Warband's first game (see `canChangeVariant`).
  */
  // The same ruleset the builder is on — chosen per browser and persisted, so
  // the muster screen must not quietly offer a different edition's variants.
  const [rulesetId] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_RULESET_ID;
    return window.localStorage.getItem('trenchline_ruleset') || DEFAULT_RULESET_ID;
  });
  const { dataset } = useDataset(rulesetId);
  // Third-party Variants each unlock their own units, so they follow the same
  // switch: offering the Variant while hiding what it reveals is half a switch.
  const variantsHere = (dataset ? variantsForFaction(dataset, newFactionId) : [])
    .filter((v) => newAllowThirdParty || !v.thirdParty);

  // Changing faction invalidates the variant: they belong to one faction each.
  useEffect(() => { setNewVariantId(undefined); }, [newFactionId]);
  // Turning the switch off must not leave a third-party Variant selected.
  useEffect(() => {
    if (!newAllowThirdParty) {
      setNewVariantId((id) => (variantsHere.some((v) => v.id === id) ? id : undefined));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newAllowThirdParty]);

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
      { variantId: newVariantId, gloryPoints: newGlory, allowThirdParty: newAllowThirdParty },
    );
    setNewWarbandName('');
    setNewVariantId(undefined);
    setNewGlory(0);
    setNewAllowThirdParty(false);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/*
        `lg:` and not `sm:` for the side-by-side turn. At 768px the strapline
        already wraps to two lines, which leaves the action group about 250px
        and breaks it into two ragged rows next to a squeezed heading. Stacked
        is the better tablet layout; the row only earns its place on a desktop.
      */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-theme-border pb-4">
        <div className="min-w-0">
          <h2 className="font-gothic text-2xl sm:text-3xl text-theme-text tracking-tight">Warband Command</h2>
          <p className="eyebrow mt-1">Select, build, import and equip your strike forces</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
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
            className="flex items-center space-x-1.5 px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-mono text-xs font-bold uppercase rounded transition-colors shadow"
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
              className="w-full sm:w-auto px-6 py-3 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-mono text-xs font-bold uppercase rounded shadow-lg shadow-theme-primary/20 flex items-center justify-center space-x-2"
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
                  className={`p-4 border border-l-2 transition-colors cursor-pointer relative flex flex-col justify-between ${
                    isActive
                      ? 'bg-theme-surface border-theme-border border-l-theme-primary'
                      : 'bg-transparent border-theme-border border-l-theme-border hover:bg-theme-surface hover:border-l-theme-muted'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: faction?.color || '#D4AF37' }}
                        />
                        <span className="eyebrow accent font-bold truncate">
                          {faction?.name || wb.factionId}
                        </span>
                      </div>
                      {isActive && (
                        <span className="text-xs sm:text-[10px] font-mono font-bold bg-theme-primary text-theme-base px-1.5 py-0.5 uppercase tracking-wider flex-shrink-0">
                          Active
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
                        className="tap p-1 text-theme-muted hover:text-theme-text rounded transition-colors"
                        title="Clone / Fork Warband"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {canManageWarband(wb) && (
                        <button
                          onClick={() => setWarbandToDelete({ id: wb.id, name: wb.name })}
                          className="tap p-1 text-theme-muted hover:text-status-error rounded transition-colors"
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
                className="tap text-theme-muted hover:text-theme-text p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label htmlFor="muster-name" className="block text-xs font-mono uppercase text-theme-muted mb-1">
                  Warband Title
                </label>
                <input
                  id="muster-name"
                  type="text"
                  required
                  placeholder="e.g. 7th Iron Vanguard, Heretics of Golgotha"
                  value={newWarbandName}
                  onChange={(e) => setNewWarbandName(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded p-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                />
              </div>

              <div>
                <label htmlFor="muster-faction" className="block text-xs font-mono uppercase text-theme-muted mb-1">
                  Faction Allegiance
                </label>
                <select
                  id="muster-faction"
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

              {/* The Variant. Shown for every faction, including the ones that
                  have none — an empty list that says so beats a control that
                  silently disappears and leaves the player wondering. */}
              <div>
                <label htmlFor="muster-variant" className="block text-xs font-mono uppercase text-theme-muted mb-1">
                  Warband Variant
                </label>
                {!dataset ? (
                  <p className="text-xs font-mono text-theme-muted py-2">
                    Loading variants from the ruleset…
                  </p>
                ) : variantsHere.length === 0 ? (
                  <p className="text-xs font-mono text-theme-muted py-2">
                    No Variants are published for this faction. The standard list is the only option.
                  </p>
                ) : (
                  <>
                    <select
                      id="muster-variant"
                      value={newVariantId ?? ''}
                      onChange={(e) => setNewVariantId(e.target.value || undefined)}
                      className="w-full min-h-[44px] bg-theme-base border border-theme-border rounded p-2 text-base sm:text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                    >
                      <option value="" className="bg-theme-surface">Standard list (no Variant)</option>
                      {variantsHere.map((v) => (
                        <option key={v.id} value={v.id} className="bg-theme-surface">
                          {v.name}{v.thirdParty ? ' (third party)' : ''}
                        </option>
                      ))}
                    </select>
                    {/* What the choice costs and grants, before it is made. */}
                    {(() => {
                      const picked = variantsHere.find((v) => v.id === newVariantId);
                      if (!picked) return null;
                      return (
                        <div className="mt-2 p-2 rounded-sm bg-theme-base border border-theme-border space-y-1.5">
                          {picked.lore && (
                            <p className="text-xs text-theme-muted leading-relaxed">{picked.lore}</p>
                          )}
                          {(picked.specialRules ?? []).map((r, i) => (
                            <div key={i}>
                              <span className="text-xs font-mono font-bold text-theme-primary">{r.name}</span>
                              <p className="text-xs text-theme-muted leading-relaxed">{r.description}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </>
                )}
                <p className="text-xs font-mono text-theme-muted mt-1.5 leading-relaxed">
                  Changeable from the roster until this Warband&rsquo;s first game.
                </p>
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
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="muster-ducats" className="block text-xs font-mono uppercase text-theme-muted mb-1">
                        Starting Ducats
                      </label>
                      <input
                        id="muster-ducats"
                        type="number"
                        min="0"
                        max="5000"
                        step="50"
                        value={newDucatLimit}
                        onChange={(e) => setNewDucatLimit(parseInt(e.target.value) || 700)}
                        className="w-full min-h-[44px] bg-theme-base border border-theme-border rounded p-2 text-base sm:text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                      />
                    </div>
                    {/* Trench Crusade has two currencies and this screen offered
                        one, so an unrestricted list could not include anything
                        the catalogues price in Glory — a Witch Coven Matriarch
                        is 0 Ducats and 5 Glory. */}
                    <div>
                      <label htmlFor="muster-glory" className="block text-xs font-mono uppercase text-theme-muted mb-1">
                        Starting Glory
                      </label>
                      <input
                        id="muster-glory"
                        type="number"
                        min="0"
                        max="200"
                        step="1"
                        value={newGlory}
                        onChange={(e) => setNewGlory(parseInt(e.target.value) || 0)}
                        className="w-full min-h-[44px] bg-theme-base border border-theme-border rounded p-2 text-base sm:text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Third-party content.

                  Not a house rule the app invented: the catalogues carry an
                  "Allow Third-Party Mercenaries?" roster option and hide the
                  entries until it is taken. This is that option, and it stays
                  editable from the roster — it is a table agreement, not a
                  founding decision like the Variant. */}
              <div>
                <label
                  htmlFor="muster-third-party"
                  className="flex items-start gap-3 p-3 min-h-[44px] rounded-sm border border-theme-border cursor-pointer hover:border-theme-primary/50"
                >
                  <input
                    id="muster-third-party"
                    type="checkbox"
                    checked={newAllowThirdParty}
                    onChange={(e) => setNewAllowThirdParty(e.target.checked)}
                    className="mt-0.5 w-5 h-5 flex-shrink-0 accent-theme-primary"
                  />
                  <span className="min-w-0">
                    <span className="block font-gothic font-bold text-sm text-theme-text">
                      Allow third-party Mercenaries
                    </span>
                    <span className="block text-xs text-theme-muted mt-1 leading-relaxed">
                      Community entries that Factory Fortress condones but does not
                      guarantee for balance. Off by default, and worth agreeing with
                      your opponents first.
                    </span>
                  </span>
                </label>
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
                  className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-mono text-xs font-bold uppercase rounded shadow"
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
