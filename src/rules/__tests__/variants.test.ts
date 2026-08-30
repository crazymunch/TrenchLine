/**
 * The faction join between the saved model and the generated one.
 *
 * These are the tests that stop the variant picker silently going empty. A
 * faction whose id stops matching does not throw and does not warn — it just
 * offers no variants, and every variant rule for that faction goes unenforced
 * again, which is the exact bug this work exists to close.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import { FACTIONS } from '@/data/defaultRules';
import { sameFaction, variantsForFaction, variantById, factionOf, variantRenames } from '../variants';
import { toRoster } from '../fromWarband';
import { nameKey } from '../names';
import type { Warband } from '@/types/warband';

/** The playable factions. `defaultRules` also exports wargear under FACTIONS' sibling arrays. */
const PLAYABLE = FACTIONS.map((f) => f.id);

describe('faction join', () => {
  it('every faction the app offers resolves against the dataset', () => {
    const datasetFactions = [...new Set(DATASET.variants.map((v) => v.factionId))];
    const unmatched = PLAYABLE.filter(
      (id) => !datasetFactions.some((d) => sameFaction(id, d))
        // A faction with no published variants is not a join failure.
        && DATASET.units.every((u) => !sameFaction(id, u.factionId))
    );
    expect(unmatched, `these app factions match nothing in the dataset: ${unmatched.join(', ')}`)
      .toEqual([]);
  });

  it('matches the factions whose ids are not simply the catalogue name', () => {
    // Recorded rather than fuzzy-matched. Each of these is a real spelling that
    // appears in the codebase, from a different source.
    expect(sameFaction('heretic-legions', 'Heretic Legion')).toBe(true);
    expect(sameFaction('court-seven-serpents', 'Court of the Seven-Headed Serpent')).toBe(true);
    expect(sameFaction('black-grail', 'Cult of the Black Grail')).toBe(true);
    expect(sameFaction('black-grail', 'Black Grail')).toBe(true);
  });

  it('resolves every app faction to its record in dataset.factions', () => {
    // This is the lookup that reads a faction's published budget. A miss here
    // is silent: the roster just falls back to whatever the warband stored.
    const unresolved = PLAYABLE.filter((id) => !factionOf(DATASET, id));
    expect(unresolved, `no faction record for: ${unresolved.join(', ')}`).toEqual([]);
  });

  it('an empty or missing faction matches nothing', () => {
    expect(sameFaction('', '')).toBe(false);
    expect(sameFaction(undefined, undefined)).toBe(false);
  });

  it('does not match two different factions', () => {
    expect(sameFaction('iron-sultanate', 'New Antioch')).toBe(false);
    expect(sameFaction('black-grail', 'Trench Pilgrims')).toBe(false);
  });
});

describe('variantsForFaction', () => {
  it('gives the Iron Sultanate its own variants and nobody else’s', () => {
    const vs = variantsForFaction(DATASET, 'iron-sultanate');
    expect(vs.length).toBeGreaterThan(0);
    for (const v of vs) expect(sameFaction('iron-sultanate', v.factionId)).toBe(true);
    expect(vs.map((v) => v.name)).toContain('The House of Wisdom');
  });

  it('returns nothing for an unknown faction rather than everything', () => {
    // The dangerous failure is a fallback that offers every variant: a player
    // could then build a roster the validator would correctly reject.
    expect(variantsForFaction(DATASET, 'not-a-faction')).toEqual([]);
  });

  it('every variant in the dataset is reachable from exactly one faction', () => {
    const reached = new Map<string, number>();
    for (const id of PLAYABLE) {
      for (const v of variantsForFaction(DATASET, id)) {
        reached.set(v.id, (reached.get(v.id) ?? 0) + 1);
      }
    }
    const orphans = DATASET.variants.filter((v) => !reached.has(v.id)).map((v) => v.name);
    expect(orphans, `no faction in the app can reach: ${orphans.join(', ')}`).toEqual([]);
    const shared = [...reached].filter(([, n]) => n > 1);
    expect(shared, 'a variant is offered to more than one faction').toEqual([]);
  });
});

describe('variantById', () => {
  it('finds a variant by id and by name', () => {
    const v = DATASET.variants.find((x) => x.name === 'The House of Wisdom')!;
    expect(variantById(DATASET, v.id)?.id).toBe(v.id);
    expect(variantById(DATASET, 'The House of Wisdom')?.id).toBe(v.id);
  });

  it('is undefined for no variant, which is the standard list', () => {
    expect(variantById(DATASET, undefined)).toBeUndefined();
    expect(variantById(DATASET, '')).toBeUndefined();
  });
});

describe('variant renames', () => {
  const how = DATASET.variants.find((v) => v.name === 'The House of Wisdom')!;

  it('reads the printed names the House of Wisdom substitutes', () => {
    const r = variantRenames(how);
    // Both are the book's prose in machine-readable form: the Kavasses rule and
    // the Noble Guardians rule.
    expect(r.has('kavass')).toBe(true);
    expect(r.has('faris')).toBe(true);
  });

  it('is empty for the standard list', () => {
    expect(variantRenames(undefined).size).toBe(0);
  });

  const warband = (variantId: string | undefined, names: string[]): Warband => ({
    id: 'w', name: 'test', factionId: 'iron-sultanate', variantId,
    ducatLimit: 1000, treasuryDucats: 0, gloryPoints: 0, armoryStash: [],
    units: names.map((n, i) => ({
      id: `u${i}`, customName: n, totalCost: 0,
      profileSnapshot: { name: n },
    })),
  } as unknown as Warband);

  it('joins a Kavass to the Azeb entry it renames', () => {
    const { roster, unmatched } = toRoster(warband(how.id, ['Kavass']), DATASET);
    expect(unmatched).toEqual([]);
    expect(roster.units).toHaveLength(1);
    const azeb = DATASET.units.find((u) => u.name === 'Azeb')!;
    expect(roster.units[0].profileId).toBe(azeb.id);
  });

  it('joins a promoted Favoured Kavass to the same entry', () => {
    // NewRecruit prefixes an elite-promoted model with the faction's title.
    const { roster, unmatched } = toRoster(warband(how.id, ['Favoured Kavass']), DATASET);
    expect(unmatched).toEqual([]);
    const azeb = DATASET.units.find((u) => u.name === 'Azeb')!;
    expect(roster.units[0].profileId).toBe(azeb.id);
  });

  it('does not invent the rename for a warband on the standard list', () => {
    // Without the variant selected there is no Kavass, and saying so is right:
    // a silent match would tell the player a model is legal that is not.
    const { unmatched } = toRoster(warband(undefined, ['Kavass']), DATASET);
    expect(unmatched.map((u) => u.name)).toContain('Kavass');
  });
});

describe('nameKey', () => {
  it('folds diacritics to the base letter rather than dropping them', () => {
    // The bug this replaced: 'Fāris' became 'fris' and matched nothing, so
    // every Fāris in a House of Wisdom warband was reported as not in the
    // ruleset. Trench Crusade names carry diacritics throughout.
    expect(nameKey('Fāris')).toBe('faris');
    expect(nameKey('Dhi’b al-Nafūd')).toBe('dhibalnafud');
    expect(nameKey('Al-Khidr')).toBe('alkhidr');
  });

  it('reduces the same name written two ways to the same key', () => {
    expect(nameKey('Fāris')).toBe(nameKey('Faris'));
    expect(nameKey('Yüzbaşı Captain')).toBe(nameKey('Yuzbasi Captain'));
  });

  it('folds the letters that do not decompose', () => {
    // ı and ß are their own letters, not accented forms, so NFD leaves them
    // alone and they would otherwise be dropped as non-ASCII. These are the
    // only two that occur across every name in the generated data.
    expect(nameKey('Yüzbaşı')).toBe('yuzbasi');
    expect(nameKey('Straße')).toBe(nameKey('Strasse'));
  });

  it('still separates genuinely different names', () => {
    expect(nameKey('Azeb')).not.toBe(nameKey('Kavass'));
    expect(nameKey('Azeb')).not.toBe('');
  });

  it('every name in the dataset reduces to a non-empty key', () => {
    // An empty key matches nothing and is indistinguishable from a missing
    // name, so it must never happen silently.
    const empty = [...DATASET.units, ...DATASET.weapons]
      .filter((e) => nameKey(e.name) === '').map((e) => e.name);
    expect(empty, `these names normalise to nothing: ${empty.join(', ')}`).toEqual([]);
  });
});
