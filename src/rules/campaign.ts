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
import type { Dataset } from '@/types/catalogue';

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
