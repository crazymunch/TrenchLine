import { describe, it, expect } from 'vitest';
import { parseRulesProse } from './rulesProse';

/**
 * Every input in this file is real: each one is a verbatim fragment of
 * `src/data/generated/trenchline.generated.ts` — its scenarios or its
 * `coreRules` chapters — not a construct invented to make the parser look
 * good. The hard-wrapping in `rejoins a bullet the extractor wrapped` in
 * particular is exactly what `parse-scenarios.mjs` emits, blank line and
 * shouted continuation included.
 *
 * The `#`-heading cases are the exception and say so: nothing in the shipped
 * data emits them today. They were verbatim from the hand-written
 * `officialCoreRules.ts`, deleted in favour of the extracted chapters, and the
 * support is kept because the renderer is shared and a future source may.
 */
describe('parseRulesProse', () => {
  it('treats a line that is only bold as a heading', () => {
    expect(parseRulesProse('**Objective Markers**')).toEqual([
      { kind: 'h', level: 3, text: 'Objective Markers' },
    ]);
  });

  it('reads a heading (no source emits these now — see the note above)', () => {
    expect(parseRulesProse('#### Success Roll Table (2D6)')).toEqual([
      { kind: 'h', level: 3, text: 'Success Roll Table (2D6)' },
    ]);
  });

  it('keeps bold inside a sentence as text, not as a heading', () => {
    const [block] = parseRulesProse('This scenario uses the **No Man’s Land** archetype.');
    expect(block).toEqual({
      kind: 'p',
      text: 'This scenario uses the **No Man’s Land** archetype.',
    });
  });

  it('collects a bulleted list', () => {
    // The Success Roll Table, as the extractor emits it.
    const source = [
      '- 2-6 — Failure. The roll is a Failure.',
      '- 7-11 — Success. The roll is a Success.',
    ].join('\n');

    expect(parseRulesProse(source)).toEqual([
      {
        kind: 'list',
        ordered: false,
        items: [
          '2-6 — Failure. The roll is a Failure.',
          '7-11 — Success. The roll is a Success.',
        ],
      },
    ]);
  });

  it('collects a numbered list', () => {
    // The Sequence Of Play, verbatim.
    const source = [
      '1. Initiative Phase: Determine which player has the Initiative and then carry out any “start of Turn” tasks.',
      '2. Activation Phase: The players alternate Activating their models, one at a time, until all of the models in both Warbands have been Activated once each.',
    ].join('\n');
    const blocks = parseRulesProse(source);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ kind: 'list', ordered: true });
  });

  it('starts a new list when the marker changes', () => {
    const blocks = parseRulesProse('- one\n1. two');
    expect(blocks.map((b) => b.kind === 'list' && b.ordered)).toEqual([false, true]);
  });

  it('rejoins a bullet the extractor wrapped', () => {
    // Verbatim from the Glorious Deeds section of the generated scenarios:
    // the extractor hard-wraps at the PDF's column width and separates the
    // fragments with a blank line, mid-sentence and mid-word-case.
    const source = [
      '- Bloodletting: An attack made by a friendly model results in the sixth BLOOD',
      '',
      'MARKER being placed beside an enemy model.',
      '',
      '- Cast Them Down: A friendly model causes an enemy model to Fall.',
    ].join('\n');

    const blocks = parseRulesProse(source);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      kind: 'list',
      ordered: false,
      items: [
        'Bloodletting: An attack made by a friendly model results in the sixth BLOOD MARKER being placed beside an enemy model.',
        'Cast Them Down: A friendly model causes an enemy model to Fall.',
      ],
    });
  });

  it('does not glue a finished paragraph to the next one', () => {
    const source = 'This scenario lasts four Turns.\n\nThe players roll-off.';
    expect(parseRulesProse(source).map((b) => b.kind)).toEqual(['p', 'p']);
  });

  it('ends a list at the next heading rather than swallowing it', () => {
    const source = ['- an unfinished line', '', '**Objective Markers**', '', 'The Markers shown on the map.'].join('\n');
    expect(parseRulesProse(source).map((b) => b.kind)).toEqual(['list', 'h', 'p']);
  });

  it('loses no words', () => {
    const source = [
      '**Risky Success Rolls**',
      '',
      'Sometimes you will be called on to take a Risky Success Roll for a model.',
      '',
      '1. Take 2 D6.',
      '',
      '- 2-6 — Failure. The roll is a Failure.',
    ].join('\n');

    // List markers are structure, not words: the parser consumes them and the
    // renderer draws its own. Everything else must survive.
    const words = (s: string) =>
      s
        .split('\n')
        .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ''))
        .join('\n')
        .replace(/[*#]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
    const got = parseRulesProse(source).flatMap((b) => {
      if (b.kind === 'list') return b.items.flatMap(words);
      if (b.kind === 'table') return [...b.header, ...b.rows.flat()].flatMap(words);
      return words(b.text);
    });

    expect(got).toEqual(words(source));
  });

  it('returns nothing for empty input', () => {
    expect(parseRulesProse('')).toEqual([]);
    expect(parseRulesProse('   \n\n  ')).toEqual([]);
  });
});

describe('tables', () => {
  /*
    The Carcass Front scenarios turn on roll tables — a Search Table, a 2D6
    naval-mine detonation table, four scenario-generator charts. Flattened into
    a paragraph they read `2-6 The naval mine does not explode now, but you
    must roll again 7-11 The naval mine is jostled…`, which is a roll table a
    player cannot use at the moment they are rolling on it.
  */
  it('reads a pipe table, header and rows', () => {
    const blocks = parseRulesProse([
      'When a mine is attacked, roll 2D6:',
      '',
      '| Roll | Result |',
      '| --- | --- |',
      '| 2-6 | The naval mine does not explode now. |',
      '| 12 | The mine explodes immediately. |',
      '',
      'Naval mine explosions have the following effect:',
    ].join('\n'));

    expect(blocks.map((b) => b.kind)).toEqual(['p', 'table', 'p']);
    const table = blocks[1];
    if (table.kind !== 'table') throw new Error('expected a table');
    expect(table.header).toEqual(['Roll', 'Result']);
    expect(table.rows).toEqual([
      ['2-6', 'The naval mine does not explode now.'],
      ['12', 'The mine explodes immediately.'],
    ]);
  });

  it('keeps a five-column profile intact', () => {
    const blocks = parseRulesProse([
      '| Movement | Ranged | Melee | Armour | Base |',
      '| --- | --- | --- | --- | --- |',
      '| 8”/Infantry | - | +1 DICE | 0 | 25mm |',
    ].join('\n'));
    const table = blocks[0];
    if (table.kind !== 'table') throw new Error('expected a table');
    expect(table.header).toHaveLength(5);
    expect(table.rows).toEqual([['8”/Infantry', '-', '+1 DICE', '0', '25mm']]);
  });

  it('does not mistake a sentence containing a pipe for a table', () => {
    const blocks = parseRulesProse('Roll a D6 | is not how the book writes it.');
    expect(blocks.map((b) => b.kind)).toEqual(['p']);
  });
});
