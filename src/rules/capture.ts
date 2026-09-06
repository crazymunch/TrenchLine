/**
 * Trauma results the app cannot resolve on its own.
 *
 * Roll 12 on the Trauma Table is Captured, and it is the one row whose outcome
 * is not decided by the table:
 *
 *   "Before continuing the Trauma Step, you and your opponent from the game can
 *    negotiate a ransom price in 👑 for the release of the model. If the ransom
 *    is not paid, the captured model is executed – remove them from your Warband
 *    Roster. If the ransom is paid, transfer the 👑 from your Strongbox to your
 *    opponent's, and treat this result as a Full Recovery."
 *
 * The wizard set `isDead` only where the row's name was exactly `Dead`, so a
 * captured model came out of the step alive, uninjured, and with the ransom
 * unpaid — the most forgiving of the two branches, chosen by nobody
 * (docs/RULES-COVERAGE-AUDIT.md RC-04).
 *
 * This does not automate the negotiation. Two players agree a price across a
 * table and the app has no business in it. What it does is refuse to record an
 * outcome the rule has not reached: the step will not commit until the player
 * says which branch happened, and the branches are read out of the row's own
 * text rather than assumed.
 */
import type { Dataset, TraumaRow } from '../types/catalogue';

export interface CaptureRule {
  roll: string;
  name: string;
  /** The row's own words, for a screen that has to justify blocking a step. */
  text: string;
  /** The unpaid branch removes the model from the roster. */
  removesIfUnpaid: boolean;
  /** The paid branch is treated as a Full Recovery. */
  paidIsFullRecovery: boolean;
  /** The ransom leaves the player's Strongbox. */
  paidFromStrongbox: boolean;
}

/**
 * Rows that defer their own outcome.
 *
 * Matched on what the row SAYS, not on the name "Captured" or the roll 12. A
 * Dispatch that adds a second such result, or renames this one, should not need
 * this file edited — and a build whose Trauma Table loses the sentence should
 * stop finding the rule rather than quietly stop enforcing it.
 */
const DEFERS = /before continuing the trauma step/i;

const asRule = (row: TraumaRow): CaptureRule => ({
  roll: row.roll,
  name: row.name,
  text: row.description,
  removesIfUnpaid: /not paid[^.]*remove them from your Warband Roster/i.test(row.description),
  paidIsFullRecovery: /if the ransom is paid[^.]*full recovery/i.test(row.description),
  paidFromStrongbox: /transfer the .*from your Strongbox/i.test(row.description),
});

export const captureRules = (dataset: Dataset | null | undefined): CaptureRule[] =>
  (dataset?.campaign?.trauma ?? [])
    .filter((row) => DEFERS.test(row.description ?? ''))
    .map(asRule);

/**
 * The deferring rule a recorded outcome landed on, or `null`.
 *
 * The wizard records an outcome as `D66: 12 - Captured: <the row's text>`, so
 * the row is found by its text appearing in what was recorded. Matching on the
 * name alone would also fire on a narrative note a player typed.
 */
export function captureRuleIn(
  dataset: Dataset | null | undefined,
  outcome: string | null | undefined,
): CaptureRule | null {
  if (!outcome) return null;
  return captureRules(dataset).find((r) => outcome.includes(r.text)) ?? null;
}

/** Which branch the players settled on. `null` until they say. */
export type CaptureResolution = 'ransomed' | 'executed' | null;

export interface CaptureOutcome {
  /** Whether the model leaves the roster. */
  removed: boolean;
  /** Whether the result becomes a Full Recovery — no injury recorded. */
  fullRecovery: boolean;
  /** What the player must move out of the Strongbox. */
  ransom: number;
  /** The line written into the chronicle. */
  text: string;
}

/**
 * What a settled capture does.
 *
 * Throws on an unread branch rather than picking the survivable one. If the
 * table no longer says that an unpaid ransom removes the model, this app does
 * not know what an unpaid ransom does, and the honest failure is loud: the
 * quiet version of this is the bug the finding describes.
 */
export function captureOutcome(
  rule: CaptureRule,
  resolution: Exclude<CaptureResolution, null>,
  ransom = 0,
): CaptureOutcome {
  if (resolution === 'executed') {
    if (!rule.removesIfUnpaid) {
      throw new Error(
        `The Trauma Table's "${rule.name}" no longer states what an unpaid ransom does.`);
    }
    return {
      removed: true,
      fullRecovery: false,
      ransom: 0,
      text: `${rule.name} (${rule.roll}): no ransom was paid — executed, and removed `
          + 'from the Warband Roster.',
    };
  }

  if (!rule.paidIsFullRecovery) {
    throw new Error(
      `The Trauma Table's "${rule.name}" no longer states what a paid ransom does.`);
  }
  if (!Number.isInteger(ransom) || ransom < 0) {
    throw new RangeError(`A ransom of ${ransom} is not a number of Ducats.`);
  }
  return {
    removed: false,
    fullRecovery: true,
    /* Zero is a legal price: the rule says "can negotiate", not "must pay". */
    ransom: rule.paidFromStrongbox ? ransom : 0,
    text: `${rule.name} (${rule.roll}): ransom paid`
        + (ransom > 0 ? ` — ${ransom} Ducats transferred to the opponent's Strongbox` : '')
        + ' — treated as a Full Recovery.',
  };
}
