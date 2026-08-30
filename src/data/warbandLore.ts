import { ActiveUnit, Warband, WarbandSnapshot, StashedItem } from '../types/warband';
import { MatchRecord } from '../types/campaign';

export interface KnownUnitLore {
  matchPatterns: string[];
  titles: string[];
  quote: string;
  biography: string;
  deeds: string[];
}

export const KNOWN_UNIT_LORES: KnownUnitLore[] = [
  {
    matchPatterns: ['kasim', 'living engineer', 'malik'],
    titles: ['The Living Engineer', 'Master of Construction', 'Al-Sahir al-Nahas (The Copper Sorcerer)'],
    quote: 'In these wastes, we use the tools we have. The Sultanate gave us a Wall; I gave us a monster made from those who tried to tear it down.',
    biography: `Master alchemist, field architect, and commander of the Al-Qarn Rihla of Bayt al-Nahas al-Hamra.

Severely wounded in the leg by Hell Knight Ugar's ophidian rifle during the assault on the ruined Laboratory of the Gilded Rose, Kasim forged an ornate, rune-inscribed suit of masterwork Alchemist Armour built specifically to support his injury. Following the expedition's discovery of the ancient *Book of Golems* in the salt wastes, Kasim has transcended conventional alchemy into the miraculous art of biological artifice and clay golem creation.`,
    deeds: [
      'Felled enemy Hell Knight Mephistolon at long range with a devastating volley of gas sniper ammunition in Turn 1 (Sniper Glorious Deed).',
      'Orchestrated the reconstruction of Al-Masyukh from harvested demonic flesh of slain wretched and yoke fiends.',
      'Discovered and deciphered the sacred leather-bound Book of Golems in the Al-Nafud Marches.'
    ]
  },
  {
    matchPatterns: ['zayd', 'tariq', 'al-nahas'],
    titles: ['Apprentice of the Gilded Rose', 'Marksman of the Red Sands'],
    quote: 'Align the alembic sights; let the wind carry the copper verdict.',
    biography: `Kasim's most promising apprentice, specialized in extreme-range ballistic alchemy and precise sniper fire. 

Equipped with a high-velocity Sniper Rifle and heavy reinforced plate armour to endure counter-battery fire across the exposed dunes of the Al-Nafud Marches.`,
    deeds: [
      'Provided pinpoint sniper suppression during the assault on the Sun-Drenched Laboratory.',
      'Secured long-range firing lanes against enemy heavy infantry.'
    ]
  },
  {
    matchPatterns: ['al-qahhar', 'crippled', 'brazen bull'],
    titles: ['The Crippled', 'The Unbroken Forge', 'Shield of Kasim'],
    quote: 'The furnace within burns hotter than the fires of the Pit.',
    biography: `A towering mechanized war-beast and mobile alchemical furnace of Bayt al-Nahas.

Lost its primary left mechanical arm in ferocious close-quarters combat against demonic fiends. Al-Qahhar wears a sacred alchemical gold chain bearing a gigantic emerald—the Wind Amulet—which deflects incoming projectile fire while it charges with its Flame Cannon and Titan Zulfiqar.`,
    deeds: [
      'Upon seeing Master Kasim fall, charged into the fray and stood over his injured body, single-handedly incinerating a yoke fiend and two wretched fiends to claim victory.',
      'Awarded Elite Promotion and the Wind Amulet emerald for unwavering loyalty.',
      'Sustained a severed arm in close-quarters defense and continued fighting to secure the retreat.'
    ]
  },
  {
    matchPatterns: ['idris', 'relic hound', 'favoured kavass'],
    titles: ['The Relic Hound', 'Studied Blade', 'Lieutenant of the Kavass'],
    quote: 'I stood in the sorcerer\'s shadow and walked away with his sacred gold.',
    biography: `Promoted to Lieutenant after displaying legendary courage against Sorcerer Zortan. 

Proudly wears a recovered relic golden mantle over his reinforced plate armour and wields a master-crafted sword alongside his heavy Jezzail loaded with volatile alchemical rounds.`,
    deeds: [
      'On the final turn of battle, charged directly under the nose of Sorcerer Zortan to snatch a sacred reliquary, winning the double-reliquary campaign objective.',
      'Awarded the Relic Golden Mantle and promoted to Elite Kavass Lieutenant.',
      'Mastered the Studied Blade technique after surviving close combat against demonic entities.'
    ]
  },
  {
    matchPatterns: ['al-masyukh', 'hunter of hunters', 'takwin'],
    titles: ['Hunter of Hunters', 'The Amalgam of Wrath', 'Three-Armed Behemoth'],
    quote: '[Deep, guttural resonance of breathing through twin copper-masked throats]',
    biography: `A hulking, three-armed gargantuan monstrosity synthesized by Kasim from harvested demon-flesh and blessed alchemical clay.

Equipped with a Titan Zulfiqar, Great Sword, Fire Shield, and Siege Jezzail, Al-Masyukh serves as the unstoppable front-line vanguard and living terror of Bayt al-Nahas.`,
    deeds: [
      'Tanked concentrated enemy fire and swept the center of the battlefield with colossal swings of its twin master-blades.',
      'Single-handedly breached the perimeter during the expedition through the Salt Wastes.'
    ]
  },
  {
    matchPatterns: ['nasir', 'inaccurate'],
    titles: ['The Inaccurate', 'Faithful Gunner'],
    quote: 'If one bullet does not find the heretic, the next ten surely will.',
    biography: `A veteran Kavass whose enthusiastic volume of fire more than compensates for his questionable marksmanship. Equipped with a standard Jezzail and trench knife.`,
    deeds: [
      'Held the left trench traverse against oncoming swarms through unrelenting suppressive fire.'
    ]
  },
  {
    matchPatterns: ['rafiq', 'incinerator'],
    titles: ['The Incinerator', 'Purifier of the Trenches'],
    quote: 'Cleanse the mud; leave only ash.',
    biography: `Armed with a heavy Flamethrower, Rafiq clears fortified bunkers and entrenched demonic swarms in close quarters with alchemical napalm.`,
    deeds: [
      'Scorched clean an infested bunker during the approach to Redoubt 9.'
    ]
  },
  {
    matchPatterns: ['dhi’b', 'dhi\'b', 'lion of jabir'],
    titles: ['The Wolf of the Red Sands', 'Iron Hound of the Wastes'],
    quote: '[Mechanical roar echoed across the trenchlines]',
    biography: `A fearsome mechanical lion of brass and muscle. Disabled in heroic melee against Zortan's burning blade, but painstakingly repaired and blessed with a protective Wind Amulet.`,
    deeds: [
      'Scouted ahead into No Man\'s Land and intercepted demonic skirmishers before they could flank Master Kasim.'
    ]
  },
  {
    matchPatterns: ['needle', 'sultanate sapper'],
    titles: ['Architects of Ruin', 'The Two-Man Battery'],
    quote: 'Range calculated. Load the blessed siege shell.',
    biography: `A veteran two-man sapper crew operating a massive Siege Jezzail with alchemical ammunition to demolish heretic fortifications and tear open heavy armour.`,
    deeds: [
      'Directly cracked the fortified wall of the Sun-Drenched Laboratory at 24" range.'
    ]
  },
  {
    matchPatterns: ['jawhar', 'mamluk faris'],
    titles: ['The Gilded Blade', 'Janissary Champion'],
    quote: 'My blade belongs to the highest cause—and the richest treasury.',
    biography: `A veteran mercenary of immense skill, armored in dazzling Janissary-style copper and gold filigree. He has pledged his blade to Kasim in exchange for glory and treasures from the lost wastes.`,
    deeds: [
      'Hired into the expedition for 4 Glory Points following the victory at the Al-Nafud ruins.',
      'Led the vanguard charge across the toxic silt beds.'
    ]
  }
];

export const SULTANATE_WARBAND_LORE = {
  name: 'Al-Qarn Rihla',
  patron: 'House of Wisdom • Sublime Gate (House of the Red Copper)',
  motto: 'The Wall may forget, but the Copper remembers!',
  lore: `# The Al-Qarn Rihla (The Journey of the Century)
**House of the Red Copper (Bayt al-Nahas al-Hamra)**

Originating from the ancestral crimson dunes of the **Al-Nafud Marches**, Bayt al-Nahas al-Hamra was once among the premier alchemical noble houses of the Iron Sultanate. When the Great Iron Wall was erected, their ancestral workshops—including the famed **Laboratory of the Gilded Rose**—were walled *out* into the brutal, demonic wastes.

Every hundred years, the house mounts the **Al-Qarn Rihla**: an all-out, heavily armed alchemical expedition into No Man's Land to recover lost ancestral treatises, harvest demonic anatomical specimens, and reclaim the glory of the Red Copper.

Led by the brilliant and ruthless alchemist **Kasim bin Malik, the Living Engineer**, the warband blends advanced Sultanate ballistics with forbidden biological artifice, fielding clockwork war-beasts and flesh-grafted Takwin horrors bound in copper runes.`,
  chronicleLog: [
    'July 2026 Gator: Kasim deciphers the ancient Book of Golems; Al-Masyukh ascends to Favoured Elite with Siege Jezzail & Fire Shield.',
    '10 June 2026: 3-Force Skirmish Victory; Al-Masyukh undergoes massive Takwin synthesis into a 60mm Regenerative Behemoth.',
    'June 2026: Expedition Departure: The Al-Qarn Rihla musters 9 warriors at the Great Iron Wall under the banner of Bayt al-Nahas al-Hamra.'
  ]
};

export const SULTANATE_MATCH_HISTORY: MatchRecord[] = [
  {
    id: 'match-hist-1',
    campaignId: 'camp-default',
    date: '10 June 2026',
    scenarioId: 'scen-relic-hunt',
    scenarioName: '3 Force Match: Siege of the Sun-Drenched Laboratory',
    participants: [
      {
        warbandId: 'wb-al-qarn',
        warbandName: 'Al-Qarn Rihla',
        playerName: 'Kasim bin Malik',
        result: 'Victory',
        gloryGained: 3,
        ducatsGained: 180,
        casualties: [
          {
            unitId: 'u-kasim',
            unitName: 'Kasim bin Malik',
            outcome: 'D66 Roll: 31 - Leg Wound',
            isDead: false
          },
          {
            unitId: 'u-dhib',
            unitName: 'Dhi’b al-Nafud',
            outcome: 'D66 Roll: 11 - Full Recovery (Repaired)',
            isDead: false
          }
        ]
      },
      {
        warbandId: 'wb-court-zortan',
        warbandName: 'Court of the Seven-Headed Serpent',
        playerName: 'Sorcerer Zortan',
        result: 'Defeat',
        gloryGained: 0,
        ducatsGained: 40,
        casualties: [
          {
            unitId: 'u-zortan-w1',
            unitName: 'Wretched Fiend',
            outcome: 'Dead (Flesh Harvested for Takwin)',
            isDead: true
          },
          {
            unitId: 'u-zortan-y1',
            unitName: 'Yoke Fiend',
            outcome: 'Dead (Flesh Harvested for Takwin)',
            isDead: true
          }
        ]
      }
    ],
    narrativeLog: 'Decisive 13-4 Sultanate Victory. Recovered 2 reliquaries, took down Hell Knight Mephistolon, and harvested demon corpses.',
    narrativeReport: `### Battle Report: The Siege of the Sun-Drenched Laboratory
**Location:** Ruined Laboratory of the Gilded Rose, Al-Nafud Marches
**Result:** 13-4 Sultanate Victory (Al-Qarn Rihla vs. Court of the Seven-Headed Serpent)

#### Turn 1: Opening Salvoes
The Takwin creations—the Brazen Bull and Lion of Jabir—scouted forward across the red sand dunes. Spotting the enemy Hell Knight Mephistolon occupying an elevated ruin, Master Kasim bin Malik aligned his automatic rifle sights and discharged a devastating volley of alchemical gas ammunition. The Hell Knight collapsed under the corrosive cloud, earning Kasim a glorious Sniper deed.

#### Turn 2: The Charge of the Sorcerer
Sorcerer Zortan hurled hellfire and charged with his burning blade, disabling the mechanical Lion of Jabir. Simultaneously, Hell Knight Ugar fired an Ophidian Rifle round through Kasim's thigh, causing a severe leg wound.

#### Turn 3: The Stand of the Brazen Bull
Seeing his master fall wounded in the silt, Al-Qahhar the Brazen Bull roared, standing directly over Kasim's body. Sweeping with its Titan Zulfiqar and roaring with its Flame Cannon, the Bull incinerated two Wretched fiends and broke the enemy line.

#### Turn 4: The Relic Snatch
On the final turn, Kavass Idris executed a daring sprint under the shadow of Sorcerer Zortan himself, snatching the second holy reliquary from the altar and securing a crushing 13-4 victory.

#### Post-Battle Expedition Rewards
- **Promotions:** Al-Qahhar and Idris both achieved Elite Promotions.
- **Takwin Harvest:** Demonic corpses harvested to synthesize the gargantuan behemoth *Al-Masyukh*.`,
    mvpUnitName: 'Al-Qahhar, the Crippled & Idris the Relic Hound',
    opponentWarbandName: 'Court of the Seven-Headed Serpent (Sorcerer Zortan)'
  },
  {
    id: 'match-hist-2',
    campaignId: 'camp-default',
    date: 'July 2026',
    scenarioId: 'scen-trench-raid',
    scenarioName: 'July 2026 Gator: The Chronicle of the Book of Golems',
    participants: [
      {
        warbandId: 'wb-al-qarn',
        warbandName: 'Al-Qarn Rihla',
        playerName: 'Kasim bin Malik',
        result: 'Victory',
        gloryGained: 2,
        ducatsGained: 140,
        casualties: []
      }
    ],
    narrativeLog: 'Exploration in the salt wastes uncloaked the legendary Book of Golems. Al-Qahhar lost an arm in combat but all warriors made full recoveries.',
    narrativeReport: `### Battle Report: July 2026 Gator Engagement
**Location:** Mist-Shrouded Wastes of the Al-Nafud
**Result:** Tactical Sultanate Victory & Artifact Recovery

#### Summary of Engagement
The Al-Qarn Rihla clashed in a three-way skirmish over ancient vault conduits. Al-Masyukh the three-armed Homunculus proved its terrifying worth, smashing through heretic shock troops. Al-Qahhar suffered a severed arm in heavy melee but held the line with its Flame Cannon.

#### The Discovery of the Book of Golems
During the post-battle exploration of the sunken conduit chambers, Kasim's scholars uncloaked an ancient, leather-bound artifact: **The Book of Golems**. 

This discovery marks a turning point for Bayt al-Nahas al-Hamra. Kasim is no longer merely an alchemist—he is now a true **Master of Construction**, synthesizing clay golem rites with Sultanate mechanical artifice.`,
    mvpUnitName: 'Al-Masyukh, Hunter of Hunters',
    opponentWarbandName: 'Iron Crusade & Heretic Skirmishers'
  }
];

// ----------------------------------------------------------------------------
// 1. SNAPSHOT 1: FOUNDING CAMPAIGN MUSTER (799 Ducats | 4 Glory)
// ----------------------------------------------------------------------------
const SNAPSHOT_1_UNITS: ActiveUnit[] = [
  {
    id: 'snap1-u-kasim',
    customName: 'Kasim bin Malik',
    baseProfileId: 'unit-jabirean-alchemist',
    profileSnapshot: {
      id: 'unit-jabirean-alchemist',
      name: 'Jabirean Alchemist',
      factionId: 'iron-sultanate',
      category: 'Leader',
      baseCost: 55,
      stats: { movement: '6"', ranged: '+2 DICE', melee: '+1 DICE', armour: '-2', baseSize: '32mm' },
      innateAbilities: [
        { id: 'ab-mastery', name: 'Mastery of the Elements', description: 'Deploy with FIRE, GAS, or SHRAPNEL on all weapons.' },
        { id: 'ab-elem-change', name: 'Elemental Change', description: 'ACTION: Change elemental keyword on all weapons.' },
        { id: 'ab-medicine', name: 'School of Medicine', description: 'ACTION: +1 DICE to heal 2 Blood Markers or stand up Downed friendly model.' }
      ]
    },
    equippedWeapons: [
      { instanceId: 'w-auto-rifle-1', id: 'wep-automatic-rifle', name: 'Automatic Rifle', factionId: 'iron-sultanate', type: 'Ranged', range: '24"', modifiers: '+0 DICE', cost: 40, keywords: ['ASSAULT', 'AUTOMATIC 2'], description: 'Focused Fire' },
      { instanceId: 'w-sword-1', id: 'wep-sword-axe', name: 'Sword/Axe', factionId: 'iron-sultanate', type: 'Melee', range: 'Melee', modifiers: '+0 DICE', cost: 4, keywords: ['CRITICAL'] }
    ],
    equippedArmour: [
      { instanceId: 'a-alch-armour-1', id: 'arm-alchemist', name: 'Alchemist Armour', factionId: 'iron-sultanate', category: 'Heavy', modifier: '-2 INJURY MODIFIER', cost: 50, keywords: ['NEGATE FIRE', 'NEGATE GAS'], description: 'Protection From Harm' }
    ],
    equippedEquipment: [
      { instanceId: 'eq-gasmask-1', id: 'eq-gas-mask', name: 'Gas Mask', cost: 5, effect: 'NEGATE GAS', keywords: ['NEGATE GAS'] },
      { instanceId: 'eq-elixir-1', id: 'eq-elixir-al-khidr', name: 'Elixir of Al-Khidr', cost: 10, effect: 'TOUGH for rest of game', keywords: ['CONSUMABLE', 'TOUGH'] }
    ],
    xp: 0,
    advancements: [],
    injuries: ['Leg Wound [31] (-2" Move, -1 DICE to Dash)'],
    isDead: false,
    totalCost: 179,
    currentWounds: 1,
    maxWounds: 1,
    bloodMarkers: 0,
    status: 'Active',
    hasActedThisTurn: false
  },
  {
    id: 'snap1-u-bull',
    customName: 'Al-Qahhar',
    baseProfileId: 'unit-brazen-bull',
    profileSnapshot: {
      id: 'unit-brazen-bull',
      name: 'Favoured Brazen Bull',
      factionId: 'iron-sultanate',
      category: 'Elite',
      baseCost: 100,
      stats: { movement: '6"', ranged: '+0 DICE', melee: '+2 DICE', armour: '-3', baseSize: '60mm' },
      innateAbilities: [
        { id: 'ab-art-life', name: 'Artificial Life', description: '-1 INJURY DICE to Injury Rolls for a Brazen Bull.' },
        { id: 'ab-trample', name: 'Trample', description: 'ACTION: Melee Attack vs Downed model ignoring armour.' }
      ]
    },
    equippedWeapons: [
      { instanceId: 'w-flame-cannon-1', id: 'wep-flame-cannon', name: 'Flame Cannon', factionId: 'iron-sultanate', type: 'Ranged', range: '12"', modifiers: '+0 DICE', cost: 60, keywords: ['FIRE', 'HEAVY', 'IGNORE ARMOUR'], description: 'Greek Fire 12" line attack' },
      { instanceId: 'w-titan-zulfiqar-1', id: 'wep-titan-zulfiqar', name: 'Titan Zulfiqar', factionId: 'iron-sultanate', type: 'Melee', range: 'Melee', modifiers: '+2 INJURY MODIFIER', cost: 30, keywords: ['CRITICAL', 'HEAVY'] },
      { instanceId: 'w-shield-bull-1', id: 'arm-trench-shield', name: 'Trench Shield', factionId: 'iron-sultanate', type: 'Melee', range: 'Melee', modifiers: '-1 INJURY MODIFIER', cost: 10, keywords: ['SHIELD'] }
    ],
    equippedArmour: [
      { instanceId: 'a-reinf-bull-1', id: 'arm-reinforced', name: 'Reinforced Armour', factionId: 'iron-sultanate', category: 'Heavy', modifier: '-2 INJURY MODIFIER', cost: 40, keywords: [] }
    ],
    equippedEquipment: [
      { instanceId: 'eq-wind-bull-1', id: 'eq-wind-amulet', name: 'Wind Amulet', cost: 10, effect: '+3" Movement on activation', keywords: [] }
    ],
    xp: 0,
    advancements: [],
    injuries: [],
    isDead: false,
    totalCost: 250,
    currentWounds: 1,
    maxWounds: 1,
    bloodMarkers: 0,
    status: 'Active',
    hasActedThisTurn: false
  },
  {
    id: 'snap1-u-idris',
    customName: 'Idris the Relic Hound',
    baseProfileId: 'unit-azeb',
    profileSnapshot: {
      id: 'unit-azeb',
      name: 'Favoured Kavass',
      factionId: 'iron-sultanate',
      category: 'Elite',
      baseCost: 25,
      stats: { movement: '6"', ranged: '+0 DICE', melee: '-1 DICE', armour: '-1', baseSize: '25mm' },
      innateAbilities: [
        { id: 'ab-fireteam-idris', name: 'Fireteam: Mamluk-Guarded', description: 'Coordinated Engagement simultaneous activation with Mamluk Faris.' }
      ]
    },
    equippedWeapons: [
      { instanceId: 'w-jezzail-idris-1', id: 'wep-jezzail', name: 'Jezzail', factionId: 'iron-sultanate', type: 'Ranged', range: '18"', modifiers: '+1 DICE', cost: 7, keywords: [] },
      { instanceId: 'w-club-idris-1', id: 'wep-trench-club', name: 'Trench Club', factionId: 'iron-sultanate', type: 'Melee', range: 'Melee', modifiers: '+0 DICE', cost: 3, keywords: [] }
    ],
    equippedArmour: [
      { instanceId: 'a-std-idris-1', id: 'arm-standard', name: 'Standard Armour', factionId: 'iron-sultanate', category: 'Medium', modifier: '-1 INJURY MODIFIER', cost: 15, keywords: [] }
    ],
    equippedEquipment: [
      { instanceId: 'eq-alch-ammo-idris-1', id: 'eq-alchemical-ammo', name: 'Alchemical Ammunition', cost: 3, effect: '+1 DICE to Jezzail', keywords: ['AMMUNITION (+1 DICE)'] },
      { instanceId: 'eq-alch-ammo-idris-loaded-1', id: 'eq-alchemical-ammo-loaded', name: 'Alchemical Ammunition (Loaded)', cost: 3, effect: 'Loaded into Jezzail', keywords: ['AMMUNITION (+1 DICE)'] }
    ],
    xp: 0,
    advancements: [],
    injuries: [],
    isDead: false,
    totalCost: 56,
    currentWounds: 1,
    maxWounds: 1,
    bloodMarkers: 0,
    status: 'Active',
    hasActedThisTurn: false
  },
  {
    id: 'snap1-u-nasir',
    customName: 'Nasir',
    baseProfileId: 'unit-azeb',
    profileSnapshot: {
      id: 'unit-azeb',
      name: 'Kavass',
      factionId: 'iron-sultanate',
      category: 'Trooper',
      baseCost: 25,
      stats: { movement: '6"', ranged: '+0 DICE', melee: '-1 DICE', armour: '0', baseSize: '25mm' },
      innateAbilities: []
    },
    equippedWeapons: [
      { instanceId: 'w-jezzail-nasir-1', id: 'wep-jezzail', name: 'Jezzail', factionId: 'iron-sultanate', type: 'Ranged', range: '18"', modifiers: '+1 DICE', cost: 7, keywords: [] },
      { instanceId: 'w-club-nasir-1', id: 'wep-trench-club', name: 'Trench Club', factionId: 'iron-sultanate', type: 'Melee', range: 'Melee', modifiers: '+0 DICE', cost: 3, keywords: [] }
    ],
    equippedArmour: [],
    equippedEquipment: [
      { instanceId: 'eq-alch-ammo-nasir-1', id: 'eq-alchemical-ammo', name: 'Alchemical Ammunition', cost: 3, effect: '+1 DICE to Jezzail', keywords: ['AMMUNITION (+1 DICE)'] },
      { instanceId: 'eq-alch-ammo-nasir-loaded-1', id: 'eq-alchemical-ammo-loaded', name: 'Alchemical Ammunition (Loaded)', cost: 3, effect: 'Loaded into Jezzail', keywords: ['AMMUNITION (+1 DICE)'] }
    ],
    xp: 0,
    advancements: [],
    injuries: [],
    isDead: false,
    totalCost: 41,
    currentWounds: 1,
    maxWounds: 1,
    bloodMarkers: 0,
    status: 'Active',
    hasActedThisTurn: false
  },
  {
    id: 'snap1-u-rafiq',
    customName: 'Rafiq the Incinerator',
    baseProfileId: 'unit-azeb',
    profileSnapshot: {
      id: 'unit-azeb',
      name: 'Kavass',
      factionId: 'iron-sultanate',
      category: 'Trooper',
      baseCost: 25,
      stats: { movement: '6"', ranged: '+0 DICE', melee: '-1 DICE', armour: '-1', baseSize: '25mm' },
      innateAbilities: []
    },
    equippedWeapons: [
      { instanceId: 'w-flame-rafiq-1', id: 'wep-flamethrower', name: 'Flamethrower', factionId: 'iron-sultanate', type: 'Ranged', range: '8"', modifiers: '-1 INJURY DICE', cost: 30, keywords: ['FIRE', 'FLAMETHROWER', 'IGNORE ARMOUR'] },
      { instanceId: 'w-club-rafiq-1', id: 'wep-trench-club', name: 'Trench Club', factionId: 'iron-sultanate', type: 'Melee', range: 'Melee', modifiers: '+0 DICE', cost: 3, keywords: [] }
    ],
    equippedArmour: [
      { instanceId: 'a-std-rafiq-1', id: 'arm-standard', name: 'Standard Armour', factionId: 'iron-sultanate', category: 'Medium', modifier: '-1 INJURY MODIFIER', cost: 15, keywords: [] }
    ],
    equippedEquipment: [],
    xp: 0,
    advancements: [],
    injuries: [],
    isDead: false,
    totalCost: 73,
    currentWounds: 1,
    maxWounds: 1,
    bloodMarkers: 0,
    status: 'Active',
    hasActedThisTurn: false
  },
  {
    id: 'snap1-u-dhib',
    customName: 'Dhi’b al-Nafud',
    baseProfileId: 'unit-lion-jabir',
    profileSnapshot: {
      id: 'unit-lion-jabir',
      name: 'Lion of Jabir',
      factionId: 'iron-sultanate',
      category: 'Trooper',
      baseCost: 60,
      stats: { movement: '8"', ranged: 'N/A', melee: '+1 DICE', armour: '-1', baseSize: '50mm' },
      innateAbilities: [
        { id: 'ab-art-life-lion', name: 'Artificial Life', description: '-1 INJURY DICE to Injury Rolls for Lion of Jabir.' },
        { id: 'ab-agile', name: 'Agile', description: '+1 DICE to Risky Success Rolls for Climbing/Jumping/Dashing.' },
        { id: 'ab-pin', name: 'Pin', description: 'Enemy Downed models <=40mm base cannot stand up within 1".' },
        { id: 'ab-teeth', name: 'Teeth and Claws', description: 'Natural melee attack.' },
        { id: 'ab-fierce-lion', name: 'Fierce Lion', description: 'Gains the FEAR keyword.' }
      ]
    },
    equippedWeapons: [],
    equippedArmour: [
      { instanceId: 'a-std-dhib-1', id: 'arm-standard', name: 'Standard Armour', factionId: 'iron-sultanate', category: 'Medium', modifier: '-1 INJURY MODIFIER', cost: 15, keywords: [] }
    ],
    equippedEquipment: [
      { instanceId: 'eq-wind-dhib-1', id: 'eq-wind-amulet', name: 'Wind Amulet', cost: 10, effect: '+3" Movement on activation', keywords: [] }
    ],
    xp: 0,
    advancements: [],
    injuries: [],
    isDead: false,
    totalCost: 90,
    currentWounds: 1,
    maxWounds: 1,
    bloodMarkers: 0,
    status: 'Active',
    hasActedThisTurn: false
  },
  {
    id: 'snap1-u-needle',
    customName: 'The Iron Needle',
    baseProfileId: 'unit-sultanate-sapper',
    profileSnapshot: {
      id: 'unit-sultanate-sapper',
      name: 'Sultanate Sapper',
      factionId: 'iron-sultanate',
      category: 'Trooper',
      baseCost: 50,
      stats: { movement: '6"', ranged: '+1 DICE', melee: '0', armour: '0', baseSize: '25mm' },
      innateAbilities: [
        { id: 'ab-set-mine', name: 'Set Mine', description: 'ACTION: +2 DICE Success Roll to mine a terrain piece.' },
        { id: 'ab-fortify', name: 'Fortify', description: 'ACTION: Risky Success Roll to gain COVER.' },
        { id: 'ab-defuse-mine', name: 'Defuse Mine', description: 'Risky Success Roll to defuse a mined terrain piece.' },
        { id: 'ab-fwd-pos', name: 'Forward Positions', description: 'Deploy up to 6" forward in contact with terrain.' }
      ]
    },
    equippedWeapons: [
      { instanceId: 'w-siege-needle-1', id: 'wep-siege-jezzail', name: 'Siege Jezzail', factionId: 'iron-sultanate', type: 'Ranged', range: '30"', modifiers: '+1 DICE, +1 INJURY DICE', cost: 30, keywords: ['HEAVY'] },
      { instanceId: 'w-knife-needle-1', id: 'wep-trench-knife', name: 'Trench Knife', factionId: 'iron-sultanate', type: 'Melee', range: 'Melee', modifiers: '-1 DICE', cost: 1, keywords: [] }
    ],
    equippedArmour: [
      { instanceId: 'a-std-needle-1', id: 'arm-standard', name: 'Standard Armour', factionId: 'iron-sultanate', category: 'Medium', modifier: '-1 INJURY MODIFIER', cost: 15, keywords: [] }
    ],
    equippedEquipment: [
      { instanceId: 'eq-alch-ammo-needle-1', id: 'eq-alchemical-ammo', name: 'Alchemical Ammunition', cost: 3, effect: '+1 DICE to Siege Jezzail', keywords: ['AMMUNITION (+1 DICE)'] },
      { instanceId: 'eq-shovel-needle-1', id: 'eq-shovel', name: 'Shovel', cost: 0, effect: 'Dug In: COVER on Open terrain', keywords: [] }
    ],
    xp: 0,
    advancements: [],
    injuries: [],
    isDead: false,
    totalCost: 99,
    currentWounds: 1,
    maxWounds: 1,
    bloodMarkers: 0,
    status: 'Active',
    hasActedThisTurn: false
  },
  {
    id: 'snap1-u-homunculus',
    customName: 'Al-Masyukh',
    baseProfileId: 'unit-takwin-homunculus',
    profileSnapshot: {
      id: 'unit-takwin-homunculus',
      name: 'Takwin Homunculus',
      factionId: 'iron-sultanate',
      category: 'Trooper',
      baseCost: 40,
      stats: { movement: '6"', ranged: '+0 DICE', melee: '+0 DICE', armour: '0', baseSize: '25mm' },
      innateAbilities: [
        { id: 'ab-art-life-hom', name: 'Artificial Life', description: '-1 DICE to Injury Rolls for a Takwin Homunculus.' },
        { id: 'ab-pummel', name: 'Pummeling Blows', description: 'Can make melee attacks without weapons.' },
        { id: 'ab-human-hands', name: 'Human Hands', description: 'Equip weapons and shields from the Iron Sultanate Armoury.' }
      ]
    },
    equippedWeapons: [
      { instanceId: 'w-pistol-hom-1', id: 'wep-pistol', name: 'Pistol', factionId: 'iron-sultanate', type: 'Ranged', range: '12"/Melee', modifiers: '+0 DICE', cost: 6, keywords: ['PISTOL'] }
    ],
    equippedArmour: [],
    equippedEquipment: [],
    xp: 0,
    advancements: [],
    injuries: [],
    isDead: false,
    totalCost: 56,
    currentWounds: 1,
    maxWounds: 1,
    bloodMarkers: 0,
    status: 'Active',
    hasActedThisTurn: false
  },
  {
    id: 'snap1-u-mamluk',
    customName: 'Jawhar al-Sari',
    baseProfileId: 'unit-mamluk-faris',
    profileSnapshot: {
      id: 'unit-mamluk-faris',
      name: 'Mamluk Faris',
      factionId: 'mercenaries',
      category: 'Mercenary',
      baseCost: 0,
      stats: { movement: '6"', ranged: '+1 DICE', melee: '+1 DICE', armour: '-3', baseSize: '32mm' },
      innateAbilities: [
        { id: 'ab-sworn-brethren', name: 'Sworn Brethren', description: 'Forms a FIRETEAM with Idris the Relic Hound.' },
        { id: 'ab-martial-prowess', name: 'Martial Prowess', description: 'Greatsword is not Heavy; Jezzail has Assault & Shield Combo.' },
        { id: 'ab-automaton-destrier', name: 'Automaton Destrier', description: 'Deploy within 1" of board edge and >8" from enemies.' }
      ]
    },
    equippedWeapons: [
      { instanceId: 'w-polearm-mamluk-1', id: 'wep-polearm-shield', name: 'Polearm and Shield', factionId: 'mercenaries', type: 'Melee', range: 'Melee', modifiers: '-1 INJURY MODIFIER', cost: 0, keywords: ['BLOCK', 'CUMBERSOME'] },
      { instanceId: 'w-jezzail-mamluk-1', id: 'wep-alchemical-jezzail', name: 'Alchemical Jezzail', factionId: 'mercenaries', type: 'Ranged', range: '18"', modifiers: '+1 DICE', cost: 0, keywords: ['ASSAULT'] }
    ],
    equippedArmour: [
      { instanceId: 'a-reinf-mamluk-1', id: 'arm-reinforced', name: 'Reinforced Armour', factionId: 'mercenaries', category: 'Heavy', modifier: '-2 INJURY MODIFIER', cost: 0, keywords: [] }
    ],
    equippedEquipment: [
      { instanceId: 'eq-helmet-mamluk-1', id: 'eq-combat-helmet', name: 'Combat Helmet', cost: 0, effect: 'NEGATE SHRAPNEL', keywords: ['NEGATE SHRAPNEL'] }
    ],
    xp: 0,
    advancements: [],
    injuries: [],
    isDead: false,
    totalCost: 0,
    currentWounds: 1,
    maxWounds: 1,
    bloodMarkers: 0,
    status: 'Active',
    hasActedThisTurn: false
  }
];

// ----------------------------------------------------------------------------
// 2. SNAPSHOT 2: 3-FORCE MATCH 10.06.26 (983 Ducats | 4 Glory)
// ----------------------------------------------------------------------------
const SNAPSHOT_2_UNITS: ActiveUnit[] = [
  {
    ...SNAPSHOT_1_UNITS[0],
    id: 'snap2-u-kasim',
    xp: 4,
    advancements: ['Assassinate [4] (+1 DICE vs unactivated targets)', 'Secrets of Takwin (Damage redirect to Homunculus)'],
    totalCost: 179
  },
  {
    ...SNAPSHOT_1_UNITS[1],
    id: 'snap2-u-bull',
    xp: 2,
    advancements: ['Strength of Samson [8] (+1 INJURY DICE to Melee, STRONG)'],
    injuries: ['Lost Arm [26] (Severed mechanical arm in ferocious close quarters)'],
    equippedArmour: [
      { instanceId: 'a-alch-bull-2', id: 'arm-alchemist', name: 'Alchemist Armour', factionId: 'iron-sultanate', category: 'Heavy', modifier: '-2 INJURY MODIFIER', cost: 50, keywords: ['NEGATE FIRE', 'NEGATE GAS'] }
    ],
    totalCost: 270
  },
  {
    ...SNAPSHOT_1_UNITS[2],
    id: 'snap2-u-idris',
    xp: 2,
    advancements: ['Elite Promotion (Favoured Kavass)', 'Skill & Expertise [7]', 'Studied Blade (+1 DICE Melee)'],
    profileSnapshot: {
      ...SNAPSHOT_1_UNITS[2].profileSnapshot,
      category: 'Elite',
      stats: { movement: '6"', ranged: '+0 DICE', melee: '+0 DICE', armour: '-2', baseSize: '25mm' }
    },
    equippedArmour: [
      { instanceId: 'a-reinf-idris-2', id: 'arm-reinforced', name: 'Reinforced Armour', factionId: 'iron-sultanate', category: 'Heavy', modifier: '-2 INJURY MODIFIER', cost: 40, keywords: [] }
    ],
    totalCost: 120
  },
  {
    ...SNAPSHOT_1_UNITS[3],
    id: 'snap2-u-nasir',
    totalCost: 41
  },
  {
    ...SNAPSHOT_1_UNITS[4],
    id: 'snap2-u-rafiq',
    totalCost: 73
  },
  {
    ...SNAPSHOT_1_UNITS[5],
    id: 'snap2-u-dhib',
    totalCost: 90
  },
  {
    ...SNAPSHOT_1_UNITS[6],
    id: 'snap2-u-needle',
    totalCost: 99
  },
  {
    ...SNAPSHOT_1_UNITS[7],
    id: 'snap2-u-homunculus',
    profileSnapshot: {
      id: 'unit-takwin-homunculus',
      name: 'Takwin Homunculus',
      factionId: 'iron-sultanate',
      category: 'Trooper',
      baseCost: 40,
      stats: { movement: '6"', ranged: '+0 DICE', melee: '+1 DICE', armour: '-1', baseSize: '60mm' },
      innateAbilities: [
        { id: 'ab-massive-size', name: 'Massive Size', description: 'Base size 50mm, gains TOUGH.' },
        { id: 'ab-inhuman-strength', name: 'Inhuman Strength', description: 'Gains STRONG, +1 DICE Melee, 32mm.' },
        { id: 'ab-additional-arm', name: 'Additional Arm', description: 'Adds CLEAVE 2 to Pummeling Blows.' },
        { id: 'ab-gargantuan-size', name: 'Gargantuan Size', description: 'Base size 60mm, can wield Brazen Bull weapons.' },
        { id: 'ab-regenerative', name: 'Regenerative Tissue', description: 'Gains REGENERATE 1 (remove 1 Blood Marker per turn).' }
      ]
    },
    equippedWeapons: [
      { instanceId: 'w-greatsword-hom-2', id: 'wep-great-sword', name: 'Great Sword/Axe', factionId: 'iron-sultanate', type: 'Melee', range: 'Melee', modifiers: '+1 INJURY DICE', cost: 12, keywords: ['CRITICAL', 'HEAVY'] },
      { instanceId: 'w-sword-hom-2', id: 'wep-sword-axe', name: 'Sword/Axe', factionId: 'iron-sultanate', type: 'Melee', range: 'Melee', modifiers: '+0 DICE', cost: 4, keywords: ['CRITICAL'] },
      { instanceId: 'w-shield-hom-2', id: 'arm-trench-shield', name: 'Trench Shield', factionId: 'iron-sultanate', type: 'Melee', range: 'Melee', modifiers: '-1 INJURY MODIFIER', cost: 10, keywords: ['SHIELD'] }
    ],
    totalCost: 171
  },
  {
    ...SNAPSHOT_1_UNITS[8],
    id: 'snap2-u-mamluk'
  }
];

// ----------------------------------------------------------------------------
// 3. SNAPSHOT 3: JULY 2026 GATOR & BOOK OF GOLEMS (1000 Ducats | 4 Glory)
// ----------------------------------------------------------------------------
const SNAPSHOT_3_UNITS: ActiveUnit[] = [
  {
    ...SNAPSHOT_2_UNITS[0],
    id: 'snap3-u-kasim',
    xp: 4,
    advancements: [
      'Ranged Proficiency [7] (+1 DICE Ranged, total +3 DICE)',
      'Assassinate [4] (+1 DICE vs unactivated targets)',
      'Secrets of Takwin (Harm redirection)'
    ],
    profileSnapshot: {
      ...SNAPSHOT_2_UNITS[0].profileSnapshot,
      stats: { movement: '4"', ranged: '+3 DICE', melee: '+1 DICE', armour: '-2', baseSize: '32mm' }
    },
    totalCost: 179
  },
  {
    ...SNAPSHOT_2_UNITS[1],
    id: 'snap3-u-bull',
    xp: 3,
    equippedArmour: [
      { instanceId: 'a-reinf-bull-3', id: 'arm-reinforced', name: 'Reinforced Armour', factionId: 'iron-sultanate', category: 'Heavy', modifier: '-2 INJURY MODIFIER', cost: 40, keywords: [] }
    ],
    totalCost: 280
  },
  {
    ...SNAPSHOT_2_UNITS[2],
    id: 'snap3-u-idris',
    xp: 3,
    totalCost: 120
  },
  {
    ...SNAPSHOT_2_UNITS[3],
    id: 'snap3-u-nasir',
    equippedArmour: [
      { instanceId: 'a-std-nasir-3', id: 'arm-standard', name: 'Standard Armour', factionId: 'iron-sultanate', category: 'Medium', modifier: '-1 INJURY MODIFIER', cost: 15, keywords: [] }
    ],
    totalCost: 56
  },
  {
    ...SNAPSHOT_2_UNITS[4],
    id: 'snap3-u-rafiq',
    totalCost: 73
  },
  {
    ...SNAPSHOT_2_UNITS[5],
    id: 'snap3-u-dhib',
    totalCost: 90
  },
  {
    ...SNAPSHOT_2_UNITS[6],
    id: 'snap3-u-needle',
    equippedWeapons: [
      { instanceId: 'w-siege-needle-3', id: 'wep-siege-jezzail', name: 'Siege Jezzail', factionId: 'iron-sultanate', type: 'Ranged', range: '30"', modifiers: '+1 DICE, +1 INJURY DICE', cost: 30, keywords: ['HEAVY'] },
      { instanceId: 'w-club-needle-3', id: 'wep-trench-club', name: 'Trench Club', factionId: 'iron-sultanate', type: 'Melee', range: 'Melee', modifiers: '+0 DICE', cost: 3, keywords: [] }
    ],
    totalCost: 101
  },
  {
    ...SNAPSHOT_2_UNITS[7],
    id: 'snap3-u-homunculus',
    xp: 3,
    advancements: ['Elite Promotion (Favoured Takwin Homunculus)'],
    profileSnapshot: {
      id: 'unit-takwin-homunculus',
      name: 'Favoured Takwin Homunculus',
      factionId: 'iron-sultanate',
      category: 'Elite',
      baseCost: 40,
      stats: { movement: '6"', ranged: '+0 DICE', melee: '+1 DICE', armour: '-1', baseSize: '50mm' },
      innateAbilities: [
        { id: 'ab-massive-size', name: 'Massive Size', description: 'Base size 50mm, gains TOUGH.' },
        { id: 'ab-human-hands', name: 'Human Hands', description: 'Can wield weapons and shields.' },
        { id: 'ab-inhuman-strength', name: 'Inhuman Strength', description: 'Gains STRONG, +1 DICE Melee, 32mm.' },
        { id: 'ab-additional-arm', name: 'Additional Arm', description: 'CLEAVE 2 on Pummeling Blows.' }
      ]
    },
    equippedWeapons: [
      { instanceId: 'w-siege-hom-3', id: 'wep-siege-jezzail', name: 'Siege Jezzail', factionId: 'iron-sultanate', type: 'Ranged', range: '30"', modifiers: '+1 DICE, +1 INJURY DICE', cost: 30, keywords: ['HEAVY'] },
      { instanceId: 'w-greatsword-hom-3', id: 'wep-great-sword', name: 'Great Sword/Axe', factionId: 'iron-sultanate', type: 'Melee', range: 'Melee', modifiers: '+1 INJURY DICE', cost: 12, keywords: ['CRITICAL', 'HEAVY'] },
      { instanceId: 'w-sword-hom-3', id: 'wep-sword-axe', name: 'Sword/Axe', factionId: 'iron-sultanate', type: 'Melee', range: 'Melee', modifiers: '+0 DICE', cost: 4, keywords: ['CRITICAL'] },
      { instanceId: 'w-fireshield-hom-3', id: 'arm-fire-shield', name: 'Fire Shield', factionId: 'iron-sultanate', type: 'Melee', range: 'Melee', modifiers: '-1 INJURY MODIFIER', cost: 20, keywords: ['NEGATE FIRE'] }
    ],
    totalCost: 146
  },
  {
    ...SNAPSHOT_2_UNITS[8],
    id: 'snap3-u-mamluk'
  }
];

export const SULTANATE_WARBAND_SNAPSHOTS: WarbandSnapshot[] = [
  {
    id: 'snap-founding-charter',
    timestamp: '2026-06-01T10:00:00Z',
    label: '1. Founding Expeditionary Muster (799 👑 | 4 ☼)',
    type: 'founding',
    ducatCost: 799,
    treasuryDucats: 81,
    gloryPoints: 4,
    unitCount: 9,
    units: SNAPSHOT_1_UNITS.map(enrichUnitWithLore),
    armoryStash: [],
    changesSummary: [
      'Mustered the initial 9-warrior scientific expedition under Master Alchemist Kasim bin Malik at the Great Iron Wall',
      'Commissioned Favoured Brazen Bull (Al-Qahhar) with Flame Cannon & Titan Zulfiqar, and Lion of Jabir (Dhi’b) with Wind Amulet',
      'Synthesized initial Takwin Homunculus (Al-Masyukh) with Human Hands and Pistol',
      'Recruited veteran Mamluk Faris (Jawhar al-Sari) for 4 Glory Points as sworn fireteam guardian for Idris',
      'Enlisted Kavass line riflemen (Idris, Nasir, Rafiq the Incinerator) and Sultanate Sapper crew (The Iron Needle)'
    ],
    notes: 'Initial expeditionary charter into the Al-Nafud Marches under Bayt al-Nahas al-Hamra.'
  },
  {
    id: 'snap-3force-match',
    timestamp: '2026-06-10T16:45:00Z',
    label: '2. 3-Force Skirmish & Takwin Metamorphosis (983 👑 | 4 ☼)',
    type: 'post_battle',
    matchId: 'match-hist-1',
    scenarioName: '3 Force Match: Siege of the Sun-Drenched Laboratory',
    outcome: 'Victory',
    ducatCost: 983,
    treasuryDucats: 67,
    gloryPoints: 4,
    unitCount: 9,
    units: SNAPSHOT_2_UNITS.map(enrichUnitWithLore),
    armoryStash: [],
    changesSummary: [
      'Kasim bin Malik accumulated 4 XP, mastered Assassinate [4] (+1 DICE vs unactivated targets), and forged Secrets of Takwin harm link',
      'Al-Qahhar gained Strength of Samson [8] (+1 INJURY DICE to Melee, STRONG); sustained Lost Arm [26] in close defense and adapted to single-handed Titan Blade',
      'Idris the Relic Hound achieved Elite Promotion, mastered Skill & Expertise [7], and equipped heavy Reinforced Armour (-2 Injury Modifier)',
      'Al-Masyukh underwent colossal genetic synthesis: grew to Gargantuan Size (60mm) with Regenerative Tissue and twin master blades (171 Ducats)'
    ],
    notes: 'Epic showdown against Court of the Seven-Headed Serpent (Sorcerer Zortan).'
  },
  {
    id: 'snap-july-gator',
    timestamp: '2026-07-28T19:20:00Z',
    label: '3. July 2026 Gator & Book of Golems (1000 👑 | 4 ☼)',
    type: 'post_battle',
    matchId: 'match-hist-2',
    scenarioName: 'July 2026 Gator Tournament Match',
    outcome: 'Victory',
    ducatCost: 1000,
    treasuryDucats: 220,
    gloryPoints: 4,
    unitCount: 9,
    units: SNAPSHOT_3_UNITS.map(enrichUnitWithLore),
    armoryStash: [],
    changesSummary: [
      'Exploration in the salt wastes unearthed the legendary "Book of Golems" (Rabbinic manual unlocking clay golem artifice)',
      'Master Kasim bin Malik mastered Ranged Proficiency [7], reaching +3 DICE on long-range sniper volleys',
      'Al-Masyukh achieved Elite Promotion (Favoured Takwin) with 3 XP, equipped with a long-range Siege Jezzail and Fire Shield',
      'The Iron Needle sapper battery upgraded with specialized Alchemical Siege ammunition and Nasir reinforced with Standard Armour'
    ],
    notes: 'Tournament victory; the warband ascends into biological artifice and golem rites.'
  }
];

export function enrichUnitWithLore(unit: ActiveUnit): ActiveUnit {
  const nameLower = `${unit.customName} ${unit.profileSnapshot.name}`.toLowerCase();
  const matched = KNOWN_UNIT_LORES.find((lore) => 
    lore.matchPatterns.some((pattern) => nameLower.includes(pattern))
  );

  if (!matched) return unit;

  return {
    ...unit,
    lore: unit.lore || matched.biography,
    quote: unit.quote || matched.quote,
    titles: (unit.titles && unit.titles.length > 0) ? unit.titles : matched.titles,
    deeds: (unit.deeds && unit.deeds.length > 0) ? unit.deeds : matched.deeds
  };
}
