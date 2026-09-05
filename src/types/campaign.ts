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

/**
 * Which campaign rules a campaign is played under.
 *
 * Fixed when the campaign is created and never changed after: the two do not
 * agree on what a territory is, what a turn is or how the campaign is won, so
 * switching mid-campaign would leave every recorded game meaning something
 * different from what it meant when it was played.
 *
 * `classic` is the app's own: the world map of the setting, a Glory-point
 * victory threshold and a match log. `carcass-front` is the published Carcass
 * Front Campaign — its 32 zones with their Resources, the Camp buildings, the
 * Campaign Tracker and the Shared Objectives, all derived from the book and
 * the fold-out map.
 *
 * Optional on `Campaign` because campaigns saved before this existed have no
 * such field, and every one of them is a `classic`.
 */
export type CampaignFramework = 'classic' | 'carcass-front';

export interface TerritoryNode {
  id: string;
  name: string;
  type: string;
  /** The server version this copy was last known to match — see `Campaign.version`. */
  version?: number;
  controlledByWarbandId?: string;
  controlledByPlayerName?: string;
  /**
   * What holding it confers.
   *
   * EMPTY on the app's own theatres: no published rule attaches an effect to
   * holding one, and the twelve that shipped an invented one presented it as
   * a rule. Set on a Carcass Front Special Zone, where the book publishes an
   * Outpost Bonus and this carries it verbatim.
   */
  perk: string;
  /**
   * Where the perk above came from, so the two can never be confused.
   *
   * `published` is a rule a book prints — the Carcass Front Special Zone
   * Outpost Bonuses, carried verbatim. `campaign` is a house rule the
   * organiser wrote in the app. Absent means no perk.
   *
   * This exists because of what it replaced: sixteen invented perks sat in
   * `seed.ts` and rendered under the same "Strategic Territory Perk" heading a
   * derived rule would, so a player could not tell which was which. Letting an
   * organiser write one is only safe if the app says whose rule it is — and a
   * `published` perk is never editable, because overwriting the book's own
   * Outpost Bonus with a house rule would recreate exactly that confusion.
   */
  perkSource?: 'published' | 'campaign';
  description: string;
  x?: number; // Map position X percentage (0-100)
  y?: number; // Map position Y percentage (0-100)
  region?: string;
  /** Carcass Front only: Favour / Relics / Supplies / Territories. */
  resources?: string[];
  /** Carcass Front only: the scenario played at this zone. */
  scenario?: string;
}

/**
 * The deviations a campaign has chosen, one field per rule.
 *
 * Deliberately not a free-text bag: a house rule the app ACTS on has to be
 * something the app can read, and a rule it merely displays belongs in the
 * chronicle. Each field names the published rule it relaxes.
 */
export interface CampaignHouseRules {
  /**
   * Taking Reinforcements does not cost this campaign its Exploration and
   * Quartermaster Steps.
   *
   * The book states the cost unconditionally — *"if you do so you will not be
   * able to Explore or visit the Quartermaster, so it is not a decision to be
   * taken lightly"* — and the app lets a player through either way. This only
   * decides whether the wizard presents that as a rule being set aside or as
   * the way this group plays.
   */
  reinforcementsKeepExploration?: boolean;
}

export interface Campaign {
  id: string;
  /**
   * The id the SERVER knows this campaign by, once it knows it at all.
   *
   * `id` is minted locally — `camp-<timestamp>` — and always has been, so it
   * is not something the API would recognise. Sync operations name a campaign
   * the server can find, so they are queued only for a campaign that has one
   * of these, and a campaign without one is local and says so.
   *
   * Nothing sets it yet. `POST /api/campaigns` creates a campaign with four
   * fixed territories of its own and no framework, so it cannot yet represent
   * a campaign this app made — see the "first sync" section of
   * `docs/CAMPAIGN-SYNC.md` for what that needs. This field exists so the gap
   * is visible in the type rather than showing up as every campaign failing
   * to sync against an id the server never issued.
   */
  cloudId?: string;
  name: string;
  inviteCode: string;
  adminName: string;
  status: 'active' | 'archived';
  /**
   * Which rules this campaign is played under. Absent on campaigns saved
   * before the choice existed, and every one of those is a `classic`.
   */
  framework?: CampaignFramework;
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
  /**
   * Where this group deliberately plays something differently from the book.
   *
   * Set by the organiser, and labelled as theirs wherever it changes what the
   * app says — the same distinction territory perks draw between a rule the
   * books publish and one the campaign wrote. Absent on every campaign that
   * plays it straight, which is most of them.
   */
  houseRules?: CampaignHouseRules;
  /**
   * The server version this copy was last known to match.
   *
   * A sync operation states the version it was made AGAINST, so the client has
   * to remember one. Absent on a campaign that has never been pushed, which is
   * the same as 1: that is where a server row starts.
   */
  version?: number;
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
