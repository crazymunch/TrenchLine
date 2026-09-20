/**
 * The extract pipeline survives whatever wrote its input.
 *
 * An external audit reported three parsers failing on CRLF. The mechanism is
 * real and nasty under rule 1: `text.split('\n')` on a CRLF file leaves a
 * trailing `\r` on every line, so `line === 'Keywords'` silently becomes
 * false, a table cell carries an invisible character into the generated
 * dataset, and a heading match fails with no error anywhere. Wrong game data,
 * produced confidently.
 *
 * The audit named three files. Nineteen scripts split on a bare newline, so
 * fixing three would have fixed the three tests that caught it.
 *
 * This exists because the fix rots otherwise: the next parser someone writes
 * will reach for `.split('\n')` unless something fails when they do.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { toLines, normaliseNewlines } from '../lib/lines.mjs';

describe('splitting lines', () => {
  it('handles all three line-ending conventions', () => {
    expect(toLines('a\nb')).toEqual(['a', 'b']);
    expect(toLines('a\r\nb')).toEqual(['a', 'b']);
    // A lone \r is the one usually forgotten, and the one that turns a
    // document into a single enormous "line" rather than a visibly broken one.
    expect(toLines('a\rb')).toEqual(['a', 'b']);
    expect(toLines('a\r\nb\nc\rd')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('leaves no carriage return on any line', () => {
    // THE defect, stated directly.
    for (const line of toLines('Keywords\r\nBattlekit\r\n')) {
      expect(line).not.toMatch(/\r/);
    }
  });

  it('makes an equality check behave the same either way', () => {
    // What actually broke: `line === 'Keywords'` was false on CRLF input.
    expect(toLines('Keywords\r\n')[0]).toBe('Keywords');
    expect(toLines('Keywords\n')[0]).toBe('Keywords');
  });

  it('is total on empty and nullish input', () => {
    expect(toLines('')).toEqual(['']);
    expect(toLines(null)).toEqual([]);
    expect(toLines(undefined)).toEqual([]);
  });

  it('normalises without splitting, for the regex parsers', () => {
    // A pattern written with \n in it fails on CRLF too, and more quietly:
    // it usually just matches nothing.
    expect(normaliseNewlines('a\r\nb\rc')).toBe('a\nb\nc');
    expect(normaliseNewlines(null)).toBe('');
  });
});

describe('the same fixture, both ways', () => {
  /*
    The regression the plan asks for: feed real extracted text through the
    reader twice, once LF and once CRLF, and require identical output. A
    hand-written fixture would only prove the function handles strings I wrote.
  */
  const dir = 'data-sources/rulebook/extracted';
  const files = (() => {
    try {
      return readdirSync(dir).filter((f) => f.endsWith('.txt')).slice(0, 3);
    } catch { return []; }
  })();

  it('has extracted text to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const name of files) {
    it(`reads ${name} identically as LF and as CRLF`, () => {
      const lf = readFileSync(join(dir, name), 'utf8').replace(/\r\n|\r/g, '\n');
      const crlf = lf.replace(/\n/g, '\r\n');

      expect(crlf).not.toBe(lf);              // the fixture really differs
      expect(toLines(crlf)).toEqual(toLines(lf));
    });
  }
});

describe('no parser splits on a bare newline any more', () => {
  it('leaves none in scripts/lib', () => {
    /*
      The guard that stops this rotting. Scoped to the parsers — the two test
      files that split `git ls-files` output and a YAML slice are splitting
      strings this project produced, not catalogue input.
    */
    const dir = 'scripts/lib';
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith('.mjs') && f !== 'lines.mjs')
      .filter((f) => /\.split\((['"])\\n\1\)/.test(readFileSync(join(dir, f), 'utf8')));

    expect(offenders, 'use toLines() from scripts/lib/lines.mjs instead').toEqual([]);
  });
});
