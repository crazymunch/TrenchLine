'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useDataset } from '@/rules/useDataset';
import {
  FRAMEWORKS, carcassFrontTerritories, frameworkOf, frameworkNamed,
} from '@/rules/campaignFramework';
import type { CampaignFramework } from '@/types/campaign';
import { TerritoryMap } from './TerritoryMap';
import { CampaignSyncStatus } from './CampaignSyncStatus';
import { LogMatchModal } from './LogMatchModal';
import { 
  Sparkles, 
  Trophy, 
  Copy, 
  Check, 
  History, 
  Map, 
  Scroll,
  Plus,
  X,
  Swords
} from 'lucide-react';
import { useOverlay } from '../ui/useOverlay';

export const CampaignHubView: React.FC = () => {
  const { campaign, factions, createCampaign, getActiveWarband } = useStore();
  const activeWb = getActiveWarband();
  const syncCampaign = useStore((s) => s.syncCampaignWithCloud);

  /*
    Reconcile on arrival. A campaign with no cloud copy resolves to
    "On this device" without a request, so this costs nothing for the local
    case — which today is every case, since nothing yet gives a campaign a
    `cloudId`. See the "first sync" section of `docs/CAMPAIGN-SYNC.md`.
  */
  React.useEffect(() => { void syncCampaign(); }, [syncCampaign, campaign.cloudId]);

  /*
    The dataset, for the Carcass Front zones a `carcass-front` campaign is
    played on. Fetched here rather than in the store because the store is
    synchronous and dataset-free by design, and because a failure to load has
    to be VISIBLE at the moment of choosing: a campaign created with no zones
    would silently be seated on the app's twelve world theatres instead.
  */
  const { dataset, error: datasetError } = useDataset();
  const cfTerritories = carcassFrontTerritories(dataset?.carcassFrontMap);

  const [activeTab, setActiveTab] = useState<'leaderboard' | 'chronicle' | 'territory' | 'matches'>('leaderboard');
  const [copied, setCopied] = useState(false);
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false);

  /*
    Scroll lock, Escape and a focus trap for the overlay below.

    `useOverlay` rather than a move to `Sheet`: the behaviour is what was
    missing and it does not have to wait for the JSX surgery (see the hook's
    own note). Without it the page behind scrolls under your finger, the
    overlay cannot be closed from the keyboard, and Tab walks out into the
    view underneath.
  */
  const newCampaignRef = useOverlay(isNewCampaignModalOpen, () => setIsNewCampaignModalOpen(false));
  const [isLogMatchOpen, setIsLogMatchOpen] = useState(false);
  const [expandedMatchIds, setExpandedMatchIds] = useState<string[]>(['match-hist-1']);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newMaxDucats, setNewMaxDucats] = useState(700);
  const [newGloryGoal, setNewGloryGoal] = useState(25);
  const [newFramework, setNewFramework] = useState<CampaignFramework>('classic');

  const toggleMatchExpanded = (id: string) => {
    setExpandedMatchIds((prev) => 
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(campaign.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateCampaignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;
    if (newFramework === 'carcass-front' && !cfTerritories.length) return;
    createCampaign(
      newCampaignName.trim(), newMaxDucats, newGloryGoal, newFramework,
      newFramework === 'carcass-front' ? cfTerritories : undefined,
    );
    setIsNewCampaignModalOpen(false);
    setNewCampaignName('');
    setNewFramework('classic');
  };

  // Sort leaderboard by Glory points descending
  const sortedMembers = [...campaign.members].sort((a, b) => b.glory - a.glory);
  const leadingMember = sortedMembers[0];
  /* Which rules this campaign is played under — see the banner and the gauge. */
  const onCarcassFrontCampaign = frameworkOf(campaign) === 'carcass-front';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      
      {/* Campaign Command Banner */}
      <div className="bg-theme-surface border-2 border-theme-border rounded-md p-6 shadow-xl relative overflow-hidden space-y-6 bevel-container">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-[10px] font-mono px-2 py-0.5 rounded bg-theme-primary text-theme-base font-bold uppercase">
                CRUSADE TURN {campaign.currentTurn}
              </span>
              <span className="text-xs font-mono text-theme-muted">Admin: {campaign.adminName}</span>
            </div>
            <h1 className="font-gothic font-bold text-2xl sm:text-3xl text-theme-text tracking-wide">
              {campaign.name}
            </h1>
            {/*
              Which campaign this is, and a victory line that is true of it.
              The Glory threshold is the CLASSIC campaign's victory condition
              and the app's own; the Carcass Front Campaign is won on the
              Campaign Tracker and the Shared Objectives, so stating a Glory
              total there would be an invented rule on the banner.
            */}
            <p className="text-xs font-mono text-theme-muted">
              <span className="text-theme-primary font-bold">
                {frameworkNamed(frameworkOf(campaign)).name}
              </span>
              {onCarcassFrontCampaign ? (
                <> — won on the Campaign Tracker and the Shared Objectives.{' '}
                  <span className="text-theme-muted">See the Codex, under Campaigns.</span></>
              ) : (
                <> — first Warband to <strong className="text-theme-primary">{campaign.gloryVictoryThreshold} Glory Points</strong> wins the sector.</>
              )}
            </p>
          </div>

          {/* Action & Invite Box */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full"><CampaignSyncStatus /></div>
            <div className="bg-theme-base border border-theme-border p-2.5 rounded-md flex items-center space-x-3">
              <div>
                <span className="text-xs sm:text-[9px] font-mono text-theme-muted uppercase tracking-wider block">Invite Code</span>
                <span className="text-sm font-mono font-bold text-theme-primary">{campaign.inviteCode}</span>
              </div>
              <button
                onClick={handleCopyInvite}
                className="tap p-1.5 bg-theme-elevated hover:bg-theme-border text-theme-text rounded border border-theme-border transition-colors"
                title="Copy Invite Code"
              >
                {copied ? <Check className="w-4 h-4 text-status-legal" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => setIsLogMatchOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-theme-accent hover:bg-status-error text-white rounded font-mono text-xs font-bold uppercase transition-colors shadow-lg shadow-theme-accent/30"
            >
              <Swords className="w-4 h-4" />
              <span>Log Match Result</span>
            </button>

            <button
              onClick={() => setIsNewCampaignModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-theme-elevated hover:bg-theme-border text-theme-text border border-theme-border rounded font-mono text-xs font-bold uppercase transition-colors"
            >
              <Plus className="w-4 h-4 text-theme-primary" />
              <span>New Campaign</span>
            </button>
          </div>
        </div>

        {/*
          Glory Leaderboard.

          The PROGRESS GAUGE is the classic campaign's, because the threshold
          it fills toward is. A Carcass Front campaign is won on the Campaign
          Tracker and the Shared Objectives — the banner above says so — and a
          bar creeping toward "25 Glory" beneath that sentence states a victory
          condition the book does not give this campaign, which is the same
          invention the banner was written to avoid.

          Glory itself is still earned and still ranks the table, so the leader
          and their total stay; only the target and the bar go.
          Reported by Codex review on #27.
        */}
        {leadingMember && (
          <div className="p-3.5 bg-theme-base rounded border border-theme-border space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-theme-muted flex items-center space-x-1.5">
                <Trophy className="w-3.5 h-3.5 text-theme-primary" />
                <span>Current Leader: <strong className="text-theme-text">{leadingMember.warbandName}</strong> ({leadingMember.playerName})</span>
              </span>
              <span className="text-theme-primary font-bold">
                {onCarcassFrontCampaign
                  ? `${leadingMember.glory} Glory`
                  : `${leadingMember.glory} / ${campaign.gloryVictoryThreshold} Glory`}
              </span>
            </div>
            {onCarcassFrontCampaign ? (
              <p className="text-xs sm:text-[10px] font-mono text-theme-muted">
                Glory ranks the table; it does not win this campaign.
              </p>
            ) : (
              <div className="w-full bg-theme-surface h-2.5 rounded-full overflow-hidden border border-theme-border">
                <div
                  className="bg-theme-primary h-full transition-all duration-500 shadow-glow"
                  style={{ width: `${Math.min(100, (leadingMember.glory / campaign.gloryVictoryThreshold) * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Campaign Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-t border-theme-border pt-4">
          {[
            { id: 'leaderboard', label: 'Crusade Standings', icon: <Trophy className="w-4 h-4" /> },
            { id: 'chronicle', label: 'Narrative Chronicle', icon: <Scroll className="w-4 h-4" /> },
            { id: 'territory', label: 'Campaign World Map', icon: <Map className="w-4 h-4" /> },
            { id: 'matches', label: 'Battle Records', icon: <History className="w-4 h-4" /> }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded text-xs font-mono font-bold uppercase transition-all whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-theme-primary text-theme-base shadow'
                  : 'bg-theme-elevated text-theme-muted hover:text-theme-text'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

      </div>

      {/* TAB 1: LEADERBOARD */}
      {/*
        The standings table scrolls sideways; it does not clip.

        Seven columns do not fit in 375px, and the wrapper used to be
        `overflow-hidden`: the Glory Points column — the one that says who is
        winning the campaign — was unreachable on a phone, and the
        horizontal-scroll test passed precisely because the overflow was
        hidden. docs/MOBILE.md §6: wide content gets its own scroll container,
        never a clip. The headings stop wrapping for the same reason — at 375px
        "Record (W-L-D)" became a three-line tower.
      */}
      {activeTab === 'leaderboard' && (
        <div className="bg-theme-surface border border-theme-border overflow-x-auto bevel-container">
          <table className="w-full min-w-[46rem] text-left text-xs font-mono">
            <thead className="bg-theme-base text-theme-muted uppercase text-xs sm:text-[10px] border-b border-theme-border">
              <tr className="whitespace-nowrap">
                <th className="p-4">Rank</th>
                <th className="p-4">Warband &amp; Commander</th>
                <th className="p-4">Faction</th>
                <th className="p-4 text-center">Record (W-L-D)</th>
                <th className="p-4 text-center">Rating</th>
                <th className="p-4 text-center">Treasury</th>
                <th className="p-4 text-right">Glory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/60">
              {sortedMembers.map((member, idx) => {
                const faction = factions.find((f) => f.id === member.factionId);
                const isMe = activeWb && member.warbandId === activeWb.id;

                return (
                  <tr
                    key={member.warbandId}
                    className={`hover:bg-theme-elevated transition-colors ${
                      isMe ? 'bg-theme-primary/10' : ''
                    }`}
                  >
                    <td className="p-4 font-bold text-sm">
                      {idx === 0 ? (
                        <span className="text-theme-primary flex items-center space-x-1">
                          <Trophy className="w-4 h-4" />
                          <span>1st</span>
                        </span>
                      ) : (
                        <span className="text-theme-muted">#{idx + 1}</span>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="font-gothic font-bold text-base text-theme-text">
                        {member.warbandName}
                      </div>
                      <div className="text-xs sm:text-[11px] text-theme-muted">{member.playerName}</div>
                    </td>

                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-xs sm:text-[10px] uppercase font-bold bg-theme-base text-theme-primary border border-theme-border">
                        {faction?.name || member.factionId}
                      </span>
                    </td>

                    <td className="p-4 text-center font-bold text-theme-text">
                      <span className="text-status-legal">{member.wins}W</span> -{' '}
                      <span className="text-status-error">{member.losses}L</span> -{' '}
                      <span className="text-theme-muted">{member.draws}D</span>
                    </td>

                    <td className="p-4 text-center font-bold text-theme-text">
                      {member.rating} pts
                    </td>

                    <td className="p-4 text-center text-theme-primary font-bold">
                      {member.treasury} D
                    </td>

                    <td className="p-4 text-right">
                      <span className="text-base font-bold text-theme-primary bg-theme-base px-3 py-1 rounded border border-theme-border">
                        {member.glory} pts
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: NARRATIVE CHRONICLE */}
      {activeTab === 'chronicle' && (
        <div className="bg-theme-surface border-2 border-theme-border rounded-md p-6 space-y-4 shadow-xl bevel-container">
          <h3 className="font-gothic font-bold text-lg text-theme-text border-b border-theme-border pb-3">
            SECTOR IV CRUSADE CHRONICLE
          </h3>

          <div className="space-y-3">
            {campaign.chronicleLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-theme-base rounded border border-theme-border flex items-start space-x-3 text-xs font-mono"
              >
                <span className="text-xs sm:text-[10px] text-theme-muted min-w-[70px] uppercase block mt-0.5">
                  {log.timestamp}
                </span>
                <div className="h-4 w-[1px] bg-theme-border" />
                <p className="text-theme-text flex-1">{log.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SECTOR IV MAP */}
      {activeTab === 'territory' && <TerritoryMap />}

      {/* TAB 4: BATTLE RECORDS */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          {campaign.matches.map((match) => {
            const isExpanded = expandedMatchIds.includes(match.id);
            return (
              <div
                key={match.id}
                className="bg-theme-surface border-2 border-theme-border rounded-md p-6 space-y-4 shadow-xl bevel-container hover:border-theme-primary/40 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-theme-border pb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-gothic font-bold text-lg text-theme-text">
                        {match.scenarioName}
                      </h3>
                      {match.opponentWarbandName && (
                        <span className="text-xs sm:text-[10px] font-mono px-2 py-0.5 rounded bg-theme-elevated text-theme-primary border border-theme-primary/30 font-bold">
                          vs. {match.opponentWarbandName}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-theme-muted">Engagement Date: {match.date}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {match.mvpUnitName && (
                      <span className="text-xs sm:text-[11px] font-mono bg-theme-primary/15 text-theme-primary px-2.5 py-1 rounded border border-theme-primary/40 font-bold flex items-center space-x-1">
                        <Trophy className="w-3.5 h-3.5" />
                        <span>MVP: {match.mvpUnitName}</span>
                      </span>
                    )}
                    <span className="text-xs font-mono bg-theme-base px-3 py-1 rounded text-status-legal border border-theme-border uppercase font-bold">
                      Resolved
                    </span>
                  </div>
                </div>

                {/* Participant Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {match.participants.map((p) => (
                    <div
                      key={p.warbandId}
                      className={`p-3.5 rounded border text-xs font-mono space-y-2 ${
                        p.result === 'Victory'
                          ? 'bg-theme-base border-status-legal/50'
                          : p.result === 'Defeat'
                          ? 'bg-theme-base border-theme-accent/50'
                          : 'bg-theme-base border-theme-border'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <strong className="font-gothic text-base text-theme-text">{p.warbandName}</strong>
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-xs sm:text-[10px] uppercase ${
                            p.result === 'Victory'
                              ? 'bg-status-legal text-white'
                              : p.result === 'Defeat'
                              ? 'bg-theme-accent text-white'
                              : 'bg-theme-elevated text-theme-muted'
                          }`}
                        >
                          {p.result}
                        </span>
                      </div>

                      <div className="text-xs sm:text-[11px] text-theme-muted">Commander: {p.playerName}</div>

                      <div className="flex justify-between border-t border-theme-border pt-1.5 text-xs sm:text-[11px]">
                        <span>Glory: <strong className="text-theme-primary">+{p.gloryGained}</strong></span>
                        <span>Ducats: <strong className="text-theme-primary">+{p.ducatsGained} D</strong></span>
                        <span>Casualties: <strong className={p.casualties.length > 0 ? 'text-status-error' : 'text-status-legal'}>{p.casualties.length}</strong></span>
                      </div>

                      {/* Casualty Breakdown */}
                      {p.casualties.length > 0 && (
                        <div className="border-t border-theme-border pt-1.5 space-y-1">
                          <span className="text-xs sm:text-[10px] text-theme-muted uppercase font-bold block">Casualty Roll Details:</span>
                          {p.casualties.map((cas, cIdx) => (
                            <div key={cIdx} className="text-xs sm:text-[10px] text-status-error flex items-center justify-between">
                              <span>• {cas.unitName}:</span>
                              <span className="italic">{cas.outcome}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Match Narrative Log */}
                {match.narrativeLog && (
                  <div className="p-3 bg-theme-base rounded border border-theme-border text-xs font-mono text-theme-muted italic">
                    &quot;{match.narrativeLog}&quot;
                  </div>
                )}

                {/* Notable Moments Bullets */}
                {match.notableMoments && match.notableMoments.length > 0 && (
                  <div className="p-3 bg-theme-base border border-theme-border rounded text-xs font-mono space-y-1.5">
                    <span className="text-xs sm:text-[10px] font-bold uppercase text-theme-primary flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-theme-primary" />
                      <span>Decisive Battlefield Moments:</span>
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-theme-text text-xs sm:text-[11px]">
                      {match.notableMoments.map((moment, mIdx) => (
                        <li key={mIdx}>{moment}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Comprehensive Battle Report Accordion */}
                {match.narrativeReport && (
                  <div className="border border-theme-primary/30 rounded bg-theme-base overflow-hidden">
                    <button
                      onClick={() => toggleMatchExpanded(match.id)}
                      className="w-full p-3 bg-theme-elevated hover:bg-theme-elevated flex items-center justify-between text-xs font-mono font-bold text-theme-primary uppercase transition-colors"
                    >
                      <span className="flex items-center space-x-2">
                        <Scroll className="w-4 h-4 text-theme-primary" />
                        <span>Battle Chronicle & Tactical After-Action Report</span>
                      </span>
                      <span>{isExpanded ? 'Hide Report ▲' : 'Read Full Battle Report ▼'}</span>
                    </button>

                    {isExpanded && (
                      <div className="p-4 text-xs font-mono text-theme-text whitespace-pre-line leading-relaxed border-t border-theme-border">
                        {match.narrativeReport}
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* New Campaign Modal */}
      {isNewCampaignModalOpen && (
        <div ref={newCampaignRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-surface border-2 border-theme-border w-full max-w-md rounded-md shadow-2xl overflow-hidden bevel-container max-h-[90dvh] flex flex-col">
            
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-theme-border bg-theme-base">
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-theme-primary" />
                <h3 className="font-gothic font-bold text-lg text-theme-text">CREATE CRUSADE CAMPAIGN</h3>
              </div>
              <button
                onClick={() => setIsNewCampaignModalOpen(false)}
                className="tap text-theme-muted hover:text-theme-text p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaignSubmit} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-theme-muted mb-1">
                  Campaign Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Siege of the Iron Gates, The Golgotha Crusade"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded p-2 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                />
              </div>

              {/*
                Fixed at creation and not shown again as an editable control:
                the two frameworks disagree about what a territory is, what a
                turn is and how the campaign is won.
              */}
              <div>
                <label className="block text-xs font-mono uppercase text-theme-muted mb-1">
                  Campaign Rules
                </label>
                <div className="space-y-2">
                  {FRAMEWORKS.map((f) => {
                    const unavailable = f.id === 'carcass-front' && !cfTerritories.length;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        disabled={unavailable}
                        onClick={() => setNewFramework(f.id)}
                        className={`w-full text-left p-3 min-h-[44px] rounded border transition-colors ${
                          newFramework === f.id
                            ? 'border-theme-primary bg-theme-base'
                            : 'border-theme-border bg-theme-base hover:border-theme-muted'
                        } ${unavailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className="font-gothic font-bold text-xs text-theme-text block">
                          {f.name}
                        </span>
                        <span className="text-[11px] font-mono text-theme-muted leading-relaxed block pt-0.5">
                          {unavailable
                            ? `Not available: the ruleset did not load${datasetError ? ` (${datasetError})` : ''}.`
                            : f.summary}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] font-mono text-theme-muted leading-relaxed pt-2">
                  {frameworkNamed(newFramework).detail}
                </p>
                <p className="text-[11px] font-mono text-theme-accent leading-relaxed pt-1">
                  This cannot be changed once the campaign exists.
                </p>
              </div>

              {/*
                The Glory threshold decides the CLASSIC campaign and nothing in
                the Carcass Front one, so it is not asked for there.
              */}
              <div>
                <label className="block text-xs font-mono uppercase text-theme-muted mb-1">
                  Max Warband Ducat Rating
                </label>
                <input
                  type="number"
                  min="500"
                  max="2000"
                  step="50"
                  value={newMaxDucats}
                  onChange={(e) => setNewMaxDucats(parseInt(e.target.value) || 700)}
                  className="w-full bg-theme-base border border-theme-border rounded p-2 text-sm text-theme-text focus:outline-none"
                />
              </div>

              <div className={newFramework === 'carcass-front' ? 'hidden' : ''}>
                <label className="block text-xs font-mono uppercase text-theme-muted mb-1">
                  Glory Points for Campaign Victory
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  step="5"
                  value={newGloryGoal}
                  onChange={(e) => setNewGloryGoal(parseInt(e.target.value) || 25)}
                  className="w-full bg-theme-base border border-theme-border rounded p-2 text-sm text-theme-text focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-theme-border flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsNewCampaignModalOpen(false)}
                  className="px-4 py-2 bg-theme-elevated hover:bg-theme-border text-theme-text font-mono text-xs font-bold uppercase rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-mono text-xs font-bold uppercase rounded shadow"
                >
                  Establish Crusade
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Log Match Modal */}
      {isLogMatchOpen && (
        <LogMatchModal onClose={() => setIsLogMatchOpen(false)} />
      )}

    </div>
  );
};
