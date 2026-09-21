/**
 * Who stocks a piece of kit, when the Armoury Table does not.
 *
 * The Armoury Table is what a faction may BUY. It is not the only way gear
 * reaches a model, and the legality engine used to treat it as though it were:
 * everything a model carried that the table had no row for was reported as
 * "not in the Iron Sultanate Armoury Table", including the Sapper's own
 * Shovel, the FIRETEAM profile a Fireteam option grants, and an Exploration
 * find out of the Campaign Rules catalogue.
 *
 * FD-17 finding 3 rules on it: *entry-granted kit — an entry's own option or
 * fixed kit — is stocked by the entry and is never measured against the
 * Armoury Table.* Order 35 reclassified the Fire Shield into the same class:
 * Warbands L5490 is the Battlekit chapter's heading for it, not a Sultanate
 * Armoury row, and a Homunculus carries one because Human Hands grants it
 * (L5382).
 *
 * Each granter below is DERIVED, never a list of item names:
 *
 *   1. the model's own forced Battlekit, by entry id or by any name the kit
 *      entry prints;
 *   2. an option the model holds, by name;
 *   3. an option the model holds whose own rules text says the model may have
 *      the item — "It can also have a Trench Shield or a Fire Shield";
 *   4. a Battlekit profile, which the Armoury Tables do not sell;
 *   5. the Campaign Rules catalogue, which is not a faction armoury.
 *
 * 4 and 5 are measured, not assumed. Of the 334 weapons the catalogues type
 * `Battlekit`, exactly one is also an Armoury Table row (the Cult of the
 * Black Grail's Compound Eyes Helmet), and it is reached by `stocks` before
 * this is ever consulted. Of the 155 entries the Campaign Rules catalogue
 * carries, none is an Armoury Table row in any faction.
 */
import type { ForcedBattlekit, UnitOption } from '@/types/catalogue';
import { carriesAsBattlekit } from './battlekit';
import { nameKey } from './names';

/** The catalogue that holds Exploration finds and other campaign awards. */
export const CAMPAIGN_CATALOGUE = 'Campaign Rules';

/** The profile type the catalogues give kit an entry grants. */
export const BATTLEKIT_PROFILE = 'battlekit';

export interface GrantSubject {
  options?: UnitOption[];
  battlekit?: ForcedBattlekit[];
}

export interface GrantedItem {
  id?: string;
  weaponId?: string | null;
  name: string;
  /** The profile type the catalogue gave it: `Battlekit`, `Shield`, `1-Handed`… */
  type?: string;
  /** The catalogue the entry was read from: `Iron Sultanate`, `Campaign Rules`… */
  factionId?: string | null;
}

/**
 * Sentences that hand a model a named piece of kit.
 *
 * Matched on what the text SAYS rather than on the option's name, because the
 * options that grant gear are not a class the catalogue marks: Human Hands is
 * an Alchemical Formula, filed beside Wings and Two Heads, which grant nothing.
 *
 * `have` alone is deliberately absent. "It cannot use its Pummelling Blows
 * ability if it is armed with any Melee Weapons" is in the same paragraph as
 * the grant, and a bare `have|armed with` reads a prohibition as a permission.
 */
const PERMITS = /\b(?:can|may)\s+(?:also\s+)?(?:have|take|buy|carry|be\s+(?:armed|equipped)\s+with)\b/i;

/**
 * What forbids, so a clause that does both cannot be read as one that permits.
 *
 * The House of Wisdom's copy of Human Hands is one sentence that grants and
 * withholds at once — "can buy and wield any weapon allowed in the Iron
 * Sultanate warband or House of Wisdom list, though they cannot select ELITE
 * only items, grenades or items limited to specific units" — so `grenades`
 * sits inside a clause `PERMITS` matches.
 */
const FORBIDS = /\b(?:cannot|can\s+not|may\s+not|must\s+not|never|no\s+longer)\b/i;

/**
 * What ends a clause: sentence punctuation, the catalogues' `*` bullet, and
 * the conjunctions that turn a permission into its exception.
 */
const CLAUSES = /(?<=[.;])\s+|\s+\*\s+|\s+(?=(?:though|unless|except)\b)/i;

/**
 * Does this option's own text grant the item by name?
 *
 * The name has to fall inside a clause that permits, not merely anywhere in
 * the description — see `PERMITS`.
 */
export function textGrants(description: string | undefined, name: string): boolean {
  const want = nameKey(name);
  if (!want || !description) return false;
  return String(description).split(CLAUSES).some(
    (clause) => PERMITS.test(clause) && !FORBIDS.test(clause)
             && clauseNames(clause, name),
  );
}

/**
 * Words that may stand immediately before the item's name.
 *
 * The name has to BEGIN a noun phrase. A word boundary is not enough: in "a
 * Trench Shield or a Fire Shield" the bare name `Shield` is preceded by a
 * space either way, so a boundary test lets an item called `Shield` collect a
 * grant written for two other ones. A determiner, a conjunction or the
 * permitting verb can precede a name; another content word cannot, because
 * that word is part of the name.
 */
const LEAD = String.raw`(?:^|["'“(]|\b(?:a|an|the|any|one|two|its|their|another`
  + String.raw`|or|and|also|with|have|has|take|takes|buy|buys|carry|carries)\s+)`;

/**
 * Is the item named in this clause, as a whole phrase that starts a name?
 *
 * Trailing boundary as well, so `Fire Shield` does not answer a clause that
 * names a `Fire Shield Harness`.
 */
function clauseNames(clause: string, name: string): boolean {
  const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escaped) return false;
  return new RegExp(`${LEAD}${escaped}(?![\\w-])`, 'i').test(clause);
}

/**
 * What stocks this item for this model, or `null` if only the Armoury can.
 *
 * `held` is every option, Formula, ability and skill the model has, by name —
 * `rules/formulae.ts`'s `traitsOf` produces exactly that list.
 *
 * The returned string is the granter, for the caller to name in a message.
 */
export function stockedByEntry(
  profile: GrantSubject | null | undefined,
  held: readonly string[],
  item: GrantedItem,
): string | null {
  if (!item.name && !item.weaponId) return null;

  if (String(item.type ?? '').trim().toLowerCase() === BATTLEKIT_PROFILE) {
    return 'its Battlekit';
  }
  if (item.factionId === CAMPAIGN_CATALOGUE) return 'the campaign';
  if (!profile) return null;

  if (carriesAsBattlekit(profile, item)) return 'its Battlekit';

  const options = profile.options ?? [];
  const hasOption = new Set(held.map((h) => nameKey(h)));
  const wanted = nameKey(item.name);

  for (const o of options) {
    if (!hasOption.has(nameKey(o.name))) continue;
    if (nameKey(o.name) === wanted) return o.name;
    if (textGrants(o.description, item.name)) return o.name;
  }

  return null;
}
