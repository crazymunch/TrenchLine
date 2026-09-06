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
  unit: { name: string; keywords?: string[]; roles?: string[] },
  /**
   * What the model has taken, and what the catalogue says unlocks the entry.
   *
   * An Armoury row's "X only" is shorthand. "Brazen Bull only" on the Titan
   * Zulfiqar reads, in the catalogue, as *a Brazen Bull **or** anything with
   * the Gargantuan Size Alchemical Formula* — and the rulebook says the same in
   * words: "The Homunculus can use 1 Weapon that can usually only be taken by a
   * Brazen Bull." Matched on the name alone, a legal Homunculus is rejected.
   */
  context?: OnlyForContext,
): boolean {
  return onlyForVerdict(requires, unit, context).met;
}

/**
 * The same question, three-valued.
 *
 * `satisfiesOnlyFor` answers yes or no because that is all its two callers can
 * act on. This says *how* it knows, and exists because of the one shape it did
 * not know at all.
 *
 * A compound requirement — "Janissaries & Yüzbaşı with Janissary Veteran" —
 * used to return `true` unconditionally, on the reasoning that the unparsed
 * note would carry the caveat to the player. It does not: the clause parses
 * cleanly as `onlyFor`, so it never takes the unparsed path, and nothing
 * anywhere told anyone. A Sultanate Azeb could be handed the Regimental Kaşık
 * with no warning at all (docs/RULES-COVERAGE-AUDIT.md RC-06).
 *
 * It is now read in two halves, because they are not equally answerable:
 *
 *   the IDENTITY half   "Janissaries & Yüzbaşı" — alternatives, any of which
 *                       satisfies. Fully checkable, and this is the half that
 *                       was letting the wrong models through.
 *
 *   the CONDITION half  "with Janissary Veteran" — something the model must
 *                       have TAKEN. Checkable only against `taken`; where that
 *                       does not answer it, the honest answer is that we
 *                       cannot tell, NOT that the answer is no.
 *
 * That distinction matters more than it looks. Refusing on an unevaluable
 * condition would make a legal item unbuyable by anyone — trading a silent
 * permit for a silent refusal, which is not an improvement. So the permit
 * stands and `unknown` says why, for a caller to show.
 *
 * The condition is deliberately NOT read from `selections`. That list carries
 * everything a catalogue entry can be gated on, innate abilities included, and
 * an innate ability is what the model's ENTRY offers — not what the model has
 * bought. Janissary Veteran is printed on every Yüzbaşı Captain as an offer:
 * "You can make the Yüzbaşı a Janissary Veteran … at a cost of +5". Answering
 * the condition from that list would report every Yüzbaşı ever recruited as a
 * Veteran, silently, which is the RC-06 fail-open again in a narrower place.
 */
export interface OnlyForVerdict {
  /** Whether the model may take it. `true` where a condition cannot be read. */
  met: boolean;
  /**
   * The part of the requirement that could not be evaluated, in the source's
   * own words. Present only where `met` is true on an unread condition — a
   * caveat to surface, never a reason to refuse.
   */
  unknown?: string;
}

export interface OnlyForContext {
  /**
   * Names the model carries that a catalogue entry can be gated on — Formulae,
   * advancements, innate abilities, skills. Read for `unlockedBy` only.
   */
  selections?: string[];
  /** What this entry is revealed by, in the catalogue's own words. */
  unlockedBy?: string[];
  /**
   * What the player has affirmatively CHOSEN for this model: purchased
   * options, upgrades, advancements. Never the entry's own printed abilities.
   *
   * Omitted where a caller has no such list, and omission is not "no" — the
   * condition then reports `unknown` and the caller shows it.
   */
  taken?: string[];
}

export function onlyForVerdict(
  requires: string,
  unit: { name: string; keywords?: string[]; roles?: string[] },
  context?: OnlyForContext,
): OnlyForVerdict {
  const want = requires.trim().toLowerCase();
  if (!want) return { met: true };

  /*
    Split the condition off first. `with` binds to the whole list before it:
    "Janissaries & Yüzbaşı with Janissary Veteran" reads as
    (Janissary or Yüzbaşı) that has Janissary Veteran, not as
    (Janissary) or (Yüzbaşı with Janissary Veteran).
  */
  const withAt = requires.search(/\bwith\b/i);
  const identity = withAt >= 0 ? requires.slice(0, withAt) : requires;
  const condition = withAt >= 0
    ? requires.slice(withAt).replace(/^\s*with\s+/i, '').trim()
    : '';

  /*
    Alternatives. `&` and `and` both appear; a trailing plural is dropped
    because the tables say "Janissaries" where the entry is a "Janissary".
  */
  const alternatives = identity
    .split(/\s*(?:&|\band\b)\s*/i)
    .map((a) => a.trim())
    .filter(Boolean);

  const identityMet = alternatives.length > 1
    ? alternatives.some((a) => matchesIdentity(a, unit, context))
    : matchesIdentity(identity.trim(), unit, context);

  if (!identityMet) return { met: false };
  if (!condition) return { met: true };

  /*
    The condition, against what the player chose. Matched loosely on the name,
    because an option is recorded under the name the table writes but not
    always the exact string.
  */
  const has = (context?.taken ?? []).some(
    (sel) => sel.trim().toLowerCase().includes(condition.toLowerCase()));
  if (has) return { met: true };

  return {
    met: true,
    unknown: `requires ${condition}, which this roster does not record`,
  };
}

/** One alternative of an "X only" requirement, against one model. */
function matchesIdentity(
  requires: string,
  unit: { name: string; keywords?: string[]; roles?: string[] },
  context?: OnlyForContext,
): boolean {
  /*
    A table plural against a singular entry name.

    The tables write the models and the entries name one: "Janissaries" for a
    `Janissary`, "Lions of Jabir" for a `Lion of Jabir`. Both endings, and
    `ies` first — stripping the bare `s` from "Janissaries" leaves
    "Janissarie", which matches nothing.
  */
  const want = requires.trim().toLowerCase()
    .replace(/(?<=[a-z]{2})ies$/, 'y')
    .replace(/(?<=[a-z]{3})s$/, '');
  if (!want) return true;

  const hay = [
    unit.name,
    ...(unit.keywords ?? []),
    ...(unit.roles ?? []),
  ].map((s) => String(s).toLowerCase());

  if (hay.some((h) => h === want || h.includes(want) || want.includes(h))) return true;

  // Then the catalogue's own answer: does the model hold something the entry
  // is revealed by? Only names the entry itself names count.
  const unlocks = (context?.unlockedBy ?? []).map((s) => s.trim().toLowerCase());
  if (!unlocks.length) return false;
  return (context?.selections ?? [])
    .map((s) => s.trim().toLowerCase())
    .some((sel) => unlocks.includes(sel));
}
