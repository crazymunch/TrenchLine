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
