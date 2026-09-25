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
 * A reference that RESOLVES the path, rather than one that mentions it.
 *
 * An `import`, a `require`, a dynamic `import()`, or any of the `fs` reads a
 * server component could make. Deliberately not a bare search for the word:
 * every citation in this codebase names the file it came from, and a test that
 * failed on those would be one people delete rather than obey.
 */
const RESOLVES = [
  /(?:^|\n)\s*import\s[^\n]*['"][^'"]*data-sources\//,
  /(?:^|\n)\s*(?:export\s+)?\{[^}]*\}\s*from\s*['"][^'"]*data-sources\//,
  /\brequire\s*\(\s*['"][^'"]*data-sources\//,
  /\bimport\s*\(\s*['"][^'"]*data-sources\//,
  /\b(?:readFileSync|readFile|createReadStream|readdirSync|existsSync|statSync)\s*\([^)]*data-sources\//,
];

describe('what the deployment does not have a copy of', () => {
  it('is not read by anything the app ships', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const text = fs.readFileSync(file, 'utf8');
      if (RESOLVES.some((re) => re.test(text))) {
        offenders.push(path.relative(SRC, file));
      }
    }
    expect(offenders, 'these read data-sources/, which no deployment carries — '
      + 'route the value through src/data/generated/ instead (docs/DEPLOYMENT.md)')
      .toEqual([]);
  });

  it('would catch the import that broke the deployment', () => {
    /* The exact line that failed, twice, so this test is known to detect it
       rather than merely asserting an empty list of its own choosing. */
    const broke = "import EQUIVALENCE from "
      + "'../../data-sources/trench-companion/id-name-equivalence.json';";
    expect(RESOLVES.some((re) => re.test(broke))).toBe(true);
    /* And the shapes it does not fire on: a citation, and a test's own read. */
    expect(RESOLVES.some((re) => re.test(' * See `data-sources/resolutions.json`.'))).toBe(false);
    expect(RESOLVES.some((re) => re.test("const D = 'data-sources/x.json';"))).toBe(false);
  });

  it('agrees with .vercelignore about what is excluded', () => {
    /* If `data-sources/` ever stops being excluded, this whole file is moot and
       should be deleted rather than left asserting a rule nobody has. */
    const ignore = fs.readFileSync(
      path.resolve(import.meta.dirname, '../../.vercelignore'), 'utf8');
    expect(ignore.split('\n').map((l) => l.trim())).toContain('data-sources/');
  });
});
