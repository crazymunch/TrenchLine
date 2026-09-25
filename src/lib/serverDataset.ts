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
 * THREE cases, not two (review round 2 item 5). Round 1 had the second and
 * third share an answer, and the page then said something untrue:
 *
 * - the warband records a ruleset this build ships — read under it, `recorded`;
 * - the warband records none — read under the default, and the page says the
 *   warband records none, which is the truth about it;
 * - the warband records one this build does NOT ship — read under the default,
 *   and `unavailable` carries the id it asked for. Round 1 reported this as
 *   "this warband records no ruleset", which is false about the roster and
 *   hides the only fact worth knowing: the build is behind the record. Falling
 *   back is right — the roster is perfectly readable and 500ing the page would
 *   serve nobody — but falling back SILENTLY is the invention rule 2 forbids.
 *
 * Absent still means *not recorded*, never *the default*.
 */
export function rulesetForWarband(
  warband: { rulesetId?: string } | null | undefined,
): { id: string; recorded: boolean; unavailable?: string } {
  const own = String(warband?.rulesetId ?? '').trim();
  if (own && RULESET_IDS.includes(own)) return { id: own, recorded: true };
  return {
    id: DEFAULT_RULESET_ID,
    recorded: false,
    /* Only where the warband actually asked for one. */
    ...(own ? { unavailable: own } : {}),
  };
}

/**
 * What the share page's footer may say about the ruleset (Order 44 item 4c).
 *
 * A discriminated union rather than three loose props, and that is the whole
 * point of it. Round 2 added `rulesetUnavailable` as an optional third prop
 * beside `rulesetName` and `rulesetRecorded` — so deleting it from the page's
 * JSX compiled, rendered, and silently restored the false sentence it was added
 * to fix ("this warband records no ruleset" for a warband that records one this
 * build does not carry). Nothing failed.
 *
 * Here the three readings are three shapes, and the one that names an id cannot
 * be constructed without the id. Omitting it is a type error rather than a
 * regression.
 */
export type RulesetNote =
  /** Read under the ruleset the warband itself records. */
  | { kind: 'own'; name: string }
  /** The warband records none, so the published default. */
  | { kind: 'default'; name: string }
  /**
   * The warband records one this build does not ship, so the published default —
   * and `recorded` is the id it asked for, which the footer names.
   */
  | { kind: 'unavailable'; name: string; recorded: string };

/**
 * The verdict, plus a display name for whichever ruleset was used, as a note.
 *
 * `name` is passed in rather than resolved here: `rulesetInfo` is the caller's
 * to consult, and this module has no business deciding how a ruleset is spelled.
 */
export function rulesetNote(
  verdict: { id: string; recorded: boolean; unavailable?: string },
  name: string,
): RulesetNote {
  if (verdict.recorded) return { kind: 'own', name };
  if (verdict.unavailable) {
    return { kind: 'unavailable', name, recorded: verdict.unavailable };
  }
  return { kind: 'default', name };
}
