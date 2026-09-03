/**
 * The two Carcass Front Warbands, as the app offers them.
 *
 * `scripts/lib/__tests__/carcass-front.test.mjs` asserts what the parser reads
 * out of the book. This asserts what survives the layer, the build and the
 * conversion into the shape the roster format speaks — which is the part a
 * player actually meets, and where a faction can end up present in the dataset
 * and unbuildable in the app: no leader, an empty armoury, no variants.
 *
 * Every number below is printed in the Carcass Front book.
 */
import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import { recruitable } from '@/rules/recruitable';
import { FACTIONS } from '@/data/defaultRules';
import { factionOf, variantsForFaction } from '@/rules/variants';
import { armouryFor, priceOf } from '@/rules/armoury';

const APP = FACTIONS.map((f) => f.id);
const PROCESSION = 'procession-of-the-sacred-affliction';
const RAIDERS = 'heretic-naval-raiders';

const list = (id: string) => {
  const r = recruitable(DATASET, id, APP);
  return { ...r, own: r.units.filter((u) => u.factionId === id) };
};
const procession = list(PROCESSION);
const raiders = list(RAIDERS);

describe('the app offers both Carcass Front Warbands', () => {
  it('has them in the faction list the builder reads', () => {
    for (const id of [PROCESSION, RAIDERS]) {
      expect(FACTIONS.some((f) => f.id === id), id).toBe(true);
      expect(factionOf(DATASET, id), id).toBeDefined();
    }
  });

  it('starts each on the 700 Ducats the book gives them', () => {
    for (const id of [PROCESSION, RAIDERS]) {
      expect(factionOf(DATASET, id)!.budget, id).toEqual({ ducats: 700, glory: 0 });
    }
  });

  it('carries the faction special rules as printed, not invented ones', () => {
    expect(factionOf(DATASET, PROCESSION)!.specialRules.map((r) => r.name))
      .toEqual(['Punishing Millstones', 'Wrath of God', 'Mercenaries']);
    expect(factionOf(DATASET, RAIDERS)!.specialRules.map((r) => r.name))
      .toEqual(['Fast as Lightning', 'Unseen Advance', 'Mercenaries']);
  });

  it('offers both Warband Variants for each', () => {
    expect(variantsForFaction(DATASET, PROCESSION).map((v) => v.name))
      .toEqual(['Knights of Saint Lazarus', 'Procession of the Blessed Flock']);
    expect(variantsForFaction(DATASET, RAIDERS).map((v) => v.name))
      .toEqual(['Drowned Choir', 'Leviathan Shoal']);
  });
});

describe('recruiting', () => {
  it('offers the seven entries of each list, at the printed cost', () => {
    expect(procession.own.map((u) => `${u.name} ${u.baseCost}`)).toEqual([
      'Lazarist Prophet 90', 'Lazarist Communicant 100', 'Lazarist Castigator 50',
      'Leper-Pilgrim 30', 'Stigmatic Nuns 60', 'Ecclesiastic Prisoners 20',
      'Anchorite Shrine 140',
    ]);
    expect(raiders.own.map((u) => `${u.name} ${u.baseCost}`)).toEqual([
      'Heretic Captain 80', 'Abyssal Commando 90', 'Drowned Chorister 65',
      'Heretic Raider 30', 'Wretched 25', 'Anointed Heretic Raiders 95', 'Sea Hag 100',
    ]);
  });

  /*
    Both lists mark their leader with the LEADER Keyword, where the catalogues
    use a `Leader` role. Reading only the role left both Warbands with nobody
    eligible, so the first model recruited could never be nominated.
  */
  it('knows who may lead each Warband', () => {
    expect(procession.own.filter((u) => u.canLead).map((u) => u.name))
      .toEqual(['Lazarist Prophet']);
    expect(raiders.own.filter((u) => u.canLead).map((u) => u.name))
      .toEqual(['Heretic Captain']);
  });

  it('enforces the recruitment limits the book prints', () => {
    const by = (l: typeof procession, n: string) => l.own.find((u) => u.name === n)!;
    expect(by(procession, 'Lazarist Prophet').maxCount).toBe(1);   // "1 Lazarist Prophet"
    expect(by(procession, 'Stigmatic Nuns').maxCount).toBe(4);     // "0-4 Stigmatic Nuns"
    expect(by(procession, 'Leper-Pilgrim').maxCount).toBeUndefined(); // no limit printed
    expect(by(raiders, 'Anointed Heretic Raiders').maxCount).toBe(2);
  });

  /*
    A Martyr Penitent is a resurrected Leper-Pilgrim (45 Ducats, in the
    Pilgrim's own Resurrection ability) and a Heretic Raider Legionnaire is an
    upgraded Raider (10 Ducats). Neither is recruited, and both would otherwise
    appear at the 0 Ducats the entry does not price them at.
  */
  it('does not offer a secondary profile as a recruit', () => {
    for (const l of [procession, raiders]) {
      expect(l.own.some((u) => u.baseCost === 0 && !u.gloryCost)).toBe(false);
    }
    expect(procession.own.some((u) => u.name === 'Martyr Penitent')).toBe(false);
    expect(raiders.own.some((u) => u.name === 'Heretic Raider Legionnaire')).toBe(false);
    // Still in the dataset, so the Codex can show the statline and the rule.
    expect(DATASET.units.some((u) => u.name === 'Martyr Penitent')).toBe(true);
  });

  it('carries the entry Battlekit sentence the Armoury Table cannot express', () => {
    expect(procession.own.find((u) => u.name === 'Stigmatic Nuns')!.battlekitNote)
      .toContain('The only Ranged Weapons they can have are Automatic Pistols and Pistols');
  });

  /*
    "The Procession of the Sacred Afflictions can use any Faithful Mercenaries
    that can be taken by Trench Pilgrim Warbands" — the pool is stated by
    delegation, so it has to be resolved rather than read off a list.
  */
  it('inherits the Mercenary pool its faction rule delegates to', () => {
    const hires = (l: typeof procession, id: string) =>
      l.units.filter((u) => u.category === 'Mercenary' && u.allowedFactions?.includes(id))
        .map((u) => u.name);
    expect(hires(procession, PROCESSION)).toContain('Witchburner');
    expect(hires(procession, PROCESSION)).toContain('Mendelist Ammo Monk');
    expect(hires(procession, PROCESSION)).not.toContain('Goetic Warlock');
    expect(hires(raiders, RAIDERS)).toContain('Goetic Warlock');
    expect(hires(raiders, RAIDERS)).not.toContain('Witchburner');
  });
});

describe('the armoury', () => {
  it('prices each list from its own 44-row table', () => {
    for (const id of [PROCESSION, RAIDERS]) {
      expect(armouryFor(DATASET, id)?.rows.length, id).toBe(44);
    }
  });

  it('stocks the faction Battlekit with its rules, not just a price', () => {
    const punt = DATASET.weapons.find(
      (w) => w.name === 'Punt Gun' && w.factionId === 'Procession of the Sacred Affliction');
    expect(punt).toBeDefined();
    expect(punt!.range).toBe('18"');
    expect(punt!.keywords).toContain('SHOTGUN');
    expect(punt!.rules).toContain('Overcharge');
    expect(priceOf(armouryFor(DATASET, PROCESSION), punt!)).toEqual({ ducats: 20, glory: 0 });
  });

  it('prices a Glory item in Glory, from the glyph and not the number', () => {
    const rows = armouryFor(DATASET, RAIDERS)!.rows;
    expect(rows.find((r) => r.name === 'Anti-Materiel Rifle')!.cost)
      .toEqual({ ducats: 0, glory: 3 });
  });
});

describe('statlines', () => {
  it('spells inches the way the rest of the dataset does', () => {
    for (const u of [...procession.own, ...raiders.own]) {
      expect(u.stats.movement, u.name).not.toMatch(/[”″]/);
      expect(u.stats.movement, u.name).toMatch(/^\d+"\//);
      expect(u.stats.movementInches, u.name).toBeGreaterThan(0);
    }
    // Most of both lists is 6"; the Nuns are the ones that are not.
    expect(procession.own.find((u) => u.name === 'Stigmatic Nuns')!.stats.movement)
      .toBe('8"/Infantry');
  });

  /*
    Carcass Front REPRINTS the Combat Biologist, which the Warbands book and
    the catalogues already carry. A faithful read of the book therefore adds a
    Mercenary the dataset already has, and two of the same entry in the recruit
    list is worse than none — a player picks one and cannot tell which.
  */
  it('does not add a second copy of the Mercenary it reprints', () => {
    expect(DATASET.units.filter((u) => u.name === 'Combat Biologist')).toHaveLength(1);
    // …and keeps the Glory price both other sources agree on, not the Ducat
    // glyph the reprint prints on the same number.
    expect(DATASET.units.find((u) => u.name === 'Combat Biologist')!.cost)
      .toEqual({ ducats: 0, glory: 3 });
  });

  it('reads the Prophet exactly as printed', () => {
    const p = procession.own.find((u) => u.name === 'Lazarist Prophet')!;
    expect(p.stats).toMatchObject({
      movement: '6"/Infantry', ranged: '+2 DICE', melee: '+2 DICE',
      armour: '0', baseSize: '32mm',
    });
    expect(p.stats.keywords).toEqual(['PILGRIM', 'ELITE', 'LEADER']);
  });
});
