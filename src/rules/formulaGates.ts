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
 * Those four are the GOLEM COPIES' wording. The Iron Sultanate's own Takwin
 * Homunculus states the same rules at greater length — "A Takwin Homunculus
 * can only have this Alchemical Formula if it already has …", "A Homunculus
 * cannot have the X Alchemical Formula if it has the Y Alchemical Formula
 * unless it also has the Z Alchemical Formula" — and both wordings are read.
 * Taking the short form for the ruleset's is how the prerequisite came to be
 * enforced on five entries and not on the sixth (FORM-3).
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

/**
 * A prerequisite, in both the wordings the ruleset uses.
 *
 *   "Can only be bought if the Homunculus already has the Human Hands,
 *    Inhuman Strength and Massive Size Formulas."        — the Golem copies
 *   "A Takwin Homunculus can only have this Alchemical Formula if it already
 *    has the Human Hands, Inhuman Strength, and Massive Size Alchemical
 *    Formulas."                                          — the Iron Sultanate
 *
 * FORM-3. This read only the first, and this file's header quoted only the
 * first as though it were the ruleset's wording — which it is not: the Iron
 * Sultanate's Takwin Homunculus, the one entry the rule was written for, uses
 * the second. Gargantuan Size is the only Formula in the ruleset with a
 * prerequisite, so the effect was that `requires` was EMPTY for that entry
 * and the prerequisite was enforced on the five copies and not on the
 * original. Found by building the Formulas tab on top of it, which is exactly
 * what a rule with no caller hides.
 *
 * The two openings are an alternation over a shared tail, rather than two
 * regexes, because they are one rule written twice: "already has <list>
 * Formulas" is the part that carries the meaning.
 */
const REQUIRES =
  /only (?:be (?:bought|taken)|have this [^.]*?)[^.]*?already has(?:\s+the)?\s+(.+?)\s+(?:Alchemical\s+)?Formulas?\b/i;

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
 * One exclusion, weighed against what the model holds.
 *
 * `null` where the clause does not bite. Split out because it is asked twice
 * — of the Formula being taken, and of each one already held — see
 * `formulaVerdict`.
 */
function excluded(
  gate: FormulaGate, has: ReadonlySet<string>, name: string,
): FormulaVerdict | null {
  for (const ex of gate.excludes) {
    if (nameKey(ex.name) !== nameKey(name)) continue;
    if (ex.unless && has.has(nameKey(ex.unless))) continue;
    /*
      An exception this could not resolve on the model's own entry. Refusing
      here would turn "cannot be combined with X without Y" into "cannot be
      combined with X", which is the one direction of error that costs a
      player a legal purchase. The sentence is shown instead.
    */
    if (!ex.unless && gate.unreadable.length) return { allowed: true, caveat: gate.text };
    return { allowed: false, reason: gate.text };
  }
  return null;
}

/**
 * May this model take this Formula, given the ones it already has?
 *
 * Refuses on a stated prerequisite it does not meet, and on a stated exclusion
 * whose exception it does not have. An unreadable clause is a caveat and never
 * a refusal: a rule this cannot parse is not a rule to enforce by guess, and a
 * player who can see the sentence can apply it themselves.
 *
 * ## An exclusion is a fact about a PAIR, and the catalogue states it once
 *
 * FORM-5. This used to read the sentence on the Formula being taken and no
 * other, which is only half of a symmetric rule — and on the Iron Sultanate's
 * own entry, the half that is not written down.
 *
 * That entry states Wings ⊥ Massive Size on **Wings** ("A Homunculus cannot
 * have the Wings Alchemical Formula if it has the Massive Size Alchemical
 * Formula") and Human Hands ⊥ Wings on **Human Hands** ("A Homunculus cannot
 * have the Human Hands Alchemical Formula if it has the Wings Alchemical
 * Formula"). Neither pair is stated twice. So a Homunculus already holding
 * Human Hands was offered Wings without a word, because Wings' own sentence
 * says nothing about Human Hands — and the app would have sold a player a
 * combination the page in front of them forbids.
 *
 * Found by opening the tab on the owner's own September roster, where
 * Al-Masyukh holds Human Hands. No test found it: every test asked the
 * question from the side the sentence is written on.
 *
 * So each held Formula's own gate is read too, for an exclusion naming the
 * one being taken. The sentence returned is the one that actually refuses,
 * whichever Formula carries it, because that is the line the player has to be
 * able to find on the page.
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
    const verdict = has.has(nameKey(ex.name)) ? excluded(gate, has, ex.name) : null;
    if (verdict) return verdict;
  }

  /* The other half of the pair: what the HELD Formulae say about this one. */
  const taking = (formula?.name ?? '').trim();
  if (taking) {
    for (const name of held) {
      const entry = offered.find(
        (o) => typeof o !== 'string' && nameKey(o.name) === nameKey(name));
      if (!entry || typeof entry === 'string') continue;
      const verdict = excluded(formulaGate(entry, offered), has, taking);
      /* A caveat from a held Formula is not worth raising over the one the
         player is reading; only a refusal is. */
      if (verdict && !verdict.allowed) return verdict;
    }
  }

  return gate.unreadable.length
    ? { allowed: true, caveat: gate.text }
    : { allowed: true };
}
