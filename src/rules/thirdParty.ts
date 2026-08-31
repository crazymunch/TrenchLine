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
import type { UnitProfile as CatalogueUnit, Modifier } from '@/types/catalogue';

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

/** Every leaf condition in a modifier's `when`, whatever it is nested inside. */
function flatten(when: unknown, out: Cond[] = []): Cond[] {
  if (!when || typeof when !== 'object') return out;
  const w = when as When;
  for (const key of ['all', 'any'] as const) {
    for (const c of w[key] ?? []) {
      if (c && typeof c === 'object' && ('all' in c || 'any' in c)) flatten(c, out);
      else if (c && typeof c === 'object') out.push(c as Cond);
    }
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
 * Either mark is enough. They agree on every entry in the pinned catalogues,
 * and requiring both would mean that dropping either one upstream silently
 * promotes unofficial content to official — the failure that matters here.
 */
export function thirdPartyGate(unit: CatalogueUnit): ThirdPartyGate {
  const marker = (unit.abilities ?? [])
    .find((a) => a.name.trim().toLowerCase() === MARKER_ABILITY);

  const gated = revealers(unit).find((m) => flatten(m.when).some(isTheToggle));

  const hosts = gated
    ? flatten(gated.when)
        .filter((c) => c.scope === 'primary-catalogue' && c.childName)
        .map((c) => c.childName as string)
    : [];

  return {
    thirdParty: !!marker || !!gated,
    hosts,
    notice: marker?.description || undefined,
  };
}
