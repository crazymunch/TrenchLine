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
import { AVAILABLE_RULESETS } from '../../data/rulesets';
import { soundEffects } from '../../services/soundEffects';
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
  Coins,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const CodexView: React.FC = () => {
  const { keywords, scenarios, weapons, armour, equipment, rulesetVersion, setRulesetVersion, setActiveKeyword } = useStore();
  const [activeTab, setActiveTab] = useState<'rules' | 'keywords' | 'scenarios' | 'skills' | 'charts' | 'weapons' | 'armour' | 'generator' | 'rulesets'>('rules');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProbabilityOpen, setIsProbabilityOpen] = useState(false);
  const [expandedScenarioId, setExpandedScenarioId] = useState<string>('claim-no-mans-land');
  const [selectedChartTable, setSelectedChartTable] = useState<'trauma' | 'common' | 'rare' | 'legendary'>('trauma');
  const [selectedSkillsCategory, setSelectedSkillsCategory] = useState<'melee' | 'ranged' | 'stealth' | 'wildcard'>('melee');
  const [skillsViewMode, setSkillsViewMode] = useState<'cards' | 'tables'>('cards');
  const [selectedSkillModal, setSelectedSkillModal] = useState<{
    name: string;
    description: string;
    category: string;
    d66Roll: string;
    howToObtain: string;
  } | null>(null);
  const [selectedWargearItem, setSelectedWargearItem] = useState<OfficialWargearItem | null>(null);
  const [lightboxMap, setLightboxMap] = useState<{ src: string; name: string; tableSize?: string } | null>(null);

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
              { id: 'rulesets', label: `Ruleset Errata (${rulesetVersion})`, icon: <Layers className="w-4 h-4" /> },
              { id: 'keywords', label: `Keywords (${keywords.length})`, icon: <Tag className="w-4 h-4" /> },
              { id: 'scenarios', label: `Scenarios (${scenarios.length}) & Maps`, icon: <Compass className="w-4 h-4" /> },
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
              { id: 'skills', label: 'Skills Compendium', icon: <Zap className="w-4 h-4" /> },
              { id: 'charts', label: 'Campaign D66 Tables', icon: <Skull className="w-4 h-4" /> },
              { id: 'weapons', label: `Weapons Codex (${weapons.length})`, icon: <Swords className="w-4 h-4" /> },
              { id: 'armour', label: `Armour & Gear (${armour.length + equipment.length})`, icon: <Shield className="w-4 h-4" /> },
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

      {/* TAB: RULESETS & CHANGELOG ERRATA (1.0 vs 1.0.2 vs 1.0.2TD) */}
      {activeTab === 'rulesets' && (
        <div className="space-y-6">
          <div className="bg-[#161920] border-2 border-[#D4AF37] rounded-md p-6 space-y-4 bevel-container">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#323846] pb-4">
              <div>
                <h2 className="font-gothic font-bold text-xl text-[#D4AF37]">
                  RULESET ENGINE & OFFICIAL ERRATA COMPARATOR
                </h2>
                <p className="text-xs font-mono text-[#8E95A5]">
                  Select the active game ruleset version. All army builder validations, keywords, and combat calculations adhere to the active version.
                </p>
              </div>
              <span className="text-xs font-mono font-bold uppercase px-3 py-1.5 rounded bg-[#20242E] text-[#D4AF37] border border-[#D4AF37]">
                Active Ruleset: v{rulesetVersion}
              </span>
            </div>

            {/* Ruleset Cards Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {(Object.keys(AVAILABLE_RULESETS) as (keyof typeof AVAILABLE_RULESETS)[]).map((vKey) => {
                const meta = AVAILABLE_RULESETS[vKey];
                const isActive = rulesetVersion === vKey;

                return (
                  <div
                    key={vKey}
                    onClick={() => setRulesetVersion(vKey)}
                    className={`p-5 rounded-md border-2 cursor-pointer transition-all flex flex-col justify-between space-y-4 ${
                      isActive
                        ? 'bg-[#20242E] border-[#D4AF37] ring-1 ring-[#D4AF37] shadow-xl'
                        : 'bg-[#0C0E12] border-[#323846] hover:border-[#8E95A5]/60 opacity-80'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-gothic font-bold text-base text-[#ECEFF4]">{meta.name}</span>
                        {isActive && (
                          <CheckCircle2 className="w-5 h-5 text-[#4E9A6E]" />
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-[#D4AF37] block font-bold uppercase">
                        {meta.releaseDate}
                      </span>
                      <p className="text-xs font-mono text-[#8E95A5] leading-relaxed">
                        {meta.summary}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[#323846]">
                      <span className="text-[10px] font-mono font-bold uppercase text-[#ECEFF4] block">Key Mechanics:</span>
                      <ul className="space-y-1 text-[11px] font-mono text-[#8E95A5]">
                        {meta.keyChanges.map((change, idx) => (
                          <li key={idx} className="flex items-start space-x-1.5">
                            <span className="text-[#D4AF37]">•</span>
                            <span className="leading-snug">{change}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRulesetVersion(vKey);
                      }}
                      className={`w-full py-2 font-mono text-xs font-bold uppercase rounded transition-colors ${
                        isActive
                          ? 'bg-[#D4AF37] text-black font-extrabold'
                          : 'bg-[#161920] text-[#ECEFF4] border border-[#323846] hover:bg-[#20242E]'
                      }`}
                    >
                      {isActive ? '✓ Active Ruleset' : `Activate v${vKey}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed 1.0.2 Changelog Breakdown Table */}
          <div className="bg-[#161920] border border-[#323846] rounded-md p-6 space-y-4">
            <h3 className="font-gothic font-bold text-lg text-[#ECEFF4] flex items-center space-x-2">
              <Scroll className="w-5 h-5 text-[#D4AF37]" />
              <span>OFFICIAL 1.0.2 CHANGELOG & ERRATA INDEX</span>
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#323846] bg-[#0C0E12] text-[#D4AF37]">
                    <th className="py-2.5 px-3 font-bold">Location</th>
                    <th className="py-2.5 px-3 font-bold">Rule / Keyword</th>
                    <th className="py-2.5 px-3 font-bold">Official 1.0.2 Errata Ruling</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#323846]/60 text-[#ECEFF4]">
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#8E95A5]">Actions</td>
                    <td className="py-2.5 px-3 font-bold text-[#D4AF37]">Move</td>
                    <td className="py-2.5 px-3 text-[#8E95A5]">A Move ACTION cannot be used to move a model within 1” of an enemy model (must use Charge ACTION instead).</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#8E95A5]">Actions</td>
                    <td className="py-2.5 px-3 font-bold text-[#D4AF37]">Retreat</td>
                    <td className="py-2.5 px-3 text-[#8E95A5]">Before retreat, opponent makes 1 melee attack with 1 weapon (no multiple attacks, but CLEAVE X applies). Model must end retreat &gt;1” away.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#8E95A5]">Combat</td>
                    <td className="py-2.5 px-3 font-bold text-[#D4AF37]">Bloodbath Rolls</td>
                    <td className="py-2.5 px-3 text-[#8E95A5]">Spend 6 BLOOD MARKERS (or 3 if target is Down) to roll 3D6 and add all 3 together, picking 3 highest/lowest (4D6 if DEADLY).</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#8E95A5]">Keywords</td>
                    <td className="py-2.5 px-3 font-bold text-[#D4AF37]">ARMOUR PIERCING</td>
                    <td className="py-2.5 px-3 text-[#8E95A5]">Reduces the target’s total -INJURY MODIFIER from Armour and Shields by 1, to a minimum of 0.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#8E95A5]">Keywords</td>
                    <td className="py-2.5 px-3 font-bold text-[#D4AF37]">CLEAVE (X)</td>
                    <td className="py-2.5 px-3 text-[#8E95A5]">Make X separate Melee Attacks one after another against models within 1”. Blood markers spent only modify that specific attack.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#8E95A5]">Keywords</td>
                    <td className="py-2.5 px-3 font-bold text-[#D4AF37]">STRONG</td>
                    <td className="py-2.5 px-3 text-[#8E95A5]">Can equip and use one 2-Handed Melee Weapon as if it were a 1-Handed Melee Weapon.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#8E95A5]">Keywords</td>
                    <td className="py-2.5 px-3 font-bold text-[#D4AF37]">REGENERATE (X)</td>
                    <td className="py-2.5 px-3 text-[#8E95A5]">When Activated, before carrying out any ACTIONS, remove up to X BLOOD MARKERS from the model.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#8E95A5]">Warbands</td>
                    <td className="py-2.5 px-3 font-bold text-[#D4AF37]">Combat Engineer & Sapper</td>
                    <td className="py-2.5 px-3 text-[#8E95A5]">Gains NEGATE MINED, Set Mine ACTION (8”x8” terrain with +2 DICE), and Defuse Mine Risky Roll.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#8E95A5]">Warbands</td>
                    <td className="py-2.5 px-3 font-bold text-[#D4AF37]">Sultanate Assassin</td>
                    <td className="py-2.5 px-3 text-[#8E95A5]">Temporal Assassin: split charge & 2 Fight actions against 2 enemies; Time Slip: redeploy 6" when enemy fails attack.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-[#8E95A5]">Spells</td>
                    <td className="py-2.5 px-3 font-bold text-[#D4AF37]">Goetic Spells</td>
                    <td className="py-2.5 px-3 text-[#8E95A5]">Pay spell cost by removing BLOOD MARKERS anywhere on the battlefield from non-Black Grail / non-Demonic models.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
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
                      
                      {/* Scenario Tactical Map Graphic with Lightbox Trigger */}
                      {scen.mapImage && (
                        <div 
                          onClick={() => setLightboxMap({ src: scen.mapImage || '', name: scen.name, tableSize: scen.tableSize })}
                          className="bg-[#161920] border-2 border-[#D4AF37]/60 hover:border-[#D4AF37] rounded-md p-4 space-y-2 max-w-2xl mx-auto shadow-2xl cursor-pointer group transition-all"
                        >
                          <div className="flex items-center justify-between text-xs font-mono text-[#D4AF37] border-b border-[#323846] pb-2 font-bold uppercase">
                            <span className="flex items-center space-x-1.5">
                              <Compass className="w-4 h-4" />
                              <span>Official Deployment Diagram: {scen.name}</span>
                            </span>
                            <span className="text-[10px] text-[#8E95A5] flex items-center space-x-1">
                              <Search className="w-3 h-3 text-[#D4AF37]" />
                              <span>Click to Enlarge</span>
                            </span>
                          </div>
                          <div className="relative overflow-hidden rounded">
                            <img
                              src={scen.mapImage}
                              alt={`${scen.name} Tactical Map`}
                              className="w-full max-h-[500px] object-contain rounded block mx-auto transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="px-4 py-2 bg-[#D4AF37] text-black font-bold uppercase rounded text-xs shadow flex items-center space-x-2">
                                <Search className="w-4 h-4" />
                                <span>Inspect Full Resolution Diagram</span>
                              </span>
                            </div>
                          </div>
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
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#161920] border-2 border-[#D4AF37] rounded-md shadow-xl bevel-container">
            <div>
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">
                  OFFICIAL HERO SKILLS COMPENDIUM & PROMOTIONS (Pages 107-111)
                </h3>
              </div>
              <p className="text-xs font-mono text-[#8E95A5]">
                Learnable skills for Elite warriors and Promoted heroes. Click any skill to inspect how to obtain it, or roll D66 directly.
              </p>
            </div>

            {/* View Mode & Roller CTAs */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const list = selectedSkillsCategory === 'melee' ? OFFICIAL_MELEE_SKILLS :
                               selectedSkillsCategory === 'ranged' ? OFFICIAL_RANGED_SKILLS :
                               selectedSkillsCategory === 'stealth' ? OFFICIAL_STEALTH_SKILLS :
                               OFFICIAL_WILDCARD_SKILLS;
                  const roll = Math.floor(Math.random() * list.length);
                  const chosen = list[roll];
                  const d1 = Math.floor(Math.random() * 6) + 1;
                  const d2 = Math.floor(Math.random() * 6) + 1;
                  setSelectedSkillModal({
                    name: chosen.name,
                    description: chosen.description,
                    category: `${selectedSkillsCategory.toUpperCase()} SKILLS TABLE`,
                    d66Roll: `${d1}${d2}`,
                    howToObtain: `Rolled on the ${selectedSkillsCategory.toUpperCase()} Skills Table (Roll ${d1}${d2}). Awarded during Campaign Promotions when spending 5 XP or when a Troop model is Promoted to Elite.`
                  });
                  soundEffects.playDiceRoll();
                }}
                className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-mono text-xs font-bold uppercase rounded flex items-center space-x-1.5 shadow"
              >
                <Dice6 className="w-4 h-4" />
                <span>Roll D66 for Skill</span>
              </button>

              <div className="flex bg-[#0C0E12] p-1 rounded border border-[#323846] text-xs font-mono">
                <button
                  onClick={() => setSkillsViewMode('cards')}
                  className={`px-3 py-1 rounded font-bold uppercase ${
                    skillsViewMode === 'cards' ? 'bg-[#20242E] text-[#D4AF37]' : 'text-[#8E95A5]'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setSkillsViewMode('tables')}
                  className={`px-3 py-1 rounded font-bold uppercase ${
                    skillsViewMode === 'tables' ? 'bg-[#20242E] text-[#D4AF37]' : 'text-[#8E95A5]'
                  }`}
                >
                  D66 Tables
                </button>
              </div>
            </div>
          </div>

          {/* Category Bar */}
          <div className="flex space-x-2 font-mono text-xs border-b border-[#323846] pb-3 overflow-x-auto">
            {[
              { id: 'melee', label: '1. Melee & Strength Skills' },
              { id: 'ranged', label: '2. Ranged & Marksmanship' },
              { id: 'stealth', label: '3. Stealth & Infiltration' },
              { id: 'wildcard', label: '4. Wildcard & Leadership' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedSkillsCategory(cat.id as any)}
                className={`px-4 py-2 rounded font-bold uppercase transition-all whitespace-nowrap ${
                  selectedSkillsCategory === cat.id
                    ? 'bg-[#D4AF37] text-black shadow'
                    : 'bg-[#161920] text-[#8E95A5] hover:text-white border border-[#323846]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Skills Display (Cards or Tables) */}
          {skillsViewMode === 'cards' ? (
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
                  onClick={() => {
                    const d6Roll = `${idx + 1} (or D66 ${idx + 1}${idx + 1})`;
                    setSelectedSkillModal({
                      name: skill.name,
                      description: skill.description,
                      category: `${selectedSkillsCategory.toUpperCase()} SKILLS TABLE`,
                      d66Roll: d6Roll,
                      howToObtain: `Rolled on the ${selectedSkillsCategory.toUpperCase()} Skills Table (Roll ${idx + 1}). Available to ELITE models spending 5 XP in the Campaign Phase or when a Troop model gains a Promotion.`
                    });
                    soundEffects.playCathedralBell();
                  }}
                  className="bg-[#161920] border border-[#323846] rounded-md p-4 space-y-2.5 bevel-container hover:border-[#D4AF37] cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <div className="flex items-center justify-between border-b border-[#323846] pb-2">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-[#D4AF37]" />
                      <span className="font-gothic font-bold text-sm text-[#ECEFF4]">
                        {skill.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0C0E12] text-[#D4AF37] border border-[#323846] font-bold">
                      Roll {idx + 1}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#ECEFF4] leading-relaxed">
                    {skill.description}
                  </p>
                  <span className="text-[10px] font-mono text-[#8E95A5] italic block pt-1">
                    Click to view acquisition & promotion rules ➔
                  </span>
                </div>
              ))}
            </div>
          ) : (
            /* Tables View */
            <div className="bg-[#161920] border border-[#323846] rounded-md overflow-hidden font-mono text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0C0E12] border-b border-[#323846] text-[#D4AF37]">
                    <th className="p-3 font-bold w-20">Roll</th>
                    <th className="p-3 font-bold w-48">Skill Name</th>
                    <th className="p-3 font-bold">Official Effect & Keywords</th>
                    <th className="p-3 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#323846]/60 text-[#ECEFF4]">
                  {(selectedSkillsCategory === 'melee'
                    ? OFFICIAL_MELEE_SKILLS
                    : selectedSkillsCategory === 'ranged'
                    ? OFFICIAL_RANGED_SKILLS
                    : selectedSkillsCategory === 'stealth'
                    ? OFFICIAL_STEALTH_SKILLS
                    : OFFICIAL_WILDCARD_SKILLS
                  ).map((skill, idx) => (
                    <tr key={idx} className="hover:bg-[#20242E] transition-colors">
                      <td className="p-3 font-bold text-[#D4AF37]">
                        {idx + 1} / {idx + 1}{idx + 1}
                      </td>
                      <td className="p-3 font-bold text-[#ECEFF4] font-gothic text-sm">
                        {skill.name}
                      </td>
                      <td className="p-3 text-[#8E95A5] leading-relaxed">
                        {skill.description}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedSkillModal({
                              name: skill.name,
                              description: skill.description,
                              category: `${selectedSkillsCategory.toUpperCase()} SKILLS TABLE`,
                              d66Roll: `${idx + 1}`,
                              howToObtain: `Rolled on the ${selectedSkillsCategory.toUpperCase()} Skills Table (Roll ${idx + 1}). Awarded when an Elite warrior spends 5 XP or when a Troop model is Promoted.`
                            });
                          }}
                          className="px-2.5 py-1 bg-[#20242E] hover:bg-[#323846] text-[#D4AF37] rounded border border-[#323846] text-[10px] font-bold uppercase"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Skill Detail Popover Modal */}
          {selectedSkillModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
              <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-lg rounded-md shadow-2xl overflow-hidden bevel-container space-y-4 p-6">
                <div className="flex items-center justify-between border-b border-[#323846] pb-3">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-[#D4AF37]" />
                    <div>
                      <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">
                        {selectedSkillModal.name}
                      </h3>
                      <span className="text-[10px] text-[#D4AF37] uppercase font-bold">
                        {selectedSkillModal.category} • Roll {selectedSkillModal.d66Roll}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSkillModal(null)}
                    className="p-1 text-[#8E95A5] hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-[#0C0E12] rounded border border-[#323846] space-y-1">
                    <span className="text-[10px] text-[#8E95A5] uppercase font-bold block">Rules & Effects:</span>
                    <p className="text-[#ECEFF4] leading-relaxed">{selectedSkillModal.description}</p>
                  </div>

                  <div className="p-3.5 bg-[#20242E] rounded border border-[#D4AF37]/40 space-y-1">
                    <span className="text-[10px] text-[#D4AF37] uppercase font-bold block flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>How to Obtain in Campaign:</span>
                    </span>
                    <p className="text-[#ECEFF4] text-xs leading-relaxed">{selectedSkillModal.howToObtain}</p>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-[#323846]">
                  <button
                    onClick={() => setSelectedSkillModal(null)}
                    className="px-4 py-1.5 bg-[#D4AF37] text-black font-bold uppercase rounded text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CAMPAIGN D66 TABLES WITH EXPLANATORY GUIDES */}
      {activeTab === 'charts' && (
        <div className="space-y-6 font-mono text-xs">
          
          {/* Header & Table Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#161920] border-2 border-[#D4AF37] rounded-md shadow-xl bevel-container">
            <div>
              <span className="font-gothic font-bold text-base text-[#ECEFF4] block">
                OFFICIAL CAMPAIGN TABLES (D66)
              </span>
              <p className="text-xs text-[#8E95A5]">
                Exact rulebook tables for trauma casualties and exploration scavenge.
              </p>
            </div>

            <div className="flex space-x-1.5 overflow-x-auto">
              {[
                { id: 'trauma', label: '1. Trauma Table (D66)' },
                { id: 'common', label: '2. Common Exploration (D66)' },
                { id: 'rare', label: '3. Rare Exploration (D66)' },
                { id: 'legendary', label: '4. Legendary Exploration' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedChartTable(cat.id as any)}
                  className={`px-3.5 py-2 rounded font-bold uppercase transition-all whitespace-nowrap ${
                    selectedChartTable === cat.id
                      ? 'bg-[#D4AF37] text-black shadow'
                      : 'bg-[#20242E] text-[#8E95A5] hover:text-white border border-[#323846]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Comprehensive Explanation Banner per Table */}
          {selectedChartTable === 'trauma' ? (
            <div className="p-4 bg-[#0C0E12] rounded border border-[#8B0000] space-y-2">
              <div className="flex items-center space-x-2 text-[#E53935]">
                <Skull className="w-4 h-4" />
                <strong className="font-gothic uppercase text-sm">HOW THE TRAUMA STEP & INJURY ROLLS WORK:</strong>
              </div>
              <p className="text-[#ECEFF4] leading-relaxed">
                After any match, every model that was taken <strong>Out of Action</strong> must roll on this D66 Trauma Table:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="p-2 bg-[#161920] rounded border border-[#E53935]/40 text-[#E53935]">
                  <strong>Rolls 11–16: Dead / Slain</strong>
                  <p className="text-[#8E95A5] pt-0.5">Model is permanently removed from the warband roster. Battlekit returns to Arsenal stash.</p>
                </div>
                <div className="p-2 bg-[#161920] rounded border border-[#FFB300]/40 text-[#FFB300]">
                  <strong>Rolls 21–36: Battle Scars</strong>
                  <p className="text-[#8E95A5] pt-0.5">Warrior survives but receives a lasting battle scar or attribute penalty. Can be healed via Field Hospital.</p>
                </div>
                <div className="p-2 bg-[#161920] rounded border border-[#4E9A6E]/40 text-[#4E9A6E]">
                  <strong>Rolls 41–66: Full Recovery</strong>
                  <p className="text-[#8E95A5] pt-0.5">Warrior recovers fully with no negative effects, gaining toughness from experience.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[#0C0E12] rounded border border-[#D4AF37]/50 space-y-2">
              <div className="flex items-center space-x-2 text-[#D4AF37]">
                <Sparkles className="w-4 h-4" />
                <strong className="font-gothic uppercase text-sm">HOW THE EXPLORATION STEP WORKS:</strong>
              </div>
              <p className="text-[#ECEFF4] leading-relaxed">
                During Step 3 of the Post-Battle Campaign Phase, participating warbands search the battlefield for lost treasures, ammo caches, and holy relics.
                The winner of the match rolls on the <strong>{selectedChartTable === 'common' ? 'Common' : selectedChartTable === 'rare' ? 'Rare' : 'Legendary'} Exploration Table</strong>.
              </p>
              <ul className="list-disc list-inside text-[#8E95A5] space-y-0.5 text-[11px]">
                <li><strong>Trench Merchant:</strong> Allows purchasing items costing up to 5 Glory from the Armory.</li>
                <li><strong>Ducat / Glory Discoveries:</strong> Added immediately to your Warband Treasury and Glory counter.</li>
                <li><strong>Unique Relics & Battlekit:</strong> Placed in your Armory Stash or assigned to warriors in the Quartermaster Step.</li>
              </ul>
            </div>
          )}

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
                    <span className="font-bold text-[#D4AF37] font-gothic text-sm">{entry.title}</span>
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

      {/* Fullscreen Scenario Map Lightbox Modal */}
      {lightboxMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in font-mono">
          <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-4xl max-h-[95vh] rounded-lg shadow-2xl overflow-hidden flex flex-col bevel-container">
            {/* Header */}
            <div className="p-4 bg-[#0C0E12] border-b border-[#323846] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Compass className="w-5 h-5 text-[#D4AF37]" />
                <div>
                  <h3 className="font-gothic font-bold text-lg text-white">
                    OFFICIAL DEPLOYMENT DIAGRAM: {lightboxMap.name}
                  </h3>
                  <span className="text-[10px] text-[#8E95A5] block">
                    Table Size: {lightboxMap.tableSize || '48" x 48"'} • Official Rulebook Diagram
                  </span>
                </div>
              </div>
              <button
                onClick={() => setLightboxMap(null)}
                className="px-3 py-1 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] rounded font-bold uppercase text-xs border border-[#323846]"
              >
                ✕ Close
              </button>
            </div>

            {/* Body: High-Res Map */}
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-[#0C0E12]/80">
              <img
                src={lightboxMap.src}
                alt={`${lightboxMap.name} Official Tactical Map`}
                className="max-w-full max-h-[75vh] object-contain rounded shadow-2xl border border-[#323846]"
              />
            </div>

            {/* Footer */}
            <div className="p-3 bg-[#161920] border-t border-[#323846] flex items-center justify-between text-xs text-[#8E95A5]">
              <span>Official Rulebook Scenario Diagram</span>
              <button
                onClick={() => setLightboxMap(null)}
                className="px-4 py-1.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded text-xs"
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
