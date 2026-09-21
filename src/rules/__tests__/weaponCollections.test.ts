/**
 * Weapon Collections: the Battlekit a Variant lets a Warband buy abroad.
 *
 * Warbands of Trench Crusade, L5303-L5308, under The House of Wisdom:
 *
 *   "Weapon Collections: When you create your starting Warband, you can
 *    purchase 1 piece of Battlekit from the New Antioch Armoury, and 1 piece
 *    of Battlekit from the Trench Pilgrims Armoury. Any stipulations that
 *    apply to it are followed (so there is little point in taking Battlekit
 *    that can only be used by models from the other Warbands). You can
 *    repurchase the Battlekit later during the campaign if it is lost for any
 *    reason."
 *
 * `variantArmoury` has read that sentence since RULES-2 and `validate`'s
 * `checkVariantGrants` has counted against it since — but the builder is
 * assembled from one Armoury, so nothing ever put the foreign Battlekit on
 * offer. The allowance was enforced against a purchase the app gave the
 * player no way to make.
 *
 * These tests pin the offer, and pin the two things about it that are easy to
 * get wrong: that it is *Battlekit* and not just weapons, and that a foreign
 * row brings its own Armoury's stipulations rather than being exempt from all
 * of them.
 */
import { describe, it, expect } from 'vitest';
import { DATASET } from '@/data/generated/trenchline.generated';
import { recruitable } from '@/rules/recruitable';
import { armouryFor, restrictionsFor, priceOf } from '@/rules/armoury';

const APP_FACTIONS = [
  'new-antioch', 'trench-pilgrims', 'iron-sultanate',
  'heretic-legions', 'cult-of-the-black-grail', 'court-of-the-seven-headed-serpent',
];

const houseOfWisdom = DATASET.variants.find((v) => /House of Wisdom/i.test(v.name));

const asHouseOfWisdom = () =>
  recruitable(DATASET, 'iron-sultanate', APP_FACTIONS, houseOfWisdom?.id);

const asStandardSultanate = () =>
  recruitable(DATASET, 'iron-sultanate', APP_FACTIONS);

const named = <T extends { name: string }>(list: T[], name: string): T | undefined =>
  list.find((x) => x.name === name);

describe('the variant that states the grant', () => {
  it('is the House of Wisdom, and the rule is on it', () => {
    expect(houseOfWisdom).toBeDefined();
    expect(houseOfWisdom!.specialRules.map((r) => r.name)).toContain('Weapon Collections');
  });
});

describe('what the House of Wisdom is offered', () => {
  it('offers the Anti-Tank Hammer at the Trench Pilgrims price', () => {
    // Warbands L2794: Anti-Tank Hammer   ELITE only, Limit: 3   35 👑
    const hammer = named(asHouseOfWisdom().weapons, 'Anti-Tank Hammer');
    expect(hammer).toBeDefined();
    expect(hammer).toMatchObject({
      cost: 35,
      factionId: 'trench-pilgrims',
      grantedBy: 'Weapon Collections',
    });
  });

  it('offers Machine Armour — the rule says Battlekit, not weapons', () => {
    /*
      The book's own umbrella term: the Armoury Table's heading is "… can have
      the following Battlekit" and its sections are Ranged Weapons, Melee
      Weapons, Grenades, Shields, Armour and Equipment. The BattleScribe
      catalogue models Weapon Collections as a hand-picked subset with no
      Armour group at all (Iron Sultanate.cat L5883-L6473); precedence puts
      the rulebook above the catalogue.
    */
    // Warbands L1350: • Machine Armour   ELITE & Mechanized Heavy Infantry
    //                   only, Limit: 1 excluding Mechanized Heavy Infantry   50 👑
    const armour = named(asHouseOfWisdom().armour, 'Machine Armour');
    expect(armour).toBeDefined();
    expect(armour).toMatchObject({
      cost: 50,
      factionId: 'new-antioch',
      grantedBy: 'Weapon Collections',
    });
  });

  it('offers Equipment and Shields from abroad too, not only the weapon racks', () => {
    const kit = asHouseOfWisdom();
    // Engineer Body Armour is New Antioch's alone (Combat Engineer only, L1349).
    expect(named(kit.armour, 'Engineer Body Armour')).toMatchObject({
      factionId: 'new-antioch', grantedBy: 'Weapon Collections',
    });
    // Heavy Ballistic Shield, New Antioch, L1345 — a Shields row, which the
    // catalogue's Weapon Collections group does not carry for New Antioch.
    expect(named(kit.armour, 'Heavy Ballistic Shield')).toMatchObject({
      factionId: 'new-antioch', grantedBy: 'Weapon Collections',
    });
    // Holy Icon Shield, Trench Pilgrims.
    expect(named(kit.armour, 'Holy Icon Shield')).toMatchObject({
      factionId: 'trench-pilgrims', grantedBy: 'Weapon Collections',
    });
    // Blessed Icon, Trench Pilgrims Equipment.
    expect(named(kit.equipment, 'Blessed Icon')).toMatchObject({
      factionId: 'trench-pilgrims', grantedBy: 'Weapon Collections',
    });
  });

  it('keeps both offers where both granted armouries stock the same item', () => {
    /*
      Field Shrine is sold by New Antioch and by the Trench Pilgrims, and the
      grant is one piece from EACH. Collapsing the two into one row would make
      the app choose which allowance the player spends, and which table prices
      it — a decision the book leaves to them. Two rows, with the Armoury named
      on each, and ids that do not collide.
    */
    const shrines = asHouseOfWisdom().equipment.filter((e) => e.name === 'Field Shrine');
    expect(shrines.map((s) => s.factionId).sort())
      .toEqual(['new-antioch', 'trench-pilgrims']);
    expect(new Set(shrines.map((s) => s.id)).size).toBe(2);
    expect(shrines.every((s) => s.grantedBy === 'Weapon Collections')).toBe(true);
  });

  it('does not repeat an item the Sultanate already stocks', () => {
    // Every faction sells a Sword/Axe. Offering New Antioch's as well would be
    // a second row for the same item at another price, and taking it would
    // spend a once-per-campaign allowance for nothing. `checkVariantGrants`
    // makes the same exclusion, so the offer and the count agree.
    const swords = asHouseOfWisdom().weapons.filter((w) => w.name === 'Sword/Axe');
    expect(swords).toHaveLength(1);
    expect(swords[0].grantedBy).toBeUndefined();
    expect(swords[0].factionId).toBe('iron-sultanate');
  });
});

describe('two Armouries, two prices', () => {
  it('offers Martyrdom Pills at each Armoury\u2019s own price and currency', () => {
    /*
      The case that settles why the two offers are kept apart. New Antioch
      sells Martyrdom Pills for 1 Glory (Warbands L1357); the Trench Pilgrims
      sell them for 20 Ducats (L2812). Not a rounding difference — a different
      currency. Collapsing the rows would make the app choose which the player
      pays, and the book gives them one piece from EACH Armoury.
    */
    const pills = asHouseOfWisdom().equipment.filter((e) => e.name === 'Martyrdom Pills');
    const byFaction = new Map(pills.map((p) => [p.factionId, p]));

    expect(byFaction.get('new-antioch')).toMatchObject({ cost: 0, gloryCost: 1 });
    expect(byFaction.get('trench-pilgrims')).toMatchObject({ cost: 20 });
    expect(byFaction.get('trench-pilgrims')?.gloryCost).toBeUndefined();
  });
});

describe('a standard Iron Sultanate Warband', () => {
  it('is offered none of it', () => {
    const kit = asStandardSultanate();
    expect(named(kit.armour, 'Machine Armour')).toBeUndefined();
    expect(named(kit.weapons, 'Anti-Tank Hammer')).toBeUndefined();
    expect([...kit.weapons, ...kit.armour, ...kit.equipment]
      .filter((x) => x.grantedBy)).toEqual([]);
  });

  it('keeps its own armoury unchanged', () => {
    const own = armouryFor(DATASET, 'iron-sultanate');
    const kit = asStandardSultanate();
    expect(kit.weapons.length + kit.armour.length + kit.equipment.length)
      .toBe(own!.rows.length);
  });
});

describe('"Any stipulations that apply to it are followed"', () => {
  it('keeps the granting armoury’s restrictions reachable from the offer', () => {
    /*
      The equip sheet gates on `restrictionsFor(armoury, item)`. Looked up in
      the Warband's OWN armoury a foreign item matches no row, which returns no
      restrictions — an item silently exempt from the sentence printed beside
      it. The offer carries the faction whose table priced it so the lookup can
      be made against the right one.
    */
    const armour = named(asHouseOfWisdom().armour, 'Machine Armour')!;
    const from = armouryFor(DATASET, armour.factionId!);

    expect(restrictionsFor(from, armour)).toEqual([
      'ELITE & Mechanized Heavy Infantry only, Limit: 1 excluding Mechanized Heavy Infantry',
    ]);
    expect(restrictionsFor(armouryFor(DATASET, 'iron-sultanate'), armour)).toEqual([]);
  });

  it('prices it from the granting armoury, not from ours', () => {
    const hammer = named(asHouseOfWisdom().weapons, 'Anti-Tank Hammer')!;
    expect(priceOf(armouryFor(DATASET, hammer.factionId!), hammer))
      .toEqual({ ducats: 35, glory: 0 });
  });
});

describe('the size of the offer', () => {
  it('adds exactly the foreign rows the Sultanate does not already stock', () => {
    const own = armouryFor(DATASET, 'iron-sultanate')!;
    const ownNames = new Set(own.rows.map((r) => r.name.toLowerCase()));
    const foreign = ['new-antioch', 'trench-pilgrims']
      .flatMap((f) => armouryFor(DATASET, f)!.rows)
      .filter((r) => !ownNames.has(r.name.toLowerCase()));
    const distinct = new Set(foreign.map((r) => r.name.toLowerCase()));

    const kit = asHouseOfWisdom();
    const granted = [...kit.weapons, ...kit.armour, ...kit.equipment]
      .filter((x) => x.grantedBy);

    // A count rather than a list: it is what would notice the grant silently
    // widening or collapsing after a data change.
    expect(new Set(granted.map((g) => g.name.toLowerCase())).size).toBe(distinct.size);
    expect(granted.length).toBe(foreign.length);
  });
});
