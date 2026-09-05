/**
 * Every Keyword the official 1.0.2 Changelog names.
 *
 * `docs/AUDIT.md` §1.3a found the app's glossary missing 7 of the 12 the
 * changelog defines — `CLEAVE (X)` and `DEADLY` among them, both core combat
 * Keywords used repeatedly in the Trench Dispatch, and a player looking either
 * up in the Codex got nothing.
 *
 * The audit calls that "the failure mode to guard against most carefully: not
 * invented data, but a claim of completeness that the code does not honour."
 * A claim of completeness is only worth making if something re-checks it, so
 * this reads the list back out of the changelog and the test compares it with
 * what ships.
 *
 * The changelog names a Keyword in two shapes, and reading only the first is
 * how `SKIRMISHER` would go unchecked:
 *
 *   NAME (Effect):            a new Keyword, defined inline
 *   <page> \t NAME            a change to an existing one, with `Keyword` (or
 *   Keyword                   `Keyword, 2nd sentence`, and the like) on the
 *   Change to: ...            next line
 *
 * Both name a Keyword the app has to carry. Neither is a heading the extractor
 * can anchor on, because the PDF has no headings — which is why the second
 * form is recognised by what FOLLOWS the name rather than by the name itself.
 */

/** `NAME (Effect):`, `NAME (Tag):`, `NAME (Special):` — a definition. */
const DEFINED = /\b([A-Z][A-Z0-9 ()X“”'’/-]{2,40}?)\s*\((?:Effect|Tag|Special)\):/g;

/**
 * A page reference, then an all-caps name, then a line opening `Keyword`.
 *
 * The name must be all-caps: the same column carries model names in title
 * case — `32 \t Combat Engineer \t Add the NEGATE MINED KEYWORD…` — and those
 * are entries being changed, not Keywords being named.
 */
const CHANGED = /^\d{1,3}\s*\t\s*([A-Z][A-Z0-9 ()X“”'’/-]{2,40})\s*$/;

export function changelogKeywords(text) {
  const names = new Set();
  for (const m of text.matchAll(DEFINED)) names.add(m[1].trim());

  const lines = text.split('\n');
  for (let i = 0; i < lines.length - 1; i += 1) {
    const m = CHANGED.exec(lines[i]);
    /* `New Keyword` is the label of the first form's own row, not a Keyword. */
    if (!m || /^NEW KEYWORD$/i.test(m[1].trim())) continue;
    if (/^Keyword\b/.test(lines[i + 1].trim())) names.add(m[1].trim());
  }
  return [...names].sort();
}

/** `CLEAVE (X)` and `CLEAVE` are the same Keyword; the parameter is not part of the name. */
export const bareName = (k) => k.replace(/\s*\(.*?\)\s*/g, ' ').trim().toUpperCase();
