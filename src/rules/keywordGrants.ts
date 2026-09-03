/**
 * A model's effective Keywords.
 *
 * The catalogue entry's own list is not all of them. An option can grant one,
 * and says so in its rules text:
 *
 *   Inhuman Strength     "…Give this Takwin Homunculus the STRONG Keyword…"
 *   Elemental Resistance "Give this Takwin Homunculus the NEGATE FIRE and
 *                         NEGATE GAS Keywords…"
 *
 * The names are derived at build time — see `keywordGrantsFrom` — and matched
 * here against what the model actually holds.
 *
 * This is load-bearing rather than cosmetic. STRONG lets a model carry one
 * 2-Handed Melee Weapon as if it were 1-Handed, and the base Takwin Homunculus
 * entry carries only ARTIFICIAL. Reading it alone told Al-Masyukh — which
 * bought Inhuman Strength — that its greatsword and sword needed three hands
 * and the model had two.
 */
import type { Dataset, UnitProfile } from '@/types/catalogue';
import { nameKey } from './names';

/**
 * The Keywords this model actually has.
 *
 * `traits` is everything the model holds, by name — see `traitsOf`. Only a
 * name the dataset lists as granting something can add anything, so passing a
 * broad list is safe.
 */
export function effectiveKeywords(
  profile: { keywords?: string[] } | UnitProfile | undefined,
  traits: string[],
  dataset: Dataset,
): string[] {
  const own = profile?.keywords ?? [];
  const grants = dataset.keywordGrants ?? [];
  if (!grants.length || !traits.length) return [...own];

  const byName = new Map(grants.map((g) => [nameKey(g.name), g.grants]));
  const granted = traits.flatMap((t) => byName.get(nameKey(t)) ?? []);
  // A model that both carries the keyword and is granted it has it once.
  return [...new Set([...own, ...granted])];
}
