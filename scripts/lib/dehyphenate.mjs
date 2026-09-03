/**
 * Joining a word the PDF broke across a line.
 *
 * A justified column ends a line on a hyphen for two different reasons and the
 * text extraction records both the same way:
 *
 *   - a **soft** hyphen the typesetter inserted to fit the measure —
 *     `bo-\nnus`, `Mercenar-\nies`, `AC-\nTION`, `SHOT-\nGUN`
 *   - a **real** hyphen that belongs to the word —
 *     `roll-\noff`, `co-\nopted`, `corpse-\nchoked`, `Off-\nHand`
 *
 * Always dropping the hyphen gives `rolloff` and `coopted`; always keeping it
 * gives `bo-nus` and `SHOT-GUN`. Neither is acceptable: `roll-off` is a rules
 * term a player searches for, and `SHOT-GUN` is a Keyword that would then match
 * nothing.
 *
 * Two signals separate them, and between them they get every one of the 44
 * hyphenated breaks in the Carcass Front book right:
 *
 *   1. **A compound-forming left fragment.** `co-`, `roll-`, `half-`,
 *      `corpse-`. A soft break lands anywhere in a word, so its left fragment
 *      is almost never itself a prefix or a whole word used in compounds —
 *      `Mercenar-`, `Castiga-`, `instanc-`.
 *   2. **Mixed case on both sides.** `Off-Hand`, `Meta-Christ`,
 *      `May-He-Never-Know`. A soft break inside a word in caps gives caps on
 *      both sides (`MARK-ERS`), and one inside a Capitalised word gives a
 *      lower-case right fragment (`Battle-kit`, `Deploy-ment`) — so requiring
 *      a capital on BOTH sides separates the compound from the break.
 *
 * `scripts/lib/__tests__/dehyphenate.test.mjs` pins every case the book
 * actually contains, on both sides of the decision.
 */

/**
 * Left fragments that form a compound rather than a broken word.
 *
 * Standard English prefixes plus the words this book compounds with. Kept
 * short on purpose: a wrong entry here turns a broken word into a hyphenated
 * one, which is the more visible error and the easier one to spot in a test.
 */
const COMPOUND_LEFT = new Set([
  // prefixes that always keep their hyphen
  'co', 'non', 'anti', 'multi', 'semi', 'ex', 'self', 'pre', 'post', 'pseudo',
  'quasi', 'pro', 'neo', 'all', 'cross', 'counter',
  // words this book compounds with
  'roll', 'map', 'iron', 'corpse', 'half', 'smash', 'off', 'well', 'long',
  'short', 'high', 'low', 'one', 'two', 'three', 'four', 'five', 'six',
  'first', 'second', 'third', 'front', 'rear', 'left', 'right', 'hand',
]);

/** Both fragments are Capitalised words rather than one word broken in two. */
const bothCapitalised = (left, right) =>
  /[A-Z][a-z]/.test(left) && /^[A-Z][a-z]/.test(right);

/**
 * True when the hyphen ending `left` belongs to the word and must be kept.
 *
 * @param left  the fragment before the hyphen, hyphen included
 * @param right the fragment the next line begins with
 */
export function keepsHyphen(left, right) {
  const lastWord = /([A-Za-z]+)-$/.exec(left)?.[1] ?? '';
  if (COMPOUND_LEFT.has(lastWord.toLowerCase())) return true;
  return bothCapitalised(lastWord, right);
}

/**
 * Join a line ending in a hyphen to the line that follows it.
 *
 * Lines that do not end in a hyphen are joined with a single space, which is
 * the ordinary case.
 */
export function joinWrapped(left, right) {
  if (!/[A-Za-z]-$/.test(left)) return `${left} ${right}`.replace(/\s+/g, ' ');
  return keepsHyphen(left, right) ? left + right : left.slice(0, -1) + right;
}
