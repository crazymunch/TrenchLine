/**
 * The Trauma Step: who rolls what, and what it does to a roster.
 *
 * The app used to offer every Out of Action model a D66 roll on the Trauma
 * Table. The rulebook says otherwise, and the difference decides who lives:
 *
 *   Troops   — "any models in your Warband that do not have the ELITE
 *              Keyword" — take a single Survival Roll on a D6. On 1-2 they are
 *              removed from the roster. On 3+ they fight on.
 *
 *   ELITE    — roll D66 on the Trauma Table, take a Battle Scar, and are
 *              retired at their third.
 *
 * A Troop sent to the Trauma Table draws from 36 results of which one is Dead.
 * Its real odds of dying are one in three. The wizard was handing out survival,
 * quietly, every game, to the models least likely to earn it — and because the
 * table itself was derived and correct, nothing in the data looked wrong.
 *
 * Found by Codex's rules-coverage audit (docs/RULES-COVERAGE-AUDIT.md, RC-01
 * and RC-05) — the class of failure that audit was commissioned to find, and
 * which no value-oriented check can reach: there was no dataset field to
 * compare against the book, because the procedure had never been parsed.
 *
 * Every number here comes from `dataset.campaign.traumaProcedure`, read out of
 * the book by `scripts/lib/parse-campaign.mjs`. Nothing in this file states a
 * die, a threshold or a scar count of its own.
 */
import type { Dataset, TraumaProcedure, TraumaRow } from '../types/catalogue';
import type { ActiveUnit } from '../types/warband';
import type { CasualtyRecord } from '../types/campaign';

/**
 * The procedure, or `null` on a dataset built before it was parsed.
 *
 * `null` rather than a default, because the caller must be able to tell "this
 * ruleset does not state the procedure" from "everyone rolls D66". Defaulting
 * is what the wizard already did implicitly, and it is the bug.
 */
export const traumaProcedure = (dataset: Dataset | null | undefined): TraumaProcedure | null =>
  dataset?.campaign?.traumaProcedure ?? null;

/**
 * Whether a rostered model counts as ELITE, and how confidently we know.
 *
 * Three-valued on purpose. A model recruited before `profileSnapshot.elite`
 * existed carries no answer, and the honest options are then a weak inference
 * or an admission. Both are offered, and the caller is told which it got, so
 * the wizard can ask the player rather than silently pick a die.
 *
 * `basis` in strength order:
 *
 *   `snapshot`   the catalogue's own answer, recorded when the model was
 *                recruited. Authoritative.
 *   `promotion`  the player promoted this model to Elite in the app. Also
 *                authoritative — a promoted model *is* ELITE from then on.
 *   `category`   inferred from the roster category. WEAK, and wrong for at
 *                least one real entry: the Witchburner is `Mercenary/Elite`
 *                in the catalogue and categorises as `Mercenary`, so this
 *                basis reports a genuine ELITE model as a Troop.
 */
export type EliteBasis = 'snapshot' | 'promotion' | 'category';

export interface EliteVerdict {
  /** `null` where the roster does not record enough to say. */
  elite: boolean | null;
  basis: EliteBasis | 'unknown';
  /** True where a player should confirm before the roll is made. */
  needsConfirmation: boolean;
}

/**
 * Categories that imply ELITE when nothing better is recorded.
 *
 * A Leader is ELITE — every faction's leader entry is filed under the Elite
 * role. `Mercenary` is deliberately absent: some Mercenaries are ELITE and
 * some are not, and the category cannot tell them apart, so a Mercenary with
 * no recorded answer is the case that must ask rather than guess.
 */
const ELITE_CATEGORIES = new Set(['Elite', 'Leader']);

export function eliteVerdict(unit: ActiveUnit): EliteVerdict {
  const recorded = unit.profileSnapshot?.elite;
  if (typeof recorded === 'boolean') {
    return { elite: recorded, basis: 'snapshot', needsConfirmation: false };
  }

  /*
    A promotion is a positive answer only. `isElite: false` is the field's
    default for every model ever recruited, promoted or not, so it says nothing
    about a model the catalogue already made ELITE.
  */
  if (unit.isElite) return { elite: true, basis: 'promotion', needsConfirmation: false };

  const category = unit.profileSnapshot?.category;
  if (category && ELITE_CATEGORIES.has(category)) {
    return { elite: true, basis: 'category', needsConfirmation: true };
  }
  if (category === 'Trooper') {
    return { elite: false, basis: 'category', needsConfirmation: true };
  }

  /* Mercenary, or a category from an older build that is none of the four. */
  return { elite: null, basis: 'unknown', needsConfirmation: true };
}

/** Which procedure a casualty takes. `null` where we cannot tell. */
export type CasualtyRoute = 'trauma' | 'survival' | null;

export const casualtyRoute = (unit: ActiveUnit): CasualtyRoute => {
  const { elite } = eliteVerdict(unit);
  return elite === null ? null : elite ? 'trauma' : 'survival';
};

/**
 * Resolve a Troop's Survival Roll.
 *
 * Throws on a roll outside the die rather than clamping it. A 7 on a D6 is a
 * typed digit or a bug, and quietly reading it as "survives" is the same shape
 * of failure as the one this module exists to fix.
 */
export function survivalOutcome(
  procedure: TraumaProcedure,
  roll: number,
): { dead: boolean; text: string } {
  const faces = Number(procedure.troops.die.replace(/^D/i, ''));
  if (!Number.isInteger(roll) || roll < 1 || roll > faces) {
    throw new RangeError(
      `A Survival Roll of ${roll} is not a result on a ${procedure.troops.die}.`);
  }
  const dead = roll <= procedure.troops.deadUpTo;
  return {
    dead,
    text: dead
      ? `${procedure.troops.die}: ${roll} — dead or very badly wounded. `
        + 'Remove them from the Warband Roster.'
      : `${procedure.troops.die}: ${roll} — survived the battle and can fight on as normal.`,
  };
}

/** Roll the Troop's die. Separated so the resolution above stays testable. */
export const rollSurvival = (procedure: TraumaProcedure): number =>
  Math.floor(Math.random() * Number(procedure.troops.die.replace(/^D/i, ''))) + 1;

/* ------------------------------------------------------------ battle scars */

/**
 * How many Battle Scars a model carries.
 *
 * Counted from `scars`, not from `injuries`. The two are separate arrays and
 * they mean different things: several Trauma results award an injury and no
 * scar, so counting injuries retires models early. The audit warns about this
 * specifically (RC-05) — "do not infer retirement merely from array length".
 */
export const scarCount = (unit: ActiveUnit): number => unit.scars?.length ?? 0;

export interface UnfitVerdict {
  unfit: boolean;
  scars: number;
  /** The count at which the book retires a model. From the dataset. */
  at: number;
  /** The rule's own words, for a screen that has to justify removing a model. */
  text: string;
}

/**
 * Whether a model has reached Unfit for Duty.
 *
 * Reports; never removes. "Remove the model from your Warband Roster" is
 * unambiguous in the book, but a roster is the player's record of their own
 * campaign and deleting a model out from under them — on a scar count the app
 * inferred — is not a decision to take without being asked. The wizard shows
 * this and the player confirms.
 */
export function unfitForDuty(
  procedure: TraumaProcedure,
  unit: ActiveUnit,
  scarsGainedNow = 0,
): UnfitVerdict {
  const scars = scarCount(unit) + scarsGainedNow;
  return {
    unfit: scars >= procedure.battleScars.unfitAt,
    scars,
    at: procedure.battleScars.unfitAt,
    text: procedure.battleScars.unfitText,
  };
}

/* ----------------------------------------------------------------- injuries */

/**
 * Whether a model already carries this injury, so the D66 must be rerolled.
 *
 * "Unless stated otherwise a model can only suffer each type of injury once.
 * If a model receives the same injury a second time, make the D66 roll for the
 * model again until you roll a result on the Trauma Table that can be used."
 *
 * The app has never had this: it appended the same injury string twice. Matched
 * on the injury's name rather than the whole recorded line, because the line
 * carries the roll that produced it and two different rolls can land on one
 * ranged row (41-63 is a single result).
 *
 * The "unless stated otherwise" exceptions are real — some rows say they may
 * recur — but they are stated per row, so this answers the general case and
 * the caller decides. It never blocks: a reroll is offered, not forced.
 */
export const alreadySuffered = (unit: ActiveUnit, injuryName: string): boolean => {
  const want = injuryName.trim().toLowerCase();
  if (!want) return false;
  const has = (s: string) => s.toLowerCase().includes(want);
  return (unit.injuries ?? []).some(has)
    || (unit.scars ?? []).some((s) => has(s.name ?? ''));
};

/**
 * What a Trauma result actually writes onto the model.
 *
 * Two rules, and the app was applying neither.
 *
 * **The Battle Scar.** Page 101: *"Unless stated otherwise, each time an ELITE
 * model is taken Out of Action, they receive a Battle Scar."* Nothing in the
 * store ever wrote `unit.scars`, so `unfitForDuty` — which the wizard already
 * computes and displays — counted only scars a player had added by hand in the
 * Advancement modal. Retirement at the third scar could not be reached by
 * playing the game.
 *
 * **The rows that write nothing.** Five results end *"It does not receive an
 * Injury or a Battle Scar"*: 36 Robbed, 41-63 Full Recovery, 64 Hardened,
 * 65 Bitter Lessons and 66 Prominent Scar. Every one of them was appended to
 * `unit.injuries` anyway. Because 41-63 is fifteen of the thirty-six results,
 * a model that had ever recovered fully then hit the duplicate-injury prompt —
 * *"This warrior already carries that injury… roll again"* — on nearly half of
 * all later rolls, and the Codex and the print sheet listed "Full Recovery"
 * among its injuries.
 *
 * The distinction is read out of the row's own text, not from a list of roll
 * numbers, so a Dispatch that adds or reworded a disclaiming row needs no
 * change here.
 */
export interface TraumaWrite {
  /** The row the outcome landed on, where one could be identified. */
  row: TraumaRow | null;
  /** Append the outcome to `unit.injuries`. */
  injury: boolean;
  /** The Battle Scar to add, or `null`. ELITE only — Troops take none. */
  scar: { name: string; roll?: string } | null;
}

/**
 * The rows that opt out.
 *
 * Matched on the sentence rather than the roll, because the sentence is the
 * rule. `an Injury` and `a Battle Scar` are the book's capitalisation; the
 * match is case-insensitive so a reworded row still reads.
 */
const RECORDS_NOTHING = /does\s+not\s+receive\s+an?\s+Injury\s+or\s+a\s+Battle\s+Scar/i;

/** The Trauma row a recorded outcome landed on, found by its text. */
export const traumaRowIn = (
  dataset: Dataset | null | undefined,
  outcome: string | null | undefined,
): TraumaRow | null => {
  if (!outcome) return null;
  /* The wizard records `D66: 31 - Leg Wound: <the row's text>`, so the row's
     own description appears verbatim. Matching on the name alone would also
     fire on a narrative note a player typed. */
  return (dataset?.campaign?.trauma ?? [])
    .find((r) => r.description && outcome.includes(r.description)) ?? null;
};

/**
 * What to write for one casualty.
 *
 * `elite` decides the scar and nothing else: the book gives Battle Scars to
 * ELITE models taken Out of Action, and a Troop that survives its D6 takes
 * none. `alreadyRemoved` covers Dead and an unransomed Capture — there is no
 * roster entry left to mark.
 */
export function traumaWriteFor(
  dataset: Dataset | null | undefined,
  outcome: string | null | undefined,
  opts: { elite: boolean; alreadyRemoved?: boolean },
): TraumaWrite {
  const row = traumaRowIn(dataset, outcome);

  if (opts.alreadyRemoved) return { row, injury: false, scar: null };

  /*
    A row this build cannot identify writes the injury and no scar. Not
    nothing: the player rolled something and it is still their record of it,
    and silently dropping it would be the fallback rule 2 forbids. Not a scar
    either, because a scar retires a model at three and that is not a decision
    to make on a row we failed to read.
  */
  if (!row) return { row: null, injury: true, scar: null };

  if (RECORDS_NOTHING.test(row.description)) return { row, injury: false, scar: null };

  return {
    row,
    injury: true,
    scar: opts.elite ? { name: row.name, roll: row.roll } : null,
  };
}

/* ------------------------------------------------------------- experience */

/**
 * Whether a model earns its Experience Point for the game just played.
 *
 * "Each ELITE model that took part in a game and survived will gain 1
 * Experience Point." Three conditions, and the app applied none of them: it ran
 * `u.xp + 1` over every unit on the roster, including Troops, models that sat
 * the game out, and models it had just recorded as dead.
 *
 * The fourth condition is the one that stung most. Head Wound (Trauma 22) says
 * "This model can no longer gain Experience Points", and the app *displayed*
 * that sentence on the same submission that added the point.
 *
 * `blocked` names the rule that stopped it, so a screen can say why a model got
 * nothing rather than leaving the player to wonder.
 */
export interface XpVerdict {
  earns: boolean;
  blocked?: 'not-elite' | 'did-not-take-part' | 'died' | 'head-wound' | 'elite-unknown'
  /* LIMITED POTENTIAL, and already at the cap. Decided by `experienceCap` in
     rules/promotions.ts, because the cap is read from the model's keyword and
     that needs the dataset, which this function does not take. */
  | 'at-experience-cap';
}

/**
 * The injury that forbids Experience, matched from the derived Trauma Table
 * rather than by name.
 *
 * Passed in rather than hardcoded: the row's text is the authority for whether
 * it bars XP, and a build whose table changes should change this with it.
 */
export const barsExperience = (injuryText: string): boolean =>
  /can no longer gain Experience Points/i.test(injuryText);

export function earnsExperience(
  unit: ActiveUnit,
  opts: { tookPart: boolean; died: boolean; xpBarringInjuries: string[] },
): XpVerdict {
  const { elite } = eliteVerdict(unit);
  if (elite === null) return { earns: false, blocked: 'elite-unknown' };
  if (!elite) return { earns: false, blocked: 'not-elite' };
  if (!opts.tookPart) return { earns: false, blocked: 'did-not-take-part' };
  if (opts.died || unit.isDead) return { earns: false, blocked: 'died' };

  const carried = [
    ...(unit.injuries ?? []),
    ...(unit.scars ?? []).map((s) => s.name ?? ''),
  ].map((s) => s.toLowerCase());
  const barred = opts.xpBarringInjuries.some((name) =>
    carried.some((c) => c.includes(name.toLowerCase())));

  return barred ? { earns: false, blocked: 'head-wound' } : { earns: true };
}

/**
 * The Trauma Table rows whose own text forbids Experience.
 *
 * Derived, not a list of names: Head Wound is the one the rulebook prints, but
 * the rule is "the row says so", and a Dispatch that adds another should not
 * need this file edited.
 */
export const xpBarringInjuries = (dataset: Dataset | null | undefined): string[] =>
  (dataset?.campaign?.trauma ?? [])
    .filter((row) => barsExperience(row.description))
    .map((row) => row.name)
    .filter(Boolean);

/**
 * What a casualty's record says about the die and the row (Order 44 item 4b).
 *
 * Built here rather than inline in the post-battle wizard, because the wizard is
 * a component and the repo has no DOM test environment — round 2's version of
 * this was six lines of JSX, and the only thing a test could reach was a
 * hand-built `CasualtyRecord`, which proves the STORE reads it and says nothing
 * about whether the wizard writes it. Reverting the fix left every test green.
 *
 * The rule it encodes, from round 2 item 3:
 *
 * - **`roll` is the D66 the player threw.** Round 1 put the matched ROW's range
 *   here — `41-63`, which is reached by more than one total — so a sheet read
 *   "rolled 41-63" for a die that came up 52, while the wizard was holding the 52
 *   in its own state all along.
 * - **`row` is the line the result landed on**, which is what the app can say
 *   when nobody threw anything: a result picked out of a dropdown reads
 *   "row 41-63" and never as a throw.
 *
 * Absent means not recorded, either way. A result with no throw behind it carries
 * no `roll`, and a row this build could not identify carries no `row`.
 */
export function traumaRecords(
  write: Pick<TraumaWrite, 'injury' | 'scar' | 'row'>,
  /** The D66 the player threw, where they threw one. */
  thrown?: number,
): NonNullable<CasualtyRecord['records']> {
  return {
    injury: write.injury,
    ...(write.scar ? { scar: write.scar } : {}),
    ...(thrown !== undefined ? { roll: String(thrown) } : {}),
    ...(write.row?.roll ? { row: String(write.row.roll) } : {}),
  };
}
