/**
 * What a Warband Variant does to its faction's Armoury Table.
 *
 * `wargear-not-stocked` has been advisory since it was written, because a
 * variant can extend the armoury and nothing read those rules. This closes the
 * gap for the cases the prose states unambiguously, and — deliberately — only
 * those.
 *
 * The rules are not one mechanism. Across the seventeen variants they are:
 *
 *   **Cross-faction access.** Knights of Avarice's *Corrupt Merchants*: "you can
 *   purchase 1 piece of Battlekit from the New Antioch Armoury, and 1 piece of
 *   Battlekit from the Iron Sultanate Armoury." Both the faction and the limit
 *   are named, so this is readable.
 *
 *   **A variant's own armoury.** Defenders of the Iron Wall and War Pilgrimage
 *   of Saint Methodius each reference an armoury table of their own that the
 *   pipeline does not yet parse as a separate table.
 *
 *   **Price and restriction overrides.** Procession of the Sacred Affliction:
 *   "Holy Icon Shields cost 20 ducats … and do not have the (ELITE only)
 *   restriction."
 *
 * Only the first is extracted. The other two are *reported* — `unreadable`
 * carries the rule so the UI can name it — because guessing at them is how this
 * codebase acquired 51 invented wargear entries in the first place. A rule we
 * cannot read is still one the player needs to see; it is not one we may invent
 * a meaning for.
 */
import type { Dataset, WarbandVariant } from '@/types/catalogue';
import { sameFaction } from './variants';
import { armouryFor, offersOf } from './armoury';

export interface CrossFactionGrant {
  /** The faction whose armoury this variant may buy from. */
  factionId: string;
  /** How many pieces, where the rule says. */
  limit: number | null;
  /** The rule that granted it, for citation. */
  rule: string;
}

export interface VariantArmoury {
  grants: CrossFactionGrant[];
  /**
   * Rules that plainly touch the armoury but whose effect is not machine
   * readable — a variant-specific table, or a price/restriction override.
   * Surfaced rather than guessed at.
   */
  unreadable: { rule: string; description: string }[];
}

/** `from the New Antioch Armoury` / `from the Iron Sultanate Armoury` */
const FROM_ARMOURY = /(?:from|to)\s+the\s+([A-Z][A-Za-z'’\- ]{3,40}?)\s+Armour(?:y|ies)/g;
/** `purchase 1 piece of Battlekit` — the count immediately before the grant. */
const COUNT_NEAR = /(?:purchase|include|take|add)\s+(\d+)\s+piece/i;

const TOUCHES_ARMOURY = /armour(?:y|ies)|battlekit|restriction|cost \d+ ducats/i;

/**
 * Read a variant's armoury effects.
 *
 * `factionId` is the variant's own faction, so its own armoury is never
 * reported as a cross-faction grant.
 */
export function variantArmoury(
  variant: WarbandVariant | undefined,
  factionId: string,
  /**
   * The factions that actually have an Armoury Table. A grant is recognised
   * only when it names one of these — "the Defenders of the Iron Wall Warband
   * Armoury" names a variant's own table, not a faction's, and matching it by
   * shape rather than against the real list is how a plausible-looking wrong
   * grant would get in.
   */
  knownFactions: string[] = []
): VariantArmoury {
  const grants: CrossFactionGrant[] = [];
  const unreadable: VariantArmoury['unreadable'] = [];

  for (const rule of variant?.specialRules ?? []) {
    const text = rule.description ?? '';
    if (!TOUCHES_ARMOURY.test(text) && !TOUCHES_ARMOURY.test(rule.name)) continue;

    FROM_ARMOURY.lastIndex = 0;
    let found = false;
    for (const m of text.matchAll(FROM_ARMOURY)) {
      const named = m[1].trim();
      // A variant naming its own faction's armoury is not a grant — it is the
      // armoury it already shops from.
      if (sameFaction(factionId, named)) continue;
      // Must name a faction that actually has a table. Anything else is a
      // variant's own armoury, and its contents are not ours to invent.
      const match = knownFactions.find((f) => sameFaction(f, named));
      if (!match) continue;
      grants.push({
        factionId: match,
        limit: Number(COUNT_NEAR.exec(text)?.[1]) || null,
        rule: rule.name,
      });
      found = true;
    }

    if (!found) unreadable.push({ rule: rule.name, description: text });
  }

  return { grants, unreadable };
}

/**
 * How many pieces a grant allows, where the roster has taken more.
 *
 * The grants were READ and never COUNTED. `stockedAnywhere` answers "is this
 * stocked somewhere I can reach", which makes a granted item legal — and then
 * nothing looked at how many had been taken. The House of Wisdom's *Weapon
 * Collections* says "you can purchase **1** piece of Battlekit from the New
 * Antioch Armoury, and **1** piece of Battlekit from the Trench Pilgrims
 * Armoury"; a roster with five New Antioch items validated clean.
 *
 * The catalogue's own FAQ settles the reading that the sentence leaves open —
 * MISC. Q4, in `dataset.faq`:
 *
 *   Q: "Do the Corrupt Merchants and Weapon Collections special rules only
 *      allow me to purchase one of each piece of Battlekit that I choose, or
 *      can I purchase multiple copies of the same Battlekit?"
 *   A: "You can only purchase one of each piece of Battlekit."
 *
 * So the allowance is one PIECE per named armoury, and a second copy of the
 * chosen piece is a second piece. Counting copies rather than distinct names
 * is therefore correct, and is not this file's invention.
 *
 * ## Why an assignment rather than a count
 *
 * An item can be stocked by more than one granted armoury — the Sword/Axe is
 * in most of them — so "three grant-only items against two grants of one"
 * cannot be decided by tallying per armoury: each item has to be attributed to
 * exactly one grant that actually stocks it, and the roster is legal if ANY
 * such attribution fits. Tallying greedily reports a legal roster as illegal
 * whenever the first item happens to consume the only grant a later one had.
 *
 * Exhaustive, because it can be: a variant states two grants at most and the
 * items reachable only through them are a handful. Bounded anyway, and the
 * bound refuses rather than guessing — see `withinGrants`.
 */
export interface GrantUsage {
  /** The item, and every grant whose armoury stocks it. */
  item: { name: string };
  via: CrossFactionGrant[];
}

/** The most attribution attempts before this stops trying. */
const MAX_SEARCH = 20_000;

/**
 * Can every grant-only item be attributed to a grant that stocks it, without
 * any grant exceeding its stated limit?
 *
 * `null` where the search was abandoned as too large — reported by the caller
 * as unknown rather than as either answer. A limit of `null` on a grant means
 * the rule stated no number, and an unstated number is not a licence for any
 * count: such a grant is treated as unbounded here and the rule is surfaced,
 * which is this file's standing policy on what it cannot read.
 */
export function withinGrants(usage: GrantUsage[]): boolean | null {
  const unbounded = (g: CrossFactionGrant) => g.limit === null;
  let steps = 0;

  const used = new Map<CrossFactionGrant, number>();

  const search = (i: number): boolean | null => {
    if (steps++ > MAX_SEARCH) return null;
    if (i === usage.length) return true;

    for (const grant of usage[i].via) {
      const spent = used.get(grant) ?? 0;
      if (!unbounded(grant) && spent >= (grant.limit as number)) continue;
      used.set(grant, spent + 1);
      const rest = search(i + 1);
      if (rest !== false) return rest;      // true, or null for "gave up"
      used.set(grant, spent);
    }
    return false;
  };

  return search(0);
}

/**
 * Does any armoury this warband may shop from stock the item?
 *
 * Checks the faction's own table first, then each armoury a variant grants
 * access to. Returns the granting rule when it was a grant that allowed it, so
 * a player can be told *why* an item they could not otherwise buy is legal.
 */
export function stockedAnywhere(
  dataset: Dataset,
  factionId: string,
  variant: WarbandVariant | undefined,
  weapon: { id?: string; name: string }
): { stocked: boolean; via: string | null } {
  if (offersOf(armouryFor(dataset, factionId), weapon).length) {
    return { stocked: true, via: null };
  }

  const known = (dataset.armouries ?? []).map((a) => a.factionId);
  for (const grant of variantArmoury(variant, factionId, known).grants) {
    if (offersOf(armouryFor(dataset, grant.factionId), weapon).length) {
      return { stocked: true, via: grant.rule };
    }
  }

  return { stocked: false, via: null };
}
