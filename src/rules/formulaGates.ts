/**
 * What an Alchemical Formula requires, and what it refuses to sit beside.
 *
 * The catalogue states all of it in prose, on the Formula's own rules text,
 * and in exactly four shapes across the whole ruleset:
 *
 *   "Can only be bought if the Homunculus already has the Human Hands,
 *    Inhuman Strength and Massive Size Formulas."        — Gargantuan Size
 *   "Cannot be combined with the Wings formula."          — Human Hands
 *   "This formula cannot be combined with the Wings formula."  — Massive Size
 *   "Cannot be combined with Hawk Eyes without Two Heads."     — Hypnotic Eyes
 *
 * Derived from the sentence, never from the name, for the reason the rest of
 * this codebase derives: a Dispatch that reprices or renames a Formula needs
 * no edit here, and one that removes a restriction stops enforcing it rather
 * than enforcing a remembered version.
 *
 * ## The fifth sentence, deliberately not parsed
 *
 * Two Heads says *"This Takwin Homunculus can have both the Hawk Eyes and
 * Hypnotic Eyes Alchemical Formulas."* That is the same rule as Hypnotic
 * Eyes' *"without Two Heads"*, stated from the other side. Reading both would
 * be two mechanisms for one fact, and the failure mode is the one this
 * codebase keeps hitting: when they disagree, whichever ran last wins. The
 * exclusion carries its own exception, so the permission needs no code.
 *
 * ## Names are resolved, not trusted
 *
 * Every name pulled out of a sentence is matched against the Formulae the
 * ruleset actually has. One that resolves to nothing is NOT enforced as a
 * phantom prerequisite — it is reported, so the screen can show the sentence
 * and let the player judge, which is this codebase's standing answer to a
 * rule it cannot read.
 */
import { nameKey } from './names';

export interface FormulaGate {
  /** Formulae that must already be on the model before this one may be taken. */
  requires: string[];
  /**
   * Formulae this one cannot sit beside, each with the Formula that lifts the
   * refusal where the sentence names one. `null` means nothing lifts it.
   */
  excludes: { name: string; unless: string | null }[];
  /**
   * Names the sentences used that the ruleset has no Formula for. Surfaced
   * rather than enforced — see the header.
   */
  unreadable: string[];
  /** The sentence(s) the gate came from, for the screen that refuses. */
  text: string;
}

const EMPTY: FormulaGate = { requires: [], excludes: [], unreadable: [], text: '' };

/** "Can only be bought if the Homunculus already has the A, B and C Formulas." */
const REQUIRES = /only be (?:bought|taken)[^.]*?already has(?:\s+the)?\s+(.+?)\s+(?:Alchemical\s+)?Formulas?\b/i;

/**
 * "Cannot be combined with Hawk Eyes without Two Heads."
 *
 * Tried BEFORE the plain exclusion, because a sentence carrying an exception
 * read by the plain pattern would enforce the refusal and drop the way out of
 * it — the one direction of error that costs a player a legal purchase.
 */
const EXCLUDES_UNLESS = /cannot be combined with\s+(?:the\s+)?(.+?)\s+without\s+(?:the\s+)?([^.]+?)\s*\./i;

/** "Cannot be combined with the Wings formula." */
const EXCLUDES = /cannot be combined with\s+(?:the\s+)?(.+?)\s+(?:Alchemical\s+)?[Ff]ormulas?\b/i;

/** `A, B and C` / `A and B` / `A` — the book's own list punctuation. */
function names(list: string): string[] {
  return list
    .split(/\s*,\s*|\s+and\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Read one Formula's gate.
 *
 * `known` is every Formula name in the ruleset, so a name a sentence uses can
 * be resolved to the entry it means — and so one that resolves to nothing is
 * visible rather than silently enforced.
 */
export function formulaGate(
  formula: { name: string; description?: string } | null | undefined,
  known: readonly string[] = [],
): FormulaGate {
  const text = (formula?.description ?? '').trim();
  if (!text) return EMPTY;

  const byKey = new Map(known.map((n) => [nameKey(n), n]));
  const unreadable: string[] = [];
  /** The ruleset's own spelling, or null with the name recorded. */
  const resolve = (raw: string): string | null => {
    const hit = byKey.get(nameKey(raw));
    if (!hit) { unreadable.push(raw); return null; }
    return hit;
  };

  const requires: string[] = [];
  const req = REQUIRES.exec(text);
  if (req) {
    for (const n of names(req[1])) {
      const hit = resolve(n);
      if (hit) requires.push(hit);
    }
  }

  const excludes: FormulaGate['excludes'] = [];
  const unless = EXCLUDES_UNLESS.exec(text);
  if (unless) {
    const name = resolve(unless[1]);
    const lift = resolve(unless[2]);
    if (name) excludes.push({ name, unless: lift });
  } else {
    const ex = EXCLUDES.exec(text);
    if (ex) {
      const name = resolve(ex[1]);
      if (name) excludes.push({ name, unless: null });
    }
  }

  if (!requires.length && !excludes.length && !unreadable.length) return EMPTY;
  return { requires, excludes, unreadable, text };
}

export interface FormulaVerdict {
  allowed: boolean;
  /** The published sentence that refuses, where one does. */
  reason?: string;
  /**
   * A rule that touches this Formula and could not be read, so the player can
   * judge it. Never a refusal on its own.
   */
  caveat?: string;
}

/**
 * May this model take this Formula, given the ones it already has?
 *
 * Refuses on a stated prerequisite it does not meet, and on a stated exclusion
 * whose exception it does not have. An unreadable clause is a caveat and never
 * a refusal: a rule this cannot parse is not a rule to enforce by guess, and a
 * player who can see the sentence can apply it themselves.
 */
export function formulaVerdict(
  formula: { name: string; description?: string } | null | undefined,
  held: readonly string[],
  known: readonly string[] = [],
): FormulaVerdict {
  const gate = formulaGate(formula, known);
  const has = new Set(held.map(nameKey));

  const missing = gate.requires.filter((r) => !has.has(nameKey(r)));
  if (missing.length) {
    return { allowed: false, reason: gate.text };
  }

  for (const ex of gate.excludes) {
    if (!has.has(nameKey(ex.name))) continue;
    if (ex.unless && has.has(nameKey(ex.unless))) continue;
    return { allowed: false, reason: gate.text };
  }

  return gate.unreadable.length
    ? { allowed: true, caveat: gate.text }
    : { allowed: true };
}
