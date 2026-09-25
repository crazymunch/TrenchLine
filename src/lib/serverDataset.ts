/**
 * Loading a generated ruleset on the SERVER.
 *
 * `/api/dataset` had this inline, and SH-1's share page needs the same read:
 * the sheet is now projected server-side (review round 1, finding A), so the
 * dataset has to be resolvable without a browser fetch.
 *
 * The rules that made the route's version what it is carry over unchanged.
 *
 * **The import is dynamic and inside the function**, so the 1.6 MB module is
 * only ever resolved on the server, and only for the ruleset actually asked
 * for. **The switch is deliberate**: a template literal here would let a
 * request string reach the module resolver and would defeat static analysis of
 * what can be loaded.
 *
 * **`null` for a ruleset that is declared but whose generated data is missing.**
 * Not an empty dataset and not the other ruleset: the caller says so. Rule 2 —
 * a ruleset that cannot be read is reported, never substituted.
 */
import type { Dataset } from '@/types/catalogue';
import { RULESET_IDS, DEFAULT_RULESET_ID } from '@/rules/rulesets';

/** Loaded once per ruleset per server process. */
const cache = new Map<string, Dataset>();

export async function loadDataset(id: string): Promise<Dataset | null> {
  const hit = cache.get(id);
  if (hit) return hit;

  const mod =
    id === 'trenchline' ? await import('@/data/generated/trenchline.generated')
    : id === 'github-latest' ? await import('@/data/generated/github-latest.generated')
    : null;

  if (!mod) return null;
  cache.set(id, mod.DATASET as Dataset);
  return mod.DATASET as Dataset;
}

/**
 * Which ruleset a warband should be read under, and whether that is its own.
 *
 * RV-1 put `rulesetId` on the warband because the app's ruleset was a
 * per-BROWSER setting: a warband built under TrenchLine Rules and opened on a
 * device set to Latest GitHub was read against the other one silently. A
 * shared roster is the **owner's** roster, so the reader's setting is not a
 * fact about it and neither is the server's default — its own record is.
 *
 * `recorded: false` where the warband has none. Absent means *not recorded*,
 * never *the default*, so the page says which ruleset it fell back to rather
 * than presenting the default as the warband's own.
 *
 * An id the build does not ship falls back the same way and says so, rather
 * than 500ing a page whose roster is perfectly readable.
 */
export function rulesetForWarband(
  warband: { rulesetId?: string } | null | undefined,
): { id: string; recorded: boolean } {
  const own = String(warband?.rulesetId ?? '').trim();
  return own && RULESET_IDS.includes(own)
    ? { id: own, recorded: true }
    : { id: DEFAULT_RULESET_ID, recorded: false };
}
