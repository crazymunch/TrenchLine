/**
 * Retiring an injured model, which is the player's choice and not the book's.
 *
 * Quartermaster Step, p.123:
 *
 * > **Retire Injured Models.** You can retire any model in your Warband that
 * > has 2 Battle Scars. If you decide to do so, remove the model from your
 * > Warband Roster. You can sell or reallocate their Battlekit or Glory Items
 * > before you retire them if you wish, or allow them to retire with their
 * > Battlekit in honour of the service they have performed.
 *
 * ## Why this is not `unfitForDuty`
 *
 * The two rules are one scar apart and they are opposites, so they are kept in
 * separate modules with this paragraph in both directions.
 *
 *   Unfit for Duty   three scars, Trauma Step, the BOOK removes the model.
 *                    `trauma.ts`, `traumaProcedure.battleScars.unfitAt`.
 *   Retire Injured   two scars, Quartermaster Step, the PLAYER may remove it.
 *                    Here, `quartermaster.retireInjured.atScars`.
 *
 * A model with two Battle Scars is fit to fight. Nothing makes it leave; a
 * player retires it because two scars is where a veteran stops being worth its
 * Ducats, and the book lets them bank the kit rather than lose it in a game
 * they were going to lose it in anyway. Reading `unfitAt` for this offers the
 * action one scar too late, which is to say never — the third scar removes the
 * model in the step before this one.
 *
 * Both counts are read from the dataset. Neither is typed here.
 *
 * ## Nothing in this file removes a model
 *
 * It answers "may this model be retired, and what does the kit do". The move is
 * the store's, through `removeFromRoster`, for the reason `fallen.ts` gives: a
 * roster is the player's record of their own campaign.
 */
import type { Dataset } from '@/types/catalogue';
import type { ActiveUnit } from '@/types/warband';
import { scarCount } from './trauma';

/** What becomes of a retired model's Battlekit. The book offers three. */
export type RetirementDisposition =
  /** "sell … their Battlekit or Glory Items" — half the Cost, fractions up. */
  | 'sell'
  /** "reallocate their Battlekit" — it goes to the Arsenal to be given out. */
  | 'arsenal'
  /** "allow them to retire with their Battlekit in honour of the service". */
  | 'keep';

export interface RetirementVerdict {
  /** Whether the Retire action is offered for this model. */
  eligible: boolean;
  /** Battle Scars the model carries, from `scars` — never from `injuries`. */
  scars: number;
  /**
   * The count the ruleset permits retirement at, or `null` where the ruleset
   * does not say.
   *
   * `null` is not zero and not three. A ruleset built before the Quartermaster
   * Step was parsed states nothing about retiring, and the honest consequence
   * is that the action is not offered — never that every model may be retired,
   * and never that the Trauma Step's three is borrowed to stand in for it.
   */
  at: number | null;
  /** The rule's own words, for the screen that removes the model. */
  text: string;
}

/**
 * Whether this model may be retired, and on what authority.
 *
 * `>= at` rather than `=== at`: the book says "has 2 Battle Scars", and in
 * ordinary play three is unreachable here because the Trauma Step removes the
 * model first. It is reachable on a roster that was imported, edited by hand,
 * or played under a ruleset with a different `unfitAt` — and on those, a model
 * at three scars that the app refuses to retire is a model stuck on the roster
 * with no rule that can ever move it.
 */
export function mayRetire(
  dataset: Dataset | null | undefined,
  unit: Pick<ActiveUnit, 'scars'> | null | undefined,
): RetirementVerdict {
  const rule = dataset?.campaign?.quartermaster?.retireInjured;
  const scars = unit ? scarCount(unit as ActiveUnit) : 0;
  const at = rule?.atScars ?? null;
  return {
    eligible: !!unit && at !== null && scars >= at,
    scars,
    at,
    text: rule?.text ?? '',
  };
}

/**
 * Half the Cost, fractions rounded up — p.121, the same sale the Arsenal makes.
 *
 * Both currencies, each halved and rounded on its own, because an item's Cost
 * is what its Armoury row prints and some rows print both. Selling a Glory
 * Item used to pay out in Ducats, which is the bug this shape exists to avoid
 * repeating (FD-05c).
 */
export const salePrice = (cost: { ducats?: number; glory?: number }) => ({
  ducats: Math.ceil((cost.ducats ?? 0) / 2),
  glory: Math.ceil((cost.glory ?? 0) / 2),
});
