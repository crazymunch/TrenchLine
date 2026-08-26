import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { TerritoryMap } from './TerritoryMap';
import { 
  Flag, 
  Sparkles, 
  Trophy, 
  Coins, 
  Copy, 
  Check, 
  Users, 
  History, 
  Map, 
  Swords, 
  Shield, 
  Skull,
  Scroll
} from 'lucide-react';

export const CampaignHubView: React.FC = () => {
  const { campaign, factions } = useStore();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'chronicle' | 'territory' | 'matches'>('leaderboard');
  const [copied, setCopied] = useState(false);

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(campaign.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sort leaderboard by Glory points descending
  const sortedMembers = [...campaign.members].sort((a, b) => b.glory - a.glory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      
      {/* Campaign Command Banner */}
      <div className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 shadow-xl relative overflow-hidden space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#D4AF37] text-black font-bold uppercase">
                CAMPAIGN TURN {campaign.currentTurn}
              </span>
              <span className="text-xs font-mono text-[#8E95A5]">Admin: {campaign.adminName}</span>
            </div>
            <h1 className="font-gothic font-bold text-2xl sm:text-3xl text-[#ECEFF4] tracking-wide">
              {campaign.name}
            </h1>
            <p className="text-xs font-mono text-[#8E95A5]">
              Victory Condition: First Warband to achieve <strong>{campaign.gloryVictoryThreshold} Glory Points</strong> wins the crusade!
            </p>
          </div>

          {/* Invite Box */}
          <div className="bg-[#0C0E12] border border-[#323846] p-3 rounded-md flex items-center space-x-3">
            <div>
              <span className="text-[9px] font-mono text-[#8E95A5] uppercase tracking-wider block">Invite Code</span>
              <span className="text-sm font-mono font-bold text-[#D4AF37]">{campaign.inviteCode}</span>
            </div>
            <button
              onClick={handleCopyInvite}
              className="p-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] rounded border border-[#323846] transition-colors"
              title="Copy Invite Code"
            >
              {copied ? <Check className="w-4 h-4 text-[#4E9A6E]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Campaign Navigation Tabs */}
        <div className="flex items-center space-x-2 border-t border-[#323846] pt-4 overflow-x-auto">
          {[
            { id: 'leaderboard', label: 'Crusade Standings', icon: <Trophy className="w-4 h-4" /> },
            { id: 'chronicle', label: 'Narrative Chronicle', icon: <Scroll className="w-4 h-4" /> },
            { id: 'territory', label: 'Trench Map', icon: <Map className="w-4 h-4" /> },
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
        <div className="bg-[#161920] border-2 border-[#323846] rounded-md overflow-hidden shadow-xl">
          <div className="p-4 bg-[#20242E] border-b border-[#323846] flex items-center justify-between">
            <h3 className="font-gothic font-bold text-base text-[#ECEFF4]">WARBAND LEADERBOARD & RATINGS</h3>
            <span className="text-xs font-mono text-[#8E95A5]">{campaign.members.length} Active Crusaders</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0C0E12] text-[#8E95A5] uppercase text-[10px] border-b border-[#323846]">
                <tr>
                  <th className="p-3.5">Rank</th>
                  <th className="p-3.5">Player & Warband</th>
                  <th className="p-3.5">Faction</th>
                  <th className="p-3.5 text-center">Glory</th>
                  <th className="p-3.5 text-center">Record (W/L/D)</th>
                  <th className="p-3.5 text-center">Rating</th>
                  <th className="p-3.5 text-right">Treasury</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#323846]">
                {sortedMembers.map((member, idx) => {
                  const faction = factions.find((f) => f.id === member.factionId);
                  return (
                    <tr key={member.userId} className="hover:bg-[#20242E]/50 transition-colors">
                      <td className="p-3.5 font-bold text-[#D4AF37]">
                        #{idx + 1}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-[#ECEFF4] text-sm font-gothic">{member.warbandName}</div>
                        <div className="text-[10px] text-[#8E95A5]">Commander: {member.playerName}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center space-x-1 text-[#ECEFF4]">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: faction?.color || '#D4AF37' }}
                          />
                          <span>{faction?.name || member.factionId}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-bold text-base text-[#D4AF37]">
                        {member.glory}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="text-[#4E9A6E] font-bold">{member.wins}W</span> -{' '}
                        <span className="text-[#E53935] font-bold">{member.losses}L</span> -{' '}
                        <span className="text-[#8E95A5] font-bold">{member.draws}D</span>
                      </td>
                      <td className="p-3.5 text-center font-bold text-[#ECEFF4]">
                        {member.rating} pts
                      </td>
                      <td className="p-3.5 text-right text-[#D4AF37] font-bold">
                        {member.treasury} Ducats
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: NARRATIVE CHRONICLE */}
      {activeTab === 'chronicle' && (
        <div className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 space-y-4 shadow-xl">
          <h3 className="font-gothic font-bold text-lg text-[#ECEFF4] border-b border-[#323846] pb-3">
            CAMPAIGN ANNALS & CHRONICLE
          </h3>

          <div className="space-y-3">
            {campaign.chronicleLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 bg-[#20242E] border-l-4 border-[#D4AF37] rounded-r-md flex items-start justify-between gap-4"
              >
                <div className="space-y-0.5">
                  <p className="text-xs text-[#ECEFF4] font-sans leading-relaxed">{log.text}</p>
                </div>
                <span className="text-[10px] font-mono text-[#8E95A5] whitespace-nowrap">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TERRITORY MAP */}
      {activeTab === 'territory' && <TerritoryMap />}

      {/* TAB 4: MATCHES */}
      {activeTab === 'matches' && (
        <div className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 space-y-4 shadow-xl">
          <h3 className="font-gothic font-bold text-lg text-[#ECEFF4] border-b border-[#323846] pb-3">
            HISTORICAL MATCH RECORDS
          </h3>

          <div className="space-y-4">
            {campaign.matches.map((m) => (
              <div key={m.id} className="p-4 bg-[#20242E] border border-[#323846] rounded-md space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-[#8E95A5]">
                  <span className="text-[#D4AF37] font-bold">{m.scenarioName}</span>
                  <span>Date: {m.date}</span>
                </div>

                <p className="text-xs text-[#ECEFF4] italic">{m.narrativeLog}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#323846]/60">
                  {m.participants.map((p, pIdx) => (
                    <div key={pIdx} className="p-2 bg-[#161920] rounded border border-[#323846] text-xs font-mono flex justify-between items-center">
                      <div>
                        <strong className="text-[#ECEFF4]">{p.warbandName}</strong> ({p.playerName})
                        <div className="text-[10px] text-[#8E95A5]">+{p.gloryGained} Glory | +{p.ducatsGained} D</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        p.result === 'Victory' ? 'bg-[#4E9A6E] text-white' : 'bg-[#8B0000] text-white'
                      }`}>
                        {p.result}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
