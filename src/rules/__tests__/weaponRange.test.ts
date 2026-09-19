/**
 * Reading a Weapon Profile's range, and the rules that follow from it.
 *
 * The defect these exist for was reported from a live game: a Fire Shield
 * shown with a range. Play Mode classified weapons by `type`, which in this
 * catalogue describes how a thing is carried and bought, not how it is used.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import {
  readRange, canShoot, canFight, bandFor, longRangePenalty, ENGAGEMENT_INCHES,
} from '../weaponRange';

describe('reading a range', () => {
  it('reads a melee weapon', () => {
    expect(readRange('Melee')).toEqual({ kind: 'melee', printed: 'Melee' });
  });

  it('reads a distance, whatever the quote character', () => {
    // All four spellings occur in the catalogue.
    for (const raw of ['24"', "24''", '24”', '24']) {
      expect(readRange(raw).inches, raw).toBe(24);
      expect(readRange(raw).kind, raw).toBe('ranged');
    }
  });

  it('reads a profile that is usable both ways, in either order', () => {
    expect(readRange('12"/Melee')).toMatchObject({ kind: 'both', inches: 12 });
    expect(readRange('Melee/24"')).toMatchObject({ kind: 'both', inches: 24 });
  });

  it('says a shield has NO range rather than guessing one', () => {
    /*
      THE defect. A Fire Shield's range is "" — and "" does not mean "a weapon
      whose range we could not read", it means "not a thing with a range".
      The code this replaces treated it as ranged and supplied 24".
    */
    for (const raw of ['', '-', '   ', undefined, null, 42]) {
      expect(readRange(raw as unknown).kind, JSON.stringify(raw)).toBe('none');
      expect(readRange(raw as unknown).inches, JSON.stringify(raw)).toBeUndefined();
    }
  });

  it('never invents a distance for something it cannot read', () => {
    expect(readRange('close quarters').kind).toBe('none');
    expect(readRange('0"').kind).toBe('none');
  });

  it('keeps what the profile printed, so the player can see the source', () => {
    expect(readRange('12"/Melee').printed).toBe('12"/Melee');
    expect(readRange('-').printed).toBe('-');
  });
});

describe('what a profile can do', () => {
  it('lets a ranged weapon shoot and not fight', () => {
    const r = readRange('24"');
    expect(canShoot(r)).toBe(true);
    expect(canFight(r)).toBe(false);
  });

  it('lets a melee weapon fight and not shoot', () => {
    const r = readRange('Melee');
    expect(canFight(r)).toBe(true);
    expect(canShoot(r)).toBe(false);
  });

  it('lets a dual profile do both', () => {
    const r = readRange('12"/Melee');
    expect(canShoot(r) && canFight(r)).toBe(true);
  });

  it('lets a shield do neither', () => {
    const r = readRange('');
    expect(canShoot(r)).toBe(false);
    expect(canFight(r)).toBe(false);
  });
});

describe('Short and Long Range', () => {
  /*
    Digital Rulebook, "Short Range & Long Range": at or under HALF the
    weapon's range is Short; over half is Long, at -1 DICE. Per weapon — the
    fixed 6/12/24/48 bands this replaces are not in the book.
  */
  const rifle = readRange('24"');

  it('is short at or below half the weapon’s own range', () => {
    expect(bandFor(rifle, 1)).toBe('short');
    expect(bandFor(rifle, 12)).toBe('short');
  });

  it('gives the boundary to the shooter, as "less than or equal to" says', () => {
    expect(bandFor(rifle, 12)).toBe('short');
    expect(bandFor(rifle, 12.1)).toBe('long');
  });

  it('is long beyond half, up to the maximum', () => {
    expect(bandFor(rifle, 13)).toBe('long');
    expect(bandFor(rifle, 24)).toBe('long');
  });

  it('is out of range past the maximum', () => {
    expect(bandFor(rifle, 24.1)).toBe('out-of-range');
  });

  it('does not round half of an odd range', () => {
    // A 9" weapon: half is 4.5", and a tape measure does not round.
    const short = readRange('9"');
    expect(bandFor(short, 4.5)).toBe('short');
    expect(bandFor(short, 4.6)).toBe('long');
  });

  it('bands a dual profile by its shooting range', () => {
    expect(bandFor(readRange('12"/Melee'), 6)).toBe('short');
    expect(bandFor(readRange('12"/Melee'), 7)).toBe('long');
  });

  it('reports no band at all for something with no range', () => {
    // Not "out of range" — that would still imply it is a weapon you aim.
    expect(bandFor(readRange(''), 5)).toBe('not-applicable');
    expect(bandFor(readRange('Melee'), 5)).toBe('not-applicable');
  });
});

describe('the Long Range modifier', () => {
  it('is -1 DICE at Long Range and nothing otherwise', () => {
    expect(longRangePenalty('long')).toBe(-1);
    expect(longRangePenalty('short')).toBe(0);
    expect(longRangePenalty('out-of-range')).toBe(0);
    expect(longRangePenalty('not-applicable')).toBe(0);
  });

  it('is cancelled by IGNORE LONG RANGE', () => {
    // Carried by grenades among others, and previously not modelled at all.
    expect(longRangePenalty('long', ['ASSAULT', 'IGNORE LONG RANGE'])).toBe(0);
    expect(longRangePenalty('long', ['ignore long range'])).toBe(0);
    expect(longRangePenalty('long', ['IGNORE COVER'])).toBe(-1);
  });
});

describe('engagement', () => {
  it('is 1 inch, which is what both rules say', () => {
    // "Fight ... if it is within 1” of an enemy" / "Shoot ... if it is more
    // than 1” from an enemy". The code this replaces used 2".
    expect(ENGAGEMENT_INCHES).toBe(1);
  });
});

/**
 * The classifier against the real catalogue, not a fixture.
 *
 * A fixture would only prove the parser works on strings I wrote. The defect
 * was a population fact: 553 of 658 entries were taking an invented default,
 * and every shield was being called a ranged weapon. That is only visible
 * against the real data.
 */
describe('the real catalogue', () => {
  const weapons = DATASET.weapons as Array<{
    name: string; type?: string; range?: string; keywords?: string[];
  }>;

  it('has weapons to check', () => {
    expect(weapons.length).toBeGreaterThan(500);
  });

  it('never lets a Shield or Armour shoot', () => {
    // The reported bug, stated as a property of the whole catalogue.
    const armed = weapons
      .filter((w) => /^(shield|armour)$/i.test(String(w.type)))
      .filter((w) => canShoot(readRange(w.range)));
    expect(armed.map((w) => `${w.name} [${w.type}] range=${w.range}`)).toEqual([]);
  });

  it('gives the Fire Shield no range, in every faction that lists it', () => {
    const fireShields = weapons.filter((w) => /fire shield/i.test(w.name));
    expect(fireShields.length).toBeGreaterThan(0);
    for (const s of fireShields) {
      expect(readRange(s.range).kind, `${s.name} (${s.type})`).toBe('none');
    }
  });

  it('classifies by range, because type does not carry the answer', () => {
    /*
      The measurement that condemned the old approach: the catalogue types
      things by how they are carried and bought, so the two type values the
      old code tested for are almost absent.
    */
    expect(weapons.filter((w) => w.type === 'Ranged')).toHaveLength(0);
    expect(weapons.filter((w) => w.type === 'Melee').length).toBeLessThan(5);

    // Whereas `range` classifies a real share of the catalogue.
    const shooters = weapons.filter((w) => canShoot(readRange(w.range)));
    const fighters = weapons.filter((w) => canFight(readRange(w.range)));
    expect(shooters.length).toBeGreaterThan(50);
    expect(fighters.length).toBeGreaterThan(50);
  });

  it('reads every printed range or calls it none — never a silent default', () => {
    for (const w of weapons) {
      const r = readRange(w.range);
      if (r.kind === 'none') {
        expect(r.inches, `${w.name} kept a distance while being 'none'`).toBeUndefined();
      } else {
        // Anything not 'none' must have come from the printed text.
        expect(r.printed, `${w.name} classified from nothing`).not.toBe('');
      }
    }
  });
});
