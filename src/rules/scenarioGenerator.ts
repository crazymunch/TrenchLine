/**
 * Running the Carcass Front Random Scenario Generator.
 *
 * The book states it as a procedure and the order is the rule:
 *
 *   1. Roll on the Battlefield Archetype chart.
 *   2. Roll on the Deployment & Game Length chart.
 *   3. Roll on the Victory Conditions chart.
 *   4. Roll on the Glorious Deeds charts.
 *
 * Three things in it are easy to get wrong, and each is a rule rather than a
 * convention:
 *
 *   - **The Glorious Deeds are rolled 2D6 per player, one die after the
 *     other, and a double is re-rolled.** "If a player rolls the same result
 *     on both dice, roll the second dice again until it shows a different
 *     result to the first dice." Rolling 2D6 and taking the total, or allowing
 *     a double, gives a player three deeds instead of four.
 *   - **Which chart a player uses is decided by age.** "The older of the two
 *     players uses Chart 1 and the younger uses Chart 2." The app cannot know
 *     who is older, so it says whose chart is whose rather than deciding —
 *     the same treatment the Weather Event's "fewest Campaign Victory Points"
 *     gets.
 *   - **Every deed is live for both players.** "Note that each of the Glorious
 *     Deeds can be completed by either player, not just the player who rolled
 *     the result." Four deeds, shared, not two each.
 *
 * And one that is a rule about the generator's own output: `Victory or Death`
 * is ALWAYS added for a scenario generated for a campaign, and never for a
 * one-off game.
 */
import type {
  ScenarioGenerator, ChartRow, GeneratorRule, GeneratorDeed,
} from '@/types/catalogue';

export type Rng = () => number;

const d6 = (rng: Rng) => Math.floor(rng() * 6) + 1;

/** One roll on a chart, with the row it landed on and the rule it names. */
export interface ChartResult {
  roll: number;
  row: ChartRow;
  /** The rule the row's first value names, where the chart has rules. */
  rule?: GeneratorRule;
}

export interface DeedResult extends GeneratorDeed {
  /** Which chart it came from, so the sheet can say whose roll it was. */
  chart: string;
}

export interface GeneratedScenario {
  battlefield: ChartResult;
  deployment: ChartResult;
  /** The Game Length is a second column of the deployment row, not a chart. */
  gameLength: string;
  victory: ChartResult;
  /** Four deeds: two per chart, and every one live for both players. */
  deeds: DeedResult[];
  /** Present only for a campaign game — the book says so in as many words. */
  always?: { name: string; description: string };
  /** Whether it was generated for a campaign. Decides `always`. */
  campaign: boolean;
}

/**
 * The row a roll lands on.
 *
 * Throws rather than falling through to a neighbour: a D6 chart that cannot
 * answer a D6 is a broken dataset, and quietly picking the row above is how a
 * generator starts handing players results the book does not have.
 */
function rowFor(rows: ChartRow[], roll: number, chart: string): ChartRow {
  const row = rows.find((r) => r.rolls.includes(roll));
  if (!row) throw new Error(`scenarioGenerator: the ${chart} chart has no row for ${roll}`);
  return row;
}

function rollChart(
  chart: { rows: ChartRow[]; rules: GeneratorRule[] },
  name: string,
  rng: Rng,
): ChartResult {
  const roll = d6(rng);
  const row = rowFor(chart.rows, roll, name);
  const rule = chart.rules.find((r) => r.name === row.values[0]);
  return { roll, row, rule };
}

/**
 * Two different rolls on one D6, in the order the book rolls them.
 *
 * "Each player rolls two D6, one after the other. If a player rolls the same
 * result on both dice, roll the second dice again until it shows a different
 * result to the first dice." The re-roll is on the SECOND die only, which is
 * why this is not simply "pick two distinct numbers": with a fair die the
 * distribution is the same, but the rule is what a player at the table will
 * follow, and a generator that quietly does something else is a generator they
 * cannot check.
 */
export function rollTwoDistinct(rng: Rng): [number, number] {
  const first = d6(rng);
  let second = d6(rng);
  // Bounded so a broken RNG cannot hang the app; 60 rolls of a fair die
  // repeating the same face has probability under 10^-46.
  for (let i = 0; i < 60 && second === first; i++) second = d6(rng);
  if (second === first) {
    throw new Error('scenarioGenerator: could not roll a second die different from the first');
  }
  return [first, second];
}

/**
 * Generate a scenario.
 *
 * @param campaign whether this is for a campaign game, which decides whether
 *   the `Victory or Death` deed is added. The book adds it only there.
 */
export function generateScenario(
  generator: ScenarioGenerator,
  campaign: boolean,
  rng: Rng = Math.random,
): GeneratedScenario {
  const battlefield = rollChart(
    { rows: generator.battlefield.rows, rules: generator.battlefield.rules },
    'Battlefield Archetype', rng);

  const deployment = rollChart(
    { rows: generator.deployment.rows, rules: generator.deployment.rules },
    'Deployment & Game Length', rng);

  const victory = rollChart(
    { rows: generator.victory.rows, rules: generator.victory.rules },
    'Victory Conditions', rng);

  /*
    Two rolls per chart, four deeds in all. Rolled per CHART rather than per
    player because that is what the charts are: the older player rolls on
    Chart 1 and the younger on Chart 2, and every deed either of them rolls is
    available to both.
  */
  const deeds: DeedResult[] = [];
  for (const chart of generator.gloriousDeeds.charts) {
    for (const roll of rollTwoDistinct(rng)) {
      const row = chart.rows.find((r) => r.rolls.includes(roll));
      if (!row) {
        throw new Error(`scenarioGenerator: ${chart.name} has no row for ${roll}`);
      }
      deeds.push({ ...row, chart: chart.name });
    }
  }

  return {
    battlefield,
    deployment,
    /*
      The second column of the deployment row. The chart merges it — rows 1-4
      share one Game Length and rows 5-6 share another — and the pipeline has
      already spread the merged cell down the rows it covers, so every row
      carries the one the book prints for it.
    */
    gameLength: deployment.row.values[1] ?? '',
    victory,
    deeds,
    always: campaign ? generator.gloriousDeeds.always : undefined,
    campaign,
  };
}

/**
 * The generated scenario as plain text, for reading out or pasting into a
 * chat with an opponent who is not using the app.
 */
export function asText(s: GeneratedScenario): string {
  const lines = [
    `Battlefield: ${s.battlefield.row.values[0]}  (D6 ${s.battlefield.roll})`,
    `Deployment:  ${s.deployment.row.values[0]}  (D6 ${s.deployment.roll})`,
    `Game length: ${s.gameLength}`,
    `Victory:     ${s.victory.row.values[0]}  (D6 ${s.victory.roll})`,
    '',
    'Glorious Deeds (either player can complete any of them):',
    ...s.deeds.map((d) => `  ${d.name}: ${d.description}`),
  ];
  if (s.always) lines.push(`  ${s.always.name}: ${s.always.description}`);
  return lines.join('\n');
}
