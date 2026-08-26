const fs = require('fs');

const fullTsContent = `import { Faction, UnitProfile, WeaponProfile, ArmourProfile, EquipmentItem, RuleKeyword, InjuryResult, Scenario } from '../types/rules';

export const FACTIONS: Faction[] = [
  {
    id: 'new-antioch',
    name: 'The Principality of New Antioch',
    tagline: 'Disciplined Christian crusaders, shock troops, and mechanized iron knights.',
    description: 'For three hundred years, the Principality of New Antioch has stood defiantly as the focal point of the Faithful at the very edge of the shadow cast by the Gate of Hell. It is the Home of All Our Hopes, the bulwark against Heretic forces, and the first line of defence against the Devil’s might.',
    icon: 'Cross',
    color: '#D4AF37', // Sacred Gold
    specialRules: [
      {
        name: 'New Antioch Fireteams',
        description: 'A New Antioch Warband can include up to 2 Fireteams. Each Fireteam consists of any two models from the Warband. Both models gain the FIRETEAM Keyword at no additional cost.'
      },
      {
        name: 'Concentrated Attack',
        description: 'If a model from a Fireteam hits a target that had been hit by an attack made by the other member of their Fireteam earlier in the same joint Activation, then you can spend 3 BLOOD MARKERS to convert the Injury Roll for the second attack to a Bloodbath Roll, even if the target is not Down.'
      }
    ]
  },
  {
    id: 'trench-pilgrims',
    name: 'Trench Pilgrims',
    tagline: 'Zealots, martyrs, flagellants, and the holy Ecclesiarchy.',
    description: 'A ragged, fanatical tide of pilgrims, flagellants, and penitents who march into the warzones singing hymns of bloody martyrdom, led by Castigators and the terrifying living reliquaries known as Anchorites.',
    icon: 'Flame',
    color: '#F5F5DC', // Bone Parchment
    specialRules: [
      {
        name: 'Ecstatic Martyrdom',
        description: 'Trench Pilgrims embrace suffering. When a friendly model is taken Out of Action within 6", nearby Pilgrim models gain +1 Melee DICE on their next Melee Attack.'
      },
      {
        name: 'Holy Zeal',
        description: 'Trench Pilgrim models possess the NEGATE FEAR Keyword when facing Demonic and Heretic models.'
      }
    ]
  },
  {
    id: 'iron-sultanate',
    name: 'The Sultanate of the Iron Wall',
    tagline: 'Alchemical marksmen, Brazen Bulls, and Janissaries defending the Great Wall.',
    description: 'Defenders of the Levant utilizing advanced alchemy, Greek fire, and bio-alchemical constructs to defend the Dar al-Islam against hellish hordes.',
    icon: 'Shield',
    color: '#008080', // Lapis Teal
    specialRules: [
      {
        name: 'Alchemical Mastery',
        description: 'Weapons with the FIRE or GAS keyword gain +1 to their effective blast radius or +2" range.'
      },
      {
        name: 'Brazen Fortitude',
        description: 'Janissary heavy units reduce all received Injury rolls by 1 (to a minimum of 1).'
      }
    ]
  },
  {
    id: 'heretic-legions',
    name: 'Heretic Legions',
    tagline: 'Damned renegades, Hell-knights, and blood sacrifices.',
    description: 'Traitorous soldiers who have embraced the powers of Hell, wielding demonic weaponry, corrupted icons, and dark sorceries.',
    icon: 'Skull',
    color: '#FF4500', // Ember Orange
    specialRules: [
      {
        name: 'Blood for the Pit',
        description: 'Each enemy taken Out of Action adds 1 Blood Token directly to the Warband Pool for summoning rituals or dark boons.'
      },
      {
        name: 'Infernal Terror',
        description: 'Charging Heretic Elites cause Fear checks on enemy defenders.'
      }
    ]
  },
  {
    id: 'black-grail',
    name: 'The Cult of the Black Grail (The Order of the Fly)',
    tagline: 'Plague heralds, rotting abominations, and filth chanters.',
    description: 'Vessels of the Lord of Pestilence, covered in weeping sores and carrying the diseased ichor of the Black Grail.',
    icon: 'Biohazard',
    color: '#33691E', // Putrid Green
    specialRules: [
      {
        name: 'Black Grail Contagion',
        description: 'Any model striking a Black Grail unit in melee and rolling a failure suffers 1 automatic Infection Marker.'
      }
    ]
  },
  {
    id: 'court-seven-serpents',
    name: 'The Court of the Seven-Headed Serpent',
    tagline: 'Aristocratic infernal diplomats, sorcerers, and flesh-sculptors.',
    description: 'Decadent diabolists bargaining with serpentine arch-devils for psychic potency, unnatural mutations, and immortal splendor.',
    icon: 'Crown',
    color: '#9C27B0', // Royal Purple
    specialRules: [
      {
        name: 'Glamour of the Pit',
        description: 'Enemies shooting at Nobles of the Court beyond 12" suffer a -1 DICE penalty to Ranged Attack rolls.'
      }
    ]
  },
  {
    id: 'mercenaries',
    name: 'Mercenaries & Free Companies',
    tagline: 'Guns-for-hire, sellswords, penal legions, and deserters.',
    description: 'Battle-hardened veterans fighting strictly for gold, archeotech salvage, and cold survival in the trenches.',
    icon: 'Swords',
    color: '#78909C', // Slate Lead
    specialRules: [
      {
        name: 'Cutthroat Grit',
        description: 'Mercenary units can take equipment from any faction armory list with a +5 Ducat surcharge.'
      }
    ]
  }
];

export const BASE_UNITS: UnitProfile[] = [
  // -------------------------------------------------------------
  // NEW ANTIOCH PROFILES
  // -------------------------------------------------------------
  {
    id: 'na-lieutenant',
    name: 'Lieutenant',
    factionId: 'new-antioch',
    category: 'Leader',
    baseCost: 70,
    stats: {
      movement: '6"',
      ranged: '+1 DICE',
      melee: '+1 DICE',
      armour: '-1',
      keywords: ['NEW ANTIOCH', 'ELITE', 'LEADER', 'TOUGH']
    },
    innateAbilities: [
      {
        id: 'hold-your-fire',
        name: 'Hold Your Fire!',
        description: 'A Lieutenant can take a Hold Your Fire! ACTION. Pick 1 enemy model in Line of Sight; the opponent must activate that model next.'
      },
      {
        name: 'Voice of Command',
        id: 'voice-command',
        description: 'Once per activation, grant a friendly Trooper within 8" a free Dash or Aim action.'
      }
    ],
    defaultWeapons: ['service-rifle', 'trench-knife'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Field commander of the Antioch Trench Line, hardened by years of chemical warfare and demon breaches.'
  },
  {
    id: 'na-sniper-priest',
    name: '0-2 Sniper Priest',
    factionId: 'new-antioch',
    category: 'Elite',
    baseCost: 50,
    stats: {
      movement: '6"',
      ranged: '+2 DICE',
      melee: '+0 DICE',
      armour: '-1',
      keywords: ['NEW ANTIOCH', 'ELITE']
    },
    innateAbilities: [
      {
        id: 'blessed-aim',
        name: 'Blessed Sight',
        description: 'If stationary, add +2 DICE to Success Rolls for Ranged Attacks.'
      }
    ],
    defaultWeapons: ['sniper-rifle', 'trench-knife'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Ordained marksmen delivering holy scripture via high-velocity armor-piercing rounds.'
  },
  {
    id: 'na-trench-cleric',
    name: '0-1 Trench Cleric',
    factionId: 'new-antioch',
    category: 'Elite',
    baseCost: 60,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+1 DICE',
      armour: '-1',
      keywords: ['NEW ANTIOCH', 'ELITE', 'NEGATE FEAR']
    },
    innateAbilities: [
      {
        id: 'onward-christian-soldiers',
        name: 'Onward Christian Soldiers!',
        description: 'Friendly NEW ANTIOCH models within 8" of a Trench Cleric have the NEGATE FEAR Keyword.'
      }
    ],
    defaultWeapons: ['trench-club'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Carries heavy consecrated maces, holy scriptures, and battle banners to steady the faith of the line.'
  },
  {
    id: 'na-combat-medic',
    name: '0-1 Combat Medic',
    factionId: 'new-antioch',
    category: 'Elite',
    baseCost: 65,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+0 DICE',
      armour: '-1',
      keywords: ['NEW ANTIOCH', 'NEGATE FEAR', 'ELITE']
    },
    innateAbilities: [
      {
        id: 'expert-medic',
        name: 'Expert Medic',
        description: 'Add +2 DICE to the Risky Success Roll when carrying out a Treat ACTION with their Medi-kit.'
      },
      {
        id: 'finish-the-fallen',
        name: 'Finish the Fallen',
        description: 'Add +1 INJURY DICE to Melee Attacks if the target is Down and not BLACK GRAIL or DEMONIC.'
      }
    ],
    defaultWeapons: ['trench-knife'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Battlefield surgeons equipped with morphine, field kits, and merciful misericordia blades.'
  },
  {
    id: 'na-combat-engineer',
    name: '0-2 Combat Engineer',
    factionId: 'new-antioch',
    category: 'Elite',
    baseCost: 80,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+1 DICE',
      armour: '-1',
      keywords: ['NEW ANTIOCH', 'NEGATE MINED', 'ELITE']
    },
    innateAbilities: [
      {
        id: 'fortify-action',
        name: 'Fortify ACTION',
        description: 'Take a Risky Success Roll; on Success or Critical Success, gains the COVER Keyword until they move.'
      }
    ],
    defaultWeapons: ['trench-shotgun', 'trench-club'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Sappers trained in trench construction, demolition charges, and barbed wire clearing.'
  },
  {
    id: 'na-mechanized-heavy-infantry',
    name: 'Mechanized Heavy Infantry',
    factionId: 'new-antioch',
    category: 'Elite',
    baseCost: 95,
    stats: {
      movement: '5"',
      ranged: '+1 DICE',
      melee: '+1 DICE',
      armour: '-3',
      keywords: ['NEW ANTIOCH', 'STRONG', 'ELITE', 'TOUGH']
    },
    innateAbilities: [
      {
        id: 'standfast',
        name: 'Standfast',
        description: 'When suffering a Down result on the Injury Table, it is treated as a Minor Hit result instead.'
      }
    ],
    defaultWeapons: ['heavy-shotgun'],
    defaultArmour: ['machine-armour'],
    lore: 'Ironclad juggernauts encased in motorized pneumatic plate armour.'
  },
  {
    id: 'na-shocktrooper',
    name: '0-5 Shock Troopers',
    factionId: 'new-antioch',
    category: 'Trooper',
    baseCost: 45,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+1 DICE',
      armour: '-1',
      keywords: ['NEW ANTIOCH']
    },
    innateAbilities: [
      {
        id: 'shock-charge',
        name: 'Shock Charge',
        description: 'When rolling the Charge Bonus, roll 1 extra D6 and use the single highest die to determine the bonus.'
      }
    ],
    defaultWeapons: ['bolt-action-rifle', 'bayonet'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Assault infantry armed with bayonets, grenades, and trench bludgeons.'
  },
  {
    id: 'na-yeoman',
    name: 'Yeomen',
    factionId: 'new-antioch',
    category: 'Trooper',
    baseCost: 30,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+0 DICE',
      armour: '-1',
      keywords: ['NEW ANTIOCH']
    },
    innateAbilities: [],
    defaultWeapons: ['bolt-action-rifle'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Standard frontline conscripts and volunteers defending the firing step.'
  },
  {
    id: 'na-trench-mole',
    name: 'Trench Mole (Upgraded Yeoman)',
    factionId: 'new-antioch',
    category: 'Trooper',
    baseCost: 40,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+0 DICE',
      armour: '-1',
      keywords: ['NEW ANTIOCH', 'INFILTRATOR']
    },
    innateAbilities: [],
    defaultWeapons: ['bolt-action-rifle', 'trench-knife'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Infiltrators who crawl through collapsed saps and drainage tunnels behind enemy lines.'
  },

  // -------------------------------------------------------------
  // TRENCH PILGRIMS PROFILES
  // -------------------------------------------------------------
  {
    id: 'tp-war-prophet',
    name: 'War Prophet',
    factionId: 'trench-pilgrims',
    category: 'Leader',
    baseCost: 80,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+2 DICE',
      armour: '-1',
      keywords: ['TRENCH PILGRIMS', 'LEADER', 'ZEALOT', 'TOUGH']
    },
    innateAbilities: [
      {
        id: 'prophetic-vision',
        name: 'Prophetic Vision',
        description: 'Friendly Pilgrim models within 8" may reroll 1 failed Success Roll per round.'
      }
    ],
    defaultWeapons: ['great-sword'],
    defaultArmour: ['penitent-rags'],
    lore: 'Holy mystic possessed by apocalyptic visions of the Archangels, guiding the faithful into the abyss.'
  },
  {
    id: 'tp-castigator',
    name: 'Castigator',
    factionId: 'trench-pilgrims',
    category: 'Elite',
    baseCost: 75,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+2 DICE',
      armour: '-1',
      keywords: ['TRENCH PILGRIMS', 'ELITE', 'ZEALOT']
    },
    innateAbilities: [
      {
        id: 'fury-of-penance',
        name: 'Fury of Penance',
        description: 'Gains +1 Melee DICE for every Blood Marker currently on this model.'
      }
    ],
    defaultWeapons: ['heavy-flail'],
    defaultArmour: ['penitent-rags'],
    lore: 'Disciplinarian whipping both themselves and their flock into a fever pitch of violence.'
  },
  {
    id: 'tp-communicant',
    name: 'Communicant',
    factionId: 'trench-pilgrims',
    category: 'Elite',
    baseCost: 90,
    stats: {
      movement: '5"',
      ranged: '-1 DICE',
      melee: '+3 DICE',
      armour: '-2',
      keywords: ['TRENCH PILGRIMS', 'ELITE', 'STRONG', 'TOUGH']
    },
    innateAbilities: [],
    defaultWeapons: ['great-hammer'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Giant mutated penitent fed holy transubstantiations, wielding church pillars and railway ties.'
  },
  {
    id: 'tp-anchorite',
    name: 'Anchorite Shrine',
    factionId: 'trench-pilgrims',
    category: 'Elite',
    baseCost: 120,
    stats: {
      movement: '4"',
      ranged: '+0 DICE',
      melee: '+2 DICE',
      armour: '-3',
      keywords: ['TRENCH PILGRIMS', 'ELITE', 'CONSTRUCT', 'TOUGH', 'MACHINE ARMOUR']
    },
    innateAbilities: [
      {
        id: 'walking-shrine',
        name: 'Walking Shrine',
        description: 'Allies within 3" gain the COVER Keyword and the NEGATE FEAR Keyword.'
      }
    ],
    defaultWeapons: ['heavy-flamethrower'],
    defaultArmour: ['machine-armour'],
    lore: 'A penitent hermit permanently entombed in an armored cast-iron cathedral chassis.'
  },
  {
    id: 'tp-penitent-trooper',
    name: 'Trench Pilgrims / The Faithful',
    factionId: 'trench-pilgrims',
    category: 'Trooper',
    baseCost: 25,
    stats: {
      movement: '6"',
      ranged: '-1 DICE',
      melee: '+1 DICE',
      armour: '+0',
      keywords: ['TRENCH PILGRIMS', 'ZEALOT']
    },
    innateAbilities: [],
    defaultWeapons: ['trench-club'],
    defaultArmour: ['penitent-rags'],
    lore: 'Devout zealots armed with agricultural tools, iron crosses, and stolen rifles.'
  },

  // -------------------------------------------------------------
  // THE SULTANATE OF THE IRON WALL PROFILES
  // -------------------------------------------------------------
  {
    id: 'is-jabirean-alchemist',
    name: 'Jabirean Alchemist / Yüzbaşı',
    factionId: 'iron-sultanate',
    category: 'Leader',
    baseCost: 85,
    stats: {
      movement: '6"',
      ranged: '+2 DICE',
      melee: '+1 DICE',
      armour: '-1',
      keywords: ['IRON SULTANATE', 'LEADER', 'ALCHEMIST', 'TOUGH']
    },
    innateAbilities: [
      {
        id: 'greek-fire-formula',
        name: 'Greek Fire Mastery',
        description: 'Once per round, adds the FIRE keyword to a ranged attack made by a friendly model within 6".'
      }
    ],
    defaultWeapons: ['alchemical-pistol', 'sword-axe'],
    defaultArmour: ['alchemist-armour'],
    lore: 'Scholars of the House of Wisdom wielding volatile mercury, distilled sulfur, and alchemical flame.'
  },
  {
    id: 'is-brazen-bull',
    name: 'Brazen Bull',
    factionId: 'iron-sultanate',
    category: 'Elite',
    baseCost: 115,
    stats: {
      movement: '5"',
      ranged: '+0 DICE',
      melee: '+3 DICE',
      armour: '-3',
      keywords: ['IRON SULTANATE', 'ELITE', 'CONSTRUCT', 'TOUGH', 'MACHINE ARMOUR']
    },
    innateAbilities: [
      {
        id: 'furnace-charge',
        name: 'Furnace Trample',
        description: 'Inflicts 1 automatic FIRE wound on any model contacted during a charge.'
      }
    ],
    defaultWeapons: ['heavy-flamethrower'],
    defaultArmour: ['machine-armour'],
    lore: 'Bronze mechanical behemoth powered by molten alchemical slag.'
  },
  {
    id: 'is-janissary',
    name: 'Janissary',
    factionId: 'iron-sultanate',
    category: 'Trooper',
    baseCost: 45,
    stats: {
      movement: '6"',
      ranged: '+1 DICE',
      melee: '+1 DICE',
      armour: '-2',
      keywords: ['IRON SULTANATE', 'DISCIPLINED']
    },
    innateAbilities: [],
    defaultWeapons: ['bolt-action-rifle', 'sword-axe'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Elite marksmen of the Sultan equipped with composite armor and precision rifles.'
  },
  {
    id: 'is-azab',
    name: 'Azab',
    factionId: 'iron-sultanate',
    category: 'Trooper',
    baseCost: 30,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+0 DICE',
      armour: '-1',
      keywords: ['IRON SULTANATE']
    },
    innateAbilities: [],
    defaultWeapons: ['bolt-action-rifle'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Levy infantry holding the battlements of the Iron Wall.'
  },

  // -------------------------------------------------------------
  // HERETIC LEGIONS PROFILES
  // -------------------------------------------------------------
  {
    id: 'hl-heretic-priest',
    name: 'Heretic Priest / Centurion',
    factionId: 'heretic-legions',
    category: 'Leader',
    baseCost: 85,
    stats: {
      movement: '6"',
      ranged: '+1 DICE',
      melee: '+2 DICE',
      armour: '-1',
      keywords: ['HERETIC LEGIONS', 'LEADER', 'INFERNAL', 'TOUGH']
    },
    innateAbilities: [
      {
        id: 'dark-prayer',
        name: 'Blasphemous Litany',
        description: 'Spend 1 Blood Marker from your pool to give 1 friendly model +1 DICE to all rolls for 1 round.'
      }
    ],
    defaultWeapons: ['demonic-blade', 'submachine-gun'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'An apostate officer bearing unholy glyphs etched directly into his armor and flesh.'
  },
  {
    id: 'hl-anointed',
    name: 'Anointed Heavy Infantry',
    factionId: 'heretic-legions',
    category: 'Elite',
    baseCost: 95,
    stats: {
      movement: '5"',
      ranged: '+1 DICE',
      melee: '+2 DICE',
      armour: '-3',
      keywords: ['HERETIC LEGIONS', 'ELITE', 'STRONG', 'TOUGH']
    },
    innateAbilities: [],
    defaultWeapons: ['great-sword'],
    defaultArmour: ['machine-armour'],
    lore: 'Demonic heavy shock troops encased in spiked iron plate and consecrated in brimstone.'
  },
  {
    id: 'hl-trooper',
    name: 'Heretic Legionnaire',
    factionId: 'heretic-legions',
    category: 'Trooper',
    baseCost: 35,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+1 DICE',
      armour: '-1',
      keywords: ['HERETIC LEGIONS']
    },
    innateAbilities: [],
    defaultWeapons: ['bolt-action-rifle', 'bayonet'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Traitor legionnaires equipped with scavenged military gear and hell-forged munitions.'
  },
  {
    id: 'hl-wretched',
    name: 'Wretched',
    factionId: 'heretic-legions',
    category: 'Trooper',
    baseCost: 20,
    stats: {
      movement: '6"',
      ranged: '-1 DICE',
      melee: '+0 DICE',
      armour: '+0',
      keywords: ['HERETIC LEGIONS', 'FODDER']
    },
    innateAbilities: [],
    defaultWeapons: ['trench-knife'],
    defaultArmour: ['penitent-rags'],
    lore: 'Mutated sacrificial thralls thrown forward to trigger enemy mines and absorb machine gun fire.'
  },

  // -------------------------------------------------------------
  // MERCENARIES & SPECIALISTS
  // -------------------------------------------------------------
  {
    id: 'merc-trench-dog',
    name: 'Trench Dog',
    factionId: 'mercenaries',
    category: 'Mercenary',
    baseCost: 20,
    stats: {
      movement: '8"',
      ranged: '- DICE',
      melee: '+1 DICE',
      armour: '+0',
      keywords: ['MERCENARY', 'BEAST', 'FAST']
    },
    innateAbilities: [
      {
        id: 'ferocious-bite',
        name: 'Barbed Wire Runner',
        description: 'Ignores movement penalties from Barbed Wire and Dangerous Terrain.'
      }
    ],
    defaultWeapons: ['combat-knife'],
    defaultArmour: ['penitent-rags'],
    lore: 'Armoured war hound trained to run through gas clouds and take down snipers in the mud.'
  },
  {
    id: 'merc-sin-eater',
    name: 'Sin Eater',
    factionId: 'mercenaries',
    category: 'Mercenary',
    baseCost: 75,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+2 DICE',
      armour: '-1',
      keywords: ['MERCENARY', 'ELITE', 'TOUGH']
    },
    innateAbilities: [
      {
        id: 'absorb-sin',
        name: 'Absorb Suffering',
        description: 'Can absorb Blood Markers from adjacent friendly models to heal itself.'
      }
    ],
    defaultWeapons: ['great-sword'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'A wanderer who consumes the spiritual corruption and physical agony of dying soldiers.'
  }
];

// Official Trench Crusade Weapons & Costs
export const BASE_WEAPONS: WeaponProfile[] = [
  // Melee Weapons
  {
    id: 'trench-knife',
    name: 'Trench Knife',
    type: 'Melee',
    hands: 1,
    range: 'Melee (1")',
    modifiers: '+0 DICE',
    damage: 'Standard',
    cost: 1,
    keywords: ['Fast Strike'],
    description: 'Standard issue steel dagger for trench raids and close-quarters fighting.'
  },
  {
    id: 'bayonet',
    name: 'Bayonet',
    type: 'Melee',
    hands: 1,
    range: 'Melee (1")',
    modifiers: '+0 DICE (+1 on Charge)',
    damage: 'Standard',
    cost: 2,
    keywords: ['Bayonet', 'Shield Combo'],
    description: 'Affixed steel spearhead turning standard bolt-action rifles into lethal thrusting pikes.'
  },
  {
    id: 'trench-club',
    name: 'Trench Club',
    type: 'Melee',
    hands: 1,
    range: 'Melee (1")',
    modifiers: '+0 DICE',
    damage: 'Heavy',
    cost: 3,
    keywords: ['Concussive'],
    description: 'Lead-weighted bludgeon with barbed wire wrapped around the head.'
  },
  {
    id: 'sword-axe',
    name: 'Sword / Axe',
    type: 'Melee',
    hands: 1,
    range: 'Melee (1")',
    modifiers: '+1 DICE',
    damage: 'Standard',
    cost: 4,
    keywords: ['Slashing'],
    description: 'Reliable steel blade or hatchet.'
  },
  {
    id: 'polearm',
    name: 'Polearm',
    type: 'Melee',
    hands: 2,
    range: 'Melee (2")',
    modifiers: '+1 DICE',
    damage: 'Standard',
    cost: 7,
    keywords: ['Reach (2")', 'Shield Combo'],
    description: 'Halberd or billhook allowing melee attacks from behind the front rank.'
  },
  {
    id: 'great-hammer',
    name: 'Great Hammer / Maul',
    type: 'Melee',
    hands: 2,
    range: 'Melee (1")',
    modifiers: '+1 DICE',
    damage: 'Severe (D3)',
    cost: 10,
    keywords: ['Heavy', 'Concussive', 'Armour Piercing (1)'],
    description: 'Two-handed sledgehammer that crushes plate armour.'
  },
  {
    id: 'great-sword',
    name: 'Great Sword / Great Axe',
    type: 'Melee',
    hands: 2,
    range: 'Melee (1")',
    modifiers: '+2 DICE',
    damage: 'Severe (D3)',
    cost: 12,
    keywords: ['Heavy', 'Slashing'],
    description: 'Zweihander or executioner axe swung with two hands.'
  },
  {
    id: 'heavy-flail',
    name: 'Flagellant Iron Flail',
    type: 'Melee',
    hands: 2,
    range: 'Melee (2")',
    modifiers: '+2 DICE',
    damage: 'Heavy',
    cost: 15,
    keywords: ['Concussive', 'Heavy'],
    description: 'Heavy spiked iron chains swung with religious ecstasy.'
  },
  {
    id: 'misericordia',
    name: 'Misericordia',
    type: 'Melee',
    hands: 1,
    range: 'Melee (1")',
    modifiers: '+1 DICE',
    damage: 'Lethal',
    cost: 15,
    keywords: ['Combat Medic Only', 'Finish the Fallen'],
    description: 'Slender stiletto designed to slide through visor slits of downed opponents.'
  },
  {
    id: 'demonic-blade',
    name: 'Hell-Forged Falchion',
    type: 'Melee',
    hands: 1,
    range: 'Melee (1")',
    modifiers: '+2 DICE',
    damage: 'Lethal',
    cost: 25,
    keywords: ['Armour Piercing (1)', 'Fire'],
    description: 'Obsidian blade burning with sulfur that cuts through reinforced steel breastplates.'
  },

  // Ranged Weapons
  {
    id: 'pistol',
    name: 'Pistol / Revolver',
    type: 'Ranged',
    hands: 1,
    range: '12"',
    modifiers: '+0 DICE',
    damage: 'Standard',
    cost: 6,
    keywords: ['Assault', 'Sidearm'],
    description: 'Standard military revolver.'
  },
  {
    id: 'automatic-pistol',
    name: 'Automatic Pistol',
    type: 'Ranged',
    hands: 1,
    range: '12"',
    modifiers: '+1 DICE',
    damage: 'Standard',
    cost: 20,
    keywords: ['Assault', 'Rapid Fire', 'Elite Only'],
    description: 'High rate of fire automatic sidearm.'
  },
  {
    id: 'bolt-action-rifle',
    name: 'Bolt-Action Service Rifle',
    type: 'Ranged',
    hands: 2,
    range: '24"',
    modifiers: '+0 DICE',
    damage: 'Standard',
    cost: 10,
    keywords: ['Bayonet Lug'],
    description: 'Standard infantry bolt-action service rifle.'
  },
  {
    id: 'shotgun',
    name: 'Shotgun',
    type: 'Ranged',
    hands: 2,
    range: '12"',
    modifiers: '+1 Hit at Point-Blank (≤6")',
    damage: 'Standard',
    cost: 10,
    keywords: ['Bayonet Lug', 'Shield Combo'],
    description: 'Trench shotgun loaded with lead buckshot.'
  },
  {
    id: 'semi-automatic-rifle',
    name: 'Semi-Automatic Rifle',
    type: 'Ranged',
    hands: 2,
    range: '24"',
    modifiers: '+0 DICE',
    damage: 'Standard',
    cost: 15,
    keywords: ['Bayonet Lug', 'Assault'],
    description: 'Gas-operated self-loading rifle.'
  },
  {
    id: 'automatic-shotgun',
    name: 'Automatic Shotgun',
    type: 'Ranged',
    hands: 2,
    range: '12"',
    modifiers: '+1 DICE at Point-Blank (≤6")',
    damage: 'Heavy',
    cost: 15,
    keywords: ['Bayonet Lug', 'Shield Combo', 'Assault'],
    description: 'Drum-fed automatic shotgun.'
  },
  {
    id: 'heavy-shotgun',
    name: 'Heavy Shotgun',
    type: 'Ranged',
    hands: 2,
    range: '12"',
    modifiers: '+1 DICE',
    damage: 'Heavy (D3)',
    cost: 20,
    keywords: ['Shield Combo', 'Shrapnel'],
    description: 'Large-bore shotgun firing explosive slugs.'
  },
  {
    id: 'submachine-gun',
    name: 'Submachine Gun',
    type: 'Ranged',
    hands: 2,
    range: '12"',
    modifiers: '+0 DICE',
    damage: 'Standard',
    cost: 30,
    keywords: ['Assault', 'Bayonet Lug', 'Shield Combo', 'Limit: 2'],
    description: 'High rate-of-fire submachine gun for close quarters.'
  },
  {
    id: 'flamethrower',
    name: 'Flamethrower',
    type: 'Ranged',
    hands: 2,
    range: '8" (Template)',
    modifiers: '+0 DICE (Hits All in Path)',
    damage: 'Fire',
    cost: 30,
    keywords: ['Fire', 'Blast (2")', 'Limit: 3'],
    description: 'Liquid fuel flamethrower igniting trenches in fire.'
  },
  {
    id: 'heavy-flamethrower',
    name: 'Heavy Flamethrower',
    type: 'Ranged',
    hands: 2,
    range: '10" (Template)',
    modifiers: '+0 DICE',
    damage: 'Fire (D3)',
    cost: 55,
    keywords: ['Fire', 'Blast (3")', 'Heavy', 'Limit: 1'],
    description: 'Backpack fuel tank spewing relentless streams of Greek fire.'
  },
  {
    id: 'sniper-rifle',
    name: 'Sniper Rifle',
    type: 'Ranged',
    hands: 2,
    range: '36"',
    modifiers: '+1 DICE (+2 if stationary)',
    damage: 'Lethal',
    cost: 35,
    keywords: ['Precision', 'Heavy', 'Armour Piercing (1)', 'Limit: 3'],
    description: 'Long-range match rifle with optical scope.'
  },
  {
    id: 'automatic-rifle',
    name: 'Automatic Rifle',
    type: 'Ranged',
    hands: 2,
    range: '24"',
    modifiers: '+1 DICE',
    damage: 'Standard',
    cost: 40,
    keywords: ['Bayonet Lug', 'Limit: 1', 'Assault'],
    description: 'Magazine-fed squad automatic rifle.'
  },
  {
    id: 'machine-gun',
    name: 'Machine Gun',
    type: 'Ranged',
    hands: 2,
    range: '36"',
    modifiers: '+1 DICE',
    damage: 'Heavy',
    cost: 50,
    keywords: ['Heavy', 'Suppressive Fire', 'Limit: 2'],
    description: 'Belt-fed heavy machine gun deployed on a bipod or tripod.'
  },
  {
    id: 'grenade-launcher',
    name: 'Grenade Launcher',
    type: 'Ranged',
    hands: 2,
    range: '24"',
    modifiers: '+0 DICE',
    damage: 'Blast',
    cost: 30,
    keywords: ['Blast (2")', 'Heavy', 'Limit: 2'],
    description: 'Cup launcher lobbing explosive canisters.'
  },
  {
    id: 'frag-grenade',
    name: 'Frag Grenades',
    type: 'Ranged',
    hands: 1,
    range: '8"',
    modifiers: '+0 DICE',
    damage: 'Blast',
    cost: 7,
    keywords: ['Blast (2")', 'Shrapnel'],
    description: 'Cast iron fragmentation stick grenades.'
  },
  {
    id: 'incendiary-grenade',
    name: 'Incendiary Grenades',
    type: 'Ranged',
    hands: 1,
    range: '8"',
    modifiers: '+0 DICE',
    damage: 'Fire',
    cost: 15,
    keywords: ['Blast (2")', 'Fire', 'Limit: 2'],
    description: 'Phosphorus and chemical firebombs.'
  },
  {
    id: 'satchel-charge',
    name: 'Satchel Charge',
    type: 'Ranged',
    hands: 1,
    range: '4"',
    modifiers: '+0 DICE',
    damage: 'Severe (D3+1)',
    cost: 15,
    keywords: ['Blast (3")', 'Consumable', 'Limit: 3 (1 per model)'],
    description: 'Heavy bag of high explosives for breaching bunkers and fortifications.'
  }
];

// Official Trench Crusade Armour & Modifiers
export const BASE_ARMOUR: ArmourProfile[] = [
  {
    id: 'standard-trench-armour',
    name: 'Standard Armour',
    armourModifier: '-1 Injury Modifier',
    cost: 0,
    keywords: ['Standard Protection'],
    description: 'Steel cuirass and helmet reducing injury rolls by 1.'
  },
  {
    id: 'reinforced-armour',
    name: 'Reinforced Heavy Armour',
    armourModifier: '-2 Injury Modifier',
    cost: 20,
    keywords: ['Heavy Armour'],
    description: 'Heavy steel breastplate and limb guards reducing injury rolls by 2.'
  },
  {
    id: 'machine-armour',
    name: 'Machine Armour',
    armourModifier: '-3 Injury Modifier',
    cost: 95,
    keywords: ['Machine Armour', 'Bulky (40mm Base)', 'Standfast'],
    description: 'Pneumatically assisted armored exoskeleton with a -3 Injury Modifier. When suffering a Down result, it is treated as a Minor Hit instead.'
  },
  {
    id: 'alchemist-armour',
    name: 'Alchemist Sealed Hazard Armour',
    armourModifier: '-1 Injury Modifier',
    cost: 25,
    keywords: ['Negate Gas', 'Negate Fire'],
    description: 'Hermetically sealed brass and vulcanized rubber suit immune to chemical gas and fire.'
  },
  {
    id: 'trench-shield',
    name: 'Trench Shield',
    armourModifier: '-1 Injury Modifier (Cover Bonus in Front Arc)',
    cost: 10,
    keywords: ['Shield', 'Cover Bonus'],
    description: 'Mobile steel ballistic shield providing frontal cover against ranged fire.'
  },
  {
    id: 'penitent-rags',
    name: 'Penitent Rags / Unarmoured',
    armourModifier: '+0',
    cost: 0,
    keywords: ['Unarmoured'],
    description: 'Sackcloth and burlap offering zero ballistic protection.'
  }
];

// Official Trench Crusade Equipment & Glory Items
export const BASE_EQUIPMENT: EquipmentItem[] = [
  {
    id: 'gas-mask',
    name: 'Gas Mask',
    cost: 5,
    effect: 'Immunity to the GAS keyword and toxic smoke clouds.',
    keywords: ['Gas Protection'],
    description: 'Respirator mask with activated charcoal filter.'
  },
  {
    id: 'medi-kit',
    name: 'Medi-kit',
    cost: 5,
    effect: 'Allows a model to carry out Treat ACTION on Downed allies.',
    keywords: ['Medical'],
    description: 'Tourniquets, coagulant powders, and bone needles.'
  },
  {
    id: 'combat-helmet',
    name: 'Combat Helmet',
    cost: 5,
    effect: 'Rerolls 1 failed Armour check against Shrapnel or Grenades per battle.',
    keywords: ['Headgear'],
    description: 'Hardened steel trench helmet.'
  },
  {
    id: 'shovel',
    name: 'Trench Shovel / Entrenching Tool',
    cost: 5,
    effect: 'Can be used to dig hasty foxholes or used as a melee weapon (+0 DICE).',
    keywords: ['Utility', 'Melee'],
    description: 'Sharpened folding entrenching spade.'
  },
  {
    id: 'mountaineer-kit',
    name: 'Mountaineer Kit',
    cost: 3,
    effect: 'Allows climbing vertical terrain without rolling difficult terrain tests. Limit: 4.',
    keywords: ['Movement', 'Limit: 4'],
    description: 'Ropes, pitons, and grappling iron.'
  },
  {
    id: 'binoculars',
    name: 'Binoculars',
    cost: 10,
    effect: 'Grants +2" maximum range to all friendly Ranged Attacks targeting models spotted by the user. ELITE only.',
    keywords: ['Optics', 'ELITE only'],
    description: 'High-magnification prismatic field glasses.'
  },
  {
    id: 'musical-instrument',
    name: 'Musical Instrument (War Horn / Bugle)',
    cost: 15,
    effect: 'Once per round, allow 1 friendly unit within 12" to charge an additional +2". Limit: 1.',
    keywords: ['Morale', 'Limit: 1'],
    description: 'Brass clarion or trench bugle rallying the assault.'
  },
  {
    id: 'holy-relic',
    name: 'Saint Bone Reliquary',
    cost: 20,
    effect: 'Reroll 1 failed Success Roll per battle.',
    keywords: ['Holy Relic', 'Faithful'],
    description: 'A consecrated silver reliquary containing saintly relics.'
  }
];

// Official Trench Crusade Rules & Keywords
export const KEYWORDS: RuleKeyword[] = [
  {
    name: 'Blood Markers',
    category: 'Condition',
    summary: 'Accumulated wounds and shock that enhance enemy Injury Rolls or fuel special abilities.',
    fullText: 'A model can have up to 6 Blood Markers at any time. When making an Injury Roll against an enemy, the attacker may spend Blood Markers to add +1 Injury DICE (roll extra die and pick highest 2) per marker spent. An attacker can spend 6 Blood Markers (or 3 if target is Down) to trigger a Bloodbath Roll (roll 3D6 and sum all 3 dice together). A player may also spend their own model\\'s Blood Markers to impose -1 DICE on enemy attacks against it.'
  },
  {
    name: 'Fire',
    category: 'Weapon',
    summary: 'Incendiary damage that inflicts extra Blood Markers after the attack.',
    fullText: 'Weapons with the FIRE keyword inflict +1 additional Blood Marker on the target if the attack is a Success (7-11) or Critical Success (12), applied after the Injury Roll is resolved (regardless of whether the Injury Roll caused damage). Models with the Negate Fire trait ignore this effect.'
  },
  {
    name: 'Gas',
    category: 'Weapon',
    summary: 'Corrosive chemical agents that bypass standard armour.',
    fullText: 'Attacks with the GAS keyword bypass all non-alchemical Armour modifiers. A successful attack adds +1 Blood Marker on the target. Models wearing Gas Masks or sealed Alchemist Armour are immune.'
  },
  {
    name: 'Shrapnel',
    category: 'Weapon',
    summary: 'Bursting steel fragments that punish models caught in the open.',
    fullText: 'If the target of a SHRAPNEL attack is in Open Ground (not benefiting from Cover), the attack gains +1 Injury DICE (roll an extra die and pick the two highest).'
  },
  {
    name: 'Assault',
    category: 'Weapon',
    summary: 'Allows shooting without preventing charges or close combat in the same turn.',
    fullText: 'A model firing an ASSAULT weapon may still make a Charge or Melee Attack during the same activation.'
  },
  {
    name: 'Heavy',
    category: 'Weapon',
    summary: 'Cumbersome weaponry that cannot be fired on the run.',
    fullText: 'A model cannot fire a HEAVY weapon in the same activation that it performed a Dash action unless specifically braced or permitted by unit rules.'
  },
  {
    name: 'Blast (X")',
    category: 'Weapon',
    summary: 'Area-of-effect explosion hitting all models within the radius.',
    fullText: 'Place the template or measure X" from the target point; all models within the blast radius are hit and must suffer individual Injury Rolls.'
  },
  {
    name: 'Armour Piercing (X)',
    category: 'Weapon',
    summary: "Reduces the target's Armour rating by X.",
    fullText: "Subtracts X from the target's Armour modifier when making the Injury Roll (e.g. Armour Piercing 1 reduces a -2 Armour modifier to -1)."
  },
  {
    name: 'Tough',
    category: 'General',
    summary: 'Exceptional resilience against fatal strikes.',
    fullText: 'The first time a model with Tough suffers an "Out of Action" result on the Injury Table, it is treated as DOWN instead.'
  },
  {
    name: 'Down',
    category: 'Condition',
    summary: 'Knocked to the ground crawling; receives 1 Blood Marker.',
    fullText: 'A DOWN model is laid on its side and receives 1 Blood Marker. It cannot shoot or charge, and can only crawl up to 2" per movement action. Enemies attacking a Down model in melee add +1 Injury DICE.'
  },
  {
    name: 'Out of Action',
    category: 'Condition',
    summary: 'The model has been killed or incapacitated and is removed from the battlefield.',
    fullText: 'The model is removed from play. In campaign play, roll on the D66 Post-Battle Casualty Table after the game.'
  },
  {
    name: 'Success Roll (2D6)',
    category: 'General',
    summary: 'Standard 2D6 Action, Ranged, Melee, and Morale test mechanic.',
    fullText: 'Roll 2D6 + Modifiers. 2-6 = Failure; 7-11 = Success; 12 = Critical Success; Natural 2 (Snake Eyes) = Critical Failure / Mishap.'
  },
  {
    name: 'Injury Table (2D6)',
    category: 'General',
    summary: 'Standard 2D6 table to resolve damage against wounded models.',
    fullText: 'Roll 2D6 applying Injury Dice and Modifiers (max penalty -3). 1 or less = No Effect; 2-6 = Flesh Wound (+1 Blood Marker); 7-8 = 1 Blood Marker; 9-11 = DOWN (+1 Blood Marker); 12+ = OUT OF ACTION.'
  },
  {
    name: 'Machine Armour',
    category: 'General',
    summary: 'Motorized pneumatic plate with -3 modifier that ignores Down results.',
    fullText: 'Provides a -3 Injury Modifier. A model with Machine Armour increases its base size to 40mm. When it suffers a Down result on the Injury Table, it is treated as a Minor Hit result instead.'
  },
  {
    name: 'Negate Fear',
    category: 'General',
    summary: 'Immunity to morale shock and demonic terror.',
    fullText: 'The model automatically passes all Morale and Fear tests caused by enemy keywords or horrific encounters.'
  },
  {
    name: 'Infiltrator',
    category: 'General',
    summary: "Can deploy forward in No Man's Land.",
    fullText: 'May be set up anywhere on the battlefield that is more than 12" away from any enemy deployment zone and outside Line of Sight of enemy models.'
  }
];

export const INJURY_TABLE_D66: InjuryResult[] = [
  {
    roll: '11-16',
    title: 'Killed in Action (Dead)',
    effect: 'The warrior succumbs to their wounds in No Man\'s Land. Remove model permanently from the warband roster.',
    isDead: true
  },
  {
    roll: '21-25',
    title: 'Grievous Wound / Severed Limb',
    effect: 'Permanent severe injury. Suffer -1" Movement permanently, but gains +1 XP for surviving against all odds.',
    statModifier: { movement: '5"' }
  },
  {
    roll: '26-32',
    title: 'Lost Eye / Blasted Sight',
    effect: 'One eye blinded by shrapnel. Suffer -1 Ranged permanently.',
    statModifier: { ranged: '-1' }
  },
  {
    roll: '33-41',
    title: 'Cracked Skull & Shellshock',
    effect: 'Suffers recurring tremors. Must pass a Morale test at the start of every game or start with 1 Blood Marker.',
  },
  {
    roll: '42-53',
    title: 'Deep Scars & Hardened',
    effect: 'Horrific scarring that intimidates foes. Gains the Fear special keyword in melee combat!',
  },
  {
    roll: '54-66',
    title: 'Flesh Wound / Full Recovery',
    effect: 'The warrior makes a full recovery with no lasting negative penalties and is ready for the next battle.',
  }
];

export const EXPLORATION_TABLE_D66 = [
  {
    roll: '11-16',
    title: 'Muddy Crater & Shell Hole',
    reward: 'D6 Ducats',
    description: 'Only rusted shell casings and scavenged scrap found in the crater.'
  },
  {
    roll: '21-26',
    title: 'Abandoned Trench Ammo Cache',
    reward: '2D6+10 Ducats + 1 Frag Grenade',
    description: 'An unopened crate of munitions left behind by retreating shock troops.'
  },
  {
    roll: '31-42',
    title: 'Shattered Shrine Reliquary',
    reward: '3D6+15 Ducats + 1 Holy Relic (or Demonic Idol)',
    description: 'Gold chalices and blessed icons salvaged from the rubbled chapel.'
  },
  {
    roll: '43-54',
    title: 'Dead Officer\'s Satchel',
    reward: '4D6+20 Ducats + Secret Trench Map (Reroll 1 scenario deployment in next match)',
    description: 'Intelligence documents, gold signet rings, and tactical maps.'
  },
  {
    roll: '55-66',
    title: 'Archeotech Weapon Vault',
    reward: '50 Ducats + Choice of 1 Rare Heavy Weapon or Reinforced Armour',
    description: 'An intact pre-apocalypse bunker sealed beneath the reinforced concrete.'
  }
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'trench-raid',
    name: 'Scenario 1: Trench Night Raid',
    flavor: 'Under cover of toxic fog and darkness, a strike team crosses No Man\'s Land to assault enemy command dugouts.',
    deployment: 'Opposing edges, 18" apart with barbed wire and shell holes filling the center.',
    objectives: [
      'Capture and hold the enemy communication bunker (3 Glory)',
      'Assassinate the enemy Leader (2 Glory)',
      'Inflict more casualties than sustained (1 Glory)'
    ],
    specialRules: [
      'Night Fighting: Maximum visibility is 16" unless flares are launched.',
      'Toxic Fog: Units not wearing Gas Masks roll a D6 when entering craters.'
    ],
    victoryConditions: 'Warband with the highest Glory points after 5 turns claims the trench section.'
  },
  {
    id: 'sacred-relic',
    name: 'Scenario 2: The Martyr\'s Relic',
    flavor: 'A downed zeppelin carrying the mummified hand of a Saint has crashed in the center of the battlefield.',
    deployment: 'Standard deployment 24" apart with the Relic Objective marker dead center.',
    objectives: [
      'Extract the Relic off your home board edge (4 Glory + 30 Ducats)',
      'Eliminate all opposing Elites (2 Glory)'
    ],
    specialRules: [
      'Heavy Relic: The carrier cannot run and has -2" movement while carrying the relic.'
    ],
    victoryConditions: 'First player to extract the relic or hold it uncontested on turn 6.'
  },
  {
    id: 'no-mans-land-clash',
    name: 'Scenario 3: Blood in No Man\'s Land',
    flavor: 'Two opposing patrols collide head-on amidst craters, barbed wire, and artillery craters.',
    deployment: 'Diagonal corners, 12" deployment zones.',
    objectives: [
      'Control 3 out of 5 neutral Crater Control Nodes (1 Glory per node held at game end)',
      'First Blood: Score the first kill of the game (1 Glory)'
    ],
    specialRules: [
      'Artillery Barrage: At the end of each round, a random crater is struck by shellfire.'
    ],
    victoryConditions: 'Most Victory Points at the end of Turn 4.'
  }
];
`;

fs.writeFileSync('src/data/defaultRules.ts', fullTsContent);
console.log('Successfully wrote exact official Trench Crusade data to src/data/defaultRules.ts');
