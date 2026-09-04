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

function pathsIn(doc) {
  const text = fs.readFileSync(path.join(ROOT, doc), 'utf8');
  const out = new Set();
  for (const m of text.matchAll(CODE_SPAN)) {
    const raw = trim(m[1]);
    if (!ROOTS.some((r) => raw.startsWith(r))) continue;
    /* A glob names a shape, and `<NN>` a template. Neither is a file. */
    if (raw.includes('*') || raw.includes('<')) continue;

    /* A path with a line reference names the file, not a file called "x:32". */
    const file = raw.replace(/:\d+(-\d+)?$/, '');

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

describe('the paths the documentation names', () => {
  for (const doc of DOCS) {
    it(`all exist — ${doc}`, () => {
      const missing = pathsIn(doc).filter((p) => !fs.existsSync(path.join(ROOT, p)));
      expect(missing, `${doc} names paths that are not in the repository`).toEqual([]);
    });
  }
});
