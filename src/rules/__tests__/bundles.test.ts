import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import { toRoster } from '../fromWarband';
import { validateRoster } from '../validate';
import type { Dataset } from '@/types/catalogue';
import type { Warband } from '@/types/warband';

/**
 * One selectable name that grants several items.
 *
 * `Polearm and Shield` is a Mercenaries entry with NO profile of its own that
 * links the `Polearm` (Weapon) and `Shield` (Battlekit) profiles from the
 * shared .gst. It therefore matched no weapon and no armoury row, and a roster
 * holding it was told it was "not in this ruleset" — which drops the item out
 * of every legality check while telling the player their list is provisional.
 *
 * The distinction that makes deriving these safe is OWN versus LINKED profiles.
 * Keying on "the entry's name differs from its profile's name" instead produced
 * `Automatic Pistol -> Stolen: Automatic Pistol` and `Melee -> Knight Companion
 * of the Bladed Fly`, which would redirect ordinary wargear to another entry.
 */
const d = DATASET as unknown as Dataset;

describe('the derived bundles', () => {
  it('are only real loadouts, not a fuzzy name match', () => {
    expect((d.bundles ?? []).map((b) => b.name).sort())
      .toEqual(['Polearm and Shield', 'Sword and Pistol']);
  });

  it('name what they actually grant', () => {
    const polearm = (d.bundles ?? []).find((b) => b.name === 'Polearm and Shield');
    expect(polearm?.grants.sort()).toEqual(['Polearm', 'Shield']);
  });

  it('never shadow a name the catalogue already resolves', () => {
    // An alias for a name that resolves elsewhere could only send it somewhere
    // worse, so a bundle is kept only where nothing else answers to the name.
    const names = new Set(d.weapons.map((w) => w.name.toLowerCase()));
    for (const b of d.bundles ?? []) {
      expect(names.has(b.name.toLowerCase()), b.name).toBe(false);
    }
  });
});

describe('the profiles a bundle grants', () => {
  it('reach the Battlekit chapter when nothing else names them', () => {
    /*
      `Shield` is a generic Battlekit profile in the shared .gst. The chapter
      prints `Trench Shield`, a different entry that also exists, so neither
      may be renamed into the other \u2014 and the weapon emit deliberately skips
      Battlekit links, because resolving them there turns a Black Grail Strain
      into equipment anyone can buy. Granted and then unknown, it counted
      against no limit at all: a model could carry two.
    */
    const shield = (d.battlekit ?? []).find((b) => b.name === 'Shield');
    expect(shield).toBeDefined();
    expect(shield?.section).toBe('Shields');
  });

  it('take a section derived from the chapter, never one written here', () => {
    // Every section a granted profile is given is one the chapter itself uses.
    const sections = new Set((d.battlekit ?? []).map((b) => b.section));
    expect(sections.has('Shields')).toBe(true);
  });
});

describe('a roster holding a bundle', () => {
  const mercenary = d.units.find((u) => u.name === 'Sellsword' || /mercenar/i.test(String(u.factionId)))
    ?? d.units[0];

  const warband = (gear: string[]): Warband => ({
    id: 'wb1', name: 'T', factionId: 'iron-sultanate',
    ducatLimit: 1000, treasuryDucats: 0, gloryPoints: 0,
    units: [{
      id: 'u1', customName: 'Jawhar al-Sari', baseProfileId: mercenary.id,
      profileSnapshot: mercenary as never,
      equippedWeapons: gear.map((name, i) => ({ instanceId: `w${i}`, name, cost: 0 })) as never,
      equippedArmour: [], equippedEquipment: [],
      xp: 0, advancements: [], injuries: [], isDead: false,
      totalCost: 0, currentWounds: 1, maxWounds: 1, bloodMarkers: 0, status: 'Active',
    }] as never,
    armoryStash: [], createdAt: '', updatedAt: '',
  } as unknown as Warband);

  /*
    Two of the same bundle are two loadouts, not one.

    `oneStatedLoadout` exempts the items of ONE stated loadout from being
    policed against each other, because the entry states what it hands the
    model. It identified that loadout by the bundle's NAME, so a model carrying
    `Polearm and Shield` twice produced four items all claiming the same grant
    and the exemption swallowed the whole set — hiding two Shields and four
    hands' worth of weapons on one model. Reported by Codex review on #27.
  */
  it('tells two of the same bundle apart', () => {
    const { roster } = toRoster(warband(['Polearm and Shield', 'Polearm and Shield']), d);
    const items = roster.units[0].items;

    expect(items, 'two bundles expand to four items').toHaveLength(4);
    const grants = [...new Set(items.map((i) => i.grantedBy))];
    expect(grants, 'each bundle needs its own grant id').toHaveLength(2);
    for (const g of grants) expect(g).toBeTruthy();
  });

  it('counts two Shields when the bundle is taken twice', () => {
    const one = toRoster(warband(['Polearm and Shield']), d);
    const oneMsgs = validateRoster(one.roster, d).violations.map((v) => v.message).join(' | ');
    expect(oneMsgs, 'one bundle is a legal stated loadout').not.toMatch(/Shield/i);

    const two = toRoster(warband(['Polearm and Shield', 'Polearm and Shield']), d);
    const twoMsgs = validateRoster(two.roster, d).violations.map((v) => v.message).join(' | ');
    expect(twoMsgs, 'two bundles put two Shields on one model').toMatch(/Shield/i);
  });

  it('resolves it instead of reporting it as not in the ruleset', () => {
    const { unmatched } = toRoster(warband(['Polearm and Shield']), d);
    expect(unmatched.map((u) => u.name)).not.toContain('Polearm and Shield');
  });

  it('and counts BOTH items it grants, not just the one that resolved', () => {
    // Half a bundle is worse than none: the shield would go uncounted against
    // the Shield limit while the model was charged for the loadout.
    const { roster } = toRoster(warband(['Polearm and Shield']), d);
    expect(roster.units[0].items).toHaveLength(2);
  });

  it('prices the loadout once, at the entry\u2019s own cost', () => {
    // Both bundles the catalogues define are free options in a Mercenary's
    // `Loadout` group. Pricing the parts out of the Armoury Table billed the
    // Mamluk Faris 7 Ducats for a Polearm the book hands it for nothing.
    const { roster } = toRoster(warband(['Polearm and Shield']), d);
    const total = roster.units[0].items.reduce((n, i) => n + i.cost.ducats, 0);
    expect(total).toBe(0);
  });

  it('does not police one stated loadout\u2019s items against each other', () => {
    /*
      "A Mamluk Faris always has either a Greatsword, or a Polearm and a Trench
      Shield, or a Pistol and a Sword/Axe."

      The catalogue calls the shield in that loadout the generic `Shield`, not
      the Trench Shield the book names, and only the Trench Shield carries the
      Shield Combo stipulation. Judged against each other, the two halves of a
      loadout the book hands the model raise "Polearm is 2-Handed and cannot be
      carried with a Shield" \u2014 a legality error on a legal roster.
    */
    const { roster } = toRoster(warband(['Polearm and Shield']), d);
    const messages = validateRoster(roster, d).violations
      .filter((v) => v.code === 'battlekit-limit')
      .map((v) => v.message);
    expect(messages).toEqual([]);
  });

  it('but still counts a Shield bought ON TOP of a bundled one', () => {
    // The entry states what it grants, not what may be added to it.
    const { roster } = toRoster(warband(['Polearm and Shield', 'Trench Shield']), d);
    const messages = validateRoster(roster, d).violations
      .filter((v) => v.code === 'battlekit-limit')
      .map((v) => v.message);
    expect(messages.join(' ')).toMatch(/2 Shields carried|the limit is 1/);
  });

  it('still reports a name that is neither an item nor a bundle', () => {
    const { unmatched } = toRoster(warband(['Something No Book Has Heard Of']), d);
    expect(unmatched.map((u) => u.name)).toContain('Something No Book Has Heard Of');
  });
});
