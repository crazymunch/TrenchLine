/**
 * Every overlay in the app owes the user the same four things.
 *
 * Body scroll lock, Escape, a focus trap, and focus returned to whatever
 * opened it. `Sheet` has had all four since Phase 3.1 and, for a long time,
 * nothing else did: across the rest of the app there was **one** Escape
 * handler, **one** scroll lock and **one** focus trap, all three inside
 * `Sheet` itself. A modal opened anywhere else let the page scroll under your
 * finger, could not be dismissed from the keyboard, and let Tab walk out into
 * the view behind it.
 *
 * That is not a dozen bugs. It is one bug written a dozen times, which is
 * exactly the kind a test can hold shut.
 *
 * The rule: a component that renders `fixed inset-0` — the backdrop every
 * overlay in this app draws — must get the behaviour from somewhere, either by
 * being built on `Sheet` or by calling `useOverlay`. It counts rather than
 * merely checking the import, because a file with two overlays and one hook
 * call has covered one of them.
 *
 * It cannot prove the ref reached the right element; nothing static can. What
 * it does prove is that no overlay was added with none of it, which is how
 * every one of these came to be missing it in the first place.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const COMPONENTS = path.resolve(import.meta.dirname, '../..');

/** The primitives themselves. `Sheet` draws the backdrop; the hook documents it. */
const PRIMITIVES = new Set([
  'ui/Sheet.tsx',
  'ui/useOverlay.ts',
]);

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(full);
    return /\.tsx?$/.test(e.name) ? [full] : [];
  });
}

const components = walk(COMPONENTS)
  .map((f) => ({
    rel: path.relative(COMPONENTS, f).split(path.sep).join('/'),
    source: fs.readFileSync(f, 'utf8'),
  }))
  .filter((f) => !PRIMITIVES.has(f.rel));

const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe('every overlay gets the scroll lock, Escape and the focus trap', () => {
  it('has components to check', () => expect(components.length).toBeGreaterThan(10));

  const withOverlays = components.filter((f) => count(f.source, /fixed inset-0/g) > 0);

  it('finds the overlays', () => expect(withOverlays.length).toBeGreaterThan(0));

  for (const { rel, source } of withOverlays) {
    it(`${rel} covers each of its overlays`, () => {
      const overlays = count(source, /fixed inset-0/g);
      /*
        `<Sheet` counts because Sheet draws its own backdrop and owns the
        behaviour; a component built on it renders no `fixed inset-0` of its
        own, so in practice this arm catches a file that does both.
      */
      const covered = count(source, /useOverlay\s*\(/g) + count(source, /<Sheet[\s>]/g);
      expect(
        covered,
        `${rel} renders ${overlays} overlay(s) and covers ${covered}. `
        + 'Build it on `Sheet`, or call `useOverlay(open, onClose)` and put the '
        + 'returned ref on the backdrop.',
      ).toBeGreaterThanOrEqual(overlays);
    });
  }
});
