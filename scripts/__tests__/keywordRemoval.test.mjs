/**
 * A layer that takes a Keyword OFF an entry says so.
 *
 * When a layer replaces an entry it sets the keyword row the new page prints,
 * and that can remove one. The Dispatch's Amalgam row prints four Keywords
 * where the catalogue carries five, so STRONG goes.
 *
 * The catalogue's abilities are deliberately kept through a replacement:
 * dropping one asserts that the PDF extraction captured a complete list, and
 * an ability wrongly deleted is harder to notice than one wrongly kept.
 *
 * That reasoning assumed a wrongly-kept ability is inert, and it is not always
 * — the Amalgam keeps `Strong-ish`, whose text reads "Two of the arms of the
 * Amalgam have the Keyword STRONG", so the shipped entry both does and does
 * not have the Keyword. The build cannot resolve that, but it can refuse to
 * let it pass unseen, and this is the mechanism it reports from.
 */
import { describe, it, expect } from 'vitest';
import { applyLayer, createProvenance } from '../lib/layers.mjs';

const dataset = () => ({
  units: [{
    id: 'u1',
    name: 'Amalgam',
    keywords: ['BLACK GRAIL', 'FEAR', 'NEGATE GAS', 'TOUGH', 'STRONG'],
    abilities: [
      { name: 'Strong-ish', description: 'Two of the arms have the Keyword STRONG.' },
      { name: 'Corpulent', description: 'Add -2 INJURY DICE to Injury Rolls.' },
    ],
  }],
  weapons: [],
});

const layer = (value) => ({
  id: 'test-layer',
  sourceRef: 'test',
  ops: [{ op: 'set', target: { kind: 'unit', id: 'Amalgam' }, field: 'keywords', value }],
});

const run = (value) => {
  const d = dataset();
  const removals = [];
  applyLayer(d, layer(value), createProvenance(), [], [], removals);
  return { d, removals };
};

describe('a layer that sets an entry\'s Keywords', () => {
  it('records the ones it took away', () => {
    const { d, removals } = run(['BLACK GRAIL', 'FEAR', 'NEGATE GAS', 'TOUGH']);
    expect(d.units[0].keywords).not.toContain('STRONG');
    expect(removals).toHaveLength(1);
    expect(removals[0].entity).toBe('Amalgam');
    expect(removals[0].removed).toEqual(['STRONG']);
  });

  it('records nothing when the set only adds', () => {
    const { removals } = run(['BLACK GRAIL', 'FEAR', 'NEGATE GAS', 'TOUGH', 'STRONG', 'FLY']);
    expect(removals).toEqual([]);
  });

  it('records nothing when the row is unchanged', () => {
    const { removals } = run(['BLACK GRAIL', 'FEAR', 'NEGATE GAS', 'TOUGH', 'STRONG']);
    expect(removals).toEqual([]);
  });

  it('carries the entry, so a retained ability can be cross-checked', () => {
    /*
      What the build does with this: look for an ability whose text still
      names a Keyword the layer just removed. `Strong-ish` does, `Corpulent`
      does not.
    */
    const { removals } = run(['BLACK GRAIL', 'FEAR', 'NEGATE GAS', 'TOUGH']);
    const contradicts = removals[0].target.abilities.filter((a) =>
      removals[0].removed.some((k) => new RegExp(`\\b${k}\\b`).test(a.description)));
    expect(contradicts.map((a) => a.name)).toEqual(['Strong-ish']);
  });
});
