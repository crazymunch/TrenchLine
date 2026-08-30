import { Faction, UnitProfile, WeaponProfile, ArmourProfile, EquipmentItem, RuleKeyword, Scenario } from '../types/rules';
import { OFFICIAL_CORE_RULES } from './officialCoreRules';
import { ALL_OUT_WAR_SCENARIOS } from './allOutWarData';

export const FACTIONS: Faction[] = [
  {
    id: 'new-antioch',
    name: 'The Principality of New Antioch',
    theme: 'Dieselpunk Holy Crusaders',
    description: 'The bastion of Christendom in the Levant. Armoured in heavy iron and utilizing heavy machine guns, sniper priests, and mechanized assault infantry.',
    color: '#D4AF37',
    icon: 'Shield',
    rules: [
      {
        name: 'Voice of Command',
        description: 'New Antioch officers and leaders can give orders to nearby units within 6", granting +1 DICE on their next activation.'
      },
      {
        name: 'Hold Your Fire!',
        description: 'ACTION: Order friendly models within 6" to hold fire until enemies enter optimal range for concentrated volleys.'
      }
    ]
  },
  {
    id: 'trench-pilgrims',
    name: 'Trench Pilgrims',
    theme: 'Religious Fanatics & Flagellants',
    description: 'Zealots and martyrs who believe the end of days is nigh. Driven by holy fury, carrying sacred relics and mobile Anchorite shrines into the trenches.',
    color: '#8B0000',
    icon: 'Flame',
    rules: [
      {
        name: 'Ecstatic Zeal',
        description: 'Pilgrim units add +1 DICE on charge rolls and ignore the first Blood Marker suffered in each engagement.'
      },
      {
        name: 'Prophetic Vision',
        description: 'The War Prophet allows rerolls of one failed Action or Morale roll per game round.'
      }
    ]
  },
  {
    id: 'iron-sultanate',
    name: 'The Sultanate of the Iron Wall',
    theme: 'Ottoman Alchemists & Janissaries',
    description: 'Guardians of the Great Iron Wall. Masters of Greek fire, alchemical hazard engineering, Takwin homunculi, and elite Janissary firing lines.',
    color: '#008080',
    icon: 'Building2',
    rules: [
      {
        name: 'Mastery of the Elements',
        description: 'Jabirean Alchemists can grant Fire, Gas, or Shrapnel keywords to all weapons at the start of a match and change elements mid-battle.'
      },
      {
        name: 'Takwin Alchemy',
        description: 'Can breed and customize bio-engineered Takwin Homunculi and Brazen Bulls with specialized alchemical formulae.'
      }
    ]
  },
  {
    id: 'heretic-legions',
    name: 'The Heretic Legions',
    theme: 'Damned Traitors & Chaos Cultists',
    description: 'Legionnaires who renounced their faith and embraced the infernal powers of Hell, wielding blasphemous sorcery and machine armour.',
    color: '#4B0082',
    icon: 'Skull',
    rules: [
      {
        name: 'Blasphemous Litany',
        description: 'Heretic Priests chant unholy verses that force enemies within 8" to make Risky tests for every action.'
      },
      {
        name: 'Infernal Blood Tithe',
        description: 'Heretics can sacrifice friendly Blood Markers to bolster melee attacks with +1 Injury Dice.'
      }
    ]
  },
  {
    id: 'black-grail',
    name: 'The Cult of the Black Grail',
    theme: 'Plague & Putrefaction',
    description: 'Worshippers of the Lord of Flies and disease. Their corrupted bodies heal from putrid ichor and spread virulent contagion.',
    color: '#2E8B57',
    icon: 'Biohazard',
    rules: [
      {
        name: 'Lord of Flies',
        description: 'Plague Knights and Grail Thralls inflict infection markers on hit and cause Fear to all unblessed models.'
      }
    ]
  },
  {
    id: 'court-seven-serpents',
    name: 'The Court of the Seven-Headed Serpent',
    theme: 'Aristocratic Devils & Hell Knights',
    description: 'The ancient demonic aristocracy of the Pit, armed with sulfur weaponry, serpent rifles, and pit beasts.',
    color: '#800020',
    icon: 'Crown',
    rules: [
      {
        name: 'Hellish Splendor',
        description: 'Aristocrats of the Court impose -1 DICE to all enemy ranged attacks targeting them due to sulfur smoke and sinister majesty.'
      }
    ]
  }
];

/*
  BASE_WEAPONS, BASE_ARMOUR, BASE_EQUIPMENT and BASE_UNITS have been DELETED.

  This is the half of Phase 2 that was left undone, and it is the one that
  mattered most. Legality had already moved onto the generated dataset;
  recruitment had not. `useStore` built its unit list as
  `[...BASE_UNITS, ...customUnits]` from here, and `AddUnitModal` read it — so a
  roster was *checked* against sourced data but *assembled* from data the audit
  measured as **97% wrong on statlines, with 38% of its wargear invented**.

  The check therefore fired after the mistake instead of preventing it:
  "an illegal roster cannot be silently built" was not true, only "an illegal
  roster does not stay silent" was.

  Three things these entries got wrong that the dataset gets right:

    - **Statlines.** 97% of them, measured against the catalogues.
    - **Recruitment limits.** These carried none. 69 of the 89 real units have
      one ("1 Lieutenant", "0-2 Sniper Priests"), and not one was enforced.
    - **Default loadouts.** The catalogues do not give models starting gear.
      These invented it, which is where a chunk of the invented wargear came
      from — and the invented items then had to be priced, so they were.

  `src/rules/recruitable.ts` converts the generated dataset into the shape the
  roster format speaks, and `hydrateCatalogs` fills the store from it. Until the
  dataset loads the catalogs are **empty**, and the builder says so; there is
  deliberately no fallback here, because a fallback to this data is exactly the
  failure `githubSync` was deleted for (docs/AUDIT.md §1.8).

  FACTIONS stays: faction identity, colours and icons are app presentation, not
  game data, and the pipeline has nothing to say about them.
*/


/*
  KEYWORDS is deleted with OFFICIAL_KEYWORDS. The glossary is derived from the
  rulebook and reaches the app as `dataset.keywords`; the Codex and the Play
  Mode quick search read it from there.
*/

/*
  SCENARIOS is deleted with OFFICIAL_SCENARIOS. `useScenarios()` merges the
  derived twelve with the All Out War pack, and marks which is which.
*/

/*
  INJURY_TABLE_D66 and EXPLORATION_TABLE_D66 were re-exports of the fabricated
  tables and are deleted with them. Both are now read from `dataset.campaign`,
  where the Trauma Table comes from the campaign catalogue and the Exploration
  tables from the rulebook. See AUDIT §1.13.
*/

export { OFFICIAL_CORE_RULES };
