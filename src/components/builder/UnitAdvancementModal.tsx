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
  Dices,
  Zap,
  FlaskConical
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

const HOMUNCULUS_ALCHEMICAL_FORMULAS = [
  { id: 'form-third-arm', name: 'Third Arm (Extra Limb)', cost: 10, category: 'Alchemical Formula', description: 'Grafts an additional functional arm, increasing melee and weapon capacity by +1 hand.' },
  { id: 'form-compound-eyes', name: 'Compound Alchemical Eyes', cost: 10, category: 'Alchemical Formula', description: 'True sight that penetrates smoke & shroud penalties, granting +1 DICE on Ranged attacks.' },
  { id: 'form-tough-hide', name: 'Toughened Hide (TOUGH)', cost: 15, category: 'Alchemical Formula', description: 'Dense synthetic carapace. Gains TOUGH keyword (+1 Injury defense, ignores first Down result).' },
  { id: 'form-muscle-graft', name: 'Muscle Grafting (STRONG)', cost: 15, category: 'Alchemical Formula', description: 'Enhanced muscle fibers. Gains STRONG keyword (can wield 2-handed melee weapons in 1 hand).' },
  { id: 'form-acid-blood', name: 'Mercury / Acidic Blood', cost: 10, category: 'Alchemical Formula', description: 'When wounded in melee combat, the attacker suffers D3 caustic chemical damage.' },
  { id: 'form-elongated-tendons', name: 'Elongated Tendons', cost: 10, category: 'Alchemical Formula', description: 'Lengthened sinew cords granting +2" Movement.' },
  { id: 'form-regenerative-bile', name: 'Regenerative Bile (REGENERATE 1)', cost: 20, category: 'Alchemical Formula', description: 'Self-repairing bio-organ that regenerates 1 wound or clears Downed on a 4+ at start of turn.' },
  { id: 'form-chameleon-skin', name: 'Chameleon Skin', cost: 10, category: 'Alchemical Formula', description: 'Adaptive pigmentation. Counts as being in hard cover when targeted from > 12" away.' }
];

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

  const isHomunculus = Boolean(
    /homunculus|takwin/i.test(unit.profileSnapshot.name) ||
    /homunculus|takwin/i.test(unit.customName) ||
    unit.profileSnapshot.innateAbilities?.some(a => /homunculus|takwin/i.test(a.name) || /homunculus|takwin/i.test(a.description))
  );

  const [activeTab, setActiveTab] = useState<'advancement' | 'skills' | 'injuries' | 'formulas' | 'upgrades'>(
    isHomunculus ? 'formulas' : 'advancement'
  );
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
      setSelectedInjuryRoll('');
    }
  };

  const unitSkills = unit.skills || [];
  const unitScars = unit.scars || [];
  const unitUpgrades = unit.specialUpgrades || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-mono text-xs">
      <div className="bg-[#161920] border-2 border-[#D4AF37] w-full max-w-3xl max-h-[92dvh] rounded-lg shadow-2xl overflow-hidden flex flex-col bevel-container">
        
        {/* Header */}
        <div className="p-4 bg-[#0C0E12] border-b border-[#323846] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-gothic font-bold text-base sm:text-lg text-white">
                  {unit.customName}
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#323846] text-[#D4AF37] uppercase font-bold">
                  {unit.profileSnapshot.name}
                </span>
                {unit.isElite && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#7C4DFF] text-white uppercase font-bold">
                    Elite
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8E95A5] font-mono">
                Advancement, Compendium Skills, Trauma Scars & Faction Traits
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[#8E95A5] hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-4 pt-3 border-b border-[#323846] bg-[#161920] overflow-x-auto">
          
          {isHomunculus && (
            <button
              onClick={() => setActiveTab('formulas')}
              className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'formulas' 
                  ? 'border-[#D4AF37] text-[#D4AF37] bg-[#20242E]/80 rounded-t' 
                  : 'border-transparent text-[#8E95A5] hover:text-white'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Alchemical Formulas</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('advancement')}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'advancement' 
                ? 'border-[#D4AF37] text-[#D4AF37] bg-[#20242E]/80 rounded-t' 
                : 'border-transparent text-[#8E95A5] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>XP & Promotion</span>
          </button>

          <button
            onClick={() => setActiveTab('skills')}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'skills' 
                ? 'border-[#D4AF37] text-[#D4AF37] bg-[#20242E]/80 rounded-t' 
                : 'border-transparent text-[#8E95A5] hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Skills ({unitSkills.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('injuries')}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'injuries' 
                ? 'border-[#D4AF37] text-[#D4AF37] bg-[#20242E]/80 rounded-t' 
                : 'border-transparent text-[#8E95A5] hover:text-white'
            }`}
          >
            <Skull className="w-3.5 h-3.5" />
            <span>Trauma Scars ({unitScars.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('upgrades')}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'upgrades' 
                ? 'border-[#D4AF37] text-[#D4AF37] bg-[#20242E]/80 rounded-t' 
                : 'border-transparent text-[#8E95A5] hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Faction Traits</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 0: HOMUNCULUS ALCHEMICAL FORMULAS */}
          {activeTab === 'formulas' && isHomunculus && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[#0C0E12] rounded border border-[#D4AF37]/50 space-y-1">
                <div className="flex items-center space-x-2">
                  <FlaskConical className="w-4 h-4 text-[#D4AF37]" />
                  <strong className="text-xs uppercase text-[#D4AF37] font-bold block">
                    Takwin Homunculus Alchemical Formulations
                  </strong>
                </div>
                <p className="text-[11px] text-[#8E95A5] leading-relaxed">
                  Homunculi created through the Secrets of Takwin or discovered via the Book of Golems may be infused with experimental alchemical formulas upon recruitment and between campaign battles.
                </p>
              </div>

              <div className="space-y-2">
                {HOMUNCULUS_ALCHEMICAL_FORMULAS.map((formula) => {
                  const isSelected = unitUpgrades.some(u => u.id === formula.id);
                  return (
                    <div
                      key={formula.id}
                      onClick={() => toggleUnitSpecialUpgrade(warbandId, unit.id, {
                        id: formula.id,
                        name: formula.name,
                        cost: formula.cost,
                        category: 'Alchemical Formula'
                      })}
                      className={`p-3 rounded border cursor-pointer flex items-start justify-between gap-3 transition-all ${
                        isSelected
                          ? 'bg-[#20242E] border-[#D4AF37] ring-1 ring-[#D4AF37]/40 shadow'
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
                          <strong className={`text-xs ${isSelected ? 'text-[#D4AF37] font-bold' : 'text-[#ECEFF4]'}`}>
                            {formula.name}
                          </strong>
                          <span className="text-[10px] font-bold text-[#D4AF37]">
                            +{formula.cost} Ducats
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8E95A5] pl-6 leading-relaxed">
                          {formula.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 1: ADVANCEMENT & XP */}
          {activeTab === 'advancement' && (
            <div className="space-y-4">
              
              {/* XP Counter Card */}
              <div className="p-4 bg-[#0C0E12] rounded-md border border-[#323846] flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs uppercase text-[#8E95A5] font-bold block">Experience Points (XP)</span>
                  <p className="text-[11px] text-[#8E95A5] leading-relaxed">
                    Warriors gain 1 XP per match survived or objective scored. 5 XP unlocks an official Compendium Skill roll.
                  </p>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <button
                    onClick={() => handleAdjustXp(-1)}
                    className="w-8 h-8 rounded bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] border border-[#323846] flex items-center justify-center font-bold text-base"
                  >
                    -
                  </button>
                  <span className="font-gothic font-bold text-2xl text-[#D4AF37] w-12 text-center">
                    {unit.xp || 0}
                  </span>
                  <button
                    onClick={() => handleAdjustXp(1)}
                    className="w-8 h-8 rounded bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold text-base flex items-center justify-center shadow"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Promotion / Elite Designation */}
              <div className="p-4 bg-[#0C0E12] rounded-md border border-[#323846] flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Crown className="w-4 h-4 text-[#7C4DFF]" />
                    <strong className="text-xs uppercase text-[#ECEFF4] font-bold">Elite Warrior Promotion</strong>
                  </div>
                  <p className="text-[11px] text-[#8E95A5] leading-relaxed">
                    Promoting a Trooper to Elite status allows them to select skills across multiple disciplines and increases their survival resilience.
                  </p>
                </div>

                <button
                  onClick={handleToggleElite}
                  className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all flex items-center space-x-1.5 flex-shrink-0 ${
                    unit.isElite
                      ? 'bg-[#7C4DFF] text-white shadow-lg'
                      : 'bg-[#20242E] text-[#8E95A5] border border-[#323846] hover:text-white'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>{unit.isElite ? 'Elite Veteran' : 'Promote to Elite'}</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: COMPENDIUM SKILLS */}
          {activeTab === 'skills' && (
            <div className="space-y-4">
              
              {/* Skill Discipline Sub-tabs */}
              <div className="flex items-center space-x-1 bg-[#0C0E12] p-1 rounded border border-[#323846]">
                {(['melee', 'ranged', 'stealth', 'wildcard'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedSkillCategory(cat)}
                    className={`flex-1 py-1.5 text-center font-bold uppercase text-[10px] rounded transition-all ${
                      selectedSkillCategory === cat
                        ? 'bg-[#D4AF37] text-black shadow'
                        : 'text-[#8E95A5] hover:text-white'
                    }`}
                  >
                    {cat} Skills
                  </button>
                ))}
              </div>

              {/* Add Skill Dropdown */}
              <div className="p-4 bg-[#0C0E12] rounded-md border border-[#323846] space-y-3">
                <strong className="text-xs uppercase text-[#D4AF37] font-bold block">
                  Learn Skill from {selectedSkillCategory.toUpperCase()} Discipline
                </strong>

                <div className="flex gap-2">
                  <select
                    value={selectedSkillName}
                    onChange={(e) => setSelectedSkillName(e.target.value)}
                    className="flex-1 bg-[#161920] border border-[#323846] rounded p-2 text-xs text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="">-- Select Skill --</option>
                    {currentCategorySkills.map((s) => (
                      <option key={s.name} value={s.name}>
                        [{s.roll}] {s.name} - {s.description.slice(0, 50)}...
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
                  Active Acquired Skills ({unitSkills.length}):
                </span>
                {unitSkills.length === 0 ? (
                  <p className="text-xs text-[#8E95A5] italic p-4 bg-[#0C0E12] rounded border border-[#323846] text-center">
                    Warrior has not acquired any compendium skills yet.
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
