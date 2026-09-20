/**
 * Matching a Keyword as printed against the Keyword as defined.
 *
 * The dataset has carried 61 glossary entries for months and nothing surfaced
 * them: `KeywordPopover` existed, was never mounted, and nothing ever called
 * `setActiveKeyword`. `FEATURES.md` claimed the feature worked.
 *
 * The reason it is not a one-line string compare is here: the glossary has 61
 * names and the sources print **89** distinct Keyword strings, of which only 41
 * are a glossary name spelled exactly.
 *
 * Tested against `DATASET` rather than a fixture, because the whole point is
 * the gap between what the glossary calls a Keyword and what a catalogue prints
 * on a model. A fixture of strings I chose would test my imagination.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import {
  canonical, sameKeyword, keywordPattern, compileGlossary, resolveKeyword,
  highlightKeywords, bySpecificity,
} from '../keywordMatch';

const GLOSSARY = compileGlossary(DATASET.keywords);

/** Every Keyword string any unit or weapon in the dataset actually carries. */
const printed = (): string[] => {
  const used = new Set<string>();
  for (const u of DATASET.units) (u.keywords ?? []).forEach((k) => used.add(k));
  for (const w of DATASET.weapons) (w.keywords ?? []).forEach((k) => used.add(k));
  return [...used].sort();
};

const show = (t: string) => highlightKeywords(t, GLOSSARY)
  .map((s) => (s.keyword ? `[${s.keyword.name}]` : s.text)).join('');

describe('the glossary itself', () => {
  it('is on the dataset, all 61 of it, with a rule on every entry', () => {
    expect(DATASET.keywords.length).toBe(61);
    expect(DATASET.keywords.filter((k) => !k.description)).toEqual([]);
  });
});

describe('every Keyword the dataset prints', () => {
  const KNOWN_UNLINKABLE = [
    /* Real Keywords with no glossary entry — a data gap, not a matcher bug. */
    'CLERGY',
    'LIMITED POTENTIAL',
    /*
      A cross-reference, not an instance: the rule lives under Sworn Brethren.
      The `▶` is the page's cross-reference mark and the dataset keeps it, the
      way it keeps 'a Vivisector (▶ see Vivisector)'. The Dispatch op that
      writes this row had dropped it; restored when layerTranscription started
      checking transcriptions against the printed line.
    */
    'FIRETEAM (▶ see Sworn Brethren)',
    /* Two Keywords in one catalogue field. Prose finds both; a chip cannot. */
    'HEAVY IGNORE ARMOUR',
    /* An extraction artefact. */
    'MF',
  ];

  it('resolves to a glossary entry, or is one of five known exceptions', () => {
    const unresolved = printed().filter((k) => !resolveKeyword(k, GLOSSARY));
    expect(unresolved.sort()).toEqual([...KNOWN_UNLINKABLE].sort());
  });

  it('resolves 86 of the 91 strings in use', () => {
    /*
      Named so a regression shows as a number, not as a silently duller UI. The
      failure mode this guards is invisible: a Keyword that does not match is
      simply not highlighted, and the player cannot tell that from "this word
      has no rule".

      Was 84 of 89. The Dispatch content that RC-10 and RC-11 restored brought
      two more strings with it — `CLEAVE 3` on the Gluttonous Arsenal and
      `AMMUNITION (ARMOUR PIERCING)` on Corrosive Ammunition — and this test
      failing on the count is exactly what it is for: new Keyword spellings
      arriving with new data is the moment to check they resolve, not to
      discover later that two profiles went unlinked.
    */
    const all = printed();
    expect(all.length).toBe(91);
    expect(all.filter((k) => resolveKeyword(k, GLOSSARY)).length).toBe(86);
  });

  it('resolves the two spellings the restored Dispatch entries brought', () => {
    // `AMMUNITION (ARMOUR-PIERCING)` with a hyphen was already in use; the new
    // entry prints it with a space, and both are the same family.
    expect(resolveKeyword('CLEAVE 3', GLOSSARY)?.name).toBe('CLEAVE (X)');
    expect(resolveKeyword('AMMUNITION (ARMOUR PIERCING)', GLOSSARY)?.name)
      .toBe('AMMUNITION (KEYWORD)');
  });

  it('sends each parameterised spelling to the family it belongs to', () => {
    const of = (s: string) => resolveKeyword(s, GLOSSARY)?.name;
    expect(of('+2 DICE')).toBe('+/- DICE');
    expect(of('-1 DICE')).toBe('+/- DICE');
    expect(of('-3 Injury Modifier')).toBe('+/- INJURY MODIFIER');
    expect(of('AUTOMATIC 3')).toBe('AUTOMATIC (X)');
    expect(of('CLEAVE 2')).toBe('CLEAVE (X)');
    expect(of('REGENERATE 1')).toBe('REGENERATE (X)');
    expect(of('NEGATE DIFFICULT TERRAIN')).toBe('NEGATE [KEYWORD]');
    expect(of('IGNORE OFF-HAND WEAPON')).toBe('IGNORE [MODIFIER]');
    expect(of('AMMUNITION (CRITICAL)')).toBe('AMMUNITION (KEYWORD)');
  });

  it('reads every inch mark the sources use, and the value being absent', () => {
    // One Keyword, six spellings, three different quote glyphs between them.
    for (const s of ['BLAST', 'BLAST 2"', 'BLAST 2”', 'BLAST 3"', "BLAST 3''", 'BLAST 3”']) {
      expect(resolveKeyword(s, GLOSSARY)?.name, s).toBe('BLAST (X”)');
    }
  });

  it('reads a hyphen, a plural and a case as spelling, not as difference', () => {
    expect(resolveKeyword('ARMOUR-PIERCING', GLOSSARY)?.name).toBe('ARMOUR PIERCING');
    expect(resolveKeyword('ARMOUR PIERCING 2', GLOSSARY)?.name).toBe('ARMOUR PIERCING');
    expect(resolveKeyword('IGNORES ARMOUR', GLOSSARY)?.name).toBe('IGNORE ARMOUR');
    expect(resolveKeyword('Held', GLOSSARY)?.name).toBe('HELD');
  });

  it('prefers the entry the glossary prints a rule for over the family', () => {
    /*
      `IGNORE ARMOUR` has its own entry AND matches `IGNORE [MODIFIER]`.
      Ordering by name length sent it to the family — the generic one is
      seventeen characters and the specific one thirteen — so a player tapping
      it got "ignore the named modifier" instead of the armour rule.
    */
    expect(resolveKeyword('IGNORE ARMOUR', GLOSSARY)?.name).toBe('IGNORE ARMOUR');
    expect(resolveKeyword('IGNORE COVER', GLOSSARY)?.name).toBe('IGNORE [MODIFIER]');
  });

  it('sorts literal names ahead of families', () => {
    const sorted = [...DATASET.keywords].sort(bySpecificity).map((k) => k.name);
    const lastLiteral = sorted.findIndex((n) => /\[|\(X|\(KEYWORD\)|^\+\//.test(n));
    expect(sorted.slice(lastLiteral).every((n) => /\[|\(X|\(KEYWORD\)|^\+\//.test(n)))
      .toBe(true);
  });

  it('never invents a nearest entry for a string it does not know', () => {
    for (const s of ['CLERGY', 'MF', 'BANANA', 'LIMITED POTENTIAL']) {
      expect(resolveKeyword(s, GLOSSARY), s).toBeNull();
    }
  });
});

describe('canonical form', () => {
  it('folds case, quotes and a hyphen between letters', () => {
    expect(canonical('armour-piercing')).toBe('ARMOUR PIERCING');
    expect(canonical(' BLAST  3”  ')).toBe('BLAST 3"');
    expect(sameKeyword('ARMOUR-PIERCING', 'armour piercing')).toBe(true);
  });

  it('keeps a minus sign, which is not a hyphen', () => {
    /*
      Flattening every hyphen turned `-1 DICE` into `1 DICE`, which matches
      nothing. Six of the eighty-nine printed Keywords are negative, and they
      are exactly the ones a player is most likely to want explained.
    */
    expect(canonical('-1 DICE')).toBe('-1 DICE');
    expect(canonical('+/- INJURY DICE')).toBe('+/- INJURY DICE');
  });

  it('keeps the value, because two values are not the same statement', () => {
    expect(canonical('AUTOMATIC 2')).not.toBe(canonical('AUTOMATIC 3'));
  });
});

describe('a pattern built from a name', () => {
  it('has no word boundary in front of a name that starts with a sign', () => {
    /*
      `\b` before `+` never matches — neither side is a word character — so an
      unconditional boundary silently killed all six `+/-` Keywords.
    */
    expect(keywordPattern('+/- DICE').source.startsWith('\\b')).toBe(false);
    expect(keywordPattern('CUMBERSOME').source.startsWith('\\b')).toBe(true);
  });

  it('groups the placeholder alternation', () => {
    // Ungrouped, the second branch escaped to the top level as a bare
    // `\s+[A-Z]`: any capital after any space, anywhere in the sentence.
    expect(highlightKeywords('Add -2 DICE to Injury Rolls for an Amalgam', GLOSSARY)
      .filter((s) => s.keyword).length).toBe(1);
  });
});

describe('highlighting prose', () => {
  it('finds the Keywords and leaves the sentence intact', () => {
    const text = 'Attacks gain +2 DICE and IGNORE ARMOUR, and have BLAST 3".';
    expect(show(text)).toBe('Attacks gain [+/- DICE] and [IGNORE ARMOUR], and have [BLAST (X”)].');
    // Every character survives, in order.
    expect(highlightKeywords(text, GLOSSARY).map((s) => s.text).join('')).toBe(text);
  });

  it('does not light up an ordinary word that happens to be a Keyword', () => {
    /*
      The reason a match must be SHOUTED. `COVER` and `FEAR` are both Keywords,
      and both are ordinary English at the start of a sentence. Offering a
      player a rule for "Cover the flank" is worse than offering nothing.
    */
    const t = 'This model may take cover behind a wall. Cover the flank. Fear is contagious.';
    expect(highlightKeywords(t, GLOSSARY).filter((s) => s.keyword)).toEqual([]);
  });

  it('does not read dice notation as a Keyword', () => {
    const t = 'Roll a D6. On a 1-2 the model is removed.';
    expect(highlightKeywords(t, GLOSSARY).filter((s) => s.keyword)).toEqual([]);
  });

  it('takes the whole Keyword, not the shorter one inside it', () => {
    // Bare `GAS` is an entry too, and sits inside `NEGATE GAS`. The sentence is
    // about the negation.
    expect(show('A model with NEGATE GAS is immune.'))
      .toBe('A model with [NEGATE [KEYWORD]] is immune.');
  });

  it('reads a value carried in brackets', () => {
    expect(show('AMMUNITION (CRITICAL) rounds, AUTOMATIC 3, and REGENERATE 1.'))
      .toBe('[AMMUNITION (KEYWORD)] rounds, [AUTOMATIC (X)], and [REGENERATE (X)].');
  });

  it('returns nothing for nothing', () => {
    expect(highlightKeywords('', GLOSSARY)).toEqual([]);
    expect(highlightKeywords('no keywords here at all', GLOSSARY))
      .toEqual([{ text: 'no keywords here at all' }]);
  });

  it('survives every ability description in the dataset without losing text', () => {
    // The property that matters most: whatever it does or does not highlight,
    // the player must be shown the rule they were shown before.
    let checked = 0;
    for (const u of DATASET.units) {
      for (const a of u.abilities ?? []) {
        const d = a.description ?? '';
        if (!d) continue;
        expect(highlightKeywords(d, GLOSSARY).map((s) => s.text).join(''), a.name).toBe(d);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
});
