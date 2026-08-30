/**
 * Armoury restriction text -> structured rules.
 *
 * The rulebook states wargear legality as prose in the Armoury Tables:
 *
 *     Automatic Pistol   ELITE only, Limit: 3                    20 Ducats
 *     Automatic Rifle    Bayonet Lug, Limit: 1                   40 Ducats
 *     Misericordia       Combat Medic only, Limit: 1             15 Ducats
 *     Satchel Charge     Consumable, Limit: 3 (1 per model)      15 Ducats
 *
 * 132 of the 206 rows carry one. The original app rendered these as decorative
 * text and enforced none of them — see docs/AUDIT.md §1.3.
 *
 * Anything this cannot parse is preserved verbatim as an `unparsed` note and
 * surfaced in the UI, rather than being silently dropped. A restriction we
 * cannot read is still a restriction the player needs to see.
 */

export type Restriction =
  /** "ELITE only", "Combat Medic only", "Brazen Bull only" */
  | { kind: 'onlyFor'; requires: string; raw: string }
  /** "Limit: 3" — per roster unless perModel is set */
  | { kind: 'limit'; max: number; perModel?: number; raw: string }
  /** "Shield Combo", "Bayonet Lug" — a property other rules key off */
  | { kind: 'property'; name: string; raw: string }
  /** "Consumable" */
  | { kind: 'consumable'; raw: string }
  /** Anything we cannot read; shown to the player as-is. */
  | { kind: 'unparsed'; raw: string };

/** Properties that are tags rather than restrictions. */
const PROPERTIES = new Set([
  'shield combo', 'bayonet lug', 'consumable', 'ammunition',
]);

export function parseRestrictions(text: string): Restriction[] {
  if (!text?.trim()) return [];

  return text
    .split(',')
    // "Limit: 3 (1 per model)" must not split on the comma inside brackets;
    // rejoin any fragment that opened a bracket without closing it.
    .reduce<string[]>((acc, part) => {
      const last = acc.at(-1);
      if (last && (last.match(/\(/g)?.length ?? 0) > (last.match(/\)/g)?.length ?? 0)) {
        acc[acc.length - 1] = `${last},${part}`;
      } else acc.push(part);
      return acc;
    }, [])
    .map((s) => s.trim())
    .filter(Boolean)
    .map(toRestriction);
}

function toRestriction(raw: string): Restriction {
  const lower = raw.toLowerCase();

  const only = raw.match(/^(.+?)\s+only\b/i);
  if (only) return { kind: 'onlyFor', requires: only[1].trim(), raw };

  const limit = raw.match(/^limit:\s*(\d+)\s*(?:\((\d+)\s*per\s*model\))?/i);
  if (limit) {
    const r: Restriction = { kind: 'limit', max: Number(limit[1]), raw };
    if (limit[2]) (r as { perModel?: number }).perModel = Number(limit[2]);
    return r;
  }

  if (lower === 'consumable') return { kind: 'consumable', raw };
  if (PROPERTIES.has(lower)) return { kind: 'property', name: raw.trim(), raw };

  return { kind: 'unparsed', raw };
}

/**
 * Does a model satisfy an "X only" restriction?
 *
 * The requirement is matched against the model's keywords (ELITE), its roles
 * (Elite, Troop) and its profile name (Combat Medic), because the book uses all
 * three forms interchangeably.
 */
export function satisfiesOnlyFor(
  requires: string,
  unit: { name: string; keywords?: string[]; roles?: string[] }
): boolean {
  const want = requires.trim().toLowerCase();
  if (!want) return true;

  // "Janissaries & Yüzbaşı with Janissary Veteran" and similar compound
  // requirements are beyond this; treat them as satisfied and let the unparsed
  // note carry the caveat to the player rather than blocking a legal choice.
  if (/[&]|\bwith\b/i.test(requires)) return true;

  const hay = [
    unit.name,
    ...(unit.keywords ?? []),
    ...(unit.roles ?? []),
  ].map((s) => String(s).toLowerCase());

  return hay.some((h) => h === want || h.includes(want) || want.includes(h));
}
