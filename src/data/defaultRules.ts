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

export const BASE_WEAPONS: WeaponProfile[] = [
  // ============================================================================
  // UNIVERSAL MELEE WEAPONS
  // ============================================================================
  {
    id: 'w-knife',
    name: 'Trench Knife',
    factionId: 'universal',
    type: 'Melee',
    hands: 1,
    range: 'Melee',
    modifiers: '-1 DICE',
    damage: 'Standard',
    keywords: ['Fast Strike'],
    cost: 1,
    description: 'Double-edged combat blade carried by every trench raider.'
  },
  {
    id: 'w-bayonet',
    name: 'Bayonet',
    factionId: 'universal',
    type: 'Melee',
    hands: 1,
    range: 'Melee',
    modifiers: '+0 DICE',
    damage: 'Standard',
    keywords: ['+1 on Charge', 'Shield Combo', 'Bayonet Lug'],
    cost: 2,
    description: 'Rifle-mounted spearhead providing reach and charge impalement.'
  },
  {
    id: 'w-club',
    name: 'Trench Club',
    factionId: 'universal',
    type: 'Melee',
    hands: 1,
    range: 'Melee',
    modifiers: '+0 DICE',
    damage: 'Concussive',
    keywords: ['Concussive'],
    cost: 3,
    description: 'Weighted spiked club designed to crack trench helmets in close quarters.'
  },
  {
    id: 'w-sword',
    name: 'Sword/Axe',
    factionId: 'universal',
    type: 'Melee',
    hands: 1,
    range: 'Melee',
    modifiers: '+1 DICE',
    damage: 'Slashing',
    keywords: ['+1 DICE', 'CRITICAL', 'Slashing'],
    cost: 4,
    description: 'Single-edged trench sword, sabre, or broad hand axe.'
  },
  {
    id: 'w-flail',
    name: 'Flail/Scourge',
    factionId: 'universal',
    type: 'Melee',
    hands: 1,
    range: 'Melee (2")',
    modifiers: '+0 DICE',
    damage: 'Concussive',
    keywords: ['Reach (2")', 'Concussive', 'Ignore Shield Cover'],
    cost: 5,
    description: 'Spiked chain flail that wraps around trench shields and barricades.'
  },
  {
    id: 'w-trench-pick',
    name: 'Trench Pick / Mattock',
    factionId: 'universal',
    type: 'Melee',
    hands: 1,
    range: 'Melee',
    modifiers: '+0 DICE',
    damage: 'Heavy',
    keywords: ['ARMOUR PIERCING 1', 'CRITICAL'],
    cost: 6,
    description: 'Narrow hardened steel spike designed to punch through heavy cuirasses.'
  },
  {
    id: 'w-polearm',
    name: 'Polearm / Spear',
    factionId: 'universal',
    type: 'Melee',
    hands: 2,
    range: 'Melee (2")',
    modifiers: '+1 DICE',
    damage: 'Standard',
    keywords: ['BLOCK', 'CUMBERSOME', 'Reach (2")', 'Shield Combo'],
    cost: 7,
    description: 'Long spear, halberd, or billhook providing standoff reach.'
  },
  {
    id: 'w-lance',
    name: 'Lance / Cavalry Spear',
    factionId: 'universal',
    type: 'Melee',
    hands: 2,
    range: 'Melee (2")',
    modifiers: '+2 DICE on Charge',
    damage: 'Heavy',
    keywords: ['Reach (2")', '+2 on Charge', 'CUMBERSOME'],
    cost: 8,
    description: 'Long couched lance delivering devastating kinetic energy on mounted or running charges.'
  },
  {
    id: 'w-great-hammer',
    name: 'Great Hammer / Maul',
    factionId: 'universal',
    type: 'Melee',
    hands: 2,
    range: 'Melee',
    modifiers: '+1 DICE, +1 INJURY DICE',
    damage: 'Severe (D3)',
    keywords: ['+1 INJURY DICE', 'HEAVY', 'CONCUSSIVE', 'ARMOUR PIERCING 1'],
    cost: 10,
    description: 'Two-handed sledgehammer designed to pulverize Machine Armour.'
  },
  {
    id: 'w-great-sword',
    name: 'Great Sword / Axe',
    factionId: 'universal',
    type: 'Melee',
    hands: 2,
    range: 'Melee',
    modifiers: '+2 DICE, +1 INJURY DICE',
    damage: 'Severe (D3)',
    keywords: ['+1 INJURY DICE', 'CRITICAL', 'HEAVY'],
    cost: 12,
    description: 'Massive executioner greatsword or battle axe cleaving through multiple foes.'
  },
  {
    id: 'w-executioner-blade',
    name: 'Executioner Blade',
    factionId: 'universal',
    type: 'Melee',
    hands: 2,
    range: 'Melee',
    modifiers: '+2 DICE, +1 INJURY DICE',
    damage: 'Severe (D3+1)',
    keywords: ['+1 INJURY DICE', 'CRITICAL', 'CUMBERSOME', 'DECAPITATE'],
    cost: 15,
    description: 'Weighted square-tipped greatsword honed to sever demonic necks in a single swing.'
  },
  {
    id: 'w-anti-tank-hammer',
    name: 'Anti-Tank Hammer',
    factionId: 'universal',
    allowedFactions: ['trench-pilgrims', 'iron-sultanate', 'new-antioch', 'heretic-legions'],
    type: 'Melee',
    hands: 2,
    range: 'Melee',
    modifiers: '+1 DICE, +1 INJURY DICE',
    damage: 'Severe (D3+1)',
    keywords: ['+1 INJURY DICE', 'CRITICAL', 'IGNORE ARMOUR', 'RISKY', 'DEMOLITION'],
    cost: 35,
    description: 'Hollow-charge impact hammer capable of breaching tank armor and crushing heavy constructs.'
  },
  {
    id: 'w-morningstar',
    name: 'Two-Handed Morningstar',
    factionId: 'universal',
    type: 'Melee',
    hands: 2,
    range: 'Melee',
    modifiers: '+1 DICE, +1 INJURY DICE',
    damage: 'Severe (D3)',
    keywords: ['+1 INJURY DICE', 'HEAVY', 'CONCUSSIVE'],
    cost: 10,
    description: 'Spiked iron ball on heavy staff delivering crushing bludgeoning blows.'
  },

  // ============================================================================
  // FACTION-SPECIFIC MELEE WEAPONS
  // ============================================================================
  {
    id: 'wep-titan-zulfiqar',
    name: 'Titan Zulfiqar',
    factionId: 'iron-sultanate',
    allowedUnits: ['Brazen Bull', 'Favoured Brazen Bull', 'Takwin Homunculus', 'Favoured Takwin Homunculus'],
    type: 'Melee',
    hands: 1,
    range: 'Melee',
    modifiers: '+2 INJURY MODIFIER',
    damage: 'Severe (D3)',
    keywords: ['+2 INJURY MODIFIER', 'CRITICAL', 'HEAVY'],
    cost: 30,
    description: 'Massive twin-bladed alchemical scimitar forged for siege constructs.'
  },
  {
    id: 'w-alchemical-scimitar',
    name: 'Alchemical Scimitar',
    factionId: 'iron-sultanate',
    type: 'Melee',
    hands: 1,
    range: 'Melee',
    modifiers: '+1 DICE',
    damage: 'Slashing',
    keywords: ['+1 DICE', 'CRITICAL'],
    cost: 15,
    description: 'Damascene steel blade tempered in alchemical oils that slices cleanly through armour.'
  },
  {
    id: 'w-misericordia',
    name: 'Misericordia',
    factionId: 'new-antioch',
    allowedUnits: ['Combat Medic', 'Sister of Saint Cosmas', 'Lieutenant'],
    type: 'Melee',
    hands: 1,
    range: 'Melee',
    modifiers: '+1 DICE',
    damage: 'Lethal',
    keywords: ['FINISH THE FALLEN', 'CRITICAL'],
    cost: 15,
    description: 'Narrow mercy dagger used by medics and officers to deliver the Emperor\'s peace.'
  },
  {
    id: 'w-blessed-halberd',
    name: 'Blessed Halberd',
    factionId: 'new-antioch',
    type: 'Melee',
    hands: 2,
    range: 'Melee (2")',
    modifiers: '+1 DICE',
    damage: 'Heavy',
    keywords: ['BLOCK', 'HOLY', 'Reach (2")'],
    cost: 12,
    description: 'Sanctified polearm inscribed with scripture and polished in holy water.'
  },
  {
    id: 'w-holy-reliquary-mace',
    name: 'Holy Reliquary Mace',
    factionId: 'trench-pilgrims',
    type: 'Melee',
    hands: 1,
    range: 'Melee',
    modifiers: '+1 DICE',
    damage: 'Concussive',
    keywords: ['CONCUSSIVE', 'NEGATE FEAR', 'HOLY'],
    cost: 18,
    description: 'Heavy gold-plated mace housing bone fragments of venerated trench martyrs.'
  },
  {
    id: 'w-sacred-flail',
    name: 'Sacred Flail of Flagellation',
    factionId: 'trench-pilgrims',
    type: 'Melee',
    hands: 1,
    range: 'Melee (2")',
    modifiers: '+0 DICE',
    damage: 'Slashing',
    keywords: ['Reach (2")', 'BLEED', 'IGNORE SHIELD'],
    cost: 8,
    description: 'Barbed multi-tailed scourge used in ecstatic penitence and combat.'
  },
  {
    id: 'w-cleansing-torch',
    name: 'Cleansing Fire Torch',
    factionId: 'trench-pilgrims',
    type: 'Melee',
    hands: 1,
    range: 'Melee',
    modifiers: '+0 DICE',
    damage: 'Fire',
    keywords: ['FIRE', 'IGNITE'],
    cost: 10,
    description: 'Brimstone-soaked iron brazier torch used to set heretics ablaze.'
  },
  {
    id: 'w-anchorite-piston',
    name: 'Anchorite Pneumatic Piston',
    factionId: 'trench-pilgrims',
    allowedUnits: ['Anchorite Shrine', 'Combat Medic'],
    type: 'Melee',
    hands: 1,
    range: 'Melee',
    modifiers: '+1 DICE, +2 INJURY MODIFIER',
    damage: 'Severe (D3+2)',
    keywords: ['+2 INJURY MODIFIER', 'HEAVY', 'IGNORE ARMOUR'],
    cost: 30,
    description: 'Steam-driven pile-driver mounted on walking reliquary shrines.'
  },
  {
    id: 'w-corrupted-chainblade',
    name: 'Corrupted Chainblade',
    factionId: 'heretic-legions',
    type: 'Melee',
    hands: 1,
    range: 'Melee',
    modifiers: '+1 DICE',
    damage: 'Slashing',
    keywords: ['+1 DICE', 'CRITICAL', 'BLEED'],
    cost: 15,
    description: 'Motorized serrated saw blade screeching with trapped infernal spirits.'
  },
  {
    id: 'w-daemonic-cleaver',
    name: 'Daemonic Cleaver',
    factionId: 'heretic-legions',
    type: 'Melee',
    hands: 2,
    range: 'Melee',
    modifiers: '+1 DICE, +1 INJURY DICE',
    damage: 'Severe (D3)',
    keywords: ['+1 INJURY DICE', 'CRITICAL', 'CORRUPTED'],
    cost: 20,
    description: 'Massive obsidian butcher knife forged in brimstone pits.'
  },
  {
    id: 'w-rusted-scythe',
    name: 'Rusted Scythe of Pestilence',
    factionId: 'black-grail',
    type: 'Melee',
    hands: 2,
    range: 'Melee (2")',
    modifiers: '+1 DICE',
    damage: 'Heavy',
    keywords: ['INFECTION', 'Reach (2")', 'BLEED'],
    cost: 12,
    description: 'Filthy jagged scythe coated in necrotizing bacterial slurry.'
  },
  {
    id: 'w-putrid-flail',
    name: 'Putrid Great Flail',
    factionId: 'black-grail',
    type: 'Melee',
    hands: 2,
    range: 'Melee (2")',
    modifiers: '+1 DICE',
    damage: 'Concussive',
    keywords: ['INFECTION', 'Reach (2")', 'IGNORE SHIELD'],
    cost: 10,
    description: 'Swinging censer vomiting clouds of flies and putrid ichor.'
  },

  // ============================================================================
  // UNIVERSAL RANGED WEAPONS
  // ============================================================================
  {
    id: 'wep-pistol',
    name: 'Pistol / Revolver',
    factionId: 'universal',
    type: 'Ranged',
    hands: 1,
    range: '12"',
    modifiers: '+0 DICE',
    damage: 'Standard',
    keywords: ['ASSAULT', 'PISTOL'],
    cost: 6,
    description: 'Reliable service revolver or semi-automatic sidearm.'
  },
  {
    id: 'w-heavy-pistol',
    name: 'Heavy Pistol / Hand Cannon',
    factionId: 'universal',
    type: 'Ranged',
    hands: 1,
    range: '12"',
    modifiers: '+0 DICE, +1 INJURY MODIFIER',
    damage: 'Heavy',
    keywords: ['ASSAULT', 'PISTOL', '+1 INJURY MODIFIER'],
    cost: 10,
    description: 'Large-calibre magnum sidearm delivering concussive stopping power.'
  },
  {
    id: 'w-auto-pistol',
    name: 'Automatic Pistol',
    factionId: 'universal',
    type: 'Ranged',
    hands: 1,
    range: '8"',
    modifiers: '+0 DICE',
    damage: 'Standard',
    keywords: ['ASSAULT', 'AUTOMATIC 2', 'PISTOL'],
    cost: 10,
    description: 'High-rate-of-fire machine pistol favored for storming trenches.'
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
    keywords: ['ASSAULT', 'BAYONET LUG'],
    cost: 10,
    description: 'Standard military rifle issued to millions across all trench sectors.'
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
    keywords: ['ASSAULT', 'AUTOMATIC 2', 'BAYONET LUG'],
    cost: 15,
    description: 'Gas-operated self-loading infantry rifle allowing rapid double taps.'
  },
  {
    id: 'wep-automatic-rifle',
    name: 'Automatic Rifle',
    factionId: 'universal',
    type: 'Ranged',
    hands: 2,
    range: '24"',
    modifiers: '+0 DICE',
    damage: 'Standard',
    keywords: ['ASSAULT', 'AUTOMATIC 2'],
    cost: 40,
    description: 'Heavy magazine-fed automatic combat rifle with Focused Fire.'
  },
  {
    id: 'w-shotgun',
    name: 'Shotgun',
    factionId: 'universal',
    type: 'Ranged',
    hands: 2,
    range: '12"',
    modifiers: '+1 DICE Point-Blank',
    damage: 'Standard',
    keywords: ['+1 DICE Point-Blank (≤6")', 'BAYONET LUG', 'SHIELD COMBO'],
    cost: 10,
    description: '12-gauge trench sweeper pump shotgun.'
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
    keywords: ['+1 DICE Point-Blank', 'ASSAULT', 'AUTOMATIC 2', 'SHIELD COMBO'],
    cost: 15,
    description: 'Drum-fed automatic shotgun capable of clearing entire bunker rooms.'
  },
  {
    id: 'w-trench-sweeper',
    name: 'Sawed-Off Shotgun',
    factionId: 'universal',
    type: 'Ranged',
    hands: 1,
    range: '8"',
    modifiers: '+1 DICE Point-Blank',
    damage: 'Standard',
    keywords: ['+1 DICE Point-Blank', 'ASSAULT', 'PISTOL'],
    cost: 8,
    description: 'Compact double-barrelled sawed-off shotgun fired one-handed.'
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
    keywords: ['ASSAULT', 'AUTOMATIC 2', 'LIMIT 2'],
    cost: 30,
    description: 'Rapid-firing 9mm trench submachine gun.'
  },
  {
    id: 'w-mg',
    name: 'Machine Gun',
    factionId: 'universal',
    type: 'Ranged',
    hands: 2,
    range: '24"',
    modifiers: '+1 DICE',
    damage: 'Heavy',
    keywords: ['AUTOMATIC 2', 'HEAVY', 'SUPPRESSIVE FIRE', 'LIMIT 2'],
    cost: 50,
    description: 'Belt-fed air-cooled squad automatic machine gun.'
  },
  {
    id: 'w-heavy-mg',
    name: 'Heavy Machine Gun',
    factionId: 'universal',
    type: 'Ranged',
    hands: 2,
    range: '36"',
    modifiers: '+1 DICE',
    damage: 'Heavy',
    keywords: ['AUTOMATIC 3', 'HEAVY', 'RELOAD', 'LIMIT 1'],
    cost: 60,
    description: 'Tripod-mounted heavy machine gun capable of pinning whole platoons.'
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
    keywords: ['PRECISION', 'HEAVY', 'CRITICAL', 'LIMIT 3'],
    cost: 35,
    description: 'Precision match-grade rifle fitted with high-power telescopic optics.'
  },
  {
    id: 'w-anti-materiel',
    name: 'Anti-Materiel Rifle',
    factionId: 'universal',
    type: 'Ranged',
    hands: 2,
    range: '36"',
    modifiers: '+0 DICE, +1 INJURY DICE',
    damage: 'Severe (D3+1)',
    keywords: ['+1 INJURY DICE', 'CRITICAL', 'HEAVY', 'IGNORE ARMOUR', 'LIMIT 1'],
    cost: 50,
    description: 'Massive long rifle designed to punch through engine blocks and Machine Armour.'
  },
  {
    id: 'wep-flamethrower',
    name: 'Flamethrower',
    factionId: 'universal',
    type: 'Ranged',
    hands: 2,
    range: '8"',
    modifiers: '-1 INJURY DICE',
    damage: 'Area',
    keywords: ['-1 INJURY DICE', 'FIRE', 'FLAMETHROWER', 'IGNORE ARMOUR', 'LIMIT 3'],
    cost: 30,
    description: 'Pressurized chemical projector firing streams of liquid fire.'
  },
  {
    id: 'w-heavy-flamethrower',
    name: 'Heavy Flamethrower',
    factionId: 'universal',
    type: 'Ranged',
    hands: 2,
    range: '12"',
    modifiers: 'Severe D3',
    damage: 'Severe (D3)',
    keywords: ['FIRE D3', 'FLAMETHROWER', 'HEAVY', 'IGNORE ARMOUR', 'IGNORE COVER', 'LIMIT 1'],
    cost: 55,
    description: 'Massive dual-tank chemical projector incinerating whole bunker sectors.'
  },
  {
    id: 'w-grenade-launcher',
    name: 'Grenade Launcher',
    factionId: 'universal',
    type: 'Ranged',
    hands: 2,
    range: '24"',
    modifiers: '+0 DICE',
    damage: 'Blast',
    keywords: ['BLAST 3"', 'SHRAPNEL', 'SCATTER'],
    cost: 40,
    description: 'Tubular launch system designed to lob explosive canisters into trench networks.'
  },
  {
    id: 'w-trench-mortar',
    name: 'Trench Mortar',
    factionId: 'universal',
    type: 'Ranged',
    hands: 2,
    range: '48"',
    modifiers: '+0 DICE',
    damage: 'Heavy Blast',
    keywords: ['INDIRECT', 'BLAST 3"', 'SHRAPNEL', 'HEAVY', 'LIMIT 1'],
    cost: 45,
    description: 'Indirect-fire high-angle mortar lobbing heavy shells over obstacles.'
  },

  // ============================================================================
  // FACTION-SPECIFIC RANGED WEAPONS
  // ============================================================================
  {
    id: 'wep-jezzail',
    name: 'Jezzail',
    factionId: 'iron-sultanate',
    type: 'Ranged',
    hands: 2,
    range: '18"',
    modifiers: '+1 DICE',
    damage: 'Standard',
    keywords: ['+1 DICE', 'ALCHEMICAL LOCK'],
    cost: 7,
    description: 'Long-barrelled rifled musket favored by Sultanate marksmen.'
  },
  {
    id: 'wep-siege-jezzail',
    name: 'Siege Jezzail',
    factionId: 'iron-sultanate',
    allowedFactions: ['iron-sultanate'],
    type: 'Ranged',
    hands: 2,
    range: '30"',
    modifiers: '+1 DICE, +1 INJURY DICE',
    damage: 'Heavy',
    keywords: ['+1 DICE', '+1 INJURY DICE', 'HEAVY'],
    cost: 30,
    description: 'High-caliber wall rifle designed to breach fortifications and heavy armour.'
  },
  {
    id: 'wep-flame-cannon',
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
  {
    id: 'wep-alchemical-jezzail',
    name: 'Alchemical Jezzail',
    factionId: 'iron-sultanate',
    type: 'Ranged',
    hands: 2,
    range: '18"',
    modifiers: '+1 DICE',
    damage: 'Standard',
    keywords: ['+1 DICE', 'ASSAULT'],
    cost: 25,
    description: 'Fine Sultanate firearm tuned for high mobility and rapid alchemical discharge.'
  },
  {
    id: 'w-halberd-gun',
    name: 'Halberd-Gun',
    factionId: 'iron-sultanate',
    type: 'Both',
    hands: 2,
    range: '18" / Melee (2")',
    modifiers: '+1 DICE',
    damage: 'Standard',
    keywords: ['+1 DICE', 'ASSAULT', 'Reach (2")', 'BLOCK'],
    cost: 20,
    description: 'Ingenious hybrid weapon combining an alchemical carbine with a heavy halberd head.'
  },
  {
    id: 'w-hellgun',
    name: 'Hellgun / Infernal Rifle',
    factionId: 'heretic-legions',
    type: 'Ranged',
    hands: 2,
    range: '24"',
    modifiers: '+0 DICE',
    damage: 'Fire',
    keywords: ['FIRE', 'CORRUPTED', 'ASSAULT'],
    cost: 25,
    description: 'Rifle bound with demonic fire that chars the target\'s soul.'
  },
  {
    id: 'w-ophidian-rifle',
    name: 'Ophidian Rifle',
    factionId: 'heretic-legions',
    type: 'Ranged',
    hands: 2,
    range: '30"',
    modifiers: '+1 DICE',
    damage: 'Poison',
    keywords: ['POISON', 'GAS', 'CRITICAL'],
    cost: 40,
    description: 'Serpentine rifle firing toxic venom darts that dissolve lung tissue.'
  },
  {
    id: 'w-bile-spewer',
    name: 'Bile Spewer',
    factionId: 'black-grail',
    type: 'Ranged',
    hands: 2,
    range: '12"',
    modifiers: '+0 DICE',
    damage: 'Acid',
    keywords: ['ACID', 'IGNORE ARMOUR', 'ASSAULT'],
    cost: 25,
    description: 'Organic projectile organ spewing corrosive stomach acid that eats through armor.'
  },
  {
    id: 'w-spore-projector',
    name: 'Virulent Spore Projector',
    factionId: 'black-grail',
    type: 'Ranged',
    hands: 2,
    range: '8"',
    modifiers: 'Infection',
    damage: 'Area Gas',
    keywords: ['GAS', 'INFECTION', 'IGNORE COVER'],
    cost: 30,
    description: 'Bellows firing swarms of flesh-eating spores into trench networks.'
  },

  // ============================================================================
  // GRENADES & EXPLOSIVES
  // ============================================================================
  {
    id: 'w-frag-grenades',
    name: 'Frag Grenades',
    factionId: 'universal',
    type: 'Ranged',
    hands: 1,
    range: '8"',
    modifiers: 'Blast',
    damage: 'Blast',
    keywords: ['BLAST 2"', 'SHRAPNEL', 'IGNORE LONG RANGE'],
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
    keywords: ['BLAST 2"', 'FIRE', 'LIMIT 2', 'IGNORE LONG RANGE'],
    cost: 15,
    description: 'White phosphorus grenades igniting everything within radius.'
  },
  {
    id: 'w-gas-grenades',
    name: 'Gas Grenades',
    factionId: 'universal',
    type: 'Ranged',
    hands: 1,
    range: '8"',
    modifiers: 'Gas Cloud',
    damage: 'Gas',
    keywords: ['GAS', 'BLAST 2"', 'IGNORE ARMOUR', 'IGNORE COVER', 'IGNORE LONG RANGE'],
    cost: 15,
    description: 'Pressurized glass canisters containing chlorine or mustard gas agents.'
  },
  {
    id: 'w-smoke-grenades',
    name: 'Smoke Grenades',
    factionId: 'universal',
    type: 'Ranged',
    hands: 1,
    range: '8"',
    modifiers: 'Smoke',
    damage: 'None',
    keywords: ['DEPLOYABLE', 'SMOKE 3"', 'IGNORE LONG RANGE'],
    cost: 10,
    description: 'Dense chemical smoke canisters creating a 3" sight-blocking cloud.'
  },
  {
    id: 'w-satchel-charge',
    name: 'Satchel Charge / Demolition Charge',
    factionId: 'universal',
    type: 'Ranged',
    hands: 1,
    range: '4"',
    modifiers: 'Severe (D3+1)',
    damage: 'Severe (D3+1)',
    keywords: ['+1 INJURY DICE', 'BLAST 3"', 'CONSUMABLE', 'IGNORE ARMOUR', 'SCATTER'],
    cost: 15,
    description: 'Canvas bag packed with ammonal or blasting gelatin to demolish pillboxes.'
  },
  {
    id: 'w-martyr-bomb',
    name: 'Martyr\'s Bomb Harness',
    factionId: 'trench-pilgrims',
    type: 'Melee',
    hands: 1,
    range: 'Melee',
    modifiers: 'Massive Explosion',
    damage: 'Severe (D3+2)',
    keywords: ['BLAST 3"', 'SACRIFICE', 'IGNORE ARMOUR', 'DEMOLITION'],
    cost: 15,
    description: 'Dynamite chest rig detonated in holy martyrdom to wipe out enemy shock troops.'
  }
];

export const BASE_ARMOUR: ArmourProfile[] = [
  {
    id: 'arm-standard',
    name: 'Standard Armour',
    factionId: 'universal',
    armourModifier: '-1 Injury Modifier',
    modifier: '-1 INJURY MODIFIER',
    category: 'Medium',
    cost: 15,
    description: 'Standard steel cuirass, padded gambeson, and iron gorget.'
  },
  {
    id: 'arm-reinforced',
    name: 'Reinforced Armour',
    factionId: 'universal',
    armourModifier: '-2 Injury Modifier',
    modifier: '-2 INJURY MODIFIER',
    category: 'Heavy',
    cost: 40,
    description: 'Full-plate harness layered with hardened steel inserts and spall liners.'
  },
  {
    id: 'arm-machine',
    name: 'Machine Armour',
    factionId: 'universal',
    allowedUnits: ['Mechanized Heavy Infantry', 'Anointed Heavy Infantry', 'Brazen Bull', 'Favoured Brazen Bull'],
    armourModifier: '-3 Injury Modifier',
    modifier: '-3 INJURY MODIFIER',
    category: 'Powered',
    cost: 50,
    description: 'Powered pneumatic exoskeleton plate. Sets base size to 40mm, Standfast: treats Down as Minor Wound.'
  },
  {
    id: 'arm-heavy-plate',
    name: 'Heavy Plate / Power Harness',
    factionId: 'new-antioch',
    armourModifier: '-3 Injury Modifier',
    modifier: '-3 INJURY MODIFIER',
    category: 'Powered',
    cost: 50,
    keywords: ['-3 INJURY MODIFIER', 'CUMBERSOME'],
    description: 'Full gothic plate offering extreme protection (-3 to Injury rolls) but limits mobility.'
  },
  {
    id: 'arm-alchemist',
    name: 'Alchemist Armour',
    factionId: 'iron-sultanate',
    allowedUnits: ['Jabirean Alchemist', 'Kasim bin Malik, the Living Engineer', 'Zayd bin Tariq al-Nahas'],
    armourModifier: '-2 Injury Modifier',
    modifier: '-2 INJURY MODIFIER',
    category: 'Heavy',
    cost: 50,
    keywords: ['NEGATE FIRE', 'NEGATE GAS'],
    description: 'Hermetically sealed alchemical hazard suit. -2 Injury Modifier, completely NEGATES FIRE and NEGATES GAS.'
  },
  {
    id: 'arm-trench-shield',
    name: 'Trench Shield',
    factionId: 'universal',
    armourModifier: '-1 Injury Modifier',
    modifier: '-1 INJURY MODIFIER',
    category: 'Shield',
    cost: 10,
    keywords: ['SHIELD', '-1 INJURY MODIFIER'],
    description: 'Heavy steel ballistic mantlet with firing viewport. Provides cover bonus from frontal arc.'
  },
  {
    id: 'arm-fire-shield',
    name: 'Fire Shield',
    factionId: 'iron-sultanate',
    armourModifier: '-1 Injury Modifier',
    modifier: '-1 INJURY MODIFIER',
    category: 'Shield',
    cost: 20,
    keywords: ['SHIELD', 'NEGATE FIRE', '-1 INJURY MODIFIER'],
    description: 'Alchemically treated shield negating fire damage and providing -1 Injury Modifier.'
  },
  {
    id: 'arm-pavise',
    name: 'Pavise / Deployable Mantlet',
    factionId: 'universal',
    armourModifier: '-2 Cover Modifier',
    modifier: '-2 COVER MODIFIER',
    category: 'Shield',
    cost: 15,
    keywords: ['DEPLOYABLE', 'HEAVY COVER'],
    description: 'Massive freestanding wooden and iron mantlet anchored into the mud.'
  },
  {
    id: 'arm-spiked-shield',
    name: 'Spiked Shield of the Damned',
    factionId: 'heretic-legions',
    armourModifier: '-1 Injury Modifier',
    modifier: '-1 INJURY MODIFIER',
    category: 'Shield',
    cost: 15,
    keywords: ['SHIELD', 'MELEE REFLECT'],
    description: 'Barbed iron shield that inflicts Blood Markers on charging attackers.'
  },
  {
    id: 'arm-hairshirt',
    name: 'Martyr\'s Hairshirt / Zealot Rags',
    factionId: 'trench-pilgrims',
    armourModifier: '0',
    modifier: '0',
    category: 'Light',
    cost: 5,
    keywords: ['+1 COURAGE', 'NEGATE FEAR'],
    description: 'Penitential rough horsehair garment granting divine fortitude against horror.'
  },
  {
    id: 'arm-daemon-plate',
    name: 'Daemon-Forged Plate',
    factionId: 'heretic-legions',
    armourModifier: '-2 Injury Modifier',
    modifier: '-2 INJURY MODIFIER',
    category: 'Heavy',
    cost: 45,
    keywords: ['-2 INJURY MODIFIER', 'DEMONIC RESISTANCE'],
    description: 'Living armor forged with brimstone and hellfire, deflecting holy ammunition.'
  },
  {
    id: 'arm-plague-carapace',
    name: 'Plague-Hardened Carapace',
    factionId: 'black-grail',
    armourModifier: '-2 Injury Modifier',
    modifier: '-2 INJURY MODIFIER',
    category: 'Heavy',
    cost: 35,
    keywords: ['-2 INJURY MODIFIER', 'REGENERATE 1'],
    description: 'Chitinous calcified boils that absorb projectile impacts and knit flesh.'
  }
];

export const BASE_EQUIPMENT: EquipmentItem[] = [
  {
    id: 'eq-gas-mask',
    name: 'Gas Mask / Filter Respirator',
    cost: 5,
    factionId: 'universal',
    effect: 'NEGATE GAS: Wearer is completely immune to toxic gas effects and chemical hazard weapons.',
    keywords: ['NEGATE GAS']
  },
  {
    id: 'eq-combat-helmet',
    name: 'Combat Helmet',
    cost: 10,
    factionId: 'universal',
    effect: 'NEGATE SHRAPNEL: Negates the bonus Injury dice from explosive shrapnel and blast weapons.',
    keywords: ['NEGATE SHRAPNEL']
  },
  {
    id: 'eq-medikit',
    name: 'Medikit',
    cost: 15,
    factionId: 'universal',
    effect: 'ACTION: Treat a friendly model within 1" to remove 1 Blood Marker or attempt to revive a Downed model.',
    keywords: ['TREAT ACTION']
  },
  {
    id: 'eq-surgical-kit',
    name: 'Field Surgical Kit',
    cost: 20,
    factionId: 'universal',
    effect: 'ACTION: +1 DICE to Treat actions and revive Downed models on a 2+ on D6.',
    keywords: ['ADVANCED TREAT']
  },
  {
    id: 'eq-binoculars',
    name: 'Binoculars / Rangefinder',
    cost: 5,
    factionId: 'universal',
    effect: 'Spotter Action: Designate an enemy model in Line of Sight to grant friendly units +1 DICE Ranged attacks against it.',
    keywords: ['SPOTTER ACTION']
  },
  {
    id: 'eq-sniper-scope',
    name: 'Sniper Scope',
    cost: 10,
    factionId: 'universal',
    effect: 'Enhanced Accuracy: Attached rifle gains the IGNORE LONG RANGE keyword.',
    keywords: ['IGNORE LONG RANGE']
  },
  {
    id: 'eq-shovel',
    name: 'Entrenching Shovel',
    cost: 5,
    factionId: 'universal',
    effect: 'Dug In: Model starting on open ground has the COVER keyword until it moves. Can be used as a 2H melee weapon.',
    keywords: ['DUG IN', 'MELEE WEAPON']
  },
  {
    id: 'eq-mountaineer-kit',
    name: 'Mountaineer Kit / Climbing Gear',
    cost: 10,
    factionId: 'universal',
    effect: 'Grants +1 DICE on Risky rolls when climbing vertical terrain pieces and scaling ruins.',
    keywords: ['+1 DICE (CLIMBING)']
  },
  {
    id: 'eq-wire-cutters',
    name: 'Wire Cutters',
    cost: 5,
    factionId: 'universal',
    effect: 'Ignores movement penalties and hazards when traversing barbed wire or razorwire terrain.',
    keywords: ['IGNORE WIRE']
  },
  {
    id: 'eq-flare-gun',
    name: 'Flare Gun / Star Shell',
    cost: 8,
    factionId: 'universal',
    effect: 'Action: Illuminate an area within 18" to strip Cover and reveal Infiltrators.',
    keywords: ['ILLUMINATE']
  },
  {
    id: 'eq-cloak-alamut',
    name: 'Cloak of Alamut',
    cost: 25,
    factionId: 'iron-sultanate',
    effect: 'Blend In: Ranged attack modifier for Cover is -2 DICE instead of -1 DICE when wearing this cloak.',
    keywords: ['CAMOUFLAGE']
  },
  {
    id: 'eq-wind-amulet',
    name: 'Wind Amulet',
    cost: 10,
    factionId: 'iron-sultanate',
    effect: 'Gusts of Wind: Once per match, add +3" to Movement Characteristic for the activation.',
    keywords: ['SPEED']
  },
  {
    id: 'eq-alchemical-ammo',
    name: 'Alchemical Ammunition',
    cost: 3,
    factionId: 'iron-sultanate',
    effect: 'Adds +1 DICE to attacks with Jezzail, Siege Jezzail, or Halberd-Gun for one match.',
    keywords: ['AMMUNITION (+1 DICE)']
  },
  {
    id: 'eq-ap-bullets',
    name: 'Armour-Piercing Bullets',
    cost: 10,
    factionId: 'universal',
    effect: 'Consumable: Grants IGNORE ARMOUR on a single ranged shooting attack.',
    keywords: ['AMMUNITION (ARMOUR-PIERCING)', 'CONSUMABLE']
  },
  {
    id: 'eq-holy-water-bullets',
    name: 'Holy Water / Blessed Ammunition',
    cost: 10,
    factionId: 'trench-pilgrims',
    effect: 'Consumable: Grants +1 INJURY DICE against Demonic and Heretical targets.',
    keywords: ['AMMUNITION (BLESSED 1)', 'CONSUMABLE']
  },
  {
    id: 'eq-elixir-al-khidr',
    name: 'Elixir of Al-Khidr',
    cost: 10,
    factionId: 'iron-sultanate',
    effect: 'Consumable: Warrior gains the TOUGH keyword for the rest of the game.',
    keywords: ['CONSUMABLE', 'TOUGH']
  },
  {
    id: 'eq-holy-water-phial',
    name: 'Holy Water Phial',
    cost: 5,
    factionId: 'universal',
    effect: 'Consumable: Throw at an enemy in 6" to inflict D3 Blood Markers on Demonic/Heretic models.',
    keywords: ['CONSUMABLE', 'HOLY']
  },
  {
    id: 'eq-blessed-rosary',
    name: 'Blessed Rosary / Crucifix',
    cost: 10,
    factionId: 'universal',
    effect: 'Wearer negates FEAR and gains +1 DICE on all Courage and Morale tests.',
    keywords: ['NEGATE FEAR', '+1 COURAGE']
  },
  {
    id: 'eq-true-cross-relic',
    name: 'Relic of the True Cross',
    cost: 25,
    factionId: 'universal',
    effect: 'Once per match, reroll one failed Armour Save or Action Test.',
    keywords: ['RELIC', 'REROLL']
  },
  {
    id: 'eq-horn-gabriel',
    name: 'Horn of Gabriel',
    cost: 15,
    factionId: 'new-antioch',
    effect: 'Action: Blow horn to immediately rally all friendly Downed or shaken models within 8".',
    keywords: ['RALLY ACTION']
  },
  {
    id: 'eq-unholy-idol',
    name: 'Unholy Idol / Blasphemous Talisman',
    cost: 15,
    factionId: 'heretic-legions',
    effect: 'Enemies within 6" must pass a Risky Test before declaring charges against the bearer.',
    keywords: ['RISKY CHARGE']
  },
  {
    id: 'eq-ammo-satchel',
    name: 'Munitions Satchel / Ammo Stash',
    cost: 10,
    factionId: 'universal',
    effect: 'Ignore the first Fumble / Jam (natural roll of 1) during shooting attacks.',
    keywords: ['IGNORE FUMBLE']
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

export const SCENARIOS: Scenario[] = [...OFFICIAL_SCENARIOS, ...ALL_OUT_WAR_SCENARIOS];

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
