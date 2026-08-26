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
  OFFICIAL_WILDCARD_SKILLS,
  OFFICIAL_WEAPONS,
  OFFICIAL_ARMOUR,
  OFFICIAL_EQUIPMENT,
  OfficialWargearItem
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
  Zap,
  X,
  ExternalLink,
  Info,
  Layers,
  Coins
} from 'lucide-react';

export const CodexView: React.FC = () => {
  const { keywords, scenarios, weapons, armour, equipment, setActiveKeyword } = useStore();
  const [activeTab, setActiveTab] = useState<'rules' | 'keywords' | 'scenarios' | 'skills' | 'charts' | 'weapons' | 'armour' | 'generator'>('rules');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProbabilityOpen, setIsProbabilityOpen] = useState(false);
  const [expandedScenarioId, setExpandedScenarioId] = useState<string>('claim-no-mans-land');
  const [selectedChartTable, setSelectedChartTable] = useState<'trauma' | 'common' | 'rare' | 'legendary'>('trauma');
  const [selectedSkillsCategory, setSelectedSkillsCategory] = useState<'melee' | 'ranged' | 'stealth' | 'wildcard'>('melee');
  const [selectedWargearItem, setSelectedWargearItem] = useState<OfficialWargearItem | null>(null);

  const filterText = searchQuery.toLowerCase().trim();

  const filteredRules = OFFICIAL_CORE_RULES.filter(
    (r) => r.title.toLowerCase().includes(filterText) || r.content.toLowerCase().includes(filterText)
  );

  const filteredKeywords = keywords.filter(
    (k) => k.name.toLowerCase().includes(filterText) || (k.description || '').toLowerCase().includes(filterText) || (k.type || '').toLowerCase().includes(filterText)
  );

  const filteredWeapons = OFFICIAL_WEAPONS.filter(
    (w) => w.name.toLowerCase().includes(filterText) || w.keywords.some((kw) => kw.toLowerCase().includes(filterText)) || (w.lore || '').toLowerCase().includes(filterText) || w.faction.toLowerCase().includes(filterText)
  );

  const filteredArmour = [...OFFICIAL_ARMOUR, ...OFFICIAL_EQUIPMENT].filter(
    (a) => a.name.toLowerCase().includes(filterText) || (a.lore || '').toLowerCase().includes(filterText) || (a.rules || '').toLowerCase().includes(filterText) || a.faction.toLowerCase().includes(filterText)
  );

  const filteredScenarios = scenarios.filter(
    (s) => s.name.toLowerCase().includes(filterText) || (s.tagline || s.flavor || s.fullRulesMarkdown || '').toLowerCase().includes(filterText)
  );

  const formatFactionLabel = (faction: string) => {
    switch (faction) {
      case 'iron-sultanate': return 'Iron Sultanate Exclusive';
      case 'trench-pilgrims': return 'Trench Pilgrims Exclusive';
      case 'new-antioch': return 'New Antioch Exclusive';
      case 'heretic-legion': return 'Heretic Legion Exclusive';
      case 'black-grail': return 'Black Grail Exclusive';
      default: return 'Universal / Standard Issue';
    }
  };

  const getFactionBadgeColor = (faction: string) => {
    switch (faction) {
      case 'iron-sultanate': return 'bg-[#1A535C]/30 text-[#4ECDC4] border-[#4ECDC4]/40';
      case 'trench-pilgrims': return 'bg-[#B22222]/30 text-[#FF6B6B] border-[#FF6B6B]/40';
      case 'new-antioch': return 'bg-[#2E4057]/30 text-[#8ECAE6] border-[#8ECAE6]/40';
      case 'heretic-legion': return 'bg-[#4A0E17]/30 text-[#FF4D6D] border-[#FF4D6D]/40';
      default: return 'bg-[#20242E] text-[#D4AF37] border-[#D4AF37]/30';
    }
  };

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
              Authentic Trench Crusade ruleset, 12 scenarios with extracted deployment maps, keywords glossary, and arsenal lore
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

        {/* 2-ROW NAVIGATION BUTTON GRID (NO HORIZONTAL SCROLLBAR) */}
        <div className="space-y-2 pt-1">
          {/* Row 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'rules', label: 'Core Rules', icon: <BookOpen className="w-4 h-4" /> },
              { id: 'keywords', label: `Keywords (${keywords.length})`, icon: <Tag className="w-4 h-4" /> },
              { id: 'scenarios', label: '12 Scenarios & Maps', icon: <Compass className="w-4 h-4" /> },
              { id: 'skills', label: 'Skills Compendium', icon: <Zap className="w-4 h-4" /> },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center justify-center space-x-2 px-3 py-2 rounded text-xs font-mono font-bold uppercase transition-all ${
                  activeTab === t.id
                    ? 'bg-[#D4AF37] text-black shadow font-extrabold'
                    : 'bg-[#20242E] text-[#8E95A5] hover:text-[#ECEFF4] hover:bg-[#2A303D] border border-[#323846]'
                }`}
              >
                {t.icon}
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'charts', label: 'Campaign D66 Tables', icon: <Skull className="w-4 h-4" /> },
              { id: 'weapons', label: `Weapons Codex (${OFFICIAL_WEAPONS.length})`, icon: <Swords className="w-4 h-4" /> },
              { id: 'armour', label: `Armour & Gear (${OFFICIAL_ARMOUR.length + OFFICIAL_EQUIPMENT.length})`, icon: <Shield className="w-4 h-4" /> },
              { id: 'generator', label: 'Mission Generator', icon: <Dice6 className="w-4 h-4 text-[#D4AF37]" /> }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center justify-center space-x-2 px-3 py-2 rounded text-xs font-mono font-bold uppercase transition-all ${
                  activeTab === t.id
                    ? 'bg-[#D4AF37] text-black shadow font-extrabold'
                    : 'bg-[#20242E] text-[#8E95A5] hover:text-[#ECEFF4] hover:bg-[#2A303D] border border-[#323846]'
                }`}
              >
                {t.icon}
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>
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
                <div className="text-xs font-mono text-[#ECEFF4] whitespace-pre-line leading-relaxed">
                  {chapter.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: KEYWORDS GLOSSARY */}
      {activeTab === 'keywords' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKeywords.map((kw) => (
            <div
              key={kw.name}
              className="bg-[#161920] border border-[#323846] rounded-md p-4 space-y-2 bevel-container hover:border-[#D4AF37]/50 transition-colors"
            >
              <div className="flex items-center justify-between border-b border-[#323846] pb-2">
                <span className="font-gothic font-bold text-base text-[#D4AF37]">{kw.name}</span>
                {kw.type && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#20242E] text-[#8E95A5] uppercase">
                    {kw.type}
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-[#ECEFF4] leading-relaxed">
                {kw.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: 12 SCENARIOS & CRISP VECTOR MAPS */}
      {activeTab === 'scenarios' && (
        <div className="space-y-6">
          <div className="space-y-4">
            {filteredScenarios.map((scen) => {
              const isExpanded = expandedScenarioId === scen.id;
              return (
                <div
                  key={scen.id}
                  className="bg-[#161920] border-2 border-[#323846] rounded-md overflow-hidden shadow-xl bevel-container hover:border-[#D4AF37]/40 transition-colors"
                >
                  <button
                    onClick={() => setExpandedScenarioId(isExpanded ? '' : scen.id)}
                    className="w-full p-5 flex items-center justify-between text-left bg-[#161920] hover:bg-[#20242E] transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center font-gothic font-bold text-sm text-[#D4AF37]">
                        {scen.roman || scen.number}
                      </div>
                      <div>
                        <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">
                          {scen.name}
                        </h3>
                        <p className="text-xs font-mono text-[#8E95A5] italic">
                          {scen.tagline}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-[#D4AF37]" /> : <ChevronDown className="w-5 h-5 text-[#8E95A5]" />}
                  </button>

                  {isExpanded && (
                    <div className="p-6 border-t border-[#323846] bg-[#0C0E12] space-y-6">
                      
                      {/* Scenario Tactical Map Graphic */}
                      {scen.mapImage && (
                        <div className="bg-[#161920] border-2 border-[#D4AF37]/60 rounded-md p-4 space-y-2 max-w-2xl mx-auto shadow-2xl">
                          <div className="flex items-center justify-between text-xs font-mono text-[#D4AF37] border-b border-[#323846] pb-2 font-bold uppercase">
                            <span className="flex items-center space-x-1.5">
                              <Compass className="w-4 h-4" />
                              <span>Official Deployment Diagram: {scen.name}</span>
                            </span>
                            <span className="text-[10px] text-[#8E95A5]">48&quot; x 48&quot; Table</span>
                          </div>
                          <img
                            src={scen.mapImage}
                            alt={`${scen.name} Tactical Map`}
                            className="w-full max-h-[500px] object-contain rounded block mx-auto"
                          />
                        </div>
                      )}

                      {/* Scenario Rules Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                        
                        {/* Forces */}
                        <div className="p-4 bg-[#161920] border border-[#323846] rounded-md space-y-1.5">
                          <span className="font-bold text-[#D4AF37] uppercase flex items-center space-x-1.5 text-xs">
                            <Shield className="w-3.5 h-3.5" />
                            <span>Forces & Restrictions:</span>
                          </span>
                          <p className="text-[#ECEFF4] leading-relaxed whitespace-pre-line">{scen.forces}</p>
                        </div>

                        {/* Battlefield */}
                        <div className="p-4 bg-[#161920] border border-[#323846] rounded-md space-y-1.5">
                          <span className="font-bold text-[#D4AF37] uppercase flex items-center space-x-1.5 text-xs">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>The Battlefield:</span>
                          </span>
                          <p className="text-[#ECEFF4] leading-relaxed whitespace-pre-line">{scen.battlefield}</p>
                        </div>

                        {/* Deployment */}
                        <div className="p-4 bg-[#161920] border border-[#323846] rounded-md space-y-1.5 md:col-span-2">
                          <span className="font-bold text-[#D4AF37] uppercase flex items-center space-x-1.5 text-xs">
                            <Compass className="w-3.5 h-3.5" />
                            <span>Deployment Protocol:</span>
                          </span>
                          <p className="text-[#ECEFF4] leading-relaxed whitespace-pre-line">{scen.deployment}</p>
                        </div>

                        {/* Victory Conditions */}
                        <div className="p-4 bg-[#161920] border border-[#323846] rounded-md space-y-1.5">
                          <span className="font-bold text-[#4E9A6E] uppercase flex items-center space-x-1.5 text-xs">
                            <Award className="w-3.5 h-3.5" />
                            <span>Victory Conditions:</span>
                          </span>
                          <p className="text-[#ECEFF4] leading-relaxed whitespace-pre-line">{scen.victoryConditions}</p>
                        </div>

                        {/* Glorious Deeds */}
                        <div className="p-4 bg-[#161920] border border-[#323846] rounded-md space-y-1.5">
                          <span className="font-bold text-[#D4AF37] uppercase flex items-center space-x-1.5 text-xs">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Glorious Deeds:</span>
                          </span>
                          <div className="text-[#ECEFF4] leading-relaxed whitespace-pre-line">{scen.gloriousDeeds}</div>
                        </div>

                      </div>

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

      {/* TAB 6: WEAPONS CODEX (CLICKABLE FOR OFFICIAL LORE) */}
      {activeTab === 'weapons' && (
        <div className="space-y-3">
          <p className="text-xs font-mono text-[#8E95A5]">
            Click any weapon card to inspect its complete official profile, faction exclusivity, and rulebook lore excerpt:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWeapons.map((wep) => (
              <div
                key={wep.id}
                onClick={() => setSelectedWargearItem(wep)}
                className="bg-[#161920] border border-[#323846] rounded-md p-4 space-y-2.5 bevel-container hover:border-[#D4AF37] cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start border-b border-[#323846] pb-2">
                    <div>
                      <span className="font-gothic font-bold text-base text-[#ECEFF4] block">{wep.name}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-bold ${getFactionBadgeColor(wep.faction)}`}>
                        {formatFactionLabel(wep.faction)}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#D4AF37] bg-[#0C0E12] px-2 py-0.5 rounded border border-[#323846]">
                      {wep.cost} D
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-[#8E95A5] pt-2">
                    <div>Type: <strong className="text-[#ECEFF4]">{wep.type}</strong></div>
                    <div>Range: <strong className="text-[#ECEFF4]">{wep.range}</strong></div>
                  </div>

                  {wep.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {wep.keywords.map((k) => (
                        <span key={k} className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#20242E] text-[#D4AF37] border border-[#D4AF37]/20 font-bold">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] font-mono text-[#8E95A5] line-clamp-2 pt-2 italic">
                    &quot;{wep.lore}&quot;
                  </p>
                </div>

                <div className="pt-2 border-t border-[#323846]/60 flex items-center justify-between text-[10px] font-mono text-[#D4AF37]">
                  <span>Click to inspect full dossier</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: ARMOUR & GEAR CODEX (CLICKABLE FOR OFFICIAL LORE) */}
      {activeTab === 'armour' && (
        <div className="space-y-3">
          <p className="text-xs font-mono text-[#8E95A5]">
            Click any armour or gear card to inspect full official protection mechanics, faction exclusivity, and lore:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArmour.map((arm) => (
              <div
                key={arm.id}
                onClick={() => setSelectedWargearItem(arm)}
                className="bg-[#161920] border border-[#323846] rounded-md p-4 space-y-2.5 bevel-container hover:border-[#D4AF37] cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start border-b border-[#323846] pb-2">
                    <div>
                      <span className="font-gothic font-bold text-base text-[#ECEFF4] block">{arm.name}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-bold ${getFactionBadgeColor(arm.faction)}`}>
                        {formatFactionLabel(arm.faction)}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#D4AF37] bg-[#0C0E12] px-2 py-0.5 rounded border border-[#323846]">
                      {arm.cost} D
                    </span>
                  </div>

                  {arm.armourModifier !== undefined && (
                    <div className="text-xs font-mono text-[#4E9A6E] font-bold pt-1.5">
                      Protection: {arm.armourModifier} to Injury Rolls
                    </div>
                  )}

                  {arm.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1.5">
                      {arm.keywords.map((k) => (
                        <span key={k} className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#20242E] text-[#D4AF37] border border-[#D4AF37]/20 font-bold">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] font-mono text-[#8E95A5] line-clamp-2 pt-2 italic">
                    &quot;{arm.lore}&quot;
                  </p>
                </div>

                <div className="pt-2 border-t border-[#323846]/60 flex items-center justify-between text-[10px] font-mono text-[#D4AF37]">
                  <span>Click to inspect full dossier</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: MISSION GENERATOR */}
      {activeTab === 'generator' && <MissionGenerator />}

      {/* WARGEAR OFFICIAL INSPECTOR MODAL */}
      {selectedWargearItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#161920] border-2 border-[#D4AF37] rounded-lg max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 bg-[#20242E] border-b border-[#323846] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center">
                  <Swords className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="font-gothic font-bold text-lg text-white">
                    {selectedWargearItem.name}
                  </h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${getFactionBadgeColor(selectedWargearItem.faction)}`}>
                    {formatFactionLabel(selectedWargearItem.faction)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedWargearItem(null)}
                className="text-[#8E95A5] hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs">
              
              {/* Profile Metrics Grid */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-[#0C0E12] border border-[#323846] rounded-md text-center">
                <div>
                  <span className="text-[10px] text-[#8E95A5] uppercase block">Category / Type</span>
                  <strong className="text-white text-xs">{selectedWargearItem.type || selectedWargearItem.category}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#8E95A5] uppercase block">Range</span>
                  <strong className="text-white text-xs">{selectedWargearItem.range || '-'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#8E95A5] uppercase block">Armoury Cost</span>
                  <strong className="text-[#D4AF37] text-xs">{selectedWargearItem.cost} Ducats</strong>
                </div>
              </div>

              {/* Keywords & Traits */}
              {selectedWargearItem.keywords.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-[#8E95A5] block">
                    Associated Rules & Keywords:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedWargearItem.keywords.map((kw) => (
                      <span 
                        key={kw} 
                        className="px-2 py-1 bg-[#20242E] text-[#D4AF37] border border-[#D4AF37]/30 rounded text-xs font-bold"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Rules */}
              {selectedWargearItem.rules && (
                <div className="p-3 bg-[#0C0E12] border border-[#323846] rounded space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#D4AF37] block">
                    Weapon Mechanics:
                  </span>
                  <p className="text-[#ECEFF4] leading-relaxed">{selectedWargearItem.rules}</p>
                </div>
              )}

              {/* Official Rulebook Lore */}
              <div className="p-4 bg-[#0C0E12] border border-[#D4AF37]/40 rounded-md space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-[#D4AF37] flex items-center space-x-1.5">
                  <Scroll className="w-3.5 h-3.5" />
                  <span>Official Rulebook Lore & Technical History:</span>
                </span>
                <p className="text-xs text-[#ECEFF4] leading-relaxed italic">
                  &quot;{selectedWargearItem.lore}&quot;
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#20242E] border-t border-[#323846] flex justify-end">
              <button
                onClick={() => setSelectedWargearItem(null)}
                className="px-4 py-1.5 bg-[#D4AF37] hover:bg-[#C49F27] text-black font-bold uppercase rounded text-xs font-mono"
              >
                Close Dossier
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2D6 Probability Odds Modal */}
      {isProbabilityOpen && (
        <DiceProbabilityModal onClose={() => setIsProbabilityOpen(false)} />
      )}

    </div>
  );
};
