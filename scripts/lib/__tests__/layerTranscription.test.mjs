import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

/**
 * Every value in the Warbands-book layer still says what its source says.
 *
 * The layer is a transcription, and a transcription's failure mode is drift:
 * the extract is regenerated, a line moves, and the layer goes on asserting
 * something the book no longer says at that place. Nothing else would notice —
 * the build would stay green and the app would print the stale text.
 *
 * So each op names its source lines in `_src`, and this reads those lines back
 * out of the extract and checks the value is there. It is deliberately not a
 * snapshot of the layer: a snapshot proves the file has not changed, and what
 * matters is whether the file still matches the BOOK.
 */

const LAYER = 'data-sources/layers/warbands-book.layer.json';
const EXTRACT = 'data-sources/rulebook/extracted/warbands-of-trench-crusade.txt';

const layer = JSON.parse(fs.readFileSync(LAYER, 'utf8'));
const lines = fs.readFileSync(EXTRACT, 'utf8').split('\n');

/** Whitespace is not signal: the PDF wraps mid-sentence and pads with tabs. */
const flat = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/**
 * The cited lines, joined.
 *
 * EVERY range in the citation, not just the first: an op may legitimately
 * point at two places — "L9804-9806, the deed at L9807-9809" — and reading
 * only the first failed that op for citing its source too precisely, which
 * is the wrong way round.
 */
const cited = (src) => {
  const spans = [...String(src).matchAll(/L(\d+)(?:\s*[-–]\s*(\d+))?/g)];
  if (!spans.length) return null;
  return flat(spans
    .map(([, a, b]) => lines.slice(Number(a) - 1, Number(b ?? a)).join(' '))
    .join(' '));
};

/** The text values an op asserts, with a label for the failure message. */
const claims = (op) => {
  const out = [];
  if (typeof op.value === 'string' && op.field !== 'allowedAlignment') {
    out.push([`${op.op} ${op.field}`, op.value]);
  }
  if (op.field === 'allowedAlignment') out.push(['allowedAlignment', op.value]);
  if (op.ability?.description) out.push([`ability ${op.ability.name}`, op.ability.description]);
  if (op.ability?.grantsDeed?.description) {
    out.push([`deed ${op.ability.grantsDeed.name}`, op.ability.grantsDeed.description]);
  }
  return out;
};

describe('the Warbands-book layer is a faithful transcription', () => {
  it('has ops, so an empty file cannot pass silently', () => {
    expect(layer.ops.length).toBeGreaterThan(5);
  });

  it('gives every op a source citation', () => {
    for (const op of layer.ops) {
      expect(op._src, `${op.op} on ${op.target?.id}`).toMatch(/L\d+/);
    }
  });

  it('addresses every target by id, never by name', () => {
    /*
      Two units are named "Combat Medic". The layer engine refuses an
      ambiguous name outright, but a name that is unique TODAY can stop being
      unique when a catalogue is refreshed, and then the op silently moves.
    */
    for (const op of layer.ops) {
      expect(op.target?.id, `${op.op}`).toMatch(/^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/);
    }
  });

  it('finds every transcribed value in the lines it cites', () => {
    for (const op of layer.ops) {
      const source = cited(op._src);
      expect(source, `${op.op} ${op.target?.id}: unreadable _src "${op._src}"`).toBeTruthy();
      for (const [label, value] of claims(op)) {
        expect(
          source.includes(flat(value)),
          `${label} on ${op.target?.id} is not in ${op._src}\n`
          + `  layer:  ${flat(value).slice(0, 120)}\n`
          + `  source: ${source.slice(0, 120)}`,
        ).toBe(true);
      }
    }
  });

  it('names a weapon the dataset holds for every addBattlekit', async () => {
    const { DATASET } = await import('../../../src/data/generated/trenchline.generated.ts');
    for (const op of layer.ops.filter((o) => o.op === 'addBattlekit')) {
      const hits = DATASET.weapons.filter((w) => w.name === op.weapon);
      expect(hits.length, `addBattlekit '${op.weapon}' matches ${hits.length} weapons`).toBe(1);
    }
  });
});
