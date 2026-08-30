// GENERATED FILE — DO NOT EDIT.
// Produced by `npm run rules:build` from data-sources/.
// Ruleset: trenchline
// Base:    Fawkstrot11/TrenchCrusade@1b463a8e2eaafc9d6722ae6eeda93e296fb7012b
// Layers:  dispatch-01
// See docs/RULESET-MODEL.md.

import type { Dataset } from '../../types/catalogue';

export const DATASET: Dataset = {
  "units": [
    {
      "id": "5fad-8b9c-8d6a-a2f0",
      "name": "Plague Knight",
      "factionId": "Black Grail",
      "roles": [
        "Elite"
      ],
      "keywords": [
        "BLACK GRAIL",
        "STRONG",
        "FEAR",
        "NEGATE GAS"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "+2 Dice",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 60,
        "glory": 0
      },
      "min": null,
      "max": 2,
      "abilities": [
        {
          "id": "5af2-de11-6c23-567e",
          "name": "Undead Fortitude",
          "description": "Add -1 INJURY DICE to Injury Rolls for a Plague Knight unless the attack has the FIRE Keyword."
        },
        {
          "id": "a1da-b3f8-777e-38b9",
          "name": "Ravenous Infection",
          "description": "Take a Risky Success Roll for the model. If the roll is a Failure, the model’s Activation ends immediately. If the roll is a Success or a Critical Success, you can place 1 INFECTION MARKER next to any other model within 1” of the model taking the Ravenous Infection ACTION. Then, the model taking the Ravenous Infection ACTION’s Activation ends immediately."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "8fc4-805a-2894-01ad",
      "name": "Hound of the Black Grail",
      "factionId": "Black Grail",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "BLACK GRAIL",
        "FEAR",
        "NEGATE GAS"
      ],
      "stats": {
        "movement": "8\"/Infantry",
        "movementInches": 8,
        "movementType": "Infantry",
        "ranged": "N/A",
        "melee": "+1 Dice",
        "armour": "0",
        "base": "30x60mm"
      },
      "cost": {
        "ducats": 55,
        "glory": 0
      },
      "min": null,
      "max": 3,
      "abilities": [
        {
          "id": "9494-6d28-0c24-b18d",
          "name": "Frightening Speed",
          "description": "Add +1 DICE to the Risky Success Roll for a Hound of the Cult of the Black Grail that is taking a Dash ACTION. In addition, do not halve the Movement Characteristic of a Hound of the Cult of the Black Grail when it stands up at the start of an Activation."
        },
        {
          "id": "daee-ce18-e487-8c9c",
          "name": "Disease Carrier",
          "description": "If an enemy model is Activated while it is within 1\" of a Hound of the Cult of the Black Grail, place 1 INFECTION MARKER next to the enemy model before it carries out any Actions."
        },
        {
          "id": "1e0f-7803-5158-bf35",
          "name": "Undead Fortitude",
          "description": "Add -1 INJURY DICE to Injury Rolls for a Hound of the Cult of the Black Grail unless the attack has the FIRE Keyword."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 3,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "93f3-a076-a503-e864",
      "name": "Thrall",
      "factionId": "Black Grail",
      "roles": [],
      "keywords": [],
      "stats": {
        "movement": "5\"/Infantry",
        "movementInches": 5,
        "movementType": "Infantry",
        "ranged": "N/A",
        "melee": "-1 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "min": null,
      "max": null,
      "abilities": [],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "2055-017b-f08e-aff4",
      "name": "Winged Thrall",
      "factionId": "Black Grail",
      "roles": [],
      "keywords": [],
      "stats": {
        "movement": "6\"/Flying",
        "movementInches": 6,
        "movementType": "Flying",
        "ranged": "N/A",
        "melee": "-1 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "min": null,
      "max": null,
      "abilities": [],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "b0d3-1c47-ce33-922d",
      "name": "Heralds of Beelzebub",
      "factionId": "Black Grail",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "BLACK GRAIL",
        "FEAR",
        "SKIRMISHER",
        "NEGATE GAS"
      ],
      "stats": {
        "movement": "10\"/Flying",
        "movementInches": 10,
        "movementType": "Flying",
        "ranged": "+0 Dice",
        "melee": "+0 Dice",
        "armour": "0",
        "base": "40mm"
      },
      "cost": {
        "ducats": 50,
        "glory": 0
      },
      "min": null,
      "max": 4,
      "abilities": [],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 4,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "e5d5-c4bb-4b99-020d",
      "name": "Amalgam",
      "factionId": "Black Grail",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "FEAR",
        "TOUGH",
        "BLACK GRAIL",
        "NEGATE GAS",
        "STRONG"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "+0 Dice",
        "armour": "0",
        "base": "60mm"
      },
      "cost": {
        "ducats": 140,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "25e6-11bb-8833-ff82",
          "name": "Corpulent",
          "description": "Add -2 DICE to Injury Rolls for any attacks that target an Amalgam model."
        },
        {
          "id": "b2bd-73a1-5f59-aa1f",
          "name": "Unstoppable",
          "description": "Enemy models that are mounted on a base of 32mm or less are not allowed to make a Melee Attack when an Amalgam that is within 1\" of them retreats. In addition, an Amalgam can use a normal move or a charge move if all enemy models within 1\" of it are mounted on bases of 32mm or less."
        },
        {
          "id": "c927-1f41-5473-f2f2",
          "name": "Trample",
          "description": "An Amalgam can take a Trample ACTION. If it does so, it can make a Melee Attack that must target an enemy model that is Down. A Trample Melee Attack does not use a Melee Weapon and has the IGNORE ARMOUR Keyword"
        },
        {
          "id": "7d24-3042-d6c2-f5bc",
          "name": "Six-armed Monstrosity",
          "description": "The rules for making more than one Ranged or Melee Attack do not apply to an Amalgam. Instead an Amalgam can take 1 Shoot ACTION per Activation with each Ranged Weapon it is equipped with, and can take 1 Fight ACTION per Activation with each Melee Weapon it is equipped with. The Off-Hand Weapon modifier does not apply to any of its Melee Attacks"
        },
        {
          "id": "a01c-f868-09d3-8cb7",
          "name": "Strong-ish",
          "description": "Two of the arms of the Amalgam have the Keyword STRONG. It can wield any two HEAVY weapons of its choice, each using one hand regardless of the weapon rules."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "aca1-8c2f-0a00-ee49",
      "name": "Lord of Tumours",
      "factionId": "Black Grail",
      "roles": [
        "Elite",
        "Leader"
      ],
      "keywords": [
        "BLACK GRAIL",
        "FEAR",
        "STRONG",
        "TOUGH",
        "NEGATE GAS"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+1 Dice",
        "melee": "+4 Dice",
        "armour": "0",
        "base": "50mm"
      },
      "cost": {
        "ducats": 130,
        "glory": 0
      },
      "min": 0,
      "max": 1,
      "abilities": [
        {
          "id": "dae4-94a1-1c22-0c9a",
          "name": "Undead Fortitude",
          "description": "Add -1 INJURY DICE to Injury Rolls for a Lord of Tumours unless the attack has the FIRE Keyword."
        },
        {
          "id": "f662-8943-c553-035f",
          "name": "Beelzebub’s Touch",
          "description": "Whenever a Melee Attack made by a Lord of Tumours causes any BLOOD MARKERS or INFECTION MARKERS to be placed on the target, place 1 extra INFECTION MARKER next to the target model"
        },
        {
          "id": "25bc-e870-f2a0-877a",
          "name": "Crushing Blows",
          "description": "A Lord of Tumours can make a Crushing Blows Melee Attack even if it does not have any Melee Weapons, or instead of using any Melee Weapons that it has. If it does so, this Melee Attack has the CLEAVE 2 Keyword."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "min",
          "value": 0,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "6435-cea8-b098-e528",
      "name": "Corpse Guard",
      "factionId": "Black Grail",
      "roles": [
        "Elite"
      ],
      "keywords": [
        "BLACK GRAIL",
        "FEAR",
        "NEGATE GAS"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "+1 Dice",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 55,
        "glory": 0
      },
      "min": null,
      "max": 3,
      "abilities": [
        {
          "id": "b3e7-566c-fefe-402d",
          "name": "Undead Fortitude",
          "description": "Add -1 INJURY DICE to Injury Rolls for a Corpse Guard unless the attack has the FIRE Keyword."
        },
        {
          "id": "77fd-38d3-3b6c-4a77",
          "name": "Bodyguard",
          "description": "If a friendly Cult of the Black Grail model within 1\" of a Corpse Guard is hit by a Ranged Attack or Melee Attack, you can say that the Corpse Guard will take the hit. If you do so, make an Injury Roll for the Corpse Guard instead of the original target. This ability cannot be used against attacks that have the BLAST Keyword."
        },
        {
          "id": "45af-c659-4300-106e",
          "name": "Parasitic Tick",
          "description": "Whenever a Melee Attack made by a Corpse Guard causes any BLOOD MARKERS or INFECTION MARKERS to be placed on the target, you can remove up to 1 BLOOD MARKER or INFECTION MARKER from the attacking Corpse Guard model."
        },
        {
          "id": "9efd-0157-4c7e-8f26",
          "name": "Shredding",
          "description": "Melee Attacks gain the CRITICAL Keyword."
        },
        {
          "id": "ef85-5b2b-f1d9-aad3",
          "name": "More Worm than Man",
          "description": "Your opponent cannot spend a Desiccated Husk’s INFECTION MARKERS, unless they are converting an Injury Roll into a Bloodbath Roll."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 3,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "9f3b-37db-7c86-c7ff",
      "name": "Matagot Hag",
      "factionId": "Black Grail",
      "roles": [
        "Elite",
        "Leader"
      ],
      "keywords": [
        "BLACK GRAIL",
        "FEAR",
        "NEGATE GAS",
        "TOUGH"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "-",
        "melee": "2",
        "armour": "0",
        "base": "60mm"
      },
      "cost": {
        "ducats": 135,
        "glory": 0
      },
      "min": 1,
      "max": 1,
      "abilities": [
        {
          "id": "707a-ba10-7075-5ba2",
          "name": "Frenzied Followers",
          "description": "Add +1 DICE to Risky Success Rolls for friendly models that are taking a Dash ACTION and are within 8” of the Matagot Hag."
        },
        {
          "id": "17b9-a73c-1eb7-5d15",
          "name": "Cadre of Flesh",
          "description": "If a friendly Matagot Hag within 3” of a friendly Ravenous model is hit by a Ranged Attack or Melee Attack, you can say that the Ravenous will take the hit. If you do so, make an Injury Roll for the Ravenous instead of the Matagot Hag. If the Ranged Attack had the BLAST Keyword, make the Injury Roll for the Matagot Hag before any other models hit by the blast."
        },
        {
          "id": "5af1-c71e-809e-c5f0",
          "name": "Pestilent",
          "description": "A Matagot Hag can make a Melee Attack with the INFECTION MARKERS and CRITICAL Keywords even though she does not have a Melee Weapon. In addition, whenever a Melee Attack made by a Matagot Hag causes any INFECTION MARKERS to be placed on the target, place 1 extra INFECTION MARKER next to the target model."
        },
        {
          "id": "17d8-f634-2c3a-e881",
          "name": "Undead Fortitude",
          "description": "Add -1 INJURY DICE to Injury Rolls for a Matagot Hag unless the attack has the FIRE Keyword."
        },
        {
          "id": "a7f7-0729-500c-24c9",
          "name": "Mother's Call",
          "description": "Mother’s Call ACTION: A Matagot Hag can take a Mother’s Call ACTION. If it does so, you can remove any number of INFECTION MARKERS from any models (friend or foe) within 18” of the Matagot Hag. For each INFECTION MARKER you remove, you can then carry out one of the following Commands with a Ravenous that is within 8” of the Matagot Hag. A model cannot be given more than 1 Command each Turn, but carrying out a Command does not stop it from also being Activated in the same Turn (before or after the Command was issued). * Feast Command: The model carries out a Ravenous Infection ACTION (see Ravenous). Place an additional INFECTION MARKER next to the target if the Risky Success Roll is a Success or Critical Success. * Fight Command: The model carries out a Melee Attack, and adds +1 DICE to the Success Roll. * Follow Command: The model carries out a Move (it cannot Charge or Retreat)."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "min",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "cb0d-b71b-7cf1-b375",
      "name": "Gregori Gula",
      "factionId": "Black Grail",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "BLACK GRAIL",
        "FEAR",
        "INFILTRATOR",
        "NEGATE GAS"
      ],
      "stats": {
        "movement": "9\"/Flying",
        "movementInches": 9,
        "movementType": "Flying",
        "ranged": "-",
        "melee": "2",
        "armour": "0",
        "base": "60mm"
      },
      "cost": {
        "ducats": 140,
        "glory": 0
      },
      "min": null,
      "max": 2,
      "abilities": [
        {
          "id": "8329-8ae4-3b45-4039",
          "name": "Gnashing and Tearing",
          "description": "A Gregori Gula can make a Melee Attack with the +1 INJURY DICE, INFECTION MARKERS and CLEAVE 2 Keywords even though it does not have a Melee Weapon. In addition, if a Gregori Gula made a charge move earlier in the same Activation, replace the CLEAVE 2 Keyword with the CLEAVE 3 Keyword for any Melee Attacks it makes during that Activation"
        },
        {
          "id": "6abe-0c6a-fa74-877c",
          "name": "Dormant Hunger",
          "description": "Once per Turn, when a Gregori Gula would be taken Out of Action, it instead goes dormant. Remove all INFECTION MARKERS from the Gregori Gula and replace its model with a 60mm piece of Impassable terrain to represent its dormant state. The Marker cannot be attacked, or targeted by any Abilities that interact with Terrain, and it does not count as a model for any Purpose. If a friendly Ravenous model finishes a move within 1” of this Marker, remove the Marker and the Ravenous model, and set up the Gregori Gula model where the Marker was. A Gregori Gula set up in this way is Down, but can be Activated this Turn if it has not been Activated already. A Gregori Gula in a dormant state is treated as Out of Action for the purposes of Morale, and in the Trauma Step of the Campaign Phase if it is dormant at the end of a battle. If a Ravenous model was removed to revive the Gregori Gula, then the Ravenous is removed from the Warband Roster in the Trauma Step (it dies to save the Gregori Gula)."
        },
        {
          "id": "964a-af5c-29e6-8aac",
          "name": "Vile Ferment",
          "description": "Before you make any Injury Rolls for models hit by a Ranged Attack made with Vomitus, you may remove 2 INFECTION MARKERS from the Gregori Gula that took the Shoot ACTION. If you do so, add +1 INJURY MODIFIER to the Injury Rolls for each model hit by this Vomitus attack."
        },
        {
          "id": "1f48-ecab-918f-49d2",
          "name": "Plague-Ridden Flesh",
          "description": "Add -2 INJURY DICE to Injury Rolls for a Gregory Gula unless the attack as the FIRE Keyword."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "2900-bb42-dc77-e352",
      "name": "Homunculus",
      "factionId": "Court of the Seven-Headed Serpent",
      "roles": [
        "Troop"
      ],
      "keywords": [],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "+0 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 40,
        "glory": 0
      },
      "min": null,
      "max": null,
      "abilities": [
        {
          "id": "9582-534b-e10b-cf60",
          "name": "Re-creation",
          "description": "If the Homunculus is taken Out of Action during battle, and is deemed to have been killed in the post-battle sequence, you do not have to remove it from your roster. Instead, you can spend 40 ducats at any time between battles to bring it back to life with all of its weapons and abilities"
        },
        {
          "id": "2417-8955-a52e-3097",
          "name": "Pummeling Blows",
          "description": "A Takwin Homunculus can make a Melee Attack even though it does not have any Melee Weapons."
        },
        {
          "id": "c5e3-4056-377e-2ca0",
          "name": "Artificial Life",
          "description": "Add -1 DICE to Injury Rolls for a Tawkin Homunculus."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "a2b2-89a6-6e9b-6070",
      "name": "Praetor",
      "factionId": "Court of the Seven-Headed Serpent",
      "roles": [
        "Elite",
        "Leader"
      ],
      "keywords": [
        "DEMONIC",
        "STRONG",
        "TOUGH",
        "FEAR",
        "THE COURT",
        "NEGATE FIRE"
      ],
      "stats": {
        "movement": "8\"/Flying",
        "movementInches": 8,
        "movementType": "Flying",
        "ranged": "+3 Dice",
        "melee": "+3 Dice",
        "armour": "0",
        "base": "50mm"
      },
      "cost": {
        "ducats": 115,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "67ea-6a29-5c38-05b8",
      "name": "Sorcerer",
      "factionId": "Court of the Seven-Headed Serpent",
      "roles": [
        "Elite"
      ],
      "keywords": [
        "DEMONIC",
        "FEAR",
        "THE COURT",
        "NEGATE FIRE"
      ],
      "stats": {
        "movement": "6\"/Flying",
        "movementInches": 6,
        "movementType": "Flying",
        "ranged": "+1 Dice",
        "melee": "+1 Dice",
        "armour": "0",
        "base": "50mm"
      },
      "cost": {
        "ducats": 75,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "f126-6f86-fb26-0f97",
      "name": "Hunter of the Left-hand Path",
      "factionId": "Court of the Seven-Headed Serpent",
      "roles": [
        "Elite"
      ],
      "keywords": [
        "DEMONIC",
        "THE COURT",
        "INFILTRATOR",
        "NEGATE FIRE"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+2 Dice",
        "melee": "+1 Dice",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 110,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "e508-c5a4-d746-1eb6",
      "name": "Hell Knight",
      "factionId": "Court of the Seven-Headed Serpent",
      "roles": [
        "Elite"
      ],
      "keywords": [
        "DEMONIC",
        "THE COURT",
        "STRONG",
        "NEGATE FIRE"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "+2 Dice",
        "armour": "-2",
        "base": "40mm"
      },
      "cost": {
        "ducats": 100,
        "glory": 0
      },
      "min": null,
      "max": 3,
      "abilities": [],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 3,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "f16c-02fc-f6ad-4562",
      "name": "Yoke Fiend",
      "factionId": "Court of the Seven-Headed Serpent",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "THE COURT",
        "DEMONIC",
        "NEGATE FIRE"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "+1 Dice",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 30,
        "glory": 0
      },
      "min": null,
      "max": null,
      "abilities": [
        {
          "id": "6196-e5a4-1978-7827",
          "name": "Hateful",
          "description": "When a yoke fiend is Activated, if there is an enemy model without the Keyword BLACK GRAIL or DEMONIC within 12” that it can see, it must make a Charge against the closest enemy model without the Keyword BLACK GRAIL or DEMONIC as its first ACTION. If it begins its Activation Down and the above conditions are true, it must stand and then Charge, unless it cannot stand. If it begins its Activation in melee combat, it ignores this ability."
        },
        {
          "id": "055b-99d9-d536-ce9d",
          "name": "Torturer",
          "description": "When a Yoke Fiend makes a Melee Attack, it can target a friendly model that does not have the DEMONIC Keyword. If it does so, it cannot attack again during the same Activation."
        },
        {
          "id": "e548-955a-6a84-d5bd",
          "name": "Infinite Duress",
          "description": "If a Cultist inflicts any Injury on an Enemy Model in Melee, it removes one Blood Marker from itself, if it had any."
        },
        {
          "id": "5ebc-2280-dd09-b031",
          "name": "Unstable",
          "description": "If a Cultist ever has 6 Blood Markers, it instantly is taken Out of Action, before anything else resolves."
        },
        {
          "id": "c104-c912-a766-408f",
          "name": "Willing Sacrifice",
          "description": "If a Cultist is taken Out of Action as a result of a friendly Goetic Spell (either through paying the spell’s cost and triggering Unstable, or being killed due to the effect of the Spell), then dies after the Battle, its equipment is returned to your warchest. Another willing soul for the Seething Black’s infinite contempt."
        },
        {
          "id": "70d1-6a66-9a7a-e23d",
          "name": "Hateful",
          "description": "When a Cultist is Activated, if it is more than 1\"from any enemy models and there is an enemy model within 12\" of it, then the Cultist must take a Charge ACTION with the closest enemy model as the target of the charge. If the Cultist was Down at the start of the Activation, it will stand up if it can do so and must then attempt to make the charge"
        },
        {
          "id": "b852-3309-a987-5ad5",
          "name": "Low on the Blood Chain",
          "description": "Cultists are treated as Yoke Fiends for the purposes of Equipment and the spell Slavemaster. Unlike Yoke Fiends, Cultists can be promoted to ELITE."
        }
      ],
      "options": [],
      "constraints": [],
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "b2dd-8727-aaa1-e504",
      "name": "Wretched",
      "factionId": "Court of the Seven-Headed Serpent",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "THE COURT"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "-1 Dice",
        "melee": "-1 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "min": null,
      "max": -1,
      "abilities": [
        {
          "id": "2c22-2f87-93e9-7507",
          "name": "Goaded Forth",
          "description": "Add +1 Dice to Risky Success Rolls for a Wretched that is taking a Dash ACTION if there is a friendly Yoke Fiend within 8\" and in Line of Sight."
        },
        {
          "id": "6ff9-9b8b-2927-b848",
          "name": "Law of Hell",
          "description": "If an attack made by a Wretched takes an enemy model with the ELITE Keyword out of Action, the Wretched model gains its freedom and is immediately removed from the game. It no longer counts as being part of the Warband for the purposes of Morale Checks, and is removed from the Warband Roster."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": -1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "6987-6ba4-6c22-54b8",
      "name": "Pit Locust",
      "factionId": "Court of the Seven-Headed Serpent",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "THE COURT",
        "DEMONIC",
        "LIMITED POTENTIAL",
        "FEAR",
        "NEGATE FIRE"
      ],
      "stats": {
        "movement": "8\"/Flying",
        "movementInches": 8,
        "movementType": "Flying",
        "ranged": "+0 Dice",
        "melee": "+2 Dice",
        "armour": "-2",
        "base": "30x60mm"
      },
      "cost": {
        "ducats": 90,
        "glory": 0
      },
      "min": null,
      "max": 3,
      "abilities": [
        {
          "id": "c55c-f6f6-7100-7fac",
          "name": "Poison Stingers",
          "description": "A Pit Locust can make a Melee Attack with the CLEAVE 2 and SHRAPNEL Keywords even though it does not have a Melee Weapon."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 3,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "8402-cb2e-c367-efe5",
      "name": "Desecrated Saint",
      "factionId": "Court of the Seven-Headed Serpent",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "TOUGH",
        "STRONG",
        "FEAR",
        "THE COURT",
        "DEMONIC",
        "LIMITED POTENTIAL",
        "NEGATE DIFFICULT TERRAIN",
        "IGNORE OFF-HAND"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "N/A",
        "melee": "+3 Dice",
        "armour": "-3",
        "base": "60mm"
      },
      "cost": {
        "ducats": 140,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "8de3-e9e8-dfde-a7f7",
          "name": "Relentless",
          "description": "Do not halve the Movement Characteristic of a Desecrated Saint when it stands up at the start of an Activation."
        },
        {
          "id": "af57-dce7-c354-cfe8",
          "name": "Aura of Envy",
          "description": "Enemy models within 12\" of this Desecrated Saint cannot Charge models that are with 1\" of a model from the Desecrated Saint’s Warband."
        },
        {
          "id": "91e6-c60d-e6f1-4932",
          "name": "Aura of Gluttony",
          "description": "Add -1 DICE to rolls for enemy models within 8\" of this Desecrated Saint unless the enemy model has the BLACK GRAIL or ARTIFICIAL Keyword"
        },
        {
          "id": "b97b-ed62-c510-0ef8",
          "name": "Aura of Greed",
          "description": "Enemy models within 12\" of this Desecrated Saint that take a Charge ACTION must charge this Desecrated Saint if it is within 12\", in the Line of Sight of the charging model, and can be reached without having to cross Dangerous terrain or Climb, Jump, Jump Down or make a Diving Charge."
        },
        {
          "id": "e8a3-79ca-652d-5277",
          "name": "Aura of Lust",
          "description": "If an enemy model within 4\" of this Desecrated Saint is wearing Armour that does not have the IMPERVIOUS Keyword, you can negate any of the Armour’s Keywords or special rules, if you wish to do so, for as long as the model is within 4\" of the Desecrated Saint. The only rules or Keywords you cannot negate are those that affect the size of the base the model is mounted on. For example, if a model has Machine Armour, you could say that you will negate its -3 INJURY MODIFIER Keyword and Steadfast special rule while it is within 4\" of the Desecrated Saint, but that you choose not to negate the Machine Armour’s Bulky special rule."
        },
        {
          "id": "51b7-8b1c-2d96-1287",
          "name": "Aura of Pride",
          "description": "Place 1 BLOOD MARKER next to each enemy model that is within 8\" of this Desecrated Saint when the Desecrated Saint’s Activation ends."
        },
        {
          "id": "f4c3-3158-9771-3159",
          "name": "Aura of Sloth",
          "description": "Enemy models within 8\" of this Desecrated Saint treat Minor Hit results as Down results. The aura affects enemy models that normally treat Down results as a Minor Hit result (such as models wearing Machine Armour)."
        },
        {
          "id": "01d9-f19c-3bb3-b0c3",
          "name": "Aura of the Void",
          "description": "Every time any other model (friend or foe) within 8” would gain Blood Marker(s), it gains twice as many. Additionally, the Desecrated Saint gains -1D for any Injury rolls made against it for every 2 Blood Markers on any other model within 8”, to a maximum of -2D from this effect."
        },
        {
          "id": "8375-fafb-016b-d16b",
          "name": "Aura of Wrath",
          "description": "Add +1 DICE to Melee Attacks and the Risky Success Roll for taking a Dash ACTION for friendly models that are within 8\" of this Desecrated Saint (including the Desecrated Saint themselves)."
        },
        {
          "id": "dcd0-4aa5-5f3d-eefc",
          "name": "Annihilator",
          "description": "The rules for making more than one Melee Attack do not apply to a Desecrated Saint. Instead a Desecrated Saint can take 1 Fight ACTION per Activation with each Melee Weapon it is equipped with. The Off-hand Weapon modifier does not apply to any of its Melee Attacks."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "6583-d273-0c59-fdf6",
      "name": "Faceless",
      "factionId": "Court of the Seven-Headed Serpent",
      "roles": [
        "Elite"
      ],
      "keywords": [
        "THE COURT",
        "FEAR",
        "STRONG",
        "DEMONIC",
        "NEGATE FIRE"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+2 Dice",
        "melee": "+3 Dice",
        "armour": "0",
        "base": "40 mm"
      },
      "cost": {
        "ducats": 105,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "e4fc-5f94-74ae-ab35",
          "name": "Ceaseless Destruction",
          "description": "As long as there are at least a total of 3 Blood Markers on friendly models within 4\" of a Faceless, every Out of Action injury result against it are treated as Downed instead. Any effects that would prevent a Downed state do not apply when this occurs. Additionally, any friendly models with the CULTIST keyword within 4” and in its Line of Sight of the Faceless gain -1 INJURY DICE to all Injury rolls made against them."
        },
        {
          "id": "b58e-e861-cf98-1cf2",
          "name": "The Gift",
          "description": "A Faceless can take The Gift ACTION when it takes an enemy model Out of Action in Melee. If they do so, take a Risky Success Roll for the model. If the roll is a Failure, the Faceless’s Activation ends immediately. If the roll is a Success or Critical Success, create a new friendly Cultist armed with a trench club and the same number of Blood Markers on it as the deceased enemy model had. The new Cultist is not counted for the purposes of Morale or any Objectives in the Battle, and dies after the battle has ended."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "e147-1fc4-7be4-1f66",
      "name": "Stalker",
      "factionId": "Court of the Seven-Headed Serpent",
      "roles": [
        "Elite"
      ],
      "keywords": [
        "DEMONIC",
        "NEGATE FIRE"
      ],
      "stats": {
        "movement": "7\"/Flying",
        "movementInches": 7,
        "movementType": "Flying",
        "ranged": "0 Dice",
        "melee": "+2 Dice",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 95,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "231f-bbc9-438c-588e",
          "name": "Living Shadow",
          "description": "Enemy models cannot target the Stalker with ranged attacks unless they are within 18” of it, decreased to 12” if the Stalker is in Cover from the perspective of the attacking Model."
        },
        {
          "id": "5ba1-407f-7eea-8883",
          "name": "Gruesome Cover",
          "description": "A Stalker can take a Gruesome Cover ACTION when it takes an enemy model Out of Action in Melee. If they do so, take a Success Roll for the model. If the roll is a Failure, nothing happens. If the roll is a Success or a Critical Success, it buries itself into the still-warm corpse, body bending at unnatural angles and ends its Activation. Until the beginning of its next Activation, it is considered to be in Cover from any angle."
        },
        {
          "id": "57eb-c604-6faa-c6b9",
          "name": "Undying Vassal",
          "description": "Once per turn, whenever a model (friend or foe) is taken Out of Action, the Stalker may choose to instantly appear out of the Model’s corpse. Redeploy it and immediately place it so that the center of its base is at the location that was previously occupied by the center of the base of the removed model. If this is impossible for any reason, the Stalker remains at its original location. This ability can be used at any point during the Battle, even if it is outside of the Stalker’s Activation. Note that if the Stalker starts within 1\" of an enemy model, this is not treated as a Retreat, so the enemy model cannot make a Melee Attack before the Stalker uses that ability."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "c4f9-0bca-fb4a-1a51",
      "name": "Anointed Heavy Infantry",
      "factionId": "Heretic Legion",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "HERETIC",
        "STRONG"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+1 Dice",
        "melee": "+1 Dice",
        "armour": "-2",
        "base": "32mm"
      },
      "cost": {
        "ducats": 95,
        "glory": 0
      },
      "min": null,
      "max": null,
      "abilities": [
        {
          "id": "197e-2053-38ac-cce8",
          "name": "Incandescent",
          "description": "Weapons with the FIRE keyword that this model has equipped gain +1 INJURY DICE."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 5,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "1c77-e32a-aec8-53a7",
      "name": "Heretic Priest",
      "factionId": "Heretic Legion",
      "roles": [
        "Elite",
        "Leader"
      ],
      "keywords": [
        "HERETIC",
        "TOUGH"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+2 Dice",
        "melee": "+2 Dice",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 80,
        "glory": 0
      },
      "min": 1,
      "max": 1,
      "abilities": [],
      "options": [],
      "constraints": [
        {
          "type": "min",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "459b-6e4b-c658-2d35",
      "name": "Death Commando",
      "factionId": "Heretic Legion",
      "roles": [
        "Elite"
      ],
      "keywords": [
        "HERETIC",
        "INFILTRATOR"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+1 Dice",
        "melee": "+2 Dice",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 90,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "1110-b5e7-9966-1383",
          "name": "Stealth Generator",
          "description": "Add -1 DICE to rolls for Ranged Attacks that target a Death Commando."
        },
        {
          "id": "1191-44c6-b786-d49d",
          "name": "Hide",
          "description": "A Death Commando can take a Hide ACTION if they are in contact with a terrain piece that is at least ½\" high. If they do so, take a Risky Success Roll for the model and add +1 DICE to the roll. If the roll is a Failure, the Death Commando’s Activation ends immediately. If the roll is a Success or Critical Success, enemy models cannot choose the Death Commando as the target for a Ranged Attack or Charge until the Death Commando moves, charges, retreats, makes a Ranged Attack, or an enemy model moves within 1.5\" of them. The Death Commando can be hit if they are within the blast radius of a Weapon with the BLAST Keyword."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "8dab-235b-d0d8-967f",
      "name": "Chorister",
      "factionId": "Heretic Legion",
      "roles": [
        "Elite"
      ],
      "keywords": [
        "HERETIC",
        "FEAR"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "-2 Dice",
        "melee": "+2 Dice",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 65,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "dcb0-e7e0-84df-2871",
          "name": "Unholy Hymns",
          "description": "All enemy models within 8” of the Chorister suffer an additional -1 DICE for all ACTIONS they attempt."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "57ad-9a46-41b3-5414",
      "name": "War Wolf",
      "factionId": "Heretic Legion",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "ARTIFICIAL",
        "HERETIC",
        "TOUGH",
        "FEAR",
        "NEGATE DIFFICULT TERRAIN"
      ],
      "stats": {
        "movement": "8\"/Infantry",
        "movementInches": 8,
        "movementType": "Infantry",
        "ranged": "N/A",
        "melee": "+2 Dice",
        "armour": "-3",
        "base": "50mm"
      },
      "cost": {
        "ducats": 145,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "3cce-f0d7-ac9e-f3a6",
          "name": "Loping Dash",
          "description": "Add +1 DICE to the Risky Success Roll for a War Wolf that is taking a Dash ACTION. In addition, a War Wolf ignores the penalty for moving through Difficult terrain (other terrain affects it normally)."
        },
        {
          "id": "11cb-1c31-0802-652a",
          "name": "Appetisers",
          "description": "The War Hyena ignores the effects of barbed wire (both difficult and dangerous)."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "73fc-5557-f02b-f423",
      "name": "Artillery Witch",
      "factionId": "Heretic Legion",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "HERETIC",
        "ARTIFICIAL",
        "LIMITED POTENTIAL",
        "NEGATE FEAR",
        "NEGATE GAS"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "-1 Dice",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 100,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "9b77-f940-9067-44b6",
          "name": "Creator's Shadow",
          "description": "Due to rubbing shoulders with their makers every day, Phosphor Witches cannot be promoted to ELITE, as their creators would never allow the indignity."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "5c28-fb72-df49-7ffd",
      "name": "Wretched",
      "factionId": "Heretic Legion",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "HERETIC"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "-1 Dice",
        "melee": "-1 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 25,
        "glory": 0
      },
      "min": null,
      "max": -1,
      "abilities": [
        {
          "id": "2a4a-1cd3-c412-997e",
          "name": "Dark Blessing",
          "description": "When a Wretched is taken Out of Action, place 1 BLESSING MARKER next to the nearest friendly model with the ELITE and HERETIC Keywords. If two or more eligible models are equally close to the Wretched, you can choose which receives the BLESSING MARKER"
        },
        {
          "id": "b470-fc56-b15f-c431",
          "name": "Law of Hell",
          "description": "If an attack made by a Wretched takes an enemy model with the ELITE Keyword out of Action, the Wretched model gains its freedom and is immediately removed from the game. It no longer counts as being part of the Warband for the purposes of Morale Checks and is removed from the Warband Roster."
        },
        {
          "id": "c671-421c-22ef-5503",
          "name": "Chattel",
          "description": "In a campaign, Wretched can be sold in the Quartermaster Step for 25 ducats plus half the cost in ducats of any Battlekit they have."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": -1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "9654-b8d7-9c76-f5db",
      "name": "Heretic Trooper",
      "factionId": "Heretic Legion",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "HERETIC"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "+0 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 30,
        "glory": 0
      },
      "min": null,
      "max": null,
      "abilities": [],
      "options": [],
      "constraints": [],
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "7d0c-f87e-d843-b52e",
      "name": "Technomancer",
      "factionId": "Heretic Legion",
      "roles": [
        "Elite",
        "Leader"
      ],
      "keywords": [
        "HERETIC",
        "ARTIFICIAL",
        "TOUGH"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+2 Dice",
        "melee": "+2 Dice",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 80,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "7237-9a79-fae2-43fd",
          "name": "Obey, don't question",
          "description": "As a RISKY ACTION, the Technomancer can command any other friendly CADAVER CORPS ARTIFICIAL model within 12” to do one of the following: - Conflagrate: The ARTIFICIAL model immediately suffers the results of a Minor Wound injury from an attack with the keyword FIRE. - Overwhelm: The ARTIFICIAL model immediately DOWNS itself and any enemy model with a 40mm base or smaller it is in melee with. Neither take any BLOOD MARKER(s) for becoming DOWN. This ability cannot be used if either model is immune to becoming or already is DOWN (For example, Byzantinium Heart or Too Proud To Fall). - Salvage: The ARTIFICIAL model immediately takes itself Out of Action, then one other friendly ARTIFICIAL model within 12” of the Technomancer (including the Technomancer) may remove up to 2 BLOOD MARKERS. An Artificial model taken Out of Action this way may reroll its injury dice at the end of the battle, but must keep the second result if it does so."
        },
        {
          "id": "84be-24dc-8d0a-e7b8",
          "name": "Machine Learning",
          "description": "As an ACTION, the Technomancer assumes direct control over any friendly CADAVER CORPS ARTIFICIAL model within 12” that has not been Activated this turn. If successful, the Technomancer’s Activation immediately ends and the target’s Activation begins immediately after."
        },
        {
          "id": "b486-a9b6-fb1d-efc4",
          "name": "Leader",
          "description": "This Technomancer is the leader of the Warband."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "f985-029a-9867-33a0",
      "name": "Witch Coven Matriarch",
      "factionId": "Heretic Legion",
      "roles": [
        "Mercenary"
      ],
      "keywords": [
        "ARTIFICIAL",
        "HERETIC"
      ],
      "stats": {
        "movement": "6\"/Dly",
        "movementInches": 6,
        "movementType": "Dly",
        "ranged": "0 Dice",
        "melee": "0 Dice",
        "armour": "-2",
        "base": "40mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 5
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "f272-fd5e-da09-342f",
          "name": "Witch Coven Matriarch",
          "description": "The Witch Coven Matriarch is a Mercenary only available to the Cadaver Corps. She does, however, still benefit from the It Will Not Stop rule."
        },
        {
          "id": "57c9-44f9-c0b3-d558",
          "name": "Clawed Hands",
          "description": "Flurry of Blows: The Witch Coven Matriarch is capable of attacking with each of her four clawed hands as if armed with knives (for a total of 4 attacks)."
        },
        {
          "id": "1fcd-08f7-1e82-6d60",
          "name": "The Profane Flame",
          "description": "As an action that does not require a roll, the Matriarch can enact the Ritual of Profane Flame, lasting until the end of the turn. This immediately ends her activation. While the Ritual lasts, allied Phosphor Witches can target the Matriarch with their Phosphor bomb if they are within Line of Sight. If an allied Phosphor Witch directly targets, then hits the Witch Coven Matriarch with their Phosphor Bomb (or its blast), she does not take any Blood Markers from the resulting Injury Roll. Instead, she absorbs the flames and redirects them at her enemies, and immediately resolves an attack as if she has just attacked with her Phosphor Bomb, with a +1D bonus to hit. Due to the torrent of flame, sulphur and detritus surrounding the Matriarch while she performs the Ritual, she is treated as being in cover for the Ritual’s duration (including the defended obstacle bonus when charged)."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "2f34-d5f0-2acc-17eb",
      "name": "Homunculus",
      "factionId": "Heretic Legion",
      "roles": [
        "Troop"
      ],
      "keywords": [],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "+0 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 40,
        "glory": 0
      },
      "min": null,
      "max": null,
      "abilities": [
        {
          "id": "e75c-925c-ceba-ce35",
          "name": "Pummeling Blows",
          "description": "A Takwin Homunculus can make a Melee Attack even though it does not have any Melee Weapons."
        },
        {
          "id": "62db-eeca-4b31-652a",
          "name": "Artificial Life",
          "description": "Add -1 DICE to Injury Rolls for a Tawkin Homunculus."
        },
        {
          "id": "d56e-0659-faa2-3c46",
          "name": "Re-creation",
          "description": "If a Takwin Homunculus is killed in the post-battle sequence, you do not have to remove it from your roster. Instead, you can spend 40 ducats in the following Quartermaster Step to leave it on the Roster."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "02c4-88da-ec78-8a33",
      "name": "Homunculus",
      "factionId": "Iron Sultanate",
      "roles": [],
      "keywords": [
        "SULTANATE",
        "LIMITED POTENTIAL"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "+0 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 40,
        "glory": 0
      },
      "min": null,
      "max": null,
      "abilities": [
        {
          "id": "ed29-27ae-0cae-da7e",
          "name": "Artificial Life",
          "description": "Add -1 DICE to Injury Rolls for a Takwin Homunculus."
        },
        {
          "id": "b59e-24fc-4822-b7e2",
          "name": "Pummeling Blows",
          "description": "A Takwin Homunculus can make a Melee Attack even though it does not have any Melee Weapons."
        },
        {
          "id": "0c8b-4828-c2a6-4388",
          "name": "Re-creation",
          "description": "If a Takwin Homunculus is killed in the post-battle sequence, you do not have to remove it from your roster. Instead, you can spend 40 ducats in the following Quartermaster Step to leave it on the Roster."
        }
      ],
      "options": [],
      "constraints": [],
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "6938-a6bd-aec7-18d9",
      "name": "Sultanate Sapper",
      "factionId": "Iron Sultanate",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "SULTANATE"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+1 Dice",
        "melee": "0",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 50,
        "glory": 0
      },
      "min": null,
      "max": 2,
      "abilities": [
        {
          "id": "5920-36e6-b95e-f0b4",
          "name": "Set Mine",
          "description": "A Sultanate Sapper can take a Set Mine ACTION if they are in contact with a terrain piece that measures up to 8\" by 8\". If they do so, take a Success Roll for the model and add +2 DICE to the roll. If the roll is a Failure, nothing happens. If the roll is a Success or a Critical Success, the terrain piece becomes Mined."
        },
        {
          "id": "2f66-3cf4-7424-cd4d",
          "name": "Fortify",
          "description": "A Sultanate Sapper can take a Fortify ACTION. If they do so, take a Risky Success Roll for the Sultanate Sapper. If the roll is a Failure, the Sultanate Sappers Activation ends. If the roll is a Success or a Critical Success, the Sultanate Sapper has the COVER Keyword until they move away from their current position."
        },
        {
          "id": "a162-b451-9a8d-5f6a",
          "name": "Defuse Mine",
          "description": "When you move a Sultanate Sapper into contact with a terrain piece that has been Mined, you can say the Sultanate Sapper will halt and try to defuse the mine before it detonates (▶ see Detonating Mines below). If you do so, take a Risky Success Roll for the model. If the roll is a Failure, the mine detonates anyway and the Sultanate Sapper’s Activation ends. If the roll is a Success or a Critical Success, the mine does not detonate and the terrain piece is no longer considered to be Mined"
        },
        {
          "id": "b748-eebc-d4a5-19c4",
          "name": "Forward Positions",
          "description": "When you deploy a Sultanate Sapper for the first time in a game, you must deploy them up to 6\" away from your deployment zone and in contact with a terrain piece that is at least ½\" high."
        },
        {
          "id": "1003-fdc1-a7f2-68de",
          "name": "Detonating Mine",
          "description": "When a model moves into contact with a Mined terrain piece, the mine will detonate unless the model is the one that set the mine, or has the Defuse Mine ability (▶ see above). Make an Injury Roll with the SHRAPNEL Keyword for the model that detonated the mine. The terrain piece is then no longer considered to be Mined. If the model wasn’t taken Down or Out of Action, it can then continue its move. Flying models only detonate a mine if they finish a move in contact with a Mined terrain piece (they can fly across it without setting it off )."
        },
        {
          "id": "f851-26c0-c31f-c85d",
          "name": "Improvised Trap",
          "description": "A Sapper can take an Improvised Trap ACTION. If they do so, take a Success Roll with +2 DICE for the model. If the roll is a failure, nothing happens. If the roll is a Success or a Critical Success, the Sapper may place a single 2” trap marker within base contact of itself. When a unit comes within 1” of the marker they must immediately roll on the Injury chart. If the result of this roll is a Down, then the enemy unit is considered pinned, and cannot Stand or Move unless it succeeds on a Risky Success Roll at the start of its next Activation. Units with the keyword STRONG or on a 50mm or larger base make this roll with +1 DICE. A Sapper ignores the effects of its own set traps."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "8aa4-2bfe-6a85-595c",
      "name": "Jabirean Alchemist",
      "factionId": "Iron Sultanate",
      "roles": [
        "Elite"
      ],
      "keywords": [
        "SULTANATE"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+2 Dice",
        "melee": "+1 Dice",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 55,
        "glory": 0
      },
      "min": 0,
      "max": 1,
      "abilities": [
        {
          "id": "eabe-48c7-1cdc-a67d",
          "name": "Mastery of the Elements",
          "description": "When this model is deployed for the first time in a game, you can give one of the following Keywords to all of the Jabirean Alchemist’s Ranged Weapons and Melee Weapons: FIRE or GAS or SHRAPNEL. All of the Weapons have the same Keyword. If the Weapon already has the Keyword, it does not receive it a second time."
        },
        {
          "id": "07f2-5347-651a-0744",
          "name": "Elemental Change",
          "description": "ACTION: A Jabirean Alchemist can take an Elemental Change ACTION. If they do so, take a Risky Success Roll for the model. If the roll is a Failure, nothing happens and the Jabirean Alchemist’s Activation ends. If the roll is a Success or a Critical Success, you can change the Master of the Elements Keyword on all of the Jabirean Alchemist’s Weapons to one of the other two choices."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "min",
          "value": 0,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "16b9-d9fd-6c2d-68f9",
      "name": "Janissary",
      "factionId": "Iron Sultanate",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "STRONG",
        "SULTANATE"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+1 Dice",
        "melee": "+1 Dice",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 55,
        "glory": 0
      },
      "min": null,
      "max": 6,
      "abilities": [
        {
          "id": "aba6-8b49-af2b-e4fd",
          "name": "Whirling Dervishes",
          "description": "The ritual Dance of the Dervishes is hypnotic to witness, and it is as graceful as it is deadly. All Ranged attacks against Dervishes suffer -1 DICE penalty. Dervishes do not suffer the normal -1 DICE to hit for fighting with an Off-Hand weapon."
        },
        {
          "id": "1061-0baf-c232-c9a3",
          "name": "Counter-Charge",
          "description": "If the first ACTION a Janissary makes during their Activation is a Charge, they can add +1 DICE to their subsequent Melee Attack ACTIONS during this Activation"
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 6,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "0a4b-397f-ded9-8e79",
      "name": "Brazen Bull",
      "factionId": "Iron Sultanate",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "SULTANATE",
        "ARTIFICIAL",
        "FEAR",
        "NEGATE SHRAPNEL",
        "STRONG",
        "TOUGH"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "+2 DICE",
        "armour": "0",
        "base": "60mm"
      },
      "cost": {
        "ducats": 115,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "2767-ad8b-95f6-c084",
          "name": "Artificial Life",
          "description": "Add -1 INJURY DICE to Injury Rolls for a Brazen Bull."
        },
        {
          "id": "f09d-3206-6514-c294",
          "name": "Trample",
          "description": "ACTION: A Brazen Bull can take a Trample ACTION. If it does so, it can make a Melee Attack that must target an enemy model that is Down. A Trample Melee Attack does not use a Melee Weapon and has the IGNORE ARMOUR Keyword."
        },
        {
          "id": "dispatch01-living-battering-ram",
          "name": "Living Battering Ram ACTION",
          "description": "If a Brazen Bull takes a Charge ACTION and ends its charge move within 1” of any enemy models, it can immediately take a Living Battering Ram ACTION. If it does so, make a Success Roll for each enemy model within 1” of the Brazen Bull. Add -1 DICE to the Success Roll if the enemy model is on a base that is 40mm or larger. On a failure, nothing happens. On a Success or a Critical Success, the enemy model is immediately taken Down."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "2e2a-409a-cf05-c437",
      "name": "Sultanate Assassin",
      "factionId": "Iron Sultanate",
      "roles": [
        "Elite"
      ],
      "keywords": [
        "INFILTRATOR",
        "SULTANATE"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+1 Dice",
        "melee": "+2 Dice",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 85,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "fd33-0f29-cf19-2244",
          "name": "Temporal Assassin",
          "description": "After determining the Charge Bonus for a Sultanate Assassin that has not already carried out a Fight ACTION in its Activation, you can say that the Sultanate Assassin will split itself through time. If you do so, choose an additional enemy model as the target of the Charge (the normal rules for picking a target apply, but do not count targets of the Charge as interposing enemy models). Then make a charge move with the Sultanate Assassin which finishes within 1” of the first enemy model you picked as a target, and then take a Fight ACTION with the enemy model as the target. After resolving the Fight ACTION, you must immediately remove the Sultanate Assassin from the battlefield and redeploy it to within 1” of the other model that you picked. Then take a second Fight ACTION with the other enemy model as the target. The Sultanate Assassin must use the same Melee Weapon for both attacks, and cannot take a Fight ACTION later in the same Activation."
        },
        {
          "id": "8f81-f60e-60f7-ea89",
          "name": "Time Slip",
          "description": "If your opponent fails their Success Roll for an attack targeting a Sultanate Assassin, you can say the Sultanate Assassin will slip into a moment in the future. If you do so, you can redeploy it anywhere within 6” of its original location (measured from the centre of its base to the centre of its base), and more than 1” away from any enemy models. If the failed attack took place because the Sultanate Assassin is retreating, the retreat move ends after you redeploy the model."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "7280-5029-065d-2822",
      "name": "Yüzbaşı Captain",
      "factionId": "Iron Sultanate",
      "roles": [
        "Elite",
        "Leader"
      ],
      "keywords": [
        "SULTANATE",
        "ELITE",
        "LEADER",
        "NEGATE FEAR",
        "STRONG",
        "TOUGH"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+2 Dice",
        "melee": "+2 Dice",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 75,
        "glory": 0
      },
      "min": 1,
      "max": 1,
      "abilities": [
        {
          "id": "dispatch01-mubarizun",
          "name": "Mubarizun",
          "description": "A Yüzbaşı is expected to face the mightiest of their enemies in personal combat, inspiring the troops to victory with their personal prowess. Add +1 INJURY DICE for attacks made by a Yüzbaşı if the target model has the TOUGH Keyword."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "min",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "16d8-5d2d-abc1-4bfc",
      "name": "Azeb",
      "factionId": "Iron Sultanate",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "SULTANATE"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "-1 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 25,
        "glory": 0
      },
      "min": null,
      "max": null,
      "abilities": [],
      "options": [],
      "constraints": [],
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "2ce6-a5e6-fd5e-9b11",
      "name": "Lion of Jabir",
      "factionId": "Iron Sultanate",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "SULTANATE",
        "LIMITED POTENTIAL",
        "ARTIFICIAL"
      ],
      "stats": {
        "movement": "8\"/Infantry",
        "movementInches": 8,
        "movementType": "Infantry",
        "ranged": "N/A",
        "melee": "+1 Dice",
        "armour": "0",
        "base": "50mm"
      },
      "cost": {
        "ducats": 60,
        "glory": 0
      },
      "min": null,
      "max": 2,
      "abilities": [
        {
          "id": "c57a-8333-1d35-ae34",
          "name": "Artificial Life",
          "description": "Add -1 INJURY DICE to Injury Rolls for a Lion of Jabir"
        },
        {
          "id": "c71e-93f6-98c1-4b2c",
          "name": "Agile",
          "description": "Add +1 DICE to Risky Success Roll when a Lion of Jabir Climbs, Jumps, or makes a Diving Charge, or takes a Dash ACTION."
        },
        {
          "id": "31e8-c7ae-36d7-d76c",
          "name": "Pin",
          "description": "Enemy models that are Down and that are mounted on a base of 40mm or less are not allowed to stand up if a Lion of Jabir is within 1\" of them (even if the Lion of Jabir is also Down)."
        },
        {
          "id": "364b-3951-419e-544e",
          "name": "Teeth and Claws",
          "description": "A Lion of Jabir can make a Melee Attack even though it does not have any Melee Weapons."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "910a-f733-210e-3161",
      "name": "\"Zamburak\" Weapon Platform",
      "factionId": "Iron Sultanate",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "TOUGH",
        "STRONG"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 DICE",
        "melee": "+0 DICE",
        "armour": "-3",
        "base": "50mm"
      },
      "cost": {
        "ducats": 90,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "9f03-e973-56f5-8a66",
          "name": "Weapons Platform",
          "description": "This model always counts as being on a 3” high platform when it makes a Ranged Attack, thus granting it the benefits of Elevated position against any enemy model on the same level as itself."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "cc60-cf6f-3252-dee0",
      "name": "Bedu Sharpshooter",
      "factionId": "Iron Sultanate",
      "roles": [
        "Troop"
      ],
      "keywords": [],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+1 DICE",
        "melee": "-1 DICE",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 110,
        "glory": 0
      },
      "min": null,
      "max": 2,
      "abilities": [
        {
          "id": "dd8e-275b-97ce-18e1",
          "name": "Eagle Eyed",
          "description": "This model Critically Succeeds on its Ranged Attacks on an 11+."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "ea9d-10cb-d033-c1e8",
      "name": "Archeologist",
      "factionId": "Iron Sultanate",
      "roles": [
        "Elite"
      ],
      "keywords": [],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+1 DICE",
        "melee": "0 DICE",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 75,
        "glory": 0
      },
      "min": null,
      "max": 2,
      "abilities": [
        {
          "id": "3c53-30ad-ef33-9e05",
          "name": "Improvisation",
          "description": "After Deployment, before the start of the game, an Archeologist can secretly designate a piece of terrain no bigger than 8”x8” to have been Mined by them before the battlefield, by choosing a weapon with the GRENADE keyword that the Archeologist has equipped. If the weapon may only be used a limited amount of time, this counts as one use. The first time in the game an enemy Model moves into contact with the Mined piece of terrain, unless that model has the Defuse Mine ability, they are treated as having been hit successfully by a Ranged Attack roll using the Battlekit designated at the start of the game."
        },
        {
          "id": "3b09-a6a0-44e0-7442",
          "name": "De-mine",
          "description": "When you move this model into contact with a terrain piece that has been Mined, you can say this model will halt and try to defuse the mine before it detonates as per its rules. If you do so, take a Risky Success Roll for the model. If the roll is a Failure, the mine detonates anyway and this model’s Activation ends. If the roll is a Success, the mine does not detonate and the terrain piece is no longer considered to be Mined."
        },
        {
          "id": "6b0d-17af-25cf-8c4b",
          "name": "Extensive Collection",
          "description": "This model may use a piece of battlekit that normally can only be used once per battle a second time."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "3fce-74d0-c0b4-1ebd",
      "name": "Teğmen",
      "factionId": "Iron Sultanate",
      "roles": [
        "Elite"
      ],
      "keywords": [
        "SULTANATE"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+1 Dice",
        "melee": "+2 Dice",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 60,
        "glory": 0
      },
      "min": null,
      "max": 2,
      "abilities": [
        {
          "id": "4c80-17c0-acea-89c8",
          "name": "Counterattack",
          "description": "When an enemy model misses the Teğmen, or a friendly model within 1” of a Teğmen, with a Melee Attack, the Teğmen may make a single Melee Attack against the enemy model as a reaction."
        },
        {
          "id": "9f39-0732-bf94-d1c8",
          "name": "Mujaahid",
          "description": "When you first hire this model to your warband you may choose one of the listed Martial Disciplines for them. A Teğmen may only have one Martial Discipline and you may never change it out for any other."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "aed0-3d61-c331-fd51",
      "name": "Shirdal",
      "factionId": "Iron Sultanate",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "FEAR",
        "TOUGH",
        "SULTANATE"
      ],
      "stats": {
        "movement": "8\"/Flying",
        "movementInches": 8,
        "movementType": "Flying",
        "ranged": "-",
        "melee": "+2 DICE",
        "armour": "-2",
        "base": "50mm"
      },
      "cost": {
        "ducats": 140,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "e144-884a-e38f-f8e7",
          "name": "Chimeric Vitality",
          "description": "Add -1 INJURY DICE to Injury Rolls for a Shirdal unless the weapon has the keyword FIRE or GAS."
        },
        {
          "id": "5e9a-d92f-0c5f-cf07",
          "name": "Winged Beast",
          "description": "Add +1 DICE to Risky Success Roll when a Shirdal makes a Diving Charge or takes a Dash ACTION."
        },
        {
          "id": "a838-cd2e-48a0-258a",
          "name": "Assault Beast",
          "description": "A Shirdal is armed with two Melee Weapons (its Damascus Talons and Crushing Beak). When it makes a Melee Attack, it can attack once using either its Damascus Talons or Crushing Beak, or twice, first with the Damascus Talons and second with its Crushing Beak (the Off-Hand Weapon modifier applies to the attack made with the Crushing Beak)."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "ee61-1ca1-89ee-f657",
      "name": "Pairika",
      "factionId": "Iron Sultanate",
      "roles": [
        "Mercenary"
      ],
      "keywords": [
        "TOUGH",
        "FEAR",
        "SULTANATE"
      ],
      "stats": {
        "movement": "6\"/Flying",
        "movementInches": 6,
        "movementType": "Flying",
        "ranged": "n/a",
        "melee": "+1 DICE",
        "armour": "0",
        "base": "40mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 7
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "6840-de3c-a380-dcc5",
          "name": "Nur Crest",
          "description": "A Pairika can take a Nur Crest ACTION. If they do so, take a Risky Success Roll for the model. If the roll is a Failure, the Pairika’s Activation ends immediately. If the roll is a Success, you may choose a friendly unit within 3” of the Pairika and remove 1 BLOOD or INFECTION MARKER from the targeted model. If the roll is a Critical Success, remove up to 3 BLOOD OR INFECTION MARKER instead."
        },
        {
          "id": "5a0b-170e-5ed3-360f",
          "name": "His Mercy",
          "description": "Once per Turn when an other friendly unit would suffer an injury result, you may automatically set one of the Injury Dice results to a 1."
        },
        {
          "id": "af9b-3d2c-6807-c322",
          "name": "Celestial Vitality",
          "description": "Add -2 INJURY DICE to Injury Rolls for a Pairika."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "aa7f-02df-a12f-1ed3",
      "name": "Combat Medic",
      "factionId": "Mercenaries",
      "roles": [
        "Mercenary"
      ],
      "keywords": [],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "0",
        "melee": "0",
        "armour": "-1",
        "base": "25mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 2
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "0ed0-319a-6fee-c76c",
          "name": "Finish the Fallen",
          "description": "Due to their knowledge of anatomy and physiology, the Sisters are experts at inflicting debilitating injuries and excruciating pain. Add +1 DICE to Injury Rolls for Melee Attacks made by a Sister of Saint Cosmas if the target is Down and does not have the BLACK GRAIL or DEMONIC Keywords."
        },
        {
          "id": "3e7f-811a-8510-6602",
          "name": "Expert Medic",
          "description": "Add +2 DICE to the Risky Success Roll when a Sister of Saint Cosmas carries out a Treat ACTION with their Medi-kit."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "05fe-9537-b2ad-0782",
      "name": "Observer",
      "factionId": "Mercenaries",
      "roles": [
        "Mercenary"
      ],
      "keywords": [],
      "stats": {
        "movement": "8\"/Infantry",
        "movementInches": 8,
        "movementType": "Infantry",
        "ranged": "+1 Dice",
        "melee": "+2 Dice",
        "armour": "-1",
        "base": "32mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 3
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "9132-9fba-fcbb-0a0a",
          "name": "Eye of God",
          "description": "You can re-roll failed Success Rolls and Risky Success Rolls for an Observer. If you do so and any of the re-rolled dice show a 1, then the roll is treated as a Failure, the Observer is taken Down and their Activation immediately ends."
        },
        {
          "id": "f6de-266a-b7d9-8541",
          "name": "Lightning Speed",
          "description": "An Observer’s Polearm has the CLEAVE 2 Keyword."
        },
        {
          "id": "786d-5f14-e565-4d81",
          "name": "Temporal Fugue",
          "description": "Add -1 DICE to rolls for Ranged Attacks and Melee Attacks that target an Observer."
        },
        {
          "id": "1451-4bc1-113a-a100",
          "name": "Voice of God",
          "description": "ACTION: An Observer can take a Voice of God ACTION. If they do so, take a Risky Success Roll for the Observer. If the roll is a Failure, the Observer’s Activation ends. If the roll is a Success or Critical Success, pick 1 model (friend or foe), anywhere on the battlefield, that has not been Activated this Turn. The Observer’s Activation then ends, and the other model’s Activation immediately begins."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "8e7d-f104-423a-2b4a",
      "name": "Communicant Anti-Tank Hunter",
      "factionId": "Mercenaries",
      "roles": [
        "Mercenary"
      ],
      "keywords": [
        "STRONG",
        "TOUGH"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+1 DICE",
        "melee": "+1 DICE",
        "armour": "-1",
        "base": "40mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 5
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "5be7-4349-72d7-b75b",
          "name": "Iron Fists",
          "description": "The flesh of a Communicant Anti-Tank Hunter is as hard as iron, which makes their fists deadly weapons in their own right. A Communicant Anti-Tank Hunter can make a Melee Attack with the CLEAVE 2 Keyword even though it does not have a Melee Weapon. In addition, the Off-Hand Weapon modifier applies to the second attack."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "b5ac-1a57-c1d4-3f4c",
      "name": "Witchburner",
      "factionId": "Mercenaries",
      "roles": [
        "Mercenary",
        "Elite"
      ],
      "keywords": [
        "NEGATE FEAR"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "0",
        "melee": "1",
        "armour": "-2",
        "base": "32mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 5
      },
      "min": null,
      "max": 1,
      "abilities": [],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "2d21-7af1-0770-da4c",
      "name": "Sin Eater",
      "factionId": "Mercenaries",
      "roles": [
        "Mercenary"
      ],
      "keywords": [
        "HERETIC",
        "STRONG",
        "TOUGH",
        "FEAR"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "-",
        "melee": "+2 Dice",
        "armour": "-2",
        "base": "50mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 6
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "ed55-ebca-cfc0-4fda",
          "name": "Devour the Guilty",
          "description": "Devour the Guilty ACTION: A Sin Eater can take a Devour the Guilty ACTION. If they do so, pick 1 model (friend or foe) that is within 1\"of the Sin Eater and is mounted on a base that is 40mm or smaller. If the model is an enemy, take a Risky Success Roll for the Sin Eater. If the model is friendly, take a Success Roll for the Sin Eater with +1 DICE. If the roll is a Failure, the Sin Eater’s Activation ends, if it was a Risky Success Roll, and nothing happens if it was a normal Success Roll. If the roll is a Success or a Critical Success, the model you picked is devoured, and the following rules apply to it: Place the model to one side, along with any MARKERS it may have. It is inside the Sin Eater and cannot be affected in any way or carry out any ACTIONS except as described below. While it is in the Sin Eater it is considered to be Down for the purposes of Morale Checks. A Sin Eater can only have 1 devoured model at a time. When it is Activated, it can take a Fight ACTION and must target the Sin Eater. Add -3 DICE to the roll for the Melee Attack, and do not use any of the model’s abilities or any of the special rules for its weapons. If the Sin Eater is taken Out of Action, before removing them from the battlefield, deploy the devoured model within 1\" of the Sin Eater and place it Down. If this is impossible, the model is taken Out of Action. In either case, the Sin Eater is then removed from the battlefield. If a devoured model is still inside a Sin Eater when the game ends, it is considered to have been taken Out of Action. Each time the Sin Eater is Activated, place 1 BLOOD MARKER next to the devoured model. As soon as a devoured model has 6 BLOOD MARKERS, it is immediately taken Out of Action and is no longer considered to be inside the Sin Eater. A Sin Eater that has a devoured model inside it can take a Purge ACTION.If it does so, take a Success Roll for the Sin Eater with +4 DICE. If the roll is a Failure, nothing happens. If the roll is a Success or Critical Success, deploy the devoured model within 1\" of the Sin Eater and place it Down. If this is impossible, the devoured model remains inside the Sin Eater. Once released the model can be Activated normally."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "031a-a689-a059-6278",
      "name": "Mendelist Ammo Monk",
      "factionId": "Mercenaries",
      "roles": [
        "Mercenary"
      ],
      "keywords": [],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "-1 Dice",
        "melee": "-1 Dice",
        "armour": "-",
        "base": "25mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 2
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "a4d6-37b4-32e3-3cde",
          "name": "The Ammunition Sacrement",
          "description": "Ammunition Sacrament ACTION: A Mendelist Ammo Monk can take an Ammunition Sacrament ACTION. If they do so, take a Risky Success Roll for the Mendelist Ammo Monk. If the roll is a Failure, the Mendelist Ammo Monk’s Activation ends. If the roll is a Success or a Critical Success, pick 1 friendly model within 1\" of the Mendelist Ammo Monk and in their Line of Sight, and then pick one of the following Ammunition Sacraments. The Sacrament you pick applies to the model until the end of its next Activation. * Bullet of the Guided Path Sacrament: Add +1 DICE to rolls for Ranged Attacks made by the model. * Cartridge of his Wrath Sacrament: Add the BLAST 2\" and SHRAPNEL Keywords to Ranged Weapons used by the model that do not have the BLAST or FLAMETHROWER Keywords. * Echo of his Word Sacrament: Add +1 INJURY DICE to rolls for Ranged Attacks made by the model ."
        },
        {
          "id": "d1bd-c32a-6365-587a",
          "name": "Faithful Followers",
          "description": "When you Activate a model within 1\" of a Mendelist Ammo Monk, you can also Activate the Mendelist Monk if they have not yet been Activated during the Turn. If you do so, the two models can take their ACTIONS in any order you wish, and you can switch between the two models freely. If the Activation of either model ends (due to a failed Risky Success Roll, for example), the other model can carry on with its Activation normally."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "ce78-bd08-5b44-8e38",
      "name": "Trench Dog",
      "factionId": "Mercenaries",
      "roles": [
        "Mercenary"
      ],
      "keywords": [],
      "stats": {
        "movement": "8\"/Infantry",
        "movementInches": 8,
        "movementType": "Infantry",
        "ranged": "-",
        "melee": "+0 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "min": null,
      "max": 0,
      "abilities": [
        {
          "id": "eb55-7f18-ebac-da25",
          "name": "Four Paws",
          "description": "Add +1 DICE to rolls for a Trench Dog when they Climb, Jump, Fall or take a Dash ACTION."
        },
        {
          "id": "c45a-e0c1-402d-9d28",
          "name": "Pack Loyalty",
          "description": "A Trench Dog has the same Faction Keyword as the model that has it. For example, the owner of a Trench Dog had the NEW ANTIOCH Faction Keyword, then the Trench Dog will have the NEW ANTIOCH Faction Keyword too."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 0,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "381b-1e9b-e962-cb6b",
      "name": "Guard Dog",
      "factionId": "Mercenaries",
      "roles": [],
      "keywords": [],
      "stats": {
        "movement": "8\"/Infantry",
        "movementInches": 8,
        "movementType": "Infantry",
        "ranged": "N/A",
        "melee": "0",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 1
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "13c9-c695-ecd5-08a5",
          "name": "Warning Howl",
          "description": "These dogs warn their masters of impending danger and fight fiercely for their company. Models cannot use the INFILTRATOR Keyword to deploy within 12\" of an enemy Guard Dog. In addition, you do not have to take a Risky Success Roll for a Guard Dog when it charges an enemy model it cannot see, as long as the enemy model is within 4\" of the Guard Dog at the start of the charge."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "a7bd-81f7-6908-8080",
      "name": "Martyrdom Dog",
      "factionId": "Mercenaries",
      "roles": [],
      "keywords": [],
      "stats": {
        "movement": "8\"/Infantry",
        "movementInches": 8,
        "movementType": "Infantry",
        "ranged": "N/A",
        "melee": "0",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 1
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "be32-13c2-d0f6-8eb1",
          "name": "Glorious Purpose",
          "description": "Trench Pilgrims often enthusiastically strap their dogs with explosives so they can partake in a glorious martyrdom operation. A Martyrdom Dog has a Martyrdom Device and can trigger it like an Ecclesiastic Prisoner."
        },
        {
          "id": "9d61-da2f-aed3-1c89",
          "name": "Martyrdom Dog",
          "description": "An Ecclesiastic Prisoner with a Martyrdom Device can take a Trigger Martyrdom Device ACTION. If they do so, take a Success Roll for the model. If the roll is a Failure, nothing happens (you can take this ACTION again for the model in a future Activation). If the roll is a Success or Critical Success, the Martyrdom Device detonates and cannot be used again. When Martyrdom Device detonates, make an Injury Roll for all models within 3\" of the Ecclesiastic Prisoner (friend or foe, including the Ecclesiastic Prisoner). Make the Injury Roll for the Ecclesiastic Prisoner by rolling 4D6 and adding all 4 dice together, and add +1 INJURY DICE to the Injury Rolls for other models that are within 1\" of the Ecclesiastic Prisoner. If an Ecclesiastic Prisoner detonates their Martyrdom Device and survives the game, you must either buy them a new Martyrdom Device for 35 Ducats, or use them without one."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "1331-ddb8-fad3-81a3",
      "name": "Mercy Dog",
      "factionId": "Mercenaries",
      "roles": [],
      "keywords": [],
      "stats": {
        "movement": "8\"/Infantry",
        "movementInches": 8,
        "movementType": "Infantry",
        "ranged": "N/A",
        "melee": "0",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 1
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "e280-c990-4a68-4155",
          "name": "Guardian Angel",
          "description": "Mercy Dogs have and can use a Medi-kit. In addition, when you move a Mercy Dog that starts the move in contact with a friendly model that is Down that is more than 1\" from any enemy models, it can drag the friendly model along with itself. If it does so, halve the Mercy Dog’s Movement Characteristic. A Mercy Dog cannot drag a friendly model when it retreats or charges."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "35df-a599-1589-8c23",
      "name": "Hellhound",
      "factionId": "Mercenaries",
      "roles": [],
      "keywords": [],
      "stats": {
        "movement": "8\"/Infantry",
        "movementInches": 8,
        "movementType": "Infantry",
        "ranged": "N/A",
        "melee": "+1 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 1
      },
      "min": null,
      "max": 1,
      "abilities": [],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "02df-b4d5-3ca5-9a2b",
      "name": "Combat Biologist",
      "factionId": "Mercenaries",
      "roles": [
        "Mercenary"
      ],
      "keywords": [],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "+1 Dice",
        "armour": "-1",
        "base": "32mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 3
      },
      "min": null,
      "max": 1,
      "abilities": [],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "2a1b-d09e-f965-06c9",
      "name": "Disciple of St. Roch",
      "factionId": "Mercenaries",
      "roles": [
        "Mercenary"
      ],
      "keywords": [],
      "stats": {
        "movement": "6\"/Infantery",
        "movementInches": 6,
        "movementType": "Infantery",
        "ranged": "+1 DICE",
        "melee": "+1 DICE",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 2
      },
      "min": null,
      "max": null,
      "abilities": [
        {
          "id": "ba8e-b887-69dd-fad3",
          "name": "Third Party",
          "description": "These mercenaries are not fully official. They are officially condoned by Factory Fortress, but no assurances are made to balance or consistency with rules. They are included here for the benefit of the community. Please only use these factions with permission from all involved players."
        },
        {
          "id": "be68-b5bd-eaeb-a272",
          "name": "Field Sample",
          "description": "Whenever a Disciple of St. Roch is within 1” of a model with at least one BLOOD MARKER on it, it may take a Gather Sample Action. If they do so, take a Risky Success Roll for the model. If the roll is a Failure, the Disciple of St. Roch's Activation ends immediately. If the roll is a Success or a Critical Success, the Disciple extracts a sample from the interesting specimen, gaining a Blessing Marker to represent its newfound understanding of either the enemy’s weapons, or the enemy themselves."
        },
        {
          "id": "67fc-c6de-5fd9-72db",
          "name": "Chemical Conditioning",
          "description": "If a Disciple of St. Roch is wearing Machine Armour, they gain the keyword STRONG and their base size changes to 40mm."
        }
      ],
      "options": [],
      "constraints": [],
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "a674-6866-aab4-a938",
      "name": "Mamluk Faris",
      "factionId": "Mercenaries",
      "roles": [
        "Mercenary"
      ],
      "keywords": [],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+1 Dice",
        "melee": "+1 Dice",
        "armour": "-2",
        "base": "32mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 4
      },
      "min": null,
      "max": null,
      "abilities": [
        {
          "id": "ccc4-bcd4-9e37-39db",
          "name": "Sworn Brethren",
          "description": "When you recruit a Mamluk Faris to your Warband, before adding it to your roster, you can say it will form a FIRETEAM with 1 other model from your Warband that has the ELITE Keyword. Both of the models gain the FIRETEAM Keyword. Note that the Mamluk Faris’s FIRETEAM is in addition to any other FIRETEAMS your Warband can have, and that if a Mamluk Faris is in a FIRETEAM with a model from a New Antioch Warband, then only the model from the New Antioch Warband can use the Concentrated Fire special rule."
        },
        {
          "id": "8651-f216-a441-3fe2",
          "name": "Martial Prowess",
          "description": "Mamluks are disciples of furūsiyya, the knightly discipline passed on through generations, they practice ceaselessly and thus have few equals. The Mamluk’s Greatsword does not have the HEAVY Keyword, and the Jezzail carried by a Mamluk Faris has the ASSAULT Keyword and Shield Combo stipulation."
        },
        {
          "id": "f1be-e3f3-a572-d391",
          "name": "Automaton Destrier",
          "description": "If the scenario you are playing allows Infiltrators to use their special deployment rules, after any Infiltrators have deployed, you can deploy the Mamluk Faris within 1\" of any edge of the battlefield and more than 8\" away from any enemy models."
        }
      ],
      "options": [],
      "constraints": [],
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "3fe9-1530-6fcd-1855",
      "name": "Scripture Guardian",
      "factionId": "Mercenaries",
      "roles": [
        "Mercenary"
      ],
      "keywords": [
        "GOLEM"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+1 Dice",
        "melee": "+1 Dice",
        "armour": "-2",
        "base": "40mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 7
      },
      "min": null,
      "max": null,
      "abilities": [
        {
          "id": "0f36-c292-faa5-8041",
          "name": "Slow",
          "description": "Scripture Guardian has a half Dash distance (i.e. 3”)."
        },
        {
          "id": "c2eb-07dc-8c93-93a6",
          "name": "Vengeful Scripture",
          "description": "The Scripture Guardian reads words from the holy (or unholy!) text it carries. This is an attack ACTION with 18” range, and it can be used in either Melee or as a Ranged attack (though not both during the same Activation). Use Ranged and Melee Characteristics as appropriate. This attack ignores armour and cover. For each BLOOD MARKER the target has, add +1 to the Injury roll. Note that if armed with a melee weapon, both the Melee attack and the use of the Vengeageful Scripture can be used simultaneously."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "1a28-719d-fbd0-5bf0",
      "name": "Goetic Warlock",
      "factionId": "Mercenaries",
      "roles": [
        "Mercenary"
      ],
      "keywords": [
        "DEMONIC",
        "ARTIFICIAL",
        "FEAR"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+1 Dice",
        "melee": "+1 Dice",
        "armour": "-2",
        "base": "40mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 4
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "fa5c-f8eb-7439-8da9",
          "name": "Barbed Embrace",
          "description": "An enemy model within 1\" of a Goetic Warlock cannot take a Retreat ACTION."
        },
        {
          "id": "7e69-bf1d-40d7-7b3c",
          "name": "Goetic Portal",
          "description": "ACTION: A Goetic Warlock can take a Goetic Portal ACTION. If they do so, take a Risky Success Roll for the Goetic Warlock with +1 DICE. If the roll is a Failure, the Goetic Warlock’s Activation ends. If the roll is a Success or Critical Success, you can pick up the Goetic Warlock and deploy them on the battlefield anywhere within 6\" of the location they originally occupied (measured from the centre of its base to the centre of its base). If this is impossible for any reason, the Goetic Warlock must stay in their original position. Note that the Goetic Warlock can redeploy even if they are down or within 1\" of an enemy model (in which case the enemy model cannot make a Melee Attack before the Goetic Warlock is redeployed), and can deploy within 1\" of an enemy model. In addition, if the roll is a Success or Critical Success and the Goetic Warlock is within 1\" of any enemy models mounted on a 32mm base or smaller, then the Goetic Warlock can take 1 of the enemy models with them. If they do so, you must deploy the Goetic Warlock first and then deploy the enemy model within 1\" of the Goetic Warlock. If you cannot deploy the enemy model within 1\" of the Goetic Warlock, then the enemy model stays in its original position."
        },
        {
          "id": "2aad-9b8c-b329-c74e",
          "name": "Goetic Gaze",
          "description": "ACTION: A Goetic Warlock can take a Goetic Gaze ACTION. If they do so, take a Success Roll for the Goetic Warlock. If the roll is a Failure, nothing happens. If the roll is a Success, place 1 BLOOD MARKER next to an enemy model within 24\" of the Goetic Warlock and in their Line of Sight. If the roll is a Critical Success, place 2 BLOOD MARKERS next to an enemy model within 24\" of the Goetic Warlock and in their Line of Sight instead of only 1."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "bc90-d206-2b0d-b743",
      "name": "Homunculus",
      "factionId": "New Antioch",
      "roles": [
        "Troop"
      ],
      "keywords": [],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "+0 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 40,
        "glory": 0
      },
      "min": null,
      "max": null,
      "abilities": [
        {
          "id": "6198-e982-c9a1-cd51",
          "name": "Pummeling Blows",
          "description": "A Takwin Homunculus can make a Melee Attack even though it does not have any Melee Weapons."
        },
        {
          "id": "aa0f-ec92-baa4-b3b3",
          "name": "Artificial Life",
          "description": "Add -1 DICE to Injury Rolls for a Tawkin Homunculus."
        },
        {
          "id": "da6d-9feb-77fd-76ee",
          "name": "Re-creation",
          "description": "If a Takwin Homunculus is killed in the post-battle sequence, you do not have to remove it from your roster. Instead, you can spend 40 ducats in the following Quartermaster Step to leave it on the Roster."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "9e87-e971-61ba-870c",
      "name": "Lieutenant",
      "factionId": "New Antioch",
      "roles": [
        "Elite",
        "Leader"
      ],
      "keywords": [
        "NEW ANTIOCH",
        "TOUGH"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+2 Dice",
        "melee": "+2 Dice",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 70,
        "glory": 0
      },
      "min": 1,
      "max": 1,
      "abilities": [
        {
          "id": "8e11-d71b-f31f-4a42",
          "name": "On my Command!",
          "description": "ACTION: The Lieutenant orders their warband to stop shooting, forcing the enemy to move first. To represent this, a Lieutenant can take a Hold Your Fire! ACTION. If they do so, pick 1 enemy model that is in the Lieutenant’s Line of Sight and that the opponent is allowed to Activate. The Lieutenant’s Activation then ends, and the opponent must Activate the model you picked."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "min",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "2341-5d66-9395-bcf5",
      "name": "Trench Cleric",
      "factionId": "New Antioch",
      "roles": [
        "Elite"
      ],
      "keywords": [
        "NEW ANTIOCH",
        "NEGATE FEAR"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+1 Dice",
        "melee": "+1 Dice",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 60,
        "glory": 0
      },
      "min": 0,
      "max": 1,
      "abilities": [
        {
          "id": "0eb3-b47c-4f32-e978",
          "name": "Away, Serpents!",
          "description": "Select any enemy within 12” of the Priest and take a RISKY ACTION (targeting models on 40mm or larger bases incur -1 DICE penalty to this roll). If successful, the enemy model goes Down immediately, slithering on its belly like a snake."
        },
        {
          "id": "3072-0ff0-3ea9-e748",
          "name": "Onward Christian Soldiers!",
          "description": "Friendly NEW ANTIOCH models within 8\" of a Trench Cleric have the NEGATE FEAR Keyword."
        },
        {
          "id": "6b25-bd66-9cec-fb90",
          "name": "God is With Us!",
          "description": "ACTION: A Trench Cleric can take a God is With Us! ACTION. If they do so, take a Risky Success Roll for the Trench Cleric. If the roll is a Failure, nothing happens, and the Trench Cleric’s Activation ends. If the roll is a Success or a Critical Success, you can place 1 BLESSING MARKER next to the Trench Cleric or a friendly model within 6\" of the Trench Cleric."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "min",
          "value": 0,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "25dc-fcf4-2e75-a4b9",
      "name": "Yeoman",
      "factionId": "New Antioch",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "NEW ANTIOCH"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "+0 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 30,
        "glory": 0
      },
      "min": null,
      "max": null,
      "abilities": [],
      "options": [],
      "constraints": [],
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "1edc-6a6e-cd50-f841",
      "name": "Sniper Priest",
      "factionId": "New Antioch",
      "roles": [
        "Elite"
      ],
      "keywords": [
        "NEW ANTIOCH",
        "CLERGY"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+2 Dice",
        "melee": "-1 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 50,
        "glory": 0
      },
      "min": null,
      "max": 2,
      "abilities": [
        {
          "id": "9abe-b135-9901-68d4",
          "name": "Aim",
          "description": "ACTION: A Sniper Priest can take an Aim ACTION. If they do so, take a Risky Success Roll for the model and add +2 DICE to the roll. If the roll is a Failure, nothing happens and the Sniper Priest’s Activation ends. If the roll is a Success or Critical Success, for the rest of the Activation, add +2 DICE to the Success Rolls for Ranged Attacks that are made by the Sniper Priest."
        },
        {
          "id": "100a-86b4-5508-6fd3",
          "name": "Absolute Faith",
          "description": "Sniper Priests do not use their eyesight to aim at their enemies. The opposing player cannot spend BLOOD MARKERS to add -DICE to a Ranged Attack by a Sniper Priest."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "0aa8-8798-1d64-7cc4",
      "name": "Shocktrooper",
      "factionId": "New Antioch",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "NEW ANTIOCH"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "+1 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 45,
        "glory": 0
      },
      "min": 0,
      "max": 5,
      "abilities": [
        {
          "id": "c258-3050-2e8f-c05a",
          "name": "Shock Charge",
          "description": "When you roll the Charge Bonus for a Shock Trooper, roll 1 extra D6 and use the single highest die to determine the bonus."
        },
        {
          "id": "767a-8a41-50ae-1621",
          "name": "Assault Drill",
          "description": "You can ignore the Effect of the HEAVY Keyword for 1 Melee Weapon that a Shock Trooper has. A Shock Trooper still cannot have more than 1 Weapon (of any type) with the HEAVY Keyword."
        },
        {
          "id": "1d6a-335b-09ab-0d3a",
          "name": "Axe Mastery",
          "description": "These fierce warriors often lead their charges with a wild swing, before smashing into their opponents for a bloody brawl. On a successful charge, they may immediately make a melee attack with one equipped axe. This is in addition to any other attacks."
        },
        {
          "id": "c2f7-dd44-cc90-5d72",
          "name": "Shield Bash",
          "description": "Varangian Guards may use any Shield as an off-hand weapon with -1 INJURY DICE. It functions otherwise like a Trench Club."
        },
        {
          "id": "2513-db50-fb6b-e213",
          "name": "Indomitable",
          "description": "These warriors are immune to FEAR."
        },
        {
          "id": "fd74-ad2b-c80b-3e0b",
          "name": "Weapon Familiarity",
          "description": "Varangian Guards ignore the keyword HEAVY on all axes, and treat two-handed axes as having the Shield Combo indicator. They lose Shock Charge if they equip a shield together with a two-handed axe. They can still carry only one HEAVY item, unless they are STRONG."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 5,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "min",
          "value": 0,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "7b50-3c72-1794-64bb",
      "name": "Engineer",
      "factionId": "New Antioch",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "NEW ANTIOCH"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "+1 Dice",
        "armour": "-2",
        "base": "25mm"
      },
      "cost": {
        "ducats": 80,
        "glory": 0
      },
      "min": null,
      "max": 2,
      "abilities": [
        {
          "id": "2aa0-f08e-8ff5-a137",
          "name": "Defuse Mine",
          "description": "When you move a Combat Engineer into contact with a Marker or terrain piece with the MINED Keyword, you can say the Combat Engineer will halt and try to defuse the mine before it detonates. If you do so, take a Risky Success Roll for the model. If the roll is a Failure, the mine detonates anyway and the Combat Engineer’s Activation ends. If the roll is a Success or a Critical Success, the mine does not detonate and the Marker or terrain piece loses the MINED Keyword. A model that sets a mine on a terrain piece can defuse the mine automatically if it moves into contact with the terrain piece (do not take a Risky Success Roll)."
        },
        {
          "id": "f039-f03d-2c1c-4d58",
          "name": "Battlefield Demolition",
          "description": "You can ignore the Effect of the HEAVY Keyword for 1 Satchel Charge that a Combat Engineer has. A Combat Engineer still cannot have more than 1 Weapon (of any type) with the HEAVY Keyword."
        },
        {
          "id": "2b71-61c6-9534-4129",
          "name": "Fortify",
          "description": "ACTION: A Combat Engineer can take a Fortify ACTION. If they do so, take a Risky Success Roll for the Combat Engineer. If the roll is a Failure, the Combat Engineer’s Activation ends. If the roll is a Success or a Critical Success, the Combat Engineer has the COVER Keyword until they move away from their current position."
        },
        {
          "id": "f5bd-98e6-fece-1e3d",
          "name": "Set Mine",
          "description": "A Combat Engineer can take a Set Mine ACTION if they are in contact with a terrain piece that measures up to 8” by 8” that doesn’t have the MINED Keyword. If they do so, take a Success Roll for the model and add +2 DICE to the roll. If the roll is a Failure, nothing happens. If the roll is a Success or a Critical Success, the terrain piece gains the MINED Keyword."
        },
        {
          "id": "2bb9-7311-ef80-96f4",
          "name": "Negate Mined",
          "description": ""
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "be61-1a63-4154-9a20",
      "name": "Combat Medic",
      "factionId": "New Antioch",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "NEW ANTIOCH"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "+0 Dice",
        "armour": "-1",
        "base": "25mm"
      },
      "cost": {
        "ducats": 40,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "6f5f-6393-4e08-500d",
          "name": "Convent Conditioning",
          "description": "The Medic is immune to FEAR."
        },
        {
          "id": "195c-d9a0-91c2-1b40",
          "name": "Finish the Fallen",
          "description": "Due their knowledge of anatomy and physiology, medics are experts at inflicting debilitating injuries and excruciating pain. Unless the target has the Keyword DEMONIC or BLACK GRAIL, add +1 BONUS DICE to any injury rolls the medic makes in melee against opponents who are Down."
        },
        {
          "id": "a725-489e-1a8d-8cc1",
          "name": "Expert Medic",
          "description": "Add +2 DICE to the Risky Success Roll when a Combat Medic carries out a Treat ACTION with their Medi-kit."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "aeaa-7023-3585-4664",
      "name": "Heavy Infantry",
      "factionId": "New Antioch",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "NEW ANTIOCH",
        "STRONG"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+1 Dice",
        "melee": "+0 Dice",
        "armour": "-2",
        "base": "40mm"
      },
      "cost": {
        "ducats": 85,
        "glory": 0
      },
      "min": null,
      "max": 3,
      "abilities": [],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 3,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "e023-b74f-24ed-98b8",
      "name": "Trench Dog",
      "factionId": "New Antioch",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "NEW ANTIOCH"
      ],
      "stats": {
        "movement": "8\"/Infantry",
        "movementInches": 8,
        "movementType": "Infantry",
        "ranged": "0",
        "melee": "0",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 35,
        "glory": 0
      },
      "min": null,
      "max": null,
      "abilities": [
        {
          "id": "81b5-2b0d-8857-0631",
          "name": "Four Paws",
          "description": "Dogs may take any Dash ACTION or jump/Diving Charge ACTION with bonus +1 DICE. They cannot climb sheer surfaces."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 0,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "d52f-86b4-bf67-37b5",
      "name": "Guard Dog",
      "factionId": "New Antioch",
      "roles": [],
      "keywords": [],
      "stats": {
        "movement": "8\"/Infantry",
        "movementInches": 8,
        "movementType": "Infantry",
        "ranged": "0",
        "melee": "0",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "028d-42bd-5416-a4df",
      "name": "Mercy Dog",
      "factionId": "New Antioch",
      "roles": [],
      "keywords": [],
      "stats": {
        "movement": "8\"/Infantry",
        "movementInches": 8,
        "movementType": "Infantry",
        "ranged": "0",
        "melee": "0",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "min": null,
      "max": 2,
      "abilities": [],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "e193-81ee-658c-bbc8",
      "name": "Attack Dog",
      "factionId": "New Antioch",
      "roles": [],
      "keywords": [],
      "stats": {
        "movement": "8\"/Infantry",
        "movementInches": 8,
        "movementType": "Infantry",
        "ranged": "N/A",
        "melee": "+1 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "min": null,
      "max": null,
      "abilities": [],
      "options": [],
      "constraints": [],
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "4fca-7401-fc43-e298",
      "name": "Crimson Communicant",
      "factionId": "New Antioch",
      "roles": [
        "Elite"
      ],
      "keywords": [
        "NEW ANTIOCH",
        "STRONG",
        "TOUGH"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "-1 Dice",
        "melee": "+1 Dice",
        "armour": "0",
        "base": "40mm"
      },
      "cost": {
        "ducats": 75,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "f4c5-9d3c-ca75-7b30",
          "name": "Strength through Pain",
          "description": "Add +1 DICE to the Crimson Communicant’s Melee characteristic for each BLOOD MARKER currently placed next to it.In addition, your opponent cannot spend a Crimson Communicant’s BLOOD MARKERS to add - DICE to a Success Roll for a Fight ACTION."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "8df3-9e37-23c4-8cff",
      "name": "Takwin Homunculus",
      "factionId": "Trench Crusade",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "ARTIFICIAL"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "+0 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "min": null,
      "max": null,
      "abilities": [
        {
          "id": "126a-355e-a21e-b08f",
          "name": "Re-creation",
          "description": "If a Takwin Homunculus is killed in the post-battle sequence, you do not have to remove it from your roster. Instead, you can spend 40 ducats in the following Quartermaster Step to leave it on the Roster."
        },
        {
          "id": "21ca-3993-3439-2161",
          "name": "Artificial Life",
          "description": "Add -1 DICE to Injury Rolls for a Tawkin Homunculus."
        },
        {
          "id": "3ae7-9f60-8251-a9f1",
          "name": "Pummeling Blows",
          "description": "A Takwin Homunculus can make a Melee Attack even though it does not have any Melee Weapons."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "sourceFile": "Trench Crusade.gst"
    },
    {
      "id": "8e45-5a5a-379e-22ce",
      "name": "Homunculus",
      "factionId": "Trench Pilgrims",
      "roles": [
        "Troop"
      ],
      "keywords": [],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "+0 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 40,
        "glory": 0
      },
      "min": null,
      "max": null,
      "abilities": [
        {
          "id": "f404-f14d-e065-add0",
          "name": "Pummeling Blows",
          "description": "A Takwin Homunculus can make a Melee Attack even though it does not have any Melee Weapons."
        },
        {
          "id": "e583-3b63-fc31-fae2",
          "name": "Artificial Life",
          "description": "Add -1 DICE to Injury Rolls for a Tawkin Homunculus."
        },
        {
          "id": "0b5f-2a17-9efd-28c2",
          "name": "Re-creation",
          "description": "If a Takwin Homunculus is killed in the post-battle sequence, you do not have to remove it from your roster. Instead, you can spend 40 ducats in the following Quartermaster Step to leave it on the Roster."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "c7b8-f35d-edca-e0c4",
      "name": "Castigator",
      "factionId": "Trench Pilgrims",
      "roles": [
        "Elite"
      ],
      "keywords": [
        "PILGRIM"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+1 Dice",
        "melee": "+1 Dice",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 50,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "3334-ac1d-eda1-a0e1",
          "name": "Whip of God",
          "description": "Unlike other models, a Castigator is allowed to attack friendly models with melee attacks within 1”. They can do this without declaring a charge. Each time the Castigator takes a friendly model Out of Action with a melee attack, set a die aside in a pool as the act of piety inspires the troops. The next time your warband makes a Morale roll, add an amount of +DICE to that roll equal to the amount of dice in the pool and empty it."
        },
        {
          "id": "9a0d-9964-aee2-78c4",
          "name": "Enforced Orthodoxy",
          "description": "At any point during its Activation, a Castigator may take a RISKY ACTION with +1 DICE. If successful, all friendly models that are Down and within 8” of the Castigator may immediately stand up at no penalty or cost."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "a1dc-6afc-2a7c-d293",
      "name": "Trench Pilgrim",
      "factionId": "Trench Pilgrims",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "PILGRIM"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+0 Dice",
        "melee": "+0 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 30,
        "glory": 0
      },
      "min": null,
      "max": null,
      "abilities": [
        {
          "id": "87c7-8ddb-b2bb-5b27",
          "name": "Resurrection",
          "description": "If a Trench Pilgrim is killed after a game (▶ see Campaign in the Trench Crusade Digital Rulebook), they can be resurrected in the following Quartermaster Step as a Martyr Penitent with the Martyr Penitent Profile for a cost 45 ducats. Add -1 INJURY DICE to Injury Rolls for a Martyr Penitent. A Martyr Penitent keeps their Battlekit and Zealot Strength if the ability was purchased, but loses any Scars, Experience, and Advancements. Martyrdom Pills have no effect on a Martyr Penitent model"
        }
      ],
      "options": [],
      "constraints": [],
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "53e3-a873-a192-6a91",
      "name": "Communicant",
      "factionId": "Trench Pilgrims",
      "roles": [
        "Elite"
      ],
      "keywords": [
        "PILGRIM",
        "STRONG",
        "TOUGH",
        "LIMITED POTENTIAL",
        "REGENERATE 1",
        "NEGATE SHRAPNEL",
        "NEGATE FEAR",
        "NEGATE GAS"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "-3 Dice",
        "melee": "+2 Dice",
        "armour": "0",
        "base": "40mm"
      },
      "cost": {
        "ducats": 100,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "b241-36e1-f345-a731",
          "name": "Bodyguard",
          "description": "If a friendly PILGRIM model within 1\" of a Communicant is hit by a Ranged Attack or Melee Attack, you can say that the Communicant will take the hit. If you do so, make an Injury Roll for the Communicant instead of the original target. This ability cannot be used against attacks that have the BLAST Keyword."
        },
        {
          "id": "d090-0fbb-4251-618c",
          "name": "The Communicant Cross",
          "description": "A sacred cross is nailed on the face of the Communicant. This counts as an Iron Capirote, Combat Helmet and a Gas Mask (Immune to SHRAPNEL, GAS, and FEAR)."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "d3bd-024c-681c-eb6c",
      "name": "War Prophet",
      "factionId": "Trench Pilgrims",
      "roles": [
        "Elite",
        "Leader"
      ],
      "keywords": [
        "PILGRIM"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+2 Dice",
        "melee": "+2 Dice",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 80,
        "glory": 0
      },
      "min": 1,
      "max": 1,
      "abilities": [
        {
          "id": "8160-6b76-eb5c-dd34",
          "name": "Day of His Wrath",
          "description": "A Cavalcade of the Tenth Plague War Prophet can take a Day of his Wrath ACTION. If they do so, take a Risky Success Roll for the model. If the roll is a Failure the War Prophet’s Activation ends immediately. If the roll is a Success, make an Injury Roll with the IGNORE ARMOUR Keyword for 1 enemy model within 3\" of the War Prophet. If the roll is a Critical Success, make an Injury Roll with +1 INJURY DICE and the IGNORE ARMOUR Keyword for 1 enemy model within 3\" of the War Prophet."
        },
        {
          "id": "9ec3-b93c-1646-ccec",
          "name": "Loudspeakers",
          "description": "A War Prophet can take a Loudspeakers ACTION. If they do so, take a Risky Success Roll for the model and add +2 DICE to the roll. If the roll is a Failure, the War Prophet’s Activation ends immediately. If the roll is a Success or Critical Success, you can move all friendly models within 8\" of the War Prophet up to 3\". They must end the move as close as possible to the nearest enemy model that was visible to them at the start of the move. This move can be used to bring a model within 1\" of an enemy model in which case the model counts as charging. If no enemy models are visible, they can move normally."
        },
        {
          "id": "f2b4-37b5-8a5a-ac9f",
          "name": "Memento Mori",
          "description": "The War Prophet is touched by a higher power, and the revealed truth allows them a degree of protection against premature death. The first time the War Prophet suffers an Out of Action result on the Injury Table, it is treated as a No Effect result instead. A War Prophet cannot have the TOUGH Keyword."
        },
        {
          "id": "4458-54c7-2ee5-90df",
          "name": "Laying on Hands",
          "description": "A War Prophet can take a Laying on of Hands ACTION. If they do so, take a Success Roll for the model. If the roll is a Failure, nothing happens. If the roll is a Success, remove 1 BLOOD MARKER from a friendly model within 6\" of the War Prophet. If the roll is a Critical Success, remove 3 BLOOD MARKERS from a friendly model within 6\" of the War Prophet instead of only 1. The War Prophet can use this ACTION to heal themselves."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "min",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "bf78-c847-c302-fec0",
      "name": "Ecclesiastic Prisoner",
      "factionId": "Trench Pilgrims",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "PILGRIM"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "N/A",
        "melee": "-1 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "min": null,
      "max": null,
      "abilities": [
        {
          "id": "f345-3b64-dcf0-4daf",
          "name": "Mad Dash",
          "description": "Ecclesiastic Prisoner can add +1 DICE to their Dash ACTION"
        }
      ],
      "options": [],
      "constraints": [],
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "951c-0a8e-c90d-6c3c",
      "name": "Stigmatic Nun",
      "factionId": "Trench Pilgrims",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "PILGRIM",
        "REGENERATE 1"
      ],
      "stats": {
        "movement": "8\"/Infantry",
        "movementInches": 8,
        "movementType": "Infantry",
        "ranged": "+1 Dice",
        "melee": "+1 Dice",
        "armour": "0",
        "base": "25mm"
      },
      "cost": {
        "ducats": 50,
        "glory": 0
      },
      "min": null,
      "max": 4,
      "abilities": [
        {
          "id": "39e0-2444-2fb0-c9ae",
          "name": "Blessed Stigmata",
          "description": "Each time you remove a BLOOD MARKER from a Stigmatic Nun because of the REGENERATE 1 Keyword, place 1 BLESSING MARKER next to the Stigmatic Nun."
        },
        {
          "id": "c190-c883-b2da-b8b6",
          "name": "Agile",
          "description": "Stigmatic Nuns may take any Dash ACTION or jump/climb/Diving Charge ACTION with +1 DICE."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 4,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "3d17-425a-2ba2-daf2",
      "name": "Anchorite",
      "factionId": "Trench Pilgrims",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "PILGRIM"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "N/A",
        "melee": "+2 Dice",
        "armour": "-3",
        "base": "60mm"
      },
      "cost": {
        "ducats": 140,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "ca00-3c87-ba97-103d",
          "name": "Broken on the Wheel",
          "description": "Broken on the Wheel: At the start of each game, before deployment, you can say that one Trench Pilgrim or Ecclesiastic Prisoner will be broken on the wheel to show their piety and devotion. The model you choose is permanently removed from your Warband, but in a campaign you can redistribute their Battlekit to other models that would be allowed to have it in the following Quartermaster Step. Injuries that would be inflicted on the Anchorite Shrine are instead inflicted on its unfortunate victim, until the victim finally passes away. This is represented by the following special rules, which apply to the Anchorite Shrine until it suffers an Out of Action result on the Injury Table: * It has an Armour Characteristic of 0 and does not have the NEGATE SHRAPNEL and TOUGH Keywords. * It treats Down results as Minor Hit results. * The first time the Anchorite Shrine suffers an Out of Action result on the Injury Table, it is treated as a No Effect result. When this happens, any BLOOD MARKERS on the Anchorite Shrine are removed, and from then on, these special rules no longer apply to the model, it has an Armour Characteristic of -3, and gains the NEGATE SHRAPNEL and TOUGH Keywords (the TOUGH Keyword will apply the next time the Anchorite Shrine suffers an Out of Action result on the Injury Table)"
        },
        {
          "id": "c845-81eb-cd8e-9498",
          "name": "Symphony of Slaughter",
          "description": "An Anchorite Shrine is armed with two 1-Handed Melee Weapons (the Catherine Wheel and Bonebreaker Mace). When it makes a Melee Attack, it can either attack once using either its Catherine Wheel or the Bonebreaker Mace, or twice, first with the Catherine Wheel and second with its Bonebreaker Mace (the Off-Hand Weapon modifier applies to the attack made with the Bonebreaker Mace)."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "b489-b17e-d6dd-1975",
      "name": "Chieftain",
      "factionId": "Trench Pilgrims",
      "roles": [
        "Elite",
        "Leader"
      ],
      "keywords": [],
      "stats": {
        "movement": "6\"/Infantery",
        "movementInches": 6,
        "movementType": "Infantery",
        "ranged": "+2 DICE",
        "melee": "+2 DICE",
        "armour": "0",
        "base": "32mm"
      },
      "cost": {
        "ducats": 80,
        "glory": 0
      },
      "min": 1,
      "max": 1,
      "abilities": [
        {
          "id": "5c1a-f3d5-6315-5ce2",
          "name": "Foretold",
          "description": "The Chieftain has been spoken to by the Gods in a dream and knows the day they will die. The first time the Chieftain suffers an Out of Action result on the Injury Table, it is treated as a No Effect result instead."
        },
        {
          "id": "e163-884b-a1e0-eef3",
          "name": "War horn",
          "description": "Once per game, the Chieftain may blow their war horn to announce now is the time to strike. For the rest of the turn, your warband adds +1 DICE to Risky Success Roll when taking a Dash ACTION, and rolls 1 extra D6 when rolling the Charge Bonus, using the single highest die to determine the bonus."
        },
        {
          "id": "c7b7-69bf-7306-af6a",
          "name": "Lead by example",
          "description": "Your opponent cannot spend the BLOOD MARKERS on any model within 3” of the Chieftain (including the Chieftain themselves), except for Injury rolls."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "min",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "da01-36e4-caeb-2440",
      "name": "Huscarl",
      "factionId": "Trench Pilgrims",
      "roles": [
        "Elite"
      ],
      "keywords": [
        "STRONG"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "+1 DICE",
        "melee": "+1 DICE",
        "armour": "-2",
        "base": "40mm"
      },
      "cost": {
        "ducats": 120,
        "glory": 0
      },
      "min": null,
      "max": 3,
      "abilities": [
        {
          "id": "e54a-214b-36ef-b598",
          "name": "Bodyguard",
          "description": "If a friendly PILGRIM model within 1\" of a Huscarl is hit by a Ranged Attack or Melee Attack, you can say that the Huscarl will take the hit. If you do so, make an Injury Roll for the Huscarl instead of the original target. This ability cannot be used against attacks that have the BLAST Keyword."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 3,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "822e-7e28-b8de-1cfc",
      "name": "Captive Giant",
      "factionId": "Trench Pilgrims",
      "roles": [
        "Troop"
      ],
      "keywords": [
        "STRONG",
        "TOUGH",
        "FEAR"
      ],
      "stats": {
        "movement": "6\"/Infantry",
        "movementInches": 6,
        "movementType": "Infantry",
        "ranged": "N/A",
        "melee": "+2 DICE",
        "armour": "-3",
        "base": "60mm"
      },
      "cost": {
        "ducats": 140,
        "glory": 0
      },
      "min": null,
      "max": 1,
      "abilities": [
        {
          "id": "1d5b-bd14-4508-be83",
          "name": "Frost Breath",
          "description": "As an Action, the Captive Giant can use its lethally cold breath to attempt to freeze any model (friend or foe) within 8”. If the roll is a Failure, nothing happens. If the roll is a Success or a Critical Success, the targeted model is instantly Downed, but it is unable to gain any BLOOD MARKER until the start of its next activation."
        },
        {
          "id": "49fb-e233-f61a-f2ed",
          "name": "Untamed",
          "description": "After Deployment, before the start of the game, designate another friendly model without the ELITE keyword and within 4” of the Captive Giant to be the Giant’s handler. At the beginning of its activation, if the handler is not within 4” of the Captive Giant, it follows the rules of Berserk for the turn. If instead the handler is dead at the beginning of the Giant’s activation, or if you did not or were unable to designate a handler at all, it follows the rules of Berserk for the rest of the game."
        },
        {
          "id": "8432-6fd1-6413-cef8",
          "name": "Berserk",
          "description": "The Captive Giant runs through the following actions in the order they’re listed below: - Movement: The Giant must move towards the closest visible model (friend or foe), charging if it is able to reach them with a charge action, and attempting a dash action after its move if not. If it begins its Activation Down it must attempt to stand. - Frost Breath: If there is a visible model (friend or foe) within 8” of the Giant, it must attempt to use its Frost Breath action on the closest model. - Melee Attacks: If the Giant is in melee range (i.e, within 1”) of any model, it must use its melee action to attack it, regardless of whether it is friend or foe. If two more more models are exactly the same distance and visible to the Captive Giant, use a dice roll to randomly determine which model the Giant targets."
        }
      ],
      "options": [],
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "sourceFile": "Trench Pilgrims.cat"
    }
  ],
  "weapons": [
    {
      "id": "d488-9020-4ba3-a3a2",
      "name": "Fire Shield",
      "type": "Shield",
      "range": "-",
      "keywords": [
        "-1 INJURY MODIFIER",
        "NEGATE FIRE"
      ],
      "rules": "Fire Shield: Add -1 INJURY DICE to Injury Rolls for attacks with the FIRE Keyword that targets a model that has a Fire Shield, even if the attacking weapon has the IGNORE ARMOUR Keyword.",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "7cac-e423-0e4d-b763",
      "name": "Broken Crown",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "Each time the model with the Broken Crown is Activated, before carrying out any ACTIONS with the model, place 1 INFECTION MARKER next to each enemy model within 1\" of the model with the Broken Crown.",
      "cost": {
        "ducats": 25,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "cc13-67a7-5431-2fdd",
      "name": "Urn of Bitter Ashes",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "Add -1 DICE to the roll for Ranged Attacks that target a model that has the Urn of Bitter Ashes or that is within 3\" of the model with the Urn of Bitter Ashes",
      "cost": {
        "ducats": 40,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "ac98-5942-087b-9eaf",
      "name": "Grail Devotee",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "Up to 2 models can have up to 2 Grail Devotees each. Add +1 INJURY MODIFIER to Injury Rolls for Melee attacks made by the model for each Grail Devotee that it has. Each Grail Devotee can be represented by a model if you wish. Place them adjacent to the model that they are following but note that Grail Devotees are not treated as models for any rules purposes, just move them out of the way if they get in the way of a “proper” model.",
      "cost": {
        "ducats": 0,
        "glory": 2
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "fe5c-8b4d-7a52-73d0",
      "name": "Compound Eyes Helmet",
      "type": "Battlekit",
      "range": "",
      "keywords": [
        "NEGATE SHRAPNEL"
      ],
      "rules": "Enhanced Vision: Add +1 DICE to the Success Roll of Ranged Attacks taken for a model that has a Compound Eyes Helmet.",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 3,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "b064-784f-a535-ca37",
      "name": "Knight Companion of the Bladed Fly",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "Add +1 DICE to Melee.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "54ac-2422-34c4-3bad",
      "name": "Knight Companion of the Distant Fly",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "Add +1 DICE to Ranged.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "ef69-c253-5f0f-b3ad",
      "name": "Knight of the Rotten Cross",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "You can purchase 1 Ranged Weapon or 1 Melee Weapon from the New Antioch or Heretic Legions Armoury Tables for this model. Any stipulations that apply to the Weapon must be followed (so there is no point in taking a Weapon that can only be used by a specific model). The Weapon cannot be sold or reallocated in the Quartermaster Step of the Campaign Phase (▶ see Campaign in the Trench Crusade Digital Rulebook), but can be replaced if it is lost for any reason.",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "fec5-bb13-792b-8199",
      "name": "Claimed: Automatic Pistol",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use an Automatic Pistol as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "707f-beaa-1d76-4cd8",
      "name": "Claimed: Semi-automatic Rifle",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Semi-automatic Rifle as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "dc09-d86d-ae34-41d2",
      "name": "Claimed: Automatic Shotgun",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use an Automatic Shotgun as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "b8f0-aa97-3937-9647",
      "name": "Claimed: Automatic Rifle",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use an Automatic Rifle as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "736b-79f3-9bb1-bf1d",
      "name": "Claimed: Sniper Rifle",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Sniper Rifle as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "e886-7dfb-33ed-95f7",
      "name": "Claimed: Grenade Launcher",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Grenade Launcher as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "1637-5050-6752-0717",
      "name": "Claimed: Incendiary Grenades",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use Incendiary Grenades as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "7915-ab6a-b727-3c5c",
      "name": "Claimed: Submachine Gun",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Submachine Gun as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "fe45-0d6a-cf4a-347f",
      "name": "Claimed: Machine Gun",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Machine Gun as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "5945-b33c-aca6-8fb1",
      "name": "Claimed: Satchel Charge",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Satchel Charge as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "52a1-3eb7-ed92-8636",
      "name": "Claimed: Grenades",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use Grenades as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "0838-7d47-0d0b-4747",
      "name": "Claimed: Heavy Flamethrower",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Heavy Flamethrower as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "481a-d408-3699-d802",
      "name": "Claimed: Heavy Shotgun",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Heavy Shotgun as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "d8f9-a2d9-d49f-e65d",
      "name": "Claimed: Flamethrower",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Flamethrower as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "6883-6f33-5604-4f1f",
      "name": "Claimed: Automatic Shotgun",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use an Automatic Shotgun as though it were from the Heretic Legions.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "7901-7b55-fd13-1c06",
      "name": "Claimed: Blasphemous Staff",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Blasphemous Staff as though it were from the Heretic Legions.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "c50d-32c4-ff0e-12bf",
      "name": "Claimed: Automatic Rifle",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use an Automatic Rifle as though it were from the Heretic Legions.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "b911-6e05-ae16-b799",
      "name": "Claimed: Silenced Pistol",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Silent Pistol as though it were from the Heretic Legions.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "6d21-dbbd-d6e6-c101",
      "name": "Claimed: Machine Gun",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Machine Gun as though it were from the Heretic Legions.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "b401-8a8b-c3fa-80dc",
      "name": "Claimed: Machine Gun",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Machine Gun as though it were from the Heretic Legions.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "6ced-b27b-7642-41e8",
      "name": "Claimed: Incendiary Grenades",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use Incendiary Grenades as though it were from the Heretic Legions.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "aca9-4bdb-5e73-ad58",
      "name": "Claimed: Submachine Gun",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Submachine Gun as though it were from the Heretic Legions.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "26d3-c5f2-dfc5-6cc9",
      "name": "Claimed: Grenades",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use Grenades as though it were from the Heretic Legions.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "717c-569e-8f9e-3985",
      "name": "Claimed: Grenade Launcher",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Grenade Launcher as though it were from the Heretic Legions.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "4e54-317d-3391-e00d",
      "name": "Claimed: Semi-Automatic Rifle",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Semi-Automatic Rifle as though it were from the Heretic Legions.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "36f9-cbf1-7f8b-474a",
      "name": "Claimed: Flamethrower",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Flamethrower as though it were from the Heretic Legions.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "f73e-b97e-1b7b-0d76",
      "name": "Claimed: Heavy Flamethrower",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Heavy Flamethrower as though it were from the Heretic Legions.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "f855-3a79-f6c4-c14d",
      "name": "Claimed: Anti-Materiel Rifle",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use an Anti-Materiel Rifle as though it were from the Heretic Legions.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "a591-57b1-8abb-3426",
      "name": "Claimed: Sacrificial Blade",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Sacrificial Blade as though it were from the Heretic Legions.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "fab2-a4e3-5baf-e68b",
      "name": "Claimed: Hellblade",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Hellblade as though it were from the Heretic Legions.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "1780-92d2-3e63-3c71",
      "name": "Plague Almoner",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "If you convert an Injury Roll into a Bloodbath Roll for an attack made by this Plague Knight, the cost in BLOOD MARKERS and/or INFECTION MARKERS of the Bloodbath Roll is reduced by 1.",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "7fd0-a83c-445b-40ff",
      "name": "Mind Linked",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is in a fireteam with a Homunculus.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "8972-bbdb-d18e-bbbc",
      "name": "Miasma of Pestilence",
      "type": "Spell (Cost 2)",
      "range": "6\"",
      "keywords": [],
      "rules": "You must take a Cast Spell ACTION with the spellcaster in order for it to cast this spell. If you do so, add -1 DICE to Success Rolls for Ranged Attacks that target a friendly model within 6” of the spellcaster (including the spellcaster themselves) until the end of the Turn.",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "3ba1-5e5a-3d9e-1042",
      "name": "Mother's Call",
      "type": "Spell (Cost 1)",
      "range": "8\"",
      "keywords": [],
      "rules": "Once per Turn pick 1 Ravenous that is within 8” of the spellcaster and carry out one of the following Commands with them. Carrying out a Command does not stop the Ravenous from being Activated in the same Turn (before or after the Command was issued). - Feast Command: The Ravenous carries out a Ravenous Infection ACTION. Place an additional INFECTION MARKER next to the target if the Risky Success Roll is a Success or Critical Success. - Fight Command: The Ravenous carries out a Melee Attack. - Move Command: The Ravenous carries out a Move (it cannot Charge or Retreat).",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "bc8e-8a8a-1a69-20fc",
      "name": "Vomitus",
      "type": "Spell (Cost 1-3)",
      "range": "8\"",
      "keywords": [],
      "rules": "You must take a Cast Spell ACTION with the spellcaster in order for it to cast this spell. If you do so, the spellcaster can make a Ranged Attack. Do not make a Success Roll for the attack. Instead, measure a straight line 1mm wide and up to 8” long from the attacking model to a point on the ground or a model’s base. The line stops if it reaches a terrain piece that is taller than the model making the Attack. Make an Injury Roll for every model (friend or foe) that is touched by the line, apart from the attacking model itself. This attack has the INFECTION MARKERS Keyword, and Injury Rolls for this attack has the +1 INJURY MODIFIER Keyword if 2 INFECTION MARKERS were paid to cast this spell, or the +2 INJURY MODIFIER Keyword if 3 INFECTION MARKERS were paid to cast this spell.",
      "cost": {
        "ducats": 40,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "b310-3c5c-01b3-5000",
      "name": "Vile Churning",
      "type": "Spell (Cost 1-2)",
      "range": "1\"",
      "keywords": [],
      "rules": "You must take a Cast Spell ACTION with the spellcaster in order for it to cast this spell. If you do so, place 1 BLOOD MARKER next to every model without the ARTIFICIAL or DEMONIC Keywords within 1” of the spellcaster (apart from the spellcaster itself) for every INFECTION MARKER that was paid to cast this spell.",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "59e5-631d-6b0b-e143",
      "name": "Virulent Clot",
      "type": "Spell (Cost 2/4/6)",
      "range": "-",
      "keywords": [],
      "rules": "Once per Turn, you can cast this spell before an Injury Roll is made for the spellcaster. If you do so, add a -1 INJURY MODIFIER to the roll for every 2 INFECTION MARKERS that were paid to cast this spell, and the spellcaster has the NEGATE FIRE Keyword for the roll.",
      "cost": {
        "ducats": 30,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "7cc3-5efe-ed8e-574e",
      "name": "Entitled To Corruption Belchers",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband may take an additional Corruption Belcher.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "46a3-73b3-8c4b-c65e",
      "name": "Entitled To Machine Guns",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband may take an additional Machine Gun.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "802e-98a7-30b5-551b",
      "name": "Entitled To Putrid Shotguns",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband may take an additional Putrid Shotgun",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "7e1b-68ce-f927-2410",
      "name": "Entitled To Viscera Cannons",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband may take an additional Viscera Cannon.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "f414-efa5-ad21-edf7",
      "name": "Entitled To Plague Blades",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband may take an additional Plague Blade.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "5f11-5881-a15c-9100",
      "name": "Entitled To Beelzebub's Axe",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband may take an additional Beelzebub's Axe.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "ad78-80b9-dee7-9bf2",
      "name": "Leader",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Plague Knight is the leader of the Warband.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "min",
          "value": 0,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "min",
          "value": 0,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "e635-2d2a-2df7-bafe",
      "name": "Infected Teeth & Claws",
      "type": "Special",
      "range": "Melee",
      "keywords": [
        "INFECTION MARKERS"
      ],
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "f1f4-ad6d-1a6e-d822",
      "name": "Double Dog",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This dog is friends with another dog. Isn't that lovely?",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "8037-91e3-fc56-e8d8",
      "name": "Pummel",
      "type": "Special",
      "range": "Melee",
      "keywords": [],
      "cost": {
        "ducats": 25,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "f726-9549-bfcb-51e6",
      "name": "Maddening Buzz",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "Success Rolls taken for enemy models within 8\" of a model with this ability become Risky Success Rolls (there is no additional effect if they are Risky Success Rolls already)",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "6138-06ef-9465-b870",
      "name": "Special Rule: Morale",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "Enemy Warbands roll Morale Tests with -1 DICE when fighting a Black Grail Warband. The Court Warbands and other Black Grail Warbands ignore this penalty.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "min",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "9aa7-5a1a-cbf9-b1b5",
      "name": "Foetid Palanquin",
      "type": "Armour",
      "range": "",
      "keywords": [
        "-1 INJURY MODIFIER"
      ],
      "rules": "Bile Clot ACTION: Once per Turn, a Matagot Hag with a Foetid Palanquin can take a Bile Clot ACTION immediately before an Injury Roll is made for it. If it does so, you can remove any number of INFECTION MARKERS from any models (friend or foe) within 18” of the Matagot Hag. Add a -1 INJURY MODIFIER to the roll for every 2 INFECTION MARKERS that were removed in this way (this cannot exceed the standard maximum of -3 INJURY MODIFIER added to an Injury Roll).",
      "cost": {
        "ducats": 0,
        "glory": 4
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "5e94-0f13-1aef-0338",
      "name": "Vomitus",
      "type": "Special",
      "range": "8\"",
      "keywords": [
        "+1 INJURY MODIFIER",
        "ASSAULT",
        "INFECTION MARKERS"
      ],
      "rules": "Torrent of Bile: When Vomitus is used to make a Ranged Attack, do not make a Success Roll for the attack. Instead, measure a straight line 1mm wide and up to 8” long from the attacking model to a point on the ground or a model’s base. The line stops if it reaches a terrain piece that is taller than the model making the Attack. Make an Injury Roll for every model (friend or foe) that is touched by the line, apart from the attacking model itself.",
      "cost": {
        "ducats": 40,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "f9f0-47a6-b77d-16b7",
      "name": "Pummel",
      "type": "Special",
      "range": "Melee",
      "keywords": [],
      "cost": {
        "ducats": 0,
        "glory": 2
      },
      "constraints": [
        {
          "type": "max",
          "value": 3,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Black Grail",
      "sourceFile": "Black Grail.cat"
    },
    {
      "id": "25ba-4c30-92ec-cf3a",
      "name": "Apex Form",
      "type": "Equipment",
      "range": "",
      "keywords": [],
      "rules": "This equipment is treated as an upgrade that cannot be removed once purchased, and is still lost if this model dies, ignoring Willing Sacrifice. This model gains 1” to its movement characteristic and the SKIRMISHER keyword.",
      "cost": {
        "ducats": 0,
        "glory": 2
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "self",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "5c42-9d35-f204-8da2",
      "name": "Orphaned Failures",
      "type": "Equipment",
      "range": "",
      "keywords": [],
      "rules": "At the start of this Model’s activation, it heals one Blood Marker or Infection Marker, if it had any. Orphaned Failures can be purchased and Equipped by a Desecrated Saint, even though normally this would not be allowed.",
      "cost": {
        "ducats": 0,
        "glory": 3
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "self",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "4dd5-9b7d-69da-b77a",
      "name": "Entropital Dermis",
      "type": "Equipment",
      "range": "",
      "keywords": [],
      "rules": "An Entropital Dermis confers a -1 INJURY DICE to Injury Rolls made against this Model. Enemy Models cannot retreat from a model wearing the Entropital Dermis, and are considered to be engaged in melee with the wearer from 3” away instead of 1”. The wearer and any Model it is engaged with must still be within 1” of each other to perform a Melee attack (Including an Attack of Opportunity).",
      "cost": {
        "ducats": 0,
        "glory": 6
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "self",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "1579-00f4-ef39-5244",
      "name": "Herald of the Void",
      "type": "Equipment",
      "range": "",
      "keywords": [],
      "rules": "This equipment is treated as an upgrade that cannot be removed once purchased. When this upgrade is purchased you may choose to remove a scar from this Model. Additionally any time you roll 3 or more 6’s on exploration (after exploration skills like Set Dice or Rerolls have been accounted for), you may choose to pay 1 Glory to remove 1 scar from this Model.",
      "cost": {
        "ducats": 0,
        "glory": 8
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "538c-76dc-547d-5458",
      "name": "Unnatural Conduit",
      "type": "Equipment",
      "range": "",
      "keywords": [],
      "rules": "This Model may use themselves (Even if they have the DEMONIC keyword), or any enemy Model to pay for a Goetic spell’s costs, providing that enemy still pass the other usual restrictions (Non DEMONIC, within Goetic Range, etc).",
      "cost": {
        "ducats": 0,
        "glory": 11
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "self",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "a745-cf5c-0178-84df",
      "name": "Living Instrument",
      "type": "2-handed",
      "range": "",
      "keywords": [],
      "rules": "The Living Instrument is a Musical Instrument that permanently occupies 2 hands, but has its range increased to 8”.",
      "cost": {
        "ducats": 0,
        "glory": 4
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "6dec-b744-5999-b2b0",
      "name": "Fire Shield",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "Always takes one hand to use in both melee and in ranged combat. Grants -1 to all injury rolls against the model. This bonus stacks with any armour the model wears, unless otherwise indicated. Any attack against this model that has the Keyword FIRE will suffer -1 DICE on injury rolls and will not cause an additional BLOOD MARKER.",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "acb9-b7e1-1db0-86b2",
      "name": "Too Proud to Fall",
      "type": "Spell (Cost 2)",
      "range": "",
      "keywords": [],
      "rules": "You can cast this spell immediately after the spellcaster is taken Down. If you do so, the spellcaster ignores the Down result and remains standing, but will still suffer any other effects of the Injury Roll or rule that caused them to be taken Down. For example, BLOOD MARKERS from an Injury Roll must be placed next to the model as normal, and if the TOUGH Keyword was used then it cannot be used again during the game, and so on.",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "46ac-67c1-bb50-8196",
      "name": "Light of Samael",
      "type": "Spell (Cost 2)",
      "range": "",
      "keywords": [],
      "rules": "You must take a Cast Spell ACTION with the spellcaster in order for it to cast this spell. If you do so, pick an enemy model that is within 24\" of the spellcaster and in their Line of Sight, and then make an Injury Roll for the enemy model. If the enemy model is mounted on a base of 32mm or less, it is driven back D6\" in a straight line directly away from the spellcaster. The model stops if it is driven into another model, Impassable terrain or terrain it cannot cross without having to Climb.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "4b37-4ec8-ec5d-4cfb",
      "name": "Claimed: Bolt Action Rifle",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Bolt Action Rifle as though it were from the Trench Pilgrims.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "1401-6c97-8f52-26e1",
      "name": "Claimed: Submachine Gun",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Submachine Gun as though it were from the Trench Pilgrims.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "0c38-cf0f-2425-4433",
      "name": "Claimed: Automatic Pistol",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Automatic Pistol as though it were from the Trench Pilgrims.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "7918-d1a1-8624-dd27",
      "name": "Claimed: Molotov Cocktail",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Molotov Cocktail as though it were from the Trench Pilgrims.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "7fc9-3a86-a1dd-58dd",
      "name": "Claimed: Semi-automatic Rifle",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Semi-automatic Rifle as though it were from the Trench Pilgrims.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "8bd6-fd99-ac8e-5037",
      "name": "Claimed: Sniper Rifle",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Sniper Rifle as though it were from the Trench Pilgrims.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "9388-a68c-58de-9b61",
      "name": "Claimed: Machine Gun",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Machine Gun as though it were from the Trench Pilgrims.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "c089-1bd1-cb13-a89c",
      "name": "Claimed: Musket",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Musket as though it were from the Trench Pilgrims.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "ac3f-2fd2-9e13-30c0",
      "name": "Claimed: Warcross",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use Warcrosses as though it were from the Trench Pilgrims.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "305b-6ef0-4b63-146c",
      "name": "Claimed: Anti-Tank Hammer",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Anti-Tank Hammer as though it were from the Trench Pilgrims.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "f70e-1bff-a65a-66af",
      "name": "Claimed: Punt Gun",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Punt Gun as though it were from the Trench Pilgrims.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "34a2-3a0d-5746-c24f",
      "name": "Claimed: Flail/Scourge",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Flail/Scourge as though it were from the Trench Pilgrims.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "f991-7aaa-24b1-6937",
      "name": "Claimed: Misericordia",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Misericordia as though it were from the Trench Pilgrims.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "793b-d5d8-1024-63c3",
      "name": "Claimed: Grenades",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use Grenades as though it were from the Iron Sultanate.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "3ece-5b15-88af-1394",
      "name": "Claimed: Sniper Rifle",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Sniper Rifle as though it were from the Iron Sultanate.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "95b4-ff42-9834-b1a5",
      "name": "Claimed: Alchemist Armour",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Alchemist Armour as though it were from the Iron Sultanate.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "6f0f-5f09-f414-afd7",
      "name": "Claimed: Jezzail",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Jezzail as though it were from the Iron Sultanate.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "7d86-96fb-1462-14ba",
      "name": "Claimed: Siege Jezzail",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Siege Jezzail as though it were from the Iron Sultanate.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "f4ba-5a86-9106-9497",
      "name": "Claimed: Musket",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Musket as though it were from the Iron Sultanate.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "af2e-d32b-d37b-8626",
      "name": "Claimed: Halberd-Gun",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Halberd-Gun as though it were from the Iron Sultanate.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "85ee-683c-63c5-e708",
      "name": "Claimed: Machine Gun",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Machine Gun as though it were from the Iron Sultanate.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "cfc6-9ebe-635d-2221",
      "name": "Claimed: Bolt Action Rifle",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Bolt Action Rifle as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "e649-4071-34a6-8661",
      "name": "Claimed: Automatic Pistol",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use an Automatic Pistol as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "d7da-68e6-c806-79a0",
      "name": "Claimed: Semi-automatic Rifle",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Semi-automatic Rifle as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "9845-8249-07e1-5c50",
      "name": "Claimed: Automatic Shotgun",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use an Automatic Shotgun as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "4305-3002-cdd4-284a",
      "name": "Claimed: Automatic Rifle",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use an Automatic Rifle as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "deab-41ec-216f-5947",
      "name": "Claimed: Satchel Charge",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Satchel Charge as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "ab84-6453-d13a-fe65",
      "name": "Claimed: Machine Armour",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use Machine Armour as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "cb97-d342-2a89-e850",
      "name": "Claimed: Grenade Launcher",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Grenade Launcher as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "81e0-f988-e048-8547",
      "name": "Claimed: Grenades",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use Grenades as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "19bd-8885-be91-907d",
      "name": "Claimed: Submachine Gun",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Submachine Gun as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "bbab-a74c-e82c-e4e8",
      "name": "Claimed: Heavy Shotgun",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model can use a Heavy Shotgun as though it were from the New Antioch.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "8d72-52c6-08af-34b5",
      "name": "Coveted Position",
      "type": "Spell (Cost 2)",
      "range": "12\"",
      "keywords": [],
      "rules": "You must take a Cast Spell ACTION with the spellcaster in order for it to cast this spell. If you do so, pick a model (friend or foe) that is within 12\" of the spellcaster, in it's Line of Sight, and is more than 1\" away from any other models. You can then swap the position of the two models. You must place each model so that the centre of their base is at the location that was previously occupied by the centre of the base of the model they are swapping positions with. If this is impossible for any reason (e.g. because Impassable terrain or another model gets in the way), the two models remain in their original locations.",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "02a0-968e-d2e1-09c6",
      "name": "What is Yours is Mine",
      "type": "Spell (Cost 1)",
      "range": "-",
      "keywords": [],
      "rules": "You must take a Cast Spell ACTION with the spellcaster in order for it to cast this spell. If you do so, you can remove 1 BLOOD MARKER or BLESSING MARKER from a model in the spellcaster’s Line of Sight (friend or foe) and place it next to the spellcaster.",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "7b6f-566f-3690-6a06",
      "name": "Uncaring Gluttony",
      "type": "Spell (Cost 2)",
      "range": "-",
      "keywords": [],
      "rules": "You must take a Cast Spell ACTION with the spellcaster in order for it to cast this spell. If you do so, pick 1 enemy model that has not yet been Activated this Turn, and pick one piece of Equipment that the model has (note its Type must be Equipment, not Weapon or Special and so on). Equipment that has the CONSUMABLE Keyword cannot be picked as it has already been consumed, and Equipment that has the DEPLOYABLE Keyword cannot be picked if it is more than 1” away from the model. The model chews on the Equipment, rendering it unusable for the rest of the game.",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "3a38-b172-9d70-ee94",
      "name": "Exquisite Pain",
      "type": "Spell (1-2)",
      "range": "",
      "keywords": [],
      "rules": "You must take a Cast Spell ACTION with the spellcaster in order for it to cast this spell. If you do so, pick a model that is in the spellcaster’s Line of Sight (friend or foe). Place the BLOOD MARKERS paid to cast the spell next to the model that you picked.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "f957-a6db-7309-b93f",
      "name": "Call of Flesh",
      "type": "Spell (Cost 2)",
      "range": "-",
      "keywords": [],
      "rules": "You must take a Cast Spell ACTION with the spellcaster in order for it to cast this spell. If you do so, the spellcaster’s Activation immediately ends and the first ACTION taken by the next model your opponent Activates must be a Move, Charge or Retreat. If the enemy model is Down, it will stand up before taking the ACTION; if it cannot stand up for any reason, the spell has no effect on it. In addition, when your opponent moves the model, it must end the move as close to the spellcaster as possible. If the model must move through Dangerous terrain, or Climb, Jump, or Jump Down, to get as close to the spellcaster as possible, then it must do so. After taking the Move, Charge or Retreat ACTION the model can carry out other ACTIONS normally, with the exception that it cannot choose the spellcaster as the target for a Ranged or Melee attack for the rest of the Turn.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "b1e9-f895-8cab-5c0b",
      "name": "Morphean Mind",
      "type": "Ability",
      "range": "",
      "keywords": [],
      "rules": "The opposing player cannot spend more than 1 BLOOD MARKER to add -1 DICE when you take a Success Roll for a model with this Goetic Ability.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "655a-5c5e-a497-248f",
      "name": "Charm of Acedia",
      "type": "Spell (Cost 1)",
      "range": "",
      "keywords": [],
      "rules": "You must take a Cast Spell ACTION with the spellcaster in order for it to cast this spell. If you do so, if the next ACTION the spellcaster takes as part of this Activation requires one or more Success Rolls or Risky Success Rolls for any part of it, the first roll is automatically a Success (do not roll any dice)",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "7cbe-aaa1-8d58-dd69",
      "name": "Daemonium Meridianum",
      "type": "Ability",
      "range": "",
      "keywords": [],
      "rules": "Enemy models treat Open or Dangerous terrain within 6” of a model with this Goetic Ability as Difficult terrain.",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "684d-fb32-d817-7a19",
      "name": "Black Heart",
      "type": "Spell (Cost 1)",
      "range": "",
      "keywords": [],
      "rules": "You can cast this spell before taking a Success Roll or a Risky Success Roll for the spellcaster. If you do so, add +1 DICE to the roll",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "80a8-fe07-6cfc-68bd",
      "name": "Beauty in Suffering",
      "type": "Spell (Cost 1)",
      "range": "",
      "keywords": [],
      "rules": "You must take a Cast Spell ACTION with the spellcaster in order to cast this spell. If you do so, make an ACTION roll. If the roll is a Failure, nothing happens. If the roll is a Success or a Critical Success, every model (friend or foe, including the spellcaster) within 6” of the spellcaster gains 1 Blessing Marker for every 2 Blood Markers on themselves, rounding down.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 3,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "79b8-db30-6294-d5e3",
      "name": "Coagulation",
      "type": "Spell (Cost 3)",
      "range": "",
      "keywords": [],
      "rules": "You must take a Cast Spell ACTION with the spellcaster in order to cast this spell. If you do so, pick an enemy model within 18” of the spellcaster. The targeted model’s Movement is reduced by 2” until the end of its next activation.",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "8250-d2c5-b8b6-9c1f",
      "name": "Dark Innervation",
      "type": "Spell (Cost 2-3)",
      "range": "",
      "keywords": [],
      "rules": "You can cast this spell once per Turn after the spellcaster or a friendly model with at least 2 BLOOD MARKER on it hits with an attack without the BLAST keyword. If you do so, the chosen model gains either +1 INJURY DICE or +2 INJURY DICE, one less than the amount of Blood Markers used to pay this spell’s costs.",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 3,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "32cc-13ad-b391-00c0",
      "name": "Final Frenzy",
      "type": "Spell (Cost 2)",
      "range": "",
      "keywords": [],
      "rules": "You can cast this spell once per turn after a friendly model (including the spellcaster) that is eligible to pay this spell’s cost is hit by an attack, before the injury roll is made. If you do so, the chosen model pays this spell’s cost and ignores all Minor Injury and Downed Injury results, and cannot gain Blood Markers in any way, including paying the cost of any other Goetic Spells, until the end of its next activation.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "143b-3167-b6c2-b243",
      "name": "Dust to Dust",
      "type": "Spell (Cost 3)",
      "range": "",
      "keywords": [],
      "rules": "You must take a Cast Spell ACTION with the spellcaster in order to cast this spell. If you do so, take a Risky Action for the model and add +1 DICE to the roll. If the roll is a Failure, the spellcaster’s Activation ends immediately. If the roll is a Success or a Critical Success, you can choose a friendly model within 12” of the spellcaster, and inflict an Out of Action injury on it. It accepts this fate with open arms, and inflicts 3 Blood Markers on every model within 3” of itself as it dies in a painfully beautiful implosion, fracturing reality itself. If the dying model had at least 3 Blood Markers on it before it died, the caster of this spell gains a Blessing Marker. The spellcaster’s Activation then ends immediately.",
      "cost": {
        "ducats": 25,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "de39-4798-436c-d3a3",
      "name": "Event Horizon",
      "type": "Spell (Cost 1-3)",
      "range": "",
      "keywords": [],
      "rules": "You must take a Cast Spell ACTION with the spellcaster in order to cast this spell. If you do so, the spellcaster can make a Ranged Attack with a Range of 24”. The attack has the BLAST and SCATTER Keywords, and a blast radius in inches equal to the number of BLOOD MARKERS that were paid to cast the spell plus 1. In addition, if the attack lands directly on top of a model, the model is immediately downed before rolling for its injury. All other models (friend or foe) caught in the blast are pulled up to 3” towards the epicenter of the blast after resolving their Injury Rolls. A Sorcerer cannot purchase both Event horizon and Burning Inferno.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "9b7a-8ca7-9868-cc02",
      "name": "Burning Inferno",
      "type": "Spell (Cost 1-3)",
      "range": "36\"",
      "keywords": [
        "BLAST",
        "FIRE",
        "SCATTER"
      ],
      "rules": "You must take a Cast Spell ACTION with the spellcaster in order for it to cast this spell. If you do so, the spellcaster can make a Ranged Attack with a Range of 36\". The attack has the BLAST, FIRE and SCATTER Keywords, and a blast radius in inches equal to the number of BLOOD MARKERS that were paid to cast the spell. In addition, the attack has the IGNORE ARMOUR Keyword for Injury Rolls made for a model that was either the target of the spell and hit by it, or if the Burning Inferno scattered and the target point ended up on the model’s base.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "662c-894d-16fb-3b8c",
      "name": "Slavemaster",
      "type": "Spell (Cost 1)",
      "range": "18\"",
      "keywords": [],
      "rules": "You must take a Cast Spell ACTION with the spellcaster in order for it to cast this spell. If you do so, you can carry out one of the following Commands with a Yoke Fiend that is within 18\" of the spellcaster. Carrying out a Command does not stop the Yoke Fiend from being Activated in the same Turn (before or after the Command was issued). - Sacrifice Command: The Yoke Fiend kills itself. It is taken Out of Action and crossed off its Warband Roster. - Fight Command: The Yoke Fiend carries out a Melee Attack. - Move Command: The Yoke Fiend carries out a Move (it cannot Charge or Retreat). - Shoot Command: The Yoke Fiend carries out a Ranged Attack.",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "f012-3a44-5c5d-5460",
      "name": "Mind Linked",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is in a fireteam with a Homunculus.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "b565-d29c-fb83-e637",
      "name": "Comically Large Rock",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "rock",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "1c27-5a6d-1a8b-bf04",
      "name": "Entitled To Ophidian Rifles",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "a502-8362-06be-59a2",
      "name": "Entitled To Incendiary Grenades",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband may take an additional Incendiary Grenade.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "506d-7eec-ee56-fe93",
      "name": "Entitled To Serpent Assault Guns",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband may take an additional Serpent Assault Gun.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "2d97-93c1-37b4-de43",
      "name": "Entitled To Heavy Flamethrowers",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband may take an additional Heavy Flamethrower.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "5555-a81b-b83c-cb4e",
      "name": "Entitled To Headtakers",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband may take an additional Headtaker.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "0cc4-dd59-6e01-3301",
      "name": "Entitled To Flamethrowers",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband may take an additional Flamethrower.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "2786-e606-cad9-3180",
      "name": "Entitled To Hellblades",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband may take an additional Hellblade.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "7964-09b3-0b61-b008",
      "name": "Entitled To Malebranche Swords",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband may take an additional Malebranche Sword.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "12d2-7961-1e16-963c",
      "name": "Promoted!",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This unit is now Elite.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "2873-9e7a-3ad9-a547",
      "name": "Experience",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model has accumulated experience. This does not effect your skill access in NewRecruit, and is solely for convenience of tracking.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 18,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Court of the Seven-Headed Serpent",
      "sourceFile": "Court of the Seven-Headed Serpent.cat"
    },
    {
      "id": "0691-b648-ac01-3dc7",
      "name": "Trench Shield",
      "type": "Shield",
      "range": "",
      "keywords": [
        "-1 INJURY MODIFIER"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "33ed-6314-e75f-8982",
      "name": "Reinforced Armour",
      "type": "Armour",
      "range": "",
      "keywords": [
        "-2 INJURY MODIFIER"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [
        "ELITE only",
        "ELITE & Janissaries only",
        "Anointed & ELITE only"
      ],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "71ec-000e-5999-ba1c",
      "name": "Standard Armour",
      "type": "Armour",
      "range": "",
      "keywords": [
        "-1 INJURY MODIFIER"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "0327-358f-77be-d119",
      "name": "Armour Piercing Bullets",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "AMMUNITION (ARMOUR-PIERCING)",
        "CONSUMABLE"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "d8ed-a44c-df74-d064",
      "name": "Binoculars",
      "type": "Equipment",
      "range": "",
      "keywords": [],
      "rules": "**Survey the Land**: Enemy models cannot use the INFILTRATOR Keyword to deploy within 16” of a model with this Keyword unless they are in their own side’s deployment zone.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [
        "ELITE only"
      ],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "3c35-dded-ffab-2e12",
      "name": "Blessed Icon",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "CONSUMABLE"
      ],
      "rules": "**Talisman**: Once during a game, when a Risky Success Roll for a model with a Blessed Icon is a Failure, you can say that the model will use its Talisman. If you do, the model’s Activation does not end.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "model",
          "includeChildSelections": false
        }
      ],
      "restrictions": [
        "Consumable"
      ],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "f742-ff2c-671c-3e20",
      "name": "Combat Helmet",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "NEGATE SHRAPNEL"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [
        "Headgear"
      ],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "913c-4427-b470-9a6a",
      "name": "Dum-Dum Bullets",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "AMMUNITION (CRITICAL)",
        "CONSUMABLE"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "5b7d-4bc2-5a44-43ce",
      "name": "Field Shrine",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "DEPLOYABLE"
      ],
      "rules": "A Field Shrine is represented by a terrain piece that is at least ½” high and which is mounted on a 40mm base. It is Impassable terrain. - **Site of Worship**: After you deploy a model that has Field Shrine, you can also deploy their Field Shrine anywhere wholly within their deployment zone. In the Morale Phase, each friendly Field Shrine on the battlefield adds 3 to the number of models you have in your Warband that are not Down or Out of Action, up to a maximum bonus of 9 extra models. Once deployed, the model that had the Field Shrine is not considered to be carrying it for the rest of the game. - **Tear It Down!**: Models can attack a Field Shrine as if it were an enemy model. If it is hit by an attack or is in the blast radius of an attack made with a Weapon that has the BLAST Keyword, it is removed from the battlefield and is removed from the Warband Roster (no Injury Roll is required).",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "29d4-73f4-67aa-ecbb",
      "name": "Gas Mask",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "NEGATE GAS"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "4fa4-3134-d167-8099",
      "name": "Hellbound Soul Contract",
      "type": "Equipment",
      "range": "",
      "keywords": [],
      "rules": "**Fiery Exodus**: If a model with a Hellbound Soul Contract is taken Out of Action, before removing it from the battlefield add 1 BLOOD MARKER to each enemy model that is within 1” of it. Models that have the NEGATE FIRE Keyword are not affected by this special rule.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "0e24-838f-4297-c2b9",
      "name": "Holy Relic",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "BLESSED 1"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [
        "ELITE only"
      ],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "2eb8-75e4-b529-12ad",
      "name": "Incendiary Ammunition",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "AMMUNITION (FIRE)",
        "CONSUMABLE"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "Consumable, Limit: 1"
      ],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "e5d0-2e53-965c-1b78",
      "name": "Infernal Brand",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "NEGATE FIRE"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "322c-cb76-719a-0cb9",
      "name": "Martyrdom Pills",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "CONSUMABLE"
      ],
      "rules": "**Inured to Pain**: When you deploy a model that has Martyrdom Pills you can say that they will consume them. If you do so, until the end of the game the model has the NEGATE FEAR Keyword. In addition, add -1 INJURY DICE to rolls for attacks that hit the model.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [
        "Consumable, ELITE only, Limit: 2",
        "Consumable, Limit: 3"
      ],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "cb36-de41-f960-6526",
      "name": "Medikit",
      "type": "Equipment",
      "range": "",
      "keywords": [],
      "rules": "**Treat ACTION**: A model with this Keyword can take a Treat ACTION. If it does so, take a Risky Success Roll for the model. If the roll is a Failure, the model’s Activation ends immediately. If it is a Success or a Critical Success, you can do one of the following things: * Remove 1 BLOOD MARKER from the model or a friendly model within 1” of the model. * Stand up a friendly model that is Down and within 1” of the model.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "111a-02f4-8014-be04",
      "name": "Mountaineer Kit",
      "type": "Equipment",
      "range": "",
      "keywords": [],
      "rules": "**Ropes and Pitons**: Add +1 DICE to Risky Success Rolls for friendly models with this special rule that are attempting to climb a sheer surface.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [
        "Limit: 4",
        "Limit: 1",
        "Limit: 2"
      ],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "ed7c-0353-5a9d-b903",
      "name": "Musical Instrument",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "HELD"
      ],
      "rules": "**Fanfare**: Add +1 DICE to Risky Success Rolls for friendly models that are taking a Dash ACTION and are within 4” of one or more models with a Musical Instrument.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [
        "Limit: 1"
      ],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "41f3-4b8e-6736-1db8",
      "name": "Shovel",
      "type": "Equipment",
      "range": "",
      "keywords": [],
      "rules": "**Dug In**: A model equipped with a Shovel that starts the game on Open terrain has the COVER Keyword until it moves away from its starting position. In addition, a model equipped with a Shovel can use it as a 2-Handed Melee Weapon instead of using any other Melee Weapons it has.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [
        "Wretched & Yoke Fiends only"
      ],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "169e-7bba-028c-72a5",
      "name": "Weaponized Shovel",
      "type": "1-Handed",
      "range": "Melee",
      "keywords": [],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "a00a-6279-d459-1641",
      "name": "Tracer Bullets",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "AMMUNITION (+1 DICE)",
        "CONSUMABLE"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "2b17-59ef-7e74-fd47",
      "name": "Troop Flag",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "LEADER",
        "HELD"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [
        "Limit: 1"
      ],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "411f-228a-4117-3784",
      "name": "Unholy Relic",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "FEAR"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "ab23-2c25-8507-9ca3",
      "name": "Unholy Trinket",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "CONSUMABLE"
      ],
      "rules": "**Talisman**: Once during a game, when a Risky Success Roll for a model with an Unholy Trinket is a Failure, you can say that the model will use it. If you do, the model’s Activation does not end.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [
        "Consumable"
      ],
      "factionId": "Equipment",
      "sourceFile": "Equipment.cat"
    },
    {
      "id": "835c-9624-303f-5792",
      "name": "Tank Palanquin",
      "type": "Armour",
      "range": "-",
      "keywords": [
        "-3 INJURY MODIFIER",
        "STRONG"
      ],
      "cost": {
        "ducats": 60,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "9395-0d4e-5cdb-6377",
      "name": "Sarcophagus Mine",
      "type": "Battlekit",
      "range": "",
      "keywords": [
        "-3 INJURY MODIFIER",
        "BLAST 3''"
      ],
      "rules": "* Walking Bomb: A model that has a Sarcophagus Mine cannot have any other Battlekit. A model with a Sarcophagus Mine can take a Trigger ACTION. In addition, if an enemy model finishes a move within 3\" of a model with a Sarcophagus Mine, you can interrupt its Activation and detonate the Sarcophagus Mine without having to take a Trigger ACTION. * Trigger ACTION: When a model with a Sarcophagus Mine takes a Trigger ACTION, you must take a Risky Success Roll for the model with +1 DICE. If the roll is a failure, nothing happens (but you can try again the next time the model is Activated). If the roll is a Success or Critical Success, the Sarcophagus Mine detonates as described below. * Detonation: When a Sarcophagus Mine detonates, all models (friend or foe) within 3\" of the model carrying the Sarcophagus Mine and in its Line of Sight are hit by a Ranged Attack with the SHRAPNEL Keyword. Add +1 INJURY DICE to the Injury Rolls for models that are within 1\" of the model carrying the Sarcophagus Mine. The model carrying the Sarcophagus Mine is then taken Out of Action.",
      "cost": {
        "ducats": 30,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "05d8-72d5-36d0-f648",
      "name": "Battlefield Looters (Automatic Rifle)",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "When this warband is created, select one item with LIMIT in the Heretic Legions Armoury. Its LIMIT is increased by one for your warband.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "cab4-0571-19c0-eaf2",
      "name": "Battlefield Looters (Machine Gun)",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "When this warband is created, select one item with LIMIT in the Heretic Legions Armoury. Its LIMIT is increased by one for your warband.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "314c-5a0b-cf87-d46d",
      "name": "Battlefield Looters (Grenade Launcher)",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "When this warband is created, select one item with LIMIT in the Heretic Legions Armoury. Its LIMIT is increased by one for your warband.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "a73b-6d6d-37aa-fd3f",
      "name": "Battlefield Looters (Musical Instrument)",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "When this warband is created, select one item with LIMIT in the Heretic Legions Armoury. Its LIMIT is increased by one for your warband.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "4ab1-ea85-f390-6fb0",
      "name": "Battlefield Looters (Flamethrower)",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "When this warband is created, select one item with LIMIT in the Heretic Legions Armoury. Its LIMIT is increased by one for your warband.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "06bf-a67e-fba4-5214",
      "name": "Battlefield Looters (Heavy Flamethrower)",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "When this warband is created, select one item with LIMIT in the Heretic Legions Armoury. Its LIMIT is increased by one for your warband.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "bca6-aeb8-da80-ca45",
      "name": "Battlefield Looters (Anti-Material Rifle)",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "When this warband is created, select one item with LIMIT in the Heretic Legions Armoury. Its LIMIT is increased by one for your warband.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "e8cf-8a0c-d0cc-756d",
      "name": "Battlefield Looters (Mountaineer Kit)",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "When this warband is created, select one item with LIMIT in the Heretic Legions Armoury. Its LIMIT is increased by one for your warband.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "4951-f794-ad38-ad03",
      "name": "Battlefield Looters (Incendiary Ammunition)",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "When this warband is created, select one item with LIMIT in the Heretic Legions Armoury. Its LIMIT is increased by one for your warband.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "290e-b9f3-e527-d0f5",
      "name": "Battlefield Looters (Hellblade)",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "When this warband is created, select one item with LIMIT in the Heretic Legions Armoury. Its LIMIT is increased by one for your warband.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "cc71-f6a8-5519-bcf3",
      "name": "Battlefield Looters (Troop Flag)",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "When this warband is created, select one item with LIMIT in the Heretic Legions Armoury. Its LIMIT is increased by one for your warband.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "3362-0f7e-b412-ce4d",
      "name": "Battlefield Looters (Sacrificial Blade)",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "When this warband is created, select one item with LIMIT in the Heretic Legions Armoury. Its LIMIT is increased by one for your warband.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "6df6-b367-67b3-0a82",
      "name": "Pilfered: Jezzail",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Jezzails as though they were from Iron Sultanate",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "9687-b24e-bf63-d228",
      "name": "Pilfered: Siege Jezzail",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Siege Jezzails as though they were from Iron Sultanate",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "24a0-e75f-fda6-3a63",
      "name": "Pilfered: Musket",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Muskets as though they were from Iron Sultanate",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "b8e7-a29c-9ca9-24b6",
      "name": "Pilfered: Halberd-Gun",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Halberd-Guns as though they were from Iron Sultanate",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "2a14-9d00-49fb-86df",
      "name": "Pilfered: Sniper Rifle",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Sniper Rifles as though they were from Iron Sultanate",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "1181-0635-aa21-d9bb",
      "name": "Pilfered: Alchemist Armour",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Alchemist Armour as though they were from Iron Sultanate",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "8e79-67ff-8442-44b2",
      "name": "Pilfered: Cloak of Alamut",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Cloak of Alamuts as though they were from Iron Sultanate",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "7840-b59b-373f-9fc2",
      "name": "Pilfered: Wind Amulet",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Wind Amulets as though they were from Iron Sultanate",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "6dcf-8eba-6204-b814",
      "name": "Pilfered: Holy Relic",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Holy Relics as though they were from Iron Sultanate",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "412d-d440-11fc-f415",
      "name": "Pilfered: Binoculars",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Binoculars as though they were from Iron Sultanate",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "da4c-40b8-a166-dc7c",
      "name": "Pilfered: Medi-kits",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Medi-kits as though they were from Iron Sultanate",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "4964-07b9-b8a1-f35b",
      "name": "Stolen: Automatic Pistol",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Automatic Pistols as though they were from New Antioch",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "8a1d-ae05-5597-07e2",
      "name": "Stolen: Heavy Shotgun",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Heavy Shotguns as though they were from New Antioch",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "9626-3796-60f5-9170",
      "name": "Stolen: Sniper Rifle",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Sniper Rifles as though they were from New Antioch",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "6ce7-e339-f8ab-ac68",
      "name": "Stolen: Satchel Charge",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Satchel Charges as though they were from New Antioch",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "83f0-876a-3cc7-3564",
      "name": "Stolen: Machine Armour",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Machine Armours as though they were from New Antioch",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "f4ce-75a0-6a5e-7f5f",
      "name": "Stolen: Medi-Kit",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Medi-Kits as though they were from New Antioch",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "3ee7-3e7e-d239-1c94",
      "name": "Stolen: Martyrdom Pills",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Martyrdom Pills as though they were from New Antioch",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "5b33-f856-132e-7c89",
      "name": "Stolen: Field Shrine",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Field Shrines as though they were from New Antioch",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "d65c-996d-9bd5-be6b",
      "name": "Stolen: Binoculars",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Binoculars as though they were from New Antioch",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "7de6-ffe0-bad3-043e",
      "name": "Stolen: Grenade Launcher",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Warband can use Grenade Launcher as though they were from New Antioch",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "4e92-442c-e2fc-4583",
      "name": "Coin Hammer",
      "type": "2-Handed",
      "range": "Melee",
      "keywords": [
        "+1 INJURY DICE",
        "HEAVY"
      ],
      "rules": "Rune of Mammon: If the Injury Roll for an attack made by a Coin Hammer results in 1 or more BLOOD MARKERS being placed next to the target, place 1 BLESSING MARKER next to the model using the Coin Hammer.",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "77d6-2ff5-90cb-b1a8",
      "name": "Golden Calf Altar",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "DEPLOYABLE",
        "HEAVY"
      ],
      "rules": "A Golden Calf Altar, if deployed, is represented by a terrain piece that is about ½” high and which is mounted on a 25mm base. It is Impassable terrain. * Illusions: Enemy models treat Open ground and all terrain within 3” of a model with a Golden Calf Altar or a Golden Calf Altar terrain piece as being Difficult terrain (if it is not already), even if they have the FLYING Keyword. * Place Altar ACTION:A model with a Golden Calf Altar can take a Place Altar ACTION. If they do so, deploy the Golden Calf Altar anywhere within 1”of the model. Once deployed, the model that had the Golden Calf Altar is not considered to be carrying it for the rest of the game. In addition, the Golden Calf Altar is lost at the end of the game and removed from your Warband Roster.",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 3,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "a854-4a9d-a500-f54f",
      "name": "Vessel of Original Sin",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "A model equipped with a Vessel of Original Sin can choose to decrease the result of a roll made by a model within 6” of them by 1, BEFORE it is rolled. Doing so consumes the Vessel.",
      "cost": {
        "ducats": 1,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "68aa-f526-16fe-39a6",
      "name": "Artificial Rebirth",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "This model gains the keyword ARTIFICIAL. It is not affected by FEAR. Additionally, attacks with the Keyword GAS suffer a -1 DICE penalty to injure the model and they do not suffer additional BLOOD MARKERS from the Keyword GAS. Models with this upgrade cannot equip Infernal Brand Marks or Gas Masks, since they’re not strictly alive. They can also never remove (or be forced to remove or lose) this upgrade, they have a new, better form now. The corpses of those who have undergone Artificial Rebirth refund 1 glory when Scavenged, the Corps know well how to use the precious metal and flesh invested into their own.",
      "cost": {
        "ducats": 0,
        "glory": 1
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "3404-bb75-a82a-b773",
      "name": "Thermal Shielding",
      "type": "Equipment",
      "range": "-",
      "keywords": [
        "NEGATE FIRE"
      ],
      "rules": "Attacks or effects from friendly sources with the FIRE keyword suffer a -2 DICE penalty to injure the model.",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "ed64-3975-4671-5ab2",
      "name": "Sonomatic Sculpture",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "Once this model has moved a minimum of 6” this turn, it has the FEAR keyword until the beginning of its next activation.",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "a497-c45b-d2de-16d5",
      "name": "Enhanced Agility",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "This model ignores the effects of both difficult and dangerous terrain.",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "dd25-ee30-7576-7b32",
      "name": "Unstoppable",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "Your opponent cannot spend BLOOD MARKERS on this model's Dash actions.",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "4d39-10aa-ae9d-162e",
      "name": "Unstoppable",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "When a model equipped with a Melee Chassis makes a melee attack action, it can choose to either attack with two flails or a misericordia. These attacks must be resolved immediately, and ignore the penalty for attacking with an offhand weapon if the flails are chosen (The flail still loses its +1D to hit in the offhand as normal, however, leading to a +1D and a +0 to the attacks.) Melee Chassis counts as two one handed melee weapons for the purposes of equipping models.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "0da4-88a6-6cc3-bcd8",
      "name": "Essence Extractor",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "Once per turn, if this model inflicts at least one blood marker with a melee action, it removes one BLOOD MARKER from itself (if it had one).",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "debb-b1ea-a645-92dd",
      "name": "Standard of Mammon",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "HELD",
        "LEADER"
      ],
      "rules": "Kneel Before Me: An enemy model that is Down and within 1\" of a model with the Standard of Mammon cannot stand back up. In addition, the opposing player must take a Success Roll for any of their models that finish a charge within 1\" of a model with the Standard of Mammon. If the roll is a Failure, the enemy model is marked as being Down. If the roll is a Success or a Critical Success, the enemy model stays on its feet.",
      "cost": {
        "ducats": 25,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "7555-188e-e8fb-6a31",
      "name": "Fire Shield",
      "type": "Battlekit",
      "range": "",
      "keywords": [
        "-1 INJURY MODIFIER",
        "NEGATE FIRE"
      ],
      "rules": "dd -1 INJURY DICE to Injury Rolls for attacks with the FIRE Keyword that targets a model that has a Fire Shield, even if the attacking weapon has the IGNORE ARMOUR Keyword.",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "b2e8-94d9-2ff1-7cdd",
      "name": "Tarnished Armour",
      "type": "Battlekit",
      "range": "",
      "keywords": [
        "-2 INJURY MODIFIER",
        "NEGATE GAS"
      ],
      "rules": "An enemy model must choose a model that has Tarnished Armour as the target of the charge if the model is in its Line of Sight, not already within 1” of an enemy model, and can be reached without the charging model having to Climb, Jump, make a Diving Charge, or move across Dangerous terrain.",
      "cost": {
        "ducats": 25,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "bc3d-26f8-182e-d523",
      "name": "Mind Linked",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is in a fireteam with a Homunculus.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "a28d-5ed5-5c1e-3b58",
      "name": "Byzantinium Hearth",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "This model treats any DOWN INJURY result as a MINOR INJURY instead, unless it is as a result of the TOUGH keyword converting an OUT OF ACTION to a DOWN result. If a Byzantinium Heart is ever removed or lost from the model that has it equipped for any reason, the model instantly dies.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "ba85-939c-d69d-5734",
      "name": "Thermal Shielding",
      "type": "Equipment",
      "range": "-",
      "keywords": [
        "NEGATE FIRE"
      ],
      "rules": "Attacks or effects from friendly sources with the FIRE keyword suffer a -2 DICE penalty to injure the model.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Heretic Legion",
      "sourceFile": "Heretic Legion.cat"
    },
    {
      "id": "bb71-83f8-e3a8-048f",
      "name": "Weaponized Marid Shovel",
      "type": "1-Handed",
      "range": "Melee",
      "keywords": [
        "HEAVY"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "ec64-7a03-2155-796b",
      "name": "Hashashin Leaf",
      "type": "Battlekit",
      "range": "-",
      "keywords": [
        "CONSUMABLE"
      ],
      "rules": "When you deploy a model with a Hashashin Leaf for the first time in a game, you can say that the model will consume the Hashashin Leaf. If you do so, the model has the STRONG Keyword for the rest of the game",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 4,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "7d3a-4d24-677e-bb71",
      "name": "Elixir of Al-Khidr",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "CONSUMABLE"
      ],
      "rules": "Fountain of Life: When deploying a model with an Elixir of Al-Khidr for the first time in a game, you can say that the model will consume the Elixir of Al-Khidr. If you do so, the model has the TOUGH Keyword for the rest of the game. An Elixir of AlKhidr cannot be used by models with the ARTIFICIAL Keyword.",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "9902-c422-18ce-ab2b",
      "name": "Explosive Charges",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "CONSUMABLE"
      ],
      "rules": "* Hidden Explosives: At the start of the game, after Deployment, you can say that a model that has Explosive Charges is going to plant them on the battlefield. If you do so, secretly write down their location on a piece of paper. The Explosive Charges must be planted on a terrain piece that measures up to 8\" by 8\", is not fully or partially within the enemy deployment zone or within 1\" of a model, and which is not a scenario objective that is worth any Victory Points. * Detonating the Explosives: When you Activate a friendly model, before you carry out any ACTIONS you can say that the model is going to detonate any hidden explosives you set up at the start of the game. If you do so, show your opponent the piece of paper saying where the explosives are hidden, and then make an Injury Roll with the SHRAPNEL Keyword for each model (friend or foe) that is in on or in contact with the terrain piece. The terrain piece is then removed from the game. Models that were on top of the terrain piece Fall directly down to the battlefield, and an additional Injury Roll may have to be made for them if they Fall 3\" or more.",
      "cost": {
        "ducats": 35,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "0888-90bb-c320-ca0f",
      "name": "Takwin Anqā Bird",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "Cause Confusion: Success Rolls taken for Melee Attacks that target a model with a Takwin Anqā Bird become Risky Success Rolls (there is no additional effect if they are Risky Success Rolls already). In addition, before an enemy model within 1\" of a model with Takwin Anqā Bird makes a retreat, the opposing player must take a Risky Success Roll for the model. If the Roll is a Failure the enemy model cannot retreat and its Activation ends. If the Roll is a Success or a Critical Success, the enemy model can retreat normally.",
      "cost": {
        "ducats": 0,
        "glory": 2
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [
        "ELITE only, Limit: 1"
      ],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "c76e-7839-f61f-df09",
      "name": "Rocket-Propelled Grenade",
      "type": "Equipment",
      "range": "36\"",
      "keywords": [
        "+1 INJURY DICE",
        "CONSUMABLE",
        "IGNORE ARMOUR",
        "RELOAD"
      ],
      "rules": "A Rocket-Propelled Grenade is a piece of Equipment that can be used once during a campaign as a Ranged Weapon. If a model that has been hit by a Rocket-Propelled Grenade is not taken Out of Action by the Injury Roll, it is blown D6\" in a straight line directly away from the attacking model. It stops if it is blown into another model, Impassable terrain or terrain it cannot cross without having to Climb.",
      "cost": {
        "ducats": 30,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "4e9a-9a98-557d-c2d1",
      "name": "Marid Pelt",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "The model gains the keyword INFLITRATOR. In addition, all Attacks without the keyword BLAST against the wearer suffer a -1 DICE.",
      "cost": {
        "ducats": 25,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 4,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "71fb-43b5-da89-15f1",
      "name": "Sparkpowder Ammunition",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "If a model is hit by a weapon using Sparkpowder Ammunition, all Attacks it makes are at -1D to hit until the end of its next activation. This does not stack. Can only be used with Jezzails, Alaybozan, Halberd-Guns, Siege Jezzails and Machineguns.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 3,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "2bfa-f76b-086f-249e",
      "name": "Heavy Bore Ammunition",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "When a model is hit by a weapon using Heavy Bore Ammunition, it moves 3” away from the attacker in a straight line, stopping if it hits anything it cannot pass through, such as other models, impassable terrain or walls. (N.B, this does not provoke a Free Attack if the model is pushed out of melee engagement.) Can only be used with Alaybozan and Siege Jezzails.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 3,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "ece5-a8b9-b42e-cdfe",
      "name": "Shayṭānic Shard Ammunition",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "If you hit with a weapon using Shayṭānic Shard Ammunition, do not make an Injury Roll as normal. Instead, the cost of a Bloodbath against the model that was just hit is reduced to 3 Blood Markers, for the rest of the turn. Can only be used with Jezzails, Sniper rifles, Halberd-Guns and Siege Jezzails.",
      "cost": {
        "ducats": 0,
        "glory": 1
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 3,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "1704-e9c5-80e1-74e5",
      "name": "Scrap Shot",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "Adds the keyword ARMOR PIERCING to Jezzails, Alaybozan, Halberd-Guns or Siege Jezzails weared by the model. This equipment can be taken in place of Alchemical Ammo, and you cannot gain the benefit of both. In addition it cannot be taken on units or items that come equipped with Alchemical Ammunition, such as Masterwork Jezzails or the Mamluk Faris.",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "df3a-aed2-fa57-750e",
      "name": "Limpet Mine",
      "type": "GRENADE",
      "range": "6\"",
      "keywords": [
        "BLAST 3\"",
        "HEAVY",
        "SCATTER",
        "CONSUMABLE"
      ],
      "rules": "Limpet mines may only be used once a battle. When you roll to attack with a Limpet Mine, note the location the mine lands with a marker or token. Alternatively, you may attack with the Limpet Mine in melee, using your Ranged characteristic to hit. If the attack hits, the Mine is attached to the enemy model. In either case, do not immediately roll for Injury. Instead, the mine detonates at the end of the turn, rolling for the injury with 3d6 (adding the dice together!) to any model under the center of the blast (i.e where the mine landed, or the model it was attached to), and rolling for an injury as normal for anyone else caught in the explosion.",
      "cost": {
        "ducats": 25,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 3,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "3b60-009c-4bfb-6c75",
      "name": "Chain Kura",
      "type": "Grenade",
      "range": "8\"",
      "keywords": [
        "ASSAULT",
        "CONSUMABLE",
        "IGNORE RANGE",
        "IGNORE COVER"
      ],
      "rules": "Weight of His Word: Minor Injuries caused by the Chain Kura are treated as Down results instead. Once a Ranged Attack has been made with this weapon, It cannot be used again.",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 4,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "f9a1-ea01-d4b8-e52f",
      "name": "Golden Khanjar",
      "type": "1-handed",
      "range": "Melee",
      "keywords": [
        "+1 INJURY MODIFIER",
        "CLEAVE 2"
      ],
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "1003-02a4-ae72-4503",
      "name": "Khyber Knife",
      "type": "1-handed",
      "range": "Melee",
      "keywords": [
        "ARMOUR PIERCING",
        "CRITICAL"
      ],
      "rules": "Grevious Wounds: Injury Rolls made with this weapon cause an additional BLOOD MARKER to the target, regardless of result of the roll.",
      "cost": {
        "ducats": 8,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "1779-f308-8bbc-5885",
      "name": "Kayanin Mace",
      "type": "2-handed",
      "range": "Melee",
      "keywords": [
        "CUMBERSOME",
        "HEAVY",
        "+2 INJURY MODIFIER"
      ],
      "rules": "If the enemy model is equipped with Armour of any kind, the weapon gains the keyword SHARPNEL and BLAST 2\". This blast does not affect the wearer of this weapon, and has no effect if the attack misses.",
      "cost": {
        "ducats": 0,
        "glory": 2
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "f692-f0ef-3d09-399a",
      "name": "Shield-Paired Halberd-Gun",
      "type": "2-handed",
      "range": "24\"",
      "keywords": [
        "ASSAULT",
        "BLOCK",
        "CUMBERSOME"
      ],
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "8af2-2771-9c86-65f3",
      "name": "Anaza Spear",
      "type": "2-handed",
      "range": "Melee",
      "keywords": [
        "CUMBERSOME",
        "BLOCK",
        "IGNORE ARMOUR"
      ],
      "rules": "This weapon adds an additional +1 INJURY DICE against a model that is Downed.",
      "cost": {
        "ducats": 30,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "1bff-0694-c7a5-a7f8",
      "name": "Bow of Alamut",
      "type": "2-handed",
      "range": "40\"",
      "keywords": [
        "ASSAULT",
        "CRITICAL",
        "IGNORE ARMOUR"
      ],
      "rules": "Temporal Slipstream: If a Ranged Attack made with this Weapon causes any BLOOD MARKERS to be placed on the target model, you can immediately redeploy the attacking model within 1\" of the target model, regardless of the distance or any intervening obstacles. Note that if the attack takes the target Out of Action, no BLOOD MARKERS are placed and this ability cannot be used.",
      "cost": {
        "ducats": 50,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "f3a8-7fad-4a06-c27b",
      "name": "Relic Alaybozan",
      "type": "2-handed",
      "range": "12\"",
      "keywords": [
        "+1 DICE",
        "SHRAPNEL",
        "SHOTGUN"
      ],
      "rules": "Relic Alaybozans count as regular Alaybozans for the purposes of what special ammunition they can equip.",
      "cost": {
        "ducats": 12,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "3d9f-050e-4682-7f81",
      "name": "Abus Gun",
      "type": "2-handed",
      "range": "30\"",
      "keywords": [
        "ARMOUR PIERCING",
        "HEAVY",
        "+2 INJURY DICE"
      ],
      "rules": "-",
      "cost": {
        "ducats": 0,
        "glory": 3
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "061e-eaaa-0b9b-b878",
      "name": "Shield-Paired Siege Jezzail",
      "type": "2-handed",
      "range": "30\"",
      "keywords": [
        "+1 INJURY DICE",
        "HEAVY"
      ],
      "cost": {
        "ducats": 30,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "a92a-fa8e-15f9-f2f2",
      "name": "Banner of Desert Wind",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "HELD",
        "LEADER"
      ],
      "rules": "Models that start an Activation within 24” of an enemy model that has the Banner of the Desert Wind have 1 subtracted from their Movement Characteristic until the end of the Activation. This rule does not apply if the model with the Banner of Desert Wind is Down.",
      "cost": {
        "ducats": 30,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "f51d-4a48-6b34-7342",
      "name": "Banner of the Eagle",
      "type": "Equipment",
      "range": "-",
      "keywords": [
        "LEADER",
        "HELD"
      ],
      "rules": "Acts as a Troop Flag, Friendly models within 6\" of the wearer gain the keyword NEGATE FEAR.",
      "cost": {
        "ducats": 35,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "ce56-ea31-c691-08eb",
      "name": "Fire Shield",
      "type": "Shield",
      "range": "",
      "keywords": [
        "-1 INJURY MODIFIER",
        "NEGATE FIRE"
      ],
      "rules": "Fire Shield: Add -1 INJURY DICE to Injury Rolls for attacks with the FIRE Keyword that targets a model that has a Fire Shield, even if the attacking weapon has the IGNORE ARMOUR Keyword.",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "bfda-ea24-3f37-828d",
      "name": "Iron Wall Kalkan",
      "type": "SHIELD",
      "range": "",
      "keywords": [
        "COVER"
      ],
      "rules": "Othismos: When a Brazen Bull that has an Iron Wall Kalkan takes a Move ACTION (not a Dash or Charge) and is in contact with 1 enemy model that is mounted on a base of 40mm or less, then the Brazen Bull can use the Iron Wall Kalkan to push the enemy model when it moves. The Brazen Bull must move in a straight line, directly towards the enemy model. The enemy model is pushed in front of the Brazen Bull as the Brazen Bull moves along. The move can also be used to push a model off a terrain piece, so that it Falls (▶ see Comprehensive Rules in the Trench Crusade Digital Rulebook). If the move pushes the enemy model into contact with another model, both the enemy model and the Brazen Bull must stop moving. If it pushes the enemy into contact with a terrain piece that is more than ½\" high, the enemy model and the Brazen Bull must stop moving and an Injury Roll is made for the enemy model.",
      "cost": {
        "ducats": 30,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "0966-6f0e-5300-4284",
      "name": "Secrets of Medicine",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This Alchemist is a student of Ibn Sina’s School of Medicine. This Alchemist cannot have a Medi-kit. Instead, when you Activate this Alchemist it can take a School of Medicine ACTION as part of the Activation. If it does so, take a Success Roll for the Alchemist and add +1 DICE to the roll. If the roll is a Failure, nothing happens. If it is a Success or a Critical Success, you can do one of the following things: * Remove 2 BLOOD MARKERS or 1 INFECTION MARKER from the Alchemist or a friendly model within 1\" of the Alchemist. * Stand up a friendly model that is Down and which is within 1\" of the Alchemist.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "4e71-6ded-f58e-8ffe",
      "name": "Secrets of Cartography & Geometry",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "The Alchemist has studied long and hard the sciences of cartography and Geometry. At the start of the game, before deployment, you can pick up to 2 models in the Warband that are mounted on a base of 32mm or less, giving them the INFILTRATOR Keyword for that game.",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "77a1-74cd-f781-efb5",
      "name": "Secrets of Chemistry & Alchemy",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "At the start of the first Turn of the game, before any models have been Activated, you can set up an Elemental Obstacle terrain piece that is up to 2” wide and 6” long. It must be set up more than 1” away from any other terrain pieces and more than 6” from any models. The Elemental Obstacle has the DIFFICULT TERRAIN and DANGEROUS TERRAIN (X) Keywords. After setting it up, you must say if X is the FIRE, GAS, or SHRAPNEL Keyword.",
      "cost": {
        "ducats": 25,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "4285-e047-b265-bc62",
      "name": "Secrets of Takwin",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "The Alchemist has bound their Takwin creature to themselves with unbreakable bonds. If this Alchemist is hit by an attack while within 1\" of their Takwin Homunculus, you can apply the hit to the Homunculus and make the Injury Roll for it instead of the Alchemist.",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "1397-70c7-2653-9820",
      "name": "Secrets of Philosophy, Poetry and Theology",
      "type": "Battlekit",
      "range": "",
      "keywords": [
        "NEGATE FEAR"
      ],
      "rules": "The Alchemist is well-versed in the hidden truths of the Universe and of the Divine and has a calm and clearmind. Add +1 DICE to Morale Check Success Rolls for this Alchemist’s Warband, as long as the Alchemist is not Down or Out of Action. In addition, if this Alchemist’s Warband becomes Shaken, ignore the requirement that all Success Rolls become Risky Success Rolls (however you still need to see if the Warband flees in the following Turn’s Morale Phase). The Alchemist has the NEGATE FEAR Keyword",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "13ba-447f-38db-4b1a",
      "name": "Sultanate Grand Cannon",
      "type": "1-handed",
      "range": "48\"",
      "keywords": [
        "+2 INJURY DICE",
        "HEAVY IGNORE ARMOUR",
        "DEPLOYABLE"
      ],
      "rules": "Unstoppable Object: If a model that has been hit by a Sultanate Grand Cannon is not taken Out of Action by the Injury Roll, it is pushed D6\" in a straight line directly away from the attacking model. The model stops if it pushed into another model, Impassable terrain or a terrain piece it cannot cross without having to Climb.",
      "cost": {
        "ducats": 60,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "dbf1-479d-1dfa-29e2",
      "name": "Anqā Guard",
      "type": "Equipment",
      "range": "",
      "keywords": [
        "DEPLOYABLE",
        "HEAVY"
      ],
      "rules": "An Anqā Guard is represented by a model of a shield that is about 1\" high and which is mounted on a 40mm base. * Pre-battle Deployment: At the start of each game, after Deployment, you can say that a model that has an Anqā Guard is going to deploy it. If you do so, deploy the Anqā Guard anywhere wholly within your deployment zone. * Combat Deployment ACTION: A model that has an Anqā Guard can take a Combat Deployment ACTION. If it does so, take a Risky Success Roll for the model and add +2 DICE to the roll. If the roll is a Failure, nothing happens and the model’s Activation ends. If the roll is a Success or Critical Success, you can deploy the Anqā Guard within 1\" of the model. * Mobile Cover: Once deployed, the Anqā Guard is treated as a piece of Impassable terrain and can serve as Cover or a Defended Obstacle. The model that had the Anqā Guard is not considered to be carrying it for the rest of the game.",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "b12d-f138-c557-e74d",
      "name": "Coordinated Engagement",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "All models that are part of the same FIRETEAM can be activated at the same time without the opponent getting their turn in between and can take their ACTIONS in any order they wish, switching between the two models. Note that if the Activation of either member of the FIRETEAM forcefully ends (due to a failed RISKY ACTION for example), it ends both Activations.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "self",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "d8ef-4597-49bd-8c2f",
      "name": "Mamluk-Guarded",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This unit is forming a fireteam with its Mamluk Faris bodyguard.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "21f1-4a29-ae87-7cf2",
      "name": "Killing Squad",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This member is part of the Killing Squad fireteam.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "e412-732c-30a6-9790",
      "name": "Sipahi-Guarded",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This unit is forming a fireteam with its Sipahi bodyguard.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "7e5c-ba89-c669-191a",
      "name": "Mind-Linked",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This unit is forming a fireteam with its Mind-Linked Homunculus.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 0,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "4038-bef2-1da5-b69b",
      "name": "Coordinated Engagement",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "All models that are part of the same FIRETEAM can be activated at the same time without the opponent getting their turn in between and can take their ACTIONS in any order they wish, switching between the two models. Note that if the Activation of either member of the FIRETEAM forcefully ends (due to a failed RISKY ACTION for example), it ends both Activations.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "2342-ecab-9e48-b848",
      "name": "Assigned Sword",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "Enables the \"Mamluk-Guarded\" Fireteam option for Elites.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "2470-9ee0-49df-2c72",
      "name": "Coordinated Engagement",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "All models that are part of the same FIRETEAM can be activated at the same time without the opponent getting their turn in between and can take their ACTIONS in any order they wish, switching between the two models. Note that if the Activation of either member of the FIRETEAM forcefully ends (due to a failed RISKY ACTION for example), it ends both Activations.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "2843-d7c2-29ba-03db",
      "name": "Coordinated Engagement",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "All models that are part of the same FIRETEAM can be activated at the same time without the opponent getting their turn in between and can take their ACTIONS in any order they wish, switching between the two models. Note that if the Activation of either member of the FIRETEAM forcefully ends (due to a failed RISKY ACTION for example), it ends both Activations.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "8a1c-023a-d19f-0e9f",
      "name": "Assigned Sword",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "Enables the \"Mamluk-Guarded\" Fireteam option for Elites.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "e028-d503-dcf3-b3cf",
      "name": "Pummelling Blows",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "A Takwin Homunculus can make a Melee Attack even though it does not have any Melee Weapons.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 0,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Iron Sultanate",
      "sourceFile": "Iron Sultanate.cat"
    },
    {
      "id": "328e-9d8a-0a2c-47c6",
      "name": "Anti-Tank Hammer",
      "type": "2-Handed",
      "range": "Melee",
      "keywords": [
        "+1 INJURY DICE",
        "CRITICAL",
        "IGNORE ARMOUR",
        "RISKY"
      ],
      "rules": "**Dangerous**: Place 1 BLOOD MARKER next to the model using this Weapon if it makes a Melee Attack and the Success Roll is a Success or a Critical Success.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "ELITE only, Limit: 3"
      ],
      "factionId": "Melee Weapons",
      "sourceFile": "Melee Weapons.cat"
    },
    {
      "id": "77d0-35f2-b3d3-4022",
      "name": "Bayonet",
      "type": "2-Handed",
      "range": "Melee",
      "keywords": [
        "CUMBERSOME"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "self",
          "includeChildSelections": false
        }
      ],
      "restrictions": [
        "Shield Combo"
      ],
      "factionId": "Melee Weapons",
      "sourceFile": "Melee Weapons.cat"
    },
    {
      "id": "9e8c-dc75-19ab-36b0",
      "name": "Flail/Scourge",
      "type": "1-Handed",
      "range": "Melee",
      "keywords": [
        "+1 DICE"
      ],
      "rules": "**Unwieldy**: The +1 DICE Keyword does not apply when this Weapon is used as an Off- Hand Weapon.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Melee Weapons",
      "sourceFile": "Melee Weapons.cat"
    },
    {
      "id": "a6cd-257b-508a-11b9",
      "name": "Great Hammer/Maul",
      "type": "2-Handed",
      "range": "Melee",
      "keywords": [
        "+1 INJURY MODIFIER",
        "HEAVY"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Melee Weapons",
      "sourceFile": "Melee Weapons.cat"
    },
    {
      "id": "f11f-a0c6-d658-dcb6",
      "name": "Great Sword/Axe",
      "type": "2-Handed",
      "range": "Melee",
      "keywords": [
        "+1 INJURY DICE",
        "CRITICAL",
        "HEAVY"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Melee Weapons",
      "sourceFile": "Melee Weapons.cat"
    },
    {
      "id": "bd4b-593e-5a79-09fd",
      "name": "Misericordia",
      "type": "1-Handed",
      "range": "Melee",
      "keywords": [],
      "rules": "**Despatch**: This weapon has the IGNORE ARMOUR Keyword if the target is Down.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "Combat Medic only, Limit: 1",
        "Limit: 1"
      ],
      "factionId": "Melee Weapons",
      "sourceFile": "Melee Weapons.cat"
    },
    {
      "id": "1c55-92d4-5367-2e27",
      "name": "Polearm",
      "type": "2-Handed",
      "range": "Melee",
      "keywords": [
        "BLOCK",
        "CUMBERSOME"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "Shield Combo"
      ],
      "factionId": "Melee Weapons",
      "sourceFile": "Melee Weapons.cat"
    },
    {
      "id": "ef6c-14c0-f6f6-4859",
      "name": "Sword/Axe",
      "type": "1-Handed",
      "range": "Melee",
      "keywords": [
        "CRITICAL"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Melee Weapons",
      "sourceFile": "Melee Weapons.cat"
    },
    {
      "id": "53b3-b3f8-2109-1505",
      "name": "Trench Club",
      "type": "1-Handed",
      "range": "Melee",
      "keywords": [],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Melee Weapons",
      "sourceFile": "Melee Weapons.cat"
    },
    {
      "id": "c93b-27f6-78c1-68fa",
      "name": "Trench Knife",
      "type": "1-Handed",
      "range": "Melee",
      "keywords": [
        "-1 DICE"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Melee Weapons",
      "sourceFile": "Melee Weapons.cat"
    },
    {
      "id": "c63d-fe53-a980-4a2a",
      "name": "Tenderizer Maul",
      "type": "2-Handed",
      "range": "Melee",
      "keywords": [
        "+1 INJURY MODIFIER",
        "HEAVY"
      ],
      "rules": "Swinging Blow: When a model armed with a Tenderiser Maul takes a Fight ACTION, instead of making only 1 Melee Attack, you can make 1 Melee Attack against each enemy model with 1\" of the attacking model. Resolve each Melee Attack one at a time in the order of your choice.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "min",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Mercenaries",
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "ce55-e4a0-f88f-0df9",
      "name": "Man's Best Friend",
      "type": "Ability",
      "range": "-",
      "keywords": [],
      "rules": "This model may form a fireteam with another model in your Warband.",
      "cost": {
        "ducats": 0,
        "glory": 1
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Mercenaries",
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "0a72-3d4c-48ea-dd92",
      "name": "Purgation Ammunition",
      "type": "Equipment",
      "range": "-",
      "keywords": [
        "CONSUMABLE"
      ],
      "rules": "Before the battle begins, a model with Purgation Ammunition may use this item to grant up to 2 Pistol that they have equipped with the GAS keyword until the end of the battle.",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Mercenaries",
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "652b-a2bf-a330-c9ba",
      "name": "Winged Staff",
      "type": "Equipment",
      "range": "-",
      "keywords": [
        "HELD"
      ],
      "rules": "The wielder of a Wingstaff confers a +1 DICE to any Risky Actions other than attacks to itself and any friendly model within 4”.",
      "cost": {
        "ducats": 30,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Mercenaries",
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "9d4d-bc41-82dc-c18a",
      "name": "Crook",
      "type": "2-handed",
      "range": "Melee",
      "keywords": [
        "SHRAPNEL",
        "CUMBERSOME"
      ],
      "rules": "If a model wielding a Crook is within 1” of any model (friend or foe) that is Downed, it may make its Melee Attack a Risky Action. If the roll is a Failure, the model’s Activation immediately ends. If the roll is a Success or a Critical Success, it captures the model. The captured model cannot Stand nor move for any reason. It is instead moved with the wielder whenever they move for any reason, without triggering free attacks should the captured model is moved away from 1” of an enemy model. The model remains captured until the model wielder is Downed, taken Out of Action or chooses to release them, which can be done freely at any point during the wielder’s activation. While a model is captured, the model wielding the Crook may only make Melee Attacks against the captured model.",
      "cost": {
        "ducats": 25,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Mercenaries",
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "c289-b180-d583-04b0",
      "name": "Fumigator",
      "type": "2-handed",
      "range": "8\"",
      "keywords": [
        "-1 INJURY DICE",
        "IGNORE ARMOUR",
        "GAS",
        "FLAMETHROWER"
      ],
      "rules": "-",
      "cost": {
        "ducats": 25,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Mercenaries",
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "9c1c-2178-d6c0-cf6a",
      "name": "Heavy Fumigator",
      "type": "2-handed",
      "range": "10\"",
      "keywords": [
        "AUTOMATIC 2",
        "HEAVY",
        "IGNORE ARMOUR",
        "GAS",
        "FLAMETHROWER"
      ],
      "rules": "-",
      "cost": {
        "ducats": 45,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Mercenaries",
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "4b3d-28cf-cb23-aeba",
      "name": "Dog's Friend",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is forming a Fireteam with a Trench Dog",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "model",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 0,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Mercenaries",
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "d455-9d26-0f2d-3b30",
      "name": "Concerted Attack",
      "type": "Ability",
      "range": "-",
      "keywords": [],
      "rules": "If a model from a Fireteam hits a target that has already been hit by an attack made by the other member of their Fireteam, then you can spend 3 BLOOD MARKERS to convert the Injury Roll for the second attack to a Bloodbath Roll, even if the target is not Down.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "model",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 0,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Mercenaries",
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "bd3d-9eff-a7d0-2805",
      "name": "Dog Food",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "This unit can be deployed with a Trench Dog, found in the Mercenaries section.",
      "cost": {
        "ducats": 0,
        "glory": 1
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Mercenaries",
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "e8d8-c2a3-9a3e-b3b8",
      "name": "Reaping Claws",
      "type": "Special",
      "range": "Melee",
      "keywords": [
        "CLEAVE 2",
        "CRITICAL"
      ],
      "rules": "A Goetic Warlock can make a Melee Attack with the CLEAVE 2 and CRITICAL Keywords even though it does not have a Melee Weapon. In addition, the Off-Hand Weapon modifier applies to the second attack.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "min",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Mercenaries",
      "sourceFile": "Mercenaries.cat"
    },
    {
      "id": "999f-be77-8027-46c0",
      "name": "Holy Water of Lalibela",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "Healing Waters: Add +1 DICE when a model with the Holy Water of Lalibela takes a Success Roll for an ACTION that can remove BLOOD MARKERS and/or INFECTION MARKERS from another model or itself.",
      "cost": {
        "ducats": 3,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 5,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "57f1-1ef0-9659-e9e6",
      "name": "Tabot",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "Virtuous Rewards: Place 1 BLESSING MARKER next to a model that has a Tabot each time that an ACTION carried out by a friendly model results in one or more BLOOD MARKERS and/or INFECTION MARKERS being removed from one or more friendly models.",
      "cost": {
        "ducats": 0,
        "glory": 4
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "4f6a-a92d-d7a7-d512",
      "name": "Blood Cloak",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "A model wearing a Blood Cloak gains the Keyword SKIRMISHER",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 4,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "8bd6-c237-de4c-2e9a",
      "name": "Phosphorous Rounds",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "Before the battle begins, a model may use this item to grant a shotgun that they are equipped with the FIRE keyword until the end of the battle.",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "c562-c611-15d4-54c7",
      "name": "Holy Smoke",
      "type": "Equipment",
      "range": "-",
      "keywords": [
        "CONSUMABLE"
      ],
      "rules": "Holy Smoke: When you deploy a model that has Holy Smoke, you can say that they will consume it. If you do so, until the end of the game, the model has the NEGATE FEAR Keyword and -1 INJURY DICE is added to Injury Rolls for attacks that hit it.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "4f39-6eb0-3ad1-6338",
      "name": "Anfarro",
      "type": "Equipment",
      "range": "-",
      "keywords": [
        "NEGATE FEAR"
      ],
      "rules": "Token of Honour: Add +1 DICE to the Melee Characteristic of a model with an Anfarro.",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 6,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "3a61-396b-8340-2ce3",
      "name": "Greek Fire",
      "type": "GRENADE",
      "range": "6\"",
      "keywords": [
        "HEAVY",
        "BLAST 3\"",
        "FIRE",
        "CONSUMABLE",
        "SCATTER"
      ],
      "rules": "Rolls Injuries with 3d6 on a direct hit, or with +1 DICE for every other model caught in the blast. For the purpose of Battle Demolition on Combat Engineers, this item counts as a Satchel Charge.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 3,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "d678-de0f-c92b-f9ea",
      "name": "Shotel",
      "type": "1-Handed",
      "range": "Melee",
      "keywords": [
        "CRITICAL"
      ],
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "e02d-fb45-cb6c-34f0",
      "name": "Lochaber Axe",
      "type": "2-handed",
      "range": "Melee",
      "keywords": [
        "+2 INJURY DICE",
        "BLOCK",
        "CRITICAL",
        "CUMBERSOME",
        "HEAVY"
      ],
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "4bc1-a897-8ad3-e239",
      "name": "Tank-Splitter Sword",
      "type": "2-handed",
      "range": "Melee",
      "keywords": [
        "+1 INJURY DICE",
        "CRITICAL",
        "CUMBERSOME"
      ],
      "rules": "When you make an Injury Roll for an attack made with a Tank-Splitter Sword, determine if the target has an Armour Characteristic that is -1 or greater, or if it is wearing Armour or carrying a Shield. If it does, before rolling the dice for the Injury Roll, put one dice aside and turn it so that it shows a “6”. Roll the rest of the dice, then return the dice you put to one side; it counts as having rolled a 6. In addition, attacks made with a Tank-Splitter Sword are not affected by the Dragonslayer Patron Skill.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "b984-ef6c-1b2a-6c68",
      "name": "Dane Axe",
      "type": "2-handed",
      "range": "Melee",
      "keywords": [
        "ARMOUR PIERCING 2",
        "HEAVY",
        "CRITICAL",
        "+1 INJURY DICE"
      ],
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 3,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "1818-099d-77ef-0ad7",
      "name": "Red Banner",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This is the only banner the Red Brigade Warband can buy. As long as the model carrying this banner is not taken Out of Action, the Red Brigade will never retreat from combat. If they lose a Morale test, they will become Shaken instead. If the Standard bearer is taken Out of Action, the Warband takes Morale tests as normal.",
      "cost": {
        "ducats": 0,
        "glory": 2
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "b719-9833-e8fd-f089",
      "name": "Fire Shield",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "Always takes one hand to use in both melee and in ranged combat. Grants -1 to all injury rolls against the model. This bonus stacks with any armour the model wears, unless otherwise indicated. Any attack against this model that has the Keyword FIRE will suffer -1 DICE on injury rolls and will not cause an additional BLOOD MARKER.",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "d777-d95f-f173-9c07",
      "name": "Bagpipes",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "Bagpipe Fanfare: Add +1 DICE to Risky Success Rolls for friendly models that are taking a Dash ACTION and are within 4\" of one or more models with a Musical Instrument. Friendly models within 8\" are immune to Fear.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "bf4f-e324-29c3-1527",
      "name": "War Horn",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "Your army can purchase a special War Horn instead of a generic musical instrument, but only a Varagian Guard may equip it. This horn is identical to a musical instrument (including equipment restrictions and sharing a LIMIT with the regular Musical Instrument), except the model carrying it causes FEAR.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "2ddb-f3e4-5ad4-7d7e",
      "name": "Carnyx",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model causes FEAR. Any friendly models within 4” of the musician who is not Down can add +1 DICE to their Dash ACTIONS. Carnyces take one hand to use at all times as if it were a weapon.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "cddd-0785-2e56-eeb9",
      "name": "Concerted Attack",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "If a model in the FIRETEAM makes any kind of Attack ACTION (ranged or melee) against an opponent, where the other member of their FIRETEAM has already hit it with an attack ACTION during the same activation, the cost of a Bloodbath is reduced to three BLOOD MARKERS against this opponent, whether the model is standing or Down.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "self",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "2445-d55d-9de4-ac37",
      "name": "Coordinated Engagement",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "You can Activate friendly models that are part of the same Fireteam simultaneously. If you do so, you can take their ACTIONS in any order you wish, and you can switch between the two models freely. However, if the Activation of either member of the Fireteam ends during a simultaneous Activation (due to a failed Risky Success Roll for example), it immediately ends for the other model that is in the Fireteam too.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "self",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "a114-2461-5520-9cdb",
      "name": "Fireteam Alpha",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is a member of Fireteam Alpha.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "3ae4-3e37-6540-e2c8",
      "name": "Fireteam Beta",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is a member of Fireteam Beta.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "5153-8b77-2941-daa3",
      "name": "Fireteam Charlie",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is a member of Fireteam Charlie.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "b4d7-4d3d-3993-d73b",
      "name": "Mamluk-Guarded",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This unit is forming a fireteam with its Mamluk Faris bodyguard.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "04ff-1014-c632-3867",
      "name": "First Friend of Dog",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This unit is forming a fireteam with its dog friend.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "f10d-341e-5e15-05ec",
      "name": "Second Friend of Dog",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This unit is forming a fireteam with the other dog friend.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "f592-a9ac-af5c-4a17",
      "name": "Mind Linked",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model has formed a Fireteam with a Homunculus.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "b51c-b117-6a6c-d98f",
      "name": "Catphract Formation Alpha",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is a member of Catphract Formation Alpha.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "f36e-dddb-8a6f-e34b",
      "name": "Catphract Formation Beta",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is a member of Catphract Formation Beta.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "7b83-acba-914a-38c8",
      "name": "Blessing of the Pontiff",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "This model can take further ACTIONS if it fails in an attempted RISKY ACTION. Note that the action fails, but you are allowed to try any other ACTIONS on your profile without losing the Activation.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "309a-dd71-d814-5a48",
      "name": "Concerted Attack",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "If a model in the FIRETEAM makes any kind of Attack ACTION (ranged or melee) against an opponent, where the other member of their FIRETEAM has already hit it with an attack ACTION during the same activation, the cost of a Bloodbath is reduced to three BLOOD MARKERS against this opponent, whether the model is standing or Down.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "self",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "5164-4370-cef3-ea1e",
      "name": "Coordinated Engagement",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "All models that are part of the same FIRETEAM can be activated at the same time without the opponent getting their turn in between and can take their ACTIONS in any order they wish, switching between the two models. Note that if the Activation of either member of the FIRETEAM forcefully ends (due to a failed RISKY ACTION for example), it ends both Activations.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "self",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "7b02-d2fa-45e0-7b86",
      "name": "Fireteam Alpha",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is a member of Fireteam Alpha.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "0256-956d-2f01-2ccd",
      "name": "Fireteam Beta",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is a member of Fireteam Beta.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "7cae-a8a7-46f0-a2c6",
      "name": "Fireteam Charlie",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is a member of Fireteam Charlie.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "b59f-143c-5c28-7765",
      "name": "Mamluk-Guarded",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This unit is forming a fireteam with its Mamluk Faris bodyguard.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "6096-b9bf-a81f-b08e",
      "name": "Gunslinger",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "If armed with two pistols, this model can make ranged attack ACTIONS with both of them when making a ranged attack. In addition, this model suffers no penalty when using a pistol as an Off-Hand weapon.",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "66e9-8f4f-e3bf-5d93",
      "name": "Papal Courage",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is immune to FEAR.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "1546-e8f0-cbfd-f2b1",
      "name": "Menaulatoi",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "As a seasoned leader of Longspear formations, the Princeps gains +1 DICE to their ranged attack ACTIONS when fight­ing within 4\" of another Menaulatoi. This does not apply to GRENADE weapons.",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "c931-d8d8-497d-d497",
      "name": "Vanguard",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "As an agile strategist, this leader can be deployed on any board edge, as long as they are at least 8\" away from enemies. This only applies if INFILTRATORS are allowed in the battle. As a Vanguard, they are deployed after them. They can also be placed in your own deployment area as per usual.",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "53d0-3231-931f-d7a1",
      "name": "Longspear Doctrine",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "Like the regular line infantry, a Princeps treats Short Range of any ranged weapon as +4\" longer than usual.",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "f11c-fa32-df03-b98a",
      "name": "Piston Reconfiguration",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "The Warlord’s armour has been reconfigured to gain +1 to their melee characteristic, at the cost of -1 to their ranged characteristic. It is already reflected in their profile. This upgrade gives the keyword AS­SAULT to ranged weapons with the Shield Combo indicator when used with a Trench Shield.",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "ba8a-6d25-4842-123c",
      "name": "Axe Mastery",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "On a successful charge, the Warlord may immediately make a melee attack ACTION with one equipped axe. This is in addition to any other melee attack ACTIONS during this activation.",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "2f38-3778-4b83-a125",
      "name": "Shield Bash",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "Varangian Guards may use any Shield as an off-hand weapon with -1 INJURY DICE. It functions otherwise like a Trench Club.",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "aac6-410b-8a02-3bb9",
      "name": "Indomitable",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "The Warlird is immune to FEAR.",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "9738-ded5-a2b7-3247",
      "name": "Fire Support Reconfiguration",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "For an additional cost of +5 ducats, the armour of Cataphracti can be reconfigured for sustained fire support. With this upgrade, firing a Machine Gun does not end the turn of the model, however doing so lowers the Machine Gun's range to 24\" and prohibits equipping any melee weapons. This upgrade can be reversed whenever you update your roster.",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "2dba-a286-9e20-ff59",
      "name": "Piston Reconfiguration",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "These models may be reconfigured to gain +1 to their melee characteristic, at the cost of -1 to their ranged characteristic. This upgrade gives the keyword AS­SAULT to ranged weapons with the Shield Combo indicator when used with a Trench Shield. This upgrade can be reversed whenever you update your roster.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "997b-3cb7-7dee-c67d",
      "name": "Concerted Attack",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "If a model from a Fireteam hits a target that had been hit by an attack made by the other member of their Fireteam earlier in the same joint Activation, then you can spend 3 BLOOD MARKERS to convert the Injury Roll for the second attack to a Bloodbath Roll, even if the target is not Down.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "34c8-dd0b-8701-b04f",
      "name": "Coordinated Engagement",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "All models that are part of the same FIRETEAM can be activated at the same time without the opponent getting their turn in between and can take their ACTIONS in any order they wish, switching between the two models. Note that if the Activation of either member of the FIRETEAM forcefully ends (due to a failed RISKY ACTION for example), it ends both Activations.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "0ce7-425f-ff86-166f",
      "name": "Concerted Attack",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "If a model in the FIRETEAM makes any kind of Attack ACTION (ranged or melee) against an opponent, where the other member of their FIRETEAM has already hit it with an attack ACTION during the same activation, the cost of a Bloodbath is reduced to three BLOOD MARKERS against this opponent, whether the model is standing or Down.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "d215-cf89-8b45-e79a",
      "name": "Coordinated Engagement",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "All models that are part of the same FIRETEAM can be activated at the same time without the opponent getting their turn in between and can take their ACTIONS in any order they wish, switching between the two models. Note that if the Activation of either member of the FIRETEAM forcefully ends (due to a failed RISKY ACTION for example), it ends both Activations.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "7913-8551-cbd8-8dd4",
      "name": "Assigned Sword",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "Enables the \"Mamluk-Guarded\" Fireteam option for Elites.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "d469-8305-d8f7-a78b",
      "name": "Concerted Attack",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "If a model in the FIRETEAM makes any kind of Attack ACTION (ranged or melee) against an opponent, where the other member of their FIRETEAM has already hit it with an attack ACTION during the same activation, the cost of a Bloodbath is reduced to three BLOOD MARKERS against this opponent, whether the model is standing or Down.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "8e6c-2882-f827-e44c",
      "name": "Coordinated Engagement",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "All models that are part of the same FIRETEAM can be activated at the same time without the opponent getting their turn in between and can take their ACTIONS in any order they wish, switching between the two models. Note that if the Activation of either member of the FIRETEAM forcefully ends (due to a failed RISKY ACTION for example), it ends both Activations.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "867a-dbfe-62da-2e28",
      "name": "Swiss Guard",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "The Lieutenant and up to 4 models in a Papal States Intervention Force Warband can have the NEGATE FEAR Keyword at no additional cost in ducats.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "91a5-be1f-3604-05ee",
      "name": "Cold Steel Discounts",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "For each melee weapon in your Warband, you may mark it as the first one you've purchased here. If you lose it, and buy another, unmark it. Be honest!",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "min",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "ef92-4c10-4b69-05e3",
      "name": "Third Party Subfactions",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "These subfactions are not fully official. They are officially condoned by Factory Fortress, but no assurances are made to balance or consistency with rules. They are included here for the benefit of the community. Please only use these factions with permission from all involved players.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "7156-30e7-2538-f23c",
      "name": "Concerted Attack",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "If a model in the FIRETEAM makes any kind of Attack ACTION (ranged or melee) against an opponent, where the other member of their FIRETEAM has already hit it with an attack ACTION during the same activation, the cost of a Bloodbath is reduced to three BLOOD MARKERS against this opponent, whether the model is standing or Down.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "self",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "7d15-6383-16ed-4313",
      "name": "Coordinated Engagement",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "You can Activate friendly models that are part of the same Fireteam simultaneously. If you do so, you can take their ACTIONS in any order you wish, and you can switch between the two models freely. However, if the Activation of either member of the Fireteam ends during a simultaneous Activation (due to a failed Risky Success Roll for example), it immediately ends for the other model that is in the Fireteam too.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "self",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "dd85-f021-dec5-7a53",
      "name": "Fireteam Alpha",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is a member of Fireteam Alpha.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "5f27-71d6-0e5a-d7e7",
      "name": "Fireteam Beta",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is a member of Fireteam Beta.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "1c48-5a77-bd9c-4678",
      "name": "Fireteam Charlie",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is a member of Fireteam Charlie.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "4b9e-5284-97ed-af1b",
      "name": "Mamluk-Guarded",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This unit is forming a fireteam with its Mamluk Faris bodyguard.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "1b7b-167c-e0d7-94df",
      "name": "First Friend of Dog",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This unit is forming a fireteam with its dog friend.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "277a-0208-cd17-f687",
      "name": "Second Friend of Dog",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This unit is forming a fireteam with the other dog friend.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "1d9f-bbe2-474b-b25f",
      "name": "Mind Linked",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model has formed a Fireteam with a Homunculus.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "1f8d-1b65-1dd2-9853",
      "name": "Catphract Formation Alpha",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is a member of Catphract Formation Alpha.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "bd30-a567-830c-3ef6",
      "name": "Catphract Formation Beta",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is a member of Catphract Formation Beta.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "f580-8b00-a18a-0d48",
      "name": "Carried Grenades",
      "type": "GRENADE",
      "range": "8\"",
      "keywords": [
        "ASSAULT",
        "BLAST 2\"",
        "IGNORE COVER",
        "IGNORE LONG RANGE",
        "SHRAPNEL"
      ],
      "rules": "-",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "ba2c-f56a-e419-764f",
      "name": "Carried Molotov",
      "type": "GRENADE",
      "range": "6\"",
      "keywords": [
        "-1 INJURY DICE",
        "ASSAULT",
        "FIRE",
        "IGNORE COVER",
        "IGNORE LONG RANGE"
      ],
      "rules": "Liquid Fire: If the Success Roll for a Ranged Attack made with a Molotov Cocktail is a Critical Success then the Injury Roll for the attack has the IGNORE ARMOUR Keyword.",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "109e-695b-e73d-e9f5",
      "name": "Man's Best Friend",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This dog can form a fireteam with another model in your Warband.",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "a7b5-4e6d-1d0e-de50",
      "name": "Atonement Bell",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This bell always takes the use of one hand of the Communicant. The Communicant can make an off-hand attack with the Bell. It causes no damage, but any enemy on a 40mm base or smaller hit with an Atonenment Bell can be moved D3 inches from the Communicant into any direction the Communicant chooses. This can break them out of melee combat (allowing free attacks), falling down, into hazardous terrain etc. It cannot be made to move the model into another Melee combat, however.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "min",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "New Antioch",
      "sourceFile": "New Antioch.cat"
    },
    {
      "id": "037f-15ba-8ef3-332e",
      "name": "Anti-Material Rifle",
      "type": "2-Handed",
      "range": "36\"",
      "keywords": [
        "+1 INJURY DICE",
        "CRITICAL",
        "HEAVY",
        "IGNORE ARMOUR"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "b71e-ef7c-e836-72ec",
      "name": "Automatic Pistol",
      "type": "1-Handed",
      "range": "12\"/Melee",
      "keywords": [
        "ASSAULT",
        "AUTOMATIC 2",
        "PISTOL"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "ELITE only, Limit: 3",
        "Limit: 2"
      ],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "057b-c114-772f-299c",
      "name": "Automatic Rifle",
      "type": "2-Handed",
      "range": "24\"",
      "keywords": [
        "ASSAULT",
        "AUTOMATIC 2"
      ],
      "rules": "**Focused Fire**: When this weapon is used to make 2 Ranged Attacks, the same enemy model must be the target of both attacks",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "Bayonet Lug, Limit: 1",
        "Bayonet Lug, Limit: 2"
      ],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "5b1a-ebaa-4d59-f2d7",
      "name": "Automatic Shotgun",
      "type": "2-Handed",
      "range": "12\"",
      "keywords": [
        "+1 DICE",
        "ASSAULT",
        "SHOTGUN"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "Bayonet Lug, Shield Combo, Limit: 2",
        "Bayonet Lug, Shield Combo"
      ],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "2f82-6dd2-69c2-2fea",
      "name": "Blunderbuss",
      "type": "2-Handed",
      "range": "10\"",
      "keywords": [
        "SHRAPNEL"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "Shield Combo"
      ],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "2af8-2638-a777-f84e",
      "name": "Bolt-Action Rifle",
      "type": "2-Handed",
      "range": "24\"",
      "keywords": [],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "Bayonet Lug"
      ],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "4c15-195e-0fd4-6f54",
      "name": "Flamethrower",
      "type": "2-Handed",
      "range": "8\"",
      "keywords": [
        "-1 INJURY DICE",
        "FIRE",
        "FLAMETHROWER",
        "IGNORE ARMOUR"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "Limit: 3",
        "Limit: 2"
      ],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "a828-6f96-7eb8-7934",
      "name": "Grenade Launcher",
      "type": "2-Handed",
      "range": "36\"",
      "keywords": [
        "BLAST 3\"",
        "HEAVY",
        "IGNORE COVER",
        "SHRAPNEL"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "Limit: 2"
      ],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "b8e5-9d0c-ebd4-8208",
      "name": "Heavy Flamethrower",
      "type": "2-Handed",
      "range": "10\"",
      "keywords": [
        "-1 INJURY DICE",
        "AUTOMATIC 2",
        "FIRE",
        "FLAMETHROWER",
        "HEAVY",
        "IGNORE ARMOUR"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "Limit: 1",
        "Limit: 2"
      ],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "7bbb-8b13-8f13-49dd",
      "name": "Heavy Shotgun",
      "type": "2-Handed",
      "range": "12\"",
      "keywords": [
        "+1 DICE",
        "+1 INJURY DICE",
        "HEAVY",
        "SHOTGUN"
      ],
      "rules": "**Tungsten-orichalcum Alloy Shot**: Add +1 INJURY DICE to rolls for Ranged Attacks made by this Weapon at Short Range.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "Shield Combo, Limit: 2"
      ],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "057c-08d9-c23f-7b47",
      "name": "Machine Gun",
      "type": "2-Handed",
      "range": "36\"",
      "keywords": [
        "AUTOMATIC 3",
        "HEAVY",
        "RELOAD"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "Limit: 2",
        "Limit: 1",
        "Amalgam only, Limit: 1"
      ],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "86be-7c29-216e-66b8",
      "name": "Musket",
      "type": "2-Handed",
      "range": "18\"",
      "keywords": [
        "-1 INJURY DICE"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "Bayonet Lug"
      ],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "ad8a-00d3-726b-b10c",
      "name": "Silenced Pistol",
      "type": "1-Handed",
      "range": "12\"/Melee",
      "keywords": [
        "ASSAULT",
        "PISTOL"
      ],
      "rules": "**Silent**: Add +1 DICE to the roll if the attacker is in contact with a terrain piece that is at least 1/2\" tall and that lies in between it and the target model.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "ELITE only"
      ],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "d44a-c775-04b2-e644",
      "name": "Semi-Automatic Rifle",
      "type": "2-Handed",
      "range": "24\"",
      "keywords": [
        "ASSAULT"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "Bayonet Lug"
      ],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "c339-21cd-0b06-15fe",
      "name": "Shotgun",
      "type": "2-Handed",
      "range": "12\"",
      "keywords": [
        "+1 DICE",
        "SHOTGUN"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "Bayonet Lug, Shield Combo",
        "Shield Combo"
      ],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "917f-2532-74e9-33ed",
      "name": "Pistol",
      "type": "1-Handed",
      "range": "12\"/Melee",
      "keywords": [
        "PISTOL"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "b5a1-e8c3-24e5-a742",
      "name": "Sniper Rifle",
      "type": "2-Handed",
      "range": "48\"",
      "keywords": [
        "+1 DICE",
        "CRITICAL",
        "RISKY"
      ],
      "rules": "**Bull's Eye**: If the Success Roll for a Ranged Attack made with a Sniper Rifle is a Critical Success then the Injury Roll for the attack has the IGNORE ARMOUR Keyword.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "Limit: 3",
        "ELITE & Janissaries only, Limit: 2"
      ],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "f536-9890-8f44-99d7",
      "name": "Submachine Gun",
      "type": "2-Handed",
      "range": "16\"",
      "keywords": [
        "ASSAULT"
      ],
      "rules": "**Quick Bursts: A model armed with a Submachine Gun can take two Shoot ACTIONS during the same Activation, as long as the Submachine Gun is used to make both attacks. The Shoot ACTIONS can be taken one after the other, or other ACTIONS can be taken between the Shoot ACTIONS.**",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "Bayonet Lug, Shield Combo, Limit: 2",
        "Bayonet Lug, Shield Combo",
        "Bayonet Lug, Shield Combo, Limit: 1"
      ],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "00d3-c557-3993-f094",
      "name": "Frag Grenades",
      "type": "Grenade",
      "range": "8\"",
      "keywords": [
        "ASSAULT",
        "BLAST 2”",
        "IGNORE COVER",
        "IGNORE LONG RANGE",
        "SHRAPNEL",
        "FUMBLE"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "5f7a-f61c-c4cc-98ad",
      "name": "Gas Grenades",
      "type": "Grenade",
      "range": "8\"",
      "keywords": [
        "-1 INJURY DICE",
        "ASSAULT",
        "BLAST 3”",
        "GAS",
        "IGNORE ARMOUR",
        "IGNORE COVER",
        "IGNORE LONG RANGE",
        "FUMBLE"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "316b-d210-767e-e340",
      "name": "Incendiary Grenades",
      "type": "Grenade",
      "range": "8\"",
      "keywords": [
        "ASSAULT",
        "FIRE",
        "IGNORE COVER",
        "IGNORE LONG RANGE",
        "FUMBLE"
      ],
      "rules": "**Liquid Fire**: If the Success Roll for a Ranged Attack made with an Incendiary Grenade is a Critical Success then the Injury Roll for the attack has the IGNORE ARMOUR Keyword",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [
        "Limit: 2",
        "Jabirean Alchemist Only"
      ],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "414f-af63-666d-59d1",
      "name": "Molotov Cocktail",
      "type": "Grenade",
      "range": "6\"",
      "keywords": [
        "-1 INJURY DICE",
        "ASSAULT",
        "FIRE",
        "IGNORE COVER",
        "IGNORE LONG RANGE",
        "FUMBLE"
      ],
      "rules": "**Liquid Fire**: If the Success Roll for a Ranged Attack made with an Incendiary Grenade is a Critical Success then the Injury Roll for the attack has the IGNORE ARMOUR Keyword",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "d07c-55fe-e41d-a57f",
      "name": "Satchel Charge",
      "type": "Grenade",
      "range": "6\"",
      "keywords": [
        "+1 INJURY DICE",
        "BLAST 3”",
        "CONSUMABLE",
        "HEAVY",
        "IGNORE ARMOUR",
        "IGNORE COVER",
        "SCATTER"
      ],
      "rules": "**Heavy Explosive**: Once during a game, a model with a Satchel Charge can use it to make a Ranged Attack.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [
        "Consumable, Limit: 3 (1 per model)"
      ],
      "factionId": "Ranged Weapons",
      "sourceFile": "Ranged Weapons.cat"
    },
    {
      "id": "e51e-7de9-7131-6994",
      "name": "Sacrificial Lamb",
      "type": "Equipment",
      "range": "-",
      "keywords": [
        "CONSUMABLE"
      ],
      "rules": "* Warded by Blood: When you deploy a model that has a Sacrificial Lamb, you can say that they will sacrifice it and anoint themselves with its blood. If you do so, the first BLOOD MARKER placed on the model is ignored.",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "403b-687b-4044-77de",
      "name": "Henbrane",
      "type": "Equipment",
      "range": "-",
      "keywords": [],
      "rules": "As long as this model does not have any BLOOD MARKER on it, it is immune to the Minor Injury result, and thus does not take a BLOOD MARKER when suffering one. However, it will still take the additional blood from a weapon with a keyword such as SHRAPNEL. At the end of the battle, the model is then immediately taken Out of Action, and must roll to see if they survive as per the normal rules for Non-Elites being taken Out of Action.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "986b-d504-38d0-832f",
      "name": "Geirr",
      "type": "2-handed",
      "range": "Melee",
      "keywords": [
        "CUMBERSOME",
        "BLOCK"
      ],
      "rules": "When this model is charged, it may make a Melee Attack ACTION. If the roll is a Failure, nothing happens. If the roll is a Success or a Critical Success, the enemy model charging it gains 1 BLOOD MARKER.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "55e3-793d-4961-e12f",
      "name": "Blood Eagle Banner",
      "type": "Equipment",
      "range": "-",
      "keywords": [
        "HELD"
      ],
      "rules": "Before the start of the battle, you may choose to either Punish the Villutrúarmaður or Offer unto the Gods.",
      "cost": {
        "ducats": 30,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "61e5-6561-5d91-b9c5",
      "name": "Fire Shield",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "Always takes one hand to use in both melee and in ranged combat. Grants -1 to all injury rolls against the model. This bonus stacks with any armour the model wears, unless otherwise indicated. Any attack against this model that has the Keyword FIRE will suffer -1 DICE on injury rolls and will not cause an additional BLOOD MARKER.",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        },
        {
          "type": "max",
          "value": 2,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "fdd6-07ba-42a3-3578",
      "name": "Trench Shield (Nordic)",
      "type": "Shield",
      "range": "-",
      "keywords": [],
      "rules": "Provides the benefit of cover at all times and a model equipped with a Trench Shield (Nordic) always count as having the defended obstacle bonus when charged. Additionally, a friendly model in base to base contact with a model equipped with a Trench Shield (Nordic) treats the shieldbearer as cover, following the normal rules for cover.",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "7ab4-3db7-414c-ba96",
      "name": "Stormbreaker Shield",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "A Stormbreaker Shield is a Trench Shield (Nordic). In addition, add -1 INJURY DICE to rolls for Ranged Attacks that hit the model.",
      "cost": {
        "ducats": 35,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "a915-3cb5-2de7-9338",
      "name": "Catherine Wheel",
      "type": "1-Handed",
      "range": "Melee",
      "keywords": [
        "+1 DICE",
        "DEADLY",
        "RISKY",
        "HEAVY"
      ],
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "5cef-9bbb-5aa1-f6f9",
      "name": "Trench Mortar",
      "type": "2-Handed",
      "range": "48\"",
      "keywords": [
        "+1 INJURY DICE",
        "BLAST 3''",
        "FIRE",
        "HEAVY",
        "IGNORE COVER",
        "SCATTER"
      ],
      "rules": "High Trajectory: When a Trench Mortar is used to make a Ranged Attack, the target model (or target point, if targeting a point on the ground) cannot be within 6\" of the attacking model. Note that if the attack Scatters it may end up landing within 6\" of the attacking model.",
      "cost": {
        "ducats": 40,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "ca96-4933-b496-593f",
      "name": "Gas Censer",
      "type": "2-Handed",
      "range": "6''",
      "keywords": [
        "GAS",
        "IGNORE ARMOUR",
        "RELOAD"
      ],
      "rules": "Cloud of Gas: When you take a Shoot ACTION with this model, instead of making a Ranged Attack, you can unleash a cloud of gas. If you do so, do not make a Success Roll. Instead, all other models within 6” of the model using the Gas Censer are hit, and an Injury Roll must be made for each one. Note that the attack hits all models, friend or foe, apart from the model making the attack, regardless of Line of Sight.",
      "cost": {
        "ducats": 50,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "e37a-b7ce-312c-3242",
      "name": "Autocannon (Bursts)",
      "type": "2-Handed",
      "range": "48\"",
      "keywords": [
        "+1 INJURY DICE",
        "AUTOMATIC 3",
        "HEAVY"
      ],
      "rules": "-",
      "cost": {
        "ducats": 55,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "584f-141d-ce83-d55d",
      "name": "Autocannon (Full Auto)",
      "type": "2-Handed",
      "range": "48\"",
      "keywords": [
        "+1 INJURY DICE",
        "AUTOMATIC 5",
        "HEAVY",
        "RELOAD",
        "RISKY"
      ],
      "rules": "Full Auto: Each time you take a Shoot ACTION with an Autocannon, you must choose to either fire it using the Bursts Weapon Profile or the Full Auto Weapons Profile.",
      "cost": {
        "ducats": 55,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "69ba-974b-0e6f-7391",
      "name": "Gas Filters",
      "type": "Special",
      "range": "-",
      "keywords": [
        "NEGATE GAS"
      ],
      "rules": "-",
      "cost": {
        "ducats": 5,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "e6ee-0b99-239f-7120",
      "name": "Holy Diesel Engine",
      "type": "Special",
      "range": "-",
      "keywords": [],
      "rules": "Advanced Design: When you take a Dash ACTION with this Anchorite Shrine, you can choose to add +2 DICE to the Risky Success Roll. If you do so, you must place 1 BLOOD MARKER next to the model",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "3869-f6f2-7f5a-92af",
      "name": "Sacred Geometry",
      "type": "Special",
      "range": "-",
      "keywords": [],
      "rules": "Divine Accuracy: Add +1 DICE to the Ranged Characteristic of this Anchorite Shrine.",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "828c-64ab-63e9-051b",
      "name": "Grand Anchorite",
      "type": "Special",
      "range": "-",
      "keywords": [],
      "rules": "Impossible to Stop: Enemy models are not allowed to make a Melee Attack when a Grand Anchorite Shrine that is within 1\" of them retreats. In addition, a Grand Anchorite Shrine can take a Move or Charge ACTION if it starts within 1\" of any enemy models.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "2359-5cf1-b45c-b058",
      "name": "Wrathful Cherub Face",
      "type": "Special",
      "range": "-",
      "keywords": [],
      "rules": "Cower Before The Lord: An enemy model that does not have the FEAR keyword and that starts an Activation within 1\" of this Anchorite Shrine must take a Retreat ACTION as part of the Activation. It cannot take any ACTION that require a Risky Success Roll while it is within 1\" of this Anchorite Shrine.",
      "cost": {
        "ducats": 20,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "ef56-de02-03da-7fd7",
      "name": "Hallowed Anchorite",
      "type": "Special",
      "range": "-",
      "keywords": [],
      "rules": "Manifold Blessings: A Hallowed Anchorite Shrine can be promoted to ELITE status in the Promotions & Experience Step of the Campaign Phase.",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        },
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "bd5a-aaba-367a-8f09",
      "name": "Piston Legs",
      "type": "Special",
      "range": "-",
      "keywords": [],
      "rules": "Grind to Dust ACTION: This Anchorite Shrine can take a Grind to Dust ACTION. If it does so, it makes a Melee Attack but must target an enemy model within 1\" that is Down and is mounted on a base that is 32mm or smaller. The attack does not use a Melee Weapon.",
      "cost": {
        "ducats": 10,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "78c1-4e06-7fff-4d4b",
      "name": "Mind Linked",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is in a fireteam with a Homunculus.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "cdfe-5f3e-eefe-e3e1",
      "name": "Vengeful Fury",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "BLOOD MARKERS are never placed next to a model with the Wrath of God special rule, and it has the NEGATE FEAR Keyword. It cannot be Broken on the Wheel by an Anchorite Shrine. A model with the Wrath of God special rule cannot have Ranged Weapons or Armour (it can have a Shield).",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "02e8-c715-06fe-e490",
      "name": "Mind Linked",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "This model is in a fireteam with a Homunculus.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "3ee5-5ddf-dfdd-b3d4",
      "name": "Beyond Death",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "Any attacks against a Martyr-Penitent add -1 DICE when rolling on the Injury Table.",
      "cost": {
        "ducats": 15,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 1,
          "scope": "parent",
          "includeChildSelections": false
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "8cbd-7395-617e-ef28",
      "name": "Awaited",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "If the Ecclesiastic Prisoner is taken Out of Action by its Martyrdom Device, it does not count as being Out of Action for any rules related to Morale.",
      "cost": {
        "ducats": 35,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 4,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "4283-0424-9334-02b2",
      "name": "Martyrdom Device",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "An Ecclesiastic Prisoner with a Martyrdom Device can take a Trigger Martyrdom Device ACTION. If they do so, the Martyrdom Device detonates and cannot be used again. When Martyrdom Device detonates, make an Injury Roll for all models within 3\" of the Ecclesiastic Prisoner (friend or foe, including the Ecclesiastic Prisoner). Make the Injury Roll for the Ecclesiastic Prisoner by rolling 4D6 and adding all 4 dice together, and add +1 INJURY DICE to the Injury Rolls for other models that are within 1\" of the Ecclesiastic Prisoner. If an Ecclesiastic Prisoner detonates their Martyrdom Device and survives the game, you must either buy them a new Martyrdom Device for 35 ducats, or use them without one.",
      "cost": {
        "ducats": 35,
        "glory": 0
      },
      "constraints": [
        {
          "type": "max",
          "value": 4,
          "scope": "roster",
          "includeChildSelections": true
        }
      ],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    },
    {
      "id": "9e61-bd1d-33f1-f936",
      "name": "Third Party Subfactions",
      "type": "Battlekit",
      "range": "",
      "keywords": [],
      "rules": "These subfactions are not fully official. They are officially condoned by Factory Fortress, but no assurances are made to balance or consistency with rules. They are included here for the benefit of the community. Please only use these factions with permission from all involved players.",
      "cost": {
        "ducats": 0,
        "glory": 0
      },
      "constraints": [],
      "restrictions": [],
      "factionId": "Trench Pilgrims",
      "sourceFile": "Trench Pilgrims.cat"
    }
  ],
  "factions": [],
  "keywords": [
    {
      "name": "FUMBLE",
      "type": "Effect",
      "description": "If the Success Roll for an attack made with a Weapon that has the FUMBLE Keyword is 2 or less, then the attacking model fumbles the attack and hits themselves instead of the target. Treat the attack as a successful attack made by the Weapon that targeted the attacking model."
    },
    {
      "name": "MERCENARY",
      "type": "Effect",
      "description": "This model is a Mercenary and can be recruited by various Factions. Mercenaries do not benefit from Faction special rules that refer to ‘models in a [Faction] Warband’, such as the New Antioch Concentrated Attack rule, including Warband Variant special rules. They do count as friendly models for the purposes of other rules used by their Warband unless stated otherwise. In a campaign, this includes counting towards Threshold Limits and Field Strength, completing Glorious Deeds, rolling on the Trauma Table for them if they are ELITE and taken Out of Action, being Promoted and gaining Experience Points, and so on."
    }
  ],
  "meta": {
    "rulesetId": "trenchline",
    "baseCommit": "1b463a8e2eaafc9d6722ae6eeda93e296fb7012b",
    "layers": [
      "dispatch-01"
    ]
  },
  "variants": [
    {
      "id": "papal-states-intervention-force",
      "name": "PAPAL STATES INTERVENTION FORCE",
      "factionId": "",
      "specialRules": [
        {
          "name": "Far from Home",
          "description": "A Papal States Intervention Force Warband cannot include Trench Moles."
        },
        {
          "name": "Lector",
          "description": "A Papal States Intervention Force Warband must include 1 Trench Cleric, but does not have to include a Lieutenant. A Trench Cleric in a Papal States Intervention Force Warband has the LEADER Keyword and the following additional ability: Arise and be Healed! ACTION: A Papal States Intervention Force Trench Cleric can take an Arise and be Healed! ACTION. If they do so, take a Risky Success Roll for the Trench Cleric. If the roll is a Failure, nothing happens, and the Trench Cleric’s Activation ends. If the roll is a Success or Critical Success, pick the Trench Cleric or 1 friendly model within 3” of the Trench Cleric. The model you pick can stand back up at no cost to their movement, and you can remove up to D3 BLOOD MARKERS and/or INFECTION MARKERS from the model."
        },
        {
          "name": "Specialist Force",
          "description": "You have 500 👑 and 11 ☼ to recruit a Papal State Intervention Force Warband for a campaign (▶ see Starting a Warband). A Papal States Intervention Force gains 4 ☼ each time it calls for Reinforcements. In a campaign, their Threshold Value is reduced by 200 👑 . When recruiting models as a latecomer for a campaign, or for a one-off game, after agreeing upon the size of the game, reduce the amount of 👑 a Papal States Intervention Force Warband has to spend by 200 👑 , and increase the amount of ☼ they have to spend by 11 ☼"
        },
        {
          "name": "Supreme Blessing",
          "description": "When you recruit a Papal States Intervention Force Warband, you must give the Supreme Pontiff ’s Crucifix to one model in the Warband. The Supreme Pontiff ’s Crucifix taken when the Warband is created is free and does not cost any ☼ (if it is lost then the replacement must be paid for normally)."
        },
        {
          "name": "Swiss Guard",
          "description": "The Lieutenant and up to 4 models in a Papal States Intervention Force Warband can have the NEGATE FEAR Keyword at no additional cost in 👑 ."
        },
        {
          "name": "Inspiring Relic",
          "description": "The bearer of this relic does not end their activation after a failed Risky Success Roll. PP"
        }
      ],
      "ops": []
    },
    {
      "id": "kingdom-of-alba-assault-detachment",
      "name": "KINGDOM OF ALBA ASSAULT DETACHMENT",
      "factionId": "",
      "specialRules": [
        {
          "name": "Bagpipes",
          "description": "One Musical Instrument in a Kingdom of Alba Assault Detachment Warband can be upgraded to a set of Bagpipes at no additional cost in 👑 . Friendly models within 8” of a model that has a set of Bagpipes have the NEGATE FEAR Keyword."
        },
        {
          "name": "Brave",
          "description": "Add +1 DICE to the Success Rolls for a Morale Check for a Kingdom of Alba Assault Detachment Warband."
        },
        {
          "name": "Celtic Machine Armour",
          "description": "Models in a Kingdom of Alba Assault Detachment Warband with Machine Armour have a Charge Bonus of D6” (it is not reduced to D3” by Machine Armour)."
        },
        {
          "name": "Claymore Smiths",
          "description": "Great Swords/Axes cost 7 👑 instead of 12 for models from a Kingdom of Alba Assault Detachment Warband."
        },
        {
          "name": "Cold Steel",
          "description": "Halve the cost of a Melee Weapon the first time that is purchased for a Kingdom of Alba Assault Detachment Warband. For example, the first Sword/ Axe purchased for a Warband would cost 2 👑 while any further Swords/Axes would cost 4 👑 each"
        },
        {
          "name": "Dum-Dum Ammunition",
          "description": "Models in a Kingdom of Alba Assault Detachment Warband can have Dum-Dum Bullets (▶ see Battlekit in the Trench Crusade Digital Rulebook) at a cost of 5 👑 each. The Dum-Dum Bullets have the Limit: 3 stipulation."
        },
        {
          "name": "Highland Strength",
          "description": "The Lieutenant and any Shock Troopers in a Kingdom of Alba Assault Detachment Warband have the STRONG Keyword at no additional cost in 👑 ."
        },
        {
          "name": "Lightly-armoured",
          "description": "Only the Lieutenant and Mechanized Heavy Infantry models in a Kingdom of Alba Assault Detachment Warband can have Reinforced Armour or Machine Armour."
        },
        {
          "name": "Melee-focused",
          "description": "Mechanized Heavy Infantry in a Kingdom of Alba Assault Detachment Warband have a Melee Characteristic of +1 DICE and a Ranged Characteristic of +0 DICE."
        },
        {
          "name": "Rampant Charge",
          "description": "Models in a Kingdom of Alba Assault Detachment Warband have the IGNORE DEFENDED OBSTACLE Keyword."
        },
        {
          "name": "Strained Supply",
          "description": "Automatic Shotguns, Grenade Launchers, Machine Guns, Sniper Rifles, and Submachine Guns in a Kingdom of Alba Assault Detachment Warband have a Limit of 1. KINGDOM OF ALBA ASSAULT DETACHMENT ARMOURY & BATTLEKIT The following pieces of Battlekit are available to a Kingdom of Alba Warband. Lochaber Axe | 20 👑 Lochaber axes combine the power of the battle axe with the defensive qualities of a polearm. Its wicked spike has stopped many a Heretic in their tracks. Dùn Èideann Guard are especially adept at their use. Type Range Keywords 2 -Handed Melee +2 INJURY DICE, BLOCK, CRITICAL, CUMBERSOME, HEAVY"
        }
      ],
      "ops": []
    },
    {
      "id": "stosstruppen-of-the-free-state-of-prussia",
      "name": "STOSSTRUPPEN OF THE FREE STATE OF PRUSSIA",
      "factionId": "",
      "specialRules": [
        {
          "name": "Athleticism",
          "description": "The Lieutenant and Shock Troopers in a Stosstruppen of the Free State of Prussia Warband can have the Rapid Assault ability at a cost of +5 👑 each. Rapid Assault: Add +1 DICE to the Risky Success Roll when a model with the Rapid Assault ability takes a Dash ACTION."
        },
        {
          "name": "Expert Fireteams",
          "description": "A Stosstruppen of the Free State of Prussia Warband can include up to 3 Fireteams instead of only 2."
        },
        {
          "name": "Feldkaplane",
          "description": "Trench Clerics in a Stosstruppen of the Free State of Prussia Warband can have 1 dose of Holy Smoke (▶ see the Stosstruppen of the Free State of Prussia Armoury)."
        },
        {
          "name": "Forward Positions",
          "description": "Up to 2 Shock Troopers in a Stosstruppen of the Free State of Prussia Warband can have the INFILTRATOR Keyword at a cost of +10 👑 each."
        },
        {
          "name": "Lightly-armoured",
          "description": "Only the Lieutenant and Mechanized Heavy Infantry model in a Stosstruppen of the Free State of Prussia Warband can have Reinforced Armour or Machine Armour."
        },
        {
          "name": "Light Melee",
          "description": "Shock Troopers in a Stosstruppen of the Free State of Prussia Warband do not have the Assault Drill ability. They still cost 45 👑 ."
        },
        {
          "name": "Masters of the Grenade",
          "description": "Add 4” to the Range of all Grenades used by models from a Stosstruppen of the Free State of Prussia Warband."
        },
        {
          "name": "Specialised Equipment",
          "description": "Submachine Guns in a Stosstruppen of the Free State of Prussia Warband have a Limit of 4, and Automatic Pistols do not have the ELITE only stipulation. However, Machine Guns in a Stosstruppen of the Free State of Prussia Warband have a Limit of 1, and models cannot have Grenade Launchers or Martyrdom Pills."
        },
        {
          "name": "Troop Selection",
          "description": "A Stosstruppen of the Free State of Prussia Warband must include 2-8 Shock Troopers and cannot include Trench Moles. In addition, it cannot have more than 1 Sniper Priest or 1 Mechanized Heavy Infantry model. STOSSTRUPPEN OF THE FREE STATE OF PRUSSIA ARMOURY & BATTLEKIT The following pieces of Battlekit are available to a Stosstruppen of the Free State of Prussia Warband. Tank-Splitter Sword | 15 👑 | Limit: 2 It takes years of gruelling Mensur practice and field drills to acquire the precision and speed required to use the specialist tank-splitter swords of the Gardekorps. Despite their great size (often over 6 feet long), they are remarkably light, and due to the large quantities of orichalcum used in their forging process, they are virtually unbreakable. They are often used to disable tanks and other armoured vehicles, by either slicing their armour open or disabling them with an accurate swing to sever their tracks. Before any battle, they are treated with a special metal-corroding chemical compound which melts armour, making it far deadlier against armoured targets than those who wear none. Type Range Keywords 2-Handed Melee +1 INJURY DICE, CRITICAL, CUMBERSOME"
        },
        {
          "name": "Melt Armour",
          "description": "When you make an Injury Roll for an attack made with a Tank- Splitter Sword, determine if the target has an Armour Characteristic that is -1 or greater, or if it is wearing Armour or carrying a Shield. If it does, before rolling the dice for the Success Roll, put one dice aside and turn it so that it shows a roll of ‘6’. Roll the rest of the dice, and then return the dice you put to one side; it counts as having rolled a 6. In addition, attacks made with a Tank-Splitter Sword"
        }
      ],
      "ops": []
    },
    {
      "id": "expeditionary-forces-of-abyssinia",
      "name": "EXPEDITIONARY FORCES OF ABYSSINIA",
      "factionId": "",
      "specialRules": [
        {
          "name": "Abyssinian Healers",
          "description": "An Expeditionary Forces of Abyssinia Warband can include 0-2 Combat Medics and Misericordia have the Limit: 2 stipulation instead of Limit: 1."
        },
        {
          "name": "Chieftain Panoply",
          "description": "Mechanized Heavy Infantry in an Expeditionary Forces of Abyssinia Warband cannot have Machine Armour."
        },
        {
          "name": "Faith of Ethiopia",
          "description": "The sect of the Sniper Priests does not operate in the Solomonic Dynasty. An Expeditionary Forces of Abyssinia Warband cannot include Sniper Priests."
        },
        {
          "name": "Holy Warriors",
          "description": "An Expeditionary Forces of Abyssinia Warband can include 0-1 Trench Cleric and 0-2 Holy Warriors. Use the Trench Clerics Warband Entry for Holy Warriors. In addition to the normal rules for a Trench Cleric, a Holy Warrior has the following abilities: Blessed Psalm ACTION: A Holy Warrior can take a Blessed Psalm ACTION. If they do so, you can remove 1 BLESSED MARKER from the Holy Warrior and place it beside a friendly model. A Success Roll is not required to carry out this Action. Arise and be Healed! ACTION: A Holy Warrior can take an Arise and be Healed! ACTION. If they do so, take a Risky Success Roll for the Holy Warrior. If the roll is a Failure, nothing happens, and the Holy Warrior’s Activation ends. If the roll is a Success or Critical Success, pick the Holy Warrior or 1 friendly model within 3” of the Holy Warrior. The model you pick can stand back up at no cost to their movement, and you can remove up to D3 BLOOD MARKERS and/or INFECTION MARKERS from the model."
        },
        {
          "name": "Short-Range Marksmanship",
          "description": "Add +1 DICE to the Success Rolls for Ranged Attacks made at Short Range by the Lieutenant and any Yeomen in an Expeditionary Forces of Abyssinia Warband, unless the attacking Weapon is a Grenade or has the HEAVY Keyword."
        },
        {
          "name": "Vanguard Forces",
          "description": "An Expeditionary Forces of Abyssinia Warband cannot include Trench Moles. Instead, up to 4 Yeomen in an Expeditionary Forces of Abyssinia Warband can have the Flanking ability for +5 👑 each. Flanking: When a model with this ability is deployed for the first time in a game, it can be deployed normally in its own deployment zone or in contact with any edge of the battlefield and at least 8” away from any enemy models. Models with this ability are deployed before models with the INFILTRATOR Keyword, but after all other models. If a scenario has a special rule that says that models with the INFILTRATOR Keyword must deploy normally, then models with this ability must also deploy normally."
        },
        {
          "name": "Warrior Nobles",
          "description": "Shock Troopers and models with the ELITE Keyword in an Expeditionary Forces of Abyssinia Warband can have the Chewa ability for +5 👑 each. Chewa: Add +1 DICE to the Success Roll for a Melee Attack made by a model with the Chewa ability for each other friendly model within 1” of the target, up to a maximum of +2 DICE."
        },
        {
          "name": "Weapons of Mobile Warfare",
          "description": "An Expeditionary Forces of Abyssinia Warband can have a maximum of 3 Ranged Weapons with the HEAVY Keyword, not counting Satchel Charges."
        }
      ],
      "ops": []
    },
    {
      "id": "procession-of-the-sacred-affliction",
      "name": "PROCESSION OF THE SACRED AFFLICTION",
      "factionId": "",
      "specialRules": [
        {
          "name": "Face thy Fears",
          "description": "Models in a Procession of the Sacred Affliction Warband cannot have Iron Capirotes. Ecclesiastic Prisoners in a Procession of the Sacred Affliction Warband do not have Iron Capirotes, but their cost remains the same."
        },
        {
          "name": "Hammer and the Anvil",
          "description": "Anti-Tank Hammers taken for a Procession of the Sacred Affliction Warband do not have the ELITE only stipulation."
        },
        {
          "name": "Melee-focused",
          "description": "Models in a Procession of the Sacred Affliction Warband cannot have any Machine Guns, and Punt Guns have the Limit: 1 stipulation."
        },
        {
          "name": "Punishing Millstones",
          "description": "Add +1 INJURY DICE for Melee Attacks made by models from a Procession of the Sacred Affliction if the target is Down. This special rule does not apply to attacks made by Ecclesiastic Prisoners."
        },
        {
          "name": "Reliquary Armoury",
          "description": "Holy Icon Shields cost 20 👑 for a Procession of the Sacred Affliction Warband and do not have the ELITE only stipulation."
        },
        {
          "name": "Wrath of God",
          "description": "Up to 1 Castigator, or Trench Pilgrim, or Martyr Penitent can have the Wrath of God special rule at a cost of 15 👑 . BLOOD MARKERS are never placed next to a model with the Wrath of God special rule, and it has the NEGATE FEAR Keyword. It cannot be Broken on the Wheel by an Anchorite Shrine. A model with the Wrath of God special rule cannot have Ranged Weapons or Armour (it can have a Shield). In addition, change the base size of the model to 32mm."
        },
        {
          "name": "Zealot Strength",
          "description": "Up to three Trench Pilgrims and/or Martyr-Penitents in a Procession of the Sacred Affliction Warband can have Zealot Strength instead of only one."
        }
      ],
      "ops": []
    },
    {
      "id": "war-pilgrimage-of-saint-methodius",
      "name": "WAR PILGRIMAGE OF SAINT METHODIUS",
      "factionId": "",
      "specialRules": [
        {
          "name": "Anchorite Armoury",
          "description": "Anchorite Shrines in a War Pilgrimage of Saint Methodius Warband have a Ranged Characteristic of +0 DICE instead of -, and can have Anchorite Ranged Weapons and Anchorite Battlekit from the War Pilgrimage of Saint Methodius Armoury."
        },
        {
          "name": "Anchorite Cloister",
          "description": "A War Pilgrimage of Saint Methodius Warband may include up to two Anchorite Shrines."
        },
        {
          "name": "Chaste Order",
          "description": "While they revere the holy stigmata of the Nuns of the order, the fathers of the monastery shun the ecstatic revelry of many Trench Pilgrims and insist on modest dress. All Stigmatic Nuns in a War Pilgrimage of Saint Methodius Warband must have Standard Armour, and cannot be used in a battle if they are not wearing Standard Armour. Additionally, the Warband cannot include more than 3 Stigmatic Nuns."
        },
        {
          "name": "Communicant Heresy",
          "description": "The Pilgrims of Saint Methodius oppose the creation of Communicants. Ammo Monks, Communicants and Communicant Anti-Tank Hunters cannot be included in a War Pilgrimage of Saint Methodius Warband."
        },
        {
          "name": "Followers of Saint Methodius",
          "description": "The Patron of a War Pilgrimage of Saint Methodius Warband is always a Learned Saint."
        },
        {
          "name": "Mortal Sin",
          "description": "Ecclesiastic Prisoners in a War Pilgrimage of Saint Methodius Warband cannot have a Martyrdom Device, and models in a War Pilgrimage of Saint Methodius Warband cannot be Broken on the Wheel of an Anchorite Shrine."
        },
        {
          "name": "Treasure in Heaven",
          "description": "Trench Pilgrims in a War Pilgrimage of Saint Methodius Warband cannot be resurrected as Martyr Penitents. WAR PILGRIMAGE OF SAINT METHODIUS ARMOURY & BATTLEKIT The following pieces of Battlekit are available to a War Pilgrimage of Saint Methodius Warband. The Machine Gun and Submachine Gun entries in the War Pilgrimage of Saint Methodius Armoury replace those in the standard Trench Pilgrim Armoury. Ranged Weapons Automatic Rifle Bayonet Lug, Limit: 1 40 👑 Machine Gun Limit: 2 50 👑 Submachine Gun Bayonet Lug, Shield Combo, Limit: 1 30 👑 Anchorite Ranged Weapons When you recruit an Anchorite Shrine, you can replace its Catherine Wheel with one of the following Ranged Weapons. Due to its immense size, all these weapons are counted as being 1-Handed weapons when they are used by an Anchorite Shrine. Anti-Materiel Rifle 40 👑 Autocannon 55 👑 Gas Censer 50 👑 Heavy Flamethrower 45 👑 Punt Gun 10 👑 Trench Mortar 40 👑 Anchorite Battlekit An Anchorite Shrine can have up to 2 of the following pieces of Battlekit. Once equipped, the Battlekit cannot be removed or lost from the Anchorite Shrine for any reason. Gas Filters 5 👑"
        }
      ],
      "ops": []
    },
    {
      "id": "cavalcade-of-the-tenth-plague",
      "name": "CAVALCADE OF THE TENTH PLAGUE",
      "factionId": "",
      "specialRules": [
        {
          "name": "Blood of the Lamb",
          "description": "Castigators in a Cavalcade of the Tenth Plague Warband have the TOUGH Keyword at no additional cost in 👑 ."
        },
        {
          "name": "Day of His Wrath",
          "description": "The War Prophet of this Warband replaces their Laying on Hands ACTION with the following Day of his Wrath ACTION. Day of His Wrath ACTION: A Cavalcade of the Tenth Plague War Prophet can take a Day of his Wrath ACTION. If they do so, take a Risky Success Roll for the model. If the roll is a Failure the War Prophet’s Activation ends immediately. If the roll is a Success, make an Injury Roll with the IGNORE ARMOUR Keyword for 1 enemy model within 3” of the War Prophet. If the roll is a Critical Success, make an Injury Roll with +1 INJURY DICE and the IGNORE ARMOUR Keyword for 1 enemy model within 3” of the War Prophet."
        },
        {
          "name": "Favour of the Lord",
          "description": "At the start of each Turn, you can place 1 BLESSING MARKER next to a model from this Warband."
        },
        {
          "name": "Heaven Awaits",
          "description": "The Cavalcade rejects the doctrine of the Meta-Christ. Trench Pilgrims in a Cavalcade of the Tenth Plague Warband cannot be resurrected as Martyr-Penitents."
        },
        {
          "name": "Only the Righteous",
          "description": "Any model with the PILGRIM Keyword in a Cavalcade of the Tenth Plague Warband (including an Anchorite Shrine) can have a Sacrifical Lamb at a cost of 5 👑 each, except for Ecclesiastic Prisoners."
        },
        {
          "name": "Stolen Communicants",
          "description": "Communicants cost 3 ☼ to recruit for a Cavalcade of the Tenth Plague Warband (they do not cost any 👑 )."
        },
        {
          "name": "The Unclean",
          "description": "The Cavalcade detests using the unclean Ecclesiastic Prisoners. A Cavalcade of the Tenth Plague Warband can only have 0-2 Ecclesiastic Prisoners."
        },
        {
          "name": "Warded by Blood",
          "description": "When you deploy a model that has a Sacrificial Lamb, you can say that they will sacrifice it and anoint themselves with its blood. If you do so, the first BLOOD MARKER placed on the model is ignored. MK"
        }
      ],
      "ops": []
    },
    {
      "id": "fida-i-of-alamut",
      "name": "FIDA’I OF ALAMUT",
      "factionId": "",
      "specialRules": [
        {
          "name": "Alamut Alone",
          "description": "A Fida’i of Alamut Warband cannot include a Yüzbaşı, a Jabirean Alchemist, any Janissaries, Lions of Jabir or Brazen Bulls."
        },
        {
          "name": "Art of Assassination",
          "description": "Each Sultanate Assassin and Master Assassin in a Fida’i of Alamut Warband can have one of the following abilities at the additional cost in 👑 indicated below. You cannot give the same ability to more than one model (i.e. every Assassin that has an ability must have a different one). Hallucinogen Disguise (20 👑 ): If this Assassin is deployed using the INFILTRATOR Keyword, it must be deployed at least 8” away from any enemy models but you may ignore any and all other restrictions that apply to deploying an INFILTRATOR. For example, the model can be deployed in the Line of Sight of an enemy model, enemy Guard Dogs do not affect how it is deployed, and so on. Mirage of Time (15 👑 ): Add -1 DICE to the Success Roll for attacks that target this Assassin."
        },
        {
          "name": "Assassin Acolytes",
          "description": "Up to three Azeb models in a Fida’i of Alamut Warband can be given the INFILTRATOR Keyword at a cost of +10 👑 each."
        },
        {
          "name": "Dervishes",
          "description": "A Fida’i of Alamut Warband can include 0-4 Dervishes. The Dervishes use the Janissaries Warband Entry, but cannot wear Reinforced Armour and replace the STRONG Keyword with the IGNORE OFF-HAND WEAPON Keyword and the Whirling Dervish ability: Whirling Dervish: The ritual dance of these Dervishes is hypnotic to witness, and it is as graceful as it is deadly. Add -1 DICE to the Success Rolls for Ranged Attacks that target a Dervish."
        },
        {
          "name": "Flock of Assassins",
          "description": "A Fida’i of Alamut Warband can include 0-2 Sultanate Assassins and 1 Master Assassin (▶ see below)."
        },
        {
          "name": "Killing Squad",
          "description": "A Fida’i of Alamut Warband can include 1 Fireteam, consisting of any 2 models from the Warband. Both of the models in the Fireteam are given the FIRETEAM Keyword at no additional cost in 👑 ."
        },
        {
          "name": "Master Assassin",
          "description": "A Fida’i of Alamut Warband must include 1 Master Assassin. The Master Assassin uses the Sultanate Assassin Warband Entry, except that it has the LEADER and TOUGH Keywords and has a cost of 95 👑 ."
        }
      ],
      "ops": []
    },
    {
      "id": "house-of-wisdom",
      "name": "HOUSE OF WISDOM",
      "factionId": "",
      "specialRules": [
        {
          "name": "Alchemists",
          "description": "A House of Wisdom Warband must include 1-2 Jabirean Alchemists. In addition, Alchemist Armour in a House of Wisdom Warband has the Limit: 2 stipulation instead of Limit: 1."
        },
        {
          "name": "Kavasses",
          "description": "Kavasses are sworn guardians of the House of Wisdom. You can change the Melee Characteristic of up to 3 Azebs in a House of Wisdom Warband from -1 DICE to +0 DICE at a cost of +5 👑 each. However, these Azebs lose the Light Skirmisher ability."
        },
        {
          "name": "Noble Guardians",
          "description": "A House of Wisdom can include 0-2 Fāris. The Fāris use the Janissary Warband Entry, but have the ELITE Keyword at no additional cost in ducats."
        },
        {
          "name": "Pride of Jabir",
          "description": "A House of Wisdom Warband can include 0-3 Lions of Jabir."
        },
        {
          "name": "Private Venture",
          "description": "A House of Wisdom Warband cannot include a Yüzbaşı, Janissaries, or Sultanate Assassins."
        },
        {
          "name": "Secrets of the House of Wisdom",
          "description": "Each Jabirean Alchemist in a House of Wisdom Warband can have one of following abilities at the cost indicated below. You cannot give the same ability to more than one model (i.e. every Jabirean Alchemist that has an ability must have a different one). Medicine (15 👑 ): This Alchemist is a student of Ibn Sina’s School of Medicine. This Alchemist cannot have a Medi-kit. Instead, when you Activate this Alchemist it can take a School of Medicine ACTION as part of the Activation. If it does so, take a Success Roll for the Alchemist and add +1 DICE to the roll. If the roll is a Failure, nothing happens. If it is a Success or a Critical Success, you can do one of the following things: Remove 2 BLOOD MARKERS or 1 INFECTION MARKER from the Alchemist or a friendly model within 1” of the Alchemist. Stand up a friendly model that is Down and which is within 1” of the Alchemist. Cartography & Geometry (20 👑 ): The Alchemist has studied long and hard the sciences of cartography and Geometry. At the start of the game, before deployment, you can pick up to 2 models in the Warband that are mounted on a base of 32mm or less, giving them the INFILTRATOR Keyword for that game. Secrets of Takwin (20 👑 ): The Alchemist has bound their Takwin creature to themselves with unbreakable bonds. If this Alchemist is hit by an attack while within 1” of their Takwin Homunculus, you can apply the hit to the Homunculus and make the Injury Roll for it instead of the Alchemist. Chemistry & Alchemy (25 👑 ): At the start of the first Turn of the game, before any models have been Activated, you can set up an Elemental Obstacle terrain piece that is up to 2” wide and 6” long anywhere on the battlefield. It must be set up more than 1” away from any other terrain pieces and more than 6” from any models. The Elemental Obstacle has the DIFFICULT TERRAIN and DANGEROUS TERRAIN (X) Keywords. After setting it up, you must say if X is the FIRE, GAS, or SHRAPNEL Keyword."
        },
        {
          "name": "Takwin Homunculus",
          "description": ": A House of Wisdom Warband can include one Takwin"
        }
      ],
      "ops": []
    },
    {
      "id": "defenders-of-the-iron-wall",
      "name": "DEFENDERS OF THE IRON WALL",
      "factionId": "",
      "specialRules": [
        {
          "name": "Far from the Sublime Gate",
          "description": "A Defenders of the Iron Wall Warband cannot include any Lions of Jabir, Yüzbaşı or Assassins, and models in the Warband cannot have a Cloak of Alamut or Wind Amulet."
        },
        {
          "name": "Grand Cannons",
          "description": "A Defenders of the Iron Wall Warband can include 0-2 Sultanate Grand Cannons at a cost of 60 👑 each (▶ see Defenders of the Iron Wall Warband Armoury). When a Grand Cannon is added to a Defender of the Iron Wall Warband it must either be given to a Brazen Bull that is already part of the Warband, or added to the Armoury on the Warband’s roster sheet as a Grand Cannon gun battery. No more than 1 Grand Cannon can be given to a Brazen Bull model, and a Warband cannot have more than 2 Grand Cannons in total. The rules for using the Grand Cannon during a game can be found in the Defenders of the Iron Wall Warband Battlekit section."
        },
        {
          "name": "Janissary Officers",
          "description": "A Defenders of the Iron Wall Warband can have 0-2 Janissaries, which have the ELITE Keyword at no additional cost in 👑 ."
        },
        {
          "name": "Marksmanship of the Iron Wall",
          "description": "All the members of the Warband practise marksmanship from the dizzying heights of the Iron Wall against targets on the ground below. Add +2 DICE instead of +1 DICE to the Success Roll for a Ranged Attack made by models in a Defenders of the Iron Wall Warband when they have the Elevated Position modifier."
        },
        {
          "name": "Sappers Corps",
          "description": "The standard divisions assigned to the Iron Wall have double- strength Sapper detachments. A Defenders of the Iron Wall Warband can have 0-4 Sultanate Sappers."
        },
        {
          "name": "Siege Jezzail Teams",
          "description": "The Defenders of the Iron Wall are trained to use Siege Jezzails in pairs. Add +1 DICE to the Success Roll for a Ranged Attack made with a Siege Jezzail if there is a friendly model within 1” of the model making the attack."
        },
        {
          "name": "Silahdar",
          "description": "The commanders of the Iron Wall’s units come from the personal bodyguards of the Sultan known as Silahdar. A Defenders of the Iron Wall Warband must include 1 Silahdar. The Silahdar uses the Yüzbaşı Warband Entry, except that it replaces the Mubarizun ability with the STRONG Keyword, and they can have an Alaybozan from the Iron Sultanate Armoury (▶ see the Iron Sultanate Battlekit ), and an Anqā Guard and Explosive Charges from the Defenders of the Iron Wall Armoury (▶ see Defenders of the Iron Wall Warband Armoury), at the indicated cost in 👑 for each piece of Battlekit that is taken."
        },
        {
          "name": "Sipahi",
          "description": "Sipahi Automaton Cavalry often serves as infantry in the Iron Wall’s units to reinforce areas under severe pressure. A Defenders of the Iron Wall Warband can include up to 1 Sipahi Automaton Cavalry at a cost of 110 👑 . They use the Mercenary Entry for a Mamluk Faris but you cannot change their Battlekit in any way. Note that this does not stop you from recruiting a Mamluk Faris as a Mercenary as well."
        }
      ],
      "ops": []
    },
    {
      "id": "trench-ghost",
      "name": "TRENCH GHOST",
      "factionId": "",
      "specialRules": [
        {
          "name": "Barbed Wire Banshee",
          "description": "A Trench Ghost Warband can include a Barbed Wire Banshee instead of a Chorister. The Barbed Wire Banshee has the same Profile and Cost as a Chorister, but instead of the Unholy Hymns Ability add +1 INJURY DICE to rolls for enemy models that are within 8” of a Barbed Wire Banshee."
        },
        {
          "name": "Enemies of All",
          "description": "A Trench Ghost Warband cannot include Mercenaries."
        },
        {
          "name": "Lost Souls",
          "description": "A Trench Ghost Warband cannot include models with the ARTIFICIAL Keyword, and models in a Trench Ghost Warband cannot have Hellbound Soul Contracts or Infernal Brands. The Warband can include Anointed Heavy Infantry, but they do not have their Infernal Brand and still cost 95 👑 ."
        },
        {
          "name": "Semi-corporeal",
          "description": "Add -1 INJURY DICE for Injury Rolls caused by Ranged Attacks that hit a model from a Trench Ghost Warband."
        },
        {
          "name": "Slow and Creeping",
          "description": "Treat a Trench Ghost model as having a Movement Characteristic of 3”/Infantry when it takes a Dash ACTION. In addition, add -1 DICE to the Success Roll for an attack made by a Trench Ghost model on an enemy model that is making a Retreat."
        },
        {
          "name": "Undead Horror",
          "description": "Models in this Warband have the FEAR, NEGATE DIFFICULT TERRAIN, and NEGATE GAS Keywords."
        },
        {
          "name": "Walking Bomb",
          "description": "A model that has a Sarcophagus Mine cannot have any other Battlekit. A model with a Sarcophagus Mine can take a Trigger ACTION (▶ see below). In addition, if an enemy model finishes a move within 3” of a model with a Sarcophagus Mine, you can interrupt its Activation and detonate the Sarcophagus Mine without having to take a Trigger ACTION. Trigger ACTION: When a model with a Sarcophagus Mine takes a Trigger ACTION, you must take a Risky Success Roll for the model with +1 DICE. If the roll is a Failure, nothing happens (but you can try again the next time the model is Activated). If the roll is a Success or Critical Success, the Sarcophagus Mine detonates as described below."
        },
        {
          "name": "Detonation",
          "description": "When a Sarcophagus Mine detonates, all models (friend or foe) within 3” of the model carrying the Sarcophagus Mine and in its Line of Sight are hit by a Ranged Attack with the SHRAPNEL Keyword. Add +1 INJURY DICE to the Injury Rolls for models that are within 1” of the model carrying the Sarcophagus Mine. The model carrying the Sarcophagus Mine is then taken Out of Action. Tank Palanquin | 60 👑 | Heretic Priest only Trench Ghost Heretic Priests sometimes ride into battle standing on top of an armoured platform called a Tank Palanquin. From their lofty vantage point, they rain destruction upon the foe. Type Range Keywords Armour - -3 INJURY MODIFIER, STRONG"
        },
        {
          "name": "Bulky",
          "description": "A model that has a Tank Palanquin must be mounted on a 50mm base and cannot be equipped with a Shield. In addition, it has a Charge Bonus of D3” instead of D6”."
        }
      ],
      "ops": []
    },
    {
      "id": "knights-of-avarice",
      "name": "KNIGHTS OF AVARICE",
      "factionId": "",
      "specialRules": [
        {
          "name": "Corrupt Merchants",
          "description": "When you create your starting Warband, you can purchase 1 piece of Battlekit from the New Antioch Armoury, and 1 piece of Battlekit from the Iron Sultanate Armoury. Any stipulations that apply to it must still be followed (so there is little point in taking the Assassin’s Dagger, for example, as it can only be used by Assassins). You can repurchase the Battlekit later during the campaign if it is lost for any reason."
        },
        {
          "name": "Gas Bombs",
          "description": "Artillery Witches in a Knights of Avarice Warband replace their Infernal Bombs with Gas Bombs."
        },
        {
          "name": "Goetic Warlocks",
          "description": "Goetic Warlocks are creations of Mammon. A Knights of Avarice Warband can include up to 2 Goetic Warlocks as Mercenaries (▶ see Goetic Warlock). In addition, the first Goetic Warlock to be recruited in a Knights of Avarice Warband costs 110 👑 instead of its normal cost in ☼."
        },
        {
          "name": "Infernal Rivalry",
          "description": "Mammon is a rival of Beleth, who is the Patron of Death Commandos. A Knights of Avarice Warband cannot include Death Commandos."
        },
        {
          "name": "Mammon’s Chosen",
          "description": "A Knights of Avarice Warband cannot include a model if the cost of the model and its Battlekit is less than 80 👑 , unless the model is a Wretched."
        },
        {
          "name": "Preserve the Loot",
          "description": "Models in a Knights of Avarice Warband cannot have Battlekit that has, or would give another piece of Battlekit, the FIRE and/ or SHRAPNEL Keywords. Grenade Launchers can be taken, but replace the SHRAPNEL Keyword with the -1 INJURY DICE, GAS, and IGNORE ARMOUR Keywords."
        },
        {
          "name": "Price of Greed",
          "description": "A Heretic Priest in a Knights of Avarice Warband has the following Price of Greed ACTION instead of the Puppet Master ACTION. Price of Greed ACTION: Worldly wealth becomes the target of this curse, gradually crushing its victim under its weight. A Knights of Avarice Heretic"
        },
        {
          "name": "Worship Mammon",
          "description": "The Patron of a Knights of Avarice Warband is always Mammon. KNIGHTS OF AVARICE ARMOURY & BATTLEKIT The following pieces of Battlekit are available to a Knights of Avarice Warband. Coin Hammer | 20 👑 | Limit: 2 This double-handed hammer bears the rune of Mammon on its head. Its strike burns through even the heaviest armour, leaving a permanent, painful scar in the shape of the rune. Type Range Keywords 2-Handed Melee +1 INJURY DICE, HEAVY"
        },
        {
          "name": "Rune of Mammon",
          "description": "If the Injury Roll for an attack made by a Coin Hammer results in 1 or more BLOOD MARKERS being placed next to the target, place 1 BLESSING MARKER next to the model using the Coin Hammer. Golden Calf Altar | 20 👑 | Limit: 3"
        }
      ],
      "ops": []
    },
    {
      "id": "heretic-naval-raiders",
      "name": "HERETIC NAVAL RAIDERS",
      "factionId": "",
      "specialRules": [
        {
          "name": "Close Assault Weapons",
          "description": "Submachine Guns cost 25 👑 for a Heretic Naval Raiders Warband."
        },
        {
          "name": "Fast as Lightning",
          "description": "Add +1 DICE to the Risky Success Roll for models from a Heretic Naval Raiders Warband that are taking a Dash ACTION."
        },
        {
          "name": "Let Sleeping Dogs Lie",
          "description": "This Warband cannot include a War Wolf."
        },
        {
          "name": "Light Troops",
          "description": "A Heretic Naval Raiders Warband cannot have more than two Anointed models or more than 1 Artillery Witch (even if the Warband has a value of 1,000 👑 or more)."
        },
        {
          "name": "Unseen Advance",
          "description": "Up to three models without the ELITE Keyword in a Heretic Naval Raiders Warband can be given the INFILTRATOR Keyword at a cost of +10 👑 each. MF"
        }
      ],
      "ops": []
    },
    {
      "id": "dirge-of-the-great-hegemon",
      "name": "DIRGE OF THE GREAT HEGEMON",
      "factionId": "",
      "specialRules": [
        {
          "name": "The Executor",
          "description": "A Dirge of the Great Hegemon Warband must include 1 Executor. The Executor uses the Plague Knight Warband Entry, except that it has a Ranged Characteristic of +1 DICE and the LEADER and TOUGH Keywords, and has a cost of 80 👑 . The Warband can still include 0-2 Plague Knights."
        },
        {
          "name": "The Fallen",
          "description": "A Dirge of the Great Hegemon Warband cannot include a Lord of Tumours or an Amalgam."
        },
        {
          "name": "The Lost",
          "description": "A Dirge of the Great Hegemon Warband Warband can only include 0-2 Hounds of the Black Grail and can only include 0-2 Heralds of Beelzebub."
        },
        {
          "name": "The Bereaved",
          "description": "The Grail Thralls or Fly Thralls in a Dirge of the Great Hegemon Warband are called the Bereaved. They have a Ranged Characteristic of +0 DICE and a cost of 30 👑 , and can have Ranged Weapons, Grenades, a Musical Instrument or a Troop Flag from the Cult of the Black Grail Armoury."
        },
        {
          "name": "Dishonoured",
          "description": "Models in a Dirge of the Great Hegemon Warband cannot have Beelzebub’s Axe or a Black Grail Shield."
        },
        {
          "name": "Hegemon’s Last Blessing",
          "description": "Putrid Shotguns in this Warband have a Limit of 3, and Viscera Cannon have a Limit of 3 and do not have the ELITE only stipulation."
        },
        {
          "name": "Hegemon’s Will",
          "description": "Using the remnants of the lingering power of a fallen Hegemon, a Plague Knight of the Warband can directly command a nearby Bereaved. An Executor or Plague Knight in a Dirge of the Great Hegemon Warband can take a Command Bereaved ACTION. If it does so, you can remove any number of INFECTION MARKERS from enemy models. For each INFECTION MARKER you remove, you can then carry out one of the following Commands with a Bereaved (Grail Thrall or Fly Thrall) that is within 18” of the model taking the Command Bereaved ACTION. A Bereaved cannot be given more than 1 Command each Turn, but carrying out a Command does not stop it from also being Activated in the same Turn (before or after the Command was issued). Charge Command: The Bereaved carries out a charge move. Fight Command: The Bereaved carries out a Melee Attack. Move Command: The Bereaved carries out a Move (it cannot Charge or Retreat). Shoot Command: The Bereaved carries out a Ranged Attack."
        },
        {
          "name": "Locus of Despair",
          "description": "Each time the model with the Broken Crown is Activated, before carrying out any ACTIONS with the model, place 1 INFECTION MARKER next to each enemy model within 1” of the model with the Broken Crown. Urn of the Bitter Ashes | 40 👑 | ELITE only, Limit: 1 This black urn contains ashes from the burned body of the fallen Hegemon, which still retain a faint echo of its hateful will. Fragments swirl and churn in the air, and sinister whispers emanate from within. Type Range Keywords Equipment - -"
        },
        {
          "name": "Sinister Whispers",
          "description": "Add -1 DICE to the roll for Ranged Attacks that target a model that has the Urn of Bitter Ashes or that is within 3” of the model with the"
        }
      ],
      "ops": []
    }
  ]
} as unknown as Dataset;

export default DATASET;
