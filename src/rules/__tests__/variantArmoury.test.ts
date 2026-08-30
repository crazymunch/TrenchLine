/**
 * Variant armoury effects.
 *
 * The point of these tests is as much what is NOT extracted as what is. A
 * variant rule that touches the armoury in a way the prose does not state
 * machine-readably must be reported, never guessed at — guessing is how the
 * codebase acquired 51 invented wargear entries.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import { variantArmoury, stockedAnywhere } from '../variantArmoury';

/** The factions that actually publish an Armoury Table. */
const KNOWN = DATASET.armouries.map((a) => a.factionId);

const byName = (n: string) => DATASET.variants.find((v) => v.name === n)!;

describe('variantArmoury', () => {
  it('reads Corrupt Merchants as access to two other factions’ armouries', () => {
    // "you can purchase 1 piece of Battlekit from the New Antioch Armoury, and
    //  1 piece of Battlekit from the Iron Sultanate Armoury"
    const v = byName('Knights of Avarice');
    const { grants } = variantArmoury(v, v.factionId, KNOWN);
    // Resolved to the canonical faction ids the armouries are keyed by, not
    // the display names the prose uses — so the result is directly usable.
    const named = grants.map((g) => g.factionId).sort();
    expect(named).toContain('new-antioch');
    expect(named).toContain('iron-sultanate');
    expect(grants.every((g) => g.rule === 'Corrupt Merchants')).toBe(true);
  });

  it('carries the stated limit rather than assuming one', () => {
    const v = byName('Knights of Avarice');
    const { grants } = variantArmoury(v, v.factionId, KNOWN);
    expect(grants[0].limit).toBe(1);
  });

  it('reports a variant’s own armoury table instead of inventing its contents', () => {
    // "0-2 Sultanate Grand Cannons … (see Defenders of the Iron Wall Warband
    //  Armoury)" — a table the pipeline does not parse. Reported, not guessed.
    const v = byName('Defenders of the Iron Wall');
    const { grants, unreadable } = variantArmoury(v, v.factionId, KNOWN);
    expect(grants.map((g) => g.factionId)).not.toContain('Defenders of the Iron Wall');
    expect(unreadable.map((u) => u.rule)).toContain('Grand Cannons');
  });

  it('reports a price or restriction override rather than applying it', () => {
    // "Holy Icon Shields cost 20 ducats … and do not have the (ELITE only)
    //  restriction." Both effects are real; neither is extracted yet.
    const v = byName('Procession of the Sacred Affliction');
    const { unreadable } = variantArmoury(v, v.factionId, KNOWN);
    expect(unreadable.map((u) => u.rule)).toContain('Reliquary Armoury');
  });

  it('never treats a variant’s own faction armoury as a grant', () => {
    for (const v of DATASET.variants) {
      const { grants } = variantArmoury(v, v.factionId, KNOWN);
      for (const g of grants) {
        expect(g.factionId.toLowerCase()).not.toBe(v.factionId.toLowerCase());
      }
    }
  });

  it('is empty for the standard list', () => {
    expect(variantArmoury(undefined, 'iron-sultanate', KNOWN)).toEqual({ grants: [], unreadable: [] });
  });
});

describe('stockedAnywhere', () => {
  const knights = byName('Knights of Avarice');

  it('finds an item in the faction’s own armoury, with no granting rule', () => {
    const own = DATASET.armouries.find((a) => a.rows.length)!;
    const row = own.rows.find((r) => r.weaponId)!;
    const r = stockedAnywhere(DATASET, own.factionId, undefined, { name: row.name });
    expect(r.stocked).toBe(true);
    expect(r.via).toBeNull();
  });

  it('finds an item only a granted armoury stocks, and names the rule', () => {
    // Something New Antioch stocks that the Knights' own faction does not.
    const antioch = DATASET.armouries.find((a) => /antioch/i.test(a.faction))!;
    const ownRows = new Set(
      (DATASET.armouries.find((a) => a.factionId === knights.factionId)?.rows ?? [])
        .map((r) => r.name.toLowerCase()));
    const exclusive = antioch.rows.find((r) => !ownRows.has(r.name.toLowerCase()));
    if (!exclusive) return; // nothing exclusive to test with

    const r = stockedAnywhere(DATASET, knights.factionId, knights, { name: exclusive.name });
    expect(r.stocked).toBe(true);
    expect(r.via).toBe('Corrupt Merchants');
  });

  it('still reports an item no reachable armoury stocks', () => {
    const r = stockedAnywhere(DATASET, 'iron-sultanate', undefined, { name: 'Entrenching Shovel' });
    expect(r.stocked).toBe(false);
  });
});
