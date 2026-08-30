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
import type { Dataset, UnitProfile, WarbandVariant, FactionSpecialRule } from '@/types/catalogue';
import type { Roster, RosterUnit } from './costs';
import { budgetState, unitCost } from './costs';
import { parseRestrictions, satisfiesOnlyFor, type Restriction } from './restrictions';
import { armouryFor, restrictionsFor, stocks, type Armoury } from './armoury';
import { nameKey } from './names';

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
    | 'faction-rule'
    | 'wargear-not-stocked'
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
function checkRecruitmentLimits(
  roster: Roster,
  profiles: Map<string, UnitProfile>,
  variant?: WarbandVariant
): Violation[] {
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
    // The variant moves the bound before it is checked, so the message quotes
    // the limit actually in force rather than the base one.
    const { max } = variantLimits(p, variant);
    if (max != null && n > max) {
      out.push(err({
        code: 'unit-max',
        message: `${p.name}: ${n} taken, limit is ${max}.`,
        rule: max === p.max ? `0-${max} ${p.name}`
                            : `${variant?.name}: 0-${max} ${p.name} (base ${p.max})`,
        profileId,
      }));
    }
  }

  // Entries the variant forbids outright.
  const forbidden = variantForbids(variant);
  if (forbidden.size) {
    for (const [profileId, n] of counts) {
      const p = profiles.get(profileId);
      if (!p) continue;
      if (!forbidden.has(p.entryId ?? p.id)) continue;
      out.push(err({
        code: 'variant-forbids',
        message: `${variant?.name} cannot include ${p.name} — ${plural(n, p.name)} taken.`,
        rule: `${variant?.name}: ${p.name} is not available to this variant`,
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
    // A variant can raise a required minimum (House of Wisdom: 1-2 Alchemists)
    // or forbid the entry entirely, in which case there is nothing to require.
    if (variantForbids(variant).has(p.entryId ?? p.id)) continue;
    const { min } = variantLimits(p, variant);
    if (!min || min < 1) continue;
    const n = counts.get(p.id) ?? 0;
    if (n < min) {
      out.push(err({
        code: 'unit-min',
        message: `A ${variant?.name ?? roster.factionId} warband must include ` +
                 `${plural(min, p.name)} — ${n} taken.`,
        rule: min === p.min ? `must include ${min} ${p.name}`
                            : `${variant?.name}: must include ${min} ${p.name}`,
        profileId: p.id,
      }));
    }
  }

  return out;
}

/** Catalogue faction ids are file names ("Iron Sultanate"); rosters use slugs. */
export function factionMatches(a: string, b: string): boolean {
  const k = nameKey;
  return k(a) === k(b) || k(a).includes(k(b)) || k(b).includes(k(a));
}

/** Wargear legality from the Armoury Table restriction text. */
function checkWargear(
  roster: Roster,
  profiles: Map<string, UnitProfile>,
  weapons: Map<string, { id: string; name: string; restrictions?: string[] }>,
  armoury?: Armoury
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

      // A faction that does not stock an item cannot buy it. This is a real
      // rule the old data could not express: the armoury *is* the list of what
      // is available, not merely what it costs.
      if (armoury && !stocks(armoury, w)) {
        // Advisory, not blocking — deliberately. The rule is right: a faction
        // can only buy from its own armoury. But our picture of that armoury is
        // not yet complete, because a Warband Variant can extend it. The House
        // of Wisdom's *Weapon Collections* grants an Automatic Rifle and an
        // Anti-Tank Hammer that the standard Iron Sultanate table does not
        // list, and those grants are not modelled yet.
        //
        // Blocking on an incomplete picture would tell a player their legal
        // roster is illegal, which is worse than not checking: they cannot act
        // on it and they stop trusting the rest. So it is raised as something
        // to confirm, and it says why.
        out.push(warn({
          code: 'wargear-not-stocked',
          message: `${w.name} is not in the ${armoury.faction} Armoury Table — ` +
                   `check whether your variant grants it.`,
          rule: `${armoury.faction} Armoury Table. Variant armoury grants ` +
                `(e.g. Weapon Collections) are not modelled yet.`,
          unitId: u.id,
        }));
        continue;
      }

      for (const r of restrictionsOf(w, armoury)) {
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
    for (const r of restrictionsOf(w, armoury)) {
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

/**
 * The restrictions in force for this warband.
 *
 * The faction's armoury is authoritative, because the same weapon is restricted
 * differently by different factions — an Automatic Rifle is `Limit: 1` for New
 * Antioch and `Limit: 2` for the Heretic Legions. The weapon's own list is the
 * union across every armoury, and is only a fallback for a roster whose faction
 * we could not match.
 */
function restrictionsOf(
  w: { id?: string; name: string; restrictions?: string[] },
  armoury?: Armoury
): Restriction[] {
  const text = armoury ? restrictionsFor(armoury, w) : (w.restrictions ?? []);
  return text.flatMap(parseRestrictions);
}

/* ------------------------------------------------------- variant mechanics */

/**
 * A variant's effect on a unit's recruitment limits, taken from its derived
 * ops rather than from prose.
 *
 * "Pride of Jabir: a House of Wisdom Warband can include 0-3 Lions of Jabir" is
 * an `increment` of 1 on the Lion's roster-max constraint. Reading it from the
 * catalogue beats regexing the sentence: the sentence wraps across lines in the
 * PDF, phrases the same rule three different ways across variants, and says
 * nothing at all for the three variants the PDF extraction never produced.
 */
export function variantLimits(
  profile: UnitProfile,
  variant: WarbandVariant | undefined
): { min: number | null; max: number | null } {
  let { min, max } = profile;
  const key = profile.entryId ?? profile.id;

  for (const op of (variant?.ops ?? []) as VariantOp[]) {
    if (op.target?.id !== key) continue;
    if (!op.field?.startsWith('constraint:')) continue;

    const id = op.field.slice('constraint:'.length);
    const c = profile.constraints?.find((x) => (x as { id?: string }).id === id);
    // The op may name a bound directly (`-min` / `-max`), otherwise the
    // constraint it points at says which one it is.
    const bound = op.constraintBound ?? c?.type;
    if (bound !== 'min' && bound !== 'max') continue;

    const value = Number(op.value);
    if (!Number.isFinite(value)) continue;
    const current = bound === 'min' ? min : max;
    const next =
      op.op === 'set' ? value
      : op.op === 'increment' ? (current ?? 0) + value
      : op.op === 'decrement' ? (current ?? 0) - value
      : current;

    if (bound === 'min') min = next; else max = next;
  }
  return { min, max };
}

interface VariantOp {
  op: string;
  field: string;
  value: string;
  constraintBound?: 'min' | 'max';
  target?: { kind: string; id: string; name?: string };
}

/**
 * Entries a variant forbids outright. The catalogues express this as
 * `set hidden = true` on the unit, conditioned on the variant — the
 * machine-readable form of "a House of Wisdom Warband cannot include a
 * Yüzbaşı, Janissaries, or Sultanate Assassins".
 */
export function variantForbids(variant: WarbandVariant | undefined): Set<string> {
  const out = new Set<string>();
  for (const op of (variant?.ops ?? []) as VariantOp[]) {
    if (op.field === 'hidden' && String(op.value) === 'true' && op.target?.id) {
      out.add(op.target.id);
    }
  }
  return out;
}

/**
 * Warband Variant rules — "cannot include Trench Moles", "must include 1
 * Trench Cleric". Seventeen variants; the app supported none.
 */
function checkVariant(
  roster: Roster,
  variant: WarbandVariant | undefined,
  profiles: Map<string, UnitProfile>
): Violation[] {
  if (!variant) return [];
  // Where the catalogues gave us ops, they are the authority: they are exact,
  // they cover the three variants the PDF extraction missed, and they do not
  // depend on a sentence surviving a PDF line wrap. The prose reader below is
  // the fallback for a variant that has no derived ops at all.
  if (variant.ops?.length) return [];
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

/* ------------------------------------------------------ faction-level rules */

/**
 * Faction special rules, which apply to every warband of that faction
 * *including its variants* — distinct from the variant rules above.
 *
 * Only New Antioch and the Black Grail have any: the other four factions
 * state, in the book, that they have none. The one with a countable bound is
 * the Fireteam cap:
 *
 *     New Antioch Fireteams: A New Antioch Warband can include up to 2
 *     Fireteams.
 *
 * A variant can move it — "a Stosstruppen of the Free State of Prussia Warband
 * can include up to 3 Fireteams instead of only 2" — so the variant's own rules
 * are read second and win.
 */
const FIRETEAM_CAP = /can include up to (\d+)\s+Fireteams?/i;

export function fireteamCap(
  faction: { specialRules?: FactionSpecialRule[] } | undefined,
  variant: WarbandVariant | undefined
): number | null {
  let cap: number | null = null;
  for (const r of faction?.specialRules ?? []) {
    const m = r.description?.match(FIRETEAM_CAP);
    if (m) cap = Number(m[1]);
  }
  for (const r of variant?.specialRules ?? []) {
    const m = r.description?.match(FIRETEAM_CAP);
    if (m) cap = Number(m[1]);          // the variant overrides the faction
  }
  return cap;
}

function checkFactionRules(
  roster: Roster,
  faction: { name?: string; specialRules?: FactionSpecialRule[] } | undefined,
  variant: WarbandVariant | undefined
): Violation[] {
  const cap = fireteamCap(faction, variant);
  if (cap == null) return [];

  // A Fireteam is a pair, so two models carrying the keyword are one team.
  const inFireteams = roster.units.filter((u) => u.fireteam).length;
  const teams = Math.ceil(inFireteams / 2);
  if (teams <= cap) return [];

  return [err({
    code: 'faction-rule',
    message: `${teams} Fireteams — ${variant?.name ?? faction?.name} allows up to ${cap}.`,
    rule: `${faction?.name} Fireteams: can include up to ${cap} Fireteams`,
  })];
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

  violations.push(...checkRecruitmentLimits(roster, profiles, variant));
  const armoury = armouryFor(dataset, roster.factionId);
  violations.push(...checkWargear(roster, profiles, weapons, armoury));
  violations.push(...checkVariant(roster, variant, profiles));

  const faction = (dataset as unknown as { factions?: { id: string; name: string;
    specialRules?: FactionSpecialRule[] }[] }).factions
    ?.find((f) => factionMatches(f.id, roster.factionId) || factionMatches(f.name, roster.factionId));
  violations.push(...checkFactionRules(roster, faction, variant));

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
