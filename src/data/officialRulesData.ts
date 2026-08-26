// Genuine Official Trench Crusade Rulebook Data (Digital Rulebook 1.0.2 & Campaign Rules)

export interface OfficialScenario {
  id: string;
  number: number;
  roman: string;
  name: string;
  slug: string;
  tagline: string;
  mapImage: string;
  tableSize: string;
  forces: string;
  battlefield: string;
  deployment: string;
  gameLength: string;
  victoryConditions: string;
  gloriousDeeds: string;
  fullRulesMarkdown: string;
}

export interface TraumaTableEntry {
  roll: string;
  title: string;
  isDead: boolean;
  description: string;
}

export interface ExplorationTableEntry {
  roll: string;
  title: string;
  reward: string;
  description: string;
}

export interface SkillEntry {
  name: string;
  description: string;
}

export interface RuleKeywordEntry {
  name: string;
  type: string;
  description: string;
}

// 1. ALL 12 OFFICIAL SCENARIOS (Pages 151-197)
export const OFFICIAL_SCENARIOS: OfficialScenario[] = [
  {
    "id": "claim-no-mans-land",
    "number": 1,
    "roman": "I",
    "name": "I. Claim No Man’s Land",
    "slug": "claim-no-mans-land",
    "tagline": "Battle for control over a stretch of land and drive away your foes.",
    "mapImage": "/maps/claim-no-mans-land.png",
    "tableSize": "48\" x 48\" (or 36\" x 36\" for skirmish)",
    "forces": "No special restrictions apply to the models the players can include in their Forces in this scenario.",
    "battlefield": "The players roll-off and the winner sets up the terrain for the game. This scenario uses the No Man’s Land battlefield archetype. 6” 6” 24” MIDPOINT",
    "deployment": "The players roll-off. The winner of the roll-off chooses which Deployment Zone will be theirs. The other Deployment Zone is their opponent’s. The players then alternate deploying their models one at a time, starting with the player who has more models in their Warband (roll-off if both players have the same number of models). Models must be set up wholly within their own Deployment Zone. If a player runs out of models to set up, the other player sets up all their remaining models, one after another until they have none left. Once the players have set up their models, deployment ends and the game begins. Infiltrators Infiltrators must deploy normally (they cannot use their special deployment rules).",
    "gameLength": "This scenario lasts four Turns.",
    "victoryConditions": "A player wins this scenario immediately if there are no enemy models on the battlefield, or if the opposing Warband flees (typically due to failing a Morale Check). Otherwise, the player with more Victory Points at the end of the game is the winner. Victory Points ** At the end of each Turn, each player scores 2 VPs for each Objective they control. ** At the end of the game each player scores 1 VP for each Glorious Deed they completed.",
    "gloriousDeeds": "** Bloodletting: An attack made by a friendly model results in the sixth BLOOD MARKER being placed beside an enemy model. ** Cast Them Down: A friendly model causes an enemy model to Fall from a height of at least 3” (e.g. by taking the enemy model Down near a ledge, or by forcing it off a ledge in some way). ** Hold Your Ground: A Warband is the first to pass a Morale Check in this game. You receive a Victory Point for achieving this Glorious Deed. In a campaign game you can award 1 Experience Point to 1 ELITE model from the Warband that has the LEADER Keyword if you have one available, and you receive Glory Points and an extra D6 for your Promotion Pool as you would normally. ** Lord of War: A friendly model takes two enemy models Out of Action with Melee Attacks in a single Turn. ** Resist and Bite: A friendly model that began its Activation Down takes an enemy model Out of Action in the same Activation. ** Sniper: A friendly model takes an enemy ELITE model Out of Action with a Ranged Weapon Attack that has the Long Range and Cover modifiers. ** Suicidal Bravery: A friendly model successfully charges two models with the same charge move.",
    "fullRulesMarkdown": "I º Claim No Man’s Land\nBattle for control over a stretch of land and drive away your foes.\nFORCES\nNo special restrictions apply to the models the players can include in their Forces \nin this scenario.\nTHE BATTLEFIELD\nThe players roll-off and the winner sets up the terrain for the game. This scenario \nuses the No Man’s Land battlefield archetype.\n6”\n6”\n24”\nMIDPOINT\nDEPLOYMENT ZONE\nDEPLOYMENT ZONE\n\n\n\n\n\n \nObjective Markers\nThe Markers shown on the map represent important objectives. When you set up \nthe terrain pieces for this scenario, you must place the first five terrain pieces so \nthat they are covering the locations where the Objective Markers will be set up. In \naddition, you must use Ruined Building terrain pieces if you have them available. \nThe Objective Markers are set up after all of the terrain. Place each Objective \nMarker anywhere on the terrain piece that covers its starting position; the whole \nof the terrain piece is treated as the Objective for this scenario, and cannot be \ndestroyed or removed for any reason..\nControlling Objectives\nA player controls an Objective terrain piece if there are more friendly models on, \nin, or within 1” of the terrain piece than there are enemy models. If one player has \nany models on the terrain piece and their opponent does not, then the player with \nmodels on the terrain piece controls it even if their opponent has more models \nwithin 1” of the Objective.\nDEPLOYMENT\nThe players roll-off. The winner of the roll-off chooses which Deployment Zone \nwill be theirs. The other Deployment Zone is their opponent’s. The players then \nalternate deploying their models one at a time, starting with the player who has \nmore models in their Warband (roll-off if both players have the same number of \nmodels). Models must be set up wholly within their own Deployment Zone. If \na player runs out of models to set up, the other player sets up all their remaining \nmodels, one after another until they have none left. Once the players have set up \ntheir models, deployment ends and the game begins.\nInfiltrators\nInfiltrators must deploy normally (they cannot use their special deployment rules).\nGAME LENGTH\nThis scenario lasts four Turns.\n\n\n\n\n\n \nVICTORY CONDITIONS\nA player wins this scenario immediately if there are no enemy models on the \nbattlefield, or if the opposing Warband flees (typically due to failing a Morale \nCheck). Otherwise, the player with more Victory Points at the end of the \ngame is the winner.\nVictory Points\n\t**\tAt the end of each Turn, each player scores 2 VPs for each \nObjective they control.\n\t**\tAt the end of the game each player scores 1 VP for each Glorious Deed \nthey completed.\nGLORIOUS DEEDS\n\t**\tBloodletting: An attack made by a friendly model results in the sixth BLOOD \nMARKER being placed beside an enemy model.\n\t**\tCast Them Down: A friendly model causes an enemy model to Fall from a \nheight of at least 3” (e.g. by taking the enemy model Down near a ledge, or by \nforcing it off a ledge in some way).\n\t**\tHold Your Ground: A Warband is the first to pass a Morale Check in this game. \nYou receive a Victory Point for achieving this Glorious Deed. In a campaign \ngame you can award 1 Experience Point to 1 ELITE model from the Warband \nthat has the LEADER Keyword if you have one available, and you receive Glory \nPoints and an extra D6 for your Promotion Pool as you would normally.\n\t**\tLord of War: A friendly model takes two enemy models Out of Action with \nMelee Attacks in a single Turn.\n\t**\tResist and Bite: A friendly model that began its Activation Down takes an \nenemy model Out of Action in the same Activation.\n\t**\tSniper: A friendly model takes an enemy ELITE model Out of Action with a \nRanged Weapon Attack that has the Long Range and Cover modifiers.\n\t**\tSuicidal Bravery: A friendly model successfully charges two models with the \nsame charge move."
  },
  {
    "id": "hunt-for-heroes",
    "number": 2,
    "roman": "II",
    "name": "II. Hunt for Heroes",
    "slug": "hunt-for-heroes",
    "tagline": "Hunt down the enemy leaders while protecting your own.",
    "mapImage": "/maps/hunt-for-heroes.png",
    "tableSize": "48\" x 48\" (or 36\" x 36\" for skirmish)",
    "forces": "In this scenario, both players must include as many ELITE models from their Warband as possible.",
    "battlefield": "The players roll-off and the winner sets up the terrain for the game. This scenario uses the No Man’s Land battlefield archetype.",
    "deployment": "The players roll-off. The winner of the roll-off chooses which Deployment Zone will be theirs. The other Deployment Zone is their opponent’s. The players then alternate deploying their models one at a time, starting with the player who has more models in their Warband (roll-off if both players have the same number of models). Models must be set up wholly within their own Deployment Zone. If a player runs out of models to set up, the other player sets up all their remaining models, one after another, until they have none left. Once the players have set up their models, deployment ends, and the game begins. Infiltrators Infiltrators can deploy normally or by using their special deployment rules. However, if they deploy using their special deployment rules, they cannot deploy within 8” of an Objective. Marks & Assets After the deployment, each player must secretly write down up to three enemy models with the ELITE Keyword as Marks, and one friendly model that has the ELITE Keyword as an Asset. Taking out enemy Marks and keeping the friendly Asset alive will score additional Victory Points at the end of the game (▶ see below). I UNFORESEEN EVENTS At the start of each Turn after the first, one of the players must roll a D6. On a roll of 1-4 nothing happens, but on a 5 or 6, an Unforeseen Event takes place (do not roll again to see if any further Unforeseen Events take place). Roll D3 and look up the roll on the table below to see what happens. D3 Unforeseen Event 1 Rising Fog: Heavy fog covers the entire combat zone, drastically limiting visibility for all models. During this Turn and the next Turn, all Ranged Weapons have their Range halved (short range will be half the reduced Range). 2 Rain, Mud, and Guts: The clouds roar and wail as a sudden downpour strikes the battlefield, leaving the ground muddy and bloody, and battlekit heavy and wet. During this Turn and the next Turn, add -2 DICE to rolls for Melee Attacks. 3 Deep Craters: A sudden and violent earthquake hits the area, sending tremors through the earth as the land splits and caves in, forming deep craters all over the warzone. The players roll-off. Starting with the winner, they take it in turn to each placing Crater Markers, one at a time, until 6 new Markers have been placed. The Crater Markers cannot be placed within a Deployment Zone or within 2” of a terrain piece or a model. Open terrain within 2” of the centre of the Crater Marker is considered to be a pit that has sheer sides and is D3+3” deep (roll separately for each Marker when it is placed). Models can Jump Down or Fall into the pit, and will need to Climb in order to leave it. Crater Markers can be represented by a suitable terrain piece that is up to 4” across, if any are available.",
    "gameLength": "This scenario lasts five Turns.",
    "victoryConditions": "A player wins this scenario immediately if there are no enemy models on the battlefield or if the opposing Warband flees (typically due to failing a Morale Check). Otherwise, the player with more Victory Points at the end of the game is the winner. Victory Points ** At the end of each Turn, each player scores 1 VP for each Objective that is within 1” of one or more of their models and 1 VP for each Objective they control. ** At the end of the game each player scores: * 1 VP for each Glorious Deed they completed. * 2 VPs for each enemy Mark that was taken Out of Action. * 3 VPs if the friendly Asset was not taken Out of Action. I",
    "gloriousDeeds": "** Sharpshooter: A friendly model in cover takes an enemy ELITE model Out of Action with a Ranged Attack with the Long Range modifier. ** Dangerous Fall: A friendly model causes an enemy model to Fall into a crater (▶ see Unforeseen Events). ** Death From Above: A friendly model takes an enemy model Out of Action with a Melee Attack with the Diving Charge modifier. ** High Risk, High Reward: An Asset takes an enemy Mark Out of Action. To claim this deed, the player must first reveal that their model was an Asset and that the enemy model was a Mark. ** Kill their Leaders: Take all of the enemy Marks Out of Action. To claim this deed, the player must first reveal which enemy models were their Marks. The model that took the last Mark Out of Action is credited with completing this Glorious Deed. I",
    "fullRulesMarkdown": "II º Hunt for Heroes\nHunt down the enemy leaders while protecting your own. \nFORCES\nIn this scenario, both players must include as many ELITE models from their \nWarband as possible.\nTHE BATTLEFIELD\nThe players roll-off and the winner sets up the terrain for the game. This scenario \nuses the No Man’s Land battlefield archetype.\nObjective Markers\nThe Markers shown on the map with a white cross represent important objectives. \nWhen you set up the terrain pieces for this scenario, you must place the first four \nterrain pieces so that they are covering the locations where the Objective Markers \nwill be set up. In addition, you must use Ruined Building terrain pieces if you have \nthem available. The Objective Markers are set up after all of the terrain. Place the \nObjective Marker anywhere on the terrain piece that covers its starting position; \n5”\n5”\n5”\n5”\n8”\n10”\n10”\n10”\n10”\n7”\n7”\nMIDPOINT\nDefense Works\nplacements Area\nDefense Works\nplacements Area\nDEPLOYMENT ZONE\nDEPLOYMENT ZONE\nM\nM\nG\nG\nI\n\n\n\n\n \nthe whole of the terrain piece is treated as the Objective for this scenario. A player \ncontrols an Objective terrain piece if there are more friendly models on, in, or \nwithin 1” of the terrain piece than there are enemy models.\nDefence Works Markers\nThe Markers shown on the map that have a G or an M represent defence works \nthat have built-in weaponry - “G” has a Gun Battery, and “M” has a Machine Gun \nEmplacement. After you have set up any Objective terrain pieces, you must place \nthe next four terrain pieces so that they are on top of where a Defence Works \nMarker will be set up. In addition, you must use Ruined Building terrain pieces if \nyou have them available.\nThe Defence Works Markers are set up after all of the terrain. Place the Marker \nanywhere on the terrain piece that covers its starting position. Defence Work \nMarkers have the following special rules:\n\t**\tGun Battery Marker: A Gun Battery Marker is treated as if it were a Sultanate \nGrand Cannon stationary gun battery that can be used by any model. Rules for \nthe Sultanate Grand Cannon stationary battery are found in the Defenders of \nthe Iron Wall section of the Warbands of Trench Crusade document.\n\t**\tMachine Gun Emplacement Marker: A model that is within 1” of a Machine \nGun Emplacement is treated as having a Machine Gun from the standard \nBattlekit List (▶ see Machine Gun). A Machine Gun Emplacement cannot \nbe used if the Marker is within 1” of an enemy model. Each Machine Gun \nEmplacement can be used once per Turn.\nDEPLOYMENT\nThe players roll-off. The winner of the roll-off chooses which Deployment Zone \nwill be theirs. The other Deployment Zone is their opponent’s. The players then \nalternate deploying their models one at a time, starting with the player who has \nmore models in their Warband (roll-off if both players have the same number of \nmodels). Models must be set up wholly within their own Deployment Zone. If \na player runs out of models to set up, the other player sets up all their remaining \nmodels, one after another, until they have none left. Once the players have set up \ntheir models, deployment ends, and the game begins.\nInfiltrators\nInfiltrators can deploy normally or by using their special deployment rules. \nHowever, if they deploy using their special deployment rules, they cannot deploy \nwithin 8” of an Objective.\nMarks & Assets\nAfter the deployment, each player must secretly write down up to three enemy \nmodels with the ELITE Keyword as Marks, and one friendly model that \nhas the ELITE Keyword as an Asset. Taking out enemy Marks and keeping \nthe friendly Asset alive will score additional Victory Points at the end of the \ngame (▶ see below).\nI\n\n\n\n\n \nUNFORESEEN EVENTS\nAt the start of each Turn after the first, one of the players must roll a D6. On a roll \nof 1-4 nothing happens, but on a 5 or 6, an Unforeseen Event takes place (do not \nroll again to see if any further Unforeseen Events take place). Roll D3 and look up \nthe roll on the table below to see what happens.\nD3 \nUnforeseen Event\n1 \nRising Fog: Heavy fog covers the entire combat zone, drastically \nlimiting visibility for all models. During this Turn and the next Turn, all \nRanged Weapons have their Range halved (short range will be half the \nreduced Range).\n2 \nRain, Mud, and Guts: The clouds roar and wail as a sudden downpour \nstrikes the battlefield, leaving the ground muddy and bloody, and battlekit \nheavy and wet. During this Turn and the next Turn, add -2 DICE to rolls \nfor Melee Attacks.\n3 \nDeep Craters: A sudden and violent earthquake hits the area, sending \ntremors through the earth as the land splits and caves in, forming deep \ncraters all over the warzone. The players roll-off. Starting with the winner, \nthey take it in turn to each placing Crater Markers, one at a time, until \n6 new Markers have been placed. The Crater Markers cannot be placed \nwithin a Deployment Zone or within 2” of a terrain piece or a model. \nOpen terrain within 2” of the centre of the Crater Marker is considered \nto be a pit that has sheer sides and is D3+3” deep (roll separately for \neach Marker when it is placed). Models can Jump Down or Fall into \nthe pit, and will need to Climb in order to leave it. Crater Markers \ncan be represented by a suitable terrain piece that is up to 4” across, if \nany are available.\nGAME LENGTH\nThis scenario lasts five Turns.\nVICTORY CONDITIONS\nA player wins this scenario immediately if there are no enemy models on the \nbattlefield or if the opposing Warband flees (typically due to failing a Morale \nCheck). Otherwise, the player with more Victory Points at the end of the \ngame is the winner.\nVictory Points\n\t**\tAt the end of each Turn, each player scores 1 VP for each Objective that is within \n1” of one or more of their models and 1 VP for each Objective they control. \n\t**\tAt the end of the game each player scores:\n\t* 1 VP for each Glorious Deed they completed.\n\t* 2 VPs for each enemy Mark that was taken Out of Action.\n\t* 3 VPs if the friendly Asset was not taken Out of Action.\nI\n\n\n\n\n \nGLORIOUS DEEDS\n\t**\tSharpshooter: A friendly model in cover takes an enemy ELITE model Out of \nAction with a Ranged Attack with the Long Range modifier.\n\t**\tDangerous Fall: A friendly model causes an enemy model to Fall into a \ncrater (▶ see Unforeseen Events).\n\t**\tDeath From Above: A friendly model takes an enemy model Out of Action with \na Melee Attack with the Diving Charge modifier.\n\t**\tHigh Risk, High Reward: An Asset takes an enemy Mark Out of Action. To \nclaim this deed, the player must first reveal that their model was an Asset and \nthat the enemy model was a Mark. \n\t**\tKill their Leaders: Take all of the enemy Marks Out of Action. To claim this \ndeed, the player must first reveal which enemy models were their Marks. The \nmodel that took the last Mark Out of Action is credited with completing \nthis Glorious Deed.\nI"
  },
  {
    "id": "relic-hunt",
    "number": 3,
    "roman": "III",
    "name": "III. Relic Hunt",
    "slug": "relic-hunt",
    "tagline": "Find and secure sacred relics for the glory of your Patron.",
    "mapImage": "/maps/relic-hunt.png",
    "tableSize": "48\" x 48\" (or 36\" x 36\" for skirmish)",
    "forces": "No special restrictions apply to the models the players can include in their Forces in this scenario.",
    "battlefield": "The players roll-off and the winner sets up the terrain for the game. This scenario uses the No Man’s Land battlefield archetype. 24” 6” 6” MIDPOINT",
    "deployment": "The players roll-off. The winner of the roll-off chooses which Deployment Zone will be theirs. The other Deployment Zone is their opponent’s. The players then alternate deploying their models one at a time, starting with the player who has more models in their Warband (roll-off if both players have the same number of models). Each player may deploy a maximum of six models. Models mounted on bases 40mm or larger count as 2 models for this purpose. Any models that cannot be deployed are available as reinforcements. Models must be set up wholly within their own Deployment Zone. If a player runs out of models to set up, the other player sets up all their remaining models, one after another, until they have none left. Once the players have set up their models, deployment ends, and the game begins. Infiltrators Infiltrators must deploy normally (they cannot use their special deployment rules). REINFORCEMENTS At the start of each Turn, the players roll-off. The winner rolls a D3 to see how many reinforcement models each of the players can deploy. The players then alternate deploying reinforcement models, one at a time, starting with the player that won the roll-off. Reinforcement models must be deployed touching the edge of the battlefield, wholly within their Deployment Zone, and more than 8” from the closest enemy model. If a player runs out of reinforcement models, the opposing player can set up any remaining reinforcements they have available up to the limit set for the Turn. Players must set up reinforcements if they have any available and are allowed to do so (you can’t choose to hold them back). TO THE DEATH! Neither side takes Morale Checks during this game, and neither player can choose to flee with their Warband. II",
    "gameLength": "This scenario lasts four Turns.",
    "victoryConditions": "A player wins this scenario immediately if there are no enemy models on the battlefield after any reinforcements have been deployed. Otherwise, the player with more Victory Points at the end of the game wins. Victory Points ** During Turns 1 to 3 each player scores 1 VP for each Reliquary claimed by a model from their Warband, up to a maximum of 4 VPs per Turn (they can claim more Reliquaries to deny the enemy the chance of claiming them). ** During Turn 4 each player scores 2 VPs for each Reliquary claimed by a model from their Warband. ** At the end of the game each player scores 1 VP for each Glorious Deed they completed.",
    "gloriousDeeds": "** Blood Sacrifice: A friendly model causes three enemy models to be taken Out of Action during the game. ** Cast Them Down: A friendly model causes an enemy model to Fall from a height of at least 3” (e.g. by taking it Down near a ledge or by forcing it off a ledge in some way). ** Protect the Relic: A friendly model causes an enemy model that is within 1” of a Reliquary Marker to be taken Out of Action. ** Relic Hunter: A friendly model claims two different Reliquaries during the game. ** Resist and Bite: A friendly model that began its Activation Down takes an enemy model Out of Action in the same Activation. ** Sniper: A friendly model takes an enemy ELITE model Out of Action with a Ranged Weapon Attack that has the Long Range and Cover modifiers. II",
    "fullRulesMarkdown": "III º Relic Hunt\nFind and secure sacred relics for the glory of your Patron.\nFORCES\nNo special restrictions apply to the models the players can include in their Forces \nin this scenario.\nTHE BATTLEFIELD\nThe players roll-off and the winner sets up the terrain for the game. This scenario \nuses the No Man’s Land battlefield archetype.\n24”\n6”\n6”\nMIDPOINT\nDEPLOYMENT ZONE\nDEPLOYMENT ZONE\n1\n5\n6\n4\n3\n2\n6”\nII\n\n\n\n\n \nRELIQUARY MARKERS\nThe Markers shown on the map represent Reliquaries. Set up the Markers at the \nlocations shown on the map. At the end of Turn 1, remove Reliquaries 1 and 2, \nand at the end of Turn 2, remove Reliquaries 3 and 4.\n\t**\tClaim Reliquary ACTION: A model that is within 1” of a Reliquary, can take \na Claim Reliquary ACTION. If it does so, take a Success Roll for the model. If \nthe roll is a Failure, nothing happens. If the roll is a Success or Critical Success, \nthe Reliquary is claimed by the model (▶ see Victory Points). A Reliquary that \nhas been claimed cannot be claimed again for the rest of the Turn (it can then be \nclaimed again by either side in subsequent Turns). Note that after a model claims \na Reliquary, it remains claimed by their side for the rest of the Turn even if the \nmodel is subsequently taken Down or Out of Action.\nDEPLOYMENT\nThe players roll-off. The winner of the roll-off chooses which Deployment Zone \nwill be theirs. The other Deployment Zone is their opponent’s. The players then \nalternate deploying their models one at a time, starting with the player who has \nmore models in their Warband (roll-off if both players have the same number of \nmodels). Each player may deploy a maximum of six models. Models mounted \non bases 40mm or larger count as 2 models for this purpose. Any models that \ncannot be deployed are available as reinforcements. Models must be set up wholly \nwithin their own Deployment Zone. If a player runs out of models to set up, \nthe other player sets up all their remaining models, one after another, until they \nhave none left. Once the players have set up their models, deployment ends, and \nthe game begins.\nInfiltrators\nInfiltrators must deploy normally (they cannot use their special deployment rules).\nREINFORCEMENTS\nAt the start of each Turn, the players roll-off. The winner rolls a D3 to see how \nmany reinforcement models each of the players can deploy. The players then \nalternate deploying reinforcement models, one at a time, starting with the player \nthat won the roll-off. Reinforcement models must be deployed touching the \nedge of the battlefield, wholly within their Deployment Zone, and more than 8” \nfrom the closest enemy model. If a player runs out of reinforcement models, the \nopposing player can set up any remaining reinforcements they have available up \nto the limit set for the Turn. Players must set up reinforcements if they have any \navailable and are allowed to do so (you can’t choose to hold them back).\nTO THE DEATH!\nNeither side takes Morale Checks during this game, and neither player can choose \nto flee with their Warband.\nII\n\n\n\n\n \nGAME LENGTH\nThis scenario lasts four Turns.\nVICTORY CONDITIONS\nA player wins this scenario immediately if there are no enemy models on the \nbattlefield after any reinforcements have been deployed. Otherwise, the player with \nmore Victory Points at the end of the game wins. \nVictory Points\n\t**\tDuring Turns 1 to 3 each player scores 1 VP for each Reliquary claimed by a \nmodel from their Warband, up to a maximum of 4 VPs per Turn (they can claim \nmore Reliquaries to deny the enemy the chance of claiming them).\n\t**\tDuring Turn 4 each player scores 2 VPs for each Reliquary claimed by a model \nfrom their Warband.\n\t**\tAt the end of the game each player scores 1 VP for each Glorious Deed \nthey completed.\nGLORIOUS DEEDS\n\t**\tBlood Sacrifice: A friendly model causes three enemy models to be taken Out of \nAction during the game.\n\t**\tCast Them Down: A friendly model causes an enemy model to Fall from a \nheight of at least 3” (e.g. by taking it Down near a ledge or by forcing it off a \nledge in some way).\n\t**\tProtect the Relic: A friendly model causes an enemy model that is within 1” of a \nReliquary Marker to be taken Out of Action.\n\t**\tRelic Hunter: A friendly model claims two different Reliquaries \nduring the game.\n\t**\tResist and Bite: A friendly model that began its Activation Down takes an \nenemy model Out of Action in the same Activation.\n\t**\tSniper: A friendly model takes an enemy ELITE model Out of Action with a \nRanged Weapon Attack that has the Long Range and Cover modifiers.\nII"
  },
  {
    "id": "trench-warfare",
    "number": 4,
    "roman": "IV",
    "name": "IV. Trench Warfare",
    "slug": "trench-warfare",
    "tagline": "Assault the trenches to win glory for yourself or mount a defence against",
    "mapImage": "/maps/trench-warfare.png",
    "tableSize": "48\" x 48\" (or 36\" x 36\" for skirmish)",
    "forces": "Before picking their Forces, the players must decide who is the attacker and who is the defender in this scenario. In a campaign, the player with the most models in their Warband (ignoring their Threshold Values or Field Strength) is the attacker, and their opponent is the defender. If both players have the same number of models, and in one-off games, the players roll-off and the winner must decide who will be the attacker and who will be the defender. The defender must halve the number of 👑 they can spend on their Warband in this scenario.",
    "battlefield": "The players roll-off and the winner sets up the terrain for the game. This scenario uses the No Man’s Land battlefield archetype. When setting up the terrain for this scenario, do not set up any terrain in either Deployment Zone (▶ see Defenders Trench Line below). 24” 12” ATTACKER DEPLOYMENT ZONE DEFENDER DEPLOYMENT ZONE MINE PLACEMENT AREA 8” Trench Section 8” Trench Section 8” Trench Section V",
    "deployment": "The players roll-off. The winner of the roll-off chooses which Deployment Zone will be theirs. The other Deployment Zone is their opponent’s. Before deploying any models, the defender must set up their Trench Lines and Mine Markers as described below. The players then alternate deploying their models one at a time, starting with the attacker. Models must be set up wholly within their own Deployment Zone. If a player runs out of models to set up, the other player sets up all their remaining models, one after another, until they have none left. Once the players have set up their models, deployment ends, and the game begins. Defending Trench Lines The defender must set up three trench sections that are at least 8” long at the locations shown on the map. They can add additional trench sections of any size. Mine Markers After the defender sets up their Trenches, they can set up 12 Mine Markers within the Mine Placement Area. After setting the Mine Markers up, the defender must secretly write down which 4 of the Mine Markers are duds. All of the other Mine Markers are live and have the MINED Keyword and the following special rule. ** Slaughter Mines: As soon as a model moves within 3” of a Mine Marker, temporarily halt its move. The defender must then reveal if the Mine Marker is a dud. If it is, nothing happens. If it is a live mine, it detonates in the same way as if the model had moved into contact with a Marker with the MINED Keyword. The Mine Marker is removed, and the moving model can then continue its move as long as it wasn’t taken Down or Out of Action. Models with the FLYING Keyword only trigger a Mine Marker if they finish a move in contact with it (they can fly across it without setting it off ). Infiltrators Infiltrators can deploy normally or by using their special deployment rules. Attacking models that use special deployment rules must deploy within 12” of their Deployment Zone.",
    "gameLength": "At the end of the fourth Turn, the attacker rolls a D6. On a 1 or 2, the game ends immediately. On a 3 or more, the game will end at the end of the fifth Turn. V",
    "victoryConditions": "A player wins this scenario immediately if there are no enemy models on the battlefield or if the opposing Warband flees (typically due to failing a Morale Check). Otherwise, the player with more Victory Points at the end of the game is the winner. Victory Points ** At the end of each Turn, the defender scores 1 VP for each trench section that is at least 8” long and has one or more defending models in it. If there are no attacking models in the trench section, the defender scores 2 VPs instead of 1. ** At the end of each Turn, the attacker scores 2 VPs for each trench section that is at least 8” long and has one or more attacking models in it. If there are no defending models in the trench section, the attacker scores 3 VPs instead of 2. ** At the end of the game each player scores 1 VP for each Glorious Deed they completed.",
    "gloriousDeeds": "** Good Hunting: A friendly model takes an enemy model Out of Action with a Ranged Attack that has the Long Range modifier. ** Headshot: A friendly model that retreated earlier in its Activation takes one of the enemy models it retreated from Out of Action. ** Hold your Ground: A Warband is the first to pass a Morale Check in this game. You receive a Victory Point for achieving this Glorious Deed. In a campaign game you can award 1 Experience Point to 1 ELITE model from the Warband that has the LEADER Keyword if you have one available, and you receive Glory Points and an extra D6 for your Promotion Pool as you would normally. ** Into the Trenches!: A friendly model successfully charges an enemy model in a trench section and then takes the enemy model Out of Action with a Melee Attack. ** Survive to Tell the Tale: A friendly model that has two Injury Rolls made for it that are caused by mine explosions and is not taken Out of Action by either of the explosions. ** Victory or Death: A Warband wins the game. This Glorious Deed is only used in campaign games and is determined after the result of the game has been decided. You do not receieve any Victory Points for acheiving this Glorious Deed, but you can award 1 Experience Point to 1 ELITE model from the Warband that has the LEADER Keyword if you have one available, and you receive Glory Points and an extra D6 for your Promotion Pool as you would normally. IV",
    "fullRulesMarkdown": "IV º Trench Warfare\nAssault the trenches to win glory for yourself or mount a defence against \nan enemy attack.\nFORCES\nBefore picking their Forces, the players must decide who is the attacker and who \nis the defender in this scenario. In a campaign, the player with the most models in \ntheir Warband (ignoring their Threshold Values or Field Strength) is the attacker, \nand their opponent is the defender. If both players have the same number of models, \nand in one-off games, the players roll-off and the winner must decide who will be \nthe attacker and who will be the defender. The defender must halve the number of 👑 \nthey can spend on their Warband in this scenario.\nTHE BATTLEFIELD\nThe players roll-off and the winner sets up the terrain for the game. This scenario \nuses the No Man’s Land battlefield archetype. When setting up the terrain for this \nscenario, do not set up any terrain in either Deployment Zone (▶ see Defenders \nTrench Line below).\n24”\n12”\nATTACKER DEPLOYMENT ZONE\nDEFENDER DEPLOYMENT ZONE\nMINE PLACEMENT AREA\n8” Trench\n Section\n8” Trench\n Section\n8” Trench\n Section\nV\n\n\n\n\n \nDEPLOYMENT\nThe players roll-off. The winner of the roll-off chooses which Deployment Zone \nwill be theirs. The other Deployment Zone is their opponent’s. Before deploying \nany models, the defender must set up their Trench Lines and Mine Markers \nas described below. The players then alternate deploying their models one at a \ntime, starting with the attacker. Models must be set up wholly within their own \nDeployment Zone. If a player runs out of models to set up, the other player sets up \nall their remaining models, one after another, until they have none left. Once the \nplayers have set up their models, deployment ends, and the game begins.\nDefending Trench Lines\nThe defender must set up three trench sections that are at least 8” long at the \nlocations shown on the map. They can add additional trench sections of any size.\nMine Markers\nAfter the defender sets up their Trenches, they can set up 12 Mine Markers within \nthe Mine Placement Area. After setting the Mine Markers up, the defender must \nsecretly write down which 4 of the Mine Markers are duds. All of the other Mine \nMarkers are live and have the MINED Keyword and the following special rule.\n\t**\tSlaughter Mines: As soon as a model moves within 3” of a Mine Marker, \ntemporarily halt its move. The defender must then reveal if the Mine Marker is a \ndud. If it is, nothing happens. If it is a live mine, it detonates in the same way as \nif the model had moved into contact with a Marker with the MINED Keyword. \nThe Mine Marker is removed, and the moving model can then continue its move \nas long as it wasn’t taken Down or Out of Action. Models with the FLYING \nKeyword only trigger a Mine Marker if they finish a move in contact with it \n(they can fly across it without setting it off ).\nInfiltrators\nInfiltrators can deploy normally or by using their special deployment rules. \nAttacking models that use special deployment rules must deploy within 12” of \ntheir Deployment Zone.\nGAME LENGTH\nAt the end of the fourth Turn, the attacker rolls a D6. On a 1 or 2, the game ends \nimmediately. On a 3 or more, the game will end at the end of the fifth Turn.\nV\n\n\n\n\n \nVICTORY CONDITIONS\nA player wins this scenario immediately if there are no enemy models on the \nbattlefield or if the opposing Warband flees (typically due to failing a Morale \nCheck). Otherwise, the player with more Victory Points at the end of the \ngame is the winner.\nVictory Points\n\t**\tAt the end of each Turn, the defender scores 1 VP for each trench section that \nis at least 8” long and has one or more defending models in it. If there are no \nattacking models in the trench section, the defender scores 2 VPs instead of 1. \n\t**\tAt the end of each Turn, the attacker scores 2 VPs for each trench section that \nis at least 8” long and has one or more attacking models in it. If there are no \ndefending models in the trench section, the attacker scores 3 VPs instead of 2. \n\t**\tAt the end of the game each player scores 1 VP for each Glorious Deed \nthey completed.\nGLORIOUS DEEDS\n\t**\tGood Hunting: A friendly model takes an enemy model Out of Action with a \nRanged Attack that has the Long Range modifier. \n\t**\tHeadshot: A friendly model that retreated earlier in its Activation takes one of \nthe enemy models it retreated from Out of Action.\n\t**\tHold your Ground: A Warband is the first to pass a Morale Check in this game. \nYou receive a Victory Point for achieving this Glorious Deed. In a campaign \ngame you can award 1 Experience Point to 1 ELITE model from the Warband \nthat has the LEADER Keyword if you have one available, and you receive Glory \nPoints and an extra D6 for your Promotion Pool as you would normally.\n\t**\tInto the Trenches!: A friendly model successfully charges an enemy model \nin a trench section and then takes the enemy model Out of Action with \na Melee Attack.\n\t**\tSurvive to Tell the Tale: A friendly model that has two Injury Rolls made for it \nthat are caused by mine explosions and is not taken Out of Action by either of \nthe explosions.\n\t**\tVictory or Death: A Warband wins the game. This Glorious Deed is only used \nin campaign games and is determined after the result of the game has been \ndecided. You do not receieve any Victory Points for acheiving this Glorious \nDeed, but you can award 1 Experience Point to 1 ELITE model from the \nWarband that has the LEADER Keyword if you have one available, and \nyou receive Glory Points and an extra D6 for your Promotion Pool as you \nwould normally.\n\nIV"
  },
  {
    "id": "armoured-train",
    "number": 5,
    "roman": "V",
    "name": "V. Armoured Train",
    "slug": "armoured-train",
    "tagline": "A derailed armoured train, laden with loot and ammunition, is being fought over",
    "mapImage": "/maps/armoured-train.png",
    "tableSize": "48\" x 48\" (or 36\" x 36\" for skirmish)",
    "forces": "If this game is being played as part of a campaign, both players have a Field Strength of 15 models.",
    "battlefield": "The players roll-off and the winner sets up the terrain for the game. This scenario uses the No Man’s Land battlefield archetype and requires a Battlefield that is 48” by 48”. The Train When you set up the terrain for this battle, you must first set up the wagons from an armoured train. The wagons are located on a raised embankment that has a bridge in the middle. 6” 6” 4” 4” 8” 8” 8” 20” 12” 12” 20”",
    "deployment": "The players roll-off. The winner of the roll-off chooses which Deployment Zone will be theirs. The other Deployment Zone is their opponent’s. The players then alternate deploying their models one at a time, starting with the player who has more models in their Warband (roll-off if both players have the same number of models). Models must be set up wholly within their own Deployment Zone. If a player runs out of models to set up, the other player sets up all their remaining models, one after another, until they have none left. Once the players have set up their models, deployment ends, and the game begins. Infiltrators Infiltrators must deploy normally (they cannot use their special deployment rules). TRAIN WAGONS The train was carrying supply crates containing precious weapons, materials, and holy relics. The supply crates are spread between the three wagons, which can be reached through the doors on the sides of the wagons. However, the doors on the sides of each wagon start the game locked. Train Wagons cannot be destroyed or removed for any reason. ** Unlock Wagon ACTION: A model within 1” of a locked door can take an Unlock Wagon ACTION. If it does so, take a Success Roll for the model. If the roll is a Failure, nothing happens (another model can try to unlock the door later in the same Turn). The door is unlocked and opened if the roll is a Success or Critical Success, revealing D3 Supply Crates inside. Place a Supply Crate Marker beside the wagon to show how many Supply Crates are inside it. If the door on the other side is unlocked, it can be used to reach any Supply Crates that remain inside, but does not generate any more of them. ** Open Crate ACTION: A model within 1” of an unlocked door on a wagon with any Supply Crate Markers still beside it, or within 1” of a Supply Crate Marker that has been carried by another model and dropped, can take an Open Crate ACTION. If it does so, choose one of the following three options for the model (you do not have to make a Success Roll): 1. Carry Crate: The model can carry the crate. Put the Supply Crate Markers in contact with the model’s base to show it is carrying it. The only thing a model carrying a crate can do is take Move or Retreat ACTIONS - it cannot do anything else while it has the crate. a. At the end of its Activation, you can say that a model that is carrying a crate will either drop it or hand it to a friendly model that is within 1”, or choose to Destroy or Draw Supplies from the crate as described below. When a model drops the crate, place it within 1” of the model and not in contact with any other models. When a model hands the crate on, place the Supply Crate Marker in contact with the other model’s base. b. If a model carrying a crate is taken Down or Out of Action, or is chosen as the target of a Melee Attack, it immediately drops the crate as described above. c. If a model carrying a crate finishes its Activation in contact with any edge of the battlefield, it can escape with the crate; remove the model and the Supply Crate Marker from the battlefield (▶ see Victory Points). The model is still considered part of the Warband for the purposes of Morale Checks. 2.Destroy Crate: Take a Success Roll for the model. If the roll is a Failure, nothing happens. If the roll is a Success or a Critical Success, the Supply Crate Marker is destroyed (remove it from the battlefield). 3.Draw Supplies: Take a Success Roll for the model. If the roll is a failure, nothing happens. If the roll is a Success or a Critical Success, place a BLESSING MARKER next to the model and the crate is emptied (remove it from the battlefield).",
    "gameLength": "This scenario lasts five Turns.",
    "victoryConditions": "A player wins this scenario immediately if there are no enemy models on the battlefield or if the opposing Warband flees (typically due to failing a Morale Check). Otherwise, the player with more Victory Points at the end of the game is the winner. Victory Points ** At the end of the game each player scores: * 1 VP for each Glorious Deed they completed. * 1 VP for each crate a friendly model drew supplies from. * 2 VPs for each crate a friendly model destroyed. * 3 VPs for each crate that a friendly model escaped with.",
    "gloriousDeeds": "** King of the Hill: A friendly model ends 3 consecutive Turns on top of an embankment or the bridge and within 3” of a wagon. ** Meat-Grinder: A friendly model takes 3 enemy models Out of Action during the game using Ranged Attacks made with the Gun Battery. ** No Stone Left Unturned: A friendly model unlocks two different wagons. ** Over the Enemy Line: A friendly model escapes with a crate when it is wholly within the enemy Deployment Zone. ** Supply Run: Two friendly models escape with a crate. The model that escaped with the second crate is credited with completing this Glorious Deed. I V",
    "fullRulesMarkdown": "V º Armoured Train\nA derailed armoured train, laden with loot and ammunition, is being fought over \nby the two warbands.\nFORCES\nIf this game is being played as part of a campaign, both players have a Field \nStrength of 15 models.\nTHE BATTLEFIELD\nThe players roll-off and the winner sets up the terrain for the game. This \nscenario uses the No Man’s Land battlefield archetype and requires a Battlefield \nthat is 48” by 48”.\nThe Train\nWhen you set up the terrain for this battle, you must first set up the wagons from \nan armoured train. The wagons are located on a raised embankment that has a \nbridge in the middle.\n6”\n6”\n4”\n4”\n8”\n8”\n8”\n20”\n12”\n12”\n20”\nDEPLOYMENT ZONE\nDEPLOYMENT ZONE\n4”\nG\n\nIV\n\n\n\n\n \nThe dimensions of the wagons are shown on the map. Each wagon has ladders on \nboth sides that allow models to Climb up the sides without having to take a Risky \nSuccess Roll and doors at the centre of each side that can be unlocked to reach the \nsupplies inside (▶ see the Supplies rule below). The top of each wagon is flat and \ntreated as Open terrain.\nTwo of the wagons are located on raised embankments that measure 12” by 19”. \nThe sides of the embankments are roughly 5” high and are Difficult terrain. The \ncentral wagon is located on a bridge that joins the two embankments together. \nModels can move under the bridge from the sides and onto the bridge from each \nend, where it connects to the raised embankments.\nGun Battery Marker\nAfter setting up the weapons, place a Gun Battery Marker on the top of the central \nwagon, as shown on the map. It has the following special rule:\n\t**\tGun Battery Marker: A Gun Battery Marker is treated as if it were a Sultanate \nGrand Cannon stationary gun battery that can be used by any model. Rules for \nthe Sultanate Grand Cannon stationary battery are found in the Defenders of \nthe Iron Wall section of the Warbands of Trench Crusade document.\nDEPLOYMENT\nThe players roll-off. The winner of the roll-off chooses which Deployment Zone \nwill be theirs. The other Deployment Zone is their opponent’s. The players then \nalternate deploying their models one at a time, starting with the player who has \nmore models in their Warband (roll-off if both players have the same number of \nmodels). Models must be set up wholly within their own Deployment Zone. If \na player runs out of models to set up, the other player sets up all their remaining \nmodels, one after another, until they have none left. Once the players have set up \ntheir models, deployment ends, and the game begins.\nInfiltrators\nInfiltrators must deploy normally (they cannot use their special deployment rules).\nTRAIN WAGONS\nThe train was carrying supply crates containing precious weapons, materials, and \nholy relics. The supply crates are spread between the three wagons, which can be \nreached through the doors on the sides of the wagons. However, the doors on the \nsides of each wagon start the game locked. Train Wagons cannot be destroyed or \nremoved for any reason.\n\t**\tUnlock Wagon ACTION: A model within 1” of a locked door can take an \nUnlock Wagon ACTION. If it does so, take a Success Roll for the model. If the \nroll is a Failure, nothing happens (another model can try to unlock the door later \nin the same Turn). The door is unlocked and opened if the roll is a Success or \nCritical Success, revealing D3 Supply Crates inside. Place a Supply Crate Marker \nbeside the wagon to show how many Supply Crates are inside it. If the door on \nthe other side is unlocked, it can be used to reach any Supply Crates that remain \ninside, but does not generate any more of them.\n\n\n\n\n\n \n\t**\tOpen Crate ACTION: A model within 1” of an unlocked door on a wagon \nwith any Supply Crate Markers still beside it, or within 1” of a Supply Crate \nMarker that has been carried by another model and dropped, can take an Open \nCrate ACTION. If it does so, choose one of the following three options for the \nmodel (you do not have to make a Success Roll):\n1.\tCarry Crate: The model can carry the crate. Put the Supply Crate Markers in \ncontact with the model’s base to show it is carrying it. The only thing a model \ncarrying a crate can do is take Move or Retreat ACTIONS - it cannot do \nanything else while it has the crate. \na.\tAt the end of its Activation, you can say that a model that is carrying a crate \nwill either drop it or hand it to a friendly model that is within 1”, or choose to \nDestroy or Draw Supplies from the crate as described below. When a model \ndrops the crate, place it within 1” of the model and not in contact with any \nother models. When a model hands the crate on, place the Supply Crate \nMarker in contact with the other model’s base.\nb.\tIf a model carrying a crate is taken Down or Out of Action, or is chosen as the \ntarget of a Melee Attack, it immediately drops the crate as described above.\nc.\tIf a model carrying a crate finishes its Activation in contact with any edge of \nthe battlefield, it can escape with the crate; remove the model and the Supply \nCrate Marker from the battlefield (▶ see Victory Points). The model is still \nconsidered part of the Warband for the purposes of Morale Checks.\n2.Destroy Crate: Take a Success Roll for the model. If the roll is a Failure, nothing \nhappens. If the roll is a Success or a Critical Success, the Supply Crate Marker is \ndestroyed (remove it from the battlefield).\n3.Draw Supplies: Take a Success Roll for the model. If the roll is a failure, nothing \nhappens. If the roll is a Success or a Critical Success, place a BLESSING \nMARKER next to the model and the crate is emptied (remove it from \nthe battlefield).\n\n\n\n\n\n \nGAME LENGTH\nThis scenario lasts five Turns.\nVICTORY CONDITIONS\nA player wins this scenario immediately if there are no enemy models on the \nbattlefield or if the opposing Warband flees (typically due to failing a Morale \nCheck). Otherwise, the player with more Victory Points at the end of the \ngame is the winner.\nVictory Points\n\t**\tAt the end of the game each player scores:\n\t* 1 VP for each Glorious Deed they completed.\n\t* 1 VP for each crate a friendly model drew supplies from.\n\t* 2 VPs for each crate a friendly model destroyed.\n\t* 3 VPs for each crate that a friendly model escaped with.\nGLORIOUS DEEDS\n\t**\tKing of the Hill: A friendly model ends 3 consecutive Turns on top of an \nembankment or the bridge and within 3” of a wagon.\n\t**\tMeat-Grinder: A friendly model takes 3 enemy models Out of Action during the \ngame using Ranged Attacks made with the Gun Battery.\n\t**\tNo Stone Left Unturned: A friendly model unlocks two different wagons.\n\t**\tOver the Enemy Line: A friendly model escapes with a crate when it is wholly \nwithin the enemy Deployment Zone.\n\t**\tSupply Run: Two friendly models escape with a crate. The model that escaped \nwith the second crate is credited with completing this Glorious Deed.\nI\nV"
  },
  {
    "id": "dragon-hunt",
    "number": 6,
    "roman": "VI",
    "name": "VI. Dragon Hunt",
    "slug": "dragon-hunt",
    "tagline": "For the glory of your Patron, hunt and defeat a monstrous creature, be it a",
    "mapImage": "/maps/dragon-hunt.png",
    "tableSize": "48\" x 48\" (or 36\" x 36\" for skirmish)",
    "forces": "The players will additionally need a Dragon model and 6 Peasant models. The rules and Warband Entries for these models can be found below.",
    "battlefield": "The players roll-off and the winner sets up the Dragon, the terrain and the Peasants for the game. This scenario uses the No Man’s Land or Trench Lines battlefield archetype (the player setting up the terrain decides which one to use). 28” MIDPOINT",
    "deployment": "The players roll-off. The winner of the roll-off chooses which Deployment Zone will be theirs. The other Deployment Zone is their opponent’s. The players then alternate deploying their models one at a time, starting with the player who has more models in their Warband (roll-off if both players have the same number of models). Models must be set up wholly within their own Deployment Zone. If a player runs out of models, the other player sets up all their remaining models, one after another, until they have none left. Once the players have set up their models, deployment ends, and the game begins. Infiltrators Infiltrators can deploy normally or by using their special deployment rules. However, if they deploy using their special deployment rules, they cannot deploy within 8” of the Dragon or 1” of a Peasant. NEUTRAL MODELS The Dragon and the Peasants are neutral models. Neutral models are treated as enemy models by both sides. Neutral Model Activation Rolls When a player finishes an Activation with one of their models, they must take a Neutral Model Activation Roll by rolling a D6. If they roll a 1-4, they can Activate a Peasant of their choice, and on a 5-6, they can Activate the Dragon or a Peasant of their choice. A player cannot Activate a model that has already been Activated (by either player). Once the Dragon and all of the Peasants have been Activated during a Turn, the players stop making Neutral Model Activation Rolls until the following Turn. When a player Activates a neutral model, they must carry out an Activation with it using the rules for the Dragon and the Peasants below. If a player runs out of models from their own Warband to Activate and there are still neutral models remaining to Activate, they must still make Neutral Model Activation Rolls. Note that once the Dragon has been Activated, there is no longer any need to make the Neutral Model Activation Rolls; the players can just pick a Peasant that has yet to be Activated and Activate them. In the unlikely event that the Dragon remains to be Activated after both players have finished Activating models from their Warband, just roll-off and the winner Activates the Dragon. I THE DRAGON The Dragon is represented by a model on a base between 120mm and 300mm. Ideally, it should be large enough and shaped in such a way that two models on 60mm bases (or four models on 25mm bases) could stand on it at once. It can be a Larval Beast, a Possessed Tank, an actual Dragon, or any other large imposing monster. The Dragon’s Prey When a player Activates the Dragon, they must first choose its prey. They then take 1 Move ACTION and 1 Shoot or 1 Fight ACTION with the Dragon. If the Dragon is not within 1” of its prey at the start of its Activation, it will move as described below and then attack. If the Dragon is within 1” of its prey at the start of its Activation, it will attack before it moves. If the attack takes the prey Out of Action, choose new prey and then move the Dragon as described below. The Dragon’s prey is determined by using the following list of priorities: ** If a model attacked the Dragon this Turn or in the last Turn, and the model is not on the Dragon’s back, then it becomes the Dragon’s prey. If several models are eligible, the closest eligible model to the Dragon becomes its prey. If two or more eligible models are equally close to the Dragon, the player can choose which model is its prey. ** If the Dragon was not attacked in this Turn or the last Turn, or if it was attacked and the attacking models have been taken Out of Action, then the Peasant closest to the Dragon becomes its prey. If two or more Peasants are equally close to the Dragon, the player can choose which model is its prey. ** If no Peasants are left on the battlefield, and the Dragon was not attacked in this Turn or the last Turn, then it has no prey and will instead attempt to leave the battlefield. Attacking with the Dragon When the Dragon attacks, it will target its prey if it can do so. Otherwise, it will target the nearest model that it can attack. If two or more potential targets are equally close to the Dragon, the player can choose which model it attacks. The Dragon will make a Melee Attack with its Teeth and Claws if it is within 1” of its target. If it is not within 1” of the target but is within 10” of it, it will make a Ranged Attack with its Fire Breath. If it is not within 10” of its target, it does not attack. Moving the Dragon The player must move the Dragon towards its prey so that it finishes either in contact with it or if that is impossible, as close to its prey as possible. If the Dragon has no prey, move it so that it finishes the move as close as possible to the nearest edge of the battlefield. If it reaches the edge of the battlefield, it leaves and is removed from the battlefield (▶ see Victory Conditions). Note that the Dragon’s Siege Weapon ability allows it to move across terrain, and its Crush ability allows it to move over models when trying to reach its prey (▶ see the Dragon). I The Dragon This massive entity is wreaking havoc, tearing through the afflicted, plague-ridden villages surrounding No Man’s Land. Descriptions of the monster are wildly inconsistent. While some believe it to be a newborn Larval Beast, others report sighting a Possessed Tank. Whispers abound of an Angelic creature gone rogue, and some even say it is an actual Dragon. All accounts agree on its immense size and the trail of destruction and bloodshed it leaves behind. Showing no allegiance, it has trampled warbands and strongholds alike, spreading chaos indiscriminately. Movement Ranged Melee Armour Base 10”/Infantry +3 DICE +3 DICE -3 120-300mm Battlekit The Dragon does not have any Battlekit. Abilities ** Fire Breath: The Dragon can make a Ranged Attack even though it does not have any Ranged Weapons. A Fire Breath attack has a Range of 10” and the +2 DICE, BLAST 3”, FIRE, IGNORE ARMOUR, and SCATTER Keywords. ** Deadly Teeth and Claws: The Dragon can make a Melee Attack even though it does not have any Melee Weapons. A Teeth and Claws attack has the +1 DICE, +1 INJURY DICE, and IGNORE ARMOUR Keywords. ** Tail Swipe: After you make a Melee Attack with the Dragon, if it is still within 1” of any models that are not on its back, make a Melee Attack against each of the models that are not on its back in the order of your choice. A Tail Swipe attack has the +1 INJURY MODIFIER Keyword. ** Living Battlefield: Models can treat the Dragon and its base as if they were Dangerous terrain, and can finish a move on top of the Dragon’s model. All Success Rolls for a model on top of the Dragon become Risky Success Rolls if they are not already. Attacks made by a model that is on top of the Dragon and target it get +1 DICE and +1 INJURY DICE. The Dragon cannot attack a model that is on top of it. When the Dragon moves, any models on top of the Dragon are moved with it. After the Dragon’s move is finished, make a Success Roll for each model on it. If the roll is a Failure, the model Falls from the Dragon. Move it the shortest possible distance to the ground and place it Down, and then make an Injury Roll for it if it has Fallen 3” or more. If the roll is a Success or Critical Success, nothing happens. Take the Success Roll in the same way if a model on top of the Dragon is taken Down for any reason. I ** Siege Weapon: The Dragon can move over terrain pieces that measure up to 4” by 4” as if they were Open terrain. If it does so, the terrain piece is removed from the game when the Dragon moves into contact with it. Models that were on top of the terrain piece Fall directly down to the battlefield; an additional Injury Roll may have to be made for them if they Fall 3” or more, or if they land where they may be Trampled by the Dragon as it carries on with its move. ** Crush: The Dragon can move over other models. If it does so, make an Injury Roll for the model when the Dragon moves into contact with it, as if the model had been hit with an attack with the +1 INJURY MODIFIER and IGNORE ARMOUR Keywords. The Dragon then continues with its move. Leave the model where it was if the Dragon moves beyond it. If the Dragon would end up on top of the model, move it by the shortest distance possible so that it will not be underneath the Dragon (even if it is Down). If it is not possible to move the model out of the way for any reason, it is removed from play and counts as being taken Out of Action in the Campaign Phase. ** Resistant: Remove 1 BLOOD MARKER from the Dragon when it is Activated. In addition, add -1 INJURY DICE to Injury Rolls for the Dragon if the attack has one or more of the following Keywords: FIRE, GAS, or SHRAPNEL. ** Undying: The first, second, and third time the Dragon suffers an Out of Action result on the Injury Table, it is treated as a Down result instead. It then loses the Undying ability and replaces it with the Defiant ability: ** Defiant: When the Dragon suffers an Out of Action result on the Injury Table, it is treated as a Down result instead. The Defiant ability is lost immediately when the sixth BLOOD MARKER is placed next to the Dragon (from then on, Out of Action results will affect it normally.) Keywords FEAR I The Peasants The Peasants are represented by suitably bedraggled and oppressed-looking models. The only thing an Activated Peasant model can do is take a Move or Retreat ACTION. When a player moves a Peasant model, they must do so so that it finishes the move as close as possible to the nearest edge of the battlefield. A Peasant will never enter Dangerous terrain, Climb, Jump, or Jump Down. If you are ever required to take a Success Roll for a Peasant, add -3 DICE to their roll. If a Peasant reaches the edge of the battlefield, they leave and are removed from the battlefield (▶ see Victory Conditions). The Peasants The war has taken its toll on the peasantry. Many are suffering from never-before- seen ailments and diseases, their contaminated state is the main reason they have not been evacuated from the battlefield. Rescuing them is not an option. They pose a great risk to the troops. So, putting an end to their miserable lives is the only right thing to do. Movement Ranged Melee Armour Base 5”/Infantry - - 0 25mm Battlekit Peasants do not have any Battlekit. Abilities ** Feeble: Add +2 DICE and +2 INJURY DICE to the rolls for attacks that target a Peasant. Keywords None I",
    "gameLength": "At the end of the fourth Turn, the attacker rolls a D6. On a 1 or 2, the game ends immediately. On a 3 or more, the game will end at the end of the fifth Turn.",
    "victoryConditions": "A player wins this scenario immediately if there are no enemy models on the battlefield or if the opposing Warband flees (typically due to failing a Morale Check). The game ends immediately in a draw if the Dragon leaves the battlefield. Otherwise, the player with more Victory Points at the end of the game is the winner. Victory Points The players must keep a running tally of the Victory Points they score during the game. Victory Points are scored for the following things: ** Each player scores: * 2 VPs if an attack made by a friendly model takes a Peasant Out of Action. * 3 VPs if an attack made by a friendly model takes the Dragon Down (including when its Undying or Defiant abilities change the result to a Down result). * 6 VPs if an attack made by a friendly model takes the Dragon Out of Action (unless its Undying or Defiant abilities change the result to a Down result). * At the end of the game each player scores 1 VP for each Glorious Deed they completed.",
    "gloriousDeeds": "** Dragon Slayer: A friendly model on top of the Dragon takes the Dragon Out of Action with a Melee Attack (unless its Undying or Defiant abilities change the result to a Down result). You receive 2 ☼ for completing this Glorious Deed. ** Fire with Fire: An attack made by a friendly model that has the FIRE, GAS and/or SHRAPNEL Keyword causes 2 BLOOD MARKERS to be placed next to the Dragon. ** Genocidal: A model takes 3 Peasants Out of Action. ** Opportunist: A model is within 3” of a Peasant when the Peasant is trampled by the Dragon. ** Off My Back: A friendly model takes a model that is on top of the Dragon Down, and the model then Falls off the Dragon. II VI",
    "fullRulesMarkdown": "VI º Dragon Hunt\nFor the glory of your Patron, hunt and defeat a monstrous creature, be it a \npossessed tank or a hellish beast.\nFORCES\nThe players will additionally need a Dragon model and 6 Peasant models. The \nrules and Warband Entries for these models can be found below.\nTHE BATTLEFIELD\nThe players roll-off and the winner sets up the Dragon, the terrain and the Peasants \nfor the game. This scenario uses the No Man’s Land or Trench Lines battlefield \narchetype (the player setting up the terrain decides which one to use).\n28”\nMIDPOINT\nDEPLOYMENT ZONE\nDEPLOYMENT ZONE\n\nVI\n\n\n\n\n \nThe Dragon & The Peasants\nThe Dragon model is set up before setting up the terrain for this battle and the 6 \nPeasant models are set up after the terrain has been set up. Deploy the Dragon so \nthat it covers the midpoint of the battlefield. Deploy the Peasants anywhere on the \nbattlefield that is more than 8” from the Dragon, and more than 6” from any other \nPeasant or either side’s Deployment Zone.\nDEPLOYMENT\nThe players roll-off. The winner of the roll-off chooses which Deployment Zone \nwill be theirs. The other Deployment Zone is their opponent’s. The players then \nalternate deploying their models one at a time, starting with the player who has \nmore models in their Warband (roll-off if both players have the same number of \nmodels). Models must be set up wholly within their own Deployment Zone. If a \nplayer runs out of models, the other player sets up all their remaining models, one \nafter another, until they have none left. Once the players have set up their models, \ndeployment ends, and the game begins.\nInfiltrators\nInfiltrators can deploy normally or by using their special deployment rules. \nHowever, if they deploy using their special deployment rules, they cannot deploy \nwithin 8” of the Dragon or 1” of a Peasant.\nNEUTRAL MODELS\nThe Dragon and the Peasants are neutral models. Neutral models are treated as \nenemy models by both sides.\nNeutral Model Activation Rolls\nWhen a player finishes an Activation with one of their models, they must take a \nNeutral Model Activation Roll by rolling a D6. If they roll a 1-4, they can Activate \na Peasant of their choice, and on a 5-6, they can Activate the Dragon or a Peasant \nof their choice. A player cannot Activate a model that has already been Activated \n(by either player). Once the Dragon and all of the Peasants have been Activated \nduring a Turn, the players stop making Neutral Model Activation Rolls until the \nfollowing Turn. When a player Activates a neutral model, they must carry out \nan Activation with it using the rules for the Dragon and the Peasants below. If \na player runs out of models from their own Warband to Activate and there are \nstill neutral models remaining to Activate, they must still make Neutral Model \nActivation Rolls. Note that once the Dragon has been Activated, there is no longer \nany need to make the Neutral Model Activation Rolls; the players can just pick a \nPeasant that has yet to be Activated and Activate them. In the unlikely event that \nthe Dragon remains to be Activated after both players have finished Activating \nmodels from their Warband, just roll-off and the winner Activates the Dragon.\nI\n\n\n\n\n \nTHE DRAGON\nThe Dragon is represented by a model on a base between 120mm and 300mm. \nIdeally, it should be large enough and shaped in such a way that two models \non 60mm bases (or four models on 25mm bases) could stand on it at once. It \ncan be a Larval Beast, a Possessed Tank, an actual Dragon, or any other large \nimposing monster.\nThe Dragon’s Prey\nWhen a player Activates the Dragon, they must first choose its prey. They then \ntake 1 Move ACTION and 1 Shoot or 1 Fight ACTION with the Dragon. If the \nDragon is not within 1” of its prey at the start of its Activation, it will move as \ndescribed below and then attack. If the Dragon is within 1” of its prey at the start \nof its Activation, it will attack before it moves. If the attack takes the prey Out of \nAction, choose new prey and then move the Dragon as described below.\nThe Dragon’s prey is determined by using the following list of priorities:\n\t**\tIf a model attacked the Dragon this Turn or in the last Turn, and the model is \nnot on the Dragon’s back, then it becomes the Dragon’s prey. If several models \nare eligible, the closest eligible model to the Dragon becomes its prey. If two \nor more eligible models are equally close to the Dragon, the player can choose \nwhich model is its prey.\n\t**\tIf the Dragon was not attacked in this Turn or the last Turn, or if it was attacked \nand the attacking models have been taken Out of Action, then the Peasant \nclosest to the Dragon becomes its prey. If two or more Peasants are equally close \nto the Dragon, the player can choose which model is its prey.\n\t**\tIf no Peasants are left on the battlefield, and the Dragon was not attacked in \nthis Turn or the last Turn, then it has no prey and will instead attempt to leave \nthe battlefield.\nAttacking with the Dragon\nWhen the Dragon attacks, it will target its prey if it can do so. Otherwise, it \nwill target the nearest model that it can attack. If two or more potential targets \nare equally close to the Dragon, the player can choose which model it attacks. \nThe Dragon will make a Melee Attack with its Teeth and Claws if it is within \n1” of its target. If it is not within 1” of the target but is within 10” of it, it will \nmake a Ranged Attack with its Fire Breath. If it is not within 10” of its target, it \ndoes not attack.\nMoving the Dragon\nThe player must move the Dragon towards its prey so that it finishes either in \ncontact with it or if that is impossible, as close to its prey as possible. If the Dragon \nhas no prey, move it so that it finishes the move as close as possible to the nearest \nedge of the battlefield. If it reaches the edge of the battlefield, it leaves and is \nremoved from the battlefield (▶ see Victory Conditions). Note that the Dragon’s \nSiege Weapon ability allows it to move across terrain, and its Crush ability allows \nit to move over models when trying to reach its prey (▶ see the Dragon).\nI\n\n\n\n\n \nThe Dragon\nThis massive entity is wreaking havoc, tearing through the afflicted, plague-ridden \nvillages surrounding No Man’s Land. Descriptions of the monster are wildly \ninconsistent. While some believe it to be a newborn Larval Beast, others report \nsighting a Possessed Tank. Whispers abound of an Angelic creature gone rogue, and \nsome even say it is an actual Dragon. All accounts agree on its immense size and the \ntrail of destruction and bloodshed it leaves behind. Showing no allegiance, it has \ntrampled warbands and strongholds alike, spreading chaos indiscriminately.\nMovement \nRanged \nMelee \nArmour\nBase\n10”/Infantry \n+3 DICE \n+3 DICE \n-3 \n120-300mm\nBattlekit \nThe Dragon does not have any Battlekit.\nAbilities \n\t**\tFire Breath: The Dragon can make a Ranged Attack even though \nit does not have any Ranged Weapons. A Fire Breath attack has \na Range of 10” and the +2 DICE, BLAST 3”, FIRE, IGNORE \nARMOUR, and SCATTER Keywords.\n\t**\tDeadly Teeth and Claws: The Dragon can make a Melee Attack \neven though it does not have any Melee Weapons. A Teeth \nand Claws attack has the +1 DICE, +1 INJURY DICE, and \nIGNORE ARMOUR Keywords.\n\t**\tTail Swipe: After you make a Melee Attack with the Dragon, if \nit is still within 1” of any models that are not on its back, make \na Melee Attack against each of the models that are not on its \nback in the order of your choice. A Tail Swipe attack has the +1 \nINJURY MODIFIER Keyword.\n\t**\tLiving Battlefield: Models can treat the Dragon and its base as \nif they were Dangerous terrain, and can finish a move on top \nof the Dragon’s model. All Success Rolls for a model on top of \nthe Dragon become Risky Success Rolls if they are not already. \nAttacks made by a model that is on top of the Dragon and target \nit get +1 DICE and +1 INJURY DICE. The Dragon cannot \nattack a model that is on top of it. When the Dragon moves, \nany models on top of the Dragon are moved with it. After the \nDragon’s move is finished, make a Success Roll for each model on \nit. If the roll is a Failure, the model Falls from the Dragon. Move \nit the shortest possible distance to the ground and place it Down, \nand then make an Injury Roll for it if it has Fallen 3” or more. If \nthe roll is a Success or Critical Success, nothing happens. Take the \nSuccess Roll in the same way if a model on top of the Dragon is \ntaken Down for any reason.\nI\n\n\n\n\n \n\t**\tSiege Weapon: The Dragon can move over terrain pieces that \nmeasure up to 4” by 4” as if they were Open terrain. If it does so, \nthe terrain piece is removed from the game when the Dragon \nmoves into contact with it. Models that were on top of the terrain \npiece Fall directly down to the battlefield; an additional Injury \nRoll may have to be made for them if they Fall 3” or more, or if \nthey land where they may be Trampled by the Dragon as it carries \non with its move.\n\t**\tCrush: The Dragon can move over other models. If it does so, \nmake an Injury Roll for the model when the Dragon moves \ninto contact with it, as if the model had been hit with an attack \nwith the +1 INJURY MODIFIER and IGNORE ARMOUR \nKeywords. The Dragon then continues with its move. Leave the \nmodel where it was if the Dragon moves beyond it. If the Dragon \nwould end up on top of the model, move it by the shortest \ndistance possible so that it will not be underneath the Dragon \n(even if it is Down). If it is not possible to move the model out \nof the way for any reason, it is removed from play and counts as \nbeing taken Out of Action in the Campaign Phase.\n\t**\tResistant: Remove 1 BLOOD MARKER from the Dragon when \nit is Activated. In addition, add -1 INJURY DICE to Injury Rolls \nfor the Dragon if the attack has one or more of the following \nKeywords: FIRE, GAS, or SHRAPNEL.\n\t**\tUndying: The first, second, and third time the Dragon suffers an \nOut of Action result on the Injury Table, it is treated as a Down \nresult instead. It then loses the Undying ability and replaces it \nwith the Defiant ability:\n\t**\tDefiant: When the Dragon suffers an Out of Action result on the \nInjury Table, it is treated as a Down result instead. The Defiant \nability is lost immediately when the sixth BLOOD MARKER is \nplaced next to the Dragon (from then on, Out of Action results \nwill affect it normally.)\nKeywords FEAR\nI\n\n\n\n\n \nThe Peasants\nThe Peasants are represented by suitably bedraggled and oppressed-looking \nmodels. The only thing an Activated Peasant model can do is take a Move or \nRetreat ACTION. When a player moves a Peasant model, they must do so so that \nit finishes the move as close as possible to the nearest edge of the battlefield. A \nPeasant will never enter Dangerous terrain, Climb, Jump, or Jump Down. If you \nare ever required to take a Success Roll for a Peasant, add -3 DICE to their roll.\nIf a Peasant reaches the edge of the battlefield, they leave and are removed from the \nbattlefield (▶ see Victory Conditions).\nThe Peasants\nThe war has taken its toll on the peasantry. Many are suffering from never-before-\nseen ailments and diseases, their contaminated state is the main reason they have \nnot been evacuated from the battlefield. Rescuing them is not an option. They pose \na great risk to the troops. So, putting an end to their miserable lives is the only \nright thing to do.\nMovement \nRanged \nMelee \nArmour\nBase\n5”/Infantry\n-\n-\n0 \n25mm\nBattlekit \nPeasants do not have any Battlekit.\nAbilities \n\t**\tFeeble: Add +2 DICE and +2 INJURY DICE to the rolls for \nattacks that target a Peasant.\nKeywords None\nI\n\n\n\n\n \nGAME LENGTH\nAt the end of the fourth Turn, the attacker rolls a D6. On a 1 or 2, the game ends \nimmediately. On a 3 or more, the game will end at the end of the fifth Turn.\nVICTORY CONDITIONS\nA player wins this scenario immediately if there are no enemy models on the \nbattlefield or if the opposing Warband flees (typically due to failing a Morale \nCheck). The game ends immediately in a draw if the Dragon leaves the \nbattlefield. Otherwise, the player with more Victory Points at the end of the \ngame is the winner.\nVictory Points\nThe players must keep a running tally of the Victory Points they score during the \ngame. Victory Points are scored for the following things:\n\t**\tEach player scores:\n\t* 2 VPs if an attack made by a friendly model takes a Peasant Out of Action.\n\t* 3 VPs if an attack made by a friendly model takes the Dragon Down (including \nwhen its Undying or Defiant abilities change the result to a Down result).\n\t* 6 VPs if an attack made by a friendly model takes the Dragon Out of Action \n(unless its Undying or Defiant abilities change the result to a Down result).\n\t* At the end of the game each player scores 1 VP for each Glorious Deed \nthey completed.\nGLORIOUS DEEDS\n\t**\tDragon Slayer: A friendly model on top of the Dragon takes the Dragon Out of \nAction with a Melee Attack (unless its Undying or Defiant abilities change the \nresult to a Down result). You receive 2 ☼ for completing this Glorious Deed.\n\t**\tFire with Fire: An attack made by a friendly model that has the FIRE, GAS \nand/or SHRAPNEL Keyword causes 2 BLOOD MARKERS to be placed \nnext to the Dragon.\n\t**\tGenocidal: A model takes 3 Peasants Out of Action.\n\t**\tOpportunist: A model is within 3” of a Peasant when the Peasant is \ntrampled by the Dragon.\n\t**\tOff My Back: A friendly model takes a model that is on top of the Dragon \nDown, and the model then Falls off the Dragon.\nII\nVI"
  },
  {
    "id": "supply-raid",
    "number": 7,
    "roman": "VII",
    "name": "VII. Supply Raid",
    "slug": "supply-raid",
    "tagline": "Raid enemy supplies or defend your caches from an assault.",
    "mapImage": "/maps/supply-raid.png",
    "tableSize": "48\" x 48\" (or 36\" x 36\" for skirmish)",
    "forces": "Before picking their Forces, the players must decide who is the attacker and who is the defender in this scenario. The player with the most models in their Warband (ignoring their Threshold Values or Field Strength) is the attacker in this scenario, and their opponent is the defender. If both players have the same number of models, they roll-off and the winner can decide who will be the attacker and who will be the defender.",
    "battlefield": "The players roll-off and the winner sets up the terrain for the game. This scenario uses the No Man’s Land or Decimated Ruins battlefield archetype (the player setting up the terrain decides). 24”",
    "deployment": "The players roll-off. The winner of the roll-off chooses which Deployment Zone will be theirs. The other Deployment Zone is their opponent’s. Before deploying any models, the players must set up 6 Supply Cache Markers as described above. The players then alternate deploying their models one at a time, starting with the player who has more models in their Warband (roll-off if both players have the same number of models). The defender may deploy a maximum of 6 models. The attacker may deploy a maximum of 6+D3 models. Any models that cannot be deployed are available as reinforcements. Models must be set up wholly within their own Deployment Zone. If a player runs out of models to set up, the other player sets up all their remaining models, one after another, until they have none left. Once the players have set up their models, deployment ends, and the game begins. Infiltrators Infiltrators can deploy normally or by using their special deployment rules. REINFORCEMENTS At the start of each Turn, the players roll-off. The winner rolls a D3 to see how many reinforcement models each of the players can deploy. The players then alternate deploying reinforcement models, one at a time, starting with the player that won the roll-off. Reinforcement models must be deployed touching the edge of the battlefield, wholly within their Deployment Zone, and more than 8” from the closest enemy model. If a player runs out of reinforcement models, the opposing player can set up any remaining reinforcements they have available up to the limit set for the Turn. Players must set up reinforcements if they have any available and are allowed to do so (you can’t choose to hold them back). II",
    "gameLength": "This scenario lasts four Turns.",
    "victoryConditions": "A player wins this scenario immediately if there are no enemy models on the battlefield after any reinforcements have been deployed or if the opposing Warband flees (typically due to failing a Morale Check). Otherwise, the player with more Victory Points at the end of the game is the winner. Victory Points ** At the end of the game the attacker scores 1 VP for each Supply Cache Marker that has been destroyed. ** At the end of the game the defender scores 2 VPs for each Supply Cache Marker that has not been destroyed. ** At the end of the game each player scores 1 VP for each enemy model taken Out of Action and 1 VP for each Glorious Deed they completed.",
    "gloriousDeeds": "** Daring Raid (Attacker only): A friendly model destroys a Supply Cache Marker. ** Hold your Ground: A Warband is the first to pass a Morale Check in this game. You receive a Victory Point for achieving this Glorious Deed. In a campaign game you can award 1 Experience Point to 1 ELITE model from the Warband that has the LEADER Keyword if you have one available, and you receive Glory Points and an extra D6 for your Promotion Pool as you would normally. ** Rampage (Attacker only): A friendly model destroys a second Supply Cache Marker. ** Save the Supplies! (Defender only): If there are four or more Supply Cache Markers that have not been destroyed at the end of the game. ** Stop Them! (Defender only): A friendly model takes an enemy Out of Action if the enemy is fully or partially within their own Deployment Zone. ** Victory or Death: A Warband wins the game. This Glorious Deed is only used in campaign games and is determined after the result of the game has been decided. You do not receieve any Victory Points for acheiving this Glorious Deed, but you can award 1 Experience Point to 1 ELITE model from the Warband that has the LEADER Keyword if you have one available, and you receive Glory Points and an extra D6 for your Promotion Pool as you would normally. III VII",
    "fullRulesMarkdown": "VII º Supply Raid\nRaid enemy supplies or defend your caches from an assault.\nFORCES\nBefore picking their Forces, the players must decide who is the attacker and who \nis the defender in this scenario. The player with the most models in their Warband \n(ignoring their Threshold Values or Field Strength) is the attacker in this scenario, \nand their opponent is the defender. If both players have the same number of \nmodels, they roll-off and the winner can decide who will be the attacker and who \nwill be the defender.\nTHE BATTLEFIELD\nThe players roll-off and the winner sets up the terrain for the game. This scenario \nuses the No Man’s Land or Decimated Ruins battlefield archetype (the player \nsetting up the terrain decides).\n24”\nDEPLOYMENT ZONE\nDEPLOYMENT ZONE\nII\n\n\n\n\n \nSupply Cache Markers\nAfter the terrain has been set up, the players must set up 6 Supply Cache Markers. \nThe players alternate setting up the Markers, one at a time, starting with the \ndefender. Supply Cache Markers must be set up more than 6” from the edge of \nthe battlefield, more than 6” away from any other Markers and more than 1” from \nImpassable terrain. Only one Marker can be placed in the defender’s Deployment \nZone, and none can be placed within 12\" of the attacker’s Deployment Zone.\n\t**\tDestroying Supply Caches: A player can choose a Supply Cache Marker as the \ntarget for a Ranged Attack with the HEAVY Keyword, or a Melee Attack of any \ntype. If the attack is a Success or a Critical Success, the Supply Cache Marker is \ndestroyed (remove it from the battlefield).\nDEPLOYMENT\nThe players roll-off. The winner of the roll-off chooses which Deployment Zone \nwill be theirs. The other Deployment Zone is their opponent’s. Before deploying \nany models, the players must set up 6 Supply Cache Markers as described above. \nThe players then alternate deploying their models one at a time, starting with \nthe player who has more models in their Warband (roll-off if both players have \nthe same number of models). The defender may deploy a maximum of 6 models. \nThe attacker may deploy a maximum of 6+D3 models. Any models that cannot \nbe deployed are available as reinforcements. Models must be set up wholly \nwithin their own Deployment Zone. If a player runs out of models to set up, \nthe other player sets up all their remaining models, one after another, until they \nhave none left. Once the players have set up their models, deployment ends, and \nthe game begins.\nInfiltrators\nInfiltrators can deploy normally or by using their special deployment rules.\nREINFORCEMENTS\nAt the start of each Turn, the players roll-off. The winner rolls a D3 to see how \nmany reinforcement models each of the players can deploy. The players then \nalternate deploying reinforcement models, one at a time, starting with the player \nthat won the roll-off. Reinforcement models must be deployed touching the \nedge of the battlefield, wholly within their Deployment Zone, and more than 8” \nfrom the closest enemy model. If a player runs out of reinforcement models, the \nopposing player can set up any remaining reinforcements they have available up \nto the limit set for the Turn. Players must set up reinforcements if they have any \navailable and are allowed to do so (you can’t choose to hold them back).\nII\n\n\n\n\n \nGAME LENGTH\nThis scenario lasts four Turns.\nVICTORY CONDITIONS\nA player wins this scenario immediately if there are no enemy models on the \nbattlefield after any reinforcements have been deployed or if the opposing \nWarband flees (typically due to failing a Morale Check). Otherwise, the player \nwith more Victory Points at the end of the game is the winner.\nVictory Points\n\t**\tAt the end of the game the attacker scores 1 VP for each Supply Cache Marker \nthat has been destroyed.\n\t**\tAt the end of the game the defender scores 2 VPs for each Supply Cache Marker \nthat has not been destroyed.\n\t**\tAt the end of the game each player scores 1 VP for each enemy model taken Out \nof Action and 1 VP for each Glorious Deed they completed.\nGLORIOUS DEEDS\n\t**\tDaring Raid (Attacker only): A friendly model destroys a Supply Cache Marker.\n\t**\tHold your Ground: A Warband is the first to pass a Morale Check in this game. \nYou receive a Victory Point for achieving this Glorious Deed. In a campaign \ngame you can award 1 Experience Point to 1 ELITE model from the Warband \nthat has the LEADER Keyword if you have one available, and you receive Glory \nPoints and an extra D6 for your Promotion Pool as you would normally.\n\t**\tRampage (Attacker only): A friendly model destroys a second Supply Cache Marker.\n\t**\tSave the Supplies! (Defender only): If there are four or more Supply Cache \nMarkers that have not been destroyed at the end of the game.\n\t**\tStop Them! (Defender only): A friendly model takes an enemy Out of Action if \nthe enemy is fully or partially within their own Deployment Zone.\n\t**\tVictory or Death: A Warband wins the game. This Glorious Deed is only used \nin campaign games and is determined after the result of the game has been \ndecided. You do not receieve any Victory Points for acheiving this Glorious \nDeed, but you can award 1 Experience Point to 1 ELITE model from the \nWarband that has the LEADER Keyword if you have one available, and \nyou receive Glory Points and an extra D6 for your Promotion Pool as you \nwould normally.\nIII\nVII"
  },
  {
    "id": "from-below",
    "number": 8,
    "roman": "VIII",
    "name": "VIII. From Below",
    "slug": "from-below",
    "tagline": "Conquer a pock-marked battlefield, but be careful not to rouse the beast that",
    "mapImage": "/maps/from-below.png",
    "tableSize": "48\" x 48\" (or 36\" x 36\" for skirmish)",
    "forces": "No special restrictions apply to the models the players can include in their Forces in this scenario.",
    "battlefield": "The players roll-off and the winner sets up the terrain for the game. This scenario can use any battlefield archetype (the player setting up the terrain decides which one to use). Ichor Pit Markers The 3 central Markers inside circles shown on the map represent Ichor Pits. Place the Ichor Pit Markers at the locations shown on the map before setting up any terrain. Terrain pieces cannot be set up within 1” of an Ichor Pit Marker. 28” MIDPOINT",
    "deployment": "The players roll-off. The winner of the roll-off chooses which Deployment Zone will be theirs. The other Deployment Zone is their opponent’s. The players then alternate deploying their models one at a time, starting with the player who has more models in their Warband (roll-off if both players have the same number of models). In this scenario, the players can only deploy half the models from their Force (rounding fractions up). Any remaining models are not used and are placed to one side. Models must be set up wholly within their own Deployment Zone. If a player runs out of models to set up, the other player sets up all their remaining models, one after another, until they have none left. Once the players have set up their models, deployment ends, and the game begins. Infiltrators Infiltrators can deploy normally or by using their special deployment rules. However, if they deploy using their special deployment rules, they cannot deploy within 6” of a Marker. ICHOR PIT MARKERS The entire battlefield was unknowingly built atop the back of a slumbering Larval Beast Lord. The unending barrage of shelling and gunfire has torn open wounds the size of pits across the monster’s back, each one filled with toxic ichor. This rare substance can corrode metal, flesh, and bone, carries unnamed diseases, and brims with properties not yet understood. Despite the immense risk of harvesting it and awakening the beast, the prize is simply too great to pass up. Open ground and terrain within 2” of the centre of the Ichor Pit Marker is treated as being Difficult and Dangerous terrain, in addition to any other terrain rules it may have. Each Ichor Pit contains enough Ichor to fill 6 Ichor Vials (▶ see below). We recommend you keep track of how many vials have been filled from a pit by putting a D6 on top of the Marker. An Ichor Pit with no Ichor left is no longer Dangerous Terrain. III Ichor Vials Each model in this scenario has 3 empty Ichor Vials (even if they are not usually allowed to take Battlekit or Equipment). Each player must keep track of how many empty and filled Ichor Vials the models in their Warband are carrying. If a model is taken Out of Action, place a Vials Marker at their location and record how many empty or filled Ichor Vials it represents. All models in this scenario can take the following ACTIONS (no Success Rolls are necessary): ** Fill Vial ACTION: A model with an empty Ichor Vial that is in contact with the centre of an Ichor Pit Marker can take a Fill Vial ACTION. If it does so, it fills 1 empty Ichor Vial with Ichor. ** Trade Vials ACTION: A model that is in contact with a friendly model can take a Trade Vials ACTION. If it does so, you can swap any number of empty or filled Ichor Vials between the two models. ** Steal Vials ACTION: A model that is in contact with a Vials Marker or an enemy model that is Down can take a Steals Vials ACTION. If it does so, you can take any number of empty or filled Ichor Vials from the Vials Marker or enemy model. ** Extract Vials ACTION: A model that is in contact with the longest edge of the battlefield in a Deployment Zone can take an Extract Vials ACTION. If it does so, you can extract any number of filled Ichor Vials from the model and replace them with empty Ichor Vials. ARTILLERY SHELLS MARKERS A player can choose an Artillery Shells Marker as the target for an attack. If the attack is a Success or a Critical Success, the Artillery Shells Marker explodes. An Artillery Shells Marker will also explode if it is caught in the radius of an attack with the BLAST Keyword. When an Artillery Shells Marker explodes, the players must first determine if the Beast awakens (▶ see below). If the Beast does not awaken, all models within 3” of it are hit in the same way as if they had been hit by an Infernal Bomb from the Heretic Legions Faction List (▶ see Infernal Bomb in Warbands of Trench Crusade). Then the Artillery Shells Marker is replaced with an Ichor Pit Marker and the players must set up Hell Ticks as described below. THE BEAST “I saw a great beast rise up from beneath, having seven amalgamated heads with ten mouths, and in each mouth, a thousand teeth and a hundred tongues, and upon its body were carved marks of blasphemy and the sigils of the end.” -New Syncretic Orthodox Bible Explosions caused by the piles of artillery shells may awaken the Beast. If the Beast awakens, all models that remain on the battlefield are taken Out of Action and the game ends (▶ see Victory Conditions). ** First Explosion: The Beast twitches, causing a minor tremor across the battlefield. Roll a D6 for each model that is not Down. On a roll of 6 the model is taken Down. III ** Second Explosion: Roll a D6. On a roll of 4-6, the Beast awakens. ** Third Explosion: Roll a D6. On a roll of 3-6, the Beast awakens. ** Fourth Explosion: The Beast awakens. Call of the Beast Starting with the first explosion of a pile of artillery shells, the Larval Beast’s wail of torment echoes through the valley, summoning the parasites buried within its own flesh to the surface. These bloated, bloodthirsty Hell Ticks claw and tear their way out of the creature’s body, swarming across the battlefield, ready to feast upon any living being they can sink their fangs into. If the Beast does not awaken after an explosion, the players roll-off and the winner can set up D3 Hell Tick models within 8” of the centre of the Ichor Pit Marker created by the explosion and more than 1” away from any other models. Hell Ticks are neutral models (▶ see below). Each Hell Ticks can be represented by a small and suitably insect-like model. If no suitable models are available, represent them with Markers. Neutral Model Activation Rolls Hell Ticks are neutral models. Neutral models are treated as enemy models by both sides. In addition, when a player finishes an Activation with one of their models, they must take a Neutral Model Activation Roll by rolling a D6. If they roll a 1-4, they can Activate a Hell Tick of their choice. They cannot Activate a Hell Tick that has already been Activated (by either player). Once the Hell Ticks have been Activated during a Turn, stop making Neutral Model Activation Rolls until the following Turn. When a player Activates a Hell Tick, they must carry out an Activation with it using the rules below. If a player runs out of models from their own Warband to Activate and there are still Hell Ticks remaining to Activate, they must still make Neutral Model Activation Rolls. In the event that any Hell Ticks remain to be Activated after both players have finished Activating models from their Warband, just roll-off for each one, the winner must Activate the model. III Hell Tick Actions When a player Activates a Hell Tick, they must first choose its prey (▶ see below). They must then take 1 Move ACTION and 1 Dash ACTION or 1 Fight ACTION with the Hell Tick. If the Hell Tick is not within 1” of its prey, it will move as described below and then Fight if it is within 1” of its prey or Dash if it is not. If the Hell Tick starts within 1” of its prey, it will attack before it moves. If the attack takes the prey Out of Action, choose new prey and then move the Hell Tick as described below. The Hell Tick’s chosen prey is determined by using the following list of priorities: ** If there are any models within 20” of the Hell Tick that have BLOOD MARKERS, then it will choose the model with the most BLOOD MARKERS as its prey. If two or more models have the same number of BLOOD MARKERS, it will choose the closest as its prey. If two or more models are equally close, the player can choose which model is its prey. ** If there are no models within 20” of the Hell Tick that have BLOOD MARKERS, then it will choose the closest as its prey. If two or more models are equally close, the player can choose which model is its prey. ** Ignore other Hell Tick models when working out a Hell Tick’s chosen prey. Moving the Hell Tick A player must move a Hell Tick towards its prey so that it finishes either in contact with it, or if that is impossible, as close to its prey as possible. Attacking with the Hell Tick When the Hell Tick attacks, it will target its prey if it can do so. Otherwise, it will target the nearest model it can attack. If two or more potential targets are equally close to the Hell Tick, the player can choose which model it attacks. When a Hell Tick attacks, it makes a Melee Attack using its Mandibles ability. III Hell Ticks Hell Ticks infest No Man’s Land. Creatures of monstrous size with a voracious appetite for blood. Infestation follows wherever the path of the Beast cuts through the land. Movement Ranged Melee Armour Base 10”/Infantry - +1 DICE 0 25mm Battlekit Hell Ticks do not have any Battlekit. Abilities ** Mandibles: A Hell Tick can make a Melee Attack even though it does not have a Melee Weapon. Add +1 INJURY DICE to rolls for a Melee Attack made by a Hell Tick. Whenever a Melee Attack made by a Hell Tick causes any BLOOD MARKERS to be placed on the target, you can remove up to 1 BLOOD MARKER from the attacking Hell Tick model. ** Poisoned: Whenever a Melee Attack made by a Hell Tick causes any BLOOD MARKERS to be placed on the target, the target model becomes poisoned (it cannot be poisoned more than once). When you Activate a friendly model that has been poisoned, you must place 1 BLOOD MARKER next to the model. You can then spend a BLESSING MARKER that is next to the model if you wish to do so. If you do, the model is no longer poisoned. Keywords None III",
    "gameLength": "The game ends if the Beast awakens. In addition, at the end of the fourth Turn, the attacker rolls a D6. On a 1 or 2, the game ends immediately. On a 3 or more, the game will end at the end of the fifth Turn, provided the Beast fails to awaken before then.",
    "victoryConditions": "A player wins this scenario immediately if there are no enemy models on the battlefield, or if the opposing Warband flees (typically due to failing a Morale Check). The game ends immediately in a draw if the Beast awakens. Otherwise, the player with more Victory Points at the end of the game is the winner. Victory Points ** At the end of the game each player scores 1 VP for each Ichor Vial that they extracted and 1 VP for each Glorious Deed they completed during the game.",
    "gloriousDeeds": "** Bloodlust: A friendly model that has been poisoned uses a Bloodbath Roll to take an enemy model that has been poisoned Out of Action. You can convert an Injury Roll into a Bloodbath Roll by spending BLOOD MARKERS (▶ see BLOOD MARKERS). ** For Science: A friendly model extracts 3 Ichor Vials. ** Ichor Frenzy: A friendly model extracts an Ichor Vial when it is wholly within the enemy Deployment Zone. ** Risk Taker: A friendly model causes an explosion that takes 2 or more enemy models Out of Action. ** Sadistic Wretch: A friendly model causes an enemy model to be taken Out of Action by causing it to move into an Ichor Pit. ** Vial Thief: A friendly model steals an Ichor Vial from an enemy model and then manages to extract it. X VIII",
    "fullRulesMarkdown": "VIIIº From Below\nConquer a pock-marked battlefield, but be careful not to rouse the beast that \nslumbers beneath.\nFORCES\nNo special restrictions apply to the models the players can include in their Forces \nin this scenario.\nTHE BATTLEFIELD\nThe players roll-off and the winner sets up the terrain for the game. This scenario \ncan use any battlefield archetype (the player setting up the terrain decides \nwhich one to use).\nIchor Pit Markers\nThe 3 central Markers inside circles shown on the map represent Ichor Pits. Place \nthe Ichor Pit Markers at the locations shown on the map before setting up any \nterrain. Terrain pieces cannot be set up within 1” of an Ichor Pit Marker.\n28”\nMIDPOINT\nDEPLOYMENT ZONE\nDEPLOYMENT ZONE\n12”\n12”\n12”\n12”\n9”\n9”\n6”\n6”\n6”\n6”\n14”\n14”\nIII\n\n\n\n\n \nArtillery Shells Markers\nThe 4 remaining Markers shown on the map represent Artillery Shells. After \nsetting up any terrain, place the Artillery Shell Markers at the locations \nshown on the map.\nDEPLOYMENT\nThe players roll-off. The winner of the roll-off chooses which Deployment Zone \nwill be theirs. The other Deployment Zone is their opponent’s. The players then \nalternate deploying their models one at a time, starting with the player who has \nmore models in their Warband (roll-off if both players have the same number of \nmodels). In this scenario, the players can only deploy half the models from their \nForce (rounding fractions up). Any remaining models are not used and are placed \nto one side. Models must be set up wholly within their own Deployment Zone. If \na player runs out of models to set up, the other player sets up all their remaining \nmodels, one after another, until they have none left. Once the players have set up \ntheir models, deployment ends, and the game begins.\nInfiltrators\nInfiltrators can deploy normally or by using their special deployment rules. \nHowever, if they deploy using their special deployment rules, they cannot deploy \nwithin 6” of a Marker.\nICHOR PIT MARKERS\nThe entire battlefield was unknowingly built atop the back of a slumbering Larval \nBeast Lord. The unending barrage of shelling and gunfire has torn open wounds \nthe size of pits across the monster’s back, each one filled with toxic ichor. This rare \nsubstance can corrode metal, flesh, and bone, carries unnamed diseases, and brims \nwith properties not yet understood. Despite the immense risk of harvesting it and \nawakening the beast, the prize is simply too great to pass up.\nOpen ground and terrain within 2” of the centre of the Ichor Pit Marker is \ntreated as being Difficult and Dangerous terrain, in addition to any other terrain \nrules it may have. \nEach Ichor Pit contains enough Ichor to fill 6 Ichor Vials (▶ see below). We \nrecommend you keep track of how many vials have been filled from a pit by \nputting a D6 on top of the Marker. An Ichor Pit with no Ichor left is no longer \nDangerous Terrain.\nIII\n\n\n\n\n \nIchor Vials\nEach model in this scenario has 3 empty Ichor Vials (even if they are not usually \nallowed to take Battlekit or Equipment). Each player must keep track of how many \nempty and filled Ichor Vials the models in their Warband are carrying. If a model \nis taken Out of Action, place a Vials Marker at their location and record how many \nempty or filled Ichor Vials it represents. All models in this scenario can take the \nfollowing ACTIONS (no Success Rolls are necessary):\n\t**\tFill Vial ACTION: A model with an empty Ichor Vial that is in contact with \nthe centre of an Ichor Pit Marker can take a Fill Vial ACTION. If it does so, it \nfills 1 empty Ichor Vial with Ichor.\n\t**\tTrade Vials ACTION: A model that is in contact with a friendly model can \ntake a Trade Vials ACTION. If it does so, you can swap any number of empty or \nfilled Ichor Vials between the two models.\n\t**\tSteal Vials ACTION: A model that is in contact with a Vials Marker or an \nenemy model that is Down can take a Steals Vials ACTION. If it does so, \nyou can take any number of empty or filled Ichor Vials from the Vials Marker \nor enemy model.\n\t**\tExtract Vials ACTION: A model that is in contact with the longest edge of the \nbattlefield in a Deployment Zone can take an Extract Vials ACTION. If it does \nso, you can extract any number of filled Ichor Vials from the model and replace \nthem with empty Ichor Vials.\nARTILLERY SHELLS MARKERS\nA player can choose an Artillery Shells Marker as the target for an attack. If the \nattack is a Success or a Critical Success, the Artillery Shells Marker explodes. An \nArtillery Shells Marker will also explode if it is caught in the radius of an attack \nwith the BLAST Keyword. When an Artillery Shells Marker explodes, the players \nmust first determine if the Beast awakens (▶ see below). If the Beast does not \nawaken, all models within 3” of it are hit in the same way as if they had been hit by \nan Infernal Bomb from the Heretic Legions Faction List (▶ see Infernal Bomb in \nWarbands of Trench Crusade). Then the Artillery Shells Marker is replaced with \nan Ichor Pit Marker and the players must set up Hell Ticks as described below.\nTHE BEAST\n“I saw a great beast rise up from beneath, having seven amalgamated heads with ten \nmouths, and in each mouth, a thousand teeth and a hundred tongues, and upon its \nbody were carved marks of blasphemy and the sigils of the end.”\n-New Syncretic Orthodox Bible\nExplosions caused by the piles of artillery shells may awaken the Beast. If the Beast \nawakens, all models that remain on the battlefield are taken Out of Action and the \ngame ends (▶ see Victory Conditions).\n\t**\tFirst Explosion: The Beast twitches, causing a minor tremor across the \nbattlefield. Roll a D6 for each model that is not Down. On a roll of 6 the \nmodel is taken Down.\nIII\n\n\n\n\n \n\t**\tSecond Explosion: Roll a D6. On a roll of 4-6, the Beast awakens.\n\t**\tThird Explosion: Roll a D6. On a roll of 3-6, the Beast awakens.\n\t**\tFourth Explosion: The Beast awakens.\nCall of the Beast\nStarting with the first explosion of a pile of artillery shells, the Larval Beast’s wail of \ntorment echoes through the valley, summoning the parasites buried within its own \nflesh to the surface. These bloated, bloodthirsty Hell Ticks claw and tear their way \nout of the creature’s body, swarming across the battlefield, ready to feast upon any \nliving being they can sink their fangs into.\nIf the Beast does not awaken after an explosion, the players roll-off and the winner \ncan set up D3 Hell Tick models within 8” of the centre of the Ichor Pit Marker \ncreated by the explosion and more than 1” away from any other models. Hell \nTicks are neutral models (▶ see below). Each Hell Ticks can be represented by a \nsmall and suitably insect-like model. If no suitable models are available, represent \nthem with Markers.\nNeutral Model Activation Rolls\nHell Ticks are neutral models. Neutral models are treated as enemy models by \nboth sides. In addition, when a player finishes an Activation with one of their \nmodels, they must take a Neutral Model Activation Roll by rolling a D6. If they \nroll a 1-4, they can Activate a Hell Tick of their choice. They cannot Activate a \nHell Tick that has already been Activated (by either player). Once the Hell Ticks \nhave been Activated during a Turn, stop making Neutral Model Activation Rolls \nuntil the following Turn.\nWhen a player Activates a Hell Tick, they must carry out an Activation with it \nusing the rules below. \nIf a player runs out of models from their own Warband to Activate and there \nare still Hell Ticks remaining to Activate, they must still make Neutral Model \nActivation Rolls. In the event that any Hell Ticks remain to be Activated after \nboth players have finished Activating models from their Warband, just roll-off for \neach one, the winner must Activate the model.\nIII\n\n\n\n\n \nHell Tick Actions\nWhen a player Activates a Hell Tick, they must first choose its prey (▶ see \nbelow). They must then take 1 Move ACTION and 1 Dash ACTION or 1 Fight \nACTION with the Hell Tick. If the Hell Tick is not within 1” of its prey, it will \nmove as described below and then Fight if it is within 1” of its prey or Dash if it is \nnot. If the Hell Tick starts within 1” of its prey, it will attack before it moves. If the \nattack takes the prey Out of Action, choose new prey and then move the Hell Tick \nas described below.\nThe Hell Tick’s chosen prey is determined by using the following list of priorities:\n\t**\tIf there are any models within 20” of the Hell Tick that have BLOOD \nMARKERS, then it will choose the model with the most BLOOD MARKERS \nas its prey. If two or more models have the same number of BLOOD \nMARKERS, it will choose the closest as its prey. If two or more models are \nequally close, the player can choose which model is its prey.\n\t**\tIf there are no models within 20” of the Hell Tick that have BLOOD \nMARKERS, then it will choose the closest as its prey. If two or more models are \nequally close, the player can choose which model is its prey.\n\t**\tIgnore other Hell Tick models when working out a Hell Tick’s chosen prey.\nMoving the Hell Tick\nA player must move a Hell Tick towards its prey so that it finishes either in contact \nwith it, or if that is impossible, as close to its prey as possible.\nAttacking with the Hell Tick\nWhen the Hell Tick attacks, it will target its prey if it can do so. Otherwise, it will \ntarget the nearest model it can attack. If two or more potential targets are equally \nclose to the Hell Tick, the player can choose which model it attacks. When a Hell \nTick attacks, it makes a Melee Attack using its Mandibles ability.\nIII\n\n\n\n\n \nHell Ticks\nHell Ticks infest No Man’s Land. Creatures of monstrous size with a voracious \nappetite for blood. Infestation follows wherever the path of the Beast cuts \nthrough the land.\nMovement \nRanged \nMelee \nArmour\nBase\n10”/Infantry \n-\n+1 DICE\n0 \n25mm\nBattlekit \nHell Ticks do not have any Battlekit.\nAbilities \n\t**\tMandibles: A Hell Tick can make a Melee Attack even though \nit does not have a Melee Weapon. Add +1 INJURY DICE to \nrolls for a Melee Attack made by a Hell Tick. Whenever a Melee \nAttack made by a Hell Tick causes any BLOOD MARKERS \nto be placed on the target, you can remove up to 1 BLOOD \nMARKER from the attacking Hell Tick model.\n\t**\tPoisoned: Whenever a Melee Attack made by a Hell Tick \ncauses any BLOOD MARKERS to be placed on the target, the \ntarget model becomes poisoned (it cannot be poisoned more \nthan once). When you Activate a friendly model that has been \npoisoned, you must place 1 BLOOD MARKER next to the \nmodel. You can then spend a BLESSING MARKER that is \nnext to the model if you wish to do so. If you do, the model is no \nlonger poisoned.\nKeywords None\nIII\n\n\n\n\n \nGAME LENGTH\nThe game ends if the Beast awakens. In addition, at the end of the fourth Turn, \nthe attacker rolls a D6. On a 1 or 2, the game ends immediately. On a 3 or \nmore, the game will end at the end of the fifth Turn, provided the Beast fails to \nawaken before then.\nVICTORY CONDITIONS\nA player wins this scenario immediately if there are no enemy models on the \nbattlefield, or if the opposing Warband flees (typically due to failing a Morale \nCheck). The game ends immediately in a draw if the Beast awakens. Otherwise, \nthe player with more Victory Points at the end of the game is the winner.\nVictory Points\n\t**\tAt the end of the game each player scores 1 VP for each Ichor Vial that they \nextracted and 1 VP for each Glorious Deed they completed during the game.\nGLORIOUS DEEDS\n\t**\tBloodlust: A friendly model that has been poisoned uses a Bloodbath Roll to \ntake an enemy model that has been poisoned Out of Action. You can convert \nan Injury Roll into a Bloodbath Roll by spending BLOOD MARKERS (▶ see \nBLOOD MARKERS).\n\t**\tFor Science: A friendly model extracts 3 Ichor Vials.\n\t**\tIchor Frenzy: A friendly model extracts an Ichor Vial when it is wholly within \nthe enemy Deployment Zone.\n\t**\tRisk Taker: A friendly model causes an explosion that takes 2 or more enemy \nmodels Out of Action.\n\t**\tSadistic Wretch: A friendly model causes an enemy model to be taken Out of \nAction by causing it to move into an Ichor Pit.\n\t**\tVial Thief: A friendly model steals an Ichor Vial from an enemy model and then \nmanages to extract it.\nX\nVIII"
  },
  {
    "id": "fields-of-glory",
    "number": 9,
    "roman": "IX",
    "name": "IX. Fields of Glory",
    "slug": "fields-of-glory",
    "tagline": "Show your might and bravery. Fight to the glorious death and let your",
    "mapImage": "/maps/fields-of-glory.png",
    "tableSize": "48\" x 48\" (or 36\" x 36\" for skirmish)",
    "forces": "No special restrictions apply to the models the players can include in their Forces in this scenario.",
    "battlefield": "The players roll-off and the winner sets up the terrain for the game. This scenario uses the Trench Lines battlefield archetype. 24”",
    "deployment": "The players roll-off. The winner of the roll-off chooses which Deployment Zone will be theirs. The other Deployment Zone is their opponent’s. The players then alternate deploying their models one at a time, starting with the player who has more models in their Warband (roll-off if both players have the same number of models). Models must be set up wholly within their own Deployment Zone. If a player runs out of models to set up, the other player sets up all their remaining models, one after another, until they have none left. Once the players have set up their models, deployment ends, and the game begins. Infiltrators Infiltrators can deploy normally or by using their special deployment rules.",
    "gameLength": "This scenario lasts four Turns.",
    "victoryConditions": "A player wins this scenario immediately if there are no enemy models on the battlefield, or if the opposing Warband flees (typically due to failing a Morale Check). Otherwise, the player with more Victory Points at the end of the game is the winner. Victory Points ** At the end of the game each player scores: * 1 VP for each Glorious Deed they completed. * 1 extra VP for each of the following Glorious Deeds they completed: Elite Hunter, Personal Revenge, and Risk It All. * 2 extra VPs if they completed the Trench Raider Glorious Deed.",
    "gloriousDeeds": "** Death From Above: A friendly model takes an enemy model Out of Action with a Melee Attack that has the Diving Charge modifier. ** Elite Hunter: A friendly model takes two enemy models with the ELITE Keyword Out of Action. ** No Escape: A friendly model successfully charges an enemy model that it did not have a Line of Sight to at the start of its Activation. ** Personal Revenge: A friendly model uses a Bloodbath Roll to take an enemy model Out of Action if the enemy model had taken a friendly model Out of Action earlier in the game. ** Reaper: A friendly model takes three enemy models Out of Action. ** Risk It All: A friendly model takes two Risky Success Rolls in the same Activation, and both are a Success or Critical Success. ** The Real Killer: A friendly model takes an enemy model that is on Dangerous or Difficult terrain Out of Action. ** Trench Raider: A Warband captures a trench section that is at least 6” long and is wholly within 8” of the enemy Deployment Zone. A Warband captures a trench section if there are 1 or more friendly models in the trench and no enemy models are within 1” of it. IX",
    "fullRulesMarkdown": "IX º Fields of Glory\nShow your might and bravery. Fight to the glorious death and let your \nlegend live on.\nFORCES\nNo special restrictions apply to the models the players can include in their Forces \nin this scenario.\nTHE BATTLEFIELD\nThe players roll-off and the winner sets up the terrain for the game. This scenario \nuses the Trench Lines battlefield archetype.\n24”\nDEPLOYMENT ZONE\nDEPLOYMENT ZONE\nX\n\n\n\n\n \nDEPLOYMENT\nThe players roll-off. The winner of the roll-off chooses which Deployment Zone \nwill be theirs. The other Deployment Zone is their opponent’s. The players then \nalternate deploying their models one at a time, starting with the player who has \nmore models in their Warband (roll-off if both players have the same number of \nmodels). Models must be set up wholly within their own Deployment Zone. If \na player runs out of models to set up, the other player sets up all their remaining \nmodels, one after another, until they have none left. Once the players have set up \ntheir models, deployment ends, and the game begins.\nInfiltrators\nInfiltrators can deploy normally or by using their special deployment rules.\nGAME LENGTH\nThis scenario lasts four Turns.\nVICTORY CONDITIONS\nA player wins this scenario immediately if there are no enemy models on the battlefield, \nor if the opposing Warband flees (typically due to failing a Morale Check). Otherwise, \nthe player with more Victory Points at the end of the game is the winner.\nVictory Points\n\t**\tAt the end of the game each player scores:\n\t* 1 VP for each Glorious Deed they completed.\n\t* 1 extra VP for each of the following Glorious Deeds they completed: Elite \nHunter, Personal Revenge, and Risk It All.\n\t* 2 extra VPs if they completed the Trench Raider Glorious Deed.\nGLORIOUS DEEDS\n\t**\tDeath From Above: A friendly model takes an enemy model Out of Action with \na Melee Attack that has the Diving Charge modifier.\n\t**\tElite Hunter: A friendly model takes two enemy models with the ELITE \nKeyword Out of Action.\n\t**\tNo Escape: A friendly model successfully charges an enemy model that it did \nnot have a Line of Sight to at the start of its Activation.\n\t**\tPersonal Revenge: A friendly model uses a Bloodbath Roll to take an enemy \nmodel Out of Action if the enemy model had taken a friendly model Out of \nAction earlier in the game.\n\t**\tReaper: A friendly model takes three enemy models Out of Action.\n\t**\tRisk It All: A friendly model takes two Risky Success Rolls in the same \nActivation, and both are a Success or Critical Success.\n\t**\tThe Real Killer: A friendly model takes an enemy model that is on Dangerous or \nDifficult terrain Out of Action.\n\t**\tTrench Raider: A Warband captures a trench section that is at least 6” long and \nis wholly within 8” of the enemy Deployment Zone. A Warband captures a \ntrench section if there are 1 or more friendly models in the trench and no enemy \nmodels are within 1” of it.\n\nIX"
  },
  {
    "id": "dont-breathe",
    "number": 10,
    "roman": "X",
    "name": "X. Don’t Breathe",
    "slug": "dont-breathe",
    "tagline": "Beware of poison gas as you assault enemy bunkers or drive back the attackers with",
    "mapImage": "/maps/dont-breathe.png",
    "tableSize": "48\" x 48\" (or 36\" x 36\" for skirmish)",
    "forces": "Before picking their Forces, the players must decide who is the attacker and who is the defender in this scenario. The player with the most models in their Warband (ignoring their Threshold Values or Field Strength) is the attacker in this scenario and their opponent is the defender. If both players have the same number of models, they roll-off and the winner decides who will be the attacker and who will be the defender.",
    "battlefield": "The players roll-off and the winner sets up the terrain for the game. This scenario uses the No Man’s Land battlefield archetype and requires a battlefield that is 48\" by 48\". When setting up the terrain for this scenario, do not set up any terrain in either Deployment Zone. 18” 20 10 ATTACKER DEPLOYMENT ZONE 12 MINE PLACEMENT AREA DEFEMDER DEPLOYMENT AREA Trench Section Trench Section Trench Section Trench Section Trench Section Trench Section Bunker Bunker Bunker Bunker",
    "deployment": "The players roll-off. The winner of the roll-off chooses which Deployment Zone will be theirs. The other Deployment Zone is their opponent’s. Before any models are deployed, the defender must set up their Trench Lines, Bunkers, and Gas Mine Markers as described below. The players then alternate deploying their models one at a time, starting with the attacker. The players alternate deploying their models one at a time, starting with the attacker. The defender may deploy a maximum of 6 models. The attacker may deploy a maximum of 6+D3 models. Any models that cannot be deployed are available as reinforcements (▶ see below). Models must be set up wholly within their own Deployment Zone. If a player runs out of models to set up, the other player sets up all their remaining models, one after another, until they have none left. Once the players have set up their models, deployment ends, and the game begins. Defending Trench Lines The defender must set up six trench sections that are at least 8” long at the locations shown on the map. They can add additional trench sections of any size if they wish to, but all must be set up wholly within their Deployment Zone and more than 3” from the centre of where any of the Bunker Markers will be placed. Bunkers Markers The Bunker Markers represent heavily armoured entrenchments. After the Defender has set up their Trenches, they must set up four terrain pieces on top of where a Bunker Marker will be set up. They must use Intact Building terrain pieces if available (if they run out of Buildings, they can use whatever terrain pieces they wish). Place each Bunker Marker anywhere on the terrain piece that covers its starting position; the whole of the terrain piece is treated as the Bunker in this scenario. Gas Mine Markers After the defender sets up their Trenches, they can set up 12 Gas Mine Markers. At least 8 of the Gas Mine Markers must be placed wholly within the Gas Mine Placement Area. Up to 4 can be placed wholly within the defender’s Deployment Zone. After setting the Gas Mine Markers up, the defender must secretly write down which 4 of the Gas Mine Markers are duds. All of the other Gas Mine Markers are live and have the MINED Keyword and the following special rules. ** Choking Mines: As soon as a model moves within 3” of a Gas Mine Marker, temporarily halt its move. The defender must then reveal if the Gas Mine Marker is a dud. If it is, nothing happens. If it is a live mine, it detonates in the same way as if the model had moved into contact with a Marker with the MINED Keyword. The Gas Mine Marker is then removed and replaced with a Gas Cloud Marker. The moving model can then carry on with its move as long as it wasn’t taken Down or Out of Action. Models with the FLYING Keyword only trigger a Gas Mine Marker if they finish a move in contact with it (they can fly across it without setting it off ). ** Gas Cloud Markers: Place 1 BLOOD MARKER next to each model that is within 6” of the centre of a Gas Cloud Marker when it is set up. In addition, place 1 BLOOD MARKER next to a model that is within 6” of the centre of a Gas Cloud Marker when the model is Activated. ** Detonating Gas Cloud Markers: A model can choose a Gas Cloud Marker as the target for an attack with a weapon that has the BLAST or FIRE Keyword. If the attack is a Success or a Critical Success, the Gas Cloud Marker explodes. A Gas Cloud Marker will also explode if it is caught in the radius of an attack with the BLAST Keyword. ** Gas Cloud Explosions: When a Gas Cloud Marker explodes, make an Injury Roll for each model within 3” of the Marker as if they had been hit by a weapon with the +2 INJURY DICE and FIRE Keywords. If the model is not taken Out of Action by the Injury Roll, it is blown away D3” in a straight line directly away from the centre of the Marker. The model stops if it is blown into another model, Impassable terrain, or terrain it cannot cross without having to Climb. The Gas Cloud Marker is then removed from the battlefield. Infiltrators Infiltrators can deploy normally or by using their special deployment rules. Attacking models that deploy using their special deployment rules cannot deploy within 8” of a Bunker Marker. REINFORCEMENTS At the start of each Turn, the players roll-off. The winner rolls a D3 to see how many reinforcement models each of the players can deploy. The players then alternate deploying reinforcement models, one at a time, starting with the player that won the roll-off. Reinforcement models must be deployed touching the edge of the battlefield, wholly within their Deployment Zone, and more than 8” from the closest enemy model. If a player runs out of reinforcement models, the opposing player can set up any remaining reinforcements they have available up to the limit set for the Turn. Players must set up reinforcements if they have any available and are allowed to do so (you can’t choose to hold them back). DESTROYING BUNKERS Models on the attacking side with the ELITE Keyword have Demo Charges even if they are not usually allowed to take Battlekit or Equipment. A model that has Demo Charges can take the following ACTIONS (no Success Rolls are necessary): ** Place Demo Charge ACTION: A model that has Demo Charges and is in contact with a Bunker can take an ACTION to place the Demo Charge on the Bunker. Once it does so, it no longer has the Demo Charge but can now use the Detonate Demo Charge ACTION. ** Detonate Demo Charge ACTION: A model that has set Demo Charges can take an ACTION to detonate the Demo Charge. It can take the ACTION at any time during the game, and can wait one or more Turns before it does so if desired (this gives the model a chance to move away so it does not get caught in the explosion). When it finally takes the ACTION, make an Injury Roll with the IGNORE ARMOUR Keyword for every model within 3” of the Bunker. The Bunker Marker is then removed, and the terrain piece it was on is no longer considered a Bunker. Note that if a model that has placed a Demo Charge is taken Out of Action, it will not be possible to detonate the Demo Charge.",
    "gameLength": "At the end of the fifth Turn, the attacker rolls a D6. On a 1 or 2, the game ends immediately. On a 3 or more, the game will end at the end of the sixth Turn.",
    "victoryConditions": "A player wins this scenario immediately if there are no enemy models on the battlefield, or if the opposing Warband flees (typically due to failing a Morale Check). Otherwise, the player with more Victory Points at the end of the game is the winner. Victory Points The players must keep a running tally of the Victory Points they score. Victory Points are scored for the following things: ** At the end of each Turn, the defender scores 1 VP for each trench section that is at least 8” long and has one or more defending models in it. If there are no attacking models in the trench section, the defender scores 2 VPs instead of 1. ** At the end of each Turn, the attacker scores: * At the end of each Turn, the attacker scores 2 VPs for each trench section that is at least 8” long and has one or more attacking models in it. If there are no defending models in the trench section, the attacker scores 3 VPs instead of 2 * 2 VPs for each Bunker that was destroyed by a Demo Charge that Turn. ** At the end of the game each player scores 1 VP for each Glorious Deed they completed and 4 VP for each Bunker they control. A player controls a Bunker if there are more friendly models within 1” of it than there are enemy models.",
    "gloriousDeeds": "** Burning Sight: A friendly model causes a Gas Cloud Marker that is more than 14” away from it to explode, and the explosion takes one or more enemy models Out of Action. ** Combustive: A friendly model causes a Gas Cloud Marker to explode, and the explosion takes two or more enemy models Out of Action. ** Deep Breaths: A friendly model causes an enemy model to be taken Out of Action by causing it to move within 6” of the centre of a Gas Cloud Marker. ** Iron Lungs: A Warband controls a Bunker that is within 6” of the centre of a Gas Cloud Marker at the end of two consecutive Turns. A Warband controls a Bunker if there are more friendly models within 1” of it than there are enemy models. ** Poisonous Rage: A friendly model that is within 6” of the centre of a Gas Cloud makes a Melee Attack that takes an enemy model Out of Action. I X",
    "fullRulesMarkdown": "X º Don’t Breathe\nBeware of poison gas as you assault enemy bunkers or drive back the attackers with \nthe power of mustard gas!\nFORCES\nBefore picking their Forces, the players must decide who is the attacker and who \nis the defender in this scenario. The player with the most models in their Warband \n(ignoring their Threshold Values or Field Strength) is the attacker in this scenario \nand their opponent is the defender. If both players have the same number of \nmodels, they roll-off and the winner decides who will be the attacker and who will \nbe the defender.\nTHE BATTLEFIELD\nThe players roll-off and the winner sets up the terrain for the game. This scenario \nuses the No Man’s Land battlefield archetype and requires a battlefield that is 48\" \nby 48\". When setting up the terrain for this scenario, do not set up any terrain in \neither Deployment Zone.\n18”\n20\n10\nATTACKER DEPLOYMENT ZONE\n12 MINE PLACEMENT AREA\nDEFEMDER DEPLOYMENT AREA\nTrench\n Section\nTrench\n Section\nTrench\n Section\nTrench\n Section\nTrench\n Section\nTrench\n Section\nBunker\nBunker\nBunker\nBunker\n\n\n\n\n\n \nDEPLOYMENT\nThe players roll-off. The winner of the roll-off chooses which Deployment Zone \nwill be theirs. The other Deployment Zone is their opponent’s. Before any models \nare deployed, the defender must set up their Trench Lines, Bunkers, and Gas Mine \nMarkers as described below. The players then alternate deploying their models one \nat a time, starting with the attacker. The players alternate deploying their models \none at a time, starting with the attacker. The defender may deploy a maximum of \n6 models. The attacker may deploy a maximum of 6+D3 models. Any models that \ncannot be deployed are available as reinforcements (▶ see below). Models must be \nset up wholly within their own Deployment Zone. If a player runs out of models \nto set up, the other player sets up all their remaining models, one after another, \nuntil they have none left. Once the players have set up their models, deployment \nends, and the game begins.\nDefending Trench Lines\nThe defender must set up six trench sections that are at least 8” long at the \nlocations shown on the map. They can add additional trench sections of any size \nif they wish to, but all must be set up wholly within their Deployment Zone and \nmore than 3” from the centre of where any of the Bunker Markers will be placed.\nBunkers Markers\nThe Bunker Markers represent heavily armoured entrenchments. After the \nDefender has set up their Trenches, they must set up four terrain pieces on top \nof where a Bunker Marker will be set up. They must use Intact Building terrain \npieces if available (if they run out of Buildings, they can use whatever terrain \npieces they wish). Place each Bunker Marker anywhere on the terrain piece that \ncovers its starting position; the whole of the terrain piece is treated as the Bunker \nin this scenario.\n\n\n\n\n\n \nGas Mine Markers\nAfter the defender sets up their Trenches, they can set up 12 Gas Mine Markers. \nAt least 8 of the Gas Mine Markers must be placed wholly within the Gas Mine \nPlacement Area. Up to 4 can be placed wholly within the defender’s Deployment \nZone. After setting the Gas Mine Markers up, the defender must secretly write \ndown which 4 of the Gas Mine Markers are duds. All of the other Gas Mine \nMarkers are live and have the MINED Keyword and the following special rules.\n\t**\tChoking Mines: As soon as a model moves within 3” of a Gas Mine Marker, \ntemporarily halt its move. The defender must then reveal if the Gas Mine Marker \nis a dud. If it is, nothing happens. If it is a live mine, it detonates in the same \nway as if the model had moved into contact with a Marker with the MINED \nKeyword. The Gas Mine Marker is then removed and replaced with a Gas Cloud \nMarker. The moving model can then carry on with its move as long as it wasn’t \ntaken Down or Out of Action. Models with the FLYING Keyword only trigger \na Gas Mine Marker if they finish a move in contact with it (they can fly across it \nwithout setting it off ). \n\t**\tGas Cloud Markers: Place 1 BLOOD MARKER next to each model that is \nwithin 6” of the centre of a Gas Cloud Marker when it is set up. In addition, \nplace 1 BLOOD MARKER next to a model that is within 6” of the centre of a \nGas Cloud Marker when the model is Activated.\n\t**\tDetonating Gas Cloud Markers: A model can choose a Gas Cloud Marker as \nthe target for an attack with a weapon that has the BLAST or FIRE Keyword. \nIf the attack is a Success or a Critical Success, the Gas Cloud Marker explodes. A \nGas Cloud Marker will also explode if it is caught in the radius of an attack with \nthe BLAST Keyword.\n\t**\tGas Cloud Explosions: When a Gas Cloud Marker explodes, make an Injury \nRoll for each model within 3” of the Marker as if they had been hit by a weapon \nwith the +2 INJURY DICE and FIRE Keywords. If the model is not taken Out \nof Action by the Injury Roll, it is blown away D3” in a straight line directly away \nfrom the centre of the Marker. The model stops if it is blown into another model, \nImpassable terrain, or terrain it cannot cross without having to Climb. The Gas \nCloud Marker is then removed from the battlefield.\nInfiltrators\nInfiltrators can deploy normally or by using their special deployment rules. \nAttacking models that deploy using their special deployment rules cannot deploy \nwithin 8” of a Bunker Marker.\n\n\n\n\n\n \nREINFORCEMENTS\nAt the start of each Turn, the players roll-off. The winner rolls a D3 to see how \nmany reinforcement models each of the players can deploy. The players then \nalternate deploying reinforcement models, one at a time, starting with the player \nthat won the roll-off. Reinforcement models must be deployed touching the \nedge of the battlefield, wholly within their Deployment Zone, and more than 8” \nfrom the closest enemy model. If a player runs out of reinforcement models, the \nopposing player can set up any remaining reinforcements they have available up \nto the limit set for the Turn. Players must set up reinforcements if they have any \navailable and are allowed to do so (you can’t choose to hold them back).\nDESTROYING BUNKERS\nModels on the attacking side with the ELITE Keyword have Demo Charges \neven if they are not usually allowed to take Battlekit or Equipment. A model \nthat has Demo Charges can take the following ACTIONS (no Success Rolls \nare necessary): \n\t**\tPlace Demo Charge ACTION: A model that has Demo Charges and is in \ncontact with a Bunker can take an ACTION to place the Demo Charge on the \nBunker. Once it does so, it no longer has the Demo Charge but can now use the \nDetonate Demo Charge ACTION.\n\t**\tDetonate Demo Charge ACTION: A model that has set Demo Charges can \ntake an ACTION to detonate the Demo Charge. It can take the ACTION at \nany time during the game, and can wait one or more Turns before it does so if \ndesired (this gives the model a chance to move away so it does not get caught in \nthe explosion). When it finally takes the ACTION, make an Injury Roll with \nthe IGNORE ARMOUR Keyword for every model within 3” of the Bunker. \nThe Bunker Marker is then removed, and the terrain piece it was on is no longer \nconsidered a Bunker. Note that if a model that has placed a Demo Charge is \ntaken Out of Action, it will not be possible to detonate the Demo Charge.\n\n\n\n\n\n \nGAME LENGTH\nAt the end of the fifth Turn, the attacker rolls a D6. On a 1 or 2, the game ends \nimmediately. On a 3 or more, the game will end at the end of the sixth Turn.\nVICTORY CONDITIONS\nA player wins this scenario immediately if there are no enemy models on the \nbattlefield, or if the opposing Warband flees (typically due to failing a Morale \nCheck). Otherwise, the player with more Victory Points at the end of the \ngame is the winner.\nVictory Points\nThe players must keep a running tally of the Victory Points they score. Victory \nPoints are scored for the following things:\n\t**\tAt the end of each Turn, the defender scores 1 VP for each trench section that \nis at least 8” long and has one or more defending models in it. If there are no \nattacking models in the trench section, the defender scores 2 VPs instead of 1.\n\t**\tAt the end of each Turn, the attacker scores:\n\t* At the end of each Turn, the attacker scores 2 VPs for each trench section that \nis at least 8” long and has one or more attacking models in it. If there are no \ndefending models in the trench section, the attacker scores 3 VPs instead of 2\n\t* 2 VPs for each Bunker that was destroyed by a Demo Charge that Turn.\n\t**\tAt the end of the game each player scores 1 VP for each Glorious Deed they \ncompleted and 4 VP for each Bunker they control. A player controls a Bunker if \nthere are more friendly models within 1” of it than there are enemy models.\nGLORIOUS DEEDS\n\t**\tBurning Sight: A friendly model causes a Gas Cloud Marker that is more \nthan 14” away from it to explode, and the explosion takes one or more enemy \nmodels Out of Action.\n\t**\tCombustive: A friendly model causes a Gas Cloud Marker to explode, and the \nexplosion takes two or more enemy models Out of Action.\n\t**\tDeep Breaths: A friendly model causes an enemy model to be taken Out of \nAction by causing it to move within 6” of the centre of a Gas Cloud Marker.\n\t**\tIron Lungs: A Warband controls a Bunker that is within 6” of the centre \nof a Gas Cloud Marker at the end of two consecutive Turns. A Warband \ncontrols a Bunker if there are more friendly models within 1” of it than there \nare enemy models.\n\t**\tPoisonous Rage: A friendly model that is within 6” of the centre of a Gas Cloud \nmakes a Melee Attack that takes an enemy model Out of Action.\nI\nX"
  },
  {
    "id": "the-high-ground",
    "number": 11,
    "roman": "XI",
    "name": "XI. The High Ground",
    "slug": "the-high-ground",
    "tagline": "Capture the high ground at all costs. Every casualty is worth it to claim this crucial",
    "mapImage": "/maps/the-high-ground.png",
    "tableSize": "48\" x 48\" (or 36\" x 36\" for skirmish)",
    "forces": "No special restrictions apply to the models the players can include in their Forces in this scenario.",
    "battlefield": "The players roll-off and the winner sets up the terrain for the game. This scenario uses the No Man’s Land or Decimated Ruins battlefield archetype (the player setting up the terrain decides which one to use) and requires a battlefield that is at least 36” by 36”. 24” 8” 8” 8” 8” 8” 8”",
    "deployment": "The players roll-off. The winner of the roll-off chooses which Deployment Zone will be theirs. The other Deployment Zone is their opponent’s. The players then alternate deploying their models one at a time, starting with the player who has more models in their Warband (roll-off if both players have the same number of models). Models must be set up wholly within their own Deployment Zone. If a player runs out of models to set up, the other player sets up all their remaining models, one after another, until they have none left. Once the players have set up their models, deployment ends, and the game begins. Infiltrators Infiltrators can deploy normally or by using their special deployment rules. However, if they deploy using their special deployment rules, they cannot deploy within 3” of an Objective. TOP PRIORITY OBJECTIVE After deployment, each player must secretly write down which one of the five Objectives is their top priority. Capturing it will earn the player additional VPs at the end of the game (▶ see Victory Conditions).",
    "gameLength": "This scenario lasts five Turns. I",
    "victoryConditions": "A player wins this scenario immediately if there are no enemy models on the battlefield, or if the opposing Warband flees (typically due to failing a Morale Check). Otherwise, the player with more Victory Points at the end of the game is the winner. Victory Points ** Each player scores 1 VP each time a friendly model takes an enemy model Out of Action with a Melee Attack that has the Diving Charge modifier. ** At the end of each Turn, each player scores 2 VPs for each Objective they control. ** At the end of the game each player scores: * 1 VP for each Glorious Deed they completed. * 3 VPs if they control the opponent’s Top Priority Objective. * 3 VPs if they control their Top Priority Objective.",
    "gloriousDeeds": "** Back to the Mud: A friendly model causes an enemy model that is on an Objective to Fall and the Fall results in it being taken Out of Action. ** Death From Above: A friendly model takes an enemy model Out of Action with a Melee Attack with the Diving Charge modifier. ** Down with You: A friendly model on an Objective uses a Ranged Attack to take Out of Action an enemy model on a different, higher Objective. ** Victory or Death: A Warband wins the game. This Glorious Deed is only used in campaign games and is determined after the result of the game has been decided. You do not receieve any Victory Points for acheiving this Glorious Deed, but you can award 1 Experience Point to 1 ELITE model from the Warband that has the LEADER Keyword if you have one available, and you receive Glory Points and an extra D6 for your Promotion Pool as you would normally. ** King of the Hill: A model has been on all five Objectives. II XI",
    "fullRulesMarkdown": "XI º The High Ground\nCapture the high ground at all costs. Every casualty is worth it to claim this crucial \ntactical location.\nFORCES\nNo special restrictions apply to the models the players can include in their Forces \nin this scenario.\nTHE BATTLEFIELD\nThe players roll-off and the winner sets up the terrain for the game. This scenario \nuses the No Man’s Land or Decimated Ruins battlefield archetype (the player \nsetting up the terrain decides which one to use) and requires a battlefield that is at \nleast 36” by 36”.\n24”\n8”\n8”\n8”\n8”\n8”\n8”\nDEPLOYMENT ZONE\nDEPLOYMENT ZONE\nMIDPOINT\nI\nX\n\n\n\n\n \nObjective Markers\nThe Markers shown on the map show high ground that the Warbands have been \nordered to capture. When you set up the terrain pieces for this scenario, you must \nplace the first five terrain pieces so that they are covering the locations where the \nObjective Markers will be set up, and at least 3” away from each other. In addition, \nyou must use terrain pieces that are at least 6” tall. The terrain piece covering the \ncentral Objective Marker must be the tallest terrain piece available. The Objective \nMarkers are set up after all of the terrain. Place each Objective Marker anywhere \non the terrain piece that covers its starting position; the whole of the terrain piece \nis treated as the Objective for this scenario, and cannot be destroyed or removed \nfor any reason.\nControlling Objectives\nA player controls an Objective terrain piece if there are more friendly models on, \nin, or within 1” of the terrain piece than there are enemy models. If one player has \nany models on the terrain piece and their opponent does not, then the player with \nmodels on the terrain piece controls it even if their opponent has more models \nwithin 1” of the Objective.\nDEPLOYMENT\nThe players roll-off. The winner of the roll-off chooses which Deployment Zone \nwill be theirs. The other Deployment Zone is their opponent’s. The players then \nalternate deploying their models one at a time, starting with the player who has \nmore models in their Warband (roll-off if both players have the same number of \nmodels). Models must be set up wholly within their own Deployment Zone. If \na player runs out of models to set up, the other player sets up all their remaining \nmodels, one after another, until they have none left. Once the players have set up \ntheir models, deployment ends, and the game begins.\nInfiltrators\nInfiltrators can deploy normally or by using their special deployment rules. \nHowever, if they deploy using their special deployment rules, they cannot deploy \nwithin 3” of an Objective.\nTOP PRIORITY OBJECTIVE\nAfter deployment, each player must secretly write down which one of the five \nObjectives is their top priority. Capturing it will earn the player additional VPs at \nthe end of the game (▶ see Victory Conditions).\nGAME LENGTH\nThis scenario lasts five Turns.\nI\n\n\n\n\n \nVICTORY CONDITIONS\nA player wins this scenario immediately if there are no enemy models on the \nbattlefield, or if the opposing Warband flees (typically due to failing a Morale \nCheck). Otherwise, the player with more Victory Points at the end of the \ngame is the winner.\nVictory Points\n\t**\tEach player scores 1 VP each time a friendly model takes an enemy model Out of \nAction with a Melee Attack that has the Diving Charge modifier.\n\t**\tAt the end of each Turn, each player scores 2 VPs for each \nObjective they control.\n\t**\tAt the end of the game each player scores:\n\t* 1 VP for each Glorious Deed they completed.\n\t* 3 VPs if they control the opponent’s Top Priority Objective.\n\t* 3 VPs if they control their Top Priority Objective.\nGLORIOUS DEEDS\n\t**\tBack to the Mud: A friendly model causes an enemy model that is on an \nObjective to Fall and the Fall results in it being taken Out of Action.\n\t**\tDeath From Above: A friendly model takes an enemy model Out of Action with \na Melee Attack with the Diving Charge modifier.\n\t**\tDown with You: A friendly model on an Objective uses a Ranged Attack to take \nOut of Action an enemy model on a different, higher Objective.\n\t**\tVictory or Death: A Warband wins the game. This Glorious Deed is only used \nin campaign games and is determined after the result of the game has been \ndecided. You do not receieve any Victory Points for acheiving this Glorious \nDeed, but you can award 1 Experience Point to 1 ELITE model from the \nWarband that has the LEADER Keyword if you have one available, and \nyou receive Glory Points and an extra D6 for your Promotion Pool as you \nwould normally.\n\t**\tKing of the Hill: A model has been on all five Objectives.\nII\nXI"
  },
  {
    "id": "great-war",
    "number": 12,
    "roman": "XII",
    "name": "XII. Great War",
    "slug": "great-war",
    "tagline": "The order for general assault has been given. The skirmishes are over. It is time to",
    "mapImage": "/maps/great-war.png",
    "tableSize": "48\" x 48\" (or 36\" x 36\" for skirmish)",
    "forces": "No special restrictions apply to the models the players can include in their Forces in this scenario.",
    "battlefield": "The players roll-off and the winner sets up the terrain for the game. This scenario can use any battlefield archetype (the player setting up the terrain decides which one to use). 24”",
    "deployment": "The players roll-off. The winner of the roll-off chooses which Deployment Zone will be theirs. The other Deployment Zone is their opponent’s. The players then alternate deploying their models one at a time, starting with the player who has more models in their Warband (roll-off if both players have the same number of models). Models must be set up wholly within their own Deployment Zone. If a player runs out of models to set up, the other player sets up all their remaining models, one after another, until they have none left. Once the players have set up their models, deployment ends, and the game begins. Infiltrators Infiltrators can deploy normally or by using their special deployment rules. TO THE DEATH! Neither side takes Morale Checks during this game, and neither player can choose to flee with their Warband.",
    "gameLength": "This scenario lasts five Turns.",
    "victoryConditions": "A player wins this scenario immediately if there are no enemy models on the battlefield. Otherwise, the player with more Victory Points at the end of the game is the winner. Victory Points Each player scores VPs for enemy models that were taken Out of Action equal to the model’s Cost, divided by 10 if it has a Cost in 👑, or by 3 if it has a Cost in ☼ (rounding fractions up). Include the model’s Battlekit, Glory Items, and any other upgrades in its Cost. If a model has items worth both 👑 and ☼, work out each separately. For example, a model that had a total Cost of 100 👑 and 6 ☼ would be worth 100/10 = 10 VPs, plus 6/3 = 2VPs, for a total of 12 VPs.",
    "gloriousDeeds": "There are no Glorious Deeds in this scenario, just victory or death! II MK",
    "fullRulesMarkdown": "XII º Great War\nThe order for general assault has been given. The skirmishes are over. It is time to \nwipe out your hated enemy once and for all. The Great War begins.\nFORCES\nNo special restrictions apply to the models the players can include in their Forces \nin this scenario.\nTHE BATTLEFIELD\nThe players roll-off and the winner sets up the terrain for the game. This scenario \ncan use any battlefield archetype (the player setting up the terrain decides \nwhich one to use).\n24”\nDEPLOYMENT ZONE\nDEPLOYMENT ZONE\nII\n\n\n\n\n \nDEPLOYMENT\nThe players roll-off. The winner of the roll-off chooses which Deployment Zone \nwill be theirs. The other Deployment Zone is their opponent’s. The players then \nalternate deploying their models one at a time, starting with the player who has \nmore models in their Warband (roll-off if both players have the same number of \nmodels). Models must be set up wholly within their own Deployment Zone. If \na player runs out of models to set up, the other player sets up all their remaining \nmodels, one after another, until they have none left. Once the players have set up \ntheir models, deployment ends, and the game begins.\nInfiltrators\nInfiltrators can deploy normally or by using their special deployment rules.\nTO THE DEATH!\nNeither side takes Morale Checks during this game, and neither player can choose \nto flee with their Warband.\nGAME LENGTH\nThis scenario lasts five Turns.\nVICTORY CONDITIONS\nA player wins this scenario immediately if there are no enemy models on the \nbattlefield. Otherwise, the player with more Victory Points at the end of the \ngame is the winner.\nVictory Points\nEach player scores VPs for enemy models that were taken Out of Action equal to \nthe model’s Cost, divided by 10 if it has a Cost in 👑, or by 3 if it has a Cost in ☼ \n(rounding fractions up). Include the model’s Battlekit, Glory Items, and any other \nupgrades in its Cost. If a model has items worth both 👑 and ☼, work out each \nseparately. For example, a model that had a total Cost of 100 👑 and 6 ☼ would be \nworth 100/10 = 10 VPs, plus 6/3 = 2VPs, for a total of 12 VPs.\nGLORIOUS DEEDS\nThere are no Glorious Deeds in this scenario, just victory or death!\nII\n\n\n\n\n \nMK"
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
export const OFFICIAL_COMMON_EXPLORATION: ExplorationTableEntry[] = [
  {
    "roll": "11",
    "title": "Flooded Trenches",
    "reward": "+0 👑",
    "description": "Mud and poisonous standing water. Nothing of value is found."
  },
  {
    "roll": "12",
    "title": "Looted Bunker",
    "reward": "+10 👑",
    "description": "A trashed bunker yields 10 Ducats worth of salvageable shell casings."
  },
  {
    "roll": "13",
    "title": "Abandoned Field Hospital",
    "reward": "Free Medical Supplies",
    "description": "Recover bandages and alchemical antiseptics. Add 1 Stashed Medical Kit."
  },
  {
    "roll": "14",
    "title": "Shattered Shrine",
    "reward": "+1 Glory (☼)",
    "description": "Prayers at a shattered crucifix grant divine solace (+1 Glory)."
  },
  {
    "roll": "15",
    "title": "Munitions Cache",
    "reward": "D6 x 10 👑",
    "description": "Unexploded artillery shells and brass cases sold for D6 x 10 Ducats."
  },
  {
    "roll": "16",
    "title": "Fallen Trench Fighter",
    "reward": "Free Trench Weapon",
    "description": "Recover a Trench Club or Trench Knife and add it to your Arsenal."
  },
  {
    "roll": "21-25",
    "title": "No Man's Land Scavenge",
    "reward": "+20 👑",
    "description": "Scavenge salvageable gear and metal scraps for 20 Ducats."
  },
  {
    "roll": "26-33",
    "title": "Fortified Sump",
    "reward": "+30 👑 & Fortification",
    "description": "Secure a defensive firing step and 30 Ducats worth of construction timbers."
  },
  {
    "roll": "34-45",
    "title": "Underground Supply Depot",
    "reward": "+40 👑 or 1 Glory",
    "description": "Choose between 40 Ducats in supplies or 1 Glory Point."
  },
  {
    "roll": "46-55",
    "title": "Undisturbed Dugout",
    "reward": "+50 👑",
    "description": "A sealed bunker filled with rations, uniforms, and 50 Ducats."
  },
  {
    "roll": "56-65",
    "title": "Lost Armoury Vault",
    "reward": "Free Heavy Armour or Weapon",
    "description": "Recover standard Reinforced Armour or a Rifle for your Warband Arsenal."
  },
  {
    "roll": "66",
    "title": "Rare Exploration Discovery!",
    "reward": "Roll on Rare Table",
    "description": "You uncover something miraculous! Immediately roll on the Rare Exploration Table."
  }
];
export const OFFICIAL_RARE_EXPLORATION: ExplorationTableEntry[] = [
  {
    "roll": "11",
    "title": "Looted Reliquary",
    "reward": "+2 Glory (☼)",
    "description": "Recover an ancient martyr's reliquary (+2 Glory)."
  },
  {
    "roll": "12",
    "title": "Demonic Remains",
    "reward": "+40 👑 or 1 Glory",
    "description": "Alchemical components harvested from a slain Greater Fiend."
  },
  {
    "roll": "13-22",
    "title": "Secret Ammo Cache",
    "reward": "Free Special Ammo",
    "description": "Recover a cache of Gas, Fire, or AP ammunition for your Arsenal."
  },
  {
    "roll": "23-31",
    "title": "Captured Scout",
    "reward": "+1 Exploration Skill",
    "description": "Interrogate an enemy runner to gain the Scout Exploration Skill."
  },
  {
    "roll": "32-41",
    "title": "Abandoned Resurrection Machine",
    "reward": "Salvaged Machine",
    "description": "Use in any Quartermaster Step to heal 1 Battle Scar and Trauma from a warrior."
  },
  {
    "roll": "42-53",
    "title": "Sublime Alchemical Formula",
    "reward": "+100 👑",
    "description": "Rare alchemical treatises sold to scholars for 100 Ducats."
  },
  {
    "roll": "54-65",
    "title": "Holy / Unholy Relic Weapon",
    "reward": "Masterwork Weapon",
    "description": "Recover an ornate inscribed Great Sword, Jezzail, or Holy Icon."
  },
  {
    "roll": "66",
    "title": "LEGENDARY DISCOVERY!",
    "reward": "Roll on Legendary Table",
    "description": "You stumble upon a mythic site! Immediately roll on the Legendary Exploration Table."
  }
];
export const OFFICIAL_LEGENDARY_EXPLORATION: ExplorationTableEntry[] = [
  {
    "roll": "6",
    "title": "Battlefield of Corpses",
    "reward": "Up to 100 👑 Battlekit",
    "description": "Choose up to 2 pieces of Battlekit worth up to 100 Ducats total from your Armoury."
  },
  {
    "roll": "8",
    "title": "Esoteric Library",
    "reward": "Burn (+3+D3 Glory) or Sell (6D6x10 👑)",
    "description": "Concealed collection of works on Goetic Magic and blood sacrifice."
  },
  {
    "roll": "10",
    "title": "Hidden Passages",
    "reward": "Duplicate Exploration Skill",
    "description": "Vast subterranean tunnels allow your Warband to explore with double efficiency."
  },
  {
    "roll": "12",
    "title": "Jabirean Alchemical Book",
    "reward": "Book of Alchemy / 150 👑 / 5 Glory",
    "description": "Unlock Fire Shields, discounted Alchemical Formulae, or sell for 150 Ducats."
  },
  {
    "roll": "14",
    "title": "Black Network Contact",
    "reward": "Merchant Prince Patronage",
    "description": "Purchase Glory Items costing 12 Glory or less in future Quartermaster Steps."
  },
  {
    "roll": "16",
    "title": "Treasure of the Holies",
    "reward": "D3 Victory Pts + Free Glory Item",
    "description": "Legendary feretory containing a holy treasure chest of immense power."
  },
  {
    "roll": "18",
    "title": "Skull of a Saint",
    "reward": "Skull Relic / Screaming Skull",
    "description": "Gives Infiltrator keyword to bearer and provides morale boosts."
  },
  {
    "roll": "20",
    "title": "Lock of Samson’s Hair",
    "reward": "+1 Melee Injury Die & Strong",
    "description": "Essence of Samson gives Strong keyword and +1 Melee Injury Die to bearer."
  },
  {
    "roll": "23",
    "title": "Patron’s Visit",
    "reward": "Campaign Victory Points",
    "description": "Exchange up to 10 Glory for an equal number of Campaign Victory Points."
  },
  {
    "roll": "26",
    "title": "Sample of Holy DNA",
    "reward": "Holy DNA Regeneration",
    "description": "Remove 1 Blood/Infection marker and replace with Blessing Marker each activation."
  },
  {
    "roll": "30",
    "title": "Golgotha Tektites",
    "reward": "Immunity Armour Upgrade",
    "description": "Two suits of Armour gain NEGATE FIRE, NEGATE GAS, and NEGATE SHRAPNEL (or +15 Glory)."
  },
  {
    "roll": "36",
    "title": "Fruit from the Tree of Knowledge",
    "reward": "Demonic Keyword + Any Skill",
    "description": "Warrior eats the fruit, gaining DEMONIC keyword and any Skill of choice."
  }
];

// 4. OFFICIAL SKILLS COMPENDIUM (Pages 107-111)
export const OFFICIAL_MELEE_SKILLS: SkillEntry[] = [
  {
    "name": "Feint",
    "description": "Once per activation, re-roll 1 failed Melee Attack roll."
  },
  {
    "name": "Mighty Blow",
    "description": "Add +1 INJURY MODIFIER to Melee Attacks made by this model."
  },
  {
    "name": "Shield Master",
    "description": "Add +1 to Armour Characteristic when using a Shield."
  },
  {
    "name": "Berserker Charge",
    "description": "Add +1 Melee Attack when charging into combat."
  },
  {
    "name": "Trench Brawler",
    "description": "Add +1 DICE to Melee Attacks when fighting inside trenches or enclosed ruins."
  },
  {
    "name": "Crushing Impact",
    "description": "Enemy models hit by this warrior in melee must make a Risky Down test."
  }
];
export const OFFICIAL_RANGED_SKILLS: SkillEntry[] = [
  {
    "name": "Eagle Eye",
    "description": "Add +6\" to the maximum range of Ranged Weapons used by this model."
  },
  {
    "name": "Deadeye Shot",
    "description": "Add +1 INJURY MODIFIER to Ranged Attacks made at targets within effective range."
  },
  {
    "name": "Quick Reload",
    "description": "Reloading weapons with RELOAD keyword takes 0 actions once per turn."
  },
  {
    "name": "Marksman",
    "description": "Add +1 DICE to Ranged Attack rolls when the model does not move."
  },
  {
    "name": "Sniper Specialist",
    "description": "Ignore Cover modifiers when taking a single aimed shot."
  },
  {
    "name": "Overwatch Instinct",
    "description": "Can take interrupting reaction shots when enemies enter line of sight."
  }
];
export const OFFICIAL_STEALTH_SKILLS: SkillEntry[] = [
  {
    "name": "Shadow Walker",
    "description": "Enemies suffer -2 DICE when shooting at this model while in Cover."
  },
  {
    "name": "Acrobatic",
    "description": "Can Jump Down and Climb without making Risky Success Rolls."
  },
  {
    "name": "Infiltrator Veteran",
    "description": "Can deploy anywhere on the battlefield >12\" from enemy deployment zone."
  },
  {
    "name": "Silent Strike",
    "description": "Attacking from stealth or rear arc adds +2 INJURY DICE."
  },
  {
    "name": "Fleet of Foot",
    "description": "Add +1\" to Movement and +2\" when taking a Dash action."
  },
  {
    "name": "Vanish into Mud",
    "description": "Can remove itself from enemy targeting if breaking line of sight."
  }
];
export const OFFICIAL_WILDCARD_SKILLS: SkillEntry[] = [
  {
    "name": "Diehard",
    "description": "When taken Out of Action, roll D6. On 4+, remains on the battlefield Down instead."
  },
  {
    "name": "Iron Will",
    "description": "Passes all Morale and Fear tests automatically."
  },
  {
    "name": "Field Medic",
    "description": "Can take a Heal Action to remove Blood Markers from adjacent friendly warriors."
  },
  {
    "name": "Munitions Expert",
    "description": "Reroll scatter rolls for Grenades and Blast weapons."
  },
  {
    "name": "Master of War",
    "description": "Allows the Warband to reroll the Initiative roll once per game."
  },
  {
    "name": "Blessed by Fate",
    "description": "Starts each battle with 1 permanent Blessing Marker."
  }
];

// 5. OFFICIAL KEYWORDS GLOSSARY (Pages 52-58)
export const OFFICIAL_KEYWORDS: RuleKeywordEntry[] = [
  {
    "name": "KEYWORD GLOSSARY\n+/- DICE",
    "type": "Effect",
    "description": "Dice that are added to Success Rolls (▶ see Success Rolls). If the Keyword applies to a Weapon, the dice are only added to Success Rolls for Attacks made with it."
  },
  {
    "name": "+/- INJURY DICE",
    "type": "Effect",
    "description": "Dice that are added to Injury Rolls (▶ see Injury Rolls). If the Keyword applies to a Weapon, the dice are only added to Injury Rolls for Attacks made with it."
  },
  {
    "name": "+/- INJURY MODIFIER",
    "type": "Effect",
    "description": "Modifiers that are applied to the result of an Injury Roll (▶ see Injury Rolls). If the Keyword applies to a Weapon, the modifier is only added to Injury Rolls for Attacks made with it."
  },
  {
    "name": "ACTION",
    "type": "Tag",
    "description": "An activity a model can carry out when it is Activated. Common ACTIONS include Move, Dash, Shoot and Fight."
  },
  {
    "name": "AMMUNITION (KEYWORD)",
    "type": "Effect",
    "description": "If a model has a piece of Battlekit with this Keyword, it will use it in the next game that it takes part in. When the model is deployed, say which Ranged Weapon the Battlekit will be used for. It gains the (KEYWORD) until the end of the game. The Ranged Weapon you choose cannot already have the BLAST, FIRE, GAS, or SHRAPNEL Keywords, and cannot have more than one type of AMMUNITION."
  },
  {
    "name": "ARMOUR PIERCING",
    "type": "Effect",
    "description": "A Weapon with this Keyword reduces the target’s total -INJURY MODIFIER from its Armour Characteristic, and/or any Armour or Shields it has by 1, to a minimum of 0. For example, if a target had Standard Armour and a Trench Shield, the -INJURY MODIFIER would be lowered from -2 to -1."
  },
  {
    "name": "ARTIFICIAL",
    "type": "Tag",
    "description": "This model is not of natural biological origin but is instead constructed from non-organic elements."
  },
  {
    "name": "ASSAULT",
    "type": "Effect",
    "description": "Ranged Attacks made with Weapons that have this Keyword do not prevent a model from taking a Charge or Fight ACTION during the same Activation. Introduction The World in Flames Core Rules Comprehensive Rules Keywords Terrain Battlekit Campaign Rules Scenarios"
  },
  {
    "name": "AUTOMATIC (X)",
    "type": "Effect",
    "description": "When you take a Shoot ACTION and choose a Weapon with this Keyword to make a Ranged Attack, you can make a number of Ranged Attacks with this Weapon equal to X, one after another. The attacks can target different enemy models if desired, as long as they are all within 6” of each other. Resolve each attack one at a time using steps 2 to 6 of the Ranged Attack Sequence. Any BLOOD MARKERS or BLESSING MARKERS that are spent only modify the Injury Roll for the Ranged Attack they are spent on."
  },
  {
    "name": "BLACK GRAIL",
    "type": "Tag",
    "description": "This model is part of the Cult of the Black Grail Faction. BLAST (X”) (Effect): A Ranged Weapon with BLAST (X”) has a blast radius in inches equal to X (including vertically). When you make an attack with the Weapon, you must pick a target for the attack. The target can either be an enemy model or a visible point on the battlefield or on a terrain piece; whichever you choose must be within the attacking model’s Line of Sight and the Weapon’s range. If the Success Roll for the attack is a Failure, the attack misses and nothing happens unless the weapon also has the SCATTER Keyword (▶ see SCATTER). If the Success Roll for the attack is a Success or Critical Success, every model that has a Line of Sight to the target of the attack and which is within the Weapon’s blast radius is hit. In addition, friendly models that are within 1” of an enemy model that was hit by the blast radius are also hit. Measure the blast radius from the centre of the target model’s base, or the centre of the visible point you picked, to the closest point on the other model’s base. Make an Injury Roll for every model that was hit. If you roll a Critical Success, only add the extra INJURY DICE to the roll for a model if it was chosen as the target of the attack."
  },
  {
    "name": "BLESSED (X)",
    "type": "Effect",
    "description": "When you deploy a model with this Keyword for the first time in a game, place a number of BLESSING MARKERS beside the model equal to X."
  },
  {
    "name": "BLESSING MARKER",
    "type": "Tag",
    "description": "The model is under the influence of a supernatural or chemical enhancement that provides temporary benefits. (▶ see BLESSING MARKERS)."
  },
  {
    "name": "BLOCK",
    "type": "Effect",
    "description": "Add -1 DICE for Melee Attacks targeting a model with this Keyword, or that has a Weapon that has this Keyword, if the attacker made a Charge ACTION before making the attack this Turn."
  },
  {
    "name": "BLOOD MARKER",
    "type": "Tag",
    "description": "BLOOD MARKERS are placed on models that suffer an injury. (▶ see BLOOD MARKERS)."
  },
  {
    "name": "CLEAVE (X)",
    "type": "Effect",
    "description": "When you take a Fight ACTION and choose a Weapon with this Keyword to make a Melee Attack, you can make a number of Melee Attacks with this Weapon equal to X, one after another. The attacks can target different enemy models if desired. Resolve each attack one at a time using steps 2 to 4 of the Melee Attack Sequence. Any BLOOD MARKERS or BLESSING MARKERS that are spent only modify the Injury Roll for the Melee Attack they are spent on."
  },
  {
    "name": "CONSUMABLE",
    "type": "Effect",
    "description": "In a campaign (▶ see Campaign Rules) Battlekit with this Keyword is lost at the end of a game in which it is used. Introduction The World in Flames Core Rules Comprehensive Rules Keywords Terrain Battlekit Campaign Rules Scenarios"
  },
  {
    "name": "COVER",
    "type": "Effect",
    "description": "A model with this Keyword has the Cover or Defended Obstacle attack modifiers (▶ see Cover)."
  },
  {
    "name": "CRITICAL",
    "type": "Effect",
    "description": "Add +2 INJURY DICE instead of +1 INJURY DICE when a Critical Success is rolled for an attack made by a Weapon with this Keyword."
  },
  {
    "name": "CUMBERSOME",
    "type": "Effect",
    "description": "Weapons with this Keyword require two hands to use, even if the model has the STRONG Keyword. However, they can still be used alongside a Shield with the Shield Combo stipulation."
  },
  {
    "name": "DANGEROUS TERRAIN",
    "type": "Effect",
    "description": "If you Activate a model that is in terrain with this Keyword, or if you move a model into terrain with this Keyword during a move, you must take a Risky Success Roll for the model. If the roll is a Success or Critical Success, you can carry on with the model's move, and you do not have to take any more Risky Success Rolls for the model if it moves into any more terrain with this Keyword as part of that move. If the roll is a Failure, you must make an Injury Roll for the model and its Activation ends. Sometimes DANGEROUS TERRAIN will have one or more Keywords in brackets directly after it. Any Injury Rolls caused by the DANGEROUS TERRAIN rule have those Keywords. For example, if a terrain piece had the DANGEROUS TERRAIN (FIRE) Keywords, then any Injury Rolls caused by it would count as having the FIRE Keyword."
  },
  {
    "name": "DEADLY",
    "type": "Effect",
    "description": "When you make an Injury Roll for an attack made with a weapon with this Keyword, roll 3D6 and add all 3 dice together. Any +INJURY DICE or -INJURY DICE are added to the roll normally, except that you pick the 3 highest or lowest dice in the roll instead of the 2 highest or lowest."
  },
  {
    "name": "DEMONIC",
    "type": "Effect",
    "description": "A model with this Keyword has the NEGATE FIRE Keyword."
  },
  {
    "name": "DEPLOYABLE",
    "type": "Tag",
    "description": "Battlekit that is represented by a model or terrain piece that can be set up during the game."
  },
  {
    "name": "DIFFICULT TERRAIN",
    "type": "Effect",
    "description": "Every 1” a model is moved across terrain with this Keyword counts as 2”."
  },
  {
    "name": "ELITE",
    "type": "Tag",
    "description": "The most senior and heroic models in a Warband."
  },
  {
    "name": "FEAR",
    "type": "Effect",
    "description": "Add -1 DICE to a Melee Attack that targets a model with this Keyword. Models that cause FEAR are immune to FEAR themselves."
  },
  {
    "name": "FIRE",
    "type": "Effect",
    "description": "After making the Injury Roll for a Weapon with this Keyword, place 1 extra BLOOD MARKER next to the target model even if the result is No Effect."
  },
  {
    "name": "FIRETEAM",
    "type": "Effect",
    "description": "A model with this Keyword is part of a group of 2 models, both of which must have the FIRETEAM Keyword. You can create Fireteams when you recruit a Warband, and in the Quartermaster Step. Record which models are in Fireteams in your Warband on your Warband Roster. You can Activate friendly models that are part of the same Fireteam simultaneously. If you do so, you can take their ACTIONS in any order you wish, and you can switch between the two models freely. However, if the Activation of either member of the Fireteam ends during a simultaneous Activation, it immediately ends for the other model too. A model cannot be in more than 1 Fireteam. Introduction The World in Flames Core Rules Comprehensive Rules Keywords Terrain Battlekit Campaign Rules Scenarios"
  },
  {
    "name": "FLAMETHROWER",
    "type": "Effect",
    "description": "When a Weapon with this Keyword is used to make a Ranged Attack it is automatically a Success. Do not make a Success Roll for the attack. Note that this means that the attack cannot achieve a Critical Success."
  },
  {
    "name": "FLYING",
    "type": "Effect",
    "description": "When you make a move, retreat move or charge move with a model with this Keyword, you can measure the path on which it travels ‘through the air’. It must end the move on the battlefield or on a terrain piece. You must still take a Risky Success Roll for the model if it is Activated or ends its move on Dangerous terrain, and it cannot end its move on Impassable terrain. In addition do not make an Injury Roll if a model with this Keyword Falls."
  },
  {
    "name": "GAS",
    "type": "Effect",
    "description": "After making the Injury Roll for a Weapon with this Keyword, place 1 extra BLOOD MARKER next to the target model even if the result is No Effect."
  },
  {
    "name": "GOLEM",
    "type": "Effect",
    "description": "A model with this Keyword treats an Out of Action result from the Injury Roll Table as a Down result unless the result was caused by a Bloodbath Roll. In addition, you cannot remove BLOOD MARKERS from a friendly model with this Keyword (the opposing player can use them normally). Finally, a model with this Keyword has the NEGATE FEAR and NEGATE GAS Keywords, but cannot have the TOUGH Keyword."
  },
  {
    "name": "HEAVY",
    "type": "Effect",
    "description": "A model cannot be equipped with more than one piece of Battlekit with this Keyword and it does not receive a Charge Bonus when it makes a charge move. In addition, if a Ranged Weapon or Grenade has this Keyword, you cannot use the Weapon or Grenade to make a Ranged Attack and take a Move, Charge or Retreat, or Dash ACTION with the attacking model as part of the same Activation."
  },
  {
    "name": "HELD",
    "type": "Effect",
    "description": "A piece of Battlekit with this Keyword requires one hand to carry and cannot be put down. Because of this, a model that has this Keyword can only be equipped with or use either a 1-Handed Weapon or a Shield. It cannot be equipped with or use any 2-Handed Weapons, or both a Weapon and a Shield (even if the Shield has the Shield Combo rule). It may still carry Grenades."
  },
  {
    "name": "HERETIC",
    "type": "Tag",
    "description": "The model is a member of the Heretic Legions Faction."
  },
  {
    "name": "IGNORE ARMOUR",
    "type": "Effect",
    "description": "Ignore -INJURY DICE and -INJURY MODIFIERS for a target’s Armour Characteristic, and for any Armour or Shield pieces of Battlekit that it has, for attacks that have this Keyword. IGNORE [MODIFIER] (Effect): Ignore the Success Roll or Injury Roll modifier that is specified. For example, the Success Roll for an attack made with a Ranged Weapon that had the IGNORE COVER Keyword would not be affected by the -1 DICE modifier for a target that is in Cover."
  },
  {
    "name": "IMPASSABLE TERRAIN",
    "type": "Effect",
    "description": "Models cannot be moved onto or across terrain with this Keyword."
  },
  {
    "name": "IMPERVIOUS",
    "type": "Effect",
    "description": "The ARMOUR PIERCING and IGNORE ARMOUR Effects do not affect any -INJURY DICE and -INJURY MODIFIERS that apply to Battlekit that has this Keyword. Any other Battlekit the target model has is affected normally. Introduction The World in Flames Core Rules Comprehensive Rules Keywords Terrain Battlekit Campaign Rules Scenarios"
  },
  {
    "name": "INFECTION MARKERS",
    "type": "Tag",
    "description": "The model is under the influence of a supernatural or chemical malady that provides temporary effects. (▶ see Infection Markers in Warbands of Trench Crusade)."
  },
  {
    "name": "INFILTRATOR",
    "type": "Effect",
    "description": "When a model with this Keyword is deployed for the first time in a game, it can be set up anywhere on the battlefield as long as it is out of the Line of Sight of all enemies and is at least 8” away from the closest enemy. INFILTRATORS are deployed after models that do not have this Keyword. Any INFILTRATORS that cannot be deployed in this way are instead deployed normally in their deployment zone."
  },
  {
    "name": "MINED",
    "type": "Effect",
    "description": "When a model moves into contact with a Marker or terrain piece with the MINED Keyword, the mine will detonate unless the model has the NEGATE MINED Keyword. Make an Injury Roll with the SHRAPNEL Keyword for the model that detonated the mine, and then the Marker or terrain piece loses the MINED Keyword. If the model that detonated the mine wasn't taken Down or Out of Action, it can then continue its move. Models with the FLYING Keyword only detonate a mine if they finish a move in contact with a MINED Marker or terrain piece (they can fly across it without setting it off)."
  },
  {
    "name": "LEADER",
    "type": "Effect",
    "description": "Add +1 DICE to Morale Checks if your Warband has at least 1 model with this Keyword on the battlefield that is not Down or Out of Action."
  },
  {
    "name": "NEW ANTIOCH",
    "type": "Tag",
    "description": "This model is part of the Principality of New Antioch Faction. NEGATE [KEYWORD] (Effect): A model with the NEGATE Keyword is not affected by the specified Keyword’s Effect. For example, a model with NEGATE SHRAPNEL ignores the Effect of the SHRAPNEL Keyword."
  },
  {
    "name": "PILGRIM",
    "type": "Tag",
    "description": "This model is part of the Trench Pilgrim Faction."
  },
  {
    "name": "PISTOL",
    "type": "Effect",
    "description": "A pistol can be used as a Melee Weapon or a Ranged Weapon, and can be used as both in the same Activation. When it is used as a Ranged Weapon it has the Range shown on its Profile and uses the attacking model’s Ranged Characteristic. When used as a Melee Weapon it can use the attacking model’s Ranged or Melee Characteristic and can be used as an Off-Hand Weapon if desired."
  },
  {
    "name": "RELOAD",
    "type": "Effect",
    "description": "If a model makes an attack with a Weapon that has this Keyword then its Activation ends after the ACTION that allowed the attack is completed."
  },
  {
    "name": "REGENERATE (X)",
    "type": "Effect",
    "description": "When you Activate a model with this Keyword, before carrying out any ACTIONS, you can remove up to X BLOOD MARKERS from the model. Introduction The World in Flames Core Rules Comprehensive Rules Keywords Terrain Battlekit Campaign Rules Scenarios"
  },
  {
    "name": "RISKY",
    "type": "Effect",
    "description": "If you must make a Success Roll for a model that is using a piece of Battlekit that has this Keyword, then the Success Roll becomes a Risky Success Roll (the model’s Activation or ACTION will end if the Risky Success Roll is a Failure). For example, the Success Roll for an attack made with a Weapon that has the RISKY Keyword would become a Risky Success Roll. This Effect is ignored if the Success Roll is already a Risky Success Roll."
  },
  {
    "name": "SCATTER",
    "type": "Effect",
    "description": "Some Weapons with the BLAST Keyword also have the SCATTER Keyword. When you make an attack with the Weapon, pick a target and carry out the attack as described in the rules for BLAST. However, if the Success Roll for the attack was a Failure, the attack will scatter instead of missing. To see where it scatters to, subtract the Success Roll from 7. For example, if the Success Roll was 4, then the target point would scatter (7–4=) 3”. Your opponent must move the attack exactly that many inches in a direction of their choice, to a point on the battlefield, on a terrain piece, or on the base of a model. There must be Line of Sight between the point that is chosen and the original target for the attack. If this is impossible for any reason, then treat the attack as a miss. Then, determine who is hit as described in the rules for BLAST."
  },
  {
    "name": "SHOTGUN",
    "type": "Effect",
    "description": "Add -1 INJURY DICE to rolls for attacks made at Long Range with a Weapon that has this Keyword instead of the usual Long Range modifier (-1 DICE)."
  },
  {
    "name": "SHRAPNEL",
    "type": "Effect",
    "description": "After making the Injury Roll for a Weapon with this Keyword, place 1 extra BLOOD MARKER next to the target model even if the result is No Effect."
  },
  {
    "name": "SKIRMISHER",
    "type": "Effect",
    "description": "If an enemy selects a model with this Keyword as the target of a Charge, you can choose to evade with your model before the Charge is made, as long as your model is not within 1” of an enemy. When a model evades, roll a D3 and move the model that many inches. It must finish this move more than 1” away from all enemy models. If this move results in there being an interposing model between the evading model and the model that is making the charge, then the charging model must choose the interposing model as the target for its charge."
  },
  {
    "name": "STRONG",
    "type": "Effect",
    "description": "A model with this Keyword has the NEGATE HEAVY Keyword. In addition, it can equip and use one 2-Handed Melee Weapon as if it were a 1-Handed Melee Weapon."
  },
  {
    "name": "SULTANATE",
    "type": "Tag",
    "description": "This model is part of the Sultanate of the Iron Wall Faction."
  },
  {
    "name": "THE COURT",
    "type": "Tag",
    "description": "This model is part of The Court of the Seven-Headed Serpent Faction."
  },
  {
    "name": "TOUGH",
    "type": "Effect",
    "description": "The first time a model with this Keyword suffers an Out of Action result on the Injury Table, it is treated as a Down result instead. Introduction The World in Flames Core Rules Comprehensive Rules Keywords Terrain Battlekit Campaign Rules Scenarios"
  }
];
