export interface CampaignMember {
  userId: string;
  playerName: string;
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
}

export interface TerritoryNode {
  id: string;
  name: string;
  type: 'Trench Line' | 'Ruined Shrine' | 'Munitions Bunker' | 'No Man\'s Land' | 'Cathedral Ruins';
  controlledByWarbandId?: string;
  controlledByPlayerName?: string;
  perk: string; // e.g. "+10 Ducats exploration reward"
  description: string;
}

export interface Campaign {
  id: string;
  name: string;
  inviteCode: string;
  adminName: string;
  status: 'active' | 'archived';
  currentTurn: number;
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
