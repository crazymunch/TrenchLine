/**
 * Which items are Alchemical Formulae, and what a Formula grants.
 *
 * Three separate bugs shared one cause: the app answered questions about game
 * data by pattern-matching an item's *name*, when the catalogue states the
 * answer outright and the importer had already read it.
 *
 * A Takwin Homunculus buys its Formulae from a catalogue group called, in the
 * catalogue, `Alchemical Formulae`. `newRecruitImporter` tested for exactly
 * that group to decide whether to keep a selection at all — and then dropped
 * it, storing the item with no record of where it came from. By the time the
 * unit card rendered there was nothing left to go on but the name, so it
 * guessed:
 *
 *     /formula|elixir|salve|phial|alkahest|vitriol|brimstone|cinnabar/i
 *
 * Not one of the eight real Formulae on a fully-upgraded Homunculus matches
 * that — `Massive Size`, `Human Hands`, `Inhuman Strength`, `Additional Arm`,
 * `Two Heads`, `Hawk Eyes`, `Hypnotic Eyes`, `Gargantuan Size` — so all eight
 * rendered as ordinary gear under "Protection & Gear", and the one section on
 * the card headed "Alchemical Formula" held the only entry that was not one.
 */

/** The catalogue's own group name. */
export const ALCHEMICAL_FORMULAE = 'Alchemical Formulae';

/** Anything that records where the catalogue put it. */
export interface Grouped {
  name: string;
  group?: string;
}

/**
 * A catalogue group path, as BattleScribe writes it: `Alchemical Formulae`, or
 * `Alchemical Formulae::Eye Options` for the sub-group Hawk Eyes and Hypnotic
 * Eyes sit in. Matched by containment so a sub-group counts as its parent —
 * an Eye Option is a Formula, and the player buys it from the same allowance.
 */
export function isAlchemicalFormula(item: Grouped): boolean {
  return (item.group ?? '').includes(ALCHEMICAL_FORMULAE);
}

/**
 * The Formula that grants a third hand, by its published name.
 *
 * This is a name used as an identifier, not a value copied out of a book: the
 * entry is `Additional Arm` in the `Alchemical Formulae` group of the Iron
 * Sultanate catalogue, 15 Ducats, and its rules text reads "The Homunculus can
 * perform an additional attack ACTION in Melee or Ranged combat without any
 * penalty."
 */
export const EXTRA_LIMB_FORMULA = 'Additional Arm';

/**
 * The Alchemical Formulae that were invented.
 *
 * `UnitAdvancementModal` used to carry a hand-written array of eight Formulae
 * that appear in no catalogue and in no book. The array is gone; rosters saved
 * while it existed still carry whatever was chosen from it, so the names have
 * to survive somewhere in order to be cleaned up.
 *
 * `Third Arm` is the one that mattered. It sat beside the real `Additional
 * Arm` with a different cost — 10 Ducats against 15 — and a player had no way
 * to tell which was real. It is not a duplicate of the real entry; it is a
 * different entry with the same effect and the wrong price.
 */
export const INVENTED_FORMULAE: readonly string[] = [
  'Third Arm',
  'Compound Alchemical Eyes',
  'Toughened Hide',
  'Muscle Grafting',
  'Mercury Blood',
  'Acidic Blood',
  'Elongated Tendons',
  'Regenerative Bile',
  'Chameleon Skin',
];

/**
 * Whether a saved upgrade came from that array.
 *
 * Matched on the name as printed on the card, which carried a parenthetical
 * gloss the array supplied — `Third Arm (Extra Limb)`. Anchored at the start
 * so it cannot reach a real entry whose name merely contains one of these.
 */
export function isInventedFormula(item: { name: string }): boolean {
  const name = item.name.trim().toLowerCase();
  return INVENTED_FORMULAE.some(
    (invented) => name === invented.toLowerCase() || name.startsWith(`${invented.toLowerCase()} (`),
  );
}

interface UnitLike {
  equippedEquipment?: Grouped[];
  specialUpgrades?: { name: string; category?: string }[];
  profileSnapshot?: { innateAbilities?: { name: string; description: string }[] };
  skills?: { name: string }[];
}

/**
 * Every Alchemical Formula on a model, from both places one can be recorded:
 * imported from a BattleScribe roster into `equippedEquipment`, or chosen
 * in-app into `specialUpgrades`.
 */
export function formulaeOf(unit: UnitLike | undefined | null): string[] {
  if (!unit) return [];
  return [
    ...(unit.equippedEquipment ?? []).filter(isAlchemicalFormula).map((e) => e.name),
    ...(unit.specialUpgrades ?? [])
      .filter((u) => (u.category ?? '').includes(ALCHEMICAL_FORMULAE) || (u.category ?? '') === 'Alchemical Formula')
      .map((u) => u.name),
  ];
}

/**
 * Whether the model may hold a third weapon.
 *
 * This was `/third arm|extra arm|limb/i` tested against the same lists — and
 * `Additional Arm` matches none of those three alternatives. So the real
 * Formula granted nothing, and the only thing that did grant the third hand
 * was the invented `Third Arm (Extra Limb)`: a model that had bought the
 * Formula the book prints was refused its third weapon, while one carrying an
 * entry from no book was allowed it.
 *
 * `innateAbilities` is still consulted because a model can be born with the
 * limb rather than buy it, and that text is derived from the catalogue.
 */
export function hasExtraLimb(unit: UnitLike | undefined | null): boolean {
  if (!unit) return false;
  if (formulaeOf(unit).some((name) => name.trim().toLowerCase() === EXTRA_LIMB_FORMULA.toLowerCase())) {
    return true;
  }
  return Boolean(
    unit.profileSnapshot?.innateAbilities?.some(
      (a) => /additional arm|extra limb/i.test(a.name) || /additional arm|extra limb/i.test(a.description),
    ),
  );
}
