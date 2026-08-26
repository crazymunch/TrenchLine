'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { TerritoryMap } from './TerritoryMap';
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
  Flame,
  Shield,
  Coins,
  MapPin,
  Swords
} from 'lucide-react';

export const CampaignHubView: React.FC = () => {
  const { campaign, factions, createCampaign, getActiveWarband } = useStore();
  const activeWb = getActiveWarband();

  const [activeTab, setActiveTab] = useState<'leaderboard' | 'chronicle' | 'territory' | 'matches'>('leaderboard');
  const [copied, setCopied] = useState(false);
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false);
  const [isLogMatchOpen, setIsLogMatchOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newMaxDucats, setNewMaxDucats] = useState(700);
  const [newGloryGoal, setNewGloryGoal] = useState(25);

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(campaign.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateCampaignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;
    createCampaign(newCampaignName.trim(), newMaxDucats, newGloryGoal);
    setIsNewCampaignModalOpen(false);
    setNewCampaignName('');
  };

  // Sort leaderboard by Glory points descending
  const sortedMembers = [...campaign.members].sort((a, b) => b.glory - a.glory);
  const leadingMember = sortedMembers[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      
      {/* Campaign Command Banner */}
      <div className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 shadow-xl relative overflow-hidden space-y-6 bevel-container">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#D4AF37] text-black font-bold uppercase">
                CRUSADE TURN {campaign.currentTurn}
              </span>
              <span className="text-xs font-mono text-[#8E95A5]">Admin: {campaign.adminName}</span>
            </div>
            <h1 className="font-gothic font-bold text-2xl sm:text-3xl text-[#ECEFF4] tracking-wide">
              {campaign.name}
            </h1>
            <p className="text-xs font-mono text-[#8E95A5]">
              Victory Goal: First Warband to achieve <strong className="text-[#D4AF37]">{campaign.gloryVictoryThreshold} Glory Points</strong> wins the sector!
            </p>
          </div>

          {/* Action & Invite Box */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[#0C0E12] border border-[#323846] p-2.5 rounded-md flex items-center space-x-3">
              <div>
                <span className="text-[9px] font-mono text-[#8E95A5] uppercase tracking-wider block">Invite Code</span>
                <span className="text-sm font-mono font-bold text-[#D4AF37]">{campaign.inviteCode}</span>
              </div>
              <button
                onClick={handleCopyInvite}
                className="p-1.5 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] rounded border border-[#323846] transition-colors"
                title="Copy Invite Code"
              >
                {copied ? <Check className="w-4 h-4 text-[#4E9A6E]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => setIsLogMatchOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-[#8B0000] hover:bg-[#A30000] text-white rounded font-mono text-xs font-bold uppercase transition-colors shadow-lg shadow-[#8B0000]/30"
            >
              <Swords className="w-4 h-4" />
              <span>Log Match Result</span>
            </button>

            <button
              onClick={() => setIsNewCampaignModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] rounded font-mono text-xs font-bold uppercase transition-colors"
            >
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <span>New Campaign</span>
            </button>
          </div>
        </div>

        {/* Glory Leaderboard Progress Gauge */}
        {leadingMember && (
          <div className="p-3.5 bg-[#0C0E12] rounded border border-[#323846] space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#8E95A5] flex items-center space-x-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Current Leader: <strong className="text-[#ECEFF4]">{leadingMember.warbandName}</strong> ({leadingMember.playerName})</span>
              </span>
              <span className="text-[#D4AF37] font-bold">
                {leadingMember.glory} / {campaign.gloryVictoryThreshold} Glory
              </span>
            </div>
            <div className="w-full bg-[#161920] h-2.5 rounded-full overflow-hidden border border-[#323846]">
              <div
                className="bg-[#D4AF37] h-full transition-all duration-500 shadow-glow"
                style={{ width: `${Math.min(100, (leadingMember.glory / campaign.gloryVictoryThreshold) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Campaign Navigation Tabs */}
        <div className="flex items-center space-x-2 border-t border-[#323846] pt-4 overflow-x-auto">
          {[
            { id: 'leaderboard', label: 'Crusade Standings', icon: <Trophy className="w-4 h-4" /> },
            { id: 'chronicle', label: 'Narrative Chronicle', icon: <Scroll className="w-4 h-4" /> },
            { id: 'territory', label: 'Sector IV Map', icon: <Map className="w-4 h-4" /> },
            { id: 'matches', label: 'Battle Records', icon: <History className="w-4 h-4" /> }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded text-xs font-mono font-bold uppercase transition-all whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-[#D4AF37] text-black shadow'
                  : 'bg-[#20242E] text-[#8E95A5] hover:text-[#ECEFF4]'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

      </div>

      {/* TAB 1: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="bg-[#161920] border-2 border-[#323846] rounded-md overflow-hidden shadow-xl bevel-container">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0C0E12] text-[#8E95A5] uppercase text-[10px] border-b border-[#323846]">
              <tr>
                <th className="p-4">Rank</th>
                <th className="p-4">Warband & Commander</th>
                <th className="p-4">Faction</th>
                <th className="p-4 text-center">Record (W-L-D)</th>
                <th className="p-4 text-center">Warband Rating</th>
                <th className="p-4 text-center">Treasury</th>
                <th className="p-4 text-right">Glory Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#323846]/60">
              {sortedMembers.map((member, idx) => {
                const faction = factions.find((f) => f.id === member.factionId);
                const isMe = activeWb && member.warbandId === activeWb.id;

                return (
                  <tr
                    key={member.warbandId}
                    className={`hover:bg-[#20242E] transition-colors ${
                      isMe ? 'bg-[#D4AF37]/10' : ''
                    }`}
                  >
                    <td className="p-4 font-bold text-sm">
                      {idx === 0 ? (
                        <span className="text-[#D4AF37] flex items-center space-x-1">
                          <Trophy className="w-4 h-4" />
                          <span>1st</span>
                        </span>
                      ) : (
                        <span className="text-[#8E95A5]">#{idx + 1}</span>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="font-gothic font-bold text-base text-[#ECEFF4]">
                        {member.warbandName}
                      </div>
                      <div className="text-[11px] text-[#8E95A5]">{member.playerName}</div>
                    </td>

                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[#0C0E12] text-[#D4AF37] border border-[#323846]">
                        {faction?.name || member.factionId}
                      </span>
                    </td>

                    <td className="p-4 text-center font-bold text-[#ECEFF4]">
                      <span className="text-[#4E9A6E]">{member.wins}W</span> -{' '}
                      <span className="text-[#E53935]">{member.losses}L</span> -{' '}
                      <span className="text-[#8E95A5]">{member.draws}D</span>
                    </td>

                    <td className="p-4 text-center font-bold text-[#ECEFF4]">
                      {member.rating} pts
                    </td>

                    <td className="p-4 text-center text-[#D4AF37] font-bold">
                      {member.treasury} D
                    </td>

                    <td className="p-4 text-right">
                      <span className="text-base font-bold text-[#D4AF37] bg-[#0C0E12] px-3 py-1 rounded border border-[#323846]">
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
        <div className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 space-y-4 shadow-xl bevel-container">
          <h3 className="font-gothic font-bold text-lg text-[#ECEFF4] border-b border-[#323846] pb-3">
            SECTOR IV CRUSADE CHRONICLE
          </h3>

          <div className="space-y-3">
            {campaign.chronicleLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-[#0C0E12] rounded border border-[#323846] flex items-start space-x-3 text-xs font-mono"
              >
                <span className="text-[10px] text-[#8E95A5] min-w-[70px] uppercase block mt-0.5">
                  {log.timestamp}
                </span>
                <div className="h-4 w-[1px] bg-[#323846]" />
                <p className="text-[#ECEFF4] flex-1">{log.text}</p>
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
          {campaign.matches.map((match) => (
            <div
              key={match.id}
              className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 space-y-4 shadow-xl bevel-container"
            >
              <div className="flex items-center justify-between border-b border-[#323846] pb-3">
                <div>
                  <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">
                    {match.scenarioName}
                  </h3>
                  <span className="text-xs font-mono text-[#8E95A5]">Date: {match.date}</span>
                </div>

                <span className="text-xs font-mono bg-[#0C0E12] px-3 py-1 rounded text-[#D4AF37] border border-[#323846] uppercase font-bold">
                  Resolved
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {match.participants.map((p) => (
                  <div
                    key={p.warbandId}
                    className={`p-3.5 rounded border text-xs font-mono space-y-2 ${
                      p.result === 'Victory'
                        ? 'bg-[#161920] border-[#4E9A6E]'
                        : p.result === 'Defeat'
                        ? 'bg-[#161920] border-[#8B0000]'
                        : 'bg-[#161920] border-[#323846]'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <strong className="font-gothic text-base text-[#ECEFF4]">{p.warbandName}</strong>
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                          p.result === 'Victory'
                            ? 'bg-[#4E9A6E] text-white'
                            : p.result === 'Defeat'
                            ? 'bg-[#8B0000] text-white'
                            : 'bg-[#20242E] text-[#8E95A5]'
                        }`}
                      >
                        {p.result}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#8E95A5]">Commander: {p.playerName}</div>

                    <div className="flex justify-between border-t border-[#323846] pt-1.5 text-[11px]">
                      <span>Glory: <strong className="text-[#D4AF37]">+{p.gloryGained}</strong></span>
                      <span>Ducats: <strong className="text-[#D4AF37]">+{p.ducatsGained} D</strong></span>
                      <span>Casualties: <strong className="text-[#E53935]">{p.casualties.length}</strong></span>
                    </div>
                  </div>
                ))}
              </div>

              {match.narrativeLog && (
                <div className="p-3 bg-[#0C0E12] rounded border border-[#323846] text-xs text-[#8E95A5] italic">
                  &quot;{match.narrativeLog}&quot;
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Campaign Modal */}
      {isNewCampaignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#161920] border-2 border-[#323846] w-full max-w-md rounded-md shadow-2xl overflow-hidden bevel-container">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#323846] bg-[#0C0E12]">
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">CREATE CRUSADE CAMPAIGN</h3>
              </div>
              <button
                onClick={() => setIsNewCampaignModalOpen(false)}
                className="text-[#8E95A5] hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaignSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[#8E95A5] mb-1">
                  Campaign Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Siege of the Iron Gates, The Golgotha Crusade"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-sm text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#8E95A5] mb-1">
                  Max Warband Ducat Rating
                </label>
                <input
                  type="number"
                  min="500"
                  max="2000"
                  step="50"
                  value={newMaxDucats}
                  onChange={(e) => setNewMaxDucats(parseInt(e.target.value) || 700)}
                  className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-sm text-[#ECEFF4] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#8E95A5] mb-1">
                  Glory Points for Campaign Victory
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  step="5"
                  value={newGloryGoal}
                  onChange={(e) => setNewGloryGoal(parseInt(e.target.value) || 25)}
                  className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-sm text-[#ECEFF4] focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-[#323846] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsNewCampaignModalOpen(false)}
                  className="px-4 py-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] font-mono text-xs font-bold uppercase rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-mono text-xs font-bold uppercase rounded shadow"
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
