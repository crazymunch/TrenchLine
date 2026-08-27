'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Warband } from '../../types/warband';
import { soundEffects } from '../../services/soundEffects';
import { WarbandChangelogModal } from '../builder/WarbandChangelogModal';
import { useSession } from 'next-auth/react';
import { 
  Users, 
  Search, 
  Filter, 
  Shield, 
  Swords, 
  Coins, 
  Sparkles, 
  Flag, 
  Eye, 
  CheckCircle, 
  PlusCircle, 
  Trash2, 
  Copy, 
  RotateCw, 
  History, 
  X, 
  Skull, 
  Award, 
  Crown, 
  ChevronRight, 
  ExternalLink, 
  BookOpen, 
  Bug, 
  Check, 
  Lock 
} from 'lucide-react';

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
    importWarband
  } = useStore();

  const { data: session } = useSession();
  const userEmail = session?.user?.email?.toLowerCase().trim();
  const isAdmin = userEmail === 'crazymunch@gmail.com' || Boolean((session?.user as any)?.isAdmin);
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
  const [bugTickets, setBugTickets] = useState<any[]>([]);
  const [isCopiedAll, setIsCopiedAll] = useState(false);

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
      wb.name.toLowerCase().includes(q) || 
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
      <div className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 shadow-xl space-y-4 bevel-container">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Users className="w-6 h-6 text-[#D4AF37]" />
              <h1 className="font-gothic font-bold text-2xl text-[#ECEFF4] tracking-wide">
                GLOBAL WARBAND DIRECTORY & CRUSADE ROSTER
              </h1>
            </div>
            <p className="text-xs font-mono text-[#8E95A5]">
              Administrative command center to inspect all warbands in the system, oversee campaign enrollment, and audit warband growth.
            </p>
          </div>

          <div className="flex items-center space-x-3 flex-shrink-0">
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
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#8B0000]/30 hover:bg-[#8B0000]/50 text-[#E53935] border border-[#8B0000] rounded font-mono text-xs font-bold uppercase transition-colors"
              >
                <Bug className="w-3.5 h-3.5" />
                <span>Bug Tickets Log</span>
              </button>
            )}

            <button
              onClick={handleRefresh}
              disabled={isLoadingCloud}
              className="flex items-center space-x-2 px-3.5 py-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] rounded font-mono text-xs font-bold uppercase transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoadingCloud ? 'animate-spin text-[#D4AF37]' : ''}`} />
              <span>Refresh Cloud Database</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Search */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-[#8E95A5] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Warband, Commander, Warrior..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0C0E12] border border-[#323846] rounded pl-9 pr-3 py-2 text-xs font-mono text-[#ECEFF4] placeholder-[#8E95A5] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {/* Faction Filter */}
          <div className="md:col-span-1">
            <select
              value={selectedFactionFilter}
              onChange={(e) => setSelectedFactionFilter(e.target.value)}
              className="w-full bg-[#0C0E12] border border-[#323846] rounded px-3 py-2 text-xs font-mono text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
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
              className="w-full bg-[#0C0E12] border border-[#323846] rounded px-3 py-2 text-xs font-mono text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
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
              className={`bg-[#161920] border-2 rounded-md p-5 flex flex-col justify-between space-y-4 shadow-xl transition-all bevel-container ${
                isActive
                  ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/50'
                  : isEnrolled
                  ? 'border-[#323846] hover:border-[#D4AF37]/40'
                  : 'border-[#323846]/70 opacity-90 hover:opacity-100'
              }`}
            >
              <div className="space-y-3">
                
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2 border-b border-[#323846] pb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: faction?.color || '#D4AF37' }}
                      />
                      <span className="text-[10px] font-mono uppercase font-bold text-[#8E95A5]">
                        {faction?.name || wb.factionId}
                      </span>
                    </div>
                    <h3 className="font-gothic font-bold text-lg text-[#ECEFF4] mt-0.5 tracking-wide">
                      {wb.name}
                    </h3>
                    <span className="text-[11px] font-mono text-[#8E95A5] block">
                      Commander: <strong className="text-[#ECEFF4]">{wb.creatorName || 'Crusade Commander'}</strong>
                    </span>
                  </div>

                  {/* Campaign Status Badge */}
                  {isEnrolled ? (
                    <span className="px-2 py-0.5 rounded bg-[#20242E] border border-[#4E9A6E]/50 text-[#4E9A6E] text-[10px] font-mono font-bold uppercase flex items-center space-x-1 flex-shrink-0">
                      <CheckCircle className="w-3 h-3" />
                      <span>CRUSADE</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-[#0C0E12] border border-[#323846] text-[#8E95A5] text-[10px] font-mono font-bold uppercase flex-shrink-0">
                      UNENROLLED
                    </span>
                  )}
                </div>

                {/* Warband Stats Row */}
                <div className="grid grid-cols-3 gap-2 bg-[#0C0E12] p-2.5 rounded border border-[#323846] text-xs font-mono text-center">
                  <div>
                    <span className="text-[9px] uppercase text-[#8E95A5] block">Points</span>
                    <strong className="text-[#D4AF37]">{totalPoints} D</strong>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-[#8E95A5] block">Treasury</span>
                    <strong className="text-[#ECEFF4]">{wb.treasuryDucats} D</strong>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-[#8E95A5] block">Warriors</span>
                    <strong className="text-[#ECEFF4]">{wb.units.length}</strong>
                  </div>
                </div>

                {/* Key Units Preview */}
                <div className="text-xs font-mono space-y-1">
                  <div className="flex justify-between text-[#8E95A5]">
                    <span>Leader:</span>
                    <strong className="text-[#ECEFF4]">{leader?.customName || 'Unassigned'}</strong>
                  </div>
                  <div className="flex justify-between text-[#8E95A5]">
                    <span>Composition:</span>
                    <span>{eliteCount} Elites • {trooperCount} Troopers</span>
                  </div>
                  {wb.snapshots && wb.snapshots.length > 0 && (
                    <div className="flex justify-between text-[#D4AF37] text-[11px] pt-1">
                      <span>History Milestones:</span>
                      <strong>{wb.snapshots.length} Snapshots</strong>
                    </div>
                  )}
                </div>

              </div>

              {/* Card Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-[#323846]">
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <button
                    onClick={() => setInspectingWarband(wb)}
                    className="py-1.5 px-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] rounded font-bold uppercase flex items-center justify-center space-x-1 transition-colors border border-[#323846]"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Inspect</span>
                  </button>

                  <button
                    onClick={() => setChangelogWarband(wb)}
                    className="py-1.5 px-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] rounded font-bold uppercase flex items-center justify-center space-x-1 transition-colors border border-[#323846]"
                  >
                    <History className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Growth</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  {canManageWarband(wb) ? (
                    <>
                      {isEnrolled ? (
                        <button
                          onClick={() => removeWarbandFromCampaign(wb.id)}
                          className="py-1.5 px-2 bg-[#8B0000]/30 hover:bg-[#8B0000]/60 text-[#E53935] border border-[#8B0000]/50 rounded font-bold uppercase flex items-center justify-center space-x-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => enrollWarbandInCampaign(wb)}
                          className="py-1.5 px-2 bg-[#4E9A6E]/30 hover:bg-[#4E9A6E]/60 text-[#4E9A6E] border border-[#4E9A6E]/50 rounded font-bold uppercase flex items-center justify-center space-x-1 transition-colors"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Enlist</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleSelectActive(wb)}
                        className="py-1.5 px-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black rounded font-bold uppercase flex items-center justify-center space-x-1 transition-colors shadow"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Manage</span>
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
                        className="py-1.5 px-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] rounded font-bold uppercase flex items-center justify-center space-x-1 transition-colors"
                        title="Clone a local copy of this warband"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Clone Copy</span>
                      </button>

                      <button
                        onClick={() => setInspectingWarband(wb)}
                        className="py-1.5 px-2 bg-[#0C0E12] text-[#8E95A5] border border-[#323846] rounded font-bold uppercase flex items-center justify-center space-x-1 cursor-default"
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

      {/* Detailed Warband Inspection Modal */}
      {inspectingWarband && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-4xl max-h-[90vh] rounded-md shadow-2xl flex flex-col overflow-hidden bevel-container">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#323846] bg-[#0C0E12]">
              <div className="flex items-center space-x-3">
                <Shield className="w-6 h-6 text-[#D4AF37]" />
                <div>
                  <h2 className="font-gothic font-bold text-xl text-[#ECEFF4] tracking-wide">
                    {inspectingWarband.name}
                  </h2>
                  <p className="text-xs font-mono text-[#8E95A5]">
                    Commander: <strong className="text-[#ECEFF4]">{inspectingWarband.creatorName || 'Crusade Commander'}</strong> • Faction: <strong className="text-[#D4AF37]">{inspectingWarband.factionId}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleSelectActive(inspectingWarband)}
                  className="px-3 py-1 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-mono text-xs font-bold uppercase rounded shadow"
                >
                  Set as Active
                </button>
                <button
                  onClick={() => setInspectingWarband(null)}
                  className="text-[#8E95A5] hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Lore & Patron Callout */}
              {(inspectingWarband.lore || inspectingWarband.patron || inspectingWarband.motto) && (
                <div className="p-4 bg-[#0C0E12] border border-[#323846] rounded-md space-y-2 font-mono text-xs">
                  {inspectingWarband.motto && (
                    <p className="text-sm font-gothic italic text-[#D4AF37]">
                      &ldquo;{inspectingWarband.motto}&rdquo;
                    </p>
                  )}
                  {inspectingWarband.patron && (
                    <div className="text-[11px] text-[#8E95A5]">
                      Patron Sovereign: <strong className="text-[#ECEFF4]">{inspectingWarband.patron}</strong>
                    </div>
                  )}
                  {inspectingWarband.lore && (
                    <p className="text-xs text-[#ECEFF4] leading-relaxed pt-1 whitespace-pre-line">
                      {inspectingWarband.lore}
                    </p>
                  )}
                </div>
              )}

              {/* Units Roster */}
              <div className="space-y-3">
                <h3 className="font-gothic font-bold text-base text-[#D4AF37] border-b border-[#323846] pb-2 flex items-center justify-between">
                  <span>WARRIORS ROSTER ({inspectingWarband.units.length})</span>
                  <span className="text-xs font-mono text-[#ECEFF4]">
                    Total Rating: {inspectingWarband.units.reduce((s, u) => s + u.totalCost, 0)} Ducats
                  </span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inspectingWarband.units.map((u) => (
                    <div
                      key={u.id}
                      className="p-4 bg-[#20242E] border border-[#323846] rounded-md space-y-3 bevel-container font-mono text-xs"
                    >
                      <div className="flex items-start justify-between border-b border-[#323846] pb-2">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            {u.profileSnapshot.category === 'Leader' && (
                              <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
                            )}
                            <h4 className="font-gothic font-bold text-sm text-[#ECEFF4]">
                              {u.customName}
                            </h4>
                          </div>
                          <span className="text-[10px] text-[#8E95A5]">
                            {u.profileSnapshot.name} ({u.profileSnapshot.category})
                          </span>
                        </div>
                        <span className="text-xs font-bold text-[#D4AF37]">{u.totalCost} D</span>
                      </div>

                      {/* Statline */}
                      <div className="grid grid-cols-4 gap-1 bg-[#0C0E12] p-1.5 rounded border border-[#323846] text-center text-[10px]">
                        <div>MOV: <strong className="text-white">{u.profileSnapshot.stats.movement}</strong></div>
                        <div>RNG: <strong className="text-white">{u.profileSnapshot.stats.ranged}</strong></div>
                        <div>MEL: <strong className="text-white">{u.profileSnapshot.stats.melee}</strong></div>
                        <div>ARM: <strong className="text-white">{u.profileSnapshot.stats.armour}</strong></div>
                      </div>

                      {/* Wargear */}
                      <div className="space-y-1 text-[11px]">
                        <div className="text-[#8E95A5]">
                          Weapons: <strong className="text-[#ECEFF4]">{u.equippedWeapons.map((w) => w.name).join(', ') || 'None'}</strong>
                        </div>
                        <div className="text-[#8E95A5]">
                          Armour: <strong className="text-[#ECEFF4]">{u.equippedArmour.map((a) => a.name).join(', ') || 'None'}</strong>
                        </div>
                        {u.equippedEquipment.length > 0 && (
                          <div className="text-[#8E95A5]">
                            Gear: <strong className="text-[#ECEFF4]">{u.equippedEquipment.map((e) => e.name).join(', ')}</strong>
                          </div>
                        )}
                      </div>

                      {/* Injuries & Deeds */}
                      {u.injuries && u.injuries.length > 0 && (
                        <div className="text-[10px] text-[#E53935] pt-1">
                          Injuries: {u.injuries.join(' • ')}
                        </div>
                      )}
                      {u.deeds && u.deeds.length > 0 && (
                        <div className="text-[10px] text-[#D4AF37] pt-0.5">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-mono text-xs">
          <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-3xl max-h-[90vh] rounded-lg shadow-2xl overflow-hidden flex flex-col bevel-container">
            {/* Header */}
            <div className="p-4 bg-[#0C0E12] border-b border-[#323846] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded bg-[#8B0000]/30 border border-[#8B0000] text-[#E53935]">
                  <Bug className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-gothic font-bold text-base text-[#ECEFF4]">
                    COMMUNITY BUG TICKETS & FEEDBACK LOG
                  </h3>
                  <span className="text-[10px] text-[#8E95A5] block">
                    {bugTickets.length} report{bugTickets.length === 1 ? '' : 's'} collected across phones, iPads, and desktops
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsBugListOpen(false)}
                className="text-[#8E95A5] hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* List */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {bugTickets.length === 0 ? (
                <div className="p-8 text-center space-y-2 text-[#8E95A5]">
                  <Bug className="w-8 h-8 text-[#8E95A5] mx-auto opacity-50" />
                  <p>No bug reports logged yet.</p>
                </div>
              ) : (
                bugTickets.map((ticket, idx) => (
                  <div key={ticket.id || idx} className="p-4 bg-[#0C0E12] rounded border border-[#323846] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#323846]/60 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-[#8B0000]/40 text-[#E53935] font-bold text-[10px] uppercase">
                          {ticket.category}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#20242E] text-[#D4AF37] text-[10px]">
                          {ticket.severity}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#8E95A5]">
                        {ticket.timestamp ? new Date(ticket.timestamp).toLocaleString() : 'Recent'}
                      </span>
                    </div>

                    <p className="text-[#ECEFF4] whitespace-pre-line text-xs">
                      {ticket.description}
                    </p>

                    {ticket.stepsToReproduce && (
                      <div className="text-[11px] text-[#8E95A5] bg-[#161920] p-2 rounded border border-[#323846]/40">
                        <strong>Steps:</strong> {ticket.stepsToReproduce}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#8E95A5] pt-1 border-t border-[#323846]/40">
                      <span>Reporter: <strong className="text-[#ECEFF4]">{ticket.submittedBy || ticket.userEmail || 'Anonymous'}</strong></span>
                      <span>Device: <strong>{ticket.deviceType} ({ticket.screenResolution})</strong></span>
                      <span>View: <strong>{ticket.currentView}</strong></span>
                      <span>Ruleset: <strong>v{ticket.rulesetVersion}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#0C0E12] border-t border-[#323846] flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => {
                  const dump = bugTickets.map((t) => `### Bug: ${t.category} (${t.severity})
- **Reporter:** ${t.submittedBy || t.userEmail}
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
                  isCopiedAll ? 'bg-[#4E9A6E] text-white' : 'bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846]'
                }`}
              >
                {isCopiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />}
                <span>{isCopiedAll ? 'All Tickets Copied!' : 'Copy All Tickets for AI Agent'}</span>
              </button>

              <button
                onClick={() => setIsBugListOpen(false)}
                className="px-5 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded text-xs"
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
