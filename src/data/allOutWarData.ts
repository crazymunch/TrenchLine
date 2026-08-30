import { Scenario } from '../types/rules';
import { CardRank, CardSuit, PlayingCard, BetrayalEffect } from '../types/allOutWar';

// ----------------------------------------------------------------------------
// 1. ALL OUT WAR OFFICIAL SCENARIOS (From Official All Out War Pack)
// ----------------------------------------------------------------------------
export const ALL_OUT_WAR_SCENARIOS: Scenario[] = [
  {
    id: 'aow-the-looters',
    number: 13,
    roman: 'AOW-I',
    name: 'All Out War: The Looters (3 to 8 Players)',
    slug: 'the-looters',
    tagline: 'Scattered crates laden with supplies litter the centre of the battlefield as warbands clash to plunder.',
    mapImage: '/maps/scenario_looters.webp',
    tableSize: '48" x 48"',
    isAllOutWar: true,
    packName: 'All Out War Scenario Pack',
    minPlayers: 3,
    maxPlayers: 8,
    hasSupplyCrates: true,
    forces: 'No special restrictions apply to the models the players can include in their Forces in this scenario.',
    battlefield: 'The players make a draw with the playing card deck, and the winner sets up the terrain. Uses the No Man’s Land battlefield archetype on a 48” by 48” table.\n\n**Supply Crate Markers**: After terrain is placed, players take turns in draw order placing 2 Supply Crate Markers each wholly within 12” of the table centre, >1” from terrain, and the 2nd marker >12” from their 1st marker.',
    deployment: 'Players divide warbands into Vanguard and Reserve (at least 1 in each group, vanguard cannot exceed reserve size). Winner of card draw picks a 6” x 12” Deployment Zone and sets up vanguard models wholly within it, followed by 2nd, 3rd, etc.\n\n**The Reserve**: Placed off the battlefield until Turn 2, then deploy up to 3 reserve models per turn wholly within your Deployment Zone in initiative order.\n\n**Infiltrators**: Must deploy normally.\n\n**The Death Zone**: Machine-gun and sniper emplacements keep enemy Deployment Zones lethal. Models treat terrain within 1” of an enemy Deployment Zone as IMPASSABLE TERRAIN.',
    gameLength: 'This scenario lasts four Turns.',
    victoryConditions: 'A player wins immediately if all opposing Warbands have fled. Otherwise, the player with the most Victory Points after Turn 4 wins.\n\n**Victory Points**:\n- 1 VP for each Glorious Deed completed.\n- 1 VP for each crate a friendly model drew supplies from.\n- 2 VPs for each crate a friendly model destroyed.\n- 3 VPs for each crate a friendly model escaped with off their own Deployment Zone.',
    gloriousDeeds: `- **Lord of War**: A friendly model takes 2 enemy models Out of Action with Melee Attacks in a single Turn.
- **Protect the Supplies**: A friendly model causes an enemy model carrying or within 1" of a Supply Crate Marker to be taken Out of Action.
- **Rampage**: A friendly model destroys two Supply Crate Markers.
- **Reaper**: A friendly model takes 3 enemy models Out of Action.
- **Sniper**: A friendly model takes an enemy ELITE model Out of Action with a Ranged Weapon Attack that has the Long Range and Cover modifiers.
- **Suicidal Bravery**: A friendly model successfully charges 2 models with the same charge move.
- **Supply Run**: Two friendly models escape with a crate. (The model escaping with the 2nd crate is credited with this deed).`
  },
  {
    id: 'aow-brothers-in-arms',
    number: 14,
    roman: 'AOW-II',
    name: 'All Out War: Brothers in Arms (2v2 Team Battle)',
    slug: 'brothers-in-arms',
    tagline: 'Two pairs of allied Warbands clash for control of an important stretch of No Man’s Land.',
    mapImage: '/maps/scenario_brothers.webp',
    tableSize: '48" x 48"',
    isAllOutWar: true,
    packName: 'All Out War Scenario Pack',
    minPlayers: 4,
    maxPlayers: 4,
    isBattleTeam: true,
    forces: 'Players split into two Battle Teams (Team 1 and Team 2), each comprising two Warbands. Victory points are shared between team members to crown joint winners.',
    battlefield: 'Uses the No Man’s Land archetype (48” x 48”). 5 Objective Markers are placed (1 at the centre of the board, and 1 at the centre of each of the 4 table quarters), placed under Ruined Buildings.',
    deployment: 'Players draw cards. The winning player chooses which half of the battlefield their Battle Team will deploy in. Players pick their team’s 6” x 24” Deployment Zones and set up wholly within them.\n\n**Allied Team Rules**: Models in the same Battle Team are friendly to each other, but personal Abilities, Battlekit, and Spells only apply to your own Warband models.',
    gameLength: 'This scenario lasts four Turns.',
    victoryConditions: 'A Battle Team wins immediately if both opposing Warbands flee. Otherwise, the Battle Team with the most combined Victory Points after Turn 4 wins.\n\n**Victory Points**:\n- At the end of each Turn, each Battle Team scores 2 VPs for each Objective they control (more models within 1" or on the terrain piece).\n- 1 VP for each Glorious Deed completed by any team member.',
    gloriousDeeds: `- **Bloodletting**: An attack made by a friendly model results in the sixth BLOOD MARKER being placed beside an enemy model.
- **Cast Them Down**: A friendly model causes an enemy model to Fall from a height of at least 3”.
- **Hold Your Ground**: A Warband is the first to pass a Morale Check in this game (+1 VP, +1 XP to Leader, Promotion Pool D6).
- **Lord of War**: A friendly model takes 2 enemy models Out of Action with Melee Attacks in a single Turn.
- **Resist and Bite**: A friendly model that began its Activation Down takes an enemy model Out of Action in the same Activation.
- **Sniper**: A friendly model takes an enemy ELITE model Out of Action with a Ranged Attack having Long Range and Cover modifiers.
- **Suicidal Bravery**: A friendly model successfully charges 2 models with the same charge move.`
  },
  {
    id: 'aow-alliance-betrayal',
    number: 15,
    roman: 'AOW-III',
    name: 'All Out War: Alliance & Betrayal (3 to 4 Players)',
    slug: 'alliance-betrayal',
    tagline: 'Several Warbands converge. Alliances are made, deals whispered, and knives drawn in the dark.',
    mapImage: '/maps/scenario_betrayal.webp',
    tableSize: '48" x 48"',
    isAllOutWar: true,
    packName: 'All Out War Scenario Pack',
    minPlayers: 3,
    maxPlayers: 4,
    hasBetrayalCards: true,
    forces: '3 or 4 Warbands. Each player is dealt an Ace from the Betrayal Deck to determine their House Suit (♠ Spades, ♥ Hearts, ♦ Diamonds, ♣ Clubs).',
    battlefield: 'Uses Decimated Ruins on a 48” x 48” board with four 12” x 12” corner Deployment Zones and a 12” central circle dome. Impassable terrain cannot be placed within 6” of the centre.',
    deployment: 'Players draw for deployment order and place their assigned Ace face-up in their corner Deployment Zone.\n\n**The Betrayal Deck & Draws**: At the start of each Turn, players draw Betrayal Cards from the deck:\n- Leader in VPs: draws 1 card.\n- Trailing in VPs: draws 3 cards.\n- Others: draw 2 cards.\n- +1 Card if unallied at the end of the Alliance Phase.\n- +1 Card whenever rolling a natural 2 or 12 on a Success Roll!\n\n**Coups vs Ruses**: If the card suit matches your assigned Ace, you can play its powerful COUP effect! Otherwise, you can play its tactical RUSE effect.\n\n**The 3-Minute Alliance Period**: Players have 3 minutes to negotiate, whisper, trade cards, and secretly write down their chosen ally. If two players mutually write each other down, they enter a Joint Alliance (+1 VP each per turn, can move within 1", cannot attack each other). Double-dealing is allowed!\n\n**VP Bribes**: Players may trade and transfer actual Victory Points as bribes at any time!',
    gameLength: 'This scenario lasts five Turns.',
    victoryConditions: 'The player with the most Victory Points at the end of Turn 5 wins.\n\n**Victory Points**:\n- 1 VP at the end of each Turn for being in a Joint Alliance.\n- 1 VP for each enemy model taken Out of Action.\n- 2 VPs for having any models within 6” of the board centre.\n- 3 VPs for having the most models within 3” of the board centre.\n- 1 VP per Glorious Deed completed.\n- Plus/minus any Victory Point Bribes given or received!',
    gloriousDeeds: `- **Backstabber**: A friendly model takes an enemy model Out of Action while the enemy is allied with your Warband.
- **Capture**: A friendly model starts and ends a Turn standing at the centre of the battlefield.
- **Death From Above**: A friendly model takes an enemy model Out of Action with a Diving Charge attack.
- **Lord of War**: A friendly model takes 2 enemy models Out of Action with Melee Attacks in a single Turn.
- **No Escape**: A friendly model successfully charges an enemy model it did not have Line of Sight to at the start of Activation.
- **Reaper**: A friendly model takes 3 enemy models Out of Action.
- **Sniper**: A friendly model takes an enemy ELITE model Out of Action at Long Range in Cover.
- **Suicidal Bravery**: A friendly model successfully charges 2 models in the same charge move.
- **Trickster**: A friendly model takes an enemy model Out of Action and a Betrayal Card was used to influence the attack.`
  }
];

// ----------------------------------------------------------------------------
// 2. THE COMPLETE BETRAYAL TABLE (Cards 2 through King)
// ----------------------------------------------------------------------------
export const BETRAYAL_TABLE: BetrayalEffect[] = [
  {
    rank: '2',
    value: 2,
    coupTitle: 'Counter',
    coupTiming: 'Play when a friendly model is chosen as the target of a Melee Attack.',
    coupEffect: 'The friendly model carries out the Attack instead of the enemy model.',
    ruseTitle: 'Misdirection',
    ruseTiming: 'Play when a model is chosen as the target of a Ranged Attack.',
    ruseEffect: 'You pick a new target for the Ranged Attack (the target cannot be from the attacking model\'s own Warband).'
  },
  {
    rank: '3',
    value: 3,
    coupTitle: 'Power Play',
    coupTiming: 'Play when a player announces an alliance.',
    coupEffect: 'They must pick you as their ally instead.',
    ruseTitle: 'Tripwires',
    ruseTiming: 'Play when an enemy model is about to move.',
    ruseEffect: 'Its Movement Characteristic is halved for the move.'
  },
  {
    rank: '4',
    value: 4,
    coupTitle: 'Coup de Grâce',
    coupTiming: 'Play before a friendly model takes a Melee Attack on a model that is down and has 3 or more BLOOD MARKERS.',
    coupEffect: 'The target is taken Out of Action immediately (do not take a Success Roll for the attack).',
    ruseTitle: 'Revenge',
    ruseTiming: 'Play after a friendly model is taken Out of Action by an enemy attack.',
    ruseEffect: 'The attacking model becomes a prime target for all of your models. For the rest of the turn, add +2 DICE to Success Rolls and Risky Success Rolls for attacks made by friendly models on that model.'
  },
  {
    rank: '5',
    value: 5,
    coupTitle: 'Saboteur',
    coupTiming: 'Play when an enemy model is about to move.',
    coupEffect: 'Its Movement Characteristic is halved for the move.',
    ruseTitle: 'Bad Luck',
    ruseTiming: 'Play before a player takes a Success Roll or a Risky Success Roll.',
    ruseEffect: 'Add -1 DICE to the roll.'
  },
  {
    rank: '6',
    value: 6,
    coupTitle: 'Oh No You Don\'t',
    coupTiming: 'Play before an enemy model takes a Retreat ACTION.',
    coupEffect: 'The ACTION is cancelled and the enemy model\'s Activation ends immediately.',
    ruseTitle: 'Valuable Lives',
    ruseTiming: 'Play at the end of a Turn.',
    ruseEffect: 'For every friendly model taken Out of Action on that Turn, your warband gains 10 Ducats.'
  },
  {
    rank: '7',
    value: 7,
    coupTitle: 'Hesitation',
    coupTiming: 'Play when an enemy model takes a Charge ACTION.',
    coupEffect: 'The ACTION is cancelled and the enemy model\'s Activation ends immediately.',
    ruseTitle: 'Malediction',
    ruseTiming: 'Play before you make an Injury Roll for an enemy model.',
    ruseEffect: 'Add +2 INJURY DICE to the roll.'
  },
  {
    rank: '8',
    value: 8,
    coupTitle: 'Double-cross',
    coupTiming: 'Play at any time if you are in an alliance.',
    coupEffect: 'You are no longer allied with the player you wrote down.',
    ruseTitle: 'Bribe',
    ruseTiming: 'Play at any time.',
    ruseEffect: 'Give another player 1 Victory Point.'
  },
  {
    rank: '9',
    value: 9,
    coupTitle: 'Triple-cross',
    coupTiming: 'Play at any time if you are in an alliance.',
    coupEffect: 'You are no longer allied with the player you wrote down. Pick another unallied player; you and that player are now in a joint alliance for the rest of the Turn.',
    ruseTitle: 'Bribe',
    ruseTiming: 'Play at any time.',
    ruseEffect: 'Give another player 1 Victory Point.'
  },
  {
    rank: '10',
    value: 10,
    coupTitle: 'Con',
    coupTiming: 'Play at any time if you are in a joint alliance with a player who has 1 or more Victory Points.',
    coupEffect: 'You steal 1 of their Victory Points and the alliance is broken immediately.',
    ruseTitle: 'Large Bribe',
    ruseTiming: 'Play at any time.',
    ruseEffect: 'Give another player 2 Victory Points.'
  },
  {
    rank: 'J',
    value: 11,
    coupTitle: 'Sure Thing',
    coupTiming: 'Play when a player takes a Success Roll or Risky Success Roll.',
    coupEffect: 'Add +3 DICE to the roll.',
    ruseTitle: 'Good Luck',
    ruseTiming: 'Play when a player takes a Success Roll or Risky Success Roll.',
    ruseEffect: 'Add +1 DICE to the roll.'
  },
  {
    rank: 'Q',
    value: 12,
    coupTitle: 'Flee!',
    coupTiming: 'Play before a player takes a Morale Check.',
    coupEffect: 'The Morale Check is failed automatically (do not roll the dice).',
    ruseTitle: 'Hold On!',
    ruseTiming: 'Play after a player you are allied with fails a Morale Check.',
    ruseEffect: 'They can re-roll the Morale Check.'
  },
  {
    rank: 'K',
    value: 13,
    coupTitle: 'Greedy Bastard',
    coupTiming: 'Play at the end of a Turn if you are in a joint alliance.',
    coupEffect: 'You get 2 Victory Points instead of 1 from this alliance, and the other player gets none.',
    ruseTitle: 'Inglorious',
    ruseTiming: 'Play at any time.',
    ruseEffect: 'Pick an enemy model. That model cannot complete any Glorious Deeds for the rest of the game.'
  }
];

// ----------------------------------------------------------------------------
// 3. STANDARD 52-CARD DECK GENERATOR & HELPERS
// ----------------------------------------------------------------------------
const SUIT_PRIORITY: Record<CardSuit, { symbol: string; priority: number; color: string }> = {
  spades: { symbol: '♠', priority: 4, color: '#ECEFF4' },
  hearts: { symbol: '♥', priority: 3, color: '#E53935' },
  diamonds: { symbol: '♦', priority: 2, color: '#E53935' },
  clubs: { symbol: '♣', priority: 1, color: '#ECEFF4' }
};

const RANK_VALUES: Record<CardRank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14
};

export function generateStandard52Deck(): PlayingCard[] {
  const suits: CardSuit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const ranks: CardRank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: PlayingCard[] = [];

  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      const suitInfo = SUIT_PRIORITY[suit];
      deck.push({
        id: `card-${suit}-${rank}`,
        suit,
        rank,
        value: RANK_VALUES[rank],
        suitPriority: suitInfo.priority,
        symbol: suitInfo.symbol,
        label: `${rank} of ${suit.charAt(0).toUpperCase() + suit.slice(1)}`
      });
    });
  });

  return shuffleDeck(deck);
}

export function shuffleDeck<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function compareInitiativeCards(a: PlayingCard, b: PlayingCard): number {
  if (a.value !== b.value) {
    return b.value - a.value; // higher value first
  }
  return b.suitPriority - a.suitPriority; // Spades > Hearts > Diamonds > Clubs
}
