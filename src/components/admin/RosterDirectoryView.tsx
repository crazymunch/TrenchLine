'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Warband } from '../../types/warband';
import { soundEffects } from '../../services/soundEffects';
import { WarbandChangelogModal } from '../builder/WarbandChangelogModal';
import { useSession } from 'next-auth/react';
import { ViewMasthead } from '../ui/ViewMasthead';
import { ConfirmModal } from '../ui/ConfirmModal';
import { matchesWarband, warbandCode } from '../../rules/warbandCode';
import { 
  Users, 
  Search, 
  Shield, 
  Eye, 
  CheckCircle, 
  PlusCircle, 
  Trash2, 
  Copy, 
  RotateCw, 
  History, 
  X, 
  Crown, 
  Bug, 
  Check, 
  Lock 
} from 'lucide-react';
import { sessionIsAdmin } from '../../lib/session';
import { useOverlay } from '../ui/useOverlay';
import { unitGlory, formatUnitCost } from '@/rules/savedGlory';

export const RosterDirectoryView: React.FC = () => {
  const { 
    warbands, 
    allCloudWarbands, 
    fetchAllCloudWarbands, 
    campaign, 
    factions, 
    activeWarbandId, 
    setActiveWarbandId, 
    setCurrentView,
    enrollWarbandInCampaign,
    removeWarbandFromCampaign,
    cloneWarband,
    deleteWarband,
    importWarband
  } = useStore();

  const { data: session } = useSession();
  const userEmail = session?.user?.email?.toLowerCase().trim();
  const isAdmin = sessionIsAdmin(session);
  const userId = (session?.user as any)?.id;

  const canManageWarband = (wb: Warband) => {
    if (isAdmin) return true;
    if (userEmail && wb.creatorName && wb.creatorName.toLowerCase().trim() === userEmail) return true;
    if (session?.user?.name && wb.creatorName && wb.creatorName === session?.user?.name) return true;
    if (userId && wb.creatorId && wb.creatorId === userId) return true;
    return false;
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFactionFilter, setSelectedFactionFilter] = useState<string>('all');
  const [selectedCampaignFilter, setSelectedCampaignFilter] = useState<'all' | 'enrolled' | 'unenrolled'>('all');
  const [inspectingWarband, setInspectingWarband] = useState<Warband | null>(null);
  const [changelogWarband, setChangelogWarband] = useState<Warband | null>(null);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [isBugListOpen, setIsBugListOpen] = useState(false);

  /*
    Scroll lock, Escape and a focus trap for the overlays below.

    `useOverlay` rather than a move to `Sheet`: the behaviour is what was
    missing and it does not have to wait for the JSX surgery (see the hook's
    own note). Without it the page behind scrolls under your finger, the
    overlay cannot be closed from the keyboard, and Tab walks out into the
    view underneath.
  */
  const inspectRef = useOverlay(Boolean(inspectingWarband), () => setInspectingWarband(null));
  const bugListRef = useOverlay(isBugListOpen, () => setIsBugListOpen(false));
  const [bugTickets, setBugTickets] = useState<any[]>([]);
  const [isCopiedAll, setIsCopiedAll] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [warbandToDelete, setWarbandToDelete] = useState<Warband | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllCloudWarbands();
  }, [fetchAllCloudWarbands]);

  const handleRefresh = async () => {
    setIsLoadingCloud(true);
    await fetchAllCloudWarbands();
    setIsLoadingCloud(false);
    soundEffects.playGunfire();
  };

  // Merge local warbands and cloud warbands uniquely
  const allKnownWarbandsMap = new Map<string, Warband>();
  warbands.forEach((wb) => allKnownWarbandsMap.set(wb.id, wb));
  allCloudWarbands.forEach((wb) => {
    if (!allKnownWarbandsMap.has(wb.id)) {
      allKnownWarbandsMap.set(wb.id, wb);
    }
  });

  const allWarbandsList = Array.from(allKnownWarbandsMap.values());

  const filteredWarbands = allWarbandsList.filter((wb) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      // Name, faction and the five-character code, so a warband someone read
      // out to you can be found without knowing how it is spelled.
      matchesWarband(wb, searchQuery) ||
      (wb.creatorName || '').toLowerCase().includes(q) ||
      (wb.patron || '').toLowerCase().includes(q) ||
      wb.units.some((u) => u.customName.toLowerCase().includes(q) || u.profileSnapshot.name.toLowerCase().includes(q));

    const matchesFaction = selectedFactionFilter === 'all' || wb.factionId === selectedFactionFilter;

    const isEnrolled = campaign.members.some((m) => m.warbandId === wb.id);
    const matchesCampaign = 
      selectedCampaignFilter === 'all' || 
      (selectedCampaignFilter === 'enrolled' && isEnrolled) ||
      (selectedCampaignFilter === 'unenrolled' && !isEnrolled);

    return matchesSearch && matchesFaction && matchesCampaign;
  });

  const handleSelectActive = (wb: Warband) => {
    if (!warbands.some((w) => w.id === wb.id)) {
      importWarband(wb);
    } else {
      setActiveWarbandId(wb.id);
    }
    soundEffects.playCathedralBell();
    setCurrentView('builder');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      
      {/* Header Banner */}
      <div className="bg-theme-surface border-2 border-theme-border rounded-md p-6 shadow-xl space-y-4 bevel-container">
        <ViewMasthead
          eyebrow="Registry"
          icon={<Users className="w-4 h-4" />}
          title="Warband Directory"
          strapline="Every warband in the system: inspect a roster, oversee campaign enrolment, and audit how a warband grew."
          actions={<>
            {isAdmin && (
              <button
                onClick={async () => {
                  setIsBugListOpen(true);
                  try {
                    const res = await fetch('/api/bug-reports');
                    if (res.ok) {
                      const data = await res.json();
                      setBugTickets(data.bugReports || []);
                    }
                  } catch {}
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-theme-accent/30 hover:bg-theme-accent/50 text-status-error border border-theme-accent rounded font-mono text-xs font-bold uppercase transition-colors"
              >
                <Bug className="w-3.5 h-3.5" />
                <span>Bug Tickets Log</span>
              </button>
            )}

            <button
              onClick={handleRefresh}
              disabled={isLoadingCloud}
              className="flex items-center space-x-2 px-3.5 py-2 bg-theme-elevated hover:bg-theme-border text-theme-text border border-theme-border rounded font-mono text-xs font-bold uppercase transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoadingCloud ? 'animate-spin text-theme-primary' : ''}`} />
              <span>Refresh Cloud Database</span>
            </button>
          </>}
        />

        {/* Search & Filter Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Search */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-theme-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Warband, Commander, Warrior..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded pl-9 pr-3 py-2 text-xs font-mono text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary"
            />
          </div>

          {/* Faction Filter */}
          <div className="md:col-span-1">
            <select
              value={selectedFactionFilter}
              onChange={(e) => setSelectedFactionFilter(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded px-3 py-2 text-xs font-mono text-theme-text focus:outline-none focus:border-theme-primary"
            >
              <option value="all">All Factions ({allWarbandsList.length})</option>
              {factions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Campaign Filter */}
          <div className="md:col-span-1">
            <select
              value={selectedCampaignFilter}
              onChange={(e) => setSelectedCampaignFilter(e.target.value as any)}
              className="w-full bg-theme-base border border-theme-border rounded px-3 py-2 text-xs font-mono text-theme-text focus:outline-none focus:border-theme-primary"
            >
              <option value="all">All Campaign Statuses</option>
              <option value="enrolled">Enrolled in Active Crusade ({campaign.members.length})</option>
              <option value="unenrolled">Unenrolled Warbands</option>
            </select>
          </div>
        </div>
      </div>

      {/* Warbands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWarbands.map((wb) => {
          const faction = factions.find((f) => f.id === wb.factionId);
          const isEnrolled = campaign.members.some((m) => m.warbandId === wb.id);
          const isActive = wb.id === activeWarbandId;
          const totalPoints = wb.units.reduce((s, u) => s + u.totalCost, 0);
          const leader = wb.units.find((u) => u.profileSnapshot.category === 'Leader') || wb.units[0];
          const eliteCount = wb.units.filter((u) => u.profileSnapshot.category === 'Elite').length;
          const trooperCount = wb.units.filter((u) => u.profileSnapshot.category === 'Trooper').length;

          return (
            <div
              key={wb.id}
              className={`bg-theme-surface border-2 rounded-md p-5 flex flex-col justify-between space-y-4 shadow-xl transition-all bevel-container ${
                isActive
                  ? 'border-theme-primary ring-1 ring-theme-primary/50'
                  : isEnrolled
                  ? 'border-theme-border hover:border-theme-primary/40'
                  : 'border-theme-border/70 opacity-90 hover:opacity-100'
              }`}
            >
              <div className="space-y-3">
                
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2 border-b border-theme-border pb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: faction?.color || '#D4AF37' }}
                      />
                      <span className="text-xs sm:text-[10px] font-mono uppercase font-bold text-theme-muted">
                        {faction?.name || wb.factionId}
                      </span>
                    </div>
                    <h3 className="font-gothic font-bold text-lg text-theme-text mt-0.5 tracking-wide">
                      {wb.name}
                    </h3>
                    <span className="text-xs sm:text-[11px] font-mono text-theme-muted block">
                      Commander: <strong className="text-theme-text">{wb.creatorName || 'Crusade Commander'}</strong>
                    </span>
                    {/*
                      The warband's code. Shown here because this is the page
                      you are on when you want to give someone a roster to add
                      to a match — copies on tap, five characters, no O or I.
                    */}
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(warbandCode(wb.id)).catch(() => {});
                        setCopiedCode(wb.id);
                        window.setTimeout(() => setCopiedCode((c) => (c === wb.id ? null : c)), 1500);
                      }}
                      className="mt-1 inline-flex items-center gap-1 font-mono text-xs sm:text-[11px] tracking-widest text-theme-primary hover:text-theme-text"
                      title="Copy this warband's code"
                    >
                      <span>{warbandCode(wb.id)}</span>
                      <Copy className="w-3 h-3" />
                      {copiedCode === wb.id && <span className="text-status-legal tracking-normal">copied</span>}
                    </button>
                  </div>

                  {/* Campaign Status Badge */}
                  {isEnrolled ? (
                    <span className="px-2 py-0.5 rounded bg-theme-elevated border border-status-legal/50 text-status-legal text-xs sm:text-[10px] font-mono font-bold uppercase flex items-center space-x-1 flex-shrink-0">
                      <CheckCircle className="w-3 h-3" />
                      <span>CRUSADE</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-theme-base border border-theme-border text-theme-muted text-xs sm:text-[10px] font-mono font-bold uppercase flex-shrink-0">
                      UNENROLLED
                    </span>
                  )}
                </div>

                {/* Warband Stats Row */}
                <div className="grid grid-cols-3 gap-2 bg-theme-base p-2.5 rounded border border-theme-border text-xs font-mono text-center">
                  <div>
                    <span className="text-xs sm:text-[9px] uppercase text-theme-muted block">Points</span>
                    <strong className="text-theme-primary">{totalPoints} D</strong>
                  </div>
                  <div>
                    <span className="text-xs sm:text-[9px] uppercase text-theme-muted block">Treasury</span>
                    <strong className="text-theme-text">{wb.treasuryDucats} D</strong>
                  </div>
                  <div>
                    <span className="text-xs sm:text-[9px] uppercase text-theme-muted block">Warriors</span>
                    <strong className="text-theme-text">{wb.units.length}</strong>
                  </div>
                </div>

                {/* Key Units Preview */}
                <div className="text-xs font-mono space-y-1">
                  <div className="flex justify-between text-theme-muted">
                    <span>Leader:</span>
                    <strong className="text-theme-text">{leader?.customName || 'Unassigned'}</strong>
                  </div>
                  <div className="flex justify-between text-theme-muted">
                    <span>Composition:</span>
                    <span>{eliteCount} Elites • {trooperCount} Troopers</span>
                  </div>
                  {wb.snapshots && wb.snapshots.length > 0 && (
                    <div className="flex justify-between text-theme-primary text-xs sm:text-[11px] pt-1">
                      <span>History Milestones:</span>
                      <strong>{wb.snapshots.length} Snapshots</strong>
                    </div>
                  )}
                </div>

              </div>

              {/* Card Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-theme-border">
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <button
                    onClick={() => setInspectingWarband(wb)}
                    className="py-1.5 px-2 bg-theme-elevated hover:bg-theme-border text-theme-text rounded font-bold uppercase flex items-center justify-center space-x-1 transition-colors border border-theme-border"
                  >
                    <Eye className="w-3.5 h-3.5 text-theme-primary" />
                    <span>Inspect</span>
                  </button>

                  <button
                    onClick={() => setChangelogWarband(wb)}
                    className="py-1.5 px-2 bg-theme-elevated hover:bg-theme-border text-theme-text rounded font-bold uppercase flex items-center justify-center space-x-1 transition-colors border border-theme-border"
                  >
                    <History className="w-3.5 h-3.5 text-theme-primary" />
                    <span>Growth</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  {canManageWarband(wb) ? (
                    <>
                      {isEnrolled ? (
                        <button
                          onClick={() => removeWarbandFromCampaign(wb.id)}
                          className="py-1.5 px-2 bg-theme-accent/30 hover:bg-theme-accent/60 text-status-error border border-theme-accent/50 rounded font-bold uppercase flex items-center justify-center space-x-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => enrollWarbandInCampaign(wb)}
                          className="py-1.5 px-2 bg-status-legal/30 hover:bg-status-legal/60 text-status-legal border border-status-legal/50 rounded font-bold uppercase flex items-center justify-center space-x-1 transition-colors"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Enlist</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleSelectActive(wb)}
                        className="py-1.5 px-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-base rounded font-bold uppercase flex items-center justify-center space-x-1 transition-colors shadow"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </button>

                      {/*
                        Delete, on the same gate as everything else on this row:
                        your own warband, or an admin's. The API enforces it
                        independently — a client that hid the button would not
                        be a permission — and the row spans both columns so it
                        cannot be hit while reaching for Manage.
                      */}
                      <button
                        onClick={() => { setDeleteError(null); setWarbandToDelete(wb); }}
                        className="col-span-2 py-1.5 px-2 bg-theme-base hover:bg-status-error/20 text-status-error border border-status-error/40 rounded font-bold uppercase flex items-center justify-center space-x-1 transition-colors min-h-[44px] sm:min-h-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete warband</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          cloneWarband(wb.id);
                          soundEffects.playCathedralBell();
                          setCurrentView('builder');
                        }}
                        className="py-1.5 px-2 bg-theme-elevated hover:bg-theme-border text-theme-text border border-theme-border rounded font-bold uppercase flex items-center justify-center space-x-1 transition-colors"
                        title="Clone a local copy of this warband"
                      >
                        <Copy className="w-3.5 h-3.5 text-theme-primary" />
                        <span>Clone Copy</span>
                      </button>

                      <button
                        onClick={() => setInspectingWarband(wb)}
                        className="py-1.5 px-2 bg-theme-base text-theme-muted border border-theme-border rounded font-bold uppercase flex items-center justify-center space-x-1 cursor-default"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Read Only</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/*
        Deleting is irreversible and reaches the cloud, so it asks first and
        names what it is deleting — the roster, its history and its enrolment.
      */}
      <ConfirmModal
        isOpen={Boolean(warbandToDelete)}
        title="Delete this warband?"
        message={warbandToDelete
          ? `${warbandToDelete.name} (${warbandCode(warbandToDelete.id)}) — `
            + `${warbandToDelete.units.length} warriors and `
            + `${warbandToDelete.snapshots?.length ?? 0} snapshots. This deletes it from the `
            + 'cloud as well as from this device, and cannot be undone.'
          : ''}
        confirmLabel="Delete permanently"
        onCancel={() => setWarbandToDelete(null)}
        onConfirm={async () => {
          const target = warbandToDelete;
          setWarbandToDelete(null);
          if (!target) return;
          const res = await deleteWarband(target.id);
          if (res.ok) {
            soundEffects.playGunfire();
          } else {
            // Never silent: a 403 from the API used to make the row vanish
            // locally and reappear on the next refresh with nothing said.
            setDeleteError(`${target.name} was removed from this device, but the cloud `
              + `refused to delete it: ${res.error}`);
          }
        }}
      />

      {deleteError && (
        <div className="p-3 bg-status-error/15 border border-status-error rounded text-xs font-mono text-status-error flex items-start justify-between gap-3">
          <span className="leading-relaxed">{deleteError}</span>
          <button onClick={() => setDeleteError(null)} className="font-bold flex-shrink-0">Dismiss</button>
        </div>
      )}

      {/* Detailed Warband Inspection Modal */}
      {inspectingWarband && (
        <div ref={inspectRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-surface border-2 border-theme-primary w-full max-w-4xl max-h-[90dvh] rounded-md shadow-2xl flex flex-col overflow-hidden bevel-container">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border bg-theme-base">
              <div className="flex items-center space-x-3">
                <Shield className="w-6 h-6 text-theme-primary" />
                <div>
                  <h2 className="font-gothic font-bold text-xl text-theme-text tracking-wide">
                    {inspectingWarband.name}
                  </h2>
                  <p className="text-xs font-mono text-theme-muted">
                    Commander: <strong className="text-theme-text">{inspectingWarband.creatorName || 'Crusade Commander'}</strong> • Faction: <strong className="text-theme-primary">{inspectingWarband.factionId}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleSelectActive(inspectingWarband)}
                  className="px-3 py-1 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-mono text-xs font-bold uppercase rounded shadow"
                >
                  Set as Active
                </button>
                <button
                  onClick={() => setInspectingWarband(null)}
                  className="tap text-theme-muted hover:text-theme-text p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Lore & Patron Callout */}
              {(inspectingWarband.lore || inspectingWarband.patron || inspectingWarband.motto) && (
                <div className="p-4 bg-theme-base border border-theme-border rounded-md space-y-2 font-mono text-xs">
                  {inspectingWarband.motto && (
                    <p className="text-sm font-gothic italic text-theme-primary">
                      &ldquo;{inspectingWarband.motto}&rdquo;
                    </p>
                  )}
                  {inspectingWarband.patron && (
                    <div className="text-xs sm:text-[11px] text-theme-muted">
                      Patron Sovereign: <strong className="text-theme-text">{inspectingWarband.patron}</strong>
                    </div>
                  )}
                  {inspectingWarband.lore && (
                    <p className="text-xs text-theme-text leading-relaxed pt-1 whitespace-pre-line">
                      {inspectingWarband.lore}
                    </p>
                  )}
                </div>
              )}

              {/* Units Roster */}
              <div className="space-y-3">
                <h3 className="font-gothic font-bold text-base text-theme-primary border-b border-theme-border pb-2 flex items-center justify-between">
                  <span>WARRIORS ROSTER ({inspectingWarband.units.length})</span>
                  <span className="text-xs font-mono text-theme-text">
                    Total Rating: {inspectingWarband.units.reduce((s, u) => s + u.totalCost, 0)} Ducats
                  </span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inspectingWarband.units.map((u) => (
                    <div
                      key={u.id}
                      className="p-4 bg-theme-elevated border border-theme-border rounded-md space-y-3 bevel-container font-mono text-xs"
                    >
                      <div className="flex items-start justify-between border-b border-theme-border pb-2">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            {u.profileSnapshot.category === 'Leader' && (
                              <Crown className="w-3.5 h-3.5 text-theme-primary" />
                            )}
                            <h4 className="font-gothic font-bold text-sm text-theme-text">
                              {u.customName}
                            </h4>
                          </div>
                          <span className="text-xs sm:text-[10px] text-theme-muted">
                            {u.profileSnapshot.name} ({u.profileSnapshot.category})
                          </span>
                        </div>
                        <span className="text-xs font-bold text-theme-primary whitespace-nowrap">
                          {formatUnitCost(u.totalCost, unitGlory(u))}
                        </span>
                      </div>

                      {/* Statline */}
                      <div className="grid grid-cols-4 gap-1 bg-theme-base p-1.5 rounded border border-theme-border text-center text-xs sm:text-[10px]">
                        <div className="min-w-0 truncate">MOV: <strong className="text-theme-text">{u.profileSnapshot.stats.movementInches ? `${u.profileSnapshot.stats.movementInches}"` : u.profileSnapshot.stats.movement}</strong></div>
                        <div>RNG: <strong className="text-theme-text">{u.profileSnapshot.stats.ranged}</strong></div>
                        <div>MEL: <strong className="text-theme-text">{u.profileSnapshot.stats.melee}</strong></div>
                        <div>SAVE: <strong className="text-theme-text">{u.profileSnapshot.stats.armour}</strong></div>
                      </div>

                      {/* Wargear */}
                      <div className="space-y-1 text-xs sm:text-[11px]">
                        <div className="text-theme-muted">
                          Weapons: <strong className="text-theme-text">{u.equippedWeapons.map((w) => w.name).join(', ') || 'None'}</strong>
                        </div>
                        <div className="text-theme-muted">
                          Armour: <strong className="text-theme-text">{u.equippedArmour.map((a) => a.name).join(', ') || 'None'}</strong>
                        </div>
                        {u.equippedEquipment.length > 0 && (
                          <div className="text-theme-muted">
                            Gear: <strong className="text-theme-text">{u.equippedEquipment.map((e) => e.name).join(', ')}</strong>
                          </div>
                        )}
                      </div>

                      {/* Injuries & Deeds */}
                      {u.injuries && u.injuries.length > 0 && (
                        <div className="text-xs sm:text-[10px] text-status-error pt-1">
                          Injuries: {u.injuries.join(' • ')}
                        </div>
                      )}
                      {u.deeds && u.deeds.length > 0 && (
                        <div className="text-xs sm:text-[10px] text-theme-primary pt-0.5">
                          Deeds: {u.deeds[0]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Warband Growth Changelog Modal */}
      {changelogWarband && (
        <WarbandChangelogModal
          warband={changelogWarband}
          onClose={() => setChangelogWarband(null)}
        />
      )}

      {/* Bug Reports / Feedback Log Modal (Admin) */}
      {isBugListOpen && (
        <div ref={bugListRef} className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-mono text-xs">
          <div className="bg-theme-surface border-2 border-theme-primary w-full max-w-3xl max-h-[90dvh] rounded-lg shadow-2xl overflow-hidden flex flex-col bevel-container">
            {/* Header */}
            <div className="p-4 bg-theme-base border-b border-theme-border flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded bg-theme-accent/30 border border-theme-accent text-status-error">
                  <Bug className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-gothic font-bold text-base text-theme-text">
                    COMMUNITY BUG TICKETS & FEEDBACK LOG
                  </h3>
                  <span className="text-xs sm:text-[10px] text-theme-muted block">
                    {bugTickets.length} report{bugTickets.length === 1 ? '' : 's'} collected across phones, iPads, and desktops
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsBugListOpen(false)}
                className="tap text-theme-muted hover:text-theme-text p-1"
              >
                ✕
              </button>
            </div>

            {/* List */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {bugTickets.length === 0 ? (
                <div className="p-8 text-center space-y-2 text-theme-muted">
                  <Bug className="w-8 h-8 text-theme-muted mx-auto opacity-50" />
                  <p>No bug reports logged yet.</p>
                </div>
              ) : (
                bugTickets.map((ticket, idx) => (
                  <div key={ticket.id || idx} className="p-4 bg-theme-base rounded border border-theme-border space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-theme-border/60 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-theme-accent/40 text-status-error font-bold text-xs sm:text-[10px] uppercase">
                          {ticket.area || 'General'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-theme-elevated text-theme-primary text-xs sm:text-[10px]">
                          {ticket.severity}
                        </span>
                      </div>
                      <span className="text-xs sm:text-[10px] text-theme-muted">
                        {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'Recent'}
                      </span>
                    </div>

                    <p className="text-theme-text whitespace-pre-line text-xs">
                      {ticket.description}
                    </p>

                    {ticket.title && (
                      <div className="text-xs sm:text-[11px] text-theme-muted bg-theme-surface p-2 rounded border border-theme-border/40">
                        <strong>Title:</strong> {ticket.title}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-[10px] text-theme-muted pt-1 border-t border-theme-border/40">
                      {/*
                        The reporter comes from the SESSION now, so this is
                        either a real account or genuinely anonymous — it used
                        to fall back to `body.userEmail`, which was whatever
                        the submitter typed. The device, view and ruleset are
                        appended to the description by the API rather than
                        being columns of their own.
                      */}
                      <span>Reporter: <strong className="text-theme-text">
                        {ticket.reporter?.name || ticket.reporter?.email || 'Anonymous'}
                      </strong></span>
                      <span>Status: <strong>{ticket.status}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-theme-base border-t border-theme-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => {
                  const dump = bugTickets.map((t) => `### Bug: ${t.category} (${t.severity})
- **Reporter:** ${t.reporter?.name || t.reporter?.email || 'Anonymous'}
- **Device:** ${t.deviceType} (${t.screenResolution})
- **View:** ${t.currentView} (v${t.rulesetVersion})
- **Description:** ${t.description}
${t.stepsToReproduce ? `- **Steps:** ${t.stepsToReproduce}` : ''}`).join('\n\n---\n\n');
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(dump);
                    setIsCopiedAll(true);
                    setTimeout(() => setIsCopiedAll(false), 2000);
                  }
                }}
                className={`px-4 py-2 rounded font-bold uppercase flex items-center space-x-2 text-xs transition-all ${
                  isCopiedAll ? 'bg-status-legal text-white' : 'bg-theme-elevated hover:bg-theme-border text-theme-text border border-theme-border'
                }`}
              >
                {isCopiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-theme-primary" />}
                <span>{isCopiedAll ? 'All Tickets Copied!' : 'Copy All Tickets for AI Agent'}</span>
              </button>

              <button
                onClick={() => setIsBugListOpen(false)}
                className="px-5 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
