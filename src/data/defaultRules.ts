import { Faction, UnitProfile, WeaponProfile, ArmourProfile, EquipmentItem, RuleKeyword, Scenario } from '../types/rules';
import { 
  OFFICIAL_SCENARIOS, 
  OFFICIAL_KEYWORDS, 
  OFFICIAL_TRAUMA_TABLE, 
  OFFICIAL_COMMON_EXPLORATION, 
  OFFICIAL_RARE_EXPLORATION, 
  OFFICIAL_LEGENDARY_EXPLORATION,
  OFFICIAL_MELEE_SKILLS,
  OFFICIAL_RANGED_SKILLS,
  OFFICIAL_STEALTH_SKILLS,
  OFFICIAL_WILDCARD_SKILLS
} from './officialRulesData';
import { OFFICIAL_CORE_RULES } from './officialCoreRules';

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

export const BASE_WEAPONS: WeaponProfile[] = [
  // MELEE WEAPONS
  {
    id: 'w-knife',
    name: 'Trench Knife',
    factionId: 'universal',
    type: 'Melee',
    hands: 1,
    range: '1"',
    modifiers: '+0 DICE',
    damage: 'Standard',
    keywords: ['Fast Strike'],
    cost: 1,
    description: 'Standard trench warfare combat blade.'
  },
  {
    id: 'w-bayonet',
    name: 'Bayonet',
    factionId: 'universal',
    type: 'Melee',
    hands: 1,
    range: '1"',
    modifiers: '+0 DICE',
    damage: 'Standard',
    keywords: ['+1 on Charge', 'Shield Combo'],
    cost: 2,
    description: 'Fixed bayonet providing reach and charge impalement.'
  },
  {
    id: 'w-club',
    name: 'Trench Club',
    factionId: 'universal',
    type: 'Melee',
    hands: 1,
    range: '1"',
    modifiers: '+0 DICE',
    damage: 'Concussive',
    keywords: ['Concussive'],
    cost: 3,
    description: 'Weighted spiked club designed to crack trench helmets.'
  },
  {
    id: 'w-sword',
    name: 'Sword/Axe',
    factionId: 'universal',
    type: 'Melee',
    hands: 1,
    range: '1"',
    modifiers: '+1 DICE',
    damage: 'Slashing',
    keywords: ['+1 DICE', 'Slashing'],
    cost: 4,
    description: 'Single-edged trench sword or hand axe.'
  },
  {
    id: 'w-flail',
    name: 'Flail/Scourge',
    factionId: 'universal',
    type: 'Melee',
    hands: 1,
    range: '2"',
    modifiers: '+0 DICE',
    damage: 'Concussive',
    keywords: ['Reach (2")', 'Concussive', 'Ignore Shield Cover'],
    cost: 5,
    description: 'Spiked chain flail that wraps around trench shields.'
  },
  {
    id: 'w-polearm',
    name: 'Polearm',
    factionId: 'universal',
    type: 'Melee',
    hands: 2,
    range: '2"',
    modifiers: '+1 DICE',
    damage: 'Standard',
    keywords: ['Reach (2")', 'Shield Combo'],
    cost: 7,
    description: 'Long spear, halberd, or billhook providing standoff capability.'
  },
  {
    id: 'w-great-hammer',
    name: 'Great Hammer/Maul',
    factionId: 'universal',
    type: 'Melee',
    hands: 2,
    range: '1"',
    modifiers: '+1 DICE',
    damage: 'Severe (D3)',
    keywords: ['Heavy', 'Concussive', 'Armour Piercing 1'],
    cost: 10,
    description: 'Two-handed sledge designed to crush Machine Armour.'
  },
  {
    id: 'w-great-sword',
    name: 'Great Sword/Axe',
    factionId: 'universal',
    type: 'Melee',
    hands: 2,
    range: '1"',
    modifiers: '+2 DICE',
    damage: 'Severe (D3)',
    keywords: ['+2 DICE', 'Heavy', 'Slashing'],
    cost: 12,
    description: 'Massive executioner greatsword or battle axe.'
  },
  {
    id: 'w-misericordia',
    name: 'Misericordia',
    factionId: 'new-antioch',
    allowedUnits: ['Combat Medic', 'Sister of Saint Cosmas'],
    type: 'Melee',
    hands: 1,
    range: '1"',
    modifiers: '+1 DICE',
    damage: 'Lethal',
    keywords: ['Combat Medic Only', 'Finish the Fallen'],
    cost: 15,
    description: 'Narrow mercy blade used by Combat Medics to deliver the Emperor\'s peace.'
  },
  {
    id: 'w-anti-tank-hammer',
    name: 'Anti-Tank Hammer',
    factionId: 'trench-pilgrims',
    allowedFactions: ['trench-pilgrims', 'iron-sultanate'],
    type: 'Melee',
    hands: 2,
    range: '1"',
    modifiers: '+1 DICE',
    damage: 'Severe (D3+1)',
    keywords: ['+1 INJURY DICE', 'CRITICAL', 'IGNORE ARMOUR', 'RISKY'],
    cost: 25,
    description: 'Hollow-charge impact hammer capable of breaching tank armor.'
  },
  {
    id: 'w-titan-zulfiqar',
    name: 'Titan Zulfiqar',
    factionId: 'iron-sultanate',
    allowedUnits: ['Brazen Bull', 'Favoured Brazen Bull', 'Takwin Homunculus', 'Favoured Takwin Homunculus'],
    type: 'Melee',
    hands: 1,
    range: '1"',
    modifiers: '+2 INJURY MODIFIER',
    damage: 'Severe (D3)',
    keywords: ['+2 INJURY MODIFIER', 'CRITICAL', 'HEAVY', 'Bull Only'],
    cost: 30,
    description: 'Massive dual-bladed alchemical scimitar forged for siege beasts.'
  },

  // RANGED WEAPONS
  {
    id: 'w-pistol',
    name: 'Pistol / Revolver',
    factionId: 'universal',
    type: 'Ranged',
    hands: 1,
    range: '12"',
    modifiers: '+0 DICE',
    damage: 'Standard',
    keywords: ['Assault', 'Sidearm'],
    cost: 6,
    description: 'Reliable service revolver or semi-auto sidearm.'
  },
  {
    id: 'w-auto-pistol',
    name: 'Automatic Pistol',
    factionId: 'universal',
    type: 'Ranged',
    hands: 1,
    range: '12"',
    modifiers: '+0 DICE',
    damage: 'Standard',
    keywords: ['Assault', 'Automatic 2', 'Sidearm'],
    cost: 10,
    description: 'High-rate-of-fire machine pistol.'
  },
  {
    id: 'w-rifle',
    name: 'Bolt-Action Service Rifle',
    factionId: 'universal',
    type: 'Ranged',
    hands: 2,
    range: '24"',
    modifiers: '+0 DICE',
    damage: 'Standard',
    keywords: ['Bayonet Lug'],
    cost: 10,
    description: 'Standard issue military bolt-action rifle.'
  },
  {
    id: 'w-shotgun',
    name: 'Shotgun',
    factionId: 'universal',
    type: 'Ranged',
    hands: 2,
    range: '12"',
    modifiers: '+1 Hit Point-Blank',
    damage: 'Standard',
    keywords: ['+1 Hit Point-Blank (≤6")', 'Bayonet Lug', 'Shield Combo'],
    cost: 10,
    description: '12-gauge trench sweeper shotgun.'
  },
  {
    id: 'w-semi-rifle',
    name: 'Semi-Automatic Rifle',
    factionId: 'universal',
    type: 'Ranged',
    hands: 2,
    range: '24"',
    modifiers: '+0 DICE',
    damage: 'Standard',
    keywords: ['Bayonet Lug', 'Assault'],
    cost: 15,
    description: 'Gas-operated self-loading infantry rifle.'
  },
  {
    id: 'w-auto-shotgun',
    name: 'Automatic Shotgun',
    factionId: 'universal',
    type: 'Ranged',
    hands: 2,
    range: '12"',
    modifiers: '+1 DICE Point-Blank',
    damage: 'Standard',
    keywords: ['+1 DICE Point-Blank', 'Bayonet Lug', 'Shield Combo', 'Assault'],
    cost: 15,
    description: 'Drum-fed automatic trench shotgun.'
  },
  {
    id: 'w-jezzail',
    name: 'Jezzail',
    factionId: 'iron-sultanate',
    type: 'Ranged',
    hands: 2,
    range: '18"',
    modifiers: '+1 DICE',
    damage: 'Standard',
    keywords: ['+1 DICE', 'Alchemical Lock'],
    cost: 7,
    description: 'Long-barrelled rifled musket favored by Sultanate marksmen.'
  },
  {
    id: 'w-siege-jezzail',
    name: 'Siege Jezzail',
    factionId: 'iron-sultanate',
    allowedFactions: ['iron-sultanate'],
    type: 'Ranged',
    hands: 2,
    range: '30"',
    modifiers: '+1 DICE, +1 INJURY DICE',
    damage: 'Heavy',
    keywords: ['+1 DICE', '+1 INJURY DICE', 'Heavy'],
    cost: 30,
    description: 'High-caliber wall rifle designed to breach fortifications.'
  },
  {
    id: 'w-smg',
    name: 'Submachine Gun',
    factionId: 'universal',
    type: 'Ranged',
    hands: 2,
    range: '12"',
    modifiers: '+0 DICE',
    damage: 'Standard',
    keywords: ['Assault', 'Bayonet Lug', 'Limit 2'],
    cost: 30,
    description: 'Rapid-firing 9mm trench submachine gun.'
  },
  {
    id: 'w-sniper',
    name: 'Sniper Rifle',
    factionId: 'universal',
    type: 'Ranged',
    hands: 2,
    range: '36"',
    modifiers: '+1 DICE (+2 stationary)',
    damage: 'Lethal',
    keywords: ['Precision', 'Heavy', 'Armour Piercing 1', 'Limit 3'],
    cost: 35,
    description: 'Precision match-grade rifle fitted with high-power telescopic optics.'
  },
  {
    id: 'w-auto-rifle',
    name: 'Automatic Rifle',
    factionId: 'universal',
    type: 'Ranged',
    hands: 2,
    range: '24"',
    modifiers: '+0 DICE',
    damage: 'Standard',
    keywords: ['Assault', 'Automatic 2', 'Focused Fire'],
    cost: 40,
    description: 'Heavy magazine-fed automatic combat rifle.'
  },
  {
    id: 'w-mg',
    name: 'Machine Gun',
    factionId: 'universal',
    type: 'Ranged',
    hands: 2,
    range: '36"',
    modifiers: '+1 DICE',
    damage: 'Heavy',
    keywords: ['Heavy', 'Suppressive Fire', 'Limit 2'],
    cost: 50,
    description: 'Belt-fed air-cooled heavy machine gun.'
  },
  {
    id: 'w-flamethrower',
    name: 'Flamethrower',
    factionId: 'universal',
    type: 'Ranged',
    hands: 2,
    range: '8" Template',
    modifiers: 'Automatic Hit',
    damage: 'Area',
    keywords: ['Fire', 'Blast (2")', 'Ignore Armour', 'Limit 3'],
    cost: 30,
    description: 'Pressurized chemical projector firing streams of liquid fire.'
  },
  {
    id: 'w-heavy-flamethrower',
    name: 'Heavy Flamethrower',
    factionId: 'universal',
    type: 'Ranged',
    hands: 2,
    range: '10" Template',
    modifiers: 'Severe D3',
    damage: 'Severe (D3)',
    keywords: ['Fire D3', 'Blast (3")', 'Heavy', 'Limit 1'],
    cost: 55,
    description: 'Massive dual-tank chemical projector incinerating whole bunker sectors.'
  },
  {
    id: 'w-flame-cannon',
    name: 'Flame Cannon',
    factionId: 'iron-sultanate',
    allowedUnits: ['Brazen Bull', 'Favoured Brazen Bull'],
    type: 'Ranged',
    hands: 1,
    range: '12"',
    modifiers: 'Greek Fire',
    damage: 'Severe (D3)',
    keywords: ['FIRE', 'HEAVY', 'IGNORE ARMOUR', 'Greek Fire (Line 12")'],
    cost: 60,
    description: 'Mounted Greek fire cannon firing continuous streams across a 12" line.'
  },

  // GRENADES
  {
    id: 'w-frag-grenades',
    name: 'Frag Grenades',
    factionId: 'universal',
    type: 'Ranged',
    hands: 1,
    range: '8"',
    modifiers: 'Blast',
    damage: 'Blast',
    keywords: ['Blast (2")', 'Shrapnel'],
    cost: 7,
    description: 'Cast iron fragmentation grenades throwing lethal jagged steel.'
  },
  {
    id: 'w-incendiary-grenades',
    name: 'Incendiary Grenades',
    factionId: 'universal',
    type: 'Ranged',
    hands: 1,
    range: '8"',
    modifiers: 'Fire',
    damage: 'Fire',
    keywords: ['Blast (2")', 'Fire', 'Limit 2'],
    cost: 15,
    description: 'White phosphorus grenades igniting everything within radius.'
  },
  {
    id: 'w-satchel-charge',
    name: 'Satchel Charge',
    factionId: 'universal',
    type: 'Ranged',
    hands: 1,
    range: '4"',
    modifiers: 'Severe (D3+1)',
    damage: 'Severe (D3+1)',
    keywords: ['Blast (3")', 'Consumable (Limit 3)', 'Ignore Armour'],
    cost: 15,
    description: 'Canvas bag packed with high explosives and timed fuse.'
  }
];

export const BASE_ARMOUR: ArmourProfile[] = [
  {
    id: 'arm-standard',
    name: 'Standard Armour',
    factionId: 'universal',
    armourModifier: '-1 Injury Modifier',
    cost: 15,
    description: 'Standard steel breastplate, padded gambeson, and iron gorget.'
  },
  {
    id: 'arm-reinforced',
    name: 'Reinforced Armour',
    factionId: 'universal',
    armourModifier: '-2 Injury Modifier',
    cost: 40,
    description: 'Full-plate harness layered with hardened steel inserts and spall liners.'
  },
  {
    id: 'arm-machine',
    name: 'Machine Armour',
    factionId: 'universal',
    allowedUnits: ['Mechanized Heavy Infantry', 'Anointed Heavy Infantry', 'Brazen Bull', 'Favoured Brazen Bull'],
    armourModifier: '-3 Injury Modifier',
    cost: 50,
    description: 'Powered pneumatic exoskeleton plate. Sets base size to 40mm, Standfast: treats Down as Minor Wound.'
  },
  {
    id: 'arm-alchemist',
    name: 'Alchemist Armour',
    factionId: 'iron-sultanate',
    allowedUnits: ['Jabirean Alchemist', 'Kasim bin Malik, the Living Engineer', 'Zayd bin Tariq al-Nahas'],
    armourModifier: '-2 Injury Modifier',
    cost: 50,
    description: 'Hermetically sealed alchemical hazard suit. -2 Injury Modifier, completely NEGATES FIRE and NEGATES GAS.'
  },
  {
    id: 'arm-trench-shield',
    name: 'Trench Shield',
    factionId: 'universal',
    armourModifier: '-1 Injury Modifier (Frontal)',
    cost: 10,
    description: 'Heavy steel ballistic mantlet with firing viewport. Provides cover bonus from frontal arc.'
  },
  {
    id: 'arm-fire-shield',
    name: 'Fire Shield',
    factionId: 'iron-sultanate',
    armourModifier: '-1 Injury Modifier',
    cost: 20,
    description: 'Alchemically treated shield negating fire damage and providing -1 Injury Modifier.'
  }
];

export const BASE_EQUIPMENT: EquipmentItem[] = [
  {
    id: 'eq-gas-mask',
    name: 'Gas Mask',
    cost: 5,
    factionId: 'universal',
    effect: 'NEGATE GAS: Wearer is completely immune to toxic gas effects and chemical hazard weapons.'
  },
  {
    id: 'eq-combat-helmet',
    name: 'Combat Helmet',
    cost: 10,
    factionId: 'universal',
    effect: 'NEGATE SHRAPNEL: Negates the bonus Injury dice from explosive shrapnel and blast weapons.'
  },
  {
    id: 'eq-medikit',
    name: 'Medikit',
    cost: 15,
    factionId: 'universal',
    effect: 'ACTION: Treat a friendly model within 1" to remove 1 Blood Marker or attempt to revive a Downed model.'
  },
  {
    id: 'eq-binoculars',
    name: 'Binoculars',
    cost: 5,
    factionId: 'universal',
    effect: 'Spotter Action: Designate an enemy model in Line of Sight to grant friendly units +1 DICE Ranged attacks against it.'
  },
  {
    id: 'eq-shovel',
    name: 'Shovel',
    cost: 5,
    factionId: 'universal',
    effect: 'Dug In: Model starting on open ground has the COVER keyword until it moves. Can be used as a 2H melee weapon.'
  },
  {
    id: 'eq-cloak-alamut',
    name: 'Cloak of Alamut',
    cost: 25,
    factionId: 'iron-sultanate',
    effect: 'Blend In: Ranged attack modifier for Cover is -2 DICE instead of -1 DICE when wearing this cloak.'
  },
  {
    id: 'eq-wind-amulet',
    name: 'Wind Amulet',
    cost: 10,
    factionId: 'iron-sultanate',
    effect: 'Gusts of Wind: Once per match, add +3" to Movement Characteristic for the activation.'
  },
  {
    id: 'eq-sniper-scope',
    name: 'Sniper Scope',
    cost: 10,
    factionId: 'universal',
    effect: 'Enhanced Accuracy: One rifle gains the IGNORE LONG RANGE keyword.'
  },
  {
    id: 'eq-alchemical-ammo',
    name: 'Alchemical Ammunition',
    cost: 3,
    factionId: 'iron-sultanate',
    effect: 'Adds +1 DICE to attacks with Jezzail, Siege Jezzail, or Halberd-Gun for one match.'
  }
];

export const BASE_UNITS: UnitProfile[] = [
  // 1. THE PRINCIPALITY OF NEW ANTIOCH
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
      keywords: ['LEADER', 'INFANTRY']
    },
    innateAbilities: [
      {
        id: 'voice-of-command',
        name: 'Voice of Command',
        description: 'Once per turn, issue an order to a friendly model within 6", granting +1 DICE on its next Action roll.'
      },
      {
        id: 'hold-your-fire',
        name: 'Hold Your Fire!',
        description: 'ACTION: Order friendly models in 6" to hold fire for concentrated volleys.'
      }
    ]
  },
  {
    id: 'na-sniper-priest',
    name: 'Sniper Priest',
    factionId: 'new-antioch',
    category: 'Elite',
    baseCost: 50,
    stats: {
      movement: '6"',
      ranged: '+2 DICE',
      melee: '+0 DICE',
      armour: '-1',
      keywords: ['ELITE', 'INFANTRY']
    },
    innateAbilities: [
      {
        id: 'blessed-sight',
        name: 'Blessed Sight',
        description: 'Add +2 DICE to Ranged Attack rolls when firing a Sniper Rifle while stationary.'
      }
    ]
  },
  {
    id: 'na-trench-cleric',
    name: 'Trench Cleric',
    factionId: 'new-antioch',
    category: 'Elite',
    baseCost: 60,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+1 DICE',
      armour: '-1',
      keywords: ['ELITE', 'INFANTRY', 'NEGATE FEAR']
    },
    innateAbilities: [
      {
        id: 'onward-christian-soldiers',
        name: 'Onward Christian Soldiers!',
        description: 'Friendly models within 6" negate Fear and receive +1 DICE on Morale checks.'
      }
    ]
  },
  {
    id: 'na-combat-medic',
    name: 'Combat Medic',
    factionId: 'new-antioch',
    category: 'Elite',
    baseCost: 65,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+1 DICE',
      armour: '-1',
      keywords: ['ELITE', 'INFANTRY']
    },
    innateAbilities: [
      {
        id: 'expert-medic',
        name: 'Expert Medic',
        description: 'Add +2 DICE to Treat actions with a Medikit.'
      }
    ]
  },
  {
    id: 'na-combat-engineer',
    name: 'Combat Engineer',
    factionId: 'new-antioch',
    category: 'Elite',
    baseCost: 80,
    stats: {
      movement: '6"',
      ranged: '+1 DICE',
      melee: '+1 DICE',
      armour: '-1',
      keywords: ['ELITE', 'INFANTRY']
    },
    innateAbilities: [
      {
        id: 'fortify',
        name: 'Fortify Position',
        description: 'ACTION: Construct defensive breastworks giving permanent Cover to an adjacent sector.'
      }
    ]
  },
  {
    id: 'na-mechanized-heavy',
    name: 'Mechanized Heavy Infantry',
    factionId: 'new-antioch',
    category: 'Elite',
    baseCost: 95,
    stats: {
      movement: '5"',
      ranged: '+1 DICE',
      melee: '+2 DICE',
      armour: '-3',
      keywords: ['ELITE', 'INFANTRY', 'CUMBERSOME']
    },
    innateAbilities: [
      {
        id: 'pneumatic-reinforcement',
        name: 'Pneumatic Reinforcement',
        description: 'Heavy armor harness absorbs concussive kinetic force. 40mm base.'
      }
    ]
  },
  {
    id: 'na-shocktrooper',
    name: 'Shocktrooper',
    factionId: 'new-antioch',
    category: 'Trooper',
    baseCost: 40,
    stats: {
      movement: '6"',
      ranged: '+1 DICE',
      melee: '+1 DICE',
      armour: '-1',
      keywords: ['INFANTRY']
    }
  },
  {
    id: 'na-yeoman',
    name: 'Yeoman',
    factionId: 'new-antioch',
    category: 'Trooper',
    baseCost: 25,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+0 DICE',
      armour: '0',
      keywords: ['INFANTRY']
    }
  },
  {
    id: 'na-trench-dog',
    name: 'Trench Dog / War Hound',
    factionId: 'new-antioch',
    category: 'Trooper',
    baseCost: 20,
    stats: {
      movement: '8"',
      ranged: '-',
      melee: '+1 DICE',
      armour: '0',
      keywords: ['BEAST']
    },
    innateAbilities: [
      {
        id: 'bloodhound',
        name: 'Bloodhound Senses',
        description: 'Add +2 DICE to locate hidden infiltrators within 12".'
      }
    ]
  },

  // 2. TRENCH PILGRIMS
  {
    id: 'tp-war-prophet',
    name: 'War Prophet',
    factionId: 'trench-pilgrims',
    category: 'Leader',
    baseCost: 80,
    stats: {
      movement: '6"',
      ranged: '+1 DICE',
      melee: '+1 DICE',
      armour: '-1',
      keywords: ['LEADER', 'INFANTRY', 'NEGATE FEAR']
    },
    innateAbilities: [
      {
        id: 'prophetic-vision',
        name: 'Prophetic Vision',
        description: 'Allows rerolls of one failed Action or Morale roll per game round.'
      }
    ]
  },
  {
    id: 'tp-castigator',
    name: 'Castigator',
    factionId: 'trench-pilgrims',
    category: 'Elite',
    baseCost: 65,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+2 DICE',
      armour: '-1',
      keywords: ['ELITE', 'INFANTRY', 'NEGATE FEAR']
    },
    innateAbilities: [
      {
        id: 'holy-wrath',
        name: 'Righteous Castigation',
        description: 'Melee attacks inflict +1 INJURY DICE against Demonic models.'
      }
    ]
  },
  {
    id: 'tp-communicant',
    name: 'Communicant',
    factionId: 'trench-pilgrims',
    category: 'Elite',
    baseCost: 90,
    stats: {
      movement: '6"',
      ranged: '+1 DICE',
      melee: '+2 DICE',
      armour: '-2',
      keywords: ['ELITE', 'INFANTRY', 'REGENERATE 1', 'TOUGH']
    },
    innateAbilities: [
      {
        id: 'holy-flesh',
        name: 'Communion of Flesh',
        description: 'Bears blood harvested from Meta-Christ. Cannot carry light weapons.'
      }
    ]
  },
  {
    id: 'tp-anchorite',
    name: 'Anchorite Shrine',
    factionId: 'trench-pilgrims',
    category: 'Elite',
    baseCost: 120,
    stats: {
      movement: '4"',
      ranged: '+1 DICE',
      melee: '+2 DICE',
      armour: '-3',
      keywords: ['ELITE', 'FEAR', 'ARTIFICIAL', 'TOUGH']
    },
    innateAbilities: [
      {
        id: 'iron-maiden',
        name: 'Iron Reliquary',
        description: 'Walking armored reliquary housing a penitent saint.'
      }
    ]
  },
  {
    id: 'tp-stigmatic-nun',
    name: 'Stigmatic Nun',
    factionId: 'trench-pilgrims',
    category: 'Elite',
    baseCost: 45,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+1 DICE',
      armour: '0',
      keywords: ['ELITE', 'INFANTRY']
    },
    innateAbilities: [
      {
        id: 'holy-stigmata',
        name: 'Miraculous Bleeding',
        description: 'May suffer 1 Blood Marker to grant +1 DICE to all friendly models within 6".'
      }
    ]
  },
  {
    id: 'tp-faithful',
    name: 'The Faithful',
    factionId: 'trench-pilgrims',
    category: 'Trooper',
    baseCost: 25,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+0 DICE',
      armour: '0',
      keywords: ['INFANTRY']
    }
  },
  {
    id: 'tp-martyr',
    name: 'Martyr / Flagellant',
    factionId: 'trench-pilgrims',
    category: 'Trooper',
    baseCost: 15,
    stats: {
      movement: '6"',
      ranged: '-',
      melee: '+1 DICE',
      armour: '0',
      keywords: ['INFANTRY', 'NEGATE FEAR']
    }
  },

  // 3. THE SULTANATE OF THE IRON WALL
  {
    id: 'is-yuzbasi',
    name: 'Yüzbaşı',
    factionId: 'iron-sultanate',
    category: 'Leader',
    baseCost: 70,
    stats: {
      movement: '6"',
      ranged: '+1 DICE',
      melee: '+1 DICE',
      armour: '-1',
      keywords: ['LEADER', 'INFANTRY']
    },
    innateAbilities: [
      {
        id: 'sultanate-command',
        name: 'Command of the Sublime Porte',
        description: 'Allows one friendly Sultanate model within 8" to activate immediately following the Yüzbaşı.'
      }
    ]
  },
  {
    id: 'is-alchemist',
    name: 'Jabirean Alchemist',
    factionId: 'iron-sultanate',
    category: 'Elite',
    baseCost: 55,
    stats: {
      movement: '6"',
      ranged: '+1 DICE',
      melee: '+0 DICE',
      armour: '-1',
      keywords: ['ELITE', 'INFANTRY']
    },
    innateAbilities: [
      {
        id: 'mastery-elements',
        name: 'Mastery of Elements',
        description: 'ACTION: Infuse friendly weapons in 6" with Fire, Gas, or Shrapnel keywords.'
      }
    ]
  },
  {
    id: 'is-assassin',
    name: 'Sultanate Assassin',
    factionId: 'iron-sultanate',
    category: 'Elite',
    baseCost: 85,
    stats: {
      movement: '7"',
      ranged: '+1 DICE',
      melee: '+2 DICE',
      armour: '-1',
      keywords: ['ELITE', 'INFANTRY', 'INFILTRATOR']
    },
    innateAbilities: [
      {
        id: 'shadow-blade',
        name: 'Cabal of Assassins',
        description: 'Melee attacks made from behind ignore armor and inflict Criticals on 5+.'
      }
    ]
  },
  {
    id: 'is-brazen-bull',
    name: 'Brazen Bull',
    factionId: 'iron-sultanate',
    category: 'Elite',
    baseCost: 100,
    stats: {
      movement: '5"',
      ranged: '+0 DICE',
      melee: '+2 DICE',
      armour: '-3',
      keywords: ['ELITE', 'ARTIFICIAL', 'TOUGH', 'FEAR']
    },
    innateAbilities: [
      {
        id: 'alchemical-furnace',
        name: 'Alchemical Furnace Core',
        description: 'Mounts heavy flame cannons or siege rams. Completely immune to Fire.'
      }
    ]
  },
  {
    id: 'is-janissary',
    name: 'Janissary',
    factionId: 'iron-sultanate',
    category: 'Trooper',
    baseCost: 55,
    stats: {
      movement: '6"',
      ranged: '+1 DICE',
      melee: '+1 DICE',
      armour: '-1',
      keywords: ['INFANTRY']
    }
  },
  {
    id: 'is-sapper',
    name: 'Sultanate Sapper',
    factionId: 'iron-sultanate',
    category: 'Trooper',
    baseCost: 50,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+1 DICE',
      armour: '-1',
      keywords: ['INFANTRY']
    }
  },
  {
    id: 'is-lion-of-jabir',
    name: 'Lion of Jabir',
    factionId: 'iron-sultanate',
    category: 'Trooper',
    baseCost: 60,
    stats: {
      movement: '8"',
      ranged: '-',
      melee: '+2 DICE',
      armour: '-1',
      keywords: ['BEAST', 'FEAR']
    }
  },
  {
    id: 'is-homunculus',
    name: 'Takwin Homunculus',
    factionId: 'iron-sultanate',
    category: 'Trooper',
    baseCost: 35,
    stats: {
      movement: '5"',
      ranged: '+0 DICE',
      melee: '+1 DICE',
      armour: '0',
      keywords: ['ARTIFICIAL']
    }
  },
  {
    id: 'is-azab',
    name: 'Azeb',
    factionId: 'iron-sultanate',
    category: 'Trooper',
    baseCost: 25,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+0 DICE',
      armour: '0',
      keywords: ['INFANTRY']
    }
  },

  // 4. THE HERETIC LEGIONS
  {
    id: 'hl-priest',
    name: 'Heretic Priest',
    factionId: 'heretic-legions',
    category: 'Leader',
    baseCost: 80,
    stats: {
      movement: '6"',
      ranged: '+1 DICE',
      melee: '+1 DICE',
      armour: '-1',
      keywords: ['LEADER', 'INFANTRY', 'FEAR']
    },
    innateAbilities: [
      {
        id: 'blasphemous-litany',
        name: 'Blasphemous Litany',
        description: 'Chants unholy verses forcing enemies within 8" to make Risky tests for every action.'
      }
    ]
  },
  {
    id: 'hl-death-commando',
    name: 'Death Commando',
    factionId: 'heretic-legions',
    category: 'Elite',
    baseCost: 90,
    stats: {
      movement: '7"',
      ranged: '+1 DICE',
      melee: '+2 DICE',
      armour: '-1',
      keywords: ['ELITE', 'INFANTRY', 'INFILTRATOR', 'FEAR']
    }
  },
  {
    id: 'hl-chorister',
    name: 'Chorister',
    factionId: 'heretic-legions',
    category: 'Elite',
    baseCost: 65,
    stats: {
      movement: '6"',
      ranged: '+1 DICE',
      melee: '+0 DICE',
      armour: '-1',
      keywords: ['ELITE', 'INFANTRY', 'FEAR']
    }
  },
  {
    id: 'hl-anointed',
    name: 'Anointed Heavy Infantry',
    factionId: 'heretic-legions',
    category: 'Trooper',
    baseCost: 95,
    stats: {
      movement: '5"',
      ranged: '+1 DICE',
      melee: '+2 DICE',
      armour: '-3',
      keywords: ['INFANTRY', 'TOUGH', 'FEAR']
    }
  },
  {
    id: 'hl-war-wolf',
    name: 'War Wolf Assault Beast',
    factionId: 'heretic-legions',
    category: 'Trooper',
    baseCost: 145,
    stats: {
      movement: '8"',
      ranged: '-',
      melee: '+3 DICE',
      armour: '-2',
      keywords: ['BEAST', 'TOUGH', 'FEAR']
    }
  },
  {
    id: 'hl-trooper',
    name: 'Heretic Trooper',
    factionId: 'heretic-legions',
    category: 'Trooper',
    baseCost: 30,
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+0 DICE',
      armour: '-1',
      keywords: ['INFANTRY']
    }
  },
  {
    id: 'hl-wretched',
    name: 'Wretched',
    factionId: 'heretic-legions',
    category: 'Trooper',
    baseCost: 25,
    stats: {
      movement: '5"',
      ranged: '-',
      melee: '+0 DICE',
      armour: '0',
      keywords: ['INFANTRY']
    }
  },

  // 5. CULT OF THE BLACK GRAIL
  {
    id: 'bg-lord-of-tumours',
    name: 'Lord of Tumours',
    factionId: 'black-grail',
    category: 'Leader',
    baseCost: 130,
    stats: {
      movement: '5"',
      ranged: '+0 DICE',
      melee: '+2 DICE',
      armour: '-2',
      keywords: ['LEADER', 'FEAR', 'TOUGH', 'BLACK GRAIL']
    }
  },
  {
    id: 'bg-plague-knight',
    name: 'Plague Knight',
    factionId: 'black-grail',
    category: 'Elite',
    baseCost: 60,
    stats: {
      movement: '5"',
      ranged: '+0 DICE',
      melee: '+1 DICE',
      armour: '-2',
      keywords: ['ELITE', 'FEAR', 'BLACK GRAIL']
    }
  },
  {
    id: 'bg-grail-thrall',
    name: 'Grail Thrall / Fly Thrall',
    factionId: 'black-grail',
    category: 'Trooper',
    baseCost: 25,
    stats: {
      movement: '5"',
      ranged: '-',
      melee: '+0 DICE',
      armour: '0',
      keywords: ['INFANTRY', 'BLACK GRAIL']
    }
  },

  // 6. COURT OF THE SEVEN-HEADED SERPENT
  {
    id: 'cs-praetor',
    name: 'Praetor',
    factionId: 'court-seven-serpents',
    category: 'Leader',
    baseCost: 115,
    stats: {
      movement: '6"',
      ranged: '+1 DICE',
      melee: '+2 DICE',
      armour: '-2',
      keywords: ['LEADER', 'DEMONIC', 'FEAR']
    }
  },
  {
    id: 'cs-sorcerer',
    name: 'Sorcerer of the Pit',
    factionId: 'court-seven-serpents',
    category: 'Elite',
    baseCost: 75,
    stats: {
      movement: '6"',
      ranged: '+1 DICE',
      melee: '+0 DICE',
      armour: '-1',
      keywords: ['ELITE', 'DEMONIC', 'FEAR']
    }
  },
  {
    id: 'cs-hell-knight',
    name: 'Hell Knight',
    factionId: 'court-seven-serpents',
    category: 'Elite',
    baseCost: 100,
    stats: {
      movement: '6"',
      ranged: '+1 DICE',
      melee: '+2 DICE',
      armour: '-2',
      keywords: ['ELITE', 'DEMONIC', 'FEAR']
    }
  },

  // 7. MERCENARIES (HIRED WITH GLORY POINTS ☼ / RESTRICTED BY FACTION)
  {
    id: 'merc-combat-biologist',
    name: 'Combat Biologist',
    factionId: 'mercenaries',
    allowedFactions: ['new-antioch', 'iron-sultanate'],
    category: 'Mercenary',
    baseCost: 3, // 3 Glory Points
    stats: {
      movement: '6"',
      ranged: '+0 DICE',
      melee: '+1 DICE',
      armour: '-1',
      keywords: ['MERCENARY', 'NEGATE FEAR']
    },
    innateAbilities: [
      {
        id: 'vivisection',
        name: 'Battlefield Vivisection',
        description: 'Unlocks Gather Knowledge deed. Grants Blessing Marker when slaying Demonic or Black Grail enemies.'
      }
    ]
  },
  {
    id: 'merc-anti-tank-communicant',
    name: 'Communicant Anti-Tank Hunter',
    factionId: 'mercenaries',
    allowedFactions: ['new-antioch', 'trench-pilgrims'],
    category: 'Mercenary',
    baseCost: 5, // 5 Glory Points
    stats: {
      movement: '6"',
      ranged: '+1 DICE',
      melee: '+1 DICE',
      armour: '-1',
      keywords: ['MERCENARY', 'REGENERATE 1', 'STRONG', 'TOUGH']
    },
    innateAbilities: [
      {
        id: 'iron-fists',
        name: 'Iron Fists',
        description: 'Unarmed melee attacks have CLEAVE 2 keyword.'
      }
    ]
  },
  {
    id: 'merc-goetic-warlock',
    name: 'Goetic Warlock',
    factionId: 'mercenaries',
    allowedFactions: ['heretic-legions', 'court-seven-serpents', 'black-grail'],
    category: 'Mercenary',
    baseCost: 4, // 4 Glory Points
    stats: {
      movement: '6"',
      ranged: '+1 DICE',
      melee: '+1 DICE',
      armour: '-2',
      keywords: ['MERCENARY', 'ARTIFICIAL', 'DEMONIC', 'FEAR']
    },
    innateAbilities: [
      {
        id: 'goetic-portal',
        name: 'Goetic Portal ACTION',
        description: 'ACTION: Redeploy anywhere within 6", dragging an adjacent enemy with them.'
      }
    ]
  },
  {
    id: 'merc-mamluk-faris',
    name: 'Mamluk Faris',
    factionId: 'mercenaries',
    allowedFactions: ['new-antioch', 'iron-sultanate'],
    category: 'Mercenary',
    baseCost: 4, // 4 Glory Points
    stats: {
      movement: '6"',
      ranged: '+1 DICE',
      melee: '+1 DICE',
      armour: '-2',
      keywords: ['MERCENARY', 'FIRETEAM']
    },
    innateAbilities: [
      {
        id: 'sworn-brethren',
        name: 'Sworn Brethren',
        description: 'Can form a Fireteam with 1 Elite warrior in the warband.'
      }
    ]
  },
  {
    id: 'merc-sin-eater',
    name: 'Sin Eater',
    factionId: 'mercenaries',
    allowedFactions: ['heretic-legions', 'court-seven-serpents', 'black-grail'],
    category: 'Mercenary',
    baseCost: 6, // 6 Glory Points
    stats: {
      movement: '6"',
      ranged: '-',
      melee: '+2 DICE',
      armour: '-2',
      keywords: ['MERCENARY', 'DEMONIC', 'FEAR', 'STRONG', 'TOUGH']
    },
    innateAbilities: [
      {
        id: 'devour-guilty',
        name: 'Devour the Guilty ACTION',
        description: 'ACTION: Devour an adjacent model into its bloated belly, digesting them until purged or killed.'
      }
    ]
  },
  {
    id: 'merc-observer',
    name: 'Observer',
    factionId: 'mercenaries',
    allowedFactions: ['new-antioch', 'trench-pilgrims'],
    category: 'Mercenary',
    baseCost: 3, // 3 Glory Points
    stats: {
      movement: '8"',
      ranged: '+1 DICE',
      melee: '+2 DICE',
      armour: '-1',
      keywords: ['MERCENARY']
    }
  },
  {
    id: 'merc-scripture-guardian',
    name: 'Scripture Guardian',
    factionId: 'mercenaries',
    allowedFactions: ['new-antioch', 'trench-pilgrims', 'iron-sultanate', 'heretic-legions', 'black-grail', 'court-seven-serpents'],
    category: 'Mercenary',
    baseCost: 7, // 7 Glory Points
    stats: {
      movement: '6"',
      ranged: '-',
      melee: '+1 DICE',
      armour: '-2',
      keywords: ['MERCENARY', 'GOLEM']
    }
  }
];

export const KEYWORDS: RuleKeyword[] = OFFICIAL_KEYWORDS.map((k) => ({
  id: `kw-${k.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  name: k.name,
  type: k.type,
  category: k.type || 'Rule Keyword',
  summary: k.description && k.description.length > 100 ? `${k.description.slice(0, 97)}...` : (k.description || ''),
  description: k.description || '',
  fullText: k.description || ''
}));

export const SCENARIOS: Scenario[] = OFFICIAL_SCENARIOS;

export const INJURY_TABLE_D66 = OFFICIAL_TRAUMA_TABLE.map((t) => ({
  roll: t.roll,
  title: t.title,
  name: t.title,
  effect: t.description,
  description: t.description,
  isDead: t.isDead
}));

export const EXPLORATION_TABLE_D66 = OFFICIAL_COMMON_EXPLORATION.map((e) => ({
  roll: e.roll,
  title: e.title,
  reward: e.reward,
  description: e.description
}));

export {
  OFFICIAL_SCENARIOS,
  OFFICIAL_KEYWORDS,
  OFFICIAL_TRAUMA_TABLE,
  OFFICIAL_COMMON_EXPLORATION,
  OFFICIAL_RARE_EXPLORATION,
  OFFICIAL_LEGENDARY_EXPLORATION,
  OFFICIAL_MELEE_SKILLS,
  OFFICIAL_RANGED_SKILLS,
  OFFICIAL_STEALTH_SKILLS,
  OFFICIAL_WILDCARD_SKILLS,
  OFFICIAL_CORE_RULES
};
