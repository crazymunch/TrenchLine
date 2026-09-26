/**
 * Moving one warband between rulesets, and saying what did not survive.
 *
 * RV-1. The switcher in `RulesetSwitcher` changes which ruleset **this
 * browser** reads — `docs/RULESET-MODEL.md` §8's diff, shown before the
 * change, so nobody is handed a Brazen Bull 15 Ducats cheaper with no
 * explanation. What it does not do is move a warband. A warband built on a
 * laptop set to *TrenchLine Rules* and opened on a phone set to *Latest
 * GitHub* was simply read against the other one: the same silent substitution
 * one layer down.
 *
 * So a warband records its own ruleset (`Warband.rulesetId`) and this module
 * is how it changes: every model, every piece of Battlekit and every
 * purchased option is re-resolved in the target, and the player is shown what
 * is **kept**, **changed**, **unresolved** and **lost** before anything
 * happens.
 *
 * ## Two phases, and nothing moves in the first
 *
 * `planConversion` computes and decides nothing. `applyConversion` takes that
 * plan and returns a new warband. A player who cancels has not changed a
 * Ducat, which is the same promise `RulesetSwitcher` already makes about the
 * app's setting.
 *
 * ## Everything is resolved against what this WARBAND can field
 *
 * Not against `dataset.units` and `dataset.weapons` raw. `recruitable` is
 * what applies the Warband Variant, and a Variant renames and restats: the
 * Procession's `Leper-Knight` IS the `Lazarist Castigator` with +2 DICE
 * rather than +1, the House of Wisdom's `Fāris` is the `Janissary`, a Dirge
 * of the Great Hegemon `Bereaved` is the `Thrall`. Resolving against the raw
 * list turned every one of those back into its base entry — and did it while
 * converting a warband to the ruleset it was **already on**, which is the
 * shape of a bug that quietly rewrites a roster nobody asked to change.
 *
 * Gear is looked for on the same three shelves the Trench Companion importer
 * uses, in the same order, because a model can hold an item by three
 * different routes and only one of them is the Armoury Table:
 *
 *  1. **this faction's Armoury** (Variant applied, and including the tables a
 *     Variant rule opens — the House of Wisdom's *Weapon Collections*);
 *  2. **the model's own entry options**, which is where a Praetor's
 *     `Alchemical Armour` and every Formula live;
 *  3. **the catalogue's Battlekit**, for an entry that is real but that this
 *     faction's table does not stock — a `Grail Devotee` is one.
 *
 * Resolving against the Armoury alone declared all three of those lost and
 * refunded them, which is a conversion paying a player for gear they still
 * have.
 *
 * ## Resolution is by name first
 *
 * The join across two rulesets is the name, because that is what a player
 * reads and what survives a rebuild. An id is tried second and only where the
 * name found nothing: the two shipped rulesets are layered from the same
 * catalogues, so an entry a layer RENAMES still carries the same id, and
 * reporting that as a rename beats reporting it as a loss and refunding a
 * model the player still has.
 *
 * **The player's own name is not a key.** `customName` is what they typed; a
 * Bereaved a player called `Weeper` is not the Weeper entry, and matching on
 * it turned a nickname into a different model.
 *
 * **Ambiguity is never a loss.** A name that names two entries resolves to
 * neither — six entries in the shipped ruleset are called `Homunculus`
 * (ID-1) — and the thing is **kept at its recorded price** and reported as
 * unresolved. Refunding it would pay a player for something the target
 * plainly still has.
 *
 * ## The money
 *
 * - **A price change moves no money.** The book does not re-charge a warband
 *   for a reprint. The Strongbox is untouched; what the roster is *worth*
 *   moves, because that is what converting means.
 * - **A lost entry is refunded at its recorded price** — what the roster says
 *   was paid, not what the target charges, because the target charges nothing
 *   for a thing it does not have. One `conversion` ledger entry per lost
 *   thing, all booked against the same game so a reversal takes the whole
 *   conversion.
 * - **Nothing that cost nothing is refunded or re-priced.** A `grantedFree`
 *   model, a Golem's free Formula, forced kit: the roster records what was
 *   PAID, and zero means no money moved. Refunding zero-cost gear would
 *   invent Ducats; re-pricing it would charge a player for something they
 *   were given.
 * - **A lost stash line is refunded per item held.** `buyToStash` raises
 *   `quantity` rather than appending a second row, so a line of three
 *   Molotovs is three Molotovs.
 * - **A lost model's Battlekit goes to the Arsenal**, not into the refund.
 */
import type { Dataset, Cost } from '../types/catalogue';
import type {
  ActiveUnit, StashedItem, Warband, EquippedWeapon, EquippedArmour, EquippedEquipment,
} from '../types/warband';
import type { UnitProfile } from '../types/rules';
import { bookAll, type Movement } from './ledger';
import { nameKey } from './names';
import { recruitable } from './recruitable';
import { sameFaction } from './variants';
import { catalogueUnitFor } from './catalogueUnit';
import { stashPrice } from '../types/warband';

/* -------------------------------------------------------------- the report */

/** One field that reads differently in the target. Both values, as printed. */
export interface ConversionChange {
  field: string;
  from: string;
  to: string;
}

export type ConversionKind = 'model' | 'weapon' | 'armour' | 'equipment' | 'option' | 'stash';

export interface ConversionItem {
  kind: ConversionKind;
  /**
   * The handle `applyConversion` matches on: the model's `id`, a piece of
   * Battlekit's `instanceId`, `<model id>::<option name>`, or a stashed
   * item's `id`.
   *
   * Not the name, and not the name paired with the model's. Two `Heretic
   * Trooper`s on one roster share both, so a plan keyed by name would take
   * the second off the roster along with the first — a conversion deleting a
   * model it had just reported as kept.
   */
  ref: string;
  /** The model this belongs to, or `'Arsenal'` for the stash. */
  where: string;
  /** The name the roster records. */
  name: string;
  /** The name the target gives it, where the two differ. */
  becomes?: string;
  /** Set on a `changed` entry. Empty means kept unchanged. */
  changes: ConversionChange[];
  /** Set on a `lost` entry: what comes back, at the recorded price. */
  refund?: Cost;
  /** Set on an `unresolved` entry: why the target could not answer. */
  why?: string;
  /** Set on a lost MODEL: its Battlekit, which goes to the Arsenal. */
  toStash?: string[];
}

export interface ConversionPlan {
  /** The ruleset the warband records, or `null` where it records none. */
  from: string | null;
  to: string;
  kept: ConversionItem[];
  changed: ConversionItem[];
  /**
   * Kept at its recorded price, because the target's answer was not one
   * answer. An ambiguous name is not a loss: the entry is plainly still
   * there, we simply cannot say which of them it is.
   */
  unresolved: ConversionItem[];
  lost: ConversionItem[];
  /** Everything the refunds add up to. */
  refund: Cost;
  /**
   * Set when the plan cannot be trusted and must not be applied.
   *
   * A faction the target ruleset does not carry would report every model as
   * lost and refund the whole warband. That is not a conversion, it is a
   * deletion with a receipt, so it is refused.
   */
  refusal?: string;
}

const ZERO: Cost = { ducats: 0, glory: 0 };
const addCost = (a: Cost, b: Cost): Cost =>
  ({ ducats: a.ducats + b.ducats, glory: a.glory + b.glory });
const scaleCost = (c: Cost, by: number): Cost =>
  ({ ducats: c.ducats * by, glory: c.glory * by });
const sameCost = (a: Cost, b: Cost) => a.ducats === b.ducats && a.glory === b.glory;
const isZero = (c: Cost) => c.ducats === 0 && c.glory === 0;

export const costLabel = (c: Cost): string =>
  [c.ducats ? `${c.ducats} Ducats` : null, c.glory ? `${c.glory} Glory` : null]
    .filter(Boolean).join(' + ') || 'free';

/* ----------------------------------------------------------- the resolvers */

/**
 * What the target had to say about a name: one entry, none, or several.
 *
 * Three outcomes rather than `T | undefined`, because "none" and "several"
 * lead opposite ways — one is a loss and a refund, the other is a thing the
 * target plainly still has and must not be refunded.
 */
type Lookup<T> =
  | { kind: 'one'; hit: T }
  | { kind: 'none' }
  | { kind: 'many' };

/**
 * By name, and then — only where no name answered at all — by the other names
 * the catalogue prints the same entry under.
 *
 * `aliases` is the containing `selectionEntry`'s name where it differs from
 * the profile's: the Iron Sultanate's `Elixer of Al-Khidr` wrapping a profile
 * called `Elixir of Al-Khidr`. A conversion that could not find the second
 * spelling reported the item LOST and refunded it, which is worse than either
 * answer — the ruleset has the item, under a name of its own.
 *
 * Names first, and `many` stops the search: an ambiguous name is still
 * ambiguous, and an alias must not be allowed to pick a winner between two
 * entries that both hold the name outright.
 */
function byName<T>(list: T[], nameOf: (x: T) => string, keys: string[]): Lookup<T> {
  const pass = (namesOf: (x: T) => string[]): Lookup<T> => {
    for (const key of keys) {
      if (!key) continue;
      const hits = list.filter((x) => namesOf(x).some((n) => nameKey(n) === key));
      if (hits.length === 1) return { kind: 'one', hit: hits[0] };
      if (hits.length > 1) return { kind: 'many' };
    }
    return { kind: 'none' };
  };
  const byOwnName = pass((x) => [nameOf(x)]);
  if (byOwnName.kind !== 'none') return byOwnName;
  return pass((x) => (x as { aliases?: string[] }).aliases ?? []);
}

/** The single candidate carrying one of these names, or nothing. */
const oneByName = <T>(list: T[], nameOf: (x: T) => string, keys: string[]): T | undefined => {
  const found = byName(list, nameOf, keys);
  return found.kind === 'one' ? found.hit : undefined;
};

/** What a warband can field and buy in one ruleset, with its Variant applied. */
type Shelf = ReturnType<typeof recruitable>;

const shelfFor = (dataset: Dataset, warband: Warband): Shelf => recruitable(
  dataset,
  warband.factionId,
  (dataset.factions ?? []).map((f) => f.id ?? f.name),
  warband.variantId,
);

/**
 * The target's entry for one of the warband's models.
 *
 * Against the RECRUITABLE list, which is the one carrying the Variant's
 * renames and restats — see the header. The roster's own snapshot name
 * first, restricted to the faction (what makes a name unique); then the name
 * alone where exactly one entry carries it, because a Mercenary sits on a
 * roster whose faction is not its own; then the recorded id.
 *
 * `customName` is deliberately absent: it is the player's nickname, not a
 * claim about which entry this is.
 */
function targetUnit(
  units: UnitProfile[],
  warband: Warband,
  unit: ActiveUnit,
): UnitProfile | undefined {
  const keys = [nameKey(unit.profileSnapshot?.name)].filter(Boolean);
  const mine = units.filter((u) => sameFaction(u.factionId, warband.factionId));
  const named = oneByName(mine, (u) => u.name, keys) ?? oneByName(units, (u) => u.name, keys);
  if (named) return named;

  const id = unit.baseProfileId;
  return id ? units.find((u) => u.id === id) : undefined;
}

/** What the roster records a model cost. */
const recordedUnitCost = (unit: ActiveUnit): Cost => ({
  ducats: unit.profileSnapshot?.baseCost ?? 0,
  glory: unit.profileSnapshot?.gloryCost ?? 0,
});

/** What the target charges for an entry. */
const offeredUnitCost = (u: UnitProfile): Cost =>
  ({ ducats: u.baseCost ?? 0, glory: u.gloryCost ?? 0 });

/** The statline and price fields a player is shown. */
const unitFields = (cost: Cost, stats: UnitProfile['stats'] | undefined) => ({
  Cost: costLabel(cost),
  Movement: stats?.movement ?? '—',
  Ranged: stats?.ranged ?? '—',
  Melee: stats?.melee ?? '—',
  Armour: stats?.armour ?? '—',
});

const fieldDiff = (
  from: Record<string, string>,
  to: Record<string, string>,
): ConversionChange[] =>
  Object.keys(to)
    .filter((k) => from[k] !== to[k])
    .map((field) => ({ field, from: from[field] ?? '—', to: to[field] ?? '—' }));

/* ------------------------------------------------------------- the planner */

/**
 * What converting this warband to `to` would do. Nothing is changed.
 *
 * `from` is the dataset the warband was built against, where the caller has
 * it. It is used only to name the ruleset in the report — the comparison is
 * between what the ROSTER records and what the target says, because the
 * roster is the thing being converted and a dataset that has been rebuilt
 * since is not what the player bought.
 */
export function planConversion(
  warband: Warband,
  to: Dataset,
  from?: Dataset | null,
): ConversionPlan {
  const plan: ConversionPlan = {
    from: warband.rulesetId ?? from?.meta?.rulesetId ?? null,
    to: to.meta?.rulesetId ?? '',
    kept: [], changed: [], unresolved: [], lost: [], refund: ZERO,
  };

  /*
    A dataset that does not name itself cannot be converted TO.

    `applyConversion` writes `plan.to` onto the warband as its new
    `rulesetId`, and a warband recording a ruleset that is not a ruleset is
    worse than one recording none: the mismatch bar would offer to convert it
    for ever, against nothing. Refused rather than given a placeholder.
  */
  if (!plan.to) {
    plan.refusal = 'That ruleset does not say which ruleset it is '
      + '(`meta.rulesetId` is missing), so a warband cannot record having been '
      + 'converted to it. Rebuild it with `npm run rules:build`.';
    return plan;
  }

  if (!(to.factions ?? []).some((f) => sameFaction(f.id ?? f.name, warband.factionId))) {
    plan.refusal = `${plan.to} carries no ${warband.factionId} faction, so every model in this `
      + 'warband would be reported as lost. That is not a conversion, so nothing is offered.';
    return plan;
  }

  const shelf = shelfFor(to, warband);
  const file = (item: ConversionItem) => {
    if (item.refund) {
      plan.lost.push(item);
      plan.refund = addCost(plan.refund, item.refund);
    } else if (item.why) plan.unresolved.push(item);
    else if (item.changes.length) plan.changed.push(item);
    else plan.kept.push(item);
  };

  for (const unit of warband.units ?? []) {
    const label = unit.customName || unit.profileSnapshot?.name || 'a model';
    const entry = targetUnit(shelf.units, warband, unit);
    const recorded = recordedUnitCost(unit);

    if (!entry) {
      /*
        The model's own price and everything bought ONTO it that is not
        Battlekit. The Battlekit is not refunded — it goes to the Arsenal,
        which is where a warband keeps gear nobody is holding, and refunding
        it as well would pay the player twice for the same thing.

        A model the Warband was GIVEN refunds nothing: `grantedFree` says a
        rule put it on the roster at no cost, and there is no money to give
        back. See `ActiveUnit.grantedFree`.
      */
      const free = Boolean(unit.grantedFree);
      const options = (unit.specialUpgrades ?? [])
        .reduce((sum, o) => addCost(sum, recordedOptionCost(o)), ZERO);
      const refund = free ? ZERO : addCost(recorded, options);
      file({
        kind: 'model',
        ref: unit.id,
        where: label,
        name: unit.profileSnapshot?.name || label,
        changes: [],
        /* A lost model with nothing to give back is still lost, and still
           listed — `file` reads `refund` to decide, so it is always set. */
        refund,
        toStash: gearOf(unit).map((g) => g.name),
      });
      continue;
    }

    const renamed = nameKey(entry.name) !== nameKey(unit.profileSnapshot?.name ?? '');
    const changes = fieldDiff(
      unitFields(recorded, unit.profileSnapshot?.stats),
      unitFields(offeredUnitCost(entry), entry.stats),
    );
    file({
      kind: 'model',
      ref: unit.id,
      where: label,
      name: unit.profileSnapshot?.name || label,
      ...(renamed ? { becomes: entry.name } : {}),
      changes: renamed
        ? [{ field: 'Name', from: unit.profileSnapshot?.name ?? '—', to: entry.name }, ...changes]
        : changes,
    });

    for (const w of unit.equippedWeapons ?? []) {
      file(planGear('weapon', w.instanceId, label, heldGear(w),
        gearShelves(to, shelf, warband, unit, 'weapon')));
    }
    for (const a of unit.equippedArmour ?? []) {
      file(planGear('armour', a.instanceId, label, heldGear(a),
        gearShelves(to, shelf, warband, unit, 'armour')));
    }
    for (const e of unit.equippedEquipment ?? []) {
      file(planGear('equipment', e.instanceId, label, heldGear(e),
        gearShelves(to, shelf, warband, unit, 'equipment')));
    }
    for (const o of unit.specialUpgrades ?? []) {
      file(planGear('option', `${unit.id}::${o.name}`, label, {
        name: o.name,
        cost: recordedOptionCost(o),
        /* An option records a Ducat number and, since FORM-3, a `price` when
           the screen that bought it passed one. Where it did not, the Glory
           half is UNKNOWN rather than zero, and is not compared. */
        compare: optionRecordsGlory(o) ? 'both' : 'ducats',
      }, gearShelves(to, shelf, warband, unit, 'option')));
    }
  }

  for (const s of warband.armoryStash ?? []) {
    file(planGear('stash', s.id, 'Arsenal', {
      name: s.name,
      cost: stashPrice(s),
      /* `buyToStash` raises `quantity` rather than appending a row, so a line
         of three is three purchases and three refunds. */
      quantity: Math.max(1, s.quantity ?? 1),
    }, gearShelves(to, shelf, warband, undefined, 'stash')));
  }

  return plan;
}

/* --------------------------------------------------------------- the gear */

/** Everything a model is holding, in one list. */
const gearOf = (unit: ActiveUnit): { name: string; instanceId: string; cost?: number;
  gloryCost?: number; grantedBy?: string; isCustom?: boolean }[] => [
  ...(unit.equippedWeapons ?? []),
  ...(unit.equippedArmour ?? []),
  ...(unit.equippedEquipment ?? []),
];

/** A named, priced thing in the target, whatever shelf it came off. */
interface Offer { name: string; cost: Cost }

/**
 * The three shelves a thing can be found on, in order.
 *
 * The Armoury first, because that is the only shelf that can answer "what
 * does it cost *this* warband" — the same item is priced differently by
 * different factions. Then the model's own entry options. Then the
 * catalogue's Battlekit, for an entry this faction's table does not stock.
 */
function gearShelves(
  dataset: Dataset,
  shelf: Shelf,
  warband: Warband,
  unit: ActiveUnit | undefined,
  kind: ConversionKind,
): Offer[][] {
  const armoury: Offer[] =
    kind === 'weapon' ? shelf.weapons.map(offerOf)
    : kind === 'armour' ? shelf.armour.map(offerOf)
    : kind === 'equipment' ? shelf.equipment.map(offerOf)
    : kind === 'stash' ? [
      ...shelf.weapons.map(offerOf), ...shelf.armour.map(offerOf), ...shelf.equipment.map(offerOf),
    ]
    : [];

  const entry = unit ? catalogueUnitFor(dataset, unit, warband.factionId) : undefined;
  const options: Offer[] = (entry?.options ?? []).map((o) => ({ name: o.name, cost: o.cost }));

  const battlekit: Offer[] = (dataset.weapons ?? []).map((w) => ({ name: w.name, cost: w.cost }));

  /* An option is looked for among the entry's options FIRST — that is where
     it was bought — and on the shelves afterwards, because a few things the
     importer files as an option are stocked items elsewhere. */
  return kind === 'option'
    ? [options, armoury, battlekit]
    : [armoury, options, battlekit];
}

const offerOf = (x: { name: string; cost: number; gloryCost?: number }): Offer =>
  ({ name: x.name, cost: { ducats: x.cost ?? 0, glory: x.gloryCost ?? 0 } });

/**
 * What the roster records a purchased option cost.
 *
 * `toggleUnitSpecialUpgrade` books `upgrade.price ?? { ducats: upgrade.cost,
 * glory: 0 }` and spreads the whole object onto the model, so a roster
 * written since FORM-3 carries the `Cost` the screen priced it at.
 * `Devouring Jaws` is the one option in the ruleset priced in Glory, and
 * reading only `cost` made it free.
 */
const recordedOptionCost = (o: { cost?: number }): Cost =>
  optionPrice(o) ?? { ducats: o.cost ?? 0, glory: 0 };

/**
 * The `Cost` an option carries, where one was recorded.
 *
 * `ActiveUnit.specialUpgrades` declares `{ id, name, cost, category }` and
 * `toggleUnitSpecialUpgrade` spreads the whole upgrade object onto the model,
 * `price` included. So the field is really there on a roster written since
 * FORM-3 and is simply not in the declared type — read once, here, rather
 * than cast at four call sites.
 */
const optionPrice = (o: object): Cost | undefined => {
  const p = (o as { price?: unknown }).price;
  return p && typeof p === 'object'
    && typeof (p as Cost).ducats === 'number' && typeof (p as Cost).glory === 'number'
    ? p as Cost
    : undefined;
};

/** Whether the roster's own record of an option says anything about Glory. */
const optionRecordsGlory = (o: object): boolean => optionPrice(o) !== undefined;

/** A piece of Battlekit on a model, as the plan needs to see it. */
const heldGear = (
  g: EquippedWeapon | EquippedArmour | EquippedEquipment,
): Recorded => ({
  name: g.name,
  cost: { ducats: g.cost ?? 0, glory: g.gloryCost ?? 0 },
  grantedBy: g.grantedBy,
  isCustom: g.isCustom,
});

/** One thing on a model or in the Arsenal, as the plan needs to see it. */
interface Recorded {
  name: string;
  cost: Cost;
  /** How many this line holds. Only the Arsenal keeps more than one. */
  quantity?: number;
  /** Which halves of the price the roster actually records. */
  compare?: 'both' | 'ducats';
  grantedBy?: string;
  isCustom?: boolean;
}

/**
 * One piece of gear, or one option, against the target's shelves.
 *
 * Priced from the target where it survives, refunded at the roster's recorded
 * price where it does not — the two halves of the money rule in one place, so
 * a weapon, a suit of armour, a piece of equipment, a purchased option and a
 * stash line cannot drift apart.
 */
function planGear(
  kind: ConversionKind,
  ref: string,
  where: string,
  held: Recorded,
  shelves: Offer[][],
): ConversionItem {
  const base = { kind, ref, where, name: held.name };
  const quantity = Math.max(1, held.quantity ?? 1);

  /*
    A custom entry is the player's own and is in no catalogue, so no ruleset
    can have an opinion about it. Kept exactly as it is.
  */
  if (held.isCustom) {
    return { ...base, changes: [], why: 'A custom entry, which no ruleset stocks. Kept as it is.' };
  }

  /*
    Nothing was paid for this, so there is nothing to refund and nothing to
    re-price. A grant, a free Formula on a Golem, forced kit: the roster
    records what was PAID, and a "free → 5 Ducats" line describes a charge
    that is not going to happen.
  */
  if (isZero(held.cost)) {
    return { ...base, changes: [] };
  }

  const keys = [nameKey(held.name)];
  for (const shelf of shelves) {
    const found = byName(shelf, (x) => x.name, keys);
    if (found.kind === 'none') continue;
    if (found.kind === 'many') {
      return {
        ...base,
        changes: [],
        why: `${held.name} names more than one entry in the target ruleset, so it is kept at `
          + `the ${costLabel(held.cost)} this roster records.`,
      };
    }
    const offered = found.hit.cost;
    const comparable: Cost = held.compare === 'ducats'
      /* The roster records no Glory for this line, so the target's Glory is
         not a change — it is a field the roster never had. */
      ? { ducats: offered.ducats, glory: held.cost.glory }
      : offered;
    if (sameCost(comparable, held.cost)) return { ...base, changes: [] };
    return {
      ...base,
      changes: [{ field: 'Cost', from: costLabel(held.cost), to: costLabel(comparable) }],
    };
  }

  return { ...base, changes: [], refund: scaleCost(held.cost, quantity) };
}

/* ------------------------------------------------------------ the applier */

/**
 * Carry out a plan.
 *
 * Returns a new warband; nothing is mutated. A plan carrying a `refusal` is
 * returned unchanged, because a caller that ignored the refusal is a caller
 * about to delete somebody's warband.
 *
 * The refunds are booked through `bookAll` as one act with one `game`, so a
 * player who reverses a conversion gets the whole of it back rather than one
 * lost model at a time.
 */
export function applyConversion(
  warband: Warband,
  plan: ConversionPlan,
  to: Dataset,
  /** The campaign game these entries belong to, so they reverse as a unit. */
  game = 1,
  at: string = new Date().toISOString(),
): Warband {
  if (plan.refusal) return warband;

  const shelf = shelfFor(to, warband);
  /* Matched by handle, never by name — see `ConversionItem.ref`. */
  const lost = new Set(plan.lost.map((l) => l.ref));
  /* Kept exactly as recorded: a custom entry, an ambiguous name, a thing that
     cost nothing. None of them is re-priced. */
  const asIs = new Set([
    ...plan.unresolved.map((u) => u.ref),
    ...plan.kept.filter((k) => !k.changes.length).map((k) => k.ref),
  ]);

  const stash: StashedItem[] = [...(warband.armoryStash ?? [])].filter((s) => !lost.has(s.id));

  const units: ActiveUnit[] = [];

  for (const unit of warband.units ?? []) {
    if (lost.has(unit.id)) {
      /* The model goes; its Battlekit is the player's and lands in the
         Arsenal at the price the roster recorded for it. */
      for (const g of gearOf(unit)) {
        const price = { ducats: g.cost ?? 0, glory: g.gloryCost ?? 0 };
        const gloryOnly = price.glory > 0 && price.ducats === 0;
        stash.push({
          id: `stash-conv-${g.instanceId}`,
          name: g.name,
          type: typeOf(unit, g.instanceId),
          /* `price` is the authority and carries both currencies; the legacy
             `cost`/`currency` pair is kept in step with it so a reader that
             uses only those does not see a Glory item priced at 0. */
          cost: gloryOnly ? price.glory : price.ducats,
          currency: gloryOnly ? 'glory' : 'ducats',
          price,
          quantity: 1,
        });
      }
      continue;
    }

    const entry = targetUnit(shelf.units, warband, unit);

    const weapons = (unit.equippedWeapons ?? []).filter((w) => !lost.has(w.instanceId))
      .map((w) => (asIs.has(w.instanceId) ? w : reprice(w, shelf.weapons)));
    const armour = (unit.equippedArmour ?? []).filter((a) => !lost.has(a.instanceId))
      .map((a) => (asIs.has(a.instanceId) ? a : reprice(a, shelf.armour)));
    const equipment = (unit.equippedEquipment ?? []).filter((e) => !lost.has(e.instanceId))
      .map((e) => (asIs.has(e.instanceId) ? e : reprice(e, shelf.equipment)));
    const options = (unit.specialUpgrades ?? [])
      .filter((o) => !lost.has(`${unit.id}::${o.name}`))
      .map((o) => {
        if (asIs.has(`${unit.id}::${o.name}`)) return o;
        const changed = plan.changed.find((c) => c.ref === `${unit.id}::${o.name}`);
        const entryOption = oneByName(
          catalogueUnitFor(to, unit, warband.factionId)?.options ?? [],
          (x) => x.name, [nameKey(o.name)]);
        return changed && entryOption ? { ...o, cost: entryOption.cost.ducats } : o;
      });

    /*
      The snapshot becomes the target's entry WHOLE, which is the same type
      the roster already stores. Building a five-field subset dropped
      `movementType`, `movementInches`, the base size, the keywords and the
      innate abilities — everything Play Mode, the legality engine and the
      print sheet read off a model.

      Only what the ROSTER owns survives: the player's nomination of a Leader,
      which is a decision about this warband and not a fact about the entry.
    */
    const snapshot = entry
      ? { ...entry, category: unit.profileSnapshot?.category ?? entry.category }
      : unit.profileSnapshot;

    /*
      A model the Warband was GIVEN still costs it nothing.

      `grantedFree` is what stops the roster charging for the model — the
      entry's own list price is re-priced through the snapshot like any other,
      because that is a fact about the entry, but the model contributes
      nothing to what the warband is worth. Its gear is still bought and
      still counted, which is the same split `fromWarband` makes.
    */
    const ownCost = unit.grantedFree ? 0 : snapshot?.baseCost ?? 0;

    units.push({
      ...unit,
      baseProfileId: entry ? entry.id : unit.baseProfileId,
      profileSnapshot: snapshot,
      equippedWeapons: weapons,
      equippedArmour: armour,
      equippedEquipment: equipment,
      specialUpgrades: options,
      totalCost: ownCost
        + weapons.reduce((s, w) => s + (w.cost ?? 0), 0)
        + armour.reduce((s, a) => s + (a.cost ?? 0), 0)
        + equipment.reduce((s, e) => s + (e.cost ?? 0), 0)
        + options.reduce((s, o) => s + (o.cost ?? 0), 0),
    });
  }

  const movements: Movement[] = plan.lost
    .filter((l) => l.refund && !isZero(l.refund))
    .map((l) => ({
      reason: 'conversion' as const,
      ducats: l.refund!.ducats,
      glory: l.refund!.glory,
      game,
      note: l.kind === 'model'
        ? `${l.name} refunded: ${plan.to} has no such entry.`
        : `${l.name} refunded from ${l.where}: ${plan.to} has no such entry.`,
    }));

  const converted: Warband = {
    ...warband,
    rulesetId: plan.to,
    units,
    armoryStash: stash,
    updatedAt: at,
    editedAt: at,
  };

  return bookAll(converted, movements, at);
}

/** Which list an instance came off, so it is stashed as the right kind. */
function typeOf(unit: ActiveUnit, instanceId: string): StashedItem['type'] {
  if ((unit.equippedWeapons ?? []).some((w) => w.instanceId === instanceId)) return 'Weapon';
  if ((unit.equippedArmour ?? []).some((a) => a.instanceId === instanceId)) return 'Armour';
  return 'Equipment';
}

/**
 * The same item at the target's price, where the target's Armoury stocks it.
 *
 * Only the Armoury: it is the only shelf that prices an item for THIS
 * warband. Anything the plan resolved elsewhere — an entry option, a
 * catalogue entry the table does not stock — keeps what the roster records,
 * because there is no per-warband price to move it to.
 */
function reprice<T extends EquippedWeapon | EquippedArmour | EquippedEquipment>(
  item: T,
  shelf: { name: string; cost: number; gloryCost?: number }[],
): T {
  const hit = oneByName(shelf, (x) => x.name, [nameKey(item.name)]);
  return hit ? { ...item, ...hit, instanceId: item.instanceId } as T : item;
}

/* --------------------------------------------------------------- the prompt */

/**
 * Whether the open warband's ruleset is not the one the app is set to.
 *
 * `null` — no bar — in two cases that look alike and are not: the two agree,
 * and the warband records nothing. A warband saved before `rulesetId` existed
 * has no answer, and offering to convert one that may already be correct puts
 * a decision in front of a player who has no way to make it.
 */
export function rulesetMismatch(
  warband: Pick<Warband, 'rulesetId'> | null | undefined,
  appRulesetId: string,
): { warbandRulesetId: string; appRulesetId: string } | null {
  const mine = warband?.rulesetId;
  if (!mine || mine === appRulesetId) return null;
  return { warbandRulesetId: mine, appRulesetId };
}
