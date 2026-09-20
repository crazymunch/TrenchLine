/**
 * Roster cost arithmetic.
 *
 * Trench Crusade prices things in two currencies — Ducats and Glory — and the
 * original app modelled only Ducats, so a warband with a Glory-costed Mercenary
 * or Glory Item silently under-counted. Ten Mercenary entries and every Glory
 * Item are priced in Glory.
 *
 * Pure functions, no React: the rules engine has to be testable without a UI.
 */
import type { EarnedClaim } from './earnedRecruitment';
import type { Cost, UnitProfile, WeaponProfile, UnitOption } from '@/types/catalogue';

export const ZERO: Cost = { ducats: 0, glory: 0 };

export const add = (a: Cost, b: Cost): Cost => ({
  ducats: a.ducats + b.ducats,
  glory: a.glory + b.glory,
});

export const sum = (xs: Cost[]): Cost => xs.reduce(add, ZERO);

export const scale = (c: Cost, n: number): Cost => ({
  ducats: c.ducats * n,
  glory: c.glory * n,
});

export const isZero = (c: Cost) => c.ducats === 0 && c.glory === 0;

/**
 * The price an app catalogue profile carries, both currencies.
 *
 * `recruitable` builds the store's weapon, armour and equipment lists from the
 * faction's Armoury Table and splits each row's `Cost` across two fields —
 * `cost` for the Ducats, `gloryCost` for the Glory — because the legacy roster
 * shape has one number. Putting them back together is not a conversion: it is
 * the row's own Cost, and a reader that takes `cost` alone is reading a price
 * that says nothing about the currency it is in. Every Glory-priced offer in
 * the shipped dataset is zero Ducats, so `cost` alone reads every one of them
 * as free.
 */
export const profileCost = (row: { cost: number; gloryCost?: number }): Cost =>
  ({ ducats: row.cost, glory: row.gloryCost ?? 0 });

/** `55 Ducats`, `2 Glory`, `55 Ducats + 2 Glory`, or `Free`. */
export function formatCost(c: Cost): string {
  const parts: string[] = [];
  if (c.ducats) parts.push(`${c.ducats} Ducat${c.ducats === 1 ? '' : 's'}`);
  if (c.glory) parts.push(`${c.glory} Glory`);
  return parts.join(' + ') || 'Free';
}

/* --------------------------------------------------------------- rosters */

export interface RosterItem {
  /** Weapon, armour or equipment attached to this model. */
  weaponId?: string;
  optionId?: string;
  /**
   * The item's name, carried when it was priced from an Armoury Table row that
   * has no catalogue profile behind it. Validation reports by name, and there
   * is no `weaponId` to look one up with.
   */
  name?: string;
  cost: Cost;
  quantity?: number;
  /**
   * The loadout bundle that handed this item to the model, if one did.
   *
   * "A Mamluk Faris always has either a Greatsword, or a Polearm and a Trench
   * Shield, or a Pistol and a Sword/Axe" — the entry states its own Battlekit,
   * which is what the carrying limits mean by "unless otherwise stated". The
   * limit engine reads this so it does not police one stated loadout's items
   * against each other.
   */
  grantedBy?: string;
}

export interface RosterUnit {
  id: string;
  profileId: string;
  name: string;
  /** Snapshot of the profile's own cost at the time it was added. */
  cost: Cost;
  items: RosterItem[];
  options: RosterItem[];
  /** Name of the Fireteam this model belongs to, if any. */
  fireteam?: string;
  /**
   * Names the model carries that a catalogue entry can be gated on —
   * Alchemical Formulae, advancements, innate abilities, skills. Not part of
   * the roster's cost, which comes from `cost`, `items` and `options`; this is
   * only ever read to answer "does this model unlock that entry?".
   */
  traits?: string[];
  /**
   * The model has a third weapon hand — see `hasExtraLimb`.
   *
   * Carried on the roster rather than recomputed, because the Battlekit
   * carrying limits open with "Unless otherwise stated" and this is the app's
   * existing answer to it: a model the builder offers a third weapon must not
   * then be told by the validator that it is illegal.
   */
  extraLimb?: boolean;
  /**
   * The model's effective Keywords: its entry's own, plus any an option it
   * bought grants it. A granted one appears nowhere on the catalogue entry —
   * Inhuman Strength gives a Homunculus STRONG — and several rules key on them.
   */
  keywords?: string[];
}

export interface Roster {
  id: string;
  name: string;
  factionId: string;
  variantId?: string;
  /**
   * Whether this Warband has taken the catalogues' "Allow Third-Party
   * Mercenaries?" roster option. Absent is off, which is the catalogue default.
   */
  allowThirdParty?: boolean;
  /**
   * Recruitment bounds this Warband has EARNED during its campaign.
   *
   * A published ability can raise a limit once a price has been paid — the
   * Black Grail's *Curse on Creation* trades six Grail Thralls for a second
   * Amalgam. Recorded rather than recomputed: the conditions were true when it
   * was claimed, and a Warband that shrinks afterwards does not lose what it
   * already bought (docs/RULES-COVERAGE-AUDIT.md RC-08).
   */
  earnedRecruitment?: EarnedClaim[];
  units: RosterUnit[];
  /** Loose wargear bought but not assigned to a model. */
  stash: RosterItem[];
  budget: Cost;
  /**
   * What the Strongbox holds, where the Warband has one.
   *
   * Carried so the validator can refuse an overdrawn campaign roster. The
   * builder deliberately does NOT block a muster that runs over — a player
   * mid-list is over budget for a moment and then trims — so the refusal
   * belongs where a roster is checked before it is used, not on the button.
   *
   * Absent for an unrestricted list, which holds no money by design.
   */
  strongbox?: Cost;
}

/** What one model costs, including everything attached to it. */
export function unitCost(u: RosterUnit): Cost {
  const items = sum(u.items.map((i) => scale(i.cost, i.quantity ?? 1)));
  const options = sum(u.options.map((o) => scale(o.cost, o.quantity ?? 1)));
  return add(u.cost, add(items, options));
}

/** What the whole warband costs, stash included — it is bought, so it counts. */
export function rosterCost(r: Roster): Cost {
  return add(sum(r.units.map(unitCost)), sum(r.stash.map((i) => scale(i.cost, i.quantity ?? 1))));
}

export interface BudgetState {
  spent: Cost;
  budget: Cost;
  remaining: Cost;
  overDucats: boolean;
  overGlory: boolean;
  /** True if either currency is overspent. */
  over: boolean;
}

export function budgetState(r: Roster): BudgetState {
  const spent = rosterCost(r);
  const remaining = { ducats: r.budget.ducats - spent.ducats, glory: r.budget.glory - spent.glory };
  // A budget of 0 means "no limit published", not "may not spend any". Only the
  // Papal States Intervention Force has a Glory allowance in the book; every
  // other faction has none, and treating that as a ceiling of zero reported
  // every Glory-priced item as overspend.
  const overDucats = r.budget.ducats > 0 && remaining.ducats < 0;
  const overGlory = r.budget.glory > 0 && remaining.glory < 0;
  return { spent, budget: r.budget, remaining, overDucats, overGlory, over: overDucats || overGlory };
}

/** Cost of a profile plus a set of chosen options, for the "add unit" preview. */
export function previewCost(profile: UnitProfile, options: UnitOption[] = [], weapons: WeaponProfile[] = []): Cost {
  return sum([profile.cost, ...options.map((o) => o.cost), ...weapons.map((w) => w.cost)]);
}
