'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { ActiveUnit } from '../../types/warband';
import { soundEffects } from '../../services/soundEffects';
import { 
  OFFICIAL_MELEE_SKILLS, 
  OFFICIAL_RANGED_SKILLS, 
  OFFICIAL_STEALTH_SKILLS, 
  OFFICIAL_WILDCARD_SKILLS,
  OFFICIAL_TRAUMA_TABLE 
} from '../../data/officialRulesData';
import { 
  Sparkles, 
  Award, 
  Skull, 
  X, 
  Plus, 
  Trash2, 
  Crown, 
  Shield, 
  Flame, 
  BookOpen, 
  Users, 
  Check,
  Dices
} from 'lucide-react';

interface UnitAdvancementModalProps {
  warbandId: string;
  unit: ActiveUnit;
  onClose: () => void;
}

// Special Faction Options Definition
const FACTION_SPECIAL_UPGRADES: Record<string, { category: string; maxSelect: number; options: { id: string; name: string; cost: number; description: string }[] }> = {
  'iron-sultanate': {
    category: 'Secrets of the House of Wisdom',
    maxSelect: 1,
    options: [
      { id: 'how-medicine', name: 'Medicine', cost: 15, description: 'Grants ability to treat wounded warriors with advanced alchemical balms (+1 DICE to Treat actions).' },
      { id: 'how-cartography', name: 'Cartography & Geometry', cost: 20, description: 'Mastery of ballistic trigonometry and siege angles (+1 DICE on long range shooting).' },
      { id: 'how-takwin', name: 'Secrets of Takwin', cost: 20, description: 'Synthetic biology and artificial creation. Can brew Homunculi and reinforce Golems/Mamluks.' },
      { id: 'how-chemistry', name: 'Chemistry & Alchemy', cost: 25, description: 'Synthesize potent alchemical Greek Fire, caustic acids, and smoke screening agents.' },
      { id: 'how-philosophy', name: 'Philosophy, Poetry and Theology', cost: 20, description: 'Profound mystical understanding of the cosmos and divine geometry (+1 Morale to squad).' },
    ]
  },
  'new-antioch': {
    category: 'Papal Injunctions & Holy Orders',
    maxSelect: 1,
    options: [
      { id: 'na-order-saint-lazarus', name: 'Order of Saint Lazarus', cost: 15, description: 'Immunity to plague rot and toxic contagion (+1 DICE on Survival checks).' },
      { id: 'na-mechanized-doctrine', name: 'Mechanized Armor Rite', cost: 20, description: 'Warrior is certified to operate pneumatic power harnesses and heavy ordinance.' },
    ]
  }
};

const FIRETEAMS = [
  { id: 'ft-mamluk-guarded', name: 'Fireteam: Mamluk-Guarded', cost: 0, description: 'Warrior forms a symbiotic protective bond with an adjacent heavy Mamluk warrior.' },
  { id: 'ft-mind-linked', name: 'Fireteam: Mind-Linked', cost: 0, description: 'Telepathic battlefield synchronization via alchemical or holy frequency.' },
  { id: 'ft-trench-breachers', name: 'Fireteam: Trench Breachers', cost: 0, description: 'Assault duo trained to clear bunkers and barbed parapets simultaneously.' }
];

export const UnitAdvancementModal: React.FC<UnitAdvancementModalProps> = ({
  warbandId,
  unit,
  onClose
}) => {
  const { 
    updateUnitAdvancement, 
    addUnitSkill, 
    removeUnitSkill, 
    addUnitScar, 
    removeUnitScar,
    setUnitFireteam,
    toggleUnitSpecialUpgrade,
    getActiveWarband
  } = useStore();

  const activeWarband = getActiveWarband();
  const factionId = activeWarband?.factionId || 'universal';

  const [activeTab, setActiveTab] = useState<'advancement' | 'skills' | 'injuries' | 'upgrades'>('advancement');
  const [selectedSkillCategory, setSelectedSkillCategory] = useState<'melee' | 'ranged' | 'stealth' | 'wildcard'>('melee');
  const [selectedSkillName, setSelectedSkillName] = useState<string>('');
  const [selectedInjuryRoll, setSelectedInjuryRoll] = useState<string>('');

  const allSkillsList = [
    ...OFFICIAL_MELEE_SKILLS.map((s, i) => ({ ...s, category: 'Melee', roll: `1${i + 1}` })),
    ...OFFICIAL_RANGED_SKILLS.map((s, i) => ({ ...s, category: 'Ranged', roll: `2${i + 1}` })),
    ...OFFICIAL_STEALTH_SKILLS.map((s, i) => ({ ...s, category: 'Stealth', roll: `3${i + 1}` })),
    ...OFFICIAL_WILDCARD_SKILLS.map((s, i) => ({ ...s, category: 'Wildcard', roll: `4${i + 1}` }))
  ];

  const currentCategorySkills = allSkillsList.filter(s => s.category.toLowerCase() === selectedSkillCategory.toLowerCase());

  const factionUpgrades = FACTION_SPECIAL_UPGRADES[factionId];

  const handleAdjustXp = (delta: number) => {
    const newXp = Math.max(0, (unit.xp || 0) + delta);
    updateUnitAdvancement(warbandId, unit.id, newXp, !!unit.isElite);
    soundEffects.playDiceRoll();
  };

  const handleToggleElite = () => {
    updateUnitAdvancement(warbandId, unit.id, unit.xp || 0, !unit.isElite);
    soundEffects.playCathedralBell();
  };

  const handleAddSkill = () => {
    if (!selectedSkillName) return;
    const skillObj = allSkillsList.find(s => s.name === selectedSkillName);
    if (skillObj) {
      addUnitSkill(warbandId, unit.id, {
        name: skillObj.name,
        category: skillObj.category,
        roll: skillObj.roll,
        effect: skillObj.description
      });
      soundEffects.playCathedralBell();
      setSelectedSkillName('');
    }
  };

  const handleAddInjury = () => {
    if (!selectedInjuryRoll) return;
    const injuryObj = OFFICIAL_TRAUMA_TABLE.find(t => t.roll === selectedInjuryRoll);
    if (injuryObj) {
      addUnitScar(warbandId, unit.id, {
        name: injuryObj.title,
        roll: injuryObj.roll,
        effect: injuryObj.description
      });
      soundEffects.playGunfire();
      setSelectedInjuryRoll('');
    }
  };

  const unitSkills = unit.skills || [];
  const unitScars = unit.scars || [];
  const unitUpgrades = unit.specialUpgrades || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-mono text-xs">
      <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-2xl max-h-[90vh] rounded-lg shadow-2xl overflow-hidden flex flex-col bevel-container">
        
        {/* Header */}
        <div className="p-4 bg-[#0C0E12] border-b border-[#323846] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded bg-[#D4AF37]/20 border border-[#D4AF37] text-[#D4AF37]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-gothic font-bold text-base text-[#ECEFF4]">
                WARRIOR ADVANCEMENT & UPGRADES
              </h3>
              <span className="text-[10px] text-[#8E95A5] block">
                {unit.customName} • {unit.profileSnapshot.name} ({unit.profileSnapshot.category})
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#8E95A5] hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#323846] bg-[#161920] px-4 pt-2 gap-2 overflow-x-auto">
          {[
            { id: 'advancement', label: 'XP & Progression', icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: 'skills', label: `Skills (${unitSkills.length})`, icon: <BookOpen className="w-3.5 h-3.5" /> },
            { id: 'injuries', label: `Scars & Injuries (${unitScars.length})`, icon: <Skull className="w-3.5 h-3.5" /> },
            { id: 'upgrades', label: 'Faction Traits & Fireteams', icon: <Flame className="w-3.5 h-3.5 text-[#D4AF37]" /> }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-2 border-b-2 font-bold uppercase flex items-center space-x-1.5 transition-colors whitespace-nowrap text-xs ${
                activeTab === t.id
                  ? 'border-[#D4AF37] text-[#D4AF37] bg-[#20242E]/80 rounded-t'
                  : 'border-transparent text-[#8E95A5] hover:text-[#ECEFF4]'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: ADVANCEMENT & XP */}
          {activeTab === 'advancement' && (
            <div className="space-y-4">
              
              {/* XP Box */}
              <div className="p-4 bg-[#0C0E12] rounded-md border border-[#323846] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#8E95A5] block">
                    Experience Points (XP):
                  </span>
                  <div className="flex items-baseline space-x-2 pt-1">
                    <strong className="text-2xl font-bold text-[#D4AF37]">{unit.xp || 0} XP</strong>
                    <span className="text-xs text-[#8E95A5]">
                      ({Math.floor((unit.xp || 0) / 5)} Advancement Rolls Earned)
                    </span>
                  </div>
                  <p className="text-[10px] text-[#8E95A5] pt-1">
                    Every 5 XP gained allows a warrior to roll on the official Campaign Skills Table.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleAdjustXp(-1)}
                    className="px-3 py-1.5 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] rounded font-bold text-sm"
                  >
                    -1 XP
                  </button>
                  <button
                    onClick={() => handleAdjustXp(1)}
                    className="px-4 py-1.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded text-xs shadow"
                  >
                    +1 XP
                  </button>
                </div>
              </div>

              {/* Elite Promotion */}
              <div className="p-4 bg-[#0C0E12] rounded-md border border-[#323846] flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <Crown className="w-4 h-4 text-[#7C4DFF]" />
                    <strong className="text-sm text-[#ECEFF4]">Elite Promotion</strong>
                  </div>
                  <p className="text-[10px] text-[#8E95A5] pt-0.5">
                    Promotes a seasoned Trooper to Elite status, unlocking access to advanced armaments and skill tables.
                  </p>
                </div>

                <button
                  onClick={handleToggleElite}
                  className={`px-4 py-2 rounded font-bold uppercase text-xs transition-all ${
                    unit.isElite
                      ? 'bg-[#7C4DFF] text-white shadow-lg'
                      : 'bg-[#20242E] text-[#8E95A5] hover:text-white border border-[#323846]'
                  }`}
                >
                  {unit.isElite ? '✓ Elite Status' : 'Standard Trooper'}
                </button>
              </div>

              {/* Summary List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-[#0C0E12] rounded border border-[#323846] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#D4AF37] block">
                    Acquired Skills ({unitSkills.length}):
                  </span>
                  {unitSkills.length === 0 ? (
                    <span className="text-[11px] text-[#8E95A5] italic">No skills acquired yet.</span>
                  ) : (
                    <div className="space-y-1">
                      {unitSkills.map((s, idx) => (
                        <div key={idx} className="text-xs text-[#ECEFF4]">
                          • <strong>{s.name}</strong> <span className="text-[#D4AF37]">[{s.roll || 'Skill'}]</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-[#0C0E12] rounded border border-[#323846] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#E53935] block">
                    Permanent Battle Scars ({unitScars.length}):
                  </span>
                  {unitScars.length === 0 ? (
                    <span className="text-[11px] text-[#8E95A5] italic">No permanent scars sustained.</span>
                  ) : (
                    <div className="space-y-1">
                      {unitScars.map((s, idx) => (
                        <div key={idx} className="text-xs text-[#ECEFF4]">
                          • <strong>{s.name}</strong> <span className="text-[#E53935]">[{s.roll || 'Scar'}]</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: SKILLS */}
          {activeTab === 'skills' && (
            <div className="space-y-4">
              
              {/* Add Skill Form */}
              <div className="p-4 bg-[#0C0E12] rounded-md border border-[#323846] space-y-3">
                <div className="flex items-center justify-between">
                  <strong className="text-xs uppercase text-[#D4AF37] font-bold">
                    Learn New Skill (From Official Compendium)
                  </strong>
                  <div className="flex space-x-1">
                    {(['melee', 'ranged', 'stealth', 'wildcard'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedSkillCategory(cat)}
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors ${
                          selectedSkillCategory === cat
                            ? 'bg-[#D4AF37] text-black'
                            : 'bg-[#20242E] text-[#8E95A5] hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <select
                    value={selectedSkillName}
                    onChange={(e) => setSelectedSkillName(e.target.value)}
                    className="flex-1 bg-[#161920] border border-[#323846] rounded p-2 text-xs text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="">-- Select {selectedSkillCategory.toUpperCase()} Skill --</option>
                    {currentCategorySkills.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name} (Roll: [{s.roll}])
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleAddSkill}
                    disabled={!selectedSkillName}
                    className="px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded text-xs shadow flex items-center space-x-1 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Learn</span>
                  </button>
                </div>
              </div>

              {/* Acquired Skills List */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#8E95A5] block">
                  Active Warrior Skills ({unitSkills.length}):
                </span>
                {unitSkills.length === 0 ? (
                  <p className="text-xs text-[#8E95A5] italic p-4 bg-[#0C0E12] rounded border border-[#323846] text-center">
                    No skills acquired yet. Add skills through battle experience or campaign rewards.
                  </p>
                ) : (
                  unitSkills.map((s, idx) => (
                    <div key={idx} className="p-3 bg-[#0C0E12] rounded border border-[#323846] flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          <strong className="text-xs text-[#D4AF37] font-bold">{s.name}</strong>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#20242E] text-[#ECEFF4] border border-[#323846]">
                            {s.category} • [{s.roll || 'D66'}]
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8E95A5] leading-relaxed">
                          {s.effect}
                        </p>
                      </div>

                      <button
                        onClick={() => removeUnitSkill(warbandId, unit.id, s.name)}
                        className="text-[#8E95A5] hover:text-[#E53935] p-1"
                        title="Remove Skill"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 3: SCARS & INJURIES */}
          {activeTab === 'injuries' && (
            <div className="space-y-4">
              
              {/* Add Injury Form */}
              <div className="p-4 bg-[#0C0E12] rounded-md border border-[#323846] space-y-3">
                <strong className="text-xs uppercase text-[#E53935] font-bold block">
                  Add Trauma Table Injury / Permanent Scar
                </strong>

                <div className="flex gap-2">
                  <select
                    value={selectedInjuryRoll}
                    onChange={(e) => setSelectedInjuryRoll(e.target.value)}
                    className="flex-1 bg-[#161920] border border-[#323846] rounded p-2 text-xs text-[#ECEFF4] focus:outline-none focus:border-[#E53935]"
                  >
                    <option value="">-- Select Trauma Table Result --</option>
                    {OFFICIAL_TRAUMA_TABLE.filter(t => !t.isDead).map((t) => (
                      <option key={t.roll} value={t.roll}>
                        [{t.roll}] {t.title} - {t.description.slice(0, 50)}...
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleAddInjury}
                    disabled={!selectedInjuryRoll}
                    className="px-4 py-2 bg-[#8B0000] hover:bg-[#A30000] text-white font-bold uppercase rounded text-xs shadow flex items-center space-x-1 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Apply</span>
                  </button>
                </div>
              </div>

              {/* Scars List */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#8E95A5] block">
                  Active Permanent Injuries & Scars ({unitScars.length}):
                </span>
                {unitScars.length === 0 ? (
                  <p className="text-xs text-[#8E95A5] italic p-4 bg-[#0C0E12] rounded border border-[#323846] text-center">
                    Warrior has suffered no permanent trauma.
                  </p>
                ) : (
                  unitScars.map((s, idx) => (
                    <div key={idx} className="p-3 bg-[#0C0E12] rounded border border-[#323846] flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          <strong className="text-xs text-[#E53935] font-bold">{s.name}</strong>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#20242E] text-[#ECEFF4] border border-[#323846]">
                            Trauma Roll: [{s.roll}]
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8E95A5] leading-relaxed">
                          {s.effect}
                        </p>
                      </div>

                      <button
                        onClick={() => removeUnitScar(warbandId, unit.id, s.name)}
                        className="text-[#8E95A5] hover:text-[#E53935] p-1"
                        title="Remove Scar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 4: FACTION TRAITS & FIRETEAMS */}
          {activeTab === 'upgrades' && (
            <div className="space-y-4">
              
              {/* Faction Special Abilities (e.g. Secrets of the House of Wisdom) */}
              {factionUpgrades && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-[#323846] pb-2">
                    <strong className="text-xs uppercase text-[#D4AF37] font-bold flex items-center space-x-1.5">
                      <Flame className="w-3.5 h-3.5" />
                      <span>{factionUpgrades.category} (Max {factionUpgrades.maxSelect})</span>
                    </strong>
                    <span className="text-[10px] text-[#8E95A5]">
                      {unitUpgrades.filter(u => u.category === factionUpgrades.category).length} / {factionUpgrades.maxSelect} Selected
                    </span>
                  </div>

                  <div className="space-y-2">
                    {factionUpgrades.options.map((opt) => {
                      const isSelected = unitUpgrades.some(u => u.id === opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => toggleUnitSpecialUpgrade(warbandId, unit.id, {
                            id: opt.id,
                            name: opt.name,
                            cost: opt.cost,
                            category: factionUpgrades.category
                          })}
                          className={`p-3 rounded border cursor-pointer flex items-start justify-between gap-3 transition-all ${
                            isSelected
                              ? 'bg-[#20242E] border-[#D4AF37] ring-1 ring-[#D4AF37]/40'
                              : 'bg-[#0C0E12] border-[#323846] hover:border-[#D4AF37]/50'
                          }`}
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded border-[#323846] text-[#D4AF37] focus:ring-0"
                              />
                              <strong className={`text-xs ${isSelected ? 'text-[#D4AF37]' : 'text-[#ECEFF4]'}`}>
                                {opt.name}
                              </strong>
                              <span className="text-[10px] font-bold text-[#D4AF37]">
                                {opt.cost} Ducats
                              </span>
                            </div>
                            <p className="text-[11px] text-[#8E95A5] pl-6 leading-relaxed">
                              {opt.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fireteam Protocols */}
              <div className="space-y-2 pt-2 border-t border-[#323846]">
                <div className="flex items-center justify-between border-b border-[#323846] pb-2">
                  <strong className="text-xs uppercase text-[#ECEFF4] font-bold flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Fireteam Coordination Protocol (0/1)</span>
                  </strong>
                  <span className="text-[10px] text-[#8E95A5]">
                    {unit.fireteam ? 'Assigned' : 'None'}
                  </span>
                </div>

                <div className="space-y-2">
                  {FIRETEAMS.map((ft) => {
                    const isSelected = unit.fireteam === ft.name;
                    return (
                      <div
                        key={ft.id}
                        onClick={() => setUnitFireteam(warbandId, unit.id, isSelected ? undefined : ft.name)}
                        className={`p-3 rounded border cursor-pointer flex items-start justify-between gap-3 transition-all ${
                          isSelected
                            ? 'bg-[#20242E] border-[#D4AF37] ring-1 ring-[#D4AF37]/40'
                            : 'bg-[#0C0E12] border-[#323846] hover:border-[#D4AF37]/50'
                        }`}
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-[#323846] text-[#D4AF37] focus:ring-0"
                            />
                            <strong className={`text-xs ${isSelected ? 'text-[#D4AF37]' : 'text-[#ECEFF4]'}`}>
                              {ft.name}
                            </strong>
                          </div>
                          <p className="text-[11px] text-[#8E95A5] pl-6 leading-relaxed">
                            {ft.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0C0E12] border-t border-[#323846] flex items-center justify-between">
          <span className="text-[10px] text-[#8E95A5]">
            Warband Cost Adjusted: <strong className="text-[#D4AF37]">{unit.totalCost} D</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold uppercase rounded text-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
