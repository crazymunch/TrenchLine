/**
 * The campaign economy.
 *
 * Three numbers that the app has been conflating into one editable `ducatLimit`,
 * kept apart here because the rules keep them apart:
 *
 *   **Threshold Value** caps the total Cost of the *Force* you field this game.
 *   It does **not** cap the roster — the book is explicit that a roster may
 *   exceed it and the surplus models sit the game out:
 *
 *     "Your Warband's Threshold Value and/or its Field Strength may mean that
 *      you cannot take all of the models that are on your Warband Roster. When
 *      this is the case any models you do not use will have to sit the game out."
 *
 *   That distinction is the whole reason this exists. Treating the Threshold as
 *   a roster cap is what makes a builder feel wrong in a campaign: you are told
 *   to delete a model you are allowed to own.
 *
 *   **Field Strength** caps the *number* of models in that Force, counting only
 *   models with a Warband Entry — Battlekit and Glory Items do not count.
 *
 *   **Strongbox** is unspent Ducats, and it persists between games. It is fed by
 *   Exploration and spent in the Quartermaster Step. It has nothing to do with
 *   the Threshold, with one exception noted on `reinforcementAllowance` below.
 *
 * Both tables are read from the dataset, which derives them from the rulebook.
 * Nothing here hard-codes 700.
 */
import type { Dataset, ExplorationLocation, ExplorationTableName } from '@/types/catalogue';

export interface ThresholdRow {
  game: number;
  threshold: number;
  fieldStrength: number;
}

/** What a Force may be, for a given game of a campaign. */
export interface ForceLimits {
  game: number;
  threshold: number;
  fieldStrength: number;
  /** True when `game` ran past the published table and the last row was used. */
  extrapolated: boolean;
}

const rowsOf = (dataset: Dataset): ThresholdRow[] =>
  (dataset as { campaign?: { thresholds?: ThresholdRow[] } }).campaign?.thresholds ?? [];

/** The published starting allowance — 700 Ducats, read from the book. */
export function startingBudget(dataset: Dataset): number | null {
  return (dataset as { campaign?: { startingBudget?: number } }).campaign?.startingBudget ?? null;
}

/**
 * The limits for game `n`.
 *
 * The published table stops at game 12. A longer campaign is a real thing that
 * groups do, and the book gives no rule for it, so this holds at the last
 * published row and *says* it is doing that rather than extrapolating +100 —
 * inventing a 13th row would be inventing game data. A campaign that runs long
 * can set its own limits, and the flag is what lets the UI offer that.
 */
export function forceLimits(dataset: Dataset, game: number): ForceLimits | null {
  const rows = rowsOf(dataset);
  if (!rows.length) return null;

  const n = Math.max(1, Math.floor(game) || 1);
  const exact = rows.find((r) => r.game === n);
  if (exact) return { ...exact, extrapolated: false };

  const last = rows[rows.length - 1];
  return { game: n, threshold: last.threshold, fieldStrength: last.fieldStrength, extrapolated: true };
}

/**
 * What Calling for Reinforcements lets you spend.
 *
 * The one place the Threshold acts as an allowance rather than a cap:
 *
 *   "Reduce the number of 👑 in your Strongbox to zero … Subtract the Total Cost
 *    of your Warband from the Threshold Value of the next game you will play.
 *    The difference is the number of 👑 you can spend to recruit new models …
 *    Any 👑 you do not spend on reinforcements are lost."
 *
 * It also discards the Arsenal and skips the Exploration and Quartermaster
 * Steps, so it is a bail-out with a real price and the UI should say so before
 * anyone commits to it.
 */
export function reinforcementAllowance(
  dataset: Dataset,
  nextGame: number,
  warbandTotalCost: number
): number | null {
  const limits = forceLimits(dataset, nextGame);
  if (!limits) return null;
  return Math.max(0, limits.threshold - warbandTotalCost);
}

/* ------------------------------------------------------------------ ledger */

/**
 * Why a warband's Ducats or Glory changed.
 *
 * The economy is recorded rather than just totalled, for two reasons the group
 * this is built for runs into constantly. Players miss games and get agreed
 * catch-up allotments, which is a number that has to be attributable to whoever
 * granted it. And purchases can be reversed right up until the next game is
 * played, which needs the entries to reverse rather than a recomputed total.
 */
export type LedgerReason =
  | 'founding'        // the starting allowance
  | 'exploration'     // loot: the Exploration Roll times 10
  | 'quartermaster'   // spent on recruits or Battlekit
  | 'sold'            // Battlekit sold back
  | 'ransom'          // paid or received
  | 'admin-grant'     // a campaign admin's catch-up allotment
  | 'admin-adjust'    // any other admin correction
  | 'reinforcements'; // the Strongbox zeroed by Calling for Reinforcements

export interface LedgerEntry {
  id: string;
  at: string;
  reason: LedgerReason;
  /** Signed: negative is a debit. Ducats and Glory are tracked separately. */
  ducats: number;
  glory: number;
  note?: string;
  /** Who did it, for the entries only an admin may write. */
  byUserId?: string;
  byName?: string;
  /** The game this belongs to, so a turn can be reversed as a unit. */
  game?: number;
}

/** The Strongbox is the sum of its ledger, never a number someone typed. */
export function strongboxOf(ledger: LedgerEntry[]): { ducats: number; glory: number } {
  return (ledger ?? []).reduce(
    (acc, e) => ({ ducats: acc.ducats + (e.ducats || 0), glory: acc.glory + (e.glory || 0) }),
    { ducats: 0, glory: 0 }
  );
}

/**
 * Entries a player may still undo.
 *
 * "Users can make any variations from the end of one game to the start of the
 * next" — so anything booked against the current game is still reversible, and
 * anything from an earlier game is settled. Admin entries are never reversible
 * by a player, whichever game they fall in.
 */
export function reversible(ledger: LedgerEntry[], currentGame: number): LedgerEntry[] {
  return (ledger ?? []).filter(
    (e) => (e.game ?? 0) >= currentGame && e.reason !== 'admin-grant' && e.reason !== 'admin-adjust'
  );
}

/**
 * Which game of the campaign a warband is preparing for.
 *
 * Deliberately read from the *campaign*, not from the warband's own record of
 * games played. A player who misses two games rejoins at the campaign's current
 * level rather than trailing behind it — the group agrees a catch-up allotment
 * so they can field to it, which is an admin grant on the ledger. Deriving the
 * Threshold per warband would instead lock a returning player at the limit they
 * left on, which is neither what the book describes nor what any group does.
 *
 * A warband in no campaign is preparing for game 1.
 */
export function campaignGameOf(
  warband: { campaignId?: string },
  campaign?: { id?: string; currentGame?: number; currentTurn?: number }
): number {
  if (!warband.campaignId || !campaign || campaign.id !== warband.campaignId) return 1;
  const n = campaign.currentGame ?? campaign.currentTurn ?? 1;
  return Math.max(1, Math.floor(n) || 1);
}


/* --------------------------------------------------------------- lifecycle */

/**
 * Whether this Warband has fought a game yet.
 *
 * Read from the Warband's own record, not from a flag someone sets: a
 * post-battle snapshot is written when a game is resolved, and Exploration and
 * Calling for Reinforcements only happen after a battle. Any of the three is
 * evidence the campaign has started. Absent all of them, it has not.
 *
 * `game > 1` on a ledger entry counts too — a Warband joining a campaign
 * mid-season is credited against the game in progress.
 */
export function hasPlayedAGame(warband: {
  snapshots?: { type?: string }[];
  ledger?: LedgerEntry[];
}): boolean {
  if ((warband.snapshots ?? []).some((s) => s.type === 'post_battle')) return true;
  return (warband.ledger ?? []).some((e) =>
    e.reason === 'exploration'
    || e.reason === 'reinforcements'
    || (e.game ?? 1) > 1);
}

/**
 * Whether the Warband Variant may still be changed.
 *
 * A Variant is a founding decision — it changes what the Warband may recruit,
 * so re-declaring one three games in would retroactively make models on the
 * roster illegal (or legal). It is therefore fixed once the campaign has
 * started.
 *
 * An unrestricted Warband is exempt: it exists to try lists out, has no
 * campaign to be consistent with, and its budget is already the player's to
 * set at any time.
 */
export function canChangeVariant(warband: {
  forceMode?: 'campaign' | 'unrestricted';
  snapshots?: { type?: string }[];
  ledger?: LedgerEntry[];
}): boolean {
  if (warband.forceMode === 'unrestricted') return true;
  return !hasPlayedAGame(warband);
}

/* ------------------------------------------------------------- exploration */

/**
 * The Exploration Step, which is where a campaign warband's money comes from.
 *
 * Four things happen and they are easy to conflate, so they are separate here:
 *
 *   1. **Dice.** How many D6 you roll depends on games played — 3, then 4, 5, 6.
 *   2. **Roll.** Sum them. You may re-roll one die, and a second if you won.
 *   3. **Discovery.** Look the total up on the table your games-played band
 *      allows. The tables are *sparse*: a roll that is not listed discovers
 *      nothing, and that is the rule, not a gap in the data.
 *   4. **Loot.** The Ducats are the roll times 10, and they are collected
 *      **whether or not anything was discovered**. This is the part the old
 *      D66 model could not express at all.
 */
export interface ExplorationOutcome {
  roll: number;
  /** Ducats added to the Strongbox. Always the roll times 10. */
  loot: number;
  /** The table consulted, or null when the roll produced no discovery. */
  table: ExplorationTableName | null;
  location: ExplorationLocation | null;
  /** Set when nothing was found, saying which of the two reasons applies. */
  nothingBecause?: 'not-on-table' | 'already-discovered';
}

const explorationOf = (dataset: Dataset) =>
  (dataset as { campaign?: { exploration?: Dataset['campaign']['exploration'] } })
    .campaign?.exploration;

const bandFor = <T,>(bands: { from: number; to: number | null; value: T }[], n: number) =>
  bands.find((b) => n >= b.from && (b.to === null || n <= b.to))?.value;

/** How many Exploration Dice, for a warband that has played `gamesPlayed` games. */
export function explorationDice(dataset: Dataset, gamesPlayed: number): number | null {
  const e = explorationOf(dataset);
  if (!e) return null;
  return bandFor(e.dice, Math.max(1, Math.floor(gamesPlayed) || 1)) ?? null;
}

/** Which Location tables this warband may consult, and whether it is a choice. */
export function explorationTables(
  dataset: Dataset,
  gamesPlayed: number
): { tables: ExplorationTableName[]; choose: boolean } | null {
  const e = explorationOf(dataset);
  if (!e) return null;
  return bandFor(e.tables, Math.max(1, Math.floor(gamesPlayed) || 1)) ?? null;
}

/**
 * Resolve an Exploration Roll.
 *
 * `roll` is the total the player actually got — rolled in the app or rolled on
 * the table and typed in. Both routes come through here, so the two produce
 * identical records and a physical roll is as well recorded as a digital one.
 *
 * `alreadyDiscovered` carries the Locations this warband has already found: "You
 * can discover a Location only once during the campaign; if you discover it
 * again, treat the roll as a Pillaged result instead." The loot is unaffected.
 */
export function resolveExploration(
  dataset: Dataset,
  roll: number,
  table: ExplorationTableName,
  alreadyDiscovered: string[] = []
): ExplorationOutcome | null {
  const e = explorationOf(dataset);
  if (!e) return null;

  const n = Math.max(0, Math.floor(roll) || 0);
  const loot = n * e.lootPerPoint;

  const found = (e.locations[table] ?? []).find((l) => l.roll === n);
  if (!found) return { roll: n, loot, table, location: null, nothingBecause: 'not-on-table' };

  const seen = new Set(alreadyDiscovered.map((s) => s.toLowerCase()));
  if (seen.has(found.name.toLowerCase())) {
    return { roll: n, loot, table, location: null, nothingBecause: 'already-discovered' };
  }

  return { roll: n, loot, table, location: found };
}

/** The ledger entry an Exploration outcome produces. Loot is always collected. */
export function explorationLedgerEntry(
  outcome: ExplorationOutcome,
  game: number
): LedgerEntry {
  return {
    id: `led-exp-${game}-${outcome.roll}-${Date.now()}`,
    at: new Date().toISOString(),
    reason: 'exploration',
    ducats: outcome.loot,
    glory: 0,
    game,
    note: outcome.location
      ? `Exploration Roll ${outcome.roll}: ${outcome.location.name}.`
      : `Exploration Roll ${outcome.roll}: no discovery ` +
        `(${outcome.nothingBecause === 'already-discovered' ? 'already found' : 'not on the table'}).`,
  };
}
