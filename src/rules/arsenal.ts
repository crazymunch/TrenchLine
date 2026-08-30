/**
 * The arsenal, as the Codex shows it: every piece of Battlekit a faction
 * stocks, priced by that faction, described by the rulebook.
 *
 * This exists because the Codex was rendering 34 hand-written wargear records,
 * each carrying one Ducat cost and one `faction` string. Both are wrong by
 * construction:
 *
 *   - **One cost.** Wargear is priced per faction. An Automatic Rifle is 40
 *     Ducats in the New Antioch and Trench Pilgrims armouries and 2 Glory in
 *     the Heretic Legions'. A single `cost: 40` is right for two factions out
 *     of six and silently wrong for the rest.
 *   - **One faction.** The hand-written records marked almost everything
 *     `universal`, which is not a thing the game has. What exists is six
 *     Armoury Tables, and an item is stocked by however many of them list it —
 *     often at different prices and under different limits.
 *
 * So an arsenal item is a *profile* joined to its *offers*, and the offers are
 * a list. Nothing here computes a headline price: a UI that wants one number
 * has to decide which faction it is talking about, which is the question the
 * hand-written data was avoiding.
 */
import type { Dataset, BattlekitEntry, WeaponProfile, Cost } from '@/types/catalogue';
import { nameKey } from './names';

/** What one faction charges for one item, and under what condition. */
export interface ArsenalOffer {
  factionId: string;
  faction: string;
  cost: Cost;
  restrictions: string[];
}

export interface ArsenalItem {
  /** The normalised name — stable across the three sources that spell it. */
  key: string;
  name: string;
  /** 'Ranged Weapons' | 'Melee Weapons' | 'Grenades' | 'Shields' | 'Armour' | 'Equipment' */
  section: string;
  /** Null where neither the rulebook chapter nor a catalogue profile carries it. */
  type: string | null;
  range: string | null;
  keywords: string[];
  /** The rulebook's description. Null for faction-exclusive Battlekit, which is
   *  described in Warbands of Trench Crusade rather than the Battlekit chapter. */
  description: string | null;
  /** Unbulleted rules printed under the profile. Only the Field Shrine has any. */
  note: string | null;
  /** Special rules printed under the profile. */
  rules: string[];
  /** Every armoury that stocks it. Empty means no faction table lists it. */
  offers: ArsenalOffer[];
}

/** How many distinct currencies the offers use, for a UI that wants to say so. */
export const offersDiffer = (item: ArsenalItem): boolean =>
  new Set(item.offers.map((o) => `${o.cost.ducats}/${o.cost.glory}`)).size > 1;

/**
 * Build the arsenal.
 *
 * Every item stocked by at least one Armoury Table, plus every entry in the
 * Battlekit chapter — including the handful the tables do not list, which are
 * still rules a player needs to be able to look up.
 *
 * Sourcing, in order, and never invented: the profile comes from the Battlekit
 * chapter where the chapter describes it, otherwise from the catalogue's weapon
 * profile. An item with neither reports nulls rather than blanks that read as
 * "no keywords" — `hasProfile` distinguishes the two.
 */
export function buildArsenal(dataset: Dataset | null | undefined): ArsenalItem[] {
  if (!dataset) return [];

  const chapter = new Map<string, BattlekitEntry>();
  for (const b of dataset.battlekit ?? []) chapter.set(nameKey(b.name), b);

  const profiles = new Map<string, WeaponProfile>();
  for (const w of dataset.weapons ?? []) {
    const k = nameKey(w.name);
    // First profile wins: the same name recurs per faction and the fields this
    // uses (type, range, keywords) do not vary between those copies.
    if (!profiles.has(k)) profiles.set(k, w);
  }

  const items = new Map<string, ArsenalItem>();

  const seed = (name: string, section: string): ArsenalItem => {
    const k = nameKey(name);
    const existing = items.get(k);
    if (existing) return existing;

    const b = chapter.get(k);
    const p = profiles.get(k);
    const item: ArsenalItem = {
      key: k,
      name: b?.name ?? name,
      // The chapter's own section wins: it is the book's classification, where
      // the armoury's is the table the row happened to be printed in.
      section: b?.section ?? section,
      type: b?.type ?? p?.type ?? null,
      range: b?.range ?? p?.range ?? null,
      keywords: b?.keywords ?? p?.keywords ?? [],
      description: b?.description || null,
      note: b?.note || null,
      rules: b?.rules ?? (p?.rules ? [p.rules] : []),
      offers: [],
    };
    items.set(k, item);
    return item;
  };

  for (const armoury of dataset.armouries ?? []) {
    for (const row of armoury.rows) {
      const item = seed(row.name, row.section);
      item.offers.push({
        factionId: armoury.factionId,
        faction: armoury.faction,
        cost: row.cost,
        restrictions: row.restrictions ?? [],
      });
    }
  }

  // Chapter entries no table stocks. Kept: a rule a player can look up is worth
  // more than a tidy list, and dropping them would hide that the tables and the
  // chapter disagree about what exists.
  for (const b of dataset.battlekit ?? []) seed(b.name, b.section);

  return [...items.values()].sort(
    (a, b) => a.section.localeCompare(b.section) || a.name.localeCompare(b.name));
}

/** Does anything actually describe this item, or is the card empty? */
export const hasProfile = (item: ArsenalItem): boolean =>
  Boolean(item.type || item.range || item.keywords.length || item.description);

/**
 * The three groupings the Codex renders as tabs. Derived from the book's own
 * sections rather than a hand-maintained mapping.
 */
export const ARSENAL_GROUPS: Record<'weapons' | 'armour' | 'equipment', string[]> = {
  weapons: ['Ranged Weapons', 'Melee Weapons', 'Grenades'],
  armour: ['Shields', 'Armour'],
  equipment: ['Equipment'],
};

export const groupOf = (item: ArsenalItem): keyof typeof ARSENAL_GROUPS | null => {
  for (const [g, sections] of Object.entries(ARSENAL_GROUPS)) {
    if (sections.includes(item.section)) return g as keyof typeof ARSENAL_GROUPS;
  }
  return null;
};
