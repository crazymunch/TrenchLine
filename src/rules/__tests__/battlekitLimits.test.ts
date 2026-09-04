import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import { validateRoster } from '../validate';
import { battlekitBreaches } from '../battlekitLimits';
import { armouryFor } from '../armoury';
import { defaultSultanateWarband } from '@/store/seed';
import { toRoster } from '../fromWarband';
import type { Dataset } from '@/types/catalogue';
import type { Roster, RosterItem } from '../costs';

/**
 * BATTLEKIT LIMITS, Trench Crusade Digital Rulebook p.69.
 *
 *   "Unless otherwise stated a model is limited to the following Battlekit:
 *    ** One 2-Handed Ranged Weapon or two 1-Handed Ranged Weapons.
 *    ** One 2-Handed Melee Weapon or two 1-Handed Melee Weapons.
 *    ** One type of Grenade.
 *    ** One suit of Armour.
 *    ** One Shield (▶ see additional restrictions below).
 *    ** Any number of pieces of Equipment or Special Battlekit. A Model cannot
 *       have two or more pieces of Equipment or Special Battlekit with the
 *       same Name."
 *
 * The app enforced none of it: a model could wear three suits of Armour, carry
 * two Shields and four 2-Handed weapons, and validate clean.
 */
const d = DATASET as unknown as Dataset;
const F = 'procession-of-the-sacred-affliction';
const armoury = armouryFor(d, F)!;
const rowsIn = (section: string) => armoury.rows.filter((r) => r.section === section);
const item = (name: string): RosterItem => {
  const row = armoury.rows.find((r) => r.name === name)!;
  return { weaponId: row.weaponId ?? undefined, name: row.name, cost: row.cost };
};

const profile = d.units.find(
  (u) => u.name === 'Lazarist Castigator'
      && String(u.factionId).toLowerCase().includes('procession'))!;

const carrying = (items: RosterItem[]): Roster => ({
  id: 'r1', name: 'T', factionId: 'Procession of the Sacred Affliction',
  units: [{ id: 'u1', profileId: profile.id, name: profile.name,
            cost: profile.cost, items, options: [] }],
  stash: [], budget: { ducats: 900, glory: 10 },
});

const breaches = (r: Roster) =>
  validateRoster(r, d).violations.filter((v) => v.code === 'battlekit-limit');

describe('the limits are derived, not typed', () => {
  it('the ruleset carries all six bullets and the Shield restrictions', () => {
    const l = d.battlekitLimits!;
    expect(l.limits).toHaveLength(6);
    expect(l.limits.map((x) => x.section).sort()).toEqual(
      ['Armour', 'Equipment', 'Grenades', 'Melee Weapons', 'Ranged Weapons', 'Shields']);
    expect(l.withShield?.unlessBoth).toBe('Shield Combo');
  });

  it('every rule quotes the sentence it came from', () => {
    // The player's next move is to check the page, so the wording is kept.
    for (const rule of d.battlekitLimits!.limits) {
      expect(rule.raw.length, rule.section).toBeGreaterThan(10);
    }
  });
});

describe('one suit of Armour', () => {
  const suits = rowsIn('Armour').map((r) => r.name);

  it('two suits is an error', () => {
    const v = breaches(carrying([item(suits[0]), item(suits[1])]));
    expect(v).toHaveLength(1);
    expect(v[0].severity).toBe('error');
    expect(v[0].message).toContain(suits[0]);
    expect(v[0].rule).toContain('One suit of Armour');
  });

  it('one suit is fine', () => {
    expect(breaches(carrying([item(suits[0])]))).toEqual([]);
  });

  /*
    The control that matters most. p.80: "The effect of a Shield can be
    combined with the effect of a suit of Armour unless noted otherwise." A
    rule that counted Shields as Armour would break a legal, common loadout.
  */
  it('and a Shield alongside it is explicitly legal', () => {
    const shield = rowsIn('Shield').concat(rowsIn('Shields'))[0].name;
    expect(breaches(carrying([item(suits[0]), item(shield)]))).toEqual([]);
  });
});

describe('one Shield', () => {
  const shields = rowsIn('Shield').concat(rowsIn('Shields')).map((r) => r.name);

  it('two Shields is an error', () => {
    expect(shields.length).toBeGreaterThan(1);
    expect(breaches(carrying([item(shields[0]), item(shields[1])]))).toHaveLength(1);
  });
});

describe('the handedness rule', () => {
  /** A weapon of a given section and handedness, from the faction's armoury. */
  const weapon = (section: string, hands: number) => {
    const chapter = new Map((d.battlekit ?? []).map((b) => [b.name, b.type]));
    return rowsIn(section)
      .filter((r) => chapter.get(r.name) === `${hands}-Handed`)
      .map((r) => r.name);
  };

  it('one 2-Handed Melee weapon is fine', () => {
    const [two] = weapon('Melee Weapons', 2);
    expect(two, 'no 2-Handed melee weapon in this armoury').toBeTruthy();
    expect(breaches(carrying([item(two)]))).toEqual([]);
  });

  it('two 2-Handed Melee weapons is an error', () => {
    const two = weapon('Melee Weapons', 2);
    expect(two.length).toBeGreaterThan(1);
    const v = breaches(carrying([item(two[0]), item(two[1])]));
    expect(v).toHaveLength(1);
    expect(v[0].rule).toContain('2-Handed Melee Weapon');
  });

  it('two 1-Handed Melee weapons is fine — the same allowance, spent differently', () => {
    const one = weapon('Melee Weapons', 1);
    expect(one.length).toBeGreaterThan(1);
    expect(breaches(carrying([item(one[0]), item(one[1])]))).toEqual([]);
  });

  it('a 2-Handed and a 1-Handed together is an error — that is three hands', () => {
    const [two] = weapon('Melee Weapons', 2);
    const [one] = weapon('Melee Weapons', 1);
    expect(breaches(carrying([item(two), item(one)]))).toHaveLength(1);
  });

  /*
    Ranged and Melee are separate allowances, and the book says so by stating
    them as two bullets. A model may carry two swords AND two pistols: "A model
    may freely switch between Ranged and Melee Weapons between ACTIONS."
  */
  it('and a Melee allowance does not eat the Ranged one', () => {
    const melee = weapon('Melee Weapons', 1);
    const ranged = weapon('Ranged Weapons', 1);
    if (!ranged.length) return;   // this armoury may stock no 1-Handed ranged
    expect(breaches(carrying([item(melee[0]), item(melee[1]), item(ranged[0])]))).toEqual([]);
  });
});

describe('an extra limb', () => {
  it('buys one more hand, because the rule opens "Unless otherwise stated"', () => {
    const chapter = new Map((d.battlekit ?? []).map((b) => [b.name, b.type]));
    const one = rowsIn('Melee Weapons')
      .filter((r) => chapter.get(r.name) === '1-Handed').map((r) => r.name);
    const three = [item(one[0]), item(one[1]), item(one[0])];

    // Three 1-Handed weapons in two hands is a breach…
    expect(battlekitBreaches(
      three.map((i) => ({ name: i.name!, weaponId: i.weaponId })),
      { armoury, dataset: d },
    )).toHaveLength(1);

    // …and is not, for a model the app already lets hold a third weapon.
    expect(battlekitBreaches(
      three.map((i) => ({ name: i.name!, weaponId: i.weaponId })),
      { armoury, dataset: d, extraLimb: true },
    )).toEqual([]);
  });
});

describe('an item the sources do not classify', () => {
  it('is not counted rather than guessed at', () => {
    // A wrong guess here is a legality error on a legal roster, which is the
    // failure this codebase has been paying for.
    expect(battlekitBreaches(
      [{ name: 'Something No Source Has Heard Of' }],
      { armoury, dataset: d },
    )).toEqual([]);
  });

  it('and a ruleset with no limits parsed is not policed', () => {
    const noLimits = { ...d, battlekitLimits: undefined } as Dataset;
    expect(battlekitBreaches(
      [{ name: 'Standard Armour' }, { name: 'Reinforced Armour' }],
      { armoury, dataset: noLimits },
    )).toEqual([]);
  });
});

/*
  The regression that matters more than any of the above: a real, legal roster
  must stay legal. Al-Qarn Rihla is nine models of mixed weapons, armour and
  equipment, including a Homunculus with an extra limb.
*/
describe('a real warband', () => {
  /*
    Al-Qarn Rihla is nine models of mixed weapons, armour and equipment, and it
    raises exactly ONE Battlekit violation — correct, and about the model the
    app's owner reported.

    It used to raise two, both quoting the chapter's Shield restriction
    against Al-Masyukh's Great Sword/Axe and its Siege Jezzail. The Siege
    Jezzail one was WRONG, and the pin is what caught the change.

    Al-Masyukh is a Favoured Takwin Homunculus, whose profile carries `Human
    Hands` and `Additional Arm` among its innate abilities — so Warbands of
    Trench Crusade states its allowance, and "unless otherwise stated" is the
    first line of the chapter's rule:

      "…it can have three 1-Handed Melee Weapons or one 1-Handed Melee Weapon
       and one 2-Handed Melee Weapon, and it can have three 1-Handed Ranged
       Weapons or one 1-Handed Ranged Weapon and one 2-Handed Ranged Weapon.
       If it takes a Shield, then the Shield replaces one of the Melee Weapons
       it can have but the Shield Combo rule cannot be used for any of its
       weapons."

    The Siege Jezzail is 2-Handed RANGED and the Shield replaces a MELEE
    weapon, so the Shield never reaches it — and the stipulation the chapter
    asks for is one this model is explicitly forbidden to use, so demanding it
    demands the impossible.

    The melee count is still over, and now says so against the model's own
    entry rather than the chapter's: a Shield, a 1-Handed and a 2-Handed is one
    more than either branch allows, because the Shield takes one of the melee
    slots. That one is real.

    Still pinned exactly. If it moves, something has changed about what the
    engine can see, and that is worth failing over — which is how the wrong
    one was found.
  */
  it('raises exactly the one Battlekit violation the books call for', () => {
    const { roster } = toRoster(defaultSultanateWarband, d);
    const v = validateRoster(roster, d).violations.filter((x) => x.code === 'battlekit-limit');
    expect(v.map((x) => x.message).sort()).toEqual([
      "Takwin Homunculus: Great Sword/Axe, Sword/Axe with a Shield is more Melee Weapons "
      + "than Takwin Homunculus's own entry allows.",
    ]);
  });

  it('no longer calls the Homunculus’s 2-Handed RANGED weapon illegal', () => {
    // The reported bug, pinned in its own right so it cannot come back quietly.
    const { roster } = toRoster(defaultSultanateWarband, d);
    const v = validateRoster(roster, d).violations.filter((x) => x.code === 'battlekit-limit');
    expect(v.map((x) => x.message).join(' | ')).not.toMatch(/Siege Jezzail/);
  });

  it('and none of them are about the other eight models', () => {
    const { roster } = toRoster(defaultSultanateWarband, d);
    const v = validateRoster(roster, d).violations.filter((x) => x.code === 'battlekit-limit');
    expect(new Set(v.map((x) => x.unitId)).size).toBe(1);
  });
});

/**
 * The limits the Keyword Glossary states, rather than the limits page.
 *
 *   STRONG      "…it can equip and use one 2-Handed Melee Weapon as if it were
 *                a 1-Handed Melee Weapon."
 *   CUMBERSOME  "Weapons with this Keyword require two hands to use, even if
 *                the model has the STRONG Keyword."
 *   HELD        "…requires one hand to carry and cannot be put down… can only
 *                be equipped with or use either a 1-Handed Weapon or a Shield.
 *                It cannot be equipped with or use any 2-Handed Weapons, or
 *                both a Weapon and a Shield… It may still carry Grenades."
 *   HEAVY       parsed, deliberately not enforced — see below.
 */
describe('the limits stated as keywords', () => {
  const rules = () => d.battlekitLimits!.byKeyword ?? [];
  const kw = (name: string) => rules().find((r) => r.keyword === name);

  it('all four are derived from the glossary', () => {
    expect(rules().map((r) => r.keyword).sort())
      .toEqual(['CUMBERSOME', 'HEAVY', 'HELD', 'STRONG']);
  });

  it('STRONG converts ONE 2-Handed Melee weapon, not every one', () => {
    // The equip modal's version converted all of them, so a STRONG model
    // could carry two greatswords in two hands.
    expect(kw('STRONG')?.converts).toMatchObject({ count: 1, from: 2, to: 1 });
    expect(kw('STRONG')?.converts?.section).toBe('Melee Weapons');
  });

  it('CUMBERSOME names the keyword it overrides', () => {
    expect(kw('CUMBERSOME')).toMatchObject({ fixedHands: 2, overrides: 'STRONG' });
  });

  it('HELD keeps all four of its clauses, or none', () => {
    expect(kw('HELD')).toMatchObject({
      occupiesHands: 1, blocksHands: 2, exempt: 'Grenades',
    });
    expect(kw('HELD')?.blocksBoth).toEqual(['Weapon', 'Shield']);
  });
});

describe('a STRONG model', () => {
  const chapter = new Map((d.battlekit ?? []).map((b) => [b.name, b.type]));
  const melee = (hands: number) => rowsIn('Melee Weapons')
    .filter((r) => chapter.get(r.name) === `${hands}-Handed`).map((r) => r.name);

  const load = (names: string[]) =>
    names.map((n) => ({ name: n, weaponId: armoury.rows.find((r) => r.name === n)?.weaponId ?? undefined }));

  it('may carry a 2-Handed and a 1-Handed Melee weapon', () => {
    const items = load([melee(2)[0], melee(1)[0]]);
    // Three hands for an ordinary model…
    expect(battlekitBreaches(items, { armoury, dataset: d })).toHaveLength(1);
    // …two for a STRONG one, because one 2-Handed counts as 1-Handed.
    expect(battlekitBreaches(items, { armoury, dataset: d, keywords: ['STRONG'] })).toEqual([]);
  });

  it('but only one of them converts', () => {
    const items = load([melee(2)[0], melee(2)[1]]);
    expect(battlekitBreaches(items, { armoury, dataset: d, keywords: ['STRONG'] }))
      .toHaveLength(1);
  });
});

/*
  HEAVY is parsed and not enforced, and that is a decision rather than an
  oversight — see the note in battlekitLimits.ts. NEGATE HEAVY, which STRONG
  grants, lifts the limit outright, and the roster cannot tell us whether a
  model has STRONG: a saved profileSnapshot carries no keywords, and the
  Inhuman Strength Formula grants STRONG to models whose catalogue entry has
  no such keyword. Enforcing it raised two false violations on a real warband.
*/
describe('HEAVY', () => {
  it('is derived', () => {
    expect(d.battlekitLimits!.byKeyword!.find((r) => r.keyword === 'HEAVY')?.maxPerModel)
      .toBe(1);
  });

  it('and is deliberately not enforced, so a legal warband stays legal', () => {
    const heavy = d.weapons
      .filter((w) => (w.keywords ?? []).some((k) => k.trim().toUpperCase() === 'HEAVY'))
      .slice(0, 2)
      .map((w) => ({ name: w.name, weaponId: w.id }));
    expect(heavy.length).toBe(2);
    expect(battlekitBreaches(heavy, { armoury, dataset: d })
      .filter((b) => b.section === 'HEAVY')).toEqual([]);
  });

  it('and a model that NEGATEs a keyword is exempt from its limit', () => {
    // The mechanism is right even where this one rule is not switched on:
    // "A model with the NEGATE Keyword is not affected by the specified
    // Keyword's Effect."
    const held = d.weapons.find((w) => (w.keywords ?? []).some((k) => k.trim().toUpperCase() === 'HELD'))!;
    const two = rowsIn('Melee Weapons').map((r) => r.name);
    const items = [{ name: held.name, weaponId: held.id }, ...two.slice(0, 2).map((n) => ({ name: n }))];
    const withNegate = battlekitBreaches(items, {
      armoury, dataset: d, keywords: ['NEGATE HELD'],
    }).filter((b) => b.section === 'HELD');
    expect(withNegate).toEqual([]);
  });
});
