/**
 * Limits that govern an option GROUP rather than one option.
 *
 * `Constraint` sits on a single option and can only say "at most one Bolgias
 * Gut". The Black Grail's published rules are about the group, and the dataset
 * had no shape for them, so five options shipped as five independent toggles
 * (docs/RULES-COVERAGE-AUDIT.md RC-07):
 *
 *   "A Grail Thrall … can have up to 1 Strain."       all four were takeable
 *   "…may have an additional Strain [if …]"           the condition existed nowhere
 *   "…it cannot be removed or lost for any reason."   the toggle removed it
 *   "each Amalgam … must have a different Vile Corpus" nothing compared two models
 *
 * Everything here reads `profile.optionGroups`, which is transcribed from the
 * Dispatch. No allowance, threshold or group name is stated in this file.
 */
import type { Cost, Dataset, OptionGroupRule, UnitProfile } from '../types/catalogue';
import type { Roster, RosterUnit } from './costs';
import { unitCost } from './costs';

export const optionGroupsOf = (profile: UnitProfile | undefined | null): OptionGroupRule[] =>
  profile?.optionGroups ?? [];

/** What one model holds from a group, by option name. */
export const heldIn = (unit: RosterUnit, group: string, profile: UnitProfile): string[] => {
  const inGroup = new Set(
    (profile.options ?? []).filter((o) => o.group === group).map((o) => o.name));
  return (unit.options ?? []).map((o) => o.name ?? '').filter((n) => inGroup.has(n));
};

/**
 * What the REST of the roster is worth.
 *
 * "the total cost of all of the other models in the Warband (including their
 * Battlekit, etc.)". Other: the model being checked is excluded, or an
 * expensive Thrall would qualify itself for its own second Strain.
 */
export function otherModelsCost(roster: Roster, unitId: string): Cost {
  return roster.units
    .filter((u) => u.id !== unitId)
    .reduce<Cost>(
      (sum, u) => {
        const c = unitCost(u);
        return { ducats: sum.ducats + c.ducats, glory: sum.glory + c.glory };
      },
      { ducats: 0, glory: 0 },
    );
}

export interface GroupAllowance {
  /** How many of the group this model may hold. */
  max: number;
  /** Whether the conditional extra is in force, and why. */
  bonusApplies: boolean;
  /** The rule's own words, for a screen that has to justify a refusal. */
  text: string;
}

/**
 * The allowance in force for one model.
 *
 * The bonus is compared on Ducats alone because that is what the rule states a
 * threshold in — and the threshold's currency is not assumed here either: it
 * comes from `rule.bonus.otherModelsCostAtLeast`, which the layer transcribed
 * from the sentence that also prices the Strains the catalogue costs in Ducats.
 */
export const allowanceFor = (
  rule: OptionGroupRule,
  roster: Roster,
  unitId: string,
): GroupAllowance => allowanceGiven(rule, otherModelsCost(roster, unitId));

/**
 * The same answer from an already-counted total.
 *
 * The builder's advancement sheet has a warband rather than a roster, and
 * recomputing one there to ask a question it can already answer would be two
 * sources for one number.
 */
export function allowanceGiven(rule: OptionGroupRule, others: Cost): GroupAllowance {
  if (!rule.bonus) return { max: rule.max, bonusApplies: false, text: rule.text };
  const need = rule.bonus.otherModelsCostAtLeast;
  const applies = others.ducats >= (need.ducats ?? 0) && others.glory >= (need.glory ?? 0);
  return {
    max: rule.max + (applies ? rule.bonus.max : 0),
    bonusApplies: applies,
    text: applies ? `${rule.text} ${rule.bonus.text}` : rule.text,
  };
}

export interface GroupBreach {
  unitId: string;
  unitName: string;
  group: string;
  kind: 'over-allowance' | 'not-distinct';
  /** What the model holds from the group. */
  held: string[];
  max?: number;
  /** The option two models share, where that is the breach. */
  shared?: string;
  /** The published sentence that forbids it. */
  rule: string;
}

/**
 * Every group rule this roster breaks.
 *
 * Reports; the caller decides whether that is an error or a warning. Nothing
 * here removes an option: a permanent Strain that is somehow on a roster twice
 * is a thing to tell the player about, not to silently correct.
 */
export function groupBreaches(dataset: Dataset, roster: Roster): GroupBreach[] {
  const profiles = new Map((dataset.units ?? []).map((u) => [u.id, u]));
  const out: GroupBreach[] = [];

  /* group -> option name -> the models holding it, for the distinctness rule. */
  const holders = new Map<string, Map<string, RosterUnit[]>>();

  for (const unit of roster.units) {
    const profile = profiles.get(unit.profileId);
    if (!profile) continue;

    for (const rule of optionGroupsOf(profile)) {
      const held = heldIn(unit, rule.group, profile);
      if (!held.length) continue;

      const allowance = allowanceFor(rule, roster, unit.id);
      if (held.length > allowance.max) {
        out.push({
          unitId: unit.id,
          unitName: unit.name,
          group: rule.group,
          kind: 'over-allowance',
          held,
          max: allowance.max,
          rule: allowance.text,
        });
      }

      if (rule.distinctPerRoster) {
        const byName = holders.get(rule.group) ?? new Map<string, RosterUnit[]>();
        for (const name of held) byName.set(name, [...(byName.get(name) ?? []), unit]);
        holders.set(rule.group, byName);
      }
    }
  }

  for (const unit of roster.units) {
    const profile = profiles.get(unit.profileId);
    if (!profile) continue;
    for (const rule of optionGroupsOf(profile)) {
      if (!rule.distinctPerRoster) continue;
      for (const name of heldIn(unit, rule.group, profile)) {
        const sharing = holders.get(rule.group)?.get(name) ?? [];
        /* Reported once per model, so both models that share one are told. */
        if (sharing.length > 1) {
          out.push({
            unitId: unit.id,
            unitName: unit.name,
            group: rule.group,
            kind: 'not-distinct',
            held: [name],
            shared: name,
            rule: rule.text,
          });
        }
      }
    }
  }

  return out;
}

/**
 * Whether letting go of this option is a rules action or a correction.
 *
 * "Once a model has a Strain, it cannot be removed or lost for any reason." The
 * roster is the player's own record and a typo is a real thing that happens, so
 * this never blocks — it says the rule out loud on the screen that is about to
 * undo something the rule says cannot be undone.
 */
export function permanenceOf(
  profile: UnitProfile | undefined | null,
  optionName: string,
): OptionGroupRule | null {
  if (!profile) return null;
  const group = (profile.options ?? []).find((o) => o.name === optionName)?.group;
  if (!group) return null;
  return optionGroupsOf(profile).find((r) => r.group === group && r.permanent) ?? null;
}
