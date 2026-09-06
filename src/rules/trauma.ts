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
import type { Dataset, TraumaProcedure } from '../types/catalogue';
import type { ActiveUnit } from '../types/warband';

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
  blocked?: 'not-elite' | 'did-not-take-part' | 'died' | 'head-wound' | 'elite-unknown';
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
