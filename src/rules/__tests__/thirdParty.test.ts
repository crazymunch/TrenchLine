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
import { thirdPartyGate, THIRD_PARTY_OPTION_ID } from '../thirdParty';
import { validateRoster } from '../validate';
import type { Roster } from '../costs';

const APP_FACTIONS = FACTIONS.map((f) => f.id);
const sultanate = recruitable(DATASET, 'iron-sultanate', APP_FACTIONS);

describe('the third-party gate', () => {
  const roch = DATASET.units.find((u) => u.name === 'Disciple of St. Roch');

  it('finds the entry the catalogues mark', () => {
    expect(roch, 'the Disciple of St. Roch is gone from the dataset').toBeDefined();
    const gate = thirdPartyGate(roch!);
    expect(gate.thirdParty).toBe(true);
    // The disclaimer is the source's own words, shown rather than paraphrased.
    expect(gate.notice).toMatch(/not fully official/i);
  });

  it('reads the hosts out of the same modifier', () => {
    // Stated only here — the Trench Dispatch, which is where every other
    // Mercenary's hosts come from, never mentions this entry.
    expect(thirdPartyGate(roch!).hosts.sort())
      .toEqual(['Iron Sultanate', 'New Antioch', 'Trench Pilgrims']);
  });

  it('marks nothing else in the pinned catalogues', () => {
    /*
      If this number grows, the catalogues gained third-party content and the
      toggle now hides more than one entry — which is worth knowing deliberately
      rather than discovering when a player asks where a unit went.
    */
    const marked = DATASET.units.filter((u) => thirdPartyGate(u).thirdParty);
    expect(marked.map((u) => u.name)).toEqual(['Disciple of St. Roch']);
  });

  it('does not mistake hidden-by-default for third-party', () => {
    /*
      The trap. `hidden="true"` is how BattleScribe says "available under a
      condition", and 26 shipped units carry it — including three faction
      Leaders. Gating on it would delete a third of the roster.
    */
    for (const name of ['Matagot Hag', 'Chieftain', 'Technomancer', 'Witchburner']) {
      const u = DATASET.units.find((x) => x.name === name);
      expect(u, name).toBeDefined();
      expect(thirdPartyGate(u!).thirdParty, `${name} is not third-party`).toBe(false);
    }
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

  it('leaves official Mercenaries unmarked', () => {
    const official = sultanate.units.filter((u) => u.category === 'Mercenary' && !u.thirdParty);
    expect(official.length).toBeGreaterThan(10);
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
