import { Faction, UnitProfile, WeaponProfile, ArmourProfile, EquipmentItem, RuleKeyword, InjuryResult, Scenario } from '../types/rules';

export const FACTIONS: Faction[] = [
  {
    id: 'new-antioch',
    name: 'Principality of New Antioch',
    tagline: 'Disciplined Christian crusaders, shock troops, and motorized mechanized knights.',
    description: 'The premier human bastion standing against the demonic breach, deploying disciplined fireteams, mechanized exoskeletons, and combat chaplains.',
    icon: 'Cross',
    color: '#D4AF37',
    specialRules: [
      {
        name: 'Strict Discipline',
        description: 'Once per round, one Trooper within 6" of a Lieutenant or Chaplain may re-roll a failed Morale or Action test.'
      },
      {
        name: 'Combined Arms Doctrine',
        description: 'Ranged units gain +1 to hit targets engaged in melee if an ally is currently pinning them.'
      }
    ]
  },
  {
    id: 'trench-pilgrims',
    name: 'Trench Pilgrims',
    tagline: 'Zealots, martyrs, flagellants, and the holy Ecclesiarchy.',
    description: 'Religious fanatics who throw themselves into the barbed wire singing hymns, led by Castigators and accompanied by Anchorites sealed in walking iron shrines.',
    icon: 'Flame',
    color: '#E65100',
    specialRules: [
      {
        name: 'Martyr\'s Ecstasy',
        description: 'When a friendly unit is killed within 8", nearby Pilgrims gain +1 Melee on their next charge.'
      },
      {
        name: 'Righteous Fury',
        description: 'Pilgrims are immune to Fear checks caused by Heretic or Demonic models.'
      }
    ]
  },
  {
    id: 'iron-sultanate',
    name: 'Iron Sultanate',
    tagline: 'Alchemical marksmen, Brazen Bulls, and Janissaries defending the Great Wall.',
    description: 'Defenders of the Levant utilizing advanced alchemy, Greek fire, and bio-alchemical constructs to defend the Dar al-Islam against hellish hordes.',
    icon: 'Shield',
    color: '#00897B',
    specialRules: [
      {
        name: 'Alchemical Munitions',
        description: 'Ranged weapons ignore the first point of enemy Cover armor bonuses.'
      },
      {
        name: 'Brazen Fortitude',
        description: 'Janissary heavy units reduce all received Injury rolls by 1 (to a minimum of 1).'
      }
    ]
  },
  {
    id: 'heretic-legion',
    name: 'Heretic Legion',
    tagline: 'Damned renegades, Hell-knights, and blood sacrifices.',
    description: 'Traitorous soldiers who have embraced the powers of Hell, wielding demonic weaponry, corrupted icons, and dark sorceries.',
    icon: 'Skull',
    color: '#B71C1C',
    specialRules: [
      {
        name: 'Blood for the Pit',
        description: 'Each enemy taken Out of Action adds 1 Blood Token directly to the Warband Pool for summoning rituals or dark boons.'
      },
      {
        name: 'Terror of the Damned',
        description: 'Charging Heretic Elites cause Fear checks on enemy defenders.'
      }
    ]
  },
  {
    id: 'black-grail',
    name: 'The Black Grail',
    tagline: 'Plague heralds, rotting abominations, and filth chanters.',
    description: 'Vessels of the Lord of Pestilence, covered in weeping sores and carrying the diseased ichor of the Black Grail.',
    icon: 'Biohazard',
    color: '#33691E',
    specialRules: [
      {
        name: 'Foul Contagion',
        description: 'Any model striking a Black Grail unit in melee and rolling a 1 on their attack roll suffers 1 automatic Poison wound.'
      }
    ]
  },
  {
    id: 'court-seven-serpents',
    name: 'Court of the Seven-Headed Serpent',
    tagline: 'Aristocratic infernal diplomats, sorcerers, and flesh-sculptors.',
    description: 'Decadent diabolists bargaining with serpentine arch-devils for psychic potency and immortal splendor.',
    icon: 'Crown',
    color: '#4A148C',
    specialRules: [
      {
        name: 'Mesmerizing Glamour',
        description: 'Enemies shooting at the Sorcerer beyond 12" suffer a -1 penalty to Ranged rolls.'
      }
    ]
  },
  {
    id: 'mercenaries',
    name: 'Mercenaries & Freeblades',
    tagline: 'Hired guns, assassins, witch hunters, and outlaws.',
    description: 'Independent guns-for-hire who will fight for whichever faction can pay their steep Ducat fees.',
    icon: 'Coins',
    color: '#78909C',
    specialRules: [
      {
        name: 'Unsavory Loyalty',
        description: 'Mercenaries do not count toward faction-specific rule benefits but do not suffer morale drops when friendly grunts fall.'
      }
    ]
  }
];

export const BASE_WEAPONS: WeaponProfile[] = [
  // Melee Weapons
  {
    id: 'trench-knife',
    name: 'Trench Knife & Bayonet',
    type: 'Melee',
    range: 'Melee',
    modifiers: '+0',
    damage: 'Standard (1 Wound)',
    keywords: ['Light', 'Quick'],
    cost: 5,
    description: 'Standard issue stabbing blade with knuckle guard for brutal close-quarters combat.',
    hands: 1
  },
  {
    id: 'trench-club',
    name: 'Trench Mace / Club',
    type: 'Melee',
    range: 'Melee',
    modifiers: '+1 Melee vs Armoured',
    damage: 'Standard (1 Wound)',
    keywords: ['Concussive', 'Blunt'],
    cost: 8,
    description: 'Spiked lead-weighted club designed to crack open iron helmets.',
    hands: 1
  },
  {
    id: 'chainsword-crusader',
    name: 'Sanctified Greatsword',
    type: 'Melee',
    range: 'Melee',
    modifiers: '+2 Melee',
    damage: 'Heavy (D3 Wounds)',
    keywords: ['Two-Handed', 'Armour Piercing -1', 'Sacred'],
    cost: 25,
    description: 'Massive double-handed relic blade inscribed with prayers of exorcism.',
    hands: 2
  },
  {
    id: 'heretic-flail',
    name: 'Spiked Hell Flail',
    type: 'Melee',
    range: 'Melee',
    modifiers: '+1 Melee',
    damage: 'Standard (1 Wound)',
    keywords: ['Shield Bypass', 'Vicious'],
    cost: 15,
    description: 'A barbed flail that hooks around trench shields and tearing flesh.',
    hands: 1
  },

  // Ranged Weapons
  {
    id: 'service-rifle',
    name: 'Standard Issue Bolt-Action Rifle',
    type: 'Ranged',
    range: '24"',
    modifiers: '+0',
    damage: 'Standard (1 Wound)',
    keywords: ['Reliable', 'Bayonet Lug'],
    cost: 15,
    description: 'Accurate and rugged rifle capable of picking off targets across muddy craters.',
    hands: 2
  },
  {
    id: 'trench-shotgun',
    name: 'Trench Sweeper Shotgun',
    type: 'Ranged',
    range: '12"',
    modifiers: '+1 at 6"',
    damage: 'Heavy at Point-Blank',
    keywords: ['Spread', 'Assault', 'Devastating Close'],
    cost: 20,
    description: 'Devastating pump-action shotgun for clearing dugouts and bunkers.',
    hands: 2
  },
  {
    id: 'submachine-gun',
    name: 'Submachine Gun (SMG)',
    type: 'Ranged',
    range: '16"',
    modifiers: '+0',
    damage: 'Rapid Fire',
    keywords: ['Burst (2)', 'Assault'],
    cost: 22,
    description: 'High rate of fire weapon ideal for charging assault troops.',
    hands: 2
  },
  {
    id: 'heavy-machine-gun',
    name: 'Heavy Water-Cooled Machine Gun',
    type: 'Ranged',
    range: '36"',
    modifiers: '+1 Ranged',
    damage: 'Heavy (D3 Wounds)',
    keywords: ['Heavy (Must Station)', 'Burst (3)', 'Suppressive Fire', 'Armour Piercing -1'],
    cost: 50,
    description: 'Terrifying tripod-mounted suppressive gun that halts infantry charges cold.',
    hands: 2
  },
  {
    id: 'holy-flamethrower',
    name: 'Holy Alchemical Flamethrower',
    type: 'Ranged',
    range: '8" Cone / Template',
    modifiers: 'Auto-hit',
    damage: 'Fire (D3 + Continuous)',
    keywords: ['Fire', 'Template', 'Ignores Cover', 'Volatile'],
    cost: 45,
    description: 'Sprays pressurized sanctified fuel that ignites on contact with demonic flesh.',
    hands: 2
  },
  {
    id: 'sniper-rifle',
    name: 'Scoped Anti-Material Sniper Rifle',
    type: 'Ranged',
    range: '40"',
    modifiers: '+2 Ranged (if stationary)',
    damage: 'Fatal / Critical D3+1',
    keywords: ['Precision', 'Armour Piercing -2', 'Heavy'],
    cost: 40,
    description: 'High-caliber rifle equipped with a telescopic optical sight for decapitating officers.',
    hands: 2
  }
];

export const BASE_ARMOUR: ArmourProfile[] = [
  {
    id: 'standard-trench-armour',
    name: 'Standard Infantry Breastplate & Stahlhelm',
    armourModifier: '+1 Armour',
    cost: 10,
    keywords: ['Basic Protection'],
    description: 'Steel plates covering vital organs and head against shrapnel.'
  },
  {
    id: 'heavy-crusader-plate',
    name: 'Reinforced Crusader Plate',
    armourModifier: '+2 Armour',
    cost: 25,
    keywords: ['Heavy', '-1" Movement'],
    description: 'Full body riveted plate armor worn by shock stormtroopers.'
  },
  {
    id: 'trench-shield',
    name: 'Ballistic Trench Shield',
    armourModifier: '+1 Armour (Frontal Arc)',
    cost: 15,
    keywords: ['Shield', 'Cover Provider'],
    description: 'A heavy metal tower shield with a viewing slit, deflects rifle rounds.'
  }
];

export const BASE_EQUIPMENT: EquipmentItem[] = [
  {
    id: 'gas-mask',
    name: 'Standard Issue Gas Mask',
    cost: 5,
    effect: 'Immune to toxic gas, choking clouds, and chemical munitions.',
    keywords: ['Survival']
  },
  {
    id: 'holy-relic',
    name: 'Vial of Saint’s Blood',
    cost: 15,
    effect: 'One-time use: Reroll a fatal injury roll or pass an automatic Morale test.',
    keywords: ['Relic', 'Consumable']
  },
  {
    id: 'frag-grenades',
    name: 'Stick Grenade Bundle',
    cost: 10,
    effect: 'Thrown 8": 3" Blast radius, deals Standard damage to all models caught.',
    keywords: ['Explosive', 'Consumable']
  },
  {
    id: 'medi-kit',
    name: 'Field Surgeon Surgical Kit',
    cost: 20,
    effect: 'Action: Heal 1 Wound on an adjacent Downed or wounded friendly unit.',
    keywords: ['Medical']
  }
];

export const BASE_UNITS: UnitProfile[] = [
  // New Antioch
  {
    id: 'na-lieutenant',
    name: 'New Antioch Lieutenant',
    factionId: 'new-antioch',
    category: 'Leader',
    baseCost: 90,
    stats: {
      movement: '6"',
      ranged: '+1',
      melee: '+2',
      armour: '+2',
      keywords: ['Leader', 'Tactician', 'Tough']
    },
    maxCount: 1,
    innateAbilities: [
      {
        id: 'command-whistle',
        name: 'Trench Whistle',
        description: 'Once per turn, grant +2" movement to up to two friendly Troopers within 12" during an assault order.'
      }
    ],
    defaultWeapons: ['service-rifle', 'trench-knife'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Seasoned veterans of the mud-drenched trenches who command their squads with iron will and brass whistles.'
  },
  {
    id: 'na-cleric',
    name: 'Combat Chaplain',
    factionId: 'new-antioch',
    category: 'Elite',
    baseCost: 65,
    stats: {
      movement: '6"',
      ranged: '+0',
      melee: '+2',
      armour: '+1',
      keywords: ['Elite', 'Priest', 'Miracles']
    },
    maxCount: 2,
    innateAbilities: [
      {
        id: 'prayer-of-fortitude',
        name: 'Litany of Fortitude',
        description: 'All friendly models within 6" gain +1 to resist Downed and Out of Action thresholds.'
      }
    ],
    defaultWeapons: ['chainsword-crusader'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Anointed warriors who minister the sacraments of battle and purge demons with fire and prayer.'
  },
  {
    id: 'na-shocktrooper',
    name: 'Stormtrooper / Shock Infantreyman',
    factionId: 'new-antioch',
    category: 'Trooper',
    baseCost: 35,
    stats: {
      movement: '6"',
      ranged: '+0',
      melee: '+1',
      armour: '+1',
      keywords: ['Trooper', 'Disciplined']
    },
    innateAbilities: [],
    defaultWeapons: ['service-rifle', 'trench-knife'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Standard riflemen of the New Antioch line, trained to advance under artillery barrages.'
  },
  {
    id: 'na-sniper',
    name: 'Antioch Marksman',
    factionId: 'new-antioch',
    category: 'Elite',
    baseCost: 55,
    stats: {
      movement: '5"',
      ranged: '+2',
      melee: '+0',
      armour: '+0',
      keywords: ['Elite', 'Sniper', 'Camouflage']
    },
    maxCount: 2,
    innateAbilities: [
      {
        id: 'dead-eye',
        name: 'Dead Eye Shot',
        description: 'When stationary, scores critical hits on rolls of 5 or 6 instead of only 6.'
      }
    ],
    defaultWeapons: ['sniper-rifle', 'trench-knife'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Patient sharpshooters perched atop shattered church spires and fortified bunkers.'
  },

  // Trench Pilgrims
  {
    id: 'tp-prophet',
    name: 'Castigator Prophet',
    factionId: 'trench-pilgrims',
    category: 'Leader',
    baseCost: 85,
    stats: {
      movement: '6"',
      ranged: '+0',
      melee: '+2',
      armour: '+1',
      keywords: ['Leader', 'Zealot', 'Fanatic', 'Tough']
    },
    maxCount: 1,
    innateAbilities: [
      {
        id: 'voice-of-wrath',
        name: 'Voice of Holy Wrath',
        description: 'All friendly Pilgrims who can hear his screams automatically pass courage checks.'
      }
    ],
    defaultWeapons: ['chainsword-crusader'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'A firebrand preacher clad in scorched garments, driven mad by divine visions.'
  },
  {
    id: 'tp-flagellant',
    name: 'Penitent Flagellant',
    factionId: 'trench-pilgrims',
    category: 'Trooper',
    baseCost: 25,
    stats: {
      movement: '7"',
      ranged: '-',
      melee: '+1',
      armour: '+0',
      keywords: ['Trooper', 'Frenzied', 'Fearless']
    },
    innateAbilities: [
      {
        id: 'pain-is-salvation',
        name: 'Pain is Salvation',
        description: 'Takes no penalties from Blood Markers until suffering at least 3 wounds.'
      }
    ],
    defaultWeapons: ['trench-club'],
    defaultArmour: [],
    lore: 'Desperate souls seeking redemption through suicidal charges into barbed wire.'
  },

  // Heretic Legion
  {
    id: 'hl-captain',
    name: 'Heretic Centurion of the Pit',
    factionId: 'heretic-legion',
    category: 'Leader',
    baseCost: 95,
    stats: {
      movement: '6"',
      ranged: '+1',
      melee: '+2',
      armour: '+2',
      keywords: ['Leader', 'Demonic Boons', 'Tough']
    },
    maxCount: 1,
    innateAbilities: [
      {
        id: 'blood-pact',
        name: 'Blood Pact Ritual',
        description: 'Sacrifice 1 friendly trooper wound to gain +2 to hit on next attack roll.'
      }
    ],
    defaultWeapons: ['heretic-flail', 'submachine-gun'],
    defaultArmour: ['heavy-crusader-plate'],
    lore: 'A fallen champion who pledged his soul to the arch-demons in exchange for supernatural vigor.'
  },
  {
    id: 'hl-trooper',
    name: 'Heretic Trench Soldier',
    factionId: 'heretic-legion',
    category: 'Trooper',
    baseCost: 30,
    stats: {
      movement: '6"',
      ranged: '+0',
      melee: '+1',
      armour: '+1',
      keywords: ['Trooper', 'Desecrated']
    },
    innateAbilities: [],
    defaultWeapons: ['service-rifle', 'trench-knife'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Former defenders who swapped the cross for infernal runes and barbed flails.'
  },

  // Mercenaries
  {
    id: 'merc-assassin',
    name: 'Hired Gun Bounty Hunter',
    factionId: 'mercenaries',
    category: 'Mercenary',
    baseCost: 50,
    stats: {
      movement: '7"',
      ranged: '+1',
      melee: '+1',
      armour: '+1',
      keywords: ['Mercenary', 'Infiltrator', 'Gunslinger']
    },
    innateAbilities: [
      {
        id: 'ambush',
        name: 'Forward Scout',
        description: 'May deploy up to 12" ahead of regular deployment zones in cover.'
      }
    ],
    defaultWeapons: ['trench-shotgun', 'trench-knife'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Cynical sellswords fighting for cold hard Ducats amidst the apocalypse.'
  }
];

export const KEYWORDS: RuleKeyword[] = [
  {
    name: 'Tough',
    category: 'General',
    summary: 'Unit has multiple wounds and is harder to take Down or kill.',
    fullText: 'Models with Tough possess extra wound resilience. When taking an Injury roll, subtract 1 from the dice result.'
  },
  {
    name: 'Fire',
    category: 'Weapon',
    summary: 'Target is set alight and suffers continuous damage.',
    fullText: 'A unit hit by Fire takes an immediate wound test, and remains On Fire until an ally uses an Action to smother the flames. While On Fire, the unit rolls a D6 each upkeep phase.'
  },
  {
    name: 'Blood Marker',
    category: 'Condition',
    summary: 'Tokens accumulated from wounds or suffering that lower combat efficiency.',
    fullText: 'Each Blood Marker imposes a -1 penalty to Action rolls (unless specific faction abilities state otherwise).'
  },
  {
    name: 'Bayonet',
    category: 'Weapon',
    summary: 'Mounted blade allows charging without drawing a secondary sidearm.',
    fullText: 'Allows a rifle to be counted as a Melee weapon (+0 modifier) during charge activations without spending an action to switch weapons.'
  },
  {
    name: 'Precision',
    category: 'Weapon',
    summary: 'Allows targeted strikes against specific models in a squad.',
    fullText: 'The shooter may bypass standard target priority rules and pick off Leaders, gunners, or wounded models directly.'
  },
  {
    name: 'Downed',
    category: 'Condition',
    summary: 'Model is knocked to the ground crawling and cannot shoot or charge.',
    fullText: 'A Downed model may only crawl up to 2" per turn. Enemies attacking a Downed model in melee gain +2 to hit and score immediate fatal injury tests.'
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
