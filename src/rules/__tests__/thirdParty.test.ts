/**
 * Telling unofficial content from official, against the real catalogues.
 *
 * The stake is specific: showing third-party material as though it were
 * published is the same class of error as the invented statlines this project
 * exists to undo — the player cannot tell, so they find out at the table.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import { FACTIONS } from '@/data/defaultRules';
import { recruitable } from '../recruitable';
import { thirdPartyGate, thirdPartyVariantIds, THIRD_PARTY_OPTION_ID } from '../thirdParty';
import { validateRoster } from '../validate';
import type { Roster } from '../costs';

const APP_FACTIONS = FACTIONS.map((f) => f.id);
const sultanate = recruitable(DATASET, 'iron-sultanate', APP_FACTIONS);
const TP_VARIANTS = thirdPartyVariantIds(DATASET);
const gate = (u: Parameters<typeof thirdPartyGate>[0]) => thirdPartyGate(u, TP_VARIANTS);

describe('the third-party gate', () => {
  const roch = DATASET.units.find((u) => u.name === 'Disciple of St. Roch');

  it('finds the entry the catalogues mark', () => {
    expect(roch, 'the Disciple of St. Roch is gone from the dataset').toBeDefined();
    const g = gate(roch!);
    expect(g.thirdParty).toBe(true);
    // The disclaimer is the source's own words, shown rather than paraphrased.
    expect(g.notice).toMatch(/not fully official/i);
  });

  it('reads the hosts out of the same modifier', () => {
    // Stated only here — the Trench Dispatch, which is where every other
    // Mercenary's hosts come from, never mentions this entry.
    expect(gate(roch!).hosts.sort())
      .toEqual(['Iron Sultanate', 'New Antioch', 'Trench Pilgrims']);
  });

  it('finds every unit gated behind a third-party Warband Variant', () => {
    /*
      The mechanism that matters, and the one the first version of this file
      missed entirely. The `Third Party` *profile* is on one entry; the
      `Third Party` selectionEntryGroup under each faction's Variant Selection
      holds six unofficial Variants, and 21 units exist only inside one of them.

      Two of those are their faction's Leader, which is exactly why this cannot
      be waved through: a player who never opted in was being offered the
      Technomancer and the Chieftain as though they were published.
    */
    const marked = DATASET.units.filter((u) => gate(u).thirdParty).map((u) => u.name).sort();
    expect(marked).toEqual([
      '"Zamburak" Weapon Platform', 'Archeologist', 'Bedu Sharpshooter',
      'Captive Giant', 'Chieftain', 'Disciple of St. Roch', 'Faceless',
      'Goetic Warlock', 'Huscarl', 'Pairika', 'Shirdal', 'Sin Eater', 'Stalker',
      'Technomancer', 'Teğmen', 'Witch Coven Matriarch',
    ]);
  });

  it('does not mark an ordinary unit a Variant merely re-reveals', () => {
    /*
      This list is the correction to the first version, which read any
      variant-conditioned `set hidden false` as a third-party gate and so hid
      six ordinary faction units from anyone who had not opted in.

      On a **visible** entry that op undoes another Variant's ban rather than
      granting access. The War Wolf is a Heretic Legion beast, the Shocktrooper
      a New Antioch trooper; neither needs a third-party Variant to be fielded.
    */
    for (const name of ['Anointed Heavy Infantry', 'Sultanate Sapper', 'Shocktrooper',
                        'Desecrated Saint', 'Yoke Fiend', 'War Wolf']) {
      const u = DATASET.units.find((x) => x.name === name);
      expect(u, name).toBeDefined();
      expect(u!.hiddenByDefault, `${name} is visible by default`).toBeFalsy();
      expect(gate(u!).thirdParty, `${name} is an ordinary unit`).toBe(false);
    }
  });

  it('names the Variant that unlocks each one', () => {
    const of = (n: string) => gate(DATASET.units.find((u) => u.name === n)!).variant;
    expect(of('Technomancer')).toBe('Cadaver Corps');
    expect(of('Chieftain')).toBe('Children of Yggdrasil');
    expect(of('Faceless')).toBe('Fang of the Seething Black');
    // Not the Shocktrooper: it is visible by default, so the Remnants of
    // Byzantium re-reveal is a ban being undone, not a gate.
    expect(of('Witch Coven Matriarch')).toBe('Cadaver Corps');
  });

  it('does not mistake hidden-by-default for third-party', () => {
    /*
      Still the trap, just with the right examples. `hidden="true"` is how
      BattleScribe says "available under a condition", and 26 shipped units
      carry it — the Matagot Hag and the Witchburner among them, both official.
      Gating on `hidden` would delete a third of the roster.
    */
    for (const name of ['Matagot Hag', 'Witchburner', 'Observer', 'Mendelist Ammo Monk']) {
      const u = DATASET.units.find((x) => x.name === name);
      expect(u, name).toBeDefined();
      expect(gate(u!).thirdParty, `${name} is official`).toBe(false);
    }
  });

  it('reads a bare condition, not only a nested one', () => {
    /*
      The bug that made the first version find one entry instead of 22: a
      modifier's `when` is EITHER a group (`all`/`any`) OR a single bare
      condition, and every real gate here uses the bare form.
    */
    const tech = DATASET.units.find((u) => u.name === 'Technomancer')!;
    const hidden = (tech.modifiers ?? []).filter((m) => m.field === 'hidden');
    expect(hidden.length).toBe(1);
    expect(hidden[0].when).not.toHaveProperty('all');
    expect(hidden[0].when).not.toHaveProperty('any');
    expect(gate(tech).thirdParty).toBe(true);
  });

  it('keys on the catalogue option, not on a name we chose', () => {
    // The id is source data from Campaign Rules.cat, not an app invention.
    const s = JSON.stringify(roch!.modifiers ?? []);
    expect(s).toContain(THIRD_PARTY_OPTION_ID);
  });
});

describe('what the gate does to the recruit list', () => {
  it('carries the mark and the notice onto the roster profile', () => {
    const roch = sultanate.units.find((u) => u.name === 'Disciple of St. Roch');
    expect(roch!.thirdParty).toBe(true);
    expect(roch!.thirdPartyNotice).toMatch(/no assurances/i);
  });

  it('restricts it to the three Warbands the catalogue names', () => {
    // Before this it fell through to the permissive default and every faction
    // was offered it.
    const roch = sultanate.units.find((u) => u.name === 'Disciple of St. Roch');
    expect(roch!.allowedFactions!.sort())
      .toEqual(['iron-sultanate', 'new-antioch', 'trench-pilgrims']);
    expect(roch!.allowedFactions!.length).toBeLessThan(APP_FACTIONS.length);
  });

  it('leaves the official Mercenaries unmarked', () => {
    /*
      Fourteen entries carry the Mercenary role; five of them are third-party
      (the Disciple, and four gated behind a Variant), leaving nine published
      ones that must be offered as normal.
    */
    const mercs = sultanate.units.filter((u) => u.category === 'Mercenary');
    const official = mercs.filter((u) => !u.thirdParty);
    expect(mercs.length).toBe(14);
    expect(official.length).toBe(9);
    for (const u of official) expect(u.thirdPartyNotice, u.name).toBeUndefined();
  });
});


describe('a third-party model on a Warband that has not opted in', () => {
  /*
    The recruit list hides these, so this fires only when the option was on and
    is later turned off — a table changing its mind between games. It must say
    so rather than let the roster go quietly illegal, and it must never delete
    the model on the player's behalf.
  */
  const roch = DATASET.units.find((u) => u.name === 'Disciple of St. Roch')!;

  const rosterWith = (allowThirdParty: boolean): Roster => ({
    id: 'r1',
    name: 'Test',
    factionId: 'Iron Sultanate',
    allowThirdParty,
    units: [{
      id: 'u1',
      profileId: roch.id,
      name: roch.name,
      cost: roch.cost,
      items: [],
      options: [],
    }],
    stash: [],
    budget: { ducats: 700, glory: 10 },
  });

  it('is reported as an error', () => {
    const r = validateRoster(rosterWith(false), DATASET);
    const v = r.violations.find((x) => x.code === 'third-party-not-allowed');
    expect(v, 'no violation raised').toBeDefined();
    expect(v!.severity).toBe('error');
    expect(v!.unitId).toBe('u1');
    expect(r.legal).toBe(false);
  });

  it('is silent once the Warband allows it', () => {
    const r = validateRoster(rosterWith(true), DATASET);
    expect(r.violations.filter((x) => x.code === 'third-party-not-allowed')).toEqual([]);
  });

  it('never fires on official models', () => {
    const azeb = DATASET.units.find((u) => u.name === 'Azeb')!;
    const r = validateRoster({
      ...rosterWith(false),
      units: [{ id: 'u2', profileId: azeb.id, name: azeb.name, cost: azeb.cost,
                items: [], options: [] }],
    }, DATASET);
    expect(r.violations.filter((x) => x.code === 'third-party-not-allowed')).toEqual([]);
  });
});


describe('third-party wargear', () => {
  /*
    It exists — 33 entries hang off the same six Variants (Greek Fire off the
    Remnants of Byzantium, the Dane Axe, the Blood Eagle Banner…). None of it
    reaches the app today, because the arsenal is built from the rulebook's
    Armoury Tables and those are official.

    That is a property of how the arsenal is sourced, not a guarantee. If it
    ever moves onto the catalogue weapon list, this fails rather than quietly
    offering unofficial wargear as published.
  */
  const gatedWargear = DATASET.weapons.filter((w) => gate(w).thirdParty);

  it('exists in the catalogues', () => {
    expect(gatedWargear.length).toBeGreaterThan(20);
    expect(gatedWargear.map((w) => w.name)).toContain('Greek Fire');
  });

  it('does not reach the recruit path', () => {
    const gatedNames = new Set(gatedWargear.map((w) => w.name));
    for (const f of APP_FACTIONS) {
      const r = recruitable(DATASET, f, APP_FACTIONS);
      const leaked = [...r.weapons, ...r.armour, ...r.equipment]
        .filter((x) => gatedNames.has(x.name))
        .map((x) => x.name);
      expect(leaked, `${f} is offered third-party wargear`).toEqual([]);
    }
  });
});
