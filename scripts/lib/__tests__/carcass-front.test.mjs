import { describe, it, expect } from 'vitest';
import { parseCarcassFront } from '../parse-carcass-front.mjs';

/**
 * Every assertion is a value printed in the Carcass Front book.
 *
 * The book is a 104-page PDF read by shape rather than by hand, and the shapes
 * are only as reliable as the extraction. Each group below is a place the first
 * pass got it wrong — a page-furniture ordering, a wrapped cell, a boundary —
 * because those are the failures that produce a plausible warband rather than
 * an obviously broken one.
 */
const { factions, mercenaries } = parseCarcassFront();

const faction = (name) => factions.find((f) => f.name === name);
const procession = faction('Procession of the Sacred Affliction');
const raiders = faction('Heretic Naval Raiders');
const unit = (f, name) => f.units.find((u) => u.name === name);

describe('the two faction lists', () => {
  it('reads both, with their alignment and budget', () => {
    expect(factions.map((f) => f.name)).toEqual([
      'Procession of the Sacred Affliction', 'Heretic Naval Raiders',
    ]);
    expect(procession.alignment).toBe('Faithful');
    expect(raiders.alignment).toBe('Fallen');
    // "You have 700 👑 to recruit a Warband for a campaign".
    for (const f of factions) expect(f.budget, f.name).toEqual({ ducats: 700, glory: 0 });
  });

  it('reads seven entries for each', () => {
    expect(procession.units.map((u) => u.name)).toEqual([
      'Lazarist Prophet', 'Lazarist Communicant', 'Lazarist Castigator',
      'Leper-Pilgrims', 'Stigmatic Nuns', 'Ecclesiastic Prisoners', 'Anchorite Shrine',
    ]);
    expect(raiders.units.map((u) => u.name)).toEqual([
      'Heretic Captain', 'Abyssal Commando', 'Drowned Chorister',
      'Heretic Raiders', 'Wretched', 'Anointed Heretic Raiders', 'Sea Hag',
    ]);
  });

  /*
    The section banner extracts in the MIDDLE of the page it heads, and pages
    41 and 56 each carry the last Elite entry as well as the Troops banner. So
    the role comes from the entry's own ELITE keyword, and the split it gives —
    three and four in both factions — is the book's.
  */
  it('splits three Elite and four Troop in each faction', () => {
    for (const f of factions) {
      expect(f.units.filter((u) => u.role === 'Elite').length, f.name).toBe(3);
      expect(f.units.filter((u) => u.role === 'Troop').length, f.name).toBe(4);
    }
    expect(unit(procession, 'Lazarist Castigator').role).toBe('Elite');
    expect(unit(raiders, 'Drowned Chorister').role).toBe('Elite');
    // 140 Ducats, FEAR, STRONG and TOUGH, and still a Troops entry.
    expect(unit(procession, 'Anchorite Shrine').role).toBe('Troop');
    expect(unit(raiders, 'Heretic Raiders').role).toBe('Troop');
  });
});

describe('entries', () => {
  it('reads the statline as printed', () => {
    expect(unit(procession, 'Lazarist Prophet').profiles[0]).toEqual({
      name: 'Lazarist Prophet',
      movement: '6”/Infantry', ranged: '+2 DICE', melee: '+2 DICE',
      armour: '0', base: '32mm',
    });
    expect(unit(raiders, 'Sea Hag').profiles[0]).toMatchObject({
      movement: '6”/Infantry', ranged: '+0 DICE', melee: '-1 DICE',
      armour: '0', base: '32mm',
    });
  });

  /*
    The Prophet's keyword cell wraps: `PILGRIM, ELITE,` with `LEADER` on the
    line below. Closing the cell at the end of its first line dropped the
    keyword that decides who may lead the Warband.
  */
  it('keeps a keyword cell that wraps onto the next line', () => {
    expect(unit(procession, 'Lazarist Prophet').keywords)
      .toEqual(['PILGRIM', 'ELITE', 'LEADER']);
    expect(unit(raiders, 'Heretic Captain').keywords)
      .toEqual(['HERETIC', 'ELITE', 'LEADER', 'TOUGH']);
  });

  /*
    …and stops wrapping at the first line that is not a keyword. The Anchorite
    Shrine's entry continues into its two built-in weapons, and an unbounded
    cell swallowed the rest of the page as keywords.
  */
  it('stops the keyword cell at the first line that is not keywords', () => {
    for (const f of [...factions, { name: 'Mercenaries', units: mercenaries }]) {
      for (const u of f.units) {
        for (const k of u.keywords) {
          expect(k.length, `${u.name}: ${k}`).toBeLessThan(40);
          expect(k, `${u.name}: ${k}`).toMatch(/^[A-Z0-9][A-Z0-9 ”"’-]*$/);
        }
      }
    }
  });

  it('records an absent recruitment limit as unlimited, not as zero', () => {
    const leper = unit(procession, 'Leper-Pilgrims');
    expect(leper.min).toBeNull();
    expect(leper.max).toBeNull();
    // "0-4 Stigmatic Nuns", "1 Lazarist Prophet".
    expect(unit(procession, 'Stigmatic Nuns')).toMatchObject({ min: 0, max: 4 });
    expect(unit(procession, 'Lazarist Prophet')).toMatchObject({ min: 1, max: 1 });
  });

  /*
    A Leper-Pilgrim carries a second statline for the Martyr Penitent it can be
    resurrected as, each under its own `<Name> Profile` heading.
  */
  it('reads both statlines of an entry that has two', () => {
    const leper = unit(procession, 'Leper-Pilgrims');
    expect(leper.profiles.map((p) => p.name)).toEqual(['Leper-Pilgrim', 'Martyr Penitent']);
    expect(leper.profiles[0].melee).toBe('+0 DICE');
    expect(leper.profiles[1].melee).toBe('+1 DICE');
  });

  it('reads the abilities with their full names', () => {
    const prophet = unit(procession, 'Lazarist Prophet');
    expect(prophet.abilities.map((a) => a.name)).toEqual([
      'Loudspeakers ACTION', 'Gift of the Sacrament ACTION', 'Memento Mori',
    ]);
    expect(prophet.abilities[2].description).toContain('Out of Action result on the Injury Table');
  });

  it('reads the Battlekit sentence, which is a constraint and not flavour', () => {
    expect(unit(procession, 'Stigmatic Nuns').battlekit)
      .toContain('The only Ranged Weapons they can have are Automatic Pistols and Pistols');
  });
});

describe('special rules', () => {
  /*
    Every Special Rules block opens with "The following special rules apply to
    a … Warband Variants:" and the first real rule follows that colon directly.
    Taking the name back only to the previous full stop ran the two together,
    overran 60 characters and dropped the rule — so both factions lost their
    first special rule, and a lazy match instead read "Punishing Millstones" as
    "Millstones" and "Fast as Lightning" as "Lightning".
  */
  it('reads the first rule of each faction, under its whole name', () => {
    expect(procession.specialRules.map((r) => r.name))
      .toEqual(['Punishing Millstones', 'Wrath of God', 'Mercenaries']);
    expect(raiders.specialRules.map((r) => r.name))
      .toEqual(['Fast as Lightning', 'Unseen Advance', 'Mercenaries']);
  });

  it('keeps the rule text verbatim', () => {
    const millstones = procession.specialRules[0];
    expect(millstones.description).toContain('giving a total of +2 INJURY DICE to the roll');
    // The extraction hyphenates across the column break: "this bo-\nnus".
    expect(millstones.description).toContain('bonus');
    expect(millstones.description).not.toMatch(/\b\w+- \w/);
  });

  it('reads two Warband Variants per faction with their own rules', () => {
    expect(procession.variants.map((v) => v.name))
      .toEqual(['Knights of Saint Lazarus', 'Procession of the Blessed Flock']);
    expect(raiders.variants.map((v) => v.name))
      .toEqual(['Drowned Choir', 'Leviathan Shoal']);
    for (const f of factions) {
      for (const v of f.variants) expect(v.specialRules.length, v.name).toBeGreaterThan(2);
    }
  });

  /*
    A variant's rules run to the next variant or the next table. Unbounded, the
    last of each faction ran into whatever the book printed next: the
    Procession's Blessed Flock read two sentences of the Naval Raiders' fiction
    as rules, and the Leviathan Shoal read the Combat Biologist's abilities.
  */
  it('stops a variant at the end of its own rules', () => {
    const names = factions.flatMap((f) => f.variants.flatMap((v) => v.specialRules.map((r) => r.name)));
    for (const n of names) expect(n.length, n).toBeLessThan(45);
    expect(names).not.toContain('Prize Specimens');        // the Combat Biologist's
    expect(names.some((n) => /raids typically start/i.test(n))).toBe(false);
  });
});

describe('armoury and Battlekit', () => {
  it('reads a full Armoury Table for each faction', () => {
    for (const f of factions) expect(f.armoury.length, f.name).toBe(44);
  });

  it('reads the sections, restrictions and currency', () => {
    const rows = procession.armoury;
    const punt = rows.find((r) => r.name === 'Punt Gun');
    expect(punt).toMatchObject({
      section: 'Ranged Weapons', unique: true, cost: { ducats: 20, glory: 0 },
    });
    expect(punt.restrictions).toEqual(['Limit: 1']);
    // A Glory price, which the glyph names rather than the number.
    expect(rows.find((r) => r.name === 'Sniper Rifle').cost).toEqual({ ducats: 0, glory: 2 });
    expect(rows.find((r) => r.name === 'Reinforced Armour').restrictions).toEqual(['ELITE only']);
  });

  it("marks the faction's own Battlekit and prints its rules", () => {
    expect(procession.uniqueBattlekit.map((k) => k.name)).toEqual([
      'Bells of Warding', 'Blessed Millstone', 'Great Flail/Scourge', 'Holy Icon Armour',
      'Penitent’s Phylactery', 'Punt Gun', 'Ragged Vestments', 'Warcross',
    ]);
    const gun = procession.uniqueBattlekit.find((k) => k.name === 'Punt Gun');
    expect(gun.cost).toEqual({ ducats: 20, glory: 0 });
    expect(gun.type).toBe('2-Handed');
    expect(gun.range).toBe('18”');
    // The keyword column wraps mid-word: "SHOT-\nGUN".
    expect(gun.keywords).toContain('SHOTGUN');
    expect(gun.rules.map((r) => r.name)).toEqual(['Overcharge']);
  });

  it('every unique item in the Armoury has its rules printed', () => {
    for (const f of factions) {
      const named = new Set(f.uniqueBattlekit.map((k) => k.name.toLowerCase()));
      for (const row of f.armoury.filter((r) => r.unique)) {
        expect(named.has(row.name.toLowerCase()), `${f.name}: ${row.name}`).toBe(true);
      }
    }
  });
});

describe('the Mercenary', () => {
  /*
    Its chapter opener and its entry header both extract at the BOTTOM of the
    page they head, so everything above them on that page is the entry — the
    section cannot be bounded by either, and scanning forward from the heading
    found nothing at all.
  */
  it('reads the Combat Biologist, whose header extracts below its own body', () => {
    expect(mercenaries.map((u) => u.name)).toEqual(['Combat Biologist']);
    const cb = mercenaries[0];
    expect(cb.role).toBe('Mercenary');
    expect(cb.cost).toEqual({ ducats: 3, glory: 0 });
    expect(cb.profiles).toHaveLength(1);
    expect(cb.keywords).toEqual(['NEGATE FEAR']);
    expect(cb.abilities.map((a) => a.name))
      .toEqual(['Battlefield Vivisection', 'Gather Knowledge', 'Prize Specimens']);
  });
});
