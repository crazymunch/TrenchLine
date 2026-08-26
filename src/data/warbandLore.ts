import { ActiveUnit, Warband } from '../types/warband';
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
    matchPatterns: ['mudawwan', 'inscribed', 'homunculus'],
    titles: ['The Inscribed', 'The Living Slate'],
    quote: '[Silently follows the alchemical runes traced upon its skin]',
    biography: `Constructed with human hands, unnatural strength, and an extra arm, inscribed with sacred script to protect the warband's rear guard and carry alchemical supplies.`,
    deeds: [
      'Carried wounded retainers and secured heavy alchemical alembics through enemy mortar fire.'
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
  patron: 'House of Wisdom • Bayt al-Nahas al-Hamra (House of the Red Copper)',
  motto: 'The Wall may forget, but the Copper remembers!',
  lore: `# The Al-Qarn Rihla (The Journey of the Century)
**House of the Red Copper (Bayt al-Nahas al-Hamra)**

Originating from the ancestral crimson dunes of the **Al-Nafud Marches**, Bayt al-Nahas al-Hamra was once among the premier alchemical noble houses of the Iron Sultanate. When the Great Iron Wall was erected, their ancestral workshops—including the famed **Laboratory of the Gilded Rose**—were walled *out* into the brutal, demonic wastes.

Every hundred years, the house mounts the **Al-Qarn Rihla**: an all-out, heavily armed alchemical expedition into No Man's Land to recover lost ancestral treatises, harvest demonic anatomical specimens, and reclaim the glory of the Red Copper.

Led by the brilliant and ruthless alchemist **Kasim bin Malik, the Living Engineer**, the warband blends advanced Sultanate ballistics with forbidden biological artifice, fielding clockwork war-beasts and flesh-grafted Takwin horrors bound in copper runes.`,
  chronicleLog: [
    'Turn 2: Discovered the ancient leather-bound "Book of Golems" in the salt wastes; Kasim unlocks the secrets of clay golem craft.',
    'Turn 1: Decisive 13-4 Victory against Sorcerer Zortan and the Court of the Seven-Headed Serpent at the Laboratory of the Gilded Rose.',
    'Expedition Departure: The Al-Qarn Rihla departs the Great Iron Wall into the Al-Nafud Marches under the banner of Bayt al-Nahas al-Hamra.'
  ]
};

export const SULTANATE_MATCH_HISTORY: MatchRecord[] = [
  {
    id: 'match-hist-1',
    campaignId: 'camp-default',
    date: 'August 2026',
    scenarioId: 'scen-relic-hunt',
    scenarioName: 'The Siege of the Sun-Drenched Laboratory',
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
- **Relic Mantle:** Idris awarded the Relic Golden Mantle.
- **Takwin Harvest:** Demonic corpses harvested to birth the three-armed behemoth *Al-Masyukh*.
- **Exploration:** Rolled 18 (+180 Ducats) and memorialized a fallen knight (+2 Glory Points).`,
    mvpUnitName: 'Al-Qahhar, the Crippled & Idris the Relic Hound',
    opponentWarbandName: 'Court of the Seven-Headed Serpent (Sorcerer Zortan)',
    notableMoments: [
      'Kasim snipes Hell Knight Mephistolon in Turn 1 with alchemical gas bullets',
      'Brazen Bull protects wounded Kasim and wipes 3 demonic fiends',
      'Idris snatches the objective from Sorcerer Zortan on the final turn'
    ]
  },
  {
    id: 'match-hist-2',
    campaignId: 'camp-default',
    date: 'August 2026',
    scenarioId: 'scen-trench-raid',
    scenarioName: 'The Chronicle of the Fractured Treaty & The Book of Golems',
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
    narrativeReport: `### Battle Report: The Chronicle of the Fractured Treaty
**Location:** Mist-Shrouded Wastes of the Al-Nafud
**Result:** Tactical Sultanate Victory & Artifact Recovery

#### Summary of Engagement
The Al-Qarn Rihla clashed in a three-way skirmish over ancient vault conduits. Al-Masyukh the three-armed Homunculus proved its terrifying worth, smashing through heretic shock troops. Al-Qahhar suffered a severed arm in heavy melee but held the line with its Flame Cannon.

#### The Discovery of the Book of Golems
During the post-battle exploration of the sunken conduit chambers, Kasim's scholars uncloaked an ancient, leather-bound artifact: **The Book of Golems**. 

This discovery marks a turning point for Bayt al-Nahas al-Hamra. Kasim is no longer merely an alchemist—he is now a true **Master of Construction**, synthesizing clay golem rites with Sultanate mechanical artifice.`,
    mvpUnitName: 'Al-Masyukh, Hunter of Hunters',
    opponentWarbandName: 'Iron Crusade & Heretic Skirmishers',
    notableMoments: [
      'Al-Masyukh sweeps the battlefield center with twin Titan blades',
      'Unearthing the sacred Book of Golems during post-game exploration'
    ]
  }
];

export const SULTANATE_WARBAND_SNAPSHOTS: any[] = [
  {
    id: 'snap-founding',
    timestamp: '2026-08-01T10:00:00Z',
    label: '1. Founding Muster (1320 👑)',
    type: 'founding',
    ducatCost: 1320,
    treasuryDucats: 0,
    gloryPoints: 0,
    unitCount: 11,
    units: [],
    armoryStash: [],
    changesSummary: [
      'Mustered the initial 11-member scientific expedition under Master Kasim bin Malik at the Great Iron Wall',
      'Commissioned the Brazen Bull (Al-Qahhar) and Lion of Jabir (Dhi’b) from the House of Wisdom',
      'Enlisted 4 veteran Kavass line riflemen and 2 alchemical apprentices'
    ],
    notes: 'Initial expeditionary charter into the Al-Nafud Marches.'
  },
  {
    id: 'snap-match-1',
    timestamp: '2026-08-15T14:30:00Z',
    label: '2. Siege of the Sun-Drenched Laboratory',
    type: 'post_battle',
    matchId: 'match-hist-1',
    scenarioName: 'Relic Hunt (Sun-Drenched Laboratory)',
    outcome: 'Victory',
    ducatCost: 1320,
    treasuryDucats: 180,
    gloryPoints: 2,
    unitCount: 11,
    units: [],
    armoryStash: [],
    changesSummary: [
      'Decisive 13-4 Victory over Court of the Seven-Headed Serpent (Sorcerer Zortan)',
      'Kasim bin Malik sniped Hell Knight Mephistolon in Turn 1; suffered Leg Wound (-2" Movement) and forged custom brace armor',
      'Al-Qahhar (Brazen Bull) promoted to Elite status and awarded the legendary Wind Amulet emerald',
      'Idris promoted to Elite Lieutenant and awarded the Relic Golden Mantle after snatching the sacred reliquary',
      'Harvested demonic tissue from slain yoke fiends in preparation for Takwin synthesis'
    ],
    notes: 'Epic showdown against Sorcerer Zortan.'
  },
  {
    id: 'snap-match-2',
    timestamp: '2026-08-25T18:00:00Z',
    label: '3. Discovery of the Book of Golems',
    type: 'post_battle',
    matchId: 'match-hist-2',
    scenarioName: 'The Chronicle of the Fractured Treaty',
    outcome: 'Victory',
    ducatCost: 1320,
    treasuryDucats: 320,
    gloryPoints: 4,
    unitCount: 11,
    units: [],
    armoryStash: [],
    changesSummary: [
      'Tactical Victory in the Salt Wastes; defeated Heretic Shocktroopers',
      'Synthesized and deployed Al-Masyukh (Three-Armed Homunculus Behemoth with Titan Zulfiqar)',
      'Al-Qahhar sustained a severed arm in close melee—adapted into "The Crippled" wielding single Titan Blade & Flame Cannon',
      'Post-battle exploration unearthed the sacred Book of Golems in sunken conduit chambers',
      'Master Kasim bin Malik recognized as "The Living Engineer" & Master of Construction'
    ],
    notes: 'The warband ascends into biological artifice and golem rites.'
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

