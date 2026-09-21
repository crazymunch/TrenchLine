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
  /** The group's full ancestry, where the pipeline emits one. */
  groupPath?: string;
}

/**
 * A catalogue group path, as BattleScribe writes it: `Alchemical Formulae`, or
 * `Alchemical Formulae::Eye Options` for the sub-group Hawk Eyes and Hypnotic
 * Eyes sit in. Matched by containment so a sub-group counts as its parent —
 * an Eye Option is a Formula, and the player buys it from the same allowance.
 *
 * `groupPath` first, and that is the fix rather than a nicety. This function
 * documented the `::` form from the day it was written and the pipeline never
 * emitted one: `optionsOf` let a nested group REPLACE its parent's name, so
 * the Eye Options arrived as the bare leaf `Eye Options`, and the one
 * sub-group this comment names was the single case the predicate could not
 * answer.
 *
 * `group` is still read, because it is all a top-level option carries and all
 * an older saved roster carries.
 */
export function isAlchemicalFormula(item: Grouped): boolean {
  return inFormulaGroup(item.groupPath ?? item.group);
}

/**
 * Whether a catalogue group, or group path, is the Formulae group or under it.
 *
 * Shared by both of the places a Formula can be recorded, because they had
 * the same bug and only one of them was obvious. `formulaeOf` reads
 * `equippedEquipment` through `isAlchemicalFormula` and `specialUpgrades`
 * through their `category` — and the category is the group the app or the
 * import wrote, which is the LEAF. So an `Eye Options` category failed the
 * containment test exactly as an `Eye Options` group did, and Hawk Eyes and
 * Hypnotic Eyes were not Formulae on a model that had bought them: not in
 * `traitsOf`, not in `chosenBy`, and not in the card's Formula section.
 */
export function inFormulaGroup(group: string | undefined | null): boolean {
  return (group ?? '').includes(ALCHEMICAL_FORMULAE);
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
  equippedWeapons?: Grouped[];
  equippedArmour?: Grouped[];
  equippedEquipment?: Grouped[];
  specialUpgrades?: { name: string; category?: string }[];
  profileSnapshot?: { innateAbilities?: { name: string; description: string }[] };
  skills?: { name: string }[];
  advancements?: string[];
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
      /* `Alchemical Formula`, singular, is what an older in-app purchase
         wrote before the group was carried through. Kept so a saved roster
         keeps its Formulae. */
      .filter((u) => inFormulaGroup(u.category) || (u.category ?? '') === 'Alchemical Formula')
      .map((u) => u.name),
  ];
}

/**
 * Every name on a model that a catalogue entry can be gated on.
 *
 * The catalogue reveals a Titan Zulfiqar to a Brazen Bull *or* to anything
 * with `Gargantuan Size`, and the rulebook says the same in words: "The
 * Homunculus can use 1 Weapon that can usually only be taken by a Brazen
 * Bull." Answering that question needs every name the model holds — and a
 * Formula can be recorded in THREE places, not the two the roster builder
 * read:
 *
 *   equippedEquipment   imported from a BattleScribe roster
 *   specialUpgrades     bought in the app
 *   innateAbilities     on the profile snapshot — a model BORN with the trait,
 *                       or advanced into it, which is how Al-Masyukh carries
 *                       Gargantuan Size and was still told "Brazen Bull only"
 *
 * `hasExtraLimb` below already consults all three, for exactly this reason.
 * This is the same list, asked as a general question.
 *
 * Deliberately unfiltered: every name is returned, not a guessed subset of
 * "formula-ish" ones. Only names a catalogue entry itself lists in its
 * `unlockedBy` can match, so a broad list costs nothing — while narrowing it
 * by name pattern is precisely the failure this file exists to document.
 */
export function traitsOf(unit: UnitLike | undefined | null): string[] {
  if (!unit) return [];
  return [
    /*
      EVERY equipped entry, not only the ones that still say which group they
      came from.

      Filtering this list by `isAlchemicalFormula` was inconsistent with the
      paragraph above and it cost exactly the models it was meant to serve:
      the importer that dropped a selection's group is the reason this
      function exists, so requiring the group here loses the Formula on every
      roster imported before that was fixed — which is how a Homunculus
      carrying Gargantuan Size was still told "Brazen Bull only".

      A name only matters if a catalogue entry names it in `unlockedBy`, so
      widening the list cannot grant anything the catalogue did not.
    */
    ...(unit.equippedEquipment ?? []).map((e) => e.name),
    ...(unit.specialUpgrades ?? []).map((u) => u.name),
    ...(unit.profileSnapshot?.innateAbilities ?? []).map((a) => a.name),
    ...(unit.skills ?? []).map((s) => s.name),
  ].filter(Boolean);
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

/**
 * Every name on a model that the PLAYER put there.
 *
 * The same list as `traitsOf` with one thing left out, and the omission is the
 * whole point: `innateAbilities` is what the model's catalogue ENTRY prints,
 * which is not the same as what its owner bought.
 *
 * The Yüzbaşı Captain is the case. Its entry prints an ability called
 * "Janissary Veteran" whose text is an offer — "You can make the Yüzbaşı a
 * Janissary Veteran … at a cost of +5" — so every Yüzbaşı ever recruited
 * carries that name innately while almost none of them are Veterans. The
 * Regimental Kaşık is restricted to "Janissaries & Yüzbaşı with Janissary
 * Veteran only", and answering that condition from `traitsOf` would wave
 * every Yüzbaşı through without a word (docs/RULES-COVERAGE-AUDIT.md RC-06).
 *
 * So this answers "what did the player choose", and `onlyForVerdict` reports
 * `unknown` where the answer is not in here — a caveat on screen rather than
 * either a silent permit or a refusal that makes the entry unbuyable.
 */
export function chosenBy(unit: UnitLike | undefined | null): string[] {
  if (!unit) return [];
  return [
    ...(unit.equippedWeapons ?? []).map((w) => w.name),
    ...(unit.equippedArmour ?? []).map((a) => a.name),
    ...(unit.equippedEquipment ?? []).map((e) => e.name),
    ...(unit.specialUpgrades ?? []).map((u) => u.name),
    ...(unit.skills ?? []).map((s) => s.name),
    ...(unit.advancements ?? []),
  ].filter(Boolean);
}
