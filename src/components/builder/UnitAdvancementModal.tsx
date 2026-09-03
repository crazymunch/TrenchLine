'use client';

import React, { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { useStore } from '../../store/useStore';
import { ActiveUnit } from '../../types/warband';
import { soundEffects } from '../../services/soundEffects';
import { useDataset } from '../../rules/useDataset';
import { DEFAULT_RULESET_ID } from '../../rules/rulesets';
import { 
  Sparkles, 
  Skull, 
  Plus, 
  Trash2, 
  Crown, 
  Flame, 
  BookOpen, 
  Users, 
  FlaskConical
} from 'lucide-react';

interface UnitAdvancementModalProps {
  warbandId: string;
  unit: ActiveUnit;
  onClose: () => void;
}

// Special Faction Options Definition

/*
  The Alchemical Formulae, Fireteams and faction upgrades used to be three
  hand-written arrays in this file — and they were invented.

  Eight "Alchemical Formulae" (Third Arm, Compound Alchemical Eyes, Toughened
  Hide, Muscle Grafting, Mercury / Acidic Blood, Elongated Tendons, Regenerative
  Bile, Chameleon Skin) appear in neither the catalogues nor the Warbands book.
  The real Formula is `Additional Arm` at 15 Ducats granting CLEAVE 2, so a
  player saw a "Third Arm" beside it and had no way to tell which was real —
  they are not the same thing, and one of them does not exist.

  Worse, the entries whose *names* are real carried invented rules. Ours said
  Cartography & Geometry gives "+1 DICE on long range shooting"; the book says
  it grants INFILTRATOR to up to 2 models on 32mm bases. A player reading that
  at the table is reading fiction.

  So this is now derived from the unit's own catalogue options, grouped by the
  catalogue's own group names — Alchemical Formulae, Eye Options, Sagas,
  Strains, Martial Disciplines. A unit with no options in the ruleset shows
  none, which is the honest answer rather than a plausible list.
*/

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
    toggleUnitSpecialUpgrade
  } = useStore();


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


  const rulesetId = typeof window !== 'undefined'
    ? window.localStorage.getItem('trenchline_ruleset') || DEFAULT_RULESET_ID
    : DEFAULT_RULESET_ID;
  const { dataset, error: datasetError } = useDataset(rulesetId);

  /**
   * The Trauma Table, from the derived data. `Dead` is excluded: this picker
   * records an injury a surviving model carries, and a dead model has been
   * removed from the roster rather than scarred.
   */
  const traumaRows = (dataset?.campaign.trauma ?? []).filter((t) => !/^dead$/i.test(t.name));

  /*
    This model's purchasable options, as the catalogues carry them: real names,
    real costs, real rules text. Matched on the profile name, which is what a
    saved warband stores.
  */
  const catalogueUnit = dataset?.units.find(
    (u) => u.name === unit.profileSnapshot?.name || u.name === unit.customName);
  const optionGroups = (catalogueUnit?.options ?? []).reduce<
    Record<string, { id: string; name: string; group: string; cost: number; description: string }[]>
  >((acc, o) => {
    (acc[o.group] ??= []).push({
      id: o.id,
      name: o.name,
      // Carried onto the item as well as used as the key. It is the label the
      // unit card shows for the section, and hard-coding it meant a Saga or a
      // Strain was filed on the card as an "Alchemical Formula".
      group: o.group,
      // The legacy upgrade shape carries one currency; Glory is surfaced in
      // the label rather than silently dropped to zero.
      cost: o.cost.ducats,
      description: o.cost.glory
        ? `${o.description} (${o.cost.glory} Glory)`
        : o.description,
    });
    return acc;
  }, {});

  /**
   * The Advancement Skills, from the derived tables.
   *
   * The hand-written version was wrong twice over. Its six entries per category
   * were invented — five of them (Berserk Rage, Weapon Master, Duelist, Shield
   * Wall, Decapitating Strike) had already been flagged as invented abilities by
   * the wargear and keyword sweep. And it *synthesised* the roll numbers from
   * the array index, `1${i + 1}` through `4${i + 1}`, producing D66-looking
   * values that correspond to nothing: the real tables are 2D6, eleven rows
   * each, with Patron Skill at 2 and 12.
   */
  const CATEGORY_LABEL = { melee: 'Melee', ranged: 'Ranged', stealth: 'Stealth', wildcard: 'Wildcard' } as const;
  const allSkillsList = dataset
    ? (Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[]).flatMap((key) =>
        (dataset.campaign.skills[key] ?? []).map((row) => ({
          name: row.name,
          description: row.description,
          category: CATEGORY_LABEL[key],
          roll: String(row.roll),
        })))
    : [];

  const currentCategorySkills = allSkillsList.filter(s => s.category.toLowerCase() === selectedSkillCategory.toLowerCase());

  /*
    The faction's own upgrade groups for this model, from the catalogues — the
    Sagas, Strains, Arts of Assassination and Martial Disciplines a unit can
    actually buy. This replaces a hand-written table whose four real names
    carried invented rules and whose other two entries ("Order of Saint
    Lazarus", "Mechanized Armor Rite") exist in no source at all.

    The Fireteams group renders in its own section below, so it is excluded here
    rather than listed twice.
  */
  const factionUpgradeGroups = Object.entries(optionGroups)
    .filter(([group]) => group !== 'Fireteams');

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
    const injuryObj = traumaRows.find(t => t.roll === selectedInjuryRoll);
    if (injuryObj) {
      addUnitScar(warbandId, unit.id, {
        name: injuryObj.name,
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
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title={`Advancement: ${unit.customName}`}
      label="Advancement"
      footer={<div className="flex items-center justify-between w-full gap-3">
            <span className="text-xs sm:text-[10px] text-theme-muted">
              Warband Cost Adjusted: <strong className="text-theme-primary">{unit.totalCost} D</strong>
            </span>
            <button
              onClick={onClose}
              className="px-5 py-1.5 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded text-xs"
            >
              Done
            </button>
      </div>}
    >

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-4 pt-3 border-b border-theme-border bg-theme-surface overflow-x-auto">
          
          {isHomunculus && (
            <button
              onClick={() => setActiveTab('formulas')}
              className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'formulas' 
                  ? 'border-theme-primary text-theme-primary bg-theme-elevated/80 rounded-t' 
                  : 'border-transparent text-theme-muted hover:text-theme-text'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-theme-primary" />
              <span>Alchemical Formulas</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('advancement')}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'advancement' 
                ? 'border-theme-primary text-theme-primary bg-theme-elevated/80 rounded-t' 
                : 'border-transparent text-theme-muted hover:text-theme-text'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>XP & Promotion</span>
          </button>

          <button
            onClick={() => setActiveTab('skills')}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'skills' 
                ? 'border-theme-primary text-theme-primary bg-theme-elevated/80 rounded-t' 
                : 'border-transparent text-theme-muted hover:text-theme-text'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Skills ({unitSkills.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('injuries')}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'injuries' 
                ? 'border-theme-primary text-theme-primary bg-theme-elevated/80 rounded-t' 
                : 'border-transparent text-theme-muted hover:text-theme-text'
            }`}
          >
            <Skull className="w-3.5 h-3.5" />
            <span>Trauma Scars ({unitScars.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('upgrades')}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'upgrades' 
                ? 'border-theme-primary text-theme-primary bg-theme-elevated/80 rounded-t' 
                : 'border-transparent text-theme-muted hover:text-theme-text'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Faction Traits</span>
          </button>
        </div>

        {/* Tab Content */}
          
          {/* TAB 0: HOMUNCULUS ALCHEMICAL FORMULAS */}
          {activeTab === 'formulas' && isHomunculus && (
            <div className="space-y-4">
              <div className="p-3.5 bg-theme-base rounded border border-theme-primary/50 space-y-1">
                <div className="flex items-center space-x-2">
                  <FlaskConical className="w-4 h-4 text-theme-primary" />
                  <strong className="text-xs uppercase text-theme-primary font-bold block">
                    Takwin Homunculus Alchemical Formulations
                  </strong>
                </div>
                <p className="text-xs sm:text-[11px] text-theme-muted leading-relaxed">
                  Homunculi created through the Secrets of Takwin or discovered via the Book of Golems may be infused with experimental alchemical formulas upon recruitment and between campaign battles.
                </p>
              </div>

              <div className="space-y-2">
                {Object.entries(optionGroups).flatMap(([, opts]) => opts).length === 0 && (
                  <p className="text-xs text-theme-muted leading-relaxed">
                    This model has no purchasable options in the current ruleset.
                  </p>
                )}
                {Object.entries(optionGroups).flatMap(([, opts]) => opts).map((formula) => {
                  const isSelected = unitUpgrades.some(u => u.id === formula.id);
                  return (
                    <div
                      key={formula.id}
                      onClick={() => toggleUnitSpecialUpgrade(warbandId, unit.id, {
                        id: formula.id,
                        name: formula.name,
                        cost: formula.cost,
                        category: formula.group
                      })}
                      className={`p-3 rounded border cursor-pointer flex items-start justify-between gap-3 transition-all ${
                        isSelected
                          ? 'bg-theme-elevated border-theme-primary ring-1 ring-theme-primary/40 shadow'
                          : 'bg-theme-base border-theme-border hover:border-theme-primary/50'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-theme-border text-theme-primary focus:ring-0"
                          />
                          <strong className={`text-xs ${isSelected ? 'text-theme-primary font-bold' : 'text-theme-text'}`}>
                            {formula.name}
                          </strong>
                          <span className="text-xs sm:text-[10px] font-bold text-theme-primary">
                            +{formula.cost} Ducats
                          </span>
                        </div>
                        <p className="text-xs sm:text-[11px] text-theme-muted pl-6 leading-relaxed">
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
              <div className="p-4 bg-theme-base rounded-md border border-theme-border flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs uppercase text-theme-muted font-bold block">Experience Points (XP)</span>
                  <p className="text-xs sm:text-[11px] text-theme-muted leading-relaxed">
                    Warriors gain 1 XP per match survived or objective scored. 5 XP unlocks an official Compendium Skill roll.
                  </p>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <button
                    onClick={() => handleAdjustXp(-1)}
                    className="w-8 h-8 rounded bg-theme-elevated hover:bg-theme-border text-theme-text border border-theme-border flex items-center justify-center font-bold text-base"
                  >
                    -
                  </button>
                  <span className="font-gothic font-bold text-2xl text-theme-primary w-12 text-center">
                    {unit.xp || 0}
                  </span>
                  <button
                    onClick={() => handleAdjustXp(1)}
                    className="w-8 h-8 rounded bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold text-base flex items-center justify-center shadow"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Promotion / Elite Designation */}
              <div className="p-4 bg-theme-base rounded-md border border-theme-border flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Crown className="w-4 h-4 text-theme-primary" />
                    <strong className="text-xs uppercase text-theme-text font-bold">Elite Warrior Promotion</strong>
                  </div>
                  <p className="text-xs sm:text-[11px] text-theme-muted leading-relaxed">
                    Promoting a Trooper to Elite status allows them to select skills across multiple disciplines and increases their survival resilience.
                  </p>
                </div>

                <button
                  onClick={handleToggleElite}
                  className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all flex items-center space-x-1.5 flex-shrink-0 ${
                    unit.isElite
                      ? 'bg-theme-primary text-white shadow-lg'
                      : 'bg-theme-elevated text-theme-muted border border-theme-border hover:text-theme-text'
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
              <div className="flex items-center space-x-1 bg-theme-base p-1 rounded border border-theme-border">
                {(['melee', 'ranged', 'stealth', 'wildcard'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedSkillCategory(cat)}
                    className={`flex-1 py-1.5 text-center font-bold uppercase text-xs sm:text-[10px] rounded transition-all ${
                      selectedSkillCategory === cat
                        ? 'bg-theme-primary text-theme-base shadow'
                        : 'text-theme-muted hover:text-theme-text'
                    }`}
                  >
                    {cat} Skills
                  </button>
                ))}
              </div>

              {/* Add Skill Dropdown */}
              <div className="p-4 bg-theme-base rounded-md border border-theme-border space-y-3">
                <strong className="text-xs uppercase text-theme-primary font-bold block">
                  Learn Skill from {selectedSkillCategory.toUpperCase()} Discipline
                </strong>

                {/* An empty list must not read as "this category has no skills".
                    Say the tables are missing, and why nothing can be added. */}
                {currentCategorySkills.length === 0 && (
                  <p className="text-xs sm:text-[11px] font-mono text-status-error leading-relaxed mb-2">
                    {datasetError
                      ? `The Skills tables could not be loaded: ${datasetError}. No Skill can be added until they are.`
                      : 'Loading the Skills tables…'}
                  </p>
                )}

                <div className="flex gap-2">
                  <select
                    value={selectedSkillName}
                    onChange={(e) => setSelectedSkillName(e.target.value)}
                    disabled={currentCategorySkills.length === 0}
                    className="flex-1 min-h-[44px] bg-theme-surface border border-theme-border rounded p-2 text-base sm:text-xs text-theme-text focus:outline-none focus:border-theme-primary disabled:opacity-50"
                  >
                    <option value="">-- Select Skill --</option>
                    {currentCategorySkills.map((s) => (
                      <option key={`${s.roll}-${s.name}`} value={s.name}>
                        [2D6 {s.roll}] {s.name} — {s.description.slice(0, 50)}…
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleAddSkill}
                    disabled={!selectedSkillName}
                    className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded text-xs shadow flex items-center space-x-1 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Learn</span>
                  </button>
                </div>
              </div>

              {/* Acquired Skills List */}
              <div className="space-y-2">
                <span className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted block">
                  Active Acquired Skills ({unitSkills.length}):
                </span>
                {unitSkills.length === 0 ? (
                  <p className="text-xs text-theme-muted italic p-4 bg-theme-base rounded border border-theme-border text-center">
                    Warrior has not acquired any compendium skills yet.
                  </p>
                ) : (
                  unitSkills.map((s, idx) => (
                    <div key={idx} className="p-3 bg-theme-base rounded border border-theme-border flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          <strong className="text-xs text-theme-primary font-bold">{s.name}</strong>
                          <span className="text-xs sm:text-[10px] px-1.5 py-0.2 rounded bg-theme-elevated text-theme-text border border-theme-border">
                            {s.category} • [{s.roll || 'D66'}]
                          </span>
                        </div>
                        <p className="text-xs sm:text-[11px] text-theme-muted leading-relaxed">
                          {s.effect}
                        </p>
                      </div>

                      <button
                        onClick={() => removeUnitSkill(warbandId, unit.id, s.name)}
                        className="text-theme-muted hover:text-status-error p-1"
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
              <div className="p-4 bg-theme-base rounded-md border border-theme-border space-y-3">
                <strong className="text-xs uppercase text-status-error font-bold block">
                  Add Trauma Table Injury / Permanent Scar
                </strong>

                <div className="flex gap-2">
                  <select
                    value={selectedInjuryRoll}
                    onChange={(e) => setSelectedInjuryRoll(e.target.value)}
                    className="flex-1 bg-theme-surface border border-theme-border rounded p-2 text-xs text-theme-text focus:outline-none focus:border-status-error"
                  >
                    <option value="">-- Select Trauma Table Result --</option>
                    {traumaRows.map((t) => (
                      <option key={t.roll} value={t.roll}>
                        [{t.roll}] {t.name} — {t.description.slice(0, 50)}…
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleAddInjury}
                    disabled={!selectedInjuryRoll}
                    className="px-4 py-2 bg-theme-accent hover:bg-status-error text-white font-bold uppercase rounded text-xs shadow flex items-center space-x-1 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Apply</span>
                  </button>
                </div>
              </div>

              {/* Scars List */}
              <div className="space-y-2">
                <span className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted block">
                  Active Permanent Injuries & Scars ({unitScars.length}):
                </span>
                {unitScars.length === 0 ? (
                  <p className="text-xs text-theme-muted italic p-4 bg-theme-base rounded border border-theme-border text-center">
                    Warrior has suffered no permanent trauma.
                  </p>
                ) : (
                  unitScars.map((s, idx) => (
                    <div key={idx} className="p-3 bg-theme-base rounded border border-theme-border flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          <strong className="text-xs text-status-error font-bold">{s.name}</strong>
                          <span className="text-xs sm:text-[10px] px-1.5 py-0.2 rounded bg-theme-elevated text-theme-text border border-theme-border">
                            Trauma Roll: [{s.roll}]
                          </span>
                        </div>
                        <p className="text-xs sm:text-[11px] text-theme-muted leading-relaxed">
                          {s.effect}
                        </p>
                      </div>

                      <button
                        onClick={() => removeUnitScar(warbandId, unit.id, s.name)}
                        className="text-theme-muted hover:text-status-error p-1"
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
              {factionUpgradeGroups.map(([group, opts]) => (
                <div className="space-y-2" key={group}>
                  <div className="flex items-center justify-between border-b border-theme-border pb-2">
                    <strong className="text-xs uppercase text-theme-primary font-bold flex items-center space-x-1.5">
                      <Flame className="w-3.5 h-3.5" />
                      <span>{group}</span>
                    </strong>
                    <span className="text-xs sm:text-[10px] text-theme-muted">
                      {unitUpgrades.filter(u => u.category === group).length} selected
                    </span>
                  </div>

                  <div className="space-y-2">
                    {opts.map((opt) => {
                      const isSelected = unitUpgrades.some(u => u.id === opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => toggleUnitSpecialUpgrade(warbandId, unit.id, {
                            id: opt.id,
                            name: opt.name,
                            cost: opt.cost,
                            category: group
                          })}
                          className={`p-3 rounded border cursor-pointer flex items-start justify-between gap-3 transition-all ${
                            isSelected
                              ? 'bg-theme-elevated border-theme-primary ring-1 ring-theme-primary/40'
                              : 'bg-theme-base border-theme-border hover:border-theme-primary/50'
                          }`}
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded border-theme-border text-theme-primary focus:ring-0"
                              />
                              <strong className={`text-xs ${isSelected ? 'text-theme-primary' : 'text-theme-text'}`}>
                                {opt.name}
                              </strong>
                              <span className="text-xs sm:text-[10px] font-bold text-theme-primary">
                                {opt.cost} Ducats
                              </span>
                            </div>
                            <p className="text-xs sm:text-[11px] text-theme-muted pl-6 leading-relaxed">
                              {opt.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Fireteam Protocols */}
              <div className="space-y-2 pt-2 border-t border-theme-border">
                <div className="flex items-center justify-between border-b border-theme-border pb-2">
                  <strong className="text-xs uppercase text-theme-text font-bold flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-theme-primary" />
                    <span>Fireteam Coordination Protocol (0/1)</span>
                  </strong>
                  <span className="text-xs sm:text-[10px] text-theme-muted">
                    {unit.fireteam ? 'Assigned' : 'None'}
                  </span>
                </div>

                <div className="space-y-2">
                  {(optionGroups['Fireteams'] ?? []).length === 0 && (
                    <p className="text-xs text-theme-muted leading-relaxed">
                      No Fireteams are published for this model in the current ruleset.
                    </p>
                  )}
                  {(optionGroups['Fireteams'] ?? []).map((ft) => {
                    const isSelected = unit.fireteam === ft.name;
                    return (
                      <div
                        key={ft.id}
                        onClick={() => setUnitFireteam(warbandId, unit.id, isSelected ? undefined : ft.name)}
                        className={`p-3 rounded border cursor-pointer flex items-start justify-between gap-3 transition-all ${
                          isSelected
                            ? 'bg-theme-elevated border-theme-primary ring-1 ring-theme-primary/40'
                            : 'bg-theme-base border-theme-border hover:border-theme-primary/50'
                        }`}
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-theme-border text-theme-primary focus:ring-0"
                            />
                            <strong className={`text-xs ${isSelected ? 'text-theme-primary' : 'text-theme-text'}`}>
                              {ft.name}
                            </strong>
                          </div>
                          <p className="text-xs sm:text-[11px] text-theme-muted pl-6 leading-relaxed">
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

    </Sheet>
  );
};
