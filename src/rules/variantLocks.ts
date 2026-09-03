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
  /*
    Faction names, which are the only reveals that count as a genuine
    alternative route at MUSTER.

    The third kind of reveal — a prerequisite like `Book of Golems` — is not
    one. The Iron Sultanate Homunculus is revealed by that Exploration result
    *and* by The House of Wisdom; reading the first as "reachable another way"
    left it unlocked and offered to every Sultanate Warband on day one, when
    the only route a new Warband has is the Variant. A campaign event is how
    you EARN the model later, not a list you can pick it from now.
  */
  const factionNames = new Set(
    (dataset.factions ?? []).flatMap((f) => [f.id, f.name]).map((n) => n.trim().toLowerCase()));

  const out = new Map<string, VariantLock>();

  for (const unit of dataset.units) {
    if (!unit.hiddenByDefault) continue;

    const reveals = (unit.modifiers ?? []).filter(
      (m: Modifier) => m.field === 'hidden' && String(m.value) === 'false');
    if (!reveals.length) continue;

    const ids = new Set<string>();
    let reachableAnotherWay = false;

    for (const m of reveals) {
      const conds = conditions(m.when);
      const named = conds
        .map((c) => c.childId)
        .filter((id): id is string => !!id && byEntryId.has(id));
      if (named.length) { named.forEach((id) => ids.add(id)); continue; }
      // Only a faction reveal is a real alternative; a prerequisite is not.
      if (conds.some((c) => c.childName && factionNames.has(c.childName.trim().toLowerCase()))) {
        reachableAnotherWay = true;
      }
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
 * Hidden entries whose only route in is a PREREQUISITE, keyed by entry id and
 * carrying what the catalogue says unlocks them.
 *
 * Every gated entry in the catalogues is revealed by a named condition, and
 * they fall into exactly three kinds:
 *
 *   a Variant      Children of Yggdrasil reveals the Chieftain; The House of
 *                  Wisdom reveals the Homunculus. Handled by `variantLocks`.
 *   a Faction      the Combat Medic is revealed to Trench Pilgrims, the
 *                  Combat Biologist to the Iron Sultanate. These are Mercenary
 *                  host gates and the Warband is entitled to them.
 *   anything else  a thing the Warband must first EARN, and cannot have at
 *                  muster.
 *
 * That third kind is this map, and the two members of it say exactly what the
 * player reported:
 *
 *   Homunculus  <- `Book of Golems`, the Exploration result whose rules text
 *                  reads "Add a Takwin Homunculus from The House of Wisdom
 *                  Variant Warband in the Iron Sultanate Faction List".
 *   Trench Dog  <- `Dog Food`, a Glory Item. The Trench Dog is itself listed
 *                  in the Glory Items table at 1-3 ☼, not among Mercenaries.
 *
 * Both were offered at muster to a brand-new Warband that could not possibly
 * have met the prerequisite.
 *
 * A model with even one Variant or Faction reveal is NOT here: the Iron
 * Sultanate Homunculus is revealed by `Book of Golems` *and* by The House of
 * Wisdom, so it stays on the list, locked to that Variant.
 */
export function unobtainable(dataset: Dataset): Map<string, string[]> {
  const key = (s: string) => s.trim().toLowerCase();
  const variantNames = new Set((dataset.variants ?? []).map((v) => key(v.name)));
  const factionNames = new Set(
    (dataset.factions ?? []).flatMap((f) => [key(f.id), key(f.name)]));

  const out = new Map<string, string[]>();

  for (const unit of dataset.units) {
    if (!unit.hiddenByDefault) continue;

    const named = (unit.modifiers ?? [])
      .filter((m: Modifier) => m.field === 'hidden' && String(m.value) === 'false')
      .flatMap((m) => conditions(m.when))
      .map((c) => c.childName)
      .filter((n): n is string => !!n);

    // Nothing names it: no route in at all, and nothing to tell the player.
    if (!named.length) { out.set(unit.entryId || unit.id, []); continue; }

    const openable = named.some((n) => variantNames.has(key(n)) || factionNames.has(key(n)));
    if (openable) continue;

    out.set(unit.entryId || unit.id, [...new Set(named)]);
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
