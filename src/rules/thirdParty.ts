/**
 * Third-party content, and the switch the catalogues already carry for it.
 *
 * Trench Crusade's community catalogues include a small amount of material that
 * is *not* official — condoned by Factory Fortress, but written by other people
 * and, in the source's own words, offering "no assurances ... to balance or
 * consistency with rules". The app was showing it beside the published entries
 * with nothing to tell them apart.
 *
 * The fix is not a hand-maintained list of names. The catalogues mark it
 * themselves, twice over, and both marks are already in the generated dataset:
 *
 *   1. The entry carries an Ability profile literally named **"Third Party"**,
 *      whose description is the disclaimer above.
 *   2. The entry is `hidden="true"`, with a `set hidden false` modifier
 *      conditioned on the roster having selected **"Allow Third-Party
 *      Mercenaries?"** — a real roster option in `Campaign Rules.cat`.
 *
 * So upstream's design is opt-in per roster, and this reads that design rather
 * than inventing a policy. `Warband.allowThirdParty` is the app's copy of that
 * option, and it defaults off because the catalogue's default is hidden.
 *
 * **`hidden="true"` on its own is not the marker.** Thirty-three model entries
 * are hidden by default and twenty-six of them ship; it is simply how
 * BattleScribe expresses "available under a condition", and most of those are
 * ordinary official units — the Matagot Hag, the Chieftain and the Technomancer
 * are all hidden-by-default *and* are their faction's Leader. Gating on it
 * would delete a third of the roster.
 */
import type { Modifier } from '@/types/catalogue';

/**
 * Anything the catalogues can gate: a unit, a weapon, a piece of Battlekit.
 *
 * Structural rather than one of the entity types, because the gate is the same
 * mechanism on all of them — 22 units and 33 wargear entries in the pinned
 * catalogues hang off the same six third-party Variants.
 */
export interface Gateable {
  abilities?: { name: string; description: string }[];
  modifiers?: Modifier[];
}

/**
 * The roster option's own id, from `Campaign Rules.cat`.
 *
 * Matched alongside the name rather than instead of it: a BattleScribe id is
 * stable across renames, and the name survives an id churn, so either alone is
 * a single point of failure for something whose failure mode is silently
 * showing unofficial content as official.
 */
export const THIRD_PARTY_OPTION_ID = '8397-95ab-8729-eb60';
const THIRD_PARTY_OPTION_NAME = 'allow third-party mercenaries';

/** The marker profile's name, as the catalogues spell it. */
const MARKER_ABILITY = 'third party';

type Cond = {
  type?: string; scope?: string; childId?: string; childName?: string;
};
type When = { all?: unknown[]; any?: unknown[] };

/**
 * Every leaf condition in a modifier's `when`, whatever it is nested inside.
 *
 * A `when` is EITHER a group (`{all: [...]}` / `{any: [...]}`) OR a single bare
 * condition. The first version of this only walked groups and returned nothing
 * for a bare one — which is the shape every real gate in the catalogues uses,
 * so it matched none of them.
 */
function flatten(when: unknown, out: Cond[] = []): Cond[] {
  if (!when || typeof when !== 'object') return out;
  const w = when as When;
  if (!('all' in w) && !('any' in w)) {
    out.push(w as Cond);
    return out;
  }
  for (const key of ['all', 'any'] as const) {
    for (const c of w[key] ?? []) flatten(c, out);
  }
  return out;
}

const isTheToggle = (c: Cond) =>
  c.childId === THIRD_PARTY_OPTION_ID
  || (c.childName ?? '').trim().toLowerCase().startsWith(THIRD_PARTY_OPTION_NAME);

/** The `set hidden false` modifiers, which is where the gate lives. */
const revealers = (unit: { modifiers?: Modifier[] }) =>
  (unit.modifiers ?? []).filter((m) =>
    m.field === 'hidden' && String(m.value) === 'false');

export interface ThirdPartyGate {
  /** Whether this entry is third-party content. */
  thirdParty: boolean;
  /** The third-party Warband Variant that unlocks it, where one does. */
  variant?: string;
  /**
   * Catalogue names of the Warbands that may hire it, from the same modifier.
   * Empty when the source states no restriction.
   */
  hosts: string[];
  /** The source's own disclaimer, for the UI to show rather than paraphrase. */
  notice?: string;
}

/**
 * Read the gate off one catalogue entry.
 *
 * Three independent marks, any one of which is enough — requiring agreement
 * would mean that dropping one upstream silently promotes unofficial content to
 * official, which is the failure that matters here:
 *
 *   1. the `Third Party` Ability profile (one entry: the Disciple of St. Roch);
 *   2. a reveal conditioned on the `Allow Third-Party Mercenaries?` roster
 *      option (the same entry);
 *   3. a reveal conditioned on a **third-party Warband Variant** — twenty-one
 *      entries, and by far the larger mechanism. The Technomancer exists only
 *      inside the Cadaver Corps, the Chieftain only inside the Children of
 *      Yggdrasil, and so on. Both of those are their faction's Leader, which is
 *      why gating on `hidden` alone would have been so wrong.
 *
 * `variantIds` are the entry ids of the third-party variants, which the caller
 * takes from `dataset.variants` — the pipeline flags them from the catalogues'
 * own `Third Party` group.
 */
export function thirdPartyGate(
  unit: Gateable,
  variantIds: ReadonlySet<string> = new Set(),
): ThirdPartyGate {
  const marker = (unit.abilities ?? [])
    .find((a) => a.name.trim().toLowerCase() === MARKER_ABILITY);

  const reveals = revealers(unit);
  const gated = reveals.find((m) => flatten(m.when).some(isTheToggle));

  let variant: string | undefined;
  for (const m of reveals) {
    const hit = flatten(m.when)
      .find((c) => c.childId && variantIds.has(c.childId));
    if (hit) { variant = hit.childName ?? hit.childId; break; }
  }

  const hosts = gated
    ? flatten(gated.when)
        .filter((c) => c.scope === 'primary-catalogue' && c.childName)
        .map((c) => c.childName as string)
    : [];

  return {
    thirdParty: !!marker || !!gated || !!variant,
    variant,
    hosts,
    notice: marker?.description || undefined,
  };
}

/** The entry ids of every third-party Warband Variant in a dataset. */
export function thirdPartyVariantIds(
  dataset: { variants?: { entryId?: string; id: string; thirdParty?: boolean }[] },
): Set<string> {
  return new Set(
    (dataset.variants ?? [])
      .filter((v) => v.thirdParty)
      .map((v) => v.entryId ?? v.id),
  );
}
