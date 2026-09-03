/**
 * The Random Scenario Generator, from the Carcass Front book.
 *
 * Four charts and the rules they point at: a Battlefield Archetype, a
 * Deployment & Game Length, a Victory Condition and two Glorious Deeds charts,
 * plus the six deployment rules and six victory conditions the first two name.
 * It is a procedure — "carry out the following steps in order" — so it is read
 * as one, and the app can then run it rather than asking the player to.
 *
 * This replaces a generator the app already had, which rolled three invented
 * tables: six weather conditions, six "complications" and six "Secret
 * Secondary Agendas" with their own Glory and Ducat rewards. None of the
 * eighteen appears in any source, and they gave themselves away on vocabulary
 * — "Poison wounds", "battle rounds", "-1 Morale", "priority in Turn 1" —
 * none of which is a thing Trench Crusade has. This is the game's own.
 *
 * A note on the one inference made here, because it is the only one:
 *
 *   The Deployment & Game Length chart has a VERTICALLY MERGED Game Length
 *   column, and the extraction flattens merged cells. Rows 1-4 print one Game
 *   Length between them and rows 5-6 print another, so the text arrives with
 *   a third cell on rows 1 and 5 and none on rows 2, 3, 4 and 6. The merge is
 *   not guessed at: every row of a chart the player rolls on must have a game
 *   length, only two are printed, and each applies from the row it appears on
 *   until the next one does. `spreadMergedCell` does exactly that and nothing
 *   more — it never invents a value, it repeats one the book printed.
 */
import {
  BOOK_TXT, CHART_HEADER, CHART_ROW, chapterLines, toMarkdown, slugify, endsSentence,
} from './cf-prose.mjs';
import { joinWrapped } from './dehyphenate.mjs';

/** The running head of the chapter the generator is printed in. */
export const CHAPTER = 'Scenarios & Terrain';

/** Where the generator starts, and what ends it. */
const START = 'Random Scenario Generator';

const cells = (line) => line.split('\t').map((c) => c.trim());

/**
 * How long a cell must be before a line under it can be its continuation.
 *
 * A cell that wrapped did so because it filled the column, so it is close to a
 * full line. A cell holding a NAME — `Take and Hold`, `Long-Distance Battle`,
 * `No Man’s Land` — is short and complete, and the line under it is the next
 * thing in the book, not the rest of the name.
 *
 * Both readings are needed in the same chapter and neither punctuation nor
 * case separates them: `Take and Hold` and `Roll a D6 at the end of the` both
 * end without a full stop on a capitalised word, and the line under each
 * begins with a capital. Length does separate them, with room to spare — the
 * shortest cell in the book that continues is 27 characters and the longest
 * that does not is 20.
 *
 * The failure mode is visible either way: too low and a chart swallows the
 * prose under it, too high and a table cell is cut short. Both are caught by
 * the tests, which pin the two cells either side of the line.
 */
const WRAPPED_CELL_MIN = 24;

/**
 * Every roll a chart row answers: `1-3` -> [1, 2, 3].
 *
 * Stored expanded as well as printed, because the app rolls the die itself and
 * a lookup on the printed string would have to re-parse the range at the table.
 */
function rollsOf(printed) {
  const m = /^(\d+)\s*-\s*(\d+)$/.exec(printed);
  if (!m) return [Number(printed)];
  const out = [];
  for (let i = Number(m[1]); i <= Number(m[2]); i++) out.push(i);
  return out;
}

/**
 * Fill a vertically merged column down the rows it spans.
 *
 * The value printed on a row applies to that row and to every row after it
 * that has no value of its own, which is what a merged cell means. Rows before
 * the first printed value are left empty rather than filled from below: that
 * would be reading the table upside down.
 */
function spreadMergedCell(rows, index) {
  let current = '';
  for (const row of rows) {
    if (row.cells[index]) current = row.cells[index];
    else row.cells[index] = current;
  }
  return rows;
}

/**
 * Read a chart: its header row and every row under it.
 *
 * Three things make this more than splitting on tabs:
 *
 *   - **A cell wraps** onto tab-less lines below it.
 *   - **A merged cell ends mid-line.** `the sixth Turn.\t6 \tLong-Distance
 *     Battle` is the tail of the Game Length cell shared by rows 5 and 6,
 *     followed by the whole of row 6.
 *   - **A cell can only be continued if it was opened.** A row with fewer
 *     cells than the header ends in a merged column, so its last cell is a
 *     name in the middle of the table, not prose still being written. Without
 *     that rule the Deployment chart's last row — `6 \tLong-Distance Battle`,
 *     two cells of three, ending on no full stop — swallowed the six pages of
 *     deployment rules printed under the chart as part of its own name.
 *
 * @returns {{header: string[], rows: object[], next: number}} `next` is the
 *   first line after the chart.
 */
function readChart(lines, at) {
  const header = cells(lines[at]);
  const rows = [];
  let i = at + 1;

  for (; i < lines.length; i++) {
    const line = lines[i];

    if (CHART_ROW.test(line)) {
      rows.push({ cells: cells(line) });
      continue;
    }
    if (!rows.length) break;

    const last = rows[rows.length - 1];

    // The tail of a merged cell, followed by the row after it.
    if (line.includes('\t')) {
      const split = /^(.*?)\t(\d+(?:\s*-\s*\d+)?)\s*\t(.*)$/.exec(line);
      if (split && last.cells.length === header.length) {
        last.cells[last.cells.length - 1] =
          joinWrapped(last.cells[last.cells.length - 1], split[1]);
        rows.push({ cells: [split[2], ...split[3].split('\t').map((c) => c.trim())] });
        continue;
      }
      break;
    }

    /*
      A wrapped cell. Three things must hold: the row reaches the last column
      (a shorter row ends in a merged one, so there is no open cell to
      continue), the cell does not finish a sentence, and the cell is long
      enough to have been wrapped rather than short enough to be a name.
    */
    const openCell = last.cells[last.cells.length - 1];
    if (last.cells.length === header.length
        && openCell.length >= WRAPPED_CELL_MIN
        && !endsSentence(openCell)) {
      // The extraction hyphenates inside a cell too: `BLAST Key-\nword`,
      // `Retreat AC-\nTION`, `BLOOD MARK-\nERS`. See `dehyphenate.mjs`.
      last.cells[last.cells.length - 1] = joinWrapped(openCell, line);
      continue;
    }
    break;
  }

  // Pad every row to the header's width, then fill the merged columns down.
  for (const r of rows) while (r.cells.length < header.length) r.cells.push('');
  for (let c = 1; c < header.length; c++) spreadMergedCell(rows, c);

  return {
    header,
    rows: rows.map((r) => ({
      printed: r.cells[0],
      rolls: rollsOf(r.cells[0]),
      values: r.cells.slice(1),
    })),
    next: i,
  };
}

/**
 * The named rules a chart points at.
 *
 * Driven by the NAMES THE CHART GIVES rather than by looking for headings.
 * Two of the six deployments would be missed by a heading rule — the book
 * wraps "Chance Encounter Deployment" onto two lines, so "Deployment" arrives
 * as a heading of its own — and a heading rule that loose also picks up every
 * Title-Case line inside the rules themselves.
 */
function rulesFor(lines, names, from, to) {
  const at = new Map();
  for (let i = from; i < to; i++) {
    const line = lines[i];
    for (const name of names) {
      if (line === name && !at.has(name)) at.set(name, i);
    }
  }

  const missing = names.filter((n) => !at.has(n));
  if (missing.length) {
    throw new Error(
      `parse-cf-generator: the chart names ${missing.join(', ')} but the rules for ` +
      'them are not printed under it. A generator that rolls a result it cannot ' +
      'then explain is worse than none, because the players have to invent one.');
  }

  const ordered = [...at.entries()].sort((a, b) => a[1] - b[1]);
  return ordered.map(([name, i], k) => {
    const end = k + 1 < ordered.length ? ordered[k + 1][1] : to;
    let body = lines.slice(i + 1, end);
    /*
      "Chance Encounter" is printed with "Deployment" under it, where the other
      five carry the name alone. Dropped as the wrapped half of a heading, not
      as a line of rules — the rule itself starts on the sentence after it.
    */
    if (body[0] === 'Deployment') body = body.slice(1);
    return { name, slug: slugify(name), body: toMarkdown(body) };
  });
}

/**
 * The Random Scenario Generator.
 *
 * @returns {{
 *   intro: string, steps: string[],
 *   battlefield: {intro: string, header: string[], rows: object[]},
 *   deployment: {intro: string, header: string[], rows: object[], rules: object[]},
 *   victory: {intro: string, header: string[], rows: object[], rules: object[]},
 *   gloriousDeeds: {intro: string, charts: object[], always: object},
 * }}
 */
export function parseScenarioGenerator(src = BOOK_TXT) {
  const lines = chapterLines(CHAPTER, src);

  const start = lines.indexOf(START);
  if (start < 0) {
    throw new Error(
      `parse-cf-generator: '${START}' was not found in the ${CHAPTER} chapter. ` +
      'The app has a generator tab that would then have nothing published to ' +
      'put in it, which is how it came to be rolling invented tables.');
  }

  /*
    The generator runs to the end of the chapter — the next running head
    belongs to `Campaigns on the Carcass Front`, and `chapterLines` has already
    dropped every page that does not carry this one's.
  */
  const end = lines.length;
  const body = lines.slice(start + 1, end);

  const headingAt = (h) => body.findIndex((l) => l === h);
  const need = (h) => {
    const i = headingAt(h);
    if (i < 0) {
      throw new Error(
        `parse-cf-generator: the '${h}' section is missing. The generator is a ` +
        'four-step procedure and a player cannot run three of them.');
    }
    return i;
  };

  const stepsAt = need('RANDOM SCENARIO STEPS');
  const archetypeAt = need('BATTLEFIELD ARCHETYPE CHART');
  const deploymentAt = need('ROLL FOR DEPLOYMENT & GAME LENGTH');
  const victoryAt = need('VICTORY CONDITIONS CHART');
  const deedsAt = need('GLORIOUS DEEDS');

  const intro = toMarkdown(body.slice(0, stepsAt));

  /*
    The four numbered steps, kept as a list rather than run into prose: they
    are what the app's generator does, in order, and the order is the rule.
  */
  const stepLines = body.slice(stepsAt + 1, archetypeAt);
  const steps = stepLines
    .filter((l) => /^\d+\.\s/.test(l))
    .map((l) => l.replace(/^\d+\.\s*/, ''));
  if (steps.length !== 4) {
    throw new Error(
      `parse-cf-generator: found ${steps.length} generator steps, expected 4 ` +
      '(Battlefield Archetype, Deployment & Game Length, Victory Conditions, ' +
      'Glorious Deeds).');
  }

  /** Read the chart that follows a heading, and the prose between the two. */
  const chartUnder = (from, to) => {
    const rel = body.slice(from + 1, to).findIndex((l) => CHART_HEADER.test(l));
    if (rel < 0) {
      throw new Error(
        `parse-cf-generator: no chart under '${body[from]}'. Every step of the ` +
        'generator is a roll on one.');
    }
    const at = from + 1 + rel;
    const chart = readChart(body, at);
    return { intro: toMarkdown(body.slice(from + 1, at)), chart, after: chart.next };
  };

  const archetype = chartUnder(archetypeAt, deploymentAt);
  const deployment = chartUnder(deploymentAt, victoryAt);
  const victory = chartUnder(victoryAt, deedsAt);

  const deploymentNames = deployment.chart.rows.map((r) => r.values[0]);
  const victoryNames = victory.chart.rows.map((r) => r.values[0]);

  /*
    The Glorious Deeds charts. Two of six, one per player, plus one deed the
    book says is ALWAYS used in a campaign game — which is a rule about when
    the generator's output is complete, not a seventh row on either chart.
  */
  const deedsBody = body.slice(deedsAt + 1);
  const chartStarts = [];
  deedsBody.forEach((l, i) => { if (CHART_HEADER.test(l)) chartStarts.push(i); });
  if (chartStarts.length !== 2) {
    throw new Error(
      `parse-cf-generator: found ${chartStarts.length} Glorious Deeds charts, ` +
      'expected 2 — one for the older player and one for the younger.');
  }

  const deedCharts = chartStarts.map((i) => {
    const chart = readChart(deedsBody, i);
    return {
      /** `Glorious Deeds Chart 1 (Older Player)` — the book's own column head. */
      name: chart.header[1],
      rows: chart.rows.map((r) => {
        const [name, ...rest] = r.values[0].split(':');
        return {
          printed: r.printed,
          rolls: r.rolls,
          name: name.trim(),
          description: rest.join(':').trim(),
        };
      }),
    };
  });

  const alwaysFrom = readChart(deedsBody, chartStarts[1]).next;
  const alwaysLines = deedsBody.slice(alwaysFrom);
  const always = (() => {
    const i = alwaysLines.findIndex((l) => /^Victory or Death:/.test(l));
    if (i < 0) {
      throw new Error(
        'parse-cf-generator: the Victory or Death deed is missing. The book ' +
        'says it is ALWAYS used for a Random Scenario generated for a Campaign, ' +
        'so a generated campaign scenario is short a deed without it.');
    }
    const text = toMarkdown(alwaysLines.slice(i));
    const [name, ...rest] = text.split(':');
    return {
      name: name.trim(),
      description: rest.join(':').trim(),
      /** The book's own condition on it, kept verbatim above the deed. */
      when: toMarkdown(alwaysLines.slice(0, i)),
    };
  })();

  return {
    intro,
    steps,
    battlefield: {
      intro: archetype.intro,
      header: archetype.chart.header,
      rows: archetype.chart.rows,
      /*
        Empty, and that is the book's answer rather than a gap: the chart's own
        introduction says "the rules for Battlefield Archetypes can be found in
        the Trench Crusade Rulebook". Reprinting them here would be
        transcription of a source this parser is not reading.
      */
      rules: [],
    },
    deployment: {
      intro: deployment.intro,
      header: deployment.chart.header,
      rows: deployment.chart.rows,
      rules: rulesFor(body, deploymentNames, deployment.after, victoryAt),
    },
    victory: {
      intro: victory.intro,
      header: victory.chart.header,
      rows: victory.chart.rows,
      rules: rulesFor(body, victoryNames, victory.after, deedsAt),
    },
    gloriousDeeds: {
      intro: toMarkdown(deedsBody.slice(0, chartStarts[0])),
      charts: deedCharts,
      always,
    },
  };
}
