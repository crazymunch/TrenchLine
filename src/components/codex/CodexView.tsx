'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { INJURY_TABLE_D66, EXPLORATION_TABLE_D66 } from '../../data/defaultRules';
import { 
  BookOpen, 
  Search, 
  Swords, 
  Tag, 
  Skull, 
  Compass, 
  Map, 
  FileText,
  Shield,
  Coins
} from 'lucide-react';

export const CodexView: React.FC = () => {
  const { keywords, weapons, scenarios, factions, setActiveKeyword } = useStore();
  const [activeTab, setActiveTab] = useState<'keywords' | 'weapons' | 'injuries' | 'exploration' | 'scenarios'>('keywords');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredKeywords = keywords.filter(
    (k) =>
      k.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.fullText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWeapons = weapons.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredScenarios = scenarios.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.flavor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      
      {/* Header Banner */}
      <div className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-6 h-6 text-[#D4AF37]" />
          <div>
            <h1 className="font-gothic font-bold text-2xl text-[#ECEFF4] tracking-wide">
              TRENCH CODEX & SCENARIOS
            </h1>
            <p className="text-xs font-mono text-[#8E95A5]">
              Quick reference rules, armory catalog, injury & exploration tables, and official scenarios
            </p>
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[#323846]">
          
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#8E95A5] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search keywords, weapons, scenarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0C0E12] border border-[#323846] rounded pl-9 pr-3 py-1.5 text-xs text-[#ECEFF4] placeholder-[#8E95A5] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {/* Navigation Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            {[
              { id: 'keywords', label: 'Keywords', icon: <Tag className="w-3.5 h-3.5" /> },
              { id: 'weapons', label: 'Armory', icon: <Swords className="w-3.5 h-3.5" /> },
              { id: 'injuries', label: 'Injury Table D66', icon: <Skull className="w-3.5 h-3.5" /> },
              { id: 'exploration', label: 'Exploration D66', icon: <Compass className="w-3.5 h-3.5" /> },
              { id: 'scenarios', label: 'Scenarios', icon: <Map className="w-3.5 h-3.5" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#D4AF37] text-black shadow'
                    : 'bg-[#20242E] text-[#8E95A5] hover:text-[#ECEFF4]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* TAB 1: KEYWORDS */}
      {activeTab === 'keywords' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredKeywords.map((kw) => (
            <div
              key={kw.name}
              className="p-4 bg-[#161920] border border-[#323846] rounded-md space-y-2 hover:border-[#D4AF37]/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-gothic font-bold text-base text-[#D4AF37]">{kw.name}</h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#20242E] text-[#8E95A5]">
                  {kw.category}
                </span>
              </div>
              <p className="text-xs font-mono font-semibold text-[#ECEFF4]">{kw.summary}</p>
              <p className="text-xs text-[#8E95A5] leading-relaxed bg-[#0C0E12] p-2.5 rounded border border-[#323846]">
                {kw.fullText}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: WEAPONS ARMORY */}
      {activeTab === 'weapons' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWeapons.map((w) => (
            <div
              key={w.id}
              className="p-4 bg-[#161920] border border-[#323846] rounded-md space-y-2 hover:border-[#D4AF37]/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="font-gothic font-bold text-base text-[#ECEFF4]">{w.name}</h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#20242E] text-[#8E95A5]">
                    {w.type} ({w.range})
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-[#D4AF37]">{w.cost} Ducats</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#0C0E12] p-2 rounded border border-[#323846]">
                <div><span>Modifier: </span><strong className="text-[#ECEFF4]">{w.modifiers}</strong></div>
                <div><span>Damage: </span><strong className="text-[#ECEFF4]">{w.damage}</strong></div>
              </div>

              {w.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {w.keywords.map((kw) => (
                    <button
                      key={kw}
                      onClick={() => {
                        const found = keywords.find((k) => k.name.toLowerCase() === kw.toLowerCase());
                        if (found) setActiveKeyword(found);
                      }}
                      className="text-[9px] font-mono bg-[#20242E] hover:bg-[#D4AF37] hover:text-black px-1.5 py-0.2 rounded text-[#D4AF37] border border-[#323846] transition-colors"
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              )}

              {w.description && <p className="text-xs text-[#8E95A5] italic">{w.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: INJURY TABLE */}
      {activeTab === 'injuries' && (
        <div className="bg-[#161920] border-2 border-[#323846] rounded-md overflow-hidden shadow-xl">
          <div className="p-4 bg-[#20242E] border-b border-[#323846]">
            <h3 className="font-gothic font-bold text-base text-[#ECEFF4]">
              OFFICIAL TRENCH CRUSADE D66 CASUALTY & INJURY TABLE
            </h3>
          </div>
          <div className="divide-y divide-[#323846]">
            {INJURY_TABLE_D66.map((item) => (
              <div key={item.roll} className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-sm text-[#D4AF37] bg-[#0C0E12] px-2 py-0.5 rounded border border-[#323846]">
                      {item.roll}
                    </span>
                    <h4 className={`font-gothic font-bold text-sm ${item.isDead ? 'text-[#E53935]' : 'text-[#ECEFF4]'}`}>
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-xs text-[#8E95A5] leading-relaxed">{item.effect}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: EXPLORATION TABLE */}
      {activeTab === 'exploration' && (
        <div className="bg-[#161920] border-2 border-[#323846] rounded-md overflow-hidden shadow-xl">
          <div className="p-4 bg-[#20242E] border-b border-[#323846]">
            <h3 className="font-gothic font-bold text-base text-[#ECEFF4]">
              NO MAN'S LAND D66 EXPLORATION & SCAVENGE TABLE
            </h3>
          </div>
          <div className="divide-y divide-[#323846]">
            {EXPLORATION_TABLE_D66.map((item) => (
              <div key={item.roll} className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-sm text-[#D4AF37] bg-[#0C0E12] px-2 py-0.5 rounded border border-[#323846]">
                      {item.roll}
                    </span>
                    <h4 className="font-gothic font-bold text-sm text-[#ECEFF4]">{item.title}</h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#D4AF37]">{item.reward}</span>
                </div>
                <p className="text-xs text-[#8E95A5]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SCENARIOS */}
      {activeTab === 'scenarios' && (
        <div className="space-y-6">
          {filteredScenarios.map((scen) => (
            <div
              key={scen.id}
              className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 space-y-4 shadow-xl"
            >
              <div className="border-b border-[#323846] pb-3">
                <h3 className="font-gothic font-bold text-xl text-[#D4AF37]">{scen.name}</h3>
                <p className="text-xs text-[#8E95A5] italic mt-1">{scen.flavor}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 bg-[#0C0E12] rounded border border-[#323846] space-y-1">
                  <strong className="text-[#D4AF37] uppercase block">Deployment:</strong>
                  <p className="text-[#ECEFF4]">{scen.deployment}</p>
                </div>
                <div className="p-3 bg-[#0C0E12] rounded border border-[#323846] space-y-1">
                  <strong className="text-[#D4AF37] uppercase block">Victory Conditions:</strong>
                  <p className="text-[#ECEFF4]">{scen.victoryConditions}</p>
                </div>
              </div>

              <div className="space-y-2">
                <strong className="text-xs font-mono uppercase text-[#8E95A5] block">Scenario Objectives:</strong>
                <ul className="list-disc list-inside text-xs text-[#ECEFF4] space-y-1 font-mono">
                  {scen.objectives.map((obj, idx) => (
                    <li key={idx}>{obj}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <strong className="text-xs font-mono uppercase text-[#8E95A5] block">Special Environmental Rules:</strong>
                <ul className="list-disc list-inside text-xs text-[#8E95A5] space-y-1">
                  {scen.specialRules.map((rule, idx) => (
                    <li key={idx}>{rule}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
