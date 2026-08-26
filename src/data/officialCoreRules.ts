// Complete Official Trench Crusade Core & Comprehensive Rules Compendium

export interface RuleChapter {
  id: string;
  title: string;
  category: string;
  content: string;
}

export const OFFICIAL_CORE_RULES: RuleChapter[] = [
  {
    "id": "sequence-of-play",
    "title": "The Sequence of Play & Game Turns",
    "category": "Core Concepts",
    "content": "### The Sequence of Play & Game Turns\nTrench Crusade is played in **Game Turns**. Each Turn consists of three main phases resolved in order:\n\n1. **Initiative Phase**: Both players roll a D6. The player who rolls highest wins Initiative for the Turn and chooses who Activates the first model.\n2. **Activation Phase**: Players alternate Activating their models one at a time. Each model can perform **Actions** (Move, Dash, Shoot, Fight, Cast Spell, Pray, etc.).\n3. **Morale Phase**: Warbands that have suffered severe casualties (50% or more of starting models Down or Out of Action) must make Morale Checks to avoid becoming **Shaken**."
  },
  {
    "id": "success-rolls",
    "title": "Success Rolls & Dice Mechanics (+/- Dice)",
    "category": "Core Concepts",
    "content": "### Success Rolls & Dice Mechanics\nWhenever a warrior attempts an Action where the outcome is in doubt (such as Shooting, Melee, Jumping, or Climbing), you must make a **Success Roll**.\n\n#### Success Roll Table (2D6)\n- **1-6: Failure / Mishap** - The action fails. If it was a Risky Action, a disaster or injury occurs.\n- **7-11: Success** - The action succeeds normally.\n- **12+: Critical Success** - Spectacular success! Extra damage, automatic hits, or special bonuses trigger.\n\n#### Modifiers (+DICE and -DICE)\n- **+1 DICE**: Roll 1 additional D6 and keep the 2 highest dice. (e.g. Roll 3D6, discard lowest).\n- **-1 DICE**: Roll 1 additional D6 and keep the 2 lowest dice. (e.g. Roll 3D6, discard highest).\n- **+INJURY DICE / -INJURY DICE**: Applied specifically to Injury Rolls when damaging targets."
  },
  {
    "id": "movement-actions",
    "title": "Movement, Dashing, Charging & Retreating",
    "category": "Movement & Terrain",
    "content": "### Movement, Dashing & Charges\n\n#### Standard Move (1 Action)\nA model can move up to its **Movement Characteristic** in inches (e.g., 6\"). It may not move within 1\" of an enemy model unless making a Charge.\n\n#### Dash Action (1 Action - Risky)\nMake a Risky Success Roll. If successful, move up to an additional **Movement Characteristic** in inches. If failed, the model trips or halts in place.\n\n#### Charge Action (1 Action)\nA model moves up to its Movement value (or double movement on a charge move) to enter base contact (within 1\") with an enemy model. Grants a **Charge Bonus (+1 DICE)** on the initial melee attack!\n\n#### Retreating\nIf a model starts its activation within 1\" of an enemy, it can attempt a Retreat move, but the enemy warrior gets a free parting strike."
  },
  {
    "id": "climbing-jumping-terrain",
    "title": "Climbing, Jumping, Falling & Difficult Terrain",
    "category": "Movement & Terrain",
    "content": "### Climbing, Jumping & Falling Rules\n\n#### Climbing\nModels can climb ladders, stairs, ruined walls, and rubble. Vertical distance is measured at standard rate (or half rate for sheer surfaces without handholds).\n\n#### Jumping & Gaps\nA model can jump across gaps up to 2\" freely during a move. For gaps >2\", take a Risky Success Roll. If failed, the model falls!\n\n#### Falling Damage\nFor every 2\" a model falls, take an Injury Roll with +1 INJURY DICE per 2\" fallen!\n\n#### Terrain Types\n- **Open Terrain**: No movement penalties.\n- **Difficult Terrain**: Movement is halved (e.g., deep mud, barbed wire, flooded sumps).\n- **Dangerous Terrain**: Must make a Risky Success Roll or suffer 1 Blood Marker!"
  },
  {
    "id": "ranged-combat-cover",
    "title": "Ranged Attacks, Line of Sight & Cover",
    "category": "Combat Rules",
    "content": "### Ranged Combat & Cover\n\n#### Ranged Attack Sequence\n1. **Declare Target**: Must have Line of Sight and be within maximum weapon range.\n2. **Success Roll**: Roll 2D6 + Ranged modifier. (Need 7+ to hit).\n3. **Cover Check**:\n   - **Light Cover**: -1 DICE to Hit.\n   - **Heavy Cover (Bunkers/Trenches)**: -2 DICE to Hit.\n4. **Injury Roll**: If hit, roll 2D6 on the Injury Table, applying weapon modifiers and target Armour modifiers."
  },
  {
    "id": "melee-combat",
    "title": "Melee Attacks, Duels & Cleave",
    "category": "Combat Rules",
    "content": "### Melee Attacks & Close Quarters Combat\n\n#### Fighting in Melee\n1. When engaged in base contact (within 1\"), models can take **Fight Actions**.\n2. Make a Melee Success Roll (2D6 + Melee modifier).\n3. If successful, roll for **Injury** against the enemy's Armour rating.\n4. **Cleave (X)**: Allows making X separate melee strikes in a single Fight Action!"
  },
  {
    "id": "injuries-blood-markers",
    "title": "Injuries, Blood Markers & Bloodbath Rolls",
    "category": "Combat Rules",
    "content": "### Injuries, Blood Markers & Bloodbath Rolls\n\n#### Injury Roll Outcomes (2D6 + Modifiers)\n- **1-6: No Effect** - The armour absorbed the hit or it was a glancing blow.\n- **7-8: Minor Hit (1 Blood Marker)** - Place 1 Blood Marker next to the model.\n- **9-11: Down (1 Blood Marker)** - Model is knocked Down. Must spend an action to stand up.\n- **12+: Out of Action** - Model is removed from the battlefield!\n\n#### Blood Markers\n- Each Blood Marker on a model can be spent by the attacker to add **+1 INJURY DICE** to future attacks!\n- **Bloodbath Roll**: Attacker can spend all Blood Markers to convert an Injury Roll into a lethal Bloodbath roll where all doubles result in instant Out of Action!"
  },
  {
    "id": "morale-shaken",
    "title": "The Morale Phase & Shaken Warbands",
    "category": "Morale & Victory",
    "content": "### Morale Phase & Shaken Warbands\n\n#### Morale Checks\nAt the start of the Morale Phase, if your Warband has lost **50% or more** of its starting models (Down or Out of Action), you must take a **Warband Morale Check** (2D6).\n\n- **Passed (7+)**: The warband holds firm and continues fighting.\n- **Failed (<7)**: The warband becomes **Shaken**! All models suffer -1 DICE to all Actions and rolls for the rest of the battle.\n- **Rout**: If a Shaken warband fails a second Morale Check, it immediately routs and concedes the match."
  }
];
