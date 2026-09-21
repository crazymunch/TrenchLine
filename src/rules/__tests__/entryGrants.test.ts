/**
 * FD-17 finding 3, and Order 35's correction to finding 1.
 *
 * Each granter is asserted against the catalogue text it is derived from, and
 * the negatives matter as much as the positives: the point of the rule is to
 * stop the legality engine reporting kit an entry gives as gear the faction
 * cannot buy, NOT to stop it reporting gear the faction really cannot buy.
 */
import { describe, it, expect } from 'vitest';

import { stockedByEntry, textGrants } from '../entryGrants';
import { DATASET } from '@/data/generated/trenchline.generated';
import type { UnitProfile } from '@/types/catalogue';

/**
 * By entry id, never by name.
 *
 * Six catalogue entries are called `Homunculus` — ID-1's finding — and the
 * one the House of Wisdom layer rewrites states Human Hands in its own words:
 * "can buy and wield any weapon allowed in the Iron Sultanate warband or
 * House of Wisdom list". Looking one up by name quotes whichever entry sorts
 * first as though it were the ruleset's.
 */
const entry = (entryId: string): UnitProfile => {
  const found = DATASET.units.find((u) => u.entryId === entryId);
  if (!found) throw new Error(`no catalogue entry ${entryId}`);
  return found;
};

const AZEB = '0e7e-9167-f044-9493';
const ALCHEMIST = '7c17-5f75-6fd9-73cf';
const SAPPER = 'e874-ea2b-96ed-0f9a';
/** The Takwin Homunculus the owner's warband fields — see ID-1. */
const HOMUNCULUS = '2f82-e47f-c162-9152';

describe('a Battlekit profile is not an Armoury Table row', () => {
  /*
    Measured over the shipped dataset rather than asserted from the books: of
    the weapons the catalogues type `Battlekit`, exactly one is also an
    Armoury Table row, and `stocks` answers for that one before this is ever
    consulted. If a release makes that untrue this test says so.
  */
  it('holds for all but one of the catalogues’ Battlekit entries', () => {
    const rows = new Set(
      DATASET.armouries.flatMap((a) => a.rows.map((r) => r.weaponId).filter(Boolean)),
    );
    const kit = DATASET.weapons.filter((w) => /^battlekit$/i.test(w.type ?? ''));
    const alsoStocked = kit.filter((w) => rows.has(w.id));

    expect(kit.length).toBeGreaterThan(300);
    expect(alsoStocked.map((w) => w.name)).toEqual(['Compound Eyes Helmet']);
  });

  it('stocks Coordinated Engagement, the FIRETEAM profile', () => {
    const w = DATASET.weapons.find((x) => x.name === 'Coordinated Engagement');
    expect(w?.type).toBe('Battlekit');
    expect(stockedByEntry(entry(AZEB), [], {
      weaponId: w!.id, name: w!.name, type: w!.type, factionId: w!.factionId,
    })).toBe('its Battlekit');
  });

  it('stocks Secrets of Takwin, the Alchemist’s bond to its Homunculus', () => {
    const w = DATASET.weapons.find((x) => x.name === 'Secrets of Takwin');
    expect(stockedByEntry(entry(ALCHEMIST), [], {
      weaponId: w!.id, name: w!.name, type: w!.type, factionId: w!.factionId,
    })).toBe('its Battlekit');
  });
});

describe('the Campaign Rules catalogue is not a faction armoury', () => {
  it('holds for every entry it carries', () => {
    const rows = new Set(
      DATASET.armouries.flatMap((a) => a.rows.map((r) => r.weaponId).filter(Boolean)),
    );
    const campaign = DATASET.weapons.filter((w) => w.factionId === 'Campaign Rules');
    expect(campaign.length).toBeGreaterThan(100);
    expect(campaign.filter((w) => rows.has(w.id))).toEqual([]);
  });

  it('stocks Curative Fluids, a Ransacked Alchemist Workshop find', () => {
    const w = DATASET.weapons.find((x) => x.name === 'Curative Fluids');
    expect(w?.unlockedBy).toContain('Ransacked Alchemist Workshop');
    expect(stockedByEntry(entry(ALCHEMIST), [], {
      weaponId: w!.id, name: w!.name, type: w!.type, factionId: w!.factionId,
    })).toBe('the campaign');
  });
});

describe('an entry’s own fixed kit', () => {
  /*
    Warbands L4739, "A Sultanate Sapper always has a Shovel". The catalogue
    links the shared `Shovel` entry, and NewRecruit writes the name of the
    profile nested inside it — `Weaponized Shovel` — which is why the kit
    carries every name it prints and not only the link's.
  */
  it('is matched by the name the catalogue PRINTS, not only the link’s', () => {
    const sapper = entry(SAPPER);
    expect(sapper.battlekit.map((b) => b.name)).toEqual(['Shovel']);
    expect(sapper.battlekit[0].profileNames).toContain('Weaponized Shovel');

    expect(stockedByEntry(sapper, [], {
      name: 'Weaponized Shovel', type: '1-Handed', factionId: 'Iron Sultanate',
    })).toBe('its Battlekit');
  });

  it('does not stock a Shovel for a model whose entry has none', () => {
    expect(stockedByEntry(entry(AZEB), [], {
      name: 'Weaponized Shovel', type: '1-Handed', factionId: 'Iron Sultanate',
    })).toBeNull();
  });
});

describe('an option the model holds', () => {
  const homunculus = entry(HOMUNCULUS);

  /*
    Order 35's reclassification of finding 1. Human Hands, Warbands L5382:
    "This Takwin Homunculus can have Ranged and Melee Weapons from the Iron
    Sultanate Armoury. It can also have a Trench Shield or a Fire Shield."
  */
  it('stocks the Fire Shield for a Homunculus with Human Hands', () => {
    const hands = homunculus.options.find((o) => o.name === 'Human Hands');
    expect(hands?.description)
      .toMatch(/It can also have a Trench Shield or a Fire Shield\./);

    expect(stockedByEntry(homunculus, ['Human Hands'], {
      name: 'Fire Shield', type: 'Shield', factionId: 'Iron Sultanate',
    })).toBe('Human Hands');
  });

  it('stocks nothing for a Homunculus that has not bought it', () => {
    expect(stockedByEntry(homunculus, ['Wings'], {
      name: 'Fire Shield', type: 'Shield', factionId: 'Iron Sultanate',
    })).toBeNull();
  });

  it('stocks the option itself, where the roster records it as an item', () => {
    expect(stockedByEntry(homunculus, ['Two Heads'], {
      name: 'Two Heads', factionId: 'Iron Sultanate',
    })).toBe('Two Heads');
  });

  it('does not read a Formula that grants no gear as granting gear', () => {
    expect(stockedByEntry(homunculus, ['Two Heads'], {
      name: 'Fire Shield', type: 'Shield', factionId: 'Iron Sultanate',
    })).toBeNull();
  });
});

describe('textGrants reads the sentence, not the option', () => {
  it('reads a permission', () => {
    expect(textGrants('It can also have a Trench Shield or a Fire Shield.',
                      'Fire Shield')).toBe(true);
    expect(textGrants('This model may take a Gas Mask.', 'Gas Mask')).toBe(true);
  });

  /*
    The prohibition sits in the same paragraph as the grant on Human Hands —
    "It cannot use its Pummelling Blows ability if it is armed with any Melee
    Weapons" — so a pattern loose enough to read `armed with` on its own turns
    the sentence that forbids into the sentence that permits.
  */
  it('does not read a prohibition as a permission', () => {
    expect(textGrants('It cannot use its Pummelling Blows ability if it is '
                    + 'armed with any Melee Weapons.', 'Melee Weapons')).toBe(false);
    expect(textGrants('This model cannot have a Fire Shield.', 'Fire Shield'))
      .toBe(false);
  });

  it('does not let one item answer for another that contains its name', () => {
    expect(textGrants('It can also have a Trench Shield.', 'Fire Shield')).toBe(false);
    expect(textGrants('It can also have a Fire Shield.', 'Shield')).toBe(false);
  });

  it('will not grant across a clause boundary', () => {
    expect(textGrants('This model can have a Shovel. It never carries a Fire Shield.',
                      'Fire Shield')).toBe(false);
  });
});
