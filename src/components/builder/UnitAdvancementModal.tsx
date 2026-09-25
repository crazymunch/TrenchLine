'use client';

import React, { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { useStore } from '../../store/useStore';
import { ActiveUnit } from '../../types/warband';
import { soundEffects } from '../../services/soundEffects';
import { useDataset } from '../../rules/useDataset';
import { DEFAULT_RULESET_ID } from '../../rules/rulesets';
import { optionGroupsOf, allowanceGiven } from '../../rules/optionGroups';
import { canBePromoted } from '../../rules/promotions';
import { nextAdvancementAt } from '../../rules/advancement';
import { handEnteredSource, readTwoD6Total } from '../../rules/handEntry';
import { injuriesHeld, provenanceLabel } from '../../rules/provenance';
import { ExperienceTrack } from '../ExperienceTrack';
import { inFormulaGroup } from '../../rules/formulae';
import { catalogueUnitFor } from '../../rules/catalogueUnit';
import { 
  Sparkles, 
  Skull, 
  Plus, 
  Trash2, 
  Crown, 
  Flame, 
  BookOpen, 
  Users
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
    addUnitInjury,
    removeUnitInjury,
    setUnitFireteam,
    toggleUnitSpecialUpgrade
  } = useStore();


  /*
    The Alchemical Formulas tab that stood here is gone — FD-13a item 2, and
    Order 35's ruling that the equip sheet's Formulas tab REPLACES it rather
    than sitting beside it.

    Two surfaces writing one category is the failure this codebase keeps
    finding: they disagree and whichever ran last wins. This one also opened
    on a `/homunculus|takwin/i` test over the model's NAME and abilities —
    the habit `rules/formulae.ts` documents — and then listed EVERY option
    group flattened, Formulae and Sagas and Strains alike, under a heading
    that called all of them Alchemical Formulas.

    What it could not do is the part that matters: it had no prerequisite,
    no exclusion, no Book of Golems allowance and no dead-Alchemist rule.
    `AddEquipmentModal` reads all four through `rules/formulaShelf.ts`.

    This sheet keeps everything that is not a Formula — Goetic Powers,
    Strains, Sagas, Martial Disciplines, Arts of Assassination — under
    `factionUpgradeGroups` below.
  */
  const [activeTab, setActiveTab] = useState<'advancement' | 'skills' | 'injuries' | 'upgrades'>(
    'advancement'
  );
  const [selectedSkillCategory, setSelectedSkillCategory] = useState<'melee' | 'ranged' | 'stealth' | 'wildcard'>('melee');
  const [selectedSkillName, setSelectedSkillName] = useState<string>('');
  const [selectedInjuryRoll, setSelectedInjuryRoll] = useState<string>('');
  /*
    The note that goes with a hand-entered record (FD-12 item 2).

    Everything added on these two tabs is added BY HAND: the player picks a row
    off the table rather than rolling for it in the app. The owner's answer on
    pre-app history was "manual entry marked as such", so each entry is written
    `manual-pre-app` and this is the "as such" — the player's own words for when
    and why. Optional: a marked entry with no note is still marked.
  */
  const [preAppNote, setPreAppNote] = useState<string>('');
  /*
    Which of the two hand-entry kinds this is (review round 1, finding E).

    Every hand entry used to be written `manual-pre-app`, so a scar a player
    typed in during game six — because they rolled it at the table rather than
    in the app — was labelled as predating an app that had been holding the
    Warband all season. `manual` carries the game; `manual-pre-app` carries the
    player's note and no game, because there was no campaign record then.

    Defaults to `manual`: an app already open on a Warband is the ordinary case,
    and "before the app" is the claim that has to be made deliberately.
  */
  const [beforeTheApp, setBeforeTheApp] = useState(false);
  /* The 2D6 total a hand-entered Skill was rolled on, where the player had one.
     Empty is the honest default and costs no Advancement Roll — review round 2
     item 1. A string, because it is what was typed until it is read. */
  const [handRoll, setHandRoll] = useState<string>('');
  const [selectedInjuryName, setSelectedInjuryName] = useState<string>('');


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
  /* The next circled box on the Experience track, derived. `null` past the
     end of the track, or where the ruleset predates it. */
  const nextRoll = nextAdvancementAt(dataset, unit?.xp ?? 0);

  /*
    This model's purchasable options, as the catalogues carry them: real names,
    real costs, real rules text. Matched on the profile name, which is what a
    saved warband stores.
  */
  const warbandFaction = useStore(
    (st) => st.warbands.find((w) => w.id === warbandId)?.factionId);
  /* Id first, faction second, name last. The bare name lookup that stood
     here answered with the Court of the Seven-Headed Serpent's `Homunculus`
     for every Homunculus on any roster — six entries share the name (ID-1). */
  const catalogueUnit = catalogueUnitFor(dataset, unit, warbandFaction);
  const optionGroups = (catalogueUnit?.options ?? []).reduce<
    Record<string, {
      id: string; name: string; group: string; cost: number; description: string;
      /* The whole Cost, so the Strongbox spends both currencies. `cost` is
         the Ducat half the legacy upgrade shape carries. */
      price: { ducats: number; glory: number };
    }[]>
  >((acc, o) => {
    (acc[o.group] ??= []).push({
      id: o.id,
      name: o.name,
      /*
        The group PATH where the option has one, the leaf otherwise.

        Carried onto the item as well as used as the key. It is the label the
        unit card shows for the section, and hard-coding it meant a Saga or a
        Strain was filed on the card as an "Alchemical Formula".

        The path, not the leaf, because `formulaeOf` asks whether the category
        contains `Alchemical Formulae`: a Hawk Eyes bought here wrote
        `Eye Options` and stopped being a Formula on the model that bought it.
        The heading above is keyed on the leaf, so the player still reads
        `Eye Options`.
      */
      group: o.groupPath ?? o.group,
      // The legacy upgrade shape carries one currency; Glory is surfaced in
      // the label rather than silently dropped to zero.
      cost: o.cost.ducats,
      price: { ducats: o.cost.ducats, glory: o.cost.glory },
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
    .filter(([group]) => group !== 'Fireteams')
    /*
      Formulae are the equip sheet's, not this sheet's (Order 35's ruling).
      Filtered on the option's own `group`, which carries the PATH — the key
      is the leaf, so an `Eye Options` key would not answer
      `inFormulaGroup` and both Eye Formulae would have stayed here.
    */
    .filter(([, opts]) => !opts.every((o) => inFormulaGroup(o.group)));

  /*
    The rules that govern a whole group, which the app did not have.

    A Grail Thrall "can have up to 1 Strain", with a second once the OTHER
    models are worth enough, and a Strain "cannot be removed or lost for any
    reason". Each Amalgam has one Vile Corpus and no two may share it. All five
    options rendered as independent toggles: take all four Strains, drop one
    after buying it, give two Amalgams the same Corpus, and nothing said
    anything (docs/RULES-COVERAGE-AUDIT.md RC-07).
  */
  const warbandUnits = useStore((st) => st.warbands.find((w) => w.id === warbandId)?.units) ?? [];
  /* For a hand entry's `manual` provenance: which game of which campaign the
     player is recording it against. */
  const warbandCampaignId = useStore(
    (st) => st.warbands.find((w) => w.id === warbandId)?.campaignId);
  const campaign = useStore((st) => st.campaign);
  const othersCost = {
    ducats: warbandUnits.filter((u) => u.id !== unit.id)
      .reduce((n, u) => n + (u.totalCost ?? 0), 0),
    glory: 0,
  };
  /** The group rule and live allowance for one group name, or `null`. */
  const groupRuleFor = (group: string) => {
    const rule = optionGroupsOf(catalogueUnit).find((r) => r.group === group);
    if (!rule) return null;
    const taken = unitUpgrades.filter((u) => u.category === group).length;
    return { rule, taken, ...allowanceGiven(rule, othersCost) };
  };

  const handleAdjustXp = (delta: number) => {
    const newXp = Math.max(0, (unit.xp || 0) + delta);
    updateUnitAdvancement(warbandId, unit.id, newXp, !!unit.isElite);
    soundEffects.playDiceRoll();
  };

  /*
    Promotion is not done here any more.

    It was `handleToggleElite`: a switch that set `isElite` and asked nothing.
    FD-06a gated it on the rulebook's two tables and the ELITE ceiling, which
    stopped the illegal promotions — but it still let a player promote a legal
    model by pressing a button, and the game does not work that way. A
    Promotion is won on a Promotion Die, out of a pool the Warband earns from
    its Glorious Deeds, in the Promotions & Experience Step.

    So the step rolls it, and this card reports it (RR-05).
  */
  const promotion = canBePromoted(dataset, unit, { units: warbandUnits });

;

  /*
    The provenance of a hand entry, decided in `rules/handEntry.ts` rather than
    here (Order 44 item 1). It used to be a local closure, and the rewards modal
    had a second copy of the same rule — so when round 2 moved this one off
    `campaignGameOf`, the other kept writing `game: 1` for a Warband in no
    campaign. One function, one rule, and it is a pure function of its inputs so
    a test can drive it without a DOM.
  */
  const handEntry = (over: { roll?: string; row?: string } = {}) => handEnteredSource({
    beforeTheApp,
    warband: { campaignId: warbandCampaignId },
    campaign,
    note: preAppNote,
    ...over,
  });

  /* What the player typed as the 2D6 total, once, so the message and the saved
     value cannot disagree (Order 44 item 3). */
  const handRollRead = readTwoD6Total(handRoll);
  const handRollError = handRollRead.ok ? null : handRollRead.why;

  const handleAddSkill = () => {
    if (!selectedSkillName) return;
    /* A total the dice cannot produce is refused rather than saved (Order 44
       item 3): `13` used to be stored and labelled "rolled 13", consume no
       Advancement Roll, and say nothing about why. The button is disabled too;
       this is the same refusal for anything reaching the handler another way. */
    if (!handRollRead.ok) return;
    const skillObj = allSkillsList.find(s => s.name === selectedSkillName);
    if (skillObj) {
      addUnitSkill(warbandId, unit.id, {
        name: skillObj.name,
        category: skillObj.category,
        roll: skillObj.roll,
        effect: skillObj.description,
        /*
          Hand-entered, and marked as such. NOT `advancement`: this component
          rolled nothing, and claiming the app rolled it is the fabrication rule
          2 forbids. The wizard's Promotions step is what writes `advancement`.

          Whether it CONSUMES an Advancement Roll is decided by the record, not
          by the route (review round 2 item 1): the 2D6 total the player gives
          above is carried here, and `addUnitSkill` counts the Skill only if it
          is present. A Patron's Skill entered with the field empty costs
          nothing, which is the case counting Skills got wrong.

          `row` is the dropdown line they picked, which is not a die — kept apart
          from `roll` for the same reason the Trauma entry keeps them apart.
        */
        source: handEntry(
          handRollRead.ok && handRollRead.roll
            ? { roll: handRollRead.roll }
            : (skillObj.roll ? { row: String(skillObj.roll) } : {}),
        ),
      });
      setSelectedSkillName('');
      setHandRoll('');
    }
  };

  const handleAddInjury = () => {
    if (!selectedInjuryRoll) return;
    const injuryObj = traumaRows.find(t => t.roll === selectedInjuryRoll);
    if (injuryObj) {
      addUnitScar(warbandId, unit.id, {
        name: injuryObj.name,
        roll: injuryObj.roll,
        effect: injuryObj.description,
        /*
          The table ROW the player chose, recorded as a row (review round 2
          item 3). Nobody threw a die for it, so it must not read as a throw:
          `provenanceLabel` prints "row 41-63" and never "rolled 41-63". The
          distinction is the difference between evidence of a die and evidence
          of a choice.
        */
        source: handEntry(injuryObj.roll ? { row: injuryObj.roll } : {}),
      });
      setSelectedInjuryRoll('');
    }
  };

  /*
    An injury with no Battle Scar.

    Several Trauma results award one and not the other, and the modal only ever
    wrote scars — so a Leg Wound recorded from before the app became a scar,
    and `unfitForDuty` counted it towards retirement. `injuries` is its own
    array for that reason (RC-05), and this is the entry for it.
  */
  const handleAddInjuryOnly = () => {
    const name = selectedInjuryName.trim();
    if (!name) return;
    addUnitInjury(warbandId, unit.id, { name, source: handEntry() });
    setSelectedInjuryName('');
  };

  const unitSkills = unit.skills || [];
  const unitScars = unit.scars || [];
  const unitInjuries = injuriesHeld(unit);
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
        <div className="flex flex-wrap items-center gap-1 px-4 pt-3 border-b border-theme-border bg-theme-surface">
          

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
          
          {/* TAB 1: ADVANCEMENT & XP */}
          {activeTab === 'advancement' && (
            <div className="space-y-4">
              
              {/* XP Counter Card */}
              <div className="p-4 bg-theme-base rounded-md border border-theme-border flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs uppercase text-theme-muted font-bold block">Experience Points (XP)</span>
                  <p className="text-xs sm:text-[11px] text-theme-muted leading-relaxed">
                    {/*
                      "5 XP unlocks a Skill" was not a rule. The book checks
                      Experience off box by box and a CIRCLED box earns an
                      Advancement Roll; the circles are printed on the Roster
                      Sheet, and the totals are derived into
                      `campaign.experience.advancementAt` (RR-04).
                    */}
                    Warriors gain 1 XP per game survived, and a second for carrying out a
                    Glorious Deed.{' '}
                    {nextRoll !== null
                      ? <>The next <strong className="text-theme-text">Advancement Roll</strong> is at {nextRoll} XP.</>
                      : <>No further Advancement Rolls: this model is at the end of the Experience track.</>}
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

              {/*
                The track itself (FD-12 item 1). The counter above says how much;
                this says where the circles are and where the cap stops, which is
                what the book asks a player to read off their Roster Sheet.
              */}
              <div className="p-4 bg-theme-base rounded-md border border-theme-border">
                <ExperienceTrack dataset={dataset} unit={unit} />
              </div>

              {/* Promotion / Elite Designation */}
              <div className="p-4 bg-theme-base rounded-md border border-theme-border flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Crown className="w-4 h-4 text-theme-primary" />
                    <strong className="text-xs uppercase text-theme-text font-bold">Elite Warrior Promotion</strong>
                  </div>
                  <p className="text-xs sm:text-[11px] text-theme-muted leading-relaxed">
                    {/*
                      Was: "allows them to select skills across multiple
                      disciplines and increases their survival resilience".
                      Neither is a rule. What a Promotion actually does is gain
                      the model the ELITE Keyword, which is what earns it
                      Experience and sends it to the Trauma Table rather than
                      the Survival Roll.
                    */}
                    A Promoted model gains the ELITE Keyword and begins with 0 Experience
                    Points. ELITE models earn Experience after a game and roll on the Trauma
                    Table rather than making a Survival Roll.
                  </p>
                  {/* Where it happens, and why it is not a button here. */}
                  <p className="text-xs sm:text-[11px] text-theme-muted leading-relaxed">
                    {unit.isElite
                      ? 'Promotions are won on a Promotion Die in the Promotions & Experience Step.'
                      : promotion.eligible
                        ? 'This model can be Promoted. Assign it a Promotion Die in the '
                          + 'Promotions & Experience Step after your next game — a 6 promotes it.'
                        : promotion.detail}
                  </p>
                </div>

                {/*
                  Reported, not offered. The button that was here promoted a
                  model on a click; the Promotion Dice are rolled in the
                  post-battle step now.
                */}
                <span
                  className={`flex min-h-[44px] flex-shrink-0 items-center space-x-1.5 rounded px-4 py-2 text-xs font-bold uppercase ${
                    unit.isElite
                      ? 'bg-theme-primary text-white shadow-lg'
                      : 'bg-theme-elevated text-theme-muted border border-theme-border'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>{unit.isElite ? 'Elite Veteran' : 'Trooper'}</span>
                </span>
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

              {/*
                FD-12 item 2: everything added on this tab is a record of
                something that happened outside the app, so it is marked
                `manual-pre-app` and this is the note that goes with it. 16px on
                the input, or iOS zooms the dialog the moment it is focused
                (docs/MOBILE.md §3).
              */}
              <div className="p-3 bg-theme-base rounded-md border border-theme-border space-y-1.5">
                {/*
                  Which of the two hand-entry kinds this is (FD-12 item 2, review
                  round 1 finding E). Unticked is `manual` — recorded by hand in
                  the game the campaign is on. Ticked is `manual-pre-app`, the
                  claim that it happened before the app held this Warband, which
                  is a different statement and is the player's to make.

                  The label is the hit area, and it clears the 44px floor: the
                  box itself is 16px and the browser makes its label toggle it
                  (docs/MOBILE.md §3).
                */}
                <label className="flex min-h-[44px] items-center gap-2 text-xs font-mono text-theme-text">
                  <input
                    type="checkbox"
                    checked={beforeTheApp}
                    onChange={(e) => setBeforeTheApp(e.target.checked)}
                    className="h-4 w-4 shrink-0 accent-current"
                  />
                  <span>This happened before the app held this Warband</span>
                </label>

                <label htmlFor="pre-app-note" className="eyebrow block">
                  Your note
                </label>
                <input
                  id="pre-app-note"
                  value={preAppNote}
                  onChange={(e) => setPreAppNote(e.target.value)}
                  placeholder="e.g. rolled at the table in game 3"
                  className="w-full min-h-[44px] bg-theme-surface border border-theme-border rounded px-2 text-base sm:text-xs text-theme-text focus:outline-none focus:border-theme-primary"
                />
                {/*
                  The 2D6 total the player threw, where there was one (review
                  round 2 item 1).

                  This field is what makes the Advancement Roll accounting
                  possible at all. A Skill consumes a roll if and only if its
                  record states the roll — a Patron's grant and a Glory Item's
                  cost none — so a player who rolled at the table needs somewhere
                  to say what came up, and a player recording a Patron Skill
                  leaves it empty and is charged nothing.

                  Not the dropdown's row: that is the line they pointed at, which
                  the app already knows. This is the die.
                */}
                <label htmlFor="hand-roll" className="eyebrow block">
                  The 2D6 total you rolled, if you rolled for it
                </label>
                <input
                  id="hand-roll"
                  value={handRoll}
                  onChange={(e) => setHandRoll(e.target.value)}
                  inputMode="numeric"
                  placeholder="e.g. 9 — leave empty for a Patron or Glory Item Skill"
                  aria-invalid={handRollError ? true : undefined}
                  aria-describedby={handRollError ? 'hand-roll-error' : undefined}
                  className={[
                    'w-full min-h-[44px] bg-theme-surface border rounded px-2 text-base sm:text-xs text-theme-text focus:outline-none',
                    handRollError
                      ? 'border-status-error focus:border-status-error'
                      : 'border-theme-border focus:border-theme-primary',
                  ].join(' ')}
                />
                {/* Said out loud, and the entry refused, rather than saved as a
                    roll the dice cannot produce (Order 44 item 3). */}
                {handRollError && (
                  <p id="hand-roll-error" role="alert"
                    className="text-xs sm:text-[10px] font-mono text-status-error leading-relaxed">
                    {handRollError}
                  </p>
                )}
                <p className="text-xs sm:text-[10px] font-mono text-theme-muted leading-relaxed">
                  Nothing here rolls dice, so every entry is marked as recorded
                  by hand rather than as a roll that did not happen. A Skill uses
                  an Advancement Roll only where you give the total above: a
                  Patron grants Skills and so do some Glory Items, and counting
                  those would cancel a roll this model earned. A scar counts
                  towards retirement whichever way it was recorded.
                </p>
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
                    disabled={!selectedSkillName || !!handRollError}
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
                        {/* How it was earned. A Skill with no record reads as an
                            import — never as a roll nobody made. */}
                        <p className="text-xs sm:text-[10px] font-mono text-theme-muted">
                          {provenanceLabel(s, { audience: 'owner' })}
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
              
              {/*
                FD-12 item 2: everything added on this tab is a record of
                something that happened outside the app, so it is marked
                `manual-pre-app` and this is the note that goes with it. 16px on
                the input, or iOS zooms the dialog the moment it is focused
                (docs/MOBILE.md §3).
              */}
              <div className="p-3 bg-theme-base rounded-md border border-theme-border space-y-1.5">
                {/*
                  Which of the two hand-entry kinds this is (FD-12 item 2, review
                  round 1 finding E). Unticked is `manual` — recorded by hand in
                  the game the campaign is on. Ticked is `manual-pre-app`, the
                  claim that it happened before the app held this Warband, which
                  is a different statement and is the player's to make.

                  The label is the hit area, and it clears the 44px floor: the
                  box itself is 16px and the browser makes its label toggle it
                  (docs/MOBILE.md §3).
                */}
                <label className="flex min-h-[44px] items-center gap-2 text-xs font-mono text-theme-text">
                  <input
                    type="checkbox"
                    checked={beforeTheApp}
                    onChange={(e) => setBeforeTheApp(e.target.checked)}
                    className="h-4 w-4 shrink-0 accent-current"
                  />
                  <span>This happened before the app held this Warband</span>
                </label>

                <label htmlFor="pre-app-note" className="eyebrow block">
                  Your note
                </label>
                <input
                  id="pre-app-note"
                  value={preAppNote}
                  onChange={(e) => setPreAppNote(e.target.value)}
                  placeholder="e.g. rolled at the table in game 3"
                  className="w-full min-h-[44px] bg-theme-surface border border-theme-border rounded px-2 text-base sm:text-xs text-theme-text focus:outline-none focus:border-theme-primary"
                />
                <p className="text-xs sm:text-[10px] font-mono text-theme-muted leading-relaxed">
                  Nothing here rolls dice, so every entry is marked as recorded
                  by hand rather than as a roll that did not happen. It still
                  counts the same: a Skill uses an Advancement Roll and a scar
                  counts towards retirement, whichever way it was recorded.
                </p>
              </div>

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
                        <p className="text-xs sm:text-[10px] font-mono text-theme-muted">
                          {provenanceLabel(s, { audience: 'owner' })}
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

              {/*
                Injuries WITHOUT a Battle Scar.

                Several Trauma results award one and not the other, and this
                modal could only ever write a scar — so every injury recorded
                here became a scar, and a model retired at its third injury
                instead of its third scar (RC-05). `injuries` is the array for
                those, and `injuryRecords` carries where each came from.
              */}
              <div className="p-4 bg-theme-base rounded-md border border-theme-border space-y-3">
                <strong className="text-xs uppercase text-status-error font-bold block">
                  Add an injury that is not a Battle Scar
                </strong>
                <p className="text-xs sm:text-[10px] font-mono text-theme-muted leading-relaxed">
                  A scar counts towards retirement and an injury does not, so
                  they are two lists. Use this for an injury the model carries
                  with no scar against it.
                </p>
                <div className="flex gap-2">
                  <input
                    value={selectedInjuryName}
                    onChange={(e) => setSelectedInjuryName(e.target.value)}
                    placeholder="The injury, as it is written on your sheet"
                    className="flex-1 min-h-[44px] bg-theme-surface border border-theme-border rounded px-2 text-base sm:text-xs text-theme-text focus:outline-none focus:border-status-error"
                    aria-label="The injury to record"
                  />
                  <button
                    onClick={handleAddInjuryOnly}
                    disabled={!selectedInjuryName.trim()}
                    className="px-4 min-h-[44px] bg-theme-accent hover:bg-status-error text-white font-bold uppercase rounded text-xs shadow flex items-center space-x-1 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs sm:text-[10px] uppercase font-bold text-theme-muted block">
                  Injuries without a scar ({unitInjuries.length}):
                </span>
                {unitInjuries.length === 0 ? (
                  <p className="text-xs text-theme-muted italic p-4 bg-theme-base rounded border border-theme-border text-center">
                    None recorded.
                  </p>
                ) : (
                  unitInjuries.map((inj, idx) => (
                    <div key={`${inj.name}-${idx}`} className="p-3 bg-theme-base rounded border border-theme-border flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <strong className="text-xs text-status-error font-bold break-words">
                          {inj.name}
                        </strong>
                        <p className="text-xs sm:text-[10px] font-mono text-theme-muted">
                          {provenanceLabel(inj, { audience: 'owner' })}
                        </p>
                      </div>
                      {/* 44px, like every other control at this width
                          (docs/MOBILE.md §3) — `p-1` round a 16px icon is 24. */}
                      <button
                        onClick={() => removeUnitInjury(warbandId, unit.id, inj.name)}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center text-theme-muted hover:text-status-error"
                        title="Remove this injury"
                        aria-label={`Remove ${inj.name}`}
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
                      {groupRuleFor(group)
                        ? `${groupRuleFor(group)!.taken} of ${groupRuleFor(group)!.max} taken`
                        : `${unitUpgrades.filter(u => u.category === group).length} selected`}
                    </span>
                  </div>

                  {/* The sentence that sets the allowance, where there is one. */}
                  {groupRuleFor(group) && (
                    <p className="text-xs sm:text-[11px] text-theme-muted leading-relaxed">
                      {groupRuleFor(group)!.text}
                    </p>
                  )}

                  <div className="space-y-2">
                    {opts.map((opt) => {
                      const isSelected = unitUpgrades.some(u => u.id === opt.id);
                      const governed = groupRuleFor(group);
                      /* Full, and this is not one of the ones already taken. */
                      const atLimit = !!governed && !isSelected
                        && governed.taken >= governed.max;
                      const onToggle = () => {
                        if (atLimit) return;
                        /*
                          "Once a model has a Strain, it cannot be removed or
                          lost for any reason." The roster is the player's own
                          record and a mis-tap is a real thing, so this asks
                          rather than refuses — but it says the rule first,
                          which nothing did.
                        */
                        if (isSelected && governed?.rule.permanent
                          && !window.confirm(
                            `${governed.rule.text}\n\nRemove ${opt.name} anyway? `
                            + 'Do this only to correct a mistake.')) return;
                        toggleUnitSpecialUpgrade(warbandId, unit.id, {
                          id: opt.id,
                          name: opt.name,
                          cost: opt.cost,
                          category: group
                        });
                      };
                      return (
                        <div
                          key={opt.id}
                          onClick={onToggle}
                          aria-disabled={atLimit}
                          className={`p-3 rounded border flex items-start justify-between gap-3 transition-all ${
                            atLimit
                              ? 'bg-theme-base border-theme-border/40 opacity-50 cursor-not-allowed'
                              : 'cursor-pointer'
                          } ${
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
                                disabled={atLimit}
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
                            {atLimit && (
                              <p className="pl-6 text-xs sm:text-[10px] font-bold text-status-error">
                                {governed!.taken} of {governed!.max} already taken.
                              </p>
                            )}
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
