/**
 * Models that exist only inside a particular Warband Variant.
 *
 * Thirty-odd entries in the catalogues are off the list until a Variant is
 * taken: the Technomancer is a Cadaver Corps model, the Matagot Hag a Great
 * Hunger one, the Mendelist Ammo Monk a War Pilgrimage of Saint Methodius
 * hire. The app offered all of them to every Warband of the faction, so a
 * standard Black Grail list could recruit a Leader it is not entitled to.
 *
 * The catalogues say this with `hidden="true"` on the entry plus a
 * `set hidden false` conditioned on the Variant. Both halves are needed, and
 * that is the whole subtlety:
 *
 *   hidden entry  + variant reveal  ->  the Variant is what unlocks it
 *   visible entry + variant reveal  ->  a re-reveal undoing another Variant's
 *                                       ban, and NOT a lock
 *
 * The Janissary is the case that proves it: a core Iron Sultanate troop, banned
 * by Nomads of Al-Badia and Ghazi of the Golden Path (`set hidden true`) and
 * re-revealed under Fida'i of Alamut. Reading that reveal as a lock would make
 * Janissaries exclusive to the Cabal of Assassins, which is the opposite of
 * what the book says.
 *
 * An entry reachable another way is not locked either. The Desecrated Saint and
 * the Yoke Fiend are revealed by the Court's Chosen Sin selections as well as
 * by the Fang of the Seething Black, so neither belongs to the Fang alone.
 */
import type { Dataset, Modifier, WarbandVariant } from '@/types/catalogue';

type Cond = { childId?: string; childName?: string };

/** A `when` is either a group or a single bare condition. Both appear here. */
function conditions(when: unknown, out: Cond[] = []): Cond[] {
  if (!when || typeof when !== 'object') return out;
  const w = when as { all?: unknown[]; any?: unknown[] };
  if (!('all' in w) && !('any' in w)) {
    out.push(w as Cond);
    return out;
  }
  for (const key of ['all', 'any'] as const) {
    for (const c of w[key] ?? []) conditions(c, out);
  }
  return out;
}

export interface VariantLock {
  /** Entry ids of the Variants that unlock this model. */
  variantIds: Set<string>;
  /** Their names, for the message a player reads. */
  variantNames: string[];
}

/**
 * Which models each Variant unlocks, keyed by the model's entry id.
 *
 * Absent from the map means the model is not Variant-locked and is offered as
 * normal — the default, and the safe one: wrongly locking a model removes a
 * recruit a Warband is entitled to, which is worse than offering one it is not.
 */
export function variantLocks(dataset: Dataset): Map<string, VariantLock> {
  const variants: WarbandVariant[] = dataset.variants ?? [];
  const byEntryId = new Map(
    variants.filter((v) => v.entryId).map((v) => [v.entryId as string, v]));

  const out = new Map<string, VariantLock>();

  for (const unit of dataset.units) {
    if (!unit.hiddenByDefault) continue;

    const reveals = (unit.modifiers ?? []).filter(
      (m: Modifier) => m.field === 'hidden' && String(m.value) === 'false');
    if (!reveals.length) continue;

    const ids = new Set<string>();
    let reachableAnotherWay = false;

    for (const m of reveals) {
      const named = conditions(m.when)
        .map((c) => c.childId)
        .filter((id): id is string => !!id && byEntryId.has(id));
      if (named.length) named.forEach((id) => ids.add(id));
      else reachableAnotherWay = true;
    }

    if (!ids.size || reachableAnotherWay) continue;

    out.set(unit.entryId || unit.id, {
      variantIds: ids,
      variantNames: [...ids].map((id) => byEntryId.get(id)?.name ?? id),
    });
  }

  return out;
}

/**
 * Whether a Warband on this Variant may field a model with this lock.
 *
 * `variantId` is the app's own id (`cadavercorps`), the entry id, or the name —
 * a saved Warband may carry any of the three, and `variantById` already accepts
 * all of them.
 */
export function unlockedBy(
  lock: VariantLock | undefined,
  variant: WarbandVariant | undefined,
): boolean {
  if (!lock) return true;
  if (!variant) return false;
  return (!!variant.entryId && lock.variantIds.has(variant.entryId))
    || lock.variantNames.some((n) => n === variant.name);
}
