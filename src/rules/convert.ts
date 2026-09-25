/**
 * Moving one warband between rulesets, and saying what did not survive.
 *
 * RV-1. The app ships two rulesets and a switcher, and the switcher changes
 * which one the BROWSER is on — `docs/RULESET-MODEL.md` §8's diff, shown
 * before the change, so nobody is handed a Brazen Bull 15 Ducats cheaper with
 * no explanation. What it does not do is move a warband. A warband built under
 * TrenchLine Rules and opened on a device set to Latest GitHub was simply read
 * against the other one, which is the same silent substitution one layer down.
 *
 * So a warband records its own ruleset (`Warband.rulesetId`) and this module
 * is how it changes: every model, every piece of Battlekit and every purchased
 * option is re-resolved in the target, and the player is shown what is
 * **kept**, what is **changed** and what is **lost** before anything happens.
 *
 * ## Two phases, and nothing moves in the first
 *
 * `planConversion` computes and decides nothing. `applyConversion` takes that
 * plan and returns a new warband. A player who cancels has not changed a
 * Ducat, which is the same promise `RulesetSwitcher` already makes about the
 * app's setting.
 *
 * ## The money
 *
 * - **A price change moves no money.** The book does not re-charge a warband
 *   for a reprint, so a model that costs 5 more in the target is simply worth
 *   5 more; the Strongbox is untouched and the roster's recorded price is
 *   brought up to the target's, because that is what converting means.
 * - **A lost entry is refunded at its RECORDED price** — what the roster says
 *   was paid, not what the target charges, because the target charges nothing
 *   for a thing it does not have. One `conversion` ledger entry per lost
 *   thing, each naming what it was, so the history reads as the list of
 *   losses it is rather than as one unexplained credit.
 * - **A lost model's Battlekit goes to the stash**, at its recorded price. The
 *   gear did not stop existing because the model did; it is the player's, and
 *   the Arsenal is where a warband keeps gear nobody is holding.
 *
 * ## Resolution is by name first
 *
 * The join across two rulesets is the name, because that is what a player
 * reads and what survives a rebuild. An id is tried second and only where the
 * name found nothing: the two shipped rulesets are layered from the same
 * catalogues, so an entry the TrenchLine layer RENAMES still carries the same
 * id — and reporting that as a rename is strictly better for the player than
 * reporting it as a loss and refunding a model they still have.
 *
 * Ambiguity resolves to nothing, never to the first match. Six entries in the
 * shipped ruleset are called `Homunculus` (ID-1); a name that names six things
 * names none of them, and a conversion that guessed would move a Sultanate
 * model onto the Court's entry.
 */
import type { Dataset, Cost } from '../types/catalogue';
import type { UnitProfile as CatalogueUnit } from '../types/catalogue';
import type {
  ActiveUnit, StashedItem, Warband, EquippedWeapon, EquippedArmour, EquippedEquipment,
} from '../types/warband';
import { bookAll, type Movement } from './ledger';
import { nameKey } from './names';
import { recruitable } from './recruitable';
import { sameFaction } from './variants';
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
  /** Set on a lost MODEL: its Battlekit, which goes to the Arsenal. */
  toStash?: string[];
}

export interface ConversionPlan {
  /** The ruleset the warband records, or `null` where it records none. */
  from: string | null;
  to: string;
  kept: ConversionItem[];
  changed: ConversionItem[];
  lost: ConversionItem[];
  /** Everything the refunds add up to. */
  refund: Cost;
  /**
   * Set when the plan cannot be trusted and must not be applied.
   *
   * The one case today is a faction the target ruleset does not carry, which
   * would report every model as lost and refund the whole warband. That is
   * not a conversion, it is a deletion with a receipt, so it is refused.
   */
  refusal?: string;
}

const ZERO: Cost = { ducats: 0, glory: 0 };
const addCost = (a: Cost, b: Cost): Cost =>
  ({ ducats: a.ducats + b.ducats, glory: a.glory + b.glory });
const sameCost = (a: Cost, b: Cost) => a.ducats === b.ducats && a.glory === b.glory;
const isZero = (c: Cost) => c.ducats === 0 && c.glory === 0;

export const costLabel = (c: Cost): string =>
  [c.ducats ? `${c.ducats} Ducats` : null, c.glory ? `${c.glory} Glory` : null]
    .filter(Boolean).join(' + ') || 'free';

/* ----------------------------------------------------------- the resolvers */

/** The single candidate carrying one of these names, or nothing. See the header. */
function uniqueByName<T>(list: T[], nameOf: (x: T) => string, keys: string[]): T | undefined {
  for (const key of keys) {
    if (!key) continue;
    const hits = list.filter((x) => nameKey(nameOf(x)) === key);
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) return undefined;
  }
  return undefined;
}

/** What a warband's gear can be resolved against in one ruleset. */
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
 * Name within the faction first (what makes a name unique), then name alone
 * where exactly one entry carries it (a Mercenary sits on a roster whose
 * faction is not its own), then the recorded id. See the header on why the id
 * is last and why it is there at all.
 */
function targetUnit(
  units: CatalogueUnit[],
  warband: Warband,
  unit: ActiveUnit,
): CatalogueUnit | undefined {
  const keys = [unit.profileSnapshot?.name, unit.customName]
    .map(nameKey).filter(Boolean);
  const mine = units.filter((u) => sameFaction(u.factionId, warband.factionId));
  const byName = uniqueByName(mine, (u) => u.name, keys)
    ?? uniqueByName(units, (u) => u.name, keys);
  if (byName) return byName;

  const id = unit.baseProfileId;
  if (!id) return undefined;
  return units.find((u) => u.entryId === id) ?? units.find((u) => u.id === id);
}

/** The statline and price fields a player is shown, from a catalogue entry. */
const unitFields = (u: CatalogueUnit): Record<string, string> => ({
  Cost: costLabel(u.cost),
  Movement: u.stats?.movement ?? '—',
  Ranged: u.stats?.ranged ?? '—',
  Melee: u.stats?.melee ?? '—',
  Armour: u.stats?.armour ?? '—',
});

/** The same fields, read off the roster's own snapshot of what it bought. */
const snapshotFields = (unit: ActiveUnit): Record<string, string> => ({
  Cost: costLabel({
    ducats: unit.profileSnapshot?.baseCost ?? 0,
    glory: unit.profileSnapshot?.gloryCost ?? 0,
  }),
  Movement: unit.profileSnapshot?.stats?.movement ?? '—',
  Ranged: unit.profileSnapshot?.stats?.ranged ?? '—',
  Melee: unit.profileSnapshot?.stats?.melee ?? '—',
  Armour: unit.profileSnapshot?.stats?.armour ?? '—',
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
    kept: [], changed: [], lost: [], refund: ZERO,
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

  const factions = (to.factions ?? []);
  if (!factions.some((f) => sameFaction(f.id ?? f.name, warband.factionId))) {
    plan.refusal = `${plan.to} carries no ${warband.factionId} faction, so every model in this `
      + 'warband would be reported as lost. That is not a conversion, so nothing is offered.';
    return plan;
  }

  const shelf = shelfFor(to, warband);
  const file = (item: ConversionItem) => {
    if (item.refund) {
      plan.lost.push(item);
      plan.refund = addCost(plan.refund, item.refund);
    } else if (item.changes.length) plan.changed.push(item);
    else plan.kept.push(item);
  };

  for (const unit of warband.units ?? []) {
    const label = unit.customName || unit.profileSnapshot?.name || 'a model';
    const entry = targetUnit(to.units ?? [], warband, unit);

    if (!entry) {
      /*
        The model's own price and everything bought ONTO it that is not
        Battlekit. The Battlekit is not refunded — it goes to the Arsenal,
        which is where a warband keeps gear nobody is holding, and refunding
        it as well would pay the player twice for the same thing.
      */
      const options = (unit.specialUpgrades ?? [])
        .reduce((sum, o) => sum + (o.cost ?? 0), 0);
      file({
        kind: 'model',
        ref: unit.id,
        where: label,
        name: unit.profileSnapshot?.name || label,
        changes: [],
        refund: {
          ducats: (unit.profileSnapshot?.baseCost ?? 0) + options,
          glory: unit.profileSnapshot?.gloryCost ?? 0,
        },
        toStash: [
          ...unit.equippedWeapons ?? [],
          ...unit.equippedArmour ?? [],
          ...unit.equippedEquipment ?? [],
        ].map((g) => g.name),
      });
      continue;
    }

    const renamed = nameKey(entry.name) !== nameKey(unit.profileSnapshot?.name ?? '');
    const changes = fieldDiff(snapshotFields(unit), unitFields(entry));
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
      file(planGear('weapon', w.instanceId, label, w.name, { ducats: w.cost, glory: w.gloryCost ?? 0 },
        shelf.weapons.map((x) => ({ name: x.name, cost: { ducats: x.cost, glory: x.gloryCost ?? 0 } }))));
    }
    for (const a of unit.equippedArmour ?? []) {
      file(planGear('armour', a.instanceId, label, a.name, { ducats: a.cost, glory: a.gloryCost ?? 0 },
        shelf.armour.map((x) => ({ name: x.name, cost: { ducats: x.cost, glory: x.gloryCost ?? 0 } }))));
    }
    for (const e of unit.equippedEquipment ?? []) {
      file(planGear('equipment', e.instanceId, label, e.name, { ducats: e.cost, glory: e.gloryCost ?? 0 },
        shelf.equipment.map((x) => ({ name: x.name, cost: { ducats: x.cost, glory: x.gloryCost ?? 0 } }))));
    }
    for (const o of unit.specialUpgrades ?? []) {
      file(planGear('option', `${unit.id}::${o.name}`, label, o.name, { ducats: o.cost ?? 0, glory: 0 },
        (entry.options ?? []).map((x) => ({ name: x.name, cost: x.cost }))));
    }
  }

  for (const s of warband.armoryStash ?? []) {
    const shelves = [
      ...shelf.weapons.map((x) => ({ name: x.name, cost: { ducats: x.cost, glory: x.gloryCost ?? 0 } })),
      ...shelf.armour.map((x) => ({ name: x.name, cost: { ducats: x.cost, glory: x.gloryCost ?? 0 } })),
      ...shelf.equipment.map((x) => ({ name: x.name, cost: { ducats: x.cost, glory: x.gloryCost ?? 0 } })),
    ];
    file(planGear('stash', s.id, 'Arsenal', s.name, stashPrice(s), shelves));
  }

  return plan;
}

/**
 * One piece of gear, or one option, against the target's shelf.
 *
 * Priced from the target where it survives, refunded at the roster's recorded
 * price where it does not — the two halves of the money rule in one place, so
 * a weapon, a suit of armour, a piece of equipment and a purchased option
 * cannot drift apart.
 */
function planGear(
  kind: ConversionKind,
  ref: string,
  where: string,
  name: string,
  recorded: Cost,
  shelf: { name: string; cost: Cost }[],
): ConversionItem {
  const hit = uniqueByName(shelf, (x) => x.name, [nameKey(name)]);
  if (!hit) return { kind, ref, where, name, changes: [], refund: recorded };
  if (sameCost(hit.cost, recorded)) return { kind, ref, where, name, changes: [] };
  return {
    kind, ref, where, name,
    changes: [{ field: 'Cost', from: costLabel(recorded), to: costLabel(hit.cost) }],
  };
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

  const stash: StashedItem[] = [...(warband.armoryStash ?? [])]
    .filter((s) => !lost.has(s.id));

  const units: ActiveUnit[] = [];

  for (const unit of warband.units ?? []) {
    if (lost.has(unit.id)) {
      /* The model goes; its Battlekit is the player's and lands in the Arsenal
         at the price the roster recorded for it. */
      for (const g of [
        ...unit.equippedWeapons ?? [],
        ...unit.equippedArmour ?? [],
        ...unit.equippedEquipment ?? [],
      ]) {
        /* `price` is the authority and carries both currencies; the legacy
           `cost`/`currency` pair is kept in step with it so a reader that
           still uses only those does not see a Glory item priced at 0. */
        const price = { ducats: g.cost ?? 0, glory: g.gloryCost ?? 0 };
        const glorySeller = price.glory > 0 && price.ducats === 0;
        stash.push({
          id: `stash-conv-${g.instanceId}`,
          name: g.name,
          type: typeOf(unit, g.instanceId),
          cost: glorySeller ? price.glory : price.ducats,
          currency: glorySeller ? 'glory' : 'ducats',
          price,
          quantity: 1,
        });
      }
      continue;
    }

    const entry = targetUnit(to.units ?? [], warband, unit);

    const weapons = (unit.equippedWeapons ?? []).filter((w) => !lost.has(w.instanceId))
      .map((w) => repriceWeapon(w, shelf));
    const armour = (unit.equippedArmour ?? []).filter((a) => !lost.has(a.instanceId))
      .map((a) => repriceArmour(a, shelf));
    const equipment = (unit.equippedEquipment ?? []).filter((e) => !lost.has(e.instanceId))
      .map((e) => repriceEquipment(e, shelf));
    const options = (unit.specialUpgrades ?? [])
      .filter((o) => !lost.has(`${unit.id}::${o.name}`)).map((o) => {
      const hit = uniqueByName(entry?.options ?? [], (x) => x.name, [nameKey(o.name)]);
      return hit ? { ...o, cost: hit.cost.ducats } : o;
    });

    /*
      The snapshot becomes the target's entry, keeping the things the ROSTER
      owns and the catalogue does not: the player's nomination of a Leader,
      and the name they typed. Everything else — the statline, the price, the
      keywords — is what converting means.
    */
    const snapshot = entry
      ? {
        ...unit.profileSnapshot,
        id: entry.entryId ?? entry.id,
        name: entry.name,
        baseCost: entry.cost.ducats,
        gloryCost: entry.cost.glory || undefined,
        stats: {
          movement: entry.stats.movement,
          ranged: entry.stats.ranged,
          melee: entry.stats.melee,
          armour: entry.stats.armour,
          keywords: entry.keywords,
        },
      }
      : unit.profileSnapshot;

    units.push({
      ...unit,
      baseProfileId: entry ? (entry.entryId ?? entry.id) : unit.baseProfileId,
      profileSnapshot: snapshot,
      equippedWeapons: weapons,
      equippedArmour: armour,
      equippedEquipment: equipment,
      specialUpgrades: options,
      totalCost: (snapshot?.baseCost ?? 0)
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

const repriceWeapon = (w: EquippedWeapon, shelf: Shelf): EquippedWeapon => {
  const hit = uniqueByName(shelf.weapons, (x) => x.name, [nameKey(w.name)]);
  return hit ? { ...hit, instanceId: w.instanceId } : w;
};

const repriceArmour = (a: EquippedArmour, shelf: Shelf): EquippedArmour => {
  const hit = uniqueByName(shelf.armour, (x) => x.name, [nameKey(a.name)]);
  return hit ? { ...hit, instanceId: a.instanceId } : a;
};

const repriceEquipment = (e: EquippedEquipment, shelf: Shelf): EquippedEquipment => {
  const hit = uniqueByName(shelf.equipment, (x) => x.name, [nameKey(e.name)]);
  return hit ? { ...hit, instanceId: e.instanceId } : e;
};

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
