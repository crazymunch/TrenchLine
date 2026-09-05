/**
 * How the cross-check decides what a unit should be compared against, and what
 * it means when there is nothing to compare it to.
 *
 * Extracted from `scripts/rules-crosscheck.mjs` so both rules can be tested on
 * inputs chosen to break them. They are the two places that report has been
 * wrong: once by comparing against the wrong catalogue's entry, and once by
 * reporting a fact about coverage as if it were a defect.
 */

/** The fields the cross-check compares, and therefore the ones a tie-break needs. */
export const COMPARED = ['ranged', 'melee', 'armour', 'movement'];

export const norm = (s) =>
  String(s).toLowerCase().replace(/dice/g, '').replace(/[”"']/g, '').replace(/\s+/g, '');

/**
 * A unit the app files under one faction that the catalogues keep in another.
 *
 * The keyed lookup comes first, always; this is the fallback. It used to demand
 * the name be unique across every catalogue, because it is not: "Guard Dog"
 * exists in both `Mercenaries.cat` and `New Antioch.cat` with DIFFERENT
 * statlines — the Mercenaries one has no ranged attack — and picking either
 * blind reported four mismatches that were the check's own bookkeeping.
 *
 * But uniqueness is stricter than the reason for it. What must not happen is
 * choosing between candidates that DISAGREE; candidates that agree on every
 * compared field offer nothing to choose wrongly. `Wretched` is the case: one
 * profile in `Heretic Legion.cat` and one in `Court of the Seven-Headed
 * Serpent.cat`, identical, and the app's Carcass Front copy went unchecked
 * against both of them for want of a tie-break that was never needed.
 *
 * @param source Map keyed `faction::name`, as the cross-check builds it.
 */
export function byNameAlone(source, name) {
  const hits = [...source.entries()].filter(([k]) => k.endsWith(`::${name}`)).map(([, v]) => v);
  if (hits.length === 1) return hits[0];
  if (!hits.length) return undefined;
  const same = (a, b) => COMPARED.every((f) => norm(a[f]) === norm(b[f]));
  return hits.every((h) => same(h, hits[0])) ? hits[0] : undefined;
}

/** True for a unit the catalogues are supposed to carry. */
export const fromCatalogue = (unit) =>
  typeof unit.source === 'string' && unit.source.endsWith('.cat');

/**
 * Why a unit found no catalogue row.
 *
 * `unmatched` is a defect — the app names a `.cat` that has no such entry, so
 * either the name is wrong or the entry has gone. `uncovered` is a fact about
 * the source: the unit came from a book BattleScribe does not carry, and the
 * Carcass Front warbands are most of it.
 *
 * These were one bucket, and that hid things in both directions: fifteen
 * Carcass Front models read as inventions, and a real naming error would have
 * been the sixteenth line in a list nobody re-read. `sourceless` is neither —
 * nothing records where the unit came from, which is the state the pipeline
 * exists to end, so it is never quietly folded into the coverage note.
 */
export function classifyUnmatched(unit) {
  if (fromCatalogue(unit)) return 'unmatched';
  return unit.source ? 'uncovered' : 'sourceless';
}
