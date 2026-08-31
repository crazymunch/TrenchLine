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
import type { Roster } from './costs';
import { budgetState, unitCost } from './costs';
import { parseRestrictions, satisfiesOnlyFor, type Restriction } from './restrictions';
import { armouryFor, restrictionsFor, stocks, type Armoury } from './armoury';
import { nameKey } from './names';
import { stockedAnywhere, variantArmoury } from './variantArmoury';
import { thirdPartyGate } from './thirdParty';
import { variantLocks, unlockedBy } from './variantLocks';

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
    | 'force-over-threshold'
    | 'force-over-field-strength'
    | 'unparsed-restriction'
    | 'third-party-not-allowed'
    | 'variant-locked';
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
  armoury?: Armoury,
  /** Needed to follow a variant's cross-faction armoury grants. */
  dataset?: Dataset,
  variant?: WarbandVariant
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
        // A variant can extend the armoury, so the faction's own table is not
        // the whole picture. Cross-faction grants are followed — Knights of
        // Avarice's *Corrupt Merchants* buys from New Antioch and the Iron
        // Sultanate — and an item a grant covers is simply legal.
        const reach = dataset
          ? stockedAnywhere(dataset, roster.factionId, variant, w)
          : { stocked: false, via: null };
        if (reach.stocked) continue;

        // Still advisory rather than blocking, and now for a narrower reason.
        // Two kinds of armoury rule remain unreadable: a variant with its own
        // Armoury Table the pipeline does not parse, and price or restriction
        // overrides stated in prose. Where a variant has one of those, the item
        // may well be legal, so the warning names the rule to check.
        const open = dataset && variant
          ? variantArmoury(variant, roster.factionId,
                           (dataset.armouries ?? []).map((a) => a.factionId)).unreadable
          : [];
        out.push(warn({
          code: 'wargear-not-stocked',
          message: `${w.name} is not in the ${armoury.faction} Armoury Table` +
                   (open.length
                     ? ` — check ${open.map((o) => `“${o.rule}”`).join(' and ')}.`
                     : ', and no rule this warband has grants it.'),
          rule: open.length
            ? `${armoury.faction} Armoury Table. ${variant?.name} has armoury rules ` +
              `whose effect is stated in prose and not yet modelled.`
            : `${armoury.faction} Armoury Table. A faction may only buy from an ` +
              `armoury it can reach.`,
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
  violations.push(...checkWargear(roster, profiles, weapons, armoury, dataset, variant));
  violations.push(...checkVariant(roster, variant, profiles));

  const faction = (dataset as unknown as { factions?: { id: string; name: string;
    specialRules?: FactionSpecialRule[] }[] }).factions
    ?.find((f) => factionMatches(f.id, roster.factionId) || factionMatches(f.name, roster.factionId));
  violations.push(...checkFactionRules(roster, faction, variant));
  violations.push(...checkThirdParty(roster, profiles));
  violations.push(...checkVariantLocks(roster, dataset, variant));

  const errors = violations.filter((v) => v.severity === 'error');
  return {
    legal: errors.length === 0,
    violations,
    errors,
    warnings: violations.filter((v) => v.severity === 'warning'),
  };
}

/**
 * Models rostered outside the Variant that unlocks them.
 *
 * The recruit list will not offer one, so this fires when the Variant is
 * changed afterwards — which the roster screen allows until the first game.
 * An error, not a warning: the model is not one this Warband may field. The
 * fix is the player's, either Variant or model; nothing is removed for them.
 */
function checkVariantLocks(
  roster: Roster,
  dataset: Dataset,
  variant: WarbandVariant | undefined,
): Violation[] {
  const locks = variantLocks(dataset);
  if (!locks.size) return [];

  const entryIdOf = new Map(dataset.units.map((u) => [u.id, u.entryId || u.id]));
  const out: Violation[] = [];

  for (const u of roster.units) {
    const lock = locks.get(entryIdOf.get(u.profileId) ?? u.profileId);
    if (!lock || unlockedBy(lock, variant)) continue;
    out.push(err({
      code: 'variant-locked',
      message: `${u.name} may only be fielded by a ${lock.variantNames.join(' or ')} ` +
               'Warband.',
      rule: 'Warband Variant',
      unitId: u.id,
    }));
  }
  return out;
}

/**
 * Third-party models on a Warband that has not opted in.
 *
 * The recruit list hides them, so this only fires when the option was on and is
 * then turned off — a table changing its mind between games, which is a real
 * thing to do. An error rather than a warning: the model is not legal for this
 * Warband as it now stands, and the fix is to turn the option back on or drop
 * the model. Nothing is deleted on the player's behalf.
 */
function checkThirdParty(
  roster: Roster,
  profiles: Map<string, UnitProfile>,
): Violation[] {
  if (roster.allowThirdParty) return [];
  const out: Violation[] = [];
  for (const u of roster.units) {
    const profile = profiles.get(u.profileId);
    if (!profile || !thirdPartyGate(profile).thirdParty) continue;
    out.push(err({
      code: 'third-party-not-allowed',
      message: `${u.name} is third-party content, which this Warband has not ` +
               'allowed. Turn on "3rd party" or remove the model.',
      rule: 'Allow Third-Party Mercenaries?',
      unitId: u.id,
    }));
  }
  return out;
}

/** Per-model cost, exposed so the UI need not import costs.ts separately. */
export { unitCost, budgetState };


/* ------------------------------------------------------------------ force */

/**
 * Whether the Force you would field is legal for this game of the campaign.
 *
 * Kept apart from `validateRoster` because it asks a different question. The
 * roster is what you *own* and it has no cap; the Force is what you *field* and
 * it has two. The book is explicit that the roster may exceed both:
 *
 *   "Your Warband's Threshold Value and/or its Field Strength may mean that you
 *    cannot take all of the models that are on your Warband Roster. When this is
 *    the case any models you do not use will have to sit the game out."
 *
 * So these are never errors against the roster. They say how much has to sit
 * out, which is a thing the player acts on, rather than telling them to delete a
 * model they are entitled to own.
 */
export function checkForceLimits(
  totalCost: number,
  modelCount: number,
  limits: { game: number; threshold: number; fieldStrength: number; extrapolated: boolean }
): Violation[] {
  const out: Violation[] = [];
  const past = limits.extrapolated
    ? ` The published table stops at game 12, so game ${limits.game} holds at the last row — set a campaign override if your group continues past it.`
    : '';

  if (totalCost > limits.threshold) {
    out.push({
      severity: 'warning',
      code: 'force-over-threshold',
      message:
        `Force costs ${totalCost} Ducats against a Threshold Value of ${limits.threshold} ` +
        `for game ${limits.game}. ${totalCost - limits.threshold} Ducats' worth must sit this game out.`,
      rule: 'Warband Threshold Table. The Threshold caps the Force you field, not the roster you own.' + past,
    });
  }

  if (modelCount > limits.fieldStrength) {
    out.push({
      severity: 'warning',
      code: 'force-over-field-strength',
      message:
        `${modelCount} models against a Field Strength of ${limits.fieldStrength} for game ` +
        `${limits.game}. ${modelCount - limits.fieldStrength} must sit this game out.`,
      rule:
        'Warband Threshold Table. Field Strength counts only models with a Warband Entry — ' +
        'Battlekit and Glory Items do not count. A scenario limit lower than Field Strength ' +
        'takes precedence over it.' + past,
    });
  }

  return out;
}
