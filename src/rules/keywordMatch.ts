/**
 * Matching a Keyword as it is printed against the Keyword as it is defined.
 *
 * The glossary has 61 entries. The catalogues and books use **89** distinct
 * Keyword strings, and only 41 of them are a glossary name spelled exactly.
 * The other 48 are the same Keywords carrying their value, or their plural, or
 * a hyphen the glossary does not use:
 *
 *   glossary            printed
 *   ------------------  --------------------------------------------------
 *   +/- DICE            +1 DICE   +2 DICE   -1 DICE
 *   +/- INJURY DICE     +2 INJURY DICE
 *   AUTOMATIC (X)       AUTOMATIC 2   AUTOMATIC 3   AUTOMATIC 5
 *   BLAST (X")          BLAST   BLAST 2"   BLAST 3''   BLAST 3”
 *   CLEAVE (X)          CLEAVE 2
 *   NEGATE [KEYWORD]    NEGATE GAS   NEGATE FIRE   NEGATE DIFFICULT TERRAIN
 *   IGNORE [MODIFIER]   IGNORE COVER   IGNORE OFF-HAND WEAPON
 *   AMMUNITION (KEYWORD)  AMMUNITION (CRITICAL)   AMMUNITION (+1 DICE)
 *   ARMOUR PIERCING     ARMOUR-PIERCING   ARMOUR PIERCING 2
 *   IGNORE ARMOUR       IGNORES ARMOUR
 *   HELD                Held
 *
 * This matters because of how the failure looks. A Keyword that does not match
 * is simply not highlighted, and a player reading a card cannot tell "this word
 * has no rule" from "the app did not recognise it". Silence is the wrong
 * answer, and it would fall hardest on the parameterised Keywords — exactly the
 * ones whose value a player most wants to look up.
 *
 * Matching is deliberately conservative in one direction: a printed string that
 * resolves to nothing resolves to nothing, and the caller shows it as plain
 * text. It never picks a nearest entry. `CLERGY`, `LIMITED POTENTIAL` and
 * `FIRETEAM (see Sworn Brethren)` are real strings with no glossary entry, and
 * inventing one for them would be worse than leaving them unlinked.
 */
import type { Keyword } from '../types/catalogue';

/** The quote glyphs the sources use for inches, which are not all the same. */
const QUOTES = '"”“′″\'';

/** Compare two Keyword strings ignoring case, hyphens and runs of space. */
export const sameKeyword = (a: string, b: string): boolean =>
  canonical(a) === canonical(b);

/**
 * A Keyword string reduced to what identifies it.
 *
 * Hyphens become spaces (`ARMOUR-PIERCING`), quotes and full stops go, and case
 * is dropped. Numbers are KEPT: `AUTOMATIC 2` and `AUTOMATIC 3` are the same
 * Keyword but not the same statement, and a caller comparing two models' gear
 * needs to see the difference.
 */
export const canonical = (s: string): string =>
  s.normalize('NFKC')
    .replace(new RegExp(`[${QUOTES}]`, 'g'), '"')
    /*
      A hyphen is a spelling variant only BETWEEN LETTERS — `ARMOUR-PIERCING`
      for the glossary's `ARMOUR PIERCING`, `OFF-HAND` for `OFF HAND`.
      Everywhere else it is a minus sign, and flattening it destroyed the
      Keyword: `-1 DICE` became `1 DICE`, which matches nothing. Six of the
      eighty-nine printed Keywords are negative.
    */
    .replace(/(?<=[A-Za-z])[-‐-―](?=[A-Za-z])/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

/**
 * The pattern that recognises one glossary name in printed text.
 *
 * Built from the name's own shape rather than from a table of special cases, so
 * a Dispatch that adds `SMOULDER (X)` is matched without this file changing.
 */
export function keywordPattern(name: string): RegExp {
  const canon = canonical(name);

  /* Escape everything, then re-open the placeholders the glossary writes. */
  const escaped = canon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const body = escaped
    /*
      `AMMUNITION (KEYWORD)` — a Keyword whose value is another Keyword, and
      the only entry whose parentheses survive into print.
    */
    .replace(/\\\(KEYWORD\\\)$/, '\\(\\s*[^)]{1,40}\\s*\\)')
    /*
      `(X)` and `(X")` — a numeric value. Printed WITHOUT the brackets in every
      real case (`AUTOMATIC 3`, `BLAST 2"`), and sometimes omitted entirely
      (`BLAST` alone), so both the brackets and the value are optional.
    */
    .replace(/\s*\\\(X"?\\\)$/, `(?:\\s*\\(?\\s*[+-]?\\d+(?:\\.\\d+)?\\s*["]*\\s*\\)?)?`)
    /*
      `[KEYWORD]` and `[MODIFIER]` — `NEGATE GAS`, `IGNORE OFF-HAND WEAPON`.
      The value is one or more words, and it is required: bare `NEGATE` is not
      a statement about anything.
    */
    .replace(/\s*\\\[(?:KEYWORD|MODIFIER)\\\]$/,
      /*
        GROUPED. Ungrouped, the alternation escaped its own placeholder and the
        second branch became a top-level `\s+[A-Z]` — any capital letter after
        any space, anywhere in the sentence. It turned "Add -2 DICE to Injury
        Rolls" into four matches, three of them a single letter.
      */
      '(?:\\s+[A-Z][A-Z ]*[A-Z]|\\s+[A-Z])')
    /*
      `+/- DICE` — the sign and value are printed, the placeholder is not:
      `+2 DICE`, `-1 INJURY MODIFIER`. Both signs, and the number is required,
      because a bare `DICE` is not a Keyword.
    */
    .replace(/^\\\+\/-\s*/, '[+\\u2212-]\\s*\\d+\\s+');

  /*
    A trailing plural, and a trailing numeric value on a name that does not
    declare one — `BLOOD MARKERS`, `ARMOUR PIERCING 2`. Not applied to a name
    that already ends in a placeholder group, which handles its own.
  */
  const tail = /\)|\]|\*/.test(body.slice(-2)) ? '' : '(?:S\\b)?(?:\\s+\\d+)?';

  /*
    A plural on the FIRST word, where the name reads as a verb and an object:
    the catalogues print `IGNORES ARMOUR` for the glossary's `IGNORE ARMOUR`.
    Only applied to a multi-word name, so a one-word Keyword is not matched
    against its own plural twice — the tail above already does that.
  */
  const withVerbPlural = /^[A-Z]+ /.test(body)
    ? body.replace(/^([A-Z]+)(?= )/, '$1S?')
    : body;

  /*
    A word boundary only where the name STARTS with a word character.

    `\b` before `+` never matches: at the start of `+2 DICE` there is no
    boundary, because `+` is not a word character and neither is the nothing
    before it. Prefixing it unconditionally silently killed all six
    `+/-` Keywords — the class most worth linking, since a player reading
    `+2 INJURY DICE` is usually looking up what an Injury Die is.
  */
  const lead = /^[A-Za-z0-9]/.test(withVerbPlural) ? '\\b' : '';

  return new RegExp(`${lead}(?:${withVerbPlural})${tail}`, 'i');
}

/** A name with a placeholder stands for a family, not for one Keyword. */
const isTemplate = (name: string): boolean =>
  /\[[A-Z]+\]|\([^)]*[X]|\(KEYWORD\)|^\s*\+\//.test(name);

/**
 * Most specific name first, so a literal entry wins over a family.
 *
 * Literals before templates, then longest first within each. Length alone is
 * not enough and got this wrong: `IGNORE [MODIFIER]` is seventeen characters
 * and `IGNORE ARMOUR` is thirteen, so ordering by length sent every
 * `IGNORE ARMOUR` to the generic family entry — past the specific rule the
 * glossary prints for it, which is the one the player wanted.
 */
export const bySpecificity = (a: Keyword, b: Keyword): number => {
  const ta = isTemplate(a.name), tb = isTemplate(b.name);
  if (ta !== tb) return ta ? 1 : -1;
  return b.name.length - a.name.length;
};

export interface CompiledKeyword {
  keyword: Keyword;
  pattern: RegExp;
}

/*
  Compiling 61 regexes is not free, and this renders inside every ability on
  every unit card on a roster. The dataset is fetched once and shared, so the
  glossary array's identity is stable for the session and a WeakMap keyed on it
  gets every caller the same compiled set without any of them coordinating.
*/
const compiled = new WeakMap<Keyword[], CompiledKeyword[]>();

/** Compile the glossary once, most specific first. Memoised on the array. */
export const compileGlossary = (glossary: Keyword[]): CompiledKeyword[] => {
  const hit = compiled.get(glossary);
  if (hit) return hit;
  const built = [...glossary].sort(bySpecificity).map((keyword) => ({
    keyword,
    pattern: keywordPattern(keyword.name),
  }));
  compiled.set(glossary, built);
  return built;
};

/**
 * The glossary entry a printed Keyword string belongs to, or `null`.
 *
 * Anchored: the whole string must be the Keyword. This is for a Keyword chip on
 * a card, where the string is already known to be one Keyword — not for prose,
 * which is `highlightKeywords` below.
 */
export function resolveKeyword(
  printed: string,
  compiled: CompiledKeyword[],
): Keyword | null {
  const text = canonical(printed);
  if (!text) return null;
  for (const { keyword, pattern } of compiled) {
    const m = new RegExp(`^(?:${pattern.source})$`, 'i').exec(text);
    if (m) return keyword;
  }
  return null;
}

/** One run of text, with the glossary entry it names where it names one. */
export interface Segment {
  text: string;
  keyword?: Keyword;
}

/**
 * Split prose into plain runs and Keyword runs.
 *
 * Scans left to right taking the earliest match, and among matches starting at
 * the same place the longest — so `IGNORE ARMOUR` beats `IGNORE [MODIFIER]`
 * even though both start at the same word.
 *
 * Case-sensitivity is a judgement call and this is the reasoning: the books set
 * Keywords in caps, but so are headings, and prose capitalises ordinary words
 * at the start of a sentence. Matching case-insensitively would light up the
 * word "cover" in "take cover behind a wall". So a match must be **printed in
 * the source's own caps** to count — with one exception for a single leading
 * capital on a name that is a single word, which is how `Held` appears.
 */
export function highlightKeywords(
  text: string,
  compiled: CompiledKeyword[],
): Segment[] {
  if (!text) return [];
  const out: Segment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let best: { at: number; end: number; keyword: Keyword } | null = null;

    for (const { keyword, pattern } of compiled) {
      /*
        `g` and deliberately NOT `i`.

        The placeholder classes are `[A-Z]`, and under `i` they match lowercase
        too — so `NEGATE [KEYWORD]` ran past its Keyword and swallowed
        "NEGATE GAS is immune" as one match, which the caps check then threw
        away, leaving the bare `GAS` to win instead. The Keyword the sentence
        was actually about was the one it dropped.

        Case-insensitivity buys nothing in prose anyway: a run only counts if
        it is shouted, and every glossary name is stored upper case.
      */
      const re = new RegExp(pattern.source, 'g');
      re.lastIndex = cursor;
      const m = re.exec(text);
      if (!m || !m[0]) continue;
      if (!isPrintedAsKeyword(m[0])) continue;
      if (!best || m.index < best.at || (m.index === best.at && m[0].length > best.end - best.at)) {
        best = { at: m.index, end: m.index + m[0].length, keyword };
      }
    }

    if (!best) break;
    if (best.at > cursor) out.push({ text: text.slice(cursor, best.at) });
    out.push({ text: text.slice(best.at, best.end), keyword: best.keyword });
    cursor = best.end;
  }

  if (cursor < text.length) out.push({ text: text.slice(cursor) });
  return out;
}

/**
 * Whether a matched run is set as a Keyword rather than as ordinary words.
 *
 * In prose, the letters must be SHOUTED. That is the only signal available: the
 * books set every Keyword in caps and set nothing else in caps mid-sentence.
 *
 * A capitalised word is deliberately not enough here, even though the
 * catalogues do print `Held` that way in a Keyword field. In prose the same
 * test would light up "Cover the flank" and "Fear is contagious" — an ordinary
 * word at the start of a sentence, offered to the player as a rule. Better to
 * miss the rare sentence-cased Keyword than to invite someone to tap a word
 * that is not one.
 *
 * `resolveKeyword` is where the looser rule belongs, and has it: there the
 * whole string is already known to be a Keyword, so `Held` resolves.
 */
const isPrintedAsKeyword = (run: string): boolean => {
  const letters = run.replace(/[^A-Za-z]/g, '');
  return letters.length > 0 && letters === letters.toUpperCase();
};
