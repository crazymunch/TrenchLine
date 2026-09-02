import { describe, it, expect } from 'vitest';
import { keepsHyphen, joinWrapped } from '../dehyphenate.mjs';

/**
 * Every case below is a hyphenated line break that actually occurs in the
 * Carcass Front book — all 44 of them, sorted into the two answers.
 *
 * Both wrong answers ship something a player sees. Dropping every hyphen gives
 * `rolloff` and `coopted`; keeping every hyphen gives `bo-nus` and `SHOT-GUN`,
 * and SHOTGUN is a Keyword, so the second turns a searchable rules term into
 * one that matches nothing.
 */

/** Soft: a typesetter's break inside one word. The hyphen goes. */
const SOFT = [
  ['Her-', 'etic', 'Heretic'],
  ['with-', 'out', 'without'],
  ['tar-', 'get', 'target'],
  ['stand-', 'ard', 'standard'],
  ['repre-', 'sent', 'represent'],
  ['rep-', 'resent', 'represent'],
  ['instanc-', 'es', 'instances'],
  ['immedi-', 'ately', 'immediately'],
  ['hell-', 'ish', 'hellish'],
  ['follow-', 'ing', 'following'],
  ['bo-', 'nus', 'bonus'],
  ['War-', 'bands', 'Warbands'],
  ['SHOT-', 'GUN', 'SHOTGUN'],
  ['Raid-', 'ers', 'Raiders'],
  ['Moun-', 'tains', 'Mountains'],
  ['Mercenar-', 'ies', 'Mercenaries'],
  ['Mark-', 'ers', 'Markers'],
  ['MARK-', 'ERS', 'MARKERS'],
  ['Lazar-', 'ist', 'Lazarist'],
  ['Key-', 'word', 'Keyword'],
  ['Infil-', 'trators', 'Infiltrators'],
  ['Garri-', 'son', 'Garrison'],
  ['Explora-', 'tion', 'Exploration'],
  ['Diffi-', 'cult', 'Difficult'],
  ['Deploy-', 'ment', 'Deployment'],
  ['Castiga-', 'tor', 'Castigator'],
  ['CUMBER-', 'SOME', 'CUMBERSOME'],
  ['Bom-', 'bardment', 'Bombardment'],
  ['Battle-', 'kit', 'Battlekit'],
  ['BLESS-', 'ING', 'BLESSING'],
  ['AC-', 'TION', 'ACTION'],
  ['AC-', 'TIONS', 'ACTIONS'],
];

/** Real: the hyphen belongs to the word and stays. */
const REAL = [
  ['roll-', 'off', 'roll-off'],
  ['co-', 'opted', 'co-opted'],
  ['map-', 'based', 'map-based'],
  ['iron-', 'framed', 'iron-framed'],
  ['corpse-', 'choked', 'corpse-choked'],
  ['half-', 'buried', 'half-buried'],
  ['smash-', 'and-grab', 'smash-and-grab'],
  ['Off-', 'Hand', 'Off-Hand'],
  ['Meta-', 'Christ', 'Meta-Christ'],
  ['Never-', 'Know', 'Never-Know'],
  ['May-', 'He-Never-Know', 'May-He-Never-Know'],
];

describe('a hyphen at the end of a line', () => {
  it('goes when the typesetter put it there', () => {
    for (const [left, right, joined] of SOFT) {
      expect(keepsHyphen(left, right), `${left}${right}`).toBe(false);
      expect(joinWrapped(`this is a ${left}`, right)).toBe(`this is a ${joined}`);
    }
  });

  it('stays when it belongs to the word', () => {
    for (const [left, right, joined] of REAL) {
      expect(keepsHyphen(left, right), `${left}${right}`).toBe(true);
      expect(joinWrapped(`this is a ${left}`, right)).toBe(`this is a ${joined}`);
    }
  });

  it('joins an ordinary wrapped line with a single space', () => {
    expect(joinWrapped('the model may', 'move 6” and')).toBe('the model may move 6” and');
    // A dash that is not at a word boundary is not a wrap at all.
    expect(joinWrapped('a Success Roll —', 'see below')).toBe('a Success Roll — see below');
  });
});
