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
  cost: Cost;
  quantity?: number;
}

export interface RosterUnit {
  id: string;
  profileId: string;
  name: string;
  /** Snapshot of the profile's own cost at the time it was added. */
  cost: Cost;
  items: RosterItem[];
  options: RosterItem[];
}

export interface Roster {
  id: string;
  name: string;
  factionId: string;
  variantId?: string;
  units: RosterUnit[];
  /** Loose wargear bought but not assigned to a model. */
  stash: RosterItem[];
  budget: Cost;
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
  const overDucats = remaining.ducats < 0;
  const overGlory = remaining.glory < 0;
  return { spent, budget: r.budget, remaining, overDucats, overGlory, over: overDucats || overGlory };
}

/** Cost of a profile plus a set of chosen options, for the "add unit" preview. */
export function previewCost(profile: UnitProfile, options: UnitOption[] = [], weapons: WeaponProfile[] = []): Cost {
  return sum([profile.cost, ...options.map((o) => o.cost), ...weapons.map((w) => w.cost)]);
}
