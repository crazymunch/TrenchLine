/**
 * Comparing names across sources.
 *
 * Every join in this engine is by name, because the saved model and the
 * generated one share no ids. That makes one function — this one — responsible
 * for whether a model is found or silently dropped.
 *
 * The rule is **fold, don't strip**. Trench Crusade names carry diacritics
 * freely (Fāris, Yüzbaşı, Dhi'b al-Nafūd) and the sources disagree about them:
 * the catalogues print `Fāris`, a player types `Faris`, a PDF extraction may
 * lose the macron entirely. Dropping the accented character turned `Fāris` into
 * `fris`, which matched nothing and reported every renamed model as missing
 * from the ruleset.
 *
 * Two passes, because two different things are going on:
 *
 *  1. **Decomposition** splits a base letter from its combining mark, so the
 *     mark can go and the letter stay. That covers ā, ü, é, ş and the rest.
 *  2. **A fold table** for letters that are not accented forms at all and so do
 *     not decompose. Turkish dotless ı and German ß are their own letters, and
 *     NFD leaves them untouched — ı would then be dropped as non-ASCII, making
 *     `Yüzbaşı` and `Yuzbasi` disagree.
 *
 * The table holds exactly the characters that occur in the generated data
 * (checked across every unit, weapon and variant name), not a general Unicode
 * transliteration. If a new source introduces another, the symptom is a model
 * that silently fails to join — so widen it deliberately rather than reaching
 * for a transliteration library.
 */

/** Letters NFD does not decompose, and what each source spells them as. */
const FOLD: Record<string, string> = {
  'ı': 'i',   // Turkish dotless i — Yüzbaşı
  'ß': 'ss',  // the rulebook PDF transliterates it this way
};

/** A name reduced to the form two sources can be compared on. */
export function nameKey(s: unknown): string {
  return String(s ?? '')
    .replace(/[ıß]/g, (c) => FOLD[c] ?? c)
    .normalize('NFD')            // é -> e + combining acute
    .replace(/[̀-ͯ]/g, '')  // drop the marks, keep the letters
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
