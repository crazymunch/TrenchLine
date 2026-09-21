/**
 * What Alchemical Formulae a model may buy, at what price, and what refuses.
 *
 * FD-13a item 2. Four rules decide one screen, and until now none of them had
 * a caller: the tab is where they meet.
 *
 * 1. **Which entries are Formulae.** The model's own catalogue options,
 *    filtered by `isAlchemicalFormula` — which reads `groupPath` since
 *    FORM-1, so an `Eye Options` sub-group counts as the parent group it
 *    sits under.
 * 2. **What each one requires and refuses.** `formulaVerdict`, read from the
 *    Formula's own published sentence and resolved against the Formulae this
 *    model's entry offers (FORM-2, FORM-4).
 * 3. **The Golem's free allowance.** *"It has the Human Hands Alchemical
 *    Formula, plus Alchemical Formulas worth a total of up to 50 👑 for free
 *    (you do not have to pay for the Formulas that you choose)"* — spent
 *    before the Strongbox, `golemGrant` and `freeFormulaBudgetLeft`.
 * 4. **The dead Alchemist.** *"If a Takwin Homunculus associated Alchemist is
 *    killed during the campaign … no Alchemical Formulas can be applied to
 *    it"* — `takwinRestrictions`.
 *
 * Here rather than in the component, because a component has no test in this
 * repository and every one of these four is a rules question with an answer
 * a player will dispute at a table.
 *
 * ## A reading, recorded where it acts
 *
 * The Book of Golems row ends *"The model is treated as an Ally that can
 * never be Promoted or receive additional Alchemical Formulas."* Read here as:
 * the free budget is the Golem's WHOLE Formula allowance, and once it will
 * not stretch to a Formula, that Formula is refused rather than offered for
 * Ducats. "Additional" is additional to what the grant gives, and the grant
 * gives a budget; a Golem that could simply pay for more would make the
 * sentence say nothing.
 *
 * The alternative reading — that a Golem may never buy a Formula after the
 * moment of creation, free budget included — needs a founding lock the app
 * does not have and has already declined to invent once (FD-16 item 2, where
 * the same "when you create your starting Warband" was accepted as the
 * group's to keep). It is recorded here rather than in
 * `data-sources/resolutions.json`, which is a typed table of field-level
 * conflicts and cannot hold a rules reading keyed to no field.
 */
import type { Cost, Dataset, UnitOption } from '../types/catalogue';
import { isAlchemicalFormula, inFormulaGroup } from './formulae';
import { formulaVerdict, type FormulaVerdict } from './formulaGates';
import { freeFormulaBudgetLeft, golemGrant, isGolem } from './golem';
import { takwinRestrictions, takwinRuleText } from './takwin';
import { nameKey } from './names';

export interface FormulaOffer {
  option: UnitOption;
  /** What the player pays. `{ ducats: 0, glory: 0 }` where the grant covers it. */
  price: Cost;
  /** The catalogue's price, whoever ends up paying it. */
  listPrice: Cost;
  /** Covered by the Book of Golems allowance. */
  free: boolean;
  /** Already on this model. */
  held: boolean;
  verdict: FormulaVerdict;
  /**
   * What the Strongbox is short by, where it cannot cover the price. Zero in
   * both currencies means it can.
   *
   * Separate from `verdict`, because it is not a rule about the Formula: the
   * sentence on the entry still permits it, and the player can come back
   * after the next Quartermaster Step. A screen that folded the two together
   * would tell a player a Formula is forbidden when it is only unaffordable.
   */
  short: Cost;
}

export interface FormulaShelf {
  /** Whether anything may be bought at all. */
  open: boolean;
  /** The published sentence that closes it, where one does. */
  refusal?: string;
  /** A rule that touches the whole shelf and is not a refusal. */
  caveat?: string;
  offers: FormulaOffer[];
  /**
   * Ducats of the Book of Golems allowance still unspent, or `null` for a
   * model the grant did not create.
   */
  freeBudgetLeft: number | null;
}

const ZERO: Cost = { ducats: 0, glory: 0 };
const CLOSED = (refusal: string): FormulaShelf =>
  ({ open: false, refusal, offers: [], freeBudgetLeft: null });

interface ShelfUnit {
  grantedBy?: string;
  specialUpgrades?: { name: string; category?: string }[];
  equippedEquipment?: { name: string; group?: string; groupPath?: string }[];
  profileSnapshot?: { innateAbilities?: { name: string; description?: string }[] };
}

/**
 * The Formulae this model is holding, from all three places one is recorded.
 *
 * `formulaeOf` reads the two a PURCHASE writes. The third is the profile's own
 * abilities, and it is not optional here: the Golem is created holding Human
 * Hands, which is an innate ability and not a purchase, and Human Hands is
 * what several other Formulae name as their prerequisite. Reading only the
 * purchases would refuse a Golem the Formula its grant just qualified it for.
 */
function heldFormulae(unit: ShelfUnit | null | undefined, offered: UnitOption[]): string[] {
  const offerKeys = new Set(offered.map((o) => nameKey(o.name)));
  return [
    ...(unit?.specialUpgrades ?? []).map((u) => u.name),
    ...(unit?.equippedEquipment ?? []).filter(isAlchemicalFormula).map((e) => e.name),
    /* Only an ability whose NAME is one of this entry's Formulae. An entry's
       abilities are mostly not Formulae, and a name that is not offered here
       cannot be one. */
    ...(unit?.profileSnapshot?.innateAbilities ?? [])
      .map((a) => a.name)
      .filter((n) => offerKeys.has(nameKey(n))),
  ].filter(Boolean);
}

/** Ducats of Formulae this model has already charged to the free allowance. */
function spentFromBudget(held: readonly string[], offered: readonly UnitOption[]): number {
  const byName = new Map(offered.map((o) => [nameKey(o.name), o.cost.ducats ?? 0]));
  /* The one the grant supplies is not spent out of the budget: "It has the
     Human Hands Alchemical Formula, PLUS Alchemical Formulas worth a total of
     up to 50 👑". Counted from the purchases only, which is what `held` minus
     the innate names is — an innate name is on the model because the entry
     prints it, not because a player spent anything. */
  return held.reduce((n, name) => n + (byName.get(nameKey(name)) ?? 0), 0);
}

export function formulaShelf(
  dataset: Dataset | null | undefined,
  opts: {
    unit: ShelfUnit | null | undefined;
    /** The model's catalogue entry, whose options are the whole offer. */
    catalogueUnit: { options?: UnitOption[] } | null | undefined;
    /** `takwinRestrictions`' third state: `null` is unknown, not dead. */
    alchemistAlive: boolean | null;
    /** Whether this model is one the association rule governs. */
    isTakwin: boolean;
    /**
     * What the Strongbox holds. A Formula priced above it is reported short
     * rather than sold — the same visible refusal with its reason that
     * `RecreationPanel` gives, and RR-12's rule that a purchase is refused
     * and never clamped.
     */
    strongbox?: Cost;
  },
): FormulaShelf {
  const offered = (opts.catalogueUnit?.options ?? []).filter(isAlchemicalFormula);

  const governed = opts.isTakwin && !isGolem(opts.unit);
  const takwin = takwinRestrictions(dataset, {
    isTakwin: governed,
    alchemistAlive: opts.alchemistAlive,
  });
  if (takwin.noFormulas) return CLOSED(takwin.reason);

  /*
    The roster holds more Homunculi than living Alchemists, and the
    association it is one-to-one with was never recorded — so SOME of them
    have lost theirs and nothing says which (`alchemistAliveFor`). Shown as a
    caveat with the sentence, never a refusal: refusing all of them would
    bench models whose Alchemist is alive.
  */
  const unknownAlchemist = governed && opts.alchemistAlive === null
    ? takwinRuleText(dataset).text
    : undefined;

  if (!offered.length) {
    return { open: false, offers: [], freeBudgetLeft: null };
  }

  const grant = isGolem(opts.unit) ? golemGrant(dataset) : null;
  const held = heldFormulae(opts.unit, offered);
  const heldKeys = new Set(held.map(nameKey));
  /* Purchases only — see `spentFromBudget`. An innate Formula is the grant's
     own gift and does not eat the allowance it is given "plus". */
  const bought = (opts.unit?.specialUpgrades ?? []).map((u) => u.name);
  const budgetLeft = grant ? freeFormulaBudgetLeft(grant, spentFromBudget(bought, offered)) : null;

  const purse: Cost = {
    ducats: opts.strongbox?.ducats ?? 0,
    glory: opts.strongbox?.glory ?? 0,
  };
  const shortOf = (price: Cost, free: boolean, isHeld: boolean): Cost =>
    /* Nothing is owed for a Formula the grant covers, or one already bought
       and only being kept. */
    (free || isHeld)
      ? ZERO
      : {
        ducats: Math.max(0, price.ducats - purse.ducats),
        glory: Math.max(0, price.glory - purse.glory),
      };

  const offers = offered.map((option): FormulaOffer => {
    const listPrice: Cost = {
      ducats: option.cost?.ducats ?? 0,
      glory: option.cost?.glory ?? 0,
    };
    const isHeld = heldKeys.has(nameKey(option.name));
    /*
      The gate is asked of the Formulae held BESIDE this one. Asking it of a
      list that includes the Formula itself would let a self-referencing
      sentence refuse a model its own held Formula at the moment it tried to
      sell it back.
    */
    const beside = held.filter((n) => nameKey(n) !== nameKey(option.name));
    const verdict = formulaVerdict(
      { name: option.name, description: option.description }, beside, offered);

    if (!grant) {
      return {
        option, price: listPrice, listPrice, free: false, held: isHeld, verdict,
        short: shortOf(listPrice, false, isHeld),
      };
    }

    /*
      A Formula the gate already refuses keeps the gate's reason. The budget
      is the weaker answer: "the allowance will not stretch to this" is about
      money, and "you do not have the three Formulas this one needs" is about
      the rule. Overwriting the second with the first tells a player to save
      up for something they could not take at any price.
    */
    if (!verdict.allowed) {
      return {
        option, price: listPrice, listPrice, free: false, held: isHeld, verdict,
        short: ZERO,
      };
    }

    /*
      The Golem. Free while the allowance stretches to it, and refused rather
      than priced once it does not — see the reading in this file's header.
      A Formula already held costs nothing to keep, so it is never refused
      for a budget it has already been counted against.
    */
    const covered = isHeld || (budgetLeft ?? 0) >= listPrice.ducats;
    if (covered && !listPrice.glory) {
      return { option, price: ZERO, listPrice, free: true, held: isHeld, verdict, short: ZERO };
    }
    return {
      option,
      price: listPrice,
      listPrice,
      free: false,
      held: isHeld,
      verdict: { allowed: false, reason: grant.text },
      short: ZERO,
    };
  });

  return {
    open: true,
    caveat: unknownAlchemist,
    offers,
    freeBudgetLeft: budgetLeft,
  };
}

/**
 * The Formulae a model is holding, each with the text the catalogue prints.
 *
 * FD-13a item 3. A Formula can be recorded three ways and only one of them
 * carried its rules anywhere:
 *
 * - **`specialUpgrades`** — bought in the app, now through the Formulas tab.
 *   The shape is `{ id, name, cost, category }` and has **no description
 *   field at all**, so the card showed a name and a price and nothing else.
 * - **`equippedEquipment`** — imported from a BattleScribe roster. It carries
 *   `effect`, which the card put in a `title` attribute: a hover tooltip, on
 *   an app whose base layout targets a 375px phone with no pointer.
 * - **`innateAbilities`** — the entry's own, which already render as rules.
 *
 * Resolved from the model's catalogue entry rather than stored on the model,
 * for the reason `golemKeywords` gives: a stored copy is a second source of
 * truth that stops agreeing with the entry the moment a Dispatch rewrites it.
 * The option id is matched first and the name second, the same two-sided rule
 * used everywhere else here.
 *
 * A Formula whose text cannot be resolved keeps its name and price and says
 * nothing, rather than showing a remembered or guessed description.
 */
export interface HeldFormula {
  /** The option id where the purchase recorded one. */
  id?: string;
  name: string;
  /** What it cost, as recorded on the model. */
  price: Cost;
  /** The published rules text, where the entry still has it. */
  description?: string;
  /** The catalogue's group, for the heading a card prints. */
  group?: string;
  /** Where it is recorded, which decides whether a card can remove it. */
  from: 'upgrade' | 'equipment' | 'innate';
  /** For the equipped route, which instance to drop. */
  instanceId?: string;
}

export function formulaeHeld(
  unit: (ShelfUnit & {
    specialUpgrades?: { id: string; name: string; cost: number; category?: string }[];
    equippedEquipment?: {
      name: string; group?: string; groupPath?: string; effect?: string;
      cost?: number; gloryCost?: number; instanceId?: string;
    }[];
  }) | null | undefined,
  catalogueUnit: { options?: UnitOption[] } | null | undefined,
): HeldFormula[] {
  const offered = (catalogueUnit?.options ?? []).filter(isAlchemicalFormula);
  const byId = new Map(offered.map((o) => [o.id, o]));
  const byName = new Map(offered.map((o) => [nameKey(o.name), o]));
  const entryFor = (id: string | undefined, name: string) =>
    (id ? byId.get(id) : undefined) ?? byName.get(nameKey(name));

  const out: HeldFormula[] = [];

  for (const u of unit?.specialUpgrades ?? []) {
    /* Only the Formulae. `specialUpgrades` also holds Strains, Sagas and
       Goetic Powers, which are this sheet's but not this section's. */
    const entry = entryFor(u.id, u.name);
    if (!entry && !inFormulaGroup(u.category)) continue;
    out.push({
      id: u.id,
      name: u.name,
      price: { ducats: u.cost ?? 0, glory: 0 },
      description: entry?.description,
      group: entry?.group ?? u.category,
      from: 'upgrade',
    });
  }

  for (const e of unit?.equippedEquipment ?? []) {
    if (!isAlchemicalFormula(e)) continue;
    const entry = entryFor(undefined, e.name);
    out.push({
      name: e.name,
      price: { ducats: e.cost ?? 0, glory: e.gloryCost ?? 0 },
      /* The import's own `effect` first: it is what that roster recorded,
         and the entry is the fallback where the import carried none. */
      description: e.effect || entry?.description,
      group: e.groupPath ?? e.group ?? entry?.group,
      from: 'equipment',
      instanceId: e.instanceId,
    });
  }

  for (const a of unit?.profileSnapshot?.innateAbilities ?? []) {
    const entry = entryFor(undefined, a.name);
    if (!entry) continue;
    out.push({
      name: a.name,
      price: { ducats: 0, glory: 0 },
      description: a.description || entry.description,
      group: entry.group,
      from: 'innate',
    });
  }

  return out;
}
