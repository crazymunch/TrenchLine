/**
 * Nothing the app ships may name `data-sources/`.
 *
 * `.vercelignore` excludes that directory from every deployment, and states the
 * rule in its own header: Deployment Storage is cumulative, this project
 * reached 63 GB and stopped being able to deploy, and roughly 50 MB of each
 * upload was source material the running app never reads. The test for whether
 * a file belongs there is whether `prisma generate && next build` reads it or
 * the server serves it. The app reads the GENERATED output in
 * `src/data/generated/`, which is committed.
 *
 * So a reference to it under `src/` is a build that succeeds everywhere except
 * where it matters. CI has the whole checkout and never sees it; Vercel does
 * not. That is what happened on both heads of the pack-E1b branch: `check`
 * green, deployment failed forty seconds in, twice.
 *
 * A pipeline source the app needs travels as generated output — read from
 * `data-sources/` by `scripts/rules-build.mjs`, where its citations live, and
 * emitted into `src/data/generated/`. See docs/DEPLOYMENT.md.
 *
 * Tests may read it freely: they run in CI and in the checkout, never in the
 * deployment. Prose may name it — a comment citing where a value came from is
 * the point of having citations.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const SRC = path.resolve(import.meta.dirname, '..');

/** The excluded directory, as a path SEGMENT. */
const EXCLUDED = 'data-sources';

/**
 * That segment, however it is written.
 *
 * `path.join(process.cwd(), 'data-sources', 'x.json')` names it with no slash
 * at all, so a pattern ending in `/` misses the one shape that looks most like
 * deliberate care. The segment may be followed by a slash, a quote, a comma or
 * nothing; what it may not be followed by is more word characters, so
 * `dataSources` and `data-sources-backup` are not it.
 */
const NAMES_EXCLUDED = new RegExp(`${EXCLUDED}(?![\\w-])`);

/**
 * The file with its comments taken out, and its strings left alone.
 *
 * Read character by character rather than with a regex, because both halves
 * matter and a regex cannot do both: `'https://example.com'` and
 * `'a//b'` are strings that contain what looks like a line comment, and
 * treating either as one swallowed the rest of the line — including, in the
 * worst case, the path this test is looking for. A string is where a path
 * lives; a comment is where a citation lives.
 */
const withoutComments = (text: string): string => {
  let out = '';
  let i = 0;
  let quote: string | null = null;
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];
    if (quote) {
      if (c === '\\') { out += text.slice(i, i + 2); i += 2; continue; }
      if (c === quote) quote = null;
      out += c;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; out += c; i += 1; continue; }
    if (c === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      out += ' ';
      i = end < 0 ? text.length : end + 2;
      continue;
    }
    if (c === '/' && next === '/') {
      const end = text.indexOf('\n', i);
      out += ' ';
      i = end < 0 ? text.length : end;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
};

/**
 * Why the shape of the call is not what this looks at.
 *
 * The first version matched `readFileSync(` followed by the path with no `)`
 * between them — and `[^)]*` stops at the first bracket, so
 * `readFileSync(path.join(process.cwd(), 'data-sources/…'))`, the form this
 * PR's own tests use, walked straight past it. So did
 * `const P = 'data-sources/…'; readFileSync(P)`, where the path and the call
 * are on different lines.
 *
 * There is no bound on the ways a path can reach a reader. What IS bounded is
 * the path, so the rule is the plain one: the segment does not appear in code.
 * It holds for the generated data too, which is why the equivalence table cites
 * a fixture by its file name rather than its path — a rule with an exception
 * for "the inert ones" is a rule somebody has to adjudicate, and this one is
 * not.
 */
const namesExcluded = (source: string): boolean =>
  NAMES_EXCLUDED.test(withoutComments(source));

/** Every file under a directory whose code names it. The scanner itself. */
function scan(dir: string): string[] {
  const walk = (at: string): string[] => fs.readdirSync(at, { withFileTypes: true })
    .flatMap((e) => {
      const full = path.join(at, e.name);
      if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(full);
      return /\.(ts|tsx|mjs|js)$/.test(e.name) ? [full] : [];
    });
  return walk(dir).filter((f) => namesExcluded(fs.readFileSync(f, 'utf8')))
    .map((f) => path.relative(dir, f));
}

describe('what the deployment does not have a copy of', () => {
  it('is not named by any code the app ships', () => {
    expect(scan(SRC), `these name ${EXCLUDED} in code, and no deployment carries it — `
      + 'route the value through src/data/generated/ instead (docs/DEPLOYMENT.md)')
      .toEqual([]);
  });

  it('catches every shape the path can reach a reader by, through the scanner', () => {
    /*
      Written to real files and scanned with the real scanner, because the
      version of this test that checked its own inline copy of the rule proved
      nothing: restoring the broken regex left it green.
    */
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deployed-sources-'));
    const write = (name: string, body: string) => {
      fs.writeFileSync(path.join(dir, name), body);
      return name;
    };
    try {
      /* The import that broke the deployment, and the shapes that evaded the
         first two versions of this test. */
      const caught = [
        write('a.ts', "import EQ from '../../data-sources/trench-companion/x.json';\n"),
        write('b.ts', "readFileSync(path.join(process.cwd(), 'data-sources/x.json'), 'utf8');\n"),
        write('c.ts', "const P = 'data-sources/x.json';\nreadFileSync(P, 'utf8');\n"),
        write('d.ts', "await import('../../data-sources/x.json');\n"),
        /* No slash at all — `path.join` with the segment as its own argument. */
        write('e.ts', "readFileSync(path.join(process.cwd(), 'data-sources', 'x.json'));\n"),
        /* A string that contains `//` must not swallow the line after it. */
        write('f.ts', "fetch('https://example.com/x');\nconst P = 'data-sources/y.json';\n"),
        /* On ONE line, so a naive `//…` strip would swallow the path with it. */
        write('g.ts', "const u = 'a//b'; readFileSync('data-sources/z.json');\n"),
      ];
      /* And what stays legal: citations, in either comment style. */
      const allowed = [
        write('h.ts', '/*\n * See `data-sources/resolutions.json`.\n */\nexport const x = 1;\n'),
        write('i.ts', '// from data-sources/rulebook/extracted/changelog-1.0.2.txt\nexport const y = 2;\n'),
        write('j.ts', "export const z = 'dataSources and data-sources-backup are not it';\n"),
      ];

      const found = scan(dir);
      for (const name of caught) expect(found, name).toContain(name);
      for (const name of allowed) expect(found, name).not.toContain(name);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('agrees with .vercelignore about what is excluded', () => {
    /* If the directory ever stops being excluded, this whole file is moot and
       should be deleted rather than left asserting a rule nobody has. */
    const ignore = fs.readFileSync(
      path.resolve(import.meta.dirname, '../../.vercelignore'), 'utf8');
    expect(ignore.split('\n').map((l) => l.trim())).toContain(`${EXCLUDED}/`);
  });
});
