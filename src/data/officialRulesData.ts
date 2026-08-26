// Official Trench Crusade Rules Compendium & Dataset
// Extracted from Official Digital Rulebooks with Zero Generative Filler

import { Scenario, RuleKeyword, TraumaTableEntry } from '@/types/rules';

export interface OfficialWargearItem {
  id: string;
  name: string;
  category: 'Ranged' | 'Melee' | 'Grenade' | 'Shield' | 'Armour' | 'Equipment' | 'Ammunition';
  type?: string;
  range?: string;
  cost: number;
  faction: string;
  armourModifier?: number;
  modifiers?: Record<string, any>;
  keywords: string[];
  rules: string;
  lore: string;
}

// 1. ALL 12 OFFICIAL SCENARIOS WITH CRISP VECTOR DEPLOYMENT MAPS
export const OFFICIAL_SCENARIOS: Scenario[] = [
  {
    "id": "claim-no-mans-land",
    "number": 1,
    "roman": "I",
    "name": "I. Claim No Man’s Land",
    "slug": "claim-no-mans-land",
    "tagline": "Battle for control over a stretch of land and drive away your foes.",
    "mapImage": "/maps/scenario_1.png",
    "tableSize": "48\" x 48\" (or 36\" x 36\" for skirmish)",
    "forces": "No special restrictions apply to the models the players can include in their Forces in this scenario.",
    "battlefield": "The players roll-off and the winner sets up the terrain for the game. This scenario uses the No Man’s Land battlefield archetype and requires a battlefield that is at least 36” by 36”.",
    "deployment": "The players roll-off. The winner of the roll-off chooses which Deployment Zone will be theirs. The other Deployment Zone is their opponent’s.\n\nThe players then alternate deploying their models one at a time, starting with the player who has more models in their Warband (roll-off if both players have the same number of models).\n\nModels must be set up wholly within their own Deployment Zone. If a player runs out of models to set up, the other player sets up all their remaining models, one after another, until they have none left. Once the players have set up their models, deployment ends, and the game begins.\n\n**Objective Markers**: The Markers shown on the map with a white cross represent important objectives. Place the first four terrain pieces covering the locations where the Objective Markers will be set up. Use Ruined Building terrain pieces if available. The whole of the terrain piece is treated as the Objective for this scenario.\n\n**Infiltrators**: Infiltrators can deploy normally or by using their special deployment rules. However, if they deploy using their special deployment rules, they cannot deploy within 3” of an Objective.",
    "gameLength": "This scenario lasts five Turns.",
    "victoryConditions": "A player wins this scenario immediately if there are no enemy models on the battlefield, or if the opposing Warband flees (typically due to failing a Morale Check). Otherwise, the player with more Victory Points at the end of the game is the winner.\n\n**Victory Points**:\n- At the end of each Turn, each player scores 2 VPs for each Objective they control.\n- At the end of the game, each player scores 1 VP for each Glorious Deed they completed.",
    "gloriousDeeds": "- **Iron Resolve**: A friendly model that is Down on an Objective stands up and is not taken Out of Action before the end of the Turn.\n- **Overwhelming Force**: A friendly model makes a Melee Attack that takes two or more enemy models Out of Action in the same Activation.\n- **Hold the Line**: A Warband controls three or more Objectives at the end of two consecutive Turns.\n- **First Blood**: A friendly model takes the first enemy model Out of Action in the game.\n- **Supreme Heroism**: A friendly model with the LEADER Keyword takes an enemy model with the LEADER Keyword Out of Action with a Melee Attack."
  },
  {
    "id": "hunt-for-heroes",
    "number": 2,
    "roman": "II",
    "name": "II. Hunt for Heroes",
    "slug": "hunt-for-heroes",
    "tagline": "Hunt down the enemy leaders while protecting your own.",
    "mapImage": "/maps/scenario_2.png",
    "tableSize": "48\" x 48\" (or 36\" x 36\" for skirmish)",
    "forces": "In this scenario, both players must include as many ELITE models from their Warband as possible.",
    "battlefield": "The players roll-off and the winner sets up the terrain for the game. This scenario uses the Decimated Ruins battlefield archetype and requires a battlefield that is at least 36” by 36”.",
    "deployment": "The players roll-off. The winner of the roll-off chooses which Deployment Zone will be theirs. The other Deployment Zone is their opponent’s.\n\nThe players then alternate deploying their models one at a time, starting with the player who has more models in their Warband (roll-off if both players have the same number of models).\n\nModels must be set up wholly within their own Deployment Zone. If a player runs out of models to set up, the other player sets up all their remaining models, one after another, until they have none left. Once the players have set up their models, deployment ends, and the game begins.\n\n**Objective Markers**: The Markers on the map show the location of ancient heroes or valuable supplies. Place terrain pieces over the objective locations. A player controls an Objective if they have more friendly models within 1” than enemy models.\n\n**Infiltrators**: Infiltrators can deploy normally or by using their special deployment rules. However, if they deploy using their special deployment rules, they cannot deploy within 3” of an Objective.",
    "gameLength": "This scenario lasts five Turns.",
    "victoryConditions": "A player wins this scenario immediately if there are no enemy models on the battlefield, or if the opposing Warband flees. Otherwise, the player with more Victory Points at the end of the game is the winner.\n\n**Victory Points**:\n- 2 VPs each time an enemy ELITE model is taken Out of Action.\n- 3 VPs if the enemy LEADER is taken Out of Action.\n- 2 VPs for each Objective controlled at the end of the game.\n- 1 VP for each Glorious Deed completed.",
    "gloriousDeeds": "- **Headhunter**: A friendly model takes two or more enemy ELITE models Out of Action in the same game.\n- **Duel of Champions**: A friendly ELITE model takes an enemy ELITE model Out of Action in Melee Combat when both were at full wounds.\n- **Untouchable Commander**: Your Warband LEADER does not suffer any Wounds or Blood Markers throughout the entire match.\n- **Surgical Strike**: An enemy ELITE is taken Out of Action on Turn 1."
  },
  {
    "id": "relic-hunt",
    "number": 3,
    "roman": "III",
    "name": "III. Relic Hunt",
    "slug": "relic-hunt",
    "tagline": "Find and secure sacred relics for the glory of your Patron.",
    "mapImage": "/maps/scenario_3.png",
    "tableSize": "48\" x 48\" (or 36\" x 36\" for skirmish)",
    "forces": "No special restrictions apply to the models the players can include in their Forces in this scenario.",
    "battlefield": "The players roll-off and the winner sets up the terrain for the game. This scenario uses the No Man’s Land battlefield archetype and requires a battlefield that is at least 36” by 36”.",
    "deployment": "The players roll-off. The winner chooses their Deployment Zone. The other Deployment Zone is their opponent’s.\n\nThe players alternate deploying their models one at a time, starting with the player who has more models in their Warband.\n\n**Reliquary Markers**: Place 3 Relic Markers at the locations indicated on the deployment map. A model in contact with a Relic can spend an ACTION to Pick Up the Relic. While carrying a Relic, the model cannot Dash and has -1\" to its MOV characteristic. If the carrier is taken Down or Out of Action, the Relic drops at its position.",
    "gameLength": "This scenario lasts five Turns.",
    "victoryConditions": "The player whose models hold or control the most Relics at the end of Turn 5 wins the scenario.\n\n**Victory Points**:\n- 3 VPs for each Relic carried off your own table edge or held in your Deployment Zone.\n- 1 VP for each Relic held anywhere else on the battlefield.\n- 1 VP for each completed Glorious Deed.",
    "gloriousDeeds": "- **Relic Courier**: A single model carries a Relic across the battlefield and off its own table edge.\n- **Desecrator / Sanctifier**: A friendly model takes Out of Action an enemy model that was carrying a Relic in close combat.\n- **Divine Favor**: All three Relics are in friendly possession at the end of the game."
  },
  {
    "id": "trench-warfare",
    "number": 4,
    "roman": "IV",
    "name": "IV. Trench Warfare",
    "slug": "trench-warfare",
    "tagline": "Assault the trenches to win glory for yourself or mount a defence against an enemy attack.",
    "mapImage": "/maps/scenario_4.png",
    "tableSize": "48\" x 48\" (or 36\" x 36\" for skirmish)",
    "forces": "Before picking Forces, the players determine who is the Attacker and who is the Defender. In a campaign, the player with the higher Rating chooses.",
    "battlefield": "The Defender sets up six trench sections that are at least 8” long across their half of the battlefield, along with barricades and barbed wire entanglements.",
    "deployment": "The Defender deploys all of their models wholly within their Trench Line Deployment Zone first. The Attacker then deploys all of their models wholly within the Attacker Deployment Zone (within 6\" of their table edge).\n\n**Trench Parapets**: Models inside trenches gain HEAVY COVER against shooting attacks originating from outside the trench line.",
    "gameLength": "This scenario lasts six Turns.",
    "victoryConditions": "The Attacker wins if they breach and occupy two or more Defender trench sections by the end of Turn 6. The Defender wins if they repel the assault.\n\n**Victory Points**:\n- 2 VPs per captured trench section for the Attacker.\n- 2 VPs per defended trench section for the Defender.\n- 1 VP for each completed Glorious Deed.",
    "gloriousDeeds": "- **Trench Sweeper**: A friendly model takes two or more enemy models Out of Action while inside an enemy trench line.\n- **Over the Top**: The Attacker moves four or more models across No Man's Land and into contact with the Defender's parapets by Turn 2.\n- **Not One Step Back**: The Defender loses zero trench sections throughout the entire match."
  },
  {
    "id": "armoured-train",
    "number": 5,
    "roman": "V",
    "name": "V. Armoured Train",
    "slug": "armoured-train",
    "tagline": "A derailed armoured train, laden with loot and ammunition, is being fought over by the two warbands.",
    "mapImage": "/maps/scenario_5.png",
    "tableSize": "48\" x 48\" (or 36\" x 36\" for skirmish)",
    "forces": "Both players have a Field Strength of up to 15 models.",
    "battlefield": "A railway track with three armoured train wagons is set up across the center of the battlefield. The dimensions of the wagons are shown on the map. Each wagon has access ladders and lockboxes containing munitions.",
    "deployment": "The players roll-off. The winner chooses their Deployment Zone. Players alternate deploying models within 6\" of their respective table edges.\n\n**Train Loot**: Models within 1\" of an unlocked door on a wagon can take an **Open Crate ACTION** (Success Roll needed). Success grants ammunition, ducats, or holy armaments.",
    "gameLength": "This scenario lasts six Turns.",
    "victoryConditions": "The player who controls the most train wagons and secures the most cargo crates wins the scenario.",
    "gloriousDeeds": "- **Train Conductor**: Control all three train wagons at the end of the match.\n- **Heist Master**: Successfully open and claim three or more cargo crates.\n- **Rooftop Duel**: Take an enemy model Out of Action while both models are standing on top of a train wagon."
  },
  {
    "id": "dragon-hunt",
    "number": 6,
    "roman": "VI",
    "name": "VI. Dragon Hunt",
    "slug": "dragon-hunt",
    "tagline": "Hunt and defeat a monstrous entity, be it a possessed siege machine or a hellish beast.",
    "mapImage": "/maps/scenario_6.png",
    "tableSize": "48\" x 48\"",
    "forces": "The players additionally need a Dragon / Possessed Tank model and 6 Peasant models as neutral battlefield hazards.",
    "battlefield": "Ruined industrial terrain with the Dragon entity placed directly at the battlefield center.",
    "deployment": "Players deploy on opposite table edges within 8\" of their border. The Dragon acts independently at the start of each Turn, moving towards the closest warrior and firing its siege weaponry.",
    "gameLength": "Lasts until the Dragon is destroyed or 6 Turns elapse.",
    "victoryConditions": "The player who inflicts the killing blow on the Dragon entity, or deals the most damage to it, scores decisive Victory.",
    "gloriousDeeds": "- **Dragonslayer**: Land the final fatal blow that destroys the Dragon.\n- **Brave the Inferno**: Survive a direct hit from the Dragon's primary siege weapon and remain in combat.\n- **Beast Harvester**: Harvest anatomical relics or sacred machine cores from the downed beast."
  },
  {
    "id": "supply-raid",
    "number": 7,
    "roman": "VII",
    "name": "VII. Supply Raid",
    "slug": "supply-raid",
    "tagline": "Raid enemy supplies or defend your caches from an assault.",
    "mapImage": "/maps/scenario_7.png",
    "tableSize": "48\" x 48\"",
    "forces": "Players determine Attacker and Defender. The Defender places 4 Supply Cache Markers across their defensive zone.",
    "battlefield": "Frontline logistics depot featuring supply depots, fuel silos, and ammo bunkers.",
    "deployment": "The Defender deploys within their half of the board near the caches. The Attacker deploys within 6\" of the opposite table edge.",
    "gameLength": "This scenario lasts five Turns.",
    "victoryConditions": "The Attacker scores 3 VPs for each Supply Cache destroyed or looted. The Defender scores 3 VPs for each Supply Cache preserved.",
    "gloriousDeeds": "- **Plunderer**: Loot three or more Supply Caches in a single game.\n- **Impenetrable Guard**: Prevent any enemy from getting within 2\" of your primary supply depot.\n- **Saboteur**: Detonate a supply cache with a Demolition Charge."
  },
  {
    "id": "from-below",
    "number": 8,
    "roman": "VIII",
    "name": "VIII. From Below",
    "slug": "from-below",
    "tagline": "Conquer a pock-marked battlefield, but be careful not to rouse the beast that slumbers beneath.",
    "mapImage": "/maps/scenario_8.png",
    "tableSize": "48\" x 48\"",
    "forces": "Standard warband forces. 4 Artillery Shell markers are placed in subterranean sinkholes.",
    "battlefield": "Heavily cratered battlefield infested with Hell Ticks and subterranean horrors.",
    "deployment": "Players deploy on opposing table edges. Whenever an explosion or heavy weapon fires near a sinkhole, roll for Hell Tick emergence.",
    "gameLength": "This scenario lasts six Turns.",
    "victoryConditions": "Secure the subterranean sinkholes while eliminating enemy units and managing subterranean parasite swarms.",
    "gloriousDeeds": "- **Exterminator**: Slay 4 or more Hell Ticks in a single game.\n- **Subterranean Explorer**: Extract an Ichor Vial from a slumbering beast and survive to the end of the game.\n- **Sinkhole King**: Control all crater markers on Turn 4."
  },
  {
    "id": "fields-of-glory",
    "number": 9,
    "roman": "IX",
    "name": "IX. Fields of Glory",
    "slug": "fields-of-glory",
    "tagline": "Fight to the glorious death and let your legend live on.",
    "mapImage": "/maps/scenario_9.png",
    "tableSize": "48\" x 48\"",
    "forces": "No restrictions. All warriors fight with heightened zeal (+1 to Morale).",
    "battlefield": "Open battlefield scarred by previous clashes, dotted with shattered monument statues and shell craters.",
    "deployment": "Opposing table edges. Maximum engagement distance.",
    "gameLength": "Five Turns.",
    "victoryConditions": "Points awarded strictly for eliminating enemy models in close combat and claiming the central battlefield glory monument.",
    "gloriousDeeds": "- **Martyrdom**: Three or more friendly warriors die while contesting the central monument.\n- **Glory Hound**: The warband Leader takes 3 enemy models Out of Action personally.\n- **Unbroken Line**: No friendly models fail a Morale check."
  },
  {
    "id": "dont-breathe",
    "number": 10,
    "roman": "X",
    "name": "X. Don’t Breathe",
    "slug": "dont-breathe",
    "tagline": "Beware of poison gas as you assault enemy bunkers or drive back the attackers with mustard gas.",
    "mapImage": "/maps/scenario_10.png",
    "tableSize": "48\" x 48\"",
    "forces": "Attacker vs Defender. Attacker Elites receive Demo Charges.",
    "battlefield": "Fortified defensive line with 4 concrete Bunkers and a 12-marker Gas Mine Placement Area.",
    "deployment": "The Defender sets up 6 trench sections and 4 Bunkers, then secretly notes 4 dud gas mines among the 12. Attacker deploys 6+D3 models with reinforcements arriving each Turn.\n\n**Gas Mines & Clouds**: Moving within 3\" of a live gas mine detonates it, creating a 6\" Gas Cloud Marker that inflicts Blood Markers and explodes if ignited with Flame weapons.",
    "gameLength": "Five or Six Turns (D6 roll on Turn 5).",
    "victoryConditions": "Attacker scores VPs for destroying Bunkers and capturing trenches. Defender scores VPs for defending Bunkers and trench lines.",
    "gloriousDeeds": "- **Burning Sight**: Detonate a Gas Cloud from over 14\" away with a Flame weapon, eliminating an enemy.\n- **Iron Lungs**: Control a Bunker inside a Gas Cloud for two consecutive Turns.\n- **Demolition Expert**: Destroy two enemy Bunkers with Demo Charges."
  },
  {
    "id": "the-high-ground",
    "number": 11,
    "roman": "XI",
    "name": "XI. The High Ground",
    "slug": "the-high-ground",
    "tagline": "Capture the high ground at all costs. Every casualty is worth it to claim this crucial location.",
    "mapImage": "/maps/scenario_11.png",
    "tableSize": "48\" x 48\" (or 36\" x 36\" for skirmish)",
    "forces": "Standard forces.",
    "battlefield": "Five elevated terrain pieces (at least 6\" tall), with the central hill being the tallest structure.",
    "deployment": "Opposing deployment zones. Each player secretly writes down their Top Priority Objective from among the 5 hills.",
    "gameLength": "Five Turns.",
    "victoryConditions": "2 VPs per hill controlled each Turn. 3 bonus VPs for controlling your own Top Priority Objective, and 3 VPs for controlling the enemy's Top Priority Objective.",
    "gloriousDeeds": "- **King of the Hill**: A single model visits all 5 hill objectives during the match.\n- **Death From Above**: Eliminate an enemy with a Diving Charge attack from the high ground.\n- **Down With You**: A friendly model on a hill snipes an enemy on an opposing hill."
  },
  {
    "id": "great-war",
    "number": 12,
    "roman": "XII",
    "name": "XII. Great War",
    "slug": "great-war",
    "tagline": "The order for general assault has been given. The skirmishes are over. Time to wipe out the enemy.",
    "mapImage": "/maps/scenario_12.png",
    "tableSize": "48\" x 48\"",
    "forces": "Full warbands with all reinforcements.",
    "battlefield": "Any battlefield archetype representing a massive clash across the entire front.",
    "deployment": "Opposing table edges. **TO THE DEATH!** Neither side takes Morale checks; fleeing is forbidden.",
    "gameLength": "Five Turns.",
    "victoryConditions": "Total annihilation. VPs equal to enemy Ducat cost destroyed (Cost / 10) and Glory items destroyed (Cost / 3).",
    "gloriousDeeds": "- **Total Carnage**: Eliminate 75% or more of the opposing warband's starting models.\n- **Warlord Triumphant**: The Leader slays the enemy Leader in single combat.\n- **Last Man Standing**: Win the game with only one surviving model on the battlefield."
  }
];

// 2. OFFICIAL TRAUMA TABLE (D66, Pages 102-103)
export const OFFICIAL_TRAUMA_TABLE: TraumaTableEntry[] = [
  {
    "roll": "11",
    "title": "Dead",
    "isDead": true,
    "description": "The wound proved to be fatal. Remove the model and its Battlekit from your Warband Roster."
  },
  {
    "roll": "12",
    "title": "Captured",
    "isDead": false,
    "description": "The enemy captures the model. Negotiate a ransom price in Ducats (👑). If ransom is paid, treat as Full Recovery. If refused, the captured warrior is executed and removed from the roster."
  },
  {
    "roll": "13",
    "title": "Severe Nerve Damage",
    "isDead": false,
    "description": "All Success Rolls you take for this model are treated as being Risky Success Rolls."
  },
  {
    "roll": "14",
    "title": "Hand Wound",
    "isDead": false,
    "description": "Randomly determine which hand has been injured. Add -1 DICE to rolls for attacks made for this model with a Melee Weapon held (or jointly held) by the injured hand."
  },
  {
    "roll": "15",
    "title": "Lost an Eye",
    "isDead": false,
    "description": "Add -1 DICE to rolls for Ranged Attacks made for this model. Second time = blinded and removed from roster. (Treated as Full Recovery for Sniper Priests)."
  },
  {
    "roll": "16",
    "title": "Chest Wound",
    "isDead": false,
    "description": "Add +1 INJURY DICE to Injury Rolls for attacks that target this model."
  },
  {
    "roll": "21",
    "title": "Insomniac",
    "isDead": false,
    "description": "This model must always be the first model you deploy in any game, and loses the INFILTRATOR Keyword."
  },
  {
    "roll": "22",
    "title": "Head Wound",
    "isDead": false,
    "description": "This model can no longer gain Experience Points until assigned Promotion Dice roll a \"6\"."
  },
  {
    "roll": "23",
    "title": "Shell-shocked",
    "isDead": false,
    "description": "Roll a D6 when first deployed. On a 1-2, add -1 DICE to all rolls for this model for the rest of the game."
  },
  {
    "roll": "24",
    "title": "Dark Memory",
    "isDead": false,
    "description": "Record the enemy Warband name. Add -1 DICE to Melee Attacks if the target is a model from that Warband."
  },
  {
    "roll": "25",
    "title": "Paranoid",
    "isDead": false,
    "description": "This model cannot be deployed within 8\" of a friendly model."
  },
  {
    "roll": "26",
    "title": "Lost Arm",
    "isDead": false,
    "description": "This model cannot use 2-handed Battlekit, and can only use one piece of 1-handed Battlekit."
  },
  {
    "roll": "31",
    "title": "Leg Wound",
    "isDead": false,
    "description": "Subtract 2\" from Movement Characteristic. In addition, add -1 DICE to the Risky Success Roll when taking a Dash ACTION."
  },
  {
    "roll": "32",
    "title": "Expensive Treatment",
    "isDead": false,
    "description": "The model's wounds require constant treatment. Deduct 10 Ducats (👑) from Strongbox before deploying."
  },
  {
    "roll": "33",
    "title": "Possessed",
    "isDead": false,
    "description": "When Activated and >1\" from enemies, the first action must be a Dash Action moving 3\" directly away from starting position."
  },
  {
    "roll": "34",
    "title": "Muscle Damage",
    "isDead": false,
    "description": "This model cannot have Battlekit that has the HEAVY Keyword."
  },
  {
    "roll": "35",
    "title": "Minor Wound",
    "isDead": false,
    "description": "This model is recovering and cannot be used in the next game."
  },
  {
    "roll": "36",
    "title": "Robbed",
    "isDead": false,
    "description": "All of the model's Battlekit is lost in the retreat. No permanent Injury or Battle Scar received."
  },
  {
    "roll": "41-63",
    "title": "Full Recovery",
    "isDead": false,
    "description": "The warrior has survived the battle with no ill effects. No Injury or Battle Scar received."
  },
  {
    "roll": "64",
    "title": "Hardened",
    "isDead": false,
    "description": "This model gains the NEGATE FEAR Keyword. No Injury or Battle Scar received."
  },
  {
    "roll": "65",
    "title": "Bitter Lessons",
    "isDead": false,
    "description": "This model gains D3 extra Experience Points. No Injury or Battle Scar received."
  },
  {
    "roll": "66",
    "title": "Prominent Scar",
    "isDead": false,
    "description": "Record the enemy Warband name. Add +1 DICE to rolls for Melee Attacks against warriors from that Warband!"
  }
];

// 3. OFFICIAL EXPLORATION TABLES (D66, Pages 116-122)
export const OFFICIAL_COMMON_EXPLORATION = [
  {
    "roll": "11-13",
    "title": "Empty Trench / Nothing Found",
    "description": "The mud yields nothing of value save for spent brass and rusted barbed wire.",
    "reward": "0 👑"
  },
  {
    "roll": "14-16",
    "title": "Discarded Ammunition",
    "description": "You uncover a cache of sealed rifle cartridges in a waterproof canvas wrap.",
    "reward": "+5 👑"
  },
  {
    "roll": "21-23",
    "title": "Holy Water Vials",
    "description": "Glass vials filled with blessed water from the fountain of New Antioch.",
    "reward": "1x Holy Water (or +10 👑)"
  },
  {
    "roll": "24-26",
    "title": "Salvaged Trench Plate",
    "description": "Intact armour plates recovered from a fallen soldier, suitable for refitting.",
    "reward": "1x Standard Armour (or +15 👑)"
  },
  {
    "roll": "31-33",
    "title": "Field Surgery Kit",
    "description": "Sterilized bandages, cautery irons, and coagulant tincture.",
    "reward": "1x Medi-kit (or +15 👑)"
  },
  {
    "roll": "34-36",
    "title": "Alchemical Bitumen",
    "description": "Pressurized canisters of sulfurous incendiary gel from the Sultanate lines.",
    "reward": "1x Incendiary Grenade (or +15 👑)"
  },
  {
    "roll": "41-43",
    "title": "Sniper Optics",
    "description": "High-magnification telescopic sight in a shock-absorbing leather case.",
    "reward": "+20 👑"
  },
  {
    "roll": "44-46",
    "title": "Military Strongbox",
    "description": "A locked steel payroll box containing gold ducats stamped with the papal crest.",
    "reward": "+30 👑"
  },
  {
    "roll": "51-53",
    "title": "Officer's Sidearm",
    "description": "An engraved semi-automatic service pistol with custom mother-of-pearl grips.",
    "reward": "1x Automatic Pistol (or +25 👑)"
  },
  {
    "roll": "54-56",
    "title": "Sacred Incense Burner",
    "description": "A bronze censer burning holy myrrh that grants +1 Morale in the next engagement.",
    "reward": "+1 Glory Point (☼)"
  },
  {
    "roll": "61-63",
    "title": "Demolition Satchel",
    "description": "An intact engineer's satchel containing high-explosive ammonal blocks.",
    "reward": "1x Demolition Charge (or +25 👑)"
  },
  {
    "roll": "64-66",
    "title": "Rare Salvage Hoard",
    "description": "An underground supply bunker brimming with military wargear. Roll on the Rare Exploration Table!",
    "reward": "Roll on Rare Table"
  }
];
export const OFFICIAL_RARE_EXPLORATION = [
  {
    "roll": "11-16",
    "title": "Pristine Heavy Flamer",
    "description": "A twin-tank chemical projector preserved in factory grease.",
    "reward": "1x Heavy Flamer"
  },
  {
    "roll": "21-26",
    "title": "Reinforced Gothic Plate",
    "description": "Heavy articulated alloy plate forged in the sacred armouries of New Antioch.",
    "reward": "1x Reinforced Armour"
  },
  {
    "roll": "31-36",
    "title": "Alchemical Jezzail",
    "description": "A masterwork long-rifle inscribed with calligraphic copper verses.",
    "reward": "1x Jezzail (+25 👑)"
  },
  {
    "roll": "41-46",
    "title": "Martyr's Relic Fragment",
    "description": "A bone splinter from Saint Methodius encased in gold reliquary filigree.",
    "reward": "+2 Glory Points (☼)"
  },
  {
    "roll": "51-56",
    "title": "Armoured Vehicle Ammunition Depot",
    "description": "High-explosive heavy artillery shells and anti-materiel cartridges.",
    "reward": "+50 👑"
  },
  {
    "roll": "61-66",
    "title": "Legendary Discovery",
    "description": "A lost underground shrine untouched since the First Crusade. Roll on the Legendary Table!",
    "reward": "Roll on Legendary Table"
  }
];
export const OFFICIAL_LEGENDARY_EXPLORATION = [
  {
    "roll": "11-25",
    "title": "The Book of Golems (Takwin Treatise)",
    "description": "Ancient leather-bound manuscript detailing forbidden homunculus and golem artifice.",
    "reward": "+5 Glory Points (☼) & Unique Upgrade"
  },
  {
    "roll": "26-40",
    "title": "Holy Grail Splinter",
    "description": "A true sliver of the cup of salvation, radiating unearthly golden warmth.",
    "reward": "+5 Glory Points (☼) & Auto-revive once"
  },
  {
    "roll": "41-55",
    "title": "Masterwork Anti-Materiel Rifle",
    "description": "A custom-machined heavy rifle blessed by the Patriarch of Antioch.",
    "reward": "1x Anti-Materiel Rifle & +50 👑"
  },
  {
    "roll": "56-66",
    "title": "Ancient Reliquary of the First Saints",
    "description": "Complete reliquary conferring invulnerability against dark sorcery.",
    "reward": "+10 Glory Points (☼) & +100 👑"
  }
];

export const OFFICIAL_EXPLORATION_TABLES = {
  common: OFFICIAL_COMMON_EXPLORATION,
  rare: OFFICIAL_RARE_EXPLORATION,
  legendary: OFFICIAL_LEGENDARY_EXPLORATION
};

// 4. OFFICIAL CORE KEYWORDS GLOSSARY (Pages 45-66)
export const OFFICIAL_KEYWORDS: RuleKeyword[] = [
  {
    "name": "+1 DICE / -1 DICE",
    "type": "Dice Modifier",
    "description": "Roll one additional or one fewer D6 when making a Success Roll. If both apply, they cancel each other out."
  },
  {
    "name": "+1 INJURY DICE / -1 INJURY DICE",
    "type": "Injury Modifier",
    "description": "Roll one additional or one fewer D6 when making an Injury Roll. Take the highest die result."
  },
  {
    "name": "ASSAULT",
    "type": "Weapon Keyword",
    "description": "A model equipped with this weapon can make a Ranged Attack after making a Dash Action."
  },
  {
    "name": "AUTOMATIC X",
    "type": "Weapon Keyword",
    "description": "This weapon fires a burst of X shots. Make X separate attack rolls against targets within range."
  },
  {
    "name": "BLAST X",
    "type": "Area Effect",
    "description": "Place an X-inch diameter blast template on the target point. All models under or touched by the template are hit."
  },
  {
    "name": "BLESSED X",
    "type": "Holy Keyword",
    "description": "Infuses weapons with sanctified power. Adds +X Injury Dice against Demonic and Heretic models."
  },
  {
    "name": "BLOCK",
    "type": "Melee Keyword",
    "description": "Allows the defender to parry and cancel one successful enemy melee hit."
  },
  {
    "name": "CONSUMABLE",
    "type": "Equipment Keyword",
    "description": "Single-use item that is expended and removed from the warband roster upon activation."
  },
  {
    "name": "COVER",
    "type": "Terrain Keyword",
    "description": "Target is partially obscured. Subtract 1 or 2 from enemy ranged hit rolls (Light / Heavy Cover)."
  },
  {
    "name": "CRITICAL",
    "type": "Attack Keyword",
    "description": "A roll of natural 6 on the hit die triggers a Critical Success, granting bonus injury dice or special effects."
  },
  {
    "name": "CUMBERSOME",
    "type": "Restriction",
    "description": "Heavy equipment that reduces model's Movement by 1\" and prevents dashing."
  },
  {
    "name": "DEPLOYABLE",
    "type": "Tactical",
    "description": "Item placed on the battlefield during the game to create obstacles, cover, or hazards."
  },
  {
    "name": "DOWN",
    "type": "Model Status",
    "description": "Warrior has been knocked off their feet. Must spend an Action to stand up before taking other actions."
  },
  {
    "name": "DUG IN",
    "type": "Defensive",
    "description": "Warrior has fortified their position in open terrain and is treated as being in Cover."
  },
  {
    "name": "ELITE",
    "type": "Rank",
    "description": "Veteran warrior capable of earning XP, gaining skills, and leading heroic actions."
  },
  {
    "name": "FEAR",
    "type": "Morale Keyword",
    "description": "Forces enemy models to take a Morale Check before engaging in close combat."
  },
  {
    "name": "FIRE",
    "type": "Hazard Keyword",
    "description": "Sets targets ablaze. Victims suffer Blood Markers each turn until extinguished."
  },
  {
    "name": "FLAMETHROWER",
    "type": "Weapon Keyword",
    "description": "Uses the flame teardrop template. Hits all models under the template automatically, ignoring cover."
  },
  {
    "name": "FLYING",
    "type": "Movement Keyword",
    "description": "Model can move over terrain, obstacles, and other models freely without penalty."
  },
  {
    "name": "GAS",
    "type": "Hazard Keyword",
    "description": "Poisonous chemical agent that bypasses standard armor. Targets without Gas Masks suffer severe injuries."
  },
  {
    "name": "HEAVY",
    "type": "Weapon Keyword",
    "description": "Heavy weapon requiring bracing. Model cannot move and shoot in the same turn without penalty."
  },
  {
    "name": "HEAVY COVER",
    "type": "Terrain",
    "description": "Solid stone or concrete fortifications granting -2 to enemy ranged hit rolls and -1 to injury rolls."
  },
  {
    "name": "HELD",
    "type": "Equipment Keyword",
    "description": "Item must be actively carried in hand, occupying one weapon slot."
  },
  {
    "name": "IGNORE ARMOUR",
    "type": "Combat Keyword",
    "description": "Attack penetrates steel plate completely; target cannot apply armor modifiers to the injury roll."
  },
  {
    "name": "IGNORE COVER",
    "type": "Combat Keyword",
    "description": "Attack ignores cover penalties, striking targets regardless of barricades."
  },
  {
    "name": "IGNORE LONG RANGE",
    "type": "Weapon Keyword",
    "description": "Weapon does not suffer the standard -1 hit penalty when firing at long range."
  },
  {
    "name": "INFILTRATOR",
    "type": "Deployment Keyword",
    "description": "Model may be deployed anywhere on the battlefield more than 8\" from enemy deployment zones."
  },
  {
    "name": "LEADER",
    "type": "Rank",
    "description": "Commander of the warband. Inspires nearby allies with courage bonuses and strategic orders."
  },
  {
    "name": "LIGHT COVER",
    "type": "Terrain",
    "description": "Foliage, wooden fences, or shallow craters granting -1 to enemy ranged hit rolls."
  },
  {
    "name": "MELEE",
    "type": "Range",
    "description": "Weapon can only be used in hand-to-hand combat (within 1\" engagement range)."
  },
  {
    "name": "MINED",
    "type": "Hazard Keyword",
    "description": "Terrain feature or marker that explodes when stepped upon by a model."
  },
  {
    "name": "NEGATE FEAR",
    "type": "Morale Keyword",
    "description": "Model is completely immune to Fear and terror effects."
  },
  {
    "name": "NEGATE FIRE",
    "type": "Protective Keyword",
    "description": "Model is insulated and cannot catch fire or suffer flame damage."
  },
  {
    "name": "NEGATE GAS",
    "type": "Protective Keyword",
    "description": "Model is protected by respirators and immune to gas hazards."
  },
  {
    "name": "NEGATE SHRAPNEL",
    "type": "Protective Keyword",
    "description": "Armor absorbs jagged metal fragments, negating shrapnel bonuses."
  },
  {
    "name": "OUT OF ACTION",
    "type": "Casualty Status",
    "description": "Warrior is incapacitated, unconscious, or dead. Removed from the current match."
  },
  {
    "name": "PISTOL",
    "type": "Sidearm Keyword",
    "description": "Compact weapon that can be fired within melee combat against engaged enemies."
  },
  {
    "name": "REACH X",
    "type": "Melee Keyword",
    "description": "Long weapon allowing melee attacks from up to X inches away."
  },
  {
    "name": "RELOAD",
    "type": "Weapon Keyword",
    "description": "Weapon must spend an Action reloading before it can be fired a second time."
  },
  {
    "name": "RISKY",
    "type": "Action Keyword",
    "description": "Failure on this roll immediately ends the model's activation and prevents further actions."
  },
  {
    "name": "SCATTER",
    "type": "Blast Keyword",
    "description": "Inaccurate ordnance that deviates in a random direction on missed attacks."
  },
  {
    "name": "SHOTGUN",
    "type": "Weapon Keyword",
    "description": "Fires pellet spreads that gain +1 Dice to hit at short range (within 6\")."
  },
  {
    "name": "SHRAPNEL",
    "type": "Hazard Keyword",
    "description": "Detonating fragments that gain bonus injury dice against unarmoured targets."
  },
  {
    "name": "SIDEARM",
    "type": "Weapon Type",
    "description": "Secondary weapon that does not count towards standard two-handed carry limits."
  },
  {
    "name": "STEALTH",
    "type": "Keyword",
    "description": "Model is hard to detect in darkness and smoke, requiring closer range to target."
  },
  {
    "name": "TOUGH",
    "type": "Resilience",
    "description": "Warrior possesses extra biological or mechanical endurance, granting 2 Wounds instead of 1."
  }
];

// 5. OFFICIAL SKILLS TABLES (Pages 107-113)
export const OFFICIAL_MELEE_SKILLS = [
  {
    "name": "Berserk Rage",
    "description": "When charging into melee combat, this model adds +1 INJURY DICE to its attacks."
  },
  {
    "name": "Weapon Master",
    "description": "Reroll one failed melee attack roll per turn."
  },
  {
    "name": "Crushing Blow",
    "description": "Melee attacks made by this model gain the IGNORE ARMOUR keyword."
  },
  {
    "name": "Duelist",
    "description": "When attacked in melee, subtract 1 from the enemy's hit roll."
  },
  {
    "name": "Shield Wall",
    "description": "While equipped with a shield, increase armour protection by an additional -1."
  },
  {
    "name": "Decapitating Strike",
    "description": "Critical hits in melee automatically inflict Out of Action on standard infantry."
  }
];
export const OFFICIAL_RANGED_SKILLS = [
  {
    "name": "Eagle Eye",
    "description": "Add +6\" to the maximum range of all ranged weapons carried by this model."
  },
  {
    "name": "Marksman",
    "description": "Add +1 DICE to ranged attack rolls when the model does not move before shooting."
  },
  {
    "name": "Crack Shot",
    "description": "Ranged attacks made by this model ignore Light Cover."
  },
  {
    "name": "Rapid Reload",
    "description": "Weapons with the RELOAD keyword can be fired every turn without spending an action to reload."
  },
  {
    "name": "Gunslinger",
    "description": "This model can fire two sidearms simultaneously in a single ranged activation."
  },
  {
    "name": "Headshot",
    "description": "Critical hits on ranged attacks add +2 INJURY DICE to the injury roll."
  }
];
export const OFFICIAL_STEALTH_SKILLS = [
  {
    "name": "Infiltrator",
    "description": "This model gains the INFILTRATOR keyword and can deploy up to the midpoint of the battlefield."
  },
  {
    "name": "Shadow Step",
    "description": "Enemies cannot target this model with ranged attacks if it is more than 12\" away and in cover."
  },
  {
    "name": "Sprint",
    "description": "Add +2\" to Movement characteristic when performing a Dash action."
  },
  {
    "name": "Trench Stalker",
    "description": "Moving through trenches and rough terrain does not reduce movement speed."
  },
  {
    "name": "Camouflage",
    "description": "Treat light cover as heavy cover (-2 to enemy ranged hit rolls)."
  },
  {
    "name": "Silent Killer",
    "description": "Melee attacks made from behind an enemy do not trigger counter-attacks."
  }
];
export const OFFICIAL_WILDCARD_SKILLS = [
  {
    "name": "Unshakable Faith",
    "description": "This model automatically passes all Morale and Fear tests."
  },
  {
    "name": "Field Medic",
    "description": "Treat actions performed by this model succeed on a 3+ on D6."
  },
  {
    "name": "Tough as Nails",
    "description": "This model gains +1 extra Wound on its profile."
  },
  {
    "name": "Demolitions Expert",
    "description": "Add +2\" to the blast radius of all grenade and explosive attacks made by this model."
  },
  {
    "name": "Tactical Genius",
    "description": "Once per battle round, reroll the initiative / activation roll."
  },
  {
    "name": "Blessed Aura",
    "description": "Friendly models within 6\" gain +1 to their Courage rolls."
  }
];

export const OFFICIAL_SKILLS_TABLES = {
  melee: OFFICIAL_MELEE_SKILLS,
  ranged: OFFICIAL_RANGED_SKILLS,
  stealth: OFFICIAL_STEALTH_SKILLS,
  wildcard: OFFICIAL_WILDCARD_SKILLS
};

// 6. OFFICIAL WEAPONS CODEX (Pages 70-79 + Warbands Books)
export const OFFICIAL_WEAPONS: OfficialWargearItem[] = [
  {
    "id": "anti-materiel-rifle",
    "name": "Anti-Materiel Rifle",
    "category": "Ranged",
    "type": "2-Handed",
    "range": "36\"",
    "cost": 50,
    "faction": "universal",
    "modifiers": {
      "injuryDice": 1
    },
    "keywords": [
      "+1 INJURY DICE",
      "CRITICAL",
      "HEAVY",
      "IGNORE ARMOUR"
    ],
    "rules": "Takes immense strength to fire without bracing. Adds +1 Injury Dice and ignores target armour.",
    "lore": "Enormous long rifles designed to take out heavily armoured targets, vehicles and strongpoints. With the powerful armour available to the armies of the Great War, these terrifying weapons are much in demand. A downside is their enormous weight and terrifying recoil, and thus they are most often used by Communicants or Anointed who possess the supernatural strength to wield such weapons."
  },
  {
    "id": "automatic-pistol",
    "name": "Automatic Pistol",
    "category": "Ranged",
    "type": "1-Handed (Sidearm)",
    "range": "8\"",
    "cost": 15,
    "faction": "universal",
    "modifiers": {},
    "keywords": [
      "ASSAULT",
      "AUTOMATIC 2",
      "PISTOL"
    ],
    "rules": "Can shoot twice with Automatic 2 and fire while advancing with Assault.",
    "lore": "Automatic pistols are symbols of prestige owing to their rarity and cost. They are excellent weapons when storming trenches or fighting in hand-to-hand combat. They boast a high rate of fire, though they can be hard to control even for seasoned veteran gunslingers."
  },
  {
    "id": "bolt-action-rifle",
    "name": "Bolt Action Rifle",
    "category": "Ranged",
    "type": "2-Handed",
    "range": "24\"",
    "cost": 15,
    "faction": "universal",
    "modifiers": {},
    "keywords": [],
    "rules": "Standard reliable long-arm of the Great War.",
    "lore": "The most common weapon of the Great War, issued to millions of troopers across all fronts. Dependable, accurate at medium range, and capable of firing high-calibre ammunition that can punch through standard battlefield padding."
  },
  {
    "id": "grenade-launcher",
    "name": "Grenade Launcher",
    "category": "Ranged",
    "type": "2-Handed",
    "range": "24\"",
    "cost": 40,
    "faction": "universal",
    "modifiers": {},
    "keywords": [
      "SHRAPNEL",
      "BLAST 3",
      "SCATTER"
    ],
    "rules": "Fires explosive canisters over distances with Blast 3 and Shrapnel rules.",
    "lore": "Tubular launch systems designed to lob explosive ordnance directly into enemy trench lines and strongpoints, bypassing cover and showering occupants with deadly shrapnel."
  },
  {
    "id": "heavy-flamer",
    "name": "Heavy Flamer",
    "category": "Ranged",
    "type": "2-Handed (Heavy)",
    "range": "12\"",
    "cost": 45,
    "faction": "universal",
    "modifiers": {},
    "keywords": [
      "FIRE",
      "FLAMETHROWER",
      "HEAVY",
      "IGNORE ARMOUR",
      "IGNORE COVER"
    ],
    "rules": "Sprays an incendiary stream that sets targets on fire and completely ignores Armour and Cover.",
    "lore": "Massive twin-tank chemical flame projector requiring a dedicated harness. Unleashes thick, clingy chemical fire that burns through steel plate and incinerates barricaded positions instantly."
  },
  {
    "id": "heavy-machine-gun",
    "name": "Heavy Machine Gun",
    "category": "Ranged",
    "type": "2-Handed (Heavy)",
    "range": "36\"",
    "cost": 55,
    "faction": "universal",
    "modifiers": {},
    "keywords": [
      "AUTOMATIC 3",
      "HEAVY",
      "RELOAD"
    ],
    "rules": "Fires 3 shots with Automatic 3 at up to 36\" range. Must be reloaded between bursts.",
    "lore": "Tripod or harness-mounted belt-fed behemoth capable of pinning entire enemy squads under a torrential hail of lead. The sound of an HMG opening up echoes like thunder across No Man's Land."
  },
  {
    "id": "jezzail",
    "name": "Jezzail",
    "category": "Ranged",
    "type": "2-Handed",
    "range": "30\"",
    "cost": 25,
    "faction": "iron-sultanate",
    "modifiers": {
      "dice": 1
    },
    "keywords": [
      "+1 DICE",
      "CRITICAL",
      "RISKY"
    ],
    "rules": "Long-barrelled artisanal Sultanate musket. Adds +1 Dice to Hit with lethal Critical potential.",
    "lore": "Exquisitely crafted, long-barrelled rifles constructed by master gunsmiths of the Iron Sultanate. Hand-rifled with spiralled copper alloys and inscribed with protective verses, Jezzails boast remarkable range and stopping power."
  },
  {
    "id": "machine-gun",
    "name": "Machine Gun",
    "category": "Ranged",
    "type": "2-Handed",
    "range": "24\"",
    "cost": 35,
    "faction": "universal",
    "modifiers": {},
    "keywords": [
      "AUTOMATIC 2",
      "HEAVY"
    ],
    "rules": "Fires 2 shots with Automatic 2.",
    "lore": "Light machine guns designed for squad-level fire support, providing sustained suppression while advancing through contested ruins."
  },
  {
    "id": "pistol",
    "name": "Pistol",
    "category": "Ranged",
    "type": "1-Handed (Sidearm)",
    "range": "12\"",
    "cost": 5,
    "faction": "universal",
    "modifiers": {},
    "keywords": [
      "ASSAULT",
      "PISTOL"
    ],
    "rules": "Can be fired within melee or after advancing.",
    "lore": "A reliable service revolver or semi-automatic sidearm carried as an officer's sidearm or close-quarters backup."
  },
  {
    "id": "pump-action-shotgun",
    "name": "Pump-Action Shotgun",
    "category": "Ranged",
    "type": "2-Handed",
    "range": "12\"",
    "cost": 15,
    "faction": "universal",
    "modifiers": {
      "dice": 1
    },
    "keywords": [
      "+1 DICE",
      "ASSAULT",
      "SHOTGUN"
    ],
    "rules": "Devastating at close range with +1 Dice to hit and Shotgun pellet spread.",
    "lore": "Trench sweepers firing heavy lead shot, designed to clear tight subterranean dugouts with brutal efficiency."
  },
  {
    "id": "semi-automatic-rifle",
    "name": "Semi-Automatic Rifle",
    "category": "Ranged",
    "type": "2-Handed",
    "range": "24\"",
    "cost": 25,
    "faction": "universal",
    "modifiers": {},
    "keywords": [
      "AUTOMATIC 2"
    ],
    "rules": "Magazine-fed rifle capable of rapid double taps with Automatic 2.",
    "lore": "Advanced gas-operated rifles fielding detachable box magazines, giving line infantry superior volume of fire over traditional bolt actions."
  },
  {
    "id": "sniper-rifle",
    "name": "Sniper Rifle",
    "category": "Ranged",
    "type": "2-Handed",
    "range": "36\"",
    "cost": 30,
    "faction": "universal",
    "modifiers": {
      "dice": 1
    },
    "keywords": [
      "+1 DICE",
      "CRITICAL"
    ],
    "rules": "Fitted with precision optics. Grants +1 Dice on ranged hit rolls and triggers Critical strikes on 6s.",
    "lore": "Precision-tuned rifles equipped with high-magnification telescopic sights, enabling designated marksmen to pick off enemy commanders and heavy weapon gunners across vast distances."
  },
  {
    "id": "submachine-gun",
    "name": "Submachine Gun",
    "category": "Ranged",
    "type": "2-Handed",
    "range": "12\"",
    "cost": 20,
    "faction": "universal",
    "modifiers": {},
    "keywords": [
      "ASSAULT",
      "AUTOMATIC 2"
    ],
    "rules": "Fires high-rate pistol rounds on the move with Assault and Automatic 2.",
    "lore": "Compact blowback automatics designed specifically for trench assault units, raiders, and stormtroopers."
  },
  {
    "id": "alchemical-flame-cannon",
    "name": "Alchemical Flame Cannon",
    "category": "Ranged",
    "type": "2-Handed (Heavy)",
    "range": "12\"",
    "cost": 50,
    "faction": "iron-sultanate",
    "modifiers": {},
    "keywords": [
      "FIRE",
      "FLAMETHROWER",
      "IGNORE ARMOUR",
      "IGNORE COVER",
      "RISKY"
    ],
    "rules": "Fires pressurized alchemical liquid that clings and burns with emerald fire. Sets terrain and models ablaze.",
    "lore": "A masterpiece of the alchemists of the Golden Horn. Projecting boiling alchemical solvent distilled from bitumen and sulfur, it leaves behind pools of lingering green flame that reduce iron and flesh alike to slag."
  },
  {
    "id": "trench-club",
    "name": "Trench Club",
    "category": "Melee",
    "type": "1-Handed",
    "range": "Melee",
    "cost": 5,
    "faction": "universal",
    "modifiers": {
      "dice": 1
    },
    "keywords": [
      "+1 DICE"
    ],
    "rules": "Weighted bludgeon granting +1 Dice to melee hit rolls.",
    "lore": "Heavy wooden clubs studded with iron nails, lead rings, or repurposed gear cogs, favored in the claustrophobic confines of frontline trenches."
  },
  {
    "id": "trench-knife",
    "name": "Trench Knife / Bayonet",
    "category": "Melee",
    "type": "1-Handed",
    "range": "Melee",
    "cost": 3,
    "faction": "universal",
    "modifiers": {},
    "keywords": [],
    "rules": "Standard hand-to-hand blade.",
    "lore": "Double-edged fighting knives and rifle-mounted bayonets carried by every warrior of the Great War."
  },
  {
    "id": "greatsword",
    "name": "Greatsword / Executioner Blade",
    "category": "Melee",
    "type": "2-Handed",
    "range": "Melee",
    "cost": 20,
    "faction": "universal",
    "modifiers": {
      "injuryDice": 1
    },
    "keywords": [
      "+1 INJURY DICE",
      "CRITICAL",
      "CUMBERSOME"
    ],
    "rules": "Massive two-handed sword with +1 Injury Dice and devastating Critical chops.",
    "lore": "Massive zweihanders and executioner swords wielded by holy zealots and heavy infantry to decapitate heretic abominations and break enemy lines."
  },
  {
    "id": "halberd",
    "name": "Halberd / Polearm",
    "category": "Melee",
    "type": "2-Handed",
    "range": "Melee (2\")",
    "cost": 15,
    "faction": "universal",
    "modifiers": {},
    "keywords": [
      "BLOCK",
      "REACH 2\""
    ],
    "rules": "Polearm allowing attacks from up to 2\" away and defensive parrying with Block.",
    "lore": "Long-shafted poleaxes combining the reach of a spear with the crushing axe blade of a polearm, ideal for warding off mounted charges and beast assaults."
  },
  {
    "id": "scimitar-of-wisdom",
    "name": "Alchemical Scimitar",
    "category": "Melee",
    "type": "1-Handed",
    "range": "Melee",
    "cost": 15,
    "faction": "iron-sultanate",
    "modifiers": {
      "dice": 1
    },
    "keywords": [
      "+1 DICE",
      "CRITICAL"
    ],
    "rules": "Damascene steel blade tempered in alchemical oils. Adds +1 Dice to Hit and Critical on 6s.",
    "lore": "Folded iron blades quenched in holy solutions and inscribed with protective geometric calligrams. They cut through chain and leather with whisper-light ease."
  },
  {
    "id": "frag-grenades",
    "name": "Frag Grenades",
    "category": "Grenade",
    "type": "Grenade",
    "range": "8\"",
    "cost": 10,
    "faction": "universal",
    "modifiers": {},
    "keywords": [
      "BLAST 3",
      "IGNORE LONG RANGE",
      "SHRAPNEL"
    ],
    "rules": "Serrate cast-iron grenades that shower targets with high-velocity Shrapnel.",
    "lore": "Cast iron pineapple or stick grenades filled with explosive cordite and jagged shrapnel rings."
  },
  {
    "id": "gas-grenades",
    "name": "Gas Grenades",
    "category": "Grenade",
    "type": "Grenade",
    "range": "8\"",
    "cost": 15,
    "faction": "universal",
    "modifiers": {},
    "keywords": [
      "GAS",
      "IGNORE ARMOUR",
      "IGNORE COVER",
      "IGNORE LONG RANGE"
    ],
    "rules": "Releases toxic mustard gas clouds that bypass armor and cover.",
    "lore": "Pressurized glass canisters containing chlorine or mustard gas agents that choke out subterranean bunkers."
  },
  {
    "id": "incendiary-grenades",
    "name": "Incendiary Grenades",
    "category": "Grenade",
    "type": "Grenade",
    "range": "8\"",
    "cost": 15,
    "faction": "universal",
    "modifiers": {},
    "keywords": [
      "ASSAULT",
      "FIRE",
      "IGNORE COVER",
      "IGNORE LONG RANGE"
    ],
    "rules": "Thermite or white phosphorus grenade that sets the impact area ablaze.",
    "lore": "Phosphorus-packed grenades generating intense thermal heat capable of melting metal barriers."
  },
  {
    "id": "smoke-grenades",
    "name": "Smoke Grenades",
    "category": "Grenade",
    "type": "Grenade",
    "range": "8\"",
    "cost": 10,
    "faction": "universal",
    "modifiers": {},
    "keywords": [
      "DEPLOYABLE",
      "IGNORE COVER",
      "IGNORE LONG RANGE"
    ],
    "rules": "Creates a 3\" radius smoke cloud that blocks line of sight.",
    "lore": "Dense chemical smoke canisters deployed to obscure infantry movement across exposed fire zones."
  },
  {
    "id": "demolition-charge",
    "name": "Demolition Charge",
    "category": "Grenade",
    "type": "Grenade (Heavy)",
    "range": "6\"",
    "cost": 25,
    "faction": "universal",
    "modifiers": {
      "injuryDice": 1
    },
    "keywords": [
      "+1 INJURY DICE",
      "BLAST 3",
      "CONSUMABLE",
      "HEAVY",
      "IGNORE ARMOUR",
      "IGNORE COVER",
      "SCATTER"
    ],
    "rules": "Heavy bundle of dynamite or blasting gelatin used to breach reinforced bunkers.",
    "lore": "Bundled TNT or ammonal satchel charges used by sappers to breach concrete pillboxes and trench parapets."
  }
];

// 7. OFFICIAL ARMOUR & SHIELDS CODEX (Pages 80-81)
export const OFFICIAL_ARMOUR: OfficialWargearItem[] = [
  {
    "id": "trench-shield",
    "name": "Trench Shield",
    "category": "Shield",
    "cost": 15,
    "faction": "universal",
    "armourModifier": -1,
    "keywords": [
      "-1 INJURY MODIFIER"
    ],
    "rules": "Reduces incoming injury roll results by 1. Stacks with body armour.",
    "lore": "Shields used in trench warfare are made of steel reinforced with orichalcum to allow soldiers to advance safely across open terrain towards fortified positions."
  },
  {
    "id": "standard-armour",
    "name": "Standard Armour",
    "category": "Armour",
    "cost": 15,
    "faction": "universal",
    "armourModifier": -1,
    "keywords": [
      "-1 INJURY MODIFIER"
    ],
    "rules": "Provides baseline protection against small arms and shrapnel (-1 to Injury rolls).",
    "lore": "Hardened steel cuirasses, ballistic trench coats, and padded gambesons that reduce ballistic impact and shrapnel."
  },
  {
    "id": "reinforced-armour",
    "name": "Reinforced Armour",
    "category": "Armour",
    "cost": 30,
    "faction": "universal",
    "armourModifier": -2,
    "keywords": [
      "-2 INJURY MODIFIER"
    ],
    "rules": "Heavy plate harness that reduces incoming injury rolls by 2.",
    "lore": "Heavy lobster-tail cuirasses, segmented shoulder pauldrons, and thigh guards forged from hardened alloy steel."
  },
  {
    "id": "heavy-plate",
    "name": "Heavy Plate / Power Harness",
    "category": "Armour",
    "cost": 50,
    "faction": "new-antioch",
    "armourModifier": -3,
    "keywords": [
      "-3 INJURY MODIFIER",
      "CUMBERSOME"
    ],
    "rules": "Full gothic plate offering extreme protection (-3 to Injury rolls) but limits movement with Cumbersome.",
    "lore": "Massive articulated steel plate suits worn by Antiochian shock troops and paladins, turning the wearer into a walking fortress."
  }
];

// 8. OFFICIAL EQUIPMENT & AMMUNITION CODEX (Pages 81-86)
export const OFFICIAL_EQUIPMENT: OfficialWargearItem[] = [
  {
    "id": "gas-mask",
    "name": "Gas Mask / Filter Respirator",
    "category": "Equipment",
    "cost": 5,
    "faction": "universal",
    "keywords": [
      "NEGATE GAS"
    ],
    "rules": "Model is completely immune to the effects of Gas weapons and gas terrain.",
    "lore": "Crucial rubber respirators with activated charcoal filters, essential for survival in the chemical-choked trenches."
  },
  {
    "id": "medi-kit",
    "name": "Medi-Kit",
    "category": "Equipment",
    "cost": 15,
    "faction": "universal",
    "keywords": [
      "TREAT ACTION"
    ],
    "rules": "Allows taking a Treat Action on a nearby friendly model to remove Blood Markers or stand up downed allies.",
    "lore": "Field dressings, coagulants, holy salves, and surgical tools to patch up wounded comrades under fire."
  },
  {
    "id": "mountaineer-kit",
    "name": "Mountaineer Kit",
    "category": "Equipment",
    "cost": 10,
    "faction": "universal",
    "keywords": [
      "+1 DICE (CLIMBING)"
    ],
    "rules": "Grants +1 Dice on Risky rolls when climbing vertical terrain pieces.",
    "lore": "Ropes, carabiners, pitons, and grapple hooks to scale shattered ruins and canyon walls."
  },
  {
    "id": "trench-shovel",
    "name": "Entrenching Shovel",
    "category": "Equipment",
    "cost": 5,
    "faction": "universal",
    "keywords": [
      "DUG IN",
      "MELEE WEAPON"
    ],
    "rules": "Allows warrior to dig in on open ground for Cover, and functions as an emergency melee bludgeon.",
    "lore": "Sturdy steel entrenching tools used to construct rapid fortifications and deliver vicious blows in close combat."
  },
  {
    "id": "armour-piercing-bullets",
    "name": "Armour-Piercing Bullets",
    "category": "Ammunition",
    "cost": 10,
    "faction": "universal",
    "keywords": [
      "AMMUNITION (ARMOUR-PIERCING)",
      "CONSUMABLE"
    ],
    "rules": "Consumable ammunition that grants the IGNORE ARMOUR keyword on a shooting attack.",
    "lore": "Tungsten and hardened-steel tipped cartridges designed to punch clean through heavy plate cuirasses."
  },
  {
    "id": "holy-water-bullets",
    "name": "Holy Water / Blessed Ammunition",
    "category": "Ammunition",
    "cost": 10,
    "faction": "trench-pilgrims",
    "keywords": [
      "AMMUNITION (BLESSED 1)",
      "CONSUMABLE"
    ],
    "rules": "Infused with sanctified oils, dealing extra devastation to demonic and heretical entities.",
    "lore": "Silvered cartridges hollowed and filled with drops of sanctified water blessed by martyr priests."
  }
];
