export interface CampaignMember {
  userId: string;
  playerName: string;
  /**
   * May edit any member's Ducats, Glory and XP, and grant catch-up allotments.
   *
   * A player who misses a game rejoins at the campaign's current Threshold, and
   * the group agrees a top-up so they can field to it — that is a real decision
   * a person makes, not something the app can derive, so it needs someone
   * authorised to record it. The campaign's creator is an admin by default and
   * can promote others.
   */
  isAdmin?: boolean;
  warbandId: string;
  warbandName: string;
  factionId: string;
  glory: number;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  treasury: number;
}

export interface CasualtyRecord {
  unitId: string;
  unitName: string;
  outcome: string; // e.g. "D66 Roll: 14 - Dead", "D66 Roll: 33 - Lost Eye"
  isDead: boolean;
  statModifierApplied?: string;
}

export interface MatchParticipantSummary {
  warbandId: string;
  warbandName: string;
  playerName: string;
  result: 'Victory' | 'Defeat' | 'Draw';
  gloryGained: number;
  ducatsGained: number;
  casualties: CasualtyRecord[];
}

export interface MatchRecord {
  id: string;
  campaignId: string;
  date: string;
  scenarioId: string;
  scenarioName: string;
  participants: MatchParticipantSummary[];
  narrativeLog: string;
  
  // Rich Narrative & Battle Report Fields
  narrativeReport?: string; // Comprehensive narrative battle report
  mvpUnitId?: string;
  mvpUnitName?: string;
  opponentWarbandName?: string;
  notableMoments?: string[];
  turningPoints?: string;
}

export interface TerritoryNode {
  id: string;
  name: string;
  type: string;
  controlledByWarbandId?: string;
  controlledByPlayerName?: string;
  perk: string; // e.g. "+10 Ducats exploration reward"
  description: string;
  x?: number; // Map position X percentage (0-100)
  y?: number; // Map position Y percentage (0-100)
  region?: string;
}

export interface Campaign {
  id: string;
  name: string;
  inviteCode: string;
  adminName: string;
  status: 'active' | 'archived';
  currentTurn: number;
  /**
   * Which game of the campaign is being prepared for. Drives the Threshold
   * Value and Field Strength for everyone, which is why it lives here and not
   * on each warband: a player who missed games still plays at the campaign's
   * current level, topped up by an admin grant rather than held back.
   */
  currentGame?: number;
  /** Set only where a campaign deviates from the published Threshold Table. */
  thresholdOverride?: number;
  maxWarbandDucats: number;
  gloryVictoryThreshold: number;
  members: CampaignMember[];
  matches: MatchRecord[];
  territories: TerritoryNode[];
  chronicleLogs: {
    id: string;
    timestamp: string;
    text: string;
    category: 'battle' | 'recruitment' | 'injury' | 'territory';
  }[];
}
