import { Faction, UnitProfile, WeaponProfile, ArmourProfile, EquipmentItem, RuleKeyword, InjuryResult, Scenario } from '../types/rules';

export const FACTIONS: Faction[] = [
  {
    id: 'new-antioch',
    name: 'Principality of New Antioch',
    tagline: 'Disciplined Christian crusaders, shock troops, and mechanized iron knights.',
    description: 'The premier human bastion standing against the demonic breach, deploying disciplined fireteams, mechanized armor, and combat chaplains.',
    icon: 'Cross',
    color: '#D4AF37', // Sacred Gold
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
    color: '#F5F5DC', // Parchment Bone
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
    name: 'Sultanate of the Iron Wall',
    tagline: 'Alchemical marksmen, Brazen Bulls, and Janissaries defending the Great Wall.',
    description: 'Defenders of the Levant utilizing advanced alchemy, Greek fire, and bio-alchemical constructs to defend the Dar al-Islam against hellish hordes.',
    icon: 'Shield',
    color: '#008080', // Lapis Teal
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
    color: '#FF4500', // Ember Orange
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
    color: '#33691E', // Putrid Green
    specialRules: [
      {
        name: 'Foul Contagion',
        description: 'Any model striking a Black Grail unit in melee and rolling a 1 on their attack roll suffers 1 automatic Poison wound.'
      }
    ]
  },
  {
    id: 'court-seven-serpents',
    name: 'Principality of Hell (Court of the Seven-Headed Serpent)',
    tagline: 'Aristocratic infernal diplomats, sorcerers, and flesh-sculptors.',
    description: 'Decadent diabolists bargaining with serpentine arch-devils for psychic potency and immortal splendor.',
    icon: 'Crown',
    color: '#FF0000', // Soul Red
    specialRules: [
      {
        name: 'Mesmerizing Glamour',
        description: 'Enemies shooting at the Sorcerer beyond 12" suffer a -1 penalty to Ranged rolls.'
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
  // New Antioch Units
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
    innateAbilities: [
      {
        id: 'voice-of-command',
        name: 'Voice of Command',
        description: 'Once per activation, grant a friendly Trooper within 8" a free Dash or Aim action.'
      }
    ],
    defaultWeapons: ['service-rifle', 'combat-knife'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Field commander of the Antioch Trench Line, hardened by years of chemical warfare and demon breaches.'
  },
  {
    id: 'na-cleric',
    name: 'Trench Cleric / Combat Chaplain',
    factionId: 'new-antioch',
    category: 'Elite',
    baseCost: 75,
    stats: {
      movement: '6"',
      ranged: '+0',
      melee: '+1',
      armour: '+1',
      keywords: ['Elite', 'Medic', 'Priest']
    },
    innateAbilities: [
      {
        id: 'field-surgery',
        name: 'Combat Surgery',
        description: 'Spend 1 action next to a Downed ally to restore them to Active status and remove 1 Blood Marker.'
      }
    ],
    defaultWeapons: ['trench-club'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Carries bone saws, consecrated bandages, and heavy holy symbols to stitch flesh and bolster faith.'
  },
  {
    id: 'na-shocktrooper',
    name: 'Antioch Shocktrooper',
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
    defaultWeapons: ['service-rifle', 'bayonet'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Standard frontline infantry trained in barbed-wire breaching and massed rifle volleys.'
  },
  {
    id: 'na-sniper',
    name: 'Antioch Marksman / Trench Sniper',
    factionId: 'new-antioch',
    category: 'Elite',
    baseCost: 65,
    stats: {
      movement: '6"',
      ranged: '+2',
      melee: '+0',
      armour: '+0',
      keywords: ['Elite', 'Sniper', 'Camouflage']
    },
    innateAbilities: [
      {
        id: 'deadly-aim',
        name: 'Deadly Aim',
        description: 'When stationary, gains +1 to hit and ignores Light Cover.'
      }
    ],
    defaultWeapons: ['sniper-rifle', 'combat-knife'],
    defaultArmour: ['camo-cloak'],
    lore: 'Patient sharpshooters scanning No Man\'s Land through heavy telescopic sights.'
  },

  // Trench Pilgrims
  {
    id: 'tp-castigator',
    name: 'Castigator Prior',
    factionId: 'trench-pilgrims',
    category: 'Leader',
    baseCost: 85,
    stats: {
      movement: '6"',
      ranged: '+0',
      melee: '+3',
      armour: '+1',
      keywords: ['Leader', 'Zealot', 'Fearless', 'Tough']
    },
    innateAbilities: [
      {
        id: 'hymn-of-agony',
        name: 'Hymn of Agony',
        description: 'All friendly Pilgrims within 6" gain +1" movement when charging.'
      }
    ],
    defaultWeapons: ['heavy-flail'],
    defaultArmour: ['penitent-rags'],
    lore: 'Holy flagellant leading desperate sinners into machine-gun nests with unyielding fervor.'
  },
  {
    id: 'tp-anchorite',
    name: 'Shrine Anchorite',
    factionId: 'trench-pilgrims',
    category: 'Elite',
    baseCost: 110,
    stats: {
      movement: '4"',
      ranged: '+0',
      melee: '+2',
      armour: '+3',
      keywords: ['Elite', 'Construct', 'Tough', 'Armoured']
    },
    innateAbilities: [
      {
        id: 'iron-sanctuary',
        name: 'Walking Reliquary',
        description: 'Allies behind the Anchorite gain Heavy Cover from ranged fire.'
      }
    ],
    defaultWeapons: ['heavy-mace'],
    defaultArmour: ['heavy-crusader-plate'],
    lore: 'A penitent permanently sealed into a walking iron chapel, armed with divine wrath.'
  },
  {
    id: 'tp-pilgrim-trooper',
    name: 'Trench Penitent / Flagellant',
    factionId: 'trench-pilgrims',
    category: 'Trooper',
    baseCost: 25,
    stats: {
      movement: '6"',
      ranged: '-1',
      melee: '+1',
      armour: '+0',
      keywords: ['Trooper', 'Frenzied', 'Fearless']
    },
    innateAbilities: [],
    defaultWeapons: ['trench-club'],
    defaultArmour: ['penitent-rags'],
    lore: 'Zealous penitents throwing themselves into barbed wire to pave the way for crusaders.'
  },

  // Heretic Legion
  {
    id: 'hl-captain',
    name: 'Heretic Centurion / Hell-Officer',
    factionId: 'heretic-legion',
    category: 'Leader',
    baseCost: 95,
    stats: {
      movement: '6"',
      ranged: '+1',
      melee: '+2',
      armour: '+2',
      keywords: ['Leader', 'Infernal', 'Tough']
    },
    innateAbilities: [
      {
        id: 'blood-tithe-order',
        name: 'Blood Sacrifice',
        description: 'Inflict 1 wound on a friendly Trooper within 3" to immediately gain 1 free Action.'
      }
    ],
    defaultWeapons: ['demonic-blade', 'submachine-gun'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'An apostate officer bearing unholy glyphs etched directly into his armor and flesh.'
  },
  {
    id: 'hl-trooper',
    name: 'Heretic Shock Soldier',
    factionId: 'heretic-legion',
    category: 'Trooper',
    baseCost: 35,
    stats: {
      movement: '6"',
      ranged: '+0',
      melee: '+1',
      armour: '+1',
      keywords: ['Trooper', 'Corrupted']
    },
    innateAbilities: [],
    defaultWeapons: ['service-rifle', 'combat-knife'],
    defaultArmour: ['standard-trench-armour'],
    lore: 'Traitor legionnaires equipped with scavenged military gear and hell-forged munitions.'
  },

  // Sultanate of the Iron Wall
  {
    id: 'is-alchemist',
    name: 'Alchemist Commander',
    factionId: 'iron-sultanate',
    category: 'Leader',
    baseCost: 90,
    stats: {
      movement: '6"',
      ranged: '+2',
      melee: '+1',
      armour: '+1',
      keywords: ['Leader', 'Alchemist', 'Tough']
    },
    innateAbilities: [
      {
        id: 'greek-fire-infusion',
        name: 'Alchemical Infusion',
        description: 'Grants weapons of adjacent allies the Fire keyword for 1 battle round.'
      }
    ],
    defaultWeapons: ['alchemical-pistol', 'scimitar'],
    defaultArmour: ['alchemist-armour'],
    lore: 'Masters of volatile compounds, sulfuric vapours, and Greek fire defending the Iron Wall.'
  },
  {
    id: 'is-janissary',
    name: 'Iron Janissary Heavy Gunner',
    factionId: 'iron-sultanate',
    category: 'Trooper',
    baseCost: 45,
    stats: {
      movement: '5"',
      ranged: '+1',
      melee: '+1',
      armour: '+2',
      keywords: ['Trooper', 'Resilient']
    },
    innateAbilities: [],
    defaultWeapons: ['heavy-flamer'],
    defaultArmour: ['alchemist-armour'],
    lore: 'Heavy assault specialists wielding fearsome flame tubes that incinerate trench lines.'
  },

  // Mercenaries
  {
    id: 'merc-ogre',
    name: 'Trench Brute / Combat Ogre',
    factionId: 'mercenaries',
    category: 'Mercenary',
    baseCost: 120,
    stats: {
      movement: '5"',
      ranged: '-1',
      melee: '+3',
      armour: '+2',
      keywords: ['Mercenary', 'Brute', 'Tough']
    },
    innateAbilities: [
      {
        id: 'ogre-smash',
        name: 'Crater Breaker',
        description: 'Knocks down any infantry model hit in melee combat automatically.'
      }
    ],
    defaultWeapons: ['trench-club'],
    defaultArmour: ['heavy-crusader-plate'],
    lore: 'A hulking mutated giant clad in scrap steel, swinging iron girders like twigs.'
  }
];

export const BASE_WEAPONS: WeaponProfile[] = [
  {
    id: 'combat-knife',
    name: 'Combat Knife / Trench Dagger',
    type: 'Melee',
    hands: 1,
    range: '1"',
    modifiers: '+0',
    damage: 'Standard (1 Wound)',
    cost: 5,
    keywords: ['Fast Strike'],
    description: 'Standard issue steel dagger for trench raids and close-quarters fighting.'
  },
  {
    id: 'trench-club',
    name: 'Trench Club / Barbed Mace',
    type: 'Melee',
    hands: 1,
    range: '1"',
    modifiers: '+1 Melee',
    damage: 'Heavy (D3 Wounds)',
    cost: 10,
    keywords: ['Concussive'],
    description: 'Lead-weighted bludgeon with barbed wire wrapped around the head.'
  },
  {
    id: 'bayonet',
    name: 'Rifle Bayonet',
    type: 'Melee',
    hands: 1,
    range: '1"',
    modifiers: '+0 Melee (+1 on Charge)',
    damage: 'Standard (1 Wound)',
    cost: 5,
    keywords: ['Bayonet', 'Assault'],
    description: 'Affixed steel spearhead turning standard bolt-action rifles into lethal thrusting pikes.'
  },
  {
    id: 'demonic-blade',
    name: 'Hell-Forged Falchion',
    type: 'Melee',
    hands: 1,
    range: '1"',
    modifiers: '+2 Melee',
    damage: 'Lethal (D3 Wounds)',
    cost: 25,
    keywords: ['Armour Piercing (1)', 'Fire'],
    description: 'Obsidian blade burning with sulfur that cuts through reinforced steel breastplates.'
  },
  {
    id: 'heavy-flail',
    name: 'Flagellant Iron Flail',
    type: 'Melee',
    hands: 2,
    range: '2"',
    modifiers: '+2 Melee',
    damage: 'Heavy (D3 Wounds)',
    cost: 15,
    keywords: ['Concussive', 'Heavy'],
    description: 'Heavy spiked iron chains swung with religious ecstasy.'
  },
  {
    id: 'trench-shotgun',
    name: 'Trench Shotgun (Trench Sweeper)',
    type: 'Ranged',
    hands: 2,
    range: '12"',
    modifiers: '+1 Hit at Point-Blank (≤6")',
    damage: 'Heavy (D3 Wounds)',
    cost: 25,
    keywords: ['Assault', 'Shrapnel'],
    description: 'Pump-action 12-gauge scattergun loaded with buckshot for clearing bunkers.'
  },
  {
    id: 'service-rifle',
    name: 'Standard Issue Bolt-Action Rifle',
    type: 'Ranged',
    hands: 2,
    range: '24"',
    modifiers: '+0',
    damage: 'Standard (1 Wound)',
    cost: 15,
    keywords: ['Reliable', 'Bayonet Lug'],
    description: 'Rugged military rifle engineered to fire reliably through deep mud and chemical ash.'
  },
  {
    id: 'submachine-gun',
    name: 'Trench Submachine Gun (SMG)',
    type: 'Ranged',
    hands: 2,
    range: '12"',
    modifiers: '+0',
    damage: 'Standard (1 Wound)',
    cost: 30,
    keywords: ['Assault', 'Rapid Fire'],
    description: 'High rate of fire drum-fed machine carbine designed for room-clearing.'
  },
  {
    id: 'sniper-rifle',
    name: 'Scoped Precision Rifle',
    type: 'Ranged',
    hands: 2,
    range: '36"',
    modifiers: '+1 Ranged (+2 if stationary)',
    damage: 'Lethal (D3 Wounds)',
    cost: 40,
    keywords: ['Precision', 'Heavy', 'Armour Piercing (1)'],
    description: 'Heavy hunting rifle fitted with optics to pick off officers and machine gun crews.'
  },
  {
    id: 'heavy-flamer',
    name: 'Alchemical Heavy Flamethrower',
    type: 'Ranged',
    hands: 2,
    range: '8" (Template)',
    modifiers: '+0 (Hits All in Area)',
    damage: 'Severe (D3 Wounds + Fire)',
    cost: 45,
    keywords: ['Fire', 'Blast (3")', 'Heavy'],
    description: 'Pressurized backpack tank spewing Greek fire and sticky sulfur napalm.'
  },
  {
    id: 'frag-grenade',
    name: 'Frag Grenade (Stick Grenade)',
    type: 'Ranged',
    hands: 1,
    range: '8"',
    modifiers: '+0',
    damage: 'Area Blast (D3 Wounds)',
    cost: 10,
    keywords: ['Blast (2")', 'Shrapnel'],
    description: 'Cast-iron cylinder packed with high explosives and serrated shrapnel wire.'
  },
  {
    id: 'gas-grenade',
    name: 'Mustard Gas Cannister',
    type: 'Ranged',
    hands: 1,
    range: '8"',
    modifiers: '+0',
    damage: 'Gas Area (1 Wound, Ignores Armour)',
    cost: 15,
    keywords: ['Blast (3")', 'Gas'],
    description: 'Pressurized canister creating a lingering cloud of corrosive chlorine and mustard gas.'
  }
];

export const BASE_ARMOUR: ArmourProfile[] = [
  {
    id: 'standard-trench-armour',
    name: 'Standard Infantry Breastplate & Stahlhelm',
    armourModifier: '+1 Armour',
    cost: 10,
    keywords: ['Basic Protection'],
    description: 'Curved steel cuirass and helmet protecting against shrapnel and stray bullets.'
  },
  {
    id: 'trench-shield',
    name: 'Steel Firing Shield / Pavise',
    armourModifier: '+1 Armour (+2 in Front Arc)',
    cost: 15,
    keywords: ['Shield', 'Heavy'],
    description: 'Heavy steel shield with vision slit, placed into the mud to create instant cover.'
  },
  {
    id: 'heavy-crusader-plate',
    name: 'Mechanized Heavy Crusader Plate',
    armourModifier: '+2 Armour (-1" Move)',
    cost: 30,
    keywords: ['Heavy Armour', 'Tough'],
    description: 'Pneumatically assisted full plate harness capable of withstanding direct machine gun bursts.'
  },
  {
    id: 'alchemist-armour',
    name: 'Sealed Alchemical Hazard Suit',
    armourModifier: '+1 Armour',
    cost: 25,
    keywords: ['Negate Gas', 'Negate Fire'],
    description: 'Treated leather and brass suit with sealed respirator, immune to fire and chemical gas.'
  },
  {
    id: 'penitent-rags',
    name: 'Sanctified Penitent Shroud',
    armourModifier: '+0 Armour',
    cost: 0,
    keywords: ['Unarmoured'],
    description: 'Ripped burlap sackcloth inscribed with verses of penance.'
  },
  {
    id: 'camo-cloak',
    name: 'Trench Camouflage & Mud Cloak',
    armourModifier: '+0 Armour (+1 Cover Modifier)',
    cost: 10,
    keywords: ['Camouflage'],
    description: 'Hessian fabric coated in ashes and dirt, making the sniper nearly invisible in craters.'
  }
];

export const BASE_EQUIPMENT: EquipmentItem[] = [
  {
    id: 'gas-mask',
    name: 'Respirator / Gas Mask',
    cost: 5,
    effect: 'Immunity to GAS keyword attacks and toxic trench smoke.',
    keywords: ['Gas Protection'],
    description: 'Rubber mask with charcoal filter cartridge.'
  },
  {
    id: 'holy-relic',
    name: 'Fragment of the True Cross / Saint Bone',
    cost: 20,
    effect: 'Reroll 1 failed Morale or Action test per battle.',
    keywords: ['Holy Relic'],
    description: 'A sliver of saintly bone sealed in lead and silver.'
  },
  {
    id: 'first-aid-kit',
    name: 'Trench Field Dressing & Morphine',
    cost: 10,
    effect: 'Spend 1 action to remove 2 Blood Markers from a friendly model within 1".',
    keywords: ['Medical'],
    description: 'Carbolic acid, bandages, and morphine ampoules.'
  },
  {
    id: 'wire-cutters',
    name: 'Heavy Trench Wire Cutters',
    cost: 5,
    effect: 'Ignore the -2" movement penalty when crossing Barbed Wire.',
    keywords: ['Utility'],
    description: 'Heavy carbon-steel shears.'
  }
];

// Official Trench Crusade Rules & Keywords
export const KEYWORDS: RuleKeyword[] = [
  {
    name: 'Blood Markers',
    category: 'Condition',
    summary: 'Accumulated wounds and shock that enhance enemy Injury Rolls or fuel special abilities.',
    fullText: 'A model can have up to 6 Blood Markers. When making an Injury Roll against an enemy, the attacker may spend Blood Markers to add +1 Injury DICE (roll extra die and pick highest 2) per marker spent. An attacker can spend 6 Blood Markers (or 3 if target is Down) to trigger a Bloodbath Roll (roll 3D6 and sum all 3 dice). A player may also spend their own model\'s Blood Markers to impose -1 DICE on enemy attacks.'
  },
  {
    name: 'Fire',
    category: 'Weapon',
    summary: 'Incendiary damage that inflicts extra Blood Markers after the attack.',
    fullText: 'Weapons with the FIRE keyword inflict +1 additional Blood Marker on the target if the attack is a Success or Critical Success, applied after the Injury Roll is resolved (regardless of whether the Injury Roll caused damage). Ignored if target has the Negate Fire keyword.'
  },
  {
    name: 'Gas',
    category: 'Weapon',
    summary: 'Corrosive chemical agents that bypass standard armour.',
    fullText: 'Attacks with the GAS keyword bypass all non-alchemical Armour modifiers. A successful attack adds +1 Blood Marker on the target. Models wearing Gas Masks or Alchemist Armour are immune.'
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
    summary: 'Reduces the target\'s Armour rating by X.',
    fullText: 'Subtracts X from the target\'s Armour modifier when making the Injury Roll (e.g. Armour Piercing 1 reduces +2 Armour to +1).'
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
    name: 'Bayonet',
    category: 'Weapon',
    summary: 'Mounted blade allows charging without drawing a secondary sidearm.',
    fullText: 'Allows a rifle to be counted as a Melee weapon (+0 modifier, +1 on Charge) during charge activations.'
  },
  {
    name: 'Shield',
    category: 'General',
    summary: 'Grants armor bonus against frontal attacks and ranged projectiles.',
    fullText: 'Grants +1 Armour against all ranged attacks originating from the model’s front 180° arc.'
  },
  {
    name: 'Precision',
    category: 'Weapon',
    summary: 'Allows targeted strikes against specific models in a squad.',
    fullText: 'The shooter may bypass standard target priority rules and pick off Leaders, gunners, or wounded models directly.'
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
