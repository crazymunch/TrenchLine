/**
 * Whether a model may take one more of an item, and why not.
 *
 * `AddEquipmentModal` decided this with regexes over names — a second,
 * hand-written rules engine beside the derived one:
 *
 *     isBeast = /lion|dog|hound|beast/i.test(unitProfileName)   -> equips nothing
 *     isHeavyConstruct = /brazen|golem|mamluk|mechanized/i.test(unitProfileName)
 *     isHeavySpecialWeapon = /titan|cannon|autocannon/i.test(w.name)
 *     if (isHeavySpecialWeapon && !isHeavyConstruct) return false;
 *
 * Those last two hid the Titan Zulfiqar from a Takwin Homunculus: the weapon
 * matches `/titan/`, the model does not match `/brazen|golem|mamluk|mechanized/`,
 * and the filter is permanently on. So a Homunculus with Gargantuan Size —
 * which the catalogue explicitly reveals that weapon to — could not be offered
 * it, even after the validator was taught to allow it.
 *
 * This asks the same questions the validator asks, from the same data, so a
 * greyed-out button and a legality error can never disagree. Two of them:
 *
 *   may this model take the entry at all   `onlyForVerdict`, against the
 *                                          armoury row's "X only" and the
 *                                          catalogue's own `unlockedBy`
 *   would one more break a carrying limit  `battlekitBreaches`, over what the
 *                                          model already has plus the candidate
 */
import type { Dataset } from '@/types/catalogue';
import { restrictionsFor, type Armoury } from './armoury';
import { parseRestrictions, onlyForVerdict } from './restrictions';
import { battlekitBreaches, type Carried } from './battlekitLimits';

export interface EquipVerdict {
  allowed: boolean;
  /** The published sentence that forbids it, for the tooltip. */
  reason?: string;
  /**
   * A condition in the restriction that the roster cannot answer.
   *
   * The button stays enabled — see `onlyForVerdict`, refusing on an unreadable
   * condition would make a legal item unbuyable by anyone — but the player is
   * told what they are being trusted with. Silence here is the RC-06 bug.
   */
  caveat?: string;
}

export interface EquipContext {
  dataset: Dataset;
  armoury?: Armoury;
  /** What the model is carrying already. */
  carried: Carried[];
  /** The model, for the "X only" question. */
  unit: { name: string; keywords?: string[]; roles?: string[] };
  /** Formulae, advancements and innate abilities — see `traitsOf`. */
  traits?: string[];
  /**
   * What the player has CHOSEN for this model — see `chosenBy`.
   *
   * Separate from `traits` because `traits` carries the entry's own printed
   * abilities, and a restriction's "with X" clause asks what was bought, not
   * what the entry offers. See `onlyForVerdict`.
   */
  taken?: string[];
  extraLimb?: boolean;
}

/** Can this model take one more? */
export function canEquip(
  item: { id?: string; name: string },
  ctx: EquipContext,
): EquipVerdict {
  const ref = { id: item.id, name: item.name };

  /*
    "Brazen Bull only", "ELITE only". The catalogue's own `unlockedBy` is
    consulted through `onlyForVerdict`, which is what makes Gargantuan Size
    open the Titan Zulfiqar without anything here knowing either name.
  */
  const catalogueEntry = ctx.dataset.weapons.find(
    (w) => (item.id && w.id === item.id) || w.name === item.name);
  const caveats: string[] = [];
  for (const r of (ctx.armoury ? restrictionsFor(ctx.armoury, ref) : [])
    .flatMap((raw) => parseRestrictions(raw))) {
    if (r.kind !== 'onlyFor') continue;
    const verdict = onlyForVerdict(r.requires, ctx.unit, {
      selections: ctx.traits ?? [],
      unlockedBy: catalogueEntry?.unlockedBy,
      taken: ctx.taken,
    });
    if (!verdict.met) return { allowed: false, reason: r.raw };
    if (verdict.unknown) caveats.push(`${r.raw} — ${verdict.unknown}.`);
  }

  /*
    And the carrying limits, asked as "what changes if one more is added?" —
    so a model already over a limit for some other reason is not told it
    cannot take an unrelated item.
  */
  /* `ctx.unit.name` is the entry's name — see `unitProfileName` in
     AddEquipmentModal — which is what an unconditional carrying allowance is
     stated about. Without it the modal would refuse a Desecrated Saint its
     third arm while the validator allowed it. */
  const carrier = { ...ctx, modelName: ctx.unit.name };
  const before = battlekitBreaches(ctx.carried, carrier);
  const after = battlekitBreaches(
    [...ctx.carried, { name: item.name, weaponId: item.id }], carrier);
  if (after.length > before.length) {
    const fresh = after[after.length - 1];
    return { allowed: false, reason: fresh.raw };
  }

  return caveats.length
    ? { allowed: true, caveat: caveats.join(' ') }
    : { allowed: true };
}
