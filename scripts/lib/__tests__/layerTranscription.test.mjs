import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

/**
 * Every transcribed value in a layer still says what its source says.
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

/**
 * The layers that cite lines, and the extract each cites into.
 *
 * `warbands-book` is a transcription end to end, so EVERY op must cite lines.
 * `dispatch-01` is older and much of it cites pages — 'p.6 The Cult of the
 * Black Grail Glory Items' — which this cannot read back. Those ops are left
 * alone; the ones that DO name lines are checked exactly as the book's are,
 * because a citation that can be read is a citation that can be wrong.
 */
const LAYERS = [
  {
    file: 'data-sources/layers/warbands-book.layer.json',
    extract: 'data-sources/rulebook/extracted/warbands-of-trench-crusade.txt',
    everyOpCitesLines: true,
  },
  {
    file: 'data-sources/dispatch/dispatch-01.layer.json',
    extract: 'data-sources/dispatch/trench-dispatch-01-april-2026.txt',
    everyOpCitesLines: false,
  },
];

/**
 * Whitespace is not signal: the PDF wraps mid-sentence and pads with tabs.
 *
 * `+2DICE` is the one known extraction artefact, and it is a kerning one: the
 * statline rows print `+0 DICE \t +2DICE`, losing the space in the second
 * column only. Every statline in the dataset reads `+N DICE`, so the layer
 * transcribes it that way and this normalises BOTH sides before comparing.
 * Narrow on purpose — it forgives a missing space in one fixed shape and
 * nothing else, so it cannot quietly forgive a wrong number.
 *
 * `✥` is the books' bullet. It marks where a named rule starts and carries no
 * meaning of its own, so the layers drop it and this drops it too. `▶`, the
 * cross-reference mark, is NOT dropped: the dataset keeps it — 'a Vivisector
 * (▶ see Vivisector)' — because it tells a reader there is another entry to
 * look at.
 */
const flat = (s) => String(s ?? '')
  .replace(/✥/g, ' ')
  .replace(/\s+/g, ' ')
  .replace(/([+-]\d+)(DICE\b)/g, '$1 $2')
  .trim();

/**
 * The cited lines, joined.
 *
 * EVERY range in the citation, not just the first: an op may legitimately
 * point at two places — "L9804-9806, the deed at L9807-9809" — and reading
 * only the first failed that op for citing its source too precisely, which
 * is the wrong way round.
 */
const cited = (src, lines) => {
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
  /*
    A keyword or a whole entity is a transcription too.

    The Gavel of Justice gained FIRE from a `setKeywords` and the Scripture
    Guardian's Vengeful Scripture arrived as an `add` carrying a name, a type,
    a range, keywords and two rules — none of which the checks above would have
    read, so the largest single transcription in either layer was the one
    nothing verified.
  */
  for (const k of op.keywords ?? []) out.push([`keyword ${k}`, k]);
  if (op.keyword) out.push([`keyword ${op.keyword}`, op.keyword]);
  const e = op.entity;
  if (e) {
    for (const f of ['name', 'type', 'range', 'rules', 'description']) {
      if (typeof e[f] === 'string' && e[f]) out.push([`entity ${e.name}.${f}`, e[f]]);
    }
    for (const k of e.keywords ?? []) out.push([`entity ${e.name} keyword ${k}`, k]);
  }
  return out;
};

describe.each(LAYERS)('$file is a faithful transcription', ({ file, extract, everyOpCitesLines }) => {
  const layer = JSON.parse(fs.readFileSync(file, 'utf8'));
  const lines = fs.readFileSync(extract, 'utf8').split('\n');
  /* Only the ops this can read back. See LAYERS. */
  const lineCited = layer.ops.filter((o) => /L\d+/.test(String(o._src ?? '')));

  it('has ops, so an empty file cannot pass silently', () => {
    expect(layer.ops.length).toBeGreaterThan(5);
    expect(lineCited.length).toBeGreaterThan(5);
  });

  it('gives every op a source citation', () => {
    for (const op of layer.ops) {
      expect(op._src, `${op.op} on ${op.target?.id ?? op.collection}`).toBeTruthy();
      if (everyOpCitesLines) {
        expect(op._src, `${op.op} on ${op.target?.id ?? op.collection}`).toMatch(/L\d+/);
      }
    }
  });

  it('addresses every target by id, never by name', () => {
    /*
      Two units are named "Combat Medic". The layer engine refuses an
      ambiguous name outright, but a name that is unique TODAY can stop being
      unique when a catalogue is refreshed, and then the op silently moves.
    */
    if (!everyOpCitesLines) return;
    for (const op of layer.ops) {
      expect(op.target?.id, `${op.op}`).toMatch(/^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/);
    }
  });

  it('finds every transcribed value in the lines it cites', () => {
    for (const op of lineCited) {
      const source = cited(op._src, lines);
      expect(source, `${op.op} ${op.target?.id}: unreadable _src "${op._src}"`).toBeTruthy();
      for (const [label, value] of claims(op)) {
        expect(
          source.includes(flat(value)),
          `${label} on ${op.target?.id ?? op.collection} is not in ${op._src}\n`
          + `  layer:  ${flat(value).slice(0, 160)}\n`
          + `  source: ${source.slice(0, 160)}`,
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
