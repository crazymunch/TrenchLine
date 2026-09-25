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
  /**
   * The result resolved to a Full Recovery, so nothing is written to the
   * model's injuries.
   *
   * Roll 12 Captured with the ransom paid: "treat this result as a Full
   * Recovery". Recording the capture as an injury would leave the model
   * permanently marked for something it recovered from — and, with the
   * duplicate-injury rule, would block a future capture from being rolled at
   * all (docs/RULES-COVERAGE-AUDIT.md RC-04).
   */
  fullRecovery?: boolean;
  /**
   * Ducats the players agreed and the owner paid, transferred out of the
   * Strongbox. Absent where no ransom was involved; `0` is a legal price,
   * because the rule says the two of you *can* negotiate one.
   */
  ransomPaid?: number;
  /**
   * What the Trauma row's own text says this result writes onto the model.
   *
   * Decided in the wizard, which has the dataset and knows whether the model
   * is ELITE, and applied verbatim by the store — the same split the
   * Experience awards use.
   *
   * Optional because a match recorded before this existed has no such field,
   * and the store must keep treating those as "write the injury, add no scar",
   * which is what it did.
   */
  records?: {
    injury: boolean;
    /** The Battle Scar to add. ELITE only; the book gives Troops none. */
    scar?: { name: string; roll?: string };
    /**
     * The D66 the player actually threw.
     *
     * The provenance of the injury this step writes (FD-12 item 2): the scar
     * already carried its own, and the injury had nowhere to put one.
     *
     * Round 1 put the ROW's range here — `41-63`, which is reached by more than
     * one total — so a sheet read "rolled 41-63" for a D66 that came up 52,
     * while the wizard was holding the 52 all along (review round 2 item 3).
     * The throw goes here; the row goes in `row`.
     *
     * Absent on a match recorded before this, and wherever the player picked a
     * result instead of throwing for it. Absent means *not recorded* and nothing
     * fills it in.
     */
    roll?: string;
    /**
     * The Trauma Table row the result came off, as the table prints it.
     *
     * A range (`41-63`) or a single value. Recorded where the row is what the
     * app can honestly say — a player who picked the result out of a dropdown
     * threw nothing — and read back as "row 41-63", never as a roll.
     */
    row?: string;
  };
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
   * Set by `publishCampaignToCloud`, which mints it — a `crypto.randomUUID`
   * saved BEFORE the request goes out, so a lost response is retried under the
   * same id rather than producing a second campaign. Absent means the campaign
   * is local, which is a supported way to play and what the indicator says.
   * See "First publish" in `docs/CAMPAIGN-SYNC.md`.
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
