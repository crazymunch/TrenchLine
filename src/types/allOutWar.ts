export type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type CardRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface PlayingCard {
  id: string;
  suit: CardSuit;
  rank: CardRank;
  value: number; // 2..14 (A=14)
  suitPriority: number; // Spades=4, Hearts=3, Diamonds=2, Clubs=1
  symbol: string; // ♠, ♥, ♦, ♣
  label: string; // e.g. "Ace of Spades", "10 of Diamonds"
}

export interface BetrayalEffect {
  rank: CardRank;
  value: number;
  coupTitle: string;
  coupTiming: string;
  coupEffect: string;
  ruseTitle: string;
  ruseTiming: string;
  ruseEffect: string;
}

export interface PlayerCardState {
  warbandId: string;
  warbandName: string;
  playerName: string;
  assignedAceSuit?: CardSuit;
  initiativeCard?: PlayingCard | null;
  betrayalHand: PlayingCard[];
  secretAllyWarbandId?: string | null;
  revealedAllyWarbandId?: string | null;
  isJointAllianceWith?: string | null;
  vpBribesSent: number;
  vpBribesReceived: number;
}
