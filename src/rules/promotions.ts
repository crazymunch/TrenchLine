/**
 * Who may be Promoted, and how much Experience a model may hold.
 *
 * The Promotions & Experience Step has two bounds that apply before any dice
 * are picked up, and the app enforced neither.
 *
 * Promotion was `handleToggleElite` — a switch on the unit card that set
 * `isElite` and asked nothing. So a Warband could promote an Amalgam, which
 * the book forbids outright, and could promote its whole roster, when the book
 * stops the step at six ELITE models. Experience was granted with no cap, so a
 * LIMITED POTENTIAL model passed the 7 the book allows it and went on earning
 * Advancement Rolls it is not entitled to (RR-05).
 *
 * The book, pages 105 to 111:
 *
 * > **Maximum Elites.** Ignore the Promotion step completely if there are
 * > already 6 or more models with the ELITE Keyword in your Warband at the
 * > start of the Promotions & Experience Phase, and stop rolling for
 * > Promotions when a successful Promotion Roll means that you have 6 models
 * > with the ELITE Keyword in your Warband.
 *
 * > **Models That Cannot Be Promoted.** … The following models cannot be
 * > Promoted to ELITE status. *(a faction-by-faction table)*
 *
 * > **Limited Potential.** … The following models cannot have more than 7
 * > Experience Points. *(a second table, the same shape)*
 *
 * Both tables and both numbers are derived — see `parsePromotions`.
 *
 * The dice half of the step (the Promotion Dice Pool, the assignment rule, the
 * five-miss counter) is FD-06b, with the screen that rolls it.
 */
import type { Dataset } from '../types/catalogue';
import type { ActiveUnit, Warband } from '../types/warband';
import { eliteVerdict } from './trauma';

/** The derived rules, or `null` for a ruleset built before they existed. */
export const promotionRules = (dataset: Dataset | null | undefined) =>
  dataset?.campaign?.promotions ?? null;

/**
 * How many models in this Warband have the ELITE Keyword.
 *
 * Counts a dead model out: the book's bound is on the Warband, and a model
 * removed from the roster is not in it. Counts an unknown as ELITE, because
 * the bound is a ceiling — miscounting downwards would let a seventh model be
 * promoted, and miscounting upwards only declines a promotion the player can
 * still argue for.
 */
export function eliteCount(warband: Pick<Warband, 'units'> | null | undefined): number {
  return (warband?.units ?? []).filter((u) => !u.isDead && eliteVerdict(u).elite !== false).length;
}

/** Why a model may not be Promoted. `null` means it may. */
export type PromotionBlock =
  /** Already has the ELITE Keyword — there is nothing to promote it to. */
  | 'already-elite'
  /** The Warband is at the book's ceiling of ELITE models. */
  | 'maximum-elites'
  /** Named in the rulebook's Models That Cannot Be Promoted table. */
  | 'cannot-be-promoted'
  /** The ruleset carries no promotion rules, so nothing can be checked. */
  | 'no-rules';

export interface PromotionEligibility {
  eligible: boolean;
  reason: PromotionBlock | null;
  /** A sentence for the screen, naming the rule rather than restating the flag. */
  detail: string;
}

/**
 * Whether this model may be Promoted right now.
 *
 * The cannot-be-promoted check is by unit id, resolved at build time against
 * the rulebook's own table. Matching by name at runtime is what the parser
 * refuses to do for good reason: the book's `Fly Thralls` is the catalogue's
 * `Winged Thrall`, and a name comparison would let it through.
 *
 * `no-rules` is not eligibility. A ruleset that cannot say who may be promoted
 * must not be read as saying everyone may — that is the switch this replaces.
 */
export function canBePromoted(
  dataset: Dataset | null | undefined,
  unit: ActiveUnit,
  warband: Pick<Warband, 'units'> | null | undefined,
): PromotionEligibility {
  const rules = promotionRules(dataset);
  if (!rules) {
    return {
      eligible: false,
      reason: 'no-rules',
      detail: 'This ruleset does not carry the Promotions tables, so whether this model '
        + 'may be Promoted cannot be checked.',
    };
  }

  if (eliteVerdict(unit).elite === true) {
    return {
      eligible: false,
      reason: 'already-elite',
      detail: 'This model already has the ELITE Keyword.',
    };
  }

  const named = (rules.cannotPromote ?? [])
    .flatMap((f) => f.models.map((m) => ({ ...m, faction: f.faction })))
    .find((m) => m.unitId === unit.baseProfileId);
  if (named) {
    return {
      eligible: false,
      reason: 'cannot-be-promoted',
      detail: `The rulebook lists ${named.name} (${named.faction}) under Models That `
        + 'Cannot Be Promoted.',
    };
  }

  const count = eliteCount(warband);
  if (count >= rules.maxElites) {
    return {
      eligible: false,
      reason: 'maximum-elites',
      detail: `This Warband already has ${count} models with the ELITE Keyword, and the `
        + `Promotion step is skipped at ${rules.maxElites}.`,
    };
  }

  return { eligible: true, reason: null, detail: '' };
}

/**
 * The most Experience this model may hold, or `null` for no cap.
 *
 * Read from the model's LIMITED POTENTIAL keyword rather than from the
 * rulebook's p.111 table, and the difference is not academic. The table names
 * seven models; the catalogue gives all seven the keyword; and then the Trench
 * Dispatch replaces the Brazen Bull's whole Warband Entry with a keyword row
 * that has no LIMITED POTENTIAL in it. Precedence is Dispatch over rulebook
 * over catalogue, so the Brazen Bull's Experience is no longer capped, and
 * only the keyword carries that.
 *
 * The table still ships, as `promotions.limitedPotential`, and the build
 * prints any model the two disagree about — see `promotionKeywordDrift`. It is
 * provenance and a cross-check, not the operative rule.
 *
 * `null` for a ruleset with no promotion rules: a cap that cannot be read is
 * not a cap of zero, and not the absence of one either. The caller decides,
 * and `cappedExperience` below declines to lower a number it cannot justify.
 */
export function experienceCap(
  dataset: Dataset | null | undefined,
  unit: ActiveUnit,
): number | null {
  const rules = promotionRules(dataset);
  if (!rules?.limitedPotential) return null;

  /*
    From the dataset entry, not from `profileSnapshot`. The snapshot is taken
    when the model is recruited, and the Brazen Bull is exactly the model whose
    keywords a layer changes afterwards — a Bull recruited before `dispatch-01`
    would keep a cap the Dispatch had already lifted, and one recruited after
    would not, in the same Warband.
  */
  const profile = (dataset?.units ?? []).find((u) => u.id === unit.baseProfileId);
  if (!profile) return null;

  const limited = (profile.keywords ?? [])
    .some((k) => String(k).toUpperCase() === 'LIMITED POTENTIAL');
  return limited ? rules.limitedPotential.maxXp : null;
}

export interface CappedExperience {
  /** What the model should now hold. */
  xp: number;
  /** How much of the award the cap refused. 0 where nothing was lost. */
  withheld: number;
  cap: number | null;
}

/**
 * Apply an Experience award against the model's cap.
 *
 * Returns what was withheld rather than silently clamping, so the screen that
 * grants the point can say the model is at its limit. A model that stops
 * gaining Experience with no explanation looks like a bug in the tracker, and
 * a player will "fix" it by typing the number in.
 */
export function cappedExperience(
  dataset: Dataset | null | undefined,
  unit: ActiveUnit,
  award: number,
): CappedExperience {
  const current = Number.isFinite(unit.xp) ? unit.xp : 0;
  const gain = Number.isFinite(award) ? award : 0;
  const cap = experienceCap(dataset, unit);

  if (cap === null) return { xp: current + gain, withheld: 0, cap };

  /* A model already over its cap keeps what it has: the cap bounds what may be
     earned, and retroactively deleting Experience a player recorded is not
     this function's call to make. */
  const xp = Math.max(current, Math.min(current + gain, cap));
  return { xp, withheld: current + gain - xp, cap };
}

/* ------------------------------------------------------------------ *
 * The Promotion Dice Pool (FD-06b)
 *
 * Page 105, in the book's own three steps: fill the pool, assign the dice,
 * roll them.
 * ------------------------------------------------------------------ */

/**
 * The Skill that adds dice, matched from the derived table rather than typed.
 *
 * `8 Show Off: Add 1 dice to the Promotion Pool in the Promotion step for each
 * model in your Warband with this Skill.` Counted from the roster, because
 * after FD-04b a Skill learned from an Advancement Roll is recorded properly —
 * so the app can read this rather than ask the player for a number they would
 * have to work out themselves.
 */
export const SHOW_OFF = 'Show Off';

const hasShowOff = (unit: Pick<ActiveUnit, 'skills'>) =>
  (unit.skills ?? []).some((s) => s.name?.trim().toLowerCase() === SHOW_OFF.toLowerCase());

export interface PromotionPool {
  /** How many dice the Warband has to assign. */
  dice: number;
  /** Each contribution, for a screen that shows its working. */
  parts: { label: string; dice: number }[];
}

/**
 * Fill the Promotion Dice Pool.
 *
 * > Your Promotion Dice Pool is made up of 1D6, plus 1D6 for each Glorious
 * > Deed that was carried out during the game by any model from your Warband.
 * > Note that the Glorious Deeds can have been carried out by any model in
 * > your Warband, not just Troops models. In addition, some Skills and Glory
 * > Items allow you to add more dice to the Promotion Dice Pool.
 *
 * `deeds` is the count this Warband claimed in the game — `matchHandover`
 * already reads it off the battle record, and the book is explicit that any
 * model's Deed counts, not just a Troop's.
 *
 * `extraDice` is for the Glory Items the app does not model. It is a number a
 * player types, and it is separate from the Show Off count so that a screen can
 * say which dice came from where: a pool that cannot show its working is one a
 * player cannot check against the page.
 */
export function promotionPool(
  dataset: Dataset | null | undefined,
  opts: {
    deeds?: number;
    warband?: Pick<Warband, 'units'> | null;
    extraDice?: number;
  } = {},
): PromotionPool | null {
  const rules = promotionRules(dataset);
  if (!rules || rules.poolBase == null || rules.poolPerDeed == null) return null;

  const n = (x: number | undefined) => (Number.isFinite(x) ? Math.max(0, Math.floor(x as number)) : 0);
  const deeds = n(opts.deeds);
  const showOff = (opts.warband?.units ?? []).filter((u) => !u.isDead && hasShowOff(u)).length;
  const extra = n(opts.extraDice);

  const parts = [
    { label: 'Base', dice: rules.poolBase },
    ...(deeds ? [{ label: `Glorious Deeds (${deeds})`, dice: deeds * rules.poolPerDeed }] : []),
    ...(showOff ? [{ label: `${SHOW_OFF} (${showOff})`, dice: showOff }] : []),
    ...(extra ? [{ label: 'Glory Items and other Skills', dice: extra }] : []),
  ];

  return { dice: parts.reduce((t, p) => t + p.dice, 0), parts };
}

/** How many dice each model has been given. Keyed by unit id. */
export type DiceAssignment = Record<string, number>;

/**
 * `3rd`, `4th`, `21st` — for the sentence that names the die being refused.
 *
 * The rule runs "and so on", so the number is not bounded at 4 and a hardcoded
 * suffix reads wrong the moment a Warband fields enough Troops to reach one.
 */
const ordinal = (n: number): string => {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
};

export interface AssignmentVerdict {
  legal: boolean;
  /** The rule broken, in the book's terms, or `''`. */
  detail: string;
  /** Dice assigned in total. Anything left in the pool is lost. */
  assigned: number;
}

/**
 * Check an assignment against the book's spreading rule.
 *
 * > You cannot assign a 3rd dice to the same model until all Troop models in
 * > your Warband have at least 2 dice each, or assign a 4th dice until all
 * > Troop models have at least 3 dice each, and so on.
 *
 * **The rule binds from the THIRD die up, and not before.** The sentence
 * names the 3rd die, the 4th die, "and so on" — it says nothing about the
 * 2nd. So two dice on one Troop while another holds none is legal, and the
 * book means it: the spreading requirement exists to stop a pool being poured
 * into one model, and two dice is not pouring.
 *
 * This was first written as "the most any model holds may exceed the least by
 * no more than one", which is a tidier sentence and a different rule. It
 * rejects `[2, 0, 0]`, which the book allows. It happens to agree on
 * `[3, 1, 1]`, so a test written from the same misreading would have passed.
 *
 * The rule as printed: for every model holding `k` dice where `k >= 3`, every
 * eligible model holds at least `k - 1`.
 *
 * `eligible` is the models the dice may go to at all, which is
 * `canBePromoted`'s business and is passed in rather than recomputed: a die on
 * a model the rulebook forbids is a different error, reported separately so
 * the player is told which rule they are up against.
 */
export function assignmentIsLegal(
  assignment: DiceAssignment,
  eligible: readonly string[],
  pool: number,
): AssignmentVerdict {
  const allowed = new Set(eligible);
  const given = Object.entries(assignment).filter(([, d]) => d > 0);
  const assigned = given.reduce((t, [, d]) => t + d, 0);

  const stranger = given.find(([id]) => !allowed.has(id));
  if (stranger) {
    return {
      legal: false,
      assigned,
      detail: 'A Promotion Die is assigned to a model that cannot be Promoted.',
    };
  }

  if (assigned > pool) {
    return {
      legal: false,
      assigned,
      detail: `${assigned} dice are assigned and the pool holds ${pool}.`,
    };
  }

  /*
    Every eligible model counts, including the ones given nothing: "until all
    Troop models in your Warband have at least 2 dice each" is a statement
    about all of them, so a model on nought is what makes a third die illegal.
  */
  const counts = eligible.map((id) => Math.max(0, assignment[id] ?? 0));
  if (counts.length) {
    const most = Math.max(...counts);
    const least = Math.min(...counts);
    /* Only a third die or beyond is constrained — see the note above. A
       second die is free, so `most` of 2 asks nothing of anybody. */
    if (most >= 3 && least < most - 1) {
      return {
        legal: false,
        assigned,
        detail: `A model holds ${most} dice while another holds ${least}. `
          + `No model may take a ${ordinal(most)} die until every `
          + `model that can be Promoted has at least ${most - 1}.`,
      };
    }
  }

  return { legal: true, assigned, detail: '' };
}

export interface PromotionOutcome {
  unitId: string;
  /** The dice actually rolled for this model, in order. */
  rolled: number[];
  promoted: boolean;
  /** True where the Promotion came from the five-miss rule, not from a 6. */
  automatic: boolean;
}

export interface PromotionResult {
  outcomes: PromotionOutcome[];
  /** The miss count to write back to the Roster. */
  misses: number;
  /** Dice never rolled, because the ceiling was reached. They are lost. */
  unrolled: number;
  /** ELITE models in the Warband once these Promotions are applied. */
  eliteAfter: number;
}

/**
 * Roll the assigned dice, in the book's order and with its two stopping rules.
 *
 * > Roll the dice you assigned to a model one at a time… As soon as one of the
 * > dice rolls a "6", stop rolling for that model, and Promote the model you
 * > were rolling for… If you roll all of the dice without a model being
 * > Promoted, then make a note on your Roster of how many dice you have rolled
 * > in a row without getting a Promotion. Once the total reaches 5 dice, then
 * > the next roll (the 6th one), is automatically considered to be a 6.
 *
 * And, from Maximum Elites:
 *
 * > …stop rolling for Promotions when a successful Promotion Roll means that
 * > you have 6 models with the ELITE Keyword in your Warband.
 *
 * `rolls` is the dice, supplied rather than generated, because this app is
 * used at a table where the dice are real — and because a pure function is the
 * only kind whose stopping rules can be tested. It is consumed in order; dice
 * left over when the ceiling is reached are reported as `unrolled`.
 *
 * `missesBefore` is the count carried on the Roster between games. It survives
 * the step: five misses spread over three games still make the sixth die a 6.
 */
export function rollPromotions(
  dataset: Dataset | null | undefined,
  order: readonly string[],
  assignment: DiceAssignment,
  rolls: readonly number[],
  opts: { missesBefore?: number; eliteBefore?: number } = {},
): PromotionResult | null {
  const rules = promotionRules(dataset);
  if (!rules || rules.promoteOn == null || rules.autoAfterMisses == null) return null;

  let misses = Number.isFinite(opts.missesBefore) ? Math.max(0, opts.missesBefore!) : 0;
  let elite = Number.isFinite(opts.eliteBefore) ? Math.max(0, opts.eliteBefore!) : 0;
  let cursor = 0;

  const outcomes: PromotionOutcome[] = [];

  for (const unitId of order) {
    const dice = Math.max(0, assignment[unitId] ?? 0);
    const outcome: PromotionOutcome = { unitId, rolled: [], promoted: false, automatic: false };

    for (let i = 0; i < dice; i += 1) {
      /* The ceiling stops the step, not just this model. */
      if (elite >= rules.maxElites) break;
      if (cursor >= rolls.length) break;

      /*
        The five-miss rule fires BEFORE the die is read: the book says the
        sixth roll "is automatically considered to be a 6", so the face on it
        does not matter. The die is still consumed and still recorded, because
        it was rolled.
      */
      const face = rolls[cursor];
      cursor += 1;
      outcome.rolled.push(face);

      const automatic = misses >= rules.autoAfterMisses;
      if (automatic || face >= rules.promoteOn) {
        outcome.promoted = true;
        outcome.automatic = automatic;
        misses = 0;
        elite += 1;
        break;
      }
      misses += 1;
    }

    outcomes.push(outcome);
  }

  return { outcomes, misses, unrolled: Math.max(0, rolls.length - cursor), eliteAfter: elite };
}
