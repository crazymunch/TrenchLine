/**
 * Gear a model always has.
 *
 * The Warbands book states it as a Battlekit line on the entry:
 *
 *     Battlekit  A Combat Medic always has Standard Armour, a Gas Mask,
 *                a Medi-kit, and a Misericordia.
 *
 * and the catalogues state the same thing as an `entryLink` with a `min="1"`
 * constraint. The parser dropped those links, so eighteen models carried none
 * of their mandatory kit and none of the keywords it grants — no NEGATE GAS on
 * a model whose own profile says it is wearing a gas mask.
 *
 * It also let the player buy the same item a second time. The catalogue hides
 * the New Antioch Armoury's Gas Mask row from a Combat Medic for exactly that
 * reason; with the forced link dropped there was nothing to hide it against,
 * and the app would sell a Medic a 5-Ducat Gas Mask it already had.
 *
 * The kit is not free, and this is not a way to dodge its cost: the catalogue
 * prices the model to include it. The New Antioch Combat Medic is the arithmetic
 * in the open — 40 Ducats in the catalogue plus Standard Armour 15, Gas Mask 5
 * and Medi-kit 5 is the book's printed 65. See `data-sources/resolutions.json`.
 */
import type { ForcedBattlekit } from '@/types/catalogue';
import { nameKey } from './names';

/*
  Accepts either profile shape.

  The pipeline's `UnitProfile` (types/catalogue) always carries the field; the
  roster's snapshot (types/rules) carries it optionally, because a warband
  saved before the pipeline emitted it has none and must still load.
*/
type HasBattlekit = { battlekit?: ForcedBattlekit[] } | null | undefined;

/**
 * Read the forced kit off a profile.
 *
 * Defensive about the field being absent: a warband saved before the pipeline
 * emitted it holds a `profileSnapshot` without one, and a roster a player has
 * had for weeks must not throw on load.
 */
export function forcedBattlekit(profile: HasBattlekit): ForcedBattlekit[] {
  return profile?.battlekit ?? [];
}

/** Keywords the model gets from its kit: NEGATE GAS, NEGATE SHRAPNEL. */
export function battlekitKeywords(profile: HasBattlekit): string[] {
  return [...new Set(forcedBattlekit(profile).flatMap((b) => b.keywords))];
}

/**
 * Does the model already carry this item as forced kit?
 *
 * Matched by entry id first, since the Armoury row and the forced link point at
 * the same catalogue entry, and by name as a fallback — the catalogues spell
 * the same item `Medikit` in one file and the Armoury Table prints `Medi-kit`.
 */
export function carriesAsBattlekit(
  profile: HasBattlekit,
  item: { id?: string; weaponId?: string | null; name: string },
): boolean {
  const kit = forcedBattlekit(profile);
  if (!kit.length) return false;
  const ids = new Set(kit.map((b) => b.id));
  if (item.id && ids.has(item.id)) return true;
  if (item.weaponId && ids.has(item.weaponId)) return true;
  const names = new Set(kit.map((b) => nameKey(b.name)));
  return names.has(nameKey(item.name));
}

/** What the kit adds to the model's cost — normally nothing. See the note above. */
export function battlekitCost(profile: HasBattlekit) {
  return forcedBattlekit(profile).reduce(
    (sum, b) => ({
      ducats: sum.ducats + (b.cost?.ducats ?? 0) * (b.quantity || 1),
      glory: sum.glory + (b.cost?.glory ?? 0) * (b.quantity || 1),
    }),
    { ducats: 0, glory: 0 },
  );
}
