/**
 * The scheduled advisory scan runs the SAME gate as CI.
 *
 * A pull-request gate only rechecks a lockfile when something changes it, and
 * an advisory published against a dependency nobody has touched is exactly the
 * case that never fires — so `dependency-advisories.yml` runs it on a clock.
 *
 * Two copies of the same nine lines of shell is a deliberate choice: a shared
 * composite action would be one more thing between a failure and the person
 * reading it. The cost of copying is drift, and that is what this removes —
 * without it, one could be hardened and the other quietly left behind, which
 * is worse than either arrangement.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (f) => fs.readFileSync(path.join(ROOT, '.github/workflows', f), 'utf8');

/**
 * The audit step, from its `- name:` to the end of its `run:` block.
 *
 * Bounded by INDENTATION rather than by what the next line looks like. Reading
 * it as "until the next `- name:` or a top-level key" swallowed the block
 * comment that follows the step in `ci.yml` — the one explaining why
 * `dependency-review-action` is not there — because a comment is neither.
 * Anything belonging to the step is indented past it; the first line that is
 * not, ends it.
 */
function auditStep(yaml) {
  const start = yaml.indexOf('- name: Audit production dependencies');
  expect(start, 'no audit step in this workflow').toBeGreaterThan(-1);

  /* Back up to the start of the line, so the step's own indent is measurable. */
  const lineStart = yaml.lastIndexOf('\n', start) + 1;
  const indent = start - lineStart;

  const lines = yaml.slice(lineStart).split('\n');
  const out = [lines[0]];
  for (const line of lines.slice(1)) {
    if (line.trim() === '') { out.push(line); continue; }
    if (line.search(/\S/) <= indent) break;
    out.push(line);
  }
  // Compared on content, not on the indentation each file happens to use.
  return out.map((l) => l.trim()).filter(Boolean).join('\n');
}

describe('the dependency gate', () => {
  it('is identical in the pull-request check and the scheduled scan', () => {
    expect(auditStep(read('dependency-advisories.yml')))
      .toBe(auditStep(read('ci.yml')));
  });

  it('still fails closed on an endpoint that cannot be reached', () => {
    /*
      The property PR #27 established and OPS-1 asks to keep: an audit that
      could not be run is an audit that did not clear these dependencies. If
      this assertion ever needs deleting, the gate has been weakened.
    */
    const step = auditStep(read('ci.yml'));
    expect(step).toMatch(/This is NOT a pass/);
    expect(step).toMatch(/exit 1/);
  });

  it('runs on a schedule as well as by hand', () => {
    const yaml = read('dependency-advisories.yml');
    expect(yaml).toMatch(/^\s*schedule:/m);
    expect(yaml).toMatch(/cron:/);
    expect(yaml).toMatch(/workflow_dispatch:/);
  });
});
