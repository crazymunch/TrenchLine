/**
 * The two rules that decide what the cross-check compares, and what its
 * silence means.
 *
 * Both have been wrong in production, in opposite directions, and both
 * failures were invisible in the report rather than loud:
 *
 * - Choosing between catalogue entries that disagree compared the app's
 *   Mercenaries "Guard Dog" against New Antioch's profile and reported four
 *   mismatches that were the check's own bookkeeping.
 * - Folding "the catalogue does not carry this book" into "no catalogue entry
 *   of this name" put fifteen Carcass Front models in the same list a genuine
 *   naming error would land in, where nobody would read past them.
 */
import { describe, it, expect } from 'vitest';
import { byNameAlone, classifyUnmatched, fromCatalogue } from '../lib/crosscheck-match.mjs';

/** A catalogue profile, in the shape the cross-check builds. */
const profile = (over = {}) => ({
  ranged: '-1 Dice', melee: '-1 Dice', armour: '0', movement: '6"/Infantry', ...over,
});

const catalogue = (entries) => new Map(Object.entries(entries));

describe('matching a unit by name alone', () => {
  it('takes the only candidate', () => {
    const source = catalogue({ 'Heretic Legion.cat::Chorister': profile({ melee: '+2 Dice' }) });
    expect(byNameAlone(source, 'Chorister')?.melee).toBe('+2 Dice');
  });

  it('takes agreeing candidates, because there is nothing to pick wrongly', () => {
    /* `Wretched` is in two catalogues with the same profile. Demanding a
       unique name left the app's Carcass Front copy unchecked against both. */
    const source = catalogue({
      'Heretic Legion.cat::Wretched': profile(),
      'Court of the Seven-Headed Serpent.cat::Wretched': profile(),
    });
    expect(byNameAlone(source, 'Wretched')).toBeDefined();
  });

  it('refuses candidates that disagree', () => {
    /*
      The failure this rule exists for. The Mercenaries "Guard Dog" has no
      ranged attack and New Antioch's reads "0"; picking either blind reports
      a mismatch that is the check's own choice, not the data's.
    */
    const source = catalogue({
      'Mercenaries.cat::Guard Dog': profile({ ranged: 'N/A' }),
      'New Antioch.cat::Guard Dog': profile({ ranged: '0' }),
    });
    expect(byNameAlone(source, 'Guard Dog')).toBeUndefined();
  });

  it('ignores a difference in how DICE is written', () => {
    /* `+2 DICE` and `+2 Dice` are the same statline. The comparison already
       normalises them, and the tie-break has to use the same rule or two
       spellings of one profile would read as a disagreement. */
    const source = catalogue({
      'Heretic Legion.cat::Wretched': profile({ melee: '+2 DICE' }),
      'Court of the Seven-Headed Serpent.cat::Wretched': profile({ melee: '+2 Dice' }),
    });
    expect(byNameAlone(source, 'Wretched')).toBeDefined();
  });

  it('does not match a name that is merely a suffix of another', () => {
    /* Keyed `faction::name`, so the separator is part of the test. Without it
       `Castigator` would match `Lazarist Castigator` and the alias map — which
       is where that pairing is asserted deliberately — would be bypassed. */
    const source = catalogue({ 'Trench Pilgrims.cat::Lazarist Castigator': profile() });
    expect(byNameAlone(source, 'Castigator')).toBeUndefined();
  });

  it('finds nothing when there is nothing', () => {
    expect(byNameAlone(catalogue({}), 'Sea Hag')).toBeUndefined();
  });
});

describe('why a unit found no catalogue row', () => {
  it('calls it unmatched when the app names a .cat that lacks it', () => {
    /* A defect: the name is wrong, or the entry has gone. */
    expect(classifyUnmatched({ name: 'Yeoman', source: 'New Antioch.cat' })).toBe('unmatched');
  });

  it('calls it uncovered when the source is a book the catalogues do not carry', () => {
    expect(classifyUnmatched({ name: 'Sea Hag', source: 'carcass-front-book.pdf' })).toBe('uncovered');
  });

  it('calls it sourceless when nothing says where it came from', () => {
    /* Never folded into the coverage note. "The catalogue does not cover that
       book" is a claim about a source, and this unit does not have one. */
    expect(classifyUnmatched({ name: 'Mystery' })).toBe('sourceless');
    expect(classifyUnmatched({ name: 'Mystery', source: '' })).toBe('sourceless');
  });

  it('does not treat a .cat mentioned mid-string as the source', () => {
    /* The test is the file's extension, not whether the text contains one. */
    expect(fromCatalogue({ source: 'notes-about-New Antioch.cat-and-others.pdf' })).toBe(false);
  });
});
