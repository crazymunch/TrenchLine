/**
 * Every repository path the documentation names must exist.
 *
 * AUD-1 asked for a documentation check, and only "if it can be based on
 * stable structural markers. Do not add a brittle grep over prose merely to
 * claim automation." A grep for stale PHRASES is exactly that trap: the
 * wording of a status line is not a stable marker, and such a test fails for a
 * rewrite that is perfectly true while passing a claim that is quietly false.
 *
 * A PATH is structural. A doc that sends you to `src/store/useStore.ts` for
 * the store's contents, or at a script that has been renamed, is wrong in a
 * way this can prove — and that is the failure these docs actually had: they
 * described a file layout that had moved on.
 *
 * It cannot catch a stale CLAIM about a file that still exists. Nothing
 * automatic can; that is what re-reading the code before changing a status
 * marker is for.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/*
  `AUDIT.md` is exempt, and the exemption is the point of it.

  It is a record of the codebase at one moment, and naming files that have
  since been deleted is what it is FOR — `officialCoreRules.ts`, `index.css`,
  the Vite entry points. A test that forced it to stay current would force it
  to stop being a record.
*/
const HISTORICAL = new Set(['docs/AUDIT.md']);

const DOCS = [
  'CLAUDE.md',
  ...fs.readdirSync(path.join(ROOT, 'docs'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => `docs/${f}`),
].filter((d) => !HISTORICAL.has(d));

/*
  A backticked path whose first segment is a directory this repo actually has.
  Deliberately narrow: prose says `roster` and `main` and neither is a file, so
  only a leading segment that is a real top-level directory counts as a claim
  about the tree.
*/
const ROOTS = ['src/', 'scripts/', 'prisma/', 'e2e/', 'public/', 'docs/', 'data-sources/', '.github/'];
const CODE_SPAN = /`([^`\s]+)`/g;

/** Trailing punctuation belongs to the sentence, not to the path. */
const trim = (p) => p.replace(/[.,;:)]+$/, '');

/*
  A line reference names WHERE in the file, not a file called "x:32".

  Written more loosely than it once was. The first version accepted only
  `:32` and `:32-40` with an ASCII hyphen, and rejected `src/rules/validate.ts:78–111`
  — an en dash, which is what anything typeset rather than typed produces, and
  what the rules-coverage audit used throughout. Eight real files were reported
  missing on that basis alone.

  That is the failure this whole test exists to avoid, inverted: a guard that
  cries wolf teaches people to work around it, and the way you work around this
  one is to stop citing lines. Line citations are the most useful thing a doc
  about code can carry, so accept all three dashes.

  Not a comma-separated list of spans — `CODE_SPAN` above rejects any span
  containing whitespace, so `foo.ts:98–119, 604–615` is never extracted in the
  first place. A branch for it here would be unreachable code that reads like a
  guarantee.
*/
const LINE_REF = /:\d+(?:[-–—]\d+)?$/;

/** The repository paths a document names. Exported so the shapes can be tested. */
export function pathsInText(text) {
  const out = new Set();
  for (const m of text.matchAll(CODE_SPAN)) {
    const raw = trim(m[1]);
    if (!ROOTS.some((r) => raw.startsWith(r))) continue;
    /* A glob names a shape, and `<NN>` a template. Neither is a file. */
    if (raw.includes('*') || raw.includes('<')) continue;

    const file = raw.replace(LINE_REF, '');

    /*
      Something that names a FILE or is written as a DIRECTORY.

      A dotless path with no trailing slash is as likely to be a branch — the
      follow-up plan recommends `docs/audit-reconciliation` as one — and
      guessing wrong turns this into the brittle prose check AUD-1 asked for it
      not to be. A directory the docs mean as a directory is written with the
      slash, and is still checked.
    */
    const last = file.split('/').pop() ?? '';
    if (!last.includes('.') && !raw.endsWith('/')) continue;

    out.add(file);
  }
  return [...out];
}

const pathsIn = (doc) => pathsInText(fs.readFileSync(path.join(ROOT, doc), 'utf8'));

describe('the paths the documentation names', () => {
  for (const doc of DOCS) {
    it(`all exist — ${doc}`, () => {
      const missing = pathsIn(doc).filter((p) => !fs.existsSync(path.join(ROOT, p)));
      expect(missing, `${doc} names paths that are not in the repository`).toEqual([]);
    });
  }
});

/*
  The extraction itself, against the shapes people actually write.

  Testing this only through the real docs is not enough: it passes whenever the
  docs happen not to use a shape, which is exactly how the en dash went
  unnoticed until an audit written elsewhere arrived using it 8 times.
*/
describe('what counts as a path a document names', () => {
  const only = (text) => pathsInText(text);

  it('reads a bare path', () => {
    expect(only('see `src/rules/campaign.ts` for it')).toEqual(['src/rules/campaign.ts']);
  });

  it('drops a line reference in each of the three dashes', () => {
    for (const dash of ['-', '\u2013', '\u2014']) {
      expect(only(`\`src/rules/validate.ts:78${dash}111\``), dash)
        .toEqual(['src/rules/validate.ts']);
    }
  });

  it('drops a single line reference', () => {
    expect(only('`src/rules/arsenal.ts:112`')).toEqual(['src/rules/arsenal.ts']);
  });

  it('sees nothing at all in a span containing a space', () => {
    // Not a gap to be fixed here: the narrow span is what stops prose like
    // `see Success Rolls` being read as a filename. A multi-span citation is
    // simply invisible to this test, and that is the safe direction.
    expect(only('`src/rules/arsenal.ts:98\u2013119, 604\u2013615`')).toEqual([]);
  });

  it('still ignores globs, templates and prose words', () => {
    expect(only('`src/data/*.generated.ts` and `roster` and `main`')).toEqual([]);
    expect(only('`prisma/migrations/<NN>_name/migration.sql`')).toEqual([]);
  });

  it('does not treat a trailing colon or bracket as part of the name', () => {
    expect(only('in `src/rules/campaign.ts:`')).toEqual(['src/rules/campaign.ts']);
    expect(only('(`src/rules/campaign.ts:160\u2013168`)')).toEqual(['src/rules/campaign.ts']);
  });

  it('leaves a version-like suffix that is not a line reference alone', () => {
    // `:v2` is not a line number, so the name is taken as written and will
    // fail the existence check — which is the right answer for a typo.
    expect(only('`src/rules/campaign.ts:v2`')).toEqual(['src/rules/campaign.ts:v2']);
  });
});
