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
 * ## Names are resolved against THIS MODEL'S entry, not the ruleset
 *
 * The six Homunculus entries do not offer the same Formulae, and the
 * difference is load-bearing. The Iron Sultanate's Takwin Homunculus offers
 * **Two Heads** — *"This Takwin Homunculus can have both the Hawk Eyes and
 * Hypnotic Eyes Alchemical Formulas."* The five Golem copies (Court, Heretic
 * Legion, New Antioch, Trench Crusade, Trench Pilgrims) offer **Additional
 * Head** instead — *"The Homunculus has two heads and therefore can have two
 * sets of eyes via Alchemical Formula"* — and their Eye Options still say
 * *"without Two Heads"*.
 *
 * So a name resolved against the whole ruleset finds a Two Heads the model
 * can never buy, and a Golem holding Hawk Eyes and Additional Head is refused
 * Hypnotic Eyes against the sentence on the Formula it is holding. `known` is
 * therefore the Formulae the model's OWN entry offers.
 *
 * Where the exception names something that entry does not offer, the lifter
 * is a Formula on that entry whose text grants the same permission — the two
 * sentences quoted above. Where neither is found, the clause is a CAVEAT and
 * never a refusal: an exception this cannot resolve must not become an
 * unconditional refusal, which is the one direction of error that costs a
 * player a legal purchase.
 *
 * A prerequisite name that resolves to nothing is likewise reported, never
 * enforced as a phantom.
 */
import { nameKey } from './names';

export interface FormulaGate {
  /** Formulae that must already be on the model before this one may be taken. */
  requires: string[];
  /**
   * Formulae this one cannot sit beside.
   *
   * `unless` is the Formula that lifts the refusal, resolved against the
   * model's own entry — by name where the sentence's name is on offer there,
   * otherwise by the permission another Formula on that entry grants.
   *
   * `null` means the entry offers no lifter this could identify. That is NOT
   * an unconditional refusal: `formulaVerdict` treats it as a caveat, because
   * an exception it cannot resolve is a rule it cannot read, and refusing on
   * a rule it cannot read costs a player a legal purchase.
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

/**
 * The book's own wording, which the Iron Sultanate entry uses where the Court
 * copies use the short form:
 *
 *   "A Homunculus cannot have the Hypnotic Eyes Alchemical Formula if it has
 *    the Hawk Eyes Alchemical Formula unless it also has the Two Heads
 *    Alchemical Formula"
 *
 * Same rule, same three parts, different sentence — so it is read here rather
 * than the short form being treated as the only way a catalogue may say it.
 * The subject is the Formula being taken; the name after "if it has" is the
 * one that refuses it. No trailing period is required: the Takwin's Hypnotic
 * Eyes text ends without one.
 */
const CANNOT_HAVE_IF = new RegExp(
  'cannot have the\\s+(?:.+?)\\s+Alchemical Formula\\s+if it has the\\s+(.+?)\\s+Alchemical Formula'
  + '(?:\\s+unless it also has the\\s+(.+?)\\s+Alchemical Formula)?',
  'i',
);

/**
 * A Formula whose own text grants the permission an exception depends on.
 *
 * Both sentences the ruleset uses, quoted, because this is the one place a
 * regex stands in for a name:
 *
 *   Additional Head — "The Homunculus has two heads and therefore can have
 *                      two sets of eyes via Alchemical Formula."
 *   Two Heads       — "This Takwin Homunculus can have both the Hawk Eyes and
 *                      Hypnotic Eyes Alchemical Formulas."
 *
 * Matched on what the Formula SAYS rather than on either name, so the five
 * Golem entries and the one Takwin entry are handled by the same code, and a
 * catalogue that renames either is still read.
 */
const GRANTS_TWO_SETS_OF_EYES =
  /can have two sets of eyes|can have both the\s+.+?\s+and\s+.+?\s+Alchemical Formulas?/i;

function permissionGranter(
  offered: readonly { name: string; description?: string }[],
): string | null {
  const hit = offered.find((o) => GRANTS_TWO_SETS_OF_EYES.test(o.description ?? ''));
  return hit ? hit.name : null;
}

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
  /**
   * The Formulae THIS MODEL'S catalogue entry offers, with their rules text.
   * Not the ruleset's: see the header. A bare list of names is accepted for
   * the cases that have no permission clause to resolve.
   */
  offered: readonly ({ name: string; description?: string } | string)[] = [],
): FormulaGate {
  const text = (formula?.description ?? '').trim();
  if (!text) return EMPTY;

  const entries = offered.map((o) => (typeof o === 'string' ? { name: o } : o));
  const byKey = new Map(entries.map((o) => [nameKey(o.name), o.name]));
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
  const bookForm = CANNOT_HAVE_IF.exec(text);
  const unless = EXCLUDES_UNLESS.exec(text);
  if (bookForm) {
    const name = resolve(bookForm[1]);
    const stated = bookForm[2];
    const lift = stated
      ? (byKey.get(nameKey(stated)) ?? permissionGranter(entries))
      : null;
    if (stated && !byKey.has(nameKey(stated)) && !lift) unreadable.push(stated);
    if (name) excludes.push({ name, unless: lift ?? null });
  } else if (unless) {
    const name = resolve(unless[1]);
    /*
      The sentence's own name first; failing that, whatever on this entry
      grants the same permission. A Golem's Eye Options say "without Two
      Heads" and its entry offers Additional Head, so the name alone finds
      nothing and the permission finds the Formula the player can actually
      buy.
    */
    const lift = byKey.get(nameKey(unless[2])) ?? permissionGranter(entries);
    if (!byKey.has(nameKey(unless[2])) && !lift) unreadable.push(unless[2]);
    if (name) excludes.push({ name, unless: lift ?? null });
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
  offered: readonly ({ name: string; description?: string } | string)[] = [],
): FormulaVerdict {
  const gate = formulaGate(formula, offered);
  const has = new Set(held.map(nameKey));

  const missing = gate.requires.filter((r) => !has.has(nameKey(r)));
  if (missing.length) {
    return { allowed: false, reason: gate.text };
  }

  for (const ex of gate.excludes) {
    if (!has.has(nameKey(ex.name))) continue;
    if (ex.unless && has.has(nameKey(ex.unless))) continue;
    /*
      An exception this could not resolve on the model's own entry. Refusing
      here would turn "cannot be combined with X without Y" into "cannot be
      combined with X", which is the one direction of error that costs a
      player a legal purchase. The sentence is shown instead.
    */
    if (!ex.unless && gate.unreadable.length) {
      return { allowed: true, caveat: gate.text };
    }
    return { allowed: false, reason: gate.text };
  }

  return gate.unreadable.length
    ? { allowed: true, caveat: gate.text }
    : { allowed: true };
}
