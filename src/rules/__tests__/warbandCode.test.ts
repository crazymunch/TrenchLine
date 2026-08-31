import { describe, it, expect } from 'vitest';
import {
  warbandCode, normaliseCode, looksLikeCode, matchesWarband, collidingCodes, CODE_LENGTH,
} from '../warbandCode';

describe('warband codes', () => {
  it('is five characters from the unambiguous alphabet', () => {
    for (const id of ['wb-1', 'wb-1730000000000', 'clx9k2h4a0001abcdefgh', '']) {
      const code = warbandCode(id);
      expect(code).toHaveLength(CODE_LENGTH);
      expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/);
    }
  });

  /*
    Read across a table and typed in by hand, so the characters that get
    confused when spoken or written are not in the alphabet at all.
  */
  it('never contains 0, O, 1 or I', () => {
    for (let i = 0; i < 2000; i++) {
      expect(warbandCode(`wb-${i}`)).not.toMatch(/[01OI]/);
    }
  });

  it('is stable for an id — the same code every time', () => {
    expect(warbandCode('wb-1730000000000')).toBe(warbandCode('wb-1730000000000'));
  });

  /*
    Ids are minted from a millisecond clock, so consecutive warbands differ in
    one digit. A weak mapping would give them adjacent or identical codes.
  */
  it('spreads ids that differ by one digit', () => {
    const codes = Array.from({ length: 50 }, (_, i) => warbandCode(`wb-${1730000000000 + i}`));
    expect(new Set(codes).size).toBe(50);
  });

  it('collides rarely enough to be usable', () => {
    const codes = new Set(Array.from({ length: 20000 }, (_, i) => warbandCode(`wb-${1730000000000 + i * 7}`)));
    // 20,000 draws from 33.5M: the birthday bound puts expected collisions
    // near 6. Anything approaching 1% would mean the mapping is not spreading.
    expect(codes.size).toBeGreaterThan(19900);
  });

  describe('what someone types', () => {
    it('accepts a code with spacing, a hash or a dash', () => {
      const code = warbandCode('wb-1');
      expect(normaliseCode(`#${code}`)).toBe(code);
      expect(normaliseCode(code.toLowerCase())).toBe(code);
      expect(normaliseCode(`${code.slice(0, 2)} ${code.slice(2)}`)).toBe(code);
    });

    it('recognises a full code but not a partial one or a name', () => {
      expect(looksLikeCode(warbandCode('wb-1'))).toBe(true);
      expect(looksLikeCode(warbandCode('wb-1').slice(0, 3))).toBe(false);
      expect(looksLikeCode('Al-Qarn Rihla')).toBe(false);
    });
  });

  describe('searching', () => {
    const wb = { id: 'wb-1730000000000', name: 'Al-Qarn Rihla', factionId: 'iron-sultanate' };
    const code = warbandCode(wb.id);

    it('matches on the name, case and position insensitively', () => {
      expect(matchesWarband(wb, 'qarn')).toBe(true);
      expect(matchesWarband(wb, 'AL-QARN')).toBe(true);
    });

    it('matches on the faction', () => {
      expect(matchesWarband(wb, 'sultanate')).toBe(true);
    });

    it('matches on the code, whole or by prefix', () => {
      expect(matchesWarband(wb, code)).toBe(true);
      expect(matchesWarband(wb, code.slice(0, 2))).toBe(true);
      expect(matchesWarband(wb, code.toLowerCase())).toBe(true);
    });

    it('matches everything on an empty query, and nothing on a miss', () => {
      expect(matchesWarband(wb, '')).toBe(true);
      expect(matchesWarband(wb, '   ')).toBe(true);
      expect(matchesWarband(wb, 'heretic legion')).toBe(false);
    });
  });

  describe('collisions', () => {
    it('finds none in an ordinary set', () => {
      const set = Array.from({ length: 200 }, (_, i) => ({ id: `wb-${i}`, name: `W${i}` }));
      expect(collidingCodes(set).size).toBe(0);
    });

    it('reports a duplicate rather than letting it pass', () => {
      const set = [{ id: 'wb-1', name: 'A' }, { id: 'wb-2', name: 'B' }];
      // Two entries with the same id are the same warband, not a clash.
      expect(collidingCodes([...set, { id: 'wb-1', name: 'A again' }]).size).toBe(0);
    });
  });
});
