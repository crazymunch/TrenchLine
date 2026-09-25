/**
 * An option that swaps the model's statline (DA-02, review round 1 finding N).
 *
 * Some entries state more than one Unit profile and let the player pick. The
 * book prints the Black Grail's as one entry with one cost — *"Grail Thralls /
 * Fly Thralls"* — and the rulebook states the Trench Dog's the same way on
 * p.121: *"When you give a Trench Dog to a model, you can give the Trench Dog
 * one of the following special abilities at a Cost of +1 ☼."*
 *
 * DA-02 took those second profiles off the recruit list, which was right — they
 * are not models a player hires. On its own it was also half a fix: the parser
 * skips any sub-entry carrying a Unit profile when it builds `options`, so the
 * Grail Thrall offered no way to become a Fly Thrall and the Trench Dog no way
 * to become a Guard Dog. The entry had lost the wrong half.
 *
 * The parser now emits each of them as a `UnitOption` carrying
 * `unitProfileId`, priced from the sub-entry's own cost. This is the other
 * side: given a model and its entry, which second statline — if any — has it
 * been given.
 *
 * Nothing here is typed. The option, its price and the profile it names are all
 * the catalogue's; this only reads which one the model is carrying.
 */
import type { Dataset, UnitProfile, UnitOption } from '@/types/catalogue';

/** The statline options an entry offers, which is usually none. */
export const statlineOptionsOf = (
  entry: { options?: UnitOption[] } | null | undefined,
): UnitOption[] => (entry?.options ?? []).filter((o) => !!o.unitProfileId);

const key = (s: string | undefined) => (s ?? '').trim().toLowerCase();

/**
 * The second Unit profile this model has been given, or `null`.
 *
 * `selections` are the names of everything on the model — `modelSelections` in
 * `applyVariant.ts` produces exactly that list. Matched by name because that is
 * what a roster records for an option; the option's id is not on a saved model.
 *
 * `null` for a model that has taken none, which is the ordinary case and is the
 * Grounded Thrall as much as it is a Lieutenant: the primary profile is already
 * the model's own, so there is nothing to swap.
 */
export function swappedProfile(
  dataset: Dataset | null | undefined,
  entry: { options?: UnitOption[] } | null | undefined,
  selections: readonly string[],
): UnitProfile | null {
  const options = statlineOptionsOf(entry);
  if (!options.length || !dataset) return null;

  const held = new Set(selections.map(key));
  const chosen = options.find((o) => held.has(key(o.name)));
  if (!chosen) return null;

  return dataset.units.find((u) => u.id === chosen.unitProfileId) ?? null;
}

/**
 * The statline to print for this model: the swapped one where it has taken a
 * statline option, and the snapshot's otherwise.
 *
 * Returns the snapshot's own stats unchanged when nothing applies, so a caller
 * can use it unconditionally. It never merges the two — a second Unit profile
 * is a whole statline, not a set of adjustments to the first, and taking half
 * of each would print a model that is in no book.
 */
export function printedStats<T>(
  snapshot: T,
  swapped: UnitProfile | null,
): T | UnitProfile['stats'] {
  return swapped ? swapped.stats : snapshot;
}
