/**
 * Roster legality.
 *
 * This is the feature that makes TrenchLine a NewRecruit replacement rather
 * than a spreadsheet, and the original app had none of it: it checked only
 * "has a Leader" and "over budget", while computing elite/trooper counts it
 * never used (docs/AUDIT.md §1.7).
 *
 * Everything here is a pure function over a Roster and a Dataset, so the rules
 * can be tested without rendering anything.
 */
import type { Dataset, UnitProfile, WarbandVariant } from '@/types/catalogue';
import type { Roster, RosterUnit } from './costs';
import { budgetState, unitCost } from './costs';
import { parseRestrictions, satisfiesOnlyFor, type Restriction } from './restrictions';

export type Severity = 'error' | 'warning' | 'info';

export interface Violation {
  severity: Severity;
  /** Stable code so the UI can group and the tests can assert. */
  code:
    | 'over-budget-ducats'
    | 'over-budget-glory'
    | 'unit-max'
    | 'unit-min'
    | 'wargear-limit'
    | 'wargear-restricted'
    | 'variant-forbids'
    | 'variant-requires'
    | 'unknown-profile'
    | 'unparsed-restriction';
  message: string;
  /** Which rule said so, for the "why?" affordance. */
  rule?: string;
  unitId?: string;
  profileId?: string;
}

export interface ValidationResult {
  legal: boolean;
  violations: Violation[];
  errors: Violation[];
  warnings: Violation[];
}

const err = (v: Omit<Violation, 'severity'>): Violation => ({ severity: 'error', ...v });
const warn = (v: Omit<Violation, 'severity'>): Violation => ({ severity: 'warning', ...v });

/* ------------------------------------------------------------------ helpers */

const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/* ---------------------------------------------------------------- the rules */

/**
 * Recruitment limits. The catalogues express "0-2 Sniper Priests" as a
 * roster-scoped max of 2, and "A New Antioch Warband must include 1
 * Lieutenant" as a min of 1 — neither of which the old data carried at all.
 */
function checkRecruitmentLimits(roster: Roster, profiles: Map<string, UnitProfile>): Violation[] {
  const out: Violation[] = [];
  const counts = new Map<string, number>();

  for (const u of roster.units) {
    counts.set(u.profileId, (counts.get(u.profileId) ?? 0) + 1);
  }

  for (const [profileId, n] of counts) {
    const p = profiles.get(profileId);
    if (!p) {
      out.push(err({
        code: 'unknown-profile',
        message: `${n} model(s) reference a profile that is not in this ruleset.`,
        profileId,
      }));
      continue;
    }
    if (p.max != null && n > p.max) {
      out.push(err({
        code: 'unit-max',
        message: `${p.name}: ${n} taken, limit is ${p.max}.`,
        rule: `0-${p.max} ${p.name}`,
        profileId,
      }));
    }
  }

  // A required entry is one the faction must include. Only enforce it for
  // profiles belonging to this roster's faction, or every faction's required
  // leader would fire at once.
  for (const p of profiles.values()) {
    if (!p.min || p.min < 1) continue;
    if (p.factionId && roster.factionId && !factionMatches(p.factionId, roster.factionId)) continue;
    const n = counts.get(p.id) ?? 0;
    if (n < p.min) {
      out.push(err({
        code: 'unit-min',
        message: `A ${roster.factionId} warband must include ${plural(p.min, p.name)} — ${n} taken.`,
        rule: `must include ${p.min} ${p.name}`,
        profileId: p.id,
      }));
    }
  }

  return out;
}

/** Catalogue faction ids are file names ("Iron Sultanate"); rosters use slugs. */
export function factionMatches(a: string, b: string): boolean {
  const k = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  return k(a) === k(b) || k(a).includes(k(b)) || k(b).includes(k(a));
}

/** Wargear legality from the Armoury Table restriction text. */
function checkWargear(
  roster: Roster,
  profiles: Map<string, UnitProfile>,
  weapons: Map<string, { id: string; name: string; restrictions?: string[] }>
): Violation[] {
  const out: Violation[] = [];
  const rosterCounts = new Map<string, number>();

  for (const u of roster.units) {
    const profile = profiles.get(u.profileId);
    const perUnit = new Map<string, number>();

    for (const item of u.items) {
      if (!item.weaponId) continue;
      const qty = item.quantity ?? 1;
      rosterCounts.set(item.weaponId, (rosterCounts.get(item.weaponId) ?? 0) + qty);
      perUnit.set(item.weaponId, (perUnit.get(item.weaponId) ?? 0) + qty);

      const w = weapons.get(item.weaponId);
      if (!w) continue;

      for (const r of restrictionsOf(w)) {
        if (r.kind === 'onlyFor' && profile && !satisfiesOnlyFor(r.requires, profile)) {
          out.push(err({
            code: 'wargear-restricted',
            message: `${profile.name} cannot take ${w.name} — ${r.raw}.`,
            rule: r.raw, unitId: u.id,
          }));
        }
        if (r.kind === 'limit' && r.perModel != null) {
          const n = perUnit.get(item.weaponId) ?? 0;
          if (n > r.perModel) {
            out.push(err({
              code: 'wargear-limit',
              message: `${profile?.name ?? 'model'} has ${n}× ${w.name}, limit is ${r.perModel} per model.`,
              rule: r.raw, unitId: u.id,
            }));
          }
        }
        if (r.kind === 'unparsed') {
          out.push(warn({
            code: 'unparsed-restriction',
            message: `${w.name}: "${r.raw}" — check this by hand, TrenchLine cannot verify it yet.`,
            rule: r.raw, unitId: u.id,
          }));
        }
      }
    }
  }

  // Roster-wide "Limit: N".
  for (const [weaponId, n] of rosterCounts) {
    const w = weapons.get(weaponId);
    if (!w) continue;
    for (const r of restrictionsOf(w)) {
      if (r.kind === 'limit' && r.perModel == null && n > r.max) {
        out.push(err({
          code: 'wargear-limit',
          message: `${w.name}: ${n} taken across the warband, limit is ${r.max}.`,
          rule: r.raw,
        }));
      }
    }
  }

  return out;
}

const restrictionCache = new WeakMap<object, Restriction[]>();
function restrictionsOf(w: { restrictions?: string[] }): Restriction[] {
  const cached = restrictionCache.get(w);
  if (cached) return cached;
  const parsed = (w.restrictions ?? []).flatMap(parseRestrictions);
  restrictionCache.set(w, parsed);
  return parsed;
}

/**
 * Warband Variant rules — "cannot include Trench Moles", "must include 1
 * Trench Cleric". Fourteen official variants, none of which the app supported.
 */
function checkVariant(
  roster: Roster,
  variant: WarbandVariant | undefined,
  profiles: Map<string, UnitProfile>
): Violation[] {
  if (!variant) return [];
  const out: Violation[] = [];

  const names = roster.units
    .map((u) => profiles.get(u.profileId)?.name?.toLowerCase())
    .filter(Boolean) as string[];
  const has = (needle: string) =>
    names.some((n) => n.includes(needle.toLowerCase()) || needle.toLowerCase().includes(n));

  for (const rule of variant.specialRules ?? []) {
    const text = `${rule.name}: ${rule.description}`;

    // "A House of Wisdom Warband cannot include a Yüzbaşı, Janissaries, or
    // Sultanate Assassins."
    const forbids = rule.description.match(/cannot include ([^.]+)/i);
    if (forbids) {
      for (const raw of splitList(forbids[1])) {
        if (has(raw)) {
          out.push(err({
            code: 'variant-forbids',
            message: `${variant.name} cannot include ${raw}.`,
            rule: text,
          }));
        }
      }
    }

    // "must include 1 Trench Cleric" / "must include 1-2 Jabirean Alchemists".
    // The range form gives a minimum of 1 and a maximum of 2; only the minimum
    // is a legality failure, so read the lower bound.
    const requires = rule.description.match(/must include\s+(?:(\d+)\s*(?:[-–]\s*\d+)?\s+)?([^.]+)/i);
    if (requires) {
      const need = Number(requires[1] ?? 1);
      for (const raw of splitList(requires[2])) {
        const n = names.filter((n) => n.includes(raw.toLowerCase()) || raw.toLowerCase().includes(n)).length;
        if (n < need) {
          out.push(err({
            code: 'variant-requires',
            message: `${variant.name} must include ${plural(need, raw)} — ${n} taken.`,
            rule: text,
          }));
        }
      }
    }
  }

  return out;
}

/** "a Yüzbaşı, Janissaries, or Sultanate Assassins" -> three names. */
function splitList(s: string): string[] {
  return s
    .replace(/\bor\b|\band\b/gi, ',')
    .split(',')
    .map((x) => x.replace(/^\s*(a|an|the)\s+/i, '').trim())
    .filter((x) => x.length > 2);
}

/* ---------------------------------------------------------------- entry point */

export function validateRoster(roster: Roster, dataset: Dataset): ValidationResult {
  const profiles = byId(dataset.units);
  const weapons = byId(dataset.weapons as { id: string; name: string; restrictions?: string[] }[]);
  const variant = (dataset as unknown as { variants?: WarbandVariant[] }).variants
    ?.find((v) => v.id === roster.variantId || v.name === roster.variantId);

  const violations: Violation[] = [];

  const budget = budgetState(roster);
  if (budget.overDucats) {
    violations.push(err({
      code: 'over-budget-ducats',
      message: `Over budget by ${-budget.remaining.ducats} Ducats ` +
               `(${budget.spent.ducats} of ${budget.budget.ducats}).`,
    }));
  }
  if (budget.overGlory) {
    violations.push(err({
      code: 'over-budget-glory',
      message: `Over budget by ${-budget.remaining.glory} Glory ` +
               `(${budget.spent.glory} of ${budget.budget.glory}).`,
    }));
  }

  violations.push(...checkRecruitmentLimits(roster, profiles));
  violations.push(...checkWargear(roster, profiles, weapons));
  violations.push(...checkVariant(roster, variant, profiles));

  const errors = violations.filter((v) => v.severity === 'error');
  return {
    legal: errors.length === 0,
    violations,
    errors,
    warnings: violations.filter((v) => v.severity === 'warning'),
  };
}

/** Per-model cost, exposed so the UI need not import costs.ts separately. */
export { unitCost, budgetState };
