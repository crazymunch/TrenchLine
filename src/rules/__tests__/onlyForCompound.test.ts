/**
 * "X only" restrictions that say more than one thing.
 *
 * `docs/RULES-COVERAGE-AUDIT.md` RC-06. `satisfiesOnlyFor` matched the whole
 * requirement string against the model's name, keywords and roles, so anything
 * compound matched nothing — and the function returned `true`, on a comment
 * that reasoned the unparsed note would carry the caveat to the player.
 *
 * It does not. "Janissaries & Yüzbaşı with Janissary Veteran only" parses
 * cleanly as `onlyFor`, so it never reaches the `unparsed-restriction` path,
 * and nothing anywhere told anyone anything. Codex's words: it "does not
 * exclude, for example, an otherwise eligible Sultanate Azeb".
 *
 * The Regimental Kaşık is the shipped case and it is pinned against the real
 * dataset here, because the finding is about a published sentence the engine
 * could not read rather than about a value being wrong.
 *
 * Two halves, and they are not equally answerable — see `onlyForVerdict`. The
 * identity half is checkable and is what was letting the wrong models through.
 * The condition half often is not, and the answer there is a visible caveat:
 * refusing on a condition we cannot read would make the entry unbuyable by
 * anyone, which is the same silence pointed the other way.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import { onlyForVerdict, satisfiesOnlyFor, parseRestrictions } from '../restrictions';
import { validateRoster } from '../validate';
import { canEquip } from '../equipGate';
import { armouryFor } from '../armoury';
import type { Roster } from '../costs';

const unit = (name: string) => {
  const u = DATASET.units.find((x) => x.name === name)!;
  return { name: u.name, keywords: u.keywords, roles: u.roles };
};

/** The Kaşık's own restriction line, read off the armoury rather than typed. */
const KASIK = DATASET.armouries
  .find((a) => a.factionId === 'iron-sultanate')!
  .rows.find((r) => r.name === 'Regimental Kaşık')!;

const requirement = () => {
  const only = parseRestrictions(KASIK.restrictions!.join(', '))
    .find((r) => r.kind === 'onlyFor');
  return (only as { requires: string }).requires;
};

describe('the Regimental Kaşık, as the armoury actually prints it', () => {
  it('is a compound requirement, which is what makes it the case to pin', () => {
    expect(KASIK.restrictions).toEqual(
      ['Janissaries & Yüzbaşı with Janissary Veteran only, Limit: 1']);
    expect(requirement()).toBe('Janissaries & Yüzbaşı with Janissary Veteran');
  });

  it('refuses an Azeb — the model Codex named', () => {
    // The whole finding, in one assertion. This returned true.
    expect(onlyForVerdict(requirement(), unit('Azeb')).met).toBe(false);
    expect(satisfiesOnlyFor(requirement(), unit('Azeb'))).toBe(false);
  });

  it('refuses a model from another faction entirely', () => {
    expect(onlyForVerdict(requirement(), unit('Trench Pilgrim')).met).toBe(false);
  });

  it('admits a Janissary, whose entry is singular where the table is plural', () => {
    /*
      "Janissaries" against a `Janissary`. Both endings are handled and `ies`
      goes first: stripping the bare `s` leaves "Janissarie", which matches
      nothing, and the model would be refused an item the book gives it.
    */
    expect(onlyForVerdict(requirement(), unit('Janissary')).met).toBe(true);
  });

  it('admits a Yüzbaşı, the second alternative', () => {
    expect(onlyForVerdict(requirement(), unit('Yüzbaşı Captain')).met).toBe(true);
  });
});

describe('the condition half', () => {
  it('says it cannot tell, in the source’s own words, rather than nothing', () => {
    const v = onlyForVerdict(requirement(), unit('Janissary'));
    expect(v.met).toBe(true);
    expect(v.unknown).toContain('Janissary Veteran');
  });

  it('is settled when the player has taken it', () => {
    const v = onlyForVerdict(requirement(), unit('Janissary'),
      { taken: ['Janissary Veteran'] });
    expect(v).toEqual({ met: true });
  });

  it('is NOT settled by the entry’s own printed abilities', () => {
    /*
      Every Yüzbaşı Captain carries an innate ability called "Janissary
      Veteran" whose text is an OFFER — "You can make the Yüzbaşı a Janissary
      Veteran … at a cost of +5". Reading the condition from that list would
      report every Yüzbaşı ever recruited as a Veteran, silently: RC-06 again,
      one room along. `selections` is for `unlockedBy` and nothing else.
    */
    const yuzbasi = DATASET.units.find((u) => u.name === 'Yüzbaşı Captain')!;
    expect(yuzbasi.abilities!.map((a) => a.name)).toContain('Janissary Veteran');
    expect(yuzbasi.abilities!.find((a) => a.name === 'Janissary Veteran')!.description)
      .toContain('at a cost of');

    const v = onlyForVerdict(requirement(), unit('Yüzbaşı Captain'), {
      selections: yuzbasi.abilities!.map((a) => a.name),
    });
    expect(v.met).toBe(true);
    expect(v.unknown, 'an offer printed on the entry is not a purchase').toBeTruthy();
  });

  it('binds “with” to the whole list, not to the alternative beside it', () => {
    /*
      "(Janissary or Yüzbaşı) that has Janissary Veteran", never "Janissary, or
      Yüzbaşı-with-Janissary-Veteran". The second reading would let a plain
      Janissary through with no caveat at all.
    */
    expect(onlyForVerdict(requirement(), unit('Janissary')).unknown).toBeTruthy();
    expect(onlyForVerdict(requirement(), unit('Yüzbaşı Captain')).unknown).toBeTruthy();
  });
});

describe('the simple requirements it must not have broken', () => {
  const elite = { name: 'Sniper Priest', keywords: ['ELITE'], roles: ['Elite'] };

  it('still reads a bare keyword', () => {
    expect(satisfiesOnlyFor('ELITE', elite)).toBe(true);
    expect(satisfiesOnlyFor('ELITE', { name: 'Azeb', keywords: ['SULTANATE'], roles: ['Troop'] }))
      .toBe(false);
  });

  it('still reads a bare profile name, with no condition to report', () => {
    expect(onlyForVerdict('Sniper Priest', elite)).toEqual({ met: true });
  });

  it('still follows the catalogue’s own unlock, which has no “with” in it', () => {
    // The Homunculus case from `importedFormulae.test.ts`, re-asserted here
    // because the split is where it could quietly have been lost.
    const homunculus = { name: 'Takwin Homunculus', keywords: [], roles: ['Elite'] };
    expect(satisfiesOnlyFor('Brazen Bull', homunculus, {
      selections: ['Gargantuan Size'],
      unlockedBy: ['Gargantuan Size'],
    })).toBe(true);
    expect(satisfiesOnlyFor('Brazen Bull', homunculus, {
      selections: ['Cadaver Battery'],
      unlockedBy: ['Gargantuan Size'],
    })).toBe(false);
  });

  it('admits everything when the requirement is empty', () => {
    expect(onlyForVerdict('', { name: 'Azeb' })).toEqual({ met: true });
  });
});

/* --------------------------------------------------- and what a player sees */

/**
 * A Sultanate roster holding the Kaşık, through the real validator.
 *
 * The rules layer answering correctly is half the fix; the finding is that
 * nothing reached a screen. These two blocks are the other half.
 */
const KASIK_ID = 'dispatch01-glory-regimental-kasik';

const sultanateRoster = (unitName: string, options: string[] = []): Roster => {
  const u = DATASET.units.find((x) => x.name === unitName)!;
  return {
    id: 'r', name: 'Kapıkulu', factionId: 'Iron Sultanate',
    units: [{
      id: 'u1', profileId: u.id, name: u.name,
      cost: u.cost, keywords: u.keywords, roles: u.roles,
      items: [{ weaponId: KASIK_ID, cost: { ducats: 0, glory: 4 } }],
      options: options.map((name) => ({ name, cost: { ducats: 0, glory: 0 } })),
    }],
    stash: [], budget: { ducats: 1000, glory: 20 },
  } as unknown as Roster;
};

describe('the validator, on a roster that actually holds one', () => {
  it('rejects the Azeb with the sentence that forbids it', () => {
    const out = validateRoster(sultanateRoster('Azeb'), DATASET);
    const v = out.violations.find((x) => x.code === 'wargear-restricted');
    expect(v, 'the Azeb was legal before RC-06').toBeDefined();
    expect(v!.rule).toContain('Janissary Veteran');
  });

  it('lets the Janissary have it, and says out loud what it could not check', () => {
    const out = validateRoster(sultanateRoster('Janissary'), DATASET);
    expect(out.violations.some((x) => x.code === 'wargear-restricted')).toBe(false);

    const note = out.warnings.find((x) => x.code === 'restriction-unverified');
    expect(note, 'a permit nobody is told about is the bug, not the fix')
      .toBeDefined();
    expect(note!.message).toContain('Janissary Veteran');
    expect(note!.message).toContain('check this by hand');
  });

  it('stops warning once the option is on the roster', () => {
    const out = validateRoster(
      sultanateRoster('Janissary', ['Janissary Veteran']), DATASET);
    expect(out.warnings.some((x) => x.code === 'restriction-unverified')).toBe(false);
    expect(out.violations.some((x) => x.code === 'wargear-restricted')).toBe(false);
  });
});

describe('the equip sheet, which must agree with the validator', () => {
  const gate = (unitName: string, taken: string[] = []) => {
    const u = DATASET.units.find((x) => x.name === unitName)!;
    return canEquip({ id: KASIK_ID, name: 'Regimental Kaşık' }, {
      dataset: DATASET,
      armoury: armouryFor(DATASET, 'Iron Sultanate'),
      carried: [],
      unit: { name: u.name, keywords: u.keywords, roles: u.roles },
      traits: u.abilities?.map((a) => a.name) ?? [],
      taken,
    });
  };

  it('greys the button out for the Azeb, quoting the row', () => {
    const v = gate('Azeb');
    expect(v.allowed).toBe(false);
    expect(v.reason).toContain('Janissary Veteran');
  });

  it('leaves it live for a Yüzbaşı, with the caveat attached', () => {
    /*
      `traits` here is the entry's own printed abilities — which include the
      "Janissary Veteran" OFFER. The button stays enabled and the caveat is
      shown; what must not happen is the caveat disappearing because the offer
      was mistaken for a purchase.
    */
    const v = gate('Yüzbaşı Captain');
    expect(v.allowed).toBe(true);
    expect(v.caveat).toContain('Janissary Veteran');
  });

  it('drops the caveat once the player has actually taken it', () => {
    expect(gate('Yüzbaşı Captain', ['Janissary Veteran']).caveat).toBeUndefined();
  });
});
