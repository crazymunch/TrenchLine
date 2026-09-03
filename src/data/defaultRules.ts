import { Faction } from '../types/rules';

export const FACTIONS: Faction[] = [
  {
    id: 'new-antioch',
    name: 'The Principality of New Antioch',
    theme: 'Dieselpunk Holy Crusaders',
    description: 'The bastion of Christendom in the Levant. Armoured in heavy iron and utilizing heavy machine guns, sniper priests, and mechanized assault infantry.',
    color: '#D4AF37',
    icon: 'Shield'
  },
  {
    id: 'trench-pilgrims',
    name: 'Trench Pilgrims',
    theme: 'Religious Fanatics & Flagellants',
    description: 'Zealots and martyrs who believe the end of days is nigh. Driven by holy fury, carrying sacred relics and mobile Anchorite shrines into the trenches.',
    color: '#8B0000',
    icon: 'Flame'
  },
  {
    id: 'iron-sultanate',
    name: 'The Sultanate of the Iron Wall',
    theme: 'Ottoman Alchemists & Janissaries',
    description: 'Guardians of the Great Iron Wall. Masters of Greek fire, alchemical hazard engineering, Takwin homunculi, and elite Janissary firing lines.',
    color: '#008080',
    icon: 'Building2'
  },
  {
    id: 'heretic-legions',
    name: 'The Heretic Legions',
    theme: 'Damned Traitors & Chaos Cultists',
    description: 'Legionnaires who renounced their faith and embraced the infernal powers of Hell, wielding blasphemous sorcery and machine armour.',
    color: '#4B0082',
    icon: 'Skull'
  },
  {
    id: 'black-grail',
    name: 'The Cult of the Black Grail',
    theme: 'Plague & Putrefaction',
    description: 'Worshippers of the Lord of Flies and disease. Their corrupted bodies heal from putrid ichor and spread virulent contagion.',
    color: '#2E8B57',
    icon: 'Biohazard'
  },
  {
    id: 'court-seven-serpents',
    name: 'The Court of the Seven-Headed Serpent',
    theme: 'Aristocratic Devils & Hell Knights',
    description: 'The ancient demonic aristocracy of the Pit, armed with sulfur weaponry, serpent rifles, and pit beasts.',
    color: '#800020',
    icon: 'Crown'
  },
  /*
    The two Carcass Front Warbands. Their entries, armouries, Battlekit,
    special rules and Variants are all derived from the book by
    `scripts/lib/carcass-front-layer.mjs`; what is written here is the same
    thing written for the six above — a name, a colour, a one-line blurb.
  */
  {
    id: 'procession-of-the-sacred-affliction',
    name: 'The Procession of the Sacred Affliction',
    theme: 'Lazarist Pilgrims & the Sacred Diseased',
    description: 'A wandering column of lepers, penitents and the sacred sick, shepherded by the Knights of Saint Lazarus. They march on the Carcass Front behind punishing millstones and an anchorite shrine, and their afflictions are their armour.',
    color: '#C8B27A',
    icon: 'Cross'
  },
  {
    id: 'heretic-naval-raiders',
    name: 'The Heretic Naval Raiders',
    theme: 'Fallen Mariners & Drowned Choristers',
    description: 'Damned crews out of the black water, come ashore for plunder and souls. Fast and unseen until they are aboard, they fight with boarding axes, hull drills and the songs of the Drowned Choir.',
    color: '#3F7C82',
    icon: 'Anchor'
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

  FACTIONS stays: faction identity, colours, icons and the one-line blurb are
  app presentation, not game data, and the pipeline has nothing to say about
  them.

  What it DOES have something to say about was also in here: each faction
  carried a hand-written `rules` array — "Voice of Command: New Antioch officers
  ... granting +1 DICE on their next activation", "Ecstatic Zeal: Pilgrim units
  add +1 DICE on charge rolls" — and not one of those appears in any source.
  They were the same fabrication as the invented statlines, sitting in the one
  file the audit's deletions had left alone because its stated job is
  presentation. The faction special rules the books actually print reach the
  app as `dataset.factions[].specialRules`, and `hydrateCatalogs` now copies
  them onto these records, so the comparator and anything else reading a
  faction's rules reads the derived ones.
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

/*
  OFFICIAL_CORE_RULES was eight chapters of hand-written rules prose and is
  deleted with the rest of them. The Codex reads `dataset.coreRules`, extracted
  from the Comprehensive Rulebook by scripts/lib/parse-core-rules.mjs. See
  AUDIT §1.14.
*/
