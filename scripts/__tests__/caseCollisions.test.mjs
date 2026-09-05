/**
 * No two source files may differ only by the case of their name.
 *
 * `src/components/codex/` held `RulesProse.tsx` and `rulesProse.ts`, and
 * `RulesProse.tsx` imported `'./rulesProse'`. On macOS and Windows — both
 * case-insensitive by default — that specifier can resolve to the importing
 * file itself, leaving the imported binding undefined. It built on Linux CI
 * and failed on a contributor's Mac.
 *
 * Nothing caught it. The FILENAMES do not collide, so `git ls-files` is clean
 * and every case-sensitivity check passes; it is the module SPECIFIERS that
 * collide, once the extension is dropped. So this checks what actually breaks:
 * two importable modules in one directory whose paths are the same once case
 * and extension are removed.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const CODE = new Set(['.ts', '.tsx', '.mjs', '.js', '.jsx']);

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

describe('module specifiers are unambiguous on a case-insensitive disk', () => {
  it('has files to check', () => expect(tracked.length).toBeGreaterThan(100));

  it('no two importable modules in a directory share a name but for case', () => {
    /** dir -> lowercased basename without extension -> the paths that claim it */
    const claims = new Map();

    for (const file of tracked) {
      const ext = path.extname(file);
      if (!CODE.has(ext)) continue;
      const key = `${path.dirname(file)}/${path.basename(file, ext).toLowerCase()}`;
      if (!claims.has(key)) claims.set(key, []);
      claims.get(key).push(file);
    }

    const collisions = [...claims.values()].filter((paths) => paths.length > 1);
    expect(
      collisions,
      'these resolve to each other on macOS and Windows; rename one, or move it',
    ).toEqual([]);
  });

  it('no two tracked paths differ only by case', () => {
    // The plainer sibling of the above: same path, different capitalisation.
    const seen = new Map();
    const collisions = [];
    for (const file of tracked) {
      const key = file.toLowerCase();
      if (seen.has(key)) collisions.push([seen.get(key), file]);
      else seen.set(key, file);
    }
    expect(collisions).toEqual([]);
  });
});
