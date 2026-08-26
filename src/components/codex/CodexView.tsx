'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { 
  OFFICIAL_TRAUMA_TABLE, 
  OFFICIAL_COMMON_EXPLORATION, 
  OFFICIAL_RARE_EXPLORATION, 
  OFFICIAL_LEGENDARY_EXPLORATION,
  OFFICIAL_MELEE_SKILLS,
  OFFICIAL_RANGED_SKILLS,
  OFFICIAL_STEALTH_SKILLS,
  OFFICIAL_WILDCARD_SKILLS
} from '../../data/officialRulesData';
import { OFFICIAL_CORE_RULES } from '../../data/officialCoreRules';
import { MissionGenerator } from './MissionGenerator';
import { DiceProbabilityModal } from './DiceProbabilityModal';
import { 
  BookOpen, 
  Search, 
  Swords, 
  Tag, 
  Skull, 
  Compass, 
  Shield, 
  Sparkles, 
  Dice6, 
  BarChart3, 
  Scroll, 
  MapPin, 
  ChevronDown, 
  ChevronUp,
  Award,
  Zap
} from 'lucide-react';

export const CodexView: React.FC = () => {
  const { keywords, scenarios, weapons, armour, equipment, setActiveKeyword } = useStore();
  const [activeTab, setActiveTab] = useState<'rules' | 'keywords' | 'scenarios' | 'weapons' | 'armour' | 'skills' | 'charts' | 'generator'>('rules');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProbabilityOpen, setIsProbabilityOpen] = useState(false);
  const [expandedScenarioId, setExpandedScenarioId] = useState<string>('claim-no-mans-land');
  const [selectedChartTable, setSelectedChartTable] = useState<'trauma' | 'common' | 'rare' | 'legendary'>('trauma');
  const [selectedSkillsCategory, setSelectedSkillsCategory] = useState<'melee' | 'ranged' | 'stealth' | 'wildcard'>('melee');

  const filterText = searchQuery.toLowerCase().trim();

  const filteredRules = OFFICIAL_CORE_RULES.filter(
    (r) => r.title.toLowerCase().includes(filterText) || r.content.toLowerCase().includes(filterText)
  );

  const filteredKeywords = keywords.filter(
    (k) => k.name.toLowerCase().includes(filterText) || (k.description || '').toLowerCase().includes(filterText) || (k.type || '').toLowerCase().includes(filterText)
  );

  const filteredWeapons = weapons.filter(
    (w) => w.name.toLowerCase().includes(filterText) || w.keywords.some((kw) => kw.toLowerCase().includes(filterText)) || (w.description || '').toLowerCase().includes(filterText)
  );

  const filteredArmour = armour.filter(
    (a) => a.name.toLowerCase().includes(filterText) || (a.description || '').toLowerCase().includes(filterText)
  );

  const filteredScenarios = scenarios.filter(
    (s) => s.name.toLowerCase().includes(filterText) || (s.tagline || s.flavor || s.fullRulesMarkdown || '').toLowerCase().includes(filterText)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      
      {/* Header Banner */}
      <div className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 shadow-xl space-y-4 bevel-container">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <BookOpen className="w-6 h-6 text-[#D4AF37]" />
              <h1 className="font-gothic font-bold text-2xl text-[#ECEFF4] tracking-wide">
                OFFICIAL RULES COMPENDIUM & CODEX
              </h1>
            </div>
            <p className="text-xs font-mono text-[#8E95A5]">
              Official Trench Crusade ruleset, 12 scenarios with deployment maps, keywords glossary, and campaign tables
            </p>
          </div>

          <button
            onClick={() => setIsProbabilityOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-[#20242E] hover:bg-[#323846] border border-[#D4AF37]/50 text-[#D4AF37] rounded font-mono text-xs font-bold uppercase transition-all shadow flex-shrink-0"
          >
            <BarChart3 className="w-4 h-4" />
            <span>2D6 Probability Odds</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#8E95A5] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search core rules, keywords, weapons, 12 scenarios, skills, injury tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0C0E12] border border-[#323846] rounded pl-9 pr-4 py-2 text-xs font-mono text-[#ECEFF4] placeholder-[#8E95A5] focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 overflow-x-auto pb-1">
          {[
            { id: 'rules', label: 'Core Rules', icon: <BookOpen className="w-4 h-4" /> },
            { id: 'keywords', label: `Keywords (${keywords.length})`, icon: <Tag className="w-4 h-4" /> },
            { id: 'scenarios', label: '12 Scenarios & Maps', icon: <Compass className="w-4 h-4" /> },
            { id: 'skills', label: 'Skills Compendium', icon: <Zap className="w-4 h-4" /> },
            { id: 'charts', label: 'Campaign D66 Tables', icon: <Skull className="w-4 h-4" /> },
            { id: 'weapons', label: 'Weapons', icon: <Swords className="w-4 h-4" /> },
            { id: 'armour', label: 'Armour & Gear', icon: <Shield className="w-4 h-4" /> },
            { id: 'generator', label: 'Mission Generator', icon: <Dice6 className="w-4 h-4 text-[#D4AF37]" /> }
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

      {/* TAB 1: CORE & COMPREHENSIVE RULES */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRules.map((chapter) => (
              <div
                key={chapter.id}
                className="bg-[#161920] border border-[#323846] rounded-md p-5 space-y-3 bevel-container hover:border-[#D4AF37]/40 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-[#323846] pb-2">
                  <h3 className="font-gothic font-bold text-base text-[#ECEFF4]">
                    {chapter.title}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#20242E] text-[#D4AF37] border border-[#D4AF37]/30 font-bold uppercase">
                    {chapter.category}
                  </span>
                </div>
                <div className="text-xs font-mono text-[#ECEFF4] leading-relaxed whitespace-pre-line">
                  {chapter.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: KEYWORDS GLOSSARY */}
      {activeTab === 'keywords' && (
        <div className="space-y-4">
          <div className="p-3 bg-[#0C0E12] border border-[#323846] rounded text-xs font-mono text-[#8E95A5]">
            Complete official <strong>Keywords Glossary (Pages 52-58)</strong> extracted straight from the Trench Crusade rulebook.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredKeywords.map((kw) => (
              <div
                key={kw.name}
                className="bg-[#161920] border border-[#323846] rounded-md p-4 space-y-2 bevel-container hover:border-[#D4AF37]/50 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 border-b border-[#323846] pb-2">
                    <span className="font-gothic font-bold text-sm text-[#ECEFF4]">
                      {kw.name}
                    </span>
                    {kw.type && (
                      <span className="px-1.5 py-0.5 rounded bg-[#20242E] text-[#D4AF37] text-[9px] font-mono font-bold uppercase border border-[#D4AF37]/30 flex-shrink-0">
                        {kw.type}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#ECEFF4] font-mono mt-2 leading-relaxed">
                    {kw.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: 12 OFFICIAL SCENARIOS & DEPLOYMENT MAPS */}
      {activeTab === 'scenarios' && (
        <div className="space-y-6">
          <div className="p-3 bg-[#0C0E12] border border-[#323846] rounded text-xs font-mono text-[#8E95A5]">
            All <strong>12 Official Scenarios (Pages 151-197)</strong> with genuine battlefield archetypes, special rules, victory conditions, and tactical deployment maps.
          </div>

          <div className="space-y-4">
            {filteredScenarios.map((s) => {
              const isExpanded = expandedScenarioId === s.id;
              return (
                <div
                  key={s.id}
                  className="bg-[#161920] border-2 border-[#323846] rounded-md overflow-hidden shadow-xl bevel-container hover:border-[#D4AF37]/40 transition-colors"
                >
                  {/* Scenario Header Bar */}
                  <div 
                    onClick={() => setExpandedScenarioId(isExpanded ? '' : s.id)}
                    className="p-4 bg-[#20242E] hover:bg-[#262B37] cursor-pointer flex items-center justify-between border-b border-[#323846] transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Compass className="w-5 h-5 text-[#D4AF37]" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">
                            {s.name}
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0C0E12] text-[#D4AF37] border border-[#D4AF37]/30 font-bold uppercase">
                            Official Scenario
                          </span>
                        </div>
                        <p className="text-xs font-mono text-[#8E95A5] italic">{s.tagline || s.flavor}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 font-mono text-xs text-[#D4AF37]">
                      <span className="hidden sm:inline">{isExpanded ? 'Collapse' : 'View Map & Full Rules'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Scenario Content Body */}
                  {isExpanded && (
                    <div className="p-6 space-y-6">
                      
                      {/* Grid: Tactical Map & Quick Parameters */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Deployment Map Image */}
                        {s.mapImage && (
                          <div className="lg:col-span-1 bg-[#0C0E12] border-2 border-[#D4AF37]/50 rounded-md p-2 flex flex-col items-center space-y-2">
                            <span className="text-[11px] font-mono uppercase font-bold text-[#D4AF37] flex items-center space-x-1">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Tactical Deployment Map</span>
                            </span>
                            <div className="w-full aspect-square bg-[#161920] rounded overflow-hidden flex items-center justify-center border border-[#323846]">
                              <img
                                src={s.mapImage}
                                alt={`${s.name} Deployment Map`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <span className="text-[10px] font-mono text-[#8E95A5] text-center">
                              Official deployment coordinates & objective placement
                            </span>
                          </div>
                        )}

                        {/* Quick Spec Highlights */}
                        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                          <div className="p-3 bg-[#0C0E12] rounded border border-[#323846] space-y-1">
                            <strong className="text-[#D4AF37] block uppercase text-[10px]">Forces & Restrictions:</strong>
                            <p className="text-[#ECEFF4] leading-relaxed">{s.forces || 'Standard Warband composition and rules apply.'}</p>
                          </div>

                          <div className="p-3 bg-[#0C0E12] rounded border border-[#323846] space-y-1">
                            <strong className="text-[#D4AF37] block uppercase text-[10px]">Battlefield & Archetype:</strong>
                            <p className="text-[#ECEFF4] leading-relaxed">{s.battlefield || 'Standard battlefield setup.'}</p>
                          </div>

                          <div className="p-3 bg-[#0C0E12] rounded border border-[#323846] space-y-1">
                            <strong className="text-[#4E9A6E] block uppercase text-[10px]">Deployment Rules:</strong>
                            <p className="text-[#ECEFF4] leading-relaxed">{s.deployment || 'Standard alternating deployment.'}</p>
                          </div>

                          <div className="p-3 bg-[#0C0E12] rounded border border-[#323846] space-y-1">
                            <strong className="text-[#4E9A6E] block uppercase text-[10px]">Game Length:</strong>
                            <p className="text-[#ECEFF4] leading-relaxed">{s.gameLength || '4 Turns.'}</p>
                          </div>
                        </div>

                      </div>

                      {/* Full Rules Markdown */}
                      {s.fullRulesMarkdown && (
                        <div className="p-4 bg-[#0C0E12] border border-[#323846] rounded-md font-mono text-xs text-[#ECEFF4] leading-relaxed whitespace-pre-line">
                          <strong className="text-[#D4AF37] uppercase text-xs block mb-2">Complete Rulebook Transcription:</strong>
                          {s.fullRulesMarkdown}
                        </div>
                      )}

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: SKILLS COMPENDIUM */}
      {activeTab === 'skills' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#161920] border border-[#323846] rounded-md">
            <div>
              <span className="font-gothic font-bold text-base text-[#ECEFF4] block">
                OFFICIAL HERO SKILLS & PROMOTIONS (Pages 107-111)
              </span>
              <p className="text-xs font-mono text-[#8E95A5]">
                Learnable skills for Elite warriors and Promoted heroes
              </p>
            </div>

            <div className="flex space-x-1.5 font-mono text-xs">
              {[
                { id: 'melee', label: 'Melee & Strength' },
                { id: 'ranged', label: 'Ranged Skills' },
                { id: 'stealth', label: 'Stealth & Speed' },
                { id: 'wildcard', label: 'Wildcard Skills' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedSkillsCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded font-bold uppercase transition-all ${
                    selectedSkillsCategory === cat.id
                      ? 'bg-[#D4AF37] text-black'
                      : 'bg-[#20242E] text-[#8E95A5] hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(selectedSkillsCategory === 'melee'
              ? OFFICIAL_MELEE_SKILLS
              : selectedSkillsCategory === 'ranged'
              ? OFFICIAL_RANGED_SKILLS
              : selectedSkillsCategory === 'stealth'
              ? OFFICIAL_STEALTH_SKILLS
              : OFFICIAL_WILDCARD_SKILLS
            ).map((skill, idx) => (
              <div
                key={idx}
                className="bg-[#161920] border border-[#323846] rounded-md p-4 space-y-2 bevel-container hover:border-[#D4AF37]/50 transition-colors"
              >
                <div className="flex items-center space-x-2 border-b border-[#323846] pb-2">
                  <Zap className="w-4 h-4 text-[#D4AF37]" />
                  <span className="font-gothic font-bold text-sm text-[#ECEFF4]">
                    {skill.name}
                  </span>
                </div>
                <p className="text-xs font-mono text-[#ECEFF4] leading-relaxed">
                  {skill.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: CAMPAIGN D66 TABLES */}
      {activeTab === 'charts' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#161920] border border-[#323846] rounded-md">
            <div>
              <span className="font-gothic font-bold text-base text-[#ECEFF4] block">
                OFFICIAL CAMPAIGN TABLES (D66)
              </span>
              <p className="text-xs font-mono text-[#8E95A5]">
                Exact rulebook tables for trauma casualties and exploration scavenge
              </p>
            </div>

            <div className="flex space-x-1.5 font-mono text-xs">
              {[
                { id: 'trauma', label: 'Trauma Table (D66)' },
                { id: 'common', label: 'Common Exploration (D66)' },
                { id: 'rare', label: 'Rare Exploration (D66)' },
                { id: 'legendary', label: 'Legendary Exploration' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedChartTable(cat.id as any)}
                  className={`px-3 py-1.5 rounded font-bold uppercase transition-all ${
                    selectedChartTable === cat.id
                      ? 'bg-[#D4AF37] text-black'
                      : 'bg-[#20242E] text-[#8E95A5] hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table Display */}
          <div className="space-y-2">
            {(selectedChartTable === 'trauma' ? OFFICIAL_TRAUMA_TABLE :
              selectedChartTable === 'common' ? OFFICIAL_COMMON_EXPLORATION :
              selectedChartTable === 'rare' ? OFFICIAL_RARE_EXPLORATION :
              OFFICIAL_LEGENDARY_EXPLORATION
            ).map((entry, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-[#161920] border border-[#323846] rounded-md space-y-1 font-mono text-xs hover:border-[#D4AF37]/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-[#D4AF37]">{entry.title}</span>
                    {('reward' in entry) && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#20242E] text-[#4E9A6E] font-bold border border-[#4E9A6E]/30">
                        {entry.reward}
                      </span>
                    )}
                  </div>
                  <span className="px-2.5 py-0.5 rounded bg-[#0C0E12] text-[#D4AF37] font-bold text-[11px] border border-[#323846]">
                    Roll {entry.roll}
                  </span>
                </div>
                <p className="text-[#ECEFF4] text-[11px] leading-relaxed pt-1">
                  {entry.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: WEAPONS ARMORY */}
      {activeTab === 'weapons' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWeapons.map((wep) => (
            <div
              key={wep.id}
              className="bg-[#161920] border border-[#323846] rounded-md p-4 space-y-2 bevel-container hover:border-[#D4AF37]/50 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start border-b border-[#323846] pb-2">
                  <span className="font-gothic font-bold text-sm text-[#ECEFF4]">{wep.name}</span>
                  <span className="text-xs font-mono font-bold text-[#D4AF37]">{wep.cost} D</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[11px] font-mono text-[#8E95A5] pt-2">
                  <div>RNG: <strong className="text-[#ECEFF4]">{wep.range}</strong></div>
                  <div>MOD: <strong className="text-[#ECEFF4]">{wep.modifiers}</strong></div>
                  <div>DMG: <strong className="text-[#ECEFF4]">{wep.damage}</strong></div>
                </div>
                {wep.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {wep.keywords.map((k) => (
                      <span key={k} className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#20242E] text-[#D4AF37]">
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 7: ARMOUR & GEAR */}
      {activeTab === 'armour' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArmour.map((arm) => (
            <div
              key={arm.id}
              className="bg-[#161920] border border-[#323846] rounded-md p-4 space-y-2 bevel-container hover:border-[#D4AF37]/50 transition-colors"
            >
              <div className="flex justify-between items-start border-b border-[#323846] pb-2">
                <span className="font-gothic font-bold text-sm text-[#ECEFF4]">{arm.name}</span>
                <span className="text-xs font-mono font-bold text-[#D4AF37]">{arm.cost} D</span>
              </div>
              <div className="text-xs font-mono text-[#4E9A6E] font-bold">
                Protection: {arm.armourModifier}
              </div>
              {arm.description && (
                <p className="text-xs font-mono text-[#8E95A5]">{arm.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 8: MISSION GENERATOR */}
      {activeTab === 'generator' && <MissionGenerator />}

      {/* 2D6 Probability Odds Modal */}
      {isProbabilityOpen && (
        <DiceProbabilityModal onClose={() => setIsProbabilityOpen(false)} />
      )}

    </div>
  );
};
