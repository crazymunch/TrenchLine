'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { INJURY_TABLE_D66, EXPLORATION_TABLE_D66 } from '../../data/defaultRules';
import { MissionGenerator } from './MissionGenerator';
import { 
  BookOpen, 
  Search, 
  Swords, 
  Tag, 
  Skull, 
  Compass, 
  Shield, 
  Sparkles,
  Dice6
} from 'lucide-react';

export const CodexView: React.FC = () => {
  const { keywords, scenarios, weapons, armour, equipment, setActiveKeyword } = useStore();
  const [activeTab, setActiveTab] = useState<'keywords' | 'weapons' | 'armour' | 'scenarios' | 'generator' | 'charts'>('keywords');
  const [searchQuery, setSearchQuery] = useState('');

  const filterText = searchQuery.toLowerCase().trim();

  const filteredKeywords = keywords.filter(
    (k) => k.name.toLowerCase().includes(filterText) || k.summary.toLowerCase().includes(filterText) || k.fullText.toLowerCase().includes(filterText)
  );

  const filteredWeapons = weapons.filter(
    (w) => w.name.toLowerCase().includes(filterText) || w.keywords.some((kw) => kw.toLowerCase().includes(filterText))
  );

  const filteredArmour = armour.filter(
    (a) => a.name.toLowerCase().includes(filterText) || (a.description || '').toLowerCase().includes(filterText)
  );

  const filteredScenarios = scenarios.filter(
    (s) => s.name.toLowerCase().includes(filterText) || s.flavor.toLowerCase().includes(filterText)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      
      {/* Header Banner */}
      <div className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 shadow-xl space-y-4 bevel-container">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <BookOpen className="w-6 h-6 text-[#D4AF37]" />
              <h1 className="font-gothic font-bold text-2xl text-[#ECEFF4] tracking-wide">
                RULES CODEX & SCENARIOS
              </h1>
            </div>
            <p className="text-xs font-mono text-[#8E95A5]">
              Comprehensive reference for Trench Crusade rule keywords, weapon armory, procedural missions, and D66 tables
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter rules, weapons, charts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0C0E12] border border-[#323846] rounded pl-9 pr-3 py-2 text-xs font-mono text-[#ECEFF4] placeholder-[#8E95A5] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-t border-[#323846] pt-3 overflow-x-auto">
          {[
            { id: 'keywords', label: 'Rule Keywords', icon: <Tag className="w-4 h-4" /> },
            { id: 'weapons', label: 'Armory / Weapons', icon: <Swords className="w-4 h-4" /> },
            { id: 'armour', label: 'Armour & Gear', icon: <Shield className="w-4 h-4" /> },
            { id: 'scenarios', label: 'Scenarios', icon: <Compass className="w-4 h-4" /> },
            { id: 'generator', label: 'Mission Generator', icon: <Dice6 className="w-4 h-4 text-[#D4AF37]" /> },
            { id: 'charts', label: 'D66 Tables', icon: <Skull className="w-4 h-4" /> }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all whitespace-nowrap ${
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

      {/* TAB 1: KEYWORDS */}
      {activeTab === 'keywords' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredKeywords.map((kw) => (
            <div key={kw.name} className="bg-[#161920] border border-[#323846] rounded-md p-4 space-y-2 bevel-container">
              <div className="flex items-center justify-between border-b border-[#323846] pb-2">
                <h3 className="font-gothic font-bold text-base text-[#ECEFF4]">{kw.name}</h3>
                <span className="text-[10px] font-mono uppercase bg-[#20242E] text-[#D4AF37] px-2 py-0.5 rounded">
                  {kw.category}
                </span>
              </div>
              <p className="text-xs text-[#8E95A5] italic">{kw.summary}</p>
              <div className="text-xs font-mono text-[#ECEFF4] bg-[#0C0E12] p-2.5 rounded border border-[#323846]">
                {kw.fullText}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: WEAPONS ARMORY */}
      {activeTab === 'weapons' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWeapons.map((w) => (
            <div key={w.id} className="bg-[#161920] border border-[#323846] rounded-md p-4 space-y-3 bevel-container">
              <div className="flex items-center justify-between border-b border-[#323846] pb-2">
                <div>
                  <h3 className="font-gothic font-bold text-base text-[#ECEFF4]">{w.name}</h3>
                  <span className="text-[10px] font-mono text-[#8E95A5]">{w.type} ({w.hands} Handed)</span>
                </div>
                <span className="text-xs font-mono font-bold text-[#D4AF37] bg-[#0C0E12] px-2 py-1 rounded border border-[#323846]">
                  {w.cost} Ducats
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-[#0C0E12] p-2 rounded border border-[#323846]">
                <div><span className="text-[9px] text-[#8E95A5] block">RANGE</span><strong className="text-[#ECEFF4]">{w.range}</strong></div>
                <div><span className="text-[9px] text-[#8E95A5] block">MODIFIER</span><strong className="text-[#ECEFF4]">{w.modifiers}</strong></div>
                <div><span className="text-[9px] text-[#8E95A5] block">DAMAGE</span><strong className="text-[#ECEFF4]">{w.damage}</strong></div>
              </div>

              <p className="text-xs text-[#8E95A5] leading-relaxed">{w.description}</p>

              {w.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {w.keywords.map((k) => (
                    <span key={k} className="text-[9px] font-mono bg-[#20242E] text-[#D4AF37] px-2 py-0.5 rounded border border-[#323846]">
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: ARMOUR & GEAR */}
      {activeTab === 'armour' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredArmour.map((a) => (
            <div key={a.id} className="bg-[#161920] border border-[#323846] rounded-md p-4 space-y-2 bevel-container">
              <div className="flex items-center justify-between border-b border-[#323846] pb-2">
                <h3 className="font-gothic font-bold text-base text-[#ECEFF4]">{a.name}</h3>
                <span className="text-xs font-mono font-bold text-[#D4AF37] bg-[#0C0E12] px-2 py-1 rounded border border-[#323846]">
                  {a.cost} Ducats
                </span>
              </div>
              <div className="text-xs font-mono text-[#4E9A6E] font-bold">Modifier: {a.armourModifier}</div>
              <p className="text-xs text-[#8E95A5]">{a.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: SCENARIOS */}
      {activeTab === 'scenarios' && (
        <div className="space-y-4">
          {filteredScenarios.map((s) => (
            <div key={s.id} className="bg-[#161920] border border-[#323846] rounded-md p-6 space-y-3 bevel-container">
              <div className="flex items-center justify-between border-b border-[#323846] pb-3">
                <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">{s.name}</h3>
                <span className="text-xs font-mono text-[#D4AF37] uppercase font-bold">Official Scenario</span>
              </div>
              <p className="text-xs text-[#8E95A5] italic">{s.flavor}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs font-mono">
                <div className="p-3 bg-[#0C0E12] rounded border border-[#323846] space-y-1">
                  <strong className="text-[#D4AF37] block">Deployment:</strong>
                  <p className="text-[#ECEFF4]">{s.deployment}</p>
                </div>
                <div className="p-3 bg-[#0C0E12] rounded border border-[#323846] space-y-1">
                  <strong className="text-[#4E9A6E] block">Victory Conditions:</strong>
                  <p className="text-[#ECEFF4]">{s.victoryConditions}</p>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <strong className="text-xs font-mono text-[#8E95A5] uppercase">Primary Objectives:</strong>
                <ul className="list-disc list-inside text-xs text-[#ECEFF4] space-y-0.5">
                  {s.objectives.map((obj, idx) => (
                    <li key={idx}>{obj}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: MISSION GENERATOR */}
      {activeTab === 'generator' && <MissionGenerator />}

      {/* TAB 6: D66 CHARTS */}
      {activeTab === 'charts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Injury Chart */}
          <div className="bg-[#161920] border border-[#323846] rounded-md p-6 space-y-4 bevel-container">
            <h3 className="font-gothic font-bold text-base text-[#E53935] border-b border-[#323846] pb-2 flex items-center space-x-2">
              <Skull className="w-4 h-4" />
              <span>D66 POST-BATTLE CASUALTY & INJURY TABLE</span>
            </h3>

            <div className="space-y-2">
              {INJURY_TABLE_D66.map((inj) => (
                <div key={inj.roll} className="p-3 bg-[#0C0E12] rounded border border-[#323846] space-y-1">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="font-bold text-[#E53935]">{inj.title}</span>
                    <span className="px-2 py-0.5 rounded bg-[#8B0000] text-white text-[10px] font-bold">Roll {inj.roll}</span>
                  </div>
                  <p className="text-xs text-[#8E95A5]">{inj.effect}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Exploration Scavenge Chart */}
          <div className="bg-[#161920] border border-[#323846] rounded-md p-6 space-y-4 bevel-container">
            <h3 className="font-gothic font-bold text-base text-[#D4AF37] border-b border-[#323846] pb-2 flex items-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span>D66 NO MAN&apos;S LAND EXPLORATION & LOOT TABLE</span>
            </h3>

            <div className="space-y-2">
              {EXPLORATION_TABLE_D66.map((exp) => (
                <div key={exp.roll} className="p-3 bg-[#0C0E12] rounded border border-[#323846] space-y-1">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="font-bold text-[#D4AF37]">{exp.title}</span>
                    <span className="px-2 py-0.5 rounded bg-[#D4AF37] text-black text-[10px] font-bold">Roll {exp.roll}</span>
                  </div>
                  <div className="text-xs font-mono text-[#4E9A6E] font-semibold">Reward: {exp.reward}</div>
                  <p className="text-xs text-[#8E95A5]">{exp.description}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
