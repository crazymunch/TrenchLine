/**
 * Evaluating catalogue modifiers against a roster selection.
 *
 * The BattleScribe catalogues state every conditional rule as a `Modifier`
 * (see `src/types/catalogue.ts`). A model's *printed* profile is the base
 * profile with its modifiers applied for the choices actually made:
 *
 *   Azeb, base Armour 0
 *     + Standard Armour selected      -> `set stats.armour = -1`
 *     + roster has The House of Wisdom -> `set name = Kavass`
 *   = "Kavass, Armour -1"
 *
 * which is exactly what the user's NewRecruit export prints, and what the old
 * hand-written data could not express at all — it had no Kavass, no derived
 * armour, and no way to reach `Favoured Brazen Bull`.
 *
 * Two rules govern this file:
 *
 *   - **Document order.** BattleScribe applies modifiers top to bottom and a
 *     later `set` overwrites an earlier `increment`. We reproduce that rather
 *     than imposing an order we think is more sensible; the catalogues are the
 *     authority on their own semantics.
 *   - **Never guess.** A condition we cannot decide (`instanceOf` needs a type
 *     hierarchy the catalogues do not give us) does not default to true or to
 *     false. The modifier is skipped and reported, so the UI can tell the
 *     player "this one is on you to check" instead of quietly getting it wrong.
 */
import type { Modifier, Condition, ConditionLeaf, UnitProfile } from '@/types/catalogue';

/** What has been selected, by catalogue entry id. */
export interface SelectionContext {
  /** Selected on this model: weapons, armour, advancements, options. */
  self: Set<string>;
  /** Selected anywhere in the roster: the Warband Variant, campaign rules. */
  roster: Set<string>;
  /** Selected on this model's parent entry, where one applies. */
  parent?: Set<string>;
  /**
   * The id of the roster's own catalogue, e.g. Iron Sultanate. Elite-promotion
   * titles are keyed on it: the shared promotion entry prepends "Favoured" for
   * the Sultanate and "Ascendant" for the Court, chosen by an `instanceOf`
   * against `primary-catalogue`.
   */
  primaryCatalogueId?: string;
}

export interface SkippedModifier {
  modifier: Modifier;
  why: string;
}

export interface EvaluatedProfile<T> {
  /** The profile as printed, with every decidable modifier applied. */
  profile: T;
  applied: Modifier[];
  /** Conditions we could not decide, or fields we do not know how to write. */
  skipped: SkippedModifier[];
  /** True when a `hidden` modifier fired: the entry is not available here. */
  hidden: boolean;
}

export const emptyContext = (): SelectionContext => ({ self: new Set(), roster: new Set() });

/* ------------------------------------------------------------- conditions */

/** Three-valued: a condition we cannot decide is `null`, never `false`. */
function countFor(leaf: ConditionLeaf, ctx: SelectionContext): number | null {
  if (leaf.field !== 'selections') return null;
  if (!leaf.childId) return null;

  // `primary-catalogue` asks which faction catalogue the roster belongs to,
  // not what has been selected in it.
  if (leaf.scope === 'primary-catalogue') {
    if (!ctx.primaryCatalogueId) return null;
    return ctx.primaryCatalogueId === leaf.childId ? 1 : 0;
  }

  const pool =
    // 'model' and 'self' are the same thing from where we evaluate: this model
    // and everything hanging off it.
    leaf.scope === 'self' || leaf.scope === 'model' ? ctx.self
    : leaf.scope === 'parent' ? ctx.parent
    // 'force' and 'roster' are the same pool for a single-force warband, which
    // is every Trench Crusade roster.
    : leaf.scope === 'roster' || leaf.scope === 'force' ? ctx.roster
    : undefined;

  if (!pool) return null;
  return pool.has(leaf.childId) ? 1 : 0;
}

/** `true` | `false` | `null` when undecidable. */
export function evaluateCondition(c: Condition, ctx: SelectionContext): boolean | null {
  if ('all' in c) {
    let unknown = false;
    for (const sub of c.all) {
      const r = evaluateCondition(sub, ctx);
      if (r === false) return false;      // one false settles an AND
      if (r === null) unknown = true;
    }
    return unknown ? null : true;
  }
  if ('any' in c) {
    let unknown = false;
    for (const sub of c.any) {
      const r = evaluateCondition(sub, ctx);
      if (r === true) return true;        // one true settles an OR
      if (r === null) unknown = true;
    }
    return unknown ? null : false;
  }

  const n = countFor(c, ctx);
  if (n === null) return null;
  const v = Number(c.value);
  if (!Number.isFinite(v)) return null;

  switch (c.type) {
    case 'atLeast':      return n >= v;
    case 'atMost':       return n <= v;
    case 'equalTo':      return n === v;
    case 'notEqualTo':   return n !== v;
    case 'greaterThan':  return n > v;
    case 'lessThan':     return n < v;
    // `instanceOf` against `primary-catalogue` is a straight identity test and
    // countFor has already answered it. Anywhere else it compares against a
    // category hierarchy the catalogues do not expand for us: undecidable,
    // deliberately, rather than defaulted to false.
    case 'instanceOf':
      return c.scope === 'primary-catalogue' ? n >= v : null;
    case 'notInstanceOf':
      return c.scope === 'primary-catalogue' ? n < v : null;
    default:             return null;
  }
}

/* ----------------------------------------------------------------- values */

/**
 * Statlines are strings that carry a sign and often a unit: `+2 Dice`, `-1`,
 * `6"/Infantry`. Increment and decrement have to touch the number and leave
 * everything else exactly as written.
 */
export function adjustNumeric(current: string, delta: number): string | null {
  const m = String(current ?? '').match(/^\s*([+-]?)(\d+)(.*)$/);
  if (!m) return null;
  const [, sign, digits, rest] = m;
  const next = (sign === '-' ? -Number(digits) : Number(digits)) + delta;
  // Keep an explicit sign only where the source had one, so `0` does not
  // become `+0` and `+2 Dice` does not become `2 Dice`.
  const signed = sign ? (next >= 0 ? `+${next}` : String(next)) : String(next);
  return `${signed}${rest}`;
}

function readPath(obj: Record<string, unknown>, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>(
    (cur, k) => (cur == null ? cur : (cur as Record<string, unknown>)[k]), obj);
}

function writePath(obj: Record<string, unknown>, dotted: string, value: unknown): void {
  const parts = dotted.split('.');
  let cur = obj;
  for (const k of parts.slice(0, -1)) {
    cur[k] = { ...((cur[k] as Record<string, unknown>) ?? {}) };
    cur = cur[k] as Record<string, unknown>;
  }
  cur[parts.at(-1)!] = value;
}

/** Fields that gate availability rather than carry a value. */
const GATES = new Set(['hidden', 'error', 'category', 'forces']);

/* ------------------------------------------------------------------ apply */

/**
 * Apply a modifier list to a copy of `entity`. Pure: the input is not touched.
 */
export function applyModifiers<T extends object>(
  entity: T,
  modifiers: Modifier[],
  ctx: SelectionContext
): EvaluatedProfile<T> {
  // Structured clone would drop nothing here, but a shallow copy plus
  // copy-on-write in writePath keeps the untouched sub-objects shared.
  const out = { ...(entity as Record<string, unknown>) };
  const applied: Modifier[] = [];
  const skipped: SkippedModifier[] = [];
  let hidden = false;

  for (const m of modifiers) {
    if (m.when) {
      const ok = evaluateCondition(m.when, ctx);
      if (ok === false) continue;
      if (ok === null) {
        skipped.push({ modifier: m, why: 'condition cannot be evaluated from the roster alone' });
        continue;
      }
    }

    if (m.field === 'hidden') {
      // `set hidden = true` is the catalogue saying "not available here" —
      // the machine-readable form of "a House of Wisdom cannot include a
      // Yüzbaşı". A `false` unhides an entry hidden by default.
      if (m.op === 'set') hidden = String(m.value) === 'true';
      applied.push(m);
      continue;
    }
    if (GATES.has(m.field)) {
      // Categories and errors are legality signals, not profile values. They
      // are recorded as applied so a caller can read them off `applied`, but
      // they do not write to the profile.
      applied.push(m);
      continue;
    }
    if (m.rawField) {
      skipped.push({ modifier: m, why: `unmapped catalogue field ${m.rawField}` });
      continue;
    }

    const current = readPath(out, m.field);

    switch (m.op) {
      case 'set':
        writePath(out, m.field, typeof current === 'number' ? Number(m.value) : m.value);
        break;

      case 'increment':
      case 'decrement': {
        const delta = (m.op === 'increment' ? 1 : -1) * Number(m.value);
        if (!Number.isFinite(delta)) {
          skipped.push({ modifier: m, why: `non-numeric ${m.op} value "${m.value}"` });
          continue;
        }
        if (typeof current === 'number') {
          writePath(out, m.field, current + delta);
          break;
        }
        const next = adjustNumeric(String(current ?? ''), delta);
        if (next === null) {
          skipped.push({ modifier: m, why: `cannot ${m.op} "${String(current)}"` });
          continue;
        }
        writePath(out, m.field, next);
        break;
      }

      case 'add':
      case 'remove': {
        const list = Array.isArray(current) ? [...(current as string[])] : [];
        if (m.op === 'add') {
          if (!list.includes(m.value)) list.push(m.value);
        } else {
          const i = list.indexOf(m.value);
          if (i >= 0) list.splice(i, 1);
        }
        writePath(out, m.field, list);
        break;
      }

      // `join` is the catalogue's own separator, normally U+00A0 so a title and
      // the name it decorates never break across lines. Absent means no gap.
      case 'append':
        writePath(out, m.field, `${String(current ?? '')}${m.join ?? ''}${m.value}`);
        break;

      case 'prepend':
        writePath(out, m.field, `${m.value}${m.join ?? ''}${String(current ?? '')}`);
        break;

      default:
        skipped.push({ modifier: m, why: `unsupported operation "${m.op}"` });
        continue;
    }

    applied.push(m);
  }

  return { profile: out as T, applied, skipped, hidden };
}

/**
 * A unit as it should print on the roster.
 *
 * `contributed` are model-scoped modifiers carried by entries selected *on*
 * this model rather than by the model itself. The elite-promotion titles work
 * this way: the shared `Elite Promotion` entry holds
 * `prepend "Favoured" to name, scope=model` and only fires once a player has
 * taken it, so the rename cannot live on the unit. Pass the modifiers of every
 * selected child whose `scope` is `model`; they apply after the unit's own,
 * which is the order BattleScribe resolves them in.
 */
export function effectiveUnit(
  unit: UnitProfile,
  ctx: SelectionContext,
  contributed: Modifier[] = []
): EvaluatedProfile<UnitProfile> {
  return applyModifiers(unit, [...(unit.modifiers ?? []), ...contributed], ctx);
}

/** The model-scoped modifiers a set of selected entries contributes. */
export function contributedModifiers(
  selectedEntryIds: Set<string>,
  entries: { entryId?: string; modifiers?: Modifier[] }[]
): Modifier[] {
  return entries
    .filter((e) => e.entryId && selectedEntryIds.has(e.entryId))
    .flatMap((e) => (e.modifiers ?? []).filter((m) => m.scope === 'model'));
}
