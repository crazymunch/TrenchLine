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
import { variantArmoury, stockedAnywhere, withinGrants } from '../variantArmoury';

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

describe('withinGrants — how much a grant actually allows', () => {
  /*
    The half of the rule that was read and never counted. `stockedAnywhere`
    answers "is this stocked somewhere you can reach", which makes a granted
    item legal; nothing then looked at HOW MANY had been taken, so a House of
    Wisdom roster with five New Antioch items validated clean against a rule
    that says one.

    The allowance is per COPY, which is not this file's reading — MISC. Q4 in
    the catalogue's own FAQ settles it: "You can only purchase one of each
    piece of Battlekit."
  */
  const g = (factionId: string, limit: number | null, rule = 'Weapon Collections') =>
    ({ factionId, limit, rule });

  const na = g('new-antioch', 1);
  const tp = g('trench-pilgrims', 1);

  it('allows exactly what the rule states', () => {
    expect(withinGrants([
      { item: { name: 'A' }, via: [na] },
      { item: { name: 'B' }, via: [tp] },
    ])).toBe(true);
  });

  it('refuses one more than the rule states', () => {
    expect(withinGrants([
      { item: { name: 'A' }, via: [na] },
      { item: { name: 'B' }, via: [na] },
    ])).toBe(false);
  });

  it('counts a second copy of one piece as a second piece', () => {
    // The FAQ's answer, stated as a test: two copies of the same item is two.
    expect(withinGrants([
      { item: { name: 'A' }, via: [na] },
      { item: { name: 'A' }, via: [na] },
    ])).toBe(false);
  });

  it('assigns rather than tallies, so a legal roster is not called illegal', () => {
    /*
      The reason this is a search. An item stocked by BOTH granted armouries —
      the Sword/Axe is in most of them — must not be counted against a
      particular one just because it was seen first. Here a greedy tally puts
      both items on New Antioch and reports two-over-one; the correct answer is
      that the shared item goes to Trench Pilgrims.
    */
    expect(withinGrants([
      { item: { name: 'shared' }, via: [na, tp] },
      { item: { name: 'na-only' }, via: [na] },
    ])).toBe(true);
  });

  it('backtracks when the first assignment is the wrong one', () => {
    // Order chosen so the naive first pick fails and a retry succeeds.
    expect(withinGrants([
      { item: { name: 'shared-1' }, via: [na, tp] },
      { item: { name: 'shared-2' }, via: [na, tp] },
      { item: { name: 'na-only' }, via: [na] },
    ])).toBe(false);

    expect(withinGrants([
      { item: { name: 'shared-1' }, via: [na, tp] },
      { item: { name: 'na-only' }, via: [na] },
    ])).toBe(true);
  });

  it('treats a grant with no stated number as unbounded', () => {
    /*
      `limit: null` means the rule stated no count. An unstated number is not a
      licence to invent one, and it is not a reason to refuse either — the
      standing policy in this file is to surface what cannot be read and
      enforce only what can.
    */
    const open = g('new-antioch', null, 'Some Rule');
    expect(withinGrants(Array.from({ length: 50 }, (_, i) => (
      { item: { name: `item-${i}` }, via: [open] }
    )))).toBe(true);
  });

  it('is vacuously satisfied by an empty roster', () => {
    expect(withinGrants([])).toBe(true);
  });
});

describe('the grant limit, against the real House of Wisdom rule', () => {
  const v = byName('The House of Wisdom');
  const { grants } = variantArmoury(v, v.factionId, KNOWN);

  it('reads one piece from each of two armouries', () => {
    // "you can purchase 1 piece of Battlekit from the New Antioch Armoury, and
    //  1 piece of Battlekit from the Trench Pilgrims Armoury"
    expect(grants.map((x) => x.factionId).sort()).toEqual(['new-antioch', 'trench-pilgrims']);
    expect(grants.every((x) => x.limit === 1)).toBe(true);
  });

  it('permits two granted pieces and refuses three', () => {
    const one = grants.find((x) => x.factionId === 'new-antioch')!;
    const two = grants.find((x) => x.factionId === 'trench-pilgrims')!;
    expect(withinGrants([
      { item: { name: 'a' }, via: [one] },
      { item: { name: 'b' }, via: [two] },
    ])).toBe(true);
    expect(withinGrants([
      { item: { name: 'a' }, via: [one] },
      { item: { name: 'b' }, via: [two] },
      { item: { name: 'c' }, via: [one] },
    ])).toBe(false);
  });

  it('the ruling that settles the per-copy reading is in the dataset', () => {
    /*
      Cited rather than paraphrased. The count is the catalogue's, not ours —
      so if the pipeline ever stops carrying this entry, the reading above is
      no longer sourced and this fails, which is the point.

      It lives in `commentaries`, the parsed rules Q&A, as MISC. Q4.
    */
    const ruling = (DATASET.commentaries ?? []).find((c) =>
      /Corrupt Merchants and Weapon Collections/i.test(c.question));
    expect(ruling, 'MISC. Q4 is not in the dataset').toBeDefined();
    expect(ruling!.answer).toMatch(/one of each piece of Battlekit/i);
  });
});
