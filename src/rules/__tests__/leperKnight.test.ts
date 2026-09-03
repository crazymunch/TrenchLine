import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import { recruitable } from '../recruitable';
import { validateRoster } from '../validate';
import type { Roster, RosterItem } from '../costs';
import type { Dataset } from '@/types/catalogue';

/**
 * A Variant that replaces an entry shows the replacement IN ITS PLACE.
 *
 * The Knights of Saint Lazarus is the case the book states most plainly:
 *
 *   Sacred Code:    …it cannot include Lazarist Communicants or Lazarist
 *                   Castigators…
 *   Knightly Order: A Knights of Saint Lazarus Warband must include 1-3
 *                   Leper-Knights. The Leper-Knights use the Lazarist
 *                   Castigator Warband entry…
 *
 * Read naively those contradict: the first bans the entry the second requires.
 * They do not. The entry has not been forbidden, it has been RENAMED — you
 * cannot field a Castigator as a Castigator, and in this Warband that entry is
 * the Leper-Knight. Applying the ban before the rename produces a Warband that
 * cannot take the model the book says it must have 1-3 of, which is exactly
 * what the app did.
 */
const d = DATASET as unknown as Dataset;
const F = 'procession-of-the-sacred-affliction';

const list = (variantId?: string) =>
  recruitable(d, F, [F], variantId).units
    .filter((u) => String(u.factionId).toLowerCase().includes('procession'));

const names = (variantId?: string) => list(variantId).map((u) => u.name);

describe('the Knights of Saint Lazarus recruit list', () => {
  it('offers a Leper-Knight', () => {
    expect(names('Knights of Saint Lazarus')).toContain('Leper-Knight');
  });

  it('offers it in the Castigator’s place, not beside it', () => {
    const n = names('Knights of Saint Lazarus');
    expect(n).not.toContain('Lazarist Castigator');
    // One row, not two: the Leper-Knight IS that entry.
    expect(n.filter((x) => x === 'Leper-Knight')).toHaveLength(1);
  });

  it('lets the Warband take the 1-3 the book requires', () => {
    const knight = list('Knights of Saint Lazarus').find((u) => u.name === 'Leper-Knight');
    expect(knight?.maxCount, 'still capped at the Castigator’s own limit of 1').toBe(3);
  });

  it('does not offer the Lazarist Communicant its Sacred Code forbids', () => {
    expect(names('Knights of Saint Lazarus')).not.toContain('Lazarist Communicant');
  });

  /*
    The control. Without the Variant the standard Procession list is unchanged
    — a rename that leaked into every list would pass the assertions above and
    be a worse bug than the one being fixed.
  */
  it('leaves the standard Procession list alone', () => {
    const n = names();
    expect(n).toContain('Lazarist Castigator');
    expect(n).toContain('Lazarist Communicant');
    expect(n).not.toContain('Leper-Knight');
  });
});

describe('the other Carcass Front Variants', () => {
  it('Procession of the Blessed Flock bans what it bans and caps what it caps', () => {
    const n = names('Procession of the Blessed Flock');
    expect(n).not.toContain('Anchorite Shrine');
    expect(n).not.toContain('Leper-Pilgrim');
    // "may include 1-3 Lazarist Castigators and 1-6 Lazarist Communicants"
    const cast = list('Procession of the Blessed Flock').find((u) => u.name === 'Lazarist Castigator');
    expect(cast?.maxCount).toBe(3);
  });

  it('the Drowned Choir bans the Heretic Captain the book names', () => {
    const raiders = recruitable(d, 'heretic-naval-raiders', ['heretic-naval-raiders'], 'Drowned Choir')
      .units.filter((u) => String(u.factionId).toLowerCase().includes('naval'))
      .map((u) => u.name);
    // "cannot include any of the following models: Heretic Captain, Abyssal
    // Commando, Sea Hag, Anointed Heretic Raiders."
    for (const banned of ['Heretic Captain', 'Abyssal Commando', 'Sea Hag']) {
      expect(raiders, `${banned} is still offered`).not.toContain(banned);
    }
    expect(raiders).toContain('Drowned Chorister');
  });
});

/*
  The same mechanism, from the other source. The Knights of Saint Lazarus'
  rename is derived from a supplement's PROSE; the House of Wisdom's comes from
  a BattleScribe modifier. Both end up as the same op, and the recruit list
  should not be able to tell them apart.
*/
describe('a rename that came from the catalogues rather than the books', () => {
  const sultanate = (variantId?: string) =>
    recruitable(d, 'iron-sultanate', ['iron-sultanate'], variantId).units
      .filter((u) => String(u.factionId).toLowerCase().includes('sultanate'))
      .map((u) => u.name);

  it('The House of Wisdom fields Fāris, not Janissaries', () => {
    const n = sultanate('The House of Wisdom');
    expect(n).toContain('Fāris');
    expect(n).not.toContain('Janissary');
  });

  it('and the standard Iron Sultanate list still has its Janissary', () => {
    expect(sultanate()).toContain('Janissary');
  });
});

/**
 * A Variant changes the model, not just its name and its limit.
 *
 * The rest of the Knightly Order sentence:
 *
 *   "…but must wear a suit of Armour, have a Melee Characteristic of +2 DICE,
 *    and replace the Whip of God Ability with the Knightly Code Ability."
 *
 * All three used to be printed and none applied. The first two are here; the
 * Armour requirement is a LEGALITY rule rather than a change to the profile,
 * and belongs with the validator.
 */
describe('the Leper-Knight’s profile', () => {
  const knight = () => list('Knights of Saint Lazarus').find((u) => u.name === 'Leper-Knight');
  const castigator = () => list().find((u) => u.name === 'Lazarist Castigator');

  it('has the +2 DICE Melee the Variant grants it', () => {
    expect(knight()?.stats.melee).toBe('+2 DICE');
  });

  it('and the Castigator it is built on does not', () => {
    // The control that matters: a Variant is a lens on the catalogue, not an
    // edit to it. If the base profile changed, one Warband's Variant would
    // leak into every other Warband on the device.
    expect(castigator()?.stats.melee).not.toBe('+2 DICE');
  });

  it('carries Knightly Code, with its real rules text', () => {
    const abilities = knight()?.innateAbilities ?? [];
    const code = abilities.find((a) => a.name === 'Knightly Code');
    expect(code, 'Knightly Code was not granted').toBeTruthy();
    // Not a stub: the book prints this ability as a named rule on the same
    // Variant, directly under the rule that says to swap it in.
    expect(code!.description).toMatch(/takes an enemy model Out of Action/);
  });

  it('has lost the Whip of God it traded away', () => {
    const names = (knight()?.innateAbilities ?? []).map((a) => a.name);
    expect(names, 'the swap granted the new ability without removing the old')
      .not.toContain('Whip of God');
  });

  it('and the standard Castigator still has Whip of God', () => {
    const names = (castigator()?.innateAbilities ?? []).map((a) => a.name);
    expect(names).toContain('Whip of God');
  });
});

/*
  The other stat change in the book, and the reason these are read per
  SENTENCE rather than per paragraph. The Drowned Choir says both:

    "Drowned Choir Warbands must include 1-3 Drowned Choristers…"
    "Wretched models in a Drowned Choir cost 30 👑 and have a Melee
     Characteristic of +0 DICE."

  Read across the paragraph the +0 DICE would land on whichever entry the
  parser saw first.
*/
describe('a stat change that names its own model', () => {
  /*
    Narrowed to the faction, because `recruitable` returns every faction's
    units and the UI filters afterwards. Three factions field a `Wretched`; an
    unfiltered `find` returns the Court of the Seven-Headed Serpent's.
  */
  const raiders = (variantId?: string) =>
    recruitable(d, 'heretic-naval-raiders', ['heretic-naval-raiders'], variantId).units
      .filter((u) => String(u.factionId).toLowerCase().includes('naval'));

  it('lands on the Wretched, not on the Drowned Chorister', () => {
    const under = raiders('Drowned Choir');
    expect(under.find((u) => u.name === 'Wretched')?.stats.melee).toBe('+0 DICE');
    const chorister = under.find((u) => u.name === 'Drowned Chorister');
    expect(chorister?.stats.melee).not.toBe('+0 DICE');
  });

  it('leaves the standard Naval Raiders list alone', () => {
    const base = raiders().find((u) => u.name === 'Wretched');
    expect(base?.stats.melee).not.toBe('+0 DICE');
  });
});

/**
 * The Leper-Knight's price.
 *
 * The Knightly Order rule restates the statline, the Ability and the limit,
 * and says nothing about cost. That silence is the rule: the Leper-Knight
 * *uses the Lazarist Castigator Warband entry*, so it is bought at the
 * Castigator's price. Nothing here sets a cost — the point of the test is
 * that nothing anywhere does, and the inherited 50 Ducats is what the player
 * pays. Pinned rather than left incidental, because a `setCost` op derived
 * later from some other Variant's prose must not quietly reprice this one.
 */
describe('the Leper-Knight’s cost', () => {
  const knight = () => list('Knights of Saint Lazarus').find((u) => u.name === 'Leper-Knight');
  const castigator = () => list().find((u) => u.name === 'Lazarist Castigator');

  it('is the Lazarist Castigator’s, because the book does not restate one', () => {
    expect(knight()?.baseCost).toBe(castigator()?.baseCost);
    expect(knight()?.gloryCost).toBe(castigator()?.gloryCost);
  });

  /*
    Both halves of the comparison above have to be real. Asserting the two are
    equal is satisfied by both being `undefined`, which is how the first draft
    of this test passed while reading a field the recruit row does not have.
  */
  it('and is a real price, not a zero standing in for an unread one', () => {
    expect(knight()?.baseCost).toBeGreaterThan(0);
  });
});

/**
 * "…but must wear a suit of Armour…"
 *
 * A condition on the roster entry rather than a change to the profile, so it
 * is enforced by the validator. What satisfies it is the Armoury Table
 * SECTION: the Procession stocks four suits under `Armour`, and matching on
 * the word instead would accept Armour-Piercing Bullets and reject Ragged
 * Vestments.
 */
describe('the Leper-Knight’s Armour requirement', () => {
  const V = 'Knights of Saint Lazarus';
  const castigator = d.units.find(
    (u) => u.name === 'Lazarist Castigator'
        && String(u.factionId).toLowerCase().includes('procession'))!;

  const armouryRow = (section: string) =>
    (d.armouries ?? [])
      .find((a) => String(a.faction).toLowerCase().includes('procession'))!
      .rows.find((r) => r.section === section)!;

  const rosterWearing = (items: RosterItem[]): Roster => ({
    id: 'r1', name: 'Lazarist', factionId: 'Procession of the Sacred Affliction',
    variantId: V,
    units: [{ id: 'u1', profileId: castigator.id, name: 'Leper-Knight',
              cost: castigator.cost, items, options: [] }],
    stash: [], budget: { ducats: 700, glory: 10 },
  });

  const gearViolations = (r: Roster) =>
    validateRoster(r, d).violations.filter((v) => v.code === 'variant-requires-gear');

  it('fails a Leper-Knight wearing nothing', () => {
    const v = gearViolations(rosterWearing([]));
    expect(v, 'no violation raised').toHaveLength(1);
    expect(v[0].severity).toBe('error');
    expect(v[0].unitId).toBe('u1');
  });

  it('names what the player can buy to clear it', () => {
    // An error the player cannot act on is the same failure as no error.
    const [v] = gearViolations(rosterWearing([]));
    expect(v.message).toContain('Standard Armour');
  });

  it('passes once a suit from the Armour section is worn', () => {
    const armour = armouryRow('Armour');
    expect(gearViolations(rosterWearing([
      { weaponId: armour.weaponId ?? undefined, name: armour.name, cost: armour.cost },
    ]))).toEqual([]);
  });

  it('accepts any suit the section holds, not just the one it names first', () => {
    const suits = (d.armouries ?? [])
      .find((a) => String(a.faction).toLowerCase().includes('procession'))!
      .rows.filter((r) => r.section === 'Armour');
    expect(suits.length, 'the Procession stocks more than one suit').toBeGreaterThan(1);
    for (const s of suits) {
      expect(gearViolations(rosterWearing([
        { weaponId: s.weaponId ?? undefined, name: s.name, cost: s.cost },
      ])), `${s.name} was rejected`).toEqual([]);
    }
  });

  it('is not cleared by a Shield, which is a different section', () => {
    const shield = armouryRow('Shield');
    expect(gearViolations(rosterWearing([
      { weaponId: shield.weaponId ?? undefined, name: shield.name, cost: shield.cost },
    ]))).toHaveLength(1);
  });

  /*
    The control. The requirement belongs to the Variant, not to the entry: a
    Castigator in a standard Procession warband wears what its player likes.
  */
  it('does not apply to a Castigator outside the Variant', () => {
    expect(gearViolations({ ...rosterWearing([]), variantId: undefined })).toEqual([]);
  });

  it('and does not apply under a different Variant of the same faction', () => {
    expect(gearViolations({
      ...rosterWearing([]), variantId: 'Procession of the Blessed Flock',
    })).toEqual([]);
  });
});
