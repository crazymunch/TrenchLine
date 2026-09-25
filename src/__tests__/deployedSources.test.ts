/**
 * Nothing the app ships may read `data-sources/`.
 *
 * `.vercelignore` excludes that directory from every deployment, and states
 * the rule in its own header: Deployment Storage is cumulative, this project
 * reached 63 GB and stopped being able to deploy, and roughly 50 MB of each
 * upload was source material the running app never reads. The test for whether
 * a file belongs there is whether `prisma generate && next build` reads it or
 * the server serves it. The app reads the GENERATED output in
 * `src/data/generated/`, which is committed.
 *
 * So an `import … from '../../data-sources/…'` under `src/` is a build that
 * succeeds everywhere except where it matters. CI has the whole checkout and
 * never sees it; Vercel does not, and `next build` cannot resolve the module.
 * That is exactly what happened on both heads of the pack-E1b branch: `check`
 * green, deployment failed forty seconds in, twice.
 *
 * A pipeline source that the app needs travels as generated output — read from
 * `data-sources/` by `scripts/rules-build.mjs`, where its citations live, and
 * emitted into `src/data/generated/`. See docs/DEPLOYMENT.md.
 *
 * Tests may read `data-sources/` freely: they run in CI and in the checkout,
 * never in the deployment. Prose may name it — a comment citing where a value
 * came from is the point of having citations. What is forbidden is a file the
 * bundle reaches asking the filesystem or the module graph for it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const SRC = path.resolve(import.meta.dirname, '..');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(full);
    return /\.(ts|tsx|mjs|js)$/.test(e.name) ? [full] : [];
  });
}

/**
 * The file with its comments taken out.
 *
 * Every citation in this codebase names the file a value came from, and a test
 * that failed on those is one people delete rather than obey. So prose is
 * allowed and code is not, and the way to tell them apart is to remove the
 * prose first — not to guess at the shape of the call.
 *
 * Block comments, line comments, and the `*` continuation lines inside a block
 * are all prose. Strings are left alone: a path in a string is the thing this
 * test is looking for.
 */
const withoutComments = (text: string): string => text
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
  /* A line that begins with `*` is a block comment's continuation and nothing
     else — no statement in this language starts with one. */
  .replace(/^\s*\*[^\n]*$/gm, ' ');

/**
 * Why the shape of the call is not what this looks at.
 *
 * The first version of this test matched `readFileSync(` followed by
 * `data-sources/` with no `)` between them — and `[^)]*` stops at the first
 * bracket, so `readFileSync(path.join(process.cwd(), 'data-sources/…'))`, the
 * form this PR's own tests use, walked straight past it. So did
 * `const P = 'data-sources/…'; readFileSync(P)`, where the path and the call
 * are on different lines entirely.
 *
 * There is no bound on the ways a path can reach a reader. What IS bounded is
 * the path: a file the deployment does not carry cannot be named by anything
 * the bundle runs. So the rule is the plain one — the string does not appear in
 * code under `src/` — and the comment-stripping above is what keeps the
 * citations legal.
 *
 * It holds for the generated data too, which is why the equivalence table
 * cites a fixture by its file name rather than its path: a path in a data
 * field is inert, but a rule with an exception for "the inert ones" is a rule
 * somebody has to adjudicate, and this one does not.
 */
const EXCLUDED = 'data-sources/';

describe('what the deployment does not have a copy of', () => {
  it('is not named by any code the app ships', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      if (withoutComments(fs.readFileSync(file, 'utf8')).includes(EXCLUDED)) {
        offenders.push(path.relative(SRC, file));
      }
    }
    expect(offenders, `these name ${EXCLUDED} in code, and no deployment carries it — `
      + 'route the value through src/data/generated/ instead (docs/DEPLOYMENT.md)')
      .toEqual([]);
  });

  it('catches every shape the path can reach a reader by', () => {
    /*
      The import that broke the deployment, and the two evasions the first
      version of this test let through — both of which fail on Vercel at
      request time with ENOENT rather than at build time.
    */
    const caught = (code: string) => withoutComments(code).includes(EXCLUDED);

    expect(caught("import EQUIVALENCE from "
      + "'../../data-sources/trench-companion/id-name-equivalence.json';")).toBe(true);
    expect(caught("readFileSync(path.join(process.cwd(), 'data-sources/x.json'), 'utf8')"))
      .toBe(true);
    expect(caught("const P = 'data-sources/x.json';\nreadFileSync(P, 'utf8');")).toBe(true);
    expect(caught("await import('../../data-sources/x.json')")).toBe(true);

    /* And what stays legal: a citation, in either comment style, including the
       `*` continuation lines a block comment wraps onto. */
    expect(caught(' * See `data-sources/resolutions.json`.')).toBe(false);
    expect(caught('// from data-sources/rulebook/extracted/changelog-1.0.2.txt')).toBe(false);
    expect(caught('/*\n  Measured against data-sources/battlescribe/Iron Sultanate.cat.\n*/'))
      .toBe(false);
    /* A URL is not a comment: `//` inside one must not swallow the rest. */
    expect(caught("fetch('https://example.com/x'); const P = 'data-sources/y.json';")).toBe(true);
  });

  it('agrees with .vercelignore about what is excluded', () => {
    /* If `data-sources/` ever stops being excluded, this whole file is moot and
       should be deleted rather than left asserting a rule nobody has. */
    const ignore = fs.readFileSync(
      path.resolve(import.meta.dirname, '../../.vercelignore'), 'utf8');
    expect(ignore.split('\n').map((l) => l.trim())).toContain(EXCLUDED);
  });
});
