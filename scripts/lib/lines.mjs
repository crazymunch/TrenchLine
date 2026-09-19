/**
 * Read text as lines, whatever wrote it.
 *
 * An external audit reported three extract parsers failing on CRLF input. The
 * mechanism is real: `text.split('\n')` on a CRLF file leaves a trailing `\r`
 * on every line, so `line === 'Keywords'` quietly becomes false, a table cell
 * carries an invisible character into the generated dataset, and a heading
 * match fails without an error anywhere. Under rule 1 that is the worst shape
 * a bug can take — wrong game data, produced confidently.
 *
 * The audit named three files. Nineteen scripts split on a bare newline, so
 * patching three would have fixed the three tests that caught it and left the
 * rest carrying the same defect.
 *
 * `.gitattributes` keeps CRLF out of the working tree, which handles anything
 * that arrives through git. This handles everything that does not: text
 * extracted from a PDF, a catalogue downloaded over HTTP, a file a contributor
 * pastes in from Windows. Both halves are wanted — the first makes the problem
 * rare, and only the second makes it impossible.
 */

/**
 * Split text into lines on any of the three conventions.
 *
 * `\r\n` (Windows), `\n` (Unix) and a lone `\r` (classic Mac, and what some
 * PDF extractors emit for a soft line break). A lone `\r` is the one usually
 * forgotten, and it is the one that produces a single enormous "line" rather
 * than a visibly broken one.
 */
export function toLines(text) {
  if (text == null) return [];
  return String(text).split(/\r\n|\r|\n/);
}

/**
 * The whole text with its line endings normalised, but not split.
 *
 * For the parsers that run a regex across the document rather than walking
 * lines: a pattern written with `\n` in it fails on CRLF just as a split does,
 * and is harder to notice because it usually just matches nothing.
 */
export function normaliseNewlines(text) {
  if (text == null) return '';
  return String(text).replace(/\r\n|\r/g, '\n');
}

/** Read a file and return its lines, endings normalised. */
export async function readLines(path) {
  const { readFile } = await import('node:fs/promises');
  return toLines(await readFile(path, 'utf8'));
}

/** Read a file as text, endings normalised. */
export async function readText(path) {
  const { readFile } = await import('node:fs/promises');
  return normaliseNewlines(await readFile(path, 'utf8'));
}
