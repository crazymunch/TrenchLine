/**
 * Glory Items are behind a gate, and the gate is a discovery (RR-14, FD-10).
 *
 * Page 125:
 *
 * > Glory Items are pieces of Battlekit. They are similar in many ways to the
 * > Battlekit that can only be purchased with ☼ that are found in the Armoury
 * > Tables of a Faction List. **However**, Glory Items can only be purchased
 * > during a campaign and if the Warband has made a discovery from an
 * > Exploration Table that allows them to take a Glory Item for free or
 * > purchase it in the Quartermaster Step. For example, the Trench Merchant
 * > discovery on the Common Exploration Locations Table allows a Warband to
 * > purchase Glory Items costing 5 ☼ or less.
 *
 * ## Why the currency cannot decide this
 *
 * The sentence above is a distinction, not a definition, and the word doing the
 * work is "However". A faction's Armoury Table stocks Glory-priced Battlekit of
 * its own — New Antioch's Troop Flag at 1 ☼, Martyrdom Pills at 1 ☼, a Field
 * Shrine at 2 ☼ — and none of those needs a discovery. Gating on
 * `cost.glory > 0` would have put every one of them behind a gate the book does
 * not put them behind, taking three rows per faction off a starting Warband's
 * shopping list.
 *
 * So the gate keys on the SECTION the row was printed under, which the pipeline
 * now records because the Glory Item Tables are parsed
 * (`parseGloryItemTables`). A row printed in a Glory Item Table is a Glory
 * Item; a row printed in an Armoury Table is Battlekit, whatever it costs.
 *
 * ## The ceiling is the discovery's, not the app's
 *
 * Three Locations open the shop and each names its own limit — the Trench
 * Merchant 5 ☼, the Black Market 8 ☼, the Black Network Contact 12 ☼. A
 * Warband holding two takes the higher, because the lower one does not stop
 * being true. None of those three numbers is written down here: they are read
 * from the Locations' own sentences by `explorationGrants`, and arrive on the
 * roster as `ExplorationEffect.gloryItemsUpTo`.
 *
 * A Warband with no such effect sees no Glory Item rows at all — not a ceiling
 * of zero, which is the same thing here but is the wrong reason, and would
 * become the wrong answer the moment a Location grants a free item without a
 * price.
 */
import type { Dataset, ArmouryRow } from '@/types/catalogue';
import type { ExplorationEffect } from './campaign';

/** The section the pipeline files a Glory Item Table's rows under. */
export const GLORY_ITEM_SECTION = 'Glory Items';

/** Whether an armoury row came from a Glory Item Table rather than an Armoury Table. */
export const isGloryItem = (row: Pick<ArmouryRow, 'section'>): boolean =>
  (row.section ?? '').trim().toLowerCase() === GLORY_ITEM_SECTION.toLowerCase();

export interface GloryItemPermission {
  /**
   * The highest Glory price this Warband may pay, or `null` where no discovery
   * has opened the tables.
   *
   * `null` is not zero. Zero would mean "may buy the free ones", and there are
   * none; `null` means the shop is shut, which is what the player is owed an
   * explanation of.
   */
  upTo: number | null;
  /** The Locations that opened it, for the sentence a player reads. */
  sources: string[];
  /** The rule's own words, where the ruleset carries them. */
  text: string;
}

/**
 * What this Warband may buy from its Glory Item Table.
 *
 * Reads the effects the Exploration Step recorded, never the list of Locations
 * discovered: the Trench Merchant is a choice between taking 2 Glory now and
 * opening the shop for good, and a Warband that took the Glory has discovered
 * the Location without earning the permission.
 */
export function gloryItemPermission(
  dataset: Dataset | null | undefined,
  held: readonly ExplorationEffect[] | undefined,
): GloryItemPermission {
  const text = dataset?.campaign?.quartermaster?.gloryItems?.text ?? '';
  const opening = (held ?? []).filter((e) => typeof e.gloryItemsUpTo === 'number');
  if (!opening.length) return { upTo: null, sources: [], text };
  return {
    /* Two merchants do not cancel: the higher permission stands, and the lower
       one is still true of everything under it. */
    upTo: Math.max(...opening.map((e) => e.gloryItemsUpTo!)),
    sources: [...new Set(opening.map((e) => e.source || e.name))],
    text,
  };
}

/**
 * The armoury rows this Warband may actually be offered.
 *
 * Every non-Glory-Item row, always; the Glory Items only once a discovery has
 * opened them, and only up to that discovery's ceiling. Order is preserved, so
 * a caller that groups by section still gets the book's own grouping.
 */
export function offerableRows(
  rows: readonly ArmouryRow[],
  permission: GloryItemPermission,
): ArmouryRow[] {
  return rows.filter((r) => {
    if (!isGloryItem(r)) return true;
    if (permission.upTo === null) return false;
    /*
      The price the row is judged at is its LOWEST. A Trench Dog is printed
      "1-3 ☼" and a Warband permitted 5 ☼ can afford one at any price in that
      range; one permitted 1 ☼ can afford the cheapest. Refusing the row on its
      top price would hide an item the Warband can buy.
    */
    return r.cost.glory <= permission.upTo;
  });
}

/**
 * Why the Glory Items are not on the list, in one sentence.
 *
 * Returned rather than rendered so the same words can appear in the equip sheet
 * and in a legality report. Empty where the tables ARE open, which is the
 * caller's signal to say nothing.
 */
export function gloryItemNotice(permission: GloryItemPermission): string {
  if (permission.upTo === null) {
    return 'Glory Items need an Exploration discovery — a Trench Merchant, a Black '
      + 'Market or a Black Network Contact — before they can be purchased.';
  }
  return `Glory Items up to ${permission.upTo} Glory, from ${permission.sources.join(' and ')}.`;
}
