/**
 * The abilities a model on a roster actually prints (review round 1, finding K).
 *
 * Two sources have to agree and neither is sufficient alone:
 *
 *   the ENTRY     what the catalogue says this model's kind has, once the
 *                 Warband's Variant is applied and the model's own loadout is
 *                 counted — `visibleAbilities`.
 *   the SNAPSHOT  what this particular model is carrying on the roster, which
 *                 a campaign can add to and which was resolved on the day it
 *                 was recruited.
 *
 * The first attempt filtered the snapshot against the RAW entry, and a filter
 * can only remove. That cost two real cases:
 *
 *   - **A Leper-Knight lost Knightly Code.** The Knights of Saint Lazarus
 *     Variant carries `replaceAbility Whip of God -> Knightly Code`, so the
 *     snapshot holds Knightly Code and the raw entry holds Whip of God. The
 *     name matched nothing and the ability vanished from the card of the model
 *     the Variant exists to create.
 *   - **A Shocktrooper recruited before the Variant was declared showed one
 *     ability.** `updateWarbandVariant` does not re-snapshot, so the model kept
 *     the standard list's two while the entry — now read under Remnants of
 *     Byzantium — prints four others and takes Assault Drill away. Filtering
 *     one against the other left only Shock Charge.
 *
 * So the entry is applied first and then asked, and the result is the union of
 * two things rather than the intersection: every ability the entry prints for
 * this model as it stands, plus anything the snapshot holds that the entry has
 * never heard of — a campaign's own additions, which belong to the model and
 * not to its kind.
 *
 * Nothing is invented. Where the entry cannot be resolved at all — an imported
 * roster whose `baseProfileId` is a hand-written slug — the snapshot stands
 * whole, which is the roster's own record.
 */
import type { Dataset, UnitProfile, WarbandVariant } from '@/types/catalogue';
import type { ActiveUnit } from '@/types/warband';
import type { Ability } from '@/types/rules';
import { applyVariant, visibleAbilities, modelSelections } from './applyVariant';

const key = (s: string | undefined) => (s ?? '').trim().toLowerCase();

export interface ShownAbilitiesInput {
  dataset: Dataset | null | undefined;
  /** The model's catalogue entry, as `catalogueUnitFor` resolves it. */
  entry: UnitProfile | null | undefined;
  /** The Warband's Variant, if one is declared. */
  variant: WarbandVariant | undefined;
  unit: ActiveUnit;
}

export function shownAbilitiesFor({
  dataset, entry, variant, unit,
}: ShownAbilitiesInput): Ability[] {
  const snapshot = unit.profileSnapshot?.innateAbilities ?? [];
  if (!dataset || !entry) return snapshot;

  /*
    The entry as this Warband fields it, BEFORE asking what it prints. A Variant
    renames, restats and swaps abilities, and asking the unapplied entry is
    asking about a model the player does not have.
  */
  const fielded = applyVariant(entry, variant);
  const printed = visibleAbilities(fielded, {
    dataset,
    variant,
    selections: modelSelections(unit),
    rosterSelections: [],
  });

  /*
    Everything the entry knows about — printed or not — so an ability the entry
    deliberately hides is not mistaken for one the campaign granted. Read off
    the applied entry, so a replaced ability counts under its new name.
  */
  const known = new Set((fielded.abilities ?? []).map((a) => key(a.name)));
  const shown = new Set(printed.map((a) => key(a.name)));

  const extras = snapshot.filter((a) => !known.has(key(a.name)));

  /*
    The snapshot's own copy wins where both have the ability, because it is what
    the roster holds and may carry a campaign's edits to the text; the entry
    decides only WHETHER it is printed.
  */
  const fromEntry = printed.map((a) => {
    const held = snapshot.find((s) => key(s.name) === key(a.name));
    return held ?? { id: a.id, name: a.name, description: a.description };
  });

  /* Order: the entry's, then whatever the roster added, which is how the card
     has always read — the model's kind first, then what happened to it. */
  return [...fromEntry.filter((a) => shown.has(key(a.name))), ...extras];
}
