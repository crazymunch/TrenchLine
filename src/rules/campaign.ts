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
import type {
  ReinforcementsSequence,
  Dataset, ExplorationLocation, ExplorationTableName, RollRange,
} from '@/types/catalogue';
import { variantById, factionOf } from './variants';

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
 * What a warband of this faction and variant actually musters on.
 *
 * Not always the faction's 700 and no Glory. The Papal States Intervention
 * Force's "Specialist Force" rule states 500 👑 and 11 ☼ — 1 of 27 variants,
 * and for a long time the app printed that rule on the muster screen and then
 * handed the player 700 👑 and nothing anyway.
 *
 * A variant's stated purse replaces its faction's rather than adjusting it,
 * which is how the rule reads: "You have 500 👑 and 11 ☼ to recruit a Papal
 * State Intervention Force Warband", not "200 fewer than usual".
 *
 * Returns null when the dataset states no budget anywhere. That is a broken
 * dataset, not a warband on 700 — the caller must say so rather than pick a
 * number, so this never invents one.
 */
export function musterBudget(
  dataset: Dataset,
  factionId: string,
  variantId?: string
): { ducats: number; glory: number } | null {
  const variant = variantById(dataset, variantId);
  if (variant?.budget && typeof variant.budget.ducats === 'number') {
    return { ducats: variant.budget.ducats, glory: variant.budget.glory ?? 0 };
  }

  const faction = factionOf(dataset, factionId);
  if (faction?.budget && typeof faction.budget.ducats === 'number') {
    return { ducats: faction.budget.ducats, glory: faction.budget.glory ?? 0 };
  }

  const published = startingBudget(dataset);
  return published === null ? null : { ducats: published, glory: 0 };
}

/**
 * Glory a variant collects each time it Calls for Reinforcements, or 0.
 *
 * Part of the same Specialist Force rule as the purse: "A Papal States
 * Intervention Force gains 4 ☼ each time it calls for Reinforcements."
 */
export function reinforcementGlory(dataset: Dataset, variantId?: string): number {
  return variantById(dataset, variantId)?.reinforcementGlory ?? 0;
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
export function forceLimits(
  dataset: Dataset,
  game: number,
  variantId?: string
): ForceLimits | null {
  const rows = rowsOf(dataset);
  if (!rows.length) return null;

  const n = Math.max(1, Math.floor(game) || 1);
  const exact = rows.find((r) => r.game === n);
  const base = exact
    ? { ...exact, extrapolated: false }
    : (() => {
        const last = rows[rows.length - 1];
        return {
          game: n, threshold: last.threshold,
          fieldStrength: last.fieldStrength, extrapolated: true,
        };
      })();

  /*
    A variant may shift the whole table. "In a campaign, their Threshold Value
    is reduced by 200 👑" applies to every row, so it is a delta on the value
    read out of the table rather than a row of its own — and it belongs here,
    the one place the Threshold is resolved, so `reinforcementAllowance` and
    the Force validator both get it without knowing the rule exists.

    Clamped at zero: no published delta comes near the game-1 Threshold of 700,
    but a negative cap would silently invert the validator's comparison.
  */
  const delta = variantById(dataset, variantId)?.thresholdDelta ?? 0;
  if (!delta) return base;
  return { ...base, threshold: Math.max(0, base.threshold + delta) };
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
  warbandTotalCost: number,
  variantId?: string
): number | null {
  const limits = forceLimits(dataset, nextGame, variantId);
  if (!limits) return null;
  return Math.max(0, limits.threshold - warbandTotalCost);
}

/**
 * The Reinforcements Sequence, or `null` on a ruleset that does not state it.
 *
 * `null` rather than a permissive default. A caller that cannot read the
 * sequence must not conclude that Reinforcements is free — which is exactly
 * what the app concluded for as long as nothing read this.
 */
export const reinforcementsSequence = (
  dataset: Dataset | null | undefined,
): ReinforcementsSequence | null => dataset?.campaign?.reinforcements ?? null;

/**
 * What a warband gives up by Calling for Reinforcements, and what it gets.
 *
 * The whole trade in one place, so the screen that warns and the store that
 * writes cannot disagree about it. `docs/RULES-COVERAGE-AUDIT.md` RC-09: the
 * app offered the choice, applied only the forfeiture of Exploration and the
 * Quartermaster, and left the player holding the Arsenal and the Strongbox the
 * book says they abandon.
 *
 * Reports; the caller decides. Nothing here mutates a roster — this is what a
 * confirmation dialog needs in order to be honest about the price.
 */
export interface ReinforcementCost {
  /** Battlekit abandoned from the Arsenal. Named, because the player is losing them. */
  arsenalDiscarded: { id: string; name: string }[];
  /** Ducats emptied out of the Strongbox. */
  strongboxLost: number;
  /**
   * What may be spent recruiting, from the NEXT game's Threshold.
   *
   * `null` where the Threshold cannot be resolved — the caller must show that
   * it does not know rather than offer a number it made up.
   */
  allowance: number | null;
  /** The warband's total cost, which the allowance is measured against. */
  warbandTotalCost: number;
}

export function reinforcementCost(
  dataset: Dataset,
  warband: {
    units: { totalCost: number; isDead?: boolean }[];
    armoryStash?: { id: string; name: string }[];
    treasuryDucats: number;
    variantId?: string;
  },
  nextGame: number,
): ReinforcementCost {
  /*
    Step 3 — "calculate the total Cost of all the models in your Warband". A
    model removed from the roster is not in the Warband, so a dead one does not
    inflate the total and shrink the allowance.
  */
  const warbandTotalCost = warband.units
    .filter((u) => !u.isDead)
    .reduce((sum, u) => sum + (u.totalCost || 0), 0);

  return {
    arsenalDiscarded: (warband.armoryStash ?? []).map((i) => ({ id: i.id, name: i.name })),
    strongboxLost: warband.treasuryDucats,
    allowance: reinforcementAllowance(dataset, nextGame, warbandTotalCost, warband.variantId),
    warbandTotalCost,
  };
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
 *
 * So is a Warband with NO Variant, and that exemption is the important one.
 *
 * The rule above is about CHANGING a declaration. Where none has been made
 * there is nothing to change, and the harm it guards against is already
 * happening: a Warband with no Variant is validated against its faction's
 * standard list, which is what makes models on the roster wrongly legal or
 * illegal. Declaring the Variant is what ENDS that, so refusing the
 * declaration keeps the roster wrong on purpose.
 *
 * This is not hypothetical. `POST /api/warbands` never persisted `variantId`,
 * so every Warband that synced lost its Variant, and a campaign Warband that
 * had already fought could then never restore it: the app deleted the
 * declaration and then locked the door on it. A House of Wisdom list came back
 * told it must include a Yüzbaşı its Variant forbids, with no way to say
 * otherwise.
 *
 * A player could in principle leave the Variant unset, play, then declare one
 * to legalise something. That is a worse trade than it looks: before the sync
 * was fixed, "no Variant" was overwhelmingly the bug rather than a choice, and
 * a roster nobody can correct is a roster nobody trusts. The declaration is
 * still one-way — once made, this locks again.
 *
 * ## The admin override
 *
 * An admin may change a declared Variant. This lock is a RULES guard, not a
 * permission boundary: it stops a player rewriting their own history by
 * accident, and every reason it exists is about keeping a campaign honest
 * between people who trust each other. The person running the campaign is the
 * one who adjudicates exactly this kind of correction at the table, so the app
 * should not be the only thing in the room that cannot be overruled.
 *
 * It is deliberately NOT a security decision and must never be confused with
 * one. Nothing here reads or writes another player's data; `isAdmin` arrives
 * from the issued session (`sessionIsAdmin`), the same value the server
 * decided, and the worst it can do is let its holder edit a roster they can
 * already edit. The API's own authorization is unaffected and unaware of it.
 */
export function canChangeVariant(
  warband: {
    forceMode?: 'campaign' | 'unrestricted';
    variantId?: string;
    snapshots?: { type?: string }[];
    ledger?: LedgerEntry[];
  },
  options: { isAdmin?: boolean } = {},
): boolean {
  if (options.isAdmin) return true;
  if (warband.forceMode === 'unrestricted') return true;
  if (!warband.variantId) return true;
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

/**
 * A range as the book prints it: `4`, `1-3`, `34+`.
 *
 * A degenerate range prints as the single number it is, so the rulebook's
 * sparse tables read exactly as they did before the type widened.
 */
export const rollLabel = (r: RollRange): string => {
  if (r.to === null) return `${r.from}+`;
  return r.from === r.to ? `${r.from}` : `${r.from}-${r.to}`;
};

/**
 * Does this roll fall in this band?
 *
 * `to: null` is open-ended — the last row of every Carcass Front table — and
 * an Exploration Roll can exceed any printed number, because the dice pool
 * grows all campaign.
 */
export const inRange = (r: RollRange, n: number): boolean =>
  n >= r.from && (r.to === null || n <= r.to);

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

/**
 * The Exploration band for the post-battle step, from the campaign itself.
 *
 * This arithmetic used to live in `PostBattleWizardModal` as
 * `campaignGameOf(warband, campaign) - 1`, under a comment saying the count is
 * "one less than the game being prepared for". That describes the state *after*
 * commit: `applyPostBattleResults` increments `currentTurn`, so while the
 * wizard is open `campaignGameOf` already *is* the number of the game just
 * played — which is the games-played count the book's bands are indexed on.
 *
 * Subtracting made every band a game late. After the third game the book gives
 * four dice and opens the Rare table; the app gave three and Common only, at
 * ten Ducats per pip. The same screen's `nextGame` did not subtract, so the two
 * numbers disagreed about which game it was.
 *
 * It lives here rather than in the component so that the relationship between
 * a stored campaign and the band it produces is something a test can hold.
 */
export function explorationBandFor(
  dataset: Dataset | null | undefined,
  warband: { campaignId?: string },
  campaign?: { id?: string; currentGame?: number; currentTurn?: number },
): { gamesPlayed: number; dice: number | null; tables: ExplorationTableName[]; choose: boolean } {
  const gamesPlayed = campaignGameOf(warband, campaign);
  const open = dataset ? explorationTables(dataset, gamesPlayed) : null;
  return {
    gamesPlayed,
    dice: dataset ? explorationDice(dataset, gamesPlayed) : null,
    tables: open?.tables ?? [],
    choose: open?.choose ?? false,
  };
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

  const found = (e.locations[table] ?? []).find((l) => inRange(l.roll, n));
  if (!found) return { roll: n, loot, table, location: null, nothingBecause: 'not-on-table' };

  const seen = new Set(alreadyDiscovered.map((s) => s.toLowerCase()));
  if (seen.has(found.name.toLowerCase())) {
    return { roll: n, loot, table, location: null, nothingBecause: 'already-discovered' };
  }

  return { roll: n, loot, table, location: found };
}

/* ------------------------------------------- exploration: Carcass Front */

/**
 * The Carcass Front Exploration Step, which is a different step.
 *
 * A Carcass Front campaign does not use the rulebook's Exploration Tables at
 * all — *"you must use the Carcass Front Exploration Tables at the end of this
 * book, instead of the ones in the Trench Crusade Rulebook"* — and four things
 * change with them:
 *
 *   1. **The pool is 3D6 and does not grow with games played.** It grows with
 *      Campaign Tracker rewards and Camp Buildings instead.
 *   2. **Loot is the roll times FIVE**, not ten.
 *   3. **You pick the table by Resource**, from those available in the zone
 *      the game was played in — not by a rarity band.
 *   4. **Only the Aggressor consults a table at all.** The other player rolls,
 *      takes the loot, and checks their dice for three of a kind.
 *
 * Getting any of those wrong pays a warband roughly twice what the book pays
 * it, which is the sort of error nobody notices until the campaign is over.
 */
export interface CarcassFrontExplorationOutcome {
  roll: number;
  /** The roll times five. Collected by both players, whoever was Aggressor. */
  loot: number;
  /** The Resource table consulted, or null for a player who was not the Aggressor. */
  resource: string | null;
  location: ExplorationLocation | null;
  /**
   * Three or more Exploration Dice showing the same value, which is how a
   * player who was NOT the Aggressor comes across agents for Rudolf's Folly.
   * Null when the dice were not recorded individually.
   */
  rudolfsFolly: boolean | null;
  /**
   * True when this warband has found this Location before.
   *
   * Reported rather than acted on. The rulebook's Exploration Step says a
   * Location is discovered only once in a campaign and a repeat is treated as
   * a Pillaged result; **Carcass Front does not restate that rule** for its own
   * tables, and it rewrites the rest of the step in detail. Suppressing the
   * result would apply a rule this book does not print, and applying it
   * silently would hide the question — so the app says what it found and that
   * the warband has seen it before.
   */
  previouslyDiscovered: boolean;
}

/** Ducats per point of the Exploration Roll in a Carcass Front campaign. */
export const CARCASS_FRONT_LOOT_PER_POINT = 5;

/** The Exploration Dice Pool a Carcass Front warband starts on. It does not grow with games. */
export const CARCASS_FRONT_STARTING_DICE = 3;

const carcassFrontTablesOf = (dataset: Dataset) =>
  (dataset as { campaign?: { carcassFrontExploration?: NonNullable<
    Dataset['campaign']['carcassFrontExploration']> } })
    .campaign?.carcassFrontExploration;

/** The Resources a Carcass Front campaign has Exploration Tables for. */
export function carcassFrontResources(dataset: Dataset): string[] {
  return Object.keys(carcassFrontTablesOf(dataset) ?? {});
}

/**
 * Three or more Exploration Dice showing the same value.
 *
 * "if at least 3 of the Exploration Dice you have rolled have the same value
 * (i.e. three or more 6s, or three or more 2s, etc.)". Counted over the dice
 * themselves, so it cannot be derived from the total — which is why the app
 * keeps the individual dice rather than only their sum.
 */
export function hasThreeOfAKind(dice: number[]): boolean {
  const counts = new Map<number, number>();
  for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);
  return [...counts.values()].some((c) => c >= 3);
}

/**
 * Resolve a Carcass Front Exploration Roll.
 *
 * `resource` is the table the player chose, or `null` for a player who was not
 * the Aggressor and so does not consult one.
 */
export function resolveCarcassFrontExploration(
  dataset: Dataset,
  { roll, dice, resource, alreadyDiscovered = [] }: {
    roll: number;
    dice?: number[];
    resource: string | null;
    alreadyDiscovered?: string[];
  }
): CarcassFrontExplorationOutcome | null {
  const tables = carcassFrontTablesOf(dataset);
  if (!tables) return null;

  const n = Math.max(0, Math.floor(roll) || 0);
  const loot = n * CARCASS_FRONT_LOOT_PER_POINT;
  const rudolfsFolly = dice && dice.length ? hasThreeOfAKind(dice) : null;

  if (!resource) {
    return { roll: n, loot, resource: null, location: null, rudolfsFolly, previouslyDiscovered: false };
  }

  const table = tables[resource];
  if (!table) return null;

  /*
    The tables are contiguous and the last row is open-ended, so a roll always
    lands somewhere. A miss here is a parse failure, not a rule — and the
    parser's contiguity check is what makes that true.
  */
  const location = table.locations.find((l) => inRange(l.roll, n)) ?? null;

  const seen = new Set(alreadyDiscovered.map((x) => x.toLowerCase()));
  return {
    roll: n,
    loot,
    resource,
    location,
    rudolfsFolly,
    previouslyDiscovered: Boolean(location && seen.has(location.name.toLowerCase())),
  };
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

/* ------------------------------------------------------------------ *
 * Campaign Victory Points (RR-02, second half)
 * ------------------------------------------------------------------ */

/** The derived scale, or `null` for a ruleset built before it existed. */
export const victoryPointScale = (dataset: Dataset | null | undefined) =>
  dataset?.campaign?.victoryPoints ?? null;

/**
 * A member's Campaign Victory Points.
 *
 * Page 95: *"The winner of the game scores +15… The loser of the game scores
 * +7… In a draw, both players score +10… At the end of the campaign, the
 * player with the most Campaign Victory Points is the winner."*
 *
 * **Derived, never stored.** It is a function of the win/loss/draw record the
 * campaign already keeps, so there is no new field to sync, no second writer,
 * and nothing that can drift out of step with the results it is computed
 * from. A stored total would be one more number two members could disagree
 * about after a merge.
 *
 * The app had nothing of this. The Campaign Hub ranked members on `glory` and
 * `rating` — one is a spendable currency and the other is not in the rulebook
 * at all — so the standings answered a question the game does not ask, and the
 * one it does ask had no answer anywhere.
 *
 * **What this does not count.** Two Exploration results move Campaign Victory
 * Points outside the per-game scale: `16 Treasure of the Holies` scores D3,
 * and `23 Patron's Visit` exchanges up to 10 ☼ for the same number of points.
 * Neither is derivable from a win/loss/draw record — both are a decision or a
 * die roll at the table — so they need an adjustments ledger the campaign does
 * not have yet. Until it does, this is the per-game total and says so, rather
 * than being presented as a final score it cannot be.
 *
 * `null` where the ruleset carries no scale. Not zero: a campaign whose
 * standings cannot be computed must not render as everyone on nothing.
 */
export function campaignVictoryPoints(
  dataset: Dataset | null | undefined,
  member: { wins?: number; losses?: number; draws?: number } | null | undefined,
): number | null {
  const scale = victoryPointScale(dataset);
  if (!scale || !member) return null;

  const n = (x: number | undefined) => (Number.isFinite(x) ? Math.max(0, x as number) : 0);
  return n(member.wins) * scale.win
    + n(member.losses) * scale.loss
    + n(member.draws) * scale.draw;
}

/**
 * Members ordered as the book decides a campaign, highest first.
 *
 * *"In the case of a tie, all tied players are joint winners"* — so a tie is a
 * real result and this does not invent a winner between two equal totals. The
 * secondary sort is Glory, which is the `classic` framework's own tiebreak for
 * display purposes only; members tied on points remain tied on points, and a
 * caller that needs to say who won must look at the totals rather than at
 * position 0.
 */
export function byCampaignVictoryPoints<T extends { wins?: number; losses?: number; draws?: number; glory?: number }>(
  dataset: Dataset | null | undefined,
  members: readonly T[],
): T[] {
  return [...members].sort((a, b) => {
    const pa = campaignVictoryPoints(dataset, a) ?? 0;
    const pb = campaignVictoryPoints(dataset, b) ?? 0;
    if (pa !== pb) return pb - pa;
    return (b.glory ?? 0) - (a.glory ?? 0);
  });
}
