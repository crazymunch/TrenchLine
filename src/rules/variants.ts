/**
 * Which faction is which, and what variants it may take.
 *
 * A faction is spelled three ways across this codebase, and all three are
 * legitimate — they come from different sources:
 *
 *   - the app's own id, from the hand-written data:  `black-grail`
 *   - the rulebook parser, in `dataset.factions`:    `cult-of-the-black-grail`
 *   - the catalogues, on units and variants:         `Black Grail`
 *
 * Comparing any two of those with a naive normalise silently fails on the two
 * factions whose names actually differ, and a silent faction mismatch is the
 * worst kind here: it does not throw, it just offers no variants and applies no
 * variant rules, which is indistinguishable from a faction that has none.
 *
 * So every spelling is mapped to one canonical token, and the mappings are
 * recorded rather than fuzzy-matched. `variants.test.ts` asserts that every
 * faction the app offers resolves, so a new spelling fails the build instead of
 * quietly disabling a faction's rules.
 */
import type { Dataset, WarbandVariant } from '@/types/catalogue';
import { nameKey } from './names';

const key = nameKey;

/**
 * Every spelling that is not simply the canonical token with its punctuation
 * removed. Left side is the normalised source spelling, right side the token.
 */
const CANONICAL: Record<string, string> = {
  // The catalogues are singular, the app is plural.
  hereticlegion: 'hereticlegions',
  // The app's id drops three words from the printed name.
  courtofthesevenheadedserpent: 'courtsevenserpents',
  // The rulebook prints "Cult of the Black Grail"; the catalogues say "Black Grail".
  cultoftheblackgrail: 'blackgrail',
};

/** Any spelling of a faction -> the one token this codebase compares on. */
export function factionKey(faction: unknown): string {
  const k = key(faction);
  return CANONICAL[k] ?? k;
}

/** True when two spellings, from any source, name the same faction. */
export function sameFaction(a: unknown, b: unknown): boolean {
  const ka = factionKey(a);
  return ka !== '' && ka === factionKey(b);
}

/**
 * Every variant published for this faction, in the order the dataset lists them.
 *
 * An unknown faction returns nothing. It must never fall back to "show them
 * all": offering a Trench Pilgrim the Black Grail's variants would let a player
 * build a roster the validator would then correctly reject, with no way to see
 * why it was ever offered.
 */
export function variantsForFaction(dataset: Dataset, factionId: string): WarbandVariant[] {
  return (dataset.variants ?? []).filter((v) => sameFaction(factionId, v.factionId));
}

/** The variant a warband is built as, matched by id or by name, or undefined. */
export function variantById(
  dataset: Dataset,
  variantId: string | undefined
): WarbandVariant | undefined {
  if (!variantId) return undefined;
  const variants = dataset.variants ?? [];
  return variants.find((v) => v.id === variantId)
      ?? variants.find((v) => key(v.name) === key(variantId));
}

/** The faction record for any spelling of a faction id. */
export function factionOf(dataset: Dataset, factionId: string) {
  return (dataset.factions ?? []).find((f) => sameFaction(factionId, f.id));
}

/**
 * The names a variant *prints* that are not the names the dataset *stores*.
 *
 * BattleScribe keeps one base entry and renames it with a modifier when the
 * variant is selected, so the dataset holds `Azeb` and the House of Wisdom
 * prints `Kavass`. A saved warband records what the player saw — the printed
 * name — so joining it against base names alone drops every renamed model, and
 * a dropped model makes the whole verdict provisional.
 *
 * Returns printed name (normalised) -> the id of the entry it renames.
 */
export function variantRenames(variant: WarbandVariant | undefined): Map<string, string> {
  const out = new Map<string, string>();
  for (const op of variant?.ops ?? []) {
    if (op.op !== 'set' || op.field !== 'name') continue;
    const id = op.target?.id;
    const printed = typeof op.value === 'string' ? op.value : undefined;
    if (id && printed) out.set(key(printed), id);
  }
  return out;
}
