/**
 * Which scenario a campaign game is played on (RR-14, FD-10).
 *
 * Page 96:
 *
 * > To determine which scenario you will use for a campaign game, count up how
 * > many games you have played in the campaign thus far, and then roll on the
 * > appropriate Campaign Scenario table below to pick the scenario that will be
 * > used. If one player has played more games than the other, then the greater
 * > number is used to decide which table to roll on.
 *
 * Three D6 tables banded by game number, and a twelfth game that is not rolled
 * for at all — *"Final Battle (Battle 12) ▶ The Great War"*.
 *
 * The app's Mission Generator drew from the whole scenario list at every game,
 * which is not the rule and is not close to it: a first game could land on From
 * Below, and the Great War — the scenario a season is built towards — could
 * turn up in game two.
 *
 * ## The sixth result is a result
 *
 * Every table's 6 reads *"The player who has played fewer games chooses one of
 * the scenarios listed above. If tied, roll-off and the winner chooses."* It is
 * not a blank and it is not a reroll. Rerolling it would take, silently, the
 * compensation the book gives to the player who is behind — so the roll returns
 * it as itself, with its own sentence, and the players settle it.
 *
 * ## Past game 12
 *
 * The book stops at the Final Battle. A campaign that keeps going has no
 * published table, and this says so (`band: null`) rather than holding at the
 * Endgame or looping — the same answer `campaignLimits` gives past the
 * Threshold Table's last row, and for the same reason.
 */
import type { Dataset, CampaignScenarioTables } from '@/types/catalogue';

export type Rng = () => number;

const d6 = (rng: Rng) => Math.floor(rng() * 6) + 1;

export interface CampaignScenarioRoll {
  /** The game this was rolled for. */
  game: number;
  /** The table's own heading, or `null` where the ruleset has no band for it. */
  band: string | null;
  /** The D6 rolled, or `null` where the game is not decided by a roll. */
  roll: number | null;
  /** The scenario's name, or `null` where the result is the players' choice. */
  scenario: string | null;
  /**
   * True where the result hands the choice to the player who has played fewer
   * games. `scenario` is null and `text` carries the sentence.
   */
  playersChoose: boolean;
  /** The result's own words, where the book gives words rather than a name. */
  text: string;
  /** The scenarios that result permits, for a chooser that has to list them. */
  choices: string[];
}

/** The table a game falls in, or `undefined` past the last band. */
export function scenarioBandFor(
  tables: CampaignScenarioTables | undefined,
  game: number,
): CampaignScenarioTables['bands'][number] | undefined {
  return (tables?.bands ?? []).find((b) => game >= b.from && game <= b.to);
}

/**
 * Roll for a campaign game.
 *
 * `game` is the games-played count the book indexes on, which
 * `campaignGameOf(warband, campaign)` already is.
 */
export function rollCampaignScenario(
  dataset: Dataset | null | undefined,
  game: number,
  rng: Rng = Math.random,
): CampaignScenarioRoll {
  const tables = dataset?.campaign?.scenarioTables;
  const none: CampaignScenarioRoll = {
    game, band: null, roll: null, scenario: null, playersChoose: false,
    text: '', choices: [],
  };
  if (!tables) return none;

  /* The Final Battle is named, not rolled. */
  if (game === tables.final.game) {
    return {
      game,
      band: tables.final.name,
      roll: null,
      scenario: tables.final.scenario,
      playersChoose: false,
      text: '',
      choices: [tables.final.scenario],
    };
  }

  const band = scenarioBandFor(tables, game);
  if (!band) return none;

  const choices = band.rows.map((r) => r.scenario).filter((s): s is string => !!s);
  const roll = d6(rng);
  const row = band.rows.find((r) => r.roll === roll);
  if (!row) return { ...none, band: band.name, roll, choices };

  return {
    game,
    band: band.name,
    roll,
    scenario: row.scenario ?? null,
    playersChoose: !!row.choose,
    text: row.text ?? '',
    choices,
  };
}
