/**
 * The faction Armoury Table.
 *
 * A weapon entry is a *profile*: range, keywords, what it does. An armoury row
 * is an *offer*: what one faction pays for that weapon, and under what
 * condition. They are not the same thing, and flattening them loses real rules.
 *
 *   Automatic Rifle, New Antioch      40 Ducats   Bayonet Lug, Limit: 1
 *   Automatic Rifle, Trench Pilgrims  40 Ducats   Bayonet Lug, Limit: 1
 *   Automatic Rifle, Heretic Legions   2 Glory    Bayonet Lug, Limit: 2
 *
 * Same weapon, different currency, different limit. The catalogues cannot say
 * this — they price shared entries at zero and hang the real price off each
 * faction's armoury link, which is why 363 of 543 weapons parsed as free. The
 * rulebook's Armoury Tables carry it, per faction, and that is what this reads.
 *
 * So: a warband buys from its faction's armoury, exactly as the book reads.
 */
import type { Dataset, Armoury, ArmouryRow, Cost } from '@/types/catalogue';
import { nameKey } from './names';

// The shapes live with the rest of the generated-data model, since that is what
// the pipeline emits; re-exported here so existing call sites keep working.
export type { Armoury, ArmouryRow };

const key = nameKey;

/**
 * The armoury a warband shops from. Matched leniently because roster factions
 * are slugs ('iron-sultanate') while the book prints prose ('Cult of the Black
 * Grail') — but never guessed: an unmatched faction returns undefined and the
 * caller has to cope, rather than silently shopping from someone else's list.
 */
export function armouryFor(dataset: Dataset, factionId: string): Armoury | undefined {
  const all = dataset.armouries ?? [];
  const want = key(factionId);
  if (!want) return undefined;
  return (
    all.find((a) => key(a.factionId) === want || key(a.faction) === want) ??
    all.find((a) => key(a.faction).includes(want) || want.includes(key(a.factionId)))
  );
}

/** Every offer of one weapon in this armoury — a name can appear in two sections. */
export function offersOf(armoury: Armoury | undefined, weapon: { id?: string; name: string }): ArmouryRow[] {
  if (!armoury) return [];
  return armoury.rows.filter(
    (r) => (weapon.id && r.weaponId === weapon.id) || key(r.name) === key(weapon.name));
}

/**
 * What this faction pays. Returns null when the faction does not stock the
 * weapon at all, which is itself a legality answer — not a free item.
 */
export function priceOf(
  armoury: Armoury | undefined,
  weapon: { id?: string; name: string }
): Cost | null {
  const offers = offersOf(armoury, weapon);
  if (!offers.length) return null;
  // Where one faction lists the same item twice, the offers agree; if they ever
  // did not, taking the first would be a silent choice, so prefer the cheaper
  // and let the caller see both through offersOf.
  return offers.reduce((best, r) =>
    (r.cost.ducats + r.cost.glory * 100) < (best.ducats + best.glory * 100) ? r.cost : best,
    offers[0].cost);
}

/** The restrictions this faction attaches, which differ from another's. */
export function restrictionsFor(
  armoury: Armoury | undefined,
  weapon: { id?: string; name: string }
): string[] {
  return [...new Set(offersOf(armoury, weapon).flatMap((r) => r.restrictions))];
}

/** Does this faction's armoury stock the item at all? */
export function stocks(armoury: Armoury | undefined, weapon: { id?: string; name: string }): boolean {
  return offersOf(armoury, weapon).length > 0;
}
